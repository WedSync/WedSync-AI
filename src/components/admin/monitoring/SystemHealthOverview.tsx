'use client';

import { useState, useEffect } from 'react';
import {
  ServerIcon,
  CloudIcon,
  DatabaseIcon,
  CpuChipIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface SystemHealthOverviewProps {
  userId: string;
  userProfile: any;
  isRefreshing: boolean;
  lastRefresh: Date;
}

interface HealthMetric {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  value: string;
  description: string;
  icon: React.ComponentType<any>;
  details?: {
    uptime: string;
    responseTime?: string;
    throughput?: string;
    errors?: number;
  };
  weddingContext?: string;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  source: string;
  weddingImpact?: string;
}

export function SystemHealthOverview({
  userId,
  userProfile,
  isRefreshing,
  lastRefresh,
}: SystemHealthOverviewProps) {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [overallHealth, setOverallHealth] = useState<
    'healthy' | 'warning' | 'critical'
  >('healthy');

  useEffect(() => {
    fetchSystemHealth();
  }, [lastRefresh]);

  const fetchSystemHealth = async () => {
    // Simulate API call - In production, this would fetch real metrics
    const mockMetrics: HealthMetric[] = [
      {
        id: 'database',
        name: 'Database',
        status: 'healthy',
        value: 'PostgreSQL 15',
        description: 'Supabase database cluster',
        icon: DatabaseIcon,
        details: {
          uptime: '99.9%',
          responseTime: '12ms',
          throughput: '450 queries/min',
          errors: 0,
        },
        weddingContext: 'Client data, vendor profiles, booking management',
      },
      {
        id: 'api_server',
        name: 'API Server',
        status: 'healthy',
        value: 'Next.js 15',
        description: 'Application server cluster',
        icon: ServerIcon,
        details: {
          uptime: '99.8%',
          responseTime: '85ms',
          throughput: '1,200 req/min',
          errors: 2,
        },
        weddingContext: 'Couple onboarding, supplier management, booking flows',
      },
      {
        id: 'cdn',
        name: 'CDN & Assets',
        status: 'healthy',
        value: 'Vercel Edge',
        description: 'Content delivery network',
        icon: CloudIcon,
        details: {
          uptime: '99.99%',
          responseTime: '32ms',
          throughput: '3,500 req/min',
          errors: 0,
        },
        weddingContext: 'Photo galleries, venue images, portfolio displays',
      },
      {
        id: 'background_jobs',
        name: 'Background Jobs',
        status: 'warning',
        value: 'Queue Processing',
        description: 'Automated task processing',
        icon: CpuChipIcon,
        details: {
          uptime: '98.2%',
          responseTime: '2.3s',
          throughput: '45 jobs/min',
          errors: 8,
        },
        weddingContext:
          'Email notifications, payment processing, calendar syncing',
      },
      {
        id: 'monitoring',
        name: 'Monitoring',
        status: 'healthy',
        value: 'Sentry + Analytics',
        description: 'Error tracking and performance monitoring',
        icon: SignalIcon,
        details: {
          uptime: '100%',
          responseTime: '5ms',
          throughput: '2,800 events/min',
          errors: 0,
        },
        weddingContext:
          'User experience tracking, error detection, performance insights',
      },
    ];

    const mockAlerts: SystemAlert[] = [
      {
        id: '1',
        type: 'warning',
        message: 'Background job queue showing increased processing time',
        timestamp: new Date(Date.now() - 15 * 60000), // 15 minutes ago
        source: 'Queue Monitor',
        weddingImpact: 'Email notifications may be delayed by up to 5 minutes',
      },
      {
        id: '2',
        type: 'info',
        message: 'Database maintenance window scheduled for this weekend',
        timestamp: new Date(Date.now() - 2 * 60 * 60000), // 2 hours ago
        source: 'Supabase',
        weddingImpact: 'Brief service interruption on Sunday 2-3 AM GMT',
      },
    ];

    setHealthMetrics(mockMetrics);
    setSystemAlerts(mockAlerts);

    // Calculate overall health
    const hasErrors = mockMetrics.some((m) => m.status === 'critical');
    const hasWarnings = mockMetrics.some((m) => m.status === 'warning');

    if (hasErrors) setOverallHealth('critical');
    else if (hasWarnings) setOverallHealth('warning');
    else setOverallHealth('healthy');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'warning':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'critical':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'maintenance':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-5 h-5 text-success-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-warning-600" />;
      case 'critical':
        return <ExclamationTriangleIcon className="w-5 h-5 text-error-600" />;
      case 'maintenance':
        return <ClockIcon className="w-5 h-5 text-blue-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      {/* Overall Health Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Overall System Health
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Real-time status of all critical systems
            </p>
          </div>
          <div
            className={`inline-flex items-center px-4 py-2 rounded-lg border ${getStatusColor(overallHealth)}`}
          >
            {getStatusIcon(overallHealth)}
            <span className="ml-2 font-medium capitalize">{overallHealth}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-success-700">99.8%</div>
            <div className="text-sm text-gray-600">Average Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-700">1.2k</div>
            <div className="text-sm text-gray-600">Active Wedding Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-700">5</div>
            <div className="text-sm text-gray-600">Services Monitored</div>
          </div>
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {healthMetrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.id}
              className="bg-white rounded-xl border border-gray-200 shadow-xs p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mr-4">
                    <Icon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {metric.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {metric.description}
                    </p>
                  </div>
                </div>
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-lg border ${getStatusColor(metric.status)}`}
                >
                  {getStatusIcon(metric.status)}
                  <span className="ml-2 text-sm font-medium capitalize">
                    {metric.status}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Current Status:
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {metric.value}
                </div>
              </div>

              {metric.details && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Uptime
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {metric.details.uptime}
                    </div>
                  </div>
                  {metric.details.responseTime && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        Response Time
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {metric.details.responseTime}
                      </div>
                    </div>
                  )}
                  {metric.details.throughput && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        Throughput
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {metric.details.throughput}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Errors (24h)
                    </div>
                    <div
                      className={`text-sm font-medium ${metric.details.errors === 0 ? 'text-success-600' : 'text-error-600'}`}
                    >
                      {metric.details.errors}
                    </div>
                  </div>
                </div>
              )}

              {metric.weddingContext && (
                <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                  <div className="text-xs text-primary-600 font-medium mb-1">
                    Wedding Industry Context:
                  </div>
                  <div className="text-sm text-primary-700">
                    {metric.weddingContext}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* System Alerts */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent System Alerts
        </h3>

        {systemAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="w-12 h-12 text-success-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              All Systems Normal
            </h4>
            <p className="text-gray-600">
              No alerts in the last 24 hours. Wedding operations running
              smoothly.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {systemAlerts.map((alert) => (
              <div
                key={alert.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                        alert.type === 'error'
                          ? 'bg-error-500'
                          : alert.type === 'warning'
                            ? 'bg-warning-500'
                            : 'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span
                          className={`text-sm font-medium ${
                            alert.type === 'error'
                              ? 'text-error-700'
                              : alert.type === 'warning'
                                ? 'text-warning-700'
                                : 'text-blue-700'
                          }`}
                        >
                          {alert.type.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {alert.source}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-2">
                        {alert.message}
                      </p>
                      {alert.weddingImpact && (
                        <div className="p-2 bg-amber-50 rounded border border-amber-200">
                          <div className="text-xs text-amber-600 font-medium mb-1">
                            Wedding Impact:
                          </div>
                          <div className="text-sm text-amber-700">
                            {alert.weddingImpact}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimestamp(alert.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wedding-Specific Health Indicators */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl border border-primary-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Wedding Operations Health
        </h3>
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
            <div className="text-2xl font-bold text-primary-700">147</div>
            <div className="text-sm text-gray-600">Active Weddings</div>
            <div className="text-xs text-primary-600 mt-1">Next 6 months</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-8 h-8 text-success-600"
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
            <div className="text-2xl font-bold text-success-700">98.5%</div>
            <div className="text-sm text-gray-600">Booking Success Rate</div>
            <div className="text-xs text-success-600 mt-1">Last 30 days</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-8 h-8 text-blue-600"
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
            <div className="text-2xl font-bold text-blue-700">2.1s</div>
            <div className="text-sm text-gray-600">Avg Page Load</div>
            <div className="text-xs text-blue-600 mt-1">Wedding galleries</div>
          </div>
        </div>
      </div>
    </div>
  );
}
