import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ViralReportingService } from '@/lib/services/viral-reporting-service';
import { ViralCoefficientService } from '@/lib/services/viral-coefficient-service';
import { z } from 'zod';

const CreateAlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  metric_name: z.enum([
    'viral_coefficient',
    'stage_1_rate',
    'stage_2_rate',
    'stage_3_rate',
    'stage_4_rate',
    'stage_5_rate',
    'invitation_acceptance_rate',
    'new_signups',
    'conversion_rate',
  ]),
  condition_type: z.enum(['above', 'below', 'change_percentage', 'trend']),
  threshold_value: z.number(),
  comparison_period: z.enum(['1d', '7d', '30d']).default('7d'),
  notification_channels: z.array(z.enum(['email', 'sms', 'webhook'])).min(1),
  webhook_url: z.string().url().optional(),
  is_active: z.boolean().default(true),
});

const UpdateAlertRuleSchema = z.object({
  alert_rule_ids: z.array(z.string().uuid()),
  updates: z.object({
    is_active: z.boolean().optional(),
    threshold_value: z.number().optional(),
    notification_channels: z
      .array(z.enum(['email', 'sms', 'webhook']))
      .optional(),
    webhook_url: z.string().url().optional(),
  }),
});

const AlertFiltersSchema = z.object({
  severity: z.enum(['critical', 'warning', 'info']).optional(),
  status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
  metric_name: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

/**
 * POST /api/viral/alerts
 * Create a new alert rule
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = CreateAlertRuleSchema.parse(body);

    // Validate webhook URL if webhook notification is selected
    if (
      validatedData.notification_channels.includes('webhook') &&
      !validatedData.webhook_url
    ) {
      return NextResponse.json(
        {
          error:
            'webhook_url is required when webhook notification is selected',
          code: 'MISSING_WEBHOOK_URL',
        },
        { status: 400 },
      );
    }

    const viralService = new ViralCoefficientService(supabase);
    const reportingService = new ViralReportingService(supabase, viralService);

    const alertRule = await reportingService.createAlertRule({
      user_id: user.id,
      ...validatedData,
    });

    return NextResponse.json(
      {
        success: true,
        data: alertRule,
        message: 'Alert rule created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create alert rule error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid alert rule data',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create alert rule',
        code: 'CREATION_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/viral/alerts
 * Get active alerts and alert rules with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const alertType = url.searchParams.get('type') || 'alerts'; // 'alerts' or 'rules'

    if (alertType === 'rules') {
      // Get alert rules
      const { data: alertRules, error } = await supabase
        .from('viral_alert_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: {
          alert_rules: alertRules || [],
          total_rules: alertRules?.length || 0,
          active_rules:
            alertRules?.filter((rule) => rule.is_active).length || 0,
        },
      });
    }

    // Get active alerts with filtering
    const filters = {
      severity: url.searchParams.get('severity'),
      status: url.searchParams.get('status'),
      metric_name: url.searchParams.get('metric_name'),
      date_from: url.searchParams.get('date_from'),
      date_to: url.searchParams.get('date_to'),
      page: url.searchParams.get('page') || '1',
      limit: url.searchParams.get('limit') || '20',
    };

    const validatedFilters = AlertFiltersSchema.parse(filters);

    let query = supabase
      .from('viral_alerts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Apply filters
    if (validatedFilters.severity) {
      query = query.eq('severity', validatedFilters.severity);
    }

    if (validatedFilters.metric_name) {
      query = query.eq('metric_name', validatedFilters.metric_name);
    }

    if (validatedFilters.date_from) {
      query = query.gte('triggered_at', validatedFilters.date_from);
    }

    if (validatedFilters.date_to) {
      query = query.lte('triggered_at', validatedFilters.date_to);
    }

    // Filter by status
    if (validatedFilters.status === 'active') {
      query = query.is('acknowledged_at', null).is('resolved_at', null);
    } else if (validatedFilters.status === 'acknowledged') {
      query = query.not('acknowledged_at', 'is', null).is('resolved_at', null);
    } else if (validatedFilters.status === 'resolved') {
      query = query.not('resolved_at', 'is', null);
    }

    // Apply pagination
    const page = validatedFilters.page || 1;
    const limit = Math.min(validatedFilters.limit || 20, 100);
    const offset = (page - 1) * limit;

    query = query
      .order('triggered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: alerts, error, count } = await query;

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / limit);

    // Get summary statistics
    const { data: alertStats } = await supabase
      .from('viral_alerts')
      .select('severity, acknowledged_at, resolved_at')
      .eq('user_id', user.id);

    const summary = {
      total_alerts: alertStats?.length || 0,
      active_alerts:
        alertStats?.filter((a) => !a.acknowledged_at && !a.resolved_at)
          .length || 0,
      critical_alerts:
        alertStats?.filter((a) => a.severity === 'critical' && !a.resolved_at)
          .length || 0,
      resolved_alerts: alertStats?.filter((a) => a.resolved_at).length || 0,
    };

    return NextResponse.json({
      success: true,
      data: alerts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
      },
      summary,
      metadata: {
        filters: validatedFilters,
        user_id: user.id,
      },
    });
  } catch (error) {
    console.error('Get alerts error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to retrieve alerts',
        code: 'FETCH_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/viral/alerts
 * Update alert rules or acknowledge/resolve alerts
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const actionType = body.action_type || 'update_rules'; // 'update_rules', 'acknowledge', 'resolve'

    if (actionType === 'update_rules') {
      const validatedData = UpdateAlertRuleSchema.parse(body);

      const updateData = {
        ...validatedData.updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('viral_alert_rules')
        .update(updateData)
        .in('id', validatedData.alert_rule_ids)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: {
          updated_rules: data || [],
          updated_count: data?.length || 0,
        },
        message: `${data?.length || 0} alert rules updated successfully`,
      });
    }

    if (actionType === 'acknowledge' || actionType === 'resolve') {
      const alertIds = body.alert_ids;
      if (!Array.isArray(alertIds) || alertIds.length === 0) {
        return NextResponse.json(
          {
            error: 'alert_ids must be a non-empty array',
            code: 'MISSING_ALERT_IDS',
          },
          { status: 400 },
        );
      }

      const updateField =
        actionType === 'acknowledge' ? 'acknowledged_at' : 'resolved_at';
      const updateData: Record<string, any> = {
        [updateField]: new Date().toISOString(),
      };

      if (actionType === 'resolve') {
        updateData.actions_taken = body.actions_taken || [];
      }

      const { data, error } = await supabase
        .from('viral_alerts')
        .update(updateData)
        .in('id', alertIds)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: {
          updated_alerts: data || [],
          updated_count: data?.length || 0,
        },
        message: `${data?.length || 0} alerts ${actionType}d successfully`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action_type', code: 'INVALID_ACTION' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Update alerts error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update alerts',
        code: 'UPDATE_ERROR',
      },
      { status: 500 },
    );
  }
}

const DeleteRulesSchema = z.object({
  alert_rule_ids: z.array(z.string().uuid()).min(1).max(50),
});

/**
 * DELETE /api/viral/alerts
 * Delete alert rules
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = DeleteRulesSchema.parse(body);

    // Soft delete by marking as inactive
    const { data, error } = await supabase
      .from('viral_alert_rules')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', validatedData.alert_rule_ids)
      .eq('user_id', user.id)
      .select('id, name');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        deleted_rules: data || [],
        deleted_count: data?.length || 0,
      },
      message: `${data?.length || 0} alert rules deleted successfully`,
    });
  } catch (error) {
    console.error('Delete alert rules error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid delete request',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete alert rules',
        code: 'DELETE_ERROR',
      },
      { status: 500 },
    );
  }
}
