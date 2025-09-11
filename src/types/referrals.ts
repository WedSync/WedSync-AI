/**
 * WS-170: Viral Optimization System - Referral Type Definitions
 *
 * TypeScript type definitions for the referral system
 */

// Database types
export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  description?: string;
  campaign_name?: string;
  created_at: string;
  expires_at?: string;
  uses: number;
  max_uses?: number;
  is_active: boolean;
}

export interface ReferralConversion {
  id: string;
  referral_code_id: string;
  referred_user_id: string;
  converted_at: string;
  revenue_generated: number;
  conversion_type: 'signup' | 'subscription' | 'purchase' | 'trial';
  metadata?: Record<string, any>;
}

export interface ReferralAnalytics {
  id: string;
  user_id: string;
  referral_code_id?: string;
  action: 'code_created' | 'code_clicked' | 'conversion' | 'revenue_generated';
  timestamp: string;
  metadata?: Record<string, any>;
}

// API Request/Response types
export interface CreateReferralRequest {
  description?: string;
  campaign_name?: string;
  expires_at?: string;
  max_uses?: number;
}

export interface CreateReferralResponse {
  success: boolean;
  data?: ReferralCode;
  error?: string;
}

export interface ReferralStatsQuery {
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  campaign_name?: string;
  include_history?: boolean;
}

export interface ReferralStats {
  user_id: string;
  total_codes: number;
  active_codes: number;
  expired_codes: number;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  conversion_rate: number;
  viral_coefficient: number;
  average_revenue_per_conversion: number;
  most_successful_code?: {
    code: string;
    conversions: number;
    revenue: number;
  };
  recent_activity: {
    codes_created_last_30d: number;
    clicks_last_30d: number;
    conversions_last_30d: number;
    revenue_last_30d: number;
  };
  top_campaigns?: Array<{
    campaign_name: string;
    codes: number;
    conversions: number;
    revenue: number;
  }>;
  referral_history?: Array<{
    id: string;
    code: string;
    description?: string;
    campaign_name?: string;
    created_at: string;
    expires_at?: string;
    uses: number;
    conversions: number;
    revenue: number;
    is_active: boolean;
  }>;
}

export interface ReferralStatsResponse {
  success: boolean;
  data?: ReferralStats;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  error?: string;
}

// Validation types
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

// Viral coefficient calculation types
export interface ViralMetrics {
  invitations_sent: number;
  conversions: number;
  active_users: number;
  viral_coefficient: number;
  k_factor: number;
  cycle_time_days: number;
}

// Campaign performance types
export interface CampaignPerformance {
  campaign_name: string;
  total_codes: number;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  conversion_rate: number;
  average_revenue_per_user: number;
  roi: number;
  created_at: string;
  last_activity: string;
}

// Error types for better error handling
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface ValidationError extends APIError {
  field: string;
  value: any;
  constraint: string;
}

// Utility types
export type ReferralCodeStatus =
  | 'active'
  | 'expired'
  | 'disabled'
  | 'max_uses_reached';

export type ConversionType =
  | 'signup'
  | 'subscription'
  | 'purchase'
  | 'trial'
  | 'upgrade';

export type ReferralAction =
  | 'code_created'
  | 'code_clicked'
  | 'conversion'
  | 'revenue_generated'
  | 'code_shared'
  | 'code_expired'
  | 'code_disabled';

// Database table names for type safety
export const REFERRAL_TABLES = {
  CODES: 'referral_codes',
  CONVERSIONS: 'referral_conversions',
  ANALYTICS: 'referral_analytics',
} as const;

// Default values and constants
export const REFERRAL_DEFAULTS = {
  CODE_LENGTH: 8,
  MAX_CODES_PER_HOUR: 10,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  VIRAL_COEFFICIENT_THRESHOLD: 1.0, // Above 1.0 indicates viral growth
  CACHE_DURATION_SECONDS: 60,
} as const;

// Validation schemas (exported for reuse)
export const REFERRAL_CONSTRAINTS = {
  CODE: {
    MIN_LENGTH: 4,
    MAX_LENGTH: 20,
    ALLOWED_CHARS: /^[A-Z0-9]+$/,
  },
  DESCRIPTION: {
    MAX_LENGTH: 255,
  },
  CAMPAIGN_NAME: {
    MAX_LENGTH: 100,
  },
  MAX_USES: {
    MIN: 1,
    MAX: 10000,
  },
} as const;
