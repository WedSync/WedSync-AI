// WedSync Notification Hooks - Comprehensive Notification Management
// Main hooks for notification system integration

import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  useNotificationStore,
  useNotificationSelectors,
  useWeddingDayNotifications,
} from '@/lib/stores/notificationStore';
import type {
  Notification,
  NotificationAction,
  NotificationActionRequest,
  NotificationPreferences,
  WeddingReference,
  NotificationCategory,
  PriorityLevel,
  GroupingStrategy,
  ActionResult,
} from '@/types';

// Main notification hook
export function useNotifications(
  userId: string,
  organizationId: string,
  weddingContext?: WeddingReference[],
) {
  const store = useNotificationStore();
  const selectors = useNotificationSelectors();
  const weddingDayHook = useWeddingDayNotifications(weddingContext);

  // Real-time connection management
  const [connectionState, setConnectionState] = useState({
    isConnecting: false,
    lastReconnectAttempt: null as Date | null,
    error: null as string | null,
  });

  // Initialize real-time connection
  useEffect(() => {
    if (!userId || !organizationId) return;

    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    const eventSource = new EventSource(
      `/api/notifications/stream?userId=${userId}&organizationId=${organizationId}`,
    );

    eventSource.onopen = () => {
      store.setRealtimeStatus(true);
      setConnectionState((prev) => ({
        ...prev,
        isConnecting: false,
        error: null,
        lastReconnectAttempt: null,
      }));
    };

    eventSource.onmessage = (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        store.addNotification(notification);
      } catch (error) {
        console.error('Failed to parse notification:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Notification stream error:', error);
      store.setRealtimeStatus(false);
      setConnectionState((prev) => ({
        ...prev,
        isConnecting: false,
        error: 'Connection lost',
        lastReconnectAttempt: new Date(),
      }));
    };

    // Cleanup
    return () => {
      eventSource.close();
      store.setRealtimeStatus(false);
    };
  }, [userId, organizationId, store]);

  // Enhanced notification actions
  const actions = useMemo(
    () => ({
      // Mark notifications as read
      markAsRead: (notificationId: string) => {
        store.markAsRead(notificationId);
      },

      markAllAsRead: () => {
        store.markAllAsRead();
      },

      // Handle notification actions
      handleAction: async (
        request: NotificationActionRequest,
      ): Promise<ActionResult> => {
        try {
          const response = await fetch('/api/notifications/actions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result: ActionResult = await response.json();

          if (result.success) {
            // Update notification state based on action
            const notification = store.notifications.find(
              (n) => n.notificationId === request.notificationId,
            );
            if (notification) {
              store.updateNotification(request.notificationId, {
                readStatus: true,
                engagement: {
                  ...notification.engagement,
                  actionTaken: true,
                  actionTakenAt: new Date(),
                },
              });
            }
          }

          return result;
        } catch (error) {
          console.error('Notification action failed:', error);
          return {
            success: false,
            error: {
              code: 'ACTION_FAILED',
              message: error instanceof Error ? error.message : 'Unknown error',
              retryable: true,
            },
          };
        }
      },

      // Group management
      toggleGroup: (groupId: string) => {
        const isExpanded = store.groups.find(
          (g) => g.groupId === groupId,
        )?.expanded;
        // This would update group expansion state
        console.log(`Toggle group ${groupId}: ${!isExpanded}`);
      },

      markGroupRead: (groupId: string) => {
        const group = store.groups.find((g) => g.groupId === groupId);
        if (group) {
          group.notifications.forEach((notification) => {
            if (!notification.readStatus) {
              store.markAsRead(notification.notificationId);
            }
          });
        }
      },

      dismissGroup: (groupId: string) => {
        const group = store.groups.find((g) => g.groupId === groupId);
        if (group) {
          group.notifications.forEach((notification) => {
            store.removeNotification(notification.notificationId);
          });
        }
      },

      // Filtering and grouping
      setFilter: (category: NotificationCategory | 'all') => {
        store.setActiveFilter(category);
      },

      setPriorityFilter: (priority: PriorityLevel | 'all') => {
        store.setPriorityFilter(priority);
      },

      groupBy: (strategy: GroupingStrategy) => {
        store.groupNotifications(strategy);
      },

      // UI state
      toggleNotificationCenter: () => {
        store.toggleNotificationCenter();
      },

      // Preferences
      updatePreferences: async (
        preferences: Partial<NotificationPreferences>,
      ) => {
        try {
          const response = await fetch('/api/notifications/preferences', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, preferences }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          store.updatePreferences(preferences);
          return { success: true };
        } catch (error) {
          console.error('Failed to update preferences:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    }),
    [store, userId],
  );

  // Computed values
  const computed = useMemo(
    () => ({
      // Get filtered notifications
      filteredNotifications: selectors.filteredNotifications(),

      // Get counts
      unreadCount: selectors.unreadCount(),
      totalCount: store.notifications.length,

      // Get specific notification types
      criticalNotifications: selectors.criticalNotifications(),
      weddingDayNotifications: selectors.weddingDayNotifications(),

      // Get category counts for filters
      categoryCounts: selectors.categoryCounts(),

      // Check if should show badge
      shouldShowBadge: selectors.shouldShowBadge(),

      // Connection state
      isConnected: store.realtime.connected,
      isConnecting: connectionState.isConnecting,
      connectionError: connectionState.error,

      // UI state
      isOpen: store.ui.isOpen,
      isLoading: store.ui.isLoading,
      error: store.ui.error,

      // Filters
      activeFilter: store.ui.activeFilter,
      activePriorityFilter: store.ui.activePriorityFilter,

      // Wedding day specific
      isWeddingDay: weddingDayHook.isWeddingDay,
      criticalWeddingAlerts: weddingDayHook.criticalWeddingAlerts,
      todayWeddingNotifications: weddingDayHook.todayWeddingNotifications,
    }),
    [store, selectors, weddingDayHook, connectionState],
  );

  return {
    // State
    notifications: store.notifications,
    groups: store.groups,
    preferences: store.preferences,

    // Actions
    ...actions,

    // Computed values
    ...computed,
  };
}

// Hook for notification sounds and audio feedback
export function useNotificationSounds(enabled: boolean = true) {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [sounds, setSounds] = useState<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Initialize audio context for better control
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    setAudioContext(ctx);

    // Preload notification sounds
    const soundUrls = {
      critical: '/sounds/critical-alert.mp3',
      high: '/sounds/high-priority.mp3',
      medium: '/sounds/medium-priority.mp3',
      low: '/sounds/low-priority.mp3',
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
    };

    const loadedSounds: Record<string, HTMLAudioElement> = {};

    Object.entries(soundUrls).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 0.5;
      loadedSounds[key] = audio;
    });

    setSounds(loadedSounds);

    return () => {
      ctx.close();
      Object.values(loadedSounds).forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [enabled]);

  const playSound = useCallback(
    (
      soundType: 'critical' | 'high' | 'medium' | 'low' | 'success' | 'error',
      volume: number = 0.5,
    ) => {
      if (!enabled || !sounds[soundType]) return;

      try {
        const audio = sounds[soundType];
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.currentTime = 0;
        audio.play().catch((error) => {
          console.warn(`Failed to play notification sound: ${error.message}`);
        });
      } catch (error) {
        console.warn('Error playing notification sound:', error);
      }
    },
    [enabled, sounds],
  );

  const playNotificationSound = useCallback(
    (priority: PriorityLevel) => {
      switch (priority) {
        case 'critical':
          playSound('critical', 0.8);
          break;
        case 'high':
          playSound('high', 0.6);
          break;
        case 'medium':
          playSound('medium', 0.4);
          break;
        case 'low':
          playSound('low', 0.3);
          break;
        default:
          playSound('medium', 0.4);
      }
    },
    [playSound],
  );

  return {
    playSound,
    playNotificationSound,
    playSuccess: () => playSound('success'),
    playError: () => playSound('error'),
    isSupported: audioContext !== null,
  };
}

// Hook for notification permissions and browser APIs
export function useNotificationPermissions() {
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);
  }, []);

  const requestPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (!isSupported) return 'denied';

      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        return result;
      } catch (error) {
        console.error('Failed to request notification permission:', error);
        return 'denied';
      }
    }, [isSupported]);

  const showBrowserNotification = useCallback(
    (title: string, options: NotificationOptions = {}) => {
      if (!isSupported || permission !== 'granted') return null;

      try {
        const notification = new Notification(title, {
          icon: '/icons/notification-icon.png',
          badge: '/icons/badge-icon.png',
          tag: 'wedsync-notification',
          requireInteraction: options.requireInteraction || false,
          ...options,
        });

        // Auto-close after 5 seconds if not requiring interaction
        if (!options.requireInteraction) {
          setTimeout(() => {
            notification.close();
          }, 5000);
        }

        return notification;
      } catch (error) {
        console.error('Failed to show browser notification:', error);
        return null;
      }
    },
    [isSupported, permission],
  );

  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    requestPermission,
    showBrowserNotification,
  };
}

// Hook for mobile-specific notification features
export function useMobileNotifications() {
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    'portrait',
  );
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      );
    };

    const checkStandalone = () => {
      setIsStandalone(
        window.navigator.standalone ||
          window.matchMedia('(display-mode: standalone)').matches,
      );
    };

    checkMobile();
    checkStandalone();

    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (!navigator.vibrate) return false;

      try {
        switch (type) {
          case 'light':
            navigator.vibrate(10);
            break;
          case 'medium':
            navigator.vibrate(25);
            break;
          case 'heavy':
            navigator.vibrate([50, 10, 50]);
            break;
        }
        return true;
      } catch (error) {
        console.warn('Haptic feedback failed:', error);
        return false;
      }
    },
    [],
  );

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return null;

    try {
      const wakeLock = await (navigator as any).wakeLock.request('screen');
      return wakeLock;
    } catch (error) {
      console.warn('Wake lock request failed:', error);
      return null;
    }
  }, []);

  return {
    isMobile,
    orientation,
    isStandalone,
    isHapticSupported: 'vibrate' in navigator,
    isWakeLockSupported: 'wakeLock' in navigator,
    triggerHaptic,
    requestWakeLock,
  };
}

// Wedding day specific notification hook
export function useWeddingDayAlerts(weddingContext?: WeddingReference[]) {
  const { notifications } = useNotifications('', ''); // These would come from context
  const { playNotificationSound } = useNotificationSounds();
  const { triggerHaptic } = useMobileNotifications();

  const weddingDayData = useMemo(() => {
    if (!weddingContext) return null;

    const todayWeddings = weddingContext.filter(
      (wedding) => wedding.isWeddingDay,
    );
    if (todayWeddings.length === 0) return null;

    return {
      weddings: todayWeddings,
      criticalAlerts: notifications.filter(
        (n) =>
          n.category === 'wedding_day' &&
          n.priority === 'critical' &&
          !n.readStatus &&
          todayWeddings.some(
            (w) => w.weddingId === n.relatedWedding?.weddingId,
          ),
      ),
      weatherAlerts: notifications.filter(
        (n) =>
          n.type === 'weather' &&
          todayWeddings.some(
            (w) => w.weddingId === n.relatedWedding?.weddingId,
          ),
      ),
    };
  }, [weddingContext, notifications]);

  const handleCriticalAlert = useCallback(
    (notification: Notification) => {
      // Play urgent sound
      playNotificationSound('critical');

      // Trigger strong haptic feedback
      triggerHaptic('heavy');

      // Could trigger other wedding day specific behaviors
      console.log('Wedding day critical alert:', notification);
    },
    [playNotificationSound, triggerHaptic],
  );

  return {
    isWeddingDay: weddingDayData !== null,
    weddingDayData,
    handleCriticalAlert,
  };
}

// Export all hooks
export default useNotifications;
