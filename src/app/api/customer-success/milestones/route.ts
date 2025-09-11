/**
 * WS-142: Customer Success - Milestones API
 * Secure API endpoints for milestone management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { withSecureValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { milestoneService } from '@/lib/services/milestone-service';
import { progressMonitor } from '@/lib/services/progress-monitor';
import { rewardManager } from '@/lib/services/reward-manager';
import { rateLimit } from '@/lib/ratelimit';

// Validation schemas
const getMilestonesSchema = z.object({
  userId: z.string().uuid().optional(),
  includeAchieved: z.boolean().default(false),
  category: z
    .enum([
      'setup',
      'first_use',
      'proficiency',
      'mastery',
      'growth',
      'success',
      'advocacy',
    ])
    .optional(),
  type: z
    .enum([
      'onboarding',
      'feature_adoption',
      'engagement',
      'business_outcome',
      'collaboration',
      'expertise',
      'retention',
      'custom',
    ])
    .optional(),
});

const createMilestoneSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  milestoneType: z.enum([
    'onboarding',
    'feature_adoption',
    'engagement',
    'business_outcome',
    'collaboration',
    'expertise',
    'retention',
    'custom',
  ]),
  category: z.enum([
    'setup',
    'first_use',
    'proficiency',
    'mastery',
    'growth',
    'success',
    'advocacy',
  ]),
  title: z.string().min(3).max(100),
  description: z.string().max(500),
  targetValue: z.number().positive(),
  isVisible: z.boolean().default(true),
  isRequired: z.boolean().default(false),
  weight: z.number().min(0).max(1).default(1),
  estimatedDays: z.number().positive().default(30),
  rewardPoints: z.number().min(0).default(10),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
});

const updateProgressSchema = z.object({
  milestoneId: z.string().uuid(),
  newValue: z.number().min(0),
  source: z.enum(['automatic', 'manual', 'integration']).default('manual'),
  metadata: z.record(z.any()).optional(),
});

/**
 * GET /api/customer-success/milestones
 * Get milestones for user with optional filtering
 */
export const GET = withSecureValidation(
  getMilestonesSchema,
  async (request: NextRequest, validatedData) => {
    const identifier = request.ip ?? 'anonymous';
    const { success } = await rateLimit.limit(identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    try {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 },
        );
      }

      const userId = validatedData.userId || session.user.id;

      // Authorization: users can only view their own milestones unless admin
      if (userId !== session.user.id && !session.user.isAdmin) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Get milestones with filtering
      const milestones = await milestoneService.getUserMilestones(userId, {
        includeAchieved: validatedData.includeAchieved,
        category: validatedData.category,
        type: validatedData.type,
      });

      // Get milestone statistics
      const stats = await milestoneService.getMilestoneStats(userId);

      // Get progress metrics
      const progressMetrics = await progressMonitor.getProgressMetrics(
        userId,
        '7d',
      );

      return NextResponse.json({
        success: true,
        data: {
          milestones,
          stats,
          progressMetrics: {
            activeMilestones: progressMetrics.activeMilestones,
            totalProgressEvents: progressMetrics.totalProgressEvents,
            riskOfStagnation: progressMetrics.riskOfStagnation,
            fastestProgressing: progressMetrics.fastestProgressing.slice(0, 3),
            projectedCompletions: progressMetrics.projectedCompletions,
          },
          retrievedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Milestones API error:', error);
      return NextResponse.json(
        {
          error: 'Failed to retrieve milestones',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  },
);

/**
 * POST /api/customer-success/milestones
 * Create a new milestone
 */
export const POST = withSecureValidation(
  createMilestoneSchema,
  async (request: NextRequest, validatedData) => {
    const identifier = request.ip ?? 'anonymous';
    const { success } = await rateLimit.limit(identifier, {
      requests: 20,
      window: '1m',
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    try {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 },
        );
      }

      // Authorization: users can only create milestones for themselves unless admin
      if (validatedData.userId !== session.user.id && !session.user.isAdmin) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Organization validation
      const organizationId =
        validatedData.organizationId || session.user.organizationId;
      if (
        organizationId &&
        organizationId !== session.user.organizationId &&
        !session.user.isAdmin
      ) {
        return NextResponse.json(
          { error: 'Access denied to organization' },
          { status: 403 },
        );
      }

      // Create milestone
      const milestone = await milestoneService.createMilestone({
        userId: validatedData.userId,
        organizationId,
        milestoneType: validatedData.milestoneType,
        category: validatedData.category,
        title: validatedData.title,
        description: validatedData.description,
        targetValue: validatedData.targetValue,
        isVisible: validatedData.isVisible,
        isRequired: validatedData.isRequired,
        weight: validatedData.weight,
        estimatedDays: validatedData.estimatedDays,
        rewardPoints: validatedData.rewardPoints,
        celebrationTriggers: [
          {
            triggerId: crypto.randomUUID(),
            triggerType: 'immediate',
            celebrationType: 'in_app',
            template: 'milestone_achieved',
          },
        ],
        dueDate: validatedData.dueDate
          ? new Date(validatedData.dueDate)
          : undefined,
        tags: validatedData.tags,
      });

      // Initialize progress monitoring for this milestone
      await progressMonitor.initializeUserProgress(
        validatedData.userId,
        organizationId,
      );

      return NextResponse.json(
        {
          success: true,
          data: {
            milestone,
            message: 'Milestone created successfully',
          },
        },
        { status: 201 },
      );
    } catch (error) {
      console.error('Create milestone API error:', error);
      return NextResponse.json(
        {
          error: 'Failed to create milestone',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  },
);

/**
 * PATCH /api/customer-success/milestones/progress
 * Update milestone progress
 */
export const PATCH = withSecureValidation(
  updateProgressSchema,
  async (request: NextRequest, validatedData) => {
    const identifier = request.ip ?? 'anonymous';
    const { success } = await rateLimit.limit(identifier, {
      requests: 30,
      window: '1m',
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    try {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 },
        );
      }

      // Get milestone to verify ownership
      const milestones = await milestoneService.getUserMilestones(
        session.user.id,
        { includeAchieved: false },
      );
      const milestone = milestones.find(
        (m) => m.id === validatedData.milestoneId,
      );

      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found or access denied' },
          { status: 404 },
        );
      }

      // Authorization check
      if (milestone.userId !== session.user.id && !session.user.isAdmin) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Update progress
      const progressUpdate = await milestoneService.updateProgress(
        validatedData.milestoneId,
        validatedData.newValue,
        validatedData.source,
        validatedData.metadata,
      );

      // Check if milestone was achieved and handle rewards
      let rewardTransaction = null;
      if (milestone.achieved && !milestone.achievedAt) {
        rewardTransaction = await rewardManager.awardMilestoneReward(
          milestone.userId,
          milestone,
        );
      }

      // Get updated milestone data
      const updatedMilestones = await milestoneService.getUserMilestones(
        milestone.userId,
        { includeAchieved: true },
      );
      const updatedMilestone = updatedMilestones.find(
        (m) => m.id === validatedData.milestoneId,
      );

      return NextResponse.json({
        success: true,
        data: {
          progressUpdate,
          milestone: updatedMilestone,
          rewardTransaction,
          achieved: updatedMilestone?.achieved || false,
          message: updatedMilestone?.achieved
            ? 'Milestone achieved!'
            : 'Progress updated successfully',
        },
      });
    } catch (error) {
      console.error('Update progress API error:', error);
      return NextResponse.json(
        {
          error: 'Failed to update progress',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  },
);
