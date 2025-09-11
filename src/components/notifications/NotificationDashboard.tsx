'use client';

/**
 * WS-008: Notification Dashboard Component
 * Real-time dashboard for monitoring notification delivery and performance
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notificationDeliveryTracker } from '@/lib/notifications/tracking';

interface DashboardData {
  total_notifications: number;
  successful_deliveries: number;
  failed_deliveries: number;
  pending_deliveries: number;
  channel_performance: Record<
    string,
    {
      sent: number;
      delivered: number;
      failed: number;
      delivery_rate: number;
    }
  >;
  recent_activity: Array<{
    id: string;
    template_id: string;
    recipient_id: string;
    channel: string;
    status: string;
    created_at: string;
    error_message?: string;
  }>;
}

interface NotificationDashboardProps {
  weddingId?: string;
  vendorId?: string;
  className?: string;
}

export function NotificationDashboard({
  weddingId,
  vendorId,
  className = '',
}: NotificationDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const data =
        await notificationDeliveryTracker.getDeliveryDashboard(weddingId);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard data',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [weddingId, vendorId]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'delivered':
      case 'opened':
      case 'clicked':
        return 'bg-success-50 text-success-700 border-success-200';
      case 'sent':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-warning-50 text-warning-700 border-warning-200';
      case 'failed':
      case 'bounced':
        return 'bg-error-50 text-error-700 border-error-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getChannelIcon = (channel: string): string => {
    switch (channel) {
      case 'email':
        return '📧';
      case 'sms':
        return '📱';
      case 'push':
        return '🔔';
      case 'in_app':
        return '💬';
      default:
        return '📤';
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading && !dashboardData) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div
        className={`bg-error-50 border border-error-200 rounded-lg p-6 ${className}`}
      >
        <h3 className="text-error-800 font-semibold mb-2">
          Error Loading Dashboard
        </h3>
        <p className="text-error-600 mb-4">{error}</p>
        <Button
          onClick={fetchDashboardData}
          className="bg-error-600 hover:bg-error-700 text-white"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const totalRate =
    dashboardData.total_notifications > 0
      ? (dashboardData.successful_deliveries /
          dashboardData.total_notifications) *
        100
      : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Notification Dashboard
          </h2>
          <p className="text-gray-600">Last 24 hours of delivery activity</p>
        </div>
        <Button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="bg-primary-600 hover:bg-primary-700 text-white"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sent</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.total_notifications.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <span className="text-2xl">📤</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-success-600">
                {dashboardData.successful_deliveries.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {totalRate.toFixed(1)}% success rate
              </p>
            </div>
            <div className="p-3 rounded-full bg-success-100">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-error-600">
                {dashboardData.failed_deliveries.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {(
                  (dashboardData.failed_deliveries /
                    Math.max(dashboardData.total_notifications, 1)) *
                  100
                ).toFixed(1)}
                % failure rate
              </p>
            </div>
            <div className="p-3 rounded-full bg-error-100">
              <span className="text-2xl">❌</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-warning-600">
                {dashboardData.pending_deliveries.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">In progress</p>
            </div>
            <div className="p-3 rounded-full bg-warning-100">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Channel Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Channel Performance
          </h3>
          <div className="space-y-4">
            {Object.entries(dashboardData.channel_performance).map(
              ([channel, stats]) => (
                <div
                  key={channel}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getChannelIcon(channel)}</span>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {channel}
                      </p>
                      <p className="text-sm text-gray-600">{stats.sent} sent</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {stats.delivery_rate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {stats.delivered} delivered, {stats.failed} failed
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {dashboardData.recent_activity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No recent activity
              </p>
            ) : (
              dashboardData.recent_activity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50"
                >
                  <span className="text-lg">
                    {getChannelIcon(activity.channel)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={`text-xs ${getStatusColor(activity.status)}`}
                      >
                        {activity.status}
                      </Badge>
                      <span className="text-sm text-gray-600 capitalize">
                        {activity.channel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      Template: {activity.template_id}
                    </p>
                    {activity.error_message && (
                      <p className="text-xs text-error-600 truncate">
                        Error: {activity.error_message}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {formatTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      {dashboardData.total_notifications > 0 && (
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">
                {totalRate.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Overall Delivery Rate</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${totalRate}%` }}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-success-600 mb-2">
                {Object.values(dashboardData.channel_performance).length}
              </div>
              <p className="text-sm text-gray-600">Active Channels</p>
              <div className="mt-2 flex justify-center space-x-1">
                {Object.keys(dashboardData.channel_performance).map(
                  (channel) => (
                    <span key={channel} className="text-lg">
                      {getChannelIcon(channel)}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {dashboardData.recent_activity.length}
              </div>
              <p className="text-sm text-gray-600">Recent Activities</p>
              <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default NotificationDashboard;
