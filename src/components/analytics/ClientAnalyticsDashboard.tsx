'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertCircle,
  TrendingUp,
  Users,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  MousePointer,
  FileText,
  Calendar,
  Phone,
  ChevronDown,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy load Recharts for better performance
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

interface AnalyticsDashboardData {
  summary: {
    total_clients: number;
    average_engagement_score: number;
    total_open_alerts: number;
    at_risk_clients: number;
    ghost_clients: number;
  };
  segments: Record<string, number>;
  activity_status: Record<string, number>;
  clients: Array<{
    client_id: string;
    client_name: string;
    email: string;
    wedding_date: string;
    engagement_score: number;
    segment: string;
    activity_status: string;
    total_events_30d: number;
    email_opens_30d: number;
    email_clicks_30d: number;
    form_submissions_30d: number;
    portal_visits_30d: number;
    last_activity: string;
    open_alerts: number;
  }>;
  engagement_trends?: Array<{
    date: string;
    average_score: number;
    total_events: number;
  }>;
  last_refreshed: string;
}

interface AtRiskAlert {
  id: string;
  client_name: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommended_actions: string[];
  days_since_activity: number;
  wedding_date?: string;
  created_at: string;
}

interface ClientAnalyticsDashboardProps {
  supplierId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

const ClientAnalyticsDashboard: React.FC<ClientAnalyticsDashboardProps> = ({
  supplierId,
  autoRefresh = true,
  refreshInterval = 300000, // 5 minutes
}) => {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [alerts, setAlerts] = useState<AtRiskAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('30d');
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false);
  const [timeRangeDropdownOpen, setTimeRangeDropdownOpen] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [analyticsResponse, alertsResponse] = await Promise.all([
        fetch(
          `/api/analytics/engagement/dashboard?supplier_id=${supplierId}&time_range=${selectedTimeRange}`,
        ),
        fetch(
          `/api/analytics/engagement/alerts?supplier_id=${supplierId}&resolved=false`,
        ),
      ]);

      if (!analyticsResponse.ok || !alertsResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [analyticsData, alertsData] = await Promise.all([
        analyticsResponse.json(),
        alertsResponse.json(),
      ]);

      setData(analyticsData.data);
      setAlerts(alertsData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supplierId, selectedTimeRange]);

  // Filter clients by segment
  const filteredClients = useMemo(() => {
    if (!data?.clients || selectedSegment === 'all') return data?.clients || [];
    return data.clients.filter((client) => client.segment === selectedSegment);
  }, [data?.clients, selectedSegment]);

  // Chart data transformations
  const segmentChartData = useMemo(() => {
    if (!data?.segments) return [];

    const colors = {
      champion: 'rgb(18, 183, 106)',
      highly_engaged: 'rgb(46, 144, 250)',
      normal: 'rgb(247, 144, 9)',
      at_risk: 'rgb(247, 144, 9)',
      ghost: 'rgb(240, 68, 56)',
    };

    return Object.entries(data.segments).map(([segment, count]) => ({
      segment: segment.replace('_', ' '),
      count,
      color: colors[segment as keyof typeof colors] || 'rgb(107, 114, 128)',
    }));
  }, [data?.segments]);

  const engagementTrendData = useMemo(() => {
    if (!data?.engagement_trends) return [];
    return data.engagement_trends.map((trend) => ({
      date: new Date(trend.date).toLocaleDateString(),
      score: trend.average_score,
      events: trend.total_events,
    }));
  }, [data?.engagement_trends]);

  // Auto-refresh effect
  useEffect(() => {
    fetchAnalytics();

    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAnalytics, autoRefresh, refreshInterval]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'champion':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'highly_engaged':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'normal':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'at_risk':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ghost':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (error) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-xl p-4"
        data-testid="error-alert"
      >
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <div className="text-sm text-red-800">{error}</div>
            <div className="mt-2">
              <button
                onClick={fetchAnalytics}
                data-testid="retry-button"
                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="client-analytics-dashboard">
      {/* Header Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3">
          {/* Time Range Selector */}
          <div className="relative">
            <button
              onClick={() => setTimeRangeDropdownOpen(!timeRangeDropdownOpen)}
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 flex items-center gap-2"
            >
              {selectedTimeRange === '7d'
                ? 'Last 7 days'
                : selectedTimeRange === '30d'
                  ? 'Last 30 days'
                  : 'Last 90 days'}
              <ChevronDown className="h-4 w-4" />
            </button>
            {timeRangeDropdownOpen && (
              <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-full">
                <div className="py-1">
                  {['7d', '30d', '90d'].map((range) => (
                    <button
                      key={range}
                      onClick={() => {
                        setSelectedTimeRange(range);
                        setTimeRangeDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {range === '7d'
                        ? 'Last 7 days'
                        : range === '30d'
                          ? 'Last 30 days'
                          : 'Last 90 days'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Segment Selector */}
          <div className="relative">
            <button
              onClick={() => setSegmentDropdownOpen(!segmentDropdownOpen)}
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 flex items-center gap-2"
            >
              {selectedSegment === 'all'
                ? 'All segments'
                : selectedSegment.replace('_', ' ')}
              <ChevronDown className="h-4 w-4" />
            </button>
            {segmentDropdownOpen && (
              <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-full">
                <div className="py-1">
                  {[
                    { value: 'all', label: 'All segments' },
                    { value: 'champion', label: 'Champions' },
                    { value: 'highly_engaged', label: 'Highly Engaged' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'at_risk', label: 'At Risk' },
                    { value: 'ghost', label: 'Ghost' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedSegment(option.value);
                        setSegmentDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {data && (
          <div className="text-sm text-gray-500">
            Last updated: {new Date(data.last_refreshed).toLocaleString()}
          </div>
        )}
      </div>

      {/* Critical Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <div className="text-red-800">
                <strong>
                  {alerts.filter((a) => a.severity === 'critical').length}{' '}
                  critical alerts
                </strong>
                {' and '}
                <strong>
                  {alerts.length -
                    alerts.filter((a) => a.severity === 'critical').length}{' '}
                  other alerts
                </strong>
                {' require attention. '}
                <button className="text-red-600 underline hover:text-red-800 transition-colors">
                  View all alerts →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200"
            data-testid="summary-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500">
                  Total Clients
                </div>
                <div
                  className="text-3xl font-semibold text-gray-900 mt-1"
                  data-testid="total-clients"
                >
                  {data.summary.total_clients.toLocaleString()}
                </div>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200"
            data-testid="summary-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500">
                  Avg Engagement
                </div>
                <div
                  className="text-3xl font-semibold text-gray-900 mt-1"
                  data-testid="avg-engagement"
                >
                  {data.summary.average_engagement_score}/100
                </div>
                {/* Progress bar */}
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${data.summary.average_engagement_score}%`,
                    }}
                  ></div>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200"
            data-testid="summary-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500">At Risk</div>
                <div
                  className="text-3xl font-semibold text-orange-600 mt-1"
                  data-testid="at-risk-count"
                >
                  {data.summary.at_risk_clients}
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
          </div>

          <div
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200"
            data-testid="summary-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500">
                  Ghost Clients
                </div>
                <div
                  className="text-3xl font-semibold text-red-600 mt-1"
                  data-testid="ghost-count"
                >
                  {data.summary.ghost_clients}
                </div>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>

          <div
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200"
            data-testid="summary-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500">
                  Open Alerts
                </div>
                <div
                  className="text-3xl font-semibold text-red-600 mt-1"
                  data-testid="open-alerts"
                >
                  {data.summary.total_open_alerts}
                </div>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Segment Distribution */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Client Segments
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={segmentChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {segmentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `${value} clients`,
                    name,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Engagement Trends */}
          {engagementTrendData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Engagement Trends
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={engagementTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="rgb(158, 119, 237)"
                    strokeWidth={2}
                    name="Avg Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Activity Overview */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Activity Overview (Last 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredClients.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="client_name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="email_opens_30d"
                  stackId="a"
                  fill="rgb(59, 130, 246)"
                  name="Email Opens"
                />
                <Bar
                  dataKey="portal_visits_30d"
                  stackId="a"
                  fill="rgb(16, 185, 129)"
                  name="Portal Visits"
                />
                <Bar
                  dataKey="form_submissions_30d"
                  stackId="a"
                  fill="rgb(245, 158, 11)"
                  name="Form Submissions"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* At-Risk Clients Table */}
      {alerts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              At-Risk Alerts ({alerts.length})
            </h3>
          </div>
          <div className="space-y-4">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}
                      >
                        {alert.severity}
                      </span>
                      <span className="font-medium text-gray-900">
                        {alert.client_name}
                      </span>
                      {alert.wedding_date && (
                        <span className="text-sm text-gray-500">
                          Wedding:{' '}
                          {new Date(alert.wedding_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      {alert.message}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {alert.recommended_actions.map((action, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {alert.days_since_activity} days ago
                  </div>
                </div>
              </div>
            ))}

            {alerts.length > 5 && (
              <button className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-medium hover:bg-gray-50 transition-colors duration-200">
                View all {alerts.length} alerts
              </button>
            )}
          </div>
        </div>
      )}

      {/* Client Details Table */}
      {filteredClients.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Client Details
            {selectedSegment !== 'all' && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({selectedSegment.replace('_', ' ')} - {filteredClients.length}{' '}
                clients)
              </span>
            )}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-sm font-medium text-gray-500">
                    Client
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-gray-500">
                    Score
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-gray-500">
                    Segment
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-gray-500">
                    Activity
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-gray-500">
                    Last Seen
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-gray-500">
                    Wedding Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.slice(0, 20).map((client) => (
                  <tr
                    key={client.client_id}
                    className="border-b border-gray-100"
                  >
                    <td className="py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {client.client_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {client.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {client.engagement_score}
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${client.engagement_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSegmentColor(client.segment)}`}
                      >
                        {client.segment.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-3 w-3" />
                        {client.email_opens_30d}
                        <MousePointer className="h-3 w-3" />
                        {client.portal_visits_30d}
                        <FileText className="h-3 w-3" />
                        {client.form_submissions_30d}
                      </div>
                    </td>
                    <td className="py-4 text-sm text-gray-600">
                      {new Date(client.last_activity).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-sm text-gray-600">
                      {new Date(client.wedding_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredClients.length > 20 && (
              <div className="mt-4 text-center">
                <button className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-medium hover:bg-gray-50 transition-colors duration-200">
                  Load more clients ({filteredClients.length - 20} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div
          className="flex items-center justify-center h-64"
          data-testid="analytics-skeleton"
        >
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
            <span className="text-gray-700">Loading client analytics...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientAnalyticsDashboard;
