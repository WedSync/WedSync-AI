/**
 * WS-167 Trial Management API - Trial Status Endpoint with Enhanced Security
 * GET /api/trial/status - Get comprehensive trial status and progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { TrialService } from '@/lib/trial/TrialService';
import { SubscriptionService } from '@/lib/services/subscriptionService';
import { stripe } from '@/lib/stripe/config';
import {
  withRateLimit,
  trialStatusLimiter,
} from '@/lib/middleware/rateLimiter';
import { withEnhancedAuth } from '@/lib/middleware/jwtValidation';

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

    // Initialize services
    const subscriptionService = new SubscriptionService(supabase, stripe);
    const trialService = new TrialService(supabase, subscriptionService);

    try {
      // Get trial status and progress
      const trialStatus = await trialService.getTrialStatus(user.id);

      return NextResponse.json(trialStatus);
    } catch (error) {
      // Handle no active trial case
      if (error instanceof Error && error.message === 'No active trial found') {
        // Check if user has a subscription instead
        const subscription = await subscriptionService.getUserSubscription(
          user.id,
        );

        if (subscription) {
          return NextResponse.json(
            {
              success: false,
              error: 'No active trial',
              message: 'User has an active subscription',
              subscription_status: subscription.status,
            },
            { status: 404 },
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: 'No active trial found',
            message: 'User has no active trial or subscription',
          },
          { status: 404 },
        );
      }

      // Handle trial expired case
      if (error instanceof Error && error.message === 'Trial has expired') {
        return NextResponse.json(
          {
            success: false,
            error: 'Trial expired',
            message: 'Your trial period has ended',
            expired: true,
          },
          { status: 410 }, // Gone - resource no longer available
        );
      }

      throw error; // Re-throw unexpected errors
    }
  } catch (error) {
    // Enhanced error handling with proper logging and sanitization
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Trial status API error:', {
      error: errorMessage,
      userId: user?.id,
      timestamp: new Date().toISOString(),
      stack:
        process.env.NODE_ENV === 'development'
          ? (error as Error)?.stack
          : undefined,
    });

    // Return sanitized error response without exposing internal details
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get trial status',
        message:
          'An unexpected error occurred while retrieving trial information',
        errorCode: 'TRIAL_STATUS_ERROR',
      },
      { status: 500 },
    );
  }
}

// Export GET handler with comprehensive security middleware
export const GET = withRateLimit(trialStatusLimiter)(
  withEnhancedAuth()(handler),
);

// Handle unsupported methods with rate limiting
export async function POST(request: NextRequest) {
  return withRateLimit(trialStatusLimiter)(async () => {
    return NextResponse.json(
      {
        success: false,
        error: 'Method not allowed',
        message: 'GET method required for trial status',
      },
      { status: 405, headers: { Allow: 'GET' } },
    );
  })(request);
}

export async function PUT(request: NextRequest) {
  return withRateLimit(trialStatusLimiter)(async () => {
    return NextResponse.json(
      {
        success: false,
        error: 'Method not allowed',
        message: 'GET method required for trial status',
      },
      { status: 405, headers: { Allow: 'GET' } },
    );
  })(request);
}

export async function DELETE(request: NextRequest) {
  return withRateLimit(trialStatusLimiter)(async () => {
    return NextResponse.json(
      {
        success: false,
        error: 'Method not allowed',
        message: 'GET method required for trial status',
      },
      { status: 405, headers: { Allow: 'GET' } },
    );
  })(request);
}
