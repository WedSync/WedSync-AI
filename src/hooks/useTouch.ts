'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TouchPosition {
  x: number;
  y: number;
  timestamp: number;
}

interface SwipeConfig {
  threshold?: number;
  velocity?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface PinchConfig {
  minScale?: number;
  maxScale?: number;
  onPinch?: (scale: number) => void;
  onPinchEnd?: (scale: number) => void;
}

interface DragConfig {
  threshold?: number;
  onDragStart?: (position: TouchPosition) => void;
  onDragMove?: (position: TouchPosition) => void;
  onDragEnd?: (position: TouchPosition) => void;
}

// Security utility functions
const isValidNumber = (value: number): boolean => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

const clampNumber = (value: number, min: number, max: number): number => {
  if (!isValidNumber(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const sanitizePosition = (position: TouchPosition): TouchPosition => {
  return {
    x: clampNumber(position.x, -10000, 10000),
    y: clampNumber(position.y, -10000, 10000),
    timestamp: clampNumber(position.timestamp, 0, Date.now() + 1000),
  };
};

const isValidThreshold = (threshold: number): boolean => {
  return isValidNumber(threshold) && threshold > 0 && threshold < 1000;
};

const isValidVelocity = (velocity: number): boolean => {
  return isValidNumber(velocity) && velocity >= 0 && velocity <= 10;
};

const isValidScale = (scale: number): boolean => {
  return isValidNumber(scale) && scale >= 0.1 && scale <= 10;
};

// Rate limiting for security
const createRateLimiter = (maxCalls: number, timeWindow: number) => {
  const calls: number[] = [];

  return () => {
    const now = Date.now();
    const windowStart = now - timeWindow;

    // Remove old calls
    while (calls.length > 0 && calls[0] < windowStart) {
      calls.shift();
    }

    if (calls.length >= maxCalls) {
      return false; // Rate limit exceeded
    }

    calls.push(now);
    return true;
  };
};

// Main touch hook for all gesture types
export function useTouch() {
  const [isTouching, setIsTouching] = useState(false);
  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<TouchPosition | null>(null);
  const touchesRef = useRef<Touch[]>([]);
  const rateLimiter = useRef(createRateLimiter(100, 1000)); // 100 calls per second

  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!rateLimiter.current()) {
      console.warn('Touch events rate limited');
      return;
    }

    if (!e.touches || e.touches.length === 0) return;

    try {
      const touch = e.touches[0];
      const position: TouchPosition = sanitizePosition({
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      });

      setTouchStart(position);
      setTouchCurrent(position);
      setIsTouching(true);
      touchesRef.current = Array.from(e.touches).slice(0, 10); // Limit to 10 touches max
    } catch (error) {
      console.error('Touch start error:', error);
      setIsTouching(false);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!rateLimiter.current()) return;
    if (!e.touches || e.touches.length === 0) return;

    try {
      const touch = e.touches[0];
      const position = sanitizePosition({
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      });

      setTouchCurrent(position);
      touchesRef.current = Array.from(e.touches).slice(0, 10);
    } catch (error) {
      console.error('Touch move error:', error);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsTouching(false);
    touchesRef.current = [];
  }, []);

  return {
    isTouching,
    touchStart,
    touchCurrent,
    touches: touchesRef.current,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

// Swipe navigation hook
export function useSwipeNavigation(config: SwipeConfig = {}) {
  const router = useRouter();
  const {
    threshold = 50,
    velocity = 0.5,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = config;

  // Validate configuration
  const safeThreshold = isValidThreshold(threshold) ? threshold : 50;
  const safeVelocity = isValidVelocity(velocity) ? velocity : 0.5;

  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const startTime = useRef<number>(0);
  const rateLimiter = useRef(createRateLimiter(10, 1000)); // 10 swipes per second

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;

    try {
      const touch = e.touches[0];
      startX.current = clampNumber(touch.clientX, -10000, 10000);
      startY.current = clampNumber(touch.clientY, -10000, 10000);
      startTime.current = Date.now();
    } catch (error) {
      console.error('Swipe start error:', error);
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!rateLimiter.current()) return;
      if (!e.changedTouches || e.changedTouches.length === 0) return;

      try {
        const endX = clampNumber(e.changedTouches[0].clientX, -10000, 10000);
        const endY = clampNumber(e.changedTouches[0].clientY, -10000, 10000);
        const endTime = Date.now();

        const deltaX = endX - startX.current;
        const deltaY = endY - startY.current;
        const deltaTime = Math.max(endTime - startTime.current, 1); // Prevent division by zero

        const velocityX = Math.abs(deltaX / deltaTime);
        const velocityY = Math.abs(deltaY / deltaTime);

        // Security: Validate movement is reasonable
        if (Math.abs(deltaX) > 2000 || Math.abs(deltaY) > 2000) {
          console.warn('Suspicious swipe movement detected');
          return;
        }

        // Horizontal swipe
        if (
          Math.abs(deltaX) > Math.abs(deltaY) &&
          Math.abs(deltaX) > safeThreshold &&
          velocityX > safeVelocity
        ) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        }
        // Vertical swipe
        else if (Math.abs(deltaY) > safeThreshold && velocityY > safeVelocity) {
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      } catch (error) {
        console.error('Swipe end error:', error);
      }
    },
    [
      safeThreshold,
      safeVelocity,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
    ],
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

// Pinch to zoom hook
export function usePinchZoom(config: PinchConfig = {}) {
  const { minScale = 0.5, maxScale = 3, onPinch, onPinchEnd } = config;

  // Validate scale limits
  const safeMinScale = isValidScale(minScale) ? minScale : 0.5;
  const safeMaxScale = isValidScale(maxScale)
    ? Math.max(maxScale, safeMinScale + 0.1)
    : 3;

  const [scale, setScale] = useState(1);
  const initialDistance = useRef<number>(0);
  const currentScale = useRef<number>(1);
  const rateLimiter = useRef(createRateLimiter(60, 1000)); // 60 FPS

  const getDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;

    try {
      const [touch1, touch2] = Array.from(touches);
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Security: Validate reasonable distance
      return clampNumber(distance, 1, 2000);
    } catch (error) {
      console.error('Distance calculation error:', error);
      return 0;
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!e.touches || e.touches.length !== 2) return;

    try {
      initialDistance.current = getDistance(e.touches);
    } catch (error) {
      console.error('Pinch start error:', error);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!rateLimiter.current()) return;
      if (!e.touches || e.touches.length !== 2 || initialDistance.current <= 0)
        return;

      try {
        const currentDistance = getDistance(e.touches);
        if (currentDistance <= 0) return;

        const newScale =
          (currentDistance / initialDistance.current) * currentScale.current;
        const clampedScale = clampNumber(newScale, safeMinScale, safeMaxScale);

        setScale(clampedScale);
        onPinch?.(clampedScale);
      } catch (error) {
        console.error('Pinch move error:', error);
      }
    },
    [safeMinScale, safeMaxScale, onPinch],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!e.touches || e.touches.length < 2) {
        currentScale.current = scale;
        initialDistance.current = 0;
        onPinchEnd?.(scale);
      }
    },
    [scale, onPinchEnd],
  );

  return {
    scale,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

// Pull to refresh hook
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number>(0);
  const threshold = 80;
  const rateLimiter = useRef(createRateLimiter(30, 1000)); // 30 calls per second

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    if (window.scrollY !== 0) return; // Only work at top of page

    try {
      startY.current = clampNumber(e.touches[0].clientY, -10000, 10000);
    } catch (error) {
      console.error('Pull start error:', error);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!rateLimiter.current()) return;
      if (startY.current === 0 || !e.touches || e.touches.length === 0) return;
      if (isRefreshing) return;

      try {
        const currentY = clampNumber(e.touches[0].clientY, -10000, 10000);
        const diff = currentY - startY.current;

        if (diff > 0 && window.scrollY === 0) {
          e.preventDefault();
          const safePullDistance = clampNumber(diff, 0, threshold * 2); // Limit pull distance
          setPullDistance(safePullDistance);
          setIsPulling(safePullDistance > threshold);
        }
      } catch (error) {
        console.error('Pull move error:', error);
      }
    },
    [threshold, isRefreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing) return;

    try {
      if (isPulling && pullDistance > threshold) {
        setIsRefreshing(true);

        // Trigger haptic feedback if available (safe check)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(10);
          } catch (vibrateError) {
            console.warn('Vibrate API error:', vibrateError);
          }
        }

        await onRefresh();
        setIsRefreshing(false);
      }

      setIsPulling(false);
      setPullDistance(0);
      startY.current = 0;
    } catch (error) {
      console.error('Pull end error:', error);
      setIsRefreshing(false);
      setIsPulling(false);
      setPullDistance(0);
      startY.current = 0;
    }
  }, [isPulling, pullDistance, threshold, onRefresh, isRefreshing]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

// Drag and drop hook with touch support
export function useTouchDrag(config: DragConfig = {}) {
  const { threshold = 10, onDragStart, onDragMove, onDragEnd } = config;
  const safeThreshold = isValidThreshold(threshold) ? threshold : 10;

  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<TouchPosition | null>(null);
  const startPosition = useRef<TouchPosition | null>(null);
  const hasMoved = useRef(false);
  const rateLimiter = useRef(createRateLimiter(60, 1000)); // 60 FPS

  const handleStart = useCallback((x: number, y: number) => {
    try {
      const position = sanitizePosition({
        x,
        y,
        timestamp: Date.now(),
      });

      startPosition.current = position;
      setDragPosition(position);
      hasMoved.current = false;
    } catch (error) {
      console.error('Drag start error:', error);
    }
  }, []);

  const handleMove = useCallback(
    (x: number, y: number) => {
      if (!rateLimiter.current()) return;
      if (!startPosition.current) return;

      try {
        const position = sanitizePosition({
          x,
          y,
          timestamp: Date.now(),
        });

        const deltaX = Math.abs(x - startPosition.current.x);
        const deltaY = Math.abs(y - startPosition.current.y);

        // Security: Validate reasonable movement
        if (deltaX > 2000 || deltaY > 2000) {
          console.warn('Suspicious drag movement detected');
          return;
        }

        if (
          !hasMoved.current &&
          (deltaX > safeThreshold || deltaY > safeThreshold)
        ) {
          hasMoved.current = true;
          setIsDragging(true);
          onDragStart?.(startPosition.current);
        }

        if (hasMoved.current) {
          setDragPosition(position);
          onDragMove?.(position);
        }
      } catch (error) {
        console.error('Drag move error:', error);
      }
    },
    [safeThreshold, onDragStart, onDragMove],
  );

  const handleEnd = useCallback(
    (x: number, y: number) => {
      try {
        const position = sanitizePosition({
          x,
          y,
          timestamp: Date.now(),
        });

        if (isDragging && dragPosition) {
          onDragEnd?.(position);
        }

        setIsDragging(false);
        setDragPosition(null);
        startPosition.current = null;
        hasMoved.current = false;
      } catch (error) {
        console.error('Drag end error:', error);
        setIsDragging(false);
        setDragPosition(null);
        startPosition.current = null;
        hasMoved.current = false;
      }
    },
    [isDragging, dragPosition, onDragEnd],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    },
    [handleStart],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    [handleMove],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      handleEnd(touch.clientX, touch.clientY);
    },
    [handleEnd],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY);
    },
    [handleStart],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    },
    [handleMove],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      handleEnd(e.clientX, e.clientY);
    },
    [handleEnd],
  );

  return {
    isDragging,
    dragPosition,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
    },
  };
}

// Haptic feedback hook
export function useHaptic() {
  const rateLimiter = useRef(createRateLimiter(10, 1000)); // 10 haptic events per second

  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (!rateLimiter.current()) {
      console.warn('Haptic feedback rate limited');
      return;
    }

    try {
      if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

      // Validate pattern
      if (typeof pattern === 'number') {
        pattern = clampNumber(pattern, 1, 1000);
      } else if (Array.isArray(pattern)) {
        pattern = pattern.slice(0, 10).map((p) => clampNumber(p, 1, 1000)); // Limit array size and values
      } else {
        return;
      }

      navigator.vibrate(pattern);
    } catch (error) {
      console.error('Haptic error:', error);
    }
  }, []);

  const success = useCallback(() => vibrate([10, 50, 10]), [vibrate]);
  const warning = useCallback(() => vibrate([20, 100, 20]), [vibrate]);
  const error = useCallback(() => vibrate([50, 100, 50, 100, 50]), [vibrate]);
  const light = useCallback(() => vibrate(5), [vibrate]);
  const medium = useCallback(() => vibrate(15), [vibrate]);
  const heavy = useCallback(() => vibrate(30), [vibrate]);

  return {
    vibrate,
    success,
    warning,
    error,
    light,
    medium,
    heavy,
  };
}

// Long press hook
export function useLongPress(callback: () => void, delay = 500) {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  // Validate delay
  const safeDelay = clampNumber(delay, 100, 10000);

  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const start = useCallback(() => {
    try {
      timeoutRef.current = setTimeout(() => {
        setIsLongPressing(true);
        callbackRef.current();
      }, safeDelay);
    } catch (error) {
      console.error('Long press start error:', error);
    }
  }, [safeDelay]);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLongPressing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isLongPressing,
    handlers: {
      onTouchStart: start,
      onTouchEnd: stop,
      onMouseDown: start,
      onMouseUp: stop,
      onMouseLeave: stop,
    },
  };
}
