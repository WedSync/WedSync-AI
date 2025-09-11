'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { Toast } from '@/components/ui/Toast';
import { TouchButton } from '@/components/touch/TouchButton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Users,
  Settings,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

interface PushNotificationSettings {
  enabled: boolean;
  deliveryUpdates: boolean;
  urgentMessages: boolean;
  guestResponses: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

interface MessageNotification {
  id: string;
  type:
    | 'delivery_success'
    | 'delivery_failed'
    | 'urgent_sent'
    | 'guest_response';
  title: string;
  body: string;
  timestamp: Date;
  messageId?: string;
  guestName?: string;
  isRead: boolean;
  action?: {
    label: string;
    url: string;
  };
}

interface PushNotificationContextType {
  permission: NotificationPermission;
  settings: PushNotificationSettings;
  notifications: MessageNotification[];
  requestPermission: () => Promise<boolean>;
  updateSettings: (settings: Partial<PushNotificationSettings>) => void;
  sendNotification: (
    notification: Omit<MessageNotification, 'id' | 'timestamp' | 'isRead'>,
  ) => void;
  markAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
  isSupported: boolean;
}

const PushNotificationContext = createContext<
  PushNotificationContextType | undefined
>(undefined);

interface PushNotificationProviderProps {
  children: React.ReactNode;
}

export function PushNotificationProvider({
  children,
}: PushNotificationProviderProps) {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true,
  });

  const [settings, setSettings] = useState<PushNotificationSettings>({
    enabled: true,
    deliveryUpdates: true,
    urgentMessages: true,
    guestResponses: true,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  const [notifications, setNotifications] = useState<MessageNotification[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  // Check if notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      // Get current permission status
      const currentPermission = Notification.permission;
      setPermission({
        granted: currentPermission === 'granted',
        denied: currentPermission === 'denied',
        default: currentPermission === 'default',
      });
    }

    // Load settings from localStorage
    const storedSettings = localStorage.getItem('push-notification-settings');
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse notification settings:', error);
      }
    }

    // Load notifications from localStorage
    const storedNotifications = localStorage.getItem('message-notifications');
    if (storedNotifications) {
      try {
        const parsed = JSON.parse(storedNotifications);
        const notifications = parsed.map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp),
        }));
        setNotifications(notifications);
      } catch (error) {
        console.error('Failed to parse notifications:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(
      'push-notification-settings',
      JSON.stringify(settings),
    );
  }, [settings]);

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem(
      'message-notifications',
      JSON.stringify(notifications),
    );
  }, [notifications]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      const granted = result === 'granted';

      setPermission({
        granted,
        denied: result === 'denied',
        default: result === 'default',
      });

      if (granted) {
        Toast({
          title: 'Notifications Enabled',
          description: "You'll receive updates about your message deliveries",
          duration: 3000,
        });
      }

      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const updateSettings = useCallback(
    (newSettings: Partial<PushNotificationSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
    },
    [],
  );

  const sendNotification = useCallback(
    (
      notificationData: Omit<
        MessageNotification,
        'id' | 'timestamp' | 'isRead'
      >,
    ) => {
      if (!isSupported || !permission.granted || !settings.enabled) return;

      const notification: MessageNotification = {
        ...notificationData,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        isRead: false,
      };

      // Check if this type of notification is enabled
      const shouldSend =
        (notification.type === 'delivery_success' &&
          settings.deliveryUpdates) ||
        (notification.type === 'delivery_failed' && settings.deliveryUpdates) ||
        (notification.type === 'urgent_sent' && settings.urgentMessages) ||
        (notification.type === 'guest_response' && settings.guestResponses);

      if (!shouldSend) return;

      // Add to notifications list
      setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep only latest 50

      // Send browser notification
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.body,
          icon: '/favicon.ico',
          badge: '/badge-icon.png',
          tag: notification.messageId || notification.id,
          silent: !settings.soundEnabled,
          vibrate: settings.vibrationEnabled ? [200, 100, 200] : undefined,
          actions: notification.action
            ? [
                {
                  action: 'view',
                  title: notification.action.label,
                  icon: '/icons/view.png',
                },
              ]
            : [],
        });

        browserNotification.onclick = () => {
          if (notification.action) {
            window.open(notification.action.url, '_blank');
          }
          browserNotification.close();
          markAsRead(notification.id);
        };

        // Auto-close after 10 seconds
        setTimeout(() => {
          browserNotification.close();
        }, 10000);
      } catch (error) {
        console.error('Failed to send browser notification:', error);
      }
    },
    [isSupported, permission.granted, settings],
  );

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif,
      ),
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    Toast({
      title: 'Notifications Cleared',
      description: 'All message notifications have been removed',
      duration: 2000,
    });
  }, []);

  return (
    <PushNotificationContext.Provider
      value={{
        permission,
        settings,
        notifications,
        requestPermission,
        updateSettings,
        sendNotification,
        markAsRead,
        clearNotifications,
        isSupported,
      }}
    >
      {children}
      <NotificationDisplay />
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error(
      'usePushNotifications must be used within PushNotificationProvider',
    );
  }
  return context;
}

// Component for displaying notification settings
export function NotificationSettings() {
  const {
    permission,
    settings,
    requestPermission,
    updateSettings,
    isSupported,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="p-4">
        <div className="text-center">
          <BellOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="font-medium mb-1">Notifications Not Supported</h3>
          <p className="text-sm text-muted-foreground">
            Your browser doesn't support push notifications
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-pink-600" />
        <h3 className="text-lg font-semibold">Notification Settings</h3>
      </div>

      {/* Permission Status */}
      <div className="p-3 rounded-lg bg-muted/50">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Permission Status</span>
          <Badge variant={permission.granted ? 'default' : 'outline'}>
            {permission.granted
              ? 'Granted'
              : permission.denied
                ? 'Denied'
                : 'Not Requested'}
          </Badge>
        </div>

        {!permission.granted && (
          <TouchButton
            onClick={requestPermission}
            className="w-full"
            disabled={permission.denied}
          >
            <Bell className="w-4 h-4 mr-2" />
            {permission.denied ? 'Permission Denied' : 'Enable Notifications'}
          </TouchButton>
        )}
      </div>

      {/* Notification Types */}
      <div className="space-y-3">
        <h4 className="font-medium">Notification Types</h4>

        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <div>
                <p className="font-medium">Delivery Updates</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when messages are delivered or fail
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.deliveryUpdates}
              onChange={(e) =>
                updateSettings({ deliveryUpdates: e.target.checked })
              }
              className="w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div>
                <p className="font-medium">Urgent Messages</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when urgent messages are sent
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.urgentMessages}
              onChange={(e) =>
                updateSettings({ urgentMessages: e.target.checked })
              }
              className="w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-blue-600" />
              <div>
                <p className="font-medium">Guest Responses</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when guests respond to messages
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.guestResponses}
              onChange={(e) =>
                updateSettings({ guestResponses: e.target.checked })
              }
              className="w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Sound & Vibration */}
      <div className="space-y-3">
        <h4 className="font-medium">Sound & Vibration</h4>

        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-blue-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm">Sound</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) =>
                updateSettings({ soundEnabled: e.target.checked })
              }
              className="w-4 h-4"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="text-sm">Vibration</span>
            <input
              type="checkbox"
              checked={settings.vibrationEnabled}
              onChange={(e) =>
                updateSettings({ vibrationEnabled: e.target.checked })
              }
              className="w-4 h-4"
            />
          </label>
        </div>
      </div>
    </Card>
  );
}

// Component for displaying notification history
function NotificationDisplay() {
  const { notifications, markAsRead, clearNotifications } =
    usePushNotifications();
  const [showHistory, setShowHistory] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (notifications.length === 0) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'delivery_success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'delivery_failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'urgent_sent':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'guest_response':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <>
      {/* Notification Badge */}
      {unreadCount > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <TouchButton
            onClick={() => setShowHistory(true)}
            size="sm"
            className="relative"
          >
            <Bell className="w-4 h-4" />
            <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs">
              {unreadCount}
            </Badge>
          </TouchButton>
        </div>
      )}

      {/* Notification History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <Card className="w-full max-h-[80vh] md:w-96 rounded-t-xl md:rounded-lg flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">Message Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  {notifications.length} notification
                  {notifications.length === 1 ? '' : 's'}
                  {unreadCount > 0 && `, ${unreadCount} unread`}
                </p>
              </div>
              <TouchButton
                size="sm"
                variant="ghost"
                onClick={() => setShowHistory(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </TouchButton>
            </div>

            {/* Notifications */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border cursor-pointer ${
                    notification.isRead
                      ? 'bg-muted/30'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.action) {
                      window.open(notification.action.url, '_blank');
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="p-4 border-t">
              <TouchButton
                onClick={clearNotifications}
                variant="outline"
                className="w-full"
              >
                Clear All Notifications
              </TouchButton>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
