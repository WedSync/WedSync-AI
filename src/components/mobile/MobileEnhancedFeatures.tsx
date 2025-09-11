'use client';

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import {
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  HomeIcon,
  HeartIcon,
  ShareIcon,
  BookmarkIcon,
  MoreHorizontalIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// Types
interface SwipeConfig {
  threshold: number;
  velocity: number;
  enableHorizontal: boolean;
  enableVertical: boolean;
}

interface PullToRefreshConfig {
  threshold: number;
  maxDistance: number;
  resistance: number;
  snapBackDuration: number;
}

interface TouchGestureEvent {
  type: 'swipe' | 'pull' | 'pinch' | 'tap' | 'long-press';
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  velocity?: number;
  scale?: number;
}

// Swipe Gesture Hook
export function useSwipeGesture(
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void,
  config: Partial<SwipeConfig> = {},
) {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );

  const defaultConfig: SwipeConfig = {
    threshold: 50,
    velocity: 0.3,
    enableHorizontal: true,
    enableVertical: true,
    ...config,
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      const deltaTime = Date.now() - touchStart.current.time;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const velocity = Math.max(absX, absY) / deltaTime;

      // Check if swipe meets threshold and velocity requirements
      if (velocity < defaultConfig.velocity) return;

      // Determine swipe direction
      if (
        absX > absY &&
        absX > defaultConfig.threshold &&
        defaultConfig.enableHorizontal
      ) {
        onSwipe(deltaX > 0 ? 'right' : 'left');
      } else if (
        absY > absX &&
        absY > defaultConfig.threshold &&
        defaultConfig.enableVertical
      ) {
        onSwipe(deltaY > 0 ? 'down' : 'up');
      }

      touchStart.current = null;
    },
    [onSwipe, defaultConfig],
  );

  const handleTouchCancel = useCallback(() => {
    touchStart.current = null;
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  };
}

// Pull to Refresh Component
interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  config?: Partial<PullToRefreshConfig>;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  config = {},
  className,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTouchY = useRef<number | null>(null);

  const defaultConfig: PullToRefreshConfig = {
    threshold: 70,
    maxDistance: 120,
    resistance: 2.5,
    snapBackDuration: 200,
    ...config,
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;

      // Only trigger if at the top of the scroll container
      const container = containerRef.current;
      if (container && container.scrollTop > 0) return;

      touchStartY.current = e.touches[0].clientY;
      lastTouchY.current = e.touches[0].clientY;
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || !touchStartY.current) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY.current;

      // Only pull down
      if (deltaY <= 0) return;

      // Apply resistance
      const resistedDistance = Math.min(
        deltaY / defaultConfig.resistance,
        defaultConfig.maxDistance,
      );

      setPullDistance(resistedDistance);
      setIsPulling(true);

      // Prevent page scrolling while pulling
      if (resistedDistance > 10) {
        e.preventDefault();
      }

      lastTouchY.current = currentY;
    },
    [disabled, isRefreshing, defaultConfig],
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !touchStartY.current) return;

    const shouldRefresh = pullDistance > defaultConfig.threshold;

    setIsPulling(false);
    touchStartY.current = null;
    lastTouchY.current = null;

    if (shouldRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    // Animate back to 0
    setPullDistance(0);
  }, [
    disabled,
    isRefreshing,
    pullDistance,
    defaultConfig.threshold,
    onRefresh,
  ]);

  // Calculate refresh indicator opacity and rotation
  const refreshOpacity = Math.min(pullDistance / defaultConfig.threshold, 1);
  const refreshRotation = (pullDistance / defaultConfig.threshold) * 180;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform duration-200 z-10"
        style={{
          transform: `translateY(${Math.max(pullDistance - 50, -50)}px)`,
          opacity: isPulling || isRefreshing ? refreshOpacity : 0,
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white shadow-lg',
            'transition-all duration-200',
          )}
        >
          <RefreshCwIcon
            className={cn(
              'w-5 h-5 transition-transform duration-200',
              isRefreshing && 'animate-spin',
            )}
            style={{
              transform: `rotate(${isRefreshing ? 0 : refreshRotation}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with dynamic top margin */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${isPulling ? pullDistance : 0}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Swipeable Card Component
interface SwipeableCardProps {
  children: ReactNode;
  leftAction?: {
    icon: ReactNode;
    color: string;
    onAction: () => void;
    label: string;
  };
  rightAction?: {
    icon: ReactNode;
    color: string;
    onAction: () => void;
    label: string;
  };
  className?: string;
}

export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  className,
}: SwipeableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isActionTriggered, setIsActionTriggered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);

  const SWIPE_THRESHOLD = 80;
  const ACTION_THRESHOLD = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    startX.current = e.touches[0].clientX;
    setSwipeOffset(0);
    setIsActionTriggered(false);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current) return;

      const currentX = e.touches[0].clientX;
      const deltaX = currentX - startX.current;

      // Apply resistance at the edges
      let offset = deltaX;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        const excess = Math.abs(deltaX) - SWIPE_THRESHOLD;
        offset =
          deltaX > 0
            ? SWIPE_THRESHOLD + excess * 0.3
            : -SWIPE_THRESHOLD - excess * 0.3;
      }

      setSwipeOffset(offset);

      // Trigger action preview at threshold
      if (Math.abs(offset) > ACTION_THRESHOLD && !isActionTriggered) {
        setIsActionTriggered(true);
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } else if (Math.abs(offset) <= ACTION_THRESHOLD && isActionTriggered) {
        setIsActionTriggered(false);
      }
    },
    [isActionTriggered],
  );

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;

    if (Math.abs(swipeOffset) > ACTION_THRESHOLD) {
      // Trigger action
      if (swipeOffset > 0 && leftAction) {
        leftAction.onAction();
      } else if (swipeOffset < 0 && rightAction) {
        rightAction.onAction();
      }
    }

    // Reset position
    setSwipeOffset(0);
    setIsActionTriggered(false);
  }, [swipeOffset, leftAction, rightAction]);

  return (
    <div className="relative overflow-hidden">
      {/* Left Action Background */}
      {leftAction && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center justify-center',
            'transition-all duration-200',
            leftAction.color,
          )}
          style={{
            width: Math.max(0, swipeOffset),
            opacity: swipeOffset > 0 ? 1 : 0,
          }}
        >
          <div className="flex flex-col items-center text-white px-4">
            {leftAction.icon}
            <span className="text-xs mt-1 font-medium">{leftAction.label}</span>
          </div>
        </div>
      )}

      {/* Right Action Background */}
      {rightAction && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-center',
            'transition-all duration-200',
            rightAction.color,
          )}
          style={{
            width: Math.max(0, -swipeOffset),
            opacity: swipeOffset < 0 ? 1 : 0,
          }}
        >
          <div className="flex flex-col items-center text-white px-4">
            {rightAction.icon}
            <span className="text-xs mt-1 font-medium">
              {rightAction.label}
            </span>
          </div>
        </div>
      )}

      {/* Card Content */}
      <div
        ref={cardRef}
        className={cn(
          'relative bg-white transition-transform duration-200',
          isActionTriggered && 'scale-95',
          className,
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// Bottom Sheet Component
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  snapPoints = [0.3, 0.7, 0.95],
  initialSnap = 1,
  className,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - dragStartY;
      const windowHeight = window.innerHeight;

      // Calculate new snap point based on drag
      const currentHeight = snapPoints[currentSnap] * windowHeight;
      const newHeight = Math.max(
        0,
        Math.min(windowHeight, currentHeight - deltaY),
      );
      const newSnapRatio = newHeight / windowHeight;

      // Find closest snap point
      let closestSnap = 0;
      let minDiff = Math.abs(snapPoints[0] - newSnapRatio);

      snapPoints.forEach((snap, index) => {
        const diff = Math.abs(snap - newSnapRatio);
        if (diff < minDiff) {
          minDiff = diff;
          closestSnap = index;
        }
      });

      if (closestSnap !== currentSnap) {
        setCurrentSnap(closestSnap);
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    },
    [isDragging, dragStartY, currentSnap, snapPoints],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);

    // Close if dragged to minimum
    if (currentSnap === 0) {
      onClose();
    }
  }, [currentSnap, onClose]);

  if (!isOpen) return null;

  const heightPercentage = snapPoints[currentSnap] * 100;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: snapPoints[currentSnap] * 0.5 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl',
          'transition-all duration-300 overflow-hidden',
          className,
        )}
        style={{
          height: `${heightPercentage}%`,
          transform: isDragging ? 'none' : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

// Long Press Hook
export function useLongPress(
  onLongPress: () => void,
  delay: number = 500,
  shouldPreventDefault: boolean = true,
) {
  const timeout = useRef<NodeJS.Timeout>();
  const isPressed = useRef(false);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (shouldPreventDefault) {
        e.preventDefault();
      }

      isPressed.current = true;
      timeout.current = setTimeout(() => {
        if (isPressed.current) {
          onLongPress();
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
        }
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault],
  );

  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    isPressed.current = false;
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
  };
}

// Haptic Feedback Hook
export function useHapticFeedback() {
  const light = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  }, []);

  const medium = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  const heavy = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }, []);

  const success = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  }, []);

  const error = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
  }, []);

  return { light, medium, heavy, success, error };
}

// Example usage component
export function MobileEnhancedExample() {
  const { toast } = useToast();
  const haptic = useHapticFeedback();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const longPressProps = useLongPress(() => {
    toast({ title: 'Long press detected!' });
    haptic.medium();
  });

  const swipeProps = useSwipeGesture((direction) => {
    toast({ title: `Swiped ${direction}!` });
    haptic.light();
  });

  const handleRefresh = async () => {
    haptic.light();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshKey((prev) => prev + 1);
    toast({ title: 'Refreshed successfully!' });
  };

  const sampleCards = [
    { id: 1, title: 'Photo Group 1', description: 'Family portraits' },
    { id: 2, title: 'Photo Group 2', description: 'Wedding party shots' },
    { id: 3, title: 'Photo Group 3', description: 'Ceremony moments' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-semibold">Mobile Enhanced Features</h1>
        <p className="text-sm text-gray-600 mt-1">
          Pull to refresh, swipe cards, long press, and more
        </p>
      </div>

      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="p-4 space-y-4">
          {/* Swipeable Cards */}
          {sampleCards.map((card) => (
            <SwipeableCard
              key={`${card.id}-${refreshKey}`}
              leftAction={{
                icon: <HeartIcon className="w-5 h-5" />,
                color: 'bg-green-500',
                onAction: () => {
                  toast({ title: `Liked ${card.title}!` });
                  haptic.success();
                },
                label: 'Like',
              }}
              rightAction={{
                icon: <ShareIcon className="w-5 h-5" />,
                color: 'bg-blue-500',
                onAction: () => {
                  toast({ title: `Shared ${card.title}!` });
                  haptic.success();
                },
                label: 'Share',
              }}
              className="rounded-lg border border-gray-200"
            >
              <div className="p-4" {...longPressProps} {...swipeProps}>
                <h3 className="font-medium text-gray-900">{card.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{card.description}</p>
                <div className="mt-2 text-xs text-gray-500">
                  💡 Long press for options, swipe left/right for actions
                </div>
              </div>
            </SwipeableCard>
          ))}

          {/* Bottom Sheet Trigger */}
          <button
            onClick={() => setIsBottomSheetOpen(true)}
            className="w-full p-4 bg-primary-600 text-white rounded-lg font-medium"
          >
            Open Bottom Sheet
          </button>
        </div>
      </PullToRefresh>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        snapPoints={[0.3, 0.6, 0.9]}
      >
        <h2 className="text-lg font-semibold mb-4">Bottom Sheet Content</h2>
        <div className="space-y-4">
          <p>This is a draggable bottom sheet with snap points.</p>
          <p>You can drag the handle to resize or tap outside to close.</p>

          <div className="grid grid-cols-2 gap-2">
            <button className="p-3 bg-gray-100 rounded-lg">Action 1</button>
            <button className="p-3 bg-gray-100 rounded-lg">Action 2</button>
            <button className="p-3 bg-gray-100 rounded-lg">Action 3</button>
            <button className="p-3 bg-gray-100 rounded-lg">Action 4</button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
