'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Activity,
  RefreshCw,
  Bell,
  Mail,
  Eye,
  MousePointer,
  FileText,
  Clock,
  DollarSign,
  Target,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { format, subDays } from 'date-fns';
import {
  RealtimeMetricUpdate,
  AggregatedMetrics,
} from '@/lib/analytics/real-time-metrics';

interface EngagementDashboardProps {
  supplierId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface DashboardData {
  summary: {
    averageScore: number;
    scoreChange: number;
    totalClients: number;
    activeClients: number;
    atRiskClients: number;
    ghostClients: number;
    topPerformers: number;
    avgResponseTime: number;
  };
  segments: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  trends: Array<{
    date: string;
    score: number;
    events: number;
    alerts: number;
  }>;
  topClients: Array<{
    id: string;
    name: string;
    score: number;
    change: number;
    lastActivity: string;
  }>;
  atRiskAlerts: Array<{
    id: string;
    clientName: string;
    severity: string;
    message: string;
    daysSinceActivity: number;
  }>;
  activityBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
    icon: React.ReactNode;
  }>;
  performanceMetrics: {
    emailEngagement: number;
    portalActivity: number;
    formCompletion: number;
    meetingAttendance: number;
    paymentOnTime: number;
    overallSatisfaction: number;
  };
}

const SEGMENT_COLORS = {
  champion: '#10B981',
  highly_engaged: '#3B82F6',
  normal: '#6B7280',
  at_risk: '#F59E0B',
  ghost: '#EF4444',
};

const SEVERITY_COLORS = {
  low: '#FCD34D',
  medium: '#FB923C',
  high: '#F87171',
  critical: '#DC2626',
};

export default function EngagementDashboard({
  supplierId,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}: EngagementDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>(
    '7d',
  );
  const [realtimeUpdates, setRealtimeUpdates] = useState<
    RealtimeMetricUpdate[]
  >([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch main dashboard data
      const response = await fetch(
        `/api/analytics/engagement/dashboard?supplierId=${supplierId}&period=${selectedPeriod}`,
      );

      if (!response.ok) throw new Error('Failed to fetch dashboard data');

      const dashboardData = await response.json();

      // Transform data for visualization
      const transformedData: DashboardData = {
        summary: {
          averageScore: dashboardData.metrics.averageEngagementScore,
          scoreChange: dashboardData.metrics.scoreChange || 0,
          totalClients: dashboardData.metrics.totalActiveClients,
          activeClients:
            dashboardData.metrics.totalActiveClients -
            dashboardData.metrics.atRiskClients -
            dashboardData.metrics.ghostClients,
          atRiskClients: dashboardData.metrics.atRiskClients,
          ghostClients: dashboardData.metrics.ghostClients,
          topPerformers: dashboardData.metrics.topEngagedClients,
          avgResponseTime: dashboardData.metrics.avgResponseTime || 24,
        },
        segments: Object.entries(dashboardData.metrics.scoreDistribution).map(
          ([name, value]) => ({
            name:
              name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
            value: value as number,
            color: SEGMENT_COLORS[name as keyof typeof SEGMENT_COLORS],
          }),
        ),
        trends: dashboardData.trends || generateMockTrends(),
        topClients: dashboardData.topClients || [],
        atRiskAlerts: dashboardData.alerts || [],
        activityBreakdown: generateActivityBreakdown(
          dashboardData.activityStats,
        ),
        performanceMetrics: dashboardData.performanceMetrics || {
          emailEngagement: 75,
          portalActivity: 60,
          formCompletion: 80,
          meetingAttendance: 90,
          paymentOnTime: 95,
          overallSatisfaction: 85,
        },
      };

      setData(transformedData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load engagement metrics');
    } finally {
      setLoading(false);
    }
  }, [supplierId, selectedPeriod]);

  // Generate mock trends for demo
  const generateMockTrends = () => {
    const trends = [];
    for (let i = 29; i >= 0; i--) {
      trends.push({
        date: format(subDays(new Date(), i), 'MMM dd'),
        score: Math.floor(Math.random() * 30) + 60,
        events: Math.floor(Math.random() * 100) + 50,
        alerts: Math.floor(Math.random() * 5),
      });
    }
    return trends;
  };

  // Generate activity breakdown
  const generateActivityBreakdown = (stats: any) => {
    return [
      {
        type: 'Email Opens',
        count: stats?.emailOpens || 245,
        percentage: 28,
        icon: <Mail className="w-4 h-4" />,
      },
      {
        type: 'Portal Visits',
        count: stats?.portalVisits || 189,
        percentage: 22,
        icon: <Eye className="w-4 h-4" />,
      },
      {
        type: 'Form Submissions',
        count: stats?.formSubmissions || 156,
        percentage: 18,
        icon: <FileText className="w-4 h-4" />,
      },
      {
        type: 'Link Clicks',
        count: stats?.linkClicks || 134,
        percentage: 15,
        icon: <MousePointer className="w-4 h-4" />,
      },
      {
        type: 'Meetings',
        count: stats?.meetings || 89,
        percentage: 10,
        icon: <Clock className="w-4 h-4" />,
      },
      {
        type: 'Payments',
        count: stats?.payments || 67,
        percentage: 7,
        icon: <DollarSign className="w-4 h-4" />,
      },
    ];
  };

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!supplierId) return;

    // Initial fetch
    fetchDashboardData();

    // Setup auto-refresh
    let refreshTimer: NodeJS.Timeout;
    if (autoRefresh) {
      refreshTimer = setInterval(fetchDashboardData, refreshInterval);
    }

    // Setup WebSocket subscription
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}/engagement/${supplierId}`,
    );

    ws.onmessage = (event) => {
      const update: RealtimeMetricUpdate = JSON.parse(event.data);
      setRealtimeUpdates((prev) => [...prev.slice(-19), update]);

      // Update relevant parts of dashboard
      if (update.metricType === 'engagement_score' && update.data.score) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            summary: {
              ...prev.summary,
              averageScore: update.data.score!,
            },
          };
        });
      }
    };

    return () => {
      clearInterval(refreshTimer);
      ws.close();
    };
  }, [supplierId, autoRefresh, refreshInterval, fetchDashboardData]);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-error-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Engagement Metrics Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time engagement tracking and optimization
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Period Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['24h', '7d', '30d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === period
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period === '24h'
                  ? '24 Hours'
                  : period === '7d'
                    ? '7 Days'
                    : '30 Days'}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchDashboardData}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Last Update */}
          <div className="text-sm text-gray-500">
            Updated: {format(lastUpdate, 'HH:mm:ss')}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Average Score"
          value={data.summary.averageScore}
          change={data.summary.scoreChange}
          suffix="/100"
          icon={<Target className="w-5 h-5" />}
          color="primary"
        />
        <SummaryCard
          title="Active Clients"
          value={data.summary.activeClients}
          total={data.summary.totalClients}
          icon={<Users className="w-5 h-5" />}
          color="success"
        />
        <SummaryCard
          title="At Risk"
          value={data.summary.atRiskClients}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="warning"
          showAlert
        />
        <SummaryCard
          title="Response Time"
          value={data.summary.avgResponseTime}
          suffix=" hrs"
          icon={<Clock className="w-5 h-5" />}
          color="info"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Trends */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-xs border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Engagement Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.trends}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9E77ED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9E77ED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#9E77ED"
                strokeWidth={2}
                fill="url(#scoreGradient)"
                name="Engagement Score"
              />
              <Line
                type="monotone"
                dataKey="events"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="Events"
                yAxisId="right"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Segment Distribution */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Client Segments
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.segments}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.segments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {data.segments.map((segment) => (
              <div
                key={segment.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-sm text-gray-600">{segment.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {segment.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Performance Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(data.performanceMetrics).map(([key, value]) => (
            <PerformanceMetric
              key={key}
              label={key.replace(/([A-Z])/g, ' $1').trim()}
              value={value}
              max={100}
            />
          ))}
        </div>
      </div>

      {/* Activity Breakdown & At-Risk Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Breakdown */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Activity Breakdown
          </h3>
          <div className="space-y-3">
            {data.activityBreakdown.map((activity) => (
              <div
                key={activity.type}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
                    {activity.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activity.type}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.count} events
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${activity.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {activity.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* At-Risk Alerts */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              At-Risk Alerts
            </h3>
            <span className="px-2.5 py-1 bg-error-50 text-error-700 text-xs font-medium rounded-full">
              {data.atRiskAlerts.length} Active
            </span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.atRiskAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {alert.clientName}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          alert.severity === 'critical'
                            ? 'bg-error-100 text-error-700'
                            : alert.severity === 'high'
                              ? 'bg-warning-100 text-warning-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.daysSinceActivity} days since last activity
                    </p>
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Bell className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      {realtimeUpdates.length > 0 && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Real-time Activity
            </h3>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-success-500" />
              <span className="text-sm text-gray-500">Live</span>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {realtimeUpdates
              .slice(-5)
              .reverse()
              .map((update, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                  <span className="text-gray-600">
                    {format(new Date(update.timestamp), 'HH:mm:ss')}
                  </span>
                  <span className="text-gray-900">
                    {update.metricType === 'engagement_score' &&
                      `Score updated: ${update.data.score}`}
                    {update.metricType === 'alert' &&
                      `New alert: ${update.data.message}`}
                    {update.metricType === 'activity' &&
                      `Activity: ${update.data.event}`}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  change,
  total,
  suffix = '',
  icon,
  color = 'primary',
  showAlert = false,
}: any) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    info: 'bg-blue-50 text-blue-600',
    error: 'bg-error-50 text-error-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">
          {value}
          {suffix}
        </span>
        {total && <span className="text-sm text-gray-500">/ {total}</span>}
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {change > 0 ? (
            <TrendingUp className="w-4 h-4 text-success-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-error-600" />
          )}
          <span
            className={`text-sm font-medium ${
              change > 0 ? 'text-success-600' : 'text-error-600'
            }`}
          >
            {Math.abs(change)}%
          </span>
        </div>
      )}
      {showAlert && value > 0 && (
        <div className="mt-2 flex items-center gap-1 text-warning-600">
          <AlertTriangle className="w-3 h-3" />
          <span className="text-xs font-medium">Action required</span>
        </div>
      )}
    </div>
  );
}

// Performance Metric Component
function PerformanceMetric({ label, value, max }: any) {
  const percentage = (value / max) * 100;
  const color =
    percentage >= 80
      ? '#10B981'
      : percentage >= 60
        ? '#3B82F6'
        : percentage >= 40
          ? '#F59E0B'
          : '#EF4444';

  return (
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-2">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="#E5E7EB"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${(2 * Math.PI * 28 * percentage) / 100} ${2 * Math.PI * 28}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900">{value}</span>
        </div>
      </div>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-xs border border-gray-200 p-6"
          >
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-xs border border-gray-200 p-6 h-96">
          <div className="h-full bg-gray-200 rounded" />
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 h-96">
          <div className="h-full bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}
