export interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max unique tokens per interval
}

export interface RateLimiter {
  check: (limit: number, token: string) => Promise<void>;
}

// In-memory rate limiter for development/testing
class InMemoryRateLimiter implements RateLimiter {
  private requests = new Map<string, number[]>();
  private interval: number;
  private uniqueTokenPerInterval: number;

  constructor(options: RateLimitOptions) {
    this.interval = options.interval;
    this.uniqueTokenPerInterval = options.uniqueTokenPerInterval;
  }

  async check(limit: number, token: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.interval;

    // Get or create request history for this token
    let requests = this.requests.get(token) || [];

    // Remove old requests outside the window
    requests = requests.filter((time) => time > windowStart);

    // Check if we exceed the limit
    if (requests.length >= limit) {
      throw new Error('Rate limit exceeded');
    }

    // Add current request
    requests.push(now);
    this.requests.set(token, requests);

    // Cleanup old tokens periodically
    if (this.requests.size > this.uniqueTokenPerInterval * 2) {
      this.cleanup(windowStart);
    }
  }

  private cleanup(windowStart: number): void {
    for (const [token, requests] of this.requests.entries()) {
      const activeRequests = requests.filter((time) => time > windowStart);
      if (activeRequests.length === 0) {
        this.requests.delete(token);
      } else {
        this.requests.set(token, activeRequests);
      }
    }
  }
}

export function rateLimit(options: RateLimitOptions): RateLimiter {
  return new InMemoryRateLimiter(options);
}
