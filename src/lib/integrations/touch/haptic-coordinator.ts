/**
 * WS-189: Cross-platform haptic feedback coordination
 * Handles Web Vibration API integration with iOS Taptic Engine coordination through Safari
 * and Android haptic pattern optimization with device-specific capabilities and timing
 */

export interface HapticPattern {
  id: string;
  pattern: number[];
  intensity?: number;
  description: string;
}

export interface HapticCapabilities {
  supportsVibration: boolean;
  supportsTapticEngine: boolean;
  supportsIntensity: boolean;
  maxDuration: number;
  platformOptimized: boolean;
}

export interface HapticFeedbackOptions {
  type:
    | 'light'
    | 'medium'
    | 'heavy'
    | 'success'
    | 'warning'
    | 'error'
    | 'selection';
  intensity?: number;
  duration?: number;
  pattern?: number[];
  fallback?: boolean;
}

/**
 * Cross-platform haptic feedback coordinator
 * Manages Web Vibration API integration with iOS Taptic Engine and Android haptic optimization
 */
export class HapticCoordinator {
  private capabilities: HapticCapabilities;
  private isEnabled = true;
  private lastHapticTime = 0;
  private readonly minInterval = 50; // Minimum time between haptic events
  private readonly patterns: Map<string, HapticPattern> = new Map();
  private batteryLevel = 1;
  private isCharging = true;

  constructor() {
    this.capabilities = this.detectHapticCapabilities();
    this.initializePatterns();
    this.initializeBatteryMonitoring();
  }

  /**
   * Detect device haptic capabilities with platform-specific optimizations
   */
  private detectHapticCapabilities(): HapticCapabilities {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);

    // Check for Web Vibration API support
    const supportsVibration =
      'vibrate' in navigator && typeof navigator.vibrate === 'function';

    // iOS Taptic Engine detection through Safari
    const supportsTapticEngine = isIOS && supportsVibration;

    // Android devices generally support intensity control
    const supportsIntensity = isAndroid && supportsVibration;

    // Platform-specific maximum duration limits
    let maxDuration = 1000; // Default 1 second
    if (isIOS) {
      maxDuration = 500; // iOS has stricter limits
    } else if (isAndroid) {
      maxDuration = 2000; // Android allows longer vibrations
    }

    return {
      supportsVibration,
      supportsTapticEngine,
      supportsIntensity,
      maxDuration,
      platformOptimized: isIOS || isAndroid,
    };
  }

  /**
   * Initialize haptic patterns for different interaction types
   */
  private initializePatterns(): void {
    // Light feedback patterns
    this.patterns.set('light', {
      id: 'light',
      pattern: [10],
      intensity: 0.3,
      description: 'Light tap feedback for UI interactions',
    });

    // Medium feedback patterns
    this.patterns.set('medium', {
      id: 'medium',
      pattern: [25],
      intensity: 0.5,
      description: 'Medium feedback for button presses',
    });

    // Heavy feedback patterns
    this.patterns.set('heavy', {
      id: 'heavy',
      pattern: [50],
      intensity: 0.8,
      description: 'Strong feedback for important actions',
    });

    // Success pattern - double pulse
    this.patterns.set('success', {
      id: 'success',
      pattern: [30, 10, 30],
      intensity: 0.6,
      description: 'Success confirmation pattern',
    });

    // Warning pattern - triple short
    this.patterns.set('warning', {
      id: 'warning',
      pattern: [15, 10, 15, 10, 15],
      intensity: 0.7,
      description: 'Warning attention pattern',
    });

    // Error pattern - long pulse
    this.patterns.set('error', {
      id: 'error',
      pattern: [100],
      intensity: 0.9,
      description: 'Error notification pattern',
    });

    // Selection pattern - very light
    this.patterns.set('selection', {
      id: 'selection',
      pattern: [5],
      intensity: 0.2,
      description: 'Item selection feedback',
    });

    // Wedding-specific patterns
    this.patterns.set('photo-capture', {
      id: 'photo-capture',
      pattern: [20, 5, 20],
      intensity: 0.4,
      description: 'Photo capture confirmation',
    });

    this.patterns.set('task-complete', {
      id: 'task-complete',
      pattern: [40, 15, 40, 15, 40],
      intensity: 0.6,
      description: 'Wedding task completion',
    });

    this.patterns.set('timeline-alert', {
      id: 'timeline-alert',
      pattern: [30, 20, 30, 20, 30],
      intensity: 0.8,
      description: 'Timeline milestone alert',
    });
  }

  /**
   * Initialize battery monitoring for power-aware haptic usage
   */
  private async initializeBatteryMonitoring(): Promise<void> {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        this.batteryLevel = battery.level;
        this.isCharging = battery.charging;

        // Listen for battery changes
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
        });

        battery.addEventListener('chargingchange', () => {
          this.isCharging = battery.charging;
        });
      }
    } catch (error) {
      console.warn('Battery API not available:', error);
      // Fallback to conservative battery assumptions
      this.batteryLevel = 0.5;
      this.isCharging = false;
    }
  }

  /**
   * Check if haptic feedback should be provided based on battery and timing
   */
  private canPerformHaptic(options?: Partial<HapticFeedbackOptions>): boolean {
    if (!this.isEnabled || !this.capabilities.supportsVibration) {
      return false;
    }

    const now = Date.now();

    // Rate limiting - prevent excessive haptic usage
    if (now - this.lastHapticTime < this.minInterval) {
      return false;
    }

    // Battery optimization - reduce haptic usage on low battery
    if (!this.isCharging && this.batteryLevel < 0.2) {
      // Only allow critical haptics when battery is very low
      return options.type === 'error' || options.type === 'warning';
    }

    // Moderate haptic usage on medium battery
    if (!this.isCharging && this.batteryLevel < 0.5) {
      // Skip light haptics to conserve battery
      return options.type !== 'light' && options.type !== 'selection';
    }

    return true;
  }

  /**
   * Perform haptic feedback with cross-platform optimization
   */
  async performHaptic(options: HapticFeedbackOptions): Promise<boolean> {
    if (!this.canPerformHaptic(options)) {
      return false;
    }

    try {
      const pattern = this.getOptimizedPattern(options);
      const success = await this.executeHapticPattern(pattern, options);

      if (success) {
        this.lastHapticTime = Date.now();
      }

      return success;
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      return false;
    }
  }

  /**
   * Get optimized haptic pattern for the current platform and options
   */
  private getOptimizedPattern(options: HapticFeedbackOptions): number[] {
    // Use custom pattern if provided
    if (options.pattern) {
      return this.optimizePatternForPlatform(options.pattern);
    }

    // Get predefined pattern
    const patternData = this.patterns.get(options.type);
    if (!patternData) {
      // Fallback to medium pattern
      return this.patterns.get('medium')!.pattern;
    }

    // Apply intensity and duration adjustments
    let pattern = [...patternData.pattern];

    if (options.intensity !== undefined) {
      pattern = pattern.map((duration) =>
        Math.round(duration * Math.max(0.1, Math.min(1.0, options.intensity!))),
      );
    }

    if (options.duration !== undefined) {
      const totalDuration = pattern.reduce(
        (sum, val, index) => (index % 2 === 0 ? sum + val : sum),
        0,
      );
      const scale = options.duration / totalDuration;
      pattern = pattern.map((duration, index) =>
        index % 2 === 0 ? Math.round(duration * scale) : duration,
      );
    }

    return this.optimizePatternForPlatform(pattern);
  }

  /**
   * Optimize haptic pattern for current platform capabilities
   */
  private optimizePatternForPlatform(pattern: number[]): number[] {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);

    let optimizedPattern = [...pattern];

    if (isIOS) {
      // iOS Taptic Engine optimization
      // Prefer shorter, more precise patterns
      optimizedPattern = optimizedPattern.map(
        (duration) => Math.min(duration, 100), // iOS works better with shorter pulses
      );

      // Add slight delays between pulses for iOS
      const iosPattern: number[] = [];
      optimizedPattern.forEach((duration, index) => {
        iosPattern.push(duration);
        if (index < optimizedPattern.length - 1) {
          iosPattern.push(10); // Short pause between pulses
        }
      });
      optimizedPattern = iosPattern;
    } else if (isAndroid) {
      // Android haptic optimization
      // Android can handle longer, more complex patterns
      optimizedPattern = optimizedPattern.map((duration) =>
        Math.min(duration, this.capabilities.maxDuration),
      );

      // Battery-aware intensity adjustment
      if (!this.isCharging && this.batteryLevel < 0.5) {
        optimizedPattern = optimizedPattern.map(
          (duration) => Math.round(duration * 0.7), // Reduce intensity on low battery
        );
      }
    }

    // Ensure pattern doesn't exceed platform limits
    const totalDuration = optimizedPattern.reduce((sum, val) => sum + val, 0);
    if (totalDuration > this.capabilities.maxDuration) {
      const scale = this.capabilities.maxDuration / totalDuration;
      optimizedPattern = optimizedPattern.map((duration) =>
        Math.max(5, Math.round(duration * scale)),
      );
    }

    return optimizedPattern;
  }

  /**
   * Execute haptic pattern using Web Vibration API
   */
  private async executeHapticPattern(
    pattern: number[],
    options: HapticFeedbackOptions,
  ): Promise<boolean> {
    try {
      // Check if vibration API is available
      if (!navigator.vibrate) {
        return false;
      }

      // Perform vibration
      const result = navigator.vibrate(pattern);

      // Log haptic usage for analytics (privacy-safe)
      this.logHapticUsage(
        options.type,
        pattern.length,
        options.fallback || false,
      );

      return result;
    } catch (error) {
      console.warn('Haptic execution failed:', error);

      // Progressive enhancement - try fallback pattern
      if (options.fallback !== false && pattern.length > 1) {
        try {
          return navigator.vibrate([pattern[0]]);
        } catch (fallbackError) {
          console.warn('Haptic fallback failed:', fallbackError);
        }
      }

      return false;
    }
  }

  /**
   * Log haptic usage for performance monitoring and optimization
   */
  private logHapticUsage(
    type: string,
    patternLength: number,
    wasFallback: boolean,
  ): void {
    // Privacy-safe analytics logging
    if (typeof window !== 'undefined' && (window as any).weddingAnalytics) {
      (window as any).weddingAnalytics.track('haptic_feedback_used', {
        type,
        pattern_complexity: patternLength > 3 ? 'complex' : 'simple',
        platform: this.capabilities.platformOptimized ? 'optimized' : 'generic',
        was_fallback: wasFallback,
        battery_conscious: !this.isCharging && this.batteryLevel < 0.5,
      });
    }
  }

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if haptic feedback is currently enabled and supported
   */
  isHapticEnabled(): boolean {
    return this.isEnabled && this.capabilities.supportsVibration;
  }

  /**
   * Get current haptic capabilities
   */
  getCapabilities(): HapticCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get available haptic patterns
   */
  getAvailablePatterns(): HapticPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Add custom haptic pattern
   */
  addCustomPattern(pattern: HapticPattern): void {
    // Validate pattern
    if (!pattern.id || !pattern.pattern || pattern.pattern.length === 0) {
      throw new Error('Invalid haptic pattern');
    }

    // Ensure pattern doesn't exceed platform limits
    const totalDuration = pattern.pattern.reduce((sum, val) => sum + val, 0);
    if (totalDuration > this.capabilities.maxDuration) {
      throw new Error(
        `Pattern duration (${totalDuration}ms) exceeds platform limit (${this.capabilities.maxDuration}ms)`,
      );
    }

    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Wedding-specific haptic helpers
   */

  /**
   * Photo capture feedback
   */
  async photoCapture(): Promise<boolean> {
    return this.performHaptic({ type: 'medium', intensity: 0.4 });
  }

  /**
   * Task completion feedback
   */
  async taskComplete(): Promise<boolean> {
    return this.performHaptic({
      type: 'success',
      pattern: [40, 15, 40, 15, 40],
      intensity: 0.6,
    });
  }

  /**
   * Timeline milestone alert
   */
  async timelineAlert(): Promise<boolean> {
    return this.performHaptic({
      type: 'warning',
      pattern: [30, 20, 30, 20, 30],
      intensity: 0.8,
    });
  }

  /**
   * Guest check-in confirmation
   */
  async guestCheckIn(): Promise<boolean> {
    return this.performHaptic({ type: 'light', intensity: 0.3 });
  }

  /**
   * Emergency alert pattern
   */
  async emergencyAlert(): Promise<boolean> {
    return this.performHaptic({
      type: 'error',
      pattern: [200, 50, 200, 50, 200],
      intensity: 1.0,
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.isEnabled = false;
    this.patterns.clear();
  }
}

// Export singleton instance for global use
export const hapticCoordinator = new HapticCoordinator();

// Convenience functions for common wedding scenarios
export const weddingHaptics = {
  photoCapture: () => hapticCoordinator.photoCapture(),
  taskComplete: () => hapticCoordinator.taskComplete(),
  timelineAlert: () => hapticCoordinator.timelineAlert(),
  guestCheckIn: () => hapticCoordinator.guestCheckIn(),
  emergencyAlert: () => hapticCoordinator.emergencyAlert(),

  // Generic haptic feedback
  light: () => hapticCoordinator.performHaptic({ type: 'light' }),
  medium: () => hapticCoordinator.performHaptic({ type: 'medium' }),
  heavy: () => hapticCoordinator.performHaptic({ type: 'heavy' }),
  success: () => hapticCoordinator.performHaptic({ type: 'success' }),
  warning: () => hapticCoordinator.performHaptic({ type: 'warning' }),
  error: () => hapticCoordinator.performHaptic({ type: 'error' }),
  selection: () => hapticCoordinator.performHaptic({ type: 'selection' }),
};
