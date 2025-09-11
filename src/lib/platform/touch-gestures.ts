'use client';

import { useCallback, useRef, useEffect } from 'react';

interface TouchGestureOptions {
  onSwipeRight?: (id: string) => void;
  onSwipeLeft?: (id: string) => void;
  onSwipeUp?: (id: string) => void;
  onSwipeDown?: (id: string) => void;
  onLongPress?: (id: string) => void;
  onTap?: (id: string) => void;
  onDoubleTap?: (id: string) => void;
  onPinch?: (id: string, scale: number) => void;
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  enableHaptic?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export const useTouchGestures = (options: TouchGestureOptions = {}) => {
  const {
    onSwipeRight,
    onSwipeLeft,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    onTap,
    onDoubleTap,
    onPinch,
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300,
    enableHaptic = true,
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);
  const initialDistanceRef = useRef<number | null>(null);
  const currentIdRef = useRef<string>('');

  // Haptic feedback helper
  const triggerHaptic = useCallback(
    (pattern: number | number[]) => {
      if (enableHaptic && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    },
    [enableHaptic],
  );

  // Calculate distance between two points
  const getDistance = useCallback((point1: TouchPoint, point2: TouchPoint) => {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2),
    );
  }, []);

  // Calculate distance between two touch points (for pinch)
  const getTouchDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return null;

    const touch1 = touches[0];
    const touch2 = touches[1];

    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2),
    );
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, id: string) => {
      e.preventDefault(); // Prevent default touch behavior

      const touch = e.touches[0];
      const now = Date.now();

      currentIdRef.current = id;
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: now,
      };

      // Handle pinch gesture initialization
      if (e.touches.length === 2) {
        initialDistanceRef.current = getTouchDistance(e.touches);
      } else {
        initialDistanceRef.current = null;
      }

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          triggerHaptic(100); // Long haptic for long press
          onLongPress(id);
        }, longPressDelay);
      }

      // Handle double tap detection
      if (onDoubleTap) {
        tapCountRef.current++;

        if (tapCountRef.current === 1) {
          setTimeout(() => {
            if (tapCountRef.current === 1) {
              // Single tap
              if (onTap) {
                triggerHaptic(25); // Short haptic for tap
                onTap(id);
              }
            }
            tapCountRef.current = 0;
          }, doubleTapDelay);
        } else if (tapCountRef.current === 2) {
          // Double tap
          triggerHaptic([25, 25]); // Double haptic for double tap
          onDoubleTap(id);
          tapCountRef.current = 0;
        }
      }

      lastTapTimeRef.current = now;
    },
    [
      onLongPress,
      onTap,
      onDoubleTap,
      longPressDelay,
      doubleTapDelay,
      triggerHaptic,
      getTouchDistance,
    ],
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent, id: string) => {
      // Cancel long press if finger moves too much
      if (longPressTimerRef.current && touchStartRef.current) {
        const touch = e.touches[0];
        const distance = getDistance(touchStartRef.current, {
          x: touch.clientX,
          y: touch.clientY,
          timestamp: Date.now(),
        });

        if (distance > 20) {
          // 20px threshold to cancel long press
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      // Handle pinch gesture
      if (e.touches.length === 2 && initialDistanceRef.current && onPinch) {
        const currentDistance = getTouchDistance(e.touches);
        if (currentDistance) {
          const scale = currentDistance / initialDistanceRef.current;
          onPinch(id, scale);
        }
      }
    },
    [getDistance, getTouchDistance, onPinch],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent, id: string) => {
      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // Reset pinch detection
      initialDistanceRef.current = null;

      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      touchEndRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      };

      // Calculate swipe distance and direction
      const deltaX = touchEndRef.current.x - touchStartRef.current.x;
      const deltaY = touchEndRef.current.y - touchStartRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const duration =
        touchEndRef.current.timestamp - touchStartRef.current.timestamp;

      // Only consider it a swipe if it's fast enough and far enough
      if (distance > swipeThreshold && duration < 500) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) {
            triggerHaptic(50); // Medium haptic for swipe
            onSwipeRight(id);
          } else if (deltaX < 0 && onSwipeLeft) {
            triggerHaptic([25, 25, 25]); // Triple tap pattern for swipe left
            onSwipeLeft(id);
          }
        } else {
          // Vertical swipe
          if (deltaY < 0 && onSwipeUp) {
            triggerHaptic(30);
            onSwipeUp(id);
          } else if (deltaY > 0 && onSwipeDown) {
            triggerHaptic(30);
            onSwipeDown(id);
          }
        }
      } else if (distance < 20 && duration < 200 && !onDoubleTap) {
        // Simple tap (only if not handling double tap)
        if (onTap) {
          triggerHaptic(25);
          onTap(id);
        }
      }

      // Reset touch points
      touchStartRef.current = null;
      touchEndRef.current = null;
    },
    [
      onSwipeRight,
      onSwipeLeft,
      onSwipeUp,
      onSwipeDown,
      onTap,
      swipeThreshold,
      triggerHaptic,
    ],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Return gesture binding function
  const bind = useCallback(
    (id: string) => ({
      onTouchStart: (e: React.TouchEvent) => handleTouchStart(e, id),
      onTouchMove: (e: React.TouchEvent) => handleTouchMove(e, id),
      onTouchEnd: (e: React.TouchEvent) => handleTouchEnd(e, id),
      // Prevent context menu on long press
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      // Add touch-action CSS property for better performance
      style: {
        touchAction: 'manipulation',
        userSelect: 'none' as const,
        WebkitUserSelect: 'none' as const,
        WebkitTouchCallout: 'none' as const,
        WebkitTapHighlightColor: 'transparent',
      },
    }),
    [handleTouchStart, handleTouchMove, handleTouchEnd],
  );

  return { bind };
};

// Hook for detecting platform capabilities
export const usePlatformDetection = () => {
  const isClient = typeof window !== 'undefined';

  const isMobile = isClient
    ? /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      )
    : false;
  const isTablet = isClient
    ? /iPad|Android.*(?!.*Mobile)/i.test(navigator.userAgent)
    : false;
  const touchCapable = isClient
    ? 'ontouchstart' in window || navigator.maxTouchPoints > 0
    : false;
  const isPortrait = isClient ? window.innerHeight > window.innerWidth : true;
  const isLandscape = !isPortrait;

  // Detect iOS Safari
  const isIOSSafari = isClient
    ? /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    : false;

  // Detect Android Chrome
  const isAndroidChrome = isClient
    ? /Android.*Chrome/i.test(navigator.userAgent)
    : false;

  // Detect PWA mode
  const isPWA = isClient
    ? window.matchMedia('(display-mode: standalone)').matches
    : false;

  // Detect dark mode preference
  const prefersDarkMode = isClient
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

  // Detect reduced motion preference
  const prefersReducedMotion = isClient
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  return {
    isMobile,
    isTablet,
    touchCapable,
    isPortrait,
    isLandscape,
    isIOSSafari,
    isAndroidChrome,
    isPWA,
    prefersDarkMode,
    prefersReducedMotion,
    screenWidth: isClient ? window.innerWidth : 0,
    screenHeight: isClient ? window.innerHeight : 0,
    pixelRatio: isClient ? window.devicePixelRatio : 1,
  };
};

// Advanced gesture detection for complex interactions
export const useAdvancedGestures = () => {
  const activeGesturesRef = useRef<Map<string, any>>(new Map());

  // Multi-touch gesture detection
  const detectMultiTouchGesture = useCallback((touches: TouchList) => {
    if (touches.length === 2) {
      return 'pinch';
    } else if (touches.length === 3) {
      return 'three-finger-tap';
    } else if (touches.length >= 4) {
      return 'multi-finger';
    }
    return null;
  }, []);

  // Velocity calculation for swipe gestures
  const calculateVelocity = useCallback(
    (start: TouchPoint, end: TouchPoint) => {
      const deltaTime = end.timestamp - start.timestamp;
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;

      return {
        x: deltaX / deltaTime,
        y: deltaY / deltaTime,
        magnitude: Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime,
      };
    },
    [],
  );

  return {
    detectMultiTouchGesture,
    calculateVelocity,
    activeGesturesRef,
  };
};

export default useTouchGestures;
