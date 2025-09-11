/**
 * WS-167 Trial Management API - Convert Trial Endpoint with Enhanced Security
 * POST /api/trial/convert - Convert trial to paid subscription with comprehensive validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { TrialService } from '@/lib/trial/TrialService';
import { SubscriptionService } from '@/lib/services/subscriptionService';
import { stripe } from '@/lib/stripe/config';
import { z } from 'zod';
import { withRateLimit, trialStartLimiter } from '@/lib/middleware/rateLimiter';
import { withEnhancedAuth } from '@/lib/middleware/jwtValidation';

// Schema for trial conversion request
const ConvertTrialSchema = z.object({
  payment_method_id: z.string().min(1, 'Payment method is required'),
  billing_address: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postal_code: z.string().min(1, 'Postal code is required'),
    country: z.string().min(2, 'Country is required').max(2),
  }),
  promotional_code: z.string().optional(),
});

async function handler(
  request: NextRequest,
  context: { user: any; session: any },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // User authentication already verified by enhanced JWT middleware
    const user = context.user;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ConvertTrialSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { payment_method_id, billing_address, promotional_code } =
      validationResult.data;

    // Initialize services
    const subscriptionService = new SubscriptionService(supabase, stripe);
    const trialService = new TrialService(supabase, subscriptionService);

    // Verify user has an active trial
    const activeTrial = await trialService.getActiveTrial(user.id);
    if (!activeTrial) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active trial found',
          message:
            'You must have an active trial to convert to a paid subscription',
        },
        { status: 404 },
      );
    }

    // Check trial hasn't expired
    if (new Date() > new Date(activeTrial.trial_end)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trial expired',
          message:
            'Your trial has expired. Please contact support to discuss subscription options.',
        },
        { status: 410 },
      );
    }

    // Get current trial subscription
    const trialSubscription = await subscriptionService.getUserSubscription(
      user.id,
    );
    if (!trialSubscription || trialSubscription.status !== 'trialing') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid trial state',
          message: 'Unable to find a valid trial subscription to convert',
        },
        { status: 400 },
      );
    }

    try {
      // Update payment method on the Stripe customer
      const customer = await stripe.customers.retrieve(
        trialSubscription.stripe_customer_id,
      );
      if (!customer || customer.deleted) {
        throw new Error('Customer not found');
      }

      // Attach the payment method to the customer
      await stripe.paymentMethods.attach(payment_method_id, {
        customer: customer.id,
      });

      // Update billing address
      await stripe.customers.update(customer.id, {
        address: billing_address,
        invoice_settings: {
          default_payment_method: payment_method_id,
        },
      });

      // Apply promotional code if provided
      if (promotional_code) {
        try {
          const promotionCode = await stripe.promotionCodes.list({
            code: promotional_code,
            active: true,
            limit: 1,
          });

          if (promotionCode.data.length > 0) {
            await stripe.subscriptions.update(
              trialSubscription.stripe_subscription_id,
              {
                promotion_code: promotionCode.data[0].id,
              },
            );
          } else {
            console.warn(
              `Promotional code "${promotional_code}" not found or inactive`,
            );
          }
        } catch (promoError) {
          console.warn('Error applying promotional code:', promoError);
          // Don't fail the conversion for promotional code issues
        }
      }

      // Convert the trial
      const conversionResult = await trialService.convertTrial(
        user.id,
        payment_method_id,
      );

      // Get updated subscription details for response
      const updatedSubscription = await subscriptionService.getUserSubscription(
        user.id,
      );
      const plan = updatedSubscription
        ? await subscriptionService.getPlan(updatedSubscription.plan_id)
        : null;

      return NextResponse.json(
        {
          ...conversionResult,
          billing_info: {
            next_billing_date: updatedSubscription?.current_period_end,
            billing_amount: plan?.price || 0,
            billing_interval: plan?.billing_interval || 'month',
            currency: plan?.currency || 'USD',
          },
          trial_summary: {
            trial_duration_days: Math.ceil(
              (new Date(activeTrial.trial_end).getTime() -
                new Date(activeTrial.trial_start).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
            trial_start_date: activeTrial.trial_start,
            trial_end_date: activeTrial.trial_end,
            business_type: activeTrial.business_type,
          },
        },
        { status: 200 },
      );
    } catch (stripeError: any) {
      console.error('Stripe error during trial conversion:', stripeError);

      // Handle specific Stripe errors
      if (stripeError.type === 'StripeCardError') {
        return NextResponse.json(
          {
            success: false,
            error: 'Payment failed',
            message: stripeError.message || 'Your payment method was declined',
          },
          { status: 402 },
        );
      }

      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid payment information',
            message: 'Please check your payment details and try again',
          },
          { status: 400 },
        );
      }

      throw stripeError;
    }
  } catch (error) {
    console.error('Error converting trial:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      // Handle specific business logic errors
      if (error.message === 'No active trial found') {
        return NextResponse.json(
          {
            success: false,
            error: 'No active trial',
            message: 'You need an active trial to convert to a subscription',
          },
          { status: 404 },
        );
      }

      if (error.message.includes('subscription found')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid subscription state',
            message:
              'Unable to process conversion due to subscription state issues',
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Conversion failed',
        message: 'An unexpected error occurred during trial conversion',
      },
      { status: 500 },
    );
  }
}

// Export POST handler with comprehensive security middleware (strict rate limiting for conversions)
export const POST = withRateLimit(trialStartLimiter)(
  withEnhancedAuth()(handler),
);

// Handle unsupported methods with rate limiting
export async function GET(request: NextRequest) {
  return withRateLimit(trialStartLimiter)(async () => {
    return NextResponse.json(
      {
        success: false,
        error: 'Method not allowed',
        message: 'POST method required for trial conversion',
      },
      { status: 405, headers: { Allow: 'POST' } },
    );
  })(request);
}

export async function PUT(request: NextRequest) {
  return withRateLimit(trialStartLimiter)(async () => {
    return NextResponse.json(
      {
        success: false,
        error: 'Method not allowed',
        message: 'POST method required for trial conversion',
      },
      { status: 405, headers: { Allow: 'POST' } },
    );
  })(request);
}

export async function DELETE(request: NextRequest) {
  return withRateLimit(trialStartLimiter)(async () => {
    return NextResponse.json(
      {
        success: false,
        error: 'Method not allowed',
        message: 'POST method required for trial conversion',
      },
      { status: 405, headers: { Allow: 'POST' } },
    );
  })(request);
}
