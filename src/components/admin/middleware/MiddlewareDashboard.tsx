'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CpuChipIcon,
  ChartBarIcon,
  ClockIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

interface MiddlewareDashboardProps {
  userId: string;
  userProfile: any;
  isRefreshing: boolean;
  lastRefresh: Date;
}

interface MiddlewareMetrics {
  requestsPerSecond: number;
  averageLatency: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueLength: number;
}

interface PerformanceAlert {
  id: string;
  timestamp: Date;
  type: 'latency' | 'throughput' | 'errors' | 'memory' | 'cpu';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  weddingImpact: string;
  currentValue: number;
  threshold: number;
  trend: 'up' | 'down' | 'stable';
}

interface WeddingContextMetrics {
  activeSupplierSessions: number;
  peakTrafficPeriod: string;
  weddingFormSubmissions: number;
  bookingRequestsPerHour: number;
  supplierUploadsInProgress: number;
}

export function MiddlewareDashboard({
  userId,
  userProfile,
  isRefreshing,
  lastRefresh,
}: MiddlewareDashboardProps) {
  const [metrics, setMetrics] = useState<MiddlewareMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [weddingContext, setWeddingContext] =
    useState<WeddingContextMetrics | null>(null);
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  const fetchMetrics = useCallback(async () => {
    // Mock middleware metrics - In production, integrate with monitoring tools
    const mockMetrics: MiddlewareMetrics = {
      requestsPerSecond: 1247 + Math.floor(Math.random() * 200),
      averageLatency: 185 + Math.floor(Math.random() * 50),
      errorRate: 0.2 + Math.random() * 0.3,
      throughput: 95.8 + Math.random() * 3,
      memoryUsage: 68.5 + Math.random() * 10,
      cpuUsage: 42.3 + Math.random() * 15,
      activeConnections: 2847 + Math.floor(Math.random() * 500),
      queueLength: Math.floor(Math.random() * 50),
    };

    const mockAlerts: PerformanceAlert[] = [
      {
        id: 'perf_001',
        timestamp: new Date(Date.now() - 5 * 60000),
        type: 'latency',
        severity: 'high',
        title: 'Elevated Response Latency',
        description:
          'Wedding form submissions experiencing delays during peak booking hours',
        weddingImpact:
          'Couples may experience slow form responses when booking venue tours',
        currentValue: 287,
        threshold: 250,
        trend: 'up',
      },
      {
        id: 'perf_002',
        timestamp: new Date(Date.now() - 15 * 60000),
        type: 'throughput',
        severity: 'medium',
        title: 'Reduced Throughput',
        description:
          'Photo upload processing slower than normal for wedding suppliers',
        weddingImpact:
          'Photographers uploading wedding galleries may see processing delays',
        currentValue: 89.2,
        threshold: 95,
        trend: 'down',
      },
    ];

    const mockWeddingContext: WeddingContextMetrics = {
      activeSupplierSessions: 342 + Math.floor(Math.random() * 50),
      peakTrafficPeriod: 'Bridal Show Season (March-May)',
      weddingFormSubmissions: 28 + Math.floor(Math.random() * 10),
      bookingRequestsPerHour: 15 + Math.floor(Math.random() * 8),
      supplierUploadsInProgress: 7 + Math.floor(Math.random() * 5),
    };

    setMetrics(mockMetrics);
    setAlerts(mockAlerts);
    setWeddingContext(mockWeddingContext);
  }, [timeframe]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics, lastRefresh]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRealTimeEnabled) {
      interval = setInterval(fetchMetrics, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRealTimeEnabled, fetchMetrics]);

  const getStatusColor = (
    value: number,
    threshold: number,
    inverted = false,
  ) => {
    const isGood = inverted ? value < threshold : value > threshold;
    if (isGood) {
      return 'text-success-600 bg-success-50 border-success-200';
    } else {
      return 'text-warning-600 bg-warning-50 border-warning-200';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-error-700 bg-error-50 border-error-200';
      case 'high':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-warning-700 bg-warning-50 border-warning-200';
      case 'low':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-error-500" />;
      case 'down':
        return <ArrowTrendingDownIcon className="w-4 h-4 text-success-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>;
    }
  };

  const formatMetricValue = (value: number, unit: string) => {
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    if (unit === 'ms') {
      return `${Math.round(value)}ms`;
    }
    if (unit === '/s') {
      return `${Math.round(value)}/s`;
    }
    return `${Math.round(value)}${unit}`;
  };

  if (!metrics || !weddingContext) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">
          Loading middleware performance data...
        </span>
      </div>
    );
  }

  const overallHealth =
    metrics.errorRate < 1 && metrics.averageLatency < 300
      ? 'healthy'
      : 'warning';

  return (
    <div className="space-y-8">
      {/* Header with Real-time Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Middleware Performance Dashboard
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time monitoring of request processing and wedding platform
            performance
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Real-time Updates:</span>
            <button
              onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isRealTimeEnabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isRealTimeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Overall System Health */}
      <div
        className={`p-6 rounded-xl border-2 ${
          overallHealth === 'healthy'
            ? 'bg-success-50 border-success-200'
            : 'bg-warning-50 border-warning-200'
        }`}
      >
        <div className="flex items-center space-x-3">
          {overallHealth === 'healthy' ? (
            <CheckCircleIcon className="w-8 h-8 text-success-600" />
          ) : (
            <ExclamationTriangleIcon className="w-8 h-8 text-warning-600" />
          )}
          <div>
            <h3
              className={`text-lg font-semibold ${
                overallHealth === 'healthy'
                  ? 'text-success-900'
                  : 'text-warning-900'
              }`}
            >
              Wedding Platform Status:{' '}
              {overallHealth === 'healthy' ? 'Healthy' : 'Needs Attention'}
            </h3>
            <p
              className={`text-sm ${
                overallHealth === 'healthy'
                  ? 'text-success-700'
                  : 'text-warning-700'
              }`}
            >
              {overallHealth === 'healthy'
                ? 'All middleware systems operating within normal parameters'
                : 'Some performance metrics require monitoring'}
            </p>
          </div>
        </div>
      </div>

      {/* Core Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Requests/Second
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatMetricValue(metrics.requestsPerSecond, '/s')}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Wedding form submissions
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <GlobeAltIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Average Latency
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatMetricValue(metrics.averageLatency, 'ms')}
              </p>
              <p className="text-sm text-gray-600 mt-1">Response time</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatMetricValue(metrics.errorRate, '%')}
              </p>
              <p className="text-sm text-gray-600 mt-1">Failed requests</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-error-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-error-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Throughput</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatMetricValue(metrics.throughput, '%')}
              </p>
              <p className="text-sm text-gray-600 mt-1">System capacity</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-success-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>
      </div>

      {/* System Resource Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          System Resources
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-3">
              <svg
                className="w-20 h-20 transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeDasharray={`${metrics.cpuUsage}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-900">
                  {Math.round(metrics.cpuUsage)}%
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900">CPU Usage</p>
            <p className="text-xs text-gray-600">Wedding processing load</p>
          </div>

          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-3">
              <svg
                className="w-20 h-20 transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeDasharray={`${metrics.memoryUsage}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-900">
                  {Math.round(metrics.memoryUsage)}%
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900">Memory Usage</p>
            <p className="text-xs text-gray-600">Image processing cache</p>
          </div>

          <div className="text-center">
            <CpuChipIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {metrics.activeConnections.toLocaleString()}
            </p>
            <p className="text-sm font-medium text-gray-900">
              Active Connections
            </p>
            <p className="text-xs text-gray-600">Supplier sessions</p>
          </div>

          <div className="text-center">
            <ServerIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {metrics.queueLength}
            </p>
            <p className="text-sm font-medium text-gray-900">Queue Length</p>
            <p className="text-xs text-gray-600">Pending requests</p>
          </div>
        </div>
      </div>

      {/* Wedding Industry Context */}
      <div className="bg-gradient-to-r from-purple-50 to-primary-50 rounded-xl border border-primary-200 p-6">
        <h3 className="text-lg font-semibold text-primary-900 mb-4">
          Wedding Platform Activity
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.activeSupplierSessions}
            </p>
            <p className="text-sm text-primary-700">Active Suppliers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.weddingFormSubmissions}
            </p>
            <p className="text-sm text-primary-700">Form Submissions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.bookingRequestsPerHour}
            </p>
            <p className="text-sm text-primary-700">Bookings/Hour</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.supplierUploadsInProgress}
            </p>
            <p className="text-sm text-primary-700">Photo Uploads</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-primary-900">
              {weddingContext.peakTrafficPeriod}
            </p>
            <p className="text-xs text-primary-700">Peak Season</p>
          </div>
        </div>
      </div>

      {/* Performance Alerts */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Performance Alerts
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {alerts.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-8 h-8 text-success-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No performance issues
              </h4>
              <p className="text-gray-600">
                All wedding platform systems operating optimally.
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getAlertSeverityColor(alert.severity)}`}
                    >
                      {alert.severity.toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {alert.title}
                        </h4>
                        {getTrendIcon(alert.trend)}
                      </div>

                      <p className="text-sm text-gray-900 mb-2">
                        {alert.description}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <span>
                          {alert.type.charAt(0).toUpperCase() +
                            alert.type.slice(1)}
                        </span>
                        <span>•</span>
                        <span>
                          {alert.currentValue} / {alert.threshold}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="text-xs text-orange-600 font-medium mb-1">
                          Wedding Industry Impact:
                        </div>
                        <div className="text-sm text-orange-700">
                          {alert.weddingImpact}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
