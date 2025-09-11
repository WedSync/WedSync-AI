'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, AlertTriangle, Phone } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface NotificationPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
  isPWA: boolean;
}

interface NotificationSettings {
  enabled: boolean;
  urgentOnly: boolean;
  weddingDayOnly: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

interface WeddingDayNotification {
  ticketId: string;
  title: string;
  venue?: string;
  priority: 'urgent' | 'wedding_day_emergency';
  timestamp: string;
}

export function NotificationManager() {
  const [permissionState, setPermissionState] =
    useState<NotificationPermissionState>({
      permission: 'default',
      isSupported: false,
      isPWA: false,
    });

  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    urgentOnly: false,
    weddingDayOnly: true,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  const [pendingNotifications, setPendingNotifications] = useState<
    WeddingDayNotification[]
  >([]);
  const [showSettings, setShowSettings] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Initialize notification state
  useEffect(() => {
    const checkNotificationSupport = () => {
      const isSupported = 'Notification' in window;
      const isPWA =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

      setPermissionState({
        permission: isSupported ? Notification.permission : 'denied',
        isSupported,
        isPWA,
      });
    };

    checkNotificationSupport();

    // Load settings from localStorage
    const savedSettings = localStorage.getItem('wedsync-notification-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    }

    // Listen for PWA installation
    window.addEventListener('appinstalled', checkNotificationSupport);

    return () => {
      window.removeEventListener('appinstalled', checkNotificationSupport);
    };
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(
      'wedsync-notification-settings',
      JSON.stringify(settings),
    );
  }, [settings]);

  // Request notification permission
  const requestPermission = async () => {
    if (!permissionState.isSupported) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState((prev) => ({ ...prev, permission }));
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  // Show wedding day emergency notification
  const showWeddingDayEmergency = async (
    notification: WeddingDayNotification,
  ) => {
    if (!settings.enabled || permissionState.permission !== 'granted') {
      return;
    }

    // Filter based on settings
    if (
      settings.urgentOnly &&
      notification.priority !== 'urgent' &&
      notification.priority !== 'wedding_day_emergency'
    ) {
      return;
    }

    if (
      settings.weddingDayOnly &&
      notification.priority !== 'wedding_day_emergency'
    ) {
      return;
    }

    const title =
      notification.priority === 'wedding_day_emergency'
        ? '🚨 Wedding Day Emergency!'
        : '⚡ Urgent Support Request';

    const body = `${notification.title}${notification.venue ? ` at ${notification.venue}` : ''}`;

    try {
      const notificationInstance = new Notification(title, {
        body,
        icon: '/icons/wedding-alert.png',
        badge: '/icons/badge.png',
        tag: `wedding-${notification.ticketId}`,
        requireInteraction: true,
        silent: !settings.soundEnabled,
        actions: [
          { action: 'view', title: 'View Ticket' },
          { action: 'call', title: 'Call Support' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
        data: {
          ticketId: notification.ticketId,
          priority: notification.priority,
          timestamp: notification.timestamp,
        },
      });

      // Handle notification click
      notificationInstance.onclick = () => {
        window.focus();
        handleNotificationAction('view', notification.ticketId);
      };

      // Vibration for mobile devices
      if (settings.vibrationEnabled && 'vibrate' in navigator) {
        if (notification.priority === 'wedding_day_emergency') {
          // Strong vibration pattern for emergencies
          navigator.vibrate([200, 100, 200, 100, 200]);
        } else {
          // Gentle vibration for urgent tickets
          navigator.vibrate([100, 50, 100]);
        }
      }

      // Add to pending notifications for in-app display
      setPendingNotifications((prev) => [notification, ...prev.slice(0, 4)]);

      // Auto-remove from pending after 10 seconds for non-emergencies
      if (notification.priority !== 'wedding_day_emergency') {
        setTimeout(() => {
          setPendingNotifications((prev) =>
            prev.filter((n) => n.ticketId !== notification.ticketId),
          );
        }, 10000);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  // Handle notification actions
  const handleNotificationAction = (action: string, ticketId: string) => {
    switch (action) {
      case 'view':
        window.location.href = `/support/tickets/${ticketId}`;
        break;
      case 'call':
        // Open emergency support call
        window.location.href = 'tel:+441234567890'; // Replace with actual support number
        break;
      case 'dismiss':
        dismissNotification(ticketId);
        break;
    }
  };

  // Dismiss notification
  const dismissNotification = (ticketId: string) => {
    setPendingNotifications((prev) =>
      prev.filter((n) => n.ticketId !== ticketId),
    );
  };

  // Register service worker for background notifications
  useEffect(() => {
    if (
      'serviceWorker' in navigator &&
      permissionState.permission === 'granted'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log(
            'Service Worker registered for notifications:',
            registration,
          );

          // Handle notification actions from service worker
          if (registration.active) {
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data.type === 'notification-action') {
                handleNotificationAction(
                  event.data.action,
                  event.data.ticketId,
                );
              }
            });
          }
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, [permissionState.permission]);

  return (
    <div className="notification-manager">
      {/* Notification Permission Banner */}
      {permissionState.isSupported &&
        permissionState.permission !== 'granted' && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-400 mr-3" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">
                  Enable notifications to receive instant alerts for wedding day
                  emergencies
                </p>
                <button
                  onClick={requestPermission}
                  className="mt-2 text-sm text-amber-600 underline hover:text-amber-500"
                >
                  Enable Notifications
                </button>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="ml-3 p-2 text-amber-600 hover:text-amber-500 rounded-full hover:bg-amber-100"
              >
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

      {/* Notification Settings */}
      {showSettings && (
        <div className="bg-white rounded-lg border shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Notification Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">
                Enable Notifications
              </label>
              <button
                onClick={() =>
                  setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">
                Wedding Day Emergencies Only
              </label>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    weddingDayOnly: !prev.weddingDayOnly,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.weddingDayOnly ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.weddingDayOnly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">
                Urgent Tickets Only
              </label>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    urgentOnly: !prev.urgentOnly,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.urgentOnly ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.urgentOnly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Sound</label>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    soundEnabled: !prev.soundEnabled,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Vibration</label>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    vibrationEnabled: !prev.vibrationEnabled,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.vibrationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.vibrationEnabled
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Notifications */}
      {pendingNotifications.length > 0 && (
        <div className="space-y-2 mb-4">
          {pendingNotifications.map((notification) => (
            <div
              key={notification.ticketId}
              className={`rounded-lg p-3 border-l-4 ${
                notification.priority === 'wedding_day_emergency'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-amber-50 border-amber-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-lg ${
                        notification.priority === 'wedding_day_emergency'
                          ? '🚨'
                          : '⚡'
                      }`}
                    >
                      {notification.priority === 'wedding_day_emergency'
                        ? '🚨'
                        : '⚡'}
                    </span>
                    <h4
                      className={`font-medium truncate ${
                        notification.priority === 'wedding_day_emergency'
                          ? 'text-red-900'
                          : 'text-amber-900'
                      }`}
                    >
                      {notification.title}
                    </h4>
                  </div>
                  {notification.venue && (
                    <p className="text-sm text-gray-600 mt-1">
                      📍 {notification.venue}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>

                <div className="flex space-x-1 ml-3">
                  <button
                    onClick={() =>
                      handleNotificationAction('view', notification.ticketId)
                    }
                    className={`p-2 rounded text-white text-sm ${
                      notification.priority === 'wedding_day_emergency'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    View
                  </button>

                  {notification.priority === 'wedding_day_emergency' && (
                    <button
                      onClick={() =>
                        handleNotificationAction('call', notification.ticketId)
                      }
                      className="p-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                      title="Emergency Call"
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => dismissNotification(notification.ticketId)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notification Status Indicator */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          {permissionState.permission === 'granted' ? (
            <Bell className="h-4 w-4 text-green-600" />
          ) : (
            <BellOff className="h-4 w-4 text-gray-400" />
          )}
          <span>
            {permissionState.permission === 'granted'
              ? 'Notifications enabled'
              : 'Notifications disabled'}
          </span>
          {permissionState.isPWA && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
              PWA
            </span>
          )}
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-blue-600 hover:text-blue-500 underline"
        >
          Settings
        </button>
      </div>
    </div>
  );

  // Export the function to show notifications from other components
  return {
    NotificationManager: () => (
      <div className="notification-manager">{/* Component JSX here */}</div>
    ),
    showWeddingDayEmergency,
  };
}
