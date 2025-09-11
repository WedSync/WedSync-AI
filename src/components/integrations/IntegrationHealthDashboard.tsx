/**
 * WS-165: Integration Health Monitoring Dashboard
 * Real-time monitoring of payment calendar integration services
 * Team C Integration Implementation - Untitled UI Design System
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  AlertCircle,
  Zap,
  Database,
  Mail,
  CreditCard,
  BarChart3,
} from 'lucide-react';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import {
  IntegrationHealthDashboard,
  ServiceHealthStatus,
  PaymentCalendarSyncResult,
} from '@/lib/integrations/payment-calendar-orchestrator';

interface IntegrationHealthDashboardProps {
  weddingId: string;
  refreshInterval?: number;
  className?: string;
}

export function IntegrationHealthDashboard({
  weddingId,
  refreshInterval = 30000, // 30 seconds
  className = '',
}: IntegrationHealthDashboardProps) {
  const [dashboardData, setDashboardData] =
    useState<IntegrationHealthDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setError(null);
      const response = await fetch(
        `/api/integrations/health-dashboard?weddingId=${weddingId}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data: IntegrationHealthDashboard = await response.json();
      setDashboardData(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [weddingId, refreshInterval, autoRefresh]);

  // Manual refresh
  const handleManualRefresh = () => {
    setLoading(true);
    fetchDashboardData();
  };

  // Get service icon
  const getServiceIcon = (serviceName: string) => {
    const icons = {
      PaymentCalendarOrchestrator: Activity,
      NotificationService: Mail,
      BudgetIntegration: BarChart3,
      CashFlowCalculator: TrendingUp,
      VendorPaymentSync: CreditCard,
    };
    return icons[serviceName as keyof typeof icons] || Database;
  };

  // Get status color classes
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          bg: 'bg-success-50',
          text: 'text-success-700',
          border: 'border-success-200',
          icon: 'text-success-500',
        };
      case 'degraded':
        return {
          bg: 'bg-warning-50',
          text: 'text-warning-700',
          border: 'border-warning-200',
          icon: 'text-warning-500',
        };
      case 'unhealthy':
        return {
          bg: 'bg-error-50',
          text: 'text-error-700',
          border: 'border-error-200',
          icon: 'text-error-500',
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: 'text-gray-500',
        };
    }
  };

  if (loading && !dashboardData) {
    return (
      <div
        className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div
        className={`bg-white rounded-xl border border-error-200 p-6 ${className}`}
      >
        <div className="flex items-center space-x-3 text-error-700 mb-4">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Dashboard Error</h3>
        </div>
        <p className="text-error-600 mb-4">{error}</p>
        <ShimmerButton onClick={handleManualRefresh} className="shadow-2xl">
          <RefreshCw className="w-4 h-4 mr-2" />
          <span className="whitespace-pre-wrap text-center text-sm font-medium">
            Retry Loading
          </span>
        </ShimmerButton>
      </div>
    );
  }

  const overallStatusColor = getStatusColor(
    dashboardData?.overallHealth || 'unhealthy',
  );
  const healthyServices =
    dashboardData?.services.filter((s) => s.status === 'healthy').length || 0;
  const totalServices = dashboardData?.services.length || 0;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-xs ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 ${overallStatusColor.bg} ${overallStatusColor.border} border rounded-xl flex items-center justify-center`}
            >
              {dashboardData?.overallHealth === 'healthy' ? (
                <CheckCircle className={`w-6 h-6 ${overallStatusColor.icon}`} />
              ) : dashboardData?.overallHealth === 'degraded' ? (
                <AlertTriangle
                  className={`w-6 h-6 ${overallStatusColor.icon}`}
                />
              ) : (
                <AlertCircle className={`w-6 h-6 ${overallStatusColor.icon}`} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Integration Health Dashboard
              </h2>
              <p className="text-sm text-gray-600">
                {healthyServices}/{totalServices} services healthy • Last
                updated {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                autoRefresh
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Clock className="w-3 h-3 mr-1 inline" />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-lg border border-gray-200 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3 h-3 mr-1 inline ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Response Time
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {Math.round(
                    dashboardData?.performanceMetrics.averageResponseTime || 0,
                  )}
                  ms
                </p>
              </div>
              <Zap className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Success Rate
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {Math.round(
                    dashboardData?.performanceMetrics.successRate || 0,
                  )}
                  %
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Delivery Rate
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {Math.round(
                    dashboardData?.performanceMetrics
                      .notificationDeliveryRate || 0,
                  )}
                  %
                </p>
              </div>
              <Mail className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Accuracy</p>
                <p className="text-lg font-semibold text-gray-900">
                  {Math.round(
                    dashboardData?.performanceMetrics.cashFlowAccuracy || 0,
                  )}
                  %
                </p>
              </div>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Service Status List */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Service Status
        </h3>
        <div className="space-y-3">
          {dashboardData?.services.map((service: ServiceHealthStatus) => {
            const statusColor = getStatusColor(service.status);
            const ServiceIcon = getServiceIcon(service.serviceName);

            return (
              <div
                key={service.serviceName}
                className={`flex items-center justify-between p-4 ${statusColor.bg} ${statusColor.border} border rounded-xl transition-all duration-200 hover:shadow-sm`}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-10 h-10 ${statusColor.bg} ${statusColor.border} border rounded-lg flex items-center justify-center`}
                  >
                    <ServiceIcon className={`w-5 h-5 ${statusColor.icon}`} />
                  </div>

                  <div>
                    <h4 className={`font-medium ${statusColor.text}`}>
                      {service.serviceName.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <span>Response: {service.responseTime}ms</span>
                      <span>Uptime: {service.uptime.toFixed(1)}%</span>
                      <span>
                        Last check: {service.lastCheck.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}
                  >
                    {service.status.charAt(0).toUpperCase() +
                      service.status.slice(1)}
                  </span>

                  {service.status === 'healthy' ? (
                    <CheckCircle className={`w-4 h-4 ${statusColor.icon}`} />
                  ) : service.status === 'degraded' ? (
                    <AlertTriangle className={`w-4 h-4 ${statusColor.icon}`} />
                  ) : (
                    <AlertCircle className={`w-4 h-4 ${statusColor.icon}`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Sync Results */}
      {dashboardData?.recentSyncResults &&
        dashboardData.recentSyncResults.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Sync Results
            </h3>
            <div className="space-y-2">
              {dashboardData.recentSyncResults
                .slice(0, 5)
                .map((result: PaymentCalendarSyncResult, index: number) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      result.success
                        ? 'bg-success-50 border-success-200'
                        : 'bg-error-50 border-error-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-success-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-error-500" />
                      )}

                      <div>
                        <p
                          className={`text-sm font-medium ${
                            result.success
                              ? 'text-success-700'
                              : 'text-error-700'
                          }`}
                        >
                          Sync {result.success ? 'Completed' : 'Failed'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {result.totalEvents} events • {result.errors.length}{' '}
                          errors
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      {result.nextSyncAt.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 rounded-b-xl border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>WedSync Payment Calendar Integration v2.0</span>
          <span>
            Next auto-refresh in {Math.round(refreshInterval / 1000)}s
          </span>
        </div>
      </div>
    </div>
  );
}
