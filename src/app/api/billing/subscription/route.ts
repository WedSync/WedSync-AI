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

interface SubscriptionRequest {
  action: 'create' | 'update' | 'cancel' | 'upgrade' | 'downgrade';
  userId?: string;
  priceId?: string;
  planId?: string;
  subscriptionId?: string;
  paymentMethodId?: string;
  cancelAtPeriodEnd?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Get user from auth (this should be implemented based on your auth system)
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SubscriptionRequest = await request.json();
    const {
      action,
      userId,
      priceId,
      planId,
      subscriptionId,
      paymentMethodId,
      cancelAtPeriodEnd,
    } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 },
      );
    }

    // Use authenticated user ID if not provided
    const targetUserId = userId || authUser.id;

    let result;

    switch (action) {
      case 'create':
        if (!priceId) {
          return NextResponse.json(
            { error: 'priceId required for create action' },
            { status: 400 },
          );
        }
        result = await subscriptionService.createSubscription({
          userId: targetUserId,
          priceId,
          paymentMethodId,
        });
        break;

      case 'update':
      case 'upgrade':
      case 'downgrade':
        if (!subscriptionId || !priceId) {
          return NextResponse.json(
            { error: 'subscriptionId and priceId required for update action' },
            { status: 400 },
          );
        }
        result = await subscriptionService.updateSubscription(subscriptionId, {
          priceId,
          paymentMethodId,
        });
        break;

      case 'cancel':
        if (!subscriptionId) {
          return NextResponse.json(
            { error: 'subscriptionId required for cancel action' },
            { status: 400 },
          );
        }
        result = await subscriptionService.cancelSubscription(
          subscriptionId,
          cancelAtPeriodEnd ?? true,
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Subscription API error:', error);

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

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || authUser.id;
    const subscriptionId = searchParams.get('subscriptionId');

    if (userId !== authUser.id && !isAdmin(authUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let subscription;
    if (subscriptionId) {
      subscription = await subscriptionService.getSubscription(subscriptionId);
    } else {
      subscription = await subscriptionService.getUserSubscription(userId);
    }

    return NextResponse.json({
      success: true,
      data: subscription,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper functions (implement based on your auth system)
async function getAuthenticatedUser(request: NextRequest) {
  // This should extract user from JWT token, session, etc.
  // Placeholder implementation
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
  // Implement admin check based on your user system
  return user?.user_metadata?.role === 'admin' || false;
}
