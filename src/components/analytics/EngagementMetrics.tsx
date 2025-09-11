'use client';

import React, { useMemo } from 'react';
import {
  Activity,
  Clock,
  MousePointer,
  Eye,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
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

interface EngagementData {
  dailyStats: Array<{
    date: string;
    activeUsers: number;
    sessions: number;
    pageViews: number;
    avgSessionDuration: number;
  }>;
  summary: {
    totalUsers: number;
    totalSessions: number;
    totalPageViews: number;
    avgSessionDuration: number;
    bounceRate: number;
    returnUserRate: number;
  };
  topPages: Array<{
    page: string;
    views: number;
    avgTime: number;
    exitRate: number;
  }>;
  userSegments: Array<{
    segment: string;
    count: number;
    avgEngagement: number;
  }>;
}

interface EngagementMetricsProps {
  data: EngagementData;
  timeRange: string;
  onExport?: () => void;
}

const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  trend: 'up' | 'down' | 'neutral';
}) => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
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
    </div>
  </div>
);

export function EngagementMetrics({
  data,
  timeRange,
  onExport,
}: EngagementMetricsProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const chartData = useMemo(() => {
    return data.dailyStats.map((stat) => ({
      ...stat,
      date: new Date(stat.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      avgSessionDuration: Math.round(stat.avgSessionDuration / 60), // Convert to minutes
    }));
  }, [data.dailyStats]);

  return (
    <div className="space-y-6" data-testid="engagement-metrics">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Users"
          value={data.summary.totalUsers.toLocaleString()}
          change="+12%"
          icon={Users}
          trend="up"
        />
        <MetricCard
          title="Total Sessions"
          value={data.summary.totalSessions.toLocaleString()}
          change="+8%"
          icon={Activity}
          trend="up"
        />
        <MetricCard
          title="Page Views"
          value={data.summary.totalPageViews.toLocaleString()}
          change="+15%"
          icon={Eye}
          trend="up"
        />
        <MetricCard
          title="Avg. Session Duration"
          value={formatDuration(data.summary.avgSessionDuration)}
          change="-2%"
          icon={Clock}
          trend="down"
        />
      </div>

      {/* Engagement Trends Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Daily Engagement Trends
          </h3>
          {onExport && (
            <button
              onClick={onExport}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Export Data
            </button>
          )}
        </div>

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
                dataKey="pageViews"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Page Views"
                dot={{ fill: '#f59e0b', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Session Duration Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Average Session Duration
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
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
                label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: number) => [
                  `${value} min`,
                  'Session Duration',
                ]}
              />
              <Area
                type="monotone"
                dataKey="avgSessionDuration"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Pages and User Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Most Visited Pages
          </h3>
          <div className="space-y-4">
            {data.topPages.map((page, index) => (
              <div
                key={page.page}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{page.page}</p>
                    <p className="text-sm text-gray-500">
                      Avg. time: {formatDuration(page.avgTime)} • Exit rate:{' '}
                      {page.exitRate}%
                    </p>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {page.views.toLocaleString()} views
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Segments */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            User Engagement by Segment
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.userSegments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="segment"
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
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  name="Users"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Engagement Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Engagement Insights
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>
                  Client engagement is highest on Tuesday and Wednesday
                  afternoons
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>
                  Photo gallery pages have the longest average session duration
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>
                  Mobile users spend 23% more time in the portal than desktop
                  users
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>
                  Return users are 40% more likely to complete tasks in the
                  portal
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EngagementMetrics;
