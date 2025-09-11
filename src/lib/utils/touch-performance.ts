'use client';

import { useState, useCallback } from 'react';

export interface TouchPerformanceMetrics {
  responseTime: number;
  timestamp: number;
  eventType: 'touchstart' | 'touchend' | 'touchmove' | 'click';
  targetElement: string;
  touchCount: number;
}

export interface TouchPerformanceReport {
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  totalMeasurements: number;
  target60fps: number;
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  measurements: TouchPerformanceMetrics[];
}

class TouchPerformanceMonitor {
  private measurements: TouchPerformanceMetrics[] = [];
  private touchStartTime: number | null = null;
  private isActive: boolean = false;
  private readonly TARGET_60FPS = 16.67; // ms per frame for 60fps
  private readonly MAX_MEASUREMENTS = 100;

  constructor() {
    this.setupEventListeners();
  }

  start(): void {
    this.isActive = true;
    this.measurements = [];
  }

  stop(): void {
    this.isActive = false;
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Touch event listeners with passive flag for performance
    const options = { passive: true, capture: true };

    document.addEventListener(
      'touchstart',
      (e) => this.handleTouchStart(e),
      options,
    );
    document.addEventListener(
      'touchend',
      (e) => this.handleTouchEnd(e),
      options,
    );
    document.addEventListener('click', (e) => this.handleClick(e), options);
  }

  private handleTouchStart(event: TouchEvent): void {
    if (!this.isActive) return;
    this.touchStartTime = performance.now();
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isActive || this.touchStartTime === null) return;

    const responseTime = performance.now() - this.touchStartTime;
    this.recordMeasurement({
      responseTime,
      timestamp: Date.now(),
      eventType: 'touchend',
      targetElement: this.getElementDescriptor(event.target as Element),
      touchCount: event.changedTouches.length,
    });

    this.touchStartTime = null;
  }

  private handleClick(event: MouseEvent): void {
    if (!this.isActive) return;

    const responseTime =
      performance.now() - (this.touchStartTime || performance.now());
    this.recordMeasurement({
      responseTime: Math.max(responseTime, 1), // Minimum 1ms
      timestamp: Date.now(),
      eventType: 'click',
      targetElement: this.getElementDescriptor(event.target as Element),
      touchCount: 1,
    });
  }

  private getElementDescriptor(element: Element | null): string {
    if (!element) return 'unknown';

    const tag = element.tagName.toLowerCase();
    const className = element.className
      ? `.${element.className.split(' ')[0]}`
      : '';
    const id = element.id ? `#${element.id}` : '';

    return `${tag}${id}${className}`;
  }

  private recordMeasurement(measurement: TouchPerformanceMetrics): void {
    this.measurements.push(measurement);

    // Keep only the last MAX_MEASUREMENTS
    if (this.measurements.length > this.MAX_MEASUREMENTS) {
      this.measurements = this.measurements.slice(-this.MAX_MEASUREMENTS);
    }

    // Log performance warnings in development
    if (
      process.env.NODE_ENV === 'development' &&
      measurement.responseTime > this.TARGET_60FPS
    ) {
      console.warn(
        `Touch performance warning: ${measurement.responseTime.toFixed(2)}ms response time on ${measurement.targetElement}`,
      );
    }
  }

  getPerformanceReport(): TouchPerformanceReport {
    if (this.measurements.length === 0) {
      return {
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        totalMeasurements: 0,
        target60fps: this.TARGET_60FPS,
        performanceGrade: 'F',
        measurements: [],
      };
    }

    const responseTimes = this.measurements.map((m) => m.responseTime);
    const averageResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);

    return {
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
      totalMeasurements: this.measurements.length,
      target60fps: this.TARGET_60FPS,
      performanceGrade: this.calculatePerformanceGrade(averageResponseTime),
      measurements: [...this.measurements],
    };
  }

  private calculatePerformanceGrade(
    averageTime: number,
  ): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (averageTime <= this.TARGET_60FPS) return 'A'; // Perfect 60fps
    if (averageTime <= 33.33) return 'B'; // 30fps acceptable
    if (averageTime <= 50) return 'C'; // 20fps marginal
    if (averageTime <= 100) return 'D'; // 10fps poor
    return 'F'; // Unacceptable
  }

  getRecentMetrics(count: number = 10): TouchPerformanceMetrics[] {
    return this.measurements.slice(-count);
  }

  clear(): void {
    this.measurements = [];
    this.touchStartTime = null;
  }
}

// Singleton instance
export const touchPerformanceMonitor = new TouchPerformanceMonitor();

// React hook for using touch performance monitoring
export function useTouchPerformance() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [report, setReport] = useState<TouchPerformanceReport | null>(null);

  const startMonitoring = useCallback(() => {
    touchPerformanceMonitor.start();
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    touchPerformanceMonitor.stop();
    setIsMonitoring(false);
    setReport(touchPerformanceMonitor.getPerformanceReport());
  }, []);

  const getReport = useCallback(() => {
    return touchPerformanceMonitor.getPerformanceReport();
  }, []);

  const clearMetrics = useCallback(() => {
    touchPerformanceMonitor.clear();
    setReport(null);
  }, []);

  return {
    isMonitoring,
    report,
    startMonitoring,
    stopMonitoring,
    getReport,
    clearMetrics,
  };
}

// Performance-optimized touch event handler factory
export function createOptimizedTouchHandler(
  handler: (event: TouchEvent | MouseEvent) => void,
  options: {
    throttle?: number;
    preventDefault?: boolean;
    stopPropagation?: boolean;
  } = {},
) {
  let lastCall = 0;
  const {
    throttle = 0,
    preventDefault = false,
    stopPropagation = false,
  } = options;

  return function optimizedHandler(event: TouchEvent | MouseEvent) {
    const now = performance.now();

    // Throttling for performance
    if (throttle > 0 && now - lastCall < throttle) {
      return;
    }

    lastCall = now;

    if (preventDefault) event.preventDefault();
    if (stopPropagation) event.stopPropagation();

    // Use requestAnimationFrame for smooth 60fps
    requestAnimationFrame(() => {
      handler(event);
    });
  };
}

// =====================================================
// WS-154 ROUND 2: ADVANCED TOUCH PERFORMANCE FOR 60FPS
// =====================================================

export interface SeatingTouchConfig {
  maxGuestItems: number; // 200+ guests optimization
  enableVirtualization: boolean;
  enableBatching: boolean;
  frameTimeBudget: number; // ms per frame (16.67 for 60fps)
  interactionThreshold: number; // ms for interaction feedback
  gestureRecognition: boolean;
  hapticFeedback: boolean;
}

export interface TouchGesture {
  type: 'tap' | 'long_press' | 'drag' | 'pinch' | 'swipe';
  startTime: number;
  duration: number;
  distance: number;
  velocity: number;
  target: string;
  confidence: number;
}

export interface FramePerformanceMetrics {
  averageFrameTime: number;
  droppedFrames: number;
  touchLatency: number;
  gestureAccuracy: number;
  memoryPressure: number;
  totalInteractions: number;
  above60fps: number;
}

class AdvancedTouchPerformanceManager {
  private config: SeatingTouchConfig;
  private metrics: FramePerformanceMetrics;
  private activeGestures: Map<number, TouchGesture> = new Map();
  private frameTimeHistory: number[] = [];
  private interactionQueue: Array<() => void> = [];
  private isProcessingQueue: boolean = false;
  private touchStartTimes: Map<number, number> = new Map();
  private virtualTouchElements: Set<string> = new Set();

  constructor() {
    this.config = {
      maxGuestItems: 200,
      enableVirtualization: true,
      enableBatching: true,
      frameTimeBudget: 16.67,
      interactionThreshold: 8, // 8ms for responsive feel
      gestureRecognition: true,
      hapticFeedback: true,
    };

    this.metrics = {
      averageFrameTime: 0,
      droppedFrames: 0,
      touchLatency: 0,
      gestureAccuracy: 0,
      memoryPressure: 0,
      totalInteractions: 0,
      above60fps: 0,
    };

    this.setupAdvancedTouchHandling();
    this.startFrameMonitoring();
  }

  /**
   * Setup advanced touch handling for seating arrangements
   */
  private setupAdvancedTouchHandling(): void {
    // Enhanced passive event listeners for better performance
    const touchOptions = {
      passive: false,
      capture: true,
    } as AddEventListenerOptions;

    // Advanced touch start with gesture detection
    document.addEventListener(
      'touchstart',
      (e) => {
        this.handleAdvancedTouchStart(e);
      },
      touchOptions,
    );

    // Optimized touch move with virtualization
    document.addEventListener(
      'touchmove',
      (e) => {
        this.handleAdvancedTouchMove(e);
      },
      touchOptions,
    );

    // Advanced touch end with gesture completion
    document.addEventListener(
      'touchend',
      (e) => {
        this.handleAdvancedTouchEnd(e);
      },
      touchOptions,
    );

    // Prevent context menu on long press for better UX
    document.addEventListener(
      'contextmenu',
      (e) => {
        if (this.isSeatingElement(e.target as Element)) {
          e.preventDefault();
        }
      },
      touchOptions,
    );
  }

  /**
   * Handle advanced touch start with 60fps optimization
   */
  private handleAdvancedTouchStart(event: TouchEvent): void {
    const startTime = performance.now();

    Array.from(event.changedTouches).forEach((touch, index) => {
      const touchId = touch.identifier;
      this.touchStartTimes.set(touchId, startTime);

      // Initialize gesture tracking
      const gesture: TouchGesture = {
        type: 'tap', // Will be determined as gesture progresses
        startTime,
        duration: 0,
        distance: 0,
        velocity: 0,
        target: this.getElementDescriptor(event.target as Element),
        confidence: 1.0,
      };

      this.activeGestures.set(touchId, gesture);
    });

    // Batch DOM updates for better performance
    if (this.config.enableBatching) {
      this.queueInteraction(() => {
        this.processTouchStartUpdates(event, startTime);
      });
    } else {
      this.processTouchStartUpdates(event, startTime);
    }
  }

  /**
   * Handle advanced touch move with virtualization
   */
  private handleAdvancedTouchMove(event: TouchEvent): void {
    // Prevent default to avoid scrolling conflicts on seating elements
    if (this.isSeatingElement(event.target as Element)) {
      event.preventDefault();
    }

    const moveTime = performance.now();

    Array.from(event.changedTouches).forEach((touch) => {
      const touchId = touch.identifier;
      const gesture = this.activeGestures.get(touchId);
      const startTime = this.touchStartTimes.get(touchId);

      if (!gesture || !startTime) return;

      // Update gesture metrics
      const duration = moveTime - startTime;
      const distance = this.calculateTouchDistance(touch, gesture);
      const velocity = distance / duration;

      // Determine gesture type based on movement
      if (distance > 10 && velocity > 0.5) {
        gesture.type = duration > 100 ? 'drag' : 'swipe';
      } else if (duration > 500 && distance < 10) {
        gesture.type = 'long_press';
      }

      gesture.duration = duration;
      gesture.distance = distance;
      gesture.velocity = velocity;
    });

    // Throttled processing for smooth 60fps
    this.queueInteraction(() => {
      this.processTouchMoveUpdates(event, moveTime);
    });
  }

  /**
   * Handle advanced touch end with gesture recognition
   */
  private handleAdvancedTouchEnd(event: TouchEvent): void {
    const endTime = performance.now();

    Array.from(event.changedTouches).forEach((touch) => {
      const touchId = touch.identifier;
      const gesture = this.activeGestures.get(touchId);
      const startTime = this.touchStartTimes.get(touchId);

      if (!gesture || !startTime) return;

      // Finalize gesture
      gesture.duration = endTime - startTime;

      // Calculate touch latency for metrics
      const touchLatency = endTime - startTime;
      this.updateLatencyMetrics(touchLatency);

      // Process gesture based on type
      this.processGestureCompletion(gesture, event);

      // Cleanup
      this.activeGestures.delete(touchId);
      this.touchStartTimes.delete(touchId);

      this.metrics.totalInteractions++;
    });
  }

  /**
   * Queue interaction for batched processing
   */
  private queueInteraction(interaction: () => void): void {
    this.interactionQueue.push(interaction);

    if (!this.isProcessingQueue) {
      this.processInteractionQueue();
    }
  }

  /**
   * Process interaction queue with frame time budget
   */
  private processInteractionQueue(): void {
    if (this.interactionQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;
    const frameStart = performance.now();

    // Process interactions within frame budget
    while (
      this.interactionQueue.length > 0 &&
      performance.now() - frameStart < this.config.frameTimeBudget * 0.8
    ) {
      const interaction = this.interactionQueue.shift();
      if (interaction) {
        try {
          interaction();
        } catch (error) {
          console.warn('[TouchPerformance] Interaction failed:', error);
        }
      }
    }

    // Continue processing in next frame
    if (this.interactionQueue.length > 0) {
      requestAnimationFrame(() => this.processInteractionQueue());
    } else {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Process touch start updates with virtualization
   */
  private processTouchStartUpdates(event: TouchEvent, startTime: number): void {
    const target = event.target as Element;

    // Add visual feedback for touch
    if (this.isSeatingElement(target)) {
      this.addTouchFeedback(target, 'touch-start');

      // Haptic feedback if enabled
      if (this.config.hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(10); // Short vibration
      }
    }

    // Virtual element handling for large lists
    if (this.config.enableVirtualization && this.isVirtualElement(target)) {
      this.handleVirtualElementTouch(target, 'start');
    }
  }

  /**
   * Process touch move updates with optimization
   */
  private processTouchMoveUpdates(event: TouchEvent, moveTime: number): void {
    const target = event.target as Element;

    // Only update visual feedback if target is a seating element
    if (this.isSeatingElement(target)) {
      this.updateTouchFeedback(target, 'touch-move');
    }

    // Handle drag operations for guest movement
    if (this.isDragOperation(event)) {
      this.handleGuestDragMove(event, moveTime);
    }
  }

  /**
   * Process gesture completion
   */
  private processGestureCompletion(
    gesture: TouchGesture,
    event: TouchEvent,
  ): void {
    const target = event.target as Element;

    // Remove touch feedback
    if (this.isSeatingElement(target)) {
      this.removeTouchFeedback(target);
    }

    // Handle different gesture types
    switch (gesture.type) {
      case 'tap':
        this.handleTapGesture(gesture, target);
        break;
      case 'long_press':
        this.handleLongPressGesture(gesture, target);
        break;
      case 'drag':
        this.handleDragGesture(gesture, target);
        break;
      case 'swipe':
        this.handleSwipeGesture(gesture, target);
        break;
    }

    // Update gesture accuracy metrics
    this.updateGestureMetrics(gesture);
  }

  /**
   * Start frame monitoring for 60fps tracking
   */
  private startFrameMonitoring(): void {
    let lastFrameTime = performance.now();

    const monitorFrame = (currentTime: number) => {
      const frameTime = currentTime - lastFrameTime;

      // Track frame timing
      this.frameTimeHistory.push(frameTime);
      if (this.frameTimeHistory.length > 60) {
        // Keep last 60 frames
        this.frameTimeHistory.shift();
      }

      // Calculate metrics
      const avgFrameTime =
        this.frameTimeHistory.reduce((a, b) => a + b, 0) /
        this.frameTimeHistory.length;
      this.metrics.averageFrameTime = avgFrameTime;

      // Track 60fps achievement
      if (frameTime <= 16.67) {
        this.metrics.above60fps++;
      } else {
        this.metrics.droppedFrames++;
      }

      // Log performance warnings in development
      if (process.env.NODE_ENV === 'development' && frameTime > 33.33) {
        console.warn(
          `[TouchPerformance] Slow frame: ${frameTime.toFixed(2)}ms`,
        );
      }

      lastFrameTime = currentTime;
      requestAnimationFrame(monitorFrame);
    };

    requestAnimationFrame(monitorFrame);
  }

  /**
   * Helper methods for touch optimization
   */
  private isSeatingElement(element: Element): boolean {
    return (
      element.closest('[data-seating-element]') !== null ||
      element.classList.contains('guest-card') ||
      element.classList.contains('table-card') ||
      element.classList.contains('seating-layout')
    );
  }

  private isVirtualElement(element: Element): boolean {
    return (
      element.hasAttribute('data-virtual-index') ||
      this.virtualTouchElements.has(element.id)
    );
  }

  private isDragOperation(event: TouchEvent): boolean {
    const gesture = this.activeGestures.get(event.changedTouches[0].identifier);
    return gesture?.type === 'drag' && gesture.distance > 20;
  }

  private addTouchFeedback(element: Element, type: string): void {
    element.classList.add(`${type}-active`);

    // Remove after animation
    setTimeout(() => {
      element.classList.remove(`${type}-active`);
    }, 150);
  }

  private updateTouchFeedback(element: Element, type: string): void {
    // Update visual state for active touch
    element.classList.toggle(`${type}-active`);
  }

  private removeTouchFeedback(element: Element): void {
    element.classList.remove('touch-start-active', 'touch-move-active');
  }

  private calculateTouchDistance(touch: Touch, gesture: TouchGesture): number {
    // This would calculate distance from start position
    // Simplified implementation
    return gesture.distance + 5; // Incremental distance
  }

  private updateLatencyMetrics(latency: number): void {
    this.metrics.touchLatency = (this.metrics.touchLatency + latency) / 2;
  }

  private updateGestureMetrics(gesture: TouchGesture): void {
    // Update gesture recognition accuracy
    const expectedType = this.getExpectedGestureType(gesture);
    const accuracy = gesture.type === expectedType ? 1 : 0;
    this.metrics.gestureAccuracy =
      (this.metrics.gestureAccuracy + accuracy) / 2;
  }

  private getExpectedGestureType(gesture: TouchGesture): TouchGesture['type'] {
    // Determine expected gesture based on context
    if (gesture.duration > 500 && gesture.distance < 10) return 'long_press';
    if (gesture.distance > 50 && gesture.velocity > 1) return 'swipe';
    if (gesture.distance > 10) return 'drag';
    return 'tap';
  }

  /**
   * Gesture handlers for seating interactions
   */
  private handleTapGesture(gesture: TouchGesture, target: Element): void {
    // Handle guest or table selection
    if (target.classList.contains('guest-card')) {
      this.selectGuest(target);
    } else if (target.classList.contains('table-card')) {
      this.selectTable(target);
    }
  }

  private handleLongPressGesture(gesture: TouchGesture, target: Element): void {
    // Handle context menu or detailed view
    if (target.classList.contains('guest-card')) {
      this.showGuestContextMenu(target);
    }
  }

  private handleDragGesture(gesture: TouchGesture, target: Element): void {
    // Handle guest movement between tables
    if (target.classList.contains('guest-card')) {
      this.handleGuestDrag(target, gesture);
    }
  }

  private handleSwipeGesture(gesture: TouchGesture, target: Element): void {
    // Handle quick actions or navigation
    if (gesture.velocity > 2) {
      this.handleQuickSwipe(target, gesture);
    }
  }

  private handleVirtualElementTouch(element: Element, phase: string): void {
    // Handle touches on virtualized elements
    const virtualIndex = element.getAttribute('data-virtual-index');
    if (virtualIndex) {
      this.virtualTouchElements.add(element.id);
    }
  }

  private handleGuestDragMove(event: TouchEvent, moveTime: number): void {
    // Optimized guest drag handling
    const touch = event.changedTouches[0];

    // Throttle updates for smooth 60fps
    if (moveTime % 16.67 < 8) {
      // Update every other frame maximum
      this.updateGuestPosition(touch.clientX, touch.clientY);
    }
  }

  // Placeholder methods for seating-specific interactions
  private selectGuest(element: Element): void {
    console.log('[TouchPerformance] Guest selected:', element.id);
  }

  private selectTable(element: Element): void {
    console.log('[TouchPerformance] Table selected:', element.id);
  }

  private showGuestContextMenu(element: Element): void {
    console.log('[TouchPerformance] Guest context menu:', element.id);
  }

  private handleGuestDrag(element: Element, gesture: TouchGesture): void {
    console.log('[TouchPerformance] Guest drag:', element.id, gesture.distance);
  }

  private handleQuickSwipe(element: Element, gesture: TouchGesture): void {
    console.log(
      '[TouchPerformance] Quick swipe:',
      element.id,
      gesture.velocity,
    );
  }

  private updateGuestPosition(x: number, y: number): void {
    // Update guest position during drag
  }

  private getElementDescriptor(element: Element | null): string {
    if (!element) return 'unknown';

    const tag = element.tagName.toLowerCase();
    const className = element.className
      ? `.${element.className.split(' ')[0]}`
      : '';
    const id = element.id ? `#${element.id}` : '';

    return `${tag}${id}${className}`;
  }

  /**
   * Public API
   */
  public getPerformanceMetrics(): FramePerformanceMetrics {
    return { ...this.metrics };
  }

  public updateConfig(config: Partial<SeatingTouchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public addVirtualElement(elementId: string): void {
    this.virtualTouchElements.add(elementId);
  }

  public removeVirtualElement(elementId: string): void {
    this.virtualTouchElements.delete(elementId);
  }

  public reset(): void {
    this.metrics = {
      averageFrameTime: 0,
      droppedFrames: 0,
      touchLatency: 0,
      gestureAccuracy: 0,
      memoryPressure: 0,
      totalInteractions: 0,
      above60fps: 0,
    };
    this.frameTimeHistory = [];
    this.activeGestures.clear();
    this.touchStartTimes.clear();
  }
}

// Export enhanced touch performance manager
export const advancedTouchPerformanceManager =
  new AdvancedTouchPerformanceManager();
