'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface TouchOptimizationConfig {
  /** Enable haptic feedback when available */
  hapticFeedback?: boolean;
  /** Minimum touch target size in pixels */
  minTouchTarget?: number;
  /** Enable swipe gestures */
  swipeGestures?: boolean;
  /** Touch delay compensation in ms */
  touchDelay?: number;
  /** Enable pull-to-refresh */
  pullToRefresh?: boolean;
  /** Touch sensitivity (0-1) */
  sensitivity?: number;
}

interface TouchMetrics {
  /** Touch accuracy percentage */
  accuracy: number;
  /** Average touch duration */
  averageDuration: number;
  /** Touch frequency (touches per minute) */
  frequency: number;
  /** Device capabilities */
  capabilities: {
    haptics: boolean;
    multiTouch: boolean;
    pressure: boolean;
  };
}

interface SwipeGesture {
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
  velocity: number;
  duration: number;
}

const DEFAULT_CONFIG: TouchOptimizationConfig = {
  hapticFeedback: true,
  minTouchTarget: 48,
  swipeGestures: true,
  touchDelay: 0,
  pullToRefresh: false,
  sensitivity: 0.7,
};

export function useTouchOptimization(config: TouchOptimizationConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [metrics, setMetrics] = useState<TouchMetrics>({
    accuracy: 0,
    averageDuration: 0,
    frequency: 0,
    capabilities: {
      haptics: false,
      multiTouch: false,
      pressure: false,
    },
  });

  const [isTouch, setIsTouch] = useState(false);
  const [touchSupport, setTouchSupport] = useState(false);
  const touchDataRef = useRef<{
    touches: Array<{
      timestamp: number;
      duration: number;
      target: EventTarget | null;
    }>;
    startTime: number | null;
    startPos: { x: number; y: number } | null;
  }>({
    touches: [],
    startTime: null,
    startPos: null,
  });

  // Detect device capabilities
  useEffect(() => {
    const capabilities = {
      haptics: 'vibrate' in navigator,
      multiTouch:
        'ontouchstart' in window &&
        window.TouchEvent &&
        window.TouchEvent.prototype.hasOwnProperty('touches'),
      pressure: 'onpointerdown' in window && !!window.PointerEvent,
    };

    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setTouchSupport(hasTouch);
    setIsTouch(hasTouch);

    setMetrics((prev) => ({
      ...prev,
      capabilities,
    }));
  }, []);

  // Haptic feedback helper
  const triggerHaptic = useCallback(
    (pattern: number | number[] = 50) => {
      if (
        finalConfig.hapticFeedback &&
        metrics.capabilities.haptics &&
        'vibrate' in navigator
      ) {
        navigator.vibrate(pattern);
      }
    },
    [finalConfig.hapticFeedback, metrics.capabilities.haptics],
  );

  // Track touch interactions
  const trackTouch = useCallback(
    (event: TouchEvent | PointerEvent, type: 'start' | 'end') => {
      const now = Date.now();

      if (type === 'start') {
        touchDataRef.current.startTime = now;
        if (event instanceof TouchEvent && event.touches.length > 0) {
          const touch = event.touches[0];
          touchDataRef.current.startPos = {
            x: touch.clientX,
            y: touch.clientY,
          };
        } else if (event instanceof PointerEvent) {
          touchDataRef.current.startPos = {
            x: event.clientX,
            y: event.clientY,
          };
        }
      } else if (type === 'end' && touchDataRef.current.startTime) {
        const duration = now - touchDataRef.current.startTime;
        touchDataRef.current.touches.push({
          timestamp: now,
          duration,
          target: event.target,
        });

        // Keep only last 50 touches for metrics
        if (touchDataRef.current.touches.length > 50) {
          touchDataRef.current.touches =
            touchDataRef.current.touches.slice(-50);
        }

        // Update metrics
        const touches = touchDataRef.current.touches;
        const averageDuration =
          touches.reduce((sum, t) => sum + t.duration, 0) / touches.length;
        const timeSpan =
          touches.length > 1
            ? touches[touches.length - 1].timestamp - touches[0].timestamp
            : 1;
        const frequency = (touches.length / timeSpan) * 60000; // per minute

        setMetrics((prev) => ({
          ...prev,
          averageDuration,
          frequency: Math.min(frequency, 1000), // Cap at reasonable maximum
        }));

        touchDataRef.current.startTime = null;
        touchDataRef.current.startPos = null;
      }
    },
    [],
  );

  // Swipe gesture detection
  const detectSwipe = useCallback(
    (
      startEvent: TouchEvent | PointerEvent,
      endEvent: TouchEvent | PointerEvent,
    ): SwipeGesture | null => {
      if (!finalConfig.swipeGestures || !touchDataRef.current.startPos)
        return null;

      let endPos: { x: number; y: number };
      if (
        endEvent instanceof TouchEvent &&
        endEvent.changedTouches.length > 0
      ) {
        const touch = endEvent.changedTouches[0];
        endPos = { x: touch.clientX, y: touch.clientY };
      } else if (endEvent instanceof PointerEvent) {
        endPos = { x: endEvent.clientX, y: endEvent.clientY };
      } else {
        return null;
      }

      const deltaX = endPos.x - touchDataRef.current.startPos.x;
      const deltaY = endPos.y - touchDataRef.current.startPos.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const duration = touchDataRef.current.startTime
        ? Date.now() - touchDataRef.current.startTime
        : 0;

      // Minimum swipe distance
      if (distance < 50) return null;

      const velocity = duration > 0 ? distance / duration : 0;
      const angle = Math.atan2(deltaY, deltaX);

      // Determine direction based on angle
      let direction: SwipeGesture['direction'];
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      return {
        direction,
        distance,
        velocity,
        duration,
      };
    },
    [finalConfig.swipeGestures],
  );

  // Optimize touch targets
  const optimizeTouchTarget = useCallback(
    (element: HTMLElement) => {
      if (!finalConfig.minTouchTarget) return;

      const rect = element.getBoundingClientRect();
      if (
        rect.width < finalConfig.minTouchTarget ||
        rect.height < finalConfig.minTouchTarget
      ) {
        element.style.minWidth = `${finalConfig.minTouchTarget}px`;
        element.style.minHeight = `${finalConfig.minTouchTarget}px`;
        element.style.display = 'inline-flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
      }
    },
    [finalConfig.minTouchTarget],
  );

  // Touch event handlers
  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      trackTouch(event, 'start');
    },
    [trackTouch],
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      trackTouch(event, 'end');
    },
    [trackTouch],
  );

  // Pointer event handlers (for broader device support)
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        trackTouch(event, 'start');
      }
    },
    [trackTouch],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        trackTouch(event, 'end');
      }
    },
    [trackTouch],
  );

  // Enhanced touch event listener hook
  const useTouchEvents = useCallback(
    (
      element: HTMLElement | null,
      handlers: {
        onSwipe?: (gesture: SwipeGesture) => void;
        onTap?: (event: TouchEvent | PointerEvent) => void;
        onLongPress?: (event: TouchEvent | PointerEvent) => void;
      },
    ) => {
      useEffect(() => {
        if (!element) return;

        let longPressTimer: NodeJS.Timeout;
        let startEvent: TouchEvent | PointerEvent | null = null;

        const onStart = (event: TouchEvent | PointerEvent) => {
          startEvent = event;
          handleTouchStart(event as TouchEvent);

          if (handlers.onLongPress) {
            longPressTimer = setTimeout(() => {
              handlers.onLongPress!(event);
              triggerHaptic([50, 50, 50]);
            }, 500);
          }
        };

        const onEnd = (event: TouchEvent | PointerEvent) => {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
          }

          handleTouchEnd(event as TouchEvent);

          if (startEvent && handlers.onSwipe) {
            const swipe = detectSwipe(startEvent, event);
            if (swipe) {
              handlers.onSwipe(swipe);
              triggerHaptic([30, 30]);
            }
          }

          if (handlers.onTap && !startEvent) {
            handlers.onTap(event);
            triggerHaptic(30);
          }

          startEvent = null;
        };

        // Add touch events
        element.addEventListener('touchstart', onStart as EventListener, {
          passive: true,
        });
        element.addEventListener('touchend', onEnd as EventListener, {
          passive: true,
        });

        // Add pointer events for broader support
        element.addEventListener('pointerdown', onStart as EventListener);
        element.addEventListener('pointerup', onEnd as EventListener);

        // Optimize touch targets
        optimizeTouchTarget(element);

        return () => {
          if (longPressTimer) clearTimeout(longPressTimer);
          element.removeEventListener('touchstart', onStart as EventListener);
          element.removeEventListener('touchend', onEnd as EventListener);
          element.removeEventListener('pointerdown', onStart as EventListener);
          element.removeEventListener('pointerup', onEnd as EventListener);
        };
      }, [
        element,
        handlers,
        handleTouchStart,
        handleTouchEnd,
        detectSwipe,
        triggerHaptic,
        optimizeTouchTarget,
      ]);
    },
    [
      handleTouchStart,
      handleTouchEnd,
      detectSwipe,
      triggerHaptic,
      optimizeTouchTarget,
    ],
  );

  return {
    // State
    isTouch,
    touchSupport,
    metrics,
    config: finalConfig,

    // Helpers
    triggerHaptic,
    optimizeTouchTarget,
    detectSwipe,
    useTouchEvents,

    // Event handlers
    handleTouchStart,
    handleTouchEnd,
    handlePointerDown,
    handlePointerUp,
  };
}
