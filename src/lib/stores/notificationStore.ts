// WedSync Notification Store - Zustand State Management
// Comprehensive notification state for the WedSync platform

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Notification,
  NotificationGroup,
  NotificationPreferences,
  NotificationState,
  NotificationActions,
  NotificationStore,
  NotificationCategory,
  PriorityLevel,
  GroupingStrategy,
  WeddingReference,
  VendorReference,
} from '@/types';

// Default notification preferences for new users
const DEFAULT_PREFERENCES: NotificationPreferences = {
  userId: '',
  channels: {
    in_app: { enabled: true, types: [], quietHours: undefined },
    email: { enabled: true, types: [], quietHours: undefined },
    sms: { enabled: false, types: [], quietHours: undefined },
    push: { enabled: true, types: [], quietHours: undefined },
    whatsapp: { enabled: false, types: [], quietHours: undefined },
    emergency_call: {
      enabled: true,
      types: ['emergency'],
      quietHours: undefined,
    },
  },
  categorySettings: {
    urgent: {
      enabled: true,
      priority: 'critical',
      channels: ['in_app', 'email', 'sms', 'push'],
      emergencyOverride: true,
    },
    wedding_day: {
      enabled: true,
      priority: 'critical',
      channels: ['in_app', 'push', 'sms'],
      emergencyOverride: true,
    },
    payments: {
      enabled: true,
      priority: 'high',
      channels: ['in_app', 'email'],
      emergencyOverride: false,
    },
    communications: {
      enabled: true,
      priority: 'medium',
      channels: ['in_app', 'email'],
      emergencyOverride: false,
    },
    updates: {
      enabled: true,
      priority: 'medium',
      channels: ['in_app'],
      emergencyOverride: false,
    },
    reminders: {
      enabled: true,
      priority: 'medium',
      channels: ['in_app', 'email'],
      emergencyOverride: false,
    },
    celebrations: {
      enabled: true,
      priority: 'low',
      channels: ['in_app'],
      emergencyOverride: false,
    },
    system_alerts: {
      enabled: true,
      priority: 'high',
      channels: ['in_app', 'email'],
      emergencyOverride: false,
    },
  },
  quietHours: {
    enabled: true,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'UTC',
    emergencyOverride: true,
    weddingDayOverride: true,
    weekendSettings: {
      enabled: false,
      startTime: '23:00',
      endTime: '09:00',
    },
  },
  weddingDaySettings: {
    enableSpecialMode: true,
    criticalAlertsOnly: false,
    soundEnabled: true,
    vibrationEnabled: true,
    emergencyContactsEnabled: true,
    weatherAlertsEnabled: true,
    vendorCoordinationEnabled: true,
    timelineAlertsEnabled: true,
    celebrationNotificationsEnabled: true,
  },
  emergencyOverrides: {
    enabled: true,
    emergencyContacts: [],
    escalationTimeMinutes: 15,
    bypassQuietHours: true,
    forceSound: true,
    forceVibration: true,
    requireAcknowledgment: true,
  },
  personalizations: {
    displayName: '',
    greetingStyle: 'professional',
    celebrationStyle: 'gentle',
    languagePreference: 'en',
    timezonePreference: 'UTC',
  },
  smartFiltering: {
    enabled: true,
    duplicateDetection: true,
    relatedGrouping: true,
    urgencyScoring: true,
    predictiveFiltering: true,
    learningEnabled: true,
    confidenceThreshold: 0.7,
  },
  mobileSettings: {
    swipeGesturesEnabled: true,
    hapticFeedbackEnabled: true,
    largeTextMode: false,
    oneHandedMode: false,
    batteryOptimizationEnabled: true,
    offlineStorageDays: 7,
  },
};

// Initial state for the notification store
const INITIAL_STATE: NotificationState = {
  notifications: [],
  groups: [],
  preferences: DEFAULT_PREFERENCES,
  ui: {
    isOpen: false,
    activeFilter: 'all',
    activePriorityFilter: 'all',
    isLoading: false,
    error: null,
  },
  realtime: {
    connected: false,
    reconnectAttempts: 0,
    lastMessage: undefined,
  },
};

// Utility functions for notification management
const sortNotificationsByPriority = (
  notifications: Notification[],
): Notification[] => {
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  return notifications.sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
};

const filterNotificationsByCategory = (
  notifications: Notification[],
  category: NotificationCategory | 'all',
): Notification[] => {
  if (category === 'all') return notifications;
  return notifications.filter((n) => n.category === category);
};

const filterNotificationsByPriority = (
  notifications: Notification[],
  priority: PriorityLevel | 'all',
): Notification[] => {
  if (priority === 'all') return notifications;
  return notifications.filter((n) => n.priority === priority);
};

const groupNotificationsByStrategy = (
  notifications: Notification[],
  strategy: GroupingStrategy,
): NotificationGroup[] => {
  const groups = new Map<string, NotificationGroup>();

  notifications.forEach((notification) => {
    let groupKey: string;
    let groupTitle: string;

    switch (strategy) {
      case 'by_wedding':
        groupKey = notification.relatedWedding?.weddingId || 'general';
        groupTitle = notification.relatedWedding
          ? `${notification.relatedWedding.coupleName} Wedding`
          : 'General Notifications';
        break;
      case 'by_vendor':
        groupKey = notification.relatedVendor?.vendorId || 'system';
        groupTitle = notification.relatedVendor
          ? notification.relatedVendor.vendorName
          : 'System Notifications';
        break;
      case 'by_type':
        groupKey = notification.type;
        groupTitle = notification.type.replace('_', ' ').toUpperCase();
        break;
      case 'by_urgency':
        groupKey = notification.priority;
        groupTitle = `${notification.priority.toUpperCase()} Priority`;
        break;
      case 'by_date':
        const date = new Date(notification.timestamp);
        groupKey = date.toDateString();
        groupTitle = date.toDateString();
        break;
      default:
        groupKey = 'all';
        groupTitle = 'All Notifications';
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupId: groupKey,
        title: groupTitle,
        notifications: [],
        highestPriority: 'info',
        expanded: false,
        totalCount: 0,
        unreadCount: 0,
        groupType: strategy,
        lastUpdated: new Date(),
        weddingContext: notification.relatedWedding,
        vendorContext: notification.relatedVendor,
      });
    }

    const group = groups.get(groupKey)!;
    group.notifications.push(notification);
    group.totalCount = group.notifications.length;
    group.unreadCount = group.notifications.filter((n) => !n.readStatus).length;
    group.lastUpdated = new Date(
      Math.max(group.lastUpdated.getTime(), notification.timestamp.getTime()),
    );

    // Update highest priority
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    if (
      priorityOrder[notification.priority] >
      priorityOrder[group.highestPriority]
    ) {
      group.highestPriority = notification.priority;
    }
  });

  return Array.from(groups.values()).sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    return priorityOrder[b.highestPriority] - priorityOrder[a.highestPriority];
  });
};

// Create the notification store with Zustand
export const useNotificationStore = create<NotificationStore>()(
  devtools(
    subscribeWithSelector(
      immer<NotificationStore>((set, get) => ({
        ...INITIAL_STATE,

        // Notification management actions
        addNotification: (notification: Notification) =>
          set((state) => {
            // Check for duplicates
            const existingIndex = state.notifications.findIndex(
              (n) => n.notificationId === notification.notificationId,
            );

            if (existingIndex >= 0) {
              // Update existing notification
              state.notifications[existingIndex] = notification;
            } else {
              // Add new notification
              state.notifications.unshift(notification);
            }

            // Sort notifications by priority and timestamp
            state.notifications = sortNotificationsByPriority(
              state.notifications,
            );

            // Re-group notifications if smart filtering is enabled
            if (state.preferences.smartFiltering.enabled) {
              state.groups = groupNotificationsByStrategy(
                state.notifications,
                'smart_context',
              );
            }
          }),

        updateNotification: (id: string, updates: Partial<Notification>) =>
          set((state) => {
            const index = state.notifications.findIndex(
              (n) => n.notificationId === id,
            );
            if (index >= 0) {
              state.notifications[index] = {
                ...state.notifications[index],
                ...updates,
              };
            }
          }),

        removeNotification: (id: string) =>
          set((state) => {
            state.notifications = state.notifications.filter(
              (n) => n.notificationId !== id,
            );

            // Update groups
            state.groups.forEach((group) => {
              group.notifications = group.notifications.filter(
                (n) => n.notificationId !== id,
              );
              group.totalCount = group.notifications.length;
              group.unreadCount = group.notifications.filter(
                (n) => !n.readStatus,
              ).length;
            });
          }),

        markAsRead: (id: string) =>
          set((state) => {
            const notification = state.notifications.find(
              (n) => n.notificationId === id,
            );
            if (notification && !notification.readStatus) {
              notification.readStatus = true;
              notification.readAt = new Date();
              notification.engagement.viewed = true;
              notification.engagement.viewedAt = new Date();
            }
          }),

        markAllAsRead: () =>
          set((state) => {
            const now = new Date();
            state.notifications.forEach((notification) => {
              if (!notification.readStatus) {
                notification.readStatus = true;
                notification.readAt = now;
                notification.engagement.viewed = true;
                notification.engagement.viewedAt = now;
              }
            });

            // Update groups
            state.groups.forEach((group) => {
              group.unreadCount = 0;
            });
          }),

        // Filtering and grouping actions
        setActiveFilter: (filter: NotificationCategory | 'all') =>
          set((state) => {
            state.ui.activeFilter = filter;
          }),

        setPriorityFilter: (filter: PriorityLevel | 'all') =>
          set((state) => {
            state.ui.activePriorityFilter = filter;
          }),

        groupNotifications: (strategy: GroupingStrategy) =>
          set((state) => {
            state.groups = groupNotificationsByStrategy(
              state.notifications,
              strategy,
            );
          }),

        // UI state actions
        toggleNotificationCenter: () =>
          set((state) => {
            state.ui.isOpen = !state.ui.isOpen;
          }),

        setLoading: (loading: boolean) =>
          set((state) => {
            state.ui.isLoading = loading;
          }),

        setError: (error: string | null) =>
          set((state) => {
            state.ui.error = error;
          }),

        // Real-time actions
        setRealtimeStatus: (connected: boolean) =>
          set((state) => {
            state.realtime.connected = connected;
            if (connected) {
              state.realtime.reconnectAttempts = 0;
              state.realtime.lastMessage = new Date();
            }
          }),

        incrementReconnectAttempts: () =>
          set((state) => {
            state.realtime.reconnectAttempts += 1;
          }),

        resetReconnectAttempts: () =>
          set((state) => {
            state.realtime.reconnectAttempts = 0;
          }),

        // Preferences actions
        updatePreferences: (preferences: Partial<NotificationPreferences>) =>
          set((state) => {
            state.preferences = { ...state.preferences, ...preferences };
          }),
      })),
      {
        name: 'notification-store',
        version: 1,
      },
    ),
  ),
);

// Computed selectors for derived state
export const useNotificationSelectors = () => {
  const store = useNotificationStore();

  return {
    // Get filtered notifications based on current filters
    filteredNotifications: () => {
      let notifications = store.notifications;

      if (store.ui.activeFilter !== 'all') {
        notifications = filterNotificationsByCategory(
          notifications,
          store.ui.activeFilter,
        );
      }

      if (store.ui.activePriorityFilter !== 'all') {
        notifications = filterNotificationsByPriority(
          notifications,
          store.ui.activePriorityFilter,
        );
      }

      return notifications;
    },

    // Get unread count
    unreadCount: () => store.notifications.filter((n) => !n.readStatus).length,

    // Get critical notifications
    criticalNotifications: () =>
      store.notifications.filter(
        (n) => n.priority === 'critical' && !n.readStatus,
      ),

    // Get wedding day notifications
    weddingDayNotifications: () =>
      store.notifications.filter(
        (n) => n.category === 'wedding_day' && !n.readStatus,
      ),

    // Get notifications by wedding
    notificationsByWedding: (weddingId: string) =>
      store.notifications.filter(
        (n) => n.relatedWedding?.weddingId === weddingId,
      ),

    // Get notifications by vendor
    notificationsByVendor: (vendorId: string) =>
      store.notifications.filter((n) => n.relatedVendor?.vendorId === vendorId),

    // Check if notification center should show badge
    shouldShowBadge: () => {
      const unreadCount = store.notifications.filter(
        (n) => !n.readStatus,
      ).length;
      const hasCritical = store.notifications.some(
        (n) => n.priority === 'critical' && !n.readStatus,
      );
      return unreadCount > 0 || hasCritical;
    },

    // Get category counts for filter UI
    categoryCounts: () => {
      const counts: Record<NotificationCategory | 'all', number> = {
        all: store.notifications.length,
        urgent: 0,
        wedding_day: 0,
        payments: 0,
        communications: 0,
        updates: 0,
        reminders: 0,
        celebrations: 0,
        system_alerts: 0,
      };

      store.notifications.forEach((notification) => {
        counts[notification.category]++;
      });

      return counts;
    },
  };
};

// Wedding day specific selectors and utilities
export const useWeddingDayNotifications = (
  weddingContext?: WeddingReference[],
) => {
  const store = useNotificationStore();
  const isWeddingDay =
    weddingContext?.some((wedding) => wedding.isWeddingDay) || false;

  return {
    isWeddingDay,
    criticalWeddingAlerts: store.notifications.filter(
      (n) =>
        n.category === 'wedding_day' &&
        n.priority === 'critical' &&
        !n.readStatus,
    ),
    todayWeddingNotifications: store.notifications.filter(
      (n) =>
        n.relatedWedding &&
        weddingContext?.some(
          (wedding) =>
            wedding.weddingId === n.relatedWedding?.weddingId &&
            wedding.isWeddingDay,
        ),
    ),
  };
};

// Export store actions for direct access
export const notificationActions = {
  addNotification: (notification: Notification) =>
    useNotificationStore.getState().addNotification(notification),

  markAsRead: (id: string) => useNotificationStore.getState().markAsRead(id),

  toggleCenter: () =>
    useNotificationStore.getState().toggleNotificationCenter(),

  setRealtimeStatus: (connected: boolean) =>
    useNotificationStore.getState().setRealtimeStatus(connected),
};

// Persistence middleware for notification preferences
if (typeof window !== 'undefined') {
  useNotificationStore.subscribe(
    (state) => state.preferences,
    (preferences) => {
      localStorage.setItem(
        'wedsync-notification-preferences',
        JSON.stringify(preferences),
      );
    },
  );

  // Load preferences from localStorage on initialization
  const savedPreferences = localStorage.getItem(
    'wedsync-notification-preferences',
  );
  if (savedPreferences) {
    try {
      const preferences = JSON.parse(savedPreferences);
      useNotificationStore.getState().updatePreferences(preferences);
    } catch (error) {
      console.warn('Failed to load saved notification preferences:', error);
    }
  }
}
