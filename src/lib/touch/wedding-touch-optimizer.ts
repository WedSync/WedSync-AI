/**
 * WS-173 Team D Round 2: Wedding-Specific Touch Optimization
 *
 * Optimizes touch interactions for wedding supplier workflows on mobile
 * Focuses on <50ms response times for critical coordination tasks
 */

import React from 'react';
import { mobilePerformanceMonitor } from '../utils/mobile-performance';

export interface TouchGestureConfig {
  name: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  responseTimeTarget: number; // milliseconds
  hapticFeedback: boolean;
  visualFeedback: boolean;
  preventDefault: boolean;
}

export interface WeddingTouchContext {
  workflowType:
    | 'photo-coordination'
    | 'guest-management'
    | 'venue-coordination'
    | 'emergency';
  urgencyLevel: 'emergency' | 'high' | 'normal' | 'low';
  deviceCapabilities: {
    hapticSupport: boolean;
    multitouch: boolean;
    pressureSupport: boolean;
  };
}

class WeddingTouchOptimizer {
  private touchStartTime: number = 0;
  private lastTouchEnd: number = 0;
  private activeGestures: Map<number, TouchGestureConfig> = new Map();
  private touchMetrics: Map<string, number[]> = new Map();
  private gestureHandlers: Map<
    string,
    (event: TouchEvent, context: WeddingTouchContext) => void
  > = new Map();

  // Wedding-specific gesture configurations
  private static WEDDING_GESTURES: Record<string, TouchGestureConfig> = {
    // CRITICAL - Emergency and immediate coordination
    'emergency-call': {
      name: 'emergency-call',
      priority: 'critical',
      responseTimeTarget: 25, // 25ms for emergency calls
      hapticFeedback: true,
      visualFeedback: true,
      preventDefault: true,
    },
    'photo-capture-confirm': {
      name: 'photo-capture-confirm',
      priority: 'critical',
      responseTimeTarget: 30, // 30ms for photo confirmation
      hapticFeedback: true,
      visualFeedback: true,
      preventDefault: true,
    },
    'guest-seating-assign': {
      name: 'guest-seating-assign',
      priority: 'critical',
      responseTimeTarget: 40, // 40ms for seating assignments
      hapticFeedback: true,
      visualFeedback: true,
      preventDefault: false,
    },

    // HIGH - Core coordination tasks
    'photo-group-navigate': {
      name: 'photo-group-navigate',
      priority: 'high',
      responseTimeTarget: 50, // 50ms for navigation
      hapticFeedback: false,
      visualFeedback: true,
      preventDefault: false,
    },
    'supplier-message-send': {
      name: 'supplier-message-send',
      priority: 'high',
      responseTimeTarget: 45,
      hapticFeedback: true,
      visualFeedback: true,
      preventDefault: true,
    },
    'task-status-update': {
      name: 'task-status-update',
      priority: 'high',
      responseTimeTarget: 50,
      hapticFeedback: true,
      visualFeedback: true,
      preventDefault: false,
    },

    // NORMAL - Standard operations
    'menu-navigation': {
      name: 'menu-navigation',
      priority: 'normal',
      responseTimeTarget: 100,
      hapticFeedback: false,
      visualFeedback: true,
      preventDefault: false,
    },
    'form-input': {
      name: 'form-input',
      priority: 'normal',
      responseTimeTarget: 80,
      hapticFeedback: false,
      visualFeedback: false,
      preventDefault: false,
    },

    // LOW - Secondary features
    'settings-access': {
      name: 'settings-access',
      priority: 'low',
      responseTimeTarget: 150,
      hapticFeedback: false,
      visualFeedback: true,
      preventDefault: false,
    },
  };

  constructor() {
    this.initializeTouchOptimization();
    this.setupWeddingGestures();
    this.enableHardwareAcceleration();
  }

  /**
   * Initialize core touch optimizations
   */
  private initializeTouchOptimization(): void {
    // Remove 300ms tap delay globally
    document.documentElement.style.touchAction = 'manipulation';

    // Enable hardware acceleration for touch targets
    const style = document.createElement('style');
    style.textContent = `
      .touch-optimized {
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
        will-change: transform;
      }
      
      .touch-active {
        transform: scale(0.95) translateZ(0);
        transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .critical-touch {
        transform: translateZ(0);
        backface-visibility: hidden;
        will-change: transform;
        outline: none;
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);

    // Setup global touch event listeners with passive optimization
    this.setupGlobalTouchHandlers();
  }

  /**
   * Setup global touch event handlers
   */
  private setupGlobalTouchHandlers(): void {
    // Fast touch start detection
    document.addEventListener(
      'touchstart',
      (e) => {
        this.touchStartTime = performance.now();
        this.handleTouchStart(e);
      },
      { passive: false, capture: true },
    );

    // Touch end with response time measurement
    document.addEventListener(
      'touchend',
      (e) => {
        const touchEndTime = performance.now();
        const responseTime = touchEndTime - this.touchStartTime;

        this.handleTouchEnd(e, responseTime);
        this.lastTouchEnd = touchEndTime;
      },
      { passive: false, capture: true },
    );

    // Touch move optimization
    document.addEventListener(
      'touchmove',
      (e) => {
        this.handleTouchMove(e);
      },
      { passive: true, capture: false },
    );

    // Touch cancel handling
    document.addEventListener(
      'touchcancel',
      (e) => {
        this.handleTouchCancel(e);
      },
      { passive: true, capture: false },
    );
  }

  /**
   * Setup wedding-specific gesture recognition
   */
  private setupWeddingGestures(): void {
    // Long press for emergency actions
    this.registerGesture('emergency-longpress', {
      onStart: this.handleEmergencyLongPress.bind(this),
      duration: 1000,
      tolerance: 10,
    });

    // Double tap for photo confirmation
    this.registerGesture('photo-double-tap', {
      onDetect: this.handlePhotoDoubleTap.bind(this),
      maxDelay: 300,
      tolerance: 20,
    });

    // Swipe gestures for navigation
    this.registerGesture('navigation-swipe', {
      onDetect: this.handleNavigationSwipe.bind(this),
      minDistance: 50,
      maxTime: 500,
    });

    // Pinch for guest seating conflicts
    this.registerGesture('seating-pinch', {
      onDetect: this.handleSeatingPinch.bind(this),
      minDistance: 30,
      maxTime: 1000,
    });
  }

  /**
   * Handle touch start with wedding context awareness
   */
  private handleTouchStart(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    const gestureType = this.identifyGestureType(target);
    const context = this.getWeddingContext(target);

    if (gestureType && WeddingTouchOptimizer.WEDDING_GESTURES[gestureType]) {
      const config = WeddingTouchOptimizer.WEDDING_GESTURES[gestureType];

      // Add visual feedback immediately for critical gestures
      if (config.visualFeedback && config.priority === 'critical') {
        this.addImmediateFeedback(target, config);
      }

      // Prevent default for critical gestures
      if (config.preventDefault) {
        event.preventDefault();
      }

      // Store active gesture
      if (event.touches.length > 0) {
        this.activeGestures.set(event.touches[0].identifier, config);
      }
    }
  }

  /**
   * Handle touch end with performance measurement
   */
  private handleTouchEnd(event: TouchEvent, responseTime: number): void {
    const target = event.target as HTMLElement;
    const gestureType = this.identifyGestureType(target);

    if (gestureType && WeddingTouchOptimizer.WEDDING_GESTURES[gestureType]) {
      const config = WeddingTouchOptimizer.WEDDING_GESTURES[gestureType];

      // Record performance metric
      this.recordTouchMetric(gestureType, responseTime);

      // Check if response time meets target
      if (responseTime <= config.responseTimeTarget) {
        // Success - provide feedback
        if (config.hapticFeedback) {
          this.triggerHapticFeedback('success');
        }

        if (config.visualFeedback) {
          this.showSuccessFeedback(target);
        }
      } else {
        // Slow response - log warning and provide feedback
        console.warn(
          `Slow touch response for ${gestureType}: ${responseTime}ms (target: ${config.responseTimeTarget}ms)`,
        );

        if (config.hapticFeedback) {
          this.triggerHapticFeedback('warning');
        }

        // Report performance issue
        this.reportPerformanceIssue(
          gestureType,
          responseTime,
          config.responseTimeTarget,
        );
      }

      // Execute gesture handler
      const context = this.getWeddingContext(target);
      const handler = this.gestureHandlers.get(gestureType);
      if (handler) {
        handler(event, context);
      }
    }
  }

  /**
   * Handle touch move for gesture recognition
   */
  private handleTouchMove(event: TouchEvent): void {
    // Optimize scroll performance for gesture areas
    const target = event.target as HTMLElement;
    if (target.classList.contains('gesture-area')) {
      // Apply momentum scrolling
      target.style.webkitOverflowScrolling = 'touch';
    }
  }

  /**
   * Handle touch cancel
   */
  private handleTouchCancel(event: TouchEvent): void {
    // Clean up active gestures
    for (const touch of Array.from(event.changedTouches)) {
      this.activeGestures.delete(touch.identifier);
    }
  }

  /**
   * Identify gesture type from target element
   */
  private identifyGestureType(element: HTMLElement): string | null {
    // Check for specific gesture data attributes
    if (element.dataset.gesture) {
      return element.dataset.gesture;
    }

    // Identify by class names
    if (element.classList.contains('emergency-button')) {
      return 'emergency-call';
    }
    if (element.classList.contains('photo-confirm')) {
      return 'photo-capture-confirm';
    }
    if (element.classList.contains('guest-assign')) {
      return 'guest-seating-assign';
    }
    if (element.classList.contains('photo-nav')) {
      return 'photo-group-navigate';
    }
    if (element.classList.contains('supplier-message')) {
      return 'supplier-message-send';
    }

    // Check parent elements
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (parent.dataset.gesture) {
        return parent.dataset.gesture;
      }
      parent = parent.parentElement;
    }

    return null;
  }

  /**
   * Get wedding context from element
   */
  private getWeddingContext(element: HTMLElement): WeddingTouchContext {
    const workflowType =
      (element.dataset.workflow as any) || 'venue-coordination';
    const urgencyLevel = (element.dataset.urgency as any) || 'normal';

    return {
      workflowType,
      urgencyLevel,
      deviceCapabilities: {
        hapticSupport: 'vibrate' in navigator,
        multitouch: 'ontouchstart' in window,
        pressureSupport: 'force' in TouchEvent.prototype,
      },
    };
  }

  /**
   * Add immediate visual feedback
   */
  private addImmediateFeedback(
    element: HTMLElement,
    config: TouchGestureConfig,
  ): void {
    element.classList.add('touch-active');
    element.style.transform = 'scale(0.95) translateZ(0)';

    // Hardware-accelerated animation
    requestAnimationFrame(() => {
      element.style.transition = 'transform 100ms cubic-bezier(0.4, 0, 0.2, 1)';
      element.style.transform = 'scale(1) translateZ(0)';

      setTimeout(() => {
        element.classList.remove('touch-active');
        element.style.transition = '';
        element.style.transform = '';
      }, 150);
    });
  }

  /**
   * Trigger haptic feedback
   */
  private triggerHapticFeedback(type: 'success' | 'warning' | 'error'): void {
    if ('vibrate' in navigator) {
      switch (type) {
        case 'success':
          navigator.vibrate(10); // Short success vibration
          break;
        case 'warning':
          navigator.vibrate([50, 50, 50]); // Warning pattern
          break;
        case 'error':
          navigator.vibrate([100, 50, 100]); // Error pattern
          break;
      }
    }
  }

  /**
   * Show success feedback
   */
  private showSuccessFeedback(element: HTMLElement): void {
    const feedback = document.createElement('div');
    feedback.className = 'touch-success-feedback';
    feedback.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #10b981;
      pointer-events: none;
      z-index: 10000;
      animation: successPulse 300ms ease-out;
    `;

    const rect = element.getBoundingClientRect();
    feedback.style.left = rect.left + rect.width / 2 + 'px';
    feedback.style.top = rect.top + rect.height / 2 + 'px';

    document.body.appendChild(feedback);

    setTimeout(() => {
      document.body.removeChild(feedback);
    }, 300);
  }

  /**
   * Record touch performance metric
   */
  private recordTouchMetric(gestureType: string, responseTime: number): void {
    if (!this.touchMetrics.has(gestureType)) {
      this.touchMetrics.set(gestureType, []);
    }

    const metrics = this.touchMetrics.get(gestureType)!;
    metrics.push(responseTime);

    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }

    // Report to performance monitor
    mobilePerformanceMonitor.measureTouch(gestureType, responseTime);
  }

  /**
   * Report performance issue
   */
  private reportPerformanceIssue(
    gestureType: string,
    actualTime: number,
    targetTime: number,
  ): void {
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(
        '/api/performance/touch-issues',
        JSON.stringify({
          gestureType,
          actualTime,
          targetTime,
          deviation: actualTime - targetTime,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
        }),
      );
    }
  }

  /**
   * Enable hardware acceleration for critical touch targets
   */
  private enableHardwareAcceleration(): void {
    // Add CSS for hardware acceleration
    const accelerationCSS = `
      .critical-touch, 
      .emergency-button, 
      .photo-confirm, 
      .guest-assign {
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
        will-change: transform;
      }
      
      @keyframes successPulse {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
      }
    `;

    const style = document.createElement('style');
    style.textContent = accelerationCSS;
    document.head.appendChild(style);
  }

  /**
   * Wedding-specific gesture handlers
   */
  private handleEmergencyLongPress(
    event: TouchEvent,
    context: WeddingTouchContext,
  ): void {
    // Emergency long press - immediately show emergency contacts
    this.triggerHapticFeedback('error');

    window.dispatchEvent(
      new CustomEvent('wedding-emergency', {
        detail: {
          type: 'emergency-longpress',
          context,
          timestamp: Date.now(),
        },
      }),
    );
  }

  private handlePhotoDoubleTap(
    event: TouchEvent,
    context: WeddingTouchContext,
  ): void {
    // Photo double tap - confirm photo group assignment
    this.triggerHapticFeedback('success');

    window.dispatchEvent(
      new CustomEvent('photo-confirm', {
        detail: {
          type: 'double-tap',
          target: event.target,
          context,
        },
      }),
    );
  }

  private handleNavigationSwipe(
    event: TouchEvent,
    context: WeddingTouchContext,
  ): void {
    // Navigation swipe - optimize for photo group navigation
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - (event.target as any).startX;
    const direction = deltaX > 0 ? 'right' : 'left';

    window.dispatchEvent(
      new CustomEvent('navigation-swipe', {
        detail: {
          direction,
          distance: Math.abs(deltaX),
          context,
        },
      }),
    );
  }

  private handleSeatingPinch(
    event: TouchEvent,
    context: WeddingTouchContext,
  ): void {
    // Seating pinch - handle guest seating conflicts
    if (event.touches.length === 2) {
      window.dispatchEvent(
        new CustomEvent('seating-conflict-zoom', {
          detail: {
            type: 'pinch',
            context,
          },
        }),
      );
    }
  }

  /**
   * Register custom gesture handler
   */
  registerGesture(name: string, config: any): void {
    // Implementation for custom gesture registration
    // This would include gesture recognition logic
  }

  /**
   * Optimize element for touch interactions
   */
  optimizeElement(element: HTMLElement, gestureType: string): void {
    const config = WeddingTouchOptimizer.WEDDING_GESTURES[gestureType];
    if (!config) return;

    // Add optimization classes
    element.classList.add('touch-optimized');
    if (config.priority === 'critical') {
      element.classList.add('critical-touch');
    }

    // Set data attributes for gesture recognition
    element.dataset.gesture = gestureType;

    // Optimize for hardware acceleration
    element.style.transform = 'translateZ(0)';
    element.style.backfaceVisibility = 'hidden';
    element.style.willChange = 'transform';

    // Remove default touch behaviors
    element.style.webkitTapHighlightColor = 'transparent';
    element.style.touchAction = 'manipulation';
  }

  /**
   * Get touch performance metrics
   */
  getTouchMetrics(): Record<
    string,
    { avg: number; min: number; max: number; count: number }
  > {
    const metrics: Record<string, any> = {};

    for (const [gestureType, times] of this.touchMetrics.entries()) {
      if (times.length > 0) {
        metrics[gestureType] = {
          avg: times.reduce((a, b) => a + b, 0) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          count: times.length,
          target:
            WeddingTouchOptimizer.WEDDING_GESTURES[gestureType]
              ?.responseTimeTarget || 100,
        };
      }
    }

    return metrics;
  }

  /**
   * Clear touch metrics
   */
  clearMetrics(): void {
    this.touchMetrics.clear();
  }
}

// Export singleton instance
export const weddingTouchOptimizer = new WeddingTouchOptimizer();

// React hook for touch optimization
export function useWeddingTouchOptimization(
  elementRef: React.RefObject<HTMLElement>,
  gestureType: string,
  context: WeddingTouchContext,
) {
  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Optimize element for touch
    weddingTouchOptimizer.optimizeElement(element, gestureType);

    // Add context data attributes
    element.dataset.workflow = context.workflowType;
    element.dataset.urgency = context.urgencyLevel;

    return () => {
      // Cleanup if needed
      element.classList.remove('touch-optimized', 'critical-touch');
    };
  }, [elementRef, gestureType, context]);

  return {
    touchMetrics: weddingTouchOptimizer.getTouchMetrics()[gestureType],
    optimizeElement: (el: HTMLElement) =>
      weddingTouchOptimizer.optimizeElement(el, gestureType),
  };
}
