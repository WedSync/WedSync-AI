import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import rateLimit from '@/lib/rate-limit';
import {
  sanitizeString,
  sanitizeHTML,
  validateAndSanitizeObject,
  isValidUUID,
} from '@/lib/security/input-validation';
import { PersonalizationEngine } from '@/lib/communications/personalization-engine';
import { BulkMessageQueue } from '@/lib/communications/bulk-queue';

// Rate limiting for scheduling operations
const scheduleRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100,
});

// Schedule validation schema
const scheduleMessageSchema = z.object({
  campaign_id: z.string().optional(), // Optional - will create new campaign if not provided
  template_id: z.string().uuid().optional(),
  recipients: z
    .array(
      z.object({
        id: z.string().uuid(),
        type: z.enum(['client', 'vendor', 'guest']),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        name: z.string(),
        data: z.record(z.any()).optional(),
      }),
    )
    .min(1)
    .max(500),
  channels: z.array(z.enum(['email', 'sms'])).min(1),
  subject: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(5000).optional(),
  template_type: z
    .enum([
      'wedding_update',
      'venue_change',
      'menu_info',
      'rsvp_reminder',
      'thank_you',
      'custom',
    ])
    .default('custom'),
  personalization: z.boolean().default(true),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  scheduled_for: z.string().datetime(),
  timezone: z.string().default('UTC'),
  metadata: z.record(z.any()).optional(),
});

const updateScheduleSchema = z.object({
  scheduled_for: z.string().datetime().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(['scheduled', 'cancelled']).optional(),
});

const rescheduleSchema = z.object({
  campaign_id: z.string(),
  new_scheduled_for: z.string().datetime(),
  timezone: z.string().default('UTC'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await scheduleRateLimit.check(10, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many scheduling requests' },
        { status: 429 },
      );
    }

    const supabase = await createClient();

    // Get and verify user
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, display_name, role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Check permissions
    if (!['OWNER', 'ADMIN', 'MEMBER'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to schedule messages' },
        { status: 403 },
      );
    }

    // Validate request body
    const rawBody = await request.json();
    const validatedData = scheduleMessageSchema.parse(rawBody);

    // Validate scheduled time is in the future
    const scheduledTime = new Date(validatedData.scheduled_for);
    const now = new Date();

    if (scheduledTime <= now) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 },
      );
    }

    // Validate not too far in the future (e.g., max 1 year)
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    if (scheduledTime > oneYearFromNow) {
      return NextResponse.json(
        { error: 'Cannot schedule messages more than 1 year in advance' },
        { status: 400 },
      );
    }

    // Get organization and verify permissions
    const { data: organization } = await supabase
      .from('organizations')
      .select('pricing_tier, max_sms_credits, features')
      .eq('id', userProfile.organization_id)
      .single();

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Check if scheduling is allowed for this tier
    const allowsScheduling = ['PROFESSIONAL', 'SCALE', 'ENTERPRISE'].includes(
      organization.pricing_tier,
    );
    if (!allowsScheduling) {
      return NextResponse.json(
        {
          error:
            'Message scheduling not available on current plan. Upgrade to Professional or higher.',
        },
        { status: 403 },
      );
    }

    let messageContent = '';
    let messageSubject = validatedData.subject;

    // If using template, fetch and validate it
    if (validatedData.template_id) {
      const { data: template } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('id', validatedData.template_id)
        .or(
          `organization_id.eq.${userProfile.organization_id},is_system_template.eq.true`,
        )
        .eq('is_active', true)
        .single();

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found or inactive' },
          { status: 404 },
        );
      }

      // Check if requested channels are supported by template
      const unsupportedChannels = validatedData.channels.filter(
        (channel) => !template.channels.includes(channel),
      );

      if (unsupportedChannels.length > 0) {
        return NextResponse.json(
          {
            error: `Template does not support channels: ${unsupportedChannels.join(', ')}`,
          },
          { status: 400 },
        );
      }

      messageContent = template.content;
      messageSubject = template.subject || validatedData.subject;

      // Increment template usage count
      await supabase
        .from('communication_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', template.id);
    } else if (validatedData.message) {
      messageContent = validatedData.message;
    } else {
      return NextResponse.json(
        { error: 'Either template_id or message content is required' },
        { status: 400 },
      );
    }

    // Sanitize content
    const sanitizedMessage = sanitizeHTML(messageContent);
    const sanitizedSubject = messageSubject
      ? sanitizeString(messageSubject, 200)
      : undefined;

    // Generate campaign ID if not provided
    const campaignId =
      validatedData.campaign_id ||
      `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create or update campaign record
    const campaignData = {
      id: campaignId,
      organization_id: userProfile.organization_id,
      created_by: user.id,
      template_type: validatedData.template_type,
      subject: sanitizedSubject,
      message_content: sanitizedMessage,
      channels: validatedData.channels,
      total_recipients: validatedData.recipients.length,
      priority: validatedData.priority,
      scheduled_for: scheduledTime.toISOString(),
      status: 'scheduled',
      test_mode: false,
      metadata: {
        ...validatedData.metadata,
        timezone: validatedData.timezone,
        personalization: validatedData.personalization,
        template_id: validatedData.template_id,
      },
    };

    const { data: campaign, error: campaignError } = await supabase
      .from('communication_campaigns')
      .upsert(campaignData)
      .select()
      .single();

    if (campaignError) {
      console.error(
        'Error creating/updating scheduled campaign:',
        campaignError,
      );
      return NextResponse.json(
        { error: 'Failed to schedule campaign' },
        { status: 500 },
      );
    }

    // Process recipients and create scheduled messages
    const personalizationEngine = new PersonalizationEngine();
    const results = [];

    for (const recipient of validatedData.recipients) {
      try {
        // Personalize message content for this recipient
        let personalizedMessage = sanitizedMessage;
        let personalizedSubject = sanitizedSubject;

        if (validatedData.personalization && recipient.data) {
          personalizedMessage = personalizationEngine.personalizeContent(
            sanitizedMessage,
            recipient.data,
          );
          personalizedSubject = sanitizedSubject
            ? personalizationEngine.personalizeContent(
                sanitizedSubject,
                recipient.data,
              )
            : undefined;
        }

        // Add to queue with scheduled time
        if (validatedData.channels.includes('email') && recipient.email) {
          await BulkMessageQueue.addEmailToQueue({
            campaignId,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            subject: personalizedSubject || 'Scheduled Wedding Communication',
            message: personalizedMessage,
            templateType: validatedData.template_type,
            organizationId: userProfile.organization_id,
            priority: validatedData.priority,
            scheduledFor: scheduledTime,
          });
        }

        if (validatedData.channels.includes('sms') && recipient.phone) {
          await BulkMessageQueue.addSMSToQueue({
            campaignId,
            recipientId: recipient.id,
            recipientPhone: recipient.phone,
            recipientName: recipient.name,
            message: personalizedMessage,
            templateType: validatedData.template_type,
            organizationId: userProfile.organization_id,
            organizationTier: organization.pricing_tier as any,
            priority: validatedData.priority,
            scheduledFor: scheduledTime,
          });
        }

        results.push({
          recipient_id: recipient.id,
          status: 'scheduled',
          scheduled_for: scheduledTime.toISOString(),
        });
      } catch (error) {
        console.error(`Error scheduling for recipient ${recipient.id}:`, error);
        results.push({
          recipient_id: recipient.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      campaign_id: campaignId,
      scheduled_for: scheduledTime.toISOString(),
      timezone: validatedData.timezone,
      total_recipients: validatedData.recipients.length,
      results,
    });
  } catch (error) {
    console.error('Error in schedule POST:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid scheduling data',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await scheduleRateLimit.check(10, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many reschedule requests' },
        { status: 429 },
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 },
      );
    }

    // Get and verify user
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Verify campaign exists and is scheduled
    const { data: campaign } = await supabase
      .from('communication_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (!campaign) {
      return NextResponse.json(
        { error: 'Scheduled campaign not found' },
        { status: 404 },
      );
    }

    if (campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Campaign is not in scheduled status and cannot be modified' },
        { status: 400 },
      );
    }

    // Check permissions
    if (!['OWNER', 'ADMIN', 'MEMBER'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to modify scheduled messages' },
        { status: 403 },
      );
    }

    // Validate request body
    const rawBody = await request.json();
    const validatedData = updateScheduleSchema.parse(rawBody);

    const updateData: any = {};

    // Update scheduled time
    if (validatedData.scheduled_for) {
      const newScheduledTime = new Date(validatedData.scheduled_for);
      const now = new Date();

      if (newScheduledTime <= now) {
        return NextResponse.json(
          { error: 'New scheduled time must be in the future' },
          { status: 400 },
        );
      }

      updateData.scheduled_for = newScheduledTime.toISOString();

      // Update all related email and SMS notifications
      await Promise.all([
        supabase
          .from('email_notifications')
          .update({
            scheduled_for: newScheduledTime.toISOString(),
            status: 'pending',
          })
          .eq('organization_id', userProfile.organization_id)
          .eq('metadata->campaign_id', campaignId)
          .eq('status', 'pending'),

        supabase
          .from('sms_notifications')
          .update({
            scheduled_for: newScheduledTime.toISOString(),
            status: 'pending',
          })
          .eq('organization_id', userProfile.organization_id)
          .eq('campaign_id', campaignId)
          .eq('status', 'pending'),
      ]);
    }

    // Update priority
    if (validatedData.priority) {
      updateData.priority = validatedData.priority;

      // Update priority in related notifications
      await Promise.all([
        supabase
          .from('email_notifications')
          .update({ priority: validatedData.priority })
          .eq('organization_id', userProfile.organization_id)
          .eq('metadata->campaign_id', campaignId)
          .eq('status', 'pending'),

        supabase
          .from('sms_notifications')
          .update({ priority: validatedData.priority })
          .eq('organization_id', userProfile.organization_id)
          .eq('campaign_id', campaignId)
          .eq('status', 'pending'),
      ]);
    }

    // Update status (e.g., cancel)
    if (validatedData.status) {
      updateData.status = validatedData.status;

      if (validatedData.status === 'cancelled') {
        // Cancel all related notifications
        await Promise.all([
          supabase
            .from('email_notifications')
            .update({
              status: 'failed',
              error_message: 'Campaign cancelled by user',
            })
            .eq('organization_id', userProfile.organization_id)
            .eq('metadata->campaign_id', campaignId)
            .eq('status', 'pending'),

          supabase
            .from('sms_notifications')
            .update({
              status: 'failed',
              error_message: 'Campaign cancelled by user',
            })
            .eq('organization_id', userProfile.organization_id)
            .eq('campaign_id', campaignId)
            .eq('status', 'pending'),
        ]);

        updateData.completed_at = new Date().toISOString();
      }
    }

    // Update campaign
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('communication_campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating scheduled campaign:', updateError);
      return NextResponse.json(
        { error: 'Failed to update scheduled campaign' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      campaign: updatedCampaign,
      message:
        validatedData.status === 'cancelled'
          ? 'Campaign cancelled successfully'
          : 'Campaign updated successfully',
    });
  } catch (error) {
    console.error('Error in schedule PUT:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await scheduleRateLimit.check(50, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Get filter parameters
    const status = searchParams.get('status') || 'scheduled';
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Get user and organization
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Build query for scheduled campaigns
    let query = supabase
      .from('communication_campaigns')
      .select('*')
      .eq('organization_id', userProfile.organization_id)
      .eq('status', status)
      .order('scheduled_for', { ascending: true });

    if (fromDate) {
      query = query.gte('scheduled_for', fromDate);
    }

    if (toDate) {
      query = query.lte('scheduled_for', toDate);
    }

    const { data: campaigns, error } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) {
      console.error('Error fetching scheduled campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled campaigns' },
        { status: 500 },
      );
    }

    // Get total count
    let countQuery = supabase
      .from('communication_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userProfile.organization_id)
      .eq('status', status);

    if (fromDate) countQuery = countQuery.gte('scheduled_for', fromDate);
    if (toDate) countQuery = countQuery.lte('scheduled_for', toDate);

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      campaigns: campaigns || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit),
        has_next: offset + limit < (totalCount || 0),
        has_prev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error in schedule GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
