'use client';

// WedSync SmartNotificationGroup - AI-Powered Notification Grouping
// Intelligent notification organization with wedding-specific context

import React, { useState, useMemo, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  HeartIcon,
  UserGroupIcon,
  CurrencyPoundIcon,
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { NotificationCard } from './NotificationCard';
import type {
  NotificationGroup,
  Notification,
  NotificationAction,
  GroupingStrategy,
  PriorityLevel,
  NotificationCategory,
  WeddingReference,
  VendorReference,
} from '@/types';

// Group action button component
interface GroupActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  count?: number;
}

function GroupActionButton({
  icon,
  label,
  onClick,
  variant = 'secondary',
  disabled = false,
  count,
}: GroupActionButtonProps) {
  const getButtonStyles = () => {
    const baseStyles =
      'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-rose-600 text-white hover:bg-rose-700`;
      case 'danger':
        return `${baseStyles} bg-red-600 text-white hover:bg-red-700`;
      default:
        return `${baseStyles} bg-gray-100 text-gray-700 hover:bg-gray-200`;
    }
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={getButtonStyles()}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      <span className="flex items-center space-x-2">
        {icon}
        <span>{label}</span>
        {count && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-white bg-opacity-20 rounded-full">
            {count}
          </span>
        )}
      </span>
    </motion.button>
  );
}

// Group header component with smart context
interface GroupHeaderProps {
  group: NotificationGroup;
  onToggleExpand: () => void;
  onMarkAllRead: () => void;
  onDismissAll: () => void;
  onViewAll: () => void;
  isPending: boolean;
}

function GroupHeader({
  group,
  onToggleExpand,
  onMarkAllRead,
  onDismissAll,
  onViewAll,
  isPending,
}: GroupHeaderProps) {
  const getGroupIcon = () => {
    if (group.weddingContext) {
      return <HeartIcon className="w-5 h-5 text-rose-500" />;
    }
    if (group.vendorContext) {
      return <UserGroupIcon className="w-5 h-5 text-purple-500" />;
    }

    switch (group.groupType) {
      case 'by_urgency':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />;
      case 'by_type':
        return <SparklesIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <ChatBubbleLeftIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = () => {
    switch (group.highestPriority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatLastUpdated = () => {
    const now = new Date();
    const diffMs = now.getTime() - group.lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return group.lastUpdated.toLocaleDateString();
  };

  return (
    <div className={`p-4 border-l-4 rounded-lg ${getPriorityColor()}`}>
      <div className="flex items-center justify-between">
        {/* Group Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
            aria-label={group.expanded ? 'Collapse group' : 'Expand group'}
          >
            <motion.div
              animate={{ rotate: group.expanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </motion.div>
          </button>

          {getGroupIcon()}

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-lg truncate">{group.title}</h3>
              {group.highestPriority === 'critical' && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                </motion.div>
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm opacity-75">
              <span>{group.totalCount} notifications</span>
              {group.unreadCount > 0 && (
                <span className="font-medium">{group.unreadCount} unread</span>
              )}
              <span>Updated {formatLastUpdated()}</span>
            </div>

            {/* Wedding/Vendor Context */}
            {group.weddingContext && (
              <div className="mt-1 text-sm opacity-75">
                Wedding: {group.weddingContext.weddingDate.toLocaleDateString()}{' '}
                • {group.weddingContext.venue}
              </div>
            )}

            {group.vendorContext && (
              <div className="mt-1 text-sm opacity-75">
                {group.vendorContext.vendorType}:{' '}
                {group.vendorContext.vendorName}
              </div>
            )}
          </div>
        </div>

        {/* Group Stats */}
        <div className="flex items-center space-x-2">
          {group.unreadCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-75">
              {group.unreadCount} new
            </span>
          )}

          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor()}`}
          >
            {group.highestPriority.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Group Actions */}
      <AnimatePresence>
        {group.expanded && group.notifications.length > 1 && (
          <motion.div
            className="mt-4 pt-3 border-t border-current border-opacity-20"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-wrap gap-2">
              {group.unreadCount > 0 && (
                <GroupActionButton
                  icon={<CheckIcon className="w-4 h-4" />}
                  label="Mark all read"
                  onClick={onMarkAllRead}
                  variant="primary"
                  disabled={isPending}
                  count={group.unreadCount}
                />
              )}

              <GroupActionButton
                icon={<EyeIcon className="w-4 h-4" />}
                label="View all"
                onClick={onViewAll}
                disabled={isPending}
              />

              <GroupActionButton
                icon={<XMarkIcon className="w-4 h-4" />}
                label="Dismiss all"
                onClick={onDismissAll}
                variant="danger"
                disabled={isPending}
                count={group.totalCount}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// AI-powered grouping logic
function groupNotificationsByContext(
  notifications: Notification[],
  strategy: GroupingStrategy,
): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();

  // Smart contextual grouping
  notifications.forEach((notification) => {
    let groupKey: string;
    let groupTitle: string;
    let weddingContext: WeddingReference | undefined;
    let vendorContext: VendorReference | undefined;

    switch (strategy) {
      case 'smart_context':
        // AI-powered smart grouping based on multiple factors
        if (notification.relatedWedding) {
          groupKey = `wedding_${notification.relatedWedding.weddingId}`;
          groupTitle = `${notification.relatedWedding.coupleName} Wedding`;
          weddingContext = notification.relatedWedding;
        } else if (notification.relatedVendor) {
          groupKey = `vendor_${notification.relatedVendor.vendorId}`;
          groupTitle = notification.relatedVendor.vendorName;
          vendorContext = notification.relatedVendor;
        } else if (
          notification.category === 'urgent' ||
          notification.priority === 'critical'
        ) {
          groupKey = 'urgent';
          groupTitle = 'Urgent Notifications';
        } else {
          groupKey = notification.type;
          groupTitle = `${notification.type.replace('_', ' ').toUpperCase()} Updates`;
        }
        break;

      case 'by_wedding':
        groupKey = notification.relatedWedding?.weddingId || 'general';
        groupTitle = notification.relatedWedding
          ? `${notification.relatedWedding.coupleName} Wedding`
          : 'General Notifications';
        weddingContext = notification.relatedWedding;
        break;

      case 'by_vendor':
        groupKey = notification.relatedVendor?.vendorId || 'system';
        groupTitle = notification.relatedVendor
          ? notification.relatedVendor.vendorName
          : 'System Notifications';
        vendorContext = notification.relatedVendor;
        break;

      case 'by_urgency':
        groupKey = notification.priority;
        groupTitle = `${notification.priority.toUpperCase()} Priority`;
        break;

      case 'by_type':
        groupKey = notification.type;
        groupTitle = notification.type.replace('_', ' ').toUpperCase();
        break;

      case 'by_date':
        const date = new Date(notification.timestamp);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) {
          groupKey = 'today';
          groupTitle = 'Today';
        } else if (isYesterday) {
          groupKey = 'yesterday';
          groupTitle = 'Yesterday';
        } else {
          groupKey = date.toDateString();
          groupTitle = date.toDateString();
        }
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
        expanded:
          strategy === 'smart_context' &&
          (notification.priority === 'critical' ||
            notification.category === 'urgent'),
        totalCount: 0,
        unreadCount: 0,
        groupType: strategy,
        lastUpdated: new Date(0),
        weddingContext,
        vendorContext,
      });
    }

    const group = groups.get(groupKey)!;
    group.notifications.push(notification);
    group.totalCount = group.notifications.length;
    group.unreadCount = group.notifications.filter((n) => !n.readStatus).length;

    // Update last updated time
    if (notification.timestamp > group.lastUpdated) {
      group.lastUpdated = notification.timestamp;
    }

    // Update highest priority
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    if (
      priorityOrder[notification.priority] >
      priorityOrder[group.highestPriority]
    ) {
      group.highestPriority = notification.priority;
    }
  });

  // Sort groups by priority and date
  return Array.from(groups.values()).sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

    // Critical priority first
    const priorityDiff =
      priorityOrder[b.highestPriority] - priorityOrder[a.highestPriority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by last updated
    return b.lastUpdated.getTime() - a.lastUpdated.getTime();
  });
}

// Main SmartNotificationGroup component
interface SmartNotificationGroupProps {
  notifications: Notification[];
  groupingStrategy: GroupingStrategy;
  onNotificationAction: (
    notificationId: string,
    action: NotificationAction,
  ) => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkGroupRead: (groupId: string) => void;
  onDismissGroup: (groupId: string) => void;
  onViewGroup: (groupId: string) => void;
  onToggleGroup: (groupId: string) => void;
  maxVisibleInGroup?: number;
  showGroupActions?: boolean;
  compactMode?: boolean;
}

export function SmartNotificationGroup({
  notifications,
  groupingStrategy,
  onNotificationAction,
  onMarkAsRead,
  onMarkGroupRead,
  onDismissGroup,
  onViewGroup,
  onToggleGroup,
  maxVisibleInGroup = 3,
  showGroupActions = true,
  compactMode = false,
}: SmartNotificationGroupProps) {
  const [isPending, startTransition] = useTransition();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group notifications using AI-powered logic
  const groupedNotifications = useMemo(() => {
    return groupNotificationsByContext(notifications, groupingStrategy);
  }, [notifications, groupingStrategy]);

  // Handle group expansion
  const handleToggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
    onToggleGroup(groupId);
  };

  // Handle group actions with transitions
  const handleMarkGroupRead = (groupId: string) => {
    startTransition(() => {
      onMarkGroupRead(groupId);
    });
  };

  const handleDismissGroup = (groupId: string) => {
    startTransition(() => {
      onDismissGroup(groupId);
    });
  };

  const handleViewGroup = (groupId: string) => {
    startTransition(() => {
      onViewGroup(groupId);
    });
  };

  return (
    <div className="smart-notification-groups space-y-4">
      <AnimatePresence mode="popLayout">
        {groupedNotifications.map((group) => {
          const isExpanded =
            expandedGroups.has(group.groupId) || group.expanded;
          const visibleNotifications = isExpanded
            ? group.notifications
            : group.notifications.slice(0, maxVisibleInGroup);
          const hasMoreNotifications =
            group.notifications.length > maxVisibleInGroup;

          return (
            <motion.div
              key={group.groupId}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Group Header */}
              <GroupHeader
                group={{
                  ...group,
                  expanded: isExpanded,
                }}
                onToggleExpand={() => handleToggleGroup(group.groupId)}
                onMarkAllRead={() => handleMarkGroupRead(group.groupId)}
                onDismissAll={() => handleDismissGroup(group.groupId)}
                onViewAll={() => handleViewGroup(group.groupId)}
                isPending={isPending}
              />

              {/* Notifications List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-100"
                  >
                    <div className="divide-y divide-gray-100">
                      {visibleNotifications.map((notification, index) => (
                        <motion.div
                          key={notification.notificationId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="px-4 py-2"
                        >
                          <NotificationCard
                            notification={notification}
                            onAction={(action) =>
                              onNotificationAction(
                                notification.notificationId,
                                action,
                              )
                            }
                            onMarkRead={() =>
                              onMarkAsRead(notification.notificationId)
                            }
                            isPending={isPending}
                            compactMode={compactMode}
                            showFullContent={false}
                          />
                        </motion.div>
                      ))}
                    </div>

                    {/* Show More Button */}
                    {hasMoreNotifications && !isExpanded && (
                      <div className="p-4 border-t border-gray-100 text-center">
                        <button
                          onClick={() => handleToggleGroup(group.groupId)}
                          className="text-sm text-rose-600 hover:text-rose-500 font-medium"
                        >
                          Show {group.notifications.length - maxVisibleInGroup}{' '}
                          more notifications
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {groupedNotifications.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <CheckIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
          <p className="text-sm text-gray-500 mt-1">
            No notifications to show.
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default SmartNotificationGroup;
