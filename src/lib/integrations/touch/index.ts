/**
 * WS-189: Touch Optimization System - Main Export Index
 * Cross-platform touch integration services for wedding professional workflows
 *
 * This module provides comprehensive touch optimization including:
 * - Haptic feedback coordination across iOS/Android/Desktop
 * - Device capability detection with progressive enhancement
 * - Touch event normalization for consistent interactions
 * - WCAG 2.1 AA+ accessibility compliance
 * - Performance optimization with sub-50ms response targets
 */

// Core Touch Integration Services
export {
  HapticCoordinator,
  hapticCoordinator,
  weddingHaptics,
} from './haptic-coordinator';

export { DeviceDetector, deviceDetector } from './device-detector';

export { EventNormalizer, eventNormalizer } from './event-normalizer';

export {
  AccessibilityCoordinator,
  accessibilityCoordinator,
} from './accessibility-coordinator';

export {
  PerformanceOptimizer,
  performanceOptimizer,
  weddingPerformance,
} from './performance-optimizer';

// Type exports
export type {
  HapticPattern,
  HapticCapabilities,
  HapticFeedbackOptions,
} from './haptic-coordinator';
export type {
  DeviceCapabilities,
  TouchCapabilities,
  ScreenCapabilities,
  PerformanceCapabilities,
  AccessibilityCapabilities,
  PlatformCapabilities,
} from './device-detector';
export type {
  NormalizedTouchEvent,
  NormalizedTouch,
  EventNormalizationOptions,
  GestureConfig,
} from './event-normalizer';
export type {
  TouchAccessibilityOptions,
  AccessibilityPreferences,
  AccessibilityTouchEnhancements,
  AriaAnnouncement,
} from './accessibility-coordinator';
export type {
  PerformanceMetrics,
  PerformanceThresholds,
  OptimizationStrategy,
  PerformanceAlert,
} from './performance-optimizer';

// Combined Touch System Integration Class
export class TouchOptimizationSystem {
  private haptics: HapticCoordinator;
  private deviceDetector: DeviceDetector;
  private eventNormalizer: EventNormalizer;
  private accessibility: AccessibilityCoordinator;
  private performance: PerformanceOptimizer;
  private isInitialized = false;

  constructor() {
    this.haptics = hapticCoordinator;
    this.deviceDetector = deviceDetector;
    this.eventNormalizer = eventNormalizer;
    this.accessibility = accessibilityCoordinator;
    this.performance = performanceOptimizer;
  }

  /**
   * Initialize the complete touch optimization system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('TouchOptimizationSystem already initialized');
      return;
    }

    try {
      console.info('Initializing WS-189 Touch Optimization System...');

      // Initialize device capabilities first
      const capabilities = await this.deviceDetector.getCapabilities();
      console.info('Device capabilities detected:', {
        platform: capabilities.platform.platform,
        touch: capabilities.touch.supportsTouch,
        accessibility: capabilities.accessibility.prefersReducedMotion,
      });

      // Configure accessibility based on device capabilities
      await this.accessibility.initialize();

      // Set up performance monitoring with device-specific thresholds
      if (capabilities.performance.hardwareConcurrency < 4) {
        // Lower-end device optimizations
        this.performance.updateThresholds({
          maxTouchResponseTime: 75, // More lenient for slower devices
          minFrameRate: 24, // Lower minimum frame rate
          maxMemoryUsage: 50 * 1024 * 1024, // 50MB for low-end devices
        });
      }

      // Configure event normalization
      this.eventNormalizer.configure({
        touchSensitivity: capabilities.touch.supportsPressure
          ? 'high'
          : 'normal',
        enablePredictiveTouch: capabilities.performance.hardwareConcurrency > 6,
      });

      // Enable appropriate haptic feedback
      if (!capabilities.platform.supportsPWA) {
        this.haptics.setEnabled(false);
        console.info('Haptic feedback disabled - limited support detected');
      }

      this.isInitialized = true;
      console.info('✅ Touch Optimization System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TouchOptimizationSystem:', error);
      throw error;
    }
  }

  /**
   * Get all integrated services
   */
  getServices() {
    return {
      haptics: this.haptics,
      deviceDetector: this.deviceDetector,
      eventNormalizer: this.eventNormalizer,
      accessibility: this.accessibility,
      performance: this.performance,
    };
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      haptics: this.haptics.isHapticEnabled(),
      performance: this.performance.getPerformanceScore(),
      activeOptimizations: this.performance.getActiveOptimizations(),
    };
  }

  /**
   * Wedding-specific optimization presets
   */
  async enableWeddingMode(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.info('Enabling Wedding Mode optimizations...');

    await Promise.all([
      this.performance.enableEmergencyMode(),
      this.haptics.setEnabled(true), // Ensure haptics are available for important moments
    ]);

    console.info('✅ Wedding Mode enabled');
  }

  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    if (!this.isInitialized) return;

    console.info('Cleaning up Touch Optimization System...');

    await Promise.all([
      this.performance.destroy(),
      this.accessibility.cleanup(),
      this.haptics.cleanup(),
    ]);

    this.isInitialized = false;
    console.info('✅ Touch Optimization System cleaned up');
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<
    {
      service: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      details?: string;
    }[]
  > {
    const results = [];

    // Check haptic coordinator
    results.push({
      service: 'haptics',
      status: this.haptics.isHapticEnabled() ? 'healthy' : 'degraded',
      details: this.haptics.getCapabilities().supportsVibration
        ? 'Vibration API available'
        : 'No haptic support',
    });

    // Check device detector
    try {
      await this.deviceDetector.getCapabilities();
      results.push({
        service: 'deviceDetector',
        status: 'healthy' as const,
      });
    } catch (error) {
      results.push({
        service: 'deviceDetector',
        status: 'unhealthy' as const,
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Check performance optimizer
    const performanceScore = this.performance.getPerformanceScore();
    results.push({
      service: 'performance',
      status:
        performanceScore > 70
          ? 'healthy'
          : performanceScore > 40
            ? 'degraded'
            : 'unhealthy',
      details: `Performance score: ${performanceScore}/100`,
    });

    return results;
  }
}

// Export singleton instance
export const touchOptimizationSystem = new TouchOptimizationSystem();

// Convenience exports for common wedding scenarios
export const weddingTouch = {
  // System management
  initialize: () => touchOptimizationSystem.initialize(),
  enableWeddingMode: () => touchOptimizationSystem.enableWeddingMode(),
  cleanup: () => touchOptimizationSystem.cleanup(),
  healthCheck: () => touchOptimizationSystem.healthCheck(),

  // Quick access to wedding-specific features
  haptics: weddingHaptics,
  performance: weddingPerformance,

  // Status and monitoring
  getStatus: () => touchOptimizationSystem.getStatus(),
  getServices: () => touchOptimizationSystem.getServices(),
};

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      touchOptimizationSystem.initialize().catch(console.error);
    });
  } else {
    // DOM already loaded
    touchOptimizationSystem.initialize().catch(console.error);
  }
}
