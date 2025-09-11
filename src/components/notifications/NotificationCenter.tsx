'use client';

// WedSync Notification Center - React 19 Implementation
// Comprehensive notification management with wedding-specific intelligence

import React, {
  useState,
  useEffect,
  useTransition,
  useOptimistic,
  Suspense,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  FunnelIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import {
  useNotificationStore,
  useNotificationSelectors,
  useWeddingDayNotifications,
} from '@/lib/stores/notificationStore';
import type {
  NotificationSystemProps,
  Notification,
  NotificationAction,
  NotificationActionRequest,
  NotificationCategory,
  PriorityLevel,
  WeddingReference,
} from '@/types';

// Notification Bell Component with Badge
interface NotificationBellProps {
  unreadCount: number;
  hasUrgent: boolean;
  onClick: () => void;
  className?: string;
}

function NotificationBell({
  unreadCount,
  hasUrgent,
  onClick,
  className = '',
}: NotificationBellProps) {
  return (
    <motion.button
      className={`relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 rounded-lg transition-colors ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
    >
      {hasUrgent ? (
        <BellAlertIcon className="h-6 w-6 text-red-500" />
      ) : (
        <BellIcon className="h-6 w-6" />
      )}

      {unreadCount > 0 && (
        <motion.span
          className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-medium text-white flex items-center justify-center ${
            hasUrgent ? 'bg-red-500 animate-pulse' : 'bg-rose-500'
          }`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </motion.span>
      )}
    </motion.button>
  );
}

// Notification Header Component
interface NotificationHeaderProps {
  unreadCount: number;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onToggleSettings: () => void;
}

function NotificationHeader({
  unreadCount,
  onMarkAllRead,
  onClearAll,
  onToggleSettings,
}: NotificationHeaderProps) {
  const [isPending, startTransition] = useTransition();

  const handleMarkAllRead = () => {
    startTransition(() => {
      onMarkAllRead();
    });
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        {unreadCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
            {unreadCount} new
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {unreadCount > 0 && (
          <motion.button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-sm text-rose-600 hover:text-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPending ? (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                <span>Marking...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <CheckIcon className="w-4 h-4" />
                <span>Mark all read</span>
              </div>
            )}
          </motion.button>
        )}

        <button
          onClick={onToggleSettings}
          className="p-1 text-gray-400 hover:text-gray-500 rounded"
          aria-label="Notification Settings"
        >
          <Cog6ToothIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Notification Filters Component
interface NotificationFiltersProps {
  activeFilter: NotificationCategory | 'all';
  activePriorityFilter: PriorityLevel | 'all';
  onFilterChange: (filter: NotificationCategory | 'all') => void;
  onPriorityFilterChange: (filter: PriorityLevel | 'all') => void;
  categoryCounts: Record<NotificationCategory | 'all', number>;
}

function NotificationFilters({
  activeFilter,
  activePriorityFilter,
  onFilterChange,
  onPriorityFilterChange,
  categoryCounts,
}: NotificationFiltersProps) {
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);

  const categoryLabels: Record<NotificationCategory | 'all', string> = {
    all: 'All',
    urgent: 'Urgent',
    wedding_day: 'Wedding Day',
    payments: 'Payments',
    communications: 'Messages',
    updates: 'Updates',
    reminders: 'Reminders',
    celebrations: 'Celebrations',
    system_alerts: 'System',
  };

  const priorityLabels: Record<PriorityLevel | 'all', string> = {
    all: 'All Priorities',
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    info: 'Info',
  };

  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200">
      {/* Category Filters */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-2">
        <FunnelIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
        {Object.entries(categoryLabels).map(([category, label]) => (
          <button
            key={category}
            onClick={() =>
              onFilterChange(category as NotificationCategory | 'all')
            }
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === category
                ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                : 'bg-white text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200'
            }`}
          >
            {label}
            {categoryCounts[category as NotificationCategory | 'all'] > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  activeFilter === category
                    ? 'bg-rose-200 text-rose-800'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {categoryCounts[category as NotificationCategory | 'all']}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Priority Filter Toggle */}
      <div className="mt-2">
        <button
          onClick={() => setShowPriorityFilter(!showPriorityFilter)}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
        >
          <span>Filter by priority</span>
          <motion.div
            animate={{ rotate: showPriorityFilter ? 180 : 0 }}
            transition={{ duration: 0.2 }}
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </motion.div>
        </button>

        <AnimatePresence>
          {showPriorityFilter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 flex items-center space-x-1 overflow-hidden"
            >
              {Object.entries(priorityLabels).map(([priority, label]) => (
                <button
                  key={priority}
                  onClick={() =>
                    onPriorityFilterChange(priority as PriorityLevel | 'all')
                  }
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    activePriorityFilter === priority
                      ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                      : 'bg-white text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Empty State Component
interface EmptyNotificationsStateProps {
  filter: NotificationCategory | 'all';
}

function EmptyNotificationsState({ filter }: EmptyNotificationsStateProps) {
  const getEmptyMessage = () => {
    switch (filter) {
      case 'urgent':
        return {
          title: 'No urgent notifications',
          message: 'All caught up! No urgent items need your attention.',
        };
      case 'wedding_day':
        return {
          title: 'No wedding day alerts',
          message: 'All weddings are running smoothly!',
        };
      case 'payments':
        return {
          title: 'No payment notifications',
          message: 'All payments are up to date.',
        };
      default:
        return {
          title: 'All caught up!',
          message:
            'You have no new notifications. Great job staying on top of everything!',
        };
    }
  };

  const { title, message } = getEmptyMessage();

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <CheckIcon className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs">{message}</p>
    </motion.div>
  );
}

// Loading State Component
function NotificationCenterLoading() {
  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main NotificationCenter Component
export function NotificationCenter({
  userId,
  organizationId,
  userRole,
  notificationPreferences,
  weddingContext = [],
  onNotificationAction,
  onPreferencesUpdate,
  isWeddingDay = false,
  emergencyMode = false,
}: NotificationSystemProps) {
  // Store state
  const {
    notifications,
    groups,
    ui: { isOpen, activeFilter, activePriorityFilter, isLoading, error },
  } = useNotificationStore();

  const {
    toggleNotificationCenter,
    setActiveFilter,
    setPriorityFilter,
    markAsRead,
    markAllAsRead,
    setLoading,
    setError,
  } = useNotificationStore();

  // Selectors
  const selectors = useNotificationSelectors();
  const weddingDayNotifications = useWeddingDayNotifications(weddingContext);

  // Local state
  const [showSettings, setShowSettings] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Optimistic updates for notification actions
  const [optimisticNotifications, addOptimisticUpdate] = useOptimistic(
    selectors.filteredNotifications(),
    (state, updatedNotification: Notification) =>
      state.map((n) =>
        n.notificationId === updatedNotification.notificationId
          ? updatedNotification
          : n,
      ),
  );

  // Real-time notification subscription
  useEffect(() => {
    if (!userId) return;

    const eventSource = new EventSource(
      `/api/notifications/stream?userId=${userId}&organizationId=${organizationId}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const newNotification = JSON.parse(event.data) as Notification;

        // Add to store
        useNotificationStore.getState().addNotification(newNotification);

        // Handle special notification types
        handleIncomingNotification(newNotification);
      } catch (error) {
        console.error('Failed to parse notification event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Notification stream error:', error);
      eventSource.close();

      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          useNotificationStore.getState().incrementReconnectAttempts();
        }
      }, 5000);
    };

    eventSource.onopen = () => {
      useNotificationStore.getState().setRealtimeStatus(true);
    };

    return () => {
      eventSource.close();
      useNotificationStore.getState().setRealtimeStatus(false);
    };
  }, [userId, organizationId]);

  // Handle incoming notifications with smart display logic
  const handleIncomingNotification = (notification: Notification) => {
    // Play notification sound if enabled
    if (notificationPreferences.weddingDaySettings.soundEnabled) {
      playNotificationSound(notification.priority);
    }

    // Show different UIs based on priority and context
    if (notification.priority === 'critical' || emergencyMode) {
      showCriticalNotificationModal(notification);
    } else if (
      notification.category === 'wedding_day' &&
      (isWeddingDay || weddingDayNotifications.isWeddingDay)
    ) {
      showWeddingDayNotification(notification);
    } else {
      showStandardNotification(notification);
    }
  };

  // Notification sound utility
  const playNotificationSound = (priority: PriorityLevel) => {
    if (typeof window === 'undefined') return;

    try {
      const audio = new Audio();
      switch (priority) {
        case 'critical':
          audio.src = '/sounds/critical-alert.mp3';
          break;
        case 'high':
          audio.src = '/sounds/high-priority.mp3';
          break;
        default:
          audio.src = '/sounds/notification.mp3';
      }
      audio.volume = 0.5;
      audio.play().catch(console.warn);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  };

  // Placeholder functions for different notification displays
  const showCriticalNotificationModal = (notification: Notification) => {
    // This would trigger a modal or overlay for critical notifications
    console.log('Critical notification:', notification);
  };

  const showWeddingDayNotification = (notification: Notification) => {
    // This would show a special wedding day notification style
    console.log('Wedding day notification:', notification);
  };

  const showStandardNotification = (notification: Notification) => {
    // This would show a toast or standard notification
    console.log('Standard notification:', notification);
  };

  // Handle notification actions with optimistic updates
  const handleNotificationAction = async (
    notificationId: string,
    action: NotificationAction,
  ) => {
    startTransition(async () => {
      // Find the notification
      const notification = notifications.find(
        (n) => n.notificationId === notificationId,
      );
      if (!notification) return;

      // Optimistic update
      addOptimisticUpdate({
        ...notification,
        readStatus: true,
        engagement: {
          ...notification.engagement,
          actionTaken: true,
          actionTakenAt: new Date(),
        },
      });

      try {
        // Call the action handler
        const result = await onNotificationAction({
          notificationId,
          actionType: action.type,
          context: {
            notificationId,
            userId,
            organizationId,
            weddingContext: notification.relatedWedding,
            vendorContext: notification.relatedVendor,
            timestamp: new Date(),
            deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
          },
        });

        if (result.success) {
          // Update the notification in the store
          useNotificationStore.getState().updateNotification(notificationId, {
            readStatus: true,
            actions: notification.actions.filter(
              (a) => a.actionId !== action.actionId,
            ),
            engagement: {
              ...notification.engagement,
              actionTaken: true,
              actionTakenAt: new Date(),
            },
          });

          // Handle any follow-up actions
          if (result.followupActions) {
            useNotificationStore.getState().updateNotification(notificationId, {
              actions: result.followupActions,
            });
          }
        } else {
          // Revert optimistic update on failure
          setError(result.error?.message || 'Action failed');
        }
      } catch (error) {
        console.error('Notification action failed:', error);
        setError('Failed to complete action. Please try again.');
      }
    });
  };

  // Get counts for filters
  const categoryCounts = selectors.categoryCounts();
  const unreadCount = selectors.unreadCount();
  const hasCritical = selectors.criticalNotifications().length > 0;

  return (
    <div className="notification-system relative">
      {/* Notification Bell */}
      <NotificationBell
        unreadCount={unreadCount}
        hasUrgent={hasCritical}
        onClick={toggleNotificationCenter}
        className={emergencyMode ? 'ring-2 ring-red-500 ring-offset-2' : ''}
      />

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <NotificationHeader
              unreadCount={unreadCount}
              onMarkAllRead={markAllAsRead}
              onClearAll={() => {
                /* TODO: Implement clear all */
              }}
              onToggleSettings={() => setShowSettings(!showSettings)}
            />

            {/* Filters */}
            <NotificationFilters
              activeFilter={activeFilter}
              activePriorityFilter={activePriorityFilter}
              onFilterChange={setActiveFilter}
              onPriorityFilterChange={setPriorityFilter}
              categoryCounts={categoryCounts}
            />

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {error && (
                <motion.div
                  className="mx-4 my-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="ml-auto text-red-400 hover:text-red-500"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              <Suspense fallback={<NotificationCenterLoading />}>
                {isLoading ? (
                  <NotificationCenterLoading />
                ) : optimisticNotifications.length > 0 ? (
                  <AnimatePresence mode="popLayout">
                    {optimisticNotifications.map((notification, index) => (
                      <motion.div
                        key={notification.notificationId}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {/* NotificationCard would be imported here */}
                        <div className="p-4 border-b border-gray-100 hover:bg-gray-50">
                          <div className="flex items-start space-x-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 ${
                                notification.readStatus
                                  ? 'bg-gray-300'
                                  : notification.priority === 'critical'
                                    ? 'bg-red-500'
                                    : 'bg-rose-500'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium ${
                                  notification.readStatus
                                    ? 'text-gray-600'
                                    : 'text-gray-900'
                                }`}
                              >
                                {notification.title}
                              </p>
                              <p
                                className={`text-sm mt-1 ${
                                  notification.readStatus
                                    ? 'text-gray-500'
                                    : 'text-gray-700'
                                }`}
                              >
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(
                                  notification.timestamp,
                                ).toLocaleString()}
                              </p>
                            </div>
                            {!notification.readStatus && (
                              <button
                                onClick={() =>
                                  markAsRead(notification.notificationId)
                                }
                                className="text-xs text-rose-600 hover:text-rose-500"
                              >
                                Mark read
                              </button>
                            )}
                          </div>

                          {notification.actions.length > 0 && (
                            <div className="mt-3 flex space-x-2">
                              {notification.actions
                                .slice(0, 2)
                                .map((action) => (
                                  <button
                                    key={action.actionId}
                                    onClick={() =>
                                      handleNotificationAction(
                                        notification.notificationId,
                                        action,
                                      )
                                    }
                                    disabled={isPending}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                      action.style === 'primary'
                                        ? 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-400'
                                        : action.style === 'destructive'
                                          ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50'
                                    }`}
                                  >
                                    {isPending ? (
                                      <div className="flex items-center space-x-1">
                                        <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
                                        <span>...</span>
                                      </div>
                                    ) : (
                                      action.label
                                    )}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <EmptyNotificationsState filter={activeFilter} />
                )}
              </Suspense>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  className="border-t border-gray-200 p-4"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Quick Settings
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={
                          notificationPreferences.weddingDaySettings
                            .soundEnabled
                        }
                        onChange={(e) =>
                          onPreferencesUpdate({
                            weddingDaySettings: {
                              ...notificationPreferences.weddingDaySettings,
                              soundEnabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm text-gray-700">
                        Sound notifications
                      </span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={notificationPreferences.smartFiltering.enabled}
                        onChange={(e) =>
                          onPreferencesUpdate({
                            smartFiltering: {
                              ...notificationPreferences.smartFiltering,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm text-gray-700">
                        Smart filtering
                      </span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationCenter;
