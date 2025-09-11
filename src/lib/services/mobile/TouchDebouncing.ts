/**
 * TouchDebouncing - Prevent accidental multiple touches and improve touch interactions
 *
 * Features:
 * - Touch event debouncing with configurable delays
 * - Multi-touch gesture conflict resolution
 * - Touch target size validation and adjustment
 * - Haptic feedback coordination
 * - Touch analytics and pattern detection
 * - Adaptive debouncing based on user behavior
 * - Ghost touch detection and prevention
 * - Touch pressure and palm rejection (where supported)
 */

interface TouchDebouncingConfig {
  enabled: boolean;
  tapDelay: number; // milliseconds between taps
  longPressDelay: number; // milliseconds to detect long press
  multiTouchThreshold: number; // max distance for multi-touch
  ghostTouchThreshold: number; // time threshold for ghost touches
  adaptiveDebouncing: boolean; // adjust delays based on user patterns
  hapticFeedback: boolean; // coordinate with haptic feedback
  minTouchTargetSize: number; // minimum touch target size in pixels
  palmRejectionEnabled: boolean; // reject palm touches
}

interface TouchEvent {
  id: string;
  type: 'tap' | 'long_press' | 'multi_touch' | 'swipe' | 'pinch';
  timestamp: number;
  position: { x: number; y: number };
  pressure?: number;
  size?: number;
  element: HTMLElement;
  prevented: boolean;
  debounced: boolean;
}

interface TouchPattern {
  userId: string;
  averageTapDelay: number;
  averagePressure: number;
  commonGestures: string[];
  errorRate: number; // ratio of prevented touches
  confidence: number; // pattern confidence score
}

interface TouchMetrics {
  totalTouches: number;
  preventedTouches: number;
  ghostTouches: number;
  averageDelay: number;
  hapticEvents: number;
  palmRejections: number;
}

export class TouchDebouncing {
  private config: TouchDebouncingConfig;
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private touchHistory: TouchEvent[] = [];
  private userPattern: TouchPattern | null = null;
  private metrics: TouchMetrics;
  private eventListeners: Map<HTMLElement, EventListenerOptions[]> = new Map();

  // Touch state tracking
  private activeTouches: Map<number, TouchEvent> = new Map();
  private lastTouchTime: number = 0;
  private consecutiveTouches: number = 0;
  private isMultiTouchActive: boolean = false;

  constructor(config?: Partial<TouchDebouncingConfig>) {
    this.config = {
      enabled: true,
      tapDelay: 300, // 300ms default tap debouncing
      longPressDelay: 800, // 800ms for long press detection
      multiTouchThreshold: 100, // 100px for multi-touch detection
      ghostTouchThreshold: 50, // 50ms ghost touch threshold
      adaptiveDebouncing: true,
      hapticFeedback: true,
      minTouchTargetSize: 44, // 44px minimum touch target (iOS HIG)
      palmRejectionEnabled: true,
      ...config,
    };

    this.metrics = {
      totalTouches: 0,
      preventedTouches: 0,
      ghostTouches: 0,
      averageDelay: this.config.tapDelay,
      hapticEvents: 0,
      palmRejections: 0,
    };

    this.initialize();
  }

  /**
   * Initialize touch debouncing system
   */
  private initialize(): void {
    if (!this.config.enabled) return;

    // Load user patterns
    this.loadUserPattern();

    // Set up global touch monitoring
    this.setupGlobalTouchMonitoring();

    // Start adaptive learning
    if (this.config.adaptiveDebouncing) {
      this.startAdaptiveLearning();
    }
  }

  /**
   * Add debouncing to an element
   */
  addTouchDebouncing(
    element: HTMLElement,
    options?: {
      customDelay?: number;
      allowLongPress?: boolean;
      preventMultiTouch?: boolean;
      requiredPressure?: number;
    },
  ): void {
    if (!this.config.enabled) return;

    const delay = options?.customDelay || this.getAdaptiveDelay();

    // Validate touch target size
    this.validateTouchTargetSize(element);

    // Create debounced handlers
    const debouncedHandlers = this.createDebouncedHandlers(
      element,
      delay,
      options,
    );

    // Add event listeners
    this.addEventListener(element, 'touchstart', debouncedHandlers.touchStart);
    this.addEventListener(element, 'touchend', debouncedHandlers.touchEnd);
    this.addEventListener(element, 'touchmove', debouncedHandlers.touchMove);
    this.addEventListener(
      element,
      'touchcancel',
      debouncedHandlers.touchCancel,
    );

    // Add mouse events as fallback for development/testing
    this.addEventListener(element, 'mousedown', debouncedHandlers.mouseDown);
    this.addEventListener(element, 'mouseup', debouncedHandlers.mouseUp);
    this.addEventListener(element, 'click', debouncedHandlers.click);
  }

  /**
   * Remove debouncing from an element
   */
  removeTouchDebouncing(element: HTMLElement): void {
    const listeners = this.eventListeners.get(element);
    if (!listeners) return;

    listeners.forEach(({ event, handler }) => {
      element.removeEventListener(event, handler);
    });

    this.eventListeners.delete(element);

    // Clear any active timers for this element
    const elementTimers = Array.from(this.activeTimers.keys()).filter((key) =>
      key.includes(element.tagName),
    );

    elementTimers.forEach((key) => {
      const timer = this.activeTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.activeTimers.delete(key);
      }
    });
  }

  /**
   * Create debounced event handlers
   */
  private createDebouncedHandlers(
    element: HTMLElement,
    delay: number,
    options?: any,
  ): Record<string, (event: Event) => void> {
    let touchStartTime: number = 0;
    let longPressTimer: NodeJS.Timeout | null = null;
    let isDebouncePending: boolean = false;

    return {
      touchStart: (event: TouchEvent) => {
        const touch = (event as any).touches[0];
        touchStartTime = Date.now();

        // Ghost touch detection
        if (this.isGhostTouch(touch)) {
          event.preventDefault();
          this.metrics.ghostTouches++;
          return;
        }

        // Palm rejection
        if (this.config.palmRejectionEnabled && this.isPalmTouch(touch)) {
          event.preventDefault();
          this.metrics.palmRejections++;
          return;
        }

        // Multi-touch handling
        if ((event as any).touches.length > 1) {
          this.isMultiTouchActive = true;
          if (options?.preventMultiTouch) {
            event.preventDefault();
            return;
          }
        }

        // Long press detection
        if (options?.allowLongPress) {
          longPressTimer = setTimeout(() => {
            this.handleLongPress(element, touch);
          }, this.config.longPressDelay);
        }

        this.recordTouch({
          id: `${Date.now()}-${Math.random()}`,
          type: 'tap',
          timestamp: touchStartTime,
          position: { x: touch.clientX, y: touch.clientY },
          pressure: (touch as any).force,
          size: (touch as any).radiusX,
          element,
          prevented: false,
          debounced: false,
        });
      },

      touchEnd: (event: TouchEvent) => {
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime;

        // Clear long press timer
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }

        this.isMultiTouchActive = false;

        // Check if this is a quick tap that should be debounced
        if (this.shouldDebounce(element, touchDuration)) {
          if (!isDebouncePending) {
            isDebouncePending = true;

            const timerId = `${element.tagName}-${Date.now()}`;
            const debounceTimer = setTimeout(() => {
              isDebouncePending = false;
              this.activeTimers.delete(timerId);

              // Trigger the actual event
              this.triggerDebouncedEvent(element, event);
            }, delay);

            this.activeTimers.set(timerId, debounceTimer);
          }

          // Prevent the immediate event
          event.preventDefault();
          event.stopPropagation();
          this.metrics.preventedTouches++;

          return;
        }

        this.metrics.totalTouches++;
      },

      touchMove: (event: TouchEvent) => {
        // Cancel long press on movement
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      },

      touchCancel: (event: TouchEvent) => {
        // Clear all timers on cancel
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        isDebouncePending = false;
      },

      mouseDown: (event: MouseEvent) => {
        // Fallback for development - simplified handling
        touchStartTime = Date.now();
      },

      mouseUp: (event: MouseEvent) => {
        const clickDuration = Date.now() - touchStartTime;

        if (this.shouldDebounce(element, clickDuration)) {
          if (!isDebouncePending) {
            isDebouncePending = true;

            setTimeout(() => {
              isDebouncePending = false;
              this.triggerDebouncedEvent(element, event);
            }, delay);
          }

          event.preventDefault();
          event.stopPropagation();
        }
      },

      click: (event: MouseEvent) => {
        // Additional click event handling for better compatibility
        if (isDebouncePending) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
    };
  }

  /**
   * Validate touch target size
   */
  private validateTouchTargetSize(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const minSize = this.config.minTouchTargetSize;

    if (rect.width < minSize || rect.height < minSize) {
      console.warn(
        `[TouchDebouncing] Touch target too small: ${rect.width}x${rect.height}px. ` +
          `Minimum recommended: ${minSize}x${minSize}px`,
        element,
      );

      // Auto-expand touch area if possible
      this.expandTouchArea(element, minSize);
    }
  }

  /**
   * Expand touch area for small targets
   */
  private expandTouchArea(element: HTMLElement, minSize: number): void {
    const rect = element.getBoundingClientRect();
    const expandX = Math.max(0, (minSize - rect.width) / 2);
    const expandY = Math.max(0, (minSize - rect.height) / 2);

    if (expandX > 0 || expandY > 0) {
      const style = element.style;
      style.position = style.position || 'relative';

      // Add pseudo-element for expanded touch area
      const pseudoStyle = `
        ::before {
          content: '';
          position: absolute;
          top: -${expandY}px;
          left: -${expandX}px;
          right: -${expandX}px;
          bottom: -${expandY}px;
          z-index: 1;
        }
      `;

      // Add style if not already present
      if (!element.dataset.touchExpanded) {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `[data-touch-expanded="${element.tagName.toLowerCase()}"]${pseudoStyle}`;
        document.head.appendChild(styleSheet);

        element.dataset.touchExpanded = element.tagName.toLowerCase();
      }
    }
  }

  /**
   * Check if touch should be debounced
   */
  private shouldDebounce(element: HTMLElement, duration: number): boolean {
    const currentTime = Date.now();

    // Don't debounce long presses
    if (duration > this.config.longPressDelay * 0.8) {
      return false;
    }

    // Check time since last touch
    const timeSinceLastTouch = currentTime - this.lastTouchTime;
    if (timeSinceLastTouch < this.getAdaptiveDelay()) {
      this.consecutiveTouches++;

      // Increased debouncing for rapid consecutive touches
      if (this.consecutiveTouches > 2) {
        return true;
      }
    } else {
      this.consecutiveTouches = 0;
    }

    this.lastTouchTime = currentTime;
    return false;
  }

  /**
   * Detect ghost touches
   */
  private isGhostTouch(touch: Touch): boolean {
    const currentTime = Date.now();

    // Check for touches that are too close in time to previous touches
    if (currentTime - this.lastTouchTime < this.config.ghostTouchThreshold) {
      return true;
    }

    // Check for touches with abnormal characteristics
    const force = (touch as any).force;
    const radiusX = (touch as any).radiusX;

    if (force && force < 0.1) {
      // Very light touch
      return true;
    }

    if (radiusX && radiusX > 20) {
      // Very large touch area
      return true;
    }

    return false;
  }

  /**
   * Detect palm touches
   */
  private isPalmTouch(touch: Touch): boolean {
    if (!this.config.palmRejectionEnabled) return false;

    const radiusX = (touch as any).radiusX || 0;
    const radiusY = (touch as any).radiusY || 0;
    const force = (touch as any).force || 0;

    // Large touch area with low pressure typically indicates palm
    if ((radiusX > 15 || radiusY > 15) && force < 0.3) {
      return true;
    }

    // Check for edge touches (common with palm rests)
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const edgeThreshold = 50; // pixels from edge

    if (
      touch.clientX < edgeThreshold ||
      touch.clientX > screenWidth - edgeThreshold ||
      touch.clientY < edgeThreshold ||
      touch.clientY > screenHeight - edgeThreshold
    ) {
      return true;
    }

    return false;
  }

  /**
   * Handle long press events
   */
  private handleLongPress(element: HTMLElement, touch: Touch): void {
    // Trigger haptic feedback for long press
    if (this.config.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate([50, 25, 50]);
      this.metrics.hapticEvents++;
    }

    // Dispatch custom long press event
    const longPressEvent = new CustomEvent('longpress', {
      detail: {
        originalTouch: touch,
        timestamp: Date.now(),
      },
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(longPressEvent);
  }

  /**
   * Trigger debounced event
   */
  private triggerDebouncedEvent(
    element: HTMLElement,
    originalEvent: Event,
  ): void {
    // Trigger haptic feedback
    if (this.config.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(25);
      this.metrics.hapticEvents++;
    }

    // Dispatch the original event type
    const eventType =
      originalEvent.type === 'touchend' ? 'tap' : originalEvent.type;

    const debouncedEvent = new CustomEvent(`debounced-${eventType}`, {
      detail: {
        originalEvent,
        timestamp: Date.now(),
        debounced: true,
      },
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(debouncedEvent);

    // Also trigger a regular click for compatibility
    if (eventType === 'tap') {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: (originalEvent as any).changedTouches?.[0]?.clientX || 0,
        clientY: (originalEvent as any).changedTouches?.[0]?.clientY || 0,
      });

      element.dispatchEvent(clickEvent);
    }
  }

  /**
   * Record touch event for pattern learning
   */
  private recordTouch(touchEvent: TouchEvent): void {
    this.touchHistory.push(touchEvent);

    // Keep only last 100 touches for analysis
    if (this.touchHistory.length > 100) {
      this.touchHistory.shift();
    }

    // Update user pattern
    if (this.config.adaptiveDebouncing) {
      this.updateUserPattern();
    }
  }

  /**
   * Get adaptive delay based on user patterns
   */
  private getAdaptiveDelay(): number {
    if (!this.config.adaptiveDebouncing || !this.userPattern) {
      return this.config.tapDelay;
    }

    // Adjust delay based on user's average tap speed
    const baseDelay = this.config.tapDelay;
    const userDelay = this.userPattern.averageTapDelay;
    const confidence = this.userPattern.confidence;

    // Blend user pattern with base delay based on confidence
    return Math.round(
      baseDelay * (1 - confidence * 0.5) + userDelay * confidence * 0.5,
    );
  }

  /**
   * Update user pattern based on touch history
   */
  private updateUserPattern(): void {
    if (this.touchHistory.length < 10) return;

    const recentTouches = this.touchHistory.slice(-50);

    // Calculate average tap delay
    const delays: number[] = [];
    for (let i = 1; i < recentTouches.length; i++) {
      const delay = recentTouches[i].timestamp - recentTouches[i - 1].timestamp;
      if (delay < 2000) {
        // Only consider delays under 2 seconds
        delays.push(delay);
      }
    }

    const averageDelay =
      delays.reduce((sum, delay) => sum + delay, 0) / delays.length;

    // Calculate error rate
    const preventedCount = recentTouches.filter(
      (touch) => touch.prevented,
    ).length;
    const errorRate = preventedCount / recentTouches.length;

    // Update pattern
    this.userPattern = {
      userId: 'anonymous', // Would be replaced with actual user ID
      averageTapDelay: averageDelay,
      averagePressure: 0.5, // Placeholder
      commonGestures: ['tap'], // Simplified
      errorRate,
      confidence: Math.min(0.8, recentTouches.length / 50), // Build confidence over time
    };

    // Save pattern
    this.saveUserPattern();
  }

  /**
   * Set up global touch monitoring
   */
  private setupGlobalTouchMonitoring(): void {
    // Monitor all touch events for pattern learning
    document.addEventListener(
      'touchstart',
      (event) => {
        this.metrics.totalTouches++;
      },
      { passive: true },
    );

    // Monitor for multi-touch scenarios
    document.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length > 1) {
          this.isMultiTouchActive = true;
        }
      },
      { passive: true },
    );

    document.addEventListener(
      'touchend',
      (event) => {
        if (event.touches.length === 0) {
          this.isMultiTouchActive = false;
        }
      },
      { passive: true },
    );
  }

  /**
   * Start adaptive learning process
   */
  private startAdaptiveLearning(): void {
    // Periodic pattern updates
    setInterval(() => {
      this.updateUserPattern();
    }, 30000); // Update every 30 seconds

    // Save pattern periodically
    setInterval(() => {
      this.saveUserPattern();
    }, 60000); // Save every minute
  }

  /**
   * Load user pattern from storage
   */
  private loadUserPattern(): void {
    try {
      const stored = localStorage.getItem('touch-debouncing-pattern');
      if (stored) {
        this.userPattern = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[TouchDebouncing] Failed to load user pattern:', error);
    }
  }

  /**
   * Save user pattern to storage
   */
  private saveUserPattern(): void {
    if (!this.userPattern) return;

    try {
      localStorage.setItem(
        'touch-debouncing-pattern',
        JSON.stringify(this.userPattern),
      );
    } catch (error) {
      console.warn('[TouchDebouncing] Failed to save user pattern:', error);
    }
  }

  /**
   * Add event listener with tracking
   */
  private addEventListener(
    element: HTMLElement,
    event: string,
    handler: EventListener,
    options?: EventListenerOptions,
  ): void {
    element.addEventListener(event, handler, options);

    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, []);
    }

    this.eventListeners.get(element)!.push({ event, handler, options });
  }

  /**
   * Get touch metrics
   */
  getMetrics(): TouchMetrics {
    return { ...this.metrics };
  }

  /**
   * Get user pattern
   */
  getUserPattern(): TouchPattern | null {
    return this.userPattern ? { ...this.userPattern } : null;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalTouches: 0,
      preventedTouches: 0,
      ghostTouches: 0,
      averageDelay: this.config.tapDelay,
      hapticEvents: 0,
      palmRejections: 0,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TouchDebouncingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (!newConfig.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Enable touch debouncing
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable touch debouncing
   */
  disable(): void {
    this.config.enabled = false;

    // Clear all active timers
    this.activeTimers.forEach((timer) => clearTimeout(timer));
    this.activeTimers.clear();
  }

  /**
   * Destroy touch debouncing instance
   */
  destroy(): void {
    // Remove all event listeners
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
    });

    this.eventListeners.clear();

    // Clear all timers
    this.activeTimers.forEach((timer) => clearTimeout(timer));
    this.activeTimers.clear();

    // Clear data
    this.touchHistory = [];
    this.activeTouches.clear();
    this.userPattern = null;
  }
}
