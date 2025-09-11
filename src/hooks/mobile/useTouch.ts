// WS-254 Team D: Touch-Optimized Gesture Support and Haptic Feedback
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type {
  TouchGesture,
  HapticFeedbackPattern,
} from '@/types/dietary-management';

interface TouchPosition {
  x: number;
  y: number;
  timestamp: number;
}

interface GestureState {
  isScrolling: boolean;
  isPinching: boolean;
  isSwipelocked: boolean;
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null;
  scale: number;
}

interface UseTouchOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: (element: HTMLElement) => void;
  onDoubleTap?: (element: HTMLElement) => void;
  onLongPress?: (element: HTMLElement) => void;
  onPinchStart?: () => void;
  onPinchMove?: (scale: number) => void;
  onPinchEnd?: () => void;
  swipeThreshold?: number;
  longPressDelay?: number;
  enableHapticFeedback?: boolean;
}

export function useTouch(options: UseTouchOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onLongPress,
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    swipeThreshold = 50,
    longPressDelay = 500,
    enableHapticFeedback = true,
  } = options;

  const touchStartRef = useRef<TouchPosition | null>(null);
  const touchEndRef = useRef<TouchPosition | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout>();
  const initialDistanceRef = useRef<number>(0);

  const [gestureState, setGestureState] = useState<GestureState>({
    isScrolling: false,
    isPinching: false,
    isSwipelocked: false,
    swipeDirection: null,
    scale: 1,
  });

  const hapticFeedback = useCallback(
    (pattern: number | number[]) => {
      if (enableHapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    },
    [enableHapticFeedback],
  );

  const getTouchPosition = useCallback(
    (touch: Touch): TouchPosition => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    }),
    [],
  );

  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      const touches = event.touches;

      if (touches.length === 1) {
        // Single touch - potential tap/swipe/long press
        touchStartRef.current = getTouchPosition(touches[0]);

        // Start long press timer
        if (onLongPress) {
          longPressTimerRef.current = setTimeout(() => {
            const target = event.target as HTMLElement;
            onLongPress(target);
            hapticFeedback(100);
          }, longPressDelay);
        }

        setGestureState((prev) => ({
          ...prev,
          isScrolling: false,
          isPinching: false,
          swipeDirection: null,
        }));
      } else if (touches.length === 2) {
        // Two touches - pinch gesture
        const distance = getDistance(touches[0], touches[1]);
        initialDistanceRef.current = distance;

        setGestureState((prev) => ({
          ...prev,
          isPinching: true,
          scale: 1,
        }));

        onPinchStart?.();
      }
    },
    [
      getTouchPosition,
      getDistance,
      onLongPress,
      onPinchStart,
      hapticFeedback,
      longPressDelay,
    ],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      const touches = event.touches;

      // Clear long press timer on move
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = undefined;
      }

      if (touches.length === 1 && touchStartRef.current) {
        // Single touch movement - potential scroll or swipe
        const currentPosition = getTouchPosition(touches[0]);
        const deltaX = Math.abs(currentPosition.x - touchStartRef.current.x);
        const deltaY = Math.abs(currentPosition.y - touchStartRef.current.y);

        // Determine if scrolling or swiping
        if (deltaY > deltaX && deltaY > 10) {
          setGestureState((prev) => ({ ...prev, isScrolling: true }));
        } else if (deltaX > 30) {
          const direction =
            currentPosition.x > touchStartRef.current.x ? 'right' : 'left';
          setGestureState((prev) => ({
            ...prev,
            swipeDirection: direction,
            isSwipelocked: true,
          }));

          // Prevent scrolling during horizontal swipe
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            event.preventDefault();
          }
        }
      } else if (touches.length === 2 && initialDistanceRef.current > 0) {
        // Two touches - pinch zoom
        const currentDistance = getDistance(touches[0], touches[1]);
        const scale = currentDistance / initialDistanceRef.current;

        setGestureState((prev) => ({ ...prev, scale }));
        onPinchMove?.(scale);

        // Prevent default zooming
        event.preventDefault();
      }
    },
    [getTouchPosition, getDistance, onPinchMove],
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      const touches = event.changedTouches;

      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = undefined;
      }

      if (touches.length === 1) {
        touchEndRef.current = getTouchPosition(touches[0]);

        if (touchStartRef.current && touchEndRef.current) {
          const deltaX = touchEndRef.current.x - touchStartRef.current.x;
          const deltaY = touchEndRef.current.y - touchStartRef.current.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const timeDelta =
            touchEndRef.current.timestamp - touchStartRef.current.timestamp;

          // Check for tap (short distance and time)
          if (distance < 10 && timeDelta < 300) {
            const now = Date.now();
            const target = event.target as HTMLElement;

            // Double tap detection
            if (onDoubleTap && now - lastTapRef.current < 300) {
              onDoubleTap(target);
              hapticFeedback([50, 50, 50]);
              lastTapRef.current = 0; // Reset to prevent triple tap
            } else {
              onTap?.(target);
              hapticFeedback(50);
              lastTapRef.current = now;
            }
          }
          // Check for swipe
          else if (!gestureState.isScrolling && distance > swipeThreshold) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              // Horizontal swipe
              if (deltaX > 0) {
                onSwipeRight?.();
              } else {
                onSwipeLeft?.();
              }
              hapticFeedback(75);
            } else {
              // Vertical swipe
              if (deltaY > 0) {
                onSwipeDown?.();
              } else {
                onSwipeUp?.();
              }
              hapticFeedback(75);
            }
          }
        }
      }

      // Handle pinch end
      if (gestureState.isPinching && event.touches.length < 2) {
        onPinchEnd?.();
        setGestureState((prev) => ({
          ...prev,
          isPinching: false,
          scale: 1,
        }));
      }

      // Reset gesture state
      if (event.touches.length === 0) {
        setGestureState({
          isScrolling: false,
          isPinching: false,
          isSwipelocked: false,
          swipeDirection: null,
          scale: 1,
        });

        touchStartRef.current = null;
        touchEndRef.current = null;
      }
    },
    [
      getTouchPosition,
      gestureState,
      swipeThreshold,
      onTap,
      onDoubleTap,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onPinchEnd,
      hapticFeedback,
    ],
  );

  useEffect(() => {
    const element = document.body;

    // Passive listeners for better performance
    element.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Touch event handlers for components
  const touchEvents = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return {
    touchEvents,
    gestureState,
    hapticFeedback,
  };
}

// Utility hook for vibration feedback
export function useVibration() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Predefined haptic feedback patterns
  const patterns: Record<string, HapticFeedbackPattern> = {
    success: {
      type: 'success',
      pattern: [100, 50, 100],
      description: 'Success confirmation',
    },
    warning: {
      type: 'warning',
      pattern: [200, 100, 200],
      description: 'Warning alert',
    },
    error: {
      type: 'error',
      pattern: [100, 100, 100, 100],
      description: 'Error notification',
    },
    selection: {
      type: 'selection',
      pattern: 50,
      description: 'Item selection',
    },
    notification: {
      type: 'notification',
      pattern: [75, 50, 75],
      description: 'General notification',
    },
  };

  const vibratePattern = useCallback(
    (patternName: keyof typeof patterns) => {
      const pattern = patterns[patternName];
      if (pattern) {
        vibrate(pattern.pattern);
      }
    },
    [vibrate],
  );

  return {
    vibrate,
    vibratePattern,
    patterns,
  };
}

// Custom hook for pull-to-refresh functionality
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number>(0);
  const { vibrate } = useVibration();

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (window.scrollY === 0 && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const distance = Math.max(0, currentY - startY.current);

        if (distance > 0) {
          setPullDistance(distance);

          // Light haptic feedback when reaching threshold
          if (distance > 80 && distance < 85) {
            vibrate(50);
          }
        }
      }
    },
    [isRefreshing, vibrate],
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      vibrate([100, 50]);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh, vibrate]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isRefreshing,
    pullDistance,
    refreshThreshold: 80,
  };
}
