import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { SubscriptionService } from '@/lib/services/subscriptionService';
import { FeatureGateService } from '@/lib/billing/featureGating';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const subscriptionService = new SubscriptionService(supabase, stripe);

interface TrackUsageRequest {
  userId: string;
  metric: string;
  increment?: number;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: TrackUsageRequest = await request.json();
    const { userId, metric, increment = 1 } = body;

    if (!userId || !metric) {
      return NextResponse.json(
        { error: 'userId and metric are required' },
        { status: 400 },
      );
    }

    // Verify user can track usage for this user
    if (userId !== authUser.id && !isAdmin(authUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate metric name
    const validMetrics = [
      'clients_count',
      'vendors_count',
      'journeys_count',
      'team_members_count',
      'api_requests_count',
      'email_sends_count',
      'sms_sends_count',
    ];

    if (!validMetrics.includes(metric)) {
      return NextResponse.json(
        { error: 'Invalid metric name' },
        { status: 400 },
      );
    }

    // Track usage
    await subscriptionService.trackUsage(userId, metric as any, increment);

    // Check if usage exceeds limits
    const limitsCheck = await subscriptionService.checkUsageLimits(userId);

    return NextResponse.json({
      success: true,
      withinLimits: limitsCheck.withinLimits,
      violations: limitsCheck.violations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Usage tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || authUser.id;

    if (userId !== authUser.id && !isAdmin(authUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current usage
    const usage = await subscriptionService.getUserUsage(userId);

    // Get plan limits
    const planLimits = await FeatureGateService.getUserPlanLimits(userId);

    // Calculate usage percentages and warnings
    const usageAnalysis = planLimits
      ? {
          clients: calculateUsagePercentage(
            usage?.clients_count || 0,
            planLimits.limits.clients,
          ),
          vendors: calculateUsagePercentage(
            usage?.vendors_count || 0,
            planLimits.limits.vendors,
          ),
          journeys: calculateUsagePercentage(
            usage?.journeys_count || 0,
            planLimits.limits.journeys,
          ),
          storage: calculateUsagePercentage(
            usage?.storage_used_gb || 0,
            planLimits.limits.storage_gb,
          ),
          teamMembers: calculateUsagePercentage(
            usage?.team_members_count || 0,
            planLimits.limits.team_members,
          ),
          apiRequests: calculateUsagePercentage(
            usage?.monthly_api_requests || 0,
            planLimits.limits.api_requests,
          ),
          emailSends: calculateUsagePercentage(
            usage?.email_sends_count || 0,
            planLimits.limits.email_sends,
          ),
          smsSends: calculateUsagePercentage(
            usage?.sms_sends_count || 0,
            planLimits.limits.sms_sends,
          ),
        }
      : null;

    // Check overall limits
    const limitsCheck = await subscriptionService.checkUsageLimits(userId);

    return NextResponse.json({
      success: true,
      data: {
        usage: usage || {
          clients_count: 0,
          vendors_count: 0,
          journeys_count: 0,
          storage_used_gb: 0,
          team_members_count: 1,
          monthly_api_requests: 0,
          email_sends_count: 0,
          sms_sends_count: 0,
        },
        limits: planLimits?.limits || {},
        plan: planLimits?.plan || 'free',
        usagePercentages: usageAnalysis,
        limitsCheck,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get usage error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

function calculateUsagePercentage(
  current: number,
  limit: number,
): {
  percentage: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
  isUnlimited: boolean;
} {
  if (limit === -1) {
    return {
      percentage: 0,
      isNearLimit: false,
      isOverLimit: false,
      isUnlimited: true,
    };
  }

  const percentage = Math.round((current / limit) * 100);

  return {
    percentage,
    isNearLimit: percentage >= 80 && percentage < 100,
    isOverLimit: percentage >= 100,
    isUnlimited: false,
  };
}

// Helper functions (same as subscription route)
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

function isAdmin(user: any): boolean {
  return user?.user_metadata?.role === 'admin' || false;
}
