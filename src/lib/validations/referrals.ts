/**
 * WS-170: Viral Optimization System - Referral Validation Utilities
 *
 * Validation utilities specific to the referral system
 */

import { z } from 'zod';
import { sanitizeUserInput } from '@/lib/security/xss-protection';
import { REFERRAL_CONSTRAINTS, REFERRAL_DEFAULTS } from '@/types/referrals';

// Referral code validation schema
export const referralCodeSchema = z.object({
  code: z
    .string()
    .min(REFERRAL_CONSTRAINTS.CODE.MIN_LENGTH)
    .max(REFERRAL_CONSTRAINTS.CODE.MAX_LENGTH)
    .regex(
      REFERRAL_CONSTRAINTS.CODE.ALLOWED_CHARS,
      'Code must contain only uppercase letters and numbers',
    ),
  user_id: z.string().uuid('Invalid user ID format'),
  description: z
    .string()
    .max(REFERRAL_CONSTRAINTS.DESCRIPTION.MAX_LENGTH)
    .optional(),
  campaign_name: z
    .string()
    .min(1)
    .max(REFERRAL_CONSTRAINTS.CAMPAIGN_NAME.MAX_LENGTH)
    .optional(),
  expires_at: z.string().datetime().optional(),
  max_uses: z
    .number()
    .min(REFERRAL_CONSTRAINTS.MAX_USES.MIN)
    .max(REFERRAL_CONSTRAINTS.MAX_USES.MAX)
    .optional(),
  is_active: z.boolean().default(true),
});

// Create referral request validation
export const createReferralRequestSchema = z.object({
  description: z
    .string()
    .min(1)
    .max(REFERRAL_CONSTRAINTS.DESCRIPTION.MAX_LENGTH)
    .optional(),
  campaign_name: z
    .string()
    .min(1)
    .max(REFERRAL_CONSTRAINTS.CAMPAIGN_NAME.MAX_LENGTH)
    .optional(),
  expires_at: z
    .string()
    .datetime()
    .refine((date) => new Date(date) > new Date(), {
      message: 'Expiry date must be in the future',
    })
    .optional(),
  max_uses: z
    .number()
    .min(REFERRAL_CONSTRAINTS.MAX_USES.MIN)
    .max(REFERRAL_CONSTRAINTS.MAX_USES.MAX)
    .optional(),
});

// Referral stats query validation
export const referralStatsQuerySchema = z
  .object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce
      .number()
      .min(1)
      .max(REFERRAL_DEFAULTS.MAX_PAGE_SIZE)
      .default(REFERRAL_DEFAULTS.DEFAULT_PAGE_SIZE),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    campaign_name: z
      .string()
      .max(REFERRAL_CONSTRAINTS.CAMPAIGN_NAME.MAX_LENGTH)
      .optional(),
    include_history: z.coerce.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['start_date'],
    },
  );

// Referral conversion validation
export const referralConversionSchema = z.object({
  referral_code_id: z.string().uuid('Invalid referral code ID'),
  referred_user_id: z.string().uuid('Invalid referred user ID'),
  conversion_type: z.enum(['signup', 'subscription', 'purchase', 'trial']),
  revenue_generated: z.number().min(0),
  metadata: z.record(z.any()).optional(),
});

// Validation helpers
export function validateReferralCode(code: string): boolean {
  return (
    REFERRAL_CONSTRAINTS.CODE.ALLOWED_CHARS.test(code) &&
    code.length >= REFERRAL_CONSTRAINTS.CODE.MIN_LENGTH &&
    code.length <= REFERRAL_CONSTRAINTS.CODE.MAX_LENGTH
  );
}

export function validateExpiryDate(expiryDate: string): boolean {
  try {
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry > now;
  } catch {
    return false;
  }
}

export function sanitizeReferralInput(input: string): string {
  return sanitizeUserInput(input);
}

// Business logic validators
export function isReferralCodeExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date();
}

export function hasExceededMaxUses(uses: number, maxUses?: number): boolean {
  if (!maxUses) return false;
  return uses >= maxUses;
}

export function canCreateReferralCode(
  currentCodes: number,
  userTier: 'free' | 'premium' | 'enterprise' = 'free',
): boolean {
  const limits = {
    free: 5,
    premium: 25,
    enterprise: 100,
  };

  return currentCodes < limits[userTier];
}

// Error message generators
export const REFERRAL_ERROR_MESSAGES = {
  INVALID_CODE_FORMAT:
    'Referral code must be 4-20 characters and contain only uppercase letters and numbers',
  CODE_EXPIRED: 'This referral code has expired',
  MAX_USES_EXCEEDED: 'This referral code has reached its maximum usage limit',
  INVALID_EXPIRY_DATE: 'Expiry date must be in the future',
  RATE_LIMIT_EXCEEDED:
    'Too many referral codes created. Please try again later',
  DESCRIPTION_TOO_LONG: `Description must be ${REFERRAL_CONSTRAINTS.DESCRIPTION.MAX_LENGTH} characters or less`,
  CAMPAIGN_NAME_TOO_LONG: `Campaign name must be ${REFERRAL_CONSTRAINTS.CAMPAIGN_NAME.MAX_LENGTH} characters or less`,
  INVALID_DATE_RANGE: 'Start date must be before or equal to end date',
} as const;

export type ReferralErrorMessage = keyof typeof REFERRAL_ERROR_MESSAGES;
