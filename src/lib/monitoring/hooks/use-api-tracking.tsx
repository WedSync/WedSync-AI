/**
 * WS-233 API Usage Monitoring - React Hooks for API Tracking
 * Team C Integration: React hooks for easy API usage tracking integration
 * Provides context and hooks for components to track API usage automatically
 */

'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  apiUsageTracker,
  type APIService,
  type APIUsageEvent,
} from '@/lib/monitoring/api-usage-tracker';
import {
  initializeAPIMonitoring,
  RequestScopedMonitoring,
} from '@/lib/monitoring/middleware/api-monitoring-middleware';

/**
 * API Tracking Context
 */
interface APITrackingContextType {
  organizationId: string;
  userId?: string;
  isTracking: boolean;
  usageStats: {
    totalCost: number;
    totalRequests: number;
    errorRate: number;
  };
  trackAPICall: (
    apiService: APIService,
    endpoint: string,
    cost: number,
    metadata?: Record<string, any>,
  ) => Promise<void>;
  getBudgetStatus: (apiService: APIService) => Promise<any>;
  getUsageAnalytics: (
    dateRange: { start: Date; end: Date },
    apiService?: APIService,
  ) => Promise<any>;
}

const APITrackingContext = createContext<APITrackingContextType | null>(null);

/**
 * API Tracking Provider Component
 */
interface APITrackingProviderProps {
  children: ReactNode;
  organizationId: string;
  userId?: string;
  enableAutoTracking?: boolean;
  enabledServices?: APIService[];
}

export function APITrackingProvider({
  children,
  organizationId,
  userId,
  enableAutoTracking = true,
  enabledServices = ['openai', 'supabase', 'resend', 'twilio', 'vercel'],
}: APITrackingProviderProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [usageStats, setUsageStats] = useState({
    totalCost: 0,
    totalRequests: 0,
    errorRate: 0,
  });

  // Initialize automatic tracking middleware
  useEffect(() => {
    if (enableAutoTracking) {
      try {
        initializeAPIMonitoring({
          organizationId,
          userId,
          enabledServices,
          trackingLevel: 'standard',
        });
        setIsTracking(true);
      } catch (error) {
        console.error('Failed to initialize API tracking:', error);
      }
    }

    return () => {
      // Cleanup is handled by the middleware itself
      setIsTracking(false);
    };
  }, [organizationId, userId, enableAutoTracking, enabledServices]);

  // Load initial usage stats
  useEffect(() => {
    const loadUsageStats = async () => {
      try {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const analytics = await apiUsageTracker.getUsageAnalytics(
          organizationId,
          { start: monthStart, end: today },
        );

        setUsageStats({
          totalCost: analytics.totalCost,
          totalRequests: analytics.totalRequests,
          errorRate: analytics.errorRate,
        });
      } catch (error) {
        console.error('Failed to load usage stats:', error);
      }
    };

    loadUsageStats();
  }, [organizationId]);

  // Manual API tracking function
  const trackAPICall = useCallback(
    async (
      apiService: APIService,
      endpoint: string,
      cost: number,
      metadata: Record<string, any> = {},
    ) => {
      try {
        await apiUsageTracker.trackAPIUsage({
          apiService,
          endpoint,
          method: 'POST',
          requestId: crypto.randomUUID(),
          organizationId,
          userId,
          duration: 0, // Manual tracking, no duration
          statusCode: 200, // Assume success for manual tracking
          metadata: { ...metadata, manuallyTracked: true },
        });

        // Update usage stats
        setUsageStats((prev) => ({
          totalCost: prev.totalCost + cost,
          totalRequests: prev.totalRequests + 1,
          errorRate: prev.errorRate, // Keep existing error rate
        }));
      } catch (error) {
        console.error('Failed to track API call:', error);
      }
    },
    [organizationId, userId],
  );

  // Budget status check
  const getBudgetStatus = useCallback(
    async (apiService: APIService) => {
      try {
        const budgets = await apiUsageTracker.getBudgetStatus(
          organizationId,
          apiService,
        );
        return budgets[0] || null;
      } catch (error) {
        console.error('Failed to get budget status:', error);
        return null;
      }
    },
    [organizationId],
  );

  // Usage analytics
  const getUsageAnalytics = useCallback(
    async (dateRange: { start: Date; end: Date }, apiService?: APIService) => {
      try {
        return await apiUsageTracker.getUsageAnalytics(
          organizationId,
          dateRange,
          apiService,
        );
      } catch (error) {
        console.error('Failed to get usage analytics:', error);
        return null;
      }
    },
    [organizationId],
  );

  const contextValue: APITrackingContextType = {
    organizationId,
    userId,
    isTracking,
    usageStats,
    trackAPICall,
    getBudgetStatus,
    getUsageAnalytics,
  };

  return (
    <APITrackingContext.Provider value={contextValue}>
      {children}
    </APITrackingContext.Provider>
  );
}

/**
 * Hook to use API tracking context
 */
export function useAPITracking() {
  const context = useContext(APITrackingContext);
  if (!context) {
    throw new Error(
      'useAPITracking must be used within an APITrackingProvider',
    );
  }
  return context;
}

/**
 * Hook for manual API usage tracking
 */
export function useAPIUsageTracking(apiService: APIService) {
  const { organizationId, userId, trackAPICall } = useAPITracking();

  const track = useCallback(
    async (endpoint: string, cost: number, metadata?: Record<string, any>) => {
      await trackAPICall(apiService, endpoint, cost, metadata);
    },
    [apiService, trackAPICall],
  );

  return { track };
}

/**
 * Hook for OpenAI usage tracking with token cost calculation
 */
export function useOpenAITracking() {
  const { track } = useAPIUsageTracking('openai');

  const trackCompletion = useCallback(
    async (
      model: string,
      inputTokens: number,
      outputTokens: number,
      endpoint = '/chat/completions',
    ) => {
      // Calculate cost based on model pricing
      let inputCost = 0;
      let outputCost = 0;

      switch (model) {
        case 'gpt-4':
        case 'gpt-4-0613':
        case 'gpt-4-vision-preview':
          inputCost = inputTokens * 0.00003; // $0.03 per 1K tokens
          outputCost = outputTokens * 0.00006; // $0.06 per 1K tokens
          break;
        case 'gpt-3.5-turbo':
        case 'gpt-3.5-turbo-0613':
          inputCost = inputTokens * 0.0000015; // $0.0015 per 1K tokens
          outputCost = outputTokens * 0.000002; // $0.002 per 1K tokens
          break;
        default:
          // Default to GPT-4 pricing for unknown models
          inputCost = inputTokens * 0.00003;
          outputCost = outputTokens * 0.00006;
      }

      const totalCost = inputCost + outputCost;

      await track(endpoint, totalCost, {
        model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        inputCost,
        outputCost,
      });
    },
    [track],
  );

  const trackEmbedding = useCallback(
    async (model: string, tokens: number, endpoint = '/embeddings') => {
      let cost = 0;

      switch (model) {
        case 'text-embedding-3-small':
          cost = tokens * 0.00000002; // $0.02 per 1M tokens
          break;
        case 'text-embedding-3-large':
          cost = tokens * 0.00000013; // $0.13 per 1M tokens
          break;
        case 'text-embedding-ada-002':
          cost = tokens * 0.0000001; // $0.10 per 1M tokens
          break;
        default:
          cost = tokens * 0.00000002; // Default to small model pricing
      }

      await track(endpoint, cost, {
        model,
        tokens,
      });
    },
    [track],
  );

  return { trackCompletion, trackEmbedding };
}

/**
 * Hook for Resend email tracking
 */
export function useResendTracking() {
  const { track } = useAPIUsageTracking('resend');

  const trackEmail = useCallback(
    async (emailCount: number = 1, endpoint = '/emails') => {
      const cost = emailCount * 0.0004; // $0.40 per 1K emails

      await track(endpoint, cost, {
        emailCount,
        costPerEmail: 0.0004,
      });
    },
    [track],
  );

  const trackBatchEmails = useCallback(
    async (emailCount: number, endpoint = '/emails/batch') => {
      const cost = emailCount * 0.0004; // $0.40 per 1K emails

      await track(endpoint, cost, {
        emailCount,
        batchSize: emailCount,
        costPerEmail: 0.0004,
      });
    },
    [track],
  );

  return { trackEmail, trackBatchEmails };
}

/**
 * Hook for Twilio SMS tracking
 */
export function useTwilioTracking() {
  const { track } = useAPIUsageTracking('twilio');

  const trackSMS = useCallback(
    async (
      segments: number = 1,
      isInternational: boolean = false,
      endpoint = '/Messages',
    ) => {
      const costPerSegment = isInternational ? 0.05 : 0.0075; // International vs domestic
      const cost = segments * costPerSegment;

      await track(endpoint, cost, {
        messageType: 'sms',
        segments,
        isInternational,
        costPerSegment,
      });
    },
    [track],
  );

  const trackVoiceCall = useCallback(
    async (
      durationMinutes: number,
      isInternational: boolean = false,
      endpoint = '/Calls',
    ) => {
      const costPerMinute = isInternational ? 0.065 : 0.0225; // International vs domestic
      const cost = durationMinutes * costPerMinute;

      await track(endpoint, cost, {
        messageType: 'voice',
        durationMinutes,
        isInternational,
        costPerMinute,
      });
    },
    [track],
  );

  return { trackSMS, trackVoiceCall };
}

/**
 * Hook for Supabase usage tracking
 */
export function useSupabaseTracking() {
  const { track } = useAPIUsageTracking('supabase');

  const trackDatabaseOperation = useCallback(
    async (
      rowCount: number = 1,
      operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT',
      table?: string,
    ) => {
      const cost = Math.ceil(rowCount / 1000) * 0.00000125; // $0.0125 per 10K rows

      await track(`/db/${table || 'unknown'}`, cost, {
        operationType: 'database',
        operation,
        rowCount,
        units: Math.ceil(rowCount / 1000),
      });
    },
    [track],
  );

  const trackAuthOperation = useCallback(
    async (
      operation: 'signin' | 'signup' | 'signout',
      endpoint = `/auth/${operation}`,
    ) => {
      const cost = 0.00000099; // $0.00099 per MAU (approximation)

      await track(endpoint, cost, {
        operationType: 'auth',
        operation,
      });
    },
    [track],
  );

  const trackStorageOperation = useCallback(
    async (
      sizeGB: number,
      operation: 'upload' | 'download' | 'delete',
      bucket: string,
    ) => {
      const cost = sizeGB * 0.021; // $0.021 per GB

      await track(`/storage/${bucket}/${operation}`, cost, {
        operationType: 'storage',
        operation,
        sizeGB,
      });
    },
    [track],
  );

  return { trackDatabaseOperation, trackAuthOperation, trackStorageOperation };
}

/**
 * Hook for budget monitoring and alerts
 */
export function useBudgetMonitoring(
  apiService: APIService,
  warningThreshold: number = 80,
) {
  const { getBudgetStatus } = useAPITracking();
  const [budgetStatus, setBudgetStatus] = useState<any>(null);
  const [isOverBudget, setIsOverBudget] = useState(false);
  const [isNearBudget, setIsNearBudget] = useState(false);

  // Check budget status
  const checkBudget = useCallback(async () => {
    try {
      const status = await getBudgetStatus(apiService);
      setBudgetStatus(status);

      if (status) {
        const usagePercentage =
          (status.currentUsage / status.monthlyLimit) * 100;
        setIsOverBudget(usagePercentage > 100);
        setIsNearBudget(
          usagePercentage > warningThreshold && usagePercentage <= 100,
        );
      }
    } catch (error) {
      console.error('Failed to check budget status:', error);
    }
  }, [apiService, getBudgetStatus, warningThreshold]);

  // Check budget on mount and interval
  useEffect(() => {
    checkBudget();
    const interval = setInterval(checkBudget, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkBudget]);

  return {
    budgetStatus,
    isOverBudget,
    isNearBudget,
    checkBudget,
    usagePercentage: budgetStatus
      ? (budgetStatus.currentUsage / budgetStatus.monthlyLimit) * 100
      : 0,
  };
}

/**
 * Hook for real-time usage analytics
 */
export function useUsageAnalytics(
  apiService?: APIService,
  dateRange: { start: Date; end: Date } = {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(),
  },
) {
  const { getUsageAnalytics } = useAPITracking();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsageAnalytics(dateRange, apiService);
      setAnalytics(data);
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [getUsageAnalytics, apiService, dateRange]);

  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  return {
    analytics,
    loading,
    error,
    refreshAnalytics,
  };
}

/**
 * Higher-order component for API tracking
 */
export function withAPITracking<P extends object>(
  Component: React.ComponentType<P>,
  organizationId: string,
  userId?: string,
) {
  return function WrappedComponent(props: P) {
    return (
      <APITrackingProvider organizationId={organizationId} userId={userId}>
        <Component {...props} />
      </APITrackingProvider>
    );
  };
}
