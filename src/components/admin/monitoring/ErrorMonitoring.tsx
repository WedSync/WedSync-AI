'use client';

import { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  BoltIcon,
  FireIcon,
  ShieldExclamationIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface ErrorMonitoringProps {
  userId: string;
  userProfile: any;
  isRefreshing: boolean;
  lastRefresh: Date;
}

interface ErrorEvent {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  stackTrace?: string;
  userContext?: {
    userId?: string;
    sessionId: string;
    userAgent: string;
    weddingId?: string;
  };
  weddingContext?: {
    weddingDate?: string;
    supplierType?: string;
    bookingStage?: string;
    criticalPath?: boolean;
  };
  frequency: number;
  resolved: boolean;
  assignee?: string;
}

interface ErrorTrend {
  date: string;
  errors: number;
  warnings: number;
  criticalErrors: number;
}

export function ErrorMonitoring({
  userId,
  userProfile,
  isRefreshing,
  lastRefresh,
}: ErrorMonitoringProps) {
  const [errorEvents, setErrorEvents] = useState<ErrorEvent[]>([]);
  const [errorTrends, setErrorTrends] = useState<ErrorTrend[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24h');

  useEffect(() => {
    fetchErrorData();
  }, [lastRefresh, selectedSeverity, selectedTimeframe]);

  const fetchErrorData = async () => {
    // Mock error data - In production, integrate with Sentry or similar service
    const mockErrors: ErrorEvent[] = [
      {
        id: 'err_001',
        timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
        level: 'error',
        message: 'Payment processing failed for wedding booking',
        source: 'Payment API',
        frequency: 3,
        resolved: false,
        userContext: {
          sessionId: 'sess_abc123',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          weddingId: 'wedding_456',
        },
        weddingContext: {
          weddingDate: '2024-08-15',
          supplierType: 'Photography',
          bookingStage: 'Payment',
          criticalPath: true,
        },
        stackTrace:
          'StripeError: Your card was declined.\n    at Payment.process (payment.ts:45)\n    at BookingController.confirm (booking.ts:123)',
      },
      {
        id: 'err_002',
        timestamp: new Date(Date.now() - 15 * 60000), // 15 minutes ago
        level: 'warning',
        message: 'Slow database query detected in venue search',
        source: 'Database Monitor',
        frequency: 12,
        resolved: false,
        userContext: {
          sessionId: 'sess_def456',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        weddingContext: {
          supplierType: 'Venue',
          bookingStage: 'Discovery',
          criticalPath: false,
        },
      },
      {
        id: 'err_003',
        timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
        level: 'error',
        message: 'Email delivery failed for booking confirmation',
        source: 'Email Service',
        frequency: 1,
        resolved: true,
        assignee: 'dev@wedsync.com',
        userContext: {
          sessionId: 'sess_ghi789',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          weddingId: 'wedding_789',
        },
        weddingContext: {
          weddingDate: '2024-06-20',
          supplierType: 'Catering',
          bookingStage: 'Confirmation',
          criticalPath: true,
        },
      },
    ];

    const mockTrends: ErrorTrend[] = [
      { date: '2024-01-20', errors: 5, warnings: 12, criticalErrors: 2 },
      { date: '2024-01-21', errors: 3, warnings: 8, criticalErrors: 0 },
      { date: '2024-01-22', errors: 7, warnings: 15, criticalErrors: 1 },
      { date: '2024-01-23', errors: 4, warnings: 10, criticalErrors: 1 },
      { date: '2024-01-24', errors: 6, warnings: 11, criticalErrors: 2 },
    ];

    setErrorEvents(mockErrors);
    setErrorTrends(mockTrends);
  };

  const getErrorLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'warning':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getErrorLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircleIcon className="w-5 h-5" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5" />;
      default:
        return <ExclamationCircleIcon className="w-5 h-5" />;
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

  const filteredErrors = errorEvents.filter((error) => {
    if (selectedSeverity === 'all') return true;
    return error.level === selectedSeverity;
  });

  const criticalErrors = errorEvents.filter(
    (e) => e.level === 'error' && e.weddingContext?.criticalPath,
  ).length;
  const totalErrors = errorEvents.filter((e) => e.level === 'error').length;
  const totalWarnings = errorEvents.filter((e) => e.level === 'warning').length;
  const resolvedCount = errorEvents.filter((e) => e.resolved).length;

  return (
    <div className="space-y-8">
      {/* Error Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Critical Errors
              </p>
              <p className="text-3xl font-bold text-error-700 mt-1">
                {criticalErrors}
              </p>
              <p className="text-sm text-error-600 mt-1">Wedding-impacting</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-error-100 rounded-lg">
              <FireIcon className="w-6 h-6 text-error-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Errors</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {totalErrors}
              </p>
              <p className="text-sm text-gray-600 mt-1">Last 24 hours</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
              <XCircleIcon className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Warnings</p>
              <p className="text-3xl font-bold text-warning-700 mt-1">
                {totalWarnings}
              </p>
              <p className="text-sm text-warning-600 mt-1">
                Performance issues
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-warning-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Resolution Rate
              </p>
              <p className="text-3xl font-bold text-success-700 mt-1">
                {errorEvents.length > 0
                  ? Math.round((resolvedCount / errorEvents.length) * 100)
                  : 0}
                %
              </p>
              <p className="text-sm text-success-600 mt-1">
                {resolvedCount} resolved
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-success-100 rounded-lg">
              <ShieldExclamationIcon className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Error Trend Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Error Trends
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Daily error patterns and resolution progress
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">5-day trend</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {errorTrends.map((trend, index) => (
            <div key={trend.date} className="text-center">
              <div className="text-xs text-gray-500 mb-2">
                {new Date(trend.date).toLocaleDateString('en-GB', {
                  weekday: 'short',
                })}
              </div>
              <div className="space-y-1">
                <div
                  className={`h-8 bg-error-200 rounded flex items-end justify-center text-xs font-medium text-error-700`}
                >
                  {trend.criticalErrors > 0 && trend.criticalErrors}
                </div>
                <div
                  className={`h-12 bg-error-100 rounded flex items-end justify-center text-xs font-medium text-error-600`}
                >
                  {trend.errors > 0 && trend.errors}
                </div>
                <div
                  className={`h-8 bg-warning-100 rounded flex items-end justify-center text-xs font-medium text-warning-600`}
                >
                  {trend.warnings > 0 && trend.warnings}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(trend.date).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-error-200 rounded"></div>
            <span className="text-gray-600">Critical</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-error-100 rounded"></div>
            <span className="text-gray-600">Errors</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-warning-100 rounded"></div>
            <span className="text-gray-600">Warnings</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Severity:
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            >
              <option value="all">All Levels</option>
              <option value="error">Errors Only</option>
              <option value="warning">Warnings Only</option>
              <option value="info">Info Only</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Time:
            </label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Showing {filteredErrors.length} of {errorEvents.length} events
        </div>
      </div>

      {/* Error Events List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Error Events
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredErrors.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No errors found
              </h4>
              <p className="text-gray-600">
                All systems operating normally for the selected filters.
              </p>
            </div>
          ) : (
            filteredErrors.map((error) => (
              <div key={error.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getErrorLevelColor(error.level)}`}
                    >
                      {getErrorLevelIcon(error.level)}
                      <span className="ml-1 capitalize">{error.level}</span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {error.message}
                        </h4>
                        {error.weddingContext?.criticalPath && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-error-100 text-error-700">
                            <FireIcon className="w-3 h-3 mr-1" />
                            Critical Path
                          </span>
                        )}
                        {error.frequency > 1 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                            {error.frequency}x
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                        <span>{error.source}</span>
                        <span>•</span>
                        <span>{formatTimestamp(error.timestamp)}</span>
                        {error.userContext?.weddingId && (
                          <>
                            <span>•</span>
                            <span>Wedding: {error.userContext.weddingId}</span>
                          </>
                        )}
                      </div>

                      {error.weddingContext && (
                        <div className="p-3 bg-primary-50 rounded-lg border border-primary-200 mb-3">
                          <div className="text-xs text-primary-600 font-medium mb-2">
                            Wedding Context:
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {error.weddingContext.weddingDate && (
                              <div>
                                <span className="text-primary-600 font-medium">
                                  Date:
                                </span>
                                <span className="text-primary-700 ml-1">
                                  {error.weddingContext.weddingDate}
                                </span>
                              </div>
                            )}
                            {error.weddingContext.supplierType && (
                              <div>
                                <span className="text-primary-600 font-medium">
                                  Supplier:
                                </span>
                                <span className="text-primary-700 ml-1">
                                  {error.weddingContext.supplierType}
                                </span>
                              </div>
                            )}
                            {error.weddingContext.bookingStage && (
                              <div>
                                <span className="text-primary-600 font-medium">
                                  Stage:
                                </span>
                                <span className="text-primary-700 ml-1">
                                  {error.weddingContext.bookingStage}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-primary-600 font-medium">
                                Priority:
                              </span>
                              <span
                                className={`ml-1 ${error.weddingContext.criticalPath ? 'text-error-700 font-semibold' : 'text-primary-700'}`}
                              >
                                {error.weddingContext.criticalPath
                                  ? 'Critical'
                                  : 'Normal'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {error.stackTrace && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                            Show stack trace
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                            {error.stackTrace}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {error.resolved ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                        ✓ Resolved
                      </span>
                    ) : (
                      <button className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors">
                        Mark Resolved
                      </button>
                    )}
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
