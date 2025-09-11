/**
 * GDPR Consent API Routes
 * WS-176 - GDPR Compliance System
 *
 * Secure API endpoints for GDPR consent management
 * Implements input validation, authentication, and audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import {
  ConsentType,
  ConsentStatus,
  GDPRLegalBasis,
  SecurityContext,
} from '@/types/gdpr';
import { consentManager } from '@/lib/gdpr/consent-manager';
import crypto from 'crypto';

// ============================================================================
// Validation Schemas
// ============================================================================

const recordConsentSchema = z.object({
  consent_type: z.nativeEnum(ConsentType),
  granted: z.boolean(),
  metadata: z
    .object({
      consent_method: z.enum(['explicit', 'implied', 'opt_out']).optional(),
      source_page: z.string().max(500).optional(),
      campaign_id: z.string().max(100).optional(),
      user_agent: z.string().max(1000).optional(),
    })
    .optional()
    .default({}),
});

const withdrawConsentSchema = z.object({
  consent_type: z.nativeEnum(ConsentType),
  reason: z.string().max(1000).optional(),
});

const bulkConsentSchema = z.object({
  consents: z
    .array(
      z.object({
        consent_type: z.nativeEnum(ConsentType),
        granted: z.boolean(),
        metadata: z.object({}).optional(),
      }),
    )
    .min(1)
    .max(10), // Limit bulk operations
});

const validateConsentSchema = z.object({
  consent_type: z.nativeEnum(ConsentType),
  processing_purpose: z.string().max(200).optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

function createSecurityContext(
  request: NextRequest,
  userId: string,
): SecurityContext {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded
    ? forwarded.split(', ')[0]
    : realIp || request.ip || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return {
    user_id: userId,
    session_id: crypto.randomUUID(),
    ip_address_hash: crypto.createHash('sha256').update(ip).digest('hex'),
    user_agent_hash: crypto
      .createHash('sha256')
      .update(userAgent)
      .digest('hex'),
    timestamp: new Date(),
    api_endpoint: '/api/gdpr/consent',
    rate_limit_key: `consent:${userId}:${Date.now()}`,
  };
}

function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation failed: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      );
    }
    throw error;
  }
}

async function authenticateUser(
  request: NextRequest,
): Promise<{ userId: string; email: string } | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return null;
    }

    // Double-check user exists in database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', session.user.id)
      .single();

    if (error || !user) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
    };
  } catch (error) {
    return null;
  }
}

// ============================================================================
// POST /api/gdpr/consent - Record consent decision
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 },
      );
    }

    // Rate limiting check would go here
    // await rateLimitService.checkRateLimit(request);

    // Input validation
    const rawBody = await request.json();
    const validatedData = validateInput(recordConsentSchema, rawBody);

    // Create security context
    const securityContext = createSecurityContext(request, auth.userId);

    // Record consent
    const result = await consentManager.recordConsent(
      auth.userId,
      validatedData.consent_type,
      validatedData.granted,
      securityContext,
      validatedData.metadata,
    );

    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error?.code === 'USER_NOT_FOUND' ? 404 : 500,
      });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // Log error but don't leak details to client
    console.error('Consent API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message.includes('Validation failed')
            ? error.message
            : 'Internal server error',
        },
      },
      { status: error.message.includes('Validation failed') ? 400 : 500 },
    );
  }
}

// ============================================================================
// GET /api/gdpr/consent - Retrieve consent bundle
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 },
      );
    }

    // Get consent bundle
    const result = await consentManager.getConsentBundle(auth.userId);

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Get consent bundle error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT /api/gdpr/consent - Bulk consent update
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    // Authentication check
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 },
      );
    }

    // Input validation
    const rawBody = await request.json();
    const validatedData = validateInput(bulkConsentSchema, rawBody);

    // Create security context
    const securityContext = createSecurityContext(request, auth.userId);

    // Bulk update consents
    const result = await consentManager.bulkUpdateConsents(
      auth.userId,
      validatedData.consents,
      securityContext,
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('Bulk consent update error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message.includes('Validation failed')
            ? error.message
            : 'Internal server error',
        },
      },
      { status: error.message.includes('Validation failed') ? 400 : 500 },
    );
  }
}

// ============================================================================
// DELETE /api/gdpr/consent - Withdraw consent
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 },
      );
    }

    // Input validation
    const rawBody = await request.json();
    const validatedData = validateInput(withdrawConsentSchema, rawBody);

    // Create security context
    const securityContext = createSecurityContext(request, auth.userId);

    // Withdraw consent
    const result = await consentManager.withdrawConsent(
      auth.userId,
      validatedData.consent_type,
      securityContext,
      validatedData.reason,
    );

    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error?.code === 'WITHDRAWAL_NOT_ALLOWED' ? 400 : 500,
      });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Withdraw consent error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message.includes('Validation failed')
            ? error.message
            : 'Internal server error',
        },
      },
      { status: error.message.includes('Validation failed') ? 400 : 500 },
    );
  }
}
