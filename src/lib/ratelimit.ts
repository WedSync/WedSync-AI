// WS-254 Team D: Rate Limiting for API Security

interface RateLimitOptions {
  requests: number;
  window: string;
  identifier: string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

// In-memory store for development - in production, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function ratelimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const { requests, window, identifier } = options;

  // Parse window (e.g., "1m", "1h", "1d")
  const windowMs = parseWindow(window);
  const now = Date.now();
  const resetTime = now + windowMs;

  // Clean up expired entries
  cleanupExpiredEntries(now);

  // Get current count for identifier
  const current = rateLimitStore.get(identifier);

  if (!current) {
    // First request
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      remaining: requests - 1,
      reset: Math.floor(resetTime / 1000),
    };
  }

  if (now > current.resetTime) {
    // Window has expired, reset
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      remaining: requests - 1,
      reset: Math.floor(resetTime / 1000),
    };
  }

  if (current.count >= requests) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      reset: Math.floor(current.resetTime / 1000),
    };
  }

  // Increment count
  current.count++;
  rateLimitStore.set(identifier, current);

  return {
    success: true,
    remaining: Math.max(0, requests - current.count),
    reset: Math.floor(current.resetTime / 1000),
  };
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid window format: ${window}`);
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid window unit: ${unit}`);
  }
}

function cleanupExpiredEntries(now: number) {
  // SENIOR CODE REVIEWER FIX: Use Array.from for Map iteration compatibility
  for (const [key, value] of Array.from(rateLimitStore.entries())) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}
