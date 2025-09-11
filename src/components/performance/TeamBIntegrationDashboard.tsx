'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CloudArrowUpIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  ArrowPathIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import {
  useTeamBPerformanceMetrics,
  useTeamBPerformanceStatus,
  useTeamBRecommendations,
  teamBPerformanceAPI,
  PerformanceIntegrationUtils,
} from '@/lib/integrations/team-b-performance-integration';

interface TeamBIntegrationDashboardProps {
  className?: string;
  onMetricsReceived?: (metrics: any[]) => void;
}

export const TeamBIntegrationDashboard: React.FC<
  TeamBIntegrationDashboardProps
> = ({ className, onMetricsReceived }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    '1h' | '6h' | '24h' | '7d'
  >('1h');
  const [telemetrySubmitted, setTelemetrySubmitted] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);

  // Team B API hooks
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useTeamBPerformanceMetrics(selectedTimeRange);
  const {
    status,
    loading: statusLoading,
    error: statusError,
  } = useTeamBPerformanceStatus();
  const { recommendations, loading: recommendationsLoading } =
    useTeamBRecommendations();

  // Notify parent when metrics are received
  useEffect(() => {
    if (metrics.length > 0 && onMetricsReceived) {
      onMetricsReceived(metrics);
    }
  }, [metrics, onMetricsReceived]);

  // Submit performance telemetry
  const submitTelemetry = useCallback(async () => {
    try {
      const telemetry = PerformanceIntegrationUtils.collectTelemetry();
      const result = await teamBPerformanceAPI.submitTelemetry(telemetry);

      if (result.success) {
        setTelemetrySubmitted(true);
        setTimeout(() => setTelemetrySubmitted(false), 3000);
      }
    } catch (error) {
      console.error('Failed to submit telemetry:', error);
    }
  }, []);

  // Start performance monitoring
  const toggleMonitoring = useCallback(async () => {
    if (monitoringActive) {
      setMonitoringActive(false);
    } else {
      try {
        await PerformanceIntegrationUtils.startPerformanceMonitoring();
        setMonitoringActive(true);
      } catch (error) {
        console.error('Failed to start monitoring:', error);
      }
    }
  }, [monitoringActive]);

  // Submit test results example
  const submitSampleTestResults = useCallback(async () => {
    try {
      const testSubmission = PerformanceIntegrationUtils.createTestSubmission(
        'guest-list-performance',
        'Guest List Virtual Scrolling Test',
        {
          renderTime: 12.5,
          fps: 58,
          memoryUsage: 45.2,
          networkRequests: 8,
          score: 87,
          passed: true,
          thresholdsMet: ['renderTime', 'fps', 'memoryUsage'],
          thresholdsFailed: [],
        },
      );

      const result =
        await teamBPerformanceAPI.submitTestResults(testSubmission);
      console.log('Test results submitted:', result);
    } catch (error) {
      console.error('Failed to submit test results:', error);
    }
  }, []);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Team B Performance Integration
          </h2>
          <p className="text-gray-600">
            Real-time performance metrics and optimization recommendations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={submitTelemetry}
            variant="outline"
            size="sm"
            disabled={telemetrySubmitted}
          >
            <CloudArrowUpIcon className="w-4 h-4 mr-2" />
            {telemetrySubmitted ? 'Submitted!' : 'Submit Telemetry'}
          </Button>

          <Button
            onClick={toggleMonitoring}
            variant={monitoringActive ? 'destructive' : 'default'}
            size="sm"
          >
            {monitoringActive ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
        </div>
      </div>

      {/* Performance Status */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            System Performance Status
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>

        {statusLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Loading status...
          </div>
        ) : statusError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">Error loading status: {statusError}</p>
          </div>
        ) : status ? (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center gap-4">
              <Badge
                variant={
                  status.status === 'healthy'
                    ? 'default'
                    : status.status === 'degraded'
                      ? 'outline'
                      : 'destructive'
                }
                className="text-base px-3 py-1"
              >
                {status.status.toUpperCase()}
              </Badge>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Overall Score:</span>
                <span
                  className={cn(
                    'font-bold text-lg',
                    status.overall_score >= 80
                      ? 'text-green-600'
                      : status.overall_score >= 60
                        ? 'text-yellow-600'
                        : 'text-red-600',
                  )}
                >
                  {status.overall_score}/100
                </span>
              </div>
            </div>

            {/* Issues */}
            {status.issues && status.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Current Issues
                </h4>
                {status.issues.map((issue, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-lg text-sm',
                      issue.severity === 'high'
                        ? 'bg-red-50 text-red-700'
                        : issue.severity === 'medium'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-blue-50 text-blue-700',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{issue.message}</p>
                        {issue.affected_endpoints.length > 0 && (
                          <p className="mt-1 text-xs opacity-75">
                            Affected: {issue.affected_endpoints.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Performance Metrics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Performance Metrics
        </h3>

        {metricsLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Loading metrics...
          </div>
        ) : metricsError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">
              Error loading metrics: {metricsError}
            </p>
          </div>
        ) : metrics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Average Response Time */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Response Time
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {(
                  metrics.reduce((sum, m) => sum + m.response_time, 0) /
                  metrics.length
                ).toFixed(1)}
                ms
              </div>
              <div className="text-xs text-blue-600">Average</div>
            </div>

            {/* Throughput */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  Throughput
                </span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {(
                  metrics.reduce((sum, m) => sum + m.throughput, 0) /
                  metrics.length
                ).toFixed(0)}
              </div>
              <div className="text-xs text-green-600">Requests/sec</div>
            </div>

            {/* Error Rate */}
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">
                  Error Rate
                </span>
              </div>
              <div className="text-2xl font-bold text-red-900">
                {(
                  metrics.reduce((sum, m) => sum + m.error_rate, 0) /
                  metrics.length
                ).toFixed(2)}
                %
              </div>
              <div className="text-xs text-red-600">Average</div>
            </div>

            {/* Cache Hit Rate */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CpuChipIcon className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  Cache Hit Rate
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {(
                  metrics.reduce((sum, m) => sum + m.cache_hit_rate, 0) /
                  metrics.length
                ).toFixed(1)}
                %
              </div>
              <div className="text-xs text-purple-600">Average</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">
            No metrics available for the selected time range
          </div>
        )}
      </div>

      {/* Performance Recommendations */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Optimization Recommendations
        </h3>

        {recommendationsLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Loading recommendations...
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.slice(0, 5).map((rec) => (
              <div
                key={rec.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        rec.priority === 'high'
                          ? 'destructive'
                          : rec.priority === 'medium'
                            ? 'outline'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      {rec.priority} priority
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {rec.category}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3">{rec.description}</p>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Impact: {rec.impact_score}/10</span>
                  <span>Effort: {rec.implementation_effort}/10</span>
                  {rec.code_changes && (
                    <span>Changes: {rec.code_changes.length} files</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">
            No recommendations available
          </div>
        )}
      </div>

      {/* Integration Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Integration Actions
        </h3>

        <div className="flex flex-wrap gap-3">
          <Button onClick={submitSampleTestResults} variant="outline" size="sm">
            Submit Test Results
          </Button>

          <Badge
            variant={monitoringActive ? 'default' : 'secondary'}
            className="px-3 py-1"
          >
            {monitoringActive ? 'Monitoring Active' : 'Monitoring Inactive'}
          </Badge>

          {telemetrySubmitted && (
            <Badge variant="default" className="px-3 py-1">
              <CheckCircleIcon className="w-3 h-3 mr-1" />
              Telemetry Sent
            </Badge>
          )}
        </div>
      </div>

      {/* Integration Status */}
      <div className="text-xs text-gray-500 text-center">
        Team B Performance API Integration Active
        {metrics.length > 0 && (
          <span className="ml-2">
            • Last updated:{' '}
            {new Date(
              metrics[metrics.length - 1]?.timestamp,
            ).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};

TeamBIntegrationDashboard.displayName = 'TeamBIntegrationDashboard';
