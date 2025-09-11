/**
 * WS-142: CustomerHealthService - Health Score Calculation from User Activity
 * Calculates comprehensive health scores based on user behavior and engagement
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  healthScoringEngine,
  HealthScoreComponents,
} from './health-scoring-engine';
import { redis } from '@/lib/redis';

export interface UserActivityData {
  userId: string;
  organizationId?: string;
  loginFrequency: number;
  featureInteractions: FeatureInteraction[];
  sessionDuration: number;
  taskCompletions: number;
  collaborationEvents: number;
  contentCreation: number;
  supportTicketCount: number;
  milestoneProgress: number;
  lastActivityAt: Date;
}

export interface FeatureInteraction {
  featureKey: string;
  interactionCount: number;
  lastUsedAt: Date;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
  valueGenerated: number;
}

export interface HealthScoreResult {
  healthScore: HealthScoreComponents;
  activitySummary: UserActivitySummary;
  recommendations: HealthRecommendation[];
  riskIndicators: RiskIndicator[];
}

export interface UserActivitySummary {
  totalSessions: number;
  averageSessionDuration: number;
  featuresUsed: number;
  tasksCompleted: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  lastActiveDate: Date;
}

export interface HealthRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: string;
  timelineWeeks: number;
}

export interface RiskIndicator {
  type: 'engagement' | 'adoption' | 'satisfaction' | 'retention';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  threshold: number;
  currentValue: number;
  trend: string;
}

const userActivitySchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  timeframe: z.enum(['7d', '30d', '90d']).default('30d'),
  includeRecommendations: z.boolean().default(true),
});

export class CustomerHealthService {
  private supabase: SupabaseClient;
  private cachePrefix = 'customer_health:';
  private cacheTTL = 1800; // 30 minutes

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Calculate comprehensive health score for a user based on activity patterns
   */
  async calculateHealthScoreFromActivity(
    userId: string,
    organizationId?: string,
    timeframe: '7d' | '30d' | '90d' = '30d',
    forceRefresh = false,
  ): Promise<HealthScoreResult> {
    const validation = userActivitySchema.safeParse({
      userId,
      organizationId,
      timeframe,
      includeRecommendations: true,
    });

    if (!validation.success) {
      throw new Error(`Invalid parameters: ${validation.error.message}`);
    }

    const cacheKey = `${this.cachePrefix}${userId}:${timeframe}`;

    // Check cache first
    if (!forceRefresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const cachedResult = JSON.parse(cached);
          if (new Date(cachedResult.expiresAt) > new Date()) {
            return cachedResult.data;
          }
        }
      } catch (error) {
        console.warn('Cache read error for customer health:', error);
      }
    }

    try {
      // Step 1: Gather comprehensive user activity data
      const activityData = await this.gatherUserActivityData(
        userId,
        organizationId,
        timeframe,
      );

      // Step 2: Calculate health score using the engine
      const healthScore = await healthScoringEngine.calculateHealthScore(
        userId,
        forceRefresh,
        organizationId,
      );

      // Step 3: Generate activity summary
      const activitySummary = this.generateActivitySummary(activityData);

      // Step 4: Create targeted recommendations based on activity patterns
      const recommendations = await this.generateActivityBasedRecommendations(
        activityData,
        healthScore,
      );

      // Step 5: Identify risk indicators from activity patterns
      const riskIndicators = this.identifyActivityRiskIndicators(
        activityData,
        healthScore,
      );

      const result: HealthScoreResult = {
        healthScore,
        activitySummary,
        recommendations,
        riskIndicators,
      };

      // Cache the result
      try {
        await redis.setex(
          cacheKey,
          this.cacheTTL,
          JSON.stringify({
            data: result,
            expiresAt: new Date(Date.now() + this.cacheTTL * 1000),
          }),
        );
      } catch (error) {
        console.warn('Cache write error for customer health:', error);
      }

      return result;
    } catch (error) {
      console.error('Error calculating health score from activity:', error);
      throw error;
    }
  }

  /**
   * Batch calculate health scores for multiple users
   */
  async batchCalculateHealthScores(
    userIds: string[],
    organizationId?: string,
    timeframe: '7d' | '30d' | '90d' = '30d',
  ): Promise<Map<string, HealthScoreResult>> {
    const results = new Map<string, HealthScoreResult>();
    const batchSize = 5; // Smaller batches for health calculations

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const promises = batch.map((userId) =>
        this.calculateHealthScoreFromActivity(userId, organizationId, timeframe)
          .then((result) => ({ userId, result }))
          .catch((error) => ({ userId, error })),
      );

      const batchResults = await Promise.allSettled(promises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { userId, result: healthResult, error } = result.value as any;
          if (healthResult && !error) {
            results.set(userId, healthResult);
          }
        }
      });
    }

    return results;
  }

  /**
   * Get health score trends based on activity patterns
   */
  async getHealthTrendsByActivity(
    userId: string,
    days: number = 30,
  ): Promise<ActivityHealthTrend[]> {
    try {
      const { data: trends, error } = await this.supabase
        .from('health_score_history')
        .select(
          `
          calculated_at,
          overall_health_score,
          engagement_frequency,
          feature_adoption_breadth,
          feature_adoption_depth,
          onboarding_completion
        `,
        )
        .eq('user_id', userId)
        .gte(
          'calculated_at',
          new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('calculated_at', { ascending: true });

      if (error || !trends) {
        console.error('Error fetching activity health trends:', error);
        return [];
      }

      return trends.map((trend) => ({
        date: new Date(trend.calculated_at),
        healthScore: trend.overall_health_score,
        activityMetrics: {
          engagementFrequency: trend.engagement_frequency,
          featureAdoptionBreadth: trend.feature_adoption_breadth,
          featureAdoptionDepth: trend.feature_adoption_depth,
          onboardingCompletion: trend.onboarding_completion,
        },
        activityLevel: this.categorizeActivityLevel(trend),
      }));
    } catch (error) {
      console.error('Error getting activity health trends:', error);
      return [];
    }
  }

  // Private helper methods

  private async gatherUserActivityData(
    userId: string,
    organizationId?: string,
    timeframe: string,
  ): Promise<UserActivityData> {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      userProfile,
      sessionData,
      featureUsage,
      taskCompletions,
      supportTickets,
      milestones,
      engagementEvents,
    ] = await Promise.all([
      this.getUserProfile(userId),
      this.getSessionData(userId, startDate),
      this.getFeatureUsageData(userId, startDate),
      this.getTaskCompletions(userId, startDate),
      this.getSupportTickets(userId, startDate),
      this.getMilestoneProgress(userId),
      this.getEngagementEvents(userId, startDate),
    ]);

    // Calculate metrics from gathered data
    const loginFrequency = sessionData.length;
    const sessionDuration =
      sessionData.reduce((sum, session) => sum + session.duration, 0) /
      Math.max(sessionData.length, 1);
    const featureInteractions = this.processFeatureInteractions(featureUsage);
    const collaborationEvents = engagementEvents.filter(
      (e) => e.event_type === 'collaboration',
    ).length;
    const contentCreation = engagementEvents.filter(
      (e) => e.event_type === 'content_creation',
    ).length;

    return {
      userId,
      organizationId,
      loginFrequency,
      featureInteractions,
      sessionDuration,
      taskCompletions: taskCompletions.length,
      collaborationEvents,
      contentCreation,
      supportTicketCount: supportTickets.length,
      milestoneProgress: this.calculateMilestoneProgress(milestones),
      lastActivityAt:
        sessionData.length > 0
          ? new Date(Math.max(...sessionData.map((s) => s.timestamp.getTime())))
          : new Date(0),
    };
  }

  private generateActivitySummary(
    activityData: UserActivityData,
  ): UserActivitySummary {
    const engagementTrend = this.calculateEngagementTrend(activityData);

    return {
      totalSessions: activityData.loginFrequency,
      averageSessionDuration: activityData.sessionDuration,
      featuresUsed: activityData.featureInteractions.length,
      tasksCompleted: activityData.taskCompletions,
      engagementTrend,
      lastActiveDate: activityData.lastActivityAt,
    };
  }

  private async generateActivityBasedRecommendations(
    activityData: UserActivityData,
    healthScore: HealthScoreComponents,
  ): Promise<HealthRecommendation[]> {
    const recommendations: HealthRecommendation[] = [];

    // Low login frequency recommendation
    if (activityData.loginFrequency < 5) {
      recommendations.push({
        priority: 'high',
        category: 'Engagement',
        title: 'Increase Platform Usage',
        description:
          'Your login frequency is below optimal levels for wedding business success',
        actionItems: [
          'Set daily reminders to check client progress',
          'Use mobile app for quick updates',
          'Schedule regular platform reviews',
        ],
        expectedImpact: 'Improved client communication and business efficiency',
        timelineWeeks: 2,
      });
    }

    // Limited feature usage recommendation
    if (activityData.featureInteractions.length < 3) {
      recommendations.push({
        priority: 'medium',
        category: 'Feature Adoption',
        title: 'Explore Additional Features',
        description:
          'You are only using a small fraction of available platform capabilities',
        actionItems: [
          'Complete feature discovery tour',
          'Try automated workflows',
          'Explore client communication tools',
        ],
        expectedImpact: 'Increased productivity and client satisfaction',
        timelineWeeks: 3,
      });
    }

    // Task completion recommendation
    if (activityData.taskCompletions < 10) {
      recommendations.push({
        priority: 'medium',
        category: 'Productivity',
        title: 'Increase Task Completion Rate',
        description: 'Higher task completion leads to better wedding outcomes',
        actionItems: [
          'Break large projects into smaller tasks',
          'Use task templates for common workflows',
          'Set completion deadlines and reminders',
        ],
        expectedImpact: 'Better project management and client satisfaction',
        timelineWeeks: 4,
      });
    }

    // Collaboration recommendation
    if (activityData.collaborationEvents < 2) {
      recommendations.push({
        priority: 'low',
        category: 'Collaboration',
        title: 'Enhance Team Collaboration',
        description:
          'Collaborative workflows improve wedding planning efficiency',
        actionItems: [
          'Invite team members to platform',
          'Use shared workspaces',
          'Enable client collaboration features',
        ],
        expectedImpact: 'Improved team coordination and client experience',
        timelineWeeks: 6,
      });
    }

    return recommendations.slice(0, 4); // Top 4 recommendations
  }

  private identifyActivityRiskIndicators(
    activityData: UserActivityData,
    healthScore: HealthScoreComponents,
  ): RiskIndicator[] {
    const risks: RiskIndicator[] = [];

    // Engagement risk
    if (activityData.loginFrequency < 3) {
      risks.push({
        type: 'engagement',
        severity: 'high',
        description:
          'Very low login frequency indicates potential disengagement',
        threshold: 7,
        currentValue: activityData.loginFrequency,
        trend: 'declining',
      });
    }

    // Adoption risk
    if (activityData.featureInteractions.length < 2) {
      risks.push({
        type: 'adoption',
        severity: 'medium',
        description: 'Limited feature usage suggests poor platform adoption',
        threshold: 5,
        currentValue: activityData.featureInteractions.length,
        trend: 'stable',
      });
    }

    // Retention risk based on inactivity
    const daysSinceLastActivity = Math.floor(
      (new Date().getTime() - activityData.lastActivityAt.getTime()) /
        (24 * 60 * 60 * 1000),
    );

    if (daysSinceLastActivity > 7) {
      risks.push({
        type: 'retention',
        severity: daysSinceLastActivity > 14 ? 'critical' : 'high',
        description: `No activity for ${daysSinceLastActivity} days indicates high churn risk`,
        threshold: 7,
        currentValue: daysSinceLastActivity,
        trend: 'increasing',
      });
    }

    return risks;
  }

  private processFeatureInteractions(
    featureUsage: any[],
  ): FeatureInteraction[] {
    const featureMap = new Map<string, FeatureInteraction>();

    featureUsage.forEach((usage) => {
      const existing = featureMap.get(usage.feature_key);
      if (existing) {
        existing.interactionCount += usage.usage_count;
        if (new Date(usage.last_used_at) > existing.lastUsedAt) {
          existing.lastUsedAt = new Date(usage.last_used_at);
        }
      } else {
        featureMap.set(usage.feature_key, {
          featureKey: usage.feature_key,
          interactionCount: usage.usage_count,
          lastUsedAt: new Date(usage.last_used_at),
          proficiencyLevel: this.determineProficiencyLevel(usage.usage_count),
          valueGenerated: usage.value_generated || 0,
        });
      }
    });

    return Array.from(featureMap.values());
  }

  private determineProficiencyLevel(
    usageCount: number,
  ): 'beginner' | 'intermediate' | 'advanced' {
    if (usageCount < 5) return 'beginner';
    if (usageCount < 20) return 'intermediate';
    return 'advanced';
  }

  private calculateMilestoneProgress(milestones: any[]): number {
    if (!milestones || milestones.length === 0) return 0;
    const achieved = milestones.filter((m) => m.achieved).length;
    return Math.round((achieved / milestones.length) * 100);
  }

  private calculateEngagementTrend(
    activityData: UserActivityData,
  ): 'increasing' | 'stable' | 'decreasing' {
    // Simplified trend calculation - would implement more sophisticated analysis in production
    const recentActivity = activityData.loginFrequency;
    if (recentActivity > 10) return 'increasing';
    if (recentActivity > 5) return 'stable';
    return 'decreasing';
  }

  private categorizeActivityLevel(trend: any): 'high' | 'medium' | 'low' {
    const score = trend.overall_health_score;
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  // Database helper methods
  private async getUserProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return error ? null : data;
  }

  private async getSessionData(userId: string, startDate: Date) {
    // Mock implementation - would query actual session/login data
    return [
      { timestamp: new Date(), duration: 1800 }, // 30 minutes
      { timestamp: new Date(Date.now() - 86400000), duration: 2400 }, // 40 minutes
    ];
  }

  private async getFeatureUsageData(userId: string, startDate: Date) {
    // Mock implementation - would query feature usage tracking
    return [
      {
        feature_key: 'client_management',
        usage_count: 15,
        last_used_at: new Date().toISOString(),
        value_generated: 85,
      },
      {
        feature_key: 'form_builder',
        usage_count: 8,
        last_used_at: new Date(Date.now() - 86400000).toISOString(),
        value_generated: 65,
      },
    ];
  }

  private async getTaskCompletions(userId: string, startDate: Date) {
    // Mock implementation - would query task completion data
    return new Array(12).fill(null).map((_, i) => ({
      id: `task_${i}`,
      completed_at: new Date(Date.now() - i * 86400000),
    }));
  }

  private async getSupportTickets(userId: string, startDate: Date) {
    // Mock implementation - would query support ticket data
    return [];
  }

  private async getMilestoneProgress(userId: string) {
    const { data, error } = await this.supabase
      .from('success_milestones')
      .select('*')
      .eq('user_id', userId);

    return error ? [] : data;
  }

  private async getEngagementEvents(userId: string, startDate: Date) {
    const { data, error } = await this.supabase
      .from('client_engagement_events')
      .select('*')
      .eq('client_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    return error ? [] : data;
  }
}

interface ActivityHealthTrend {
  date: Date;
  healthScore: number;
  activityMetrics: {
    engagementFrequency: number;
    featureAdoptionBreadth: number;
    featureAdoptionDepth: number;
    onboardingCompletion: number;
  };
  activityLevel: 'high' | 'medium' | 'low';
}

// Export singleton instance
export const customerHealthService = new CustomerHealthService();
