/**
 * WS-162/163/164: Mobile Touch Gesture System
 * Comprehensive touch gesture system for consistent mobile interactions
 */

export interface GestureConfig {
  swipeThreshold: number; // Minimum distance for swipe recognition
  swipeTimeout: number; // Maximum time for swipe gesture
  tapTimeout: number; // Maximum time for tap gesture
  doubleTapDelay: number; // Maximum time between taps for double tap
  longPressDelay: number; // Minimum time for long press
  velocityThreshold: number; // Minimum velocity for swipe
  enableHapticFeedback: boolean;
}

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
  pressure?: number;
  identifier: number;
}

export interface SwipeGesture {
  type: 'swipe';
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  startPoint: TouchPoint;
  endPoint: TouchPoint;
  duration: number;
}

export interface TapGesture {
  type: 'tap' | 'double-tap';
  point: TouchPoint;
  tapCount: number;
}

export interface LongPressGesture {
  type: 'long-press';
  point: TouchPoint;
  duration: number;
}

export interface PinchGesture {
  type: 'pinch';
  scale: number;
  center: TouchPoint;
  startDistance: number;
  currentDistance: number;
}

export interface PanGesture {
  type: 'pan';
  delta: { x: number; y: number };
  velocity: { x: number; y: number };
  startPoint: TouchPoint;
  currentPoint: TouchPoint;
}

export type Gesture =
  | SwipeGesture
  | TapGesture
  | LongPressGesture
  | PinchGesture
  | PanGesture;

export interface GestureHandlers {
  onSwipe?: (gesture: SwipeGesture) => void;
  onSwipeLeft?: (gesture: SwipeGesture) => void;
  onSwipeRight?: (gesture: SwipeGesture) => void;
  onSwipeUp?: (gesture: SwipeGesture) => void;
  onSwipeDown?: (gesture: SwipeGesture) => void;
  onTap?: (gesture: TapGesture) => void;
  onDoubleTap?: (gesture: TapGesture) => void;
  onLongPress?: (gesture: LongPressGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onPinchStart?: (gesture: PinchGesture) => void;
  onPinchEnd?: (gesture: PinchGesture) => void;
  onPan?: (gesture: PanGesture) => void;
  onPanStart?: (gesture: PanGesture) => void;
  onPanEnd?: (gesture: PanGesture) => void;
}

export class MobileTouchGestureManager {
  private config: GestureConfig;
  private touchStartPoints: Map<number, TouchPoint> = new Map();
  private touchCurrentPoints: Map<number, TouchPoint> = new Map();
  private gestureState:
    | 'idle'
    | 'single-touch'
    | 'multi-touch'
    | 'gesture-active' = 'idle';
  private gestureTimers: Map<string, number> = new Map();
  private lastTapTime = 0;
  private tapCount = 0;
  private isLongPressActive = false;
  private isPinchActive = false;
  private isPanActive = false;

  constructor(config?: Partial<GestureConfig>) {
    this.config = {
      swipeThreshold: 50,
      swipeTimeout: 300,
      tapTimeout: 200,
      doubleTapDelay: 300,
      longPressDelay: 500,
      velocityThreshold: 0.3,
      enableHapticFeedback: true,
      ...config,
    };
  }

  // Initialize gesture recognition on an element
  initializeGestures(
    element: HTMLElement,
    handlers: GestureHandlers,
    config?: Partial<GestureConfig>,
  ): () => void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    const touchStartHandler = (e: TouchEvent) =>
      this.handleTouchStart(e, handlers);
    const touchMoveHandler = (e: TouchEvent) =>
      this.handleTouchMove(e, handlers);
    const touchEndHandler = (e: TouchEvent) => this.handleTouchEnd(e, handlers);
    const touchCancelHandler = (e: TouchEvent) =>
      this.handleTouchCancel(e, handlers);

    // Add event listeners with passive: false to allow preventDefault
    element.addEventListener('touchstart', touchStartHandler, {
      passive: false,
    });
    element.addEventListener('touchmove', touchMoveHandler, { passive: false });
    element.addEventListener('touchend', touchEndHandler, { passive: false });
    element.addEventListener('touchcancel', touchCancelHandler, {
      passive: false,
    });

    // Return cleanup function
    return () => {
      element.removeEventListener('touchstart', touchStartHandler);
      element.removeEventListener('touchmove', touchMoveHandler);
      element.removeEventListener('touchend', touchEndHandler);
      element.removeEventListener('touchcancel', touchCancelHandler);
      this.cleanup();
    };
  }

  // Handle touch start
  private handleTouchStart(event: TouchEvent, handlers: GestureHandlers): void {
    const touches = Array.from(event.touches);
    const timestamp = Date.now();

    // Store touch points
    for (const touch of touches) {
      const touchPoint: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp,
        pressure: touch.force,
        identifier: touch.identifier,
      };

      this.touchStartPoints.set(touch.identifier, touchPoint);
      this.touchCurrentPoints.set(touch.identifier, touchPoint);
    }

    // Update gesture state
    if (touches.length === 1) {
      this.gestureState = 'single-touch';
      this.startSingleTouchGestures(touches[0], handlers);
    } else if (touches.length === 2) {
      this.gestureState = 'multi-touch';
      this.startMultiTouchGestures(touches, handlers);
    } else {
      this.gestureState = 'multi-touch';
    }

    // Prevent scrolling during gestures
    if (touches.length > 1) {
      event.preventDefault();
    }
  }

  // Handle touch move
  private handleTouchMove(event: TouchEvent, handlers: GestureHandlers): void {
    const touches = Array.from(event.touches);
    const timestamp = Date.now();

    // Update current touch points
    for (const touch of touches) {
      const touchPoint: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp,
        pressure: touch.force,
        identifier: touch.identifier,
      };

      this.touchCurrentPoints.set(touch.identifier, touchPoint);
    }

    // Handle different gesture types
    if (this.gestureState === 'single-touch' && touches.length === 1) {
      this.handleSingleTouchMove(touches[0], handlers);
    } else if (this.gestureState === 'multi-touch' && touches.length === 2) {
      this.handleMultiTouchMove(touches, handlers);
    }

    // Cancel long press if touch moves too much
    if (this.isLongPressActive) {
      const startPoint = this.touchStartPoints.get(touches[0]?.identifier);
      const currentPoint = this.touchCurrentPoints.get(touches[0]?.identifier);

      if (startPoint && currentPoint) {
        const distance = this.calculateDistance(startPoint, currentPoint);
        if (distance > this.config.swipeThreshold / 3) {
          this.cancelLongPress();
        }
      }
    }
  }

  // Handle touch end
  private handleTouchEnd(event: TouchEvent, handlers: GestureHandlers): void {
    const touches = Array.from(event.touches);
    const changedTouches = Array.from(event.changedTouches);

    // Process ended touches
    for (const touch of changedTouches) {
      const startPoint = this.touchStartPoints.get(touch.identifier);
      const endPoint = this.touchCurrentPoints.get(touch.identifier);

      if (startPoint && endPoint) {
        this.processSingleTouchEnd(startPoint, endPoint, handlers);
      }

      // Clean up touch data
      this.touchStartPoints.delete(touch.identifier);
      this.touchCurrentPoints.delete(touch.identifier);
    }

    // Update gesture state
    if (touches.length === 0) {
      this.gestureState = 'idle';
      this.endAllGestures(handlers);
    } else if (touches.length === 1 && this.gestureState === 'multi-touch') {
      this.gestureState = 'single-touch';
      this.endMultiTouchGestures(handlers);
    }
  }

  // Handle touch cancel
  private handleTouchCancel(
    event: TouchEvent,
    handlers: GestureHandlers,
  ): void {
    this.handleTouchEnd(event, handlers);
  }

  // Start single touch gestures (tap, long press, swipe)
  private startSingleTouchGestures(
    touch: Touch,
    handlers: GestureHandlers,
  ): void {
    const touchPoint = this.touchStartPoints.get(touch.identifier);
    if (!touchPoint) return;

    // Start long press timer
    const longPressTimer = window.setTimeout(() => {
      if (this.gestureState === 'single-touch') {
        this.triggerLongPress(touchPoint, handlers);
      }
    }, this.config.longPressDelay);

    this.gestureTimers.set('long-press', longPressTimer);
    this.isLongPressActive = true;
  }

  // Start multi-touch gestures (pinch)
  private startMultiTouchGestures(
    touches: Touch[],
    handlers: GestureHandlers,
  ): void {
    if (touches.length === 2) {
      this.isPinchActive = true;

      const point1 = this.touchStartPoints.get(touches[0].identifier);
      const point2 = this.touchStartPoints.get(touches[1].identifier);

      if (point1 && point2) {
        const startDistance = this.calculateDistance(point1, point2);
        const center = this.calculateCenter(point1, point2);

        const pinchGesture: PinchGesture = {
          type: 'pinch',
          scale: 1,
          center,
          startDistance,
          currentDistance: startDistance,
        };

        handlers.onPinchStart?.(pinchGesture);
      }
    }
  }

  // Handle single touch move (pan)
  private handleSingleTouchMove(touch: Touch, handlers: GestureHandlers): void {
    const startPoint = this.touchStartPoints.get(touch.identifier);
    const currentPoint = this.touchCurrentPoints.get(touch.identifier);

    if (!startPoint || !currentPoint) return;

    if (!this.isPanActive) {
      const distance = this.calculateDistance(startPoint, currentPoint);

      // Start pan if moved beyond threshold
      if (distance > this.config.swipeThreshold / 4) {
        this.isPanActive = true;
        this.cancelLongPress();

        const panGesture: PanGesture = {
          type: 'pan',
          delta: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
          startPoint,
          currentPoint,
        };

        handlers.onPanStart?.(panGesture);
      }
    }

    if (this.isPanActive) {
      const delta = {
        x: currentPoint.x - startPoint.x,
        y: currentPoint.y - startPoint.y,
      };

      const timeDelta = currentPoint.timestamp - startPoint.timestamp;
      const velocity = {
        x: delta.x / timeDelta,
        y: delta.y / timeDelta,
      };

      const panGesture: PanGesture = {
        type: 'pan',
        delta,
        velocity,
        startPoint,
        currentPoint,
      };

      handlers.onPan?.(panGesture);
    }
  }

  // Handle multi-touch move (pinch)
  private handleMultiTouchMove(
    touches: Touch[],
    handlers: GestureHandlers,
  ): void {
    if (touches.length !== 2 || !this.isPinchActive) return;

    const current1 = this.touchCurrentPoints.get(touches[0].identifier);
    const current2 = this.touchCurrentPoints.get(touches[1].identifier);
    const start1 = this.touchStartPoints.get(touches[0].identifier);
    const start2 = this.touchStartPoints.get(touches[1].identifier);

    if (!current1 || !current2 || !start1 || !start2) return;

    const currentDistance = this.calculateDistance(current1, current2);
    const startDistance = this.calculateDistance(start1, start2);
    const scale = currentDistance / startDistance;
    const center = this.calculateCenter(current1, current2);

    const pinchGesture: PinchGesture = {
      type: 'pinch',
      scale,
      center,
      startDistance,
      currentDistance,
    };

    handlers.onPinch?.(pinchGesture);
  }

  // Process single touch end (tap, swipe)
  private processSingleTouchEnd(
    startPoint: TouchPoint,
    endPoint: TouchPoint,
    handlers: GestureHandlers,
  ): void {
    const duration = endPoint.timestamp - startPoint.timestamp;
    const distance = this.calculateDistance(startPoint, endPoint);

    // Cancel long press
    this.cancelLongPress();

    // Determine gesture type
    if (
      distance < this.config.swipeThreshold / 4 &&
      duration < this.config.tapTimeout
    ) {
      // Tap or double tap
      this.processTap(startPoint, handlers);
    } else if (
      distance >= this.config.swipeThreshold &&
      duration <= this.config.swipeTimeout
    ) {
      // Swipe
      this.processSwipe(startPoint, endPoint, duration, handlers);
    }

    // End pan if active
    if (this.isPanActive) {
      const delta = {
        x: endPoint.x - startPoint.x,
        y: endPoint.y - startPoint.y,
      };

      const velocity = {
        x: delta.x / duration,
        y: delta.y / duration,
      };

      const panGesture: PanGesture = {
        type: 'pan',
        delta,
        velocity,
        startPoint,
        currentPoint: endPoint,
      };

      handlers.onPanEnd?.(panGesture);
      this.isPanActive = false;
    }
  }

  // Process tap gesture
  private processTap(point: TouchPoint, handlers: GestureHandlers): void {
    const now = Date.now();

    if (now - this.lastTapTime <= this.config.doubleTapDelay) {
      // Double tap
      this.tapCount = 2;

      const doubleTapGesture: TapGesture = {
        type: 'double-tap',
        point,
        tapCount: 2,
      };

      handlers.onDoubleTap?.(doubleTapGesture);
      this.triggerHapticFeedback();

      // Reset tap state
      this.tapCount = 0;
      this.lastTapTime = 0;
    } else {
      // Single tap (wait for potential double tap)
      this.tapCount = 1;
      this.lastTapTime = now;

      setTimeout(() => {
        if (this.tapCount === 1) {
          const tapGesture: TapGesture = {
            type: 'tap',
            point,
            tapCount: 1,
          };

          handlers.onTap?.(tapGesture);
          this.triggerHapticFeedback();

          this.tapCount = 0;
          this.lastTapTime = 0;
        }
      }, this.config.doubleTapDelay);
    }
  }

  // Process swipe gesture
  private processSwipe(
    startPoint: TouchPoint,
    endPoint: TouchPoint,
    duration: number,
    handlers: GestureHandlers,
  ): void {
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    if (velocity < this.config.velocityThreshold) {
      return; // Too slow to be a swipe
    }

    // Determine direction
    let direction: SwipeGesture['direction'];
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    const swipeGesture: SwipeGesture = {
      type: 'swipe',
      direction,
      distance,
      velocity,
      startPoint,
      endPoint,
      duration,
    };

    // Call appropriate handlers
    handlers.onSwipe?.(swipeGesture);

    switch (direction) {
      case 'left':
        handlers.onSwipeLeft?.(swipeGesture);
        break;
      case 'right':
        handlers.onSwipeRight?.(swipeGesture);
        break;
      case 'up':
        handlers.onSwipeUp?.(swipeGesture);
        break;
      case 'down':
        handlers.onSwipeDown?.(swipeGesture);
        break;
    }

    this.triggerHapticFeedback();
  }

  // Trigger long press
  private triggerLongPress(point: TouchPoint, handlers: GestureHandlers): void {
    if (!this.isLongPressActive) return;

    const duration = Date.now() - point.timestamp;

    const longPressGesture: LongPressGesture = {
      type: 'long-press',
      point,
      duration,
    };

    handlers.onLongPress?.(longPressGesture);
    this.triggerHapticFeedback(200); // Stronger haptic for long press

    this.isLongPressActive = false;
  }

  // End all gestures
  private endAllGestures(handlers: GestureHandlers): void {
    this.cancelLongPress();

    if (this.isPinchActive) {
      this.endMultiTouchGestures(handlers);
    }

    this.isPanActive = false;
    this.gestureState = 'idle';
  }

  // End multi-touch gestures
  private endMultiTouchGestures(handlers: GestureHandlers): void {
    if (this.isPinchActive) {
      // Create final pinch gesture
      const touchIds = Array.from(this.touchCurrentPoints.keys());
      if (touchIds.length >= 2) {
        const current1 = this.touchCurrentPoints.get(touchIds[0]);
        const current2 = this.touchCurrentPoints.get(touchIds[1]);
        const start1 = this.touchStartPoints.get(touchIds[0]);
        const start2 = this.touchStartPoints.get(touchIds[1]);

        if (current1 && current2 && start1 && start2) {
          const currentDistance = this.calculateDistance(current1, current2);
          const startDistance = this.calculateDistance(start1, start2);
          const scale = currentDistance / startDistance;
          const center = this.calculateCenter(current1, current2);

          const pinchGesture: PinchGesture = {
            type: 'pinch',
            scale,
            center,
            startDistance,
            currentDistance,
          };

          handlers.onPinchEnd?.(pinchGesture);
        }
      }

      this.isPinchActive = false;
    }
  }

  // Cancel long press
  private cancelLongPress(): void {
    const timer = this.gestureTimers.get('long-press');
    if (timer) {
      clearTimeout(timer);
      this.gestureTimers.delete('long-press');
    }
    this.isLongPressActive = false;
  }

  // Calculate distance between two points
  private calculateDistance(point1: TouchPoint, point2: TouchPoint): number {
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  // Calculate center point between two points
  private calculateCenter(point1: TouchPoint, point2: TouchPoint): TouchPoint {
    return {
      x: (point1.x + point2.x) / 2,
      y: (point1.y + point2.y) / 2,
      timestamp: Math.max(point1.timestamp, point2.timestamp),
      identifier: -1, // Special identifier for calculated points
    };
  }

  // Trigger haptic feedback
  private triggerHapticFeedback(intensity: number = 50): void {
    if (!this.config.enableHapticFeedback) return;

    try {
      if (navigator.vibrate) {
        navigator.vibrate(intensity);
      }
    } catch (error) {
      console.warn('[GestureManager] Haptic feedback failed:', error);
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): GestureConfig {
    return { ...this.config };
  }

  // Cleanup
  private cleanup(): void {
    // Clear all timers
    this.gestureTimers.forEach((timer) => clearTimeout(timer));
    this.gestureTimers.clear();

    // Reset state
    this.touchStartPoints.clear();
    this.touchCurrentPoints.clear();
    this.gestureState = 'idle';
    this.tapCount = 0;
    this.lastTapTime = 0;
    this.isLongPressActive = false;
    this.isPinchActive = false;
    this.isPanActive = false;
  }
}

// Singleton instance for global use
export const gestureManager = new MobileTouchGestureManager();

// Utility function to easily add gestures to an element
export function addMobileGestures(
  element: HTMLElement,
  handlers: GestureHandlers,
  config?: Partial<GestureConfig>,
): () => void {
  return gestureManager.initializeGestures(element, handlers, config);
}
