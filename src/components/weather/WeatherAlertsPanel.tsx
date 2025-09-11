'use client';

/**
 * Weather Alerts Panel
 * Displays and manages weather alerts and notifications
 */

import React, { useState } from 'react';
import { WeatherNotification } from '@/types/weather';
import { Card, Button, Badge } from '@/components/untitled-ui';

// Custom Alert Components using Untitled UI styles
const Alert = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}
  >
    {children}
  </div>
);

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm text-red-800">{children}</div>
);
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Bell,
  Eye,
  X,
} from 'lucide-react';

interface WeatherAlertsPanelProps {
  alerts: WeatherNotification[];
  weddingId: string;
  onAlertsUpdated: (alerts: WeatherNotification[]) => void;
}

export function WeatherAlertsPanel({
  alerts,
  weddingId,
  onAlertsUpdated,
}: WeatherAlertsPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  const getSeverityIcon = (severity: WeatherNotification['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: WeatherNotification['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'error':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getChannelIcon = (channel: WeatherNotification['channel']) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      case 'push':
        return <Bell className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    setLoading(alertId);
    try {
      const response = await fetch('/api/weather/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'acknowledge',
          notificationId: alertId,
          userId: 'current-user', // This would come from auth context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      const updatedAlerts = alerts.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              acknowledged: true,
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: 'current-user',
            }
          : alert,
      );
      onAlertsUpdated(updatedAlerts);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    } finally {
      setLoading(null);
    }
  };

  const markAllAsRead = async () => {
    setLoading('all');
    try {
      const response = await fetch('/api/weather/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAllRead',
          weddingId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }

      const updatedAlerts = alerts.map((alert) => ({
        ...alert,
        acknowledged: true,
        acknowledgedAt: new Date().toISOString(),
      }));
      onAlertsUpdated(updatedAlerts);
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setLoading(null);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    switch (filter) {
      case 'unread':
        return !alert.acknowledged;
      case 'critical':
        return alert.severity === 'critical';
      default:
        return true;
    }
  });

  const unreadCount = alerts.filter((alert) => !alert.acknowledged).length;
  const criticalCount = alerts.filter(
    (alert) => alert.severity === 'critical' && !alert.acknowledged,
  ).length;

  return (
    <div className="space-y-6">
      {/* Header with stats and actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Weather Alerts</h3>
          <div className="flex space-x-2">
            <Badge variant={unreadCount > 0 ? 'default' : 'secondary'}>
              {unreadCount} unread
            </Badge>
            {criticalCount > 0 && (
              <Badge className="bg-red-100 text-red-800">
                {criticalCount} critical
              </Badge>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            disabled={loading === 'all'}
            variant="outline"
            size="sm"
          >
            {loading === 'all' ? 'Marking...' : 'Mark All Read'}
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex space-x-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({alerts.length})
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </Button>
        <Button
          variant={filter === 'critical' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('critical')}
        >
          Critical ({criticalCount})
        </Button>
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`p-4 transition-all duration-200 ${
                !alert.acknowledged ? 'ring-1 ring-blue-200 bg-blue-50/30' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getSeverityIcon(alert.severity)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {alert.title}
                      </h4>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="flex items-center space-x-1"
                      >
                        {getChannelIcon(alert.channel)}
                        <span>{alert.channel}</span>
                      </Badge>
                    </div>

                    <p className="text-gray-600 mb-2">{alert.message}</p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>

                      {alert.weatherData &&
                        Object.keys(alert.weatherData).length > 0 && (
                          <div className="flex items-center space-x-2">
                            {alert.weatherData.temp && (
                              <span>
                                Temp:{' '}
                                {Math.round(alert.weatherData.temp as number)}°C
                              </span>
                            )}
                            {alert.weatherData.pop && (
                              <span>
                                Rain:{' '}
                                {Math.round(
                                  (alert.weatherData.pop as number) * 100,
                                )}
                                %
                              </span>
                            )}
                            {alert.weatherData.wind_speed && (
                              <span>
                                Wind:{' '}
                                {Math.round(
                                  alert.weatherData.wind_speed as number,
                                )}{' '}
                                km/h
                              </span>
                            )}
                          </div>
                        )}
                    </div>

                    {alert.acknowledged && (
                      <div className="mt-2 flex items-center space-x-1 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>
                          Acknowledged{' '}
                          {alert.acknowledgedAt &&
                            new Date(alert.acknowledgedAt).toLocaleString()}
                          {alert.acknowledgedBy &&
                            ` by ${alert.acknowledgedBy}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!alert.acknowledged && (
                    <Button
                      onClick={() => acknowledgeAlert(alert.id)}
                      disabled={loading === alert.id}
                      variant="outline"
                      size="sm"
                    >
                      {loading === alert.id
                        ? 'Acknowledging...'
                        : 'Acknowledge'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No alerts' : `No ${filter} alerts`}
            </h3>
            <p className="text-gray-500">
              {filter === 'all'
                ? 'No weather alerts for this wedding yet.'
                : filter === 'unread'
                  ? 'All alerts have been acknowledged.'
                  : 'No critical weather alerts at this time.'}
            </p>
            {filter !== 'all' && (
              <Button
                onClick={() => setFilter('all')}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                View All Alerts
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Critical alerts summary */}
      {criticalCount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>
              {criticalCount} critical weather alert
              {criticalCount > 1 ? 's' : ''}
            </strong>{' '}
            require{criticalCount === 1 ? 's' : ''} immediate attention. These
            alerts may significantly impact your wedding plans.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
