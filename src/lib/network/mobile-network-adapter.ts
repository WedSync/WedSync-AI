/**
 * WS-173 Team D Round 2: Mobile Network Adaptation
 *
 * Adapts application behavior based on real-time network conditions
 * Optimizes for wedding suppliers working at venues with poor connectivity
 */

import React from 'react';
import { networkLoader } from '../performance/network-adaptive-loader';
import { cacheManager } from '../performance/advanced-cache-manager';

export interface NetworkCondition {
  type: 'wifi' | '4g' | '3g' | '2g' | 'slow-2g' | 'offline';
  downlink: number; // Mbps
  uplink: number; // Mbps
  rtt: number; // Round trip time in ms
  effectiveType: string;
  saveData: boolean;
  quality: 'excellent' | 'good' | 'poor' | 'offline';
  stability: 'stable' | 'fluctuating' | 'unstable';
}

export interface AdaptationStrategy {
  imageQuality: 'original' | 'high' | 'medium' | 'low' | 'text-only';
  videoEnabled: boolean;
  animationsEnabled: boolean;
  prefetchEnabled: boolean;
  compressionLevel: 'none' | 'light' | 'aggressive';
  maxConcurrentRequests: number;
  requestTimeout: number;
  retryAttempts: number;
  cachingStrategy: 'aggressive' | 'normal' | 'minimal';
}

export interface WeddingNetworkContext {
  venueType: 'outdoor' | 'indoor' | 'remote' | 'urban';
  eventPhase: 'setup' | 'ceremony' | 'reception' | 'breakdown';
  supplierRole: 'photographer' | 'coordinator' | 'vendor' | 'officiant';
  criticalOperations: string[];
}

class MobileNetworkAdapter {
  private currentCondition: NetworkCondition | null = null;
  private currentStrategy: AdaptationStrategy | null = null;
  private connectionHistory: NetworkCondition[] = [];
  private adaptationCallbacks: Set<(strategy: AdaptationStrategy) => void> =
    new Set();
  private qualityChangeCallbacks: Set<(quality: string) => void> = new Set();
  private stabilityMonitor: {
    samples: number[];
    interval: NodeJS.Timeout | null;
  } = { samples: [], interval: null };

  // Wedding venue network profiles based on common connectivity patterns
  private static VENUE_NETWORK_PROFILES = {
    outdoor: {
      expectedQuality: 'poor' as const,
      stabilityFactor: 0.3,
      adaptationAggression: 'high' as const,
    },
    remote: {
      expectedQuality: 'poor' as const,
      stabilityFactor: 0.2,
      adaptationAggression: 'aggressive' as const,
    },
    indoor: {
      expectedQuality: 'good' as const,
      stabilityFactor: 0.7,
      adaptationAggression: 'moderate' as const,
    },
    urban: {
      expectedQuality: 'excellent' as const,
      stabilityFactor: 0.9,
      adaptationAggression: 'low' as const,
    },
  };

  constructor() {
    this.initializeNetworkMonitoring();
    this.setupConnectionChangeHandlers();
    this.startStabilityMonitoring();
  }

  /**
   * Initialize network monitoring and detection
   */
  private initializeNetworkMonitoring(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      // Get initial network condition
      this.updateNetworkCondition();

      // Listen for connection changes
      connection.addEventListener('change', () => {
        this.updateNetworkCondition();
      });
    } else {
      // Fallback network detection for browsers without Network Information API
      this.initializeFallbackNetworkDetection();
    }

    // Monitor network quality through request timing
    this.startNetworkQualityMonitoring();
  }

  /**
   * Update current network condition
   */
  private updateNetworkCondition(): void {
    const connection = (navigator as any).connection;

    const condition: NetworkCondition = {
      type: this.mapConnectionType(connection?.type || 'unknown'),
      downlink: connection?.downlink || 0,
      uplink: connection?.uplink || 0,
      rtt: connection?.rtt || 0,
      effectiveType: connection?.effectiveType || 'unknown',
      saveData: connection?.saveData || false,
      quality: this.determineQuality(connection),
      stability: this.determineStability(),
    };

    // Store previous condition and update current
    if (this.currentCondition) {
      this.connectionHistory.push(this.currentCondition);

      // Keep only last 10 conditions
      if (this.connectionHistory.length > 10) {
        this.connectionHistory.shift();
      }
    }

    this.currentCondition = condition;

    // Update adaptation strategy
    this.updateAdaptationStrategy();

    // Notify listeners
    this.notifyConnectionChange(condition);
  }

  /**
   * Map connection type from various formats
   */
  private mapConnectionType(type: string): NetworkCondition['type'] {
    switch (type?.toLowerCase()) {
      case 'wifi':
      case 'ethernet':
        return 'wifi';
      case '4g':
      case 'lte':
        return '4g';
      case '3g':
        return '3g';
      case '2g':
        return '2g';
      case 'slow-2g':
        return 'slow-2g';
      default:
        return this.currentCondition?.type || '4g';
    }
  }

  /**
   * Determine network quality based on connection metrics
   */
  private determineQuality(connection: any): NetworkCondition['quality'] {
    if (!connection) return 'poor';

    const downlink = connection.downlink || 0;
    const rtt = connection.rtt || 999;
    const effectiveType = connection.effectiveType || '';

    // Offline detection
    if (!navigator.onLine) return 'offline';

    // Quality based on effective type and metrics
    if (effectiveType === '4g' && downlink > 2 && rtt < 100) {
      return 'excellent';
    } else if (
      (effectiveType === '4g' || effectiveType === '3g') &&
      downlink > 0.5 &&
      rtt < 300
    ) {
      return 'good';
    } else {
      return 'poor';
    }
  }

  /**
   * Determine connection stability
   */
  private determineStability(): NetworkCondition['stability'] {
    if (this.connectionHistory.length < 3) return 'stable';

    // Check for recent quality changes
    const recentQualities = this.connectionHistory
      .slice(-3)
      .map((c) => c.quality);
    const uniqueQualities = new Set(recentQualities).size;

    if (uniqueQualities === 1) {
      return 'stable';
    } else if (uniqueQualities === 2) {
      return 'fluctuating';
    } else {
      return 'unstable';
    }
  }

  /**
   * Update adaptation strategy based on current network condition
   */
  private updateAdaptationStrategy(): void {
    if (!this.currentCondition) return;

    const strategy = this.calculateOptimalStrategy(this.currentCondition);
    this.currentStrategy = strategy;

    // Apply strategy immediately
    this.applyAdaptationStrategy(strategy);

    // Notify all registered callbacks
    this.adaptationCallbacks.forEach((callback) => {
      try {
        callback(strategy);
      } catch (error) {
        console.error('Adaptation callback error:', error);
      }
    });
  }

  /**
   * Calculate optimal adaptation strategy
   */
  private calculateOptimalStrategy(
    condition: NetworkCondition,
  ): AdaptationStrategy {
    const baseStrategy = this.getBaseStrategyForCondition(condition);

    // Adjust strategy based on connection stability
    const stabilityAdjustment = this.getStabilityAdjustment(
      condition.stability,
    );

    // Adjust strategy based on save data preference
    const saveDataAdjustment = condition.saveData
      ? this.getSaveDataAdjustment()
      : {};

    return {
      ...baseStrategy,
      ...stabilityAdjustment,
      ...saveDataAdjustment,
    };
  }

  /**
   * Get base strategy for network condition
   */
  private getBaseStrategyForCondition(
    condition: NetworkCondition,
  ): AdaptationStrategy {
    switch (condition.quality) {
      case 'excellent':
        return {
          imageQuality: 'original',
          videoEnabled: true,
          animationsEnabled: true,
          prefetchEnabled: true,
          compressionLevel: 'none',
          maxConcurrentRequests: 6,
          requestTimeout: 10000,
          retryAttempts: 2,
          cachingStrategy: 'normal',
        };

      case 'good':
        return {
          imageQuality: 'high',
          videoEnabled: true,
          animationsEnabled: true,
          prefetchEnabled: true,
          compressionLevel: 'light',
          maxConcurrentRequests: 4,
          requestTimeout: 8000,
          retryAttempts: 3,
          cachingStrategy: 'normal',
        };

      case 'poor':
        return {
          imageQuality: 'medium',
          videoEnabled: false,
          animationsEnabled: false,
          prefetchEnabled: false,
          compressionLevel: 'aggressive',
          maxConcurrentRequests: 2,
          requestTimeout: 15000,
          retryAttempts: 5,
          cachingStrategy: 'aggressive',
        };

      case 'offline':
      default:
        return {
          imageQuality: 'text-only',
          videoEnabled: false,
          animationsEnabled: false,
          prefetchEnabled: false,
          compressionLevel: 'aggressive',
          maxConcurrentRequests: 1,
          requestTimeout: 30000,
          retryAttempts: 8,
          cachingStrategy: 'aggressive',
        };
    }
  }

  /**
   * Get stability-based strategy adjustments
   */
  private getStabilityAdjustment(
    stability: NetworkCondition['stability'],
  ): Partial<AdaptationStrategy> {
    switch (stability) {
      case 'unstable':
        return {
          retryAttempts: 8,
          requestTimeout: 20000,
          maxConcurrentRequests: 1,
          cachingStrategy: 'aggressive' as const,
        };

      case 'fluctuating':
        return {
          retryAttempts: 5,
          requestTimeout: 15000,
          maxConcurrentRequests: 2,
        };

      case 'stable':
      default:
        return {};
    }
  }

  /**
   * Get save data mode adjustments
   */
  private getSaveDataAdjustment(): Partial<AdaptationStrategy> {
    return {
      imageQuality: 'low' as const,
      videoEnabled: false,
      prefetchEnabled: false,
      compressionLevel: 'aggressive' as const,
    };
  }

  /**
   * Apply adaptation strategy to the application
   */
  private applyAdaptationStrategy(strategy: AdaptationStrategy): void {
    // Update document classes for CSS-based adaptations
    document.documentElement.className = document.documentElement.className
      .replace(/network-quality-\w+/g, '')
      .replace(/connection-stability-\w+/g, '');

    if (this.currentCondition) {
      document.documentElement.classList.add(
        `network-quality-${this.currentCondition.quality}`,
      );
      document.documentElement.classList.add(
        `connection-stability-${this.currentCondition.stability}`,
      );
    }

    // Apply image quality settings
    this.updateImageQualitySettings(strategy.imageQuality);

    // Apply animation settings
    this.updateAnimationSettings(strategy.animationsEnabled);

    // Apply caching strategy
    this.updateCachingStrategy(strategy.cachingStrategy);

    // Log strategy change
    console.log('Network adaptation strategy updated:', {
      condition: this.currentCondition,
      strategy,
    });
  }

  /**
   * Update image quality settings throughout the application
   */
  private updateImageQualitySettings(
    quality: AdaptationStrategy['imageQuality'],
  ): void {
    const images = document.querySelectorAll('img[data-adaptive]');

    images.forEach((img: Element) => {
      const htmlImg = img as HTMLImageElement;
      const originalSrc = htmlImg.dataset.originalSrc || htmlImg.src;

      switch (quality) {
        case 'text-only':
          htmlImg.style.display = 'none';
          break;
        case 'low':
          htmlImg.src = this.getOptimizedImageUrl(originalSrc, {
            quality: 30,
            width: 300,
          });
          htmlImg.style.display = '';
          break;
        case 'medium':
          htmlImg.src = this.getOptimizedImageUrl(originalSrc, {
            quality: 60,
            width: 600,
          });
          htmlImg.style.display = '';
          break;
        case 'high':
          htmlImg.src = this.getOptimizedImageUrl(originalSrc, {
            quality: 80,
            width: 1200,
          });
          htmlImg.style.display = '';
          break;
        case 'original':
        default:
          htmlImg.src = originalSrc;
          htmlImg.style.display = '';
          break;
      }
    });
  }

  /**
   * Update animation settings
   */
  private updateAnimationSettings(enabled: boolean): void {
    if (enabled) {
      document.documentElement.classList.remove('reduce-motion');
    } else {
      document.documentElement.classList.add('reduce-motion');
    }
  }

  /**
   * Update caching strategy
   */
  private updateCachingStrategy(
    strategy: AdaptationStrategy['cachingStrategy'],
  ): void {
    // Update cache configuration based on strategy
    const cacheConfig = {
      aggressive: { maxSize: 100 * 1024 * 1024, ttl: 7 * 24 * 60 * 60 * 1000 }, // 100MB, 7 days
      normal: { maxSize: 50 * 1024 * 1024, ttl: 24 * 60 * 60 * 1000 }, // 50MB, 1 day
      minimal: { maxSize: 10 * 1024 * 1024, ttl: 60 * 60 * 1000 }, // 10MB, 1 hour
    };

    // Apply cache configuration (this would integrate with the cache manager)
    console.log(
      `Updating cache strategy to: ${strategy}`,
      cacheConfig[strategy],
    );
  }

  /**
   * Get optimized image URL based on quality settings
   */
  private getOptimizedImageUrl(
    originalUrl: string,
    options: { quality: number; width: number },
  ): string {
    // In production, this would integrate with image optimization service
    if (originalUrl.includes('?')) {
      return `${originalUrl}&w=${options.width}&q=${options.quality}`;
    } else {
      return `${originalUrl}?w=${options.width}&q=${options.quality}`;
    }
  }

  /**
   * Wedding-specific network adaptation
   */
  adaptForWeddingContext(context: WeddingNetworkContext): AdaptationStrategy {
    if (!this.currentStrategy) {
      this.updateNetworkCondition();
    }

    const baseStrategy = this.currentStrategy!;
    const venueProfile =
      MobileNetworkAdapter.VENUE_NETWORK_PROFILES[context.venueType];

    // Adjust strategy based on venue type
    let adaptedStrategy: AdaptationStrategy = { ...baseStrategy };

    // Outdoor/remote venues - more aggressive optimization
    if (context.venueType === 'outdoor' || context.venueType === 'remote') {
      adaptedStrategy = {
        ...adaptedStrategy,
        imageQuality:
          baseStrategy.imageQuality === 'original'
            ? 'high'
            : baseStrategy.imageQuality === 'high'
              ? 'medium'
              : 'low',
        maxConcurrentRequests: Math.min(
          adaptedStrategy.maxConcurrentRequests,
          2,
        ),
        cachingStrategy: 'aggressive',
        retryAttempts: Math.max(adaptedStrategy.retryAttempts, 6),
      };
    }

    // Critical operations during ceremony - prioritize reliability
    if (context.eventPhase === 'ceremony') {
      adaptedStrategy = {
        ...adaptedStrategy,
        retryAttempts: Math.max(adaptedStrategy.retryAttempts, 8),
        requestTimeout: Math.max(adaptedStrategy.requestTimeout, 20000),
        cachingStrategy: 'aggressive',
      };
    }

    // Photographer-specific optimizations
    if (context.supplierRole === 'photographer') {
      adaptedStrategy = {
        ...adaptedStrategy,
        imageQuality:
          adaptedStrategy.imageQuality === 'text-only'
            ? 'low'
            : adaptedStrategy.imageQuality,
      };
    }

    return adaptedStrategy;
  }

  /**
   * Start network quality monitoring through request timing
   */
  private startNetworkQualityMonitoring(): void {
    const testEndpoint = '/api/network-test';

    const runQualityTest = async () => {
      try {
        const startTime = performance.now();
        const response = await fetch(testEndpoint, {
          method: 'HEAD',
          cache: 'no-cache',
        });
        const endTime = performance.now();

        const responseTime = endTime - startTime;
        this.recordNetworkSample(responseTime);
      } catch (error) {
        // Network error - record as poor quality
        this.recordNetworkSample(5000);
      }
    };

    // Test network quality every 30 seconds
    setInterval(runQualityTest, 30000);
  }

  /**
   * Record network quality sample
   */
  private recordNetworkSample(responseTime: number): void {
    this.stabilityMonitor.samples.push(responseTime);

    // Keep only last 10 samples
    if (this.stabilityMonitor.samples.length > 10) {
      this.stabilityMonitor.samples.shift();
    }

    // Update stability assessment
    if (this.currentCondition) {
      this.currentCondition.stability = this.calculateStabilityFromSamples();
      this.updateAdaptationStrategy();
    }
  }

  /**
   * Calculate stability from network samples
   */
  private calculateStabilityFromSamples(): NetworkCondition['stability'] {
    const samples = this.stabilityMonitor.samples;
    if (samples.length < 3) return 'stable';

    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance =
      samples.reduce((acc, sample) => acc + Math.pow(sample - avg, 2), 0) /
      samples.length;
    const coefficient = Math.sqrt(variance) / avg;

    if (coefficient < 0.2) return 'stable';
    if (coefficient < 0.5) return 'fluctuating';
    return 'unstable';
  }

  /**
   * Setup fallback network detection for unsupported browsers
   */
  private initializeFallbackNetworkDetection(): void {
    // Use timing-based detection as fallback
    this.testConnectionSpeed();
  }

  /**
   * Test connection speed as fallback detection method
   */
  private async testConnectionSpeed(): Promise<void> {
    try {
      const testImage = new Image();
      const startTime = performance.now();

      testImage.onload = () => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        // Estimate connection type based on load time
        let estimatedType: NetworkCondition['type'];
        if (loadTime < 200) estimatedType = '4g';
        else if (loadTime < 500) estimatedType = '3g';
        else if (loadTime < 1000) estimatedType = '2g';
        else estimatedType = 'slow-2g';

        this.currentCondition = {
          type: estimatedType,
          downlink: loadTime < 500 ? 2 : loadTime < 1000 ? 0.5 : 0.1,
          uplink: 0,
          rtt: loadTime,
          effectiveType: estimatedType,
          saveData: false,
          quality: loadTime < 500 ? 'good' : loadTime < 1000 ? 'poor' : 'poor',
          stability: 'stable',
        };

        this.updateAdaptationStrategy();
      };

      // Use a small test image (1x1 pixel)
      testImage.src = '/api/network-test.png?' + Date.now();
    } catch (error) {
      // Fallback to offline mode
      this.currentCondition = {
        type: 'offline',
        downlink: 0,
        uplink: 0,
        rtt: 999,
        effectiveType: 'offline',
        saveData: false,
        quality: 'offline',
        stability: 'stable',
      };
    }
  }

  /**
   * Setup connection change event handlers
   */
  private setupConnectionChangeHandlers(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Connection restored');
      this.updateNetworkCondition();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost');
      this.currentCondition = {
        ...this.currentCondition!,
        quality: 'offline',
        type: 'offline',
      };
      this.updateAdaptationStrategy();
    });
  }

  /**
   * Start stability monitoring
   */
  private startStabilityMonitoring(): void {
    this.stabilityMonitor.interval = setInterval(() => {
      if (navigator.onLine) {
        this.testConnectionSpeed();
      }
    }, 15000); // Test every 15 seconds
  }

  /**
   * Notify listeners of connection changes
   */
  private notifyConnectionChange(condition: NetworkCondition): void {
    window.dispatchEvent(
      new CustomEvent('networkchange', {
        detail: {
          condition,
          strategy: this.currentStrategy,
        },
      }),
    );

    // Notify quality change callbacks
    this.qualityChangeCallbacks.forEach((callback) => {
      callback(condition.quality);
    });
  }

  /**
   * Public API methods
   */

  getCurrentCondition(): NetworkCondition | null {
    return this.currentCondition;
  }

  getCurrentStrategy(): AdaptationStrategy | null {
    return this.currentStrategy;
  }

  onAdaptationChange(
    callback: (strategy: AdaptationStrategy) => void,
  ): () => void {
    this.adaptationCallbacks.add(callback);

    // Call immediately with current strategy
    if (this.currentStrategy) {
      callback(this.currentStrategy);
    }

    // Return unsubscribe function
    return () => {
      this.adaptationCallbacks.delete(callback);
    };
  }

  onQualityChange(callback: (quality: string) => void): () => void {
    this.qualityChangeCallbacks.add(callback);

    // Call immediately with current quality
    if (this.currentCondition) {
      callback(this.currentCondition.quality);
    }

    return () => {
      this.qualityChangeCallbacks.delete(callback);
    };
  }

  // Force a specific adaptation strategy (for testing/manual override)
  forceAdaptationStrategy(strategy: AdaptationStrategy): void {
    this.currentStrategy = strategy;
    this.applyAdaptationStrategy(strategy);
  }

  // Reset to automatic adaptation
  resetToAutoAdaptation(): void {
    this.updateNetworkCondition();
  }

  // Clean up resources
  destroy(): void {
    if (this.stabilityMonitor.interval) {
      clearInterval(this.stabilityMonitor.interval);
    }
    this.adaptationCallbacks.clear();
    this.qualityChangeCallbacks.clear();
  }
}

// Export singleton instance
export const mobileNetworkAdapter = new MobileNetworkAdapter();

// React hook for network adaptation
export function useMobileNetworkAdaptation(
  weddingContext?: WeddingNetworkContext,
) {
  const [networkCondition, setNetworkCondition] =
    React.useState<NetworkCondition | null>(null);
  const [adaptationStrategy, setAdaptationStrategy] =
    React.useState<AdaptationStrategy | null>(null);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    // Get initial states
    setNetworkCondition(mobileNetworkAdapter.getCurrentCondition());
    setAdaptationStrategy(mobileNetworkAdapter.getCurrentStrategy());

    // Subscribe to changes
    const unsubscribeAdaptation = mobileNetworkAdapter.onAdaptationChange(
      setAdaptationStrategy,
    );

    const handleNetworkChange = (event: CustomEvent) => {
      setNetworkCondition(event.detail.condition);
      setAdaptationStrategy(event.detail.strategy);
    };

    const handleOnlineChange = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener(
      'networkchange',
      handleNetworkChange as EventListener,
    );
    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);

    return () => {
      unsubscribeAdaptation();
      window.removeEventListener(
        'networkchange',
        handleNetworkChange as EventListener,
      );
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
    };
  }, []);

  // Apply wedding-specific adaptations
  React.useEffect(() => {
    if (weddingContext && adaptationStrategy) {
      const weddingStrategy =
        mobileNetworkAdapter.adaptForWeddingContext(weddingContext);
      if (
        JSON.stringify(weddingStrategy) !== JSON.stringify(adaptationStrategy)
      ) {
        mobileNetworkAdapter.forceAdaptationStrategy(weddingStrategy);
      }
    }
  }, [weddingContext, adaptationStrategy]);

  return {
    networkCondition,
    adaptationStrategy,
    isOnline,
    quality: networkCondition?.quality || 'good',
    connectionType: networkCondition?.type || '4g',
    isSlowConnection:
      networkCondition?.quality === 'poor' ||
      networkCondition?.quality === 'offline',
    forceStrategy:
      mobileNetworkAdapter.forceAdaptationStrategy.bind(mobileNetworkAdapter),
    resetToAuto:
      mobileNetworkAdapter.resetToAutoAdaptation.bind(mobileNetworkAdapter),
  };
}
