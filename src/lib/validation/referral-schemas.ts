/**
 * WS-344 Team B - Supplier Referral & Gamification System
 * Zod validation schemas for all referral API endpoints
 * SECURITY: Prevents SQL injection, XSS, and fraud attempts
 */

import { z } from 'zod';

// Import base validation primitives
import { uuidSchema, emailSchema, secureStringSchema } from './schemas';

// =============================================================================
// BASE REFERRAL VALIDATION PRIMITIVES
// =============================================================================

// Referral code schema - alphanumeric only, fixed length for security
export const referralCodeSchema = z
  .string()
  .length(8, 'Referral code must be exactly 8 characters')
  .regex(
    /^[A-Z0-9]{8}$/,
    'Referral code must contain only uppercase letters and numbers',
  )
  .transform((val) => val.toUpperCase().trim());

// Referral stage schema - strictly controlled enum
export const referralStageSchema = z.enum(
  [
    'link_created',
    'link_clicked',
    'signup_started',
    'trial_active',
    'first_payment',
    'reward_issued',
  ],
  {
    errorMap: () => ({ message: 'Invalid referral stage' }),
  },
);

// Source tracking schema
export const referralSourceSchema = z.enum(
  ['link', 'qr', 'email', 'social', 'direct_entry'],
  {
    errorMap: () => ({ message: 'Invalid referral source' }),
  },
);

// Reward type schema
export const rewardTypeSchema = z.enum(
  ['1_month_free', 'pending', 'not_eligible'],
  {
    errorMap: () => ({ message: 'Invalid reward type' }),
  },
);

// Period filter schema for leaderboards
export const periodFilterSchema = z.enum(
  ['all_time', 'this_year', 'this_quarter', 'this_month', 'this_week'],
  {
    errorMap: () => ({ message: 'Invalid time period' }),
  },
);

// Custom message schema with XSS protection
export const customMessageSchema = z
  .string()
  .max(500, 'Custom message too long')
  .optional()
  .transform((val) => (val ? val.trim() : undefined))
  .refine(
    (val) =>
      !val ||
      !/(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi.test(
        val,
      ),
    'Message contains potentially dangerous SQL patterns',
  )
  .refine(
    (val) =>
      !val || !/<script|<iframe|<object|<embed|javascript:|data:/gi.test(val),
    'Message contains potentially dangerous XSS patterns',
  );

// IP address schema for fraud detection
export const ipAddressSchema = z
  .string()
  .ip({ message: 'Invalid IP address format' })
  .optional();

// User agent schema with length limits
export const userAgentSchema = z
  .string()
  .max(1000, 'User agent string too long')
  .optional()
  .transform((val) => (val ? val.trim() : undefined));

// UTM parameter schemas for campaign tracking
export const utmSourceSchema = z
  .string()
  .max(100, 'UTM source too long')
  .regex(/^[a-zA-Z0-9_\-\.]+$/, 'UTM source contains invalid characters')
  .optional();

export const utmMediumSchema = z
  .string()
  .max(100, 'UTM medium too long')
  .regex(/^[a-zA-Z0-9_\-\.]+$/, 'UTM medium contains invalid characters')
  .optional();

export const utmCampaignSchema = z
  .string()
  .max(100, 'UTM campaign too long')
  .regex(/^[a-zA-Z0-9_\-\.]+$/, 'UTM campaign contains invalid characters')
  .optional();

// =============================================================================
// CREATE REFERRAL LINK API SCHEMAS
// =============================================================================

export const createReferralLinkSchema = z
  .object({
    customMessage: customMessageSchema,
    utmSource: utmSourceSchema,
    utmMedium: utmMediumSchema,
    utmCampaign: utmCampaignSchema,
    generateQR: z.boolean().default(true),
    source: referralSourceSchema.default('link'),
  })
  .strict();

export type CreateReferralLinkRequest = z.infer<
  typeof createReferralLinkSchema
>;

export const createReferralLinkResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      referralCode: referralCodeSchema,
      customLink: z.string().url('Invalid link format'),
      qrCodeUrl: z.string().url('Invalid QR code URL').optional(),
    })
    .optional(),
  error: z.string().optional(),
});

// =============================================================================
// TRACK CONVERSION API SCHEMAS
// =============================================================================

export const trackConversionSchema = z
  .object({
    referralCode: referralCodeSchema,
    stage: referralStageSchema,
    referredId: uuidSchema.optional(), // Set when user completes signup
    sourceDetails: z
      .string()
      .max(200, 'Source details too long')
      .optional()
      .transform((val) => (val ? val.trim() : undefined)),
    metadata: z.record(z.string(), z.unknown()).optional(), // Flexible metadata object
  })
  .strict();

export type TrackConversionRequest = z.infer<typeof trackConversionSchema>;

export const trackConversionResponseSchema = z.object({
  success: z.boolean(),
  rewardEarned: z.boolean().optional(),
  milestoneAchieved: z
    .object({
      title: z.string(),
      description: z.string(),
      rewardType: z.string(),
    })
    .optional(),
  error: z.string().optional(),
});

// =============================================================================
// REFERRAL STATS API SCHEMAS
// =============================================================================

export const referralStatsQuerySchema = z
  .object({
    period: periodFilterSchema.default('all_time'),
    includeBreakdown: z
      .enum(['true', 'false'])
      .transform((val) => val === 'true')
      .default('false'),
  })
  .strict();

export type ReferralStatsQuery = z.infer<typeof referralStatsQuerySchema>;

export const referralStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      totalReferrals: z.number().int().min(0),
      activeTrials: z.number().int().min(0),
      paidConversions: z.number().int().min(0),
      conversionRate: z.number().min(0).max(100),
      monthsEarned: z.number().int().min(0),
      currentRankings: z.object({
        overallRank: z.number().int().positive().optional(),
        categoryRank: z.number().int().positive().optional(),
        geographicRank: z.number().int().positive().optional(),
        rankChange: z.number().int().optional(),
        trend: z.enum(['rising', 'falling', 'stable']).optional(),
      }),
      recentActivity: z
        .array(
          z.object({
            id: uuidSchema,
            stage: referralStageSchema,
            referredEmail: emailSchema,
            createdAt: z.string().datetime(),
            convertedAt: z.string().datetime().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  error: z.string().optional(),
});

// =============================================================================
// LEADERBOARD API SCHEMAS
// =============================================================================

export const leaderboardQuerySchema = z
  .object({
    period: periodFilterSchema.default('all_time'),
    category: z
      .string()
      .max(50, 'Category filter too long')
      .regex(/^[a-zA-Z_]+$/, 'Category contains invalid characters')
      .optional(),
    location: z
      .string()
      .max(100, 'Location filter too long')
      .regex(/^[a-zA-Z\s\-,]+$/, 'Location contains invalid characters')
      .optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform((val) => parseInt(val, 10))
      .refine(
        (val) => val >= 1 && val <= 100,
        'Limit must be between 1 and 100',
      )
      .default('50'),
    offset: z
      .string()
      .regex(/^\d+$/, 'Offset must be a number')
      .transform((val) => parseInt(val, 10))
      .refine((val) => val >= 0, 'Offset cannot be negative')
      .default('0'),
  })
  .strict();

export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

export const leaderboardResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      entries: z.array(
        z.object({
          rank: z.number().int().positive(),
          supplierId: uuidSchema,
          businessName: z.string().min(1),
          logoUrl: z.string().url().optional(),
          businessLocation: z.string().optional(),
          businessCategory: z.string().optional(),
          paidConversions: z.number().int().min(0),
          conversionRate: z.number().min(0).max(100),
          monthsEarned: z.number().int().min(0),
          rankChange: z.number().int(),
          trend: z.enum(['rising', 'falling', 'stable']),
          badges: z.array(z.string()).optional(),
        }),
      ),
      totalEntries: z.number().int().min(0),
      currentPage: z.number().int().min(1),
      totalPages: z.number().int().min(1),
      lastUpdated: z.string().datetime(),
    })
    .optional(),
  error: z.string().optional(),
});

// =============================================================================
// INTERNAL SERVICE SCHEMAS (NOT FOR API ENDPOINTS)
// =============================================================================

// Database record schemas for service layer
export const supplierReferralRecordSchema = z.object({
  id: uuidSchema,
  referrer_id: uuidSchema,
  referred_email: emailSchema,
  referred_id: uuidSchema.optional(),
  referral_code: referralCodeSchema,
  custom_link: z.string().url(),
  qr_code_url: z.string().url().optional(),
  source: referralSourceSchema,
  source_details: z.string().optional(),
  stage: referralStageSchema,
  clicked_at: z.string().datetime().optional(),
  signed_up_at: z.string().datetime().optional(),
  trial_started_at: z.string().datetime().optional(),
  converted_at: z.string().datetime().optional(),
  reward_issued_at: z.string().datetime().optional(),
  referrer_reward: rewardTypeSchema,
  referee_bonus: z.string().optional(),
  primary_referrer: z.boolean(),
  attribution_window: z.number().int().positive(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  device_fingerprint: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  custom_message: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const referralLeaderboardRecordSchema = z.object({
  id: uuidSchema,
  supplier_id: uuidSchema,
  paid_conversions: z.number().int().min(0),
  total_referrals_sent: z.number().int().min(0),
  conversion_rate: z.number().min(0).max(100),
  months_earned: z.number().int().min(0),
  links_created: z.number().int().min(0),
  links_clicked: z.number().int().min(0),
  signups_generated: z.number().int().min(0),
  trials_activated: z.number().int().min(0),
  category_rank: z.number().int().positive().optional(),
  geographic_rank: z.number().int().positive().optional(),
  overall_rank: z.number().int().positive().optional(),
  rank_change: z.number().int(),
  trend: z.enum(['rising', 'falling', 'stable']),
  period_type: periodFilterSchema,
  avg_conversion_time_days: z.number().min(0).optional(),
  best_performing_source: referralSourceSchema.optional(),
  milestones_achieved: z.array(z.string()),
  badges_earned: z.array(z.string()),
  last_conversion_at: z.string().datetime().optional(),
  updated_at: z.string().datetime(),
});

// =============================================================================
// FRAUD DETECTION SCHEMAS
// =============================================================================

export const fraudDetectionDataSchema = z.object({
  referralCode: referralCodeSchema,
  ipAddress: ipAddressSchema,
  userAgent: userAgentSchema,
  referrerId: uuidSchema,
  referredEmail: emailSchema,
  deviceFingerprint: z.string().max(200).optional(),
  timestamp: z.string().datetime(),
  suspiciousPatterns: z.array(z.string()).optional(),
});

export const auditLogEntrySchema = z.object({
  eventType: z.enum([
    'referral_created',
    'referral_clicked',
    'conversion_tracked',
    'reward_issued',
    'fraud_attempt',
    'suspicious_activity',
    'manual_review',
  ]),
  referralId: uuidSchema.optional(),
  supplierId: uuidSchema.optional(),
  eventData: z.record(z.string(), z.unknown()),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  ipAddress: ipAddressSchema,
  userAgent: userAgentSchema,
  requestHeaders: z.record(z.string(), z.string()).optional(),
  requiresReview: z.boolean().default(false),
});

// =============================================================================
// RATE LIMITING SCHEMAS
// =============================================================================

export const rateLimitConfigSchema = z.object({
  endpoint: z.string().min(1),
  requests: z.number().int().positive(),
  windowSeconds: z.number().int().positive(),
  identifier: z.string().min(1), // user ID, IP, etc.
});

export const rateLimitResponseSchema = z.object({
  allowed: z.boolean(),
  remaining: z.number().int().min(0),
  resetTime: z.number().int().positive(),
  retryAfter: z.number().int().optional(),
});

// =============================================================================
// ERROR RESPONSE SCHEMAS
// =============================================================================

export const errorResponseSchema = z.object({
  error: z.string().min(1),
  message: z.string().min(1),
  details: z.string().optional(),
  timestamp: z.string().datetime(),
  code: z.string().optional(),
});

// =============================================================================
// WEBHOOK SCHEMAS (FOR FUTURE INTEGRATION)
// =============================================================================

export const referralWebhookSchema = z.object({
  event: z.enum([
    'referral.created',
    'referral.converted',
    'reward.issued',
    'milestone.achieved',
  ]),
  data: z.object({
    referralId: uuidSchema,
    referrerId: uuidSchema,
    referredId: uuidSchema.optional(),
    stage: referralStageSchema,
    timestamp: z.string().datetime(),
  }),
  signature: z.string().min(1), // HMAC signature for verification
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SupplierReferralRecord = z.infer<
  typeof supplierReferralRecordSchema
>;
export type ReferralLeaderboardRecord = z.infer<
  typeof referralLeaderboardRecordSchema
>;
export type FraudDetectionData = z.infer<typeof fraudDetectionDataSchema>;
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;
export type RateLimitResponse = z.infer<typeof rateLimitResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type ReferralWebhook = z.infer<typeof referralWebhookSchema>;

// All schemas are exported individually above
