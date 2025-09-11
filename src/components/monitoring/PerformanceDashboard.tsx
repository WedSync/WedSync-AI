/**
 * WS-145: Performance Monitoring Dashboard Component
 * Real-time Core Web Vitals and performance metrics display
 */

'use client';

import { useState, useEffect } from 'react';
import { usePerformanceMonitor } from '@/lib/monitoring/performance-monitor';
import {
  PERFORMANCE_TARGETS,
  BUNDLE_TARGETS,
} from '@/lib/monitoring/performance-monitor';

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  inp?: number;
  bundleSize?: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface Alert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: number;
  url: string;
  deviceType: string;
}

interface PerformanceTrend {
  timestamp: number;
  lcp: number;
  fid: number;
  cls: number;
  rating: string;
}

export default function PerformanceDashboard() {
  const { monitor, summary } = usePerformanceMonitor();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    '1h' | '24h' | '7d'
  >('24h');

  useEffect(() => {
    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const fetchPerformanceData = async () => {
    try {
      setIsLoading(true);

      // Fetch current metrics
      const metricsResponse = await fetch('/api/analytics/performance');
      if (metricsResponse.ok) {
        const data = await metricsResponse.json();

        // Calculate latest metrics
        const latestMetrics = calculateLatestMetrics(data.metrics);
        setMetrics(latestMetrics);

        // Set alerts
        setAlerts(data.alerts || []);

        // Calculate trends
        const trendsData = calculateTrends(data.metrics);
        setTrends(trendsData);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateLatestMetrics = (metricsData: any): PerformanceMetrics => {
    const latest: any = {};

    // Get latest value for each metric type
    Object.entries(metricsData).forEach(([metricName, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        const latestValue = values[values.length - 1];
        latest[metricName.toLowerCase()] = latestValue.value;
      }
    });

    // Determine overall rating
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
    const deviceType =
      typeof window !== 'undefined' && window.innerWidth < 768
        ? 'mobile'
        : 'desktop';

    // Check LCP
    if (latest.lcp) {
      const threshold =
        deviceType === 'mobile'
          ? PERFORMANCE_TARGETS.LCP.mobile!
          : PERFORMANCE_TARGETS.LCP.good;
      if (latest.lcp > PERFORMANCE_TARGETS.LCP.poor) rating = 'poor';
      else if (latest.lcp > threshold && rating !== 'poor')
        rating = 'needs-improvement';
    }

    // Check FID
    if (latest.fid) {
      if (latest.fid > PERFORMANCE_TARGETS.FID.poor) rating = 'poor';
      else if (latest.fid > PERFORMANCE_TARGETS.FID.good && rating !== 'poor')
        rating = 'needs-improvement';
    }

    // Check CLS
    if (latest.cls) {
      if (latest.cls > PERFORMANCE_TARGETS.CLS.poor) rating = 'poor';
      else if (latest.cls > PERFORMANCE_TARGETS.CLS.good && rating !== 'poor')
        rating = 'needs-improvement';
    }

    return {
      lcp: latest.lcp,
      fid: latest.fid,
      cls: latest.cls,
      ttfb: latest.ttfb,
      inp: latest.inp,
      bundleSize: latest.bundlesize || 0,
      rating,
    };
  };

  const calculateTrends = (metricsData: any): PerformanceTrend[] => {
    // Simplified trend calculation - in a real implementation, this would aggregate by time periods
    const trends: PerformanceTrend[] = [];

    if (metricsData.LCP && metricsData.FID && metricsData.CLS) {
      const maxLength = Math.min(
        metricsData.LCP.length,
        metricsData.FID.length,
        metricsData.CLS.length,
        10,
      );

      for (let i = 0; i < maxLength; i++) {
        const lcp = metricsData.LCP[i]?.value || 0;
        const fid = metricsData.FID[i]?.value || 0;
        const cls = metricsData.CLS[i]?.value || 0;

        trends.push({
          timestamp: metricsData.LCP[i]?.timestamp || Date.now(),
          lcp,
          fid,
          cls,
          rating: lcp > 2500 || fid > 100 || cls > 0.1 ? 'poor' : 'good',
        });
      }
    }

    return trends.reverse(); // Most recent first
  };

  const getScoreColor = (
    value: number,
    thresholds: { good: number; poor: number },
    deviceType = 'desktop',
  ): string => {
    const goodThreshold = thresholds.good;
    const poorThreshold = thresholds.poor;

    if (value <= goodThreshold) return 'text-green-600';
    if (value <= poorThreshold) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'needs-improvement':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (value: number, unit: string): string => {
    if (unit === 'ms') {
      return `${Math.round(value)}ms`;
    } else if (unit === 'bytes') {
      return `${Math.round(value / 1024)}KB`;
    } else {
      return value.toFixed(3);
    }
  };

  if (isLoading && !metrics) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Performance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Core Web Vitals and performance monitoring
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) =>
              setSelectedTimeframe(e.target.value as '1h' | '24h' | '7d')
            }
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button
            onClick={fetchPerformanceData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Performance Score */}
      {metrics && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Overall Performance
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(metrics.rating)}`}
            >
              {metrics.rating
                .replace('-', ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          </div>
        </div>
      )}

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LCP */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">LCP</h3>
            <div className="text-xs text-gray-500">
              Largest Contentful Paint
            </div>
          </div>
          {metrics?.lcp ? (
            <div>
              <div
                className={`text-3xl font-bold ${getScoreColor(metrics.lcp, PERFORMANCE_TARGETS.LCP)}`}
              >
                {formatValue(metrics.lcp, 'ms')}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Target: &lt; {formatValue(PERFORMANCE_TARGETS.LCP.good, 'ms')}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">No data</div>
          )}
        </div>

        {/* FID */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">FID</h3>
            <div className="text-xs text-gray-500">First Input Delay</div>
          </div>
          {metrics?.fid ? (
            <div>
              <div
                className={`text-3xl font-bold ${getScoreColor(metrics.fid, PERFORMANCE_TARGETS.FID)}`}
              >
                {formatValue(metrics.fid, 'ms')}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Target: &lt; {formatValue(PERFORMANCE_TARGETS.FID.good, 'ms')}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">No data</div>
          )}
        </div>

        {/* CLS */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">CLS</h3>
            <div className="text-xs text-gray-500">Cumulative Layout Shift</div>
          </div>
          {metrics?.cls !== undefined ? (
            <div>
              <div
                className={`text-3xl font-bold ${getScoreColor(metrics.cls, PERFORMANCE_TARGETS.CLS)}`}
              >
                {metrics.cls.toFixed(3)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Target: &lt; {PERFORMANCE_TARGETS.CLS.good.toFixed(1)}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">No data</div>
          )}
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TTFB */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">TTFB</h3>
            <div className="text-xs text-gray-500">Time to First Byte</div>
          </div>
          {metrics?.ttfb ? (
            <div>
              <div
                className={`text-2xl font-bold ${getScoreColor(metrics.ttfb, PERFORMANCE_TARGETS.TTFB)}`}
              >
                {formatValue(metrics.ttfb, 'ms')}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Target: &lt; {formatValue(PERFORMANCE_TARGETS.TTFB.good, 'ms')}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">No data</div>
          )}
        </div>

        {/* Bundle Size */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Bundle Size</h3>
            <div className="text-xs text-gray-500">Total JavaScript</div>
          </div>
          {metrics?.bundleSize ? (
            <div>
              <div
                className={`text-2xl font-bold ${metrics.bundleSize > BUNDLE_TARGETS.total ? 'text-red-600' : 'text-green-600'}`}
              >
                {formatValue(metrics.bundleSize, 'bytes')}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Target: &lt; {formatValue(BUNDLE_TARGETS.total, 'bytes')}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">No data</div>
          )}
        </div>
      </div>

      {/* Performance Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Alerts
          </h3>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-md border-l-4 ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-400'
                    : 'bg-yellow-50 border-yellow-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">
                      {alert.metric} exceeds threshold
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatValue(
                        alert.value,
                        alert.metric.includes('Bundle') ? 'bytes' : 'ms',
                      )}
                      {' > '}
                      {formatValue(
                        alert.threshold,
                        alert.metric.includes('Bundle') ? 'bytes' : 'ms',
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Trend Chart Placeholder */}
      {trends.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Performance Trends
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p>Performance trend visualization</p>
              <p className="text-sm">({trends.length} data points collected)</p>
              <p className="text-xs mt-2">
                In production, this would show interactive charts using
                libraries like Chart.js or Recharts
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>WS-145: Performance monitoring powered by Core Web Vitals</p>
        <p>
          Metrics updated every 30 seconds • Bundle analysis available via npm
          run analyze
        </p>
      </div>
    </div>
  );
}
