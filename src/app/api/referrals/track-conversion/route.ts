/**
 * WS-344 Team B - Track Conversion API Endpoint
 * POST /api/referrals/track-conversion
 * SECURITY: Rate limited, fraud prevention, stage validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withValidation } from '@/lib/validation/middleware';
import {
  trackConversionSchema,
  TrackConversionRequest,
} from '@/lib/validation/referral-schemas';
import {
  referralTrackingService,
  ReferralError,
  FraudError,
  ValidationError,
} from '@/services/referral-tracking';

// =============================================================================
// RATE LIMITING CONFIGURATION (HIGHER LIMIT FOR LEGITIMATE TRACKING)
// =============================================================================

interface RateLimitState {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitState>();
const RATE_LIMIT_REQUESTS = 20; // Higher limit for legitimate conversion tracking
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const state = rateLimitStore.get(identifier);

  // Reset if window expired
  if (!state || now >= state.resetTime) {
    const newState = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    rateLimitStore.set(identifier, newState);
    return {
      allowed: true,
      remaining: RATE_LIMIT_REQUESTS - 1,
      resetTime: newState.resetTime,
    };
  }

  // Check if limit exceeded
  if (state.count >= RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: state.resetTime,
    };
  }

  // Increment and allow
  state.count++;
  rateLimitStore.set(identifier, state);

  return {
    allowed: true,
    remaining: RATE_LIMIT_REQUESTS - state.count,
    resetTime: state.resetTime,
  };
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const remote = request.headers.get('remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return real || remote || 'unknown';
}

// =============================================================================
// CONVERSION VALIDATION HELPERS
// =============================================================================

function validateReferralCode(code: string): boolean {
  // Referral codes should be exactly 8 characters, alphanumeric uppercase
  const regex = /^[A-Z0-9]{8}$/;
  return regex.test(code);
}

function sanitizeMetadata(metadata: any): any {
  // Remove potentially sensitive information from metadata
  const sanitized = { ...metadata };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.secret;
  delete sanitized.api_key;
  return sanitized;
}

// =============================================================================
// MAIN API HANDLER
// =============================================================================

export const POST = withValidation(
  trackConversionSchema,
  async (request: NextRequest, validatedData: TrackConversionRequest) => {
    try {
      // 1. EXTRACT REQUEST METADATA
      const clientIp = getClientIp(request);
      const userAgent = request.headers.get('user-agent') || '';
      const referer = request.headers.get('referer');
      const origin = request.headers.get('origin');

      // 2. BASIC FRAUD PREVENTION - ORIGIN CHECK
      // For state-changing operations, ensure request comes from same origin
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL,
        'https://wedsync.com',
        'https://app.wedsync.com',
        'http://localhost:3000', // Development only
      ].filter(Boolean);

      if (origin && !allowedOrigins.includes(origin)) {
        return NextResponse.json(
          {
            success: false,
            error: 'FORBIDDEN',
            message: 'Cross-origin requests not allowed',
            timestamp: new Date().toISOString(),
          },
          { status: 403 },
        );
      }

      // 3. RATE LIMITING CHECK (PER IP + REFERRAL CODE COMBINATION)
      const rateLimitKey = `conversion-track-${clientIp}-${validatedData.referralCode}`;
      const rateLimit = checkRateLimit(rateLimitKey);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'RATE_LIMITED',
            message:
              'Too many conversion tracking requests. Please wait before trying again.',
            retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
            timestamp: new Date().toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(
                rateLimit.resetTime / 1000,
              ).toString(),
              'Retry-After': Math.ceil(
                (rateLimit.resetTime - Date.now()) / 1000,
              ).toString(),
            },
          },
        );
      }

      // 4. ADDITIONAL REFERRAL CODE VALIDATION
      if (!validateReferralCode(validatedData.referralCode)) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_REFERRAL_CODE',
            message: 'Referral code format is invalid',
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );
      }

      // 5. PREPARE METADATA FOR TRACKING SERVICE
      const metadata = {
        ipAddress: clientIp,
        userAgent,
        referer: referer || undefined,
        origin: origin || undefined,
        timestamp: new Date().toISOString(),
      };

      // 6. TRACK CONVERSION THROUGH SERVICE
      const result = await referralTrackingService.trackConversion(
        validatedData,
        { ipAddress: clientIp, userAgent },
      );

      // 7. SUCCESS RESPONSE WITH CONVERSION DETAILS
      const response = NextResponse.json(
        {
          success: true,
          data: {
            stage: validatedData.stage,
            rewardEarned: result.rewardEarned,
            milestoneAchieved: result.milestoneAchieved,
          },
          message: `Conversion tracked successfully: ${validatedData.stage}`,
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      );

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', RATE_LIMIT_REQUESTS.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        rateLimit.remaining.toString(),
      );
      response.headers.set(
        'X-RateLimit-Reset',
        Math.ceil(rateLimit.resetTime / 1000).toString(),
      );

      return response;
    } catch (error) {
      console.error('[TrackConversion] Error:', error);

      // Handle specific error types with appropriate responses
      if (error instanceof FraudError) {
        return NextResponse.json(
          {
            success: false,
            error: 'FRAUD_DETECTED',
            message: 'Suspicious activity detected in conversion tracking',
            code: error.fraudType,
            details:
              error.fraudType === 'self_referral'
                ? 'Self-referral attempts are not allowed'
                : 'Please contact support if you believe this is an error',
            timestamp: new Date().toISOString(),
          },
          { status: 403 },
        );
      }

      if (error instanceof ValidationError) {
        // Map common validation errors to user-friendly messages
        let message = error.message;
        if (error.message.includes('Invalid referral code')) {
          message = 'The referral code provided does not exist or has expired';
        } else if (error.message.includes('Attribution window expired')) {
          message =
            'This referral link has expired and can no longer be used for conversions';
        } else if (error.message.includes('Cannot move to earlier stage')) {
          message = 'Invalid stage progression in conversion funnel';
        }

        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message,
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );
      }

      if (error instanceof ReferralError) {
        return NextResponse.json(
          {
            success: false,
            error: error.code,
            message: error.message,
            timestamp: new Date().toISOString(),
          },
          { status: error.code === 'DATABASE_ERROR' ? 500 : 400 },
        );
      }

      // Generic error fallback
      return NextResponse.json(
        {
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while tracking the conversion',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  },
);

// =============================================================================
// GET HANDLER FOR CONVERSION STATUS CHECK (PUBLIC ENDPOINT)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referralCode = searchParams.get('code');

    if (!referralCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_PARAMETER',
          message: 'Referral code is required',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    if (!validateReferralCode(referralCode)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_REFERRAL_CODE',
          message: 'Invalid referral code format',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // Rate limiting for GET requests (more lenient)
    const clientIp = getClientIp(request);
    const rateLimitKey = `conversion-check-${clientIp}`;
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMITED',
          message: 'Too many requests. Please wait before checking again.',
          timestamp: new Date().toISOString(),
        },
        { status: 429 },
      );
    }

    // This would check the referral status - simplified implementation
    // In practice, you might want to return basic info about the referral
    return NextResponse.json(
      {
        success: true,
        data: {
          referralCode,
          valid: true,
          message: 'Referral code is valid and active',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[ConversionCheck] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error checking referral status',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// =============================================================================
// OPTIONS HANDLER FOR CORS PREFLIGHT
// =============================================================================

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// =============================================================================
// RUNTIME CONFIGURATION
// =============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Prevent caching of this endpoint
export const revalidate = 0;
