/**
 * Cache Invalidation Service for AI Cost Optimization
 * Smart cache refresh strategies for wedding supplier AI responses
 * Maintains data freshness while maximizing cost savings
 */

import { createClient } from '@supabase/supabase-js';
import { InvalidationResult } from './SmartCacheManager';

export interface InvalidationPolicy {
  name: string;
  description: string;
  triggers: InvalidationTrigger[];
  schedule: InvalidationSchedule;
  contexts: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  preservePopularEntries: boolean;
  weddingSeasonAdjustment: number;
}

export interface InvalidationTrigger {
  type: 'time_based' | 'usage_based' | 'content_based' | 'event_based';
  condition: string;
  threshold: number;
  action: 'invalidate' | 'refresh' | 'extend_ttl' | 'archive';
}

export interface InvalidationSchedule {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'event_driven';
  preferredHours: number[]; // Hours when invalidation should occur
  weddingSeasonFrequency?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  blackoutPeriods: BlackoutPeriod[];
}

export interface BlackoutPeriod {
  name: string;
  startDate: Date;
  endDate: Date;
  restrictedActions: string[];
  reason: string;
}

export interface CacheHealthMetrics {
  totalEntries: number;
  staleEntries: number;
  popularEntries: number;
  avgAge: number;
  hitRateLastDay: number;
  hitRateLastWeek: number;
  estimatedSavings: number;
  qualityScore: number;
}

export interface InvalidationRecommendation {
  action: string;
  reason: string;
  estimatedImpact: number;
  urgency: 'immediate' | 'soon' | 'scheduled' | 'optional';
  affectedEntries: number;
  potentialSavingsLoss: number;
  qualityImprovement: number;
}

export interface RefreshStrategy {
  strategy: string;
  description: string;
  refreshCriteria: RefreshCriteria;
  costImpact: number;
  qualityImpact: number;
  applicableContexts: string[];
}

export interface RefreshCriteria {
  ageThreshold: number; // milliseconds
  usageThreshold: number;
  qualityThreshold: number;
  seasonalAdjustment: number;
}

export class CacheInvalidationService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private policies: InvalidationPolicy[] = [
    {
      name: 'photography_seasonal_policy',
      description: 'Invalidate photography caches based on seasonal trends',
      triggers: [
        {
          type: 'time_based',
          condition: 'age_hours',
          threshold: 168, // 1 week
          action: 'refresh',
        },
        {
          type: 'usage_based',
          condition: 'hit_count',
          threshold: 50,
          action: 'extend_ttl',
        },
      ],
      schedule: {
        frequency: 'daily',
        preferredHours: [2, 3, 4], // Early morning
        weddingSeasonFrequency: 'hourly',
        blackoutPeriods: [],
      },
      contexts: ['photography'],
      priority: 'high',
      preservePopularEntries: true,
      weddingSeasonAdjustment: 2.0,
    },
    {
      name: 'venue_stable_policy',
      description: 'Conservative invalidation for stable venue content',
      triggers: [
        {
          type: 'time_based',
          condition: 'age_days',
          threshold: 30, // 30 days
          action: 'invalidate',
        },
        {
          type: 'content_based',
          condition: 'venue_updated',
          threshold: 1,
          action: 'refresh',
        },
      ],
      schedule: {
        frequency: 'weekly',
        preferredHours: [1, 2],
        blackoutPeriods: [],
      },
      contexts: ['venue'],
      priority: 'medium',
      preservePopularEntries: true,
      weddingSeasonAdjustment: 1.2,
    },
    {
      name: 'planning_dynamic_policy',
      description: 'Frequent updates for dynamic planning content',
      triggers: [
        {
          type: 'time_based',
          condition: 'age_hours',
          threshold: 72, // 3 days
          action: 'refresh',
        },
        {
          type: 'event_based',
          condition: 'wedding_date_approaching',
          threshold: 7, // 7 days before wedding
          action: 'invalidate',
        },
      ],
      schedule: {
        frequency: 'daily',
        preferredHours: [1, 2, 3],
        weddingSeasonFrequency: 'hourly',
        blackoutPeriods: [
          {
            name: 'wedding_weekends',
            startDate: new Date(), // Dynamic - calculated per weekend
            endDate: new Date(),
            restrictedActions: ['invalidate', 'refresh'],
            reason: 'Protect cache during high-traffic wedding weekends',
          },
        ],
      },
      contexts: ['planning'],
      priority: 'high',
      preservePopularEntries: true,
      weddingSeasonAdjustment: 1.8,
    },
    {
      name: 'emergency_invalidation_policy',
      description: 'Emergency invalidation for critical updates',
      triggers: [
        {
          type: 'event_based',
          condition: 'supplier_data_updated',
          threshold: 1,
          action: 'invalidate',
        },
        {
          type: 'content_based',
          condition: 'quality_score_dropped',
          threshold: 0.7,
          action: 'invalidate',
        },
      ],
      schedule: {
        frequency: 'event_driven',
        preferredHours: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
          20, 21, 22, 23,
        ],
        blackoutPeriods: [],
      },
      contexts: ['photography', 'venue', 'planning', 'catering', 'general'],
      priority: 'critical',
      preservePopularEntries: false,
      weddingSeasonAdjustment: 1.0,
    },
  ];

  /**
   * Execute intelligent cache invalidation based on policies
   */
  async executeIntelligentInvalidation(): Promise<InvalidationResult> {
    try {
      let totalInvalidated = 0;
      let totalPreserved = 0;
      let totalEstimatedSavings = 0;
      const errors: string[] = [];

      // Get cache health metrics first
      const healthMetrics = await this.getCacheHealthMetrics();

      // Get current blackout periods
      const activeBlackouts = await this.getActiveBlackoutPeriods();

      // Process each policy
      for (const policy of this.policies) {
        try {
          // Skip if in blackout period
          if (this.isInBlackoutPeriod(policy, activeBlackouts)) {
            console.log(
              `Skipping policy ${policy.name} due to blackout period`,
            );
            continue;
          }

          // Apply wedding season adjustments
          const adjustedPolicy = this.adjustPolicyForSeason(policy);

          // Execute policy
          const policyResult = await this.executePolicyInvalidation(
            adjustedPolicy,
            healthMetrics,
          );

          totalInvalidated += policyResult.invalidated;
          totalPreserved += policyResult.preserved;
          totalEstimatedSavings += policyResult.estimatedSavings;
          errors.push(...policyResult.errors);

          // Log policy execution
          await this.logPolicyExecution(policy.name, policyResult);
        } catch (policyError) {
          errors.push(`Policy ${policy.name} failed: ${policyError}`);
        }
      }

      // Update cache health metrics after invalidation
      await this.updateCacheHealthMetrics(
        totalInvalidated,
        totalPreserved,
        totalEstimatedSavings,
      );

      return {
        invalidated: totalInvalidated,
        preserved: totalPreserved,
        errors,
        estimatedSavings: totalEstimatedSavings,
      };
    } catch (error) {
      console.error('Error executing intelligent invalidation:', error);
      throw error;
    }
  }

  /**
   * Get cache health metrics for optimization decisions
   */
  async getCacheHealthMetrics(): Promise<CacheHealthMetrics> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get total cache entries
      const { count: totalEntries } = await this.supabase
        .from('ai_cache_requests')
        .select('*', { count: 'exact', head: true });

      // Get stale entries (older than 7 days)
      const { count: staleEntries } = await this.supabase
        .from('ai_cache_requests')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', oneWeekAgo.toISOString());

      // Get popular entries (hit count > 5)
      const { count: popularEntries } = await this.supabase
        .from('ai_cache_responses')
        .select('*', { count: 'exact', head: true })
        .gt('usage_count', 5);

      // Calculate average age and hit rates
      const { data: ageData } = await this.supabase
        .from('ai_cache_requests')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      const avgAge = ageData?.length
        ? ageData.reduce((sum, entry) => {
            return sum + (now.getTime() - new Date(entry.created_at).getTime());
          }, 0) / ageData.length
        : 0;

      // Get hit rates (simplified calculation)
      const { data: hitData } = await this.supabase
        .from('ai_cache_responses')
        .select('usage_count, created_at')
        .gte('last_used_at', oneDayAgo.toISOString());

      const hitRateLastDay =
        hitData?.reduce((sum, entry) => sum + entry.usage_count, 0) || 0;

      // Estimate current savings
      const { data: savingsData } = await this.supabase
        .from('ai_optimization_metrics')
        .select('cost_saved')
        .gte('created_at', oneWeekAgo.toISOString());

      const estimatedSavings =
        savingsData?.reduce((sum, entry) => sum + entry.cost_saved, 0) || 0;

      return {
        totalEntries: totalEntries || 0,
        staleEntries: staleEntries || 0,
        popularEntries: popularEntries || 0,
        avgAge,
        hitRateLastDay,
        hitRateLastWeek: hitRateLastDay * 7, // Simplified
        estimatedSavings,
        qualityScore: 0.85, // Simplified quality score
      };
    } catch (error) {
      console.error('Error getting cache health metrics:', error);
      // Return conservative defaults
      return {
        totalEntries: 0,
        staleEntries: 0,
        popularEntries: 0,
        avgAge: 0,
        hitRateLastDay: 0,
        hitRateLastWeek: 0,
        estimatedSavings: 0,
        qualityScore: 0.8,
      };
    }
  }

  /**
   * Get invalidation recommendations based on current cache state
   */
  async getInvalidationRecommendations(
    supplierId?: string,
  ): Promise<InvalidationRecommendation[]> {
    try {
      const healthMetrics = await this.getCacheHealthMetrics();
      const recommendations: InvalidationRecommendation[] = [];

      // Recommendation 1: High stale entry ratio
      const staleRatio =
        healthMetrics.totalEntries > 0
          ? healthMetrics.staleEntries / healthMetrics.totalEntries
          : 0;

      if (staleRatio > 0.3) {
        recommendations.push({
          action: 'bulk-invalidate-stale',
          reason: 'High ratio of stale cache entries detected',
          estimatedImpact: staleRatio * 0.8,
          urgency: staleRatio > 0.5 ? 'immediate' : 'soon',
          affectedEntries: healthMetrics.staleEntries,
          potentialSavingsLoss: healthMetrics.estimatedSavings * 0.2,
          qualityImprovement: 0.15,
        });
      }

      // Recommendation 2: Low hit rate
      if (healthMetrics.hitRateLastDay < 10) {
        recommendations.push({
          action: 'optimize-cache-strategy',
          reason: 'Low cache hit rate indicates suboptimal caching',
          estimatedImpact: 0.6,
          urgency: 'scheduled',
          affectedEntries: 0,
          potentialSavingsLoss: 0,
          qualityImprovement: 0.05,
        });
      }

      // Recommendation 3: High popular entry preservation
      const popularRatio =
        healthMetrics.totalEntries > 0
          ? healthMetrics.popularEntries / healthMetrics.totalEntries
          : 0;

      if (popularRatio > 0.2) {
        recommendations.push({
          action: 'extend-popular-ttl',
          reason: 'High number of popular entries should have extended TTL',
          estimatedImpact: popularRatio * 0.4,
          urgency: 'optional',
          affectedEntries: healthMetrics.popularEntries,
          potentialSavingsLoss: 0,
          qualityImprovement: 0.1,
        });
      }

      // Recommendation 4: Wedding season preparation
      if (this.isApproachingWeddingSeason()) {
        recommendations.push({
          action: 'prepare-wedding-season-cache',
          reason: 'Wedding season approaching - prepare cache optimization',
          estimatedImpact: 0.7,
          urgency: 'soon',
          affectedEntries: Math.floor(healthMetrics.totalEntries * 0.6),
          potentialSavingsLoss: 0,
          qualityImprovement: 0.2,
        });
      }

      return recommendations.sort((a, b) => {
        const urgencyOrder = {
          immediate: 4,
          soon: 3,
          scheduled: 2,
          optional: 1,
        };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });
    } catch (error) {
      console.error('Error getting invalidation recommendations:', error);
      return [];
    }
  }

  /**
   * Execute policy-based invalidation
   */
  private async executePolicyInvalidation(
    policy: InvalidationPolicy,
    healthMetrics: CacheHealthMetrics,
  ): Promise<InvalidationResult> {
    let invalidated = 0;
    let preserved = 0;
    let estimatedSavings = 0;
    const errors: string[] = [];

    try {
      for (const trigger of policy.triggers) {
        const triggerResult = await this.executeTrigger(
          trigger,
          policy,
          healthMetrics,
        );
        invalidated += triggerResult.invalidated;
        preserved += triggerResult.preserved;
        estimatedSavings += triggerResult.estimatedSavings;
        errors.push(...triggerResult.errors);
      }

      return { invalidated, preserved, errors, estimatedSavings };
    } catch (error) {
      errors.push(`Policy execution failed: ${error}`);
      return { invalidated: 0, preserved: 0, errors, estimatedSavings: 0 };
    }
  }

  /**
   * Execute individual trigger
   */
  private async executeTrigger(
    trigger: InvalidationTrigger,
    policy: InvalidationPolicy,
    healthMetrics: CacheHealthMetrics,
  ): Promise<InvalidationResult> {
    try {
      let query = this.supabase.from('ai_cache_requests').select(`
        *,
        ai_cache_responses(*)
      `);

      // Apply context filter
      if (policy.contexts.length > 0) {
        query = query.in('context', policy.contexts);
      }

      // Apply trigger conditions
      const now = new Date();
      switch (trigger.type) {
        case 'time_based':
          if (trigger.condition === 'age_hours') {
            const cutoffDate = new Date(
              now.getTime() - trigger.threshold * 60 * 60 * 1000,
            );
            query = query.lt('created_at', cutoffDate.toISOString());
          } else if (trigger.condition === 'age_days') {
            const cutoffDate = new Date(
              now.getTime() - trigger.threshold * 24 * 60 * 60 * 1000,
            );
            query = query.lt('created_at', cutoffDate.toISOString());
          }
          break;

        case 'usage_based':
          if (trigger.condition === 'hit_count') {
            // This would need a join with responses table in production
            query = query.gte(
              'ai_cache_responses.usage_count',
              trigger.threshold,
            );
          }
          break;

        case 'content_based':
        case 'event_based':
          // These would be handled by external event systems in production
          console.log(
            `Trigger type ${trigger.type} not implemented in this demo`,
          );
          return {
            invalidated: 0,
            preserved: 0,
            errors: [],
            estimatedSavings: 0,
          };
      }

      const { data: candidateEntries, error } = await query.limit(1000);

      if (error) {
        return {
          invalidated: 0,
          preserved: 0,
          errors: [`Query error: ${error.message}`],
          estimatedSavings: 0,
        };
      }

      let invalidated = 0;
      let preserved = 0;
      let estimatedSavings = 0;

      // Process each candidate entry
      for (const entry of candidateEntries || []) {
        const shouldPreserve =
          policy.preservePopularEntries &&
          entry.ai_cache_responses?.some((r: any) => r.usage_count > 10);

        if (shouldPreserve) {
          preserved++;
          continue;
        }

        // Execute the trigger action
        switch (trigger.action) {
          case 'invalidate':
            await this.supabase
              .from('ai_cache_requests')
              .delete()
              .eq('id', entry.id);
            invalidated++;
            estimatedSavings += this.calculateSavingsFromEntry(entry);
            break;

          case 'refresh':
            // Mark for refresh (would trigger background refresh in production)
            await this.supabase
              .from('ai_cache_requests')
              .update({
                needs_refresh: true,
                refresh_priority: policy.priority,
              })
              .eq('id', entry.id);
            preserved++;
            break;

          case 'extend_ttl':
            const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await this.supabase
              .from('ai_cache_requests')
              .update({ expires_at: newExpiry.toISOString() })
              .eq('id', entry.id);
            preserved++;
            break;

          case 'archive':
            await this.supabase
              .from('ai_cache_requests')
              .update({
                status: 'archived',
                archived_at: now.toISOString(),
              })
              .eq('id', entry.id);
            preserved++;
            break;
        }
      }

      return {
        invalidated,
        preserved,
        errors: [],
        estimatedSavings,
      };
    } catch (error) {
      return {
        invalidated: 0,
        preserved: 0,
        errors: [`Trigger execution failed: ${error}`],
        estimatedSavings: 0,
      };
    }
  }

  /**
   * Helper methods
   */
  private isInBlackoutPeriod(
    policy: InvalidationPolicy,
    blackouts: BlackoutPeriod[],
  ): boolean {
    const now = new Date();
    return blackouts.some(
      (blackout) =>
        now >= blackout.startDate &&
        now <= blackout.endDate &&
        blackout.restrictedActions.some((action) =>
          policy.triggers.some((trigger) => trigger.action === action),
        ),
    );
  }

  private async getActiveBlackoutPeriods(): Promise<BlackoutPeriod[]> {
    const now = new Date();
    const isWeekend = now.getDay() === 5 || now.getDay() === 6; // Friday or Saturday
    const blackouts: BlackoutPeriod[] = [];

    // Add weekend blackout during wedding season
    if (isWeekend && this.isWeddingSeason()) {
      const weekendStart = new Date(now);
      weekendStart.setHours(18, 0, 0, 0); // 6 PM Friday
      if (now.getDay() === 5) weekendStart.setDate(now.getDate()); // Friday
      if (now.getDay() === 6) weekendStart.setDate(now.getDate() - 1); // Saturday (start from Friday)

      const weekendEnd = new Date(weekendStart);
      weekendEnd.setDate(weekendStart.getDate() + 2); // Sunday
      weekendEnd.setHours(2, 0, 0, 0); // 2 AM Sunday

      blackouts.push({
        name: 'weekend_protection',
        startDate: weekendStart,
        endDate: weekendEnd,
        restrictedActions: ['invalidate', 'refresh'],
        reason: 'Protect cache during high-traffic wedding weekend',
      });
    }

    return blackouts;
  }

  private adjustPolicyForSeason(
    policy: InvalidationPolicy,
  ): InvalidationPolicy {
    if (!this.isWeddingSeason()) {
      return policy;
    }

    // Clone policy and adjust for wedding season
    const adjustedPolicy = JSON.parse(JSON.stringify(policy));

    // Adjust trigger thresholds for wedding season
    adjustedPolicy.triggers.forEach((trigger: InvalidationTrigger) => {
      if (trigger.type === 'time_based') {
        trigger.threshold = Math.floor(
          trigger.threshold / policy.weddingSeasonAdjustment,
        );
      }
    });

    // Use wedding season frequency if specified
    if (adjustedPolicy.schedule.weddingSeasonFrequency) {
      adjustedPolicy.schedule.frequency =
        adjustedPolicy.schedule.weddingSeasonFrequency;
    }

    return adjustedPolicy;
  }

  private isWeddingSeason(): boolean {
    const now = new Date();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    return month >= 5 && month <= 10; // May-October
  }

  private isApproachingWeddingSeason(): boolean {
    const now = new Date();
    const month = now.getMonth() + 1;
    return month === 4; // April - approaching wedding season
  }

  private calculateSavingsFromEntry(entry: any): number {
    // Simplified calculation - would use actual cost data in production
    const avgCost = entry.ai_cache_responses?.[0]?.usage_metrics
      ? JSON.parse(entry.ai_cache_responses[0].usage_metrics).cost
      : 0.01;
    const usageCount = entry.ai_cache_responses?.[0]?.usage_count || 1;
    return (usageCount - 1) * avgCost; // Savings from cache hits
  }

  private async logPolicyExecution(
    policyName: string,
    result: InvalidationResult,
  ): Promise<void> {
    try {
      await this.supabase.from('cache_invalidation_log').insert({
        policy_name: policyName,
        invalidated_count: result.invalidated,
        preserved_count: result.preserved,
        estimated_savings: result.estimatedSavings,
        errors: JSON.stringify(result.errors),
        executed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging policy execution:', error);
    }
  }

  private async updateCacheHealthMetrics(
    invalidated: number,
    preserved: number,
    savings: number,
  ): Promise<void> {
    try {
      await this.supabase.from('cache_health_metrics').upsert(
        {
          date: new Date().toISOString().split('T')[0],
          entries_invalidated: invalidated,
          entries_preserved: preserved,
          estimated_savings: savings,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'date',
        },
      );
    } catch (error) {
      console.error('Error updating cache health metrics:', error);
    }
  }
}
