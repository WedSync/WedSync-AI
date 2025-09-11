'use client';

// WedSync SwipeableNotificationCard - Mobile-First Touch Gestures
// Advanced mobile notification card with swipe actions and haptic feedback

import React, { useState, useRef, useCallback } from 'react';
import {
  motion,
  PanInfo,
  useMotionValue,
  useTransform,
  useAnimation,
} from 'framer-motion';
import {
  XMarkIcon,
  ArchiveBoxIcon,
  ClockIcon,
  BellSlashIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { NotificationCard } from './NotificationCard';
import type { Notification, NotificationAction, SwipeAction } from '@/types';

// Swipe action configuration
const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;
const RESISTANCE_FACTOR = 0.3;

// Haptic feedback utility (Web Vibration API)
const triggerHapticFeedback = (
  type: 'light' | 'medium' | 'heavy' = 'light',
) => {
  if (!navigator.vibrate) return;

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
};

// Swipe indicator component
interface SwipeIndicatorProps {
  direction: 'left' | 'right';
  opacity: number;
  action: SwipeAction;
}

function SwipeIndicator({ direction, opacity, action }: SwipeIndicatorProps) {
  const getIndicatorConfig = () => {
    switch (action) {
      case 'dismiss':
        return {
          icon: <XMarkIcon className="w-6 h-6" />,
          label: 'Dismiss',
          color: 'bg-red-500 text-white',
          position: direction === 'left' ? 'right-4' : 'left-4',
        };
      case 'archive':
        return {
          icon: <ArchiveBoxIcon className="w-6 h-6" />,
          label: 'Archive',
          color: 'bg-green-500 text-white',
          position: direction === 'left' ? 'right-4' : 'left-4',
        };
      case 'snooze':
        return {
          icon: <ClockIcon className="w-6 h-6" />,
          label: 'Snooze',
          color: 'bg-yellow-500 text-white',
          position: direction === 'left' ? 'right-4' : 'left-4',
        };
      default:
        return {
          icon: <BellSlashIcon className="w-6 h-6" />,
          label: 'Action',
          color: 'bg-gray-500 text-white',
          position: direction === 'left' ? 'right-4' : 'left-4',
        };
    }
  };

  const config = getIndicatorConfig();

  return (
    <motion.div
      className={`absolute top-1/2 transform -translate-y-1/2 ${config.position} flex flex-col items-center justify-center p-3 rounded-lg ${config.color}`}
      style={{ opacity }}
      animate={{
        scale: opacity > 0.7 ? [1, 1.1, 1] : 1,
      }}
      transition={{
        duration: 0.3,
        repeat: opacity > 0.7 ? Infinity : 0,
      }}
    >
      {config.icon}
      <span className="text-xs font-medium mt-1">{config.label}</span>
    </motion.div>
  );
}

// Main SwipeableNotificationCard component
interface SwipeableNotificationCardProps {
  notification: Notification;
  onSwipeLeft: (action: SwipeAction) => void;
  onSwipeRight: (action: SwipeAction) => void;
  onTap: () => void;
  onAction: (action: NotificationAction) => void;
  onMarkRead: () => void;
  leftSwipeAction?: SwipeAction;
  rightSwipeAction?: SwipeAction;
  isPending?: boolean;
  disabled?: boolean;
  hapticEnabled?: boolean;
  className?: string;
}

export function SwipeableNotificationCard({
  notification,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  onAction,
  onMarkRead,
  leftSwipeAction = 'dismiss',
  rightSwipeAction = 'archive',
  isPending = false,
  disabled = false,
  hapticEnabled = true,
  className = '',
}: SwipeableNotificationCardProps) {
  // Motion values and animations
  const x = useMotionValue(0);
  const controls = useAnimation();

  // Transform values for indicators
  const leftOpacity = useTransform(
    x,
    [-SWIPE_THRESHOLD * 2, -SWIPE_THRESHOLD, 0],
    [1, 0.8, 0],
  );
  const rightOpacity = useTransform(
    x,
    [0, SWIPE_THRESHOLD, SWIPE_THRESHOLD * 2],
    [0, 0.8, 1],
  );
  const scale = useTransform(x, [-150, 0, 150], [0.95, 1, 0.95]);

  // State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [feedbackTriggered, setFeedbackTriggered] = useState(false);

  // Refs
  const constraintsRef = useRef(null);
  const startTimeRef = useRef<number>(0);

  // Handle drag start
  const handleDragStart = useCallback(
    (event: any, info: PanInfo) => {
      if (disabled || isPending) return;

      setIsDragging(true);
      setDragStartX(info.point.x);
      setFeedbackTriggered(false);
      startTimeRef.current = Date.now();

      if (hapticEnabled) {
        triggerHapticFeedback('light');
      }
    },
    [disabled, isPending, hapticEnabled],
  );

  // Handle drag
  const handleDrag = useCallback(
    (event: any, info: PanInfo) => {
      if (disabled || isPending) return;

      const currentX = x.get();
      const absX = Math.abs(currentX);

      // Trigger haptic feedback at threshold
      if (absX > SWIPE_THRESHOLD * 0.8 && !feedbackTriggered) {
        if (hapticEnabled) {
          triggerHapticFeedback('medium');
        }
        setFeedbackTriggered(true);
      }

      // Reset feedback trigger when going back
      if (absX < SWIPE_THRESHOLD * 0.5 && feedbackTriggered) {
        setFeedbackTriggered(false);
      }
    },
    [disabled, isPending, hapticEnabled, feedbackTriggered, x],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: any, info: PanInfo) => {
      if (disabled || isPending) return;

      setIsDragging(false);
      const dragDistance = x.get();
      const velocity = info.velocity.x;
      const dragTime = Date.now() - startTimeRef.current;

      // Determine if swipe should trigger action
      const shouldTriggerSwipe =
        Math.abs(dragDistance) > SWIPE_THRESHOLD ||
        Math.abs(velocity) > SWIPE_VELOCITY_THRESHOLD;

      if (shouldTriggerSwipe) {
        // Determine swipe direction and action
        const isLeftSwipe = dragDistance < 0;
        const action = isLeftSwipe ? leftSwipeAction : rightSwipeAction;

        if (hapticEnabled) {
          triggerHapticFeedback('heavy');
        }

        // Animate off screen
        const targetX = isLeftSwipe ? -window.innerWidth : window.innerWidth;
        controls
          .start({
            x: targetX,
            opacity: 0,
            scale: 0.8,
            transition: { duration: 0.3, ease: 'easeInOut' },
          })
          .then(() => {
            // Trigger swipe callback after animation
            if (isLeftSwipe) {
              onSwipeLeft(action);
            } else {
              onSwipeRight(action);
            }
          });
      } else {
        // Spring back to center
        controls.start({
          x: 0,
          transition: { type: 'spring', stiffness: 300, damping: 30 },
        });
      }
    },
    [
      disabled,
      isPending,
      x,
      leftSwipeAction,
      rightSwipeAction,
      onSwipeLeft,
      onSwipeRight,
      controls,
      hapticEnabled,
    ],
  );

  // Handle tap (only if not dragging and drag distance is minimal)
  const handleTap = useCallback(() => {
    if (isDragging || Math.abs(x.get()) > 10) return;
    onTap();
  }, [isDragging, x, onTap]);

  // Handle double tap for quick mark as read
  const handleDoubleTap = useCallback(() => {
    if (!notification.readStatus) {
      onMarkRead();
      if (hapticEnabled) {
        triggerHapticFeedback('medium');
      }
    }
  }, [notification.readStatus, onMarkRead, hapticEnabled]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      ref={constraintsRef}
    >
      {/* Background indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        {/* Left swipe indicator */}
        <motion.div style={{ opacity: leftOpacity }}>
          <SwipeIndicator
            direction="left"
            opacity={leftOpacity.get()}
            action={leftSwipeAction}
          />
        </motion.div>

        {/* Right swipe indicator */}
        <motion.div style={{ opacity: rightOpacity }}>
          <SwipeIndicator
            direction="right"
            opacity={rightOpacity.get()}
            action={rightSwipeAction}
          />
        </motion.div>
      </div>

      {/* Main notification card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={RESISTANCE_FACTOR}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        onTapStart={(event, info) => {
          // Handle double tap detection
          const now = Date.now();
          const lastTap = (event.target as any).lastTap || 0;
          if (now - lastTap < 300) {
            handleDoubleTap();
          }
          (event.target as any).lastTap = now;
        }}
        animate={controls}
        style={{ x, scale }}
        className={`relative z-10 cursor-pointer select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        whileTap={!isDragging ? { scale: 0.98 } : {}}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <NotificationCard
          notification={notification}
          onAction={onAction}
          onMarkRead={onMarkRead}
          isPending={isPending}
          compactMode={true}
          showFullContent={false}
        />
      </motion.div>

      {/* Swipe instructions overlay (shows briefly on first load) */}
      {!notification.engagement.viewed && (
        <motion.div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-4 pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3, duration: 1 }}
        >
          <div className="text-white text-xs text-center">
            <p className="flex items-center justify-center space-x-4">
              <span>← Swipe left to {leftSwipeAction}</span>
              <span>•</span>
              <span>Swipe right to {rightSwipeAction} →</span>
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Mobile notification interface component
interface MobileNotificationInterfaceProps {
  notifications: Notification[];
  onSwipeAction: (notificationId: string, action: SwipeAction) => void;
  onNotificationAction: (
    notificationId: string,
    action: NotificationAction,
  ) => void;
  onMarkRead: (notificationId: string) => void;
  onTapNotification: (notificationId: string) => void;
  hapticEnabled?: boolean;
  className?: string;
}

export function MobileNotificationInterface({
  notifications,
  onSwipeAction,
  onNotificationAction,
  onMarkRead,
  onTapNotification,
  hapticEnabled = true,
  className = '',
}: MobileNotificationInterfaceProps) {
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  const handleSwipeAction = useCallback(
    async (notificationId: string, action: SwipeAction) => {
      setPendingActions((prev) => new Set([...prev, notificationId]));

      try {
        await onSwipeAction(notificationId, action);
      } finally {
        setPendingActions((prev) => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });
      }
    },
    [onSwipeAction],
  );

  const handleNotificationAction = useCallback(
    async (notificationId: string, action: NotificationAction) => {
      setPendingActions((prev) => new Set([...prev, notificationId]));

      try {
        await onNotificationAction(notificationId, action);
      } finally {
        setPendingActions((prev) => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });
      }
    },
    [onNotificationAction],
  );

  return (
    <div className={`mobile-notifications space-y-2 ${className}`}>
      {notifications.map((notification, index) => (
        <motion.div
          key={notification.notificationId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
        >
          <SwipeableNotificationCard
            notification={notification}
            onSwipeLeft={(action) =>
              handleSwipeAction(notification.notificationId, action)
            }
            onSwipeRight={(action) =>
              handleSwipeAction(notification.notificationId, action)
            }
            onTap={() => onTapNotification(notification.notificationId)}
            onAction={(action) =>
              handleNotificationAction(notification.notificationId, action)
            }
            onMarkRead={() => onMarkRead(notification.notificationId)}
            isPending={pendingActions.has(notification.notificationId)}
            hapticEnabled={hapticEnabled}
            leftSwipeAction={
              notification.category === 'urgent' ? 'snooze' : 'dismiss'
            }
            rightSwipeAction="archive"
          />
        </motion.div>
      ))}

      {notifications.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center py-12 text-center text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <CheckIcon className="w-12 h-12 text-green-500 mb-4" />
          <p className="text-lg font-medium text-gray-900">All caught up!</p>
          <p className="text-sm">You have no new notifications.</p>
        </motion.div>
      )}
    </div>
  );
}

// Hook for mobile notification gestures
export function useMobileNotificationGestures(hapticEnabled: boolean = true) {
  const triggerSuccess = useCallback(() => {
    if (hapticEnabled) {
      triggerHapticFeedback('medium');
    }
  }, [hapticEnabled]);

  const triggerError = useCallback(() => {
    if (hapticEnabled) {
      triggerHapticFeedback('heavy');
    }
  }, [hapticEnabled]);

  const triggerSelection = useCallback(() => {
    if (hapticEnabled) {
      triggerHapticFeedback('light');
    }
  }, [hapticEnabled]);

  return {
    triggerSuccess,
    triggerError,
    triggerSelection,
    isHapticSupported: 'vibrate' in navigator,
  };
}

export default SwipeableNotificationCard;
