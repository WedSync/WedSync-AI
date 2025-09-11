'use client';

import React, { useMemo } from 'react';
import {
  Activity,
  Users,
  Eye,
  MessageSquare,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic imports for chart components
const ResponsiveContainer = dynamic(
  () =>
    import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false },
);
const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false },
);
const Line = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Line })),
  { ssr: false },
);
const AreaChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.AreaChart })),
  { ssr: false },
);
const Area = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Area })),
  { ssr: false },
);
const BarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false },
);
const Bar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Bar })),
  { ssr: false },
);
const PieChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PieChart })),
  { ssr: false },
);
const Pie = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Pie })),
  { ssr: false },
);
const Cell = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Cell })),
  { ssr: false },
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.XAxis })),
  { ssr: false },
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.YAxis })),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.CartesianGrid })),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Tooltip })),
  { ssr: false },
);
const Legend = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Legend })),
  { ssr: false },
);

interface OverviewData {
  summary: {
    totalPortalUsers: number;
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    portalAdoptionRate: number;
    clientSatisfactionScore: number;
  };
  trends: Array<{
    date: string;
    activeUsers: number;
    sessions: number;
    pageViews: number;
    engagementScore: number;
  }>;
  topMetrics: {
    mostUsedFeatures: Array<{
      feature: string;
      usage: number;
      growth: number;
    }>;
    clientEngagementLevels: {
      high: number;
      medium: number;
      low: number;
    };
    deviceBreakdown: {
      mobile: number;
      desktop: number;
      tablet: number;
    };
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    count: number;
  }>;
  quickStats: {
    newClientsToday: number;
    messagesExchanged: number;
    documentsDownloaded: number;
    tasksCompleted: number;
  };
}

interface AnalyticsOverviewProps {
  data: {
    engagement: any;
    features: any;
    communication: any;
    journey: any;
    overview?: OverviewData;
  };
  timeRange: string;
  onExport?: (section: string) => void;
}

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

const MetricCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<any>;
  color?: string;
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        {change && trend && (
          <div
            className={`flex items-center space-x-1 text-sm font-medium ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {trend === 'up' && <TrendingUp className="w-4 h-4" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4" />}
            <span>{change}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export function AnalyticsOverview({
  data,
  timeRange,
  onExport,
}: AnalyticsOverviewProps) {
  // Create mock overview data if not provided
  const overviewData: OverviewData = useMemo(() => {
    if (data.overview) return data.overview;

    // Generate mock data based on existing analytics data
    return {
      summary: {
        totalPortalUsers: 1248,
        activeUsers: 892,
        totalSessions: 3456,
        averageSessionDuration: 420, // seconds
        portalAdoptionRate: 78.5,
        clientSatisfactionScore: 8.4,
      },
      trends: [
        {
          date: '2025-01-01',
          activeUsers: 245,
          sessions: 456,
          pageViews: 1234,
          engagementScore: 7.8,
        },
        {
          date: '2025-01-02',
          activeUsers: 267,
          sessions: 489,
          pageViews: 1356,
          engagementScore: 8.1,
        },
        {
          date: '2025-01-03',
          activeUsers: 289,
          sessions: 523,
          pageViews: 1478,
          engagementScore: 8.3,
        },
        {
          date: '2025-01-04',
          activeUsers: 312,
          sessions: 567,
          pageViews: 1589,
          engagementScore: 8.0,
        },
        {
          date: '2025-01-05',
          activeUsers: 298,
          sessions: 534,
          pageViews: 1445,
          engagementScore: 8.2,
        },
        {
          date: '2025-01-06',
          activeUsers: 324,
          sessions: 589,
          pageViews: 1678,
          engagementScore: 8.5,
        },
        {
          date: '2025-01-07',
          activeUsers: 341,
          sessions: 612,
          pageViews: 1743,
          engagementScore: 8.7,
        },
      ],
      topMetrics: {
        mostUsedFeatures: [
          { feature: 'Photo Gallery', usage: 1245, growth: 12.5 },
          { feature: 'Timeline View', usage: 987, growth: 8.3 },
          { feature: 'Task Checklist', usage: 756, growth: 15.7 },
          { feature: 'Messaging', usage: 654, growth: 22.1 },
          { feature: 'Document Library', usage: 432, growth: 5.2 },
        ],
        clientEngagementLevels: {
          high: 425,
          medium: 623,
          low: 200,
        },
        deviceBreakdown: {
          mobile: 65.4,
          desktop: 28.2,
          tablet: 6.4,
        },
      },
      alerts: [
        {
          id: '1',
          type: 'warning',
          message: 'Mobile engagement dropped 5%',
          count: 1,
        },
        {
          id: '2',
          type: 'info',
          message: 'New feature adoption rate exceeds target',
          count: 1,
        },
        {
          id: '3',
          type: 'error',
          message: 'High dropoff in vendor selection',
          count: 2,
        },
      ],
      quickStats: {
        newClientsToday: 23,
        messagesExchanged: 156,
        documentsDownloaded: 89,
        tasksCompleted: 234,
      },
    };
  }, [data.overview]);

  const chartData = useMemo(() => {
    return overviewData.trends.map((trend) => ({
      ...trend,
      date: new Date(trend.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [overviewData.trends]);

  const deviceData = useMemo(
    () => [
      {
        name: 'Mobile',
        value: overviewData.topMetrics.deviceBreakdown.mobile,
        color: COLORS[0],
      },
      {
        name: 'Desktop',
        value: overviewData.topMetrics.deviceBreakdown.desktop,
        color: COLORS[1],
      },
      {
        name: 'Tablet',
        value: overviewData.topMetrics.deviceBreakdown.tablet,
        color: COLORS[2],
      },
    ],
    [overviewData.topMetrics.deviceBreakdown],
  );

  const engagementData = useMemo(
    () => [
      {
        name: 'High',
        value: overviewData.topMetrics.clientEngagementLevels.high,
        color: '#10b981',
      },
      {
        name: 'Medium',
        value: overviewData.topMetrics.clientEngagementLevels.medium,
        color: '#f59e0b',
      },
      {
        name: 'Low',
        value: overviewData.topMetrics.clientEngagementLevels.low,
        color: '#ef4444',
      },
    ],
    [overviewData.topMetrics.clientEngagementLevels],
  );

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6" data-testid="analytics-overview">
      {/* Top-Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Portal Users"
          value={overviewData.summary.totalPortalUsers.toLocaleString()}
          change="+14%"
          trend="up"
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Active Users"
          value={overviewData.summary.activeUsers.toLocaleString()}
          change="+8%"
          trend="up"
          icon={Activity}
          color="green"
        />
        <MetricCard
          title="Portal Adoption"
          value={`${overviewData.summary.portalAdoptionRate}%`}
          change="+3%"
          trend="up"
          icon={CheckCircle}
          color="purple"
        />
        <MetricCard
          title="Satisfaction Score"
          value={`${overviewData.summary.clientSatisfactionScore}/10`}
          change="+0.2"
          trend="up"
          icon={TrendingUp}
          color="yellow"
        />
      </div>

      {/* Quick Stats */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Today's Activity
          </h3>
          {onExport && (
            <button
              onClick={() => onExport('overview')}
              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {overviewData.quickStats.newClientsToday}
            </div>
            <div className="text-sm text-gray-500">New Clients</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {overviewData.quickStats.messagesExchanged}
            </div>
            <div className="text-sm text-gray-500">Messages</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {overviewData.quickStats.documentsDownloaded}
            </div>
            <div className="text-sm text-gray-500">Downloads</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {overviewData.quickStats.tasksCompleted}
            </div>
            <div className="text-sm text-gray-500">Tasks Done</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {overviewData.alerts.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Alerts
          </h3>
          <div className="space-y-3">
            {overviewData.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  alert.type === 'error'
                    ? 'bg-red-50 border-red-200'
                    : alert.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                }`}
              >
                <AlertCircle
                  className={`w-4 h-4 ${
                    alert.type === 'error'
                      ? 'text-red-600'
                      : alert.type === 'warning'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                  }`}
                />
                <span className="text-sm text-gray-900 flex-1">
                  {alert.message}
                </span>
                {alert.count > 1 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {alert.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Portal Usage Trends ({timeRange})
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="activeUsers"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Active Users"
                dot={{ fill: '#3b82f6', strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="#10b981"
                strokeWidth={2}
                name="Sessions"
                dot={{ fill: '#10b981', strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="engagementScore"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Engagement Score"
                dot={{ fill: '#8b5cf6', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Usage and Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Features */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Most Used Features
          </h3>
          <div className="space-y-4">
            {overviewData.topMetrics.mostUsedFeatures.map((feature, index) => (
              <div
                key={feature.feature}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">
                    {feature.feature}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500">
                    {feature.usage.toLocaleString()} uses
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      feature.growth > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {feature.growth > 0 ? '+' : ''}
                    {feature.growth}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Device Usage
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: any) =>
                    `${name} ${value.toFixed(1)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toFixed(1)}%`,
                    'Usage',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Client Engagement Levels */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Client Engagement Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {engagementData.map((level) => (
            <div key={level.name} className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg
                  className="w-24 h-24 transform -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="transition-all duration-300 ease-out"
                    stroke={level.color}
                    strokeWidth="2"
                    strokeDasharray={`${(level.value / 1248) * 100}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">
                    {level.value}
                  </span>
                </div>
              </div>
              <div className="font-medium text-gray-900">
                {level.name} Engagement
              </div>
              <div className="text-sm text-gray-500">
                {((level.value / 1248) * 100).toFixed(1)}% of clients
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Key Insights
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>
                  Mobile usage continues to dominate at 65.4% of all portal
                  sessions
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>
                  Client satisfaction increased by 2.4% since implementing
                  messaging feature
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>
                  Photo Gallery remains the most popular feature with 22.1%
                  growth in usage
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>
                  High engagement clients are 3.2x more likely to recommend your
                  services
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsOverview;
