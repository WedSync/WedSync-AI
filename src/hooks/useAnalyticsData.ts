'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Type imports
import type {
  AnalyticsData,
  RevenueData,
  BookingFunnelData,
  ClientSatisfactionData,
  MarketPositionData,
  PerformanceKPIData,
  MobileMetric,
  SeasonalPattern,
  VenueTypePattern,
  ServiceDemandPattern,
  GeographicPattern,
  WeddingDayTimeline,
  AnalyticsFilters,
  DateRange,
  DataRefreshConfig,
  WebSocketMessage,
  AnalyticsError,
  CacheConfig,
} from '@/types/analytics';

// Interfaces for the hook
interface UseAnalyticsDataProps {
  userId: string;
  organizationId: string;
  dateRange?: DateRange;
  filters?: AnalyticsFilters;
  realTimeEnabled?: boolean;
  refreshInterval?: number;
  cacheConfig?: CacheConfig;
}

interface AnalyticsDataState {
  // Core data
  revenue: RevenueData | null;
  bookingFunnel: BookingFunnelData | null;
  clientSatisfaction: ClientSatisfactionData | null;
  marketPosition: MarketPositionData | null;
  performanceKPIs: PerformanceKPIData | null;
  mobileMetrics: MobileMetric[];

  // Pattern data
  seasonalPatterns: SeasonalPattern[];
  venuePatterns: VenueTypePattern[];
  servicePatterns: ServiceDemandPattern[];
  geographicPatterns: GeographicPattern[];
  weddingTimeline: WeddingDayTimeline | null;

  // Meta data
  lastUpdated: Date;
  isLoading: boolean;
  error: AnalyticsError | null;
  isConnected: boolean;
  refreshCount: number;
}

interface AnalyticsDataActions {
  // Data operations
  refreshData: () => Promise<void>;
  refreshSpecificData: (dataType: keyof AnalyticsDataState) => Promise<void>;
  updateFilters: (newFilters: Partial<AnalyticsFilters>) => void;
  updateDateRange: (newDateRange: DateRange) => void;

  // Real-time operations
  enableRealTime: () => void;
  disableRealTime: () => void;

  // Cache operations
  clearCache: () => void;
  invalidateCache: (dataType?: keyof AnalyticsDataState) => void;

  // Export operations
  exportData: (
    format: 'json' | 'csv' | 'excel',
    dataTypes?: (keyof AnalyticsDataState)[],
  ) => Promise<void>;
}

type UseAnalyticsDataReturn = AnalyticsDataState & AnalyticsDataActions;

// Default configurations
const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 300000, // 5 minutes
  staleTime: 60000, // 1 minute
  cacheKey: 'analytics-data',
};

// Mock data generators (in a real app, these would be API calls)
const generateMockRevenueData = (dateRange: DateRange): RevenueData => ({
  totalRevenue: 156750,
  revenueGrowth: 12.5,
  monthlyRevenue: [
    { month: 'Jan', revenue: 12500, target: 15000, growth: -8.3 },
    { month: 'Feb', revenue: 14200, target: 15000, growth: 13.6 },
    { month: 'Mar', revenue: 18900, target: 15000, growth: 33.1 },
    { month: 'Apr', revenue: 22400, target: 20000, growth: 18.5 },
    { month: 'May', revenue: 28100, target: 25000, growth: 25.4 },
    { month: 'Jun', revenue: 35200, target: 30000, growth: 25.2 },
  ],
  revenueByService: [
    { service: 'Photography', revenue: 67500, percentage: 43.1, growth: 15.2 },
    { service: 'Videography', revenue: 39200, percentage: 25.0, growth: 28.7 },
    { service: 'Coordination', revenue: 28100, percentage: 17.9, growth: 8.3 },
    { service: 'Florals', revenue: 21950, percentage: 14.0, growth: 22.1 },
  ],
  projectedRevenue: {
    nextMonth: 38500,
    nextQuarter: 115000,
    yearEnd: 420000,
    confidence: 0.85,
  },
  seasonalTrends: {
    peakSeason: 'Summer',
    peakMultiplier: 2.3,
    slowSeason: 'Winter',
    slowMultiplier: 0.6,
  },
});

const generateMockBookingFunnelData = (): BookingFunnelData => ({
  stages: [
    {
      stage: 'Initial Inquiry',
      count: 450,
      conversionRate: 100,
      dropoffRate: 0,
    },
    {
      stage: 'Consultation Scheduled',
      count: 315,
      conversionRate: 70,
      dropoffRate: 30,
    },
    { stage: 'Proposal Sent', count: 252, conversionRate: 80, dropoffRate: 20 },
    {
      stage: 'Contract Signed',
      count: 189,
      conversionRate: 75,
      dropoffRate: 25,
    },
    {
      stage: 'Payment Received',
      count: 175,
      conversionRate: 93,
      dropoffRate: 7,
    },
  ],
  overallConversion: 38.9,
  averageTimeToConvert: 14.5,
  dropoffAnalysis: [
    {
      stage: 'Initial to Consultation',
      reason: 'Price concerns',
      percentage: 45,
    },
    {
      stage: 'Initial to Consultation',
      reason: 'Timing mismatch',
      percentage: 35,
    },
    {
      stage: 'Proposal to Contract',
      reason: 'Budget exceeded',
      percentage: 60,
    },
    {
      stage: 'Contract to Payment',
      reason: 'Administrative delays',
      percentage: 70,
    },
  ],
  recommendations: [
    'Implement tiered pricing options for price-sensitive leads',
    'Create urgency with limited availability messaging',
    'Offer flexible payment terms to reduce financial barriers',
  ],
});

// Query keys for React Query
const QUERY_KEYS = {
  revenue: (userId: string, dateRange: DateRange) => [
    'revenue',
    userId,
    dateRange,
  ],
  bookingFunnel: (userId: string, filters: AnalyticsFilters) => [
    'bookingFunnel',
    userId,
    filters,
  ],
  clientSatisfaction: (userId: string) => ['clientSatisfaction', userId],
  marketPosition: (userId: string) => ['marketPosition', userId],
  performanceKPIs: (userId: string) => ['performanceKPIs', userId],
  seasonalPatterns: (userId: string) => ['seasonalPatterns', userId],
  venuePatterns: (userId: string) => ['venuePatterns', userId],
  servicePatterns: (userId: string) => ['servicePatterns', userId],
  geographicPatterns: (userId: string) => ['geographicPatterns', userId],
  weddingTimeline: (userId: string) => ['weddingTimeline', userId],
} as const;

export const useAnalyticsData = ({
  userId,
  organizationId,
  dateRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  },
  filters = {},
  realTimeEnabled = false,
  refreshInterval = DEFAULT_REFRESH_INTERVAL,
  cacheConfig = DEFAULT_CACHE_CONFIG,
}: UseAnalyticsDataProps): UseAnalyticsDataReturn => {
  // State management
  const [state, setState] = useState<AnalyticsDataState>({
    revenue: null,
    bookingFunnel: null,
    clientSatisfaction: null,
    marketPosition: null,
    performanceKPIs: null,
    mobileMetrics: [],
    seasonalPatterns: [],
    venuePatterns: [],
    servicePatterns: [],
    geographicPatterns: [],
    weddingTimeline: null,
    lastUpdated: new Date(),
    isLoading: true,
    error: null,
    isConnected: false,
    refreshCount: 0,
  });

  const [currentFilters, setCurrentFilters] =
    useState<AnalyticsFilters>(filters);
  const [currentDateRange, setCurrentDateRange] =
    useState<DateRange>(dateRange);
  const [realtimeEnabled, setRealtimeEnabled] =
    useState<boolean>(realTimeEnabled);

  // Refs for cleanup and optimization
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // React Query client for cache management
  const queryClient = useQueryClient();

  // Revenue data query
  const {
    data: revenueData,
    isLoading: revenueLoading,
    error: revenueError,
    refetch: refetchRevenue,
  } = useQuery({
    queryKey: QUERY_KEYS.revenue(userId, currentDateRange),
    queryFn: () => generateMockRevenueData(currentDateRange),
    staleTime: cacheConfig.staleTime,
    gcTime: cacheConfig.ttl,
    enabled: !!userId,
  });

  // Booking funnel data query
  const {
    data: bookingFunnelData,
    isLoading: bookingFunnelLoading,
    error: bookingFunnelError,
    refetch: refetchBookingFunnel,
  } = useQuery({
    queryKey: QUERY_KEYS.bookingFunnel(userId, currentFilters),
    queryFn: () => generateMockBookingFunnelData(),
    staleTime: cacheConfig.staleTime,
    gcTime: cacheConfig.ttl,
    enabled: !!userId,
  });

  // Client satisfaction data query
  const {
    data: clientSatisfactionData,
    isLoading: clientSatisfactionLoading,
    error: clientSatisfactionError,
    refetch: refetchClientSatisfaction,
  } = useQuery({
    queryKey: QUERY_KEYS.clientSatisfaction(userId),
    queryFn: async (): Promise<ClientSatisfactionData> => ({
      overallScore: 4.7,
      npsScore: 68,
      responseRate: 0.84,
      totalResponses: 247,
      satisfactionTrend: 'improving',
      categoryScores: [
        {
          category: 'Communication',
          score: 4.8,
          responses: 247,
          trend: 'stable',
        },
        { category: 'Quality', score: 4.9, responses: 247, trend: 'improving' },
        {
          category: 'Timeliness',
          score: 4.5,
          responses: 247,
          trend: 'improving',
        },
        { category: 'Value', score: 4.4, responses: 247, trend: 'stable' },
        {
          category: 'Professionalism',
          score: 4.8,
          responses: 247,
          trend: 'stable',
        },
      ],
      sentimentAnalysis: {
        positive: 0.78,
        neutral: 0.18,
        negative: 0.04,
        topThemes: [
          'Amazing photos',
          'Professional service',
          'Great communication',
          'Exceeded expectations',
        ],
      },
      detractorAnalysis: {
        count: 8,
        mainIssues: [
          'Delayed delivery',
          'Communication gaps',
          'Limited revision rounds',
        ],
        resolution: {
          resolved: 6,
          pending: 2,
          resolutionRate: 0.75,
        },
      },
    }),
    staleTime: cacheConfig.staleTime,
    gcTime: cacheConfig.ttl,
    enabled: !!userId,
  });

  // Market position data query
  const {
    data: marketPositionData,
    isLoading: marketPositionLoading,
    error: marketPositionError,
    refetch: refetchMarketPosition,
  } = useQuery({
    queryKey: QUERY_KEYS.marketPosition(userId),
    queryFn: async (): Promise<MarketPositionData> => ({
      marketRank: 3,
      marketShare: 12.8,
      competitorCount: 47,
      competitiveAdvantages: [
        'Premium quality photography',
        'Same-day preview delivery',
        'Comprehensive wedding planning integration',
      ],
      threats: [
        'New low-cost competitors entering market',
        'Economic downturn affecting luxury spending',
      ],
      opportunities: [
        'Expand into destination weddings',
        'Launch photography workshops',
        'Partner with high-end venues',
      ],
      competitorAnalysis: [
        {
          competitor: 'Elite Wedding Photography',
          marketShare: 18.5,
          strengths: ['Established brand', 'Celebrity clientele'],
          weaknesses: ['Higher pricing', 'Limited availability'],
          pricing: 'Premium',
          clientSatisfaction: 4.6,
        },
        {
          competitor: 'Modern Moments Studio',
          marketShare: 15.2,
          strengths: ['Social media presence', 'Modern style'],
          weaknesses: ['Inconsistent quality', 'Limited experience'],
          pricing: 'Mid-range',
          clientSatisfaction: 4.3,
        },
      ],
      swotAnalysis: {
        strengths: ['Quality', 'Technology integration', 'Client service'],
        weaknesses: ['Limited brand awareness', 'Higher pricing'],
        opportunities: ['Market expansion', 'Service diversification'],
        threats: ['Economic factors', 'Competition increase'],
      },
    }),
    staleTime: cacheConfig.staleTime,
    gcTime: cacheConfig.ttl,
    enabled: !!userId,
  });

  // Performance KPI data query
  const {
    data: performanceKPIData,
    isLoading: performanceKPILoading,
    error: performanceKPIError,
    refetch: refetchPerformanceKPIs,
  } = useQuery({
    queryKey: QUERY_KEYS.performanceKPIs(userId),
    queryFn: async (): Promise<PerformanceKPIData> => ({
      kpis: [
        {
          id: 'booking-rate',
          name: 'Booking Conversion Rate',
          value: 38.9,
          target: 45,
          unit: '%',
          trend: 'up',
          change: 5.2,
          benchmark: 35,
          status: 'warning',
          category: 'conversion',
        },
        {
          id: 'client-satisfaction',
          name: 'Client Satisfaction',
          value: 4.7,
          target: 4.8,
          unit: '/5',
          trend: 'up',
          change: 0.1,
          benchmark: 4.5,
          status: 'good',
          category: 'satisfaction',
        },
        {
          id: 'response-time',
          name: 'Response Time',
          value: 4.2,
          target: 4,
          unit: 'hrs',
          trend: 'down',
          change: -0.8,
          benchmark: 6,
          status: 'excellent',
          category: 'efficiency',
        },
        {
          id: 'revenue-per-wedding',
          name: 'Revenue per Wedding',
          value: 2850,
          target: 3000,
          unit: '£',
          trend: 'up',
          change: 150,
          benchmark: 2500,
          status: 'warning',
          category: 'revenue',
        },
      ],
      performanceScore: 78,
      trends: {
        overall: 'improving',
        categories: {
          conversion: 'stable',
          satisfaction: 'improving',
          efficiency: 'excellent',
          revenue: 'improving',
        },
      },
      alerts: [
        {
          kpiId: 'booking-rate',
          severity: 'medium',
          message: 'Booking rate below target for 3 consecutive weeks',
          actionRequired: true,
        },
      ],
      insights: [
        'Response time improvements correlating with higher satisfaction',
        'Revenue per wedding trending upward with premium service adoption',
        'Booking conversion opportunities in initial consultation stage',
      ],
    }),
    staleTime: cacheConfig.staleTime,
    gcTime: cacheConfig.ttl,
    enabled: !!userId,
  });

  // Combine loading states
  const isLoading = useMemo(() => {
    return (
      revenueLoading ||
      bookingFunnelLoading ||
      clientSatisfactionLoading ||
      marketPositionLoading ||
      performanceKPILoading
    );
  }, [
    revenueLoading,
    bookingFunnelLoading,
    clientSatisfactionLoading,
    marketPositionLoading,
    performanceKPILoading,
  ]);

  // Combine errors
  const combinedError = useMemo((): AnalyticsError | null => {
    const errors = [
      revenueError,
      bookingFunnelError,
      clientSatisfactionError,
      marketPositionError,
      performanceKPIError,
    ].filter(Boolean);

    if (errors.length === 0) return null;

    return {
      code: 'FETCH_ERROR',
      message: `Failed to fetch analytics data: ${errors.length} error(s)`,
      details: errors.map((e) => (e as Error).message),
      timestamp: new Date(),
      recoverable: true,
    };
  }, [
    revenueError,
    bookingFunnelError,
    clientSatisfactionError,
    marketPositionError,
    performanceKPIError,
  ]);

  // Update state when data changes
  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      revenue: revenueData || prevState.revenue,
      bookingFunnel: bookingFunnelData || prevState.bookingFunnel,
      clientSatisfaction:
        clientSatisfactionData || prevState.clientSatisfaction,
      marketPosition: marketPositionData || prevState.marketPosition,
      performanceKPIs: performanceKPIData || prevState.performanceKPIs,
      isLoading,
      error: combinedError,
      lastUpdated: new Date(),
    }));
  }, [
    revenueData,
    bookingFunnelData,
    clientSatisfactionData,
    marketPositionData,
    performanceKPIData,
    isLoading,
    combinedError,
  ]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!realtimeEnabled || !userId) return;

    const setupRealtime = async () => {
      try {
        const channel = supabase
          .channel(`analytics-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'analytics_events',
              filter: `organization_id=eq.${organizationId}`,
            },
            (payload) => {
              // Handle real-time updates
              handleRealtimeUpdate(payload);
            },
          )
          .subscribe((status) => {
            setState((prev) => ({
              ...prev,
              isConnected: status === 'SUBSCRIBED',
            }));
          });

        realtimeChannelRef.current = channel;
      } catch (error) {
        console.error('Failed to setup realtime connection:', error);
        setState((prev) => ({
          ...prev,
          error: {
            code: 'REALTIME_ERROR',
            message: 'Failed to establish real-time connection',
            details: [(error as Error).message],
            timestamp: new Date(),
            recoverable: true,
          },
        }));
      }
    };

    setupRealtime();

    return () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
        realtimeChannelRef.current = null;
      }
    };
  }, [realtimeEnabled, userId, organizationId]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback(
    (payload: any) => {
      // Invalidate relevant queries based on the update type
      const updateType = payload.eventType;

      switch (updateType) {
        case 'revenue_update':
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.revenue(userId, currentDateRange),
          });
          break;
        case 'booking_update':
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.bookingFunnel(userId, currentFilters),
          });
          break;
        case 'satisfaction_update':
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.clientSatisfaction(userId),
          });
          break;
        default:
          // Invalidate all queries for unknown update types
          queryClient.invalidateQueries();
      }

      setState((prev) => ({
        ...prev,
        refreshCount: prev.refreshCount + 1,
        lastUpdated: new Date(),
      }));
    },
    [userId, currentDateRange, currentFilters, queryClient],
  );

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        refreshData();
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [refreshInterval]);

  // Actions
  const refreshData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      await Promise.all([
        refetchRevenue(),
        refetchBookingFunnel(),
        refetchClientSatisfaction(),
        refetchMarketPosition(),
        refetchPerformanceKPIs(),
      ]);

      setState((prev) => ({
        ...prev,
        refreshCount: prev.refreshCount + 1,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: {
          code: 'REFRESH_ERROR',
          message: 'Failed to refresh analytics data',
          details: [(error as Error).message],
          timestamp: new Date(),
          recoverable: true,
        },
      }));
    }
  }, [
    refetchRevenue,
    refetchBookingFunnel,
    refetchClientSatisfaction,
    refetchMarketPosition,
    refetchPerformanceKPIs,
  ]);

  const refreshSpecificData = useCallback(
    async (dataType: keyof AnalyticsDataState) => {
      const refetchMap = {
        revenue: refetchRevenue,
        bookingFunnel: refetchBookingFunnel,
        clientSatisfaction: refetchClientSatisfaction,
        marketPosition: refetchMarketPosition,
        performanceKPIs: refetchPerformanceKPIs,
      } as const;

      const refetchFn = refetchMap[dataType as keyof typeof refetchMap];
      if (refetchFn) {
        await refetchFn();
      }
    },
    [
      refetchRevenue,
      refetchBookingFunnel,
      refetchClientSatisfaction,
      refetchMarketPosition,
      refetchPerformanceKPIs,
    ],
  );

  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setCurrentFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const updateDateRange = useCallback((newDateRange: DateRange) => {
    setCurrentDateRange(newDateRange);
  }, []);

  const enableRealTime = useCallback(() => {
    setRealtimeEnabled(true);
  }, []);

  const disableRealTime = useCallback(() => {
    setRealtimeEnabled(false);
  }, []);

  const clearCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  const invalidateCache = useCallback(
    (dataType?: keyof AnalyticsDataState) => {
      if (dataType) {
        const queryKeyMap = {
          revenue: QUERY_KEYS.revenue(userId, currentDateRange),
          bookingFunnel: QUERY_KEYS.bookingFunnel(userId, currentFilters),
          clientSatisfaction: QUERY_KEYS.clientSatisfaction(userId),
          marketPosition: QUERY_KEYS.marketPosition(userId),
          performanceKPIs: QUERY_KEYS.performanceKPIs(userId),
        } as const;

        const queryKey = queryKeyMap[dataType as keyof typeof queryKeyMap];
        if (queryKey) {
          queryClient.invalidateQueries({ queryKey });
        }
      } else {
        queryClient.invalidateQueries();
      }
    },
    [userId, currentDateRange, currentFilters, queryClient],
  );

  const exportData = useCallback(
    async (
      format: 'json' | 'csv' | 'excel',
      dataTypes?: (keyof AnalyticsDataState)[],
    ) => {
      // Implementation would depend on export library
      console.log(
        `Exporting data in ${format} format:`,
        dataTypes || 'all data types',
      );
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    ...state,

    // Actions
    refreshData,
    refreshSpecificData,
    updateFilters,
    updateDateRange,
    enableRealTime,
    disableRealTime,
    clearCache,
    invalidateCache,
    exportData,
  };
};

export default useAnalyticsData;
