/**
 * WS-189: Cross-platform touch event coordination
 * Normalizes touch events ensuring consistent behavior across iOS, Android, and desktop browsers
 * with gesture recognition coordination and input method adaptation
 */

import { deviceDetector, type DeviceCapabilities } from './device-detector';

export interface NormalizedTouch {
  identifier: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
  radiusX?: number;
  radiusY?: number;
  rotationAngle?: number;
  force?: number;
  timestamp: number;
}

export interface NormalizedTouchEvent {
  type:
    | 'touchstart'
    | 'touchmove'
    | 'touchend'
    | 'touchcancel'
    | 'tap'
    | 'longpress'
    | 'swipe'
    | 'pinch'
    | 'rotate';
  touches: NormalizedTouch[];
  changedTouches: NormalizedTouch[];
  targetTouches: NormalizedTouch[];
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  timeStamp: number;
  preventDefault: () => void;
  stopPropagation: () => void;
  isNormalized: true;
  originalEvent?: TouchEvent | MouseEvent | PointerEvent;
  platform: string;
  inputMethod: 'touch' | 'mouse' | 'pen' | 'keyboard';
  gestureData?: any;
}

export interface GestureConfig {
  tap: {
    maxDuration: number;
    maxMovement: number;
  };
  longPress: {
    duration: number;
    maxMovement: number;
  };
  swipe: {
    minDistance: number;
    maxDuration: number;
    velocityThreshold: number;
  };
  pinch: {
    minScale: number;
    maxScale: number;
    threshold: number;
  };
  rotate: {
    threshold: number; // degrees
  };
}

export interface EventNormalizationOptions {
  enableGestureRecognition: boolean;
  enablePointerEvents: boolean;
  enableMouseFallback: boolean;
  enableKeyboardFallback: boolean;
  gestureConfig?: Partial<GestureConfig>;
  preventDefaults: boolean;
  passiveListeners: boolean;
}

/**
 * Cross-platform touch event normalizer with gesture recognition
 */
export class EventNormalizer {
  private deviceCapabilities: DeviceCapabilities | null = null;
  private gestureConfig: GestureConfig;
  private activeGestures = new Map<string, any>();
  private eventHistory: NormalizedTouchEvent[] = [];
  private maxHistorySize = 50;

  constructor() {
    this.gestureConfig = this.getDefaultGestureConfig();
    this.initializeDeviceCapabilities();
  }

  /**
   * Initialize device capabilities detection
   */
  private async initializeDeviceCapabilities(): Promise<void> {
    try {
      this.deviceCapabilities = await deviceDetector.getCapabilities();
      this.adaptGestureConfig();
    } catch (error) {
      console.warn(
        'Failed to initialize device capabilities for event normalizer:',
        error,
      );
    }
  }

  /**
   * Get default gesture configuration
   */
  private getDefaultGestureConfig(): GestureConfig {
    return {
      tap: {
        maxDuration: 200,
        maxMovement: 10,
      },
      longPress: {
        duration: 600,
        maxMovement: 10,
      },
      swipe: {
        minDistance: 30,
        maxDuration: 300,
        velocityThreshold: 0.3,
      },
      pinch: {
        minScale: 0.1,
        maxScale: 5.0,
        threshold: 0.05,
      },
      rotate: {
        threshold: 5, // degrees
      },
    };
  }

  /**
   * Adapt gesture configuration based on device capabilities
   */
  private adaptGestureConfig(): void {
    if (!this.deviceCapabilities) return;

    const { platform, touch, accessibility } = this.deviceCapabilities;

    // iOS optimizations
    if (platform.platform === 'ios') {
      this.gestureConfig.longPress.duration = 500; // iOS prefers shorter long press
      this.gestureConfig.tap.maxMovement = 8; // iOS has more precise touch
    }

    // Android optimizations
    if (platform.platform === 'android') {
      this.gestureConfig.longPress.duration = 600; // Android standard
      this.gestureConfig.swipe.minDistance = 35; // Slightly larger for Android
    }

    // Coarse touch adjustments
    if (touch.touchPrecision === 'coarse') {
      this.gestureConfig.tap.maxMovement *= 1.5;
      this.gestureConfig.swipe.minDistance *= 1.2;
      this.gestureConfig.longPress.maxMovement *= 1.5;
    }

    // Accessibility adjustments
    if (accessibility.prefersReducedMotion) {
      this.gestureConfig.swipe.velocityThreshold *= 0.5; // Slower swipes acceptable
    }

    if (accessibility.prefersLargeText) {
      this.gestureConfig.tap.maxMovement *= 1.3;
      this.gestureConfig.longPress.maxMovement *= 1.3;
    }
  }

  /**
   * Normalize touch event across platforms and input methods
   */
  normalizeEvent(
    event: TouchEvent | MouseEvent | PointerEvent,
    options: EventNormalizationOptions = {
      enableGestureRecognition: true,
      enablePointerEvents: true,
      enableMouseFallback: true,
      enableKeyboardFallback: false,
      preventDefaults: true,
      passiveListeners: false,
    },
  ): NormalizedTouchEvent {
    const normalized = this.createNormalizedEvent(event, options);

    // Add to event history
    this.addToHistory(normalized);

    // Perform gesture recognition
    if (options.enableGestureRecognition) {
      this.recognizeGestures(normalized);
    }

    return normalized;
  }

  /**
   * Create normalized event from platform-specific event
   */
  private createNormalizedEvent(
    event: TouchEvent | MouseEvent | PointerEvent,
    options: EventNormalizationOptions,
  ): NormalizedTouchEvent {
    const timestamp = event.timeStamp || Date.now();
    const inputMethod = this.detectInputMethod(event);
    const platform = this.deviceCapabilities?.platform.platform || 'unknown';

    let touches: NormalizedTouch[] = [];
    let changedTouches: NormalizedTouch[] = [];
    let targetTouches: NormalizedTouch[] = [];

    if (event instanceof TouchEvent) {
      touches = this.normalizeTouchList(event.touches, timestamp);
      changedTouches = this.normalizeTouchList(event.changedTouches, timestamp);
      targetTouches = this.normalizeTouchList(event.targetTouches, timestamp);
    } else if (
      event instanceof MouseEvent ||
      (typeof PointerEvent !== 'undefined' && event instanceof PointerEvent)
    ) {
      const normalizedTouch = this.normalizePointerToTouch(event, timestamp);

      if (event.type.includes('down') || event.type.includes('start')) {
        touches = [normalizedTouch];
        changedTouches = [normalizedTouch];
        targetTouches = [normalizedTouch];
      } else if (event.type.includes('move')) {
        touches = [normalizedTouch];
        changedTouches = [normalizedTouch];
        targetTouches = [normalizedTouch];
      } else if (event.type.includes('up') || event.type.includes('end')) {
        touches = [];
        changedTouches = [normalizedTouch];
        targetTouches = [];
      }
    }

    // Map event type
    let normalizedType: NormalizedTouchEvent['type'] = 'touchstart';
    if (event.type.includes('start') || event.type.includes('down')) {
      normalizedType = 'touchstart';
    } else if (event.type.includes('move')) {
      normalizedType = 'touchmove';
    } else if (event.type.includes('end') || event.type.includes('up')) {
      normalizedType = 'touchend';
    } else if (event.type.includes('cancel')) {
      normalizedType = 'touchcancel';
    }

    return {
      type: normalizedType,
      touches,
      changedTouches,
      targetTouches,
      target: event.target,
      currentTarget: event.currentTarget,
      timeStamp: timestamp,
      preventDefault: () => {
        if (options.preventDefaults) {
          event.preventDefault();
        }
      },
      stopPropagation: () => event.stopPropagation(),
      isNormalized: true,
      originalEvent: event,
      platform,
      inputMethod,
    };
  }

  /**
   * Normalize TouchList to array of NormalizedTouch
   */
  private normalizeTouchList(
    touchList: TouchList,
    timestamp: number,
  ): NormalizedTouch[] {
    const normalized: NormalizedTouch[] = [];

    for (let i = 0; i < touchList.length; i++) {
      const touch = touchList[i];
      normalized.push(this.normalizeTouch(touch, timestamp));
    }

    return normalized;
  }

  /**
   * Normalize individual Touch object
   */
  private normalizeTouch(touch: Touch, timestamp: number): NormalizedTouch {
    return {
      identifier: touch.identifier,
      clientX: touch.clientX,
      clientY: touch.clientY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      radiusX: touch.radiusX,
      radiusY: touch.radiusY,
      rotationAngle: touch.rotationAngle,
      force: touch.force,
      timestamp,
    };
  }

  /**
   * Convert pointer/mouse event to normalized touch
   */
  private normalizePointerToTouch(
    event: MouseEvent | PointerEvent,
    timestamp: number,
  ): NormalizedTouch {
    const touch: NormalizedTouch = {
      identifier: event instanceof PointerEvent ? event.pointerId : 0,
      clientX: event.clientX,
      clientY: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY,
      screenX: event.screenX,
      screenY: event.screenY,
      timestamp,
    };

    // Add PointerEvent specific properties
    if (event instanceof PointerEvent) {
      touch.force = event.pressure;
      touch.radiusX = event.width / 2;
      touch.radiusY = event.height / 2;
      touch.rotationAngle = event.twist;
    }

    return touch;
  }

  /**
   * Detect input method from event
   */
  private detectInputMethod(
    event: TouchEvent | MouseEvent | PointerEvent,
  ): 'touch' | 'mouse' | 'pen' | 'keyboard' {
    if (event instanceof TouchEvent) {
      return 'touch';
    }

    if (event instanceof PointerEvent) {
      switch (event.pointerType) {
        case 'touch':
          return 'touch';
        case 'pen':
          return 'pen';
        case 'mouse':
          return 'mouse';
        default:
          return 'touch';
      }
    }

    if (event instanceof MouseEvent) {
      // Heuristic: if device supports touch but mouse event, likely touch converted to mouse
      if (this.deviceCapabilities?.touch.supportsTouch) {
        return 'touch';
      }
      return 'mouse';
    }

    return 'touch';
  }

  /**
   * Add event to history for gesture recognition
   */
  private addToHistory(event: NormalizedTouchEvent): void {
    this.eventHistory.push(event);

    // Maintain history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Perform gesture recognition on normalized event
   */
  private recognizeGestures(event: NormalizedTouchEvent): void {
    try {
      this.recognizeTap(event);
      this.recognizeLongPress(event);
      this.recognizeSwipe(event);
      this.recognizePinch(event);
      this.recognizeRotate(event);
    } catch (error) {
      console.warn('Gesture recognition error:', error);
    }
  }

  /**
   * Recognize tap gesture
   */
  private recognizeTap(event: NormalizedTouchEvent): void {
    if (event.type === 'touchstart' && event.touches.length === 1) {
      const touchId = event.touches[0].identifier.toString();
      this.activeGestures.set(`tap_${touchId}`, {
        startTime: event.timeStamp,
        startTouch: event.touches[0],
        type: 'tap',
      });
    } else if (event.type === 'touchend' && event.changedTouches.length === 1) {
      const touchId = event.changedTouches[0].identifier.toString();
      const gestureKey = `tap_${touchId}`;
      const gesture = this.activeGestures.get(gestureKey);

      if (gesture && gesture.type === 'tap') {
        const duration = event.timeStamp - gesture.startTime;
        const endTouch = event.changedTouches[0];
        const distance = this.calculateDistance(gesture.startTouch, endTouch);

        if (
          duration <= this.gestureConfig.tap.maxDuration &&
          distance <= this.gestureConfig.tap.maxMovement
        ) {
          this.emitGestureEvent(event, 'tap', {
            duration,
            distance,
            touch: endTouch,
          });
        }

        this.activeGestures.delete(gestureKey);
      }
    }
  }

  /**
   * Recognize long press gesture
   */
  private recognizeLongPress(event: NormalizedTouchEvent): void {
    if (event.type === 'touchstart' && event.touches.length === 1) {
      const touchId = event.touches[0].identifier.toString();
      const gestureKey = `longpress_${touchId}`;

      const gesture = {
        startTime: event.timeStamp,
        startTouch: event.touches[0],
        type: 'longpress',
        timer: setTimeout(() => {
          const currentGesture = this.activeGestures.get(gestureKey);
          if (currentGesture) {
            this.emitGestureEvent(event, 'longpress', {
              duration: this.gestureConfig.longPress.duration,
              touch: currentGesture.startTouch,
            });
            this.activeGestures.delete(gestureKey);
          }
        }, this.gestureConfig.longPress.duration),
      };

      this.activeGestures.set(gestureKey, gesture);
    } else if (event.type === 'touchmove' || event.type === 'touchend') {
      // Cancel long press if touch moves too much or ends early
      event.changedTouches.forEach((touch) => {
        const touchId = touch.identifier.toString();
        const gestureKey = `longpress_${touchId}`;
        const gesture = this.activeGestures.get(gestureKey);

        if (gesture && gesture.type === 'longpress') {
          if (event.type === 'touchmove') {
            const distance = this.calculateDistance(gesture.startTouch, touch);
            if (distance > this.gestureConfig.longPress.maxMovement) {
              clearTimeout(gesture.timer);
              this.activeGestures.delete(gestureKey);
            }
          } else {
            clearTimeout(gesture.timer);
            this.activeGestures.delete(gestureKey);
          }
        }
      });
    }
  }

  /**
   * Recognize swipe gesture
   */
  private recognizeSwipe(event: NormalizedTouchEvent): void {
    if (event.type === 'touchstart' && event.touches.length === 1) {
      const touchId = event.touches[0].identifier.toString();
      this.activeGestures.set(`swipe_${touchId}`, {
        startTime: event.timeStamp,
        startTouch: event.touches[0],
        type: 'swipe',
      });
    } else if (event.type === 'touchend' && event.changedTouches.length === 1) {
      const touchId = event.changedTouches[0].identifier.toString();
      const gestureKey = `swipe_${touchId}`;
      const gesture = this.activeGestures.get(gestureKey);

      if (gesture && gesture.type === 'swipe') {
        const duration = event.timeStamp - gesture.startTime;
        const endTouch = event.changedTouches[0];
        const distance = this.calculateDistance(gesture.startTouch, endTouch);
        const velocity = distance / duration;

        if (
          duration <= this.gestureConfig.swipe.maxDuration &&
          distance >= this.gestureConfig.swipe.minDistance &&
          velocity >= this.gestureConfig.swipe.velocityThreshold
        ) {
          const direction = this.calculateDirection(
            gesture.startTouch,
            endTouch,
          );

          this.emitGestureEvent(event, 'swipe', {
            direction,
            distance,
            velocity,
            duration,
            startTouch: gesture.startTouch,
            endTouch,
          });
        }

        this.activeGestures.delete(gestureKey);
      }
    }
  }

  /**
   * Recognize pinch gesture
   */
  private recognizePinch(event: NormalizedTouchEvent): void {
    if (event.type === 'touchstart' && event.touches.length === 2) {
      const gestureKey = 'pinch';
      const distance = this.calculateDistance(
        event.touches[0],
        event.touches[1],
      );

      this.activeGestures.set(gestureKey, {
        startTime: event.timeStamp,
        startTouches: [...event.touches],
        startDistance: distance,
        type: 'pinch',
      });
    } else if (event.type === 'touchmove' && event.touches.length === 2) {
      const gestureKey = 'pinch';
      const gesture = this.activeGestures.get(gestureKey);

      if (gesture && gesture.type === 'pinch') {
        const currentDistance = this.calculateDistance(
          event.touches[0],
          event.touches[1],
        );
        const scale = currentDistance / gesture.startDistance;

        if (Math.abs(scale - 1) >= this.gestureConfig.pinch.threshold) {
          this.emitGestureEvent(event, 'pinch', {
            scale,
            startDistance: gesture.startDistance,
            currentDistance,
            center: this.calculateCenter(event.touches[0], event.touches[1]),
          });
        }
      }
    } else if (event.type === 'touchend' && this.activeGestures.has('pinch')) {
      this.activeGestures.delete('pinch');
    }
  }

  /**
   * Recognize rotation gesture
   */
  private recognizeRotate(event: NormalizedTouchEvent): void {
    if (event.type === 'touchstart' && event.touches.length === 2) {
      const gestureKey = 'rotate';
      const angle = this.calculateAngle(event.touches[0], event.touches[1]);

      this.activeGestures.set(gestureKey, {
        startTime: event.timeStamp,
        startTouches: [...event.touches],
        startAngle: angle,
        type: 'rotate',
      });
    } else if (event.type === 'touchmove' && event.touches.length === 2) {
      const gestureKey = 'rotate';
      const gesture = this.activeGestures.get(gestureKey);

      if (gesture && gesture.type === 'rotate') {
        const currentAngle = this.calculateAngle(
          event.touches[0],
          event.touches[1],
        );
        const rotation = currentAngle - gesture.startAngle;

        if (Math.abs(rotation) >= this.gestureConfig.rotate.threshold) {
          this.emitGestureEvent(event, 'rotate', {
            rotation,
            startAngle: gesture.startAngle,
            currentAngle,
            center: this.calculateCenter(event.touches[0], event.touches[1]),
          });
        }
      }
    } else if (event.type === 'touchend' && this.activeGestures.has('rotate')) {
      this.activeGestures.delete('rotate');
    }
  }

  /**
   * Calculate distance between two touches
   */
  private calculateDistance(
    touch1: NormalizedTouch,
    touch2: NormalizedTouch,
  ): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate direction of swipe
   */
  private calculateDirection(
    startTouch: NormalizedTouch,
    endTouch: NormalizedTouch,
  ): 'up' | 'down' | 'left' | 'right' {
    const dx = endTouch.clientX - startTouch.clientX;
    const dy = endTouch.clientY - startTouch.clientY;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  /**
   * Calculate center point between two touches
   */
  private calculateCenter(
    touch1: NormalizedTouch,
    touch2: NormalizedTouch,
  ): { x: number; y: number } {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }

  /**
   * Calculate angle between two touches
   */
  private calculateAngle(
    touch1: NormalizedTouch,
    touch2: NormalizedTouch,
  ): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  /**
   * Emit gesture event
   */
  private emitGestureEvent(
    originalEvent: NormalizedTouchEvent,
    gestureType: 'tap' | 'longpress' | 'swipe' | 'pinch' | 'rotate',
    gestureData: any,
  ): void {
    const gestureEvent: NormalizedTouchEvent = {
      ...originalEvent,
      type: gestureType,
      gestureData,
    };

    // Dispatch custom event
    if (originalEvent.target) {
      const customEvent = new CustomEvent(`wedding-${gestureType}`, {
        detail: gestureEvent,
        bubbles: true,
        cancelable: true,
      });

      (originalEvent.target as Element).dispatchEvent(customEvent);
    }
  }

  /**
   * Create event listener with normalization
   */
  createNormalizedListener(
    callback: (event: NormalizedTouchEvent) => void,
    options: EventNormalizationOptions = {
      enableGestureRecognition: true,
      enablePointerEvents: true,
      enableMouseFallback: true,
      enableKeyboardFallback: false,
      preventDefaults: false,
      passiveListeners: true,
    },
  ) {
    return (event: TouchEvent | MouseEvent | PointerEvent) => {
      const normalizedEvent = this.normalizeEvent(event, options);
      callback(normalizedEvent);
    };
  }

  /**
   * Attach normalized event listeners to element
   */
  attachNormalizedListeners(
    element: Element,
    callbacks: {
      onTouchStart?: (event: NormalizedTouchEvent) => void;
      onTouchMove?: (event: NormalizedTouchEvent) => void;
      onTouchEnd?: (event: NormalizedTouchEvent) => void;
      onTap?: (event: NormalizedTouchEvent) => void;
      onLongPress?: (event: NormalizedTouchEvent) => void;
      onSwipe?: (event: NormalizedTouchEvent) => void;
      onPinch?: (event: NormalizedTouchEvent) => void;
      onRotate?: (event: NormalizedTouchEvent) => void;
    },
    options: EventNormalizationOptions = {
      enableGestureRecognition: true,
      enablePointerEvents: true,
      enableMouseFallback: true,
      enableKeyboardFallback: false,
      preventDefaults: false,
      passiveListeners: true,
    },
  ): () => void {
    const listeners: Array<{ event: string; listener: EventListener }> = [];
    const listenerOptions = { passive: options.passiveListeners };

    // Basic touch events
    if (callbacks.onTouchStart) {
      const listener = this.createNormalizedListener(
        callbacks.onTouchStart,
        options,
      );
      element.addEventListener('touchstart', listener, listenerOptions);
      listeners.push({ event: 'touchstart', listener });

      // Mouse/pointer fallback
      if (options.enableMouseFallback) {
        element.addEventListener('mousedown', listener, listenerOptions);
        listeners.push({ event: 'mousedown', listener });
      }
      if (options.enablePointerEvents) {
        element.addEventListener('pointerdown', listener, listenerOptions);
        listeners.push({ event: 'pointerdown', listener });
      }
    }

    if (callbacks.onTouchMove) {
      const listener = this.createNormalizedListener(
        callbacks.onTouchMove,
        options,
      );
      element.addEventListener('touchmove', listener, listenerOptions);
      listeners.push({ event: 'touchmove', listener });

      if (options.enableMouseFallback) {
        element.addEventListener('mousemove', listener, listenerOptions);
        listeners.push({ event: 'mousemove', listener });
      }
      if (options.enablePointerEvents) {
        element.addEventListener('pointermove', listener, listenerOptions);
        listeners.push({ event: 'pointermove', listener });
      }
    }

    if (callbacks.onTouchEnd) {
      const listener = this.createNormalizedListener(
        callbacks.onTouchEnd,
        options,
      );
      element.addEventListener('touchend', listener, listenerOptions);
      listeners.push({ event: 'touchend', listener });

      if (options.enableMouseFallback) {
        element.addEventListener('mouseup', listener, listenerOptions);
        listeners.push({ event: 'mouseup', listener });
      }
      if (options.enablePointerEvents) {
        element.addEventListener('pointerup', listener, listenerOptions);
        listeners.push({ event: 'pointerup', listener });
      }
    }

    // Gesture events
    const gestureCallbacks = [
      { callback: callbacks.onTap, event: 'wedding-tap' },
      { callback: callbacks.onLongPress, event: 'wedding-longpress' },
      { callback: callbacks.onSwipe, event: 'wedding-swipe' },
      { callback: callbacks.onPinch, event: 'wedding-pinch' },
      { callback: callbacks.onRotate, event: 'wedding-rotate' },
    ];

    gestureCallbacks.forEach(({ callback, event }) => {
      if (callback) {
        const listener = (e: CustomEvent) => {
          callback(e.detail);
        };
        element.addEventListener(event, listener);
        listeners.push({ event, listener: listener as EventListener });
      }
    });

    // Return cleanup function
    return () => {
      listeners.forEach(({ event, listener }) => {
        element.removeEventListener(event, listener);
      });
    };
  }

  /**
   * Update gesture configuration
   */
  updateGestureConfig(config: Partial<GestureConfig>): void {
    this.gestureConfig = { ...this.gestureConfig, ...config };
  }

  /**
   * Get current gesture configuration
   */
  getGestureConfig(): GestureConfig {
    return { ...this.gestureConfig };
  }

  /**
   * Clear active gestures
   */
  clearActiveGestures(): void {
    // Clear any active timers
    this.activeGestures.forEach((gesture) => {
      if (gesture.timer) {
        clearTimeout(gesture.timer);
      }
    });

    this.activeGestures.clear();
  }

  /**
   * Get event history for debugging
   */
  getEventHistory(): NormalizedTouchEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }
}

// Export singleton instance
export const eventNormalizer = new EventNormalizer();
