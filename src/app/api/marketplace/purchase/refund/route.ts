/**
 * WS-115: Marketplace Purchase Refund Processing API
 *
 * POST /api/marketplace/purchase/refund
 *
 * Handles refund requests for marketplace template purchases
 * Processes Stripe refunds, removes template access, and records refund analytics
 *
 * Team C - Batch 9 - Round 1
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { withRateLimit } from '@/lib/api-middleware';
import { generateSecureToken } from '@/lib/crypto-utils';
import { auditPayment } from '@/lib/security-audit-logger';
import { EmailService } from '@/lib/email/service';

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

if (!stripe) {
  console.warn('STRIPE_SECRET_KEY is not configured - Refunds will not work');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// =====================================================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================================================

interface RefundRequest {
  purchase_id: string;
  reason:
    | 'customer_request'
    | 'template_issue'
    | 'billing_error'
    | 'duplicate_charge'
    | 'other';
  reason_details?: string;
  refund_amount_cents?: number; // Optional partial refund amount
  notify_customer?: boolean;
}

interface RefundResponse {
  success: boolean;
  refund_id?: string;
  stripe_refund_id?: string;
  refunded_amount_cents?: number;
  currency?: string;
  status?: 'succeeded' | 'pending' | 'failed';
  estimated_arrival?: string;
  error?: string;
}

// =====================================================================================
// API HANDLERS
// =====================================================================================

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!stripe) {
    return NextResponse.json(
      {
        success: false,
        error: 'Refund processing is not configured',
      },
      { status: 503 },
    );
  }

  // Apply rate limiting for refund endpoints
  return withRateLimit(
    request,
    { limit: 5, type: 'refund' }, // 5 refund requests per minute
    async () => {
      try {
        // Authentication check - only authenticated users or admins can request refunds
        const authResult = await verifyRefundAccess(request);
        if (!authResult.valid) {
          return NextResponse.json(
            {
              success: false,
              error: authResult.error,
            },
            { status: authResult.status || 401 },
          );
        }

        const { user, isAdmin } = authResult;

        // Parse and validate request
        const body: RefundRequest = await request.json();

        const validation = validateRefundRequest(body);
        if (!validation.valid) {
          return NextResponse.json(
            {
              success: false,
              error: validation.error,
            },
            { status: 400 },
          );
        }

        // Generate refund ID
        const refundId = generateSecureToken(16);
        const requestId = generateSecureToken(16);

        // Fetch purchase details and verify eligibility
        const purchaseResult = await fetchPurchaseForRefund(
          body.purchase_id,
          user.id,
          isAdmin,
        );
        if (!purchaseResult.success) {
          return NextResponse.json(
            {
              success: false,
              error: purchaseResult.error,
            },
            { status: purchaseResult.status || 404 },
          );
        }

        const purchase = purchaseResult.purchase!;

        // Check refund eligibility
        const eligibilityCheck = await checkRefundEligibility(purchase);
        if (!eligibilityCheck.eligible) {
          return NextResponse.json(
            {
              success: false,
              error: eligibilityCheck.reason,
            },
            { status: 403 },
          );
        }

        // Calculate refund amount
        const refundAmount =
          body.refund_amount_cents || purchase.amount_paid_cents;
        if (refundAmount > purchase.amount_paid_cents) {
          return NextResponse.json(
            {
              success: false,
              error: 'Refund amount cannot exceed original payment',
            },
            { status: 400 },
          );
        }

        // Create refund record in pending state
        const { data: refundRecord, error: refundError } = await supabase
          .from('marketplace_refunds')
          .insert({
            id: refundId,
            purchase_id: body.purchase_id,
            customer_id: purchase.customer_id,
            template_id: purchase.template_id,
            creator_id: purchase.creator_id,
            requested_by: user.id,
            status: 'processing',
            reason: body.reason,
            reason_details: body.reason_details,
            original_amount_cents: purchase.amount_paid_cents,
            refund_amount_cents: refundAmount,
            currency: purchase.currency,
            stripe_payment_intent_id: purchase.stripe_payment_intent_id,
            requested_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (refundError) {
          console.error('Failed to create refund record:', refundError);
          throw new Error('Failed to initialize refund request');
        }

        // Log refund initiation
        await auditPayment.refundInitiated(
          user.id,
          purchase.clients?.organization_id || purchase.customer_id,
          {
            refund_id: refundId,
            purchase_id: body.purchase_id,
            template_id: purchase.template_id,
            refund_amount_cents: refundAmount,
            reason: body.reason,
            request_id: requestId,
          },
          request,
        );

        // Process Stripe refund
        const stripeRefund = await stripe.refunds.create({
          payment_intent: purchase.stripe_payment_intent_id,
          amount: refundAmount,
          reason: mapRefundReason(body.reason),
          metadata: {
            refund_id: refundId,
            purchase_id: body.purchase_id,
            template_id: purchase.template_id,
            customer_id: purchase.customer_id,
          },
        });

        // Update refund record with Stripe details
        const { error: updateError } = await supabase
          .from('marketplace_refunds')
          .update({
            stripe_refund_id: stripeRefund.id,
            status:
              stripeRefund.status === 'succeeded' ? 'completed' : 'processing',
            stripe_status: stripeRefund.status,
            processed_at:
              stripeRefund.status === 'succeeded'
                ? new Date().toISOString()
                : null,
          })
          .eq('id', refundId);

        if (updateError) {
          console.error(
            'Failed to update refund record with Stripe details:',
            updateError,
          );
        }

        // If refund succeeded, revoke template access
        if (stripeRefund.status === 'succeeded') {
          await revokeTemplateAccess(purchase);
          await recordRefundAnalytics(refundRecord, purchase);
        }

        // Send confirmation email if requested
        if (body.notify_customer !== false) {
          await sendRefundConfirmationEmail(
            purchase,
            refundRecord,
            stripeRefund,
          );
        }

        // Log successful refund processing
        await auditPayment.refundCompleted(
          user.id,
          purchase.clients?.organization_id || purchase.customer_id,
          {
            refund_id: refundId,
            stripe_refund_id: stripeRefund.id,
            refund_amount_cents: refundAmount,
            stripe_status: stripeRefund.status,
            request_id: requestId,
          },
          request,
        );

        const response: RefundResponse = {
          success: true,
          refund_id: refundId,
          stripe_refund_id: stripeRefund.id,
          refunded_amount_cents: stripeRefund.amount,
          currency: stripeRefund.currency.toUpperCase(),
          status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending',
          estimated_arrival:
            stripeRefund.status === 'pending'
              ? getEstimatedRefundArrival(purchase.payment_method || 'card')
              : undefined,
        };

        return NextResponse.json(response);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('Refund processing error:', errorMessage, error);

        return NextResponse.json(
          {
            success: false,
            error:
              'Failed to process refund. Please try again or contact support.',
          },
          { status: 500 },
        );
      }
    },
  );
}

// =====================================================================================
// HELPER FUNCTIONS
// =====================================================================================

async function verifyRefundAccess(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
  status?: number;
  user?: any;
  isAdmin?: boolean;
}> {
  try {
    // Check for Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: 'Authorization header required',
        status: 401,
      };
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return {
        valid: false,
        error: 'Invalid or expired token',
        status: 401,
      };
    }

    // Check if user has admin role for advanced refund capabilities
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin =
      profile && ['admin', 'super_admin', 'system'].includes(profile.role);

    return {
      valid: true,
      user,
      isAdmin,
    };
  } catch (error) {
    console.error('Refund access verification error:', error);
    return {
      valid: false,
      error: 'Authentication verification failed',
      status: 500,
    };
  }
}

function validateRefundRequest(body: any): { valid: boolean; error?: string } {
  if (!body.purchase_id || typeof body.purchase_id !== 'string') {
    return {
      valid: false,
      error: 'purchase_id is required and must be a string',
    };
  }

  const validReasons = [
    'customer_request',
    'template_issue',
    'billing_error',
    'duplicate_charge',
    'other',
  ];
  if (!body.reason || !validReasons.includes(body.reason)) {
    return {
      valid: false,
      error: `reason must be one of: ${validReasons.join(', ')}`,
    };
  }

  if (body.reason_details && typeof body.reason_details !== 'string') {
    return {
      valid: false,
      error: 'reason_details must be a string when provided',
    };
  }

  if (
    body.refund_amount_cents &&
    (typeof body.refund_amount_cents !== 'number' ||
      body.refund_amount_cents <= 0)
  ) {
    return {
      valid: false,
      error: 'refund_amount_cents must be a positive number when provided',
    };
  }

  if (
    body.notify_customer !== undefined &&
    typeof body.notify_customer !== 'boolean'
  ) {
    return {
      valid: false,
      error: 'notify_customer must be a boolean when provided',
    };
  }

  return { valid: true };
}

async function fetchPurchaseForRefund(
  purchaseId: string,
  userId: string,
  isAdmin: boolean,
): Promise<{
  success: boolean;
  purchase?: any;
  error?: string;
  status?: number;
}> {
  try {
    let query = supabase
      .from('marketplace_purchases')
      .select(
        `
        *,
        marketplace_templates!inner (
          id,
          title,
          description,
          creator_id,
          suppliers!inner (
            id,
            business_name,
            email
          )
        ),
        clients!inner (
          id,
          name,
          email,
          user_id,
          organization_id
        )
      `,
      )
      .eq('id', purchaseId)
      .in('status', ['completed', 'installed']);

    // Non-admin users can only refund their own purchases
    if (!isAdmin) {
      query = query.eq('clients.user_id', userId);
    }

    const { data: purchase, error } = await query.single();

    if (error || !purchase) {
      return {
        success: false,
        error: isAdmin
          ? 'Purchase not found or not eligible for refund'
          : 'Purchase not found or you do not have permission to refund this purchase',
        status: 404,
      };
    }

    return {
      success: true,
      purchase,
    };
  } catch (error) {
    console.error('Purchase fetch error:', error);
    return {
      success: false,
      error: 'Failed to fetch purchase details',
      status: 500,
    };
  }
}

async function checkRefundEligibility(purchase: any): Promise<{
  eligible: boolean;
  reason?: string;
}> {
  // Check if already refunded
  const { data: existingRefund } = await supabase
    .from('marketplace_refunds')
    .select('status')
    .eq('purchase_id', purchase.id)
    .in('status', ['completed', 'processing'])
    .limit(1);

  if (existingRefund && existingRefund.length > 0) {
    return {
      eligible: false,
      reason:
        'This purchase has already been refunded or has a pending refund request',
    };
  }

  // Check purchase date (refunds allowed within 30 days)
  const purchaseDate = new Date(purchase.paid_at || purchase.created_at);
  const daysSincePurchase =
    (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSincePurchase > 30) {
    return {
      eligible: false,
      reason: 'Refunds are only available within 30 days of purchase',
    };
  }

  return { eligible: true };
}

async function revokeTemplateAccess(purchase: any) {
  try {
    // Mark installed template as revoked
    const { error } = await supabase
      .from('installed_templates')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revocation_reason: 'refund_processed',
      })
      .eq('purchase_id', purchase.id);

    if (error) {
      console.error('Failed to revoke template access:', error);
    } else {
      console.log(`Template access revoked for purchase ${purchase.id}`);
    }
  } catch (error) {
    console.error('Template access revocation error:', error);
  }
}

async function recordRefundAnalytics(refund: any, purchase: any) {
  try {
    await supabase.from('marketplace_analytics_events').insert({
      event_type: 'refund_completed',
      template_id: purchase.template_id,
      creator_id: purchase.creator_id,
      customer_id: purchase.customer_id,
      metadata: {
        refund_id: refund.id,
        purchase_id: purchase.id,
        refund_amount_cents: refund.refund_amount_cents,
        reason: refund.reason,
        days_since_purchase: Math.floor(
          (new Date().getTime() - new Date(purchase.paid_at).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      },
      occurred_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Refund analytics recording failed:', error);
  }
}

async function sendRefundConfirmationEmail(
  purchase: any,
  refund: any,
  stripeRefund: Stripe.Refund,
) {
  try {
    const customer = purchase.clients;
    const template = purchase.marketplace_templates;

    await EmailService.sendRefundConfirmation({
      recipientEmail: customer.email,
      recipientName: customer.name,
      templateTitle: template.title,
      refundAmount: (stripeRefund.amount / 100).toFixed(2),
      currency: stripeRefund.currency.toUpperCase(),
      refundId: refund.id,
      originalPurchaseId: purchase.id,
      estimatedArrival:
        stripeRefund.status === 'pending'
          ? getEstimatedRefundArrival(purchase.payment_method || 'card')
          : 'Processed',
      refundReason: refund.reason,
    });

    console.log(`Refund confirmation sent to ${customer.email}`);
  } catch (error) {
    console.error('Failed to send refund confirmation email:', error);
  }
}

function mapRefundReason(reason: string): Stripe.RefundCreateParams.Reason {
  switch (reason) {
    case 'customer_request':
      return 'requested_by_customer';
    case 'duplicate_charge':
      return 'duplicate';
    case 'billing_error':
    case 'template_issue':
    case 'other':
    default:
      return 'requested_by_customer';
  }
}

function getEstimatedRefundArrival(paymentMethod: string): string {
  // Provide estimated arrival times based on payment method
  switch (paymentMethod) {
    case 'card':
      return '5-10 business days';
    case 'bank_transfer':
      return '3-5 business days';
    default:
      return '5-10 business days';
  }
}
