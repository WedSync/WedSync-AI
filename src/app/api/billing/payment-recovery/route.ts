// WS-131: Payment Recovery API
// API endpoints for payment error handling and recovery workflows

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paymentErrorHandler } from '@/lib/billing/payment-error-handler';

export const dynamic = 'force-dynamic';

// GET /api/billing/payment-recovery - Get payment error status and recovery info
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
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const errorId = searchParams.get('error_id');
    const subscriptionId = searchParams.get('subscription_id');

    // Verify user permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile?.role && ['admin', 'system'].includes(profile.role);

    switch (action) {
      case 'status':
        // Get payment error status for user's subscriptions
        let query = supabase.from('payment_errors').select(`
            id,
            error_type,
            error_code,
            error_message,
            severity,
            status,
            retry_count,
            max_retries,
            timestamp,
            recoverable,
            subscription_id,
            amount,
            currency
          `);

        if (!isAdmin) {
          query = query.eq('user_id', user.id);
        }

        if (subscriptionId) {
          query = query.eq('subscription_id', subscriptionId);
        }

        query = query
          .in('status', ['open', 'in_progress'])
          .order('timestamp', { ascending: false })
          .limit(10);

        const { data: errors, error: errorsError } = await query;
        if (errorsError) throw errorsError;

        return NextResponse.json({
          success: true,
          data: {
            active_errors: errors?.length || 0,
            errors: errors || [],
            user_id: user.id,
            is_admin: isAdmin,
          },
        });

      case 'recovery_status':
        if (!errorId) {
          return NextResponse.json(
            { error: 'Error ID required' },
            { status: 400 },
          );
        }

        // Get recovery attempts for specific error
        const { data: recoveryAttempts, error: recoveryError } = await supabase
          .from('payment_recovery_attempts')
          .select(
            `
            id,
            action_type,
            attempt_number,
            success,
            action_taken,
            customer_notified,
            admin_alerted,
            error_resolved,
            next_scheduled_at,
            created_at
          `,
          )
          .eq('error_id', errorId)
          .order('created_at', { ascending: false });

        if (recoveryError) throw recoveryError;

        const { data: errorInfo } = await supabase
          .from('payment_errors')
          .select('*')
          .eq('id', errorId)
          .single();

        // Check user access to this error
        if (!isAdmin && errorInfo?.user_id !== user.id) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({
          success: true,
          data: {
            error: errorInfo,
            recovery_attempts: recoveryAttempts || [],
            total_attempts: recoveryAttempts?.length || 0,
            last_attempt: recoveryAttempts?.[0] || null,
          },
        });

      case 'payment_method_requests':
        // Get pending payment method update requests
        let pmQuery = supabase
          .from('payment_method_update_requests')
          .select(
            `
            id,
            stripe_setup_intent_id,
            status,
            requested_at,
            expires_at,
            subscription_id
          `,
          )
          .in('status', ['pending', 'completed', 'failed']);

        if (!isAdmin) {
          pmQuery = pmQuery.eq('user_id', user.id);
        }

        const { data: pmRequests, error: pmError } = await pmQuery.order(
          'requested_at',
          { ascending: false },
        );

        if (pmError) throw pmError;

        return NextResponse.json({
          success: true,
          data: {
            requests: pmRequests || [],
            pending_count:
              pmRequests?.filter((r) => r.status === 'pending').length || 0,
          },
        });

      case 'support_tickets':
        // Get payment-related support tickets
        let ticketQuery = supabase.from('payment_support_tickets').select(`
            id,
            ticket_number,
            priority,
            category,
            subject,
            status,
            created_at,
            updated_at
          `);

        if (!isAdmin) {
          ticketQuery = ticketQuery.eq('user_id', user.id);
        }

        const { data: tickets, error: ticketsError } = await ticketQuery
          .order('created_at', { ascending: false })
          .limit(20);

        if (ticketsError) throw ticketsError;

        return NextResponse.json({
          success: true,
          data: {
            tickets: tickets || [],
            open_tickets:
              tickets?.filter((t) => t.status === 'open').length || 0,
          },
        });

      case 'error_patterns':
        // Admin only - get error pattern analysis
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 },
          );
        }

        const { data: patterns, error: patternsError } = await supabase.rpc(
          'detect_error_patterns',
        );

        if (patternsError) throw patternsError;

        return NextResponse.json({
          success: true,
          data: {
            detected_patterns: patterns || [],
            alert_count: patterns?.filter((p) => p.should_alert).length || 0,
          },
        });

      case 'metrics':
        // Admin only - get payment error metrics
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 },
          );
        }

        const timeRange = searchParams.get('range') || '24h';
        let startDate = new Date();

        switch (timeRange) {
          case '1h':
            startDate.setHours(startDate.getHours() - 1);
            break;
          case '24h':
            startDate.setHours(startDate.getHours() - 24);
            break;
          case '7d':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case '30d':
          default:
            startDate.setDate(startDate.getDate() - 30);
        }

        const { data: metrics, error: metricsError } = await supabase.rpc(
          'calculate_payment_error_metrics',
          {
            start_date: startDate.toISOString(),
            end_date: new Date().toISOString(),
          },
        );

        if (metricsError) throw metricsError;

        return NextResponse.json({
          success: true,
          data: {
            time_range: timeRange,
            start_date: startDate.toISOString(),
            end_date: new Date().toISOString(),
            metrics: metrics?.[0] || {},
          },
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Payment recovery GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// POST /api/billing/payment-recovery - Handle payment recovery actions
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
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { action, ...actionData } = body;

    // Verify user permissions for certain actions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile?.role && ['admin', 'system'].includes(profile.role);

    switch (action) {
      case 'handle_payment_error':
        const { error: paymentError, context } = actionData;

        if (!paymentError || !context) {
          return NextResponse.json(
            { error: 'Payment error and context required' },
            { status: 400 },
          );
        }

        // Ensure context includes user_id
        context.userId = user.id;

        const recoveryResult = await paymentErrorHandler.handlePaymentError(
          paymentError,
          context,
        );

        return NextResponse.json({
          success: true,
          data: recoveryResult,
        });

      case 'retry_payment':
        const { error_id } = actionData;

        if (!error_id) {
          return NextResponse.json(
            { error: 'Error ID required' },
            { status: 400 },
          );
        }

        // Get error details
        const { data: errorDetails, error: fetchError } = await supabase
          .from('payment_errors')
          .select('*')
          .eq('id', error_id)
          .single();

        if (fetchError) throw fetchError;

        // Check user access
        if (!isAdmin && errorDetails?.user_id !== user.id) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check if retry is allowed
        if (errorDetails.retry_count >= errorDetails.max_retries) {
          return NextResponse.json(
            { error: 'Maximum retry attempts reached' },
            { status: 400 },
          );
        }

        if (!errorDetails.recoverable) {
          return NextResponse.json(
            { error: 'Error is not recoverable' },
            { status: 400 },
          );
        }

        // Execute retry through error handler
        const retryResult = await paymentErrorHandler.handlePaymentError(
          {
            type: errorDetails.error_type,
            code: errorDetails.error_code,
            message: errorDetails.error_message,
          },
          {
            paymentIntentId: errorDetails.payment_intent_id,
            subscriptionId: errorDetails.subscription_id,
            userId: errorDetails.user_id,
            organizationId: errorDetails.organization_id,
            amount: errorDetails.amount,
            currency: errorDetails.currency,
          },
        );

        return NextResponse.json({
          success: true,
          data: retryResult,
        });

      case 'update_payment_method':
        const { subscription_id, payment_method_id } = actionData;

        if (!subscription_id) {
          return NextResponse.json(
            { error: 'Subscription ID required' },
            { status: 400 },
          );
        }

        // Verify user owns this subscription
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('user_id, stripe_subscription_id')
          .eq('id', subscription_id)
          .single();

        if (!subscription || subscription.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Subscription not found or access denied' },
            { status: 403 },
          );
        }

        // Update payment method via Stripe
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        if (payment_method_id) {
          await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            {
              default_payment_method: payment_method_id,
            },
          );
        }

        // Mark pending payment method update requests as completed
        await supabase
          .from('payment_method_update_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('subscription_id', subscription_id)
          .eq('user_id', user.id)
          .eq('status', 'pending');

        // Reactivate suspended subscription if applicable
        const { data: suspension } = await supabase
          .from('subscription_suspensions')
          .select('id')
          .eq('subscription_id', subscription_id)
          .eq('status', 'active')
          .single();

        if (suspension) {
          await supabase
            .from('subscription_suspensions')
            .update({
              status: 'reactivated',
              reactivated_at: new Date().toISOString(),
              reactivated_by: user.id,
            })
            .eq('id', suspension.id);

          // Reactivate subscription
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription_id);
        }

        return NextResponse.json({
          success: true,
          message: 'Payment method updated successfully',
        });

      case 'acknowledge_error':
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 },
          );
        }

        const { error_id: ackErrorId } = actionData;

        if (!ackErrorId) {
          return NextResponse.json(
            { error: 'Error ID required' },
            { status: 400 },
          );
        }

        await supabase
          .from('payment_errors')
          .update({
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ackErrorId);

        return NextResponse.json({
          success: true,
          message: 'Error acknowledged',
        });

      case 'resolve_error':
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 },
          );
        }

        const { error_id: resolveErrorId, resolution_notes } = actionData;

        if (!resolveErrorId) {
          return NextResponse.json(
            { error: 'Error ID required' },
            { status: 400 },
          );
        }

        await supabase
          .from('payment_errors')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
            metadata: {
              resolution_notes: resolution_notes || 'Manually resolved',
            },
          })
          .eq('id', resolveErrorId);

        return NextResponse.json({
          success: true,
          message: 'Error resolved successfully',
        });

      case 'create_support_ticket':
        const {
          error_id: ticketErrorId,
          subject,
          description,
          priority,
        } = actionData;

        // Create support ticket
        const { data: newTicket, error: ticketError } = await supabase
          .from('payment_support_tickets')
          .insert({
            error_id: ticketErrorId,
            user_id: user.id,
            subject: subject || 'Payment Issue',
            description:
              description || 'Automated support ticket for payment error',
            priority: priority || 'medium',
            status: 'open',
          })
          .select('id, ticket_number')
          .single();

        if (ticketError) throw ticketError;

        return NextResponse.json({
          success: true,
          data: {
            ticket_id: newTicket.id,
            ticket_number: newTicket.ticket_number,
          },
          message: 'Support ticket created successfully',
        });

      case 'run_error_cleanup':
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 },
          );
        }

        // Run automated cleanup functions
        await supabase.rpc('retry_eligible_payment_errors');
        await supabase.rpc('expire_payment_method_requests');

        return NextResponse.json({
          success: true,
          message: 'Error cleanup completed',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Payment recovery POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// PUT /api/billing/payment-recovery - Update error patterns and configurations
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin permissions
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'system'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { action, ...updateData } = body;

    switch (action) {
      case 'update_error_pattern':
        const { pattern_id, updates } = updateData;

        if (!pattern_id || !updates) {
          return NextResponse.json(
            { error: 'Pattern ID and updates required' },
            { status: 400 },
          );
        }

        const { error: updateError } = await supabase
          .from('payment_error_patterns')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pattern_id);

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          message: 'Error pattern updated successfully',
        });

      case 'create_error_pattern':
        const { pattern_name, error_codes, conditions } = updateData;

        if (!pattern_name || !error_codes || !conditions) {
          return NextResponse.json(
            { error: 'Pattern name, error codes, and conditions required' },
            { status: 400 },
          );
        }

        const { data: newPattern, error: createError } = await supabase
          .from('payment_error_patterns')
          .insert({
            pattern_name,
            error_codes,
            conditions,
            ...updateData,
          })
          .select('id')
          .single();

        if (createError) throw createError;

        return NextResponse.json({
          success: true,
          data: { pattern_id: newPattern.id },
          message: 'Error pattern created successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Payment recovery PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
