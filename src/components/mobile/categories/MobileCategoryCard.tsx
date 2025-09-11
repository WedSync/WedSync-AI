'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { TaskCategory } from '@/types/task-categories';
import { cn } from '@/lib/utils';
import {
  FolderIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface MobileCategoryCardProps {
  category: TaskCategory;
  taskCount: number;
  completedCount: number;
  onTap?: (category: TaskCategory) => void;
  onLongPress?: (category: TaskCategory) => void;
  onSwipeRight?: (category: TaskCategory) => void;
  onSwipeLeft?: (category: TaskCategory) => void;
  isSelected?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function MobileCategoryCard({
  category,
  taskCount,
  completedCount,
  onTap,
  onLongPress,
  onSwipeRight,
  onSwipeLeft,
  isSelected = false,
  disabled = false,
  className,
}: MobileCategoryCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(
    null,
  );
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const completionPercentage =
    taskCount > 0 ? (completedCount / taskCount) * 100 : 0;
  const inProgressCount = taskCount - completedCount;

  // Handle touch start for long press
  const handleTouchStart = useCallback(() => {
    if (disabled) return;

    setIsPressed(true);

    // Trigger haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
      onLongPress?.(category);
      setIsPressed(false);
    }, 500);
  }, [category, disabled, onLongPress]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Handle drag end for swipe gestures
  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const swipeThreshold = 100;
      const velocityThreshold = 500;

      if (
        info.offset.x > swipeThreshold ||
        info.velocity.x > velocityThreshold
      ) {
        setSwipeDirection('right');
        onSwipeRight?.(category);

        // Reset after animation
        setTimeout(() => setSwipeDirection(null), 300);
      } else if (
        info.offset.x < -swipeThreshold ||
        info.velocity.x < -velocityThreshold
      ) {
        setSwipeDirection('left');
        onSwipeLeft?.(category);

        // Reset after animation
        setTimeout(() => setSwipeDirection(null), 300);
      }
    },
    [category, onSwipeLeft, onSwipeRight],
  );

  // Get category icon
  const getCategoryIcon = () => {
    const iconClass = 'w-6 h-6';
    switch (category.icon) {
      case 'calendar':
        return <ClockIcon className={iconClass} />;
      case 'check':
        return <CheckCircleIcon className={iconClass} />;
      case 'alert':
        return <AlertCircleIcon className={iconClass} />;
      default:
        return <FolderIcon className={iconClass} />;
    }
  };

  // Get status color
  const getStatusColor = () => {
    if (completionPercentage === 100) return 'text-green-600 bg-green-50';
    if (completionPercentage > 75) return 'text-blue-600 bg-blue-50';
    if (completionPercentage > 50) return 'text-yellow-600 bg-yellow-50';
    if (completionPercentage > 0) return 'text-orange-600 bg-orange-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn('relative touch-manipulation select-none', className)}
      initial={false}
      animate={{
        x:
          swipeDirection === 'right'
            ? 300
            : swipeDirection === 'left'
              ? -300
              : 0,
        opacity: swipeDirection ? 0 : 1,
        scale: isPressed ? 0.98 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => !disabled && onTap?.(category)}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 transition-all duration-200',
          'min-h-[120px] p-4 flex flex-col justify-between',
          isSelected
            ? 'border-purple-500 bg-purple-50 shadow-lg'
            : 'border-gray-200 bg-white shadow-sm',
          disabled && 'opacity-50 pointer-events-none',
          !disabled && 'active:shadow-md',
        )}
        style={{
          borderLeftColor: category.color,
          borderLeftWidth: '4px',
        }}
      >
        {/* Category Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div
              className={cn('p-2 rounded-xl', getStatusColor())}
              style={{
                backgroundColor: `${category.color}20`,
                color: category.color,
              }}
            >
              {getCategoryIcon()}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-base">
                {category.display_name}
              </h3>
              {category.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {category.description}
                </p>
              )}
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        </div>

        {/* Task Statistics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">
              {completedCount}/{taskCount} tasks
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ backgroundColor: category.color }}
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center text-green-600">
                <CheckCircleIcon className="w-3.5 h-3.5 mr-1" />
                {completedCount}
              </span>
              <span className="flex items-center text-yellow-600">
                <ClockIcon className="w-3.5 h-3.5 mr-1" />
                {inProgressCount}
              </span>
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: category.color }}
            >
              {Math.round(completionPercentage)}%
            </span>
          </div>
        </div>

        {/* Swipe Indicators */}
        <AnimatePresence>
          {swipeDirection === 'right' && (
            <motion.div
              className="absolute inset-0 bg-green-500 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
            >
              <CheckCircleIcon className="w-12 h-12 text-white" />
            </motion.div>
          )}
          {swipeDirection === 'left' && (
            <motion.div
              className="absolute inset-0 bg-red-500 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
            >
              <AlertCircleIcon className="w-12 h-12 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
