/**
 * WS-344 Team B - Create Referral Link API Endpoint
 * POST /api/referrals/create-link
 * SECURITY: Rate limited, authenticated, comprehensive validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { withSecureValidation } from '@/lib/validation/middleware';
import {
  createReferralLinkSchema,
  CreateReferralLinkRequest,
} from '@/lib/validation/referral-schemas';
import {
  referralTrackingService,
  ReferralError,
  FraudError,
  ValidationError,
} from '@/services/referral-tracking';

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

interface RateLimitState {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitState>();
const RATE_LIMIT_REQUESTS = 5; // requests per window
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
// MAIN API HANDLER
// =============================================================================

export const POST = withSecureValidation(
  createReferralLinkSchema,
  async (request: NextRequest, validatedData: CreateReferralLinkRequest) => {
    try {
      // 1. AUTHENTICATION CHECK
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          {
            success: false,
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
          { status: 401 },
        );
      }

      // 2. VERIFY SUPPLIER ORGANIZATION ACCESS
      const supplierId = session.user.organizationId;
      if (!supplierId) {
        return NextResponse.json(
          {
            success: false,
            error: 'FORBIDDEN',
            message: 'Supplier organization access required',
            timestamp: new Date().toISOString(),
          },
          { status: 403 },
        );
      }

      // 3. RATE LIMITING CHECK
      const clientIp = getClientIp(request);
      const rateLimitKey = `referral-create-${supplierId}-${clientIp}`;
      const rateLimit = checkRateLimit(rateLimitKey);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'RATE_LIMITED',
            message:
              'Too many requests. Please wait before creating another referral link.',
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

      // 4. EXTRACT REQUEST METADATA FOR FRAUD DETECTION
      const userAgent = request.headers.get('user-agent') || '';
      const metadata = {
        ipAddress: clientIp,
        userAgent,
        userId: session.user.id,
      };

      // 5. CREATE REFERRAL LINK THROUGH SERVICE
      const result = await referralTrackingService.createReferralLink(
        supplierId,
        validatedData,
        metadata,
      );

      // 6. SUCCESS RESPONSE WITH RATE LIMIT HEADERS
      const response = NextResponse.json(
        {
          success: true,
          data: {
            referralCode: result.referralCode,
            customLink: result.customLink,
            qrCodeUrl: result.qrCodeUrl,
          },
          message: 'Referral link created successfully',
          timestamp: new Date().toISOString(),
        },
        { status: 201 },
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
      console.error('[CreateReferralLink] Error:', error);

      // Handle specific error types with appropriate status codes
      if (error instanceof FraudError) {
        return NextResponse.json(
          {
            success: false,
            error: 'FRAUD_DETECTED',
            message:
              'Suspicious activity detected. Please contact support if you believe this is an error.',
            code: error.fraudType,
            timestamp: new Date().toISOString(),
          },
          { status: 403 },
        );
      }

      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: error.message,
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
          message:
            'An unexpected error occurred while creating the referral link',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  },
);

// =============================================================================
// OPTIONS HANDLER FOR CORS PREFLIGHT
// =============================================================================

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// =============================================================================
// ERROR BOUNDARY - CATCH ANY UNHANDLED ERRORS
// =============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Prevent caching of this endpoint
export const revalidate = 0;
