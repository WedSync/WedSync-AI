'use client';

// WedSync NotificationCard - Wedding-Specific Notification Display
// Comprehensive notification component with context-aware styling and actions

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  BellIcon,
  HeartIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  MapPinIcon,
  CurrencyPoundIcon,
  UserGroupIcon,
  CalendarIcon,
  CloudIcon,
  GiftIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  ExclamationTriangleIcon as ExclamationTriangleSolidIcon,
} from '@heroicons/react/24/solid';
import type {
  Notification,
  NotificationAction,
  PriorityLevel,
  NotificationType,
  NotificationCategory,
  WeddingReference,
  VendorReference,
} from '@/types';

// Time formatting utility
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });
}

// Wedding date formatting
function formatWeddingDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Priority icon component
function PriorityIcon({
  priority,
  className = 'w-5 h-5',
}: {
  priority: PriorityLevel;
  className?: string;
}) {
  switch (priority) {
    case 'critical':
      return (
        <ExclamationTriangleSolidIcon
          className={`${className} text-red-500 animate-pulse`}
        />
      );
    case 'high':
      return (
        <ExclamationCircleIcon className={`${className} text-orange-500`} />
      );
    case 'medium':
      return <InformationCircleIcon className={`${className} text-blue-500`} />;
    case 'low':
      return <BellIcon className={`${className} text-green-500`} />;
    default:
      return <BellIcon className={`${className} text-gray-400`} />;
  }
}

// Notification type icon component
function NotificationTypeIcon({
  type,
  category,
  className = 'w-5 h-5',
}: {
  type: NotificationType;
  category: NotificationCategory;
  className?: string;
}) {
  // Wedding day gets special heart icon
  if (category === 'wedding_day') {
    return <HeartSolidIcon className={`${className} text-rose-500`} />;
  }

  switch (type) {
    case 'payment':
      return <CurrencyPoundIcon className={`${className} text-green-600`} />;
    case 'booking':
      return <CalendarIcon className={`${className} text-blue-600`} />;
    case 'timeline':
      return <ClockIcon className={`${className} text-orange-600`} />;
    case 'weather':
      return <CloudIcon className={`${className} text-blue-400`} />;
    case 'vendor_update':
      return <UserGroupIcon className={`${className} text-purple-600`} />;
    case 'client_message':
      return <ChatBubbleLeftIcon className={`${className} text-indigo-600`} />;
    case 'celebration':
      return <GiftIcon className={`${className} text-pink-600`} />;
    case 'emergency':
      return (
        <ExclamationTriangleSolidIcon
          className={`${className} text-red-600 animate-pulse`}
        />
      );
    default:
      return <BellIcon className={`${className} text-gray-500`} />;
  }
}

// Action button component
interface ActionButtonProps {
  action: NotificationAction;
  onClick: () => void;
  isPending: boolean;
}

function ActionButton({ action, onClick, isPending }: ActionButtonProps) {
  const getActionIcon = () => {
    switch (action.type) {
      case 'approve':
        return <CheckIcon className="w-4 h-4" />;
      case 'decline':
        return <XMarkIcon className="w-4 h-4" />;
      case 'reschedule':
        return <ClockIcon className="w-4 h-4" />;
      case 'contact_vendor':
        return <PhoneIcon className="w-4 h-4" />;
      case 'emergency_call':
        return <ExclamationTriangleSolidIcon className="w-4 h-4" />;
      case 'view_details':
        return <InformationCircleIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getButtonStyles = () => {
    const baseStyles =
      'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    switch (action.style) {
      case 'primary':
        return `${baseStyles} bg-rose-600 text-white hover:bg-rose-700 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2`;
      case 'destructive':
        return `${baseStyles} bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2`;
      case 'secondary':
        return `${baseStyles} bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2`;
      default:
        return `${baseStyles} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2`;
    }
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={isPending || action.isDisabled}
      className={getButtonStyles()}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={action.isDisabled ? action.disabledReason : undefined}
    >
      {isPending ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Processing...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          {getActionIcon()}
          <span>{action.label}</span>
          {action.shortcut && (
            <kbd className="ml-1 px-1.5 py-0.5 text-xs font-mono bg-gray-200 rounded">
              {action.shortcut}
            </kbd>
          )}
        </div>
      )}
    </motion.button>
  );
}

// Wedding context display component
interface WeddingContextProps {
  wedding: WeddingReference;
}

function WeddingContext({ wedding }: WeddingContextProps) {
  const getDaysUntilText = () => {
    if (wedding.isWeddingDay) return "Today's the day!";
    if (wedding.daysUntilWedding === 1) return 'Tomorrow';
    if (wedding.daysUntilWedding < 0)
      return `${Math.abs(wedding.daysUntilWedding)} days ago`;
    return `${wedding.daysUntilWedding} days to go`;
  };

  const getStatusColor = () => {
    if (wedding.isWeddingDay) return 'text-rose-600 bg-rose-50';
    if (wedding.daysUntilWedding <= 7) return 'text-orange-600 bg-orange-50';
    if (wedding.daysUntilWedding <= 30) return 'text-yellow-600 bg-yellow-50';
    return 'text-blue-600 bg-blue-50';
  };

  return (
    <motion.div
      className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-100"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <HeartSolidIcon className="w-4 h-4 text-rose-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {wedding.coupleName}
            </p>
            <p className="text-xs text-gray-600">
              {formatWeddingDate(wedding.weddingDate)}
            </p>
            {wedding.venue && (
              <p className="text-xs text-gray-500 flex items-center mt-0.5">
                <MapPinIcon className="w-3 h-3 mr-1" />
                {wedding.venue}
              </p>
            )}
          </div>
        </div>
        <div
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
        >
          {getDaysUntilText()}
        </div>
      </div>
    </motion.div>
  );
}

// Vendor context display component
interface VendorContextProps {
  vendor: VendorReference;
}

function VendorContext({ vendor }: VendorContextProps) {
  return (
    <motion.div
      className="mt-2 p-2 rounded-lg bg-purple-50 border border-purple-100"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserGroupIcon className="w-4 h-4 text-purple-500" />
          <div>
            <p className="text-sm font-medium text-purple-900">
              {vendor.vendorName}
            </p>
            <p className="text-xs text-purple-700 capitalize">
              {vendor.vendorType.replace('_', ' ')}
            </p>
          </div>
        </div>
        {vendor.isEmergencyContact && (
          <div className="flex items-center space-x-1">
            <ExclamationTriangleSolidIcon className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-600 font-medium">
              Emergency Contact
            </span>
          </div>
        )}
      </div>
      {vendor.contactInfo.phone && (
        <div className="mt-1 flex items-center space-x-1">
          <PhoneIcon className="w-3 h-3 text-purple-400" />
          <span className="text-xs text-purple-600">
            {vendor.contactInfo.phone}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// Main NotificationCard component
interface NotificationCardProps {
  notification: Notification;
  onAction: (action: NotificationAction) => void;
  onMarkRead: () => void;
  onDismiss?: () => void;
  isPending: boolean;
  showFullContent?: boolean;
  compactMode?: boolean;
}

export function NotificationCard({
  notification,
  onAction,
  onMarkRead,
  onDismiss,
  isPending,
  showFullContent = false,
  compactMode = false,
}: NotificationCardProps) {
  const [isExpanded, setIsExpanded] = useState(showFullContent);
  const [timeAgo, setTimeAgo] = useState(formatTimeAgo(notification.timestamp));

  // Update time ago every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeAgo(formatTimeAgo(notification.timestamp));
    }, 60000);

    return () => clearInterval(timer);
  }, [notification.timestamp]);

  // Auto-expand critical notifications
  useEffect(() => {
    if (notification.priority === 'critical') {
      setIsExpanded(true);
    }
  }, [notification.priority]);

  const getCardStyles = () => {
    const baseStyles =
      'group relative bg-white border border-gray-200 rounded-lg transition-all duration-200 hover:shadow-md hover:border-gray-300';

    if (!notification.readStatus) {
      switch (notification.priority) {
        case 'critical':
          return `${baseStyles} border-l-4 border-l-red-500 bg-red-50`;
        case 'high':
          return `${baseStyles} border-l-4 border-l-orange-500 bg-orange-50`;
        case 'wedding_day':
          return `${baseStyles} border-l-4 border-l-rose-500 bg-rose-50`;
        default:
          return `${baseStyles} border-l-4 border-l-blue-500`;
      }
    }

    return `${baseStyles} opacity-75`;
  };

  const handleCardClick = () => {
    if (!notification.readStatus) {
      onMarkRead();
    }
    setIsExpanded(!isExpanded);
  };

  const shouldShowActions =
    notification.actions.length > 0 &&
    (isExpanded || notification.priority === 'critical');

  return (
    <motion.div
      className={getCardStyles()}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`p-4 ${compactMode ? 'py-3' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Priority & Type Icons */}
            <div className="flex-shrink-0 flex items-center space-x-1">
              <PriorityIcon
                priority={notification.priority}
                className={compactMode ? 'w-4 h-4' : 'w-5 h-5'}
              />
              <NotificationTypeIcon
                type={notification.type}
                category={notification.category}
                className={compactMode ? 'w-4 h-4' : 'w-5 h-5'}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4
                  className={`font-medium text-gray-900 truncate ${
                    compactMode ? 'text-sm' : 'text-base'
                  } ${!notification.readStatus ? 'font-semibold' : ''}`}
                >
                  {notification.title}
                </h4>
                <div className="flex items-center space-x-2 ml-2">
                  {notification.actionRequired && (
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-yellow-600 font-medium">
                        Action Required
                      </span>
                    </div>
                  )}
                  <span
                    className={`text-xs text-gray-500 ${compactMode ? 'text-xs' : ''}`}
                  >
                    {timeAgo}
                  </span>
                </div>
              </div>

              <p
                className={`mt-1 text-gray-700 ${
                  compactMode ? 'text-sm' : 'text-base'
                } ${isExpanded ? '' : 'line-clamp-2'}`}
              >
                {notification.message}
              </p>

              {/* Rich Content */}
              {notification.richContent?.html && isExpanded && (
                <div
                  className="mt-2 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: notification.richContent.html,
                  }}
                />
              )}

              {/* Preview Image */}
              {notification.metadata.previewImage && (
                <motion.div
                  className="mt-3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <img
                    src={notification.metadata.previewImage}
                    alt="Notification preview"
                    className="rounded-lg max-w-full h-auto max-h-48 object-cover"
                    loading="lazy"
                  />
                </motion.div>
              )}

              {/* Wedding Context */}
              {notification.relatedWedding && isExpanded && (
                <WeddingContext wedding={notification.relatedWedding} />
              )}

              {/* Vendor Context */}
              {notification.relatedVendor && isExpanded && (
                <VendorContext vendor={notification.relatedVendor} />
              )}

              {/* Expiry Warning */}
              {notification.expiresAt && (
                <motion.div
                  className="mt-2 flex items-center space-x-1 text-xs text-orange-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <ClockIcon className="w-3 h-3" />
                  <span>Expires {formatTimeAgo(notification.expiresAt)}</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Unread Indicator */}
          {!notification.readStatus && (
            <div className="w-2 h-2 bg-rose-500 rounded-full flex-shrink-0 mt-2" />
          )}
        </div>

        {/* Actions */}
        <AnimatePresence>
          {shouldShowActions && (
            <motion.div
              className="mt-4 pt-3 border-t border-gray-100"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-wrap gap-2">
                {notification.actions.map((action) => (
                  <ActionButton
                    key={action.actionId}
                    action={action}
                    onClick={() => onAction(action)}
                    isPending={isPending}
                  />
                ))}
              </div>

              {/* Secondary Actions */}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs">
                  {!notification.readStatus && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead();
                      }}
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Mark as read
                    </button>
                  )}
                  {onDismiss && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss();
                      }}
                      className="text-gray-500 hover:text-gray-400"
                    >
                      Dismiss
                    </button>
                  )}
                </div>

                {/* Engagement Indicators */}
                {notification.engagement.viewed && (
                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <CheckIcon className="w-3 h-3" />
                    <span>Viewed</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expand/Collapse Button for non-critical notifications */}
        {notification.actions.length > 0 &&
          notification.priority !== 'critical' && (
            <button
              onClick={handleCardClick}
              className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg
                  className="w-4 h-4"
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
          )}
      </div>
    </motion.div>
  );
}

export default NotificationCard;
