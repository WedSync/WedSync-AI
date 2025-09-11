/**
 * WS-205 Broadcast Rate Limiting
 * Specialized rate limiting for broadcast system with wedding industry context
 */

import {
  defaultRateLimiter,
  RateLimitConfig,
  SubscriptionTier,
} from '@/lib/rate-limit';

export interface BroadcastRateLimitOptions {
  maxPerHour?: number;
  maxPerDay?: number;
  maxPerWeek?: number;
  burstAllowance?: number;
}

export interface BroadcastRateLimitResult {
  allowed: boolean;
  resetTime?: Date;
  remainingHour?: number;
  remainingDay?: number;
  retryAfter?: number;
}

/**
 * Rate limits by broadcast type and priority
 */
const BROADCAST_RATE_LIMITS: Record<
  string,
  Record<string, BroadcastRateLimitOptions>
> = {
  critical: {
    'wedding.emergency': { maxPerHour: 2, maxPerDay: 10, burstAllowance: 1 },
    'coordinator.handoff': { maxPerHour: 3, maxPerDay: 15, burstAllowance: 2 },
    'security.alert': { maxPerHour: 5, maxPerDay: 20, burstAllowance: 2 },
    'wedding.cancelled': { maxPerHour: 1, maxPerDay: 5, burstAllowance: 0 },
  },
  high: {
    'timeline.changed': { maxPerHour: 10, maxPerDay: 50, burstAllowance: 5 },
    'payment.required': { maxPerHour: 5, maxPerDay: 25, burstAllowance: 3 },
    'trial.ending': { maxPerHour: 2, maxPerDay: 10, burstAllowance: 1 },
  },
  normal: {
    'feature.released': { maxPerHour: 2, maxPerDay: 5, burstAllowance: 1 },
    'journey.updated': { maxPerHour: 20, maxPerDay: 100, burstAllowance: 10 },
    'supplier.joined': { maxPerHour: 15, maxPerDay: 75, burstAllowance: 8 },
  },
  low: {
    'maintenance.scheduled': { maxPerHour: 1, maxPerDay: 3, burstAllowance: 0 },
    'tier.upgraded': { maxPerHour: 10, maxPerDay: 50, burstAllowance: 5 },
  },
};

/**
 * Role-based rate limit multipliers for broadcast senders
 */
const ROLE_MULTIPLIERS: Record<string, number> = {
  admin: 3.0,
  coordinator: 2.0,
  photographer: 1.0,
  venue: 1.0,
  supplier: 1.0,
};

/**
 * Check rate limits for broadcast creation
 */
export async function checkRateLimit(
  userId: string,
  broadcastType: string,
  options: BroadcastRateLimitOptions,
): Promise<BroadcastRateLimitResult> {
  const now = Date.now();

  // Get base limits for broadcast type
  const priority = getBroadcastPriority(broadcastType);
  const baseLimits = BROADCAST_RATE_LIMITS[priority]?.[broadcastType] || {
    maxPerHour: 10,
    maxPerDay: 50,
    burstAllowance: 5,
  };

  // Apply custom options
  const effectiveLimits = {
    maxPerHour: options.maxPerHour || baseLimits.maxPerHour,
    maxPerDay: options.maxPerDay || baseLimits.maxPerDay,
    burstAllowance: options.burstAllowance || baseLimits.burstAllowance,
  };

  // Check hourly limit
  const hourlyResult = await checkTimeWindowLimit(
    userId,
    broadcastType,
    'hour',
    effectiveLimits.maxPerHour!,
    now,
  );

  if (!hourlyResult.allowed) {
    return {
      allowed: false,
      resetTime: new Date(now + 60 * 60 * 1000), // Next hour
      remainingHour: 0,
      retryAfter: Math.ceil((hourlyResult.resetTime - now) / 1000),
    };
  }

  // Check daily limit
  const dailyResult = await checkTimeWindowLimit(
    userId,
    broadcastType,
    'day',
    effectiveLimits.maxPerDay!,
    now,
  );

  if (!dailyResult.allowed) {
    return {
      allowed: false,
      resetTime: new Date(now + 24 * 60 * 60 * 1000), // Next day
      remainingDay: 0,
      retryAfter: Math.ceil((dailyResult.resetTime - now) / 1000),
    };
  }

  return {
    allowed: true,
    remainingHour: hourlyResult.remaining,
    remainingDay: dailyResult.remaining,
  };
}

/**
 * Check rate limit for specific time window
 */
async function checkTimeWindowLimit(
  userId: string,
  broadcastType: string,
  window: 'hour' | 'day',
  maxRequests: number,
  now: number,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const windowMs = window === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const identifier = `broadcast:${userId}:${broadcastType}:${window}`;

  const config: RateLimitConfig = {
    requests: maxRequests,
    window: windowMs,
    tier: 'PROFESSIONAL' as SubscriptionTier, // Default tier for broadcasts
  };

  const result = await defaultRateLimiter.checkLimit(identifier, config);

  return {
    allowed: result.success,
    remaining: result.remaining,
    resetTime: now + windowMs,
  };
}

/**
 * Get broadcast priority from type
 */
function getBroadcastPriority(broadcastType: string): string {
  if (
    broadcastType.includes('emergency') ||
    broadcastType.includes('security') ||
    broadcastType.includes('cancelled') ||
    broadcastType.includes('handoff')
  ) {
    return 'critical';
  }

  if (
    broadcastType.includes('timeline') ||
    broadcastType.includes('payment') ||
    broadcastType.includes('trial')
  ) {
    return 'high';
  }

  if (
    broadcastType.includes('maintenance') ||
    broadcastType.includes('tier.upgraded')
  ) {
    return 'low';
  }

  return 'normal';
}

/**
 * Apply role-based multipliers to rate limits
 */
export function applyRoleMultiplier(
  limits: BroadcastRateLimitOptions,
  role: string,
): BroadcastRateLimitOptions {
  const multiplier = ROLE_MULTIPLIERS[role] || 1.0;

  return {
    maxPerHour: limits.maxPerHour
      ? Math.floor(limits.maxPerHour * multiplier)
      : undefined,
    maxPerDay: limits.maxPerDay
      ? Math.floor(limits.maxPerDay * multiplier)
      : undefined,
    maxPerWeek: limits.maxPerWeek
      ? Math.floor(limits.maxPerWeek * multiplier)
      : undefined,
    burstAllowance: limits.burstAllowance
      ? Math.floor(limits.burstAllowance * multiplier)
      : undefined,
  };
}

/**
 * Check if it's a wedding day (Saturday) - extra caution needed
 */
export function isWeddingDay(): boolean {
  const now = new Date();
  return now.getDay() === 6; // Saturday
}

/**
 * Get broadcast limits for wedding day (more restrictive)
 */
export function getWeddingDayLimits(
  normalLimits: BroadcastRateLimitOptions,
): BroadcastRateLimitOptions {
  if (!isWeddingDay()) return normalLimits;

  return {
    maxPerHour: normalLimits.maxPerHour
      ? Math.floor(normalLimits.maxPerHour * 0.5)
      : undefined,
    maxPerDay: normalLimits.maxPerDay
      ? Math.floor(normalLimits.maxPerDay * 0.7)
      : undefined,
    maxPerWeek: normalLimits.maxPerWeek,
    burstAllowance: normalLimits.burstAllowance
      ? Math.floor(normalLimits.burstAllowance * 0.3)
      : undefined,
  };
}

/**
 * Log rate limit violations for monitoring
 */
export async function logRateLimitViolation(
  userId: string,
  broadcastType: string,
  priority: string,
  attemptedAt: Date,
): Promise<void> {
  console.warn('Broadcast rate limit exceeded:', {
    userId,
    broadcastType,
    priority,
    attemptedAt,
    isWeddingDay: isWeddingDay(),
  });

  // In a production environment, this would send to monitoring system
  // await monitoringService.recordRateLimitViolation({
  //   userId,
  //   broadcastType,
  //   priority,
  //   attemptedAt,
  //   context: 'broadcast'
  // })
}
