'use client';

import React from 'react';
import {
  Clock,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  TestProgressIndicatorProps,
  TestStatus,
} from '@/types/performance-testing';

export const TestProgressIndicator: React.FC<TestProgressIndicatorProps> = ({
  runningTest,
  showMetrics = true,
  compact = false,
}) => {
  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'failed':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'running':
        return <Zap className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const hasThresholdBreaches = runningTest.thresholdBreaches.length > 0;
  const criticalBreaches = runningTest.thresholdBreaches.filter(
    (b) => b.severity === 'critical',
  );

  if (compact) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg">
        <div
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(runningTest.status)}`}
        >
          {getStatusIcon(runningTest.status)}
          <span className="ml-1 capitalize">{runningTest.status}</span>
        </div>

        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {runningTest.name}
          </div>
          {runningTest.status === 'running' && (
            <div className="flex items-center mt-1">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${runningTest.progress}%` }}
                />
              </div>
              <span className="ml-2 text-xs text-gray-500">
                {runningTest.progress}%
              </span>
            </div>
          )}
        </div>

        {hasThresholdBreaches && (
          <div className="flex items-center">
            <AlertTriangle
              className={`w-4 h-4 ${criticalBreaches.length > 0 ? 'text-error-500' : 'text-warning-500'}`}
            />
            <span className="ml-1 text-xs font-medium text-gray-700">
              {runningTest.thresholdBreaches.length}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(runningTest.status)}`}
          >
            {getStatusIcon(runningTest.status)}
            <span className="ml-1 capitalize">{runningTest.status}</span>
          </div>

          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            {formatDuration(
              runningTest.startTime,
              runningTest.status === 'completed'
                ? runningTest.estimatedEndTime
                : undefined,
            )}
          </div>
        </div>

        <div className="text-sm font-medium text-gray-900">
          {runningTest.type.toUpperCase()} Test
        </div>
      </div>

      {/* Test Name */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {runningTest.name}
      </h3>

      {/* Progress Bar (only for running tests) */}
      {runningTest.status === 'running' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">
              {runningTest.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${runningTest.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* User Load Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Users className="w-4 h-4 text-gray-400 mr-1" />
            <span className="text-sm font-medium text-gray-700">
              Concurrent Users
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {runningTest.currentUsers} / {runningTest.targetUsers}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(runningTest.currentUsers / runningTest.targetUsers) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Threshold Breaches */}
      {hasThresholdBreaches && (
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <AlertTriangle
              className={`w-4 h-4 mr-1 ${criticalBreaches.length > 0 ? 'text-error-500' : 'text-warning-500'}`}
            />
            <span className="text-sm font-semibold text-gray-900">
              Threshold Breaches ({runningTest.thresholdBreaches.length})
            </span>
          </div>
          <div className="space-y-2">
            {runningTest.thresholdBreaches.slice(0, 3).map((breach) => (
              <div
                key={breach.id}
                className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                  breach.severity === 'critical'
                    ? 'bg-error-50 border border-error-200'
                    : 'bg-warning-50 border border-warning-200'
                }`}
              >
                <span className="font-medium capitalize">
                  {breach.metric.replace('_', ' ')}
                </span>
                <span
                  className={`font-semibold ${
                    breach.severity === 'critical'
                      ? 'text-error-700'
                      : 'text-warning-700'
                  }`}
                >
                  {breach.actualValue} / {breach.threshold}
                </span>
              </div>
            ))}
            {runningTest.thresholdBreaches.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                +{runningTest.thresholdBreaches.length - 3} more breaches
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real-time Metrics */}
      {showMetrics && runningTest.status === 'running' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">
              Response Time (P95)
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {runningTest.currentMetrics.responseTime.p95.toFixed(0)}ms
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Throughput</div>
            <div className="text-lg font-semibold text-gray-900">
              {runningTest.currentMetrics.throughput.toFixed(1)} RPS
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Error Rate</div>
            <div
              className={`text-lg font-semibold ${
                runningTest.currentMetrics.errorRate > 5
                  ? 'text-error-600'
                  : 'text-gray-900'
              }`}
            >
              {runningTest.currentMetrics.errorRate.toFixed(2)}%
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Total Requests</div>
            <div className="text-lg font-semibold text-gray-900">
              {runningTest.currentMetrics.totalRequests.toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
