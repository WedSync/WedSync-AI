/**
 * WS-155: Production-Grade Rate Limiting and Abuse Prevention
 * Advanced rate limiting with multiple algorithms and abuse detection
 */

import { Redis } from 'ioredis';
import { NextRequest } from 'next/server';
import * as crypto from 'crypto';
import { guestCommunicationsMonitor } from '../monitoring/guest-communications-monitor';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
  algorithm:
    | 'token-bucket'
    | 'sliding-window'
    | 'fixed-window'
    | 'leaky-bucket';
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
  blocked?: boolean;
  reason?: string;
}

export interface AbusePattern {
  id: string;
  name: string;
  condition: (req: NextRequest, history: RequestHistory[]) => boolean;
  action: 'warn' | 'throttle' | 'block' | 'blacklist';
  duration: number; // minutes
}

export interface RequestHistory {
  timestamp: number;
  ip: string;
  userAgent: string;
  endpoint: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export class AdvancedRateLimiter {
  private configs: Map<string, RateLimitConfig> = new Map();
  private abusePatterns: AbusePattern[] = [];
  private blacklistedIPs: Set<string> = new Set();
  private whitelistedIPs: Set<string> = new Set();

  constructor() {
    this.initializeConfigs();
    this.initializeAbusePatterns();
    this.loadBlacklists();
    this.startCleanup();
  }

  private initializeConfigs() {
    // Guest communications specific limits
    this.configs.set('messages:send', {
      requests: 100,
      windowMs: 60 * 1000, // 1 minute
      algorithm: 'sliding-window',
    });

    this.configs.set('messages:bulk', {
      requests: 10,
      windowMs: 60 * 1000, // 1 minute
      algorithm: 'token-bucket',
    });

    this.configs.set('messages:template', {
      requests: 200,
      windowMs: 60 * 1000, // 1 minute
      algorithm: 'sliding-window',
    });

    this.configs.set('compliance:check', {
      requests: 500,
      windowMs: 60 * 1000, // 1 minute
      algorithm: 'fixed-window',
    });

    // Global API limits
    this.configs.set('api:global', {
      requests: 1000,
      windowMs: 60 * 1000, // 1 minute
      algorithm: 'sliding-window',
    });

    // Authenticated user limits
    this.configs.set('user:authenticated', {
      requests: 2000,
      windowMs: 60 * 1000, // 1 minute
      algorithm: 'token-bucket',
    });

    // Anonymous user limits
    this.configs.set('user:anonymous', {
      requests: 100,
      windowMs: 60 * 1000, // 1 minute
      algorithm: 'fixed-window',
    });
  }

  private initializeAbusePatterns() {
    // Rapid-fire requests
    this.abusePatterns.push({
      id: 'rapid_fire',
      name: 'Rapid Fire Requests',
      condition: (req, history) => {
        const lastMinute = history.filter(
          (h) => Date.now() - h.timestamp < 60000,
        );
        return lastMinute.length > 500;
      },
      action: 'throttle',
      duration: 15,
    });

    // Different user agents from same IP
    this.abusePatterns.push({
      id: 'ua_rotation',
      name: 'User Agent Rotation',
      condition: (req, history) => {
        const lastHour = history.filter(
          (h) => Date.now() - h.timestamp < 3600000,
        );
        const uniqueUAs = new Set(lastHour.map((h) => h.userAgent));
        return uniqueUAs.size > 10 && lastHour.length > 100;
      },
      action: 'block',
      duration: 60,
    });

    // High error rate (potential attack)
    this.abusePatterns.push({
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: (req, history) => {
        const lastHour = history.filter(
          (h) => Date.now() - h.timestamp < 3600000,
        );
        const errors = lastHour.filter((h) => !h.success);
        return lastHour.length > 50 && errors.length / lastHour.length > 0.8;
      },
      action: 'block',
      duration: 120,
    });

    // Endpoint scanning
    this.abusePatterns.push({
      id: 'endpoint_scanning',
      name: 'Endpoint Scanning',
      condition: (req, history) => {
        const lastHour = history.filter(
          (h) => Date.now() - h.timestamp < 3600000,
        );
        const uniqueEndpoints = new Set(lastHour.map((h) => h.endpoint));
        return uniqueEndpoints.size > 50 && lastHour.length > 200;
      },
      action: 'blacklist',
      duration: 1440, // 24 hours
    });

    // Bulk message abuse
    this.abusePatterns.push({
      id: 'bulk_message_abuse',
      name: 'Bulk Message Abuse',
      condition: (req, history) => {
        const bulkRequests = history.filter(
          (h) =>
            h.endpoint.includes('bulk') && Date.now() - h.timestamp < 3600000,
        );
        return bulkRequests.length > 50;
      },
      action: 'throttle',
      duration: 60,
    });
  }

  private async loadBlacklists() {
    try {
      // Load from Redis
      const blacklisted = await redis.smembers('blacklist:ips');
      blacklisted.forEach((ip) => this.blacklistedIPs.add(ip));

      const whitelisted = await redis.smembers('whitelist:ips');
      whitelisted.forEach((ip) => this.whitelistedIPs.add(ip));
    } catch (error) {
      console.error('Failed to load IP lists:', error);
    }
  }

  async checkRateLimit(
    key: string,
    req: NextRequest,
    customConfig?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const config = { ...this.configs.get(key), ...customConfig };
    if (!config) {
      throw new Error(`Rate limit config not found for key: ${key}`);
    }

    const clientKey = this.generateKey(req, config);
    const ip = this.getClientIP(req);

    // Check whitelist/blacklist first
    if (this.whitelistedIPs.has(ip)) {
      return {
        success: true,
        limit: config.requests,
        remaining: config.requests,
        reset: new Date(Date.now() + config.windowMs),
      };
    }

    if (this.blacklistedIPs.has(ip)) {
      await this.recordRequest(req, false, 'blacklisted');
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        blocked: true,
        reason: 'IP blacklisted',
      };
    }

    // Check for abuse patterns
    const history = await this.getRequestHistory(ip);
    const abuseDetected = await this.checkAbusePatterns(req, history);

    if (abuseDetected) {
      await this.recordRequest(req, false, 'abuse_detected');
      return abuseDetected;
    }

    // Apply rate limiting algorithm
    let result: RateLimitResult;

    switch (config.algorithm) {
      case 'token-bucket':
        result = await this.tokenBucket(clientKey, config);
        break;
      case 'sliding-window':
        result = await this.slidingWindow(clientKey, config);
        break;
      case 'leaky-bucket':
        result = await this.leakyBucket(clientKey, config);
        break;
      case 'fixed-window':
      default:
        result = await this.fixedWindow(clientKey, config);
        break;
    }

    // Record request for abuse detection
    await this.recordRequest(req, result.success);

    return result;
  }

  private async tokenBucket(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const bucketKey = `bucket:${key}`;
    const now = Date.now();

    // Get current bucket state
    const pipeline = redis.pipeline();
    pipeline.hmget(bucketKey, 'tokens', 'lastRefill');
    const [[, bucket]] = (await pipeline.exec()) as [[null, string[]]];

    let tokens = parseFloat(bucket[0] || config.requests.toString());
    let lastRefill = parseInt(bucket[1] || now.toString());

    // Refill tokens based on time passed
    const timePassed = now - lastRefill;
    const tokensToAdd = Math.floor(
      timePassed / (config.windowMs / config.requests),
    );
    tokens = Math.min(config.requests, tokens + tokensToAdd);

    if (tokens >= 1) {
      // Consume token
      tokens -= 1;

      // Update bucket
      await redis.hmset(bucketKey, {
        tokens: tokens.toString(),
        lastRefill: now.toString(),
      });
      await redis.expire(bucketKey, Math.ceil(config.windowMs / 1000));

      return {
        success: true,
        limit: config.requests,
        remaining: Math.floor(tokens),
        reset: new Date(now + config.windowMs),
      };
    } else {
      const refillTime = config.windowMs / config.requests;
      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset: new Date(now + refillTime),
        retryAfter: Math.ceil(refillTime / 1000),
      };
    }
  }

  private async slidingWindow(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const windowKey = `window:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Remove old entries and count current
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(windowKey, '-inf', windowStart);
    pipeline.zcard(windowKey);
    const results = await pipeline.exec();

    const currentCount = results[1][1] as number;

    if (currentCount < config.requests) {
      // Add current request
      await redis.zadd(windowKey, now, `${now}-${Math.random()}`);
      await redis.expire(windowKey, Math.ceil(config.windowMs / 1000));

      return {
        success: true,
        limit: config.requests,
        remaining: config.requests - currentCount - 1,
        reset: new Date(now + config.windowMs),
      };
    } else {
      // Get oldest entry to calculate reset time
      const oldest = await redis.zrange(windowKey, 0, 0, 'WITHSCORES');
      const resetTime =
        oldest.length > 0
          ? parseInt(oldest[1]) + config.windowMs
          : now + config.windowMs;

      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset: new Date(resetTime),
        retryAfter: Math.ceil((resetTime - now) / 1000),
      };
    }
  }

  private async leakyBucket(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const bucketKey = `leak:${key}`;
    const now = Date.now();
    const leakRate = config.requests / config.windowMs; // requests per ms

    // Get bucket state
    const bucket = await redis.hmget(bucketKey, 'level', 'lastLeak');
    let level = parseFloat(bucket[0] || '0');
    let lastLeak = parseInt(bucket[1] || now.toString());

    // Leak tokens
    const timePassed = now - lastLeak;
    const leakAmount = leakRate * timePassed;
    level = Math.max(0, level - leakAmount);

    if (level < config.requests) {
      // Add request to bucket
      level += 1;

      // Update bucket
      await redis.hmset(bucketKey, {
        level: level.toString(),
        lastLeak: now.toString(),
      });
      await redis.expire(bucketKey, Math.ceil(config.windowMs / 1000));

      return {
        success: true,
        limit: config.requests,
        remaining: Math.floor(config.requests - level),
        reset: new Date(now + config.windowMs),
      };
    } else {
      const drainTime = (level - config.requests + 1) / leakRate;
      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset: new Date(now + drainTime),
        retryAfter: Math.ceil(drainTime / 1000),
      };
    }
  }

  private async fixedWindow(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const windowKey = `fixed:${key}`;
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;

    const current = await redis.incr(windowKey);

    if (current === 1) {
      // Set expiry for first request in window
      await redis.expireat(
        windowKey,
        Math.ceil((windowStart + config.windowMs) / 1000),
      );
    }

    if (current <= config.requests) {
      return {
        success: true,
        limit: config.requests,
        remaining: config.requests - current,
        reset: new Date(windowStart + config.windowMs),
      };
    } else {
      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset: new Date(windowStart + config.windowMs),
        retryAfter: Math.ceil((windowStart + config.windowMs - now) / 1000),
      };
    }
  }

  private async checkAbusePatterns(
    req: NextRequest,
    history: RequestHistory[],
  ): Promise<RateLimitResult | null> {
    for (const pattern of this.abusePatterns) {
      if (pattern.condition(req, history)) {
        await this.handleAbuse(req, pattern);

        const retryAfter = pattern.duration * 60; // Convert to seconds

        return {
          success: false,
          limit: 0,
          remaining: 0,
          reset: new Date(Date.now() + retryAfter * 1000),
          retryAfter,
          blocked: true,
          reason: `Abuse pattern detected: ${pattern.name}`,
        };
      }
    }

    return null;
  }

  private async handleAbuse(req: NextRequest, pattern: AbusePattern) {
    const ip = this.getClientIP(req);
    const duration = pattern.duration * 60 * 1000; // Convert to ms

    switch (pattern.action) {
      case 'throttle':
        await redis.setex(`throttle:${ip}`, pattern.duration * 60, '1');
        break;

      case 'block':
        await redis.setex(`block:${ip}`, pattern.duration * 60, '1');
        break;

      case 'blacklist':
        await redis.sadd('blacklist:ips', ip);
        this.blacklistedIPs.add(ip);
        // Set expiry for temporary blacklist
        await redis.setex(`blacklist_temp:${ip}`, pattern.duration * 60, '1');
        break;
    }

    // Log abuse event
    await guestCommunicationsMonitor.recordMessageSent({
      messageId: `abuse-${Date.now()}`,
      type: 'email',
      status: 'failed',
      channel: 'abuse-detection',
      recipientId: ip,
      timestamp: new Date(),
      processingTime: 0,
      metadata: {
        abusePattern: pattern.name,
        action: pattern.action,
        userAgent: req.headers.get('user-agent'),
        complianceViolation: true,
      },
    });
  }

  private async recordRequest(
    req: NextRequest,
    success: boolean,
    reason?: string,
  ) {
    const ip = this.getClientIP(req);
    const history: RequestHistory = {
      timestamp: Date.now(),
      ip,
      userAgent: req.headers.get('user-agent') || 'unknown',
      endpoint: req.nextUrl.pathname,
      success,
      metadata: { reason },
    };

    // Store in Redis with 24 hour expiry
    const historyKey = `history:${ip}`;
    await redis.lpush(historyKey, JSON.stringify(history));
    await redis.ltrim(historyKey, 0, 999); // Keep last 1000 requests
    await redis.expire(historyKey, 24 * 60 * 60); // 24 hours
  }

  private async getRequestHistory(ip: string): Promise<RequestHistory[]> {
    const historyKey = `history:${ip}`;
    const rawHistory = await redis.lrange(historyKey, 0, -1);

    return rawHistory
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  private generateKey(req: NextRequest, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    const ip = this.getClientIP(req);
    const userId = req.headers.get('x-user-id');

    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  private getClientIP(req: NextRequest): string {
    return (
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') ||
      'unknown'
    );
  }

  private startCleanup() {
    // Clean up expired blacklist entries every hour
    setInterval(
      async () => {
        const expiredKeys = await redis.keys('blacklist_temp:*');
        for (const key of expiredKeys) {
          const exists = await redis.exists(key);
          if (!exists) {
            // Remove from permanent blacklist
            const ip = key.replace('blacklist_temp:', '');
            await redis.srem('blacklist:ips', ip);
            this.blacklistedIPs.delete(ip);
          }
        }
      },
      60 * 60 * 1000,
    ); // 1 hour
  }

  // Admin methods
  async addToWhitelist(ip: string) {
    await redis.sadd('whitelist:ips', ip);
    this.whitelistedIPs.add(ip);
  }

  async removeFromWhitelist(ip: string) {
    await redis.srem('whitelist:ips', ip);
    this.whitelistedIPs.delete(ip);
  }

  async addToBlacklist(ip: string, duration?: number) {
    await redis.sadd('blacklist:ips', ip);
    this.blacklistedIPs.add(ip);

    if (duration) {
      await redis.setex(`blacklist_temp:${ip}`, duration * 60, '1');
    }
  }

  async removeFromBlacklist(ip: string) {
    await redis.srem('blacklist:ips', ip);
    await redis.del(`blacklist_temp:${ip}`);
    this.blacklistedIPs.delete(ip);
  }

  async getRateLimitStatus(key: string, req: NextRequest) {
    const clientKey = this.generateKey(
      req,
      this.configs.get(key) || ({} as RateLimitConfig),
    );
    const config = this.configs.get(key);

    if (!config) return null;

    const bucketKey = `bucket:${clientKey}`;
    const windowKey = `window:${clientKey}`;
    const fixedKey = `fixed:${clientKey}`;

    const [bucket, window, fixed] = await Promise.all([
      redis.hmget(bucketKey, 'tokens', 'lastRefill'),
      redis.zcard(windowKey),
      redis.get(fixedKey),
    ]);

    return {
      key,
      algorithm: config.algorithm,
      limit: config.requests,
      windowMs: config.windowMs,
      current: {
        tokenBucket: bucket[0] ? parseFloat(bucket[0]) : null,
        slidingWindow: window,
        fixedWindow: fixed ? parseInt(fixed) : null,
      },
    };
  }
}

// Export singleton instance
export const advancedRateLimiter = new AdvancedRateLimiter();
