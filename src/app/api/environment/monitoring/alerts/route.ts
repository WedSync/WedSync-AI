import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { AlertManager } from '@/lib/services/monitoring/AlertManager';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { z } from 'zod';

const alertsLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many alert configuration requests',
});

const AlertConditionSchema = z.object({
  condition_id: z.string().optional(),
  metric_name: z.string(),
  operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte', 'ne']),
  threshold: z.number(),
  duration_minutes: z.number().min(1).max(1440),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
});

const AlertChannelSchema = z.object({
  channel_id: z.string().optional(),
  type: z.enum(['email', 'sms', 'slack', 'webhook', 'dashboard']),
  configuration: z.record(z.any()),
  enabled: z.boolean().default(true),
  severity_filter: z
    .array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']))
    .optional(),
  name: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await alertsLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 401 },
      );
    }

    const supabase = createClient();

    // Get alert conditions
    const { data: conditions } = await supabase
      .from('alert_conditions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Get alert channels
    const { data: channels } = await supabase
      .from('alert_channels')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Get recent alert events
    const { data: recentEvents } = await supabase
      .from('alert_events')
      .select('*')
      .eq('organization_id', organizationId)
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      conditions: conditions || [],
      channels: channels || [],
      recent_events: recentEvents || [],
      summary: {
        total_conditions: conditions?.length || 0,
        active_conditions: conditions?.filter((c) => c.enabled).length || 0,
        total_channels: channels?.length || 0,
        active_channels: channels?.filter((c) => c.enabled).length || 0,
        alerts_24h: recentEvents?.length || 0,
        critical_alerts_24h:
          recentEvents?.filter((e) => e.severity === 'CRITICAL').length || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching alert configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert configuration' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await alertsLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');
    const userId = headersList.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Organization and user context required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { action, data } = body;

    const supabase = createClient();
    const alertManager = new AlertManager();

    switch (action) {
      case 'create_condition': {
        const validatedCondition = AlertConditionSchema.parse(data);
        const conditionId =
          validatedCondition.condition_id || `condition_${Date.now()}`;

        const { error } = await supabase.from('alert_conditions').insert({
          condition_id: conditionId,
          organization_id: organizationId,
          metric_name: validatedCondition.metric_name,
          operator: validatedCondition.operator,
          threshold: validatedCondition.threshold,
          duration_minutes: validatedCondition.duration_minutes,
          severity: validatedCondition.severity,
          enabled: validatedCondition.enabled,
          description: validatedCondition.description,
          created_by: userId,
        });

        if (error) {
          throw new Error(`Failed to create alert condition: ${error.message}`);
        }

        return NextResponse.json({
          success: true,
          condition_id: conditionId,
          message: 'Alert condition created successfully',
        });
      }

      case 'create_channel': {
        const validatedChannel = AlertChannelSchema.parse(data);
        const channelId =
          validatedChannel.channel_id || `channel_${Date.now()}`;

        const { error } = await supabase.from('alert_channels').insert({
          channel_id: channelId,
          organization_id: organizationId,
          type: validatedChannel.type,
          name: validatedChannel.name,
          configuration: validatedChannel.configuration,
          enabled: validatedChannel.enabled,
          severity_filter: validatedChannel.severity_filter,
          created_by: userId,
        });

        if (error) {
          throw new Error(`Failed to create alert channel: ${error.message}`);
        }

        return NextResponse.json({
          success: true,
          channel_id: channelId,
          message: 'Alert channel created successfully',
        });
      }

      case 'test_alert': {
        const testAlert = {
          alert_type: 'system_failure' as const,
          severity: 'MEDIUM' as const,
          title: 'Test Alert',
          message: 'This is a test alert to verify your alert configuration',
          escalation_level: 0,
        };

        const result = await alertManager.sendAlert(organizationId, testAlert);

        return NextResponse.json({
          success: result.success,
          sent_channels: result.sent_channels,
          failed_channels: result.failed_channels,
          message: 'Test alert sent',
        });
      }

      case 'update_condition': {
        const { condition_id, ...updateData } = data;
        const validatedUpdate =
          AlertConditionSchema.partial().parse(updateData);

        const { error } = await supabase
          .from('alert_conditions')
          .update(validatedUpdate)
          .eq('condition_id', condition_id)
          .eq('organization_id', organizationId);

        if (error) {
          throw new Error(`Failed to update alert condition: ${error.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Alert condition updated successfully',
        });
      }

      case 'update_channel': {
        const { channel_id, ...updateData } = data;
        const validatedUpdate = AlertChannelSchema.partial().parse(updateData);

        const { error } = await supabase
          .from('alert_channels')
          .update(validatedUpdate)
          .eq('channel_id', channel_id)
          .eq('organization_id', organizationId);

        if (error) {
          throw new Error(`Failed to update alert channel: ${error.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Alert channel updated successfully',
        });
      }

      case 'delete_condition': {
        const { condition_id } = data;

        const { error } = await supabase
          .from('alert_conditions')
          .delete()
          .eq('condition_id', condition_id)
          .eq('organization_id', organizationId);

        if (error) {
          throw new Error(`Failed to delete alert condition: ${error.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Alert condition deleted successfully',
        });
      }

      case 'delete_channel': {
        const { channel_id } = data;

        const { error } = await supabase
          .from('alert_channels')
          .delete()
          .eq('channel_id', channel_id)
          .eq('organization_id', organizationId);

        if (error) {
          throw new Error(`Failed to delete alert channel: ${error.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Alert channel deleted successfully',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Error configuring alerts:', error);
    return NextResponse.json(
      {
        error: 'Failed to configure alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
