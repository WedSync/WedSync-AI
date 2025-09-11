/**
 * WS-173 Team D Round 2: Wedding Mobile Caching Strategies
 *
 * Specialized caching strategies for wedding supplier mobile workflows
 * Optimizes for poor venue connectivity and real-time coordination needs
 */

import React from 'react';
import {
  cacheManager,
  type CacheStrategy,
} from '../performance/advanced-cache-manager';
import {
  mobileNetworkAdapter,
  type NetworkCondition,
} from '../network/mobile-network-adapter';

export interface WeddingCacheContext {
  weddingId: string;
  supplierRole: 'photographer' | 'coordinator' | 'vendor' | 'officiant';
  eventPhase:
    | 'preparation'
    | 'ceremony'
    | 'reception'
    | 'cleanup'
    | 'completed';
  venueConnectivity: 'excellent' | 'good' | 'poor' | 'intermittent';
  criticalOperations: string[];
  expectedDuration: number; // in milliseconds
}

export interface MobileCachePolicy {
  name: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  storage: 'memory' | 'persistent' | 'hybrid';
  ttl: number;
  maxSize: number;
  evictionStrategy: 'lru' | 'priority-based' | 'wedding-context';
  networkFallback: boolean;
  compressionLevel: 'none' | 'light' | 'aggressive';
  revalidation: 'stale-while-revalidate' | 'cache-first' | 'network-first';
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  storage: {
    memory: { used: number; available: number };
    persistent: { used: number; available: number };
  };
  networkRequests: {
    total: number;
    cached: number;
    fresh: number;
    failed: number;
  };
}

class WeddingMobileCacheManager {
  private cachePolicies: Map<string, MobileCachePolicy> = new Map();
  private cacheMetrics: CacheMetrics;
  private weddingContext: WeddingCacheContext | null = null;
  private networkCondition: NetworkCondition | null = null;
  private activePhaseStartTime: number = Date.now();

  // Wedding-specific cache policies optimized for mobile
  private static WEDDING_CACHE_POLICIES: Record<string, MobileCachePolicy> = {
    // CRITICAL - Must be available offline
    'emergency-contacts': {
      name: 'emergency-contacts',
      priority: 'critical',
      storage: 'persistent',
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 10 * 1024, // 10KB
      evictionStrategy: 'wedding-context',
      networkFallback: false,
      compressionLevel: 'none',
      revalidation: 'cache-first',
    },
    'wedding-basic-info': {
      name: 'wedding-basic-info',
      priority: 'critical',
      storage: 'persistent',
      ttl: 12 * 60 * 60 * 1000, // 12 hours
      maxSize: 50 * 1024, // 50KB
      evictionStrategy: 'wedding-context',
      networkFallback: true,
      compressionLevel: 'light',
      revalidation: 'stale-while-revalidate',
    },
    'venue-layout': {
      name: 'venue-layout',
      priority: 'critical',
      storage: 'persistent',
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxSize: 500 * 1024, // 500KB
      evictionStrategy: 'priority-based',
      networkFallback: true,
      compressionLevel: 'aggressive',
      revalidation: 'cache-first',
    },

    // HIGH - Important for live coordination
    'photo-groups-active': {
      name: 'photo-groups-active',
      priority: 'high',
      storage: 'hybrid',
      ttl: 30 * 60 * 1000, // 30 minutes
      maxSize: 2 * 1024 * 1024, // 2MB
      evictionStrategy: 'lru',
      networkFallback: true,
      compressionLevel: 'light',
      revalidation: 'stale-while-revalidate',
    },
    'guest-assignments-current': {
      name: 'guest-assignments-current',
      priority: 'high',
      storage: 'hybrid',
      ttl: 15 * 60 * 1000, // 15 minutes
      maxSize: 200 * 1024, // 200KB
      evictionStrategy: 'wedding-context',
      networkFallback: true,
      compressionLevel: 'light',
      revalidation: 'network-first',
    },
    'supplier-contacts': {
      name: 'supplier-contacts',
      priority: 'high',
      storage: 'persistent',
      ttl: 2 * 60 * 60 * 1000, // 2 hours
      maxSize: 100 * 1024, // 100KB
      evictionStrategy: 'priority-based',
      networkFallback: true,
      compressionLevel: 'light',
      revalidation: 'cache-first',
    },
    'timeline-current': {
      name: 'timeline-current',
      priority: 'high',
      storage: 'memory',
      ttl: 10 * 60 * 1000, // 10 minutes
      maxSize: 50 * 1024, // 50KB
      evictionStrategy: 'wedding-context',
      networkFallback: true,
      compressionLevel: 'none',
      revalidation: 'network-first',
    },

    // NORMAL - Standard operations
    'photo-thumbnails': {
      name: 'photo-thumbnails',
      priority: 'normal',
      storage: 'persistent',
      ttl: 60 * 60 * 1000, // 1 hour
      maxSize: 5 * 1024 * 1024, // 5MB
      evictionStrategy: 'lru',
      networkFallback: false,
      compressionLevel: 'aggressive',
      revalidation: 'cache-first',
    },
    'seating-arrangements': {
      name: 'seating-arrangements',
      priority: 'normal',
      storage: 'hybrid',
      ttl: 45 * 60 * 1000, // 45 minutes
      maxSize: 1024 * 1024, // 1MB
      evictionStrategy: 'priority-based',
      networkFallback: true,
      compressionLevel: 'light',
      revalidation: 'stale-while-revalidate',
    },
    'communication-history': {
      name: 'communication-history',
      priority: 'normal',
      storage: 'persistent',
      ttl: 4 * 60 * 60 * 1000, // 4 hours
      maxSize: 512 * 1024, // 512KB
      evictionStrategy: 'lru',
      networkFallback: false,
      compressionLevel: 'light',
      revalidation: 'cache-first',
    },

    // LOW - Background data
    'analytics-data': {
      name: 'analytics-data',
      priority: 'low',
      storage: 'memory',
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 100 * 1024, // 100KB
      evictionStrategy: 'lru',
      networkFallback: false,
      compressionLevel: 'aggressive',
      revalidation: 'cache-first',
    },
    'historical-data': {
      name: 'historical-data',
      priority: 'low',
      storage: 'persistent',
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxSize: 200 * 1024, // 200KB
      evictionStrategy: 'lru',
      networkFallback: false,
      compressionLevel: 'aggressive',
      revalidation: 'cache-first',
    },
  };

  // Role-specific cache priorities
  private static ROLE_CACHE_PRIORITIES = {
    photographer: [
      'photo-groups-active',
      'photo-thumbnails',
      'wedding-basic-info',
      'timeline-current',
      'venue-layout',
    ],
    coordinator: [
      'timeline-current',
      'supplier-contacts',
      'guest-assignments-current',
      'wedding-basic-info',
      'communication-history',
    ],
    vendor: [
      'wedding-basic-info',
      'timeline-current',
      'supplier-contacts',
      'communication-history',
      'seating-arrangements',
    ],
    officiant: [
      'wedding-basic-info',
      'timeline-current',
      'emergency-contacts',
      'venue-layout',
      'guest-assignments-current',
    ],
  };

  constructor() {
    this.cacheMetrics = {
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      storage: {
        memory: { used: 0, available: 50 * 1024 * 1024 }, // 50MB
        persistent: { used: 0, available: 200 * 1024 * 1024 }, // 200MB
      },
      networkRequests: {
        total: 0,
        cached: 0,
        fresh: 0,
        failed: 0,
      },
    };

    this.initializeCachePolicies();
    this.setupNetworkIntegration();
    this.startCacheOptimization();
  }

  /**
   * Initialize cache policies
   */
  private initializeCachePolicies(): void {
    Object.values(WeddingMobileCacheManager.WEDDING_CACHE_POLICIES).forEach(
      (policy) => {
        this.cachePolicies.set(policy.name, policy);
      },
    );

    console.log(
      'Wedding mobile cache policies initialized:',
      this.cachePolicies.size,
      'policies',
    );
  }

  /**
   * Setup integration with network adapter
   */
  private setupNetworkIntegration(): void {
    mobileNetworkAdapter.onAdaptationChange((strategy) => {
      this.adaptCacheForNetworkConditions(strategy);
    });

    mobileNetworkAdapter.onQualityChange((quality) => {
      this.adjustCachePoliciesForQuality(quality);
    });
  }

  /**
   * Start cache optimization background process
   */
  private startCacheOptimization(): void {
    // Optimize cache every 5 minutes
    setInterval(
      () => {
        this.optimizeCacheForCurrentContext();
      },
      5 * 60 * 1000,
    );

    // Update metrics every minute
    setInterval(() => {
      this.updateCacheMetrics();
    }, 60 * 1000);
  }

  /**
   * Set wedding context and optimize cache accordingly
   */
  setWeddingContext(context: WeddingCacheContext): void {
    this.weddingContext = context;
    this.activePhaseStartTime = Date.now();

    // Reconfigure cache for new context
    this.reconfigureCacheForContext(context);

    // Preload critical data for this context
    this.preloadCriticalDataForContext(context);
  }

  /**
   * Reconfigure cache policies for wedding context
   */
  private reconfigureCacheForContext(context: WeddingCacheContext): void {
    const rolePriorities =
      WeddingMobileCacheManager.ROLE_CACHE_PRIORITIES[context.supplierRole];

    // Adjust cache sizes based on event phase
    this.adjustCacheSizesForPhase(context.eventPhase);

    // Adjust TTL based on venue connectivity
    this.adjustTTLForConnectivity(context.venueConnectivity);

    // Prioritize role-specific cache entries
    this.prioritizeRoleSpecificCache(rolePriorities);

    // Configure phase-specific optimizations
    this.configurePhaseSpecificOptimizations(context);
  }

  /**
   * Adjust cache sizes based on event phase
   */
  private adjustCacheSizesForPhase(
    phase: WeddingCacheContext['eventPhase'],
  ): void {
    const phaseMultipliers = {
      preparation: 0.8,
      ceremony: 1.5,
      reception: 1.2,
      cleanup: 0.7,
      completed: 0.5,
    };

    const multiplier = phaseMultipliers[phase];

    this.cachePolicies.forEach((policy, key) => {
      if (policy.priority === 'critical' || policy.priority === 'high') {
        const adjustedSize = Math.floor(policy.maxSize * multiplier);
        this.cachePolicies.set(key, { ...policy, maxSize: adjustedSize });
      }
    });
  }

  /**
   * Adjust TTL based on venue connectivity
   */
  private adjustTTLForConnectivity(
    connectivity: WeddingCacheContext['venueConnectivity'],
  ): void {
    const connectivityMultipliers = {
      excellent: 0.5, // Shorter TTL for fast revalidation
      good: 0.8,
      poor: 2.0, // Longer TTL to reduce network requests
      intermittent: 3.0, // Much longer TTL for unreliable connections
    };

    const multiplier = connectivityMultipliers[connectivity];

    this.cachePolicies.forEach((policy, key) => {
      const adjustedTTL = Math.floor(policy.ttl * multiplier);
      this.cachePolicies.set(key, { ...policy, ttl: adjustedTTL });
    });
  }

  /**
   * Prioritize role-specific cache entries
   */
  private prioritizeRoleSpecificCache(priorities: string[]): void {
    priorities.forEach((cacheKey, index) => {
      const policy = this.cachePolicies.get(cacheKey);
      if (policy) {
        // Adjust priority based on role importance
        const adjustedPolicy = {
          ...policy,
          ttl: policy.ttl * (1 + (priorities.length - index) * 0.2), // Longer TTL for higher priority
          maxSize: policy.maxSize * (1 + (priorities.length - index) * 0.1), // Larger size for higher priority
        };
        this.cachePolicies.set(cacheKey, adjustedPolicy);
      }
    });
  }

  /**
   * Configure phase-specific optimizations
   */
  private configurePhaseSpecificOptimizations(
    context: WeddingCacheContext,
  ): void {
    switch (context.eventPhase) {
      case 'ceremony':
        // Critical phase - maximize cache persistence
        this.enableCeremonyMode();
        break;
      case 'reception':
        // High activity - balance performance and freshness
        this.enableReceptionMode();
        break;
      case 'preparation':
        // Setup phase - preload everything
        this.enablePreparationMode();
        break;
      case 'cleanup':
        // Winding down - conserve resources
        this.enableCleanupMode();
        break;
    }
  }

  /**
   * Phase-specific cache mode configurations
   */
  private enableCeremonyMode(): void {
    // Switch all high-priority caches to persistent storage
    [
      'photo-groups-active',
      'timeline-current',
      'guest-assignments-current',
    ].forEach((key) => {
      const policy = this.cachePolicies.get(key);
      if (policy) {
        this.cachePolicies.set(key, {
          ...policy,
          storage: 'persistent',
          revalidation: 'cache-first',
          ttl: policy.ttl * 2,
        });
      }
    });
  }

  private enableReceptionMode(): void {
    // Balance between fresh data and performance
    ['photo-groups-active', 'seating-arrangements'].forEach((key) => {
      const policy = this.cachePolicies.get(key);
      if (policy) {
        this.cachePolicies.set(key, {
          ...policy,
          revalidation: 'stale-while-revalidate',
          ttl: Math.floor(policy.ttl * 0.7),
        });
      }
    });
  }

  private enablePreparationMode(): void {
    // Aggressive preloading
    this.cachePolicies.forEach((policy, key) => {
      if (policy.priority === 'critical' || policy.priority === 'high') {
        this.cachePolicies.set(key, {
          ...policy,
          maxSize: policy.maxSize * 1.5,
          ttl: policy.ttl * 1.3,
        });
      }
    });
  }

  private enableCleanupMode(): void {
    // Reduce cache footprint
    this.cachePolicies.forEach((policy, key) => {
      if (policy.priority === 'normal' || policy.priority === 'low') {
        this.cachePolicies.set(key, {
          ...policy,
          maxSize: Math.floor(policy.maxSize * 0.5),
          ttl: Math.floor(policy.ttl * 0.6),
        });
      }
    });
  }

  /**
   * Preload critical data for wedding context
   */
  private async preloadCriticalDataForContext(
    context: WeddingCacheContext,
  ): Promise<void> {
    const rolePriorities =
      WeddingMobileCacheManager.ROLE_CACHE_PRIORITIES[context.supplierRole];
    const criticalData = rolePriorities.slice(0, 3); // Top 3 priorities

    for (const dataType of criticalData) {
      try {
        await this.preloadData(dataType, context);
      } catch (error) {
        console.warn(`Failed to preload ${dataType}:`, error);
      }
    }
  }

  /**
   * Preload specific data type
   */
  private async preloadData(
    dataType: string,
    context: WeddingCacheContext,
  ): Promise<void> {
    const policy = this.cachePolicies.get(dataType);
    if (!policy) return;

    const cacheKey = `${context.weddingId}-${dataType}`;
    const existing = await cacheManager.get(cacheKey);

    if (!existing) {
      try {
        const url = this.getDataURL(dataType, context);
        const response = await fetch(url);
        const data = await response.json();

        const cacheStrategy: CacheStrategy = {
          type:
            policy.storage === 'memory'
              ? 'memory'
              : policy.storage === 'persistent'
                ? 'persistent'
                : 'hybrid',
          ttl: policy.ttl,
          priority: this.mapPriorityToNumber(policy.priority),
          compression: policy.compressionLevel !== 'none',
        };

        await cacheManager.set(cacheKey, data, cacheStrategy);
        console.log(`Preloaded ${dataType} for ${context.supplierRole}`);
      } catch (error) {
        console.error(`Failed to preload ${dataType}:`, error);
      }
    }
  }

  /**
   * Get data URL for specific data type
   */
  private getDataURL(dataType: string, context: WeddingCacheContext): string {
    const baseURL = `/api/wedding/${context.weddingId}`;

    const urlMap: Record<string, string> = {
      'wedding-basic-info': `${baseURL}/info`,
      'emergency-contacts': `${baseURL}/emergency-contacts`,
      'venue-layout': `${baseURL}/venue-layout`,
      'photo-groups-active': `${baseURL}/photo-groups/active`,
      'guest-assignments-current': `${baseURL}/guests/assignments`,
      'supplier-contacts': `${baseURL}/suppliers/contacts`,
      'timeline-current': `${baseURL}/timeline/current`,
      'photo-thumbnails': `${baseURL}/photos/thumbnails`,
      'seating-arrangements': `${baseURL}/seating/current`,
      'communication-history': `${baseURL}/communication/recent`,
    };

    return urlMap[dataType] || `${baseURL}/${dataType}`;
  }

  /**
   * Map priority string to number
   */
  private mapPriorityToNumber(priority: MobileCachePolicy['priority']): number {
    const priorityMap = { critical: 10, high: 8, normal: 5, low: 2 };
    return priorityMap[priority];
  }

  /**
   * Adapt cache for network conditions
   */
  private adaptCacheForNetworkConditions(strategy: any): void {
    if (strategy.cachingStrategy === 'aggressive') {
      // Poor network - maximize caching
      this.enableAggressiveCaching();
    } else if (strategy.cachingStrategy === 'minimal') {
      // Good network - reduce caching overhead
      this.enableMinimalCaching();
    }
  }

  /**
   * Enable aggressive caching for poor networks
   */
  private enableAggressiveCaching(): void {
    this.cachePolicies.forEach((policy, key) => {
      this.cachePolicies.set(key, {
        ...policy,
        storage: 'persistent',
        ttl: policy.ttl * 3,
        maxSize: policy.maxSize * 2,
        revalidation: 'cache-first',
      });
    });
  }

  /**
   * Enable minimal caching for good networks
   */
  private enableMinimalCaching(): void {
    this.cachePolicies.forEach((policy, key) => {
      if (policy.priority === 'normal' || policy.priority === 'low') {
        this.cachePolicies.set(key, {
          ...policy,
          storage: 'memory',
          ttl: Math.floor(policy.ttl * 0.5),
          revalidation: 'network-first',
        });
      }
    });
  }

  /**
   * Adjust cache policies based on network quality
   */
  private adjustCachePoliciesForQuality(quality: string): void {
    const qualityMultipliers = {
      excellent: { ttl: 0.5, size: 0.8 },
      good: { ttl: 0.8, size: 1.0 },
      poor: { ttl: 2.0, size: 1.5 },
      offline: { ttl: 10.0, size: 2.0 },
    };

    const multiplier = qualityMultipliers[
      quality as keyof typeof qualityMultipliers
    ] || { ttl: 1.0, size: 1.0 };

    this.cachePolicies.forEach((policy, key) => {
      this.cachePolicies.set(key, {
        ...policy,
        ttl: Math.floor(policy.ttl * multiplier.ttl),
        maxSize: Math.floor(policy.maxSize * multiplier.size),
      });
    });
  }

  /**
   * Optimize cache for current context
   */
  private optimizeCacheForCurrentContext(): void {
    if (!this.weddingContext) return;

    // Clean up expired entries
    this.cleanupExpiredEntries();

    // Rebalance cache based on usage patterns
    this.rebalanceCacheBasedOnUsage();

    // Preload predicted next-phase data
    this.preloadPredictedData();
  }

  /**
   * Cleanup expired cache entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    // Use the cache manager's cleanup functionality
    await cacheManager.cleanupExpiredEntries();

    // Update metrics
    this.updateCacheMetrics();
  }

  /**
   * Rebalance cache based on usage patterns
   */
  private rebalanceCacheBasedOnUsage(): void {
    // Analyze cache hit rates and adjust policies
    const metrics = cacheManager.getMetrics?.() || {};

    // Increase cache size for high-hit-rate entries
    // Decrease cache size for low-hit-rate entries
    Object.entries(metrics).forEach(([key, metric]: [string, any]) => {
      const policy = this.cachePolicies.get(key);
      if (policy && metric.hitRate !== undefined) {
        const adjustment =
          metric.hitRate > 0.8 ? 1.2 : metric.hitRate < 0.3 ? 0.8 : 1.0;
        this.cachePolicies.set(key, {
          ...policy,
          maxSize: Math.floor(policy.maxSize * adjustment),
        });
      }
    });
  }

  /**
   * Preload predicted data for next phase
   */
  private async preloadPredictedData(): Promise<void> {
    if (!this.weddingContext) return;

    const nextPhase = this.predictNextPhase();
    if (nextPhase) {
      const nextContext = { ...this.weddingContext, eventPhase: nextPhase };
      await this.preloadCriticalDataForContext(nextContext);
    }
  }

  /**
   * Predict next wedding phase
   */
  private predictNextPhase(): WeddingCacheContext['eventPhase'] | null {
    if (!this.weddingContext) return null;

    const currentPhase = this.weddingContext.eventPhase;
    const phaseProgression: WeddingCacheContext['eventPhase'][] = [
      'preparation',
      'ceremony',
      'reception',
      'cleanup',
      'completed',
    ];

    const currentIndex = phaseProgression.indexOf(currentPhase);
    return currentIndex < phaseProgression.length - 1
      ? phaseProgression[currentIndex + 1]
      : null;
  }

  /**
   * Update cache metrics
   */
  private updateCacheMetrics(): void {
    // Get metrics from cache manager if available
    const managerMetrics = cacheManager.getMetrics?.() || {};

    // Update internal metrics
    this.cacheMetrics = {
      ...this.cacheMetrics,
      // Update with actual metrics from cache manager
      hitRate: this.calculateAverageHitRate(managerMetrics),
      missRate: 1 - this.calculateAverageHitRate(managerMetrics),
      averageResponseTime: this.calculateAverageResponseTime(managerMetrics),
    };

    // Report metrics
    this.reportCacheMetrics();
  }

  /**
   * Calculate average hit rate from metrics
   */
  private calculateAverageHitRate(metrics: any): number {
    const hitRates = Object.values(metrics)
      .map((m: any) => m.hitRate)
      .filter((rate): rate is number => typeof rate === 'number');

    return hitRates.length > 0
      ? hitRates.reduce((a, b) => a + b, 0) / hitRates.length
      : 0;
  }

  /**
   * Calculate average response time from metrics
   */
  private calculateAverageResponseTime(metrics: any): number {
    const responseTimes = Object.values(metrics)
      .map((m: any) => m.averageTime)
      .filter((time): time is number => typeof time === 'number');

    return responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  }

  /**
   * Report cache metrics
   */
  private reportCacheMetrics(): void {
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(
        '/api/analytics/cache-metrics',
        JSON.stringify({
          metrics: this.cacheMetrics,
          context: this.weddingContext,
          timestamp: Date.now(),
        }),
      );
    }
  }

  /**
   * Public API methods
   */

  getCachePolicy(dataType: string): MobileCachePolicy | null {
    return this.cachePolicies.get(dataType) || null;
  }

  setCachePolicy(dataType: string, policy: MobileCachePolicy): void {
    this.cachePolicies.set(dataType, policy);
  }

  getCacheMetrics(): CacheMetrics {
    return this.cacheMetrics;
  }

  async clearCacheForPhase(
    phase: WeddingCacheContext['eventPhase'],
  ): Promise<void> {
    // Clear phase-specific cache entries
    const phaseCacheKeys = Array.from(this.cachePolicies.keys()).filter(
      (key) => key.includes(phase) || this.isPhaseSpecificData(key, phase),
    );

    for (const key of phaseCacheKeys) {
      await cacheManager.delete?.(key);
    }
  }

  private isPhaseSpecificData(
    dataType: string,
    phase: WeddingCacheContext['eventPhase'],
  ): boolean {
    const phaseDataMapping = {
      preparation: ['venue-layout', 'supplier-contacts'],
      ceremony: ['timeline-current', 'photo-groups-active'],
      reception: ['seating-arrangements', 'photo-groups-active'],
      cleanup: ['communication-history'],
      completed: ['analytics-data', 'historical-data'],
    };

    return phaseDataMapping[phase]?.includes(dataType) || false;
  }

  async preWarmCache(context: WeddingCacheContext): Promise<void> {
    this.setWeddingContext(context);
    await this.preloadCriticalDataForContext(context);
  }

  optimizeCacheForBattery(): void {
    // Reduce cache operations for battery optimization
    this.cachePolicies.forEach((policy, key) => {
      this.cachePolicies.set(key, {
        ...policy,
        storage: policy.storage === 'hybrid' ? 'memory' : policy.storage,
        compressionLevel: 'light', // Reduce CPU usage
      });
    });
  }
}

// Export singleton instance
export const weddingMobileCacheManager = new WeddingMobileCacheManager();

// React hook for wedding cache management
export function useWeddingMobileCache(context?: WeddingCacheContext) {
  const [cacheMetrics, setCacheMetrics] = React.useState<CacheMetrics | null>(
    null,
  );
  const [activePolicies, setActivePolicies] = React.useState<
    Map<string, MobileCachePolicy>
  >(new Map());

  React.useEffect(() => {
    if (context) {
      weddingMobileCacheManager.setWeddingContext(context);
    }

    // Update metrics periodically
    const updateMetrics = () => {
      setCacheMetrics(weddingMobileCacheManager.getCacheMetrics());
    };

    const interval = setInterval(updateMetrics, 30000); // Every 30 seconds
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [context]);

  const clearPhaseCache = React.useCallback(
    async (phase: WeddingCacheContext['eventPhase']) => {
      await weddingMobileCacheManager.clearCacheForPhase(phase);
    },
    [],
  );

  const preWarmCache = React.useCallback(
    async (newContext: WeddingCacheContext) => {
      await weddingMobileCacheManager.preWarmCache(newContext);
    },
    [],
  );

  const optimizeForBattery = React.useCallback(() => {
    weddingMobileCacheManager.optimizeCacheForBattery();
  }, []);

  return {
    cacheMetrics,
    activePolicies,
    clearPhaseCache,
    preWarmCache,
    optimizeForBattery,
    hitRate: cacheMetrics?.hitRate || 0,
    isOptimized: cacheMetrics?.hitRate ? cacheMetrics.hitRate > 0.7 : false,
  };
}
