/**
 * Battery Optimization Service
 * WS-155: Guest Communications - Round 3
 * Ensures efficient power usage for messaging features
 */

interface BatteryInfo {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
}

interface PowerProfile {
  name: string;
  description: string;
  settings: {
    animationsEnabled: boolean;
    backgroundSyncInterval: number;
    pushNotificationBatching: boolean;
    imageOptimization: boolean;
    networkOptimization: boolean;
    renderingOptimization: boolean;
  };
}

interface PowerUsageMetrics {
  timestamp: number;
  batteryLevel: number;
  powerIntensive: boolean;
  activeFeatures: string[];
  estimatedDrain: number;
}

export class BatteryOptimizationService {
  private static instance: BatteryOptimizationService;
  private batteryAPI: any = null;
  private currentProfile: PowerProfile;
  private usageMetrics: PowerUsageMetrics[] = [];
  private batteryMonitorInterval: NodeJS.Timeout | null = null;
  private lowPowerMode: boolean = false;

  private powerProfiles: PowerProfile[] = [
    {
      name: 'performance',
      description: 'Full features, highest power consumption',
      settings: {
        animationsEnabled: true,
        backgroundSyncInterval: 30000, // 30 seconds
        pushNotificationBatching: false,
        imageOptimization: false,
        networkOptimization: false,
        renderingOptimization: false,
      },
    },
    {
      name: 'balanced',
      description: 'Good balance of features and power efficiency',
      settings: {
        animationsEnabled: true,
        backgroundSyncInterval: 60000, // 1 minute
        pushNotificationBatching: true,
        imageOptimization: true,
        networkOptimization: true,
        renderingOptimization: false,
      },
    },
    {
      name: 'power-saver',
      description: 'Maximum battery life, reduced features',
      settings: {
        animationsEnabled: false,
        backgroundSyncInterval: 300000, // 5 minutes
        pushNotificationBatching: true,
        imageOptimization: true,
        networkOptimization: true,
        renderingOptimization: true,
      },
    },
    {
      name: 'critical',
      description: 'Emergency mode, minimal features',
      settings: {
        animationsEnabled: false,
        backgroundSyncInterval: 600000, // 10 minutes
        pushNotificationBatching: true,
        imageOptimization: true,
        networkOptimization: true,
        renderingOptimization: true,
      },
    },
  ];

  private constructor() {
    this.currentProfile = this.powerProfiles[1]; // Start with balanced
    this.initializeBatteryAPI();
    this.startBatteryMonitoring();
    this.applyPowerProfile();
  }

  static getInstance(): BatteryOptimizationService {
    if (!this.instance) {
      this.instance = new BatteryOptimizationService();
    }
    return this.instance;
  }

  /**
   * Initialize Battery API if available
   */
  private async initializeBatteryAPI() {
    try {
      if ('getBattery' in navigator) {
        this.batteryAPI = await (navigator as any).getBattery();

        // Listen for battery events
        this.batteryAPI.addEventListener('chargingchange', () => {
          this.handleBatteryChange();
        });

        this.batteryAPI.addEventListener('levelchange', () => {
          this.handleBatteryLevelChange();
        });

        console.log('Battery API initialized');
      } else {
        console.log('Battery API not supported, using fallback optimization');
      }
    } catch (error) {
      console.warn('Could not initialize Battery API:', error);
    }
  }

  /**
   * Start monitoring battery and power usage
   */
  private startBatteryMonitoring() {
    this.batteryMonitorInterval = setInterval(() => {
      this.recordPowerUsage();
      this.optimizePowerUsage();
    }, 60000); // Check every minute
  }

  /**
   * Handle battery charging state change
   */
  private handleBatteryChange() {
    if (this.batteryAPI) {
      const isCharging = this.batteryAPI.charging;

      if (isCharging && this.lowPowerMode) {
        // Switch to balanced mode when charging
        this.setPowerProfile('balanced');
        this.lowPowerMode = false;
        console.log('Switched to balanced mode - device is charging');
      }
    }
  }

  /**
   * Handle battery level change
   */
  private handleBatteryLevelChange() {
    if (this.batteryAPI) {
      const level = this.batteryAPI.level;

      if (level <= 0.15 && !this.lowPowerMode) {
        // 15% battery
        this.setPowerProfile('power-saver');
        this.lowPowerMode = true;
        this.showLowBatteryNotification();
        console.log('Switched to power-saver mode - low battery');
      } else if (level <= 0.05 && this.currentProfile.name !== 'critical') {
        // 5% battery
        this.setPowerProfile('critical');
        this.lowPowerMode = true;
        this.showCriticalBatteryNotification();
        console.log('Switched to critical mode - critical battery');
      }
    }
  }

  /**
   * Record current power usage metrics
   */
  private recordPowerUsage() {
    const batteryLevel = this.batteryAPI ? this.batteryAPI.level : 1;
    const activeFeatures = this.getActiveFeatures();

    const metric: PowerUsageMetrics = {
      timestamp: Date.now(),
      batteryLevel: batteryLevel,
      powerIntensive: this.isPowerIntensive(activeFeatures),
      activeFeatures,
      estimatedDrain: this.calculateEstimatedDrain(activeFeatures),
    };

    this.usageMetrics.push(metric);

    // Keep only last 100 metrics (about 1.5 hours of data)
    if (this.usageMetrics.length > 100) {
      this.usageMetrics.shift();
    }
  }

  /**
   * Get currently active power-consuming features
   */
  private getActiveFeatures(): string[] {
    const features: string[] = [];

    // Check document visibility
    if (!document.hidden) {
      features.push('screen-active');
    }

    // Check for active WebSocket connections
    if (this.hasActiveWebSockets()) {
      features.push('websocket-active');
    }

    // Check for active background sync
    if (this.hasActiveBackgroundSync()) {
      features.push('background-sync');
    }

    // Check for active animations
    if (this.hasActiveAnimations()) {
      features.push('animations');
    }

    // Check for active location services
    if (this.hasActiveLocation()) {
      features.push('location');
    }

    // Check for active camera/media
    if (this.hasActiveMedia()) {
      features.push('media-active');
    }

    return features;
  }

  /**
   * Determine if current features are power intensive
   */
  private isPowerIntensive(features: string[]): boolean {
    const intensiveFeatures = ['media-active', 'location', 'animations'];
    return intensiveFeatures.some((feature) => features.includes(feature));
  }

  /**
   * Calculate estimated power drain per hour
   */
  private calculateEstimatedDrain(features: string[]): number {
    const baseDrain = 5; // 5% per hour base drain
    let additionalDrain = 0;

    const drainRates: { [key: string]: number } = {
      'screen-active': 10,
      'websocket-active': 2,
      'background-sync': 3,
      animations: 5,
      location: 15,
      'media-active': 20,
    };

    features.forEach((feature) => {
      additionalDrain += drainRates[feature] || 0;
    });

    return baseDrain + additionalDrain;
  }

  /**
   * Optimize power usage based on current conditions
   */
  private optimizePowerUsage() {
    const recentMetrics = this.usageMetrics.slice(-5); // Last 5 minutes
    const avgDrain =
      recentMetrics.reduce((sum, m) => sum + m.estimatedDrain, 0) /
      recentMetrics.length;

    // If power drain is too high and not charging, apply optimizations
    if (avgDrain > 20 && !this.isCharging()) {
      this.applyEmergencyOptimizations();
    }

    // Reduce background activity when screen is inactive
    if (document.hidden) {
      this.reduceBackgroundActivity();
    }
  }

  /**
   * Apply emergency power optimizations
   */
  private applyEmergencyOptimizations() {
    console.log('Applying emergency power optimizations');

    // Disable non-essential animations
    document.body.style.setProperty('--animation-duration', '0s');

    // Reduce image quality
    this.optimizeImages();

    // Throttle network requests
    this.throttleNetworkRequests();

    // Reduce refresh rates
    this.reduceRefreshRates();
  }

  /**
   * Reduce background activity when screen is inactive
   */
  private reduceBackgroundActivity() {
    // Increase sync intervals
    const currentInterval = this.currentProfile.settings.backgroundSyncInterval;
    const reducedInterval = currentInterval * 2;

    // Batch notifications more aggressively
    this.enableAggressiveNotificationBatching();

    // Pause non-critical timers
    this.pauseNonCriticalTimers();
  }

  /**
   * Set power profile
   */
  setPowerProfile(profileName: string) {
    const profile = this.powerProfiles.find((p) => p.name === profileName);
    if (profile) {
      this.currentProfile = profile;
      this.applyPowerProfile();
      console.log(`Power profile changed to: ${profileName}`);
    }
  }

  /**
   * Apply current power profile settings
   */
  private applyPowerProfile() {
    const settings = this.currentProfile.settings;

    // Apply animation settings
    if (!settings.animationsEnabled) {
      document.body.classList.add('power-saver-animations');
    } else {
      document.body.classList.remove('power-saver-animations');
    }

    // Apply image optimization
    if (settings.imageOptimization) {
      this.enableImageOptimization();
    }

    // Apply network optimization
    if (settings.networkOptimization) {
      this.enableNetworkOptimization();
    }

    // Apply rendering optimization
    if (settings.renderingOptimization) {
      this.enableRenderingOptimization();
    }

    // Configure background sync
    this.configureBackgroundSync(settings.backgroundSyncInterval);

    // Configure notification batching
    this.configureNotificationBatching(settings.pushNotificationBatching);
  }

  /**
   * Enable image optimization
   */
  private enableImageOptimization() {
    // Reduce image quality on slow connections
    const connection = (navigator as any).connection;
    if (connection && connection.effectiveType === '2g') {
      document.body.classList.add('low-quality-images');
    }
  }

  /**
   * Enable network optimization
   */
  private enableNetworkOptimization() {
    // Implement request coalescing and caching
    this.enableRequestCoalescing();
    this.enableAggressiveCaching();
  }

  /**
   * Enable rendering optimization
   */
  private enableRenderingOptimization() {
    // Use will-change sparingly
    document.body.classList.add('optimized-rendering');

    // Enable CSS containment
    document.body.style.contain = 'layout style paint';
  }

  /**
   * Helper methods for feature detection
   */
  private hasActiveWebSockets(): boolean {
    // Check if WebSocket connections are active
    return (window as any).activeWebSockets > 0;
  }

  private hasActiveBackgroundSync(): boolean {
    return 'serviceWorker' in navigator && navigator.serviceWorker.controller;
  }

  private hasActiveAnimations(): boolean {
    return document.getAnimations().length > 0;
  }

  private hasActiveLocation(): boolean {
    return (navigator as any).geolocationWatchId !== undefined;
  }

  private hasActiveMedia(): boolean {
    return document.querySelectorAll('video, audio').length > 0;
  }

  private isCharging(): boolean {
    return this.batteryAPI ? this.batteryAPI.charging : true; // Assume charging if unknown
  }

  /**
   * Helper methods for optimizations
   */
  private optimizeImages() {
    const images = document.querySelectorAll('img[data-src]');
    images.forEach((img) => {
      const element = img as HTMLImageElement;
      if (element.dataset.src) {
        element.src = element.dataset.src + '?quality=60'; // Reduce quality
      }
    });
  }

  private throttleNetworkRequests() {
    // Implement request throttling
    (window as any).networkThrottled = true;
  }

  private reduceRefreshRates() {
    // Reduce polling intervals
    (window as any).reducedRefreshRates = true;
  }

  private enableAggressiveNotificationBatching() {
    (window as any).aggressiveNotificationBatching = true;
  }

  private pauseNonCriticalTimers() {
    // Pause non-essential intervals and timeouts
    (window as any).nonCriticalTimersPaused = true;
  }

  private enableRequestCoalescing() {
    // Already implemented in performance service
  }

  private enableAggressiveCaching() {
    // Enable longer cache times
    (window as any).aggressiveCaching = true;
  }

  private configureBackgroundSync(interval: number) {
    (window as any).backgroundSyncInterval = interval;
  }

  private configureNotificationBatching(enabled: boolean) {
    (window as any).notificationBatching = enabled;
  }

  /**
   * Show battery notifications
   */
  private showLowBatteryNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Battery Low', {
        body: 'Switched to power-saving mode to conserve battery',
        icon: '/icons/battery-low.png',
      });
    }
  }

  private showCriticalBatteryNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Critical Battery', {
        body: 'Critical battery level. Some features have been disabled.',
        icon: '/icons/battery-critical.png',
      });
    }
  }

  /**
   * Get current battery info
   */
  getBatteryInfo(): BatteryInfo | null {
    if (this.batteryAPI) {
      return {
        charging: this.batteryAPI.charging,
        level: this.batteryAPI.level,
        chargingTime: this.batteryAPI.chargingTime,
        dischargingTime: this.batteryAPI.dischargingTime,
      };
    }
    return null;
  }

  /**
   * Get power usage report
   */
  getPowerUsageReport(): {
    currentProfile: PowerProfile;
    batteryInfo: BatteryInfo | null;
    averageDrain: number;
    estimatedTimeLeft: number;
    recommendations: string[];
  } {
    const batteryInfo = this.getBatteryInfo();
    const recentMetrics = this.usageMetrics.slice(-10);
    const avgDrain =
      recentMetrics.reduce((sum, m) => sum + m.estimatedDrain, 0) /
        recentMetrics.length || 0;

    const currentLevel = batteryInfo ? batteryInfo.level : 1;
    const estimatedTimeLeft =
      avgDrain > 0 ? (currentLevel * 100) / avgDrain : 24; // Hours

    const recommendations: string[] = [];

    if (avgDrain > 25) {
      recommendations.push('Consider switching to power-saver mode');
    }

    if (!this.isCharging() && currentLevel < 0.3) {
      recommendations.push('Device should be charged soon');
    }

    if (this.usageMetrics.filter((m) => m.powerIntensive).length > 5) {
      recommendations.push('Reduce use of power-intensive features');
    }

    return {
      currentProfile: this.currentProfile,
      batteryInfo,
      averageDrain: avgDrain,
      estimatedTimeLeft,
      recommendations,
    };
  }

  /**
   * Cleanup on service destruction
   */
  cleanup() {
    if (this.batteryMonitorInterval) {
      clearInterval(this.batteryMonitorInterval);
    }

    if (this.batteryAPI) {
      this.batteryAPI.removeEventListener(
        'chargingchange',
        this.handleBatteryChange,
      );
      this.batteryAPI.removeEventListener(
        'levelchange',
        this.handleBatteryLevelChange,
      );
    }
  }
}

// Export singleton instance
export const batteryOptimization = BatteryOptimizationService.getInstance();

// CSS for power-saving modes
export const powerSaverCSS = `
.power-saver-animations * {
  animation-duration: 0s !important;
  transition-duration: 0s !important;
}

.low-quality-images img {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: optimize-contrast;
}

.optimized-rendering {
  will-change: auto;
}

.optimized-rendering * {
  contain: layout style;
}
`;
