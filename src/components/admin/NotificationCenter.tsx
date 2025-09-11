'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle,
  User,
  ExternalLink,
  Settings,
  Volume2,
  VolumeX,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  notificationService,
  useWeddingEmergencyAlerts,
  useSlaBreachAlerts,
} from '@/lib/support/realtime-notifications';

type NotificationType =
  | 'sla_breach'
  | 'wedding_emergency'
  | 'escalation'
  | 'assignment'
  | 'resolution';

interface NotificationItem {
  id: string;
  type: NotificationType;
  ticket_id: string;
  ticket_title: string;
  customer_name: string;
  customer_tier: string;
  priority: string;
  message: string;
  action_required: boolean;
  created_at: string;
  metadata?: Record<string, any>;
  read?: boolean;
}

interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({
  className = '',
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [settings, setSettings] = useState({
    wedding_emergency: true,
    sla_breach: true,
    escalation: true,
    assignment: false,
    resolution: false,
  });

  const { emergencies } = useWeddingEmergencyAlerts();
  const { breaches } = useSlaBreachAlerts();

  // Initialize notification service
  useEffect(() => {
    // Request browser notification permission
    notificationService.requestNotificationPermission();

    // Subscribe to all notification types
    const unsubscribes: (() => void)[] = [];

    // Wedding emergencies (always enabled)
    unsubscribes.push(
      notificationService.subscribe('wedding_emergency', handleNotification),
    );

    // SLA breaches
    if (settings.sla_breach) {
      unsubscribes.push(
        notificationService.subscribe('sla_breach', handleNotification),
      );
    }

    // Escalations
    if (settings.escalation) {
      unsubscribes.push(
        notificationService.subscribe('escalation', handleNotification),
      );
    }

    // Assignments
    if (settings.assignment) {
      unsubscribes.push(
        notificationService.subscribe('assignment', handleNotification),
      );
    }

    // Resolutions
    if (settings.resolution) {
      unsubscribes.push(
        notificationService.subscribe('resolution', handleNotification),
      );
    }

    // Check connection status
    const checkConnection = () => {
      setConnectionStatus(notificationService.getConnectionStatus());
    };

    checkConnection();
    const connectionInterval = setInterval(checkConnection, 5000);

    // Cleanup
    return () => {
      unsubscribes.forEach((unsub) => unsub());
      clearInterval(connectionInterval);
    };
  }, [settings]);

  const handleNotification = (notification: NotificationItem) => {
    // Add to notifications list
    setNotifications((prev) => {
      const exists = prev.some((n) => n.id === notification.id);
      if (!exists) {
        const newNotifications = [notification, ...prev].slice(0, 50); // Keep last 50

        // Play sound if enabled
        if (
          soundEnabled &&
          (notification.type === 'wedding_emergency' ||
            notification.action_required)
        ) {
          playNotificationSound(notification.type);
        }

        return newNotifications;
      }
      return prev;
    });
  };

  const playNotificationSound = (type: NotificationType) => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();

      switch (type) {
        case 'wedding_emergency':
          // Critical alert sound
          audio.src = '/sounds/emergency-alert.mp3';
          break;
        case 'sla_breach':
          // Warning sound
          audio.src = '/sounds/warning-beep.mp3';
          break;
        default:
          // Standard notification sound
          audio.src = '/sounds/notification.mp3';
      }

      audio.volume = 0.7;
      audio.play().catch(console.error);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'wedding_emergency':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'sla_breach':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'escalation':
        return <TrendingUp className="w-4 h-4 text-purple-500" />;
      case 'assignment':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'resolution':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'wedding_emergency':
        return 'border-red-200 bg-red-50';
      case 'sla_breach':
        return 'border-orange-200 bg-orange-50';
      case 'escalation':
        return 'border-purple-200 bg-purple-50';
      case 'assignment':
        return 'border-blue-200 bg-blue-50';
      case 'resolution':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const emergencyCount = emergencies.length;

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            {(unreadCount > 0 || emergencyCount > 0) && (
              <Badge
                variant={emergencyCount > 0 ? 'destructive' : 'secondary'}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {emergencyCount > 0 ? emergencyCount : unreadCount}
              </Badge>
            )}
            {!connectionStatus && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-96 p-0" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Support Notifications</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => notificationService.sendTestNotification()}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {unreadCount} unread • {notifications.length} total
                </span>
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      connectionStatus ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-xs text-gray-500">
                    {connectionStatus ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              {notifications.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    Mark all read
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllNotifications}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear all
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {emergencyCount > 0 && (
                  <div className="p-3 bg-red-50 border-b border-red-200">
                    <div className="flex items-center gap-2 text-red-800 font-medium text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      {emergencyCount} Wedding Emergency
                      {emergencyCount > 1 ? 'ies' : 'y'} Active
                    </div>
                  </div>
                )}

                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                    <p className="text-sm">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 hover:bg-gray-50 ${
                          !notification.read
                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                            : ''
                        } ${notification.type === 'wedding_emergency' ? 'bg-red-50 border-l-4 border-l-red-500' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {notification.message}
                                </p>

                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <span>
                                    #{notification.ticket_id.slice(-8)}
                                  </span>
                                  <span>•</span>
                                  <span>{notification.customer_name}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-1 py-0"
                                  >
                                    {notification.customer_tier}
                                  </Badge>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-500">
                                    {formatTimeAgo(notification.created_at)}
                                  </span>

                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        window.open(
                                          `/admin/support/tickets/${notification.ticket_id}`,
                                          '_blank',
                                        );
                                        markAsRead(notification.id);
                                      }}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </Button>

                                    {!notification.read && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          markAsRead(notification.id)
                                        }
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                      </Button>
                                    )}

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        clearNotification(notification.id)
                                      }
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="p-3">
                <div className="text-xs text-gray-600 mb-2">
                  Notification Settings
                </div>
                <div className="space-y-2">
                  {Object.entries(settings).map(([key, enabled]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <label className="text-xs text-gray-700 capitalize">
                        {key.replace('_', ' ')}
                        {key === 'wedding_emergency' && (
                          <Badge variant="destructive" className="ml-1 text-xs">
                            Always On
                          </Badge>
                        )}
                      </label>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => {
                          if (key !== 'wedding_emergency') {
                            // Can't disable wedding emergencies
                            setSettings((prev) => ({
                              ...prev,
                              [key]: checked,
                            }));
                          }
                        }}
                        disabled={key === 'wedding_emergency'}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
