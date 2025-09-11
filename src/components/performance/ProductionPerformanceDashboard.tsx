'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CpuChipIcon,
  CloudArrowUpIcon,
  BellIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  WifiIcon,
  SignalIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import {
  PerformanceBudgetEnforcer,
  PerformanceBudget,
  BudgetAlert,
} from '@/lib/performance/performance-budget-enforcer';

interface ProductionPerformanceDashboardProps {
  className?: string;
  onMetricsUpdate?: (metrics: any) => void;
}

export const ProductionPerformanceDashboard: React.FC<
  ProductionPerformanceDashboardProps
> = ({ className, onMetricsUpdate }) => {
  const [budgetStatus, setBudgetStatus] = useState<{
    budget: PerformanceBudget;
    violations: BudgetAlert[];
    overallHealth: 'healthy' | 'warning' | 'critical';
  } | null>(null);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    '1h' | '6h' | '24h'
  >('1h');

  // Initialize performance budget enforcer
  const [budgetEnforcer] = useState(() => {
    return typeof window !== 'undefined'
      ? new PerformanceBudgetEnforcer()
      : null;
  });

  // Update budget status
  const updateBudgetStatus = useCallback(() => {
    if (!budgetEnforcer) return;

    const status = budgetEnforcer.getBudgetStatus();
    setBudgetStatus(status);
    setLastUpdate(new Date());

    if (onMetricsUpdate) {
      onMetricsUpdate(status);
    }
  }, [budgetEnforcer, onMetricsUpdate]);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (!budgetEnforcer) return;

    if (isMonitoring) {
      budgetEnforcer.stopMonitoring();
      setIsMonitoring(false);
    } else {
      budgetEnforcer.startMonitoring();
      setIsMonitoring(true);
      updateBudgetStatus();
    }
  }, [budgetEnforcer, isMonitoring, updateBudgetStatus]);

  // Acknowledge violation
  const acknowledgeViolation = useCallback(
    (alertId: string) => {
      if (!budgetEnforcer) return;

      budgetEnforcer.acknowledgeViolation(alertId);
      updateBudgetStatus();
    },
    [budgetEnforcer, updateBudgetStatus],
  );

  // Auto-refresh when monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(updateBudgetStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [isMonitoring, updateBudgetStatus]);

  // Get health color
  const getHealthColor = (health: string) => {
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

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Format bytes to KB/MB
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (!budgetEnforcer) {
    return (
      <div className={cn('p-6 text-center text-gray-500', className)}>
        Performance monitoring not available in server environment
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Production Performance Dashboard
          </h2>
          <p className="text-gray-600">
            Real-time performance monitoring and budget enforcement
          </p>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <DevicePhoneMobileIcon className="w-4 h-4" />
            <span>Optimized for wedding suppliers on mobile</span>
            <WifiIcon className="w-4 h-4 ml-2" />
            <span>3G connectivity targets</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
          </select>

          <Button
            onClick={updateBudgetStatus}
            variant="outline"
            size="sm"
            disabled={!isMonitoring}
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button
            onClick={toggleMonitoring}
            variant={isMonitoring ? 'destructive' : 'default'}
            size="sm"
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card
        className={cn(
          'border-2',
          budgetStatus
            ? getHealthColor(budgetStatus.overallHealth)
            : 'border-gray-200',
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {budgetStatus?.overallHealth === 'healthy' && (
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            )}
            {budgetStatus?.overallHealth === 'warning' && (
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
            )}
            {budgetStatus?.overallHealth === 'critical' && (
              <XCircleIcon className="w-5 h-5 text-red-600" />
            )}
            System Performance Status
            <Badge
              variant={isMonitoring ? 'default' : 'secondary'}
              className="ml-auto"
            >
              {isMonitoring ? 'Monitoring Active' : 'Monitoring Stopped'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {budgetStatus ? (
            <div className="space-y-4">
              <div className="text-center">
                <div
                  className={cn(
                    'text-3xl font-bold',
                    budgetStatus.overallHealth === 'healthy'
                      ? 'text-green-600'
                      : budgetStatus.overallHealth === 'warning'
                        ? 'text-yellow-600'
                        : 'text-red-600',
                  )}
                >
                  {budgetStatus.overallHealth.toUpperCase()}
                </div>
                <p className="text-sm text-gray-600">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
              </div>

              {budgetStatus.violations.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Active Violations (
                    {
                      budgetStatus.violations.filter((v) => !v.acknowledged)
                        .length
                    }
                    )
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {budgetStatus.violations
                      .filter((v) => !v.acknowledged)
                      .slice(0, 3)
                      .map((alert) => (
                        <div
                          key={alert.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getSeverityColor(
                                alert.violation.severity,
                              )}
                              className="text-xs"
                            >
                              {alert.violation.severity}
                            </Badge>
                            <span className="text-sm">
                              {alert.violation.message}
                            </span>
                          </div>
                          <Button
                            onClick={() => acknowledgeViolation(alert.id)}
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                          >
                            Acknowledge
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Start monitoring to view performance status
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {budgetStatus && (
        <>
          {/* Core Web Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* LCP */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <ClockIcon className="w-4 h-4 text-blue-600" />
                  LCP (Largest Contentful Paint)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {(
                        budgetStatus.budget.coreWebVitals.lcp.current / 1000
                      ).toFixed(1)}
                      s
                    </span>
                    <span className="text-sm text-gray-500">
                      /{' '}
                      {(
                        budgetStatus.budget.coreWebVitals.lcp.max / 1000
                      ).toFixed(1)}
                      s
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (budgetStatus.budget.coreWebVitals.lcp.current /
                        budgetStatus.budget.coreWebVitals.lcp.max) *
                        100,
                    )}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500">
                    Wedding supplier loading target
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FID */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <CpuChipIcon className="w-4 h-4 text-green-600" />
                  FID (First Input Delay)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {budgetStatus.budget.coreWebVitals.fid.current}ms
                    </span>
                    <span className="text-sm text-gray-500">
                      / {budgetStatus.budget.coreWebVitals.fid.max}ms
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (budgetStatus.budget.coreWebVitals.fid.current /
                        budgetStatus.budget.coreWebVitals.fid.max) *
                        100,
                    )}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500">
                    Responsiveness target
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CLS */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <SignalIcon className="w-4 h-4 text-purple-600" />
                  CLS (Cumulative Layout Shift)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {budgetStatus.budget.coreWebVitals.cls.current.toFixed(3)}
                    </span>
                    <span className="text-sm text-gray-500">
                      / {budgetStatus.budget.coreWebVitals.cls.max}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (budgetStatus.budget.coreWebVitals.cls.current /
                        budgetStatus.budget.coreWebVitals.cls.max) *
                        100,
                    )}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500">
                    Visual stability target
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FCP */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <CloudArrowUpIcon className="w-4 h-4 text-orange-600" />
                  FCP (First Contentful Paint)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {(
                        budgetStatus.budget.coreWebVitals.fcp.current / 1000
                      ).toFixed(1)}
                      s
                    </span>
                    <span className="text-sm text-gray-500">
                      /{' '}
                      {(
                        budgetStatus.budget.coreWebVitals.fcp.max / 1000
                      ).toFixed(1)}
                      s
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (budgetStatus.budget.coreWebVitals.fcp.current /
                        budgetStatus.budget.coreWebVitals.fcp.max) *
                        100,
                    )}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500">
                    Initial render target
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resource Budget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bundle Size */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5 text-blue-600" />
                  Bundle Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {formatBytes(budgetStatus.budget.bundleSize.current)}
                    </span>
                    <span className="text-sm text-gray-500">
                      / {formatBytes(budgetStatus.budget.bundleSize.max)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (budgetStatus.budget.bundleSize.current /
                        budgetStatus.budget.bundleSize.max) *
                        100,
                    )}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500">
                    Mobile-optimized limit
                  </div>
                  {budgetStatus.budget.bundleSize.current >
                    budgetStatus.budget.bundleSize.threshold && (
                    <Badge variant="outline" className="text-xs">
                      Approaching limit
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Memory Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CpuChipIcon className="w-5 h-5 text-green-600" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {budgetStatus.budget.memoryUsage.current.toFixed(1)}MB
                    </span>
                    <span className="text-sm text-gray-500">
                      / {budgetStatus.budget.memoryUsage.max}MB
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (budgetStatus.budget.memoryUsage.current /
                        budgetStatus.budget.memoryUsage.max) *
                        100,
                    )}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500">
                    Mobile memory target
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cache Hit Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CloudArrowUpIcon className="w-5 h-5 text-purple-600" />
                  Cache Hit Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {budgetStatus.budget.cacheHitRate.current.toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-500">
                      / {budgetStatus.budget.cacheHitRate.min}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (budgetStatus.budget.cacheHitRate.current /
                        budgetStatus.budget.cacheHitRate.min) *
                        100,
                    )}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500">
                    Offline performance target
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Violations */}
          {budgetStatus.violations.filter((v) => !v.acknowledged).length >
            0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <BellIcon className="w-5 h-5" />
                  Performance Budget Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {budgetStatus.violations
                    .filter((v) => !v.acknowledged)
                    .map((alert) => (
                      <div
                        key={alert.id}
                        className="p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getSeverityColor(
                                alert.violation.severity,
                              )}
                            >
                              {alert.violation.severity.toUpperCase()}
                            </Badge>
                            <span className="font-medium text-gray-900">
                              {alert.violation.metric}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(
                              alert.violation.timestamp,
                            ).toLocaleTimeString()}
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">
                          {alert.violation.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            Current: {alert.violation.currentValue} | Budget:{' '}
                            {alert.violation.budgetValue}
                          </div>
                          <Button
                            onClick={() => acknowledgeViolation(alert.id)}
                            variant="outline"
                            size="sm"
                          >
                            Acknowledge
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Status Footer */}
      <div className="text-center text-xs text-gray-500">
        Production Performance Dashboard • Optimized for Wedding Suppliers
        {budgetStatus && (
          <span className="ml-2">
            • {budgetStatus.violations.length} total alerts
          </span>
        )}
      </div>
    </div>
  );
};

ProductionPerformanceDashboard.displayName = 'ProductionPerformanceDashboard';
