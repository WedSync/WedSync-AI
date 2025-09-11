/**
 * WS-168: Customer Health Data Hook - React 19 Pattern
 * Secure API integration with real-time updates and error handling
 */

import { use, useMemo, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// API types with strict readonly enforcement
interface CustomerHealthMetrics {
  readonly summary: Readonly<{
    total_users: number;
    average_health_score: number;
    milestones_achieved_today: number;
    at_risk_users: number;
    champion_users: number;
  }>;
  readonly health_score_distribution: Readonly<Record<string, number>>;
  readonly milestone_achievements: ReadonlyArray<{
    readonly type: string;
    readonly count: number;
    readonly avg_time_to_achieve: number;
  }>;
  readonly engagement_trends: ReadonlyArray<{
    readonly date: string;
    readonly active_users: number;
    readonly avg_engagement_score: number;
  }>;
  readonly at_risk_users: ReadonlyArray<{
    readonly user_id: string;
    readonly risk_score: number;
    readonly risk_factors: ReadonlyArray<string>;
    readonly recommended_actions: ReadonlyArray<string>;
  }>;
}

interface HealthDataState {
  readonly data: CustomerHealthMetrics | null;
  readonly error: Error | null;
  readonly loading: boolean;
  readonly lastUpdated: Date | null;
}

interface HealthDataCache {
  data: CustomerHealthMetrics | null;
  timestamp: number;
  expiresAt: number;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STALE_WHILE_REVALIDATE_DURATION = 30 * 60 * 1000; // 30 minutes

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// In-memory cache for customer health data
const healthDataCache = new Map<string, HealthDataCache>();

// API utility functions
const customerHealthAPI = {
  async getHealthMetrics(): Promise<CustomerHealthMetrics> {
    try {
      const { data, error } = await supabase
        .from('customer_health_metrics')
        .select(
          `
          summary,
          health_score_distribution,
          milestone_achievements,
          engagement_trends,
          at_risk_users (
            user_id,
            risk_score,
            risk_factors,
            recommended_actions
          )
        `,
        )
        .eq('is_current', true)
        .single();

      if (error) {
        throw new Error(`Failed to fetch health metrics: ${error.message}`);
      }

      if (!data) {
        throw new Error('No health metrics data available');
      }

      return data as CustomerHealthMetrics;
    } catch (error) {
      console.error('Customer health API error:', error);
      throw error instanceof Error ? error : new Error('Unknown API error');
    }
  },

  async refreshHealthScores(): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke(
        'refresh-health-scores',
      );

      if (error) {
        throw new Error(`Failed to refresh health scores: ${error.message}`);
      }

      return { success: true, message: 'Health scores refreshed successfully' };
    } catch (error) {
      console.error('Health score refresh error:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to refresh health scores',
      };
    }
  },
};

// Cache utilities
const getCacheKey = (userId?: string): string => {
  return userId ? `health_data_${userId}` : 'health_data_global';
};

const getCachedData = (cacheKey: string): CustomerHealthMetrics | null => {
  const cached = healthDataCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  const now = Date.now();

  // Return cached data if still fresh
  if (now < cached.expiresAt) {
    return cached.data;
  }

  // Remove expired cache
  if (now > cached.timestamp + STALE_WHILE_REVALIDATE_DURATION) {
    healthDataCache.delete(cacheKey);
    return null;
  }

  // Return stale data (will be revalidated in background)
  return cached.data;
};

const setCachedData = (cacheKey: string, data: CustomerHealthMetrics): void => {
  const now = Date.now();

  healthDataCache.set(cacheKey, {
    data,
    timestamp: now,
    expiresAt: now + CACHE_DURATION,
  });
};

// Custom hook for customer health data with React 19 patterns
export function useCustomerHealthData(userId?: string): HealthDataState {
  const cacheKey = useMemo(() => getCacheKey(userId), [userId]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check cache first
  const cachedData = useMemo(() => getCachedData(cacheKey), [cacheKey]);

  // Create data fetching promise
  const dataPromise = useMemo(() => {
    // Return cached data immediately if available
    if (cachedData) {
      return Promise.resolve(cachedData);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    return customerHealthAPI.getHealthMetrics().then((data) => {
      setCachedData(cacheKey, data);
      return data;
    });
  }, [cacheKey, cachedData]);

  // Use React 19 use() hook for data fetching
  const data = use(dataPromise);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Manual refresh function
  const refresh = useCallback(async (): Promise<void> => {
    try {
      // Clear cache to force fresh fetch
      healthDataCache.delete(cacheKey);

      // Fetch fresh data
      const freshData = await customerHealthAPI.getHealthMetrics();
      setCachedData(cacheKey, freshData);

      // Trigger re-render by updating cache
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to refresh health data:', error);
      throw error;
    }
  }, [cacheKey]);

  return {
    data,
    error: null, // Errors are handled by Suspense boundaries
    loading: false, // React 19 use() handles loading states
    lastUpdated: cachedData
      ? new Date(healthDataCache.get(cacheKey)?.timestamp || Date.now())
      : null,
  };
}

// Hook for health data mutations
export function useCustomerHealthMutations() {
  const refreshHealthScores = useCallback(async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      const result = await customerHealthAPI.refreshHealthScores();

      if (result.success) {
        // Clear all caches to force fresh data
        healthDataCache.clear();
      }

      return result;
    } catch (error) {
      console.error('Health score refresh failed:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to refresh health scores',
      };
    }
  }, []);

  const triggerIntervention = useCallback(
    async (
      userId: string,
      interventionType: string,
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const { data, error } = await supabase.functions.invoke(
          'trigger-intervention',
          {
            body: {
              user_id: userId,
              intervention_type: interventionType,
              timestamp: new Date().toISOString(),
            },
          },
        );

        if (error) {
          throw new Error(`Failed to trigger intervention: ${error.message}`);
        }

        // Invalidate health data cache after intervention
        healthDataCache.clear();

        return {
          success: true,
          message: `Intervention ${interventionType} triggered successfully for user ${userId}`,
        };
      } catch (error) {
        console.error('Intervention trigger failed:', error);
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to trigger intervention',
        };
      }
    },
    [],
  );

  return {
    refreshHealthScores,
    triggerIntervention,
  };
}

// Export API for direct usage if needed
export { customerHealthAPI };
export type { CustomerHealthMetrics, HealthDataState };
