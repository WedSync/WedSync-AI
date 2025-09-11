/**
 * WS-133: Onboarding Stages API
 * API endpoints for managing onboarding workflow stages
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { rateLimit } from '@/lib/ratelimit';

/**
 * PATCH /api/customer-success/onboarding/stages
 * Update stage status or progress
 */
export async function PATCH(request: NextRequest) {
  // Apply rate limiting
  const identifier = request.ip ?? 'anonymous';
  const { success } = await rateLimit.limit(identifier, {
    requests: 20,
    window: '1m',
  });

  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { stageId, action, metadata } = await request.json();

    // Validate required parameters
    if (!stageId || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters: stageId, action' },
        { status: 400 },
      );
    }

    // Validate action type
    if (!['start', 'complete', 'skip', 'unlock'].includes(action)) {
      return NextResponse.json(
        {
          error:
            'Invalid action. Must be one of: start, complete, skip, unlock',
        },
        { status: 400 },
      );
    }

    // Mock stage data for validation
    const stages = {
      'welcome-stage': {
        id: 'welcome-stage',
        name: 'Welcome & Getting Started',
        order: 1,
        status: 'completed',
        required: true,
        tasks: ['welcome-1', 'welcome-2'],
      },
      'setup-stage': {
        id: 'setup-stage',
        name: 'Business Setup',
        order: 2,
        status: 'in_progress',
        required: true,
        tasks: ['setup-1', 'setup-2'],
      },
      'features-stage': {
        id: 'features-stage',
        name: 'Feature Exploration',
        order: 3,
        status: 'locked',
        required: false,
        tasks: ['features-1', 'features-2', 'features-3'],
      },
      'mastery-stage': {
        id: 'mastery-stage',
        name: 'Mastery & Success',
        order: 4,
        status: 'locked',
        required: false,
        tasks: ['mastery-1', 'mastery-2'],
      },
    };

    const stage = stages[stageId as keyof typeof stages];
    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    // Validate stage transition rules
    const validationResult = validateStageTransition(stage, action, stages);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.message },
        { status: 400 },
      );
    }

    // Process stage action
    const stageUpdate = processStageAction(
      stage,
      action,
      metadata,
      session.user.id,
    );

    // Calculate workflow impact
    const workflowImpact = calculateWorkflowImpact(stageId, action, stages);

    // Trigger automation rules
    const triggeredAutomation = triggerStageAutomation(
      stageId,
      action,
      stageUpdate,
    );

    return NextResponse.json({
      success: true,
      data: {
        stageUpdate,
        workflowImpact,
        triggeredAutomation,
        message: `Stage ${action} successful`,
        recommendations: getStageRecommendations(stageId, action),
      },
    });
  } catch (error) {
    console.error('Stage update API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update stage',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/customer-success/onboarding/stages
 * Get stages for the current user's workflow
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const identifier = request.ip ?? 'anonymous';
  const { success } = await rateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const includeCompleted = searchParams.get('includeCompleted') === 'true';
    const includeTaskCounts = searchParams.get('includeTaskCounts') === 'true';

    // Mock stages data with enhanced information
    const stages = [
      {
        id: 'welcome-stage',
        name: 'welcome',
        title: 'Welcome & Getting Started',
        description: 'Learn the basics and set up your profile',
        order: 1,
        status: 'completed',
        completedAt: new Date(Date.now() - 86400000 * 2),
        estimatedTimeMinutes: 30,
        successWeight: 0.2,
        autoAdvance: true,
        required: true,
        progressPercentage: 100,
        completionCriteria: ['Profile completed', 'Welcome tour finished'],
        taskStats: {
          total: 2,
          completed: 2,
          inProgress: 0,
          pending: 0,
          skipped: 0,
        },
        unlockConditions: [],
        rewards: {
          points: 100,
          badges: ['First Steps'],
          features: ['Dashboard access'],
        },
      },
      {
        id: 'setup-stage',
        name: 'setup',
        title: 'Business Setup',
        description: 'Configure your business settings and preferences',
        order: 2,
        status: 'in_progress',
        startedAt: new Date(Date.now() - 86400000 * 1),
        estimatedTimeMinutes: 45,
        successWeight: 0.3,
        autoAdvance: false,
        required: true,
        progressPercentage: 65,
        completionCriteria: [
          'Business settings configured',
          'First client added',
        ],
        taskStats: {
          total: 2,
          completed: 1,
          inProgress: 1,
          pending: 0,
          skipped: 0,
        },
        unlockConditions: [
          {
            type: 'stage_completion',
            requirement: 'welcome-stage',
          },
        ],
        rewards: {
          points: 200,
          badges: ['Business Ready'],
          features: ['Client management', 'Basic scheduling'],
        },
      },
      {
        id: 'features-stage',
        name: 'feature_exploration',
        title: 'Feature Exploration',
        description: 'Discover and try key platform features',
        order: 3,
        status: 'locked',
        estimatedTimeMinutes: 60,
        successWeight: 0.3,
        autoAdvance: false,
        required: false,
        progressPercentage: 0,
        completionCriteria: ['Core features used', 'First task completed'],
        taskStats: {
          total: 3,
          completed: 0,
          inProgress: 0,
          pending: 3,
          skipped: 0,
        },
        unlockConditions: [
          {
            type: 'stage_completion',
            requirement: 'setup-stage',
          },
          {
            type: 'task_completion',
            requirement: 'setup-2',
          },
        ],
        rewards: {
          points: 300,
          badges: ['Feature Explorer'],
          features: ['Advanced tasks', 'Team collaboration', 'Automation'],
        },
      },
      {
        id: 'mastery-stage',
        name: 'mastery',
        title: 'Mastery & Success',
        description:
          'Master advanced features and achieve your first milestones',
        order: 4,
        status: 'locked',
        estimatedTimeMinutes: 90,
        successWeight: 0.2,
        autoAdvance: true,
        required: false,
        progressPercentage: 0,
        completionCriteria: [
          'Advanced features used',
          'Success milestone achieved',
        ],
        taskStats: {
          total: 2,
          completed: 0,
          inProgress: 0,
          pending: 2,
          skipped: 0,
        },
        unlockConditions: [
          {
            type: 'score_threshold',
            requirement: { component: 'feature_adoption', minScore: 75 },
          },
          {
            type: 'time_delay',
            requirement: { afterStage: 'features-stage', delayDays: 7 },
          },
        ],
        rewards: {
          points: 500,
          badges: ['Wedding Expert', 'Power User'],
          features: ['Advanced analytics', 'Custom workflows', 'API access'],
        },
      },
    ];

    // Apply filters
    let filteredStages = stages;
    if (!includeCompleted) {
      filteredStages = stages.filter((stage) => stage.status !== 'completed');
    }

    // Add computed fields
    const enhancedStages = filteredStages.map((stage) => ({
      ...stage,
      isUnlockable: checkIfStageUnlockable(stage, stages),
      timeToUnlock: calculateTimeToUnlock(stage),
      nextActions: getStageNextActions(stage),
      blockers: getStageBlockers(stage, stages),
      tips: getStageTips(stage.id),
    }));

    // Calculate overall workflow statistics
    const workflowStats = {
      totalStages: stages.length,
      completedStages: stages.filter((s) => s.status === 'completed').length,
      currentStage:
        stages.find((s) => s.status === 'in_progress')?.title || 'Not started',
      overallProgress: Math.round(
        stages.reduce(
          (acc, stage) => acc + stage.progressPercentage * stage.successWeight,
          0,
        ),
      ),
      estimatedTimeRemaining: stages
        .filter((s) => s.status !== 'completed')
        .reduce((acc, stage) => acc + stage.estimatedTimeMinutes, 0),
      totalRewardsEarned: {
        points: stages
          .filter((s) => s.status === 'completed')
          .reduce((acc, stage) => acc + stage.rewards.points, 0),
        badges: stages
          .filter((s) => s.status === 'completed')
          .flatMap((stage) => stage.rewards.badges),
        features: stages
          .filter((s) => s.status === 'completed')
          .flatMap((stage) => stage.rewards.features),
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        stages: enhancedStages,
        workflowStats,
        recommendations: getWorkflowRecommendations(stages),
      },
    });
  } catch (error) {
    console.error('Stages API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve stages',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Helper functions
function validateStageTransition(stage: any, action: string, allStages: any) {
  switch (action) {
    case 'start':
      if (stage.status === 'locked') {
        return {
          success: false,
          message: 'Cannot start locked stage. Complete prerequisites first.',
        };
      }
      if (stage.status === 'completed') {
        return { success: false, message: 'Stage already completed.' };
      }
      return { success: true };

    case 'complete':
      if (stage.status === 'locked') {
        return { success: false, message: 'Cannot complete locked stage.' };
      }
      // Check if all required tasks are completed
      if (
        stage.required &&
        stage.taskStats?.completed < stage.taskStats?.total
      ) {
        return {
          success: false,
          message: 'All required tasks must be completed first.',
        };
      }
      return { success: true };

    case 'skip':
      if (stage.required) {
        return { success: false, message: 'Cannot skip required stage.' };
      }
      return { success: true };

    case 'unlock':
      if (stage.status !== 'locked') {
        return { success: false, message: 'Stage is already unlocked.' };
      }
      return { success: true };

    default:
      return { success: false, message: 'Invalid action.' };
  }
}

function processStageAction(
  stage: any,
  action: string,
  metadata: any,
  userId: string,
) {
  const statusMapping: Record<string, string> = {
    start: 'in_progress',
    complete: 'completed',
    skip: 'skipped',
    unlock: 'available',
  };

  return {
    stageId: stage.id,
    previousStatus: stage.status,
    newStatus: statusMapping[action],
    action,
    timestamp: new Date(),
    userId,
    metadata: metadata || {},
    completedAt: action === 'complete' ? new Date() : null,
    skippedAt: action === 'skip' ? new Date() : null,
  };
}

function calculateWorkflowImpact(stageId: string, action: string, stages: any) {
  const stage = Object.values(stages).find((s: any) => s.id === stageId) as any;

  return {
    progressDelta:
      action === 'complete'
        ? stage.successWeight * 100
        : action === 'start'
          ? 5
          : 0,
    pointsEarned: action === 'complete' ? stage.rewards?.points || 0 : 0,
    badgesEarned: action === 'complete' ? stage.rewards?.badges || [] : [],
    featuresUnlocked:
      action === 'complete' ? stage.rewards?.features || [] : [],
    stagesUnlocked:
      action === 'complete'
        ? getStagesUnlockedByCompletion(stageId, stages)
        : [],
    milestoneProgress:
      action === 'complete' ? calculateMilestoneProgress(stageId) : 0,
  };
}

function triggerStageAutomation(
  stageId: string,
  action: string,
  stageUpdate: any,
) {
  const automationTriggers = [];

  if (action === 'start') {
    automationTriggers.push({
      ruleId: 'stage-started-notification',
      triggerType: 'stage_started',
      scheduledActions: [
        'send_encouragement_email',
        'create_progress_notification',
      ],
    });
  }

  if (action === 'complete') {
    automationTriggers.push({
      ruleId: 'stage-completion-celebration',
      triggerType: 'stage_completed',
      scheduledActions: [
        'send_celebration_email',
        'award_badges',
        'unlock_features',
      ],
    });
  }

  return automationTriggers;
}

function getStageRecommendations(stageId: string, action: string): string[] {
  const recommendations: Record<string, Record<string, string[]>> = {
    'setup-stage': {
      start: [
        'Take your time to set up your business profile accurately',
        'Use the help resources if you get stuck',
        "Don't skip the client setup - it unlocks key features",
      ],
      complete: [
        'Great job! You can now explore advanced features',
        'Consider inviting team members to collaborate',
        'Check out the task management tools next',
      ],
    },
    'features-stage': {
      start: [
        'Experiment with different features to find what works best',
        'Try creating a sample wedding to test the tools',
        'Watch our feature spotlight videos for tips',
      ],
    },
  };

  return (
    recommendations[stageId]?.[action] || [
      'Continue progressing through your onboarding journey',
    ]
  );
}

function checkIfStageUnlockable(stage: any, allStages: any[]): boolean {
  if (stage.status !== 'locked') return false;

  for (const condition of stage.unlockConditions) {
    switch (condition.type) {
      case 'stage_completion':
        const requiredStage = allStages.find(
          (s) => s.id === condition.requirement,
        );
        if (!requiredStage || requiredStage.status !== 'completed')
          return false;
        break;
      case 'task_completion':
        // Mock check - in real implementation, verify task completion
        if (condition.requirement === 'setup-2') return false; // Currently in progress
        break;
      case 'score_threshold':
        // Mock check - in real implementation, check actual scores
        return false; // Assume score not yet met
    }
  }

  return true;
}

function calculateTimeToUnlock(stage: any): string | null {
  if (stage.status !== 'locked') return null;

  // Mock calculation based on unlock conditions
  const timeDelayCondition = stage.unlockConditions.find(
    (c: any) => c.type === 'time_delay',
  );
  if (timeDelayCondition) {
    return `${timeDelayCondition.requirement.delayDays} days after completing ${timeDelayCondition.requirement.afterStage}`;
  }

  return 'Complete prerequisites to unlock';
}

function getStageNextActions(stage: any): string[] {
  switch (stage.status) {
    case 'locked':
      return ['Complete prerequisites', 'Check unlock conditions'];
    case 'available':
      return ['Start stage', 'Review stage overview'];
    case 'in_progress':
      return ['Complete remaining tasks', 'Check progress'];
    case 'completed':
      return ['Review achievements', 'Move to next stage'];
    default:
      return [];
  }
}

function getStageBlockers(stage: any, allStages: any[]): string[] {
  if (stage.status !== 'locked') return [];

  const blockers = [];
  for (const condition of stage.unlockConditions) {
    if (condition.type === 'stage_completion') {
      const requiredStage = allStages.find(
        (s) => s.id === condition.requirement,
      );
      if (requiredStage && requiredStage.status !== 'completed') {
        blockers.push(`Complete "${requiredStage.title}" stage`);
      }
    }
  }

  return blockers;
}

function getStageTips(stageId: string): string[] {
  const tips: Record<string, string[]> = {
    'setup-stage': [
      'Accurate business information helps with better recommendations',
      'Adding your first client unlocks timeline and task features',
    ],
    'features-stage': [
      'Try each feature with real data for the best learning experience',
      "Don't worry about making mistakes - you can always start over",
    ],
    'mastery-stage': [
      'Focus on completing real weddings to build expertise',
      'Advanced features become available as you demonstrate proficiency',
    ],
  };

  return tips[stageId] || [];
}

function getStagesUnlockedByCompletion(
  completedStageId: string,
  stages: any,
): string[] {
  // Mock logic to determine which stages are unlocked by completing this stage
  const unlockMapping: Record<string, string[]> = {
    'welcome-stage': ['setup-stage'],
    'setup-stage': ['features-stage'],
    'features-stage': ['mastery-stage'],
  };

  return unlockMapping[completedStageId] || [];
}

function calculateMilestoneProgress(stageId: string): number {
  // Mock milestone contribution calculation
  const milestoneContributions: Record<string, number> = {
    'welcome-stage': 25,
    'setup-stage': 35,
    'features-stage': 25,
    'mastery-stage': 15,
  };

  return milestoneContributions[stageId] || 0;
}

function getWorkflowRecommendations(stages: any[]): string[] {
  const inProgressStage = stages.find((s) => s.status === 'in_progress');
  const completedCount = stages.filter((s) => s.status === 'completed').length;

  const recommendations = [];

  if (inProgressStage) {
    recommendations.push(
      `Focus on completing "${inProgressStage.title}" to maintain momentum`,
    );
  }

  if (completedCount < 2) {
    recommendations.push('Complete the initial stages to unlock more features');
  }

  if (completedCount >= 2) {
    recommendations.push(
      'Great progress! Consider exploring advanced features',
    );
  }

  return recommendations;
}
