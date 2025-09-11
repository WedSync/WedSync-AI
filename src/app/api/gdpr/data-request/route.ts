/**
 * GDPR Data Subject Request API Routes
 * WS-176 - GDPR Compliance System
 *
 * Secure API endpoints for data subject access, portability,
 * rectification, and other GDPR rights (Articles 15-22)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { z } from 'zod';
import {
  DataSubjectRights,
  RequestStatus,
  SecurityContext,
} from '@/types/gdpr';
import { dataProcessor } from '@/lib/gdpr/data-processor';
import crypto from 'crypto';

// ============================================================================
// Validation Schemas
// ============================================================================

const submitRequestSchema = z.object({
  request_type: z.nativeEnum(DataSubjectRights),
  additional_details: z
    .object({
      specific_data_categories: z.array(z.string()).optional(),
      date_range: z
        .object({
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
        })
        .optional(),
      export_format: z.enum(['json', 'csv', 'xml']).optional().default('json'),
      rectification_details: z.string().max(2000).optional(),
      objection_reason: z.string().max(1000).optional(),
      contact_preference: z
        .enum(['email', 'postal'])
        .optional()
        .default('email'),
    })
    .optional()
    .default({}),
});

const verifyRequestSchema = z.object({
  request_id: z.string().uuid(),
  verification_token: z.string().min(32).max(128),
});

const requestStatusSchema = z.object({
  request_id: z.string().uuid(),
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
    api_endpoint: '/api/gdpr/data-request',
    rate_limit_key: `data_request:${userId}:${Date.now()}`,
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
    const supabase = createClient();
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
// POST /api/gdpr/data-request - Submit data subject request
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

    // Rate limiting - check for recent requests
    const supabase = createClient();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { count: recentRequests } = await supabase
      .from('data_subject_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .gte('submitted_at', oneHourAgo.toISOString());

    if ((recentRequests || 0) >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message:
              'Too many requests. Please wait before submitting another request.',
          },
        },
        { status: 429 },
      );
    }

    // Input validation
    const rawBody = await request.json();
    const validatedData = validateInput(submitRequestSchema, rawBody);

    // Create security context
    const securityContext = createSecurityContext(request, auth.userId);

    // Submit data subject request
    const result = await dataProcessor.submitDataSubjectRequest(
      auth.userId,
      validatedData.request_type,
      securityContext,
      validatedData.additional_details,
    );

    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error?.code === 'USER_NOT_FOUND' ? 404 : 500,
      });
    }

    // Remove sensitive verification token from response
    const responseData = { ...result.data };
    delete responseData.verification_token;

    return NextResponse.json(
      {
        ...result,
        data: responseData,
        message:
          'Data subject request submitted successfully. Please check your email for verification instructions.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Data subject request submission error:', error);

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
// PUT /api/gdpr/data-request - Verify and process request
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    // Input validation
    const rawBody = await request.json();
    const validatedData = validateInput(verifyRequestSchema, rawBody);

    // Create security context (no auth required for verification)
    const securityContext: SecurityContext = {
      user_id: 'verifying',
      session_id: crypto.randomUUID(),
      ip_address_hash: crypto
        .createHash('sha256')
        .update(request.ip || 'unknown')
        .digest('hex'),
      user_agent_hash: crypto
        .createHash('sha256')
        .update(request.headers.get('user-agent') || 'unknown')
        .digest('hex'),
      timestamp: new Date(),
      api_endpoint: '/api/gdpr/data-request',
      rate_limit_key: `verify:${validatedData.request_id}:${Date.now()}`,
    };

    // Verify and process request
    const result = await dataProcessor.verifyAndProcessRequest(
      validatedData.request_id,
      validatedData.verification_token,
      securityContext,
    );

    if (!result.success) {
      return NextResponse.json(result, {
        status:
          result.error?.code === 'VERIFICATION_EXPIRED'
            ? 410
            : result.error?.code === 'VERIFICATION_FAILED'
              ? 400
              : 500,
      });
    }

    return NextResponse.json(
      {
        ...result,
        message:
          'Request verified successfully and processing has begun. You will receive another email when complete.',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Data subject request verification error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error.message.includes('Validation failed')
            ? error.message
            : 'Internal server error during verification',
        },
      },
      { status: error.message.includes('Validation failed') ? 400 : 500 },
    );
  }
}

// ============================================================================
// GET /api/gdpr/data-request?request_id=xxx - Get request status
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

    // Get request ID from query parameters
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('request_id');

    if (!requestId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETER',
            message: 'request_id parameter is required',
          },
        },
        { status: 400 },
      );
    }

    // Validate request ID format
    try {
      validateInput(z.string().uuid(), requestId);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Invalid request_id format',
          },
        },
        { status: 400 },
      );
    }

    // Get request status
    const result = await dataProcessor.getRequestStatus(requestId, auth.userId);

    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error?.code === 'REQUEST_NOT_FOUND' ? 404 : 500,
      });
    }

    // Remove sensitive fields from response
    const responseData = { ...result.data };
    delete responseData.verification_token;
    delete responseData.verification_expires_at;

    // Only include response_data if request is completed
    if (responseData.status !== RequestStatus.COMPLETED) {
      delete responseData.response_data;
    }

    return NextResponse.json(
      {
        ...result,
        data: responseData,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Get request status error:', error);

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
// GET /api/gdpr/data-request/list - List user's requests
// ============================================================================

export async function PATCH(request: NextRequest) {
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

    // Get user's requests (last 30 days)
    const supabase = createClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: requests, error } = await supabase
      .from('data_subject_requests')
      .select(
        `
        id,
        request_type,
        status,
        submitted_at,
        processed_at,
        completed_at,
        created_at,
        updated_at
      `,
      )
      .eq('user_id', auth.userId)
      .gte('submitted_at', thirtyDaysAgo.toISOString())
      .order('submitted_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('List requests error:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to retrieve requests',
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          requests: requests || [],
          total_count: requests?.length || 0,
          date_range: {
            from: thirtyDaysAgo.toISOString(),
            to: new Date().toISOString(),
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('List requests error:', error);

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
