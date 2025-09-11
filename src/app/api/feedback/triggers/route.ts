/**
 * WS-236: User Feedback System - Feedback Triggers API
 *
 * Handles feedback eligibility checking and trigger management
 * Determines when users should be prompted for feedback based on
 * wedding industry context, rate limiting, and user journey stage
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limiter';
import { feedbackCollector } from '@/lib/feedback/feedback-collector';

// Validation schemas
const triggersQuerySchema = z.object({
  feedbackType: z
    .enum(['nps', 'csat', 'ces', 'feature', 'onboarding', 'churn', 'general'])
    .optional(),
  context: z
    .object({
      page: z.string().optional(),
      feature: z.string().optional(),
      userAction: z.string().optional(),
    })
    .optional(),
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/feedback/triggers
 * Check feedback eligibility for current user and get eligible surveys
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      max: 60,
      windowMs: 60000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitResult.headers },
      );
    }

    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const { feedbackType, context } = triggersQuerySchema.parse({
      ...queryParams,
      context: queryParams.context
        ? JSON.parse(queryParams.context)
        : undefined,
    });

    console.log(`Checking feedback triggers for user ${user.id}`, {
      feedbackType,
      context,
    });

    try {
      // Check eligibility for specific feedback type or all types
      const eligibilityChecks = feedbackType
        ? [
            {
              type: feedbackType,
              eligibility: await feedbackCollector.checkFeedbackEligibility(
                user.id,
                feedbackType,
              ),
            },
          ]
        : await Promise.all(
            ['nps', 'csat', 'feature', 'onboarding', 'general'].map(
              async (type) => ({
                type,
                eligibility: await feedbackCollector.checkFeedbackEligibility(
                  user.id,
                  type,
                ),
              }),
            ),
          );

      // Find eligible surveys
      const eligibleSurveys = eligibilityChecks
        .filter((check) => check.eligibility.eligible)
        .map((check) => ({
          feedbackType: check.type,
          samplingRate: check.eligibility.samplingRate || 1.0,
          priority: check.type === 'nps' ? 9 : check.type === 'csat' ? 7 : 5,
        }))
        .sort((a, b) => b.priority - a.priority);

      // Get rate limit status
      const rateLimitStatus = {
        remainingThisMonth: await getRemainingFeedbackQuota(user.id),
        nextEligibleDate:
          eligibilityChecks.find((check) => !check.eligibility.eligible)
            ?.eligibility.retryAfter || null,
      };

      // Determine active prompt based on context and eligibility
      let activePrompt = null;
      if (eligibleSurveys.length > 0) {
        const selectedSurvey = eligibleSurveys[0]; // Highest priority eligible survey

        // Apply sampling rate
        if (Math.random() <= selectedSurvey.samplingRate) {
          activePrompt = {
            feedbackType: selectedSurvey.feedbackType,
            estimatedTimeMinutes:
              selectedSurvey.feedbackType === 'nps'
                ? 2
                : selectedSurvey.feedbackType === 'feature'
                  ? 3
                  : 1,
            incentive: getIncentiveForFeedbackType(selectedSurvey.feedbackType),
            context: context || {},
          };
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          activePrompt,
          eligibleSurveys,
          rateLimitStatus,
        },
      });
    } catch (serviceError) {
      console.error('Error checking feedback eligibility:', serviceError);
      return NextResponse.json(
        { error: 'Failed to check feedback eligibility' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('GET /api/feedback/triggers error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
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
 * Get remaining feedback quota for user this month
 */
async function getRemainingFeedbackQuota(userId: string): Promise<number> {
  try {
    const supabase = createClient();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('feedback_sessions')
      .select('id')
      .eq('user_id', userId)
      .gte('started_at', startOfMonth.toISOString());

    if (error) {
      console.error('Error getting feedback quota:', error);
      return 2; // Default quota
    }

    const usedQuota = data?.length || 0;
    const maxQuota = 5; // Max 5 feedback sessions per month per user

    return Math.max(0, maxQuota - usedQuota);
  } catch (error) {
    console.error('Error calculating feedback quota:', error);
    return 2;
  }
}

/**
 * Get appropriate incentive for feedback type
 */
function getIncentiveForFeedbackType(feedbackType: string): any {
  const incentives = {
    nps: {
      type: 'feature_preview',
      description: 'Get early access to new features in development',
    },
    csat: {
      type: 'priority_support',
      description: 'Priority customer support for 30 days',
    },
    feature: {
      type: 'discount',
      description: '10% off your next month for detailed feedback',
    },
    onboarding: null, // No incentive for onboarding feedback
    general: {
      type: 'priority_support',
      description: 'Priority customer support for 14 days',
    },
  };

  return incentives[feedbackType as keyof typeof incentives] || null;
}
