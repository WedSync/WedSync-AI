import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / windowMs)}`;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const current = rateLimitStore.get(key)!;
  if (current.count >= limit) {
    return false;
  }

  current.count++;
  return true;
}

// Validation schema for activation alerts
const ActivationAlertSchema = z.object({
  alert_type: z.enum(['drop_off', 'slow_progress', 'stalled']),
  trigger_conditions: z.object({
    days_inactive: z.number().min(1).max(30).optional(),
    score_threshold: z.number().min(0).max(100).optional(),
    step_threshold: z.number().min(0).max(10).optional(),
  }),
  notification_channels: z
    .array(z.enum(['email', 'slack', 'in_app']))
    .default(['email']),
  is_active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 100 requests per minute per IP
    const ip = request.ip || 'unknown';
    if (!checkRateLimit(ip, 100, 60000)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 },
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 },
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !['admin', 'owner', 'super_admin'].includes(profile.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin access required',
          code: 'ACCESS_DENIED',
        },
        { status: 403 },
      );
    }

    // Get all alerts with funnel information
    const { data: alerts, error: alertsError } = await supabase
      .from('activation_alerts')
      .select(
        `
        *,
        activation_funnels:funnel_id (
          id,
          name,
          description
        )
      `,
      )
      .order('created_at', { ascending: false });

    if (alertsError) {
      console.error('Error fetching activation alerts:', alertsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch alerts',
          code: 'FETCH_ERROR',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: alerts || [],
    });
  } catch (error) {
    console.error('Error in activation alerts GET API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests per minute per IP
    const ip = request.ip || 'unknown';
    if (!checkRateLimit(ip, 10, 60000)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 },
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 },
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !['admin', 'owner', 'super_admin'].includes(profile.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin access required',
          code: 'ACCESS_DENIED',
        },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ActivationAlertSchema.parse(body);

    // Get default funnel ID
    const { data: defaultFunnel, error: funnelError } = await supabase
      .from('activation_funnels')
      .select('id')
      .eq('is_active', true)
      .single();

    if (funnelError || !defaultFunnel) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active funnel found',
          code: 'NO_FUNNEL',
        },
        { status: 400 },
      );
    }

    // Insert new alert
    const { data: alert, error: insertError } = await supabase
      .from('activation_alerts')
      .insert({
        funnel_id: defaultFunnel.id,
        alert_type: validatedData.alert_type,
        trigger_conditions: validatedData.trigger_conditions,
        notification_channels: validatedData.notification_channels,
        is_active: validatedData.is_active,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating activation alert:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create alert',
          code: 'INSERT_ERROR',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    console.error('Error in activation alerts POST API:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}

// Check for users who need alerts and send them
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute per IP (for processing alerts)
    const ip = request.ip || 'unknown';
    if (!checkRateLimit(ip, 5, 60000)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 },
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 },
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !['admin', 'owner', 'super_admin'].includes(profile.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin access required',
          code: 'ACCESS_DENIED',
        },
        { status: 403 },
      );
    }

    // Get all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('activation_alerts')
      .select('*')
      .eq('is_active', true);

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch alerts',
          code: 'FETCH_ERROR',
        },
        { status: 500 },
      );
    }

    const results: Array<{
      alert_id: string;
      users_triggered: number;
      notifications_sent: number;
    }> = [];

    // Process each alert
    for (const alert of alerts || []) {
      let query = supabase
        .from('user_activation_status')
        .select(
          `
          user_id,
          activation_score,
          last_activity_at,
          current_step,
          user_profiles!inner(email, first_name, last_name)
        `,
        )
        .is('completed_at', null);

      // Apply alert-specific conditions
      const conditions = alert.trigger_conditions as any;

      if (alert.alert_type === 'drop_off' && conditions.days_inactive) {
        const thresholdDate = new Date();
        thresholdDate.setDate(
          thresholdDate.getDate() - conditions.days_inactive,
        );
        query = query.lt('last_activity_at', thresholdDate.toISOString());
      }

      if (conditions.score_threshold !== undefined) {
        query = query.lt('activation_score', conditions.score_threshold);
      }

      if (conditions.step_threshold !== undefined) {
        query = query.lt('current_step', conditions.step_threshold);
      }

      const { data: usersToAlert, error: usersError } = await query.limit(100);

      if (usersError) {
        console.error('Error fetching users for alert:', usersError);
        continue;
      }

      let notificationsSent = 0;

      // Send notifications for each user
      for (const userStatus of usersToAlert || []) {
        // Check if we've already sent this alert recently
        const { data: recentAlert, error: recentAlertError } = await supabase
          .from('user_alert_history')
          .select('id')
          .eq('user_id', userStatus.user_id)
          .eq('alert_id', alert.id)
          .gte(
            'sent_at',
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          ) // Last 24 hours
          .single();

        if (!recentAlertError && recentAlert) {
          // Already sent this alert recently
          continue;
        }

        // Send notifications based on configured channels
        for (const channel of alert.notification_channels as string[]) {
          try {
            let messageId = null;

            if (channel === 'email') {
              // Send email notification (integrate with your email service)
              const emailResult = await sendActivationAlert({
                type: alert.alert_type,
                user: userStatus.user_profiles,
                activationScore: userStatus.activation_score,
                currentStep: userStatus.current_step,
                lastActivity: userStatus.last_activity_at,
              });
              messageId = emailResult.messageId;
            } else if (channel === 'slack') {
              // Send Slack notification (if configured)
              // Implementation depends on your Slack integration
            } else if (channel === 'in_app') {
              // Create in-app notification
              await supabase.from('notifications').insert({
                user_id: userStatus.user_id,
                title: 'Activation Help Available',
                message: getAlertMessage(
                  alert.alert_type,
                  userStatus.activation_score,
                ),
                type: 'activation_alert',
                metadata: { alert_id: alert.id },
              });
            }

            // Record the alert in history
            await supabase.from('user_alert_history').insert({
              user_id: userStatus.user_id,
              alert_id: alert.id,
              alert_type: alert.alert_type,
              channel: channel,
              message_id: messageId,
            });

            notificationsSent++;
          } catch (err) {
            console.error('Error sending notification:', err);
          }
        }
      }

      // Update last triggered time
      if (usersToAlert && usersToAlert.length > 0) {
        await supabase
          .from('activation_alerts')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', alert.id);
      }

      results.push({
        alert_id: alert.id,
        users_triggered: usersToAlert?.length || 0,
        notifications_sent: notificationsSent,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        processed_alerts: results.length,
        total_notifications: results.reduce(
          (sum, r) => sum + r.notifications_sent,
          0,
        ),
        results,
      },
    });
  } catch (error) {
    console.error('Error processing activation alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}

// Helper functions
async function sendActivationAlert(data: {
  type: string;
  user: { email: string; first_name: string; last_name: string };
  activationScore: number;
  currentStep: number;
  lastActivity: string;
}) {
  // This would integrate with your email service (Resend, SendGrid, etc.)
  // For now, we'll just log it
  console.log('Sending activation alert email:', data);

  return { messageId: `mock_${Date.now()}` };
}

function getAlertMessage(alertType: string, score: number): string {
  switch (alertType) {
    case 'drop_off':
      return `We noticed you haven't been active recently. Let us help you get the most out of WedSync!`;
    case 'slow_progress':
      return `Your activation is progressing slowly. Would you like some assistance to speed things up?`;
    case 'stalled':
      return `Your activation seems to have stalled at ${score} points. Our team is here to help you succeed!`;
    default:
      return "We're here to help you get the most out of WedSync!";
  }
}
