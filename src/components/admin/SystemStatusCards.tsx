'use client';

import { useState, useEffect } from 'react';

interface SystemStatusData {
  maintenanceMode: boolean;
  activeUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastBackup: string | null;
  alerts: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
}

export function SystemStatusCards() {
  const [statusData, setStatusData] = useState<SystemStatusData>({
    maintenanceMode: false,
    activeUsers: 0,
    systemHealth: 'healthy',
    lastBackup: null,
    alerts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchSystemStatus();

    // Set up polling for real-time updates
    const interval = setInterval(fetchSystemStatus, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/quick-actions');
      if (response.ok) {
        const data = await response.json();
        setStatusData(data.data);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthStatusColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'warning':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'critical':
        return 'text-error-600 bg-error-50 border-error-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return (
          <svg
            className="w-5 h-5"
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
        );
      case 'warning':
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case 'critical':
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const formatLastBackup = (timestamp: string | null) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const unacknowledgedAlerts = statusData.alerts.filter(
    (alert) => !alert.acknowledged,
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* System Health */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Health</p>
              <p
                className={`text-2xl font-semibold mt-1 capitalize ${
                  statusData.systemHealth === 'healthy'
                    ? 'text-success-700'
                    : statusData.systemHealth === 'warning'
                      ? 'text-warning-700'
                      : 'text-error-700'
                }`}
              >
                {statusData.systemHealth}
              </p>
            </div>
            <div
              className={`inline-flex items-center px-3 py-2 rounded-lg border ${getHealthStatusColor(statusData.systemHealth)}`}
            >
              {getHealthIcon(statusData.systemHealth)}
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {statusData.activeUsers.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Last 15 minutes</p>
            </div>
            <div className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p
                className={`text-2xl font-semibold mt-1 ${
                  unacknowledgedAlerts.length === 0
                    ? 'text-success-700'
                    : unacknowledgedAlerts.some((a) => a.type === 'error')
                      ? 'text-error-700'
                      : 'text-warning-700'
                }`}
              >
                {unacknowledgedAlerts.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Unacknowledged</p>
            </div>
            <div
              className={`inline-flex items-center px-3 py-2 rounded-lg border ${
                unacknowledgedAlerts.length === 0
                  ? 'bg-success-50 border-success-200 text-success-600'
                  : unacknowledgedAlerts.some((a) => a.type === 'error')
                    ? 'bg-error-50 border-error-200 text-error-600'
                    : 'bg-warning-50 border-warning-200 text-warning-600'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-5 5v-5zM9 17h5l-5 5v-5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15l-.71-.71c-.78-.78-.78-2.05 0-2.83L12 12.59l.71.71c.78.78.78 2.05 0 2.83L12 17z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Last Backup */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Backup</p>
              <p
                className={`text-2xl font-semibold mt-1 ${
                  !statusData.lastBackup ? 'text-error-700' : 'text-gray-900'
                }`}
              >
                {formatLastBackup(statusData.lastBackup)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Database backup</p>
            </div>
            <div
              className={`inline-flex items-center px-3 py-2 rounded-lg border ${
                !statusData.lastBackup
                  ? 'bg-error-50 border-error-200 text-error-600'
                  : 'bg-primary-50 border-primary-200 text-primary-600'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Mode Banner */}
      {statusData.maintenanceMode && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-warning-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-warning-800">
                System is in Maintenance Mode
              </h3>
              <p className="text-sm text-warning-700 mt-1">
                The system is currently unavailable to regular users. Only
                administrators can access the platform.
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-warning-700 bg-white border border-warning-300 rounded-lg hover:bg-warning-50 transition-colors focus:outline-none focus:ring-2 focus:ring-warning-600 focus:ring-offset-2"
              >
                Disable Maintenance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Refresh Info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
        <button
          onClick={fetchSystemStatus}
          className="inline-flex items-center space-x-1 hover:text-gray-700 transition-colors"
        >
          <svg
            className="w-3 h-3"
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
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
