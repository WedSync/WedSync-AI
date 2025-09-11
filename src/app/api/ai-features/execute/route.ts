/**
 * WS-239: AI Features Execute API - Team B Round 1
 * Unified endpoint for all AI requests - routes to platform or client systems
 * POST /api/ai-features/execute
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  aiFeatureRouter,
  AIFeatureType,
} from '@/lib/ai/dual-system/AIFeatureRouter';
import { Logger } from '@/lib/logging/Logger';

const logger = new Logger('AIExecuteAPI');

// Request validation schema
const executeRequestSchema = z.object({
  featureType: z.enum([
    'photo_analysis',
    'content_generation',
    'email_templates',
    'chat_responses',
    'document_analysis',
    'wedding_planning',
    'vendor_matching',
    'budget_optimization',
  ] as const),
  requestType: z.string().min(1).max(100),
  data: z.any(),
  options: z
    .object({
      model: z.string().optional(),
      maxTokens: z.number().min(1).max(4000).optional(),
      temperature: z.number().min(0).max(2).optional(),
    })
    .optional(),
  weddingDate: z.string().datetime().optional(), // ISO string for business context
  metadata: z.record(z.any()).optional(),
});

type ExecuteRequest = z.infer<typeof executeRequestSchema>;

/**
 * POST /api/ai-features/execute
 * Execute AI request with intelligent routing
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let supplierId: string | undefined;
  let userId: string | undefined;

  try {
    // 1. Authentication and authorization
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.warn('Authentication failed', { error: authError?.message });
      return NextResponse.json(
        { error: 'Invalid authentication', code: 'AUTH_INVALID' },
        { status: 401 },
      );
    }

    userId = user.id;

    // 2. Get user's organization/supplier context
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('organization_id, user_type')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      logger.error('Failed to fetch user profile', {
        userId,
        error: profileError,
      });
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 400 },
      );
    }

    if (userProfile.user_type !== 'supplier') {
      return NextResponse.json(
        {
          error: 'AI features only available to suppliers',
          code: 'NOT_SUPPLIER',
        },
        { status: 403 },
      );
    }

    supplierId = userProfile.organization_id;

    // 3. Request validation
    const body = await request.json();
    const validationResult = executeRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('Invalid request data', {
        userId,
        supplierId,
        errors: validationResult.error.issues,
      });
      return NextResponse.json(
        {
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { featureType, requestType, data, options, weddingDate, metadata } =
      validationResult.data;

    // 4. Rate limiting (basic implementation)
    const rateLimitResult = await checkRateLimit(supplierId, featureType);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMITED',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // 5. Log request for monitoring
    logger.info('AI execute request started', {
      userId,
      supplierId,
      featureType,
      requestType,
      hasWeddingContext: !!weddingDate,
      requestSize: JSON.stringify(data).length,
    });

    // 6. Execute AI request through router
    const aiResponse = await aiFeatureRouter.routeAIRequest(
      supplierId,
      userId,
      {
        featureType: featureType as AIFeatureType,
        requestType,
        data,
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        model: options?.model,
      },
      weddingDate,
    );

    // 7. Build response
    const responseTime = Date.now() - startTime;

    const response = {
      success: aiResponse.success,
      data: aiResponse.data,
      provider: aiResponse.provider,
      usage: {
        tokensInput: aiResponse.usage.tokensInput,
        tokensOutput: aiResponse.usage.tokensOutput,
        tokensTotal: aiResponse.usage.tokensTotal,
        costPounds: aiResponse.usage.costPounds,
      },
      performance: {
        responseTimeMs: responseTime,
        processingTimeMs: aiResponse.performanceMs,
      },
      model: aiResponse.model,
      metadata: {
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
        featureType,
        requestType,
      },
    };

    if (!aiResponse.success) {
      response.error = aiResponse.error;
      logger.warn('AI request failed', {
        userId,
        supplierId,
        featureType,
        error: aiResponse.error,
        responseTime,
      });

      // Return 200 with error details (not 5xx since it's a business logic error)
      return NextResponse.json(response, { status: 200 });
    }

    logger.info('AI execute request completed', {
      userId,
      supplierId,
      featureType,
      provider: aiResponse.provider,
      tokensUsed: aiResponse.usage.tokensTotal,
      costPounds: aiResponse.usage.costPounds,
      responseTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('AI execute request failed', {
      userId,
      supplierId,
      error: error.message,
      stack: error.stack,
      responseTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        metadata: {
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
          responseTimeMs: responseTime,
        },
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ai-features/execute
 * Get AI execution status and health check
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const healthCheck = searchParams.get('health') === 'true';

    if (healthCheck) {
      // Simple health check
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          router: 'operational',
          database: 'operational',
          platform_ai: 'operational',
        },
      });
    }

    return NextResponse.json({
      endpoint: 'AI Features Execute',
      methods: ['POST'],
      description: 'Unified endpoint for AI requests with intelligent routing',
      documentation: '/docs/ai-features/execute',
      supportedFeatures: [
        'photo_analysis',
        'content_generation',
        'email_templates',
        'chat_responses',
        'document_analysis',
        'wedding_planning',
        'vendor_matching',
        'budget_optimization',
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}

/**
 * Helper functions
 */
async function checkRateLimit(
  supplierId: string,
  featureType: AIFeatureType,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Simple rate limiting - 100 requests per minute per supplier per feature
  // In production, would use Redis or similar

  try {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from('ai_usage_tracking')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('feature_type', featureType)
      .gte('created_at', new Date(windowStart).toISOString());

    if (error) {
      logger.error('Rate limit check failed', { supplierId, error });
      return { allowed: true }; // Fail open
    }

    const requestCount = data?.length || 0;
    const limit = 100; // requests per minute

    if (requestCount >= limit) {
      const oldestRequest = Math.min(
        ...data.map((d) => new Date(d.created_at).getTime()),
      );
      const retryAfter = Math.ceil((oldestRequest + 60000 - now) / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  } catch (error) {
    logger.error('Rate limit check error', { supplierId, error });
    return { allowed: true }; // Fail open
  }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
