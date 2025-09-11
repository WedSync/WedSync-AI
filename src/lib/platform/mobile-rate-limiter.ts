'use client';

/**
 * Mobile-Optimized Rate Limiter for Wedding Coordination
 * Handles poor connectivity, battery optimization, and wedding day priorities
 */

interface NetworkCondition {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface RateLimitRequest {
  endpoint: string;
  userId: string;
  weddingDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  retryAttempts?: number;
  timestamp: number;
}

interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  resetTime: number;
  retryAfter?: number;
  networkOptimized: boolean;
  batteryOptimized: boolean;
}

interface MobileRateLimitConfig {
  enableNetworkAdaptation: boolean;
  enableBatteryOptimization: boolean;
  enableOfflineQueue: boolean;
  enableWeddingPriority: boolean;
  pollInterval: number;
  maxRetryAttempts: number;
  cacheSize: number;
}

export class MobileRateLimiter {
  private static instance: MobileRateLimiter;
  private cache: Map<string, RateLimitResult> = new Map();
  private requestQueue: RateLimitRequest[] = [];
  private networkCondition: NetworkCondition | null = null;
  private batteryLevel: number = 1.0;
  private isCharging: boolean = false;
  private config: MobileRateLimitConfig;
  private performanceMetrics = {
    requestCount: 0,
    cacheHits: 0,
    networkRequests: 0,
    averageResponseTime: 0,
    batteryUsage: 0,
  };

  private constructor(config: Partial<MobileRateLimitConfig> = {}) {
    this.config = {
      enableNetworkAdaptation: true,
      enableBatteryOptimization: true,
      enableOfflineQueue: true,
      enableWeddingPriority: true,
      pollInterval: 30000, // 30 seconds
      maxRetryAttempts: 3,
      cacheSize: 100,
      ...config,
    };

    this.initializeNetworkMonitoring();
    this.initializeBatteryMonitoring();
    this.setupPerformanceMonitoring();
  }

  static getInstance(
    config?: Partial<MobileRateLimitConfig>,
  ): MobileRateLimiter {
    if (!MobileRateLimiter.instance) {
      MobileRateLimiter.instance = new MobileRateLimiter(config);
    }
    return MobileRateLimiter.instance;
  }

  /**
   * Check rate limit with mobile optimizations
   */
  async checkRateLimit(request: RateLimitRequest): Promise<RateLimitResult> {
    const startTime = performance.now();
    this.performanceMetrics.requestCount++;

    try {
      // Check cache first for performance
      const cacheKey = this.getCacheKey(request);
      const cached = this.getCachedResult(cacheKey);

      if (cached && this.isCacheValid(cached)) {
        this.performanceMetrics.cacheHits++;
        return this.applyMobileOptimizations(cached);
      }

      // Determine if we should make network request based on conditions
      if (!this.shouldMakeNetworkRequest()) {
        return this.handleOfflineMode(request);
      }

      // Make optimized network request
      const result = await this.makeOptimizedRequest(request);

      // Cache result with mobile-appropriate TTL
      this.cacheResult(cacheKey, result);

      // Update performance metrics
      const responseTime = performance.now() - startTime;
      this.updatePerformanceMetrics(responseTime);

      return this.applyMobileOptimizations(result);
    } catch (error) {
      console.error('Mobile rate limit check failed:', error);
      return this.handleErrorScenario(request, error);
    }
  }

  /**
   * Queue request for when network improves
   */
  async queueRequest(request: RateLimitRequest): Promise<void> {
    if (!this.config.enableOfflineQueue) return;

    // Add wedding priority boost
    if (this.isWeddingDay(request.weddingDate)) {
      request.priority = 'critical';
    }

    // Insert in priority order
    const insertIndex = this.findInsertPosition(request);
    this.requestQueue.splice(insertIndex, 0, request);

    // Limit queue size for memory efficiency
    if (this.requestQueue.length > 50) {
      this.requestQueue = this.requestQueue.slice(0, 50);
    }

    this.scheduleQueueProcessing();
  }

  /**
   * Process queued requests when conditions improve
   */
  async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0) return;
    if (!this.shouldMakeNetworkRequest()) return;

    const batchSize = this.getBatchSizeForConditions();
    const batch = this.requestQueue.splice(0, batchSize);

    for (const request of batch) {
      try {
        await this.checkRateLimit(request);
        await this.delay(100); // Prevent overwhelming the server
      } catch (error) {
        // Re-queue failed requests with incremented retry count
        if ((request.retryAttempts || 0) < this.config.maxRetryAttempts) {
          request.retryAttempts = (request.retryAttempts || 0) + 1;
          await this.queueRequest(request);
        }
      }
    }
  }

  /**
   * Initialize network condition monitoring
   */
  private initializeNetworkMonitoring(): void {
    if (!this.config.enableNetworkAdaptation) return;
    if (typeof navigator === 'undefined' || !('connection' in navigator))
      return;

    const connection = (navigator as any).connection;

    const updateNetworkInfo = () => {
      this.networkCondition = {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false,
      };
    };

    connection.addEventListener('change', updateNetworkInfo);
    updateNetworkInfo();
  }

  /**
   * Initialize battery monitoring
   */
  private initializeBatteryMonitoring(): void {
    if (!this.config.enableBatteryOptimization) return;
    if (typeof navigator === 'undefined' || !('getBattery' in navigator))
      return;

    (navigator as any).getBattery?.().then((battery: any) => {
      const updateBatteryInfo = () => {
        this.batteryLevel = battery.level;
        this.isCharging = battery.charging;
        this.adjustBehaviorForBattery();
      };

      battery.addEventListener('levelchange', updateBatteryInfo);
      battery.addEventListener('chargingchange', updateBatteryInfo);
      updateBatteryInfo();
    });
  }

  /**
   * Apply mobile-specific optimizations to rate limit results
   */
  private applyMobileOptimizations(result: RateLimitResult): RateLimitResult {
    const optimized = { ...result };

    // Network-based adjustments
    if (this.networkCondition) {
      if (
        this.networkCondition.effectiveType === '2g' ||
        this.networkCondition.effectiveType === 'slow-2g'
      ) {
        // More generous limits for slow networks to account for retries
        optimized.limit = Math.floor(optimized.limit * 1.2);
        optimized.networkOptimized = true;
      }

      if (this.networkCondition.saveData) {
        // Reduce polling for data saver mode
        optimized.resetTime = optimized.resetTime + 5 * 60 * 1000; // +5 minutes
      }
    }

    // Battery-based adjustments
    if (this.batteryLevel < 0.2 && !this.isCharging) {
      // Conservative limits when battery is low
      optimized.limit = Math.floor(optimized.limit * 0.8);
      optimized.batteryOptimized = true;
    }

    return optimized;
  }

  /**
   * Determine if network request should be made
   */
  private shouldMakeNetworkRequest(): boolean {
    // Always allow if network adaptation is disabled
    if (!this.config.enableNetworkAdaptation) return true;

    // Check network conditions
    if (this.networkCondition) {
      if (this.networkCondition.effectiveType === 'slow-2g') return false;
      if (this.networkCondition.rtt > 2000) return false; // 2+ second latency
    }

    // Check battery conditions
    if (this.config.enableBatteryOptimization) {
      if (this.batteryLevel < 0.1 && !this.isCharging) return false;
    }

    return true;
  }

  /**
   * Handle offline mode gracefully
   */
  private handleOfflineMode(request: RateLimitRequest): RateLimitResult {
    // Allow limited functionality in offline mode
    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return {
        ...cached,
        allowed: true, // Allow cached operations
        networkOptimized: true,
        batteryOptimized: true,
      };
    }

    // Default offline allowance for critical operations
    return {
      allowed: request.priority === 'critical',
      current: 0,
      limit: request.priority === 'critical' ? 10 : 1,
      resetTime: Date.now() + 60 * 60 * 1000,
      networkOptimized: true,
      batteryOptimized: true,
    };
  }

  /**
   * Make network request with mobile optimizations
   */
  private async makeOptimizedRequest(
    request: RateLimitRequest,
  ): Promise<RateLimitResult> {
    this.performanceMetrics.networkRequests++;

    const controller = new AbortController();
    const timeout = this.getTimeoutForNetworkConditions();

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch('/api/rate-limit/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: request.endpoint,
          userId: request.userId,
          priority: request.priority,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.limit || data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Cache management with mobile memory constraints
   */
  private cacheResult(key: string, result: RateLimitResult): void {
    // Implement LRU cache with size limit
    if (this.cache.size >= this.config.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      ...result,
      timestamp: Date.now(),
    } as any);
  }

  private getCachedResult(key: string): RateLimitResult | null {
    return this.cache.get(key) || null;
  }

  private isCacheValid(
    result: RateLimitResult & { timestamp?: number },
  ): boolean {
    if (!result.timestamp) return false;

    const maxAge = this.getCacheMaxAge();
    return Date.now() - result.timestamp < maxAge;
  }

  private getCacheMaxAge(): number {
    // Shorter cache for poor network conditions
    if (this.networkCondition?.effectiveType === '2g') return 60000; // 1 minute
    if (this.networkCondition?.effectiveType === '3g') return 120000; // 2 minutes
    return 300000; // 5 minutes for good connections
  }

  /**
   * Wedding-specific optimizations
   */
  private isWeddingDay(weddingDate?: Date): boolean {
    if (!weddingDate) return false;

    const today = new Date();
    const diffTime = Math.abs(weddingDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 1; // Wedding day or day before
  }

  private findInsertPosition(request: RateLimitRequest): number {
    const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
    const requestPriority = priorities[request.priority];

    for (let i = 0; i < this.requestQueue.length; i++) {
      const queuedPriority = priorities[this.requestQueue[i].priority];
      if (requestPriority > queuedPriority) {
        return i;
      }
    }

    return this.requestQueue.length;
  }

  /**
   * Performance and battery optimization
   */
  private adjustBehaviorForBattery(): void {
    if (this.batteryLevel < 0.2 && !this.isCharging) {
      // Reduce polling frequency
      this.config.pollInterval = Math.max(this.config.pollInterval * 2, 120000);
    } else if (this.batteryLevel > 0.5 || this.isCharging) {
      // Normal polling frequency
      this.config.pollInterval = 30000;
    }
  }

  private getBatchSizeForConditions(): number {
    if (!this.networkCondition) return 3;

    switch (this.networkCondition.effectiveType) {
      case 'slow-2g':
        return 1;
      case '2g':
        return 2;
      case '3g':
        return 3;
      case '4g':
        return 5;
      default:
        return 3;
    }
  }

  private getTimeoutForNetworkConditions(): number {
    if (!this.networkCondition) return 10000; // 10 seconds default

    switch (this.networkCondition.effectiveType) {
      case 'slow-2g':
        return 30000; // 30 seconds
      case '2g':
        return 20000; // 20 seconds
      case '3g':
        return 15000; // 15 seconds
      case '4g':
        return 10000; // 10 seconds
      default:
        return 10000;
    }
  }

  private async scheduleQueueProcessing(): void {
    // Use requestIdleCallback for battery efficiency
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => this.processQueue(), { timeout: 5000 });
    } else {
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private updatePerformanceMetrics(responseTime: number): void {
    this.performanceMetrics.averageResponseTime =
      (this.performanceMetrics.averageResponseTime *
        (this.performanceMetrics.requestCount - 1) +
        responseTime) /
      this.performanceMetrics.requestCount;
  }

  private setupPerformanceMonitoring(): void {
    // Monitor memory usage
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > 20 * 1024 * 1024) {
          // 20MB warning
          console.warn('High memory usage detected, clearing cache');
          this.cache.clear();
        }
      }, 60000); // Check every minute
    }
  }

  private handleErrorScenario(
    request: RateLimitRequest,
    error: any,
  ): RateLimitResult {
    console.error('Rate limit error:', error);

    // Graceful degradation
    return {
      allowed: request.priority === 'critical',
      current: 0,
      limit: 1,
      resetTime: Date.now() + 60 * 1000, // 1 minute
      networkOptimized: false,
      batteryOptimized: false,
    };
  }

  private getCacheKey(request: RateLimitRequest): string {
    return `${request.endpoint}:${request.userId}`;
  }

  /**
   * Public API for getting performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.cache.size,
      queueSize: this.requestQueue.length,
      networkCondition: this.networkCondition,
      batteryLevel: this.batteryLevel,
      isCharging: this.isCharging,
    };
  }

  /**
   * Clear cache and reset metrics
   */
  reset(): void {
    this.cache.clear();
    this.requestQueue = [];
    this.performanceMetrics = {
      requestCount: 0,
      cacheHits: 0,
      networkRequests: 0,
      averageResponseTime: 0,
      batteryUsage: 0,
    };
  }
}

// Export singleton instance
export const mobileRateLimiter = MobileRateLimiter.getInstance();
