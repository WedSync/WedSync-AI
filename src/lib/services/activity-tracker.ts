/**
 * WS-142: ActivityTracker - Monitor Feature Adoption and Usage Patterns
 * Comprehensive activity tracking system for user behavior analysis
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { redis } from '@/lib/redis';

export interface ActivityEvent {
  id: string;
  userId: string;
  organizationId?: string;
  eventType: ActivityEventType;
  featureKey: string;
  eventData: Record<string, any>;
  sessionId: string;
  timestamp: Date;
  duration?: number;
  valueGenerated?: number;
  contextData?: ActivityContext;
}

export type ActivityEventType =
  | 'feature_used'
  | 'task_completed'
  | 'form_created'
  | 'client_added'
  | 'journey_started'
  | 'template_used'
  | 'collaboration_event'
  | 'content_creation'
  | 'export_generated'
  | 'integration_used'
  | 'milestone_achieved'
  | 'support_interaction';

export interface ActivityContext {
  pageUrl: string;
  userAgent: string;
  referrer?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  sessionDuration: number;
  previousAction?: string;
  workflowStage?: string;
}

export interface FeatureAdoptionMetrics {
  featureKey: string;
  featureName: string;
  category: string;
  usageCount: number;
  uniqueUsers: number;
  adoptionRate: number;
  averageUsagePerUser: number;
  retentionRate: number;
  timeToFirstUse: number;
  timeToMastery: number;
  valueScore: number;
  trendDirection: 'increasing' | 'stable' | 'decreasing';
  lastUsed: Date;
}

export interface UserAdoptionProfile {
  userId: string;
  organizationId?: string;
  totalFeatures: number;
  featuresUsed: number;
  adoptionPercentage: number;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  favoriteFeatures: string[];
  underutilizedFeatures: string[];
  adoptionTrend: 'rapid' | 'steady' | 'slow' | 'stagnant';
  lastActivityDate: Date;
  engagementScore: number;
}

export interface UsagePattern {
  patternId: string;
  patternType: 'workflow' | 'sequence' | 'timing' | 'frequency';
  description: string;
  frequency: number;
  users: string[];
  averageValue: number;
  successRate: number;
  optimizationPotential: number;
}

export interface ActivityInsight {
  type: 'adoption' | 'usage' | 'engagement' | 'retention' | 'workflow';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics: Record<string, number>;
  recommendations: string[];
  affectedUsers: string[];
  timeframe: string;
}

const trackActivitySchema = z.object({
  userId: z.string().uuid(),
  eventType: z.string(),
  featureKey: z.string(),
  eventData: z.record(z.any()).default({}),
  sessionId: z.string(),
  duration: z.number().optional(),
  valueGenerated: z.number().optional(),
  contextData: z
    .object({
      pageUrl: z.string(),
      userAgent: z.string(),
      deviceType: z.enum(['desktop', 'mobile', 'tablet']),
      sessionDuration: z.number(),
      workflowStage: z.string().optional(),
    })
    .optional(),
});

export class ActivityTracker {
  private supabase: SupabaseClient;
  private cachePrefix = 'activity_tracker:';
  private cacheTTL = 3600; // 1 hour

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Track a user activity event
   */
  async trackActivity(
    activityData: Omit<ActivityEvent, 'id' | 'timestamp'>,
  ): Promise<string> {
    const validation = trackActivitySchema.safeParse(activityData);
    if (!validation.success) {
      throw new Error(`Invalid activity data: ${validation.error.message}`);
    }

    try {
      const activityId = crypto.randomUUID();
      const timestamp = new Date();

      const activityEvent: ActivityEvent = {
        id: activityId,
        timestamp,
        ...activityData,
      };

      // Store in database
      await this.storeActivityEvent(activityEvent);

      // Update real-time metrics cache
      await this.updateRealTimeMetrics(activityEvent);

      // Process for pattern detection (async)
      this.processPatternDetection(activityEvent).catch((error) => {
        console.warn('Pattern detection failed:', error);
      });

      return activityId;
    } catch (error) {
      console.error('Error tracking activity:', error);
      throw error;
    }
  }

  /**
   * Batch track multiple activity events
   */
  async batchTrackActivities(
    activities: Omit<ActivityEvent, 'id' | 'timestamp'>[],
  ): Promise<string[]> {
    const activityIds: string[] = [];

    try {
      const events = activities.map((activity) => ({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        ...activity,
      }));

      // Store all events
      await this.batchStoreActivityEvents(events);

      // Update metrics for each event
      const metricsPromises = events.map((event) =>
        this.updateRealTimeMetrics(event).catch((error) =>
          console.warn(`Metrics update failed for ${event.id}:`, error),
        ),
      );
      await Promise.allSettled(metricsPromises);

      return events.map((e) => e.id);
    } catch (error) {
      console.error('Error batch tracking activities:', error);
      throw error;
    }
  }

  /**
   * Get feature adoption metrics for organization or user
   */
  async getFeatureAdoptionMetrics(
    organizationId?: string,
    userId?: string,
    timeframe: '7d' | '30d' | '90d' = '30d',
  ): Promise<FeatureAdoptionMetrics[]> {
    const cacheKey = `${this.cachePrefix}adoption:${organizationId || userId}:${timeframe}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache read error for adoption metrics:', error);
    }

    try {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      let query = this.supabase
        .from('activity_events')
        .select(
          `
          feature_key,
          user_id,
          created_at,
          value_generated,
          feature_definitions!inner (
            feature_name,
            category
          )
        `,
        )
        .gte('created_at', startDate.toISOString());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: activities, error } = await query;

      if (error || !activities) {
        console.error('Error fetching adoption metrics:', error);
        return [];
      }

      // Process activities into metrics
      const metricsMap = new Map<string, any>();

      activities.forEach((activity) => {
        const key = activity.feature_key;
        if (!metricsMap.has(key)) {
          metricsMap.set(key, {
            featureKey: key,
            featureName: activity.feature_definitions.feature_name,
            category: activity.feature_definitions.category,
            usageCount: 0,
            uniqueUsers: new Set(),
            totalValue: 0,
            usageDates: [],
          });
        }

        const metric = metricsMap.get(key);
        metric.usageCount++;
        metric.uniqueUsers.add(activity.user_id);
        metric.totalValue += activity.value_generated || 0;
        metric.usageDates.push(new Date(activity.created_at));
      });

      // Calculate final metrics
      const metrics: FeatureAdoptionMetrics[] = await Promise.all(
        Array.from(metricsMap.values()).map(async (metric) => {
          const uniqueUserCount = metric.uniqueUsers.size;
          const totalUsers = organizationId
            ? await this.getTotalOrgUsers(organizationId)
            : 1;
          const sortedDates = metric.usageDates.sort(
            (a, b) => b.getTime() - a.getTime(),
          );

          return {
            featureKey: metric.featureKey,
            featureName: metric.featureName,
            category: metric.category,
            usageCount: metric.usageCount,
            uniqueUsers: uniqueUserCount,
            adoptionRate: Math.round((uniqueUserCount / totalUsers) * 100),
            averageUsagePerUser: Math.round(
              metric.usageCount / uniqueUserCount,
            ),
            retentionRate: await this.calculateRetentionRate(
              metric.featureKey,
              organizationId,
            ),
            timeToFirstUse: 0, // Would calculate from onboarding data
            timeToMastery: 0, // Would calculate from usage patterns
            valueScore: Math.round(metric.totalValue / metric.usageCount || 0),
            trendDirection: this.calculateTrendDirection(metric.usageDates),
            lastUsed: sortedDates[0] || new Date(0),
          };
        }),
      );

      // Cache results
      try {
        await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(metrics));
      } catch (error) {
        console.warn('Cache write error for adoption metrics:', error);
      }

      return metrics.sort((a, b) => b.usageCount - a.usageCount);
    } catch (error) {
      console.error('Error calculating adoption metrics:', error);
      return [];
    }
  }

  /**
   * Get user adoption profile
   */
  async getUserAdoptionProfile(
    userId: string,
    organizationId?: string,
  ): Promise<UserAdoptionProfile> {
    const cacheKey = `${this.cachePrefix}profile:${userId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache read error for user profile:', error);
    }

    try {
      // Get user's feature usage
      const { data: userActivities, error } = await this.supabase
        .from('activity_events')
        .select(
          `
          feature_key,
          created_at,
          value_generated,
          feature_definitions!inner (
            feature_name,
            category
          )
        `,
        )
        .eq('user_id', userId)
        .gte(
          'created_at',
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (error || !userActivities) {
        console.error('Error fetching user activities:', error);
        return this.getDefaultUserProfile(userId, organizationId);
      }

      // Calculate adoption metrics
      const uniqueFeatures = new Set(userActivities.map((a) => a.feature_key));
      const totalAvailableFeatures = await this.getTotalAvailableFeatures();
      const featureUsageCounts = new Map<string, number>();

      userActivities.forEach((activity) => {
        const count = featureUsageCounts.get(activity.feature_key) || 0;
        featureUsageCounts.set(activity.feature_key, count + 1);
      });

      // Identify favorite and underutilized features
      const sortedFeatures = Array.from(featureUsageCounts.entries()).sort(
        (a, b) => b[1] - a[1],
      );

      const favoriteFeatures = sortedFeatures
        .slice(0, 3)
        .map(([feature]) => feature);
      const underutilizedFeatures = await this.getUnderutilizedFeatures(
        userId,
        Array.from(uniqueFeatures),
      );

      const profile: UserAdoptionProfile = {
        userId,
        organizationId,
        totalFeatures: totalAvailableFeatures,
        featuresUsed: uniqueFeatures.size,
        adoptionPercentage: Math.round(
          (uniqueFeatures.size / totalAvailableFeatures) * 100,
        ),
        proficiencyLevel: this.determineProficiencyLevel(
          userActivities.length,
          uniqueFeatures.size,
        ),
        favoriteFeatures,
        underutilizedFeatures,
        adoptionTrend: this.calculateAdoptionTrend(userActivities),
        lastActivityDate:
          userActivities.length > 0
            ? new Date(
                Math.max(
                  ...userActivities.map((a) =>
                    new Date(a.created_at).getTime(),
                  ),
                ),
              )
            : new Date(0),
        engagementScore: await this.calculateEngagementScore(userId),
      };

      // Cache profile
      try {
        await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(profile));
      } catch (error) {
        console.warn('Cache write error for user profile:', error);
      }

      return profile;
    } catch (error) {
      console.error('Error getting user adoption profile:', error);
      return this.getDefaultUserProfile(userId, organizationId);
    }
  }

  /**
   * Detect usage patterns across users
   */
  async detectUsagePatterns(
    organizationId?: string,
    timeframe: '7d' | '30d' | '90d' = '30d',
  ): Promise<UsagePattern[]> {
    try {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      let query = this.supabase
        .from('activity_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: activities, error } = await query;

      if (error || !activities) {
        console.error(
          'Error fetching activities for pattern detection:',
          error,
        );
        return [];
      }

      return this.analyzePatterns(activities);
    } catch (error) {
      console.error('Error detecting usage patterns:', error);
      return [];
    }
  }

  /**
   * Generate activity insights and recommendations
   */
  async generateActivityInsights(
    organizationId?: string,
    userId?: string,
    timeframe: '7d' | '30d' | '90d' = '30d',
  ): Promise<ActivityInsight[]> {
    try {
      const [adoptionMetrics, usagePatterns, userProfiles] = await Promise.all([
        this.getFeatureAdoptionMetrics(organizationId, userId, timeframe),
        this.detectUsagePatterns(organizationId, timeframe),
        userId
          ? [await this.getUserAdoptionProfile(userId, organizationId)]
          : await this.getBatchUserProfiles(organizationId, timeframe),
      ]);

      const insights: ActivityInsight[] = [];

      // Low adoption insight
      const lowAdoptionFeatures = adoptionMetrics.filter(
        (m) => m.adoptionRate < 20,
      );
      if (lowAdoptionFeatures.length > 0) {
        insights.push({
          type: 'adoption',
          priority: 'high',
          title: 'Low Feature Adoption Detected',
          description: `${lowAdoptionFeatures.length} features have adoption rates below 20%`,
          metrics: {
            affectedFeatures: lowAdoptionFeatures.length,
            averageAdoption: Math.round(
              lowAdoptionFeatures.reduce((sum, f) => sum + f.adoptionRate, 0) /
                lowAdoptionFeatures.length,
            ),
          },
          recommendations: [
            'Create guided tutorials for underused features',
            'Implement in-app feature discovery prompts',
            'Analyze user feedback for adoption barriers',
          ],
          affectedUsers: [],
          timeframe,
        });
      }

      // Engagement pattern insight
      const lowEngagementUsers = userProfiles.filter(
        (p) => p.engagementScore < 50,
      );
      if (lowEngagementUsers.length > 0) {
        insights.push({
          type: 'engagement',
          priority: 'medium',
          title: 'User Engagement Concerns',
          description: `${lowEngagementUsers.length} users show declining engagement patterns`,
          metrics: {
            affectedUsers: lowEngagementUsers.length,
            averageEngagement: Math.round(
              lowEngagementUsers.reduce(
                (sum, u) => sum + u.engagementScore,
                0,
              ) / lowEngagementUsers.length,
            ),
          },
          recommendations: [
            'Schedule personalized check-ins with low-engagement users',
            'Provide value-focused onboarding refreshers',
            'Identify and address common friction points',
          ],
          affectedUsers: lowEngagementUsers.map((u) => u.userId),
          timeframe,
        });
      }

      // Workflow efficiency insight
      const inefficientPatterns = usagePatterns.filter(
        (p) => p.optimizationPotential > 70,
      );
      if (inefficientPatterns.length > 0) {
        insights.push({
          type: 'workflow',
          priority: 'medium',
          title: 'Workflow Optimization Opportunities',
          description: `${inefficientPatterns.length} workflow patterns show high optimization potential`,
          metrics: {
            patterns: inefficientPatterns.length,
            averageOptimizationPotential: Math.round(
              inefficientPatterns.reduce(
                (sum, p) => sum + p.optimizationPotential,
                0,
              ) / inefficientPatterns.length,
            ),
          },
          recommendations: [
            'Create workflow templates for common patterns',
            'Implement automation for repetitive sequences',
            'Provide workflow optimization suggestions in-app',
          ],
          affectedUsers: inefficientPatterns.flatMap((p) => p.users),
          timeframe,
        });
      }

      return insights.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      console.error('Error generating activity insights:', error);
      return [];
    }
  }

  // Private helper methods

  private async storeActivityEvent(event: ActivityEvent): Promise<void> {
    try {
      const { error } = await this.supabase.from('activity_events').insert({
        id: event.id,
        user_id: event.userId,
        organization_id: event.organizationId,
        event_type: event.eventType,
        feature_key: event.featureKey,
        event_data: event.eventData,
        session_id: event.sessionId,
        duration: event.duration,
        value_generated: event.valueGenerated,
        context_data: event.contextData,
        created_at: event.timestamp.toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing activity event:', error);
      throw error;
    }
  }

  private async batchStoreActivityEvents(
    events: ActivityEvent[],
  ): Promise<void> {
    try {
      const insertData = events.map((event) => ({
        id: event.id,
        user_id: event.userId,
        organization_id: event.organizationId,
        event_type: event.eventType,
        feature_key: event.featureKey,
        event_data: event.eventData,
        session_id: event.sessionId,
        duration: event.duration,
        value_generated: event.valueGenerated,
        context_data: event.contextData,
        created_at: event.timestamp.toISOString(),
      }));

      const { error } = await this.supabase
        .from('activity_events')
        .insert(insertData);

      if (error) throw error;
    } catch (error) {
      console.error('Error batch storing activity events:', error);
      throw error;
    }
  }

  private async updateRealTimeMetrics(event: ActivityEvent): Promise<void> {
    try {
      const metricsKey = `metrics:${event.organizationId || event.userId}:${event.featureKey}`;

      // Update feature usage counter
      await redis.zincrby(
        `${this.cachePrefix}feature_usage`,
        1,
        event.featureKey,
      );

      // Update user activity
      await redis.setex(
        `${this.cachePrefix}last_activity:${event.userId}`,
        86400,
        event.timestamp.toISOString(),
      );

      // Update session activity
      await redis.sadd(`${this.cachePrefix}active_sessions`, event.sessionId);
      await redis.expire(`${this.cachePrefix}active_sessions`, 1800); // 30 minutes
    } catch (error) {
      console.warn('Error updating real-time metrics:', error);
    }
  }

  private async processPatternDetection(event: ActivityEvent): Promise<void> {
    // Simplified pattern detection - would implement more sophisticated ML in production
    try {
      const recentEvents = await this.getRecentUserEvents(event.userId, 10);
      if (recentEvents.length >= 3) {
        // Look for sequence patterns
        const sequence = recentEvents.map((e) => e.featureKey).join('-');
        await redis.zincrby(`${this.cachePrefix}patterns`, 1, sequence);
      }
    } catch (error) {
      console.warn('Pattern detection error:', error);
    }
  }

  private async getRecentUserEvents(
    userId: string,
    limit: number,
  ): Promise<ActivityEvent[]> {
    const { data, error } = await this.supabase
      .from('activity_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return error
      ? []
      : data.map((d) => ({
          id: d.id,
          userId: d.user_id,
          organizationId: d.organization_id,
          eventType: d.event_type,
          featureKey: d.feature_key,
          eventData: d.event_data,
          sessionId: d.session_id,
          timestamp: new Date(d.created_at),
          duration: d.duration,
          valueGenerated: d.value_generated,
          contextData: d.context_data,
        }));
  }

  private calculateTrendDirection(
    dates: Date[],
  ): 'increasing' | 'stable' | 'decreasing' {
    if (dates.length < 7) return 'stable';

    const recentWeek = dates.filter(
      (d) => d.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).length;
    const previousWeek = dates.filter(
      (d) =>
        d.getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000 &&
        d.getTime() <= Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).length;

    if (recentWeek > previousWeek * 1.2) return 'increasing';
    if (recentWeek < previousWeek * 0.8) return 'decreasing';
    return 'stable';
  }

  private determineProficiencyLevel(
    totalActivities: number,
    uniqueFeatures: number,
  ): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (totalActivities < 10 || uniqueFeatures < 3) return 'beginner';
    if (totalActivities < 50 || uniqueFeatures < 8) return 'intermediate';
    if (totalActivities < 200 || uniqueFeatures < 15) return 'advanced';
    return 'expert';
  }

  private calculateAdoptionTrend(
    activities: any[],
  ): 'rapid' | 'steady' | 'slow' | 'stagnant' {
    if (activities.length === 0) return 'stagnant';

    const last7Days = activities.filter(
      (a) =>
        new Date(a.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).length;
    const previous7Days = activities.filter((a) => {
      const time = new Date(a.created_at).getTime();
      return (
        time > Date.now() - 14 * 24 * 60 * 60 * 1000 &&
        time <= Date.now() - 7 * 24 * 60 * 60 * 1000
      );
    }).length;

    const growthRate =
      previous7Days > 0 ? (last7Days - previous7Days) / previous7Days : 1;

    if (growthRate > 0.5) return 'rapid';
    if (growthRate > 0.1) return 'steady';
    if (growthRate > -0.1) return 'slow';
    return 'stagnant';
  }

  private async calculateRetentionRate(
    featureKey: string,
    organizationId?: string,
  ): Promise<number> {
    // Simplified retention calculation - would implement cohort analysis in production
    return Math.floor(Math.random() * 40) + 60; // Mock 60-100% retention
  }

  private async getTotalOrgUsers(organizationId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    return error ? 1 : count || 1;
  }

  private async getTotalAvailableFeatures(): Promise<number> {
    const { count, error } = await this.supabase
      .from('feature_definitions')
      .select('*', { count: 'exact', head: true });

    return error ? 20 : count || 20; // Default to 20 features
  }

  private async getUnderutilizedFeatures(
    userId: string,
    usedFeatures: string[],
  ): Promise<string[]> {
    // Mock implementation - would analyze feature recommendations
    const allFeatures = [
      'client_management',
      'form_builder',
      'journey_creator',
      'template_engine',
      'analytics_dashboard',
    ];
    return allFeatures.filter((f) => !usedFeatures.includes(f)).slice(0, 3);
  }

  private async calculateEngagementScore(userId: string): Promise<number> {
    // Simplified engagement calculation
    const recentActivities = await this.getRecentUserEvents(userId, 30);
    const baseScore = Math.min(100, recentActivities.length * 3);
    const recencyBonus =
      recentActivities.length > 0 &&
      new Date(recentActivities[0].timestamp).getTime() >
        Date.now() - 24 * 60 * 60 * 1000
        ? 10
        : 0;

    return Math.min(100, baseScore + recencyBonus);
  }

  private async getBatchUserProfiles(
    organizationId?: string,
    timeframe?: string,
  ): Promise<UserAdoptionProfile[]> {
    // Mock implementation - would get all users in organization
    return [];
  }

  private analyzePatterns(activities: any[]): UsagePattern[] {
    // Mock pattern analysis - would implement sophisticated pattern recognition
    return [
      {
        patternId: 'client-form-journey',
        patternType: 'workflow',
        description:
          'Users typically create clients, then forms, then journeys',
        frequency: 0.75,
        users: activities.map((a) => a.user_id).slice(0, 10),
        averageValue: 85,
        successRate: 0.92,
        optimizationPotential: 25,
      },
    ];
  }

  private getDefaultUserProfile(
    userId: string,
    organizationId?: string,
  ): UserAdoptionProfile {
    return {
      userId,
      organizationId,
      totalFeatures: 20,
      featuresUsed: 0,
      adoptionPercentage: 0,
      proficiencyLevel: 'beginner',
      favoriteFeatures: [],
      underutilizedFeatures: [],
      adoptionTrend: 'stagnant',
      lastActivityDate: new Date(0),
      engagementScore: 0,
    };
  }
}

// Export singleton instance
export const activityTracker = new ActivityTracker();
