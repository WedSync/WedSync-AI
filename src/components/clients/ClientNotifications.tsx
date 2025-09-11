'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, X, Mail, MessageSquare, Calendar } from 'lucide-react';

interface Notification {
  id: string;
  type: 'email' | 'sms' | 'system';
  title: string;
  message: string;
  client_id?: string;
  client_name?: string;
  status: 'unread' | 'read' | 'dismissed';
  created_at: string;
  action_url?: string;
}

interface ClientNotificationsProps {
  clientId?: string;
  onNotificationUpdate?: (
    notificationId: string,
    action: 'read' | 'dismiss',
  ) => void;
}

// Mock notifications data - in production this would come from Team E's notification system
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'email',
    title: 'Client Response Received',
    message: 'Sarah & John Smith responded to the venue selection form',
    client_id: 'client-1',
    client_name: 'Sarah & John Smith',
    status: 'unread',
    created_at: '2025-01-21T10:30:00Z',
    action_url: '/clients/client-1',
  },
  {
    id: '2',
    type: 'sms',
    title: 'WedMe Connection Established',
    message: 'Emma & Michael Brown connected to WedMe successfully',
    client_id: 'client-2',
    client_name: 'Emma & Michael Brown',
    status: 'unread',
    created_at: '2025-01-21T09:15:00Z',
    action_url: '/clients/client-2',
  },
  {
    id: '3',
    type: 'system',
    title: 'Wedding Date Approaching',
    message: "Lisa & David Wilson's wedding is in 7 days",
    client_id: 'client-3',
    client_name: 'Lisa & David Wilson',
    status: 'read',
    created_at: '2025-01-21T08:00:00Z',
    action_url: '/clients/client-3',
  },
];

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'email':
      return Mail;
    case 'sms':
      return MessageSquare;
    case 'system':
      return Calendar;
    default:
      return Bell;
  }
};

const getNotificationBadgeColor = (type: Notification['type']) => {
  switch (type) {
    case 'email':
      return 'blue';
    case 'sms':
      return 'green';
    case 'system':
      return 'purple';
    default:
      return 'gray';
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60),
  );

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString();
};

export default function ClientNotifications({
  clientId,
  onNotificationUpdate,
}: ClientNotificationsProps) {
  const [notifications, setNotifications] =
    useState<Notification[]>(mockNotifications);
  const [isLoading, setIsLoading] = useState(false);

  // Filter notifications by client if clientId is provided
  const filteredNotifications = clientId
    ? notifications.filter((n) => n.client_id === clientId)
    : notifications;

  const unreadCount = filteredNotifications.filter(
    (n) => n.status === 'unread',
  ).length;

  const handleMarkAsRead = async (notificationId: string) => {
    setIsLoading(true);
    try {
      // In production, this would call Team E's notification API
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: 'read' as const } : n,
        ),
      );
      onNotificationUpdate?.(notificationId, 'read');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    setIsLoading(true);
    try {
      // In production, this would call Team E's notification API
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: 'dismissed' as const } : n,
        ),
      );
      onNotificationUpdate?.(notificationId, 'dismiss');
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      // In production, this would call Team E's notification API
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'read' as const })),
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="client-notifications">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {clientId ? 'Client Notifications' : 'Notifications'}
          </h3>
          {unreadCount > 0 && (
            <Badge className="bg-red-100 text-red-800 border border-red-200">
              {unreadCount} new
            </Badge>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isLoading}
            className="text-xs"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">No notifications</p>
            <p className="text-sm text-gray-400">
              Client activity notifications will appear here
            </p>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const badgeColor = getNotificationBadgeColor(notification.type);

            return (
              <Card
                key={notification.id}
                className={`p-4 transition-all duration-200 hover:shadow-md ${
                  notification.status === 'unread'
                    ? 'border-l-4 border-l-primary-500 bg-primary-25'
                    : 'border border-gray-200'
                } ${notification.status === 'dismissed' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      badgeColor === 'blue'
                        ? 'bg-blue-100 text-blue-600'
                        : badgeColor === 'green'
                          ? 'bg-green-100 text-green-600'
                          : badgeColor === 'purple'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4
                          className={`text-sm font-medium ${
                            notification.status === 'unread'
                              ? 'text-gray-900'
                              : 'text-gray-700'
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <p
                          className={`text-sm mt-1 ${
                            notification.status === 'unread'
                              ? 'text-gray-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {notification.message}
                        </p>
                        {notification.client_name && !clientId && (
                          <p className="text-xs text-primary-600 font-medium mt-2">
                            {notification.client_name}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge
                          className={`text-xs ${
                            badgeColor === 'blue'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : badgeColor === 'green'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : badgeColor === 'purple'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-gray-50 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {notification.type}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(notification.created_at)}
                      </span>

                      <div className="flex items-center gap-1">
                        {notification.status === 'unread' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={isLoading}
                            className="text-xs h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Mark as read
                          </Button>
                        )}

                        {notification.status !== 'dismissed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDismiss(notification.id)}
                            disabled={isLoading}
                            className="text-xs h-6 px-2 text-gray-500 hover:text-gray-600 hover:bg-gray-50"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}

                        {notification.action_url && (
                          <Button
                            size="sm"
                            onClick={() =>
                              (window.location.href = notification.action_url!)
                            }
                            className="text-xs h-6 px-2"
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
