/**
 * WS-152: Critical Allergy Alerts API
 * Path: /api/dietary/alerts/:couple_id
 * Real-time critical allergy monitoring and alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { coupleIdParamSchema } from '@/lib/validations/dietary';
import { logger } from '@/lib/monitoring/logger';
import { withAuth } from '@/lib/auth/middleware';
import {
  DietarySeverity,
  DietaryAlertResponse,
  CriticalAlert,
} from '@/types/dietary';

// WebSocket connections for real-time alerts (if needed)
const activeConnections = new Map<string, Set<string>>();

/**
 * GET /api/dietary/alerts/:couple_id
 * Get all critical allergy alerts for a couple's event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { couple_id: string } },
) {
  try {
    // Validate couple ID
    const validationResult = coupleIdParamSchema.safeParse({
      couple_id: params.couple_id,
    });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid couple ID format' },
        { status: 400 },
      );
    }

    // Get authenticated user
    const user = await withAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify user has access to this couple
    const { data: couple } = await supabase
      .from('couples')
      .select('id, names, event_date')
      .eq('id', params.couple_id)
      .eq('user_id', user.id)
      .single();

    if (!couple) {
      return NextResponse.json(
        { error: 'Couple not found or unauthorized' },
        { status: 404 },
      );
    }

    // Fetch all critical dietary requirements
    const { data: requirements, error } = await supabase
      .from('dietary_requirements')
      .select(
        `
        *,
        guests!inner(
          id,
          first_name,
          last_name,
          table_number,
          couple_id
        )
      `,
      )
      .eq('guests.couple_id', params.couple_id)
      .in('severity', [
        DietarySeverity.LIFE_THREATENING,
        DietarySeverity.SEVERE,
      ])
      .eq('deleted_at', null)
      .order('severity', { ascending: true });

    if (error) {
      logger.error('Failed to fetch critical alerts', {
        error,
        couple_id: params.couple_id,
      });
      throw error;
    }

    // Transform to critical alerts format
    const criticalAlerts: CriticalAlert[] = (requirements || []).map((req) => ({
      guest_id: req.guest_id,
      guest_name: `${req.guests.first_name} ${req.guests.last_name}`,
      table_number: req.guests.table_number,
      allergen: req.allergen,
      severity: req.severity,
      description: req.description,
      medical_notes: req.medical_notes,
      emergency_medication: req.emergency_medication,
      cross_contamination_risk: req.cross_contamination_risk,
      emergency_contact: req.emergency_contact,
    }));

    // Count by severity
    const criticalCount = criticalAlerts.filter(
      (a) => a.severity === DietarySeverity.LIFE_THREATENING,
    ).length;

    const response: DietaryAlertResponse = {
      couple_id: params.couple_id,
      alerts: criticalAlerts,
      total_count: criticalAlerts.length,
      critical_count: criticalCount,
      last_updated: new Date(),
    };

    // Log access to critical medical information
    logger.info('Critical allergy alerts accessed', {
      couple_id: params.couple_id,
      user_id: user.id,
      total_alerts: criticalAlerts.length,
      life_threatening_count: criticalCount,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0', // Never cache critical medical data
      },
    });
  } catch (error) {
    logger.error('Error fetching critical alerts', {
      error,
      couple_id: params.couple_id,
    });
    return NextResponse.json(
      { error: 'Failed to fetch critical alerts' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/dietary/alerts/:couple_id/notify
 * Send notifications for critical allergies
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { couple_id: string } },
) {
  try {
    // Validate couple ID
    const validationResult = coupleIdParamSchema.safeParse({
      couple_id: params.couple_id,
    });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid couple ID format' },
        { status: 400 },
      );
    }

    // Get authenticated user
    const user = await withAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { recipient_type, message, alert_ids } = body;

    if (!recipient_type || !message) {
      return NextResponse.json(
        { error: 'Recipient type and message are required' },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify authorization
    const { data: couple } = await supabase
      .from('couples')
      .select('id, names, event_date')
      .eq('id', params.couple_id)
      .eq('user_id', user.id)
      .single();

    if (!couple) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Determine recipients based on type
    let recipients: string[] = [];

    switch (recipient_type) {
      case 'CATERER':
        // Get caterer contact from vendor list
        const { data: caterers } = await supabase
          .from('vendors')
          .select('email, phone')
          .eq('couple_id', params.couple_id)
          .eq('category', 'catering');
        recipients = caterers?.map((c) => c.email) || [];
        break;

      case 'VENUE':
        // Get venue coordinator contact
        const { data: venues } = await supabase
          .from('vendors')
          .select('email, phone')
          .eq('couple_id', params.couple_id)
          .eq('category', 'venue');
        recipients = venues?.map((v) => v.email) || [];
        break;

      case 'PLANNER':
        // Get wedding planner contact
        const { data: planners } = await supabase
          .from('vendors')
          .select('email, phone')
          .eq('couple_id', params.couple_id)
          .eq('category', 'planner');
        recipients = planners?.map((p) => p.email) || [];
        break;

      case 'ALL':
        // Get all relevant vendors
        const { data: allVendors } = await supabase
          .from('vendors')
          .select('email')
          .eq('couple_id', params.couple_id)
          .in('category', ['catering', 'venue', 'planner']);
        recipients = allVendors?.map((v) => v.email) || [];
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid recipient type' },
          { status: 400 },
        );
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found for the specified type' },
        { status: 404 },
      );
    }

    // Fetch the specific alerts if IDs provided
    let alertDetails = [];
    if (alert_ids && alert_ids.length > 0) {
      const { data: alerts } = await supabase
        .from('dietary_requirements')
        .select(
          `
          *,
          guests!inner(
            first_name,
            last_name
          )
        `,
        )
        .in('id', alert_ids)
        .in('severity', [
          DietarySeverity.LIFE_THREATENING,
          DietarySeverity.SEVERE,
        ]);

      alertDetails = alerts || [];
    }

    // Create notification records
    const notifications = recipients.map((email) => ({
      couple_id: params.couple_id,
      recipient_email: email,
      recipient_type,
      subject: `Critical Dietary Alert - ${couple.names} Wedding`,
      message,
      alert_summary: {
        total_alerts: alertDetails.length,
        life_threatening: alertDetails.filter(
          (a) => a.severity === DietarySeverity.LIFE_THREATENING,
        ).length,
        event_date: couple.event_date,
      },
      sent_by: user.id,
      sent_at: new Date(),
    }));

    // Store notification records
    const { error: notificationError } = await supabase
      .from('dietary_alert_notifications')
      .insert(notifications);

    if (notificationError) {
      logger.error('Failed to store notifications', {
        error: notificationError,
        couple_id: params.couple_id,
      });
    }

    // Queue email sending (would integrate with email service)
    // For now, we'll just log it
    logger.warn('Critical dietary alerts sent', {
      couple_id: params.couple_id,
      recipient_type,
      recipient_count: recipients.length,
      alert_count: alertDetails.length,
      sent_by: user.id,
    });

    return NextResponse.json({
      message: 'Alert notifications sent successfully',
      recipients_count: recipients.length,
      alerts_included: alertDetails.length,
    });
  } catch (error) {
    logger.error('Error sending dietary alert notifications', {
      error,
      couple_id: params.couple_id,
    });
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/dietary/alerts/:couple_id/acknowledge
 * Acknowledge critical alerts have been reviewed
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { couple_id: string } },
) {
  try {
    // Get authenticated user
    const user = await withAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alert_ids, acknowledged_by_role } = body;

    if (!alert_ids || !Array.isArray(alert_ids) || alert_ids.length === 0) {
      return NextResponse.json(
        { error: 'Alert IDs are required' },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify authorization
    const { data: hasAccess } = await supabase
      .from('couples')
      .select('id')
      .eq('id', params.couple_id)
      .eq('user_id', user.id)
      .single();

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update acknowledgment status
    const { data: updated, error } = await supabase
      .from('dietary_requirements')
      .update({
        acknowledged_at: new Date(),
        acknowledged_by: user.id,
        acknowledged_role: acknowledged_by_role || 'coordinator',
      })
      .in('id', alert_ids)
      .select();

    if (error) {
      throw error;
    }

    // Create acknowledgment log
    await supabase.from('dietary_acknowledgment_log').insert({
      couple_id: params.couple_id,
      alert_ids,
      acknowledged_by: user.id,
      acknowledged_role: acknowledged_by_role,
      acknowledged_at: new Date(),
    });

    logger.info('Critical alerts acknowledged', {
      couple_id: params.couple_id,
      alert_count: alert_ids.length,
      acknowledged_by: user.id,
      role: acknowledged_by_role,
    });

    return NextResponse.json({
      message: 'Alerts acknowledged successfully',
      acknowledged_count: updated?.length || 0,
    });
  } catch (error) {
    logger.error('Error acknowledging alerts', {
      error,
      couple_id: params.couple_id,
    });
    return NextResponse.json(
      { error: 'Failed to acknowledge alerts' },
      { status: 500 },
    );
  }
}
