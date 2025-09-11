'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Types for audit metrics
interface AuditMetrics {
  eventsPerSecond: number;
  errorRate: number;
  averageResponseTime: number;
  activeUsers: number;
  totalEvents: number;
  criticalAlerts: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
}

interface MetricTrend {
  timestamp: string;
  eventsPerSecond: number;
  errorRate: number;
  responseTime: number;
}

interface SystemHealthData {
  name: string;
  value: number;
  color: string;
}

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  service: string;
}

export function AuditDashboard() {
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [trends, setTrends] = useState<MetricTrend[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('6h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // WebSocket connection for real-time updates
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(
        `${process.env.NODE_ENV === 'development' ? 'ws://localhost:3000' : 'wss://' + window.location.host}/api/audit/monitoring/stream`,
      );

      ws.onopen = () => {
        setIsConnected(true);
        console.log('Audit monitoring WebSocket connected');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'metrics_update') {
          setMetrics(data.metrics);
        } else if (data.type === 'trend_update') {
          setTrends((prev) => [...prev.slice(-29), data.trend]); // Keep last 30 points
        } else if (data.type === 'alert') {
          setAlerts((prev) => [data.alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        console.error('WebSocket connection error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (autoRefresh) {
            connectWebSocket();
          }
        }, 5000);
      };

      return ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      return null;
    }
  }, [autoRefresh]);

  // Fetch initial data
  const fetchAuditData = async () => {
    try {
      setIsLoading(true);

      const [metricsRes, trendsRes, alertsRes] = await Promise.all([
        fetch('/api/audit/metrics'),
        fetch(`/api/audit/trends?timeRange=${timeRange}`),
        fetch('/api/audit/alerts?limit=10'),
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        setTrends(trendsData.trends || []);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [timeRange]);

  useEffect(() => {
    let ws: WebSocket | null = null;

    if (autoRefresh) {
      ws = connectWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket, autoRefresh]);

  // Auto-refresh fallback (polling every 30 seconds if WebSocket fails)
  useEffect(() => {
    if (!isConnected && autoRefresh) {
      const interval = setInterval(fetchAuditData, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, autoRefresh]);

  const getHealthStatusColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const systemHealthData: SystemHealthData[] = [
    { name: 'Healthy', value: 75, color: '#10B981' },
    { name: 'Warning', value: 20, color: '#F59E0B' },
    { name: 'Critical', value: 5, color: '#EF4444' },
  ];

  if (isLoading && !metrics) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-200 rounded-lg h-96"></div>
            <div className="bg-gray-200 rounded-lg h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Real-time system monitoring and security audit logs
          </p>
        </div>

        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}
              aria-label={isConnected ? 'Connected' : 'Disconnected'}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) =>
              setTimeRange(e.target.value as '1h' | '6h' | '24h' | '7d')
            }
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Select time range"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          {/* Auto Refresh Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Auto Refresh</span>
          </label>

          {/* Manual Refresh Button */}
          <button
            onClick={fetchAuditData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm transition-colors"
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Status */}
      {metrics && (
        <div
          className={`rounded-lg border p-4 ${getHealthStatusColor(metrics.systemHealth)}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {metrics.systemHealth === 'healthy' && (
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                {metrics.systemHealth === 'warning' && (
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                )}
                {metrics.systemHealth === 'critical' && (
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="font-semibold">
                  System Status:{' '}
                  {metrics.systemHealth.charAt(0).toUpperCase() +
                    metrics.systemHealth.slice(1)}
                </h3>
                <p className="text-sm">
                  Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
            {metrics.criticalAlerts > 0 && (
              <div className="flex items-center space-x-2">
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                  {metrics.criticalAlerts} Critical Alerts
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Events Per Second */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Events/sec</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.eventsPerSecond.toFixed(1)}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Real-time event processing rate
            </p>
          </div>

          {/* Error Rate */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p
                  className={`text-3xl font-bold ${metrics.errorRate > 5 ? 'text-red-600' : metrics.errorRate > 2 ? 'text-yellow-600' : 'text-green-600'}`}
                >
                  {metrics.errorRate.toFixed(2)}%
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${metrics.errorRate > 5 ? 'bg-red-50' : metrics.errorRate > 2 ? 'bg-yellow-50' : 'bg-green-50'}`}
              >
                <svg
                  className={`w-6 h-6 ${metrics.errorRate > 5 ? 'text-red-600' : metrics.errorRate > 2 ? 'text-yellow-600' : 'text-green-600'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Failed requests percentage
            </p>
          </div>

          {/* Response Time */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Response Time
                </p>
                <p
                  className={`text-3xl font-bold ${metrics.averageResponseTime > 1000 ? 'text-red-600' : metrics.averageResponseTime > 500 ? 'text-yellow-600' : 'text-green-600'}`}
                >
                  {metrics.averageResponseTime.toFixed(0)}ms
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${metrics.averageResponseTime > 1000 ? 'bg-red-50' : metrics.averageResponseTime > 500 ? 'bg-yellow-50' : 'bg-green-50'}`}
              >
                <svg
                  className={`w-6 h-6 ${metrics.averageResponseTime > 1000 ? 'text-red-600' : metrics.averageResponseTime > 500 ? 'text-yellow-600' : 'text-green-600'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">API response latency</p>
          </div>

          {/* Active Users */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Users
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(metrics.activeUsers)}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Currently online users</p>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Trends
          </h3>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleTimeString()
                  }
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value, name) => [
                    name === 'responseTime'
                      ? `${value}ms`
                      : name === 'errorRate'
                        ? `${value}%`
                        : `${value}/s`,
                    name === 'eventsPerSecond'
                      ? 'Events/sec'
                      : name === 'errorRate'
                        ? 'Error Rate'
                        : 'Response Time',
                  ]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="eventsPerSecond"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="eventsPerSecond"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="errorRate"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="errorRate"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="responseTime"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <p>No trend data available</p>
                <p className="text-sm">
                  Data will appear as events are processed
                </p>
              </div>
            </div>
          )}
        </div>

        {/* System Health Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            System Health Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={systemHealthData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {systemHealthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value}%`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 mt-4">
            {systemHealthData.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">
                  {item.name}: {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div key={alert.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start space-x-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getAlertLevelColor(alert.level)}`}
                  >
                    {alert.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {alert.message}
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <span>{alert.service}</span>
                      <span>•</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-5 5v-5zM9.243 16.314l7.071-7.071M9 12h6m-6 4h6M7 8h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V10a2 2 0 012-2z"
                />
              </svg>
              <p className="text-sm font-medium text-gray-600">
                No alerts at this time
              </p>
              <p className="text-xs text-gray-500 mt-1">
                System alerts will appear here when they occur
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
