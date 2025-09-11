/**
 * WS-222: Custom Domains System - Domain Cache Manager
 * Team D - Performance Optimization & Mobile Optimization
 *
 * Advanced DNS resolution caching with mobile optimization
 */

import { createClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';

interface DomainConfig {
  id: string;
  domain: string;
  subdomain?: string;
  organizationId: string;
  sslCertificate?: SSLCertificate;
  status: 'active' | 'pending' | 'failed' | 'expired';
  verificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SSLCertificate {
  certificateId: string;
  domain: string;
  issuer: string;
  expiresAt: Date;
  status: 'valid' | 'expired' | 'revoked';
  autoRenew: boolean;
}

interface DomainResolution {
  domain: string;
  ipAddress: string;
  ttl: number;
  resolvedAt: Date;
  responseTime: number;
  source: 'cache' | 'dns' | 'fallback';
}

interface CacheStats {
  hitRate: number;
  missRate: number;
  avgResponseTime: number;
  totalRequests: number;
  cacheSize: number;
  lastCleanup: Date;
}

class DomainCache {
  private redis: Redis;
  private memoryCache: Map<string, DomainResolution>;
  private stats: CacheStats;
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MEMORY_CACHE_SIZE = 1000;
  private readonly DNS_TIMEOUT = 5000; // 5 seconds

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.memoryCache = new Map();
    this.stats = {
      hitRate: 0,
      missRate: 0,
      avgResponseTime: 0,
      totalRequests: 0,
      cacheSize: 0,
      lastCleanup: new Date(),
    };

    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  /**
   * Resolve domain with multi-tier caching strategy
   * Priority: Memory Cache -> Redis -> DNS -> Fallback
   */
  async resolveDomain(domain: string): Promise<DomainResolution> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Tier 1: Memory cache (fastest)
      const memoryResult = this.getFromMemoryCache(domain);
      if (memoryResult) {
        this.updateStats('hit', Date.now() - startTime);
        return memoryResult;
      }

      // Tier 2: Redis cache
      const redisResult = await this.getFromRedisCache(domain);
      if (redisResult) {
        this.setMemoryCache(domain, redisResult);
        this.updateStats('hit', Date.now() - startTime);
        return redisResult;
      }

      // Tier 3: DNS resolution
      const dnsResult = await this.performDnsResolution(domain);
      if (dnsResult) {
        await this.setCaches(domain, dnsResult);
        this.updateStats('miss', Date.now() - startTime);
        return dnsResult;
      }

      // Tier 4: Fallback
      const fallbackResult = this.getFallbackResolution(domain);
      this.updateStats('miss', Date.now() - startTime);
      return fallbackResult;
    } catch (error) {
      console.error(`Domain resolution failed for ${domain}:`, error);
      const fallbackResult = this.getFallbackResolution(domain);
      this.updateStats('miss', Date.now() - startTime);
      return fallbackResult;
    }
  }

  /**
   * Mobile-optimized batch resolution for multiple domains
   */
  async resolveDomainsBatch(
    domains: string[],
  ): Promise<Map<string, DomainResolution>> {
    const results = new Map<string, DomainResolution>();

    // Process in mobile-friendly chunks (5 at a time to prevent timeout)
    const chunkSize = 5;

    for (let i = 0; i < domains.length; i += chunkSize) {
      const chunk = domains.slice(i, i + chunkSize);
      const chunkPromises = chunk.map((domain) =>
        this.resolveDomain(domain).then((result) => ({ domain, result })),
      );

      try {
        const chunkResults = await Promise.allSettled(chunkPromises);
        chunkResults.forEach((settled) => {
          if (settled.status === 'fulfilled') {
            results.set(settled.value.domain, settled.value.result);
          }
        });
      } catch (error) {
        console.error('Batch resolution error:', error);
      }

      // Small delay between chunks for mobile networks
      if (i + chunkSize < domains.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Preload domains for mobile optimization
   */
  async preloadDomains(organizationId: string): Promise<void> {
    try {
      const domains = await this.getOrganizationDomains(organizationId);
      const activeDomains = domains
        .filter((d) => d.status === 'active')
        .map((d) => d.domain);

      if (activeDomains.length > 0) {
        await this.resolveDomainsBatch(activeDomains);
      }
    } catch (error) {
      console.error('Domain preload failed:', error);
    }
  }

  /**
   * Get cache performance statistics
   */
  getCacheStats(): CacheStats {
    const totalHits =
      this.stats.totalRequests - this.stats.totalRequests * this.stats.missRate;
    this.stats.hitRate =
      this.stats.totalRequests > 0 ? totalHits / this.stats.totalRequests : 0;
    this.stats.cacheSize = this.memoryCache.size;

    return { ...this.stats };
  }

  /**
   * Clear domain from all cache layers
   */
  async invalidateDomain(domain: string): Promise<void> {
    this.memoryCache.delete(domain);
    await this.redis.del(`domain:${domain}`);
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    this.memoryCache.clear();
    const keys = await this.redis.keys('domain:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    this.stats = {
      hitRate: 0,
      missRate: 0,
      avgResponseTime: 0,
      totalRequests: 0,
      cacheSize: 0,
      lastCleanup: new Date(),
    };
  }

  // Private methods

  private getFromMemoryCache(domain: string): DomainResolution | null {
    const cached = this.memoryCache.get(domain);
    if (!cached) return null;

    // Check TTL
    const age = (Date.now() - cached.resolvedAt.getTime()) / 1000;
    if (age > cached.ttl) {
      this.memoryCache.delete(domain);
      return null;
    }

    return cached;
  }

  private async getFromRedisCache(
    domain: string,
  ): Promise<DomainResolution | null> {
    try {
      const cached = await this.redis.get(`domain:${domain}`);
      if (!cached) return null;

      const resolution: DomainResolution = JSON.parse(cached);
      resolution.resolvedAt = new Date(resolution.resolvedAt);

      // Check TTL
      const age = (Date.now() - resolution.resolvedAt.getTime()) / 1000;
      if (age > resolution.ttl) {
        await this.redis.del(`domain:${domain}`);
        return null;
      }

      return resolution;
    } catch (error) {
      console.error('Redis cache error:', error);
      return null;
    }
  }

  private async performDnsResolution(
    domain: string,
  ): Promise<DomainResolution | null> {
    const startTime = Date.now();

    try {
      // Use Node.js dns module or external service
      const dns = await import('dns');
      const { promisify } = await import('util');
      const resolve4 = promisify(dns.resolve4);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), this.DNS_TIMEOUT),
      );

      const addresses = await Promise.race([resolve4(domain), timeoutPromise]);

      if (addresses && addresses.length > 0) {
        return {
          domain,
          ipAddress: addresses[0],
          ttl: this.CACHE_TTL,
          resolvedAt: new Date(),
          responseTime: Date.now() - startTime,
          source: 'dns',
        };
      }

      return null;
    } catch (error) {
      console.error(`DNS resolution failed for ${domain}:`, error);
      return null;
    }
  }

  private getFallbackResolution(domain: string): DomainResolution {
    // Provide fallback IP or handle gracefully
    return {
      domain,
      ipAddress: '127.0.0.1', // Fallback
      ttl: 300, // Short TTL for fallback
      resolvedAt: new Date(),
      responseTime: 0,
      source: 'fallback',
    };
  }

  private setMemoryCache(domain: string, resolution: DomainResolution): void {
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.MEMORY_CACHE_SIZE) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(domain, resolution);
  }

  private async setCaches(
    domain: string,
    resolution: DomainResolution,
  ): Promise<void> {
    this.setMemoryCache(domain, resolution);

    try {
      await this.redis.setex(
        `domain:${domain}`,
        resolution.ttl,
        JSON.stringify(resolution),
      );
    } catch (error) {
      console.error('Redis cache write error:', error);
    }
  }

  private updateStats(result: 'hit' | 'miss', responseTime: number): void {
    if (result === 'miss') {
      this.stats.missRate =
        (this.stats.missRate * (this.stats.totalRequests - 1) + 1) /
        this.stats.totalRequests;
    }

    this.stats.avgResponseTime =
      (this.stats.avgResponseTime * (this.stats.totalRequests - 1) +
        responseTime) /
      this.stats.totalRequests;
  }

  private async getOrganizationDomains(
    organizationId: string,
  ): Promise<DomainConfig[]> {
    // Implement Supabase query to get organization domains
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );

    const { data, error } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (error) {
      console.error('Failed to fetch organization domains:', error);
      return [];
    }

    return data || [];
  }

  private startPeriodicCleanup(): void {
    // Clean up expired entries every 15 minutes
    setInterval(
      () => {
        this.cleanupExpiredEntries();
      },
      15 * 60 * 1000,
    );
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();

    for (const [domain, resolution] of this.memoryCache.entries()) {
      const age = (now - resolution.resolvedAt.getTime()) / 1000;
      if (age > resolution.ttl) {
        this.memoryCache.delete(domain);
      }
    }

    this.stats.lastCleanup = new Date();
  }
}

export default DomainCache;
export type { DomainConfig, SSLCertificate, DomainResolution, CacheStats };
