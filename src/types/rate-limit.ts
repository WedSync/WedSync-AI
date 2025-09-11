/**
 * Rate Limiting TypeScript Interfaces and Types
 * Comprehensive type definitions for multi-tier rate limiting system
 */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  tier: RateLimitTier;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  tier: RateLimitTier;
  key: string;
  windowMs: number;
}

export type RateLimitTier = 'ip' | 'user' | 'organization' | 'global';

export interface RateLimitTierConfig {
  ip: RateLimitConfig;
  user: RateLimitConfig;
  organization: RateLimitConfig;
  global: RateLimitConfig;
}

export interface RateLimitOverride {
  key: string;
  tier: RateLimitTier;
  limit: number;
  windowMs: number;
  reason: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  active: boolean;
}

export interface RateLimitMetrics {
  tier: RateLimitTier;
  key: string;
  requests: number;
  blocked: number;
  allowed: number;
  resetTime: number;
  lastRequest: Date;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Tier': string;
  'Retry-After'?: string;
}

export interface RateLimitRequest {
  ip: string;
  userId?: string;
  organizationId?: string;
  path: string;
  method: string;
  userAgent?: string;
  timestamp: number;
}

export interface SlidingWindowCounter {
  key: string;
  windowMs: number;
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
  timestamps: number[];
}

export interface RateLimitError extends Error {
  statusCode: number;
  tier: RateLimitTier;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface AdminRateLimitAction {
  action: 'create' | 'update' | 'delete' | 'reset';
  target: {
    type: RateLimitTier;
    key: string;
  };
  config?: Partial<RateLimitConfig>;
  reason: string;
  adminUserId: string;
  timestamp: Date;
}

// Default rate limit configurations
export const DEFAULT_RATE_LIMITS: RateLimitTierConfig = {
  ip: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
    tier: 'ip',
    keyPrefix: 'rl:ip:',
  },
  user: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 500,
    tier: 'user',
    keyPrefix: 'rl:user:',
  },
  organization: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 2000,
    tier: 'organization',
    keyPrefix: 'rl:org:',
  },
  global: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10000,
    tier: 'global',
    keyPrefix: 'rl:global:',
  },
};

// Rate limit tiers in order of precedence (most restrictive first)
export const RATE_LIMIT_TIER_PRECEDENCE: RateLimitTier[] = [
  'user',
  'organization',
  'ip',
  'global',
];

export interface RateLimitContext {
  request: RateLimitRequest;
  user?: {
    id: string;
    organizationId?: string;
    tier: 'free' | 'pro' | 'enterprise';
  };
  organization?: {
    id: string;
    tier: 'free' | 'pro' | 'enterprise';
    memberCount: number;
  };
}

export interface EnhancedRateLimitResult extends RateLimitResult {
  appliedTier: RateLimitTier;
  allTiers: Record<
    RateLimitTier,
    Omit<RateLimitResult, 'appliedTier' | 'allTiers'>
  >;
  bypassReason?: string;
}

export type RateLimitBypassReason =
  | 'whitelist'
  | 'admin_override'
  | 'system_maintenance'
  | 'emergency_access'
  | 'health_check';

export interface RateLimitAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalRequests: number;
    blockedRequests: number;
    allowedRequests: number;
    blockRate: number;
  };
  byTier: Record<
    RateLimitTier,
    {
      requests: number;
      blocked: number;
      allowed: number;
      topKeys: Array<{
        key: string;
        requests: number;
        blocked: number;
      }>;
    }
  >;
  byEndpoint: Array<{
    path: string;
    requests: number;
    blocked: number;
    avgResponseTime: number;
  }>;
}

export interface RateLimitEvent {
  id: string;
  type: 'limit_exceeded' | 'limit_reset' | 'override_applied' | 'tier_changed';
  tier: RateLimitTier;
  key: string;
  details: Record<string, any>;
  timestamp: Date;
  metadata?: {
    ip: string;
    userAgent?: string;
    path: string;
    method: string;
  };
}
