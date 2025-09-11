'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon,
  ClockIcon,
  UserGroupIcon,
  BanknotesIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/20/solid';
import type {
  SecurityMetrics,
  SecurityAlert,
  SecurityHealth,
} from '@/types/audit';

interface SecurityDashboardProps {
  className?: string;
}

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 animate-pulse"
        >
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SecurityHealthIndicator = ({ health }: { health: SecurityHealth }) => {
  const getHealthConfig = () => {
    switch (health) {
      case 'healthy':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: ShieldCheckIcon,
          label: 'Healthy',
          description: 'All security metrics are within normal ranges',
        };
      case 'warning':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          icon: ExclamationTriangleIcon,
          label: 'Warning',
          description: 'Some security concerns detected',
        };
      case 'critical':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: ShieldExclamationIcon,
          label: 'Critical',
          description: 'Immediate attention required',
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: ClockIcon,
          label: 'Unknown',
          description: 'Security status loading...',
        };
    }
  };

  const config = getHealthConfig();
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}
    >
      <Icon className="h-4 w-4 mr-2" />
      <span>{config.label}</span>
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
}) => {
  const trendColor =
    trend === 'up'
      ? 'text-red-600'
      : trend === 'down'
        ? 'text-green-600'
        : 'text-gray-600';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-gray-600" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">
            {value.toLocaleString()}
          </p>
          {change && <p className={`text-xs ${trendColor} mt-1`}>{change}</p>}
        </div>
      </div>
    </div>
  );
};

const RecentAlert = ({ alert }: { alert: SecurityAlert }) => {
  const getRiskColor = (riskLevel: SecurityAlert['risk_level']) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'text-purple-600 bg-purple-100';
      case 'HIGH':
        return 'text-red-600 bg-red-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'LOW':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const timeAgo = useMemo(() => {
    const now = new Date();
    const alertTime = new Date(alert.created_at);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, [alert.created_at]);

  return (
    <div className="flex items-start space-x-3 py-3">
      <div className="flex-shrink-0">
        <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{alert.description}</p>
        <div className="flex items-center space-x-2 mt-1">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskColor(alert.risk_level)}`}
          >
            {alert.risk_level}
          </span>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
};

export default function SecurityDashboard({
  className,
}: SecurityDashboardProps) {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Calculate security health based on metrics
  const securityHealth: SecurityHealth = useMemo(() => {
    if (!metrics) return 'unknown';

    const criticalAlerts = alerts.filter(
      (a) => a.risk_level === 'CRITICAL',
    ).length;
    const highAlerts = alerts.filter((a) => a.risk_level === 'HIGH').length;

    if (criticalAlerts > 0) return 'critical';
    if (highAlerts > 3 || metrics.failed_logins > 100) return 'warning';

    return 'healthy';
  }, [metrics, alerts]);

  // Load security metrics
  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for now - replace with actual API calls
      const mockMetrics: SecurityMetrics = {
        total_events: 1250,
        high_risk_events: 15,
        critical_events: 2,
        failed_logins: 45,
        suspicious_activities: 8,
        active_sessions: 234,
        blocked_ips: 12,
        mfa_enabled_users: 89,
        last_updated: new Date().toISOString(),
      };

      const mockAlerts: SecurityAlert[] = [
        {
          id: 'alert-1',
          user_id: 'user-suspicious',
          alert_type: 'MULTIPLE_FAILED_LOGINS',
          risk_level: 'HIGH',
          description: 'Multiple failed login attempts from suspicious IP',
          metadata: {
            ip_address: '203.0.113.195',
            login_attempts: 8,
          },
          resolved: false,
          created_at: new Date(Date.now() - 300000).toISOString(),
          updated_at: new Date(Date.now() - 300000).toISOString(),
        },
        {
          id: 'alert-2',
          user_id: 'user-data-access',
          alert_type: 'UNUSUAL_DATA_ACCESS',
          risk_level: 'CRITICAL',
          description: 'Unusual bulk data access pattern detected',
          metadata: {
            accessed_records: 500,
            time_window: '5 minutes',
          },
          resolved: false,
          created_at: new Date(Date.now() - 600000).toISOString(),
          updated_at: new Date(Date.now() - 600000).toISOString(),
        },
      ];

      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading security metrics:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load security metrics',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up real-time updates
  useEffect(() => {
    loadMetrics();

    const channel: RealtimeChannel = supabase
      .channel('security-metrics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_events' },
        () => {
          loadMetrics();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMetrics, supabase]);

  if (error) {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
      >
        <div className="text-red-800">
          Error loading security metrics: {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Security Overview
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time security metrics and alerts for your wedding platform
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <SecurityHealthIndicator health={securityHealth} />
          <button
            onClick={loadMetrics}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Events"
          value={metrics?.total_events || 0}
          change="Last 24 Hours"
          icon={ClockIcon}
        />
        <MetricCard
          title="High Risk Events"
          value={metrics?.high_risk_events || 0}
          change="Requires attention"
          icon={ExclamationTriangleIcon}
          trend="down"
        />
        <MetricCard
          title="Failed Logins"
          value={metrics?.failed_logins || 0}
          change="Last 7 Days"
          icon={ShieldExclamationIcon}
          trend="stable"
        />
        <MetricCard
          title="Active Sessions"
          value={metrics?.active_sessions || 0}
          change="Current users"
          icon={UserGroupIcon}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="MFA Adoption"
          value={`${Math.round(((metrics?.mfa_enabled_users || 0) / Math.max(metrics?.active_sessions || 1, 1)) * 100)}%`}
          change="Of active users"
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title="Blocked IPs"
          value={metrics?.blocked_ips || 0}
          change="Security blocks"
          icon={ShieldExclamationIcon}
        />
        <MetricCard
          title="Security Score"
          value={
            securityHealth === 'healthy'
              ? '95'
              : securityHealth === 'warning'
                ? '75'
                : '45'
          }
          change="Overall health"
          icon={ShieldCheckIcon}
        />
      </div>

      {/* Wedding Platform Security Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Security Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Security Alerts
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Latest security events requiring attention
            </p>
          </div>
          <div className="px-6 py-4">
            {alerts.length > 0 ? (
              <div className="space-y-1">
                {alerts.slice(0, 5).map((alert) => (
                  <RecentAlert key={alert.id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldCheckIcon className="mx-auto h-12 w-12 text-green-400" />
                <p className="text-sm text-gray-500 mt-2">
                  No active security alerts
                </p>
                <p className="text-xs text-gray-400">Your system is secure</p>
              </div>
            )}
          </div>
        </div>

        {/* Wedding Platform Security */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Wedding Platform Security
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Industry-specific security metrics
            </p>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Guest Data Access</span>
              <span className="text-sm font-medium text-green-600">Secure</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Vendor Login Attempts
              </span>
              <span className="text-sm font-medium text-yellow-600">
                Monitoring
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Payment Processing</span>
              <span className="text-sm font-medium text-green-600">
                PCI Compliant
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                RSVP Data Protection
              </span>
              <span className="text-sm font-medium text-green-600">
                Encrypted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Security Recommendations
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Suggested actions to improve security posture
          </p>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-3">
            {securityHealth === 'critical' && (
              <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800">
                    Immediate action required
                  </p>
                  <p className="text-red-600">
                    Critical security alerts detected. Review and resolve
                    immediately.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <ShieldCheckIcon className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">
                  Enable MFA for all admin users
                </p>
                <p className="text-blue-600">
                  Multi-factor authentication adds an extra layer of security.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
              <EyeIcon className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800">
                  Regular security audits
                </p>
                <p className="text-green-600">
                  Schedule monthly security reviews to maintain compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {lastRefresh.toLocaleTimeString()} • Monitoring{' '}
        {metrics?.active_sessions || 0} active sessions •
        {alerts.filter((a) => !a.resolved).length} unresolved alerts
      </div>
    </div>
  );
}
