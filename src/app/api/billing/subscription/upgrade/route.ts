import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { SubscriptionService } from '@/lib/services/subscriptionService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const subscriptionService = new SubscriptionService(supabase, stripe);

interface UpgradeRequest {
  targetPlan: string; // tier name (starter, professional, premium, enterprise)
  billingCycle: 'monthly' | 'yearly';
  paymentMethodId?: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

/**
 * POST /api/billing/subscription/upgrade
 * Upgrade user's subscription to a higher tier
 * Handles proration and immediate billing changes
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpgradeRequest = await request.json();
    const {
      targetPlan,
      billingCycle,
      paymentMethodId,
      prorationBehavior = 'create_prorations',
    } = body;

    // Validate required fields
    if (!targetPlan || !billingCycle) {
      return NextResponse.json(
        { error: 'targetPlan and billingCycle are required' },
        { status: 400 },
      );
    }

    // Validate billing cycle
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'billingCycle must be "monthly" or "yearly"' },
        { status: 400 },
      );
    }

    // Get current subscription
    const currentSubscription = await subscriptionService.getUserSubscription(
      authUser.id,
    );

    // Get target plan details
    const { data: targetPlanData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('tier', targetPlan)
      .eq('is_active', true)
      .single();

    if (planError || !targetPlanData) {
      return NextResponse.json(
        { error: 'Target plan not found or inactive' },
        { status: 404 },
      );
    }

    // Get appropriate Stripe price ID
    const stripePriceId =
      billingCycle === 'yearly'
        ? targetPlanData.yearly_stripe_price_id
        : targetPlanData.stripe_price_id;

    if (!stripePriceId) {
      return NextResponse.json(
        {
          error: `No Stripe price ID configured for ${targetPlan} ${billingCycle} billing`,
        },
        { status: 400 },
      );
    }

    // Validate upgrade path (prevent downgrades)
    if (currentSubscription?.subscription) {
      const { data: currentPlanData } = await supabase
        .from('subscription_plans')
        .select('tier, sort_order')
        .eq('id', currentSubscription.subscription.plan_id)
        .single();

      if (
        currentPlanData &&
        currentPlanData.sort_order >= targetPlanData.sort_order
      ) {
        return NextResponse.json(
          {
            error:
              'Cannot upgrade to a lower or same tier. Use downgrade endpoint instead.',
          },
          { status: 400 },
        );
      }
    }

    let result;

    if (!currentSubscription?.subscription) {
      // Create new subscription
      result = await subscriptionService.createSubscription({
        userId: authUser.id,
        priceId: stripePriceId,
        paymentMethodId,
        trialDays: targetPlanData.trial_days || 0,
      });
    } else {
      // Upgrade existing subscription
      result = await subscriptionService.updateSubscription(
        currentSubscription.subscription.stripe_subscription_id,
        {
          priceId: stripePriceId,
          paymentMethodId,
          prorationBehavior,
        },
      );
    }

    // Track upgrade event
    await supabase.from('subscription_events').insert({
      user_id: authUser.id,
      subscription_id: result.subscription?.id,
      event_type: 'upgrade',
      event_data: {
        from_plan: currentSubscription?.plan?.tier || 'none',
        to_plan: targetPlan,
        billing_cycle: billingCycle,
        proration_behavior: prorationBehavior,
      },
    });

    // Calculate upgrade benefits
    const benefits = calculateUpgradeBenefits(
      currentSubscription?.plan?.limits || {},
      targetPlanData.limits,
    );

    return NextResponse.json({
      success: true,
      data: {
        subscription: result.subscription,
        plan: {
          tier: targetPlanData.tier,
          name: targetPlanData.display_name,
          price:
            billingCycle === 'yearly'
              ? targetPlanData.yearly_price
              : targetPlanData.price,
          billing_cycle: billingCycle,
          limits: targetPlanData.limits,
          features: targetPlanData.features,
        },
        upgrade_benefits: benefits,
        next_billing_date: result.subscription?.current_period_end,
        trial_end: result.subscription?.trial_end,
      },
      message: `Successfully upgraded to ${targetPlanData.display_name}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Upgrade API error:', error);

    // Handle specific Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: 'Payment processing error',
          details: error.message,
          code: error.code,
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

/**
 * Calculate upgrade benefits by comparing plan limits
 */
function calculateUpgradeBenefits(
  currentLimits: any,
  newLimits: any,
): {
  improved_limits: string[];
  new_features: string[];
} {
  const improvedLimits: string[] = [];
  const newFeatures: string[] = [];

  // Compare numeric limits
  const limitChecks = [
    { key: 'guests', label: 'Guest capacity' },
    { key: 'events', label: 'Event management' },
    { key: 'storage_gb', label: 'Storage space' },
    { key: 'team_members', label: 'Team collaboration' },
    { key: 'templates', label: 'Template access' },
    { key: 'api_requests', label: 'API requests' },
    { key: 'email_sends', label: 'Email communications' },
    { key: 'sms_sends', label: 'SMS communications' },
  ];

  limitChecks.forEach(({ key, label }) => {
    const current = currentLimits[key] || 0;
    const newLimit = newLimits[key] || 0;

    if (newLimit === -1 && current !== -1) {
      improvedLimits.push(`Unlimited ${label.toLowerCase()}`);
    } else if (newLimit > current && newLimit !== -1) {
      improvedLimits.push(`Increased ${label.toLowerCase()}`);
    }
  });

  // Check boolean features
  const featureChecks = [
    { key: 'customBranding', label: 'Custom branding' },
    { key: 'prioritySupport', label: 'Priority support' },
    { key: 'analytics', label: 'Advanced analytics' },
    { key: 'apiAccess', label: 'API access' },
  ];

  featureChecks.forEach(({ key, label }) => {
    const current = currentLimits[key] || false;
    const newFeature = newLimits[key] || false;

    if (newFeature && !current) {
      newFeatures.push(label);
    }
  });

  return {
    improved_limits: improvedLimits,
    new_features: newFeatures,
  };
}

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}
