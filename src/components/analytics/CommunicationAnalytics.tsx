'use client';

import React, { useMemo } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Bell,
  Send,
  Eye,
  Reply,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
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
const BarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false },
);
const Bar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Bar })),
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

interface CommunicationData {
  summary: {
    totalMessages: number;
    emailsSent: number;
    notificationsSent: number;
    avgResponseTime: number; // in minutes
    openRate: number;
    responseRate: number;
    engagementScore: number;
  };
  channelPerformance: Array<{
    channel: string;
    sent: number;
    delivered: number;
    opened: number;
    responded: number;
    deliveryRate: number;
    openRate: number;
    responseRate: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    messagesSent: number;
    messagesOpened: number;
    messagesResponded: number;
    avgResponseTime: number;
  }>;
  topPerformingMessages: Array<{
    subject: string;
    type: string;
    sent: number;
    openRate: number;
    responseRate: number;
    engagement: number;
  }>;
  clientEngagement: Array<{
    clientId: string;
    clientName: string;
    messagesReceived: number;
    messagesOpened: number;
    messagesResponded: number;
    avgResponseTime: number;
    engagementLevel: 'high' | 'medium' | 'low';
  }>;
  responseTimeDistribution: Array<{
    timeRange: string;
    count: number;
    percentage: number;
  }>;
}

interface CommunicationAnalyticsProps {
  data: CommunicationData;
  timeRange: string;
  onExport?: () => void;
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
  icon: Icon,
  trend,
  suffix = '',
}: {
  title: string;
  value: string | number;
  change: string;
  icon: React.ComponentType<any>;
  trend: 'up' | 'down' | 'neutral';
  suffix?: string;
}) => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value}
            {suffix}
          </p>
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

const EngagementBadge = ({ level }: { level: 'high' | 'medium' | 'low' }) => {
  const config = {
    high: { color: 'bg-green-100 text-green-800', label: 'High' },
    medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
    low: { color: 'bg-red-100 text-red-800', label: 'Low' },
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config[level].color}`}
    >
      {config[level].label}
    </span>
  );
};

export function CommunicationAnalytics({
  data,
  timeRange,
  onExport,
}: CommunicationAnalyticsProps) {
  const formatResponseTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  const chartData = useMemo(() => {
    return data.timeSeriesData.map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      avgResponseTime: Math.round(item.avgResponseTime / 60), // Convert to hours
    }));
  }, [data.timeSeriesData]);

  const channelData = useMemo(() => {
    return data.channelPerformance.map((channel, index) => ({
      ...channel,
      color: COLORS[index % COLORS.length],
    }));
  }, [data.channelPerformance]);

  return (
    <div className="space-y-6" data-testid="communication-analytics">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Messages"
          value={data.summary.totalMessages.toLocaleString()}
          change="+18%"
          icon={MessageSquare}
          trend="up"
        />
        <MetricCard
          title="Emails Sent"
          value={data.summary.emailsSent.toLocaleString()}
          change="+12%"
          icon={Mail}
          trend="up"
        />
        <MetricCard
          title="Response Rate"
          value={data.summary.responseRate}
          change="+5%"
          icon={Reply}
          trend="up"
          suffix="%"
        />
        <MetricCard
          title="Avg Response Time"
          value={formatResponseTime(data.summary.avgResponseTime)}
          change="-15%"
          icon={Clock}
          trend="up"
        />
      </div>

      {/* Communication Trends */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Communication Trends
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
                dataKey="messagesSent"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Messages Sent"
              />
              <Line
                type="monotone"
                dataKey="messagesOpened"
                stroke="#10b981"
                strokeWidth={2}
                name="Messages Opened"
              />
              <Line
                type="monotone"
                dataKey="messagesResponded"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Messages Responded"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel Performance and Response Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Performance */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Channel Performance
          </h3>
          <div className="space-y-4">
            {data.channelPerformance.map((channel, index) => (
              <div key={channel.channel} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="font-medium text-gray-900">
                      {channel.channel}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {channel.sent.toLocaleString()} sent
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Delivery Rate</p>
                    <p className="font-semibold text-gray-900">
                      {channel.deliveryRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Open Rate</p>
                    <p className="font-semibold text-gray-900">
                      {channel.openRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Response Rate</p>
                    <p className="font-semibold text-gray-900">
                      {channel.responseRate}%
                    </p>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${channel.openRate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Response Time Distribution */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Response Time Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.responseTimeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timeRange"
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
                  formatter={(value: number, name: string) => [
                    name === 'count' ? `${value} responses` : `${value}%`,
                    name === 'count' ? 'Responses' : 'Percentage',
                  ]}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performing Messages */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Top Performing Messages
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.topPerformingMessages.map((message, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {message.subject}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {message.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {message.sent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {message.openRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {message.responseRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 mr-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${message.engagement}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {message.engagement}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Engagement Levels */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Client Engagement Levels
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.clientEngagement.slice(0, 12).map((client) => (
            <div
              key={client.clientId}
              className="p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">
                  {client.clientName}
                </h4>
                <EngagementBadge level={client.engagementLevel} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Received</p>
                  <p className="font-semibold">{client.messagesReceived}</p>
                </div>
                <div>
                  <p className="text-gray-500">Opened</p>
                  <p className="font-semibold">{client.messagesOpened}</p>
                </div>
                <div>
                  <p className="text-gray-500">Responded</p>
                  <p className="font-semibold">{client.messagesResponded}</p>
                </div>
                <div>
                  <p className="text-gray-500">Avg Response</p>
                  <p className="font-semibold">
                    {formatResponseTime(client.avgResponseTime)}
                  </p>
                </div>
              </div>

              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    client.engagementLevel === 'high'
                      ? 'bg-green-600'
                      : client.engagementLevel === 'medium'
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                  }`}
                  style={{
                    width: `${Math.round((client.messagesOpened / client.messagesReceived) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Communication Insights */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageSquare className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Communication Insights
            </h3>
            <ul className="space-y-2 text-green-800">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>
                  Email has the highest open rate at 72%, but messaging shows
                  better response rates
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>
                  Messages sent on Tuesday-Thursday get 35% higher response
                  rates
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>
                  Personalized messages have 2.3x higher engagement than generic
                  ones
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>
                  Clients respond fastest to timeline updates and payment
                  reminders
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommunicationAnalytics;
