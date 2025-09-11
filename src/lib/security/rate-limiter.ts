// WS-186: Rate Limiting Service - Team B Round 1
// Rate limiting for portfolio upload operations

import { createClient } from '@supabase/supabase-js';

export interface RateLimitOptions {
  key: string;
  limit: number;
  window: number; // milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

class RateLimiter {
  private supabase;
  private memoryStore: Map<string, { count: number; resetTime: number }> =
    new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    const { key, limit, window } = options;
    const now = Date.now();
    const resetTime = now + window;

    try {
      // Try Redis/persistent storage first if available
      if (process.env.REDIS_URL) {
        return await this.checkRedisRateLimit(key, limit, window, now);
      }

      // Fallback to memory store (not recommended for production)
      return this.checkMemoryRateLimit(key, limit, window, now, resetTime);
    } catch (error) {
      console.error('Rate limit check error:', error);

      // On error, allow the request but log the issue
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetTime,
      };
    }
  }

  private async checkRedisRateLimit(
    key: string,
    limit: number,
    window: number,
    now: number,
  ): Promise<RateLimitResult> {
    // This would implement Redis-based rate limiting
    // For now, fallback to memory store
    const resetTime = now + window;
    return this.checkMemoryRateLimit(key, limit, window, now, resetTime);
  }

  private checkMemoryRateLimit(
    key: string,
    limit: number,
    window: number,
    now: number,
    resetTime: number,
  ): RateLimitResult {
    const existing = this.memoryStore.get(key);

    // Clean expired entries
    if (existing && now >= existing.resetTime) {
      this.memoryStore.delete(key);
    }

    const current = this.memoryStore.get(key);

    if (!current) {
      // First request in window
      this.memoryStore.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetTime,
      };
    }

    // Check if limit exceeded
    if (current.count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime: current.resetTime,
      };
    }

    // Increment counter
    current.count++;
    this.memoryStore.set(key, current);

    return {
      allowed: true,
      limit,
      remaining: limit - current.count,
      resetTime: current.resetTime,
    };
  }

  // Portfolio-specific rate limiting presets
  async checkPortfolioUploadLimit(
    supplierId: string,
  ): Promise<RateLimitResult> {
    return this.checkRateLimit({
      key: `portfolio_upload:${supplierId}`,
      limit: 10, // 10 upload batches per hour
      window: 3600000, // 1 hour
    });
  }

  async checkPortfolioAPILimit(supplierId: string): Promise<RateLimitResult> {
    return this.checkRateLimit({
      key: `portfolio_api:${supplierId}`,
      limit: 100, // 100 API calls per minute
      window: 60000, // 1 minute
    });
  }

  async checkAIAnalysisLimit(supplierId: string): Promise<RateLimitResult> {
    return this.checkRateLimit({
      key: `ai_analysis:${supplierId}`,
      limit: 50, // 50 AI analysis calls per hour
      window: 3600000, // 1 hour
    });
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    // Use forEach pattern for downlevelIteration compatibility
    this.memoryStore.forEach((data, key) => {
      if (now >= data.resetTime) {
        this.memoryStore.delete(key);
      }
    });
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Convenience function for rate limiting
export async function rateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit(options);
}

// Clean up expired entries every 5 minutes
if (typeof global !== 'undefined') {
  setInterval(
    () => {
      rateLimiter.cleanup();
    },
    5 * 60 * 1000,
  );
}
