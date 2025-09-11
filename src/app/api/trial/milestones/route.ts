/**
 * WS-167 Trial Management API - Milestones Endpoint with Enhanced Security
 * POST /api/trial/milestones - Achieve a milestone
 * GET /api/trial/milestones - Get milestone progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { TrialService } from '@/lib/trial/TrialService';
import { SubscriptionService } from '@/lib/services/subscriptionService';
import { AchieveMilestoneSchema, MILESTONE_DEFINITIONS } from '@/types/trial';
import { stripe } from '@/lib/stripe/config';
import { z } from 'zod';
import { withRateLimit, trialApiLimiter } from '@/lib/middleware/rateLimiter';
import { withEnhancedAuth } from '@/lib/middleware/jwtValidation';

async function postHandler(
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
    const validationResult = AchieveMilestoneSchema.safeParse(body);

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

    const { milestone_type, context_data } = validationResult.data;

    // Initialize services
    const subscriptionService = new SubscriptionService(supabase, stripe);
    const trialService = new TrialService(supabase, subscriptionService);

    try {
      // Achieve the milestone
      const achievedMilestone = await trialService.achieveMilestone(
        user.id,
        milestone_type,
        context_data,
      );

      const milestoneDefinition = MILESTONE_DEFINITIONS[milestone_type];

      return NextResponse.json(
        {
          success: true,
          message: 'Milestone achieved successfully!',
          milestone: achievedMilestone,
          celebration: {
            title: `🎉 ${milestoneDefinition.name} Achieved!`,
            description: milestoneDefinition.description,
            time_savings: `You've saved approximately ${milestoneDefinition.estimated_time_savings_hours} hours!`,
            next_steps: milestoneDefinition.instructions,
          },
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'No active trial found') {
          return NextResponse.json(
            {
              success: false,
              error: 'No active trial',
              message: 'You need an active trial to achieve milestones',
            },
            { status: 404 },
          );
        }

        if (error.message.includes('Milestone not found')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid milestone',
              message:
                'The specified milestone type is not valid for your trial',
            },
            { status: 400 },
          );
        }
      }

      throw error;
    }
  } catch (error) {
    console.error('Error achieving milestone:', error);

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

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to achieve milestone',
        message: 'An error occurred while processing the milestone achievement',
      },
      { status: 500 },
    );
  }
}

async function getHandler(
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

    // Get active trial
    const activeTrial = await trialService.getActiveTrial(user.id);

    if (!activeTrial) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active trial found',
          milestones: [],
        },
        { status: 404 },
      );
    }

    // Get milestone data
    const { data: milestones, error: milestonesError } = await supabase
      .from('trial_milestones')
      .select('*')
      .eq('trial_id', activeTrial.id)
      .order('value_impact_score', { ascending: false });

    if (milestonesError) {
      throw milestonesError;
    }

    // Enhance milestones with definitions and instructions
    const enhancedMilestones = (milestones || []).map((milestone) => {
      const definition = MILESTONE_DEFINITIONS[milestone.milestone_type];
      return {
        ...milestone,
        definition: {
          name: definition.name,
          description: definition.description,
          estimated_time_savings_hours: definition.estimated_time_savings_hours,
          instructions: definition.instructions,
        },
        progress_weight: definition.value_impact_score / 10, // Normalize to 0-1
      };
    });

    // Calculate milestone progress statistics
    const totalMilestones = enhancedMilestones.length;
    const achievedMilestones = enhancedMilestones.filter(
      (m) => m.achieved,
    ).length;
    const progressPercentage =
      totalMilestones > 0 ? (achievedMilestones / totalMilestones) * 100 : 0;

    // Calculate weighted progress (considering value impact scores)
    const totalWeight = enhancedMilestones.reduce(
      (sum, m) => sum + m.value_impact_score,
      0,
    );
    const achievedWeight = enhancedMilestones
      .filter((m) => m.achieved)
      .reduce((sum, m) => sum + m.value_impact_score, 0);

    const weightedProgress =
      totalWeight > 0 ? (achievedWeight / totalWeight) * 100 : 0;

    // Find next recommended milestone
    const nextMilestone = enhancedMilestones
      .filter((m) => !m.achieved)
      .sort((a, b) => b.value_impact_score - a.value_impact_score)[0];

    // Calculate time savings from achieved milestones
    const totalTimeSavings = enhancedMilestones
      .filter((m) => m.achieved)
      .reduce((sum, m) => sum + m.definition.estimated_time_savings_hours, 0);

    return NextResponse.json({
      success: true,
      milestones: enhancedMilestones,
      progress: {
        total_milestones: totalMilestones,
        achieved_count: achievedMilestones,
        remaining_count: totalMilestones - achievedMilestones,
        progress_percentage: Math.round(progressPercentage),
        weighted_progress_percentage: Math.round(weightedProgress),
        total_time_savings_hours: totalTimeSavings,
      },
      next_recommended: nextMilestone
        ? {
            milestone_type: nextMilestone.milestone_type,
            name: nextMilestone.definition.name,
            description: nextMilestone.definition.description,
            instructions: nextMilestone.definition.instructions,
            estimated_time_savings:
              nextMilestone.definition.estimated_time_savings_hours,
          }
        : null,
      trial_info: {
        trial_id: activeTrial.id,
        days_remaining: Math.max(
          0,
          Math.ceil(
            (new Date(activeTrial.trial_end).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        ),
        business_type: activeTrial.business_type,
      },
    });
  } catch (error) {
    console.error('Error getting milestones:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get milestones',
        message: 'An error occurred while retrieving milestone information',
      },
      { status: 500 },
    );
  }
}

// Export handlers with comprehensive security middleware
export const POST = withRateLimit(trialApiLimiter)(
  withEnhancedAuth()(postHandler),
);

export const GET = withRateLimit(trialApiLimiter)(
  withEnhancedAuth()(getHandler),
);

// Handle unsupported methods with rate limiting
export async function PUT(request: NextRequest) {
  return withRateLimit(trialApiLimiter)(async () => {
    return NextResponse.json(
      {
        success: false,
        error: 'Method not allowed',
        message: 'GET or POST methods required for milestone management',
      },
      { status: 405, headers: { Allow: 'GET, POST' } },
    );
  })(request);
}

export async function DELETE(request: NextRequest) {
  return withRateLimit(trialApiLimiter)(async () => {
    return NextResponse.json(
      {
        success: false,
        error: 'Method not allowed',
        message: 'GET or POST methods required for milestone management',
      },
      { status: 405, headers: { Allow: 'GET, POST' } },
    );
  })(request);
}
