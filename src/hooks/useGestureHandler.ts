/**
 * Mobile Gesture Handler Hook for WedSync Environment Variables Management System
 * Team D - Performance Optimization & Mobile Experience
 * Handles touch gestures, swipe actions, and haptic feedback
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface GestureConfig {
  swipeThreshold?: number;
  tapTimeout?: number;
  longPressTimeout?: number;
  enableHaptics?: boolean;
  enableSwipeToDelete?: boolean;
  enablePullToRefresh?: boolean;
}

export interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPinchStart?: (scale: number) => void;
  onPinch?: (scale: number) => void;
  onPinchEnd?: (scale: number) => void;
  onPullToRefresh?: () => Promise<void>;
}

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface GestureState {
  isActive: boolean;
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  velocity?: number;
  scale?: number;
  isPinching: boolean;
  isLongPress: boolean;
  touchCount: number;
}

const DEFAULT_CONFIG: Required<GestureConfig> = {
  swipeThreshold: 50,
  tapTimeout: 300,
  longPressTimeout: 500,
  enableHaptics: true,
  enableSwipeToDelete: true,
  enablePullToRefresh: false,
};

/**
 * Custom hook for handling mobile touch gestures with performance optimization
 * Optimized for wedding suppliers working on mobile devices at venues
 */
export function useGestureHandler(
  callbacks: GestureCallbacks = {},
  config: GestureConfig = {},
) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Refs for tracking gesture state
  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout>();
  const longPressTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTouchRef = useRef<TouchPoint[]>([]);
  const initialDistanceRef = useRef<number>(0);
  const currentScaleRef = useRef<number>(1);

  // State for gesture tracking
  const [gestureState, setGestureState] = useState<GestureState>({
    isActive: false,
    isPinching: false,
    isLongPress: false,
    touchCount: 0,
  });

  // Haptic feedback function
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (!mergedConfig.enableHaptics) return;

      try {
        // iOS Haptic Feedback
        if ('hapticFeedback' in navigator) {
          (navigator as any).hapticFeedback.impact(type);
        }

        // Android Vibration API
        if ('vibrate' in navigator) {
          const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 40;
          navigator.vibrate(duration);
        }

        // Web Vibration API fallback
        if ('vibrate' in navigator) {
          const pattern =
            type === 'light' ? [10] : type === 'medium' ? [20] : [40];
          navigator.vibrate(pattern);
        }
      } catch (error) {
        // Haptic feedback not supported, continue silently
      }
    },
    [mergedConfig.enableHaptics],
  );

  // Calculate distance between two points
  const calculateDistance = useCallback(
    (point1: TouchPoint, point2: TouchPoint): number => {
      const dx = point2.x - point1.x;
      const dy = point2.y - point1.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    [],
  );

  // Calculate velocity
  const calculateVelocity = useCallback(
    (point1: TouchPoint, point2: TouchPoint): number => {
      const distance = calculateDistance(point1, point2);
      const time = Math.max(point2.timestamp - point1.timestamp, 1);
      return distance / time;
    },
    [calculateDistance],
  );

  // Determine swipe direction
  const getSwipeDirection = useCallback(
    (start: TouchPoint, end: TouchPoint): 'left' | 'right' | 'up' | 'down' => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? 'right' : 'left';
      } else {
        return dy > 0 ? 'down' : 'up';
      }
    },
    [],
  );

  // Handle touch start
  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      const touch = event.touches[0];
      const now = Date.now();

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: now,
      };

      // Track multiple touches for pinch gestures
      if (event.touches.length > 1) {
        const touch2 = event.touches[1];
        initialDistanceRef.current = Math.sqrt(
          Math.pow(touch2.clientX - touch.clientX, 2) +
            Math.pow(touch2.clientY - touch.clientY, 2),
        );

        setGestureState((prev) => ({
          ...prev,
          isPinching: true,
          touchCount: event.touches.length,
        }));

        if (callbacks.onPinchStart) {
          callbacks.onPinchStart(1);
        }
      } else {
        // Single touch - setup for tap/long press
        setGestureState((prev) => ({
          ...prev,
          isActive: true,
          touchCount: 1,
        }));

        // Setup long press detection
        if (callbacks.onLongPress) {
          longPressTimeoutRef.current = setTimeout(() => {
            setGestureState((prev) => ({ ...prev, isLongPress: true }));
            triggerHaptic('medium');
            callbacks.onLongPress!();
          }, mergedConfig.longPressTimeout);
        }
      }

      // Store touch points for velocity calculation
      lastTouchRef.current = Array.from(event.touches).map((touch) => ({
        x: touch.clientX,
        y: touch.clientY,
        timestamp: now,
      }));
    },
    [callbacks, mergedConfig, triggerHaptic],
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = event.touches[0];
      const currentTouch: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      };

      // Handle pinch gesture
      if (event.touches.length > 1 && gestureState.isPinching) {
        const touch2 = event.touches[1];
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch.clientX, 2) +
            Math.pow(touch2.clientY - touch.clientY, 2),
        );

        if (initialDistanceRef.current > 0) {
          const scale = currentDistance / initialDistanceRef.current;
          currentScaleRef.current = scale;

          setGestureState((prev) => ({
            ...prev,
            scale,
          }));

          if (callbacks.onPinch) {
            callbacks.onPinch(scale);
          }
        }
        return;
      }

      // Clear long press if user moves finger
      if (longPressTimeoutRef.current && !gestureState.isLongPress) {
        const distance = calculateDistance(touchStartRef.current, currentTouch);
        if (distance > 10) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = undefined;
        }
      }

      // Update gesture state with current position
      const distance = calculateDistance(touchStartRef.current, currentTouch);
      const direction = getSwipeDirection(touchStartRef.current, currentTouch);

      setGestureState((prev) => ({
        ...prev,
        direction,
        distance,
      }));
    },
    [
      gestureState.isPinching,
      gestureState.isLongPress,
      calculateDistance,
      getSwipeDirection,
      callbacks,
    ],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!touchStartRef.current) return;

      const now = Date.now();
      touchEndRef.current = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY,
        timestamp: now,
      };

      // Clear timeouts
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = undefined;
      }

      // Handle pinch end
      if (gestureState.isPinching) {
        if (callbacks.onPinchEnd) {
          callbacks.onPinchEnd(currentScaleRef.current);
        }

        setGestureState((prev) => ({
          ...prev,
          isPinching: false,
          scale: undefined,
          touchCount: 0,
        }));

        currentScaleRef.current = 1;
        initialDistanceRef.current = 0;
        return;
      }

      // Don't process if this was a long press
      if (gestureState.isLongPress) {
        setGestureState((prev) => ({
          ...prev,
          isActive: false,
          isLongPress: false,
          touchCount: 0,
        }));
        return;
      }

      const distance = calculateDistance(
        touchStartRef.current,
        touchEndRef.current,
      );
      const velocity = calculateVelocity(
        touchStartRef.current,
        touchEndRef.current,
      );
      const direction = getSwipeDirection(
        touchStartRef.current,
        touchEndRef.current,
      );

      // Handle swipe gestures
      if (distance > mergedConfig.swipeThreshold || velocity > 0.5) {
        triggerHaptic('light');

        switch (direction) {
          case 'left':
            if (callbacks.onSwipeLeft) callbacks.onSwipeLeft();
            break;
          case 'right':
            if (callbacks.onSwipeRight) callbacks.onSwipeRight();
            break;
          case 'up':
            if (callbacks.onSwipeUp) callbacks.onSwipeUp();
            break;
          case 'down':
            if (callbacks.onSwipeDown) {
              callbacks.onSwipeDown();
            } else if (
              mergedConfig.enablePullToRefresh &&
              callbacks.onPullToRefresh
            ) {
              // Pull to refresh gesture
              const element = event.target as Element;
              const scrollTop =
                element.scrollTop || document.documentElement.scrollTop;
              if (scrollTop === 0) {
                callbacks.onPullToRefresh();
              }
            }
            break;
        }
      } else {
        // Handle tap gestures
        const tapDuration = now - touchStartRef.current.timestamp;

        if (tapDuration < mergedConfig.tapTimeout) {
          tapCountRef.current++;

          // Single tap
          if (tapCountRef.current === 1) {
            tapTimeoutRef.current = setTimeout(() => {
              if (tapCountRef.current === 1 && callbacks.onTap) {
                triggerHaptic('light');
                callbacks.onTap();
              }
              tapCountRef.current = 0;
            }, 300);
          }

          // Double tap
          if (tapCountRef.current === 2) {
            if (tapTimeoutRef.current) {
              clearTimeout(tapTimeoutRef.current);
            }
            tapCountRef.current = 0;

            if (callbacks.onDoubleTap) {
              triggerHaptic('medium');
              callbacks.onDoubleTap();
            }
          }
        }
      }

      // Reset state
      setGestureState((prev) => ({
        ...prev,
        isActive: false,
        direction: undefined,
        distance: undefined,
        velocity: undefined,
        touchCount: 0,
      }));

      touchStartRef.current = null;
      touchEndRef.current = null;
    },
    [
      gestureState.isPinching,
      gestureState.isLongPress,
      calculateDistance,
      calculateVelocity,
      getSwipeDirection,
      mergedConfig,
      triggerHaptic,
      callbacks,
    ],
  );

  // Event handlers for binding to elements
  const eventHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    gestureState,
    eventHandlers,
    triggerHaptic,
    cleanup,
  };
}

/**
 * Specialized hook for swipe-to-delete functionality
 * Common pattern for environment variable management
 */
export function useSwipeToDelete(
  onDelete: () => void,
  config: { threshold?: number; enableHaptics?: boolean } = {},
) {
  const { threshold = 100, enableHaptics = true } = config;

  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const { eventHandlers, triggerHaptic } = useGestureHandler(
    {
      onSwipeLeft: () => {
        if (swipeProgress > 0.7) {
          // 70% threshold for delete
          setIsDeleting(true);
          triggerHaptic('heavy');
          setTimeout(() => {
            onDelete();
            setIsDeleting(false);
            setSwipeProgress(0);
          }, 200);
        }
      },
    },
    {
      swipeThreshold: threshold * 0.3,
      enableHaptics,
    },
  );

  const resetSwipe = useCallback(() => {
    setSwipeProgress(0);
    setIsDeleting(false);
  }, []);

  return {
    eventHandlers,
    swipeProgress,
    isDeleting,
    resetSwipe,
  };
}

/**
 * Hook for pull-to-refresh functionality
 * Essential for mobile environment variable management
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  config: { threshold?: number; enabled?: boolean } = {},
) {
  const { threshold = 60, enabled = true } = config;

  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { eventHandlers } = useGestureHandler(
    {
      onPullToRefresh: async () => {
        if (!enabled || isRefreshing) return;

        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }
      },
    },
    {
      enablePullToRefresh: enabled,
    },
  );

  return {
    eventHandlers,
    isPulling,
    pullDistance,
    isRefreshing,
    enabled,
  };
}
