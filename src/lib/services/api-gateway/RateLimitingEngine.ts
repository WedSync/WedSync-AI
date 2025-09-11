/**
 * Rate Limiting Engine - Advanced Rate Limiting and Throttling
 * WS-250 - Multi-tier rate limiting with wedding industry optimizations
 */

import {
  RateLimitRule,
  RateLimitStatus,
  ThrottlingConfig,
  VendorTier,
  GatewayRequest,
  WeddingContext,
  EmergencyThrottlingConfig,
  SeasonalConfig,
} from '@/types/api-gateway';

export class RateLimitingEngine {
  private rateLimitRules: Map<string, RateLimitRule> = new Map();
  private requestCounts: Map<string, RequestCounter> = new Map();
  private blockedIPs: Set<string> = new Set();
  private throttlingConfig: ThrottlingConfig;

  // Wedding-specific configurations
  private readonly WEDDING_DAY_MULTIPLIERS: Record<VendorTier, number> = {
    enterprise: 5.0, // 5x more requests on wedding days
    scale: 3.0, // 3x more requests
    professional: 2.0, // 2x more requests
    starter: 1.5, // 1.5x more requests
    free: 1.0, // No increase for free tier
  };

  private readonly PEAK_SEASON_ADJUSTMENTS: Record<VendorTier, number> = {
    enterprise: 2.5,
    scale: 2.0,
    professional: 1.8,
    starter: 1.3,
    free: 1.0,
  };

  private readonly SATURDAY_PROTECTION_PATHS = [
    '/api/weddings/emergency',
    '/api/communications/urgent',
    '/api/vendors/schedule/update',
    '/api/timeline/critical',
    '/api/client-portal/urgent',
  ];

  // Cache for performance
  private ruleCache: Map<string, RateLimitRule> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor(config?: Partial<ThrottlingConfig>) {
    this.throttlingConfig = {
      globalLimit: 10000, // requests per minute globally
      tierLimits: {
        enterprise: 1000, // per minute
        scale: 500,
        professional: 200,
        starter: 100,
        free: 50,
      },
      weddingSaturdayProtection: true,
      peakSeasonAdjustments: {
        enabled: true,
        peakMonths: [5, 6, 7, 8, 9], // May through September
        trafficMultiplier: 1.5,
        additionalCapacity: 50,
      },
      emergencyThrottling: {
        trigger: 85, // CPU percentage
        actionPlan: 'throttle',
        weddingAPIProtection: true,
        alertThreshold: 90,
      },
      ...config,
    };

    this.initializeDefaultRules();
    this.startCleanupService();
    this.startMonitoring();
  }

  /**
   * Check if a request should be allowed or rate limited
   */
  public async checkRateLimit(
    request: GatewayRequest,
  ): Promise<RateLimitStatus> {
    try {
      // Step 1: Check global rate limits
      const globalCheck = await this.checkGlobalLimits();
      if (!globalCheck.allowed) {
        return globalCheck;
      }

      // Step 2: Check IP-based limits
      const ipCheck = await this.checkIPLimits(request.ip);
      if (!ipCheck.allowed) {
        return ipCheck;
      }

      // Step 3: Check vendor tier limits
      const tierCheck = await this.checkTierLimits(request);
      if (!tierCheck.allowed) {
        return tierCheck;
      }

      // Step 4: Check endpoint-specific limits
      const endpointCheck = await this.checkEndpointLimits(request);
      if (!endpointCheck.allowed) {
        return endpointCheck;
      }

      // Step 5: Apply wedding-specific protections
      const weddingCheck = await this.checkWeddingProtections(request);
      if (!weddingCheck.allowed) {
        return weddingCheck;
      }

      // All checks passed - increment counters and allow
      await this.incrementCounters(request);

      return {
        allowed: true,
        remaining: await this.calculateRemaining(request),
        resetTime: await this.getResetTime(request),
        tier: request.vendorContext?.tier || 'free',
      };
    } catch (error) {
      console.error('[RateLimitingEngine] Error checking rate limit:', error);

      // Fail open for critical wedding APIs on error
      if (this.isWeddingCriticalRequest(request)) {
        console.warn(
          '[RateLimitingEngine] Failing open for wedding-critical request due to error',
        );
        return {
          allowed: true,
          remaining: 100,
          resetTime: Date.now() + 60000,
          tier: request.vendorContext?.tier || 'free',
          reason: 'Emergency bypass - rate limiting error',
        };
      }

      throw error;
    }
  }

  /**
   * Add a new rate limiting rule
   */
  public addRule(rule: RateLimitRule): void {
    this.rateLimitRules.set(rule.id, rule);
    this.invalidateRuleCache();

    console.log(
      `[RateLimitingEngine] Added rate limit rule: ${rule.name} (${rule.limit}/${rule.window}s for ${rule.tier})`,
    );
  }

  /**
   * Remove a rate limiting rule
   */
  public removeRule(ruleId: string): void {
    this.rateLimitRules.delete(ruleId);
    this.invalidateRuleCache();

    console.log(`[RateLimitingEngine] Removed rate limit rule: ${ruleId}`);
  }

  /**
   * Update throttling configuration
   */
  public updateConfig(config: Partial<ThrottlingConfig>): void {
    this.throttlingConfig = { ...this.throttlingConfig, ...config };
    console.log('[RateLimitingEngine] Configuration updated');
  }

  /**
   * Get current rate limiting statistics
   */
  public getRateLimitingStats(): RateLimitingStats {
    const totalRules = this.rateLimitRules.size;
    const activeCounters = this.requestCounts.size;
    const blockedIPs = this.blockedIPs.size;

    const currentStats = this.calculateCurrentStats();

    return {
      totalRules,
      activeCounters,
      blockedIPs,
      globalRatePerMinute: currentStats.globalRate,
      tierDistribution: currentStats.tierDistribution,
      topBlockedEndpoints: currentStats.topBlockedEndpoints,
      weddingProtectionActive: this.isWeddingProtectionActive(),
      emergencyThrottlingActive: currentStats.emergencyActive,
      peakSeasonMultiplier: this.getCurrentSeasonMultiplier(),
    };
  }

  /**
   * Block an IP address
   */
  public blockIP(ip: string, duration?: number): void {
    this.blockedIPs.add(ip);

    if (duration) {
      setTimeout(() => {
        this.blockedIPs.delete(ip);
        console.log(`[RateLimitingEngine] Unblocked IP: ${ip}`);
      }, duration);
    }

    console.log(
      `[RateLimitingEngine] Blocked IP: ${ip}${duration ? ` for ${duration}ms` : ' permanently'}`,
    );
  }

  /**
   * Unblock an IP address
   */
  public unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    console.log(`[RateLimitingEngine] Unblocked IP: ${ip}`);
  }

  // ========================================
  // Rate Limiting Check Methods
  // ========================================

  private async checkGlobalLimits(): Promise<RateLimitStatus> {
    const globalCounter = this.getOrCreateCounter('__global__', 60); // 1 minute window
    const currentCount = globalCounter.getCount();
    const limit = this.throttlingConfig.globalLimit;

    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: globalCounter.getResetTime(),
        tier: 'free',
        reason: 'Global rate limit exceeded',
      };
    }

    return {
      allowed: true,
      remaining: limit - currentCount,
      resetTime: globalCounter.getResetTime(),
      tier: 'free',
    };
  }

  private async checkIPLimits(ip: string): Promise<RateLimitStatus> {
    // Check if IP is blocked
    if (this.blockedIPs.has(ip)) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 3600000, // 1 hour
        tier: 'free',
        reason: 'IP address blocked',
      };
    }

    // Check IP-specific rate limits
    const ipCounter = this.getOrCreateCounter(`ip:${ip}`, 60); // 1 minute window
    const ipLimit = 300; // 300 requests per minute per IP
    const currentCount = ipCounter.getCount();

    if (currentCount >= ipLimit) {
      // Auto-block aggressive IPs
      if (currentCount >= ipLimit * 2) {
        this.blockIP(ip, 300000); // Block for 5 minutes
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: ipCounter.getResetTime(),
        tier: 'free',
        reason: 'IP rate limit exceeded',
      };
    }

    return {
      allowed: true,
      remaining: ipLimit - currentCount,
      resetTime: ipCounter.getResetTime(),
      tier: 'free',
    };
  }

  private async checkTierLimits(
    request: GatewayRequest,
  ): Promise<RateLimitStatus> {
    const tier = request.vendorContext?.tier || 'free';
    const baseLimit = this.throttlingConfig.tierLimits[tier];

    // Apply wedding day multipliers
    let adjustedLimit = baseLimit;
    if (this.isSaturday() && request.weddingContext?.isWeddingCritical) {
      adjustedLimit *= this.WEDDING_DAY_MULTIPLIERS[tier];
    }

    // Apply seasonal adjustments
    if (this.isPeakWeddingSeason()) {
      adjustedLimit *= this.PEAK_SEASON_ADJUSTMENTS[tier];
    }

    const tierKey = `tier:${tier}:${request.vendorContext?.vendorId || 'anonymous'}`;
    const tierCounter = this.getOrCreateCounter(tierKey, 60); // 1 minute window
    const currentCount = tierCounter.getCount();

    if (currentCount >= adjustedLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: tierCounter.getResetTime(),
        tier,
        reason: `${tier} tier limit exceeded`,
      };
    }

    return {
      allowed: true,
      remaining: Math.floor(adjustedLimit - currentCount),
      resetTime: tierCounter.getResetTime(),
      tier,
    };
  }

  private async checkEndpointLimits(
    request: GatewayRequest,
  ): Promise<RateLimitStatus> {
    const matchingRule = this.findMatchingRule(request);

    if (!matchingRule || !matchingRule.enabled) {
      return {
        allowed: true,
        remaining: 1000,
        resetTime: Date.now() + 60000,
        tier: 'free',
      };
    }

    const endpointKey = `endpoint:${matchingRule.pattern}:${request.vendorContext?.vendorId || request.ip}`;
    const endpointCounter = this.getOrCreateCounter(
      endpointKey,
      matchingRule.window,
    );
    const currentCount = endpointCounter.getCount();

    let adjustedLimit = matchingRule.limit;

    // Apply wedding day multiplier
    if (this.isSaturday() && request.weddingContext?.isWeddingCritical) {
      adjustedLimit *= matchingRule.weddingDayMultiplier;
    }

    // Apply seasonal adjustment
    if (this.isPeakWeddingSeason()) {
      adjustedLimit *= matchingRule.seasonalAdjustment;
    }

    if (currentCount >= adjustedLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: endpointCounter.getResetTime(),
        tier: matchingRule.tier,
        reason: `Endpoint rate limit exceeded (${matchingRule.name})`,
      };
    }

    return {
      allowed: true,
      remaining: Math.floor(adjustedLimit - currentCount),
      resetTime: endpointCounter.getResetTime(),
      tier: matchingRule.tier,
    };
  }

  private async checkWeddingProtections(
    request: GatewayRequest,
  ): Promise<RateLimitStatus> {
    if (
      !this.throttlingConfig.weddingSaturdayProtection ||
      !this.isSaturday()
    ) {
      return {
        allowed: true,
        remaining: 1000,
        resetTime: Date.now() + 60000,
        tier: 'free',
      };
    }

    // Enhanced protection for wedding-critical paths on Saturdays
    const isProtectedPath = this.SATURDAY_PROTECTION_PATHS.some((path) =>
      request.path.startsWith(path.replace('*', '')),
    );

    if (isProtectedPath) {
      // More strict limits for protected paths
      const protectionKey = `saturday:${request.path}:${request.vendorContext?.vendorId || request.ip}`;
      const protectionCounter = this.getOrCreateCounter(protectionKey, 300); // 5 minute window
      const protectionLimit = request.vendorContext?.tier === 'free' ? 5 : 20;

      const currentCount = protectionCounter.getCount();

      if (currentCount >= protectionLimit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: protectionCounter.getResetTime(),
          tier: request.vendorContext?.tier || 'free',
          reason: 'Saturday wedding protection - rate limit exceeded',
        };
      }
    }

    return {
      allowed: true,
      remaining: 1000,
      resetTime: Date.now() + 60000,
      tier: 'free',
    };
  }

  // ========================================
  // Helper Methods
  // ========================================

  private findMatchingRule(request: GatewayRequest): RateLimitRule | null {
    const cacheKey = `${request.method}:${request.path}:${request.vendorContext?.tier}`;
    const cached = this.ruleCache.get(cacheKey);

    if (cached && Date.now() - cached.createdAt.getTime() < this.CACHE_TTL) {
      return cached;
    }

    // Find matching rule
    for (const rule of this.rateLimitRules.values()) {
      if (
        this.matchesPattern(request.path, rule.pattern) &&
        (rule.tier === 'free' || rule.tier === request.vendorContext?.tier)
      ) {
        this.ruleCache.set(cacheKey, rule);
        return rule;
      }
    }

    return null;
  }

  private matchesPattern(path: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/:\w+/g, '[^/]+');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  private getOrCreateCounter(
    key: string,
    windowSeconds: number,
  ): RequestCounter {
    let counter = this.requestCounts.get(key);

    if (!counter) {
      counter = new RequestCounter(windowSeconds);
      this.requestCounts.set(key, counter);
    }

    return counter;
  }

  private async incrementCounters(request: GatewayRequest): Promise<void> {
    // Increment global counter
    const globalCounter = this.getOrCreateCounter('__global__', 60);
    globalCounter.increment();

    // Increment IP counter
    const ipCounter = this.getOrCreateCounter(`ip:${request.ip}`, 60);
    ipCounter.increment();

    // Increment tier counter
    const tier = request.vendorContext?.tier || 'free';
    const tierKey = `tier:${tier}:${request.vendorContext?.vendorId || 'anonymous'}`;
    const tierCounter = this.getOrCreateCounter(tierKey, 60);
    tierCounter.increment();

    // Increment endpoint counter if rule exists
    const rule = this.findMatchingRule(request);
    if (rule) {
      const endpointKey = `endpoint:${rule.pattern}:${request.vendorContext?.vendorId || request.ip}`;
      const endpointCounter = this.getOrCreateCounter(endpointKey, rule.window);
      endpointCounter.increment();
    }
  }

  private async calculateRemaining(request: GatewayRequest): Promise<number> {
    const tier = request.vendorContext?.tier || 'free';
    const tierLimit = this.throttlingConfig.tierLimits[tier];
    const tierKey = `tier:${tier}:${request.vendorContext?.vendorId || 'anonymous'}`;
    const tierCounter = this.getOrCreateCounter(tierKey, 60);

    return Math.max(0, tierLimit - tierCounter.getCount());
  }

  private async getResetTime(request: GatewayRequest): Promise<number> {
    const tier = request.vendorContext?.tier || 'free';
    const tierKey = `tier:${tier}:${request.vendorContext?.vendorId || 'anonymous'}`;
    const tierCounter = this.getOrCreateCounter(tierKey, 60);

    return tierCounter.getResetTime();
  }

  private initializeDefaultRules(): void {
    const defaultRules: RateLimitRule[] = [
      {
        id: 'api-general',
        name: 'General API',
        pattern: '/api/*',
        tier: 'free',
        limit: 50,
        window: 60,
        burstLimit: 10,
        weddingDayMultiplier: 1.0,
        seasonalAdjustment: 1.0,
        enabled: true,
        createdAt: new Date(),
      },
      {
        id: 'wedding-critical',
        name: 'Wedding Critical APIs',
        pattern: '/api/weddings/*',
        tier: 'starter',
        limit: 100,
        window: 60,
        burstLimit: 20,
        weddingDayMultiplier: 2.0,
        seasonalAdjustment: 1.5,
        enabled: true,
        createdAt: new Date(),
      },
      {
        id: 'payment-processing',
        name: 'Payment Processing',
        pattern: '/api/payments/*',
        tier: 'professional',
        limit: 30,
        window: 60,
        burstLimit: 5,
        weddingDayMultiplier: 1.5,
        seasonalAdjustment: 1.2,
        enabled: true,
        createdAt: new Date(),
      },
    ];

    defaultRules.forEach((rule) => this.addRule(rule));
  }

  private isWeddingCriticalRequest(request: GatewayRequest): boolean {
    return (
      request.weddingContext?.isWeddingCritical ||
      this.SATURDAY_PROTECTION_PATHS.some((path) =>
        request.path.startsWith(path.replace('*', '')),
      )
    );
  }

  private isSaturday(): boolean {
    return new Date().getDay() === 6;
  }

  private isPeakWeddingSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    return this.throttlingConfig.peakSeasonAdjustments.peakMonths.includes(
      currentMonth,
    );
  }

  private isWeddingProtectionActive(): boolean {
    return (
      this.throttlingConfig.weddingSaturdayProtection &&
      (this.isSaturday() || this.isPeakWeddingSeason())
    );
  }

  private getCurrentSeasonMultiplier(): number {
    if (!this.isPeakWeddingSeason()) return 1.0;
    return this.throttlingConfig.peakSeasonAdjustments.trafficMultiplier;
  }

  private calculateCurrentStats(): CurrentStats {
    let globalRate = 0;
    const tierDistribution: Record<VendorTier, number> = {
      enterprise: 0,
      scale: 0,
      professional: 0,
      starter: 0,
      free: 0,
    };

    // Calculate stats from counters
    for (const [key, counter] of this.requestCounts.entries()) {
      if (key === '__global__') {
        globalRate = counter.getCount();
      } else if (key.startsWith('tier:')) {
        const tierMatch = key.match(/tier:(\w+):/);
        if (tierMatch) {
          const tier = tierMatch[1] as VendorTier;
          tierDistribution[tier] += counter.getCount();
        }
      }
    }

    return {
      globalRate,
      tierDistribution,
      topBlockedEndpoints: [], // Would be calculated from actual blocked requests
      emergencyActive: false, // Would check system resources
    };
  }

  private invalidateRuleCache(): void {
    this.ruleCache.clear();
  }

  private startCleanupService(): void {
    // Clean up old counters every 5 minutes
    setInterval(() => {
      this.cleanupOldCounters();
    }, 300000);
  }

  private cleanupOldCounters(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, counter] of this.requestCounts.entries()) {
      if (counter.isExpired(now)) {
        this.requestCounts.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `[RateLimitingEngine] Cleaned up ${cleanedCount} expired counters`,
      );
    }
  }

  private startMonitoring(): void {
    // Monitor rate limiting every minute
    setInterval(() => {
      const stats = this.getRateLimitingStats();
      console.log(
        `[RateLimitingEngine] Stats - Rules: ${stats.totalRules}, Active: ${stats.activeCounters}, Blocked IPs: ${stats.blockedIPs}, Global Rate: ${stats.globalRatePerMinute}/min`,
      );

      if (stats.weddingProtectionActive) {
        console.log('[RateLimitingEngine] Wedding protection is ACTIVE');
      }
    }, 60000);
  }
}

// ========================================
// Supporting Classes
// ========================================

class RequestCounter {
  private requests: number[] = [];
  private readonly windowMs: number;

  constructor(windowSeconds: number) {
    this.windowMs = windowSeconds * 1000;
  }

  increment(): void {
    const now = Date.now();
    this.requests.push(now);
    this.cleanup(now);
  }

  getCount(): number {
    this.cleanup(Date.now());
    return this.requests.length;
  }

  getResetTime(): number {
    if (this.requests.length === 0) {
      return Date.now() + this.windowMs;
    }
    return this.requests[0] + this.windowMs;
  }

  isExpired(now: number): boolean {
    this.cleanup(now);
    return this.requests.length === 0;
  }

  private cleanup(now: number): void {
    const cutoff = now - this.windowMs;
    this.requests = this.requests.filter((time) => time > cutoff);
  }
}

// Supporting interfaces
interface RateLimitingStats {
  totalRules: number;
  activeCounters: number;
  blockedIPs: number;
  globalRatePerMinute: number;
  tierDistribution: Record<VendorTier, number>;
  topBlockedEndpoints: string[];
  weddingProtectionActive: boolean;
  emergencyThrottlingActive: boolean;
  peakSeasonMultiplier: number;
}

interface CurrentStats {
  globalRate: number;
  tierDistribution: Record<VendorTier, number>;
  topBlockedEndpoints: string[];
  emergencyActive: boolean;
}

// Singleton instance
export const rateLimitingEngine = new RateLimitingEngine();
