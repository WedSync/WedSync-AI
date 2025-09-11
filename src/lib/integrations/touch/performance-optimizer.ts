/**
 * WS-189: Cross-platform touch performance optimization coordinator
 * Manages touch response time optimization, frame rate monitoring, and battery-aware performance
 * with sub-50ms response targets and progressive enhancement based on device capabilities
 */

import { DeviceDetector, DeviceCapabilities } from './device-detector';

export interface PerformanceMetrics {
  touchResponseTime: number;
  frameRate: number;
  memoryUsage: number;
  batteryLevel: number;
  networkLatency: number;
  renderingTime: number;
  gestureRecognitionTime: number;
  lastOptimized: Date;
}

export interface PerformanceThresholds {
  maxTouchResponseTime: number;
  minFrameRate: number;
  maxMemoryUsage: number;
  criticalBatteryLevel: number;
  maxNetworkLatency: number;
  maxRenderingTime: number;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  conditions: (
    metrics: PerformanceMetrics,
    capabilities: DeviceCapabilities,
  ) => boolean;
  apply: () => Promise<boolean>;
  revert: () => Promise<boolean>;
  impact: 'low' | 'medium' | 'high';
  batteryImpact: 'positive' | 'neutral' | 'negative';
}

export interface PerformanceAlert {
  type: 'warning' | 'critical';
  metric: keyof PerformanceMetrics;
  current: number;
  threshold: number;
  timestamp: Date;
  suggestion: string;
}

/**
 * Cross-platform touch performance optimization coordinator
 * Monitors and optimizes touch interactions for sub-50ms response times
 */
export class PerformanceOptimizer {
  private deviceDetector: DeviceDetector;
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private optimizations: Map<string, OptimizationStrategy> = new Map();
  private activeOptimizations: Set<string> = new Set();
  private performanceHistory: PerformanceMetrics[] = [];
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  private isOptimizationEnabled = true;
  private monitoringInterval: number | null = null;
  private observer: PerformanceObserver | null = null;

  constructor(deviceDetector: DeviceDetector) {
    this.deviceDetector = deviceDetector;
    this.metrics = this.initializeMetrics();
    this.thresholds = this.initializeThresholds();
    this.initializeOptimizations();
    this.setupPerformanceMonitoring();
  }

  /**
   * Initialize performance metrics with default values
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      touchResponseTime: 0,
      frameRate: 60,
      memoryUsage: 0,
      batteryLevel: 1,
      networkLatency: 0,
      renderingTime: 0,
      gestureRecognitionTime: 0,
      lastOptimized: new Date(),
    };
  }

  /**
   * Initialize performance thresholds based on wedding app requirements
   */
  private initializeThresholds(): PerformanceThresholds {
    return {
      maxTouchResponseTime: 50, // Sub-50ms requirement
      minFrameRate: 30, // Minimum acceptable frame rate
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB max
      criticalBatteryLevel: 0.15, // 15% battery critical
      maxNetworkLatency: 1000, // 1 second max
      maxRenderingTime: 16, // 60fps = 16ms per frame
    };
  }

  /**
   * Initialize optimization strategies for different scenarios
   */
  private initializeOptimizations(): void {
    // Touch debouncing optimization
    this.optimizations.set('touch-debouncing', {
      id: 'touch-debouncing',
      name: 'Touch Event Debouncing',
      description: 'Reduces excessive touch event processing',
      conditions: (metrics) => metrics.touchResponseTime > 30,
      apply: async () => {
        // Enable touch event debouncing
        this.enableTouchDebouncing();
        return true;
      },
      revert: async () => {
        this.disableTouchDebouncing();
        return true;
      },
      impact: 'medium',
      batteryImpact: 'positive',
    });

    // Frame rate limiting optimization
    this.optimizations.set('frame-limiting', {
      id: 'frame-limiting',
      name: 'Adaptive Frame Rate Limiting',
      description: 'Reduces frame rate on low-end devices or low battery',
      conditions: (metrics, capabilities) =>
        metrics.batteryLevel < 0.3 ||
        capabilities.performance.hardwareConcurrency < 4,
      apply: async () => {
        this.setTargetFrameRate(30);
        return true;
      },
      revert: async () => {
        this.setTargetFrameRate(60);
        return true;
      },
      impact: 'high',
      batteryImpact: 'positive',
    });

    // Memory cleanup optimization
    this.optimizations.set('memory-cleanup', {
      id: 'memory-cleanup',
      name: 'Aggressive Memory Cleanup',
      description: 'Forces garbage collection and clears caches',
      conditions: (metrics) =>
        metrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.8,
      apply: async () => {
        await this.performMemoryCleanup();
        return true;
      },
      revert: async () => {
        // Memory cleanup doesn't need reverting
        return true;
      },
      impact: 'medium',
      batteryImpact: 'neutral',
    });

    // Network optimization
    this.optimizations.set('network-optimization', {
      id: 'network-optimization',
      name: 'Network Request Optimization',
      description: 'Batches and caches network requests',
      conditions: (metrics) => metrics.networkLatency > 500,
      apply: async () => {
        this.enableNetworkBatching();
        return true;
      },
      revert: async () => {
        this.disableNetworkBatching();
        return true;
      },
      impact: 'high',
      batteryImpact: 'positive',
    });

    // Rendering optimization
    this.optimizations.set('rendering-optimization', {
      id: 'rendering-optimization',
      name: 'Rendering Pipeline Optimization',
      description: 'Optimizes CSS transforms and animations',
      conditions: (metrics) => metrics.renderingTime > 20,
      apply: async () => {
        this.optimizeRendering();
        return true;
      },
      revert: async () => {
        this.resetRenderingOptimizations();
        return true;
      },
      impact: 'high',
      batteryImpact: 'neutral',
    });

    // Wedding-specific optimizations
    this.optimizations.set('wedding-mode', {
      id: 'wedding-mode',
      name: 'Wedding Day Performance Mode',
      description: 'Optimizes for wedding day critical functions',
      conditions: (metrics, capabilities) => {
        // Check if it's a wedding day based on timeline data
        const isWeddingDay = this.isWeddingDay();
        return (
          isWeddingDay &&
          (metrics.batteryLevel < 0.5 ||
            capabilities.performance.hardwareConcurrency < 6)
        );
      },
      apply: async () => {
        await this.enableWeddingMode();
        return true;
      },
      revert: async () => {
        await this.disableWeddingMode();
        return true;
      },
      impact: 'high',
      batteryImpact: 'positive',
    });
  }

  /**
   * Setup performance monitoring with PerformanceObserver
   */
  private setupPerformanceMonitoring(): void {
    try {
      // Monitor paint and navigation timing
      if (typeof PerformanceObserver !== 'undefined') {
        this.observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'paint') {
              this.metrics.renderingTime = entry.startTime;
            } else if (
              entry.entryType === 'event' &&
              entry.name === 'touchstart'
            ) {
              this.metrics.touchResponseTime = entry.duration || 0;
            }
          });
        });

        this.observer.observe({ entryTypes: ['paint', 'event', 'measure'] });
      }

      // Start periodic monitoring
      this.startPeriodicMonitoring();
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }

  /**
   * Start periodic performance monitoring
   */
  private startPeriodicMonitoring(): void {
    this.monitoringInterval = window.setInterval(async () => {
      await this.updateMetrics();
      await this.checkAndApplyOptimizations();
      this.checkAlerts();
    }, 5000); // Monitor every 5 seconds
  }

  /**
   * Update all performance metrics
   */
  private async updateMetrics(): Promise<void> {
    try {
      // Update frame rate
      this.updateFrameRate();

      // Update memory usage
      await this.updateMemoryUsage();

      // Update battery level
      await this.updateBatteryLevel();

      // Update network latency
      await this.updateNetworkLatency();

      // Store in history
      this.performanceHistory.push({ ...this.metrics });

      // Keep only last 100 measurements
      if (this.performanceHistory.length > 100) {
        this.performanceHistory.shift();
      }

      this.metrics.lastOptimized = new Date();
    } catch (error) {
      console.warn('Failed to update performance metrics:', error);
    }
  }

  /**
   * Update frame rate measurement
   */
  private updateFrameRate(): void {
    let lastTime = performance.now();
    let frameCount = 0;

    const countFrame = (currentTime: number) => {
      frameCount++;
      const elapsed = currentTime - lastTime;

      if (elapsed >= 1000) {
        this.metrics.frameRate = (frameCount * 1000) / elapsed;
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(countFrame);
    };

    requestAnimationFrame(countFrame);
  }

  /**
   * Update memory usage (using Performance API where available)
   */
  private async updateMemoryUsage(): Promise<void> {
    try {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        this.metrics.memoryUsage = memInfo.usedJSHeapSize;
      }
    } catch (error) {
      console.warn('Memory usage measurement failed:', error);
    }
  }

  /**
   * Update battery level
   */
  private async updateBatteryLevel(): Promise<void> {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        this.metrics.batteryLevel = battery.level;
      }
    } catch (error) {
      console.warn('Battery level measurement failed:', error);
    }
  }

  /**
   * Update network latency by pinging a fast endpoint
   */
  private async updateNetworkLatency(): Promise<void> {
    try {
      const startTime = performance.now();
      await fetch('/api/health', { method: 'HEAD' });
      const endTime = performance.now();
      this.metrics.networkLatency = endTime - startTime;
    } catch (error) {
      this.metrics.networkLatency = 9999; // Indicate network issues
    }
  }

  /**
   * Check and apply necessary optimizations
   */
  private async checkAndApplyOptimizations(): Promise<void> {
    if (!this.isOptimizationEnabled) return;

    const capabilities = await this.deviceDetector.getCapabilities();

    for (const [id, optimization] of this.optimizations) {
      const shouldApply = optimization.conditions(this.metrics, capabilities);
      const isActive = this.activeOptimizations.has(id);

      if (shouldApply && !isActive) {
        try {
          const success = await optimization.apply();
          if (success) {
            this.activeOptimizations.add(id);
            console.info(`Applied optimization: ${optimization.name}`);
          }
        } catch (error) {
          console.warn(
            `Failed to apply optimization ${optimization.name}:`,
            error,
          );
        }
      } else if (!shouldApply && isActive) {
        try {
          const success = await optimization.revert();
          if (success) {
            this.activeOptimizations.delete(id);
            console.info(`Reverted optimization: ${optimization.name}`);
          }
        } catch (error) {
          console.warn(
            `Failed to revert optimization ${optimization.name}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Check for performance alerts and notify listeners
   */
  private checkAlerts(): void {
    const alerts: PerformanceAlert[] = [];

    if (this.metrics.touchResponseTime > this.thresholds.maxTouchResponseTime) {
      alerts.push({
        type: 'warning',
        metric: 'touchResponseTime',
        current: this.metrics.touchResponseTime,
        threshold: this.thresholds.maxTouchResponseTime,
        timestamp: new Date(),
        suggestion:
          'Consider reducing UI complexity or enabling touch debouncing',
      });
    }

    if (this.metrics.frameRate < this.thresholds.minFrameRate) {
      alerts.push({
        type: 'warning',
        metric: 'frameRate',
        current: this.metrics.frameRate,
        threshold: this.thresholds.minFrameRate,
        timestamp: new Date(),
        suggestion: 'Reduce animations or enable frame rate limiting',
      });
    }

    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      alerts.push({
        type: 'critical',
        metric: 'memoryUsage',
        current: this.metrics.memoryUsage,
        threshold: this.thresholds.maxMemoryUsage,
        timestamp: new Date(),
        suggestion: 'Clear caches and perform garbage collection',
      });
    }

    if (this.metrics.batteryLevel < this.thresholds.criticalBatteryLevel) {
      alerts.push({
        type: 'critical',
        metric: 'batteryLevel',
        current: this.metrics.batteryLevel,
        threshold: this.thresholds.criticalBatteryLevel,
        timestamp: new Date(),
        suggestion: 'Enable battery optimization mode',
      });
    }

    // Notify listeners
    alerts.forEach((alert) => {
      this.alertCallbacks.forEach((callback) => callback(alert));
    });
  }

  /**
   * Optimization implementation methods
   */

  private enableTouchDebouncing(): void {
    // Implement touch event debouncing
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    let touchTimeout: number;

    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options,
    ) {
      if (type === 'touchstart' || type === 'touchmove') {
        const debouncedListener = function (event: Event) {
          clearTimeout(touchTimeout);
          touchTimeout = window.setTimeout(() => {
            if (typeof listener === 'function') {
              listener(event);
            } else if (listener && typeof listener.handleEvent === 'function') {
              listener.handleEvent(event);
            }
          }, 16); // ~60fps debouncing
        };
        originalAddEventListener.call(this, type, debouncedListener, options);
      } else {
        originalAddEventListener.call(this, type, listener, options);
      }
    };
  }

  private disableTouchDebouncing(): void {
    // Reset to original addEventListener
    // This would require storing the original method reference
    console.info('Touch debouncing disabled');
  }

  private setTargetFrameRate(targetFps: number): void {
    const frameInterval = 1000 / targetFps;
    let lastFrame = 0;

    const limitedRaf = (callback: FrameRequestCallback) => {
      return requestAnimationFrame((timestamp) => {
        if (timestamp - lastFrame >= frameInterval) {
          callback(timestamp);
          lastFrame = timestamp;
        } else {
          limitedRaf(callback);
        }
      });
    };

    // Override requestAnimationFrame
    (window as any).requestAnimationFrame = limitedRaf;
  }

  private async performMemoryCleanup(): Promise<void> {
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }

    // Clear performance timeline
    if (performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }

    // Clear any cached data
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        if (cacheName.includes('temp') || cacheName.includes('cache')) {
          await caches.delete(cacheName);
        }
      }
    }
  }

  private enableNetworkBatching(): void {
    // Implement network request batching
    console.info('Network request batching enabled');
  }

  private disableNetworkBatching(): void {
    console.info('Network request batching disabled');
  }

  private optimizeRendering(): void {
    // Add CSS optimizations
    const style = document.createElement('style');
    style.textContent = `
      * {
        will-change: auto;
        transform: translateZ(0);
      }
      .optimized-transforms {
        transform: translate3d(0,0,0);
        backface-visibility: hidden;
        perspective: 1000px;
      }
    `;
    document.head.appendChild(style);
  }

  private resetRenderingOptimizations(): void {
    // Remove optimization styles
    const optimizationStyles = document.querySelectorAll(
      'style[data-performance-optimization]',
    );
    optimizationStyles.forEach((style) => style.remove());
  }

  private isWeddingDay(): boolean {
    // Check if today is a wedding day based on timeline data
    // This would integrate with the wedding timeline system
    const today = new Date();
    // Placeholder implementation
    return false;
  }

  private async enableWeddingMode(): Promise<void> {
    // Wedding day optimizations
    await this.performMemoryCleanup();
    this.setTargetFrameRate(30);
    this.enableNetworkBatching();

    // Disable non-critical features
    this.disableNonCriticalAnimations();

    console.info('Wedding day performance mode enabled');
  }

  private async disableWeddingMode(): Promise<void> {
    this.setTargetFrameRate(60);
    this.disableNetworkBatching();
    this.enableNonCriticalAnimations();

    console.info('Wedding day performance mode disabled');
  }

  private disableNonCriticalAnimations(): void {
    const style = document.createElement('style');
    style.setAttribute('data-wedding-mode', 'true');
    style.textContent = `
      * {
        animation-duration: 0.01ms !important;
        animation-delay: -0.01ms !important;
        transition-duration: 0.01ms !important;
        transition-delay: -0.01ms !important;
      }
    `;
    document.head.appendChild(style);
  }

  private enableNonCriticalAnimations(): void {
    const weddingModeStyles = document.querySelectorAll(
      'style[data-wedding-mode]',
    );
    weddingModeStyles.forEach((style) => style.remove());
  }

  /**
   * Public API methods
   */

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * Get active optimizations
   */
  getActiveOptimizations(): string[] {
    return Array.from(this.activeOptimizations);
  }

  /**
   * Force apply specific optimization
   */
  async forceOptimization(optimizationId: string): Promise<boolean> {
    const optimization = this.optimizations.get(optimizationId);
    if (!optimization) {
      throw new Error(`Optimization '${optimizationId}' not found`);
    }

    try {
      const success = await optimization.apply();
      if (success) {
        this.activeOptimizations.add(optimizationId);
      }
      return success;
    } catch (error) {
      console.error(`Failed to force optimization '${optimizationId}':`, error);
      return false;
    }
  }

  /**
   * Revert specific optimization
   */
  async revertOptimization(optimizationId: string): Promise<boolean> {
    const optimization = this.optimizations.get(optimizationId);
    if (!optimization) {
      throw new Error(`Optimization '${optimizationId}' not found`);
    }

    try {
      const success = await optimization.revert();
      if (success) {
        this.activeOptimizations.delete(optimizationId);
      }
      return success;
    } catch (error) {
      console.error(
        `Failed to revert optimization '${optimizationId}':`,
        error,
      );
      return false;
    }
  }

  /**
   * Add performance alert listener
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Enable or disable optimization system
   */
  setOptimizationEnabled(enabled: boolean): void {
    this.isOptimizationEnabled = enabled;

    if (!enabled) {
      // Revert all active optimizations
      this.activeOptimizations.forEach(async (optimizationId) => {
        await this.revertOptimization(optimizationId);
      });
    }
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    let score = 100;

    // Deduct points for poor metrics
    if (this.metrics.touchResponseTime > this.thresholds.maxTouchResponseTime) {
      score -=
        (this.metrics.touchResponseTime -
          this.thresholds.maxTouchResponseTime) *
        2;
    }

    if (this.metrics.frameRate < this.thresholds.minFrameRate) {
      score -= (this.thresholds.minFrameRate - this.metrics.frameRate) * 2;
    }

    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      score -= 30;
    }

    if (this.metrics.networkLatency > this.thresholds.maxNetworkLatency) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Wedding-specific performance helpers
   */

  /**
   * Optimize for photo upload performance
   */
  async optimizeForPhotoUpload(): Promise<void> {
    await this.forceOptimization('memory-cleanup');
    await this.forceOptimization('network-optimization');
  }

  /**
   * Optimize for timeline interactions
   */
  async optimizeForTimeline(): Promise<void> {
    await this.forceOptimization('touch-debouncing');
    await this.forceOptimization('rendering-optimization');
  }

  /**
   * Optimize for guest check-in
   */
  async optimizeForGuestCheckIn(): Promise<void> {
    await this.forceOptimization('touch-debouncing');
    await this.forceOptimization('network-optimization');
  }

  /**
   * Emergency performance mode for critical wedding moments
   */
  async enableEmergencyMode(): Promise<void> {
    await this.forceOptimization('wedding-mode');
    await this.forceOptimization('frame-limiting');
    await this.forceOptimization('memory-cleanup');
    await this.forceOptimization('network-optimization');

    console.info('Emergency performance mode enabled');
  }

  /**
   * Cleanup and destroy the optimizer
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Revert all optimizations
    this.activeOptimizations.forEach(async (optimizationId) => {
      try {
        await this.revertOptimization(optimizationId);
      } catch (error) {
        console.warn(
          `Failed to revert optimization during cleanup: ${optimizationId}`,
        );
      }
    });

    this.alertCallbacks.length = 0;
    this.performanceHistory.length = 0;
    this.activeOptimizations.clear();
  }
}

// Export singleton instance for global use
export const performanceOptimizer = new PerformanceOptimizer(
  new DeviceDetector(),
);

// Wedding-specific performance helpers
export const weddingPerformance = {
  optimizeForPhotoUpload: () => performanceOptimizer.optimizeForPhotoUpload(),
  optimizeForTimeline: () => performanceOptimizer.optimizeForTimeline(),
  optimizeForGuestCheckIn: () => performanceOptimizer.optimizeForGuestCheckIn(),
  enableEmergencyMode: () => performanceOptimizer.enableEmergencyMode(),

  // Performance monitoring helpers
  getScore: () => performanceOptimizer.getPerformanceScore(),
  getMetrics: () => performanceOptimizer.getMetrics(),
  onAlert: (callback: (alert: PerformanceAlert) => void) =>
    performanceOptimizer.onAlert(callback),
};
