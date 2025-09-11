/**
 * Production-Grade Rate Limiter with DDoS Protection
 * Implements multiple layers of protection and adaptive limiting
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';

// Redis-like interface for rate limiting storage
interface RateLimitStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
}

// In-memory fallback for development
class MemoryStorage implements RateLimitStorage {
  private cache = new Map<string, { value: string; expires: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = current ? parseInt(current) + 1 : 1;
    await this.set(key, newValue.toString(), 60); // Default 60s TTL
    return newValue;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const item = this.cache.get(key);
    if (item) {
      item.expires = Date.now() + ttlSeconds * 1000;
    }
  }
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  burstMultiplier?: number; // Allow burst up to N times the limit
  adaptiveThreshold?: number; // Trigger adaptive limiting at this error rate
  blockDuration?: number; // How long to block after limit exceeded
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  whitelist?: string[];
  blacklist?: string[];
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  blocked?: boolean;
  reason?: string;
}

interface SecurityThreats {
  suspiciousActivity: boolean;
  ddosPattern: boolean;
  adaptiveBlocking: boolean;
  ipReputation: 'good' | 'suspicious' | 'malicious';
}

export class ProductionRateLimiter {
  private storage: RateLimitStorage;
  private config: RateLimitConfig;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(config: RateLimitConfig, storage?: RateLimitStorage) {
    this.config = {
      burstMultiplier: 2,
      adaptiveThreshold: 0.1, // 10% error rate triggers adaptive limiting
      blockDuration: 300, // 5 minutes
      skipSuccessfulRequests: false,
      ...config,
    };
    this.storage = storage || new MemoryStorage();
  }

  async checkLimit(req: NextRequest): Promise<RateLimitResult> {
    const startTime = Date.now();

    try {
      const identifier = this.getIdentifier(req);

      // Check IP whitelist/blacklist
      const ipCheck = await this.checkIpLists(identifier);
      if (!ipCheck.allowed) {
        return ipCheck;
      }

      // Analyze security threats
      const threats = await this.analyzeSecurityThreats(req, identifier);

      // Apply adaptive rate limiting based on threat level
      const adaptedConfig = this.adaptConfigForThreats(threats);

      // Check if currently blocked
      const blockStatus = await this.checkIfBlocked(identifier);
      if (blockStatus.blocked) {
        return blockStatus;
      }

      // Perform rate limit check
      const result = await this.performRateLimitCheck(
        identifier,
        adaptedConfig,
      );

      // Log security events
      await this.logSecurityEvent(req, identifier, result, threats);

      // Track metrics
      metrics.incrementCounter('rate_limit.checks', 1, {
        endpoint: new URL(req.url).pathname,
        allowed: result.allowed.toString(),
        threat_level: threats.ipReputation,
      });

      return result;
    } catch (error) {
      logger.error('Rate limit check failed', error as Error, {
        url: req.url,
        userAgent: req.headers.get('user-agent'),
      });

      // Fail open for availability, but log the error
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
        reason: 'rate_limiter_error',
      };
    } finally {
      metrics.recordHistogram(
        'rate_limit.check_duration',
        Date.now() - startTime,
      );
    }
  }

  private getIdentifier(req: NextRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }

    // Enhanced IP detection for production
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare
    const xClientIp = req.headers.get('x-client-ip');

    // Use the most reliable source
    const ip =
      cfConnectingIp ||
      realIp ||
      forwarded?.split(',')[0]?.trim() ||
      '127.0.0.1';

    // For authenticated users, also include user context
    const userAgent = req.headers.get('user-agent') || '';
    const fingerprint = this.generateFingerprint(ip, userAgent);

    return fingerprint;
  }

  private generateFingerprint(ip: string, userAgent: string): string {
    // Create a stable fingerprint that's harder to bypass
    const uaHash = this.simpleHash(userAgent);
    return `${ip}:${uaHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private async checkIpLists(identifier: string): Promise<RateLimitResult> {
    const ip = identifier.split(':')[0];

    // Check whitelist
    if (this.config.whitelist?.includes(ip)) {
      return {
        allowed: true,
        limit: Number.MAX_SAFE_INTEGER,
        remaining: Number.MAX_SAFE_INTEGER,
        resetTime: Date.now() + this.config.windowMs,
        reason: 'whitelisted',
      };
    }

    // Check blacklist
    if (this.config.blacklist?.includes(ip)) {
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        resetTime: Date.now() + this.config.windowMs,
        blocked: true,
        reason: 'blacklisted',
      };
    }

    // Check dynamic blacklist from security events
    const blacklistKey = `blacklist:${ip}`;
    const blacklisted = await this.storage.get(blacklistKey);
    if (blacklisted) {
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        resetTime: Date.now() + this.config.windowMs,
        blocked: true,
        reason: 'dynamic_blacklist',
      };
    }

    return { allowed: true } as RateLimitResult;
  }

  private async analyzeSecurityThreats(
    req: NextRequest,
    identifier: string,
  ): Promise<SecurityThreats> {
    const ip = identifier.split(':')[0];
    const userAgent = req.headers.get('user-agent') || '';
    const now = Date.now();

    // Check for suspicious patterns
    const suspiciousActivity = await this.detectSuspiciousActivity(
      req,
      identifier,
    );

    // Check for DDoS patterns
    const ddosPattern = await this.detectDdosPattern(identifier);

    // Check IP reputation
    const ipReputation = await this.checkIpReputation(ip);

    // Check if adaptive blocking should be triggered
    const adaptiveBlocking =
      await this.shouldTriggerAdaptiveBlocking(identifier);

    return {
      suspiciousActivity,
      ddosPattern,
      adaptiveBlocking,
      ipReputation,
    };
  }

  private async detectSuspiciousActivity(
    req: NextRequest,
    identifier: string,
  ): Promise<boolean> {
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';
    const path = new URL(req.url).pathname;

    // Common bot patterns
    const suspiciousPatterns = [
      /bot|crawler|spider|scraper/i,
      /python|curl|wget|postman/i,
      /scanner|probe|test/i,
    ];

    const isSuspiciousUA = suspiciousPatterns.some((pattern) =>
      pattern.test(userAgent),
    );

    // Check for rapid endpoint scanning
    const scanningKey = `scanning:${identifier}`;
    const recentPaths = await this.storage.get(scanningKey);
    const pathSet = new Set(recentPaths ? JSON.parse(recentPaths) : []);
    pathSet.add(path);

    if (pathSet.size > 20) {
      // More than 20 different endpoints in window
      await this.storage.set(scanningKey, JSON.stringify([...pathSet]), 300);
      return true;
    }

    await this.storage.set(scanningKey, JSON.stringify([...pathSet]), 300);

    return isSuspiciousUA;
  }

  private async detectDdosPattern(identifier: string): Promise<boolean> {
    // Check request velocity
    const velocityKey = `velocity:${identifier}`;
    const requests = await this.storage.incr(velocityKey);
    await this.storage.expire(velocityKey, 60); // 1 minute window

    // If more than 100 requests per minute, consider it DDoS
    if (requests > 100) {
      // Log the potential DDoS
      logger.warn('Potential DDoS detected', {
        identifier,
        requestCount: requests,
        timeWindow: '1 minute',
      });

      return true;
    }

    return false;
  }

  private async checkIpReputation(
    ip: string,
  ): Promise<'good' | 'suspicious' | 'malicious'> {
    // Check our internal reputation database
    const reputationKey = `reputation:${ip}`;
    const reputation = await this.storage.get(reputationKey);

    if (reputation) {
      return reputation as 'good' | 'suspicious' | 'malicious';
    }

    // For production, you could integrate with external threat intelligence
    // For now, check our own security events
    try {
      const { data: securityEvents } = await this.supabase
        .from('security_events')
        .select('event_type, severity')
        .eq('ip_address', ip)
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .limit(10);

      if (securityEvents && securityEvents.length > 0) {
        const maliciousEvents = securityEvents.filter(
          (e) => e.severity === 'high',
        );
        if (maliciousEvents.length > 2) {
          await this.storage.set(reputationKey, 'malicious', 3600);
          return 'malicious';
        }

        const suspiciousEvents = securityEvents.filter(
          (e) => e.severity === 'medium',
        );
        if (suspiciousEvents.length > 5) {
          await this.storage.set(reputationKey, 'suspicious', 1800);
          return 'suspicious';
        }
      }

      await this.storage.set(reputationKey, 'good', 900);
      return 'good';
    } catch (error) {
      logger.error('Failed to check IP reputation', error as Error, { ip });
      return 'good'; // Fail open
    }
  }

  private async shouldTriggerAdaptiveBlocking(
    identifier: string,
  ): Promise<boolean> {
    // Check error rate for this identifier
    const errorKey = `errors:${identifier}`;
    const errors = await this.storage.get(errorKey);
    const totalKey = `total:${identifier}`;
    const total = await this.storage.get(totalKey);

    if (errors && total) {
      const errorRate = parseInt(errors) / parseInt(total);
      return errorRate > (this.config.adaptiveThreshold || 0.1);
    }

    return false;
  }

  private adaptConfigForThreats(threats: SecurityThreats): RateLimitConfig {
    const adaptedConfig = { ...this.config };

    // Reduce limits for suspicious/malicious IPs
    if (threats.ipReputation === 'malicious') {
      adaptedConfig.maxRequests = Math.floor(adaptedConfig.maxRequests * 0.1); // 90% reduction
      adaptedConfig.windowMs = adaptedConfig.windowMs * 2; // Longer window
    } else if (threats.ipReputation === 'suspicious') {
      adaptedConfig.maxRequests = Math.floor(adaptedConfig.maxRequests * 0.5); // 50% reduction
    }

    // Apply stricter limits for DDoS patterns
    if (threats.ddosPattern) {
      adaptedConfig.maxRequests = Math.floor(adaptedConfig.maxRequests * 0.2); // 80% reduction
      adaptedConfig.blockDuration = (adaptedConfig.blockDuration || 300) * 2; // Longer blocks
    }

    // Adaptive blocking triggers even stricter limits
    if (threats.adaptiveBlocking) {
      adaptedConfig.maxRequests = Math.floor(adaptedConfig.maxRequests * 0.3); // 70% reduction
    }

    return adaptedConfig;
  }

  private async checkIfBlocked(identifier: string): Promise<RateLimitResult> {
    const blockKey = `block:${identifier}`;
    const blocked = await this.storage.get(blockKey);

    if (blocked) {
      const blockData = JSON.parse(blocked);
      const now = Date.now();

      if (now < blockData.unblockTime) {
        return {
          allowed: false,
          limit: 0,
          remaining: 0,
          resetTime: blockData.unblockTime,
          retryAfter: Math.ceil((blockData.unblockTime - now) / 1000),
          blocked: true,
          reason: 'temporarily_blocked',
        };
      }
    }

    return { allowed: true } as RateLimitResult;
  }

  private async performRateLimitCheck(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const window = Math.floor(Date.now() / config.windowMs);
    const key = `rate:${identifier}:${window}`;

    const current = await this.storage.incr(key);
    await this.storage.expire(key, Math.ceil(config.windowMs / 1000));

    const limit = config.maxRequests;
    const remaining = Math.max(0, limit - current);
    const resetTime = (window + 1) * config.windowMs;

    if (current > limit) {
      // Check if we're within burst allowance
      const burstLimit = limit * (config.burstMultiplier || 1);

      if (current <= burstLimit) {
        // Within burst allowance, but track this
        await this.recordBurstUsage(identifier);

        return {
          allowed: true,
          limit: burstLimit,
          remaining: Math.max(0, burstLimit - current),
          resetTime,
          reason: 'burst_allowance',
        };
      }

      // Exceeded burst limit, block temporarily
      await this.blockTemporarily(identifier, config.blockDuration || 300);

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime,
        retryAfter: config.blockDuration || 300,
        blocked: true,
        reason: 'rate_limit_exceeded',
      };
    }

    return {
      allowed: true,
      limit,
      remaining,
      resetTime,
    };
  }

  private async recordBurstUsage(identifier: string): Promise<void> {
    const burstKey = `burst:${identifier}`;
    await this.storage.incr(burstKey);
    await this.storage.expire(burstKey, 3600); // 1 hour tracking
  }

  private async blockTemporarily(
    identifier: string,
    duration: number,
  ): Promise<void> {
    const blockKey = `block:${identifier}`;
    const blockData = {
      blockedAt: Date.now(),
      unblockTime: Date.now() + duration * 1000,
      reason: 'rate_limit_exceeded',
    };

    await this.storage.set(blockKey, JSON.stringify(blockData), duration);

    // Log the blocking event
    logger.warn('IP temporarily blocked for rate limiting', {
      identifier,
      duration,
      reason: 'rate_limit_exceeded',
    });
  }

  private async logSecurityEvent(
    req: NextRequest,
    identifier: string,
    result: RateLimitResult,
    threats: SecurityThreats,
  ): Promise<void> {
    // Only log significant events to avoid spam
    if (
      !result.allowed ||
      threats.ddosPattern ||
      threats.ipReputation !== 'good'
    ) {
      const event = {
        event_type: 'rate_limit_action',
        ip_address: identifier.split(':')[0],
        user_agent: req.headers.get('user-agent'),
        endpoint: new URL(req.url).pathname,
        allowed: result.allowed,
        reason: result.reason,
        threat_analysis: threats,
        timestamp: new Date().toISOString(),
      };

      // Store in security events table
      try {
        await this.supabase.from('security_events').insert({
          event_type: event.event_type,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          endpoint: event.endpoint,
          details: {
            allowed: event.allowed,
            reason: event.reason,
            threats: event.threat_analysis,
          },
          severity: this.determineSeverity(result, threats),
        });
      } catch (error) {
        logger.error('Failed to log security event', error as Error);
      }
    }
  }

  private determineSeverity(
    result: RateLimitResult,
    threats: SecurityThreats,
  ): 'low' | 'medium' | 'high' {
    if (threats.ipReputation === 'malicious' || threats.ddosPattern) {
      return 'high';
    }
    if (
      threats.ipReputation === 'suspicious' ||
      threats.suspiciousActivity ||
      !result.allowed
    ) {
      return 'medium';
    }
    return 'low';
  }
}

// Pre-configured rate limiters for different endpoints
export const productionRateLimiters = {
  // General API endpoints
  api: new ProductionRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
    burstMultiplier: 1.5,
    adaptiveThreshold: 0.1,
  }),

  // Authentication endpoints (stricter)
  auth: new ProductionRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
    burstMultiplier: 1.2,
    blockDuration: 900, // 15 minutes
    adaptiveThreshold: 0.05,
  }),

  // Payment endpoints (very strict)
  payment: new ProductionRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    burstMultiplier: 1.1,
    blockDuration: 1800, // 30 minutes
    adaptiveThreshold: 0.02,
  }),

  // PDF upload endpoints
  upload: new ProductionRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
    burstMultiplier: 1.3,
    blockDuration: 600, // 10 minutes
    adaptiveThreshold: 0.08,
  }),

  // Health check endpoints (very permissive)
  health: new ProductionRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
    burstMultiplier: 2,
    adaptiveThreshold: 0.5,
  }),
};

// Middleware wrapper for easy integration
export function createRateLimitMiddleware(limiter: ProductionRateLimiter) {
  return async (req: NextRequest) => {
    const result = await limiter.checkLimit(req);

    if (!result.allowed) {
      const response = new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. ${result.retryAfter ? `Retry after ${result.retryAfter} seconds.` : 'Please try again later.'}`,
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
            ...(result.retryAfter && {
              'Retry-After': result.retryAfter.toString(),
            }),
          },
        },
      );

      return response;
    }

    // Add rate limit headers to successful responses
    return new Response(null, {
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
      },
    });
  };
}
