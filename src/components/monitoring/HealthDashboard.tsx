'use client';

import { useState, useEffect } from 'react';
import { useHealthMetrics } from '@/hooks/useHealthMetrics';

interface HealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  lastChecked?: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: HealthStatus[];
  system: {
    memory: {
      used: number;
      total: number;
      rss: number;
      unit: string;
    };
    cpu: {
      user: number;
      system: number;
      unit: string;
    };
  };
  uptime: number;
  responseTime: number;
}

export function HealthDashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);

  // Fetch health data
  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/health?detailed=true');
      const data = await response.json();

      if (response.ok) {
        setHealthData(data);
        setError(null);
        setConnected(true);
      } else {
        throw new Error(data.message || 'Health check failed');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch health data',
      );
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    fetchHealthData();
  };

  // Initial load and refresh interval
  useEffect(() => {
    fetchHealthData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  if (error && !healthData) {
    return (
      <div className="bg-white rounded-xl border border-error-200 p-6 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-error-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-error-800">
              System Health Monitoring Error
            </h3>
            <p className="mt-1 text-sm text-error-600">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="ml-auto flex-shrink-0 px-4 py-2.5 bg-error-600 hover:bg-error-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-error-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'degraded':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'unhealthy':
        return 'text-error-600 bg-error-50 border-error-200';
    }
  };

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'degraded':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'unhealthy':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div
            className={`h-3 w-3 rounded-full ${connected ? 'bg-success-400 animate-pulse' : 'bg-error-400'}`}
          ></div>
          <span className="text-sm text-gray-500">
            {connected ? 'Health monitoring active' : 'Monitoring disconnected'}
          </span>
          {healthData?.timestamp && (
            <span className="text-xs text-gray-400">
              • Last updated{' '}
              {new Date(healthData.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Refresh Controls */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-xs hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Overall Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">System Status</p>
              <div className="mt-2 flex items-center">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    healthData
                      ? getStatusColor(healthData.status)
                      : 'text-gray-600 bg-gray-50 border-gray-200'
                  }`}
                >
                  {healthData ? getStatusIcon(healthData.status) : null}
                  <span className="ml-1 capitalize">
                    {healthData?.status || 'Unknown'}
                  </span>
                </span>
              </div>
            </div>
            <div
              className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                healthData?.status === 'healthy'
                  ? 'bg-success-50'
                  : healthData?.status === 'degraded'
                    ? 'bg-warning-50'
                    : healthData?.status === 'unhealthy'
                      ? 'bg-error-50'
                      : 'bg-gray-50'
              }`}
            >
              <svg
                className={`h-6 w-6 ${
                  healthData?.status === 'healthy'
                    ? 'text-success-600'
                    : healthData?.status === 'degraded'
                      ? 'text-warning-600'
                      : healthData?.status === 'unhealthy'
                        ? 'text-error-600'
                        : 'text-gray-400'
                }`}
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
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              Response Time: {healthData?.responseTime || 0}ms
            </p>
          </div>
        </div>

        {/* Uptime Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">System Uptime</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {healthData ? formatUptime(healthData.uptime) : '0m'}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-blue-600"
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
          <div className="mt-4">
            <p className="text-xs text-gray-500">Since last restart</p>
          </div>
        </div>

        {/* Memory Usage Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Memory Usage</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {healthData?.system.memory.used || 0}
                <span className="text-lg text-gray-500 ml-1">
                  {healthData?.system.memory.unit || 'MB'}
                </span>
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: healthData?.system.memory
                    ? `${Math.min(100, (healthData.system.memory.used / healthData.system.memory.total) * 100)}%`
                    : '0%',
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {healthData?.system.memory.used || 0} /{' '}
              {healthData?.system.memory.total || 0}{' '}
              {healthData?.system.memory.unit || 'MB'}
            </p>
          </div>
        </div>

        {/* CPU Usage Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">CPU Usage</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {Math.round(
                  ((healthData?.system.cpu.user || 0) +
                    (healthData?.system.cpu.system || 0)) /
                    1000,
                )}
                <span className="text-lg text-gray-500 ml-1">ms</span>
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-orange-600"
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
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              User: {Math.round((healthData?.system.cpu.user || 0) / 1000)}ms •
              System: {Math.round((healthData?.system.cpu.system || 0) / 1000)}
              ms
            </p>
          </div>
        </div>
      </div>

      {/* Service Health Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Service Health Checks
          </h3>
          <div className="flex items-center space-x-2">
            <div
              className={`h-2 w-2 rounded-full ${connected ? 'bg-success-400 animate-pulse' : 'bg-gray-300'}`}
            ></div>
            <span className="text-sm text-gray-500">Real-time monitoring</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg animate-pulse"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : healthData?.services?.length > 0 ? (
          <div className="space-y-3">
            {healthData.services.map((service, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      service.status === 'healthy'
                        ? 'bg-success-100 text-success-600'
                        : service.status === 'degraded'
                          ? 'bg-warning-100 text-warning-600'
                          : 'bg-error-100 text-error-600'
                    }`}
                  >
                    {getStatusIcon(service.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {service.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {service.error
                        ? service.error
                        : service.responseTime
                          ? `Response: ${service.responseTime}ms`
                          : 'Service operational'}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(service.status)}`}
                >
                  <span className="capitalize">{service.status}</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No service data
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Service health checks will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => window.open('/api/health/database', '_blank')}
            className="flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
              />
            </svg>
            Database Health
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Force Refresh
          </button>
          <button
            onClick={() => {
              const data = JSON.stringify(healthData, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `health-report-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
}
