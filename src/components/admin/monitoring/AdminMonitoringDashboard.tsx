'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  CurrencyPoundIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Import monitoring tab components
import { SystemHealthOverview } from './SystemHealthOverview';
import { ErrorMonitoring } from './ErrorMonitoring';
import { PerformanceMetrics } from './PerformanceMetrics';
import { SecurityMonitoring } from './SecurityMonitoring';
import { BusinessMetrics } from './BusinessMetrics';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  admin_permissions?: string[];
  mfa_enabled?: boolean;
  last_login_at?: string;
}

interface AdminMonitoringDashboardProps {
  userId: string;
  userProfile: AdminUser;
}

type MonitoringTab =
  | 'health'
  | 'errors'
  | 'performance'
  | 'security'
  | 'business';

interface TabConfig {
  id: MonitoringTab;
  name: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  description: string;
  badge?: {
    count: number;
    variant: 'success' | 'warning' | 'error' | 'info';
  };
}

export function AdminMonitoringDashboard({
  userId,
  userProfile,
}: AdminMonitoringDashboardProps) {
  const [activeTab, setActiveTab] = useState<MonitoringTab>('health');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Real-time data refresh every 30 seconds as specified
  useEffect(() => {
    const interval = setInterval(async () => {
      setIsRefreshing(true);
      setLastRefresh(new Date());

      // Simulate data refresh delay
      setTimeout(() => setIsRefreshing(false), 500);
    }, 30000); // 30 seconds

    setRefreshInterval(interval);
    return () => clearInterval(interval);
  }, []);

  // Manual refresh function
  const handleManualRefresh = () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setLastRefresh(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Tab configuration with dynamic badges
  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'health',
        name: 'System Health',
        icon: CpuChipIcon,
        component: SystemHealthOverview,
        description: 'Overall system status and infrastructure health',
        badge: { count: 0, variant: 'success' },
      },
      {
        id: 'errors',
        name: 'Error Monitoring',
        icon: ExclamationTriangleIcon,
        component: ErrorMonitoring,
        description: 'Error tracking, alerts, and incident management',
        badge: { count: 3, variant: 'error' },
      },
      {
        id: 'performance',
        name: 'Performance',
        icon: ChartBarIcon,
        component: PerformanceMetrics,
        description: 'Response times, throughput, and optimization metrics',
        badge: { count: 0, variant: 'success' },
      },
      {
        id: 'security',
        name: 'Security',
        icon: ShieldCheckIcon,
        component: SecurityMonitoring,
        description: 'Security events, threats, and compliance monitoring',
        badge: { count: 1, variant: 'warning' },
      },
      {
        id: 'business',
        name: 'Business Metrics',
        icon: CurrencyPoundIcon,
        component: BusinessMetrics,
        description: 'Revenue analytics, user engagement, and growth metrics',
        badge: { count: 0, variant: 'info' },
      },
    ],
    [],
  );

  const currentTab = tabs.find((tab) => tab.id === activeTab);
  const ActiveComponent = currentTab?.component || SystemHealthOverview;

  const getBadgeStyles = (variant: string) => {
    const styles = {
      success: 'bg-success-100 text-success-700 border-success-200',
      warning: 'bg-warning-100 text-warning-700 border-warning-200',
      error: 'bg-error-100 text-error-700 border-error-200',
      info: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return styles[variant as keyof typeof styles] || styles.info;
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 30) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    return date.toLocaleTimeString();
  };

  return (
    <div className="space-y-8">
      {/* Refresh Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <ClockIcon className="w-4 h-4" />
            <span>Last updated: {formatRelativeTime(lastRefresh)}</span>
          </div>
          {isRefreshing && (
            <div className="flex items-center space-x-2 text-sm text-primary-600">
              <div className="animate-spin w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full" />
              <span>Refreshing data...</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Auto-refresh: 30s intervals
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-xs hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <svg
              className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
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
            Refresh Now
          </button>
        </div>
      </div>

      {/* Tab Navigation - Untitled UI Style */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-1" aria-label="Monitoring Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-b-2 border-transparent'
                }`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
              >
                <Icon
                  className={`w-5 h-5 mr-3 ${
                    isActive
                      ? 'text-primary-600'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                <span>{tab.name}</span>

                {/* Badge for counts/alerts */}
                {tab.badge && tab.badge.count > 0 && (
                  <span
                    className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyles(tab.badge.variant)}`}
                  >
                    {tab.badge.count}
                  </span>
                )}

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-sm" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Description */}
      {currentTab && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
          <p className="text-sm text-gray-600">{currentTab.description}</p>
        </div>
      )}

      {/* Active Tab Content */}
      <div
        className="transition-all duration-200 ease-in-out"
        role="tabpanel"
        id={`${activeTab}-panel`}
        aria-labelledby={`${activeTab}-tab`}
      >
        <ActiveComponent
          userId={userId}
          userProfile={userProfile}
          isRefreshing={isRefreshing}
          lastRefresh={lastRefresh}
        />
      </div>

      {/* Admin Context Footer */}
      <div className="mt-12 p-4 bg-primary-50 rounded-xl border border-primary-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full">
              <ShieldCheckIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary-900">
                Wedding Industry Focus
              </h3>
              <p className="text-sm text-primary-700">
                All metrics contextualized for wedding suppliers and couple
                management
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-primary-900">
              {userProfile.role === 'super_admin' ? 'Super Admin' : 'Admin'}{' '}
              Mode
            </div>
            <div className="text-xs text-primary-600">
              Enhanced monitoring capabilities enabled
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
