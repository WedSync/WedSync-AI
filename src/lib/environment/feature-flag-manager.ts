/**
 * WS-194 Feature Flag Management System
 * Environment-specific feature flag control with wedding workflow context
 * Team B - Backend/API Focus
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import { TierCheckResult } from '../feature-gates';

// Feature flag types
export type FeatureFlagType =
  | 'boolean' // Simple on/off
  | 'percentage' // Percentage rollout
  | 'multivariate' // Multiple variants
  | 'json' // Complex configuration
  | 'wedding_seasonal'; // Wedding season-specific

// Feature flag targeting rules
interface TargetingRule {
  id: string;
  name: string;
  conditions: {
    environment?: string[];
    userTier?: string[];
    organizationId?: string[];
    userPercentage?: number;
    weddingSeasonOnly?: boolean;
    excludeSaturdays?: boolean;
    peakSeasonOnly?: boolean;
    minUserCount?: number;
    customAttributes?: Record<string, unknown>;
  };
  enabled: boolean;
  priority: number;
}

// Feature flag configuration
interface FeatureFlagConfig {
  id: string;
  key: string;
  name: string;
  description: string;
  type: FeatureFlagType;
  defaultValue: unknown;
  environments: {
    development: {
      enabled: boolean;
      value: unknown;
      overrides?: Record<string, unknown>;
    };
    staging: {
      enabled: boolean;
      value: unknown;
      overrides?: Record<string, unknown>;
    };
    production: {
      enabled: boolean;
      value: unknown;
      overrides?: Record<string, unknown>;
    };
  };
  targetingRules: TargetingRule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // Wedding-specific properties
  weddingContext?: {
    affectsWeddingDay: boolean;
    requiresVendorApproval: boolean;
    peakSeasonBehavior: 'same' | 'enhanced' | 'disabled';
    saturdayBehavior: 'same' | 'enhanced' | 'disabled';
  };
}

// Feature flag evaluation context
interface EvaluationContext {
  userId?: string;
  organizationId?: string;
  userTier?: string;
  environment: string;
  isWeddingSeason?: boolean;
  isSaturday?: boolean;
  customAttributes?: Record<string, unknown>;
}

// Feature flag evaluation result
interface EvaluationResult {
  enabled: boolean;
  value: unknown;
  reason: string;
  ruleId?: string;
  variant?: string;
  metadata?: Record<string, unknown>;
}

// Wedding-aware feature flag manager
export class FeatureFlagManager {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private flagCache = new Map<
    string,
    { config: FeatureFlagConfig; expiresAt: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Create a new feature flag
   */
  async createFeatureFlag(
    config: Omit<FeatureFlagConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const flagId = `flag_${config.key}_${Date.now()}`;

    const flagData = {
      id: flagId,
      ...config,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('feature_flags')
      .insert(flagData);

    if (error) {
      logger.error('Failed to create feature flag', error, { config });
      throw new Error('Failed to create feature flag');
    }

    // Clear cache
    this.flagCache.clear();

    logger.info('Feature flag created', {
      flagId,
      key: config.key,
      name: config.name,
      type: config.type,
    });

    metrics.incrementCounter('feature_flags.created', 1, {
      type: config.type,
      affects_wedding_day:
        config.weddingContext?.affectsWeddingDay?.toString() || 'false',
    });

    return flagId;
  }

  /**
   * Evaluate a feature flag for given context
   */
  async evaluateFlag(
    key: string,
    context: EvaluationContext,
  ): Promise<EvaluationResult> {
    const startTime = Date.now();

    try {
      // Get flag configuration
      const config = await this.getFlagConfig(key);

      if (!config) {
        return {
          enabled: false,
          value: false,
          reason: 'Flag not found',
        };
      }

      if (!config.isActive) {
        return {
          enabled: false,
          value: config.defaultValue,
          reason: 'Flag is inactive',
        };
      }

      // Check environment-specific configuration
      const envConfig =
        config.environments[
          context.environment as keyof typeof config.environments
        ];
      if (!envConfig?.enabled) {
        return {
          enabled: false,
          value: envConfig?.value ?? config.defaultValue,
          reason: `Disabled in ${context.environment} environment`,
        };
      }

      // Apply wedding-specific logic
      const weddingResult = this.evaluateWeddingContext(config, context);
      if (weddingResult) {
        return weddingResult;
      }

      // Evaluate targeting rules
      const ruleResult = this.evaluateTargetingRules(config, context);
      if (ruleResult) {
        return ruleResult;
      }

      // Default environment value
      return {
        enabled: true,
        value: envConfig.value,
        reason: 'Default environment configuration',
      };
    } catch (error) {
      logger.error('Feature flag evaluation failed', error as Error, {
        key,
        context,
      });

      return {
        enabled: false,
        value: false,
        reason: 'Evaluation error',
      };
    } finally {
      metrics.recordHistogram(
        'feature_flags.evaluation_duration',
        Date.now() - startTime,
      );
    }
  }

  /**
   * Evaluate wedding-specific context
   */
  private evaluateWeddingContext(
    config: FeatureFlagConfig,
    context: EvaluationContext,
  ): EvaluationResult | null {
    if (!config.weddingContext) {
      return null;
    }

    const { weddingContext } = config;
    const isSaturday = context.isSaturday ?? new Date().getDay() === 6;
    const isWeddingSeason =
      context.isWeddingSeason ?? this.isCurrentlyWeddingSeason();

    // Saturday behavior
    if (isSaturday && weddingContext.affectsWeddingDay) {
      switch (weddingContext.saturdayBehavior) {
        case 'disabled':
          return {
            enabled: false,
            value: config.defaultValue,
            reason: 'Disabled on Saturdays for wedding day protection',
          };
        case 'enhanced':
          return {
            enabled: true,
            value: this.getEnhancedValue(config, context),
            reason: 'Enhanced mode for Saturday wedding day',
          };
      }
    }

    // Peak season behavior
    if (isWeddingSeason) {
      switch (weddingContext.peakSeasonBehavior) {
        case 'disabled':
          return {
            enabled: false,
            value: config.defaultValue,
            reason: 'Disabled during peak wedding season',
          };
        case 'enhanced':
          return {
            enabled: true,
            value: this.getEnhancedValue(config, context),
            reason: 'Enhanced mode for peak wedding season',
          };
      }
    }

    return null;
  }

  /**
   * Evaluate targeting rules
   */
  private evaluateTargetingRules(
    config: FeatureFlagConfig,
    context: EvaluationContext,
  ): EvaluationResult | null {
    // Sort rules by priority (higher priority first)
    const sortedRules = [...config.targetingRules].sort(
      (a, b) => b.priority - a.priority,
    );

    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      if (this.ruleMatches(rule, context)) {
        const value = this.getRuleValue(config, rule, context);

        return {
          enabled: true,
          value,
          reason: `Matched targeting rule: ${rule.name}`,
          ruleId: rule.id,
        };
      }
    }

    return null;
  }

  /**
   * Check if targeting rule matches context
   */
  private ruleMatches(
    rule: TargetingRule,
    context: EvaluationContext,
  ): boolean {
    const { conditions } = rule;

    // Environment check
    if (
      conditions.environment &&
      !conditions.environment.includes(context.environment)
    ) {
      return false;
    }

    // User tier check
    if (
      conditions.userTier &&
      context.userTier &&
      !conditions.userTier.includes(context.userTier)
    ) {
      return false;
    }

    // Organization ID check
    if (conditions.organizationId && context.organizationId) {
      if (!conditions.organizationId.includes(context.organizationId)) {
        return false;
      }
    }

    // User percentage rollout
    if (conditions.userPercentage !== undefined && context.userId) {
      const hash = this.hashUserId(context.userId);
      const percentage = hash % 100;
      if (percentage >= conditions.userPercentage) {
        return false;
      }
    }

    // Wedding season only
    if (conditions.weddingSeasonOnly && !context.isWeddingSeason) {
      return false;
    }

    // Exclude Saturdays
    if (conditions.excludeSaturdays && context.isSaturday) {
      return false;
    }

    // Peak season only
    if (conditions.peakSeasonOnly && !this.isCurrentlyWeddingSeason()) {
      return false;
    }

    // Custom attributes
    if (conditions.customAttributes && context.customAttributes) {
      for (const [key, value] of Object.entries(conditions.customAttributes)) {
        if (context.customAttributes[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get value from rule evaluation
   */
  private getRuleValue(
    config: FeatureFlagConfig,
    rule: TargetingRule,
    context: EvaluationContext,
  ): unknown {
    // For now, return environment value
    const envConfig =
      config.environments[
        context.environment as keyof typeof config.environments
      ];
    return envConfig?.value ?? config.defaultValue;
  }

  /**
   * Get enhanced value for wedding context
   */
  private getEnhancedValue(
    config: FeatureFlagConfig,
    context: EvaluationContext,
  ): unknown {
    const envConfig =
      config.environments[
        context.environment as keyof typeof config.environments
      ];
    let baseValue = envConfig?.value ?? config.defaultValue;

    // Apply enhancements based on flag type
    switch (config.type) {
      case 'percentage':
        // Increase percentage for wedding days/season
        if (typeof baseValue === 'number') {
          return Math.min(100, (baseValue as number) * 1.5);
        }
        break;

      case 'json':
        // Merge wedding-specific overrides
        if (typeof baseValue === 'object' && baseValue !== null) {
          return {
            ...(baseValue as Record<string, unknown>),
            weddingEnhanced: true,
            capacity: context.isSaturday ? 'unlimited' : 'high',
          };
        }
        break;

      case 'boolean':
        // Force enable for wedding days
        return true;
    }

    return baseValue;
  }

  /**
   * Get feature flag configuration
   */
  private async getFlagConfig(key: string): Promise<FeatureFlagConfig | null> {
    // Check cache first
    const cached = this.flagCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.config;
    }

    // Fetch from database
    const { data, error } = await this.supabase
      .from('feature_flags')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      logger.warn('Feature flag not found', { key, error });
      return null;
    }

    const config = data as FeatureFlagConfig;

    // Cache the result
    this.flagCache.set(key, {
      config,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return config;
  }

  /**
   * Update feature flag configuration
   */
  async updateFeatureFlag(
    key: string,
    updates: Partial<Omit<FeatureFlagConfig, 'id' | 'key' | 'createdAt'>>,
  ): Promise<void> {
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('feature_flags')
      .update(updatedData)
      .eq('key', key);

    if (error) {
      logger.error('Failed to update feature flag', error, { key, updates });
      throw new Error('Failed to update feature flag');
    }

    // Clear cache
    this.flagCache.delete(key);

    logger.info('Feature flag updated', {
      key,
      updates: Object.keys(updates),
    });

    metrics.incrementCounter('feature_flags.updated', 1, {
      key,
    });
  }

  /**
   * Delete feature flag
   */
  async deleteFeatureFlag(key: string): Promise<void> {
    const { error } = await this.supabase
      .from('feature_flags')
      .delete()
      .eq('key', key);

    if (error) {
      logger.error('Failed to delete feature flag', error, { key });
      throw new Error('Failed to delete feature flag');
    }

    // Clear cache
    this.flagCache.delete(key);

    logger.info('Feature flag deleted', { key });

    metrics.incrementCounter('feature_flags.deleted', 1, {
      key,
    });
  }

  /**
   * List all feature flags
   */
  async listFeatureFlags(environment?: string): Promise<FeatureFlagConfig[]> {
    let query = this.supabase
      .from('feature_flags')
      .select('*')
      .order('created_at', { ascending: false });

    if (environment) {
      // Filter by environment (this would need custom logic based on your needs)
      query = query.eq('environments->>environment', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to list feature flags', error);
      throw new Error('Failed to list feature flags');
    }

    return (data as FeatureFlagConfig[]) || [];
  }

  /**
   * Bulk evaluate multiple flags
   */
  async evaluateFlags(
    keys: string[],
    context: EvaluationContext,
  ): Promise<Record<string, EvaluationResult>> {
    const results: Record<string, EvaluationResult> = {};

    // Evaluate flags in parallel
    const evaluations = keys.map(async (key) => {
      const result = await this.evaluateFlag(key, context);
      return { key, result };
    });

    const resolved = await Promise.all(evaluations);

    for (const { key, result } of resolved) {
      results[key] = result;
    }

    return results;
  }

  /**
   * Get feature flag analytics
   */
  async getFlagAnalytics(
    key: string,
    timeRange: { from: Date; to: Date },
  ): Promise<{
    evaluations: number;
    enabled: number;
    disabled: number;
    topRules: Array<{ ruleId: string; count: number }>;
  }> {
    // This would query analytics data from your metrics system
    // For now, return mock data
    return {
      evaluations: 1000,
      enabled: 750,
      disabled: 250,
      topRules: [
        { ruleId: 'rule_tier_check', count: 400 },
        { ruleId: 'rule_percentage', count: 350 },
      ],
    };
  }

  /**
   * Emergency disable flag
   */
  async emergencyDisableFlag(key: string, reason: string): Promise<void> {
    await this.updateFeatureFlag(key, {
      isActive: false,
      updatedAt: new Date().toISOString(),
      // Store emergency disable reason in metadata
      targetingRules: [], // Clear all rules
    });

    logger.warn('Feature flag emergency disabled', {
      key,
      reason,
      timestamp: new Date().toISOString(),
    });

    metrics.incrementCounter('feature_flags.emergency_disabled', 1, {
      key,
      reason,
    });
  }

  /**
   * Check if currently in wedding season
   */
  private isCurrentlyWeddingSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    const weddingSeasonMonths = [5, 6, 7, 8, 9, 10]; // May through October
    return weddingSeasonMonths.includes(currentMonth);
  }

  /**
   * Hash user ID for consistent percentage rollouts
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Export singleton instance
export const featureFlagManager = new FeatureFlagManager();

// Convenience functions for common operations
export const evaluateFeatureFlag = (key: string, context: EvaluationContext) =>
  featureFlagManager.evaluateFlag(key, context);

export const isFeatureEnabled = async (
  key: string,
  context: EvaluationContext,
): Promise<boolean> => {
  const result = await evaluateFeatureFlag(key, context);
  return result.enabled;
};

export const getFeatureValue = async (
  key: string,
  context: EvaluationContext,
  defaultValue: unknown = false,
): Promise<unknown> => {
  const result = await evaluateFeatureFlag(key, context);
  return result.enabled ? result.value : defaultValue;
};

// React hook for client-side feature flags (placeholder)
export function useFeatureFlag(
  key: string,
  context?: Partial<EvaluationContext>,
) {
  // This would be implemented as a React hook with SWR or similar
  // For now, it's a placeholder
  return {
    enabled: false,
    value: false,
    loading: true,
    error: null,
  };
}
