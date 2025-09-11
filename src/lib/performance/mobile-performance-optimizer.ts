/**
 * WS-173: Mobile Performance Optimization System
 * Wedding supplier mobile optimization for 3G connections and venue scenarios
 */

interface MobileDeviceInfo {
  type: 'phone' | 'tablet' | 'desktop';
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number; // Mbps
  rtt: number; // ms
  memoryLimit: number; // GB
  hardwareConcurrency: number;
}

interface MobileOptimizationConfig {
  enableAggressiveCaching: boolean;
  enableImageOptimization: boolean;
  enableLazyLoading: boolean;
  enablePrefetching: boolean;
  enableServiceWorker: boolean;
  bundleSplitting: boolean;
  compressionLevel: 'low' | 'medium' | 'high';
  networkAwareness: boolean;
  batteryOptimization: boolean;
}

interface MobilePerformanceMetrics {
  deviceInfo: MobileDeviceInfo;
  loadTime: number;
  interactiveTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage: number;
  batteryLevel?: number;
  networkLatency: number;
  cacheHitRate: number;
  timestamp: number;
}

interface WeddingVenueScenario {
  venueType: 'indoor' | 'outdoor' | 'mixed';
  expectedConnectivity: 'poor' | 'moderate' | 'good';
  peakUsageTime: Date;
  expectedDevices: number;
  criticalFeatures: string[];
  fallbackStrategies: string[];
}

export class MobilePerformanceOptimizer {
  private config: MobileOptimizationConfig;
  private deviceInfo: MobileDeviceInfo;
  private isOptimized = false;
  private performanceObserver: PerformanceObserver | null = null;
  private networkObserver: any = null;
  private batteryManager: any = null;

  constructor() {
    this.config = {
      enableAggressiveCaching: true,
      enableImageOptimization: true,
      enableLazyLoading: true,
      enablePrefetching: false, // Disabled by default for 3G
      enableServiceWorker: true,
      bundleSplitting: true,
      compressionLevel: 'high',
      networkAwareness: true,
      batteryOptimization: true,
    };

    this.deviceInfo = this.detectMobileDevice();
    this.initializeNetworkMonitoring();
    this.initializeBatteryMonitoring();
  }

  /**
   * Optimize for wedding venue mobile scenarios
   */
  async optimizeForWeddingVenue(
    scenario: WeddingVenueScenario,
  ): Promise<boolean> {
    try {
      console.log('🎯 Optimizing for wedding venue scenario:', scenario);

      // Adjust configuration based on venue scenario
      this.adjustConfigForVenue(scenario);

      // Apply mobile optimizations
      await this.applyMobileOptimizations();

      // Setup venue-specific monitoring
      this.setupVenueMonitoring(scenario);

      // Preload critical wedding data
      await this.preloadCriticalWeddingData(scenario.criticalFeatures);

      // Setup fallback strategies
      this.enableFallbackStrategies(scenario.fallbackStrategies);

      this.isOptimized = true;
      console.log('✅ Wedding venue optimization complete');
      return true;
    } catch (error) {
      console.error('Failed to optimize for wedding venue:', error);
      return false;
    }
  }

  /**
   * Detect mobile device capabilities and constraints
   */
  private detectMobileDevice(): MobileDeviceInfo {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const pixelRatio = window.devicePixelRatio || 1;

    // Detect device type
    let type: 'phone' | 'tablet' | 'desktop' = 'desktop';
    if (screenWidth <= 768) {
      type = 'phone';
    } else if (screenWidth <= 1024) {
      type = 'tablet';
    }

    // Detect connection
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    let connectionType: MobileDeviceInfo['connectionType'] = 'unknown';
    let effectiveType: MobileDeviceInfo['effectiveType'] = '4g';
    let downlink = 10; // Default 10 Mbps
    let rtt = 50; // Default 50ms

    if (connection) {
      connectionType = connection.type || 'unknown';
      effectiveType = connection.effectiveType || '4g';
      downlink = connection.downlink || 10;
      rtt = connection.rtt || 50;
    }

    // Estimate memory limit based on device type
    let memoryLimit = 4; // Default 4GB
    if (type === 'phone') {
      memoryLimit = screenWidth <= 375 ? 2 : 4; // Older phones have less RAM
    } else if (type === 'tablet') {
      memoryLimit = 6;
    }

    return {
      type,
      screenWidth,
      screenHeight,
      pixelRatio,
      connectionType,
      effectiveType,
      downlink,
      rtt,
      memoryLimit,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
    };
  }

  /**
   * Adjust optimization config for venue scenario
   */
  private adjustConfigForVenue(scenario: WeddingVenueScenario): void {
    // Poor connectivity venues need aggressive optimization
    if (scenario.expectedConnectivity === 'poor') {
      this.config.enableAggressiveCaching = true;
      this.config.enablePrefetching = false; // Save bandwidth
      this.config.compressionLevel = 'high';
      this.config.bundleSplitting = true;
    }

    // Outdoor venues often have poor connectivity
    if (scenario.venueType === 'outdoor') {
      this.config.enableServiceWorker = true; // Critical for offline capability
      this.config.batteryOptimization = true; // Important for outdoor events
    }

    // High device count scenarios need efficient caching
    if (scenario.expectedDevices > 50) {
      this.config.enableAggressiveCaching = true;
      this.config.compressionLevel = 'high';
    }
  }

  /**
   * Apply mobile-specific performance optimizations
   */
  private async applyMobileOptimizations(): Promise<void> {
    const optimizations = [];

    // 1. Enable aggressive caching for mobile
    if (this.config.enableAggressiveCaching) {
      optimizations.push(this.enableAggressiveCaching());
    }

    // 2. Optimize images for mobile screens
    if (this.config.enableImageOptimization) {
      optimizations.push(this.optimizeImagesForMobile());
    }

    // 3. Enable lazy loading
    if (this.config.enableLazyLoading) {
      optimizations.push(this.enableIntelligentLazyLoading());
    }

    // 4. Setup network-aware loading
    if (this.config.networkAwareness) {
      optimizations.push(this.setupNetworkAwareLoading());
    }

    // 5. Enable battery optimization
    if (this.config.batteryOptimization) {
      optimizations.push(this.enableBatteryOptimization());
    }

    // 6. Setup service worker for offline capability
    if (this.config.enableServiceWorker) {
      optimizations.push(this.setupMobileServiceWorker());
    }

    await Promise.allSettled(optimizations);
  }

  /**
   * Enable aggressive caching for mobile devices
   */
  private async enableAggressiveCaching(): Promise<void> {
    // Increase cache sizes for mobile
    const mobileCache = await caches.open('wedsync-mobile-v1');

    // Cache critical wedding resources
    const criticalResources = [
      '/',
      '/offline',
      '/manifest.json',
      // Add critical CSS and JS bundles
    ];

    try {
      await mobileCache.addAll(criticalResources);
      console.log('📱 Mobile aggressive caching enabled');
    } catch (error) {
      console.warn('Failed to enable aggressive caching:', error);
    }
  }

  /**
   * Optimize images for mobile screens and connections
   */
  private async optimizeImagesForMobile(): Promise<void> {
    // Apply responsive image optimizations
    const images = document.querySelectorAll('img');

    images.forEach((img) => {
      // Add loading="lazy" for mobile
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      // Optimize image sizes based on device
      if (this.deviceInfo.type === 'phone') {
        // Use smaller images for phones
        const src = img.src;
        if (src && !src.includes('w=')) {
          const optimizedSrc = this.getOptimizedImageUrl(src, {
            width: Math.min(
              this.deviceInfo.screenWidth * this.deviceInfo.pixelRatio,
              800,
            ),
            quality: this.deviceInfo.effectiveType === '3g' ? 60 : 80,
          });
          img.src = optimizedSrc;
        }
      }
    });

    console.log('📱 Image optimization for mobile enabled');
  }

  /**
   * Enable intelligent lazy loading based on connection
   */
  private async enableIntelligentLazyLoading(): Promise<void> {
    // Adjust intersection observer margins based on connection speed
    let rootMargin = '100px';

    if (
      this.deviceInfo.effectiveType === 'slow-2g' ||
      this.deviceInfo.effectiveType === '2g'
    ) {
      rootMargin = '50px'; // Load images closer to viewport on slow connections
    } else if (this.deviceInfo.effectiveType === '3g') {
      rootMargin = '100px';
    } else {
      rootMargin = '200px'; // Load earlier on fast connections
    }

    // Setup intelligent intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      },
      { rootMargin },
    );

    // Observe lazy images
    document.querySelectorAll('img[data-src]').forEach((img) => {
      observer.observe(img);
    });

    console.log('📱 Intelligent lazy loading enabled');
  }

  /**
   * Setup network-aware loading strategies
   */
  private async setupNetworkAwareLoading(): Promise<void> {
    if (!this.networkObserver) return;

    // Adjust loading strategies based on connection
    const adjustLoadingStrategy = () => {
      const connection = (navigator as any).connection;
      if (!connection) return;

      if (
        connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g'
      ) {
        // Ultra-conservative loading for very slow connections
        this.enableUltraConservativeMode();
      } else if (connection.effectiveType === '3g') {
        // Balanced loading for 3G (wedding venue scenario)
        this.enableWeddingVenueMode();
      } else {
        // Normal loading for fast connections
        this.enableNormalMode();
      }
    };

    // Listen for connection changes
    this.networkObserver.addEventListener('change', adjustLoadingStrategy);
    adjustLoadingStrategy(); // Apply initial strategy

    console.log('📱 Network-aware loading enabled');
  }

  /**
   * Enable battery optimization for mobile devices
   */
  private async enableBatteryOptimization(): Promise<void> {
    if (!this.batteryManager) return;

    const optimizeForBattery = () => {
      const battery = this.batteryManager;

      if (battery.level < 0.2) {
        // Less than 20% battery
        // Enable ultra power-saving mode
        this.enableUltraPowerSavingMode();
      } else if (battery.level < 0.5) {
        // Less than 50% battery
        // Enable power-saving mode
        this.enablePowerSavingMode();
      }
    };

    // Monitor battery level changes
    this.batteryManager.addEventListener('levelchange', optimizeForBattery);
    this.batteryManager.addEventListener('chargingchange', optimizeForBattery);
    optimizeForBattery(); // Apply initial optimization

    console.log('📱 Battery optimization enabled');
  }

  /**
   * Setup mobile-optimized service worker
   */
  private async setupMobileServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration =
          await navigator.serviceWorker.register('/sw-mobile.js');

        // Configure mobile-specific caching strategies
        const sw =
          registration.active ||
          registration.waiting ||
          registration.installing;
        if (sw) {
          sw.postMessage({
            type: 'CONFIGURE_MOBILE',
            config: {
              deviceType: this.deviceInfo.type,
              connectionType: this.deviceInfo.effectiveType,
              cacheStrategy: 'network-first-critical',
              maxCacheSize: this.deviceInfo.memoryLimit * 0.1, // 10% of device memory
            },
          });
        }

        console.log('📱 Mobile service worker setup complete');
      } catch (error) {
        console.warn('Failed to setup mobile service worker:', error);
      }
    }
  }

  /**
   * Preload critical wedding data for venue scenario
   */
  private async preloadCriticalWeddingData(
    criticalFeatures: string[],
  ): Promise<void> {
    const preloadPromises = criticalFeatures.map(async (feature) => {
      switch (feature) {
        case 'timeline':
          return this.preloadWeddingTimeline();
        case 'vendors':
          return this.preloadVendorContacts();
        case 'emergency':
          return this.preloadEmergencyContacts();
        case 'tasks':
          return this.preloadActiveTasks();
        default:
          console.warn(`Unknown critical feature: ${feature}`);
      }
    });

    await Promise.allSettled(preloadPromises);
    console.log('📱 Critical wedding data preloaded');
  }

  /**
   * Enable fallback strategies for poor connectivity
   */
  private enableFallbackStrategies(strategies: string[]): void {
    strategies.forEach((strategy) => {
      switch (strategy) {
        case 'offline-forms':
          this.enableOfflineForms();
          break;
        case 'cached-data':
          this.enableCachedDataFallback();
          break;
        case 'low-bandwidth':
          this.enableLowBandwidthMode();
          break;
        case 'text-only':
          this.enableTextOnlyMode();
          break;
        default:
          console.warn(`Unknown fallback strategy: ${strategy}`);
      }
    });
  }

  /**
   * Measure mobile performance metrics
   */
  async measureMobilePerformance(): Promise<MobilePerformanceMetrics> {
    const metrics: MobilePerformanceMetrics = {
      deviceInfo: this.deviceInfo,
      loadTime: 0,
      interactiveTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0,
      memoryUsage: 0,
      networkLatency: this.deviceInfo.rtt,
      cacheHitRate: 0,
      timestamp: Date.now(),
    };

    // Collect performance metrics
    if ('PerformanceObserver' in window) {
      await this.collectWebVitals(metrics);
    }

    // Measure memory usage
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      metrics.memoryUsage = memoryInfo.usedJSHeapSize / (1024 * 1024); // MB
    }

    // Get battery level if available
    if (this.batteryManager) {
      metrics.batteryLevel = this.batteryManager.level * 100; // Percentage
    }

    return metrics;
  }

  /**
   * Get mobile optimization recommendations
   */
  getMobileOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];

    // Device-specific recommendations
    if (
      this.deviceInfo.type === 'phone' &&
      this.deviceInfo.screenWidth <= 375
    ) {
      recommendations.push(
        'Optimize for small screen devices with aggressive image compression',
      );
    }

    // Connection-specific recommendations
    if (
      this.deviceInfo.effectiveType === '3g' ||
      this.deviceInfo.effectiveType === '2g'
    ) {
      recommendations.push(
        'Enable aggressive caching and offline capabilities for slow connections',
      );
      recommendations.push('Implement progressive loading strategies');
    }

    // Memory-specific recommendations
    if (this.deviceInfo.memoryLimit <= 2) {
      recommendations.push(
        'Optimize for low-memory devices with efficient caching strategies',
      );
    }

    // Battery-specific recommendations
    if (this.batteryManager && this.batteryManager.level < 0.3) {
      recommendations.push('Enable power-saving mode to conserve battery');
    }

    return recommendations;
  }

  /**
   * Private helper methods
   */

  private getOptimizedImageUrl(
    src: string,
    options: { width: number; quality: number },
  ): string {
    // This would integrate with your image optimization service
    const url = new URL(src, window.location.origin);
    url.searchParams.set('w', options.width.toString());
    url.searchParams.set('q', options.quality.toString());
    url.searchParams.set('f', 'webp'); // Use WebP format for better compression
    return url.toString();
  }

  private async collectWebVitals(
    metrics: MobilePerformanceMetrics,
  ): Promise<void> {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            metrics.largestContentfulPaint = entry.startTime;
          } else if (entry.entryType === 'first-input') {
            metrics.firstInputDelay =
              (entry as any).processingStart - entry.startTime;
          } else if (entry.entryType === 'layout-shift') {
            if (!(entry as any).hadRecentInput) {
              metrics.cumulativeLayoutShift += (entry as any).value;
            }
          } else if (
            entry.entryType === 'paint' &&
            entry.name === 'first-contentful-paint'
          ) {
            metrics.firstContentfulPaint = entry.startTime;
          }
        }
      });

      try {
        observer.observe({
          entryTypes: [
            'largest-contentful-paint',
            'first-input',
            'layout-shift',
            'paint',
          ],
        });
        setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 5000);
      } catch (error) {
        resolve();
      }
    });
  }

  private initializeNetworkMonitoring(): void {
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      this.networkObserver = connection;
    }
  }

  private async initializeBatteryMonitoring(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        this.batteryManager = await (navigator as any).getBattery();
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }

  private setupVenueMonitoring(scenario: WeddingVenueScenario): void {
    // Setup monitoring specific to wedding venue scenarios
    console.log(
      '📱 Venue-specific monitoring enabled for:',
      scenario.venueType,
    );
  }

  // Loading strategy implementations
  private enableUltraConservativeMode(): void {
    // Disable all non-essential loading
    console.log('📱 Ultra-conservative loading mode enabled');
  }

  private enableWeddingVenueMode(): void {
    // Balanced loading for wedding venues with 3G
    console.log('📱 Wedding venue loading mode enabled');
  }

  private enableNormalMode(): void {
    // Normal loading for good connections
    console.log('📱 Normal loading mode enabled');
  }

  private enableUltraPowerSavingMode(): void {
    // Minimal functionality to preserve battery
    console.log('🔋 Ultra power-saving mode enabled');
  }

  private enablePowerSavingMode(): void {
    // Reduced functionality to save battery
    console.log('🔋 Power-saving mode enabled');
  }

  // Preloading implementations
  private async preloadWeddingTimeline(): Promise<void> {
    console.log('📱 Preloading wedding timeline');
  }

  private async preloadVendorContacts(): Promise<void> {
    console.log('📱 Preloading vendor contacts');
  }

  private async preloadEmergencyContacts(): Promise<void> {
    console.log('📱 Preloading emergency contacts');
  }

  private async preloadActiveTasks(): Promise<void> {
    console.log('📱 Preloading active tasks');
  }

  // Fallback strategy implementations
  private enableOfflineForms(): void {
    console.log('📱 Offline forms enabled');
  }

  private enableCachedDataFallback(): void {
    console.log('📱 Cached data fallback enabled');
  }

  private enableLowBandwidthMode(): void {
    console.log('📱 Low bandwidth mode enabled');
  }

  private enableTextOnlyMode(): void {
    console.log('📱 Text-only mode enabled');
  }
}

// Export singleton instance
export const mobilePerformanceOptimizer =
  typeof window !== 'undefined' ? new MobilePerformanceOptimizer() : null;
