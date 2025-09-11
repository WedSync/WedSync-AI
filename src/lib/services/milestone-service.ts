/**
 * WS-142: MilestoneService - Track and Celebrate User Achievements
 * Core milestone management system for customer success tracking
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { redis } from '@/lib/redis';

export interface Milestone {
  id: string;
  userId: string;
  organizationId?: string;
  milestoneType: MilestoneType;
  category: MilestoneCategory;
  title: string;
  description: string;

  // Progress tracking
  targetValue: number;
  currentValue: number;
  completionPercentage: number;
  achieved: boolean;
  achievedAt?: Date;

  // Configuration
  isVisible: boolean;
  isRequired: boolean;
  weight: number; // importance for health scoring
  estimatedDays: number;

  // Rewards and celebrations
  rewardPoints: number;
  celebrationTriggers: CelebrationTrigger[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  tags: string[];
}

export type MilestoneType =
  | 'onboarding'
  | 'feature_adoption'
  | 'engagement'
  | 'business_outcome'
  | 'collaboration'
  | 'expertise'
  | 'retention'
  | 'custom';

export type MilestoneCategory =
  | 'setup'
  | 'first_use'
  | 'proficiency'
  | 'mastery'
  | 'growth'
  | 'success'
  | 'advocacy';

export interface CelebrationTrigger {
  triggerId: string;
  triggerType: 'immediate' | 'delayed' | 'scheduled';
  celebrationType: 'in_app' | 'email' | 'notification' | 'badge' | 'reward';
  delay?: number; // milliseconds for delayed triggers
  scheduledAt?: Date;
  template?: string;
  customMessage?: string;
}

export interface MilestoneProgress {
  userId: string;
  milestoneId: string;
  previousValue: number;
  newValue: number;
  incrementAmount: number;
  progressDate: Date;
  source: 'automatic' | 'manual' | 'integration';
  metadata?: Record<string, any>;
}

export interface MilestoneTemplate {
  templateId: string;
  name: string;
  description: string;
  milestoneType: MilestoneType;
  category: MilestoneCategory;
  defaultTargetValue: number;
  estimatedDays: number;
  rewardPoints: number;
  isRequired: boolean;
  applicableUserTypes: string[];
  conditions: MilestoneCondition[];
}

export interface MilestoneCondition {
  conditionType:
    | 'user_property'
    | 'organization_size'
    | 'subscription_tier'
    | 'feature_access';
  property: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface MilestoneAchievement {
  achievementId: string;
  userId: string;
  milestoneId: string;
  milestone: Milestone;
  achievedAt: Date;
  timeToAchieve: number; // days from milestone creation
  celebrationsSent: string[];
  rewardsGranted: string[];
  impactMetrics: {
    healthScoreIncrease: number;
    engagementBoost: number;
    retentionImpact: number;
  };
}

const milestoneSchema = z.object({
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
  weight: z.number().min(0).max(1).default(1),
  estimatedDays: z.number().positive().default(30),
  rewardPoints: z.number().min(0).default(10),
});

export class MilestoneService {
  private supabase: SupabaseClient;
  private cachePrefix = 'milestone:';
  private cacheTTL = 1800; // 30 minutes

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Create a new milestone for a user
   */
  async createMilestone(
    milestoneData: Omit<
      Milestone,
      | 'id'
      | 'currentValue'
      | 'completionPercentage'
      | 'achieved'
      | 'createdAt'
      | 'updatedAt'
    >,
  ): Promise<Milestone> {
    const validation = milestoneSchema.safeParse(milestoneData);
    if (!validation.success) {
      throw new Error(`Invalid milestone data: ${validation.error.message}`);
    }

    try {
      const milestoneId = crypto.randomUUID();
      const now = new Date();

      const milestone: Milestone = {
        id: milestoneId,
        ...milestoneData,
        currentValue: 0,
        completionPercentage: 0,
        achieved: false,
        createdAt: now,
        updatedAt: now,
      };

      // Store in database
      const { error } = await this.supabase.from('success_milestones').insert({
        id: milestone.id,
        user_id: milestone.userId,
        organization_id: milestone.organizationId,
        milestone_type: milestone.milestoneType,
        category: milestone.category,
        title: milestone.title,
        description: milestone.description,
        target_value: milestone.targetValue,
        current_value: milestone.currentValue,
        completion_percentage: milestone.completionPercentage,
        achieved: milestone.achieved,
        achieved_at: milestone.achievedAt?.toISOString(),
        is_visible: milestone.isVisible,
        is_required: milestone.isRequired,
        weight: milestone.weight,
        estimated_days: milestone.estimatedDays,
        reward_points: milestone.rewardPoints,
        celebration_triggers: milestone.celebrationTriggers,
        due_date: milestone.dueDate?.toISOString(),
        tags: milestone.tags,
        created_at: milestone.createdAt.toISOString(),
        updated_at: milestone.updatedAt.toISOString(),
      });

      if (error) throw error;

      // Cache the milestone
      await this.cacheMilestone(milestone);

      // Log milestone creation
      await this.logMilestoneEvent(milestone.userId, 'milestone_created', {
        milestoneId: milestone.id,
        type: milestone.milestoneType,
        category: milestone.category,
      });

      return milestone;
    } catch (error) {
      console.error('Error creating milestone:', error);
      throw error;
    }
  }

  /**
   * Update milestone progress
   */
  async updateProgress(
    milestoneId: string,
    newValue: number,
    source: 'automatic' | 'manual' | 'integration' = 'automatic',
    metadata?: Record<string, any>,
  ): Promise<MilestoneProgress> {
    try {
      // Get current milestone
      const milestone = await this.getMilestone(milestoneId);
      if (!milestone) {
        throw new Error(`Milestone ${milestoneId} not found`);
      }

      const previousValue = milestone.currentValue;
      const incrementAmount = newValue - previousValue;

      if (incrementAmount <= 0) {
        throw new Error('New value must be greater than current value');
      }

      // Update milestone values
      milestone.currentValue = newValue;
      milestone.completionPercentage = Math.min(
        100,
        Math.round((newValue / milestone.targetValue) * 100),
      );
      milestone.updatedAt = new Date();

      // Check if milestone is now achieved
      const wasAchieved = milestone.achieved;
      milestone.achieved = milestone.currentValue >= milestone.targetValue;

      if (milestone.achieved && !wasAchieved) {
        milestone.achievedAt = new Date();
      }

      // Update in database
      const { error } = await this.supabase
        .from('success_milestones')
        .update({
          current_value: milestone.currentValue,
          completion_percentage: milestone.completionPercentage,
          achieved: milestone.achieved,
          achieved_at: milestone.achievedAt?.toISOString(),
          updated_at: milestone.updatedAt.toISOString(),
        })
        .eq('id', milestoneId);

      if (error) throw error;

      // Create progress record
      const progress: MilestoneProgress = {
        userId: milestone.userId,
        milestoneId,
        previousValue,
        newValue,
        incrementAmount,
        progressDate: new Date(),
        source,
        metadata,
      };

      await this.recordProgress(progress);

      // Update cache
      await this.cacheMilestone(milestone);

      // Trigger celebration if milestone achieved
      if (milestone.achieved && !wasAchieved) {
        await this.triggerAchievementCelebration(milestone);
      }

      // Log progress event
      await this.logMilestoneEvent(milestone.userId, 'progress_updated', {
        milestoneId,
        previousValue,
        newValue,
        achieved: milestone.achieved,
      });

      return progress;
    } catch (error) {
      console.error('Error updating milestone progress:', error);
      throw error;
    }
  }

  /**
   * Get all milestones for a user
   */
  async getUserMilestones(
    userId: string,
    options: {
      includeAchieved?: boolean;
      category?: MilestoneCategory;
      type?: MilestoneType;
    } = {},
  ): Promise<Milestone[]> {
    const cacheKey = `${this.cachePrefix}user:${userId}:${JSON.stringify(options)}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache read error for user milestones:', error);
    }

    try {
      let query = this.supabase
        .from('success_milestones')
        .select('*')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      if (!options.includeAchieved) {
        query = query.eq('achieved', false);
      }

      if (options.category) {
        query = query.eq('category', options.category);
      }

      if (options.type) {
        query = query.eq('milestone_type', options.type);
      }

      const { data, error } = await query;

      if (error) throw error;

      const milestones = data.map(this.dbRecordToMilestone);

      // Cache results
      try {
        await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(milestones));
      } catch (error) {
        console.warn('Cache write error for user milestones:', error);
      }

      return milestones;
    } catch (error) {
      console.error('Error fetching user milestones:', error);
      return [];
    }
  }

  /**
   * Get milestone achievement statistics
   */
  async getMilestoneStats(userId: string): Promise<MilestoneStats> {
    try {
      const allMilestones = await this.getUserMilestones(userId, {
        includeAchieved: true,
      });

      const achieved = allMilestones.filter((m) => m.achieved);
      const inProgress = allMilestones.filter(
        (m) => !m.achieved && m.currentValue > 0,
      );
      const notStarted = allMilestones.filter(
        (m) => !m.achieved && m.currentValue === 0,
      );

      const totalPoints = achieved.reduce((sum, m) => sum + m.rewardPoints, 0);
      const averageCompletionTime =
        achieved.length > 0
          ? achieved.reduce(
              (sum, m) => sum + this.calculateCompletionTime(m),
              0,
            ) / achieved.length
          : 0;

      const categoryStats = this.calculateCategoryStats(allMilestones);

      return {
        total: allMilestones.length,
        achieved: achieved.length,
        inProgress: inProgress.length,
        notStarted: notStarted.length,
        completionRate:
          allMilestones.length > 0
            ? Math.round((achieved.length / allMilestones.length) * 100)
            : 0,
        totalRewardPoints: totalPoints,
        averageCompletionDays: Math.round(averageCompletionTime),
        categoryBreakdown: categoryStats,
        recentAchievements: achieved
          .filter(
            (m) =>
              m.achievedAt &&
              m.achievedAt.getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000,
          )
          .slice(0, 5),
      };
    } catch (error) {
      console.error('Error calculating milestone stats:', error);
      return this.getEmptyMilestoneStats();
    }
  }

  /**
   * Create milestones from templates for a user
   */
  async createMilestonesFromTemplates(
    userId: string,
    organizationId?: string,
    userType: string = 'standard',
  ): Promise<Milestone[]> {
    try {
      const templates = await this.getApplicableTemplates(
        userType,
        organizationId,
      );
      const createdMilestones: Milestone[] = [];

      for (const template of templates) {
        try {
          const milestone = await this.createMilestone({
            userId,
            organizationId,
            milestoneType: template.milestoneType,
            category: template.category,
            title: template.name,
            description: template.description,
            targetValue: template.defaultTargetValue,
            isVisible: true,
            isRequired: template.isRequired,
            weight: template.isRequired ? 1 : 0.8,
            estimatedDays: template.estimatedDays,
            rewardPoints: template.rewardPoints,
            celebrationTriggers: [
              {
                triggerId: crypto.randomUUID(),
                triggerType: 'immediate',
                celebrationType: 'in_app',
                template: 'milestone_achieved',
              },
              {
                triggerId: crypto.randomUUID(),
                triggerType: 'delayed',
                celebrationType: 'email',
                delay: 5000, // 5 seconds
                template: 'milestone_celebration_email',
              },
            ],
            tags: [template.milestoneType, template.category],
          });

          createdMilestones.push(milestone);
        } catch (error) {
          console.warn(
            `Failed to create milestone from template ${template.templateId}:`,
            error,
          );
        }
      }

      return createdMilestones;
    } catch (error) {
      console.error('Error creating milestones from templates:', error);
      return [];
    }
  }

  /**
   * Batch update multiple milestone progress values
   */
  async batchUpdateProgress(
    updates: Array<{
      milestoneId: string;
      newValue: number;
      source?: 'automatic' | 'manual' | 'integration';
      metadata?: Record<string, any>;
    }>,
  ): Promise<MilestoneProgress[]> {
    const results: MilestoneProgress[] = [];

    for (const update of updates) {
      try {
        const progress = await this.updateProgress(
          update.milestoneId,
          update.newValue,
          update.source,
          update.metadata,
        );
        results.push(progress);
      } catch (error) {
        console.warn(
          `Failed to update milestone ${update.milestoneId}:`,
          error,
        );
      }
    }

    return results;
  }

  // Private helper methods

  private async getMilestone(milestoneId: string): Promise<Milestone | null> {
    const cacheKey = `${this.cachePrefix}${milestoneId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache read error for milestone:', error);
    }

    try {
      const { data, error } = await this.supabase
        .from('success_milestones')
        .select('*')
        .eq('id', milestoneId)
        .single();

      if (error || !data) return null;

      const milestone = this.dbRecordToMilestone(data);
      await this.cacheMilestone(milestone);
      return milestone;
    } catch (error) {
      console.error('Error fetching milestone:', error);
      return null;
    }
  }

  private async cacheMilestone(milestone: Milestone): Promise<void> {
    try {
      const cacheKey = `${this.cachePrefix}${milestone.id}`;
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(milestone));
    } catch (error) {
      console.warn('Error caching milestone:', error);
    }
  }

  private async recordProgress(progress: MilestoneProgress): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('milestone_progress_history')
        .insert({
          user_id: progress.userId,
          milestone_id: progress.milestoneId,
          previous_value: progress.previousValue,
          new_value: progress.newValue,
          increment_amount: progress.incrementAmount,
          progress_date: progress.progressDate.toISOString(),
          source: progress.source,
          metadata: progress.metadata,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording milestone progress:', error);
    }
  }

  private async triggerAchievementCelebration(
    milestone: Milestone,
  ): Promise<void> {
    try {
      // This would integrate with CelebrationEngine
      for (const trigger of milestone.celebrationTriggers) {
        await this.scheduleCelebration(milestone, trigger);
      }

      // Log achievement
      await this.logMilestoneEvent(milestone.userId, 'milestone_achieved', {
        milestoneId: milestone.id,
        type: milestone.milestoneType,
        category: milestone.category,
        rewardPoints: milestone.rewardPoints,
      });
    } catch (error) {
      console.error('Error triggering achievement celebration:', error);
    }
  }

  private async scheduleCelebration(
    milestone: Milestone,
    trigger: CelebrationTrigger,
  ): Promise<void> {
    // Queue celebration for processing by CelebrationEngine
    try {
      await redis.lpush(
        'celebration_queue',
        JSON.stringify({
          milestoneId: milestone.id,
          userId: milestone.userId,
          trigger,
          scheduledAt: new Date(),
        }),
      );
    } catch (error) {
      console.warn('Error scheduling celebration:', error);
    }
  }

  private async logMilestoneEvent(
    userId: string,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('milestone_events').insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      console.warn('Error logging milestone event:', error);
    }
  }

  private async getApplicableTemplates(
    userType: string,
    organizationId?: string,
  ): Promise<MilestoneTemplate[]> {
    // Mock implementation - would query template database
    return [
      {
        templateId: 'onboarding_profile_complete',
        name: 'Complete Your Profile',
        description: 'Fill in all required profile information',
        milestoneType: 'onboarding',
        category: 'setup',
        defaultTargetValue: 1,
        estimatedDays: 1,
        rewardPoints: 10,
        isRequired: true,
        applicableUserTypes: ['all'],
        conditions: [],
      },
      {
        templateId: 'first_client_added',
        name: 'Add Your First Client',
        description: 'Create your first client profile',
        milestoneType: 'feature_adoption',
        category: 'first_use',
        defaultTargetValue: 1,
        estimatedDays: 3,
        rewardPoints: 25,
        isRequired: true,
        applicableUserTypes: ['all'],
        conditions: [],
      },
      {
        templateId: 'form_creation_mastery',
        name: 'Form Creation Master',
        description: 'Create 5 different types of forms',
        milestoneType: 'feature_adoption',
        category: 'proficiency',
        defaultTargetValue: 5,
        estimatedDays: 14,
        rewardPoints: 50,
        isRequired: false,
        applicableUserTypes: ['all'],
        conditions: [],
      },
    ];
  }

  private calculateCompletionTime(milestone: Milestone): number {
    if (!milestone.achievedAt) return 0;
    return Math.floor(
      (milestone.achievedAt.getTime() - milestone.createdAt.getTime()) /
        (24 * 60 * 60 * 1000),
    );
  }

  private calculateCategoryStats(
    milestones: Milestone[],
  ): Record<
    string,
    { total: number; achieved: number; completionRate: number }
  > {
    const categories = milestones.reduce(
      (acc, milestone) => {
        if (!acc[milestone.category]) {
          acc[milestone.category] = {
            total: 0,
            achieved: 0,
            completionRate: 0,
          };
        }
        acc[milestone.category].total++;
        if (milestone.achieved) {
          acc[milestone.category].achieved++;
        }
        return acc;
      },
      {} as Record<
        string,
        { total: number; achieved: number; completionRate: number }
      >,
    );

    // Calculate completion rates
    Object.keys(categories).forEach((category) => {
      categories[category].completionRate = Math.round(
        (categories[category].achieved / categories[category].total) * 100,
      );
    });

    return categories;
  }

  private dbRecordToMilestone(record: any): Milestone {
    return {
      id: record.id,
      userId: record.user_id,
      organizationId: record.organization_id,
      milestoneType: record.milestone_type,
      category: record.category,
      title: record.title,
      description: record.description,
      targetValue: record.target_value,
      currentValue: record.current_value,
      completionPercentage: record.completion_percentage,
      achieved: record.achieved,
      achievedAt: record.achieved_at ? new Date(record.achieved_at) : undefined,
      isVisible: record.is_visible,
      isRequired: record.is_required,
      weight: record.weight,
      estimatedDays: record.estimated_days,
      rewardPoints: record.reward_points,
      celebrationTriggers: record.celebration_triggers || [],
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      dueDate: record.due_date ? new Date(record.due_date) : undefined,
      tags: record.tags || [],
    };
  }

  private getEmptyMilestoneStats(): MilestoneStats {
    return {
      total: 0,
      achieved: 0,
      inProgress: 0,
      notStarted: 0,
      completionRate: 0,
      totalRewardPoints: 0,
      averageCompletionDays: 0,
      categoryBreakdown: {},
      recentAchievements: [],
    };
  }
}

export interface MilestoneStats {
  total: number;
  achieved: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
  totalRewardPoints: number;
  averageCompletionDays: number;
  categoryBreakdown: Record<
    string,
    { total: number; achieved: number; completionRate: number }
  >;
  recentAchievements: Milestone[];
}

// Export singleton instance
export const milestoneService = new MilestoneService();
