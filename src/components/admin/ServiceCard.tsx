/**
 * WS-227: Service Card Component
 * Reusable card for displaying individual service health status
 */

'use client';

import { useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { ServiceStatus } from '@/lib/services/health-monitor';

interface ServiceCardProps {
  serviceName: string;
  service: ServiceStatus;
  icon?: React.ComponentType<{ className?: string }>;
  onRefresh?: (serviceName: string) => void;
  showDetails?: boolean;
  weddingContext?: string;
  isRefreshing?: boolean;
}

export function ServiceCard({
  serviceName,
  service,
  icon: Icon,
  onRefresh,
  showDetails = true,
  weddingContext,
  isRefreshing = false,
}: ServiceCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Status styling
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          bg: 'bg-success-50',
          border: 'border-success-200',
          text: 'text-success-700',
          icon: 'text-success-600',
          badge: 'bg-success-100 text-success-800',
        };
      case 'degraded':
        return {
          bg: 'bg-warning-50',
          border: 'border-warning-200',
          text: 'text-warning-700',
          icon: 'text-warning-600',
          badge: 'bg-warning-100 text-warning-800',
        };
      case 'down':
        return {
          bg: 'bg-error-50',
          border: 'border-error-200',
          text: 'text-error-700',
          icon: 'text-error-600',
          badge: 'bg-error-100 text-error-800',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: 'text-gray-600',
          badge: 'bg-gray-100 text-gray-800',
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

  const formatLatency = (latency: number) => {
    if (latency < 0) return 'N/A';
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(2)}s`;
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const formatServiceName = (name: string) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2');
  };

  const getLatencyStatus = (latency: number, serviceName: string) => {
    if (latency < 0) return 'unknown';

    // Different thresholds for different services
    const thresholds = {
      database: { good: 100, degraded: 500 },
      redis: { good: 50, degraded: 200 },
      supabase: { good: 200, degraded: 800 },
      storage: { good: 300, degraded: 1000 },
      default: { good: 200, degraded: 600 },
    };

    const threshold =
      thresholds[serviceName as keyof typeof thresholds] || thresholds.default;

    if (latency <= threshold.good) return 'good';
    if (latency <= threshold.degraded) return 'fair';
    return 'poor';
  };

  const styles = getStatusStyles(service.status);
  const latencyStatus = getLatencyStatus(service.latency, serviceName);

  return (
    <div
      className={`border rounded-xl p-6 transition-all hover:shadow-md ${styles.border} ${styles.bg}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {Icon && (
            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg mr-4 shadow-sm">
              <Icon className={`w-6 h-6 ${styles.icon}`} />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {formatServiceName(serviceName)}
            </h3>
            <div
              className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${styles.badge}`}
            >
              <div className={`${styles.icon} mr-1`}>
                {getStatusIcon(service.status)}
              </div>
              {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onRefresh && (
            <button
              onClick={() => onRefresh(serviceName)}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors disabled:opacity-50"
              title="Refresh service status"
            >
              <ArrowPathIcon
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          )}

          {showDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors"
              title={expanded ? 'Hide details' : 'Show details'}
            >
              {expanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Response Time
          </div>
          <div className="flex items-center mt-1">
            <div
              className={`text-lg font-bold ${
                latencyStatus === 'good'
                  ? 'text-success-700'
                  : latencyStatus === 'fair'
                    ? 'text-warning-700'
                    : latencyStatus === 'poor'
                      ? 'text-error-700'
                      : 'text-gray-700'
              }`}
            >
              {formatLatency(service.latency)}
            </div>
            <div
              className={`ml-2 w-2 h-2 rounded-full ${
                latencyStatus === 'good'
                  ? 'bg-success-400'
                  : latencyStatus === 'fair'
                    ? 'bg-warning-400'
                    : latencyStatus === 'poor'
                      ? 'bg-error-400'
                      : 'bg-gray-400'
              }`}
            />
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Uptime (24h)
          </div>
          <div className="flex items-center mt-1">
            <div
              className={`text-lg font-bold ${
                service.uptime >= 99.5
                  ? 'text-success-700'
                  : service.uptime >= 98.0
                    ? 'text-warning-700'
                    : 'text-error-700'
              }`}
            >
              {formatUptime(service.uptime)}
            </div>
          </div>
        </div>
      </div>

      {/* Error Count */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Errors (24h)
          </div>
          <div
            className={`text-sm font-semibold ${service.errorCount24h === 0 ? 'text-success-600' : 'text-error-600'}`}
          >
            {service.errorCount24h}{' '}
            {service.errorCount24h === 1 ? 'error' : 'errors'}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Last Check
          </div>
          <div className="text-sm text-gray-700">
            {new Date(service.lastCheck).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {service.message && (
        <div className="mb-4 p-3 bg-white/60 rounded-lg border border-gray-200">
          <div className="flex items-start">
            <InformationCircleIcon className="w-4 h-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-gray-700">{service.message}</div>
          </div>
        </div>
      )}

      {/* Wedding Context */}
      {weddingContext && (
        <div className="mb-4 p-3 bg-primary-50/50 rounded-lg border border-primary-200/50">
          <div className="text-xs text-primary-600 font-medium mb-1 uppercase tracking-wide">
            Wedding Impact
          </div>
          <div className="text-sm text-primary-700">{weddingContext}</div>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && showDetails && (
        <div className="pt-4 border-t border-gray-200 space-y-4">
          {/* Performance Indicators */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Performance Indicators
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between p-2 bg-white/60 rounded">
                <span className="text-sm text-gray-600">Response Quality</span>
                <div className="flex items-center">
                  <div
                    className={`w-16 h-2 bg-gray-200 rounded-full overflow-hidden`}
                  >
                    <div
                      className={`h-full transition-all duration-500 ${
                        latencyStatus === 'good'
                          ? 'bg-success-500'
                          : latencyStatus === 'fair'
                            ? 'bg-warning-500'
                            : 'bg-error-500'
                      }`}
                      style={{
                        width: `${
                          latencyStatus === 'good'
                            ? '100'
                            : latencyStatus === 'fair'
                              ? '70'
                              : latencyStatus === 'poor'
                                ? '40'
                                : '0'
                        }%`,
                      }}
                    />
                  </div>
                  <span
                    className={`ml-2 text-xs font-medium ${
                      latencyStatus === 'good'
                        ? 'text-success-600'
                        : latencyStatus === 'fair'
                          ? 'text-warning-600'
                          : 'text-error-600'
                    }`}
                  >
                    {latencyStatus === 'good'
                      ? 'Excellent'
                      : latencyStatus === 'fair'
                        ? 'Good'
                        : latencyStatus === 'poor'
                          ? 'Poor'
                          : 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-white/60 rounded">
                <span className="text-sm text-gray-600">Reliability</span>
                <div className="flex items-center">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        service.uptime >= 99.5
                          ? 'bg-success-500'
                          : service.uptime >= 98.0
                            ? 'bg-warning-500'
                            : 'bg-error-500'
                      }`}
                      style={{ width: `${Math.min(service.uptime, 100)}%` }}
                    />
                  </div>
                  <span
                    className={`ml-2 text-xs font-medium ${
                      service.uptime >= 99.5
                        ? 'text-success-600'
                        : service.uptime >= 98.0
                          ? 'text-warning-600'
                          : 'text-error-600'
                    }`}
                  >
                    {service.uptime >= 99.5
                      ? 'Excellent'
                      : service.uptime >= 98.0
                        ? 'Good'
                        : 'Poor'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Service Actions */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Quick Actions
            </h4>
            <div className="flex space-x-2">
              {onRefresh && (
                <button
                  onClick={() => onRefresh(serviceName)}
                  disabled={isRefreshing}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 disabled:opacity-50"
                >
                  {isRefreshing ? 'Checking...' : 'Check Status'}
                </button>
              )}

              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200">
                View Logs
              </button>

              <button className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200">
                Metrics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
