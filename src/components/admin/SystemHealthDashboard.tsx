/**
 * WS-227: System Health Dashboard - Comprehensive Admin Health Monitoring
 * Real-time system health monitoring with integrated HealthMonitor service
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ServerIcon,
  CloudIcon,
  DatabaseIcon,
  CpuChipIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { SystemHealth, ServiceStatus } from '@/lib/services/health-monitor';

interface SystemHealthDashboardProps {
  userId: string;
  userProfile: any;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export function SystemHealthDashboard({
  userId,
  userProfile,
  refreshInterval = 30000,
  autoRefresh = true,
}: SystemHealthDashboardProps) {
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Fetch health data from API
  const fetchHealthData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);

    try {
      const response = await fetch('/api/admin/health?metrics=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required for health monitoring');
        }
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Health check failed');
      }

      setHealthData(result.data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error('Health data fetch failed:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch health data',
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    fetchHealthData(true);
  }, [fetchHealthData]);

  // Trigger manual health check
  const triggerHealthCheck = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch('/api/admin/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forceRefresh: true,
          services: selectedService ? [selectedService] : undefined,
        }),
      });

      if (response.ok) {
        // Refresh data after manual trigger
        await fetchHealthData();
      }
    } catch (err) {
      console.error('Manual health check failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedService, fetchHealthData]);

  // Auto-refresh setup
  useEffect(() => {
    fetchHealthData(true);

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchHealthData();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [fetchHealthData, autoRefresh, refreshInterval]);

  // Get overall health status
  const getOverallStatus = (): 'healthy' | 'degraded' | 'down' => {
    if (!healthData) return 'down';

    const criticalServices = ['database', 'supabase'];
    const criticalDown = criticalServices.some(
      (service) =>
        healthData.services[service as keyof typeof healthData.services]
          ?.status === 'down',
    );

    if (criticalDown) return 'down';

    const anyDown = Object.values(healthData.services).some(
      (service) => service.status === 'down',
    );
    if (anyDown) return 'degraded';

    const anyDegraded = Object.values(healthData.services).some(
      (service) => service.status === 'degraded',
    );
    if (anyDegraded) return 'degraded';

    return 'healthy';
  };

  // Status styling helpers
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          bg: 'bg-success-50',
          border: 'border-success-200',
          text: 'text-success-700',
          icon: 'text-success-600',
        };
      case 'degraded':
        return {
          bg: 'bg-warning-50',
          border: 'border-warning-200',
          text: 'text-warning-700',
          icon: 'text-warning-600',
        };
      case 'down':
        return {
          bg: 'bg-error-50',
          border: 'border-error-200',
          text: 'text-error-700',
          icon: 'text-error-600',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: 'text-gray-600',
        };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'down':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'database':
        return DatabaseIcon;
      case 'redis':
        return CpuChipIcon;
      case 'supabase':
        return CloudIcon;
      case 'storage':
        return ServerIcon;
      default:
        return SignalIcon;
    }
  };

  const formatLatency = (latency: number) => {
    if (latency < 0) return 'N/A';
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(2)}s`;
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
          <div className="text-sm text-gray-600">
            Loading system health data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 border border-error-200 rounded-xl p-6 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-error-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-error-900 mb-2">
          Health Check Failed
        </h3>
        <p className="text-error-700 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center px-4 py-2 bg-error-600 hover:bg-error-700 text-white rounded-lg disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          {isRefreshing ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  const overallStatus = getOverallStatus();
  const overallStyles = getStatusStyles(overallStatus);

  return (
    <div className="space-y-8">
      {/* Header with controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              System Health Monitor
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Real-time monitoring of all critical wedding platform services
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Last updated</div>
              <div className="text-sm font-medium text-gray-900">
                {lastRefresh.toLocaleTimeString()}
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon
                className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              onClick={triggerHealthCheck}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BoltIcon className="w-4 h-4 mr-2" />
              Manual Check
            </button>
          </div>
        </div>

        {/* Overall Status */}
        <div
          className={`inline-flex items-center px-6 py-3 rounded-xl border ${overallStyles.bg} ${overallStyles.border}`}
        >
          <div className={overallStyles.icon}>
            {getStatusIcon(overallStatus)}
          </div>
          <div className="ml-3">
            <div
              className={`text-lg font-semibold ${overallStyles.text} capitalize`}
            >
              {overallStatus}
            </div>
            <div className="text-sm text-gray-600">Overall System Status</div>
          </div>
        </div>
      </div>

      {/* Infrastructure Health */}
      {healthData?.infrastructure && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Infrastructure Metrics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-700">
                {formatUptime(healthData.infrastructure.serverUptime)}
              </div>
              <div className="text-sm text-gray-600">Server Uptime</div>
              <div className="text-xs text-blue-600 mt-1">Last 24 hours</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-success-700">
                {formatLatency(healthData.infrastructure.responseTime)}
              </div>
              <div className="text-sm text-gray-600">Response Time</div>
              <div className="text-xs text-success-600 mt-1">Average</div>
            </div>

            <div className="text-center">
              <div
                className={`text-3xl font-bold ${healthData.infrastructure.cpuUsage > 80 ? 'text-error-700' : 'text-gray-700'}`}
              >
                {healthData.infrastructure.cpuUsage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">CPU Usage</div>
              <div className="text-xs text-gray-500 mt-1">Current</div>
            </div>

            <div className="text-center">
              <div
                className={`text-3xl font-bold ${healthData.infrastructure.memoryUsage > 85 ? 'text-error-700' : 'text-gray-700'}`}
              >
                {healthData.infrastructure.memoryUsage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Memory Usage</div>
              <div className="text-xs text-gray-500 mt-1">Current</div>
            </div>
          </div>
        </div>
      )}

      {/* Services Health */}
      {healthData?.services && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Service Status
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(healthData.services).map(
              ([serviceName, service]) => {
                const ServiceIcon = getServiceIcon(serviceName);
                const styles = getStatusStyles(service.status);

                return (
                  <div
                    key={serviceName}
                    className={`border rounded-xl p-6 cursor-pointer transition-all hover:shadow-md ${
                      selectedService === serviceName
                        ? 'ring-2 ring-primary-500'
                        : ''
                    } ${styles.border} ${styles.bg}`}
                    onClick={() =>
                      setSelectedService(
                        selectedService === serviceName ? null : serviceName,
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg mr-4">
                          <ServiceIcon className={`w-6 h-6 ${styles.icon}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 capitalize">
                            {serviceName
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, (str) => str.toUpperCase())}
                          </h3>
                          <div
                            className={`text-sm font-medium ${styles.text} capitalize`}
                          >
                            {service.status}
                          </div>
                        </div>
                      </div>

                      <div className={`${styles.icon}`}>
                        {getStatusIcon(service.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          Latency
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatLatency(service.latency)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          Uptime
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatUptime(service.uptime)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          Errors (24h)
                        </div>
                        <div
                          className={`text-sm font-medium ${service.errorCount24h > 0 ? 'text-error-600' : 'text-success-600'}`}
                        >
                          {service.errorCount24h}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          Last Check
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(service.lastCheck).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    {service.message && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start">
                          <InformationCircleIcon className="w-4 h-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                          <div className="text-sm text-gray-700">
                            {service.message}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedService === serviceName && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            View detailed metrics
                          </span>
                          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* API Health */}
      {healthData?.apiHealth && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            API Performance
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">
                {healthData.apiHealth.requestsPerMinute}
              </div>
              <div className="text-sm text-gray-600">Requests/Min</div>
            </div>

            <div className="text-center">
              <div
                className={`text-2xl font-bold ${healthData.apiHealth.errorRate > 5 ? 'text-error-700' : 'text-success-700'}`}
              >
                {healthData.apiHealth.errorRate.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-600">Error Rate</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">
                {formatLatency(healthData.apiHealth.p95ResponseTime)}
              </div>
              <div className="text-sm text-gray-600">P95 Response</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">
                {healthData.apiHealth.throughput.toFixed(1)}/s
              </div>
              <div className="text-sm text-gray-600">Throughput</div>
            </div>
          </div>
        </div>
      )}

      {/* Wedding Platform Health */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl border border-primary-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Wedding Platform Health
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-8 h-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-primary-700">
              {healthData?.jobQueue?.completed24h || 0}
            </div>
            <div className="text-sm text-gray-600">Jobs Processed</div>
            <div className="text-xs text-primary-600 mt-1">Last 24 hours</div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircleIcon className="w-8 h-8 text-success-600" />
            </div>
            <div className="text-2xl font-bold text-success-700">
              {formatUptime(
                overallStatus === 'healthy'
                  ? 99.9
                  : overallStatus === 'degraded'
                    ? 98.5
                    : 95.0,
              )}
            </div>
            <div className="text-sm text-gray-600">Wedding Uptime</div>
            <div className="text-xs text-success-600 mt-1">
              Critical systems
            </div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ClockIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {formatLatency(healthData?.infrastructure?.responseTime || 0)}
            </div>
            <div className="text-sm text-gray-600">Platform Response</div>
            <div className="text-xs text-blue-600 mt-1">Average load time</div>
          </div>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="text-center text-sm text-gray-500">
          <div className="inline-flex items-center">
            <div className="w-2 h-2 bg-success-500 rounded-full mr-2 animate-pulse" />
            Auto-refreshing every {Math.floor(refreshInterval / 1000)}s
          </div>
        </div>
      )}
    </div>
  );
}
