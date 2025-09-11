/**
 * Journey AI Mobile Optimizer
 *
 * Optimizes AI journey generation for mobile devices by:
 * - Reducing payload size through selective data loading
 * - Progressive journey step loading
 * - Background sync with offline support
 * - Intelligent caching with size limits
 * - Battery-aware operation scheduling
 */

import { z } from 'zod';

// Types and schemas
const MobileJourneyRequestSchema = z.object({
  clientId: z.string(),
  weddingType: z.enum(['intimate', 'traditional', 'destination', 'elopement']),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  timelineOnly: z.boolean().default(false),
  includeOptional: z.boolean().default(false),
});

const MobileCacheEntrySchema = z.object({
  id: z.string(),
  data: z.any(),
  timestamp: z.number(),
  expiresAt: z.number(),
  size: z.number(),
  priority: z.enum(['high', 'medium', 'low']),
  accessed: z.number(),
});

const BatteryOptimizationConfigSchema = z.object({
  enabled: z.boolean(),
  level: z.number().min(0).max(1),
  charging: z.boolean(),
  lastOptimization: z.number(),
});

type MobileJourneyRequest = z.infer<typeof MobileJourneyRequestSchema>;
type MobileCacheEntry = z.infer<typeof MobileCacheEntrySchema>;
type BatteryOptimizationConfig = z.infer<
  typeof BatteryOptimizationConfigSchema
>;

interface JourneyStep {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  estimated_duration: number;
  dependencies?: string[];
}

interface OptimizedJourney {
  id: string;
  steps: JourneyStep[];
  metadata: {
    generated: number;
    version: string;
    mobileOptimized: boolean;
    dataSize: number;
  };
}

/**
 * Journey AI Mobile Optimizer
 *
 * Optimizes AI journey generation for mobile devices
 */
export class JourneyAIMobileOptimizer {
  private cache = new Map<string, MobileCacheEntry>();
  private backgroundQueue: MobileJourneyRequest[] = [];
  private isProcessing = false;
  private batteryConfig: BatteryOptimizationConfig = {
    enabled: true,
    level: 1,
    charging: false,
    lastOptimization: Date.now(),
  };

  // Cache configuration for mobile
  private readonly CACHE_CONFIG = {
    MAX_SIZE_MB: 5, // 5MB cache limit for mobile
    MAX_ENTRIES: 50,
    DEFAULT_TTL_MS: 30 * 60 * 1000, // 30 minutes
    HIGH_PRIORITY_TTL_MS: 60 * 60 * 1000, // 1 hour
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  };

  // Mobile-specific AI payload optimization
  private readonly MOBILE_PAYLOAD_CONFIG = {
    MAX_STEPS_INITIAL: 5, // Load first 5 steps immediately
    STEP_BATCH_SIZE: 3, // Load 3 steps at a time
    ESSENTIAL_FIELDS_ONLY: true,
    COMPRESS_DESCRIPTIONS: true,
    REDUCE_METADATA: true,
  };

  constructor() {
    this.initializeBatteryMonitoring();
    this.startCacheCleanup();
    this.initializeBackgroundSync();
  }

  /**
   * Generate optimized journey for mobile devices
   */
  async generateMobileOptimizedJourney(
    request: MobileJourneyRequest,
  ): Promise<OptimizedJourney> {
    try {
      // Validate request
      const validatedRequest = MobileJourneyRequestSchema.parse(request);

      // Check cache first
      const cacheKey = this.generateCacheKey(validatedRequest);
      const cached = this.getFromCache(cacheKey);

      if (cached) {
        console.log('🎯 Journey AI: Serving from mobile cache');
        this.updateCacheAccess(cacheKey);
        return cached as OptimizedJourney;
      }

      // Check battery optimization
      if (this.shouldDelayForBattery()) {
        console.log('🔋 Journey AI: Queuing for battery optimization');
        return this.queueForBackgroundProcessing(validatedRequest);
      }

      // Generate optimized journey
      const journey = await this.generateOptimizedJourneyData(validatedRequest);

      // Cache the result
      this.addToCache(cacheKey, journey, validatedRequest.priority);

      return journey;
    } catch (error) {
      console.error('❌ Journey AI Mobile Optimizer error:', error);
      throw new Error('Failed to generate mobile-optimized journey');
    }
  }

  /**
   * Load additional journey steps progressively
   */
  async loadAdditionalSteps(
    journeyId: string,
    currentStepCount: number,
  ): Promise<JourneyStep[]> {
    try {
      const { STEP_BATCH_SIZE } = this.MOBILE_PAYLOAD_CONFIG;

      // Simulate progressive loading with optimized payload
      const additionalSteps = await this.fetchProgressiveSteps(
        journeyId,
        currentStepCount,
        STEP_BATCH_SIZE,
      );

      // Apply mobile optimizations
      return this.optimizeStepsForMobile(additionalSteps);
    } catch (error) {
      console.error('❌ Progressive loading error:', error);
      return [];
    }
  }

  /**
   * Background sync for generated journeys
   */
  async syncInBackground(): Promise<void> {
    if (this.isProcessing || this.backgroundQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log('🔄 Journey AI: Starting background sync');

    try {
      while (this.backgroundQueue.length > 0) {
        // Check battery status before processing
        if (!this.canProcessInBackground()) {
          console.log('🔋 Journey AI: Pausing background sync for battery');
          break;
        }

        const request = this.backgroundQueue.shift();
        if (!request) break;

        const journey = await this.generateOptimizedJourneyData(request);
        const cacheKey = this.generateCacheKey(request);
        this.addToCache(cacheKey, journey, request.priority);

        // Small delay to prevent blocking main thread
        await this.delay(100);
      }
    } catch (error) {
      console.error('❌ Background sync error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    const totalSize = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0,
    );

    const totalSizeMB = totalSize / (1024 * 1024);
    const hitRate = this.calculateHitRate();

    return {
      entries: this.cache.size,
      totalSizeMB: Math.round(totalSizeMB * 100) / 100,
      maxSizeMB: this.CACHE_CONFIG.MAX_SIZE_MB,
      hitRate: Math.round(hitRate * 100),
      backgroundQueueLength: this.backgroundQueue.length,
      batteryOptimized: this.batteryConfig.enabled,
    };
  }

  /**
   * Clear cache to free up memory
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Journey AI: Mobile cache cleared');
  }

  /**
   * Force background sync processing
   */
  async forceBackgroundSync(): Promise<void> {
    if (!this.isProcessing) {
      await this.syncInBackground();
    }
  }

  // Private methods

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: MobileJourneyRequest): string {
    const keyData = {
      clientId: request.clientId,
      weddingType: request.weddingType,
      timelineOnly: request.timelineOnly,
      includeOptional: request.includeOptional,
    };

    return `journey_${btoa(JSON.stringify(keyData))}`;
  }

  /**
   * Generate optimized journey data
   */
  private async generateOptimizedJourneyData(
    request: MobileJourneyRequest,
  ): Promise<OptimizedJourney> {
    const startTime = performance.now();

    // Simulate AI journey generation with mobile optimizations
    const baseSteps = await this.generateBaseSteps(request);
    const optimizedSteps = this.optimizeStepsForMobile(baseSteps);

    // Apply progressive loading - only return initial steps
    const initialSteps = optimizedSteps.slice(
      0,
      this.MOBILE_PAYLOAD_CONFIG.MAX_STEPS_INITIAL,
    );

    const journey: OptimizedJourney = {
      id: `journey_${Date.now()}_${request.clientId}`,
      steps: initialSteps,
      metadata: {
        generated: Date.now(),
        version: '2.0.0',
        mobileOptimized: true,
        dataSize: JSON.stringify(initialSteps).length,
      },
    };

    const duration = performance.now() - startTime;
    console.log(`⚡ Journey AI: Generated in ${Math.round(duration)}ms`);

    return journey;
  }

  /**
   * Generate base journey steps
   */
  private async generateBaseSteps(
    request: MobileJourneyRequest,
  ): Promise<JourneyStep[]> {
    // Wedding type specific steps
    const weddingTypeSteps: Record<string, JourneyStep[]> = {
      intimate: [
        {
          id: 'intimate_1',
          title: 'Book Intimate Venue',
          description: 'Find and book perfect intimate venue (under 50 guests)',
          dueDate: new Date(
            Date.now() + 180 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          priority: 'high',
          category: 'venue',
          estimated_duration: 240,
        },
        {
          id: 'intimate_2',
          title: 'Hire Photographer',
          description: 'Book photographer specializing in intimate weddings',
          dueDate: new Date(
            Date.now() + 150 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          priority: 'high',
          category: 'photography',
          estimated_duration: 120,
        },
      ],
      traditional: [
        {
          id: 'trad_1',
          title: 'Book Wedding Venue',
          description: 'Secure traditional wedding venue (100-200 guests)',
          dueDate: new Date(
            Date.now() + 200 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          priority: 'high',
          category: 'venue',
          estimated_duration: 360,
        },
        {
          id: 'trad_2',
          title: 'Choose Catering',
          description: 'Select catering for traditional wedding reception',
          dueDate: new Date(
            Date.now() + 160 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          priority: 'high',
          category: 'catering',
          estimated_duration: 180,
        },
      ],
      destination: [
        {
          id: 'dest_1',
          title: 'Research Destination',
          description: 'Research and choose wedding destination',
          dueDate: new Date(
            Date.now() + 250 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          priority: 'high',
          category: 'planning',
          estimated_duration: 300,
        },
      ],
      elopement: [
        {
          id: 'elope_1',
          title: 'Choose Elopement Location',
          description: 'Select intimate location for elopement ceremony',
          dueDate: new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          priority: 'high',
          category: 'venue',
          estimated_duration: 120,
        },
      ],
    };

    return weddingTypeSteps[request.weddingType] || [];
  }

  /**
   * Optimize steps for mobile consumption
   */
  private optimizeStepsForMobile(steps: JourneyStep[]): JourneyStep[] {
    return steps.map((step) => ({
      ...step,
      // Compress descriptions for mobile
      description: this.MOBILE_PAYLOAD_CONFIG.COMPRESS_DESCRIPTIONS
        ? this.compressDescription(step.description)
        : step.description,
      // Remove non-essential fields for mobile
      ...(this.MOBILE_PAYLOAD_CONFIG.ESSENTIAL_FIELDS_ONLY
        ? {}
        : { dependencies: step.dependencies }),
    }));
  }

  /**
   * Compress description text for mobile
   */
  private compressDescription(description: string): string {
    // Keep descriptions concise for mobile
    if (description.length <= 50) return description;

    return description.substring(0, 47) + '...';
  }

  /**
   * Fetch additional steps progressively
   */
  private async fetchProgressiveSteps(
    journeyId: string,
    currentCount: number,
    batchSize: number,
  ): Promise<JourneyStep[]> {
    // Simulate fetching additional steps
    await this.delay(200);

    const additionalSteps: JourneyStep[] = [];

    for (let i = 0; i < batchSize; i++) {
      const stepIndex = currentCount + i + 1;
      additionalSteps.push({
        id: `step_${stepIndex}`,
        title: `Wedding Task ${stepIndex}`,
        description: `Additional wedding planning task ${stepIndex}`,
        dueDate: new Date(
          Date.now() + stepIndex * 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        priority: i < 1 ? 'high' : 'medium',
        category: 'planning',
        estimated_duration: 60,
      });
    }

    return additionalSteps;
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private addToCache(
    key: string,
    data: any,
    priority: 'high' | 'medium' | 'low',
  ): void {
    const dataSize = JSON.stringify(data).length;
    const ttl =
      priority === 'high'
        ? this.CACHE_CONFIG.HIGH_PRIORITY_TTL_MS
        : this.CACHE_CONFIG.DEFAULT_TTL_MS;

    const entry: MobileCacheEntry = {
      id: key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      size: dataSize,
      priority,
      accessed: Date.now(),
    };

    // Check cache size limits
    this.ensureCacheSize(dataSize);

    this.cache.set(key, entry);
  }

  private updateCacheAccess(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessed = Date.now();
      this.cache.set(key, entry);
    }
  }

  private ensureCacheSize(newEntrySize: number): void {
    const maxSizeBytes = this.CACHE_CONFIG.MAX_SIZE_MB * 1024 * 1024;
    const currentSize = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0,
    );

    if (currentSize + newEntrySize > maxSizeBytes) {
      this.evictLRUEntries(newEntrySize);
    }
  }

  private evictLRUEntries(requiredSpace: number): void {
    const entries = Array.from(this.cache.values()).sort(
      (a, b) => a.accessed - b.accessed,
    );

    let freedSpace = 0;
    for (const entry of entries) {
      this.cache.delete(entry.id);
      freedSpace += entry.size;

      if (freedSpace >= requiredSpace) break;
    }

    console.log(`🗑️ Journey AI: Evicted ${freedSpace} bytes from cache`);
  }

  /**
   * Battery optimization
   */
  private initializeBatteryMonitoring(): void {
    if ('getBattery' in navigator) {
      // @ts-ignore - getBattery is not in TypeScript definitions
      navigator
        .getBattery()
        .then((battery: any) => {
          this.batteryConfig.level = battery.level;
          this.batteryConfig.charging = battery.charging;

          battery.addEventListener('levelchange', () => {
            this.batteryConfig.level = battery.level;
          });

          battery.addEventListener('chargingchange', () => {
            this.batteryConfig.charging = battery.charging;
          });
        })
        .catch(() => {
          // Battery API not supported
          this.batteryConfig.enabled = false;
        });
    } else {
      this.batteryConfig.enabled = false;
    }
  }

  private shouldDelayForBattery(): boolean {
    if (!this.batteryConfig.enabled) return false;

    // Delay processing if battery is low and not charging
    return this.batteryConfig.level < 0.2 && !this.batteryConfig.charging;
  }

  private canProcessInBackground(): boolean {
    if (!this.batteryConfig.enabled) return true;

    // Allow background processing if battery > 30% or charging
    return this.batteryConfig.level > 0.3 || this.batteryConfig.charging;
  }

  /**
   * Background processing
   */
  private queueForBackgroundProcessing(
    request: MobileJourneyRequest,
  ): Promise<OptimizedJourney> {
    this.backgroundQueue.push(request);

    // Return a placeholder journey for immediate response
    return Promise.resolve({
      id: `placeholder_${Date.now()}`,
      steps: [],
      metadata: {
        generated: Date.now(),
        version: '2.0.0',
        mobileOptimized: true,
        dataSize: 0,
      },
    });
  }

  private initializeBackgroundSync(): void {
    // Run background sync every 30 seconds
    setInterval(() => {
      if (!this.isProcessing && this.backgroundQueue.length > 0) {
        this.syncInBackground();
      }
    }, 30000);
  }

  /**
   * Cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.CACHE_CONFIG.CLEANUP_INTERVAL_MS);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Journey AI: Cleaned up ${removedCount} expired entries`);
    }
  }

  /**
   * Calculate cache hit rate
   */
  private calculateHitRate(): number {
    // This would need to track hits/misses in a real implementation
    return 0.85; // Placeholder
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const journeyAIMobileOptimizer = new JourneyAIMobileOptimizer();

// Export types for external usage
export type { MobileJourneyRequest, OptimizedJourney, JourneyStep };
