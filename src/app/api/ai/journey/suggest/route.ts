/**
 * WS-208: AI Journey Suggestions API Endpoint
 * POST /api/ai/journey/suggest - Generate new journey suggestions
 * Team B - Secure implementation with authentication, validation, and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { JourneySuggestionsEngine } from '@/lib/ai/journey-suggestions-engine';
import {
  JourneySuggestionRequestSchema,
  APISuccessSchema,
  GeneratedJourneySchema,
  validateVendorAccess,
  validateSubscriptionTier,
} from '@/lib/validation/journey-ai-schemas';
import { withSecureValidation } from '@/lib/validation/middleware';
import { defaultRateLimiter } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/lib/rate-limit';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

// Rate limiting configuration for AI generation (expensive operation)
const AI_GENERATION_RATE_LIMITS: Record<
  string,
  { requests: number; window: number }
> = {
  FREE: { requests: 0, window: 3600 }, // No AI access on free tier
  STARTER: { requests: 0, window: 3600 }, // No AI access on starter tier
  PROFESSIONAL: { requests: 10, window: 3600 }, // 10 per hour
  SCALE: { requests: 25, window: 3600 }, // 25 per hour
  ENTERPRISE: { requests: 100, window: 3600 }, // 100 per hour
};

/**
 * Generate AI-powered journey suggestions
 * POST /api/ai/journey/suggest
 */
export const POST = withSecureValidation(
  JourneySuggestionRequestSchema,
  async (request: NextRequest, validatedData) => {
    const startTime = Date.now();
    let auditLogId: string | null = null;

    try {
      console.log('[AI Journey API] Starting journey suggestion generation');

      // 1. Authentication check - handled by withSecureValidation middleware
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(
        request.headers.get('Authorization')?.replace('Bearer ', '') || '',
      );

      if (authError || !user) {
        return NextResponse.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
          { status: 401 },
        );
      }

      // 2. Validate vendor access - ensure user can generate journeys for this supplier
      const hasVendorAccess = await validateVendorAccess(
        validatedData.supplierId,
        user.id,
        supabase,
      );

      if (!hasVendorAccess) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'Access denied to supplier data',
            timestamp: new Date().toISOString(),
          },
          { status: 403 },
        );
      }

      // 3. Get organization and validate subscription tier
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.organization_id) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'No organization found',
            timestamp: new Date().toISOString(),
          },
          { status: 403 },
        );
      }

      const subscriptionInfo = await validateSubscriptionTier(
        profile.organization_id,
        supabase,
      );

      if (!subscriptionInfo.hasAIAccess) {
        return NextResponse.json(
          {
            error: 'SUBSCRIPTION_REQUIRED',
            message:
              'AI journey suggestions require Professional tier or higher',
            currentTier: subscriptionInfo.tier,
            requiredTier: 'PROFESSIONAL',
            timestamp: new Date().toISOString(),
          },
          { status: 402 },
        );
      }

      // 4. Rate limiting check for AI generation
      const rateLimitConfig = AI_GENERATION_RATE_LIMITS[subscriptionInfo.tier];
      const rateLimitResult = await defaultRateLimiter.checkLimit(
        `ai_journey_generation:${user.id}`,
        {
          requests: rateLimitConfig.requests,
          window: rateLimitConfig.window * 1000, // Convert to milliseconds
          tier: subscriptionInfo.tier as SubscriptionTier,
          vendorType: validatedData.vendorType,
        },
      );

      if (!rateLimitResult.success) {
        return NextResponse.json(
          {
            error: 'RATE_LIMITED',
            message:
              'Too many AI generation requests. Please wait before trying again.',
            retryAfter: rateLimitResult.retryAfter,
            limit: rateLimitConfig.requests,
            window: 'per hour',
            timestamp: new Date().toISOString(),
          },
          {
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
              'X-RateLimit-Limit': rateLimitConfig.requests.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(
                (Date.now() + (rateLimitResult.retryAfter || 3600) * 1000) /
                  1000,
              ).toString(),
            },
          },
        );
      }

      // 5. Create audit log entry for compliance
      auditLogId = await createAuditLogEntry({
        supplierId: validatedData.supplierId,
        userId: user.id,
        requestType: 'generate_new',
        requestData: validatedData,
        startTime,
      });

      // 6. Generate journey using AI engine
      console.log('[AI Journey API] Initializing journey suggestions engine');
      const journeyEngine = new JourneySuggestionsEngine();

      const generatedJourney = await journeyEngine.generateJourney({
        ...validatedData,
        supplierId: validatedData.supplierId,
      });

      console.log(
        '[AI Journey API] Journey generated successfully:',
        generatedJourney.id,
      );

      // 7. Update audit log with success
      if (auditLogId) {
        await updateAuditLogEntry(auditLogId, {
          responseStatus: 'success',
          responseData: { journeyId: generatedJourney.id },
          processingTimeMs: Date.now() - startTime,
        });
      }

      // 8. Return successful response with rate limiting headers
      const response = NextResponse.json({
        success: true,
        data: generatedJourney,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          rateLimit: {
            limit: rateLimitConfig.requests,
            remaining: rateLimitResult.remaining,
            resetTime: Math.ceil(
              (Date.now() + rateLimitConfig.window * 1000) / 1000,
            ),
          },
        },
      });

      // Add rate limiting headers
      response.headers.set(
        'X-RateLimit-Limit',
        rateLimitConfig.requests.toString(),
      );
      response.headers.set(
        'X-RateLimit-Remaining',
        rateLimitResult.remaining.toString(),
      );
      response.headers.set(
        'X-RateLimit-Reset',
        Math.ceil(
          (Date.now() + rateLimitConfig.window * 1000) / 1000,
        ).toString(),
      );

      return response;
    } catch (error) {
      console.error('[AI Journey API] Generation failed:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const processingTime = Date.now() - startTime;

      // Update audit log with error
      if (auditLogId) {
        await updateAuditLogEntry(auditLogId, {
          responseStatus: 'error',
          errorDetails: errorMessage,
          processingTimeMs: processingTime,
        });
      }

      // Determine error type and status code
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';

      if (errorMessage.includes('Rate limit exceeded')) {
        statusCode = 429;
        errorCode = 'RATE_LIMITED';
      } else if (errorMessage.includes('Invalid AI response')) {
        statusCode = 502;
        errorCode = 'AI_SERVICE_ERROR';
      } else if (errorMessage.includes('OpenAI')) {
        statusCode = 502;
        errorCode = 'AI_SERVICE_ERROR';
      }

      return NextResponse.json(
        {
          error: errorCode,
          message: 'Failed to generate journey suggestion',
          details:
            process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          timestamp: new Date().toISOString(),
        },
        { status: statusCode },
      );
    }
  },
);

/**
 * Create audit log entry for compliance tracking
 */
async function createAuditLogEntry(data: {
  supplierId: string;
  userId: string;
  requestType: string;
  requestData: any;
  startTime: number;
}): Promise<string | null> {
  try {
    const { data: auditEntry, error } = await supabase
      .from('ai_generation_audit_log')
      .insert({
        supplier_id: data.supplierId,
        user_id: data.userId,
        request_type: data.requestType,
        request_data: data.requestData,
        ai_model_used: 'gpt-4',
        processing_time_ms: 0, // Will be updated on completion
        response_status: 'processing',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[AI Journey API] Failed to create audit log:', error);
      return null;
    }

    return auditEntry.id;
  } catch (error) {
    console.error('[AI Journey API] Audit log creation error:', error);
    return null;
  }
}

/**
 * Update audit log entry with completion details
 */
async function updateAuditLogEntry(
  auditLogId: string,
  updateData: {
    responseStatus: string;
    responseData?: any;
    errorDetails?: string;
    processingTimeMs: number;
  },
): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_generation_audit_log')
      .update({
        response_status: updateData.responseStatus,
        response_data: updateData.responseData || null,
        error_details: updateData.errorDetails || null,
        processing_time_ms: updateData.processingTimeMs,
      })
      .eq('id', auditLogId);

    if (error) {
      console.error('[AI Journey API] Failed to update audit log:', error);
    }
  } catch (error) {
    console.error('[AI Journey API] Audit log update error:', error);
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
