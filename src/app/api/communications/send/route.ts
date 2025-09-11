import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import rateLimit from '@/lib/rate-limit';
import {
  sanitizeString,
  sanitizeHTML,
  validateAndSanitizeObject,
} from '@/lib/security/input-validation';
import { EmailService } from '@/lib/email/service';
import { smsService } from '@/lib/sms/twilio';
import { PersonalizationEngine } from '@/lib/communications/personalization-engine';
import { BulkMessageQueue } from '@/lib/communications/bulk-queue';

// Rate limiting for bulk communications
const bulkMessageRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100,
});

// Validation schemas
const recipientSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['client', 'vendor', 'guest']),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string(),
  data: z.record(z.any()).optional(), // For personalization variables
});

const bulkMessageSchema = z.object({
  recipients: z.array(recipientSchema).min(1).max(500), // Limit to 500 recipients per batch
  channels: z.array(z.enum(['email', 'sms'])).min(1),
  template_type: z.enum([
    'wedding_update',
    'venue_change',
    'menu_info',
    'rsvp_reminder',
    'thank_you',
    'custom',
  ]),
  subject: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(5000),
  personalization: z.boolean().default(true),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  schedule_for: z.string().datetime().optional(),
  test_mode: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});

interface BulkMessageResult {
  campaign_id: string;
  total_recipients: number;
  queued: number;
  failed: number;
  results: {
    recipient_id: string;
    channels: ('email' | 'sms')[];
    status: 'queued' | 'failed';
    error?: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await bulkMessageRateLimit.check(10, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many bulk message requests' },
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

    // Validate request body
    const rawBody = await request.json();
    const validatedData = bulkMessageSchema.parse(rawBody);

    // Sanitize message content
    const sanitizedMessage = sanitizeHTML(validatedData.message);
    const sanitizedSubject = validatedData.subject
      ? sanitizeString(validatedData.subject, 200)
      : undefined;

    // Verify organization has permission for bulk messaging
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

    // Check if bulk messaging is allowed for this tier
    const allowsBulkMessaging = [
      'PROFESSIONAL',
      'SCALE',
      'ENTERPRISE',
    ].includes(organization.pricing_tier);
    if (!allowsBulkMessaging && !validatedData.test_mode) {
      return NextResponse.json(
        {
          error:
            'Bulk messaging not available on current plan. Upgrade to Professional or higher.',
        },
        { status: 403 },
      );
    }

    // Generate campaign ID
    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from('communication_campaigns')
      .insert({
        id: campaignId,
        organization_id: userProfile.organization_id,
        created_by: user.id,
        template_type: validatedData.template_type,
        subject: sanitizedSubject,
        message_content: sanitizedMessage,
        channels: validatedData.channels,
        total_recipients: validatedData.recipients.length,
        priority: validatedData.priority,
        scheduled_for: validatedData.schedule_for,
        status:
          validatedData.schedule_for &&
          new Date(validatedData.schedule_for) > new Date()
            ? 'scheduled'
            : 'processing',
        test_mode: validatedData.test_mode,
        metadata: validatedData.metadata || {},
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      return NextResponse.json(
        { error: 'Failed to create communication campaign' },
        { status: 500 },
      );
    }

    const result: BulkMessageResult = {
      campaign_id: campaignId,
      total_recipients: validatedData.recipients.length,
      queued: 0,
      failed: 0,
      results: [],
    };

    // Initialize personalization engine
    const personalizationEngine = new PersonalizationEngine();

    // Process each recipient
    for (const recipient of validatedData.recipients) {
      const recipientResult = {
        recipient_id: recipient.id,
        channels: [] as ('email' | 'sms')[],
        status: 'queued' as 'queued' | 'failed',
        error: undefined as string | undefined,
      };

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

        // Handle Email Channel
        if (validatedData.channels.includes('email') && recipient.email) {
          try {
            if (validatedData.test_mode) {
              // Test mode - don't actually send
              console.log(`TEST MODE: Would send email to ${recipient.email}`);
              recipientResult.channels.push('email');
            } else if (
              validatedData.schedule_for &&
              new Date(validatedData.schedule_for) > new Date()
            ) {
              // Schedule for later - add to queue
              await BulkMessageQueue.addEmailToQueue({
                campaignId,
                recipientId: recipient.id,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                subject: personalizedSubject || 'Wedding Communication',
                message: personalizedMessage,
                templateType: validatedData.template_type,
                organizationId: userProfile.organization_id,
                priority: validatedData.priority,
                scheduledFor: new Date(validatedData.schedule_for),
              });
              recipientResult.channels.push('email');
            } else {
              // Send immediately
              await BulkMessageQueue.addEmailToQueue({
                campaignId,
                recipientId: recipient.id,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                subject: personalizedSubject || 'Wedding Communication',
                message: personalizedMessage,
                templateType: validatedData.template_type,
                organizationId: userProfile.organization_id,
                priority: validatedData.priority,
              });
              recipientResult.channels.push('email');
            }
          } catch (emailError) {
            console.error(
              `Error queueing email for ${recipient.id}:`,
              emailError,
            );
            recipientResult.error = `Email failed: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`;
          }
        }

        // Handle SMS Channel
        if (validatedData.channels.includes('sms') && recipient.phone) {
          try {
            if (validatedData.test_mode) {
              // Test mode - don't actually send
              console.log(`TEST MODE: Would send SMS to ${recipient.phone}`);
              recipientResult.channels.push('sms');
            } else if (
              validatedData.schedule_for &&
              new Date(validatedData.schedule_for) > new Date()
            ) {
              // Schedule for later - add to queue
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
                scheduledFor: new Date(validatedData.schedule_for),
              });
              recipientResult.channels.push('sms');
            } else {
              // Send immediately
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
              });
              recipientResult.channels.push('sms');
            }
          } catch (smsError) {
            console.error(`Error queueing SMS for ${recipient.id}:`, smsError);
            recipientResult.error = recipientResult.error
              ? `${recipientResult.error}, SMS failed: ${smsError instanceof Error ? smsError.message : 'Unknown error'}`
              : `SMS failed: ${smsError instanceof Error ? smsError.message : 'Unknown error'}`;
          }
        }

        if (recipientResult.channels.length > 0) {
          result.queued++;
        } else {
          result.failed++;
          recipientResult.status = 'failed';
          if (!recipientResult.error) {
            recipientResult.error = 'No valid communication channels available';
          }
        }
      } catch (error) {
        console.error(`Error processing recipient ${recipient.id}:`, error);
        recipientResult.status = 'failed';
        recipientResult.error =
          error instanceof Error ? error.message : 'Unknown processing error';
        result.failed++;
      }

      result.results.push(recipientResult);
    }

    // Update campaign status
    await supabase
      .from('communication_campaigns')
      .update({
        queued_count: result.queued,
        failed_count: result.failed,
        status:
          result.queued > 0
            ? validatedData.schedule_for &&
              new Date(validatedData.schedule_for) > new Date()
              ? 'scheduled'
              : 'processing'
            : 'failed',
      })
      .eq('id', campaignId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in bulk message send:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid message data',
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
