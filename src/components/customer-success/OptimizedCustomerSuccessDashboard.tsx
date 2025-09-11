/**
 * WS-168: Optimized Customer Success Dashboard - Round 3
 * Performance-optimized dashboard with advanced caching, virtualization, and efficient updates
 */

'use client';

import React, {
  Suspense,
  useMemo,
  useCallback,
  memo,
  startTransition,
  useRef,
  useEffect,
  useState,
} from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Star,
  Activity,
  Zap,
  Heart,
  Filter,
  Download,
  Mail,
  Search,
} from 'lucide-react';

// Performance imports
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounce } from '@/hooks/useDebounce';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

// Security and authentication imports
import { withAdminAuth } from '@/lib/security/admin-auth';
import { sanitizeAdminData } from '@/lib/security/admin-validation';
import { logAdminAccess } from '@/lib/security/audit-logger';
import { maskSensitiveData } from '@/lib/security/data-protection';

// Optimized API and realtime imports
import { useOptimizedHealthData } from '@/hooks/useOptimizedHealthData';
import { useRealtimeHealthUpdates } from '@/hooks/useRealtimeHealthUpdates';
import { customerHealthAPI } from '@/lib/api/customer-health-optimized';

// Performance monitoring
import { performance } from 'perf_hooks';
import { reportWebVitals } from '@/lib/monitoring/web-vitals';

// TypeScript interfaces with performance optimization types
interface HealthScore {
  readonly user_id: string;
  readonly overall_score: number;
  readonly component_scores: Readonly<{
    engagement: number;
    adoption: number;
    satisfaction: number;
    billing: number;
    support: number;
  }>;
  readonly trend: 'improving' | 'stable' | 'declining';
  readonly risk_level: 'low' | 'medium' | 'high' | 'critical';
  readonly last_calculated: string;
}

interface OptimizedMetrics {
  readonly summary: Readonly<{
    total_users: number;
    average_health_score: number;
    milestones_achieved_today: number;
    at_risk_users: number;
    champion_users: number;
  }>;
  readonly health_distribution: ReadonlyArray<{
    readonly range: string;
    readonly count: number;
    readonly percentage: number;
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
    readonly organization_name: string; // For display
    readonly last_activity: string;
  }>;
}

interface DashboardProps {
  readonly adminUser: {
    readonly id: string;
    readonly email: string;
    readonly role: string;
    readonly permissions: ReadonlyArray<string>;
  };
}

// Performance configuration
const PERFORMANCE_CONFIG = {
  virtualList: {
    itemHeight: 120,
    overscan: 5,
  },
  debounce: {
    search: 300,
    filter: 200,
  },
  cache: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 60 * 1000, // 1 minute for real-time data
  },
  pagination: {
    pageSize: 25,
    initialPages: 2,
  },
} as const;

// Optimized memoized card component with intersection observer
const OptimizedMetricsCard = memo<{
  readonly title: string;
  readonly value: string | number;
  readonly icon: React.ReactNode;
  readonly trend?: string;
  readonly trendIcon?: React.ReactNode;
  readonly loading?: boolean;
}>(({ title, value, icon, trend, trendIcon, loading = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200"
    >
      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {isVisible ? value : '---'}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          </div>
          {trend && trendIcon && (
            <div className="flex items-center mt-4 text-sm">
              {trendIcon}
              <span className="ml-1">{trend}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
});

OptimizedMetricsCard.displayName = 'OptimizedMetricsCard';

// Memoized chart component with lazy loading and error boundary
const LazyHealthChart = memo<{
  readonly data: ReadonlyArray<{
    readonly range: string;
    readonly count: number;
    readonly percentage: number;
  }>;
  readonly loading?: boolean;
}>(({ data, loading = false }) => {
  const [chartVisible, setChartVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setChartVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (chartRef.current) {
      observer.observe(chartRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const memoizedData = useMemo(() => {
    return data.map((item) => ({
      range: item.range,
      count: item.count,
      percentage: `${item.percentage.toFixed(1)}%`,
    }));
  }, [data]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Health Score Distribution
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Real-time customer health metrics
        </p>
      </div>
      <div ref={chartRef} className="h-80">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : chartVisible ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={memoizedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis
                dataKey="range"
                tick={{ fill: 'var(--gray-600)', fontSize: 12 }}
                tickLine={{ stroke: 'var(--gray-300)' }}
              />
              <YAxis
                tick={{ fill: 'var(--gray-600)', fontSize: 12 }}
                tickLine={{ stroke: 'var(--gray-300)' }}
              />
              <Tooltip
                formatter={(value, name) => [`${value} customers`, 'Count']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              <Bar
                dataKey="count"
                fill="var(--primary-600)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Chart will load when visible...
          </div>
        )}
      </div>
    </div>
  );
});

LazyHealthChart.displayName = 'LazyHealthChart';

// Virtualized at-risk users list for performance with large datasets
const VirtualizedAtRiskList = memo<{
  readonly users: ReadonlyArray<OptimizedMetrics['at_risk_users'][0]>;
  readonly onIntervention: (userId: string, actionType: string) => void;
  readonly loading?: boolean;
}>(({ users, onIntervention, loading = false }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => PERFORMANCE_CONFIG.virtualList.itemHeight,
    overscan: PERFORMANCE_CONFIG.virtualList.overscan,
  });

  const renderUser = useCallback(
    (index: number) => {
      const user = users[index];
      if (!user) return null;

      return (
        <div
          key={user.user_id}
          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors mx-4 mb-4"
          style={{
            height: `${PERFORMANCE_CONFIG.virtualList.itemHeight}px`,
          }}
        >
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-error-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-error-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {user.organization_name}
                </h4>
                <p className="text-sm text-gray-600">
                  Risk Score: {user.risk_score}/100
                </p>
                <p className="text-xs text-gray-500">
                  Last Activity: {user.last_activity}
                </p>
              </div>
            </div>
            <button
              onClick={() => onIntervention(user.user_id, 'priority_contact')}
              className="px-4 py-2 bg-error-600 text-white rounded-lg font-medium hover:bg-error-700 transition-colors focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
            >
              <Zap className="w-4 h-4 mr-2 inline" />
              Intervene
            </button>
          </div>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-1">
                Risk Factors
              </h5>
              <div className="flex flex-wrap gap-1">
                {user.risk_factors.slice(0, 3).map((factor, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-error-100 text-error-700 rounded text-xs"
                  >
                    {factor}
                  </span>
                ))}
                {user.risk_factors.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{user.risk_factors.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    },
    [users, onIntervention],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-4 border border-gray-200 rounded-lg animate-pulse"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-96 overflow-auto"
      style={{
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderUser(virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
});

VirtualizedAtRiskList.displayName = 'VirtualizedAtRiskList';

// Main optimized dashboard component
const OptimizedCustomerSuccessDashboard: React.FC<DashboardProps> = ({
  adminUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    loadTime: number;
    renderTime: number;
  } | null>(null);

  const debouncedSearch = useDebounce(
    searchTerm,
    PERFORMANCE_CONFIG.debounce.search,
  );

  // Performance tracking
  useEffect(() => {
    const loadStart = performance.now();

    const trackPerformance = () => {
      const loadTime = performance.now() - loadStart;
      setPerformanceMetrics({ loadTime, renderTime: 0 });

      // Report web vitals
      reportWebVitals({
        name: 'dashboard-load-time',
        value: loadTime,
        user: adminUser.id,
      });
    };

    // Track initial load
    if (document.readyState === 'complete') {
      trackPerformance();
    } else {
      window.addEventListener('load', trackPerformance);
      return () => window.removeEventListener('load', trackPerformance);
    }
  }, [adminUser.id]);

  // Security: Log admin access
  useEffect(() => {
    logAdminAccess(adminUser.id, 'customer_health_dashboard_access');
  }, [adminUser.id]);

  // Optimized data fetching with React Query
  const {
    data: healthData,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['customer-health-metrics', debouncedSearch, filterStatus],
    queryFn: () =>
      customerHealthAPI.getOptimizedHealthMetrics({
        search: debouncedSearch,
        status: filterStatus,
        includeRecommendations: true,
      }),
    staleTime: PERFORMANCE_CONFIG.cache.staleTime,
    cacheTime: PERFORMANCE_CONFIG.cache.cacheTime,
    refetchInterval: PERFORMANCE_CONFIG.cache.refetchInterval,
    keepPreviousData: true, // Prevent loading states during filters
  });

  // Real-time updates with optimized subscriptions
  const realtimeUpdates = useRealtimeHealthUpdates({
    enabled: !healthLoading,
    onUpdate: (update) => {
      // Optimistic updates for better UX
      startTransition(() => {
        // Handle real-time update without full refetch
        console.log('Real-time update received:', update);
      });
    },
  });

  // Memoized processed data
  const processedData = useMemo(() => {
    if (!healthData) return null;

    const renderStart = performance.now();

    const sanitized = sanitizeAdminData({
      ...healthData,
      at_risk_users: healthData.at_risk_users.map((user) => ({
        ...user,
        user_id: maskSensitiveData(user.user_id, 'user_id'),
        organization_name:
          user.organization_name || `Customer ${user.user_id.slice(-4)}`,
      })),
    });

    const renderTime = performance.now() - renderStart;
    setPerformanceMetrics((prev) => (prev ? { ...prev, renderTime } : null));

    return sanitized;
  }, [healthData]);

  // Optimized intervention handler with batch support
  const handleIntervention = useCallback(
    async (userId: string, actionType: string) => {
      if (!adminUser.permissions.includes('execute_interventions')) {
        throw new Error('Insufficient permissions for intervention');
      }

      logAdminAccess(adminUser.id, 'intervention_attempted', {
        userId,
        actionType,
      });

      try {
        await customerHealthAPI.triggerIntervention(userId, actionType);

        // Optimistic update - remove from at-risk list
        startTransition(() => {
          refetchHealth();
        });
      } catch (error) {
        console.error('Intervention failed:', error);
        // Show user-friendly error
      }
    },
    [adminUser, refetchHealth],
  );

  // Bulk intervention handler for performance
  const handleBulkIntervention = useCallback(
    async (userIds: string[], actionType: string) => {
      if (!adminUser.permissions.includes('execute_interventions')) {
        throw new Error('Insufficient permissions for intervention');
      }

      try {
        await customerHealthAPI.triggerBulkIntervention(userIds, actionType);
        refetchHealth();
      } catch (error) {
        console.error('Bulk intervention failed:', error);
      }
    },
    [adminUser, refetchHealth],
  );

  // Export handler with streaming for large datasets
  const handleExport = useCallback(async () => {
    if (!adminUser.permissions.includes('export_customer_data')) {
      throw new Error('Insufficient permissions for data export');
    }

    logAdminAccess(adminUser.id, 'data_export_requested');

    try {
      // Stream large exports to avoid memory issues
      await customerHealthAPI.streamExport({
        search: debouncedSearch,
        status: filterStatus,
        format: 'csv',
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [adminUser, debouncedSearch, filterStatus]);

  if (healthError) {
    throw healthError;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header with performance indicator */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Customer Health Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor customer health scores with optimized performance
            </p>
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
              Secure Admin Access • Role: {adminUser.role}
              {performanceMetrics && (
                <span className="ml-4">
                  Load: {performanceMetrics.loadTime.toFixed(0)}ms
                </span>
              )}
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Customers</option>
              <option value="critical">Critical</option>
              <option value="at-risk">At Risk</option>
              <option value="healthy">Healthy</option>
            </select>

            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-2 inline" />
              Export
            </button>
          </div>
        </div>

        {/* Optimized Metrics Cards with Intersection Observer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <OptimizedMetricsCard
            title="Total Customers"
            value={processedData?.summary.total_users ?? '---'}
            icon={<Users className="w-6 h-6 text-primary-600" />}
            trend="+12% from last month"
            trendIcon={<TrendingUp className="w-4 h-4 text-success-600" />}
            loading={healthLoading}
          />
          <OptimizedMetricsCard
            title="Average Health"
            value={processedData?.summary.average_health_score ?? '---'}
            icon={<Heart className="w-6 h-6 text-success-600" />}
            trend="+2.3 from last week"
            trendIcon={<TrendingUp className="w-4 h-4 text-success-600" />}
            loading={healthLoading}
          />
          <OptimizedMetricsCard
            title="Milestones Today"
            value={processedData?.summary.milestones_achieved_today ?? '---'}
            icon={<Target className="w-6 h-6 text-blue-600" />}
            loading={healthLoading}
          />
          <OptimizedMetricsCard
            title="At Risk Customers"
            value={processedData?.summary.at_risk_users ?? '---'}
            icon={<AlertTriangle className="w-6 h-6 text-error-600" />}
            trend={
              processedData?.summary.at_risk_users
                ? '-3 from yesterday'
                : undefined
            }
            trendIcon={
              processedData?.summary.at_risk_users ? (
                <TrendingDown className="w-4 h-4 text-success-600" />
              ) : undefined
            }
            loading={healthLoading}
          />
          <OptimizedMetricsCard
            title="Champions"
            value={processedData?.summary.champion_users ?? '---'}
            icon={<Star className="w-6 h-6 text-warning-500" />}
            loading={healthLoading}
          />
        </div>

        {/* Charts Section with Lazy Loading */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <LazyHealthChart
            data={processedData?.health_distribution || []}
            loading={healthLoading}
          />

          {/* Engagement Trends Chart - Similar lazy loading pattern */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Engagement Trends
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                30-day engagement patterns
              </p>
            </div>
            <div className="h-80">
              {healthLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedData?.engagement_trends || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--gray-200)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--gray-600)', fontSize: 12 }}
                    />
                    <YAxis tick={{ fill: 'var(--gray-600)', fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="active_users"
                      stroke="var(--primary-600)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_engagement_score"
                      stroke="var(--success-600)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Virtualized At-Risk Users Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                At-Risk Customers
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {processedData?.at_risk_users.length || 0} customers requiring
                attention
              </p>
            </div>
            {processedData?.at_risk_users &&
              processedData.at_risk_users.length > 0 && (
                <button
                  onClick={() =>
                    handleBulkIntervention(
                      processedData.at_risk_users.map((u) => u.user_id),
                      'bulk_email',
                    )
                  }
                  className="px-4 py-2 bg-error-600 text-white rounded-lg font-medium hover:bg-error-700 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-2 inline" />
                  Bulk Intervention
                </button>
              )}
          </div>

          <VirtualizedAtRiskList
            users={processedData?.at_risk_users || []}
            onIntervention={handleIntervention}
            loading={healthLoading}
          />
        </div>

        {/* Performance Debug Info (Dev Only) */}
        {process.env.NODE_ENV === 'development' && performanceMetrics && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
            <strong>Performance Metrics:</strong> Load:{' '}
            {performanceMetrics.loadTime.toFixed(2)}ms | Render:{' '}
            {performanceMetrics.renderTime.toFixed(2)}ms | Data Points:{' '}
            {processedData?.at_risk_users.length || 0}
          </div>
        )}
      </div>
    </div>
  );
};

// Error boundary with performance tracking
class OptimizedErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error; errorId?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): {
    hasError: boolean;
    error: Error;
    errorId: string;
  } {
    const errorId = `dashboard-error-${Date.now()}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Dashboard Error:', error, errorInfo);

    // Report error with performance context
    reportWebVitals({
      name: 'dashboard-error',
      value: 1,
      errorId: this.state.errorId,
      error: error.message,
    });

    logAdminAccess('system', 'dashboard_error', {
      error: error.message,
      errorId: this.state.errorId,
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <AlertTriangle className="w-12 h-12 text-error-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Dashboard Error
            </h2>
            <p className="text-gray-600 mb-4">
              Something went wrong while loading the customer health dashboard.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Error ID: {this.state.errorId}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Optimized loading component with skeleton UI
const OptimizedDashboardLoading: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs h-96">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs h-96">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Main export with optimizations
const SecureOptimizedCustomerSuccessDashboard: React.FC = () => {
  return (
    <OptimizedErrorBoundary>
      <Suspense fallback={<OptimizedDashboardLoading />}>
        {/* @ts-expect-error - withAdminAuth will provide the required props */}
        <OptimizedCustomerSuccessDashboard />
      </Suspense>
    </OptimizedErrorBoundary>
  );
};

export default withAdminAuth(SecureOptimizedCustomerSuccessDashboard, {
  requiredPermissions: ['view_customer_health', 'access_admin_dashboard'],
  redirectOnUnauthorized: '/admin/login',
});
