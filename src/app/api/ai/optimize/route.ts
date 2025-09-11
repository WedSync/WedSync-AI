/**
 * AI Optimization API Endpoints - WS-341 Team B
 *
 * Advanced AI optimization endpoints for wedding planning with comprehensive
 * request handling, rate limiting, authentication, and error management.
 *
 * Endpoints:
 * - POST /api/ai/optimize - Comprehensive wedding optimization
 * - GET /api/ai/optimize - Get optimization history and status
 *
 * Team B - Backend Development - 2025-01-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { WeddingOptimizationEngine } from '@/lib/ai/wedding-optimization-engine';
import type {
  WeddingContext,
  OptimizationRequest,
  OptimizationResult,
} from '@/lib/ai/types';

// ====================================================================
// SCHEMAS AND VALIDATION
// ====================================================================

const OptimizationRequestSchema = z.object({
  weddingId: z.string().uuid(),
  request: z.object({
    id: z.string().optional(),
    type: z.enum([
      'comprehensive',
      'budget',
      'vendor',
      'timeline',
      'emergency',
    ]),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    context: z.object({
      coupleId: z.string().uuid(),
      budget: z.object({
        total: z.number().min(500).max(500000),
        allocations: z.record(z.string(), z.number()).optional(),
        priorities: z.array(z.string()).optional(),
        constraints: z.array(z.string()).optional(),
        weddingType: z.string().optional(),
        seasonality: z.string().optional(),
      }),
      timeline: z.object({
        weddingDate: z.string().datetime(),
        tasks: z.array(z.any()).optional(),
        dependencies: z.array(z.any()).optional(),
        constraints: z.array(z.string()).optional(),
        coupleAvailability: z.record(z.string(), z.boolean()).optional(),
        vendorRequirements: z.record(z.string(), z.any()).optional(),
      }),
      vendorCriteria: z
        .object({
          budget: z.number().min(0),
          location: z.string().min(1),
          weddingDate: z.string().datetime(),
          preferences: z.record(z.string(), z.any()).optional(),
          requirements: z.array(z.string()).optional(),
          couplePersonality: z.record(z.string(), z.number()).optional(),
          weddingStyle: z.string().optional(),
        })
        .optional(),
      constraints: z.array(z.string()).optional(),
      preferences: z
        .array(
          z.object({
            category: z.string(),
            importance: z.number().min(0).max(1),
            details: z.record(z.string(), z.any()).optional(),
          }),
        )
        .optional(),
    }),
  }),
});

const OptimizationQuerySchema = z.object({
  weddingId: z.string().uuid(),
  status: z.enum(['processing', 'completed', 'failed']).optional(),
  type: z
    .enum(['comprehensive', 'budget', 'vendor', 'timeline', 'emergency'])
    .optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ====================================================================
// RATE LIMITING AND AUTHENTICATION
// ====================================================================

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  async checkLimit(
    identifier: string,
    options: { limit: number; window: number },
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const { limit, window } = options;

    const userRequests = this.requests.get(identifier);

    if (!userRequests || now > userRequests.resetTime) {
      // Reset or initialize
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + window * 1000,
      });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        resetTime: now + window * 1000,
      };
    }

    if (userRequests.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        resetTime: userRequests.resetTime,
      };
    }

    userRequests.count++;
    return {
      success: true,
      limit,
      remaining: limit - userRequests.count,
      resetTime: userRequests.resetTime,
    };
  }
}

const rateLimiter = new RateLimiter();

// ====================================================================
// AI OPTIMIZATION ENGINE INSTANCE
// ====================================================================

const optimizationEngine = new WeddingOptimizationEngine({
  openaiApiKey: process.env.OPENAI_API_KEY!,
  mlConfig: {
    modelVersion: 'v2.1',
    updateFrequency: 'daily',
    confidenceThreshold: 0.85,
  },
  budgetConfig: {
    maxSavingsTarget: 0.4, // 40% max savings
    minQualityThreshold: 0.8,
    industryBenchmarks: true,
  },
  vendorConfig: {
    matchingAlgorithm: 'ensemble',
    personalityWeighting: 0.3,
    emergencyFallback: true,
  },
  timelineConfig: {
    bufferDays: 7,
    criticalPathOptimization: true,
    seasonalAdjustments: true,
  },
  personalizationConfig: {
    learningRate: 0.1,
    memoryWindow: 90, // days
    adaptationThreshold: 0.3,
    confidenceThreshold: 0.6,
  },
});

// ====================================================================
// SUPABASE CLIENT
// ====================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ====================================================================
// API ENDPOINTS
// ====================================================================

/**
 * POST /api/ai/optimize - Comprehensive Wedding Optimization
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let optimizationId: string | null = null;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = OptimizationRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.errors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    const { weddingId, request: optimizationRequest } = validationResult.data;

    // Authentication check (simplified - replace with your auth logic)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    // Extract user ID from token (simplified - replace with your JWT decoding)
    const userId = await extractUserIdFromToken(authHeader);
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid token', code: 'AUTH_INVALID' },
        { status: 401 },
      );
    }

    // Rate limiting for AI optimization (expensive operations)
    const rateLimitResult = await rateLimiter.checkLimit(userId, {
      limit: 10, // 10 AI optimizations per hour
      window: 3600, // 1 hour
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: rateLimitResult.resetTime,
          limit: rateLimitResult.limit,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(
              rateLimitResult.resetTime / 1000,
            ).toString(),
          },
        },
      );
    }

    // Verify user has access to the wedding
    const hasAccess = await verifyWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to wedding', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Load wedding context from database
    const weddingContext = await loadWeddingContext(weddingId);
    if (!weddingContext) {
      return NextResponse.json(
        { error: 'Wedding not found', code: 'WEDDING_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Generate optimization ID
    optimizationId = generateOptimizationId();

    // Create optimization request object
    const fullOptimizationRequest: OptimizationRequest = {
      id: optimizationId,
      type: optimizationRequest.type,
      priority: optimizationRequest.priority,
      context: {
        ...weddingContext,
        ...optimizationRequest.context,
      },
      budget: optimizationRequest.context.budget,
      timeline: {
        weddingDate: new Date(optimizationRequest.context.timeline.weddingDate),
        tasks: optimizationRequest.context.timeline.tasks || [],
        dependencies: optimizationRequest.context.timeline.dependencies || [],
        constraints: optimizationRequest.context.timeline.constraints || [],
        coupleAvailability:
          optimizationRequest.context.timeline.coupleAvailability || {},
        vendorRequirements:
          optimizationRequest.context.timeline.vendorRequirements || {},
      },
      vendorCriteria: optimizationRequest.context.vendorCriteria
        ? {
            budget: optimizationRequest.context.vendorCriteria.budget,
            location: optimizationRequest.context.vendorCriteria.location,
            weddingDate: new Date(
              optimizationRequest.context.vendorCriteria.weddingDate,
            ),
            preferences:
              optimizationRequest.context.vendorCriteria.preferences || {},
            requirements:
              optimizationRequest.context.vendorCriteria.requirements || [],
            couplePersonality:
              optimizationRequest.context.vendorCriteria.couplePersonality ||
              {},
            weddingStyle:
              optimizationRequest.context.vendorCriteria.weddingStyle,
          }
        : undefined,
      constraints: optimizationRequest.context.constraints || [],
      preferences: optimizationRequest.context.preferences || [],
    };

    // Store optimization request in database (pending status)
    await storeOptimizationRequest(
      weddingId,
      userId,
      fullOptimizationRequest,
      'processing',
    );

    // Process AI optimization
    const optimizationResult = await optimizationEngine.optimizeWeddingPlan(
      fullOptimizationRequest,
    );

    // Store optimization result
    await storeOptimizationResult(weddingId, optimizationResult);

    // Track usage analytics
    await trackAIUsage({
      userId,
      weddingId,
      operationType: 'optimization',
      processingTime: optimizationResult.processingTime,
      qualityScore: optimizationResult.qualityScore,
      requestType: optimizationRequest.type,
      success: true,
    });

    const processingTime = Date.now() - startTime;

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        optimization: {
          id: optimizationResult.id,
          type: optimizationResult.type,
          status: optimizationResult.status,
          processingTime: optimizationResult.processingTime,
          qualityScore: optimizationResult.qualityScore,
          potentialSavings: optimizationResult.potentialSavings,
          confidence: optimizationResult.confidence,
          recommendationCount: optimizationResult.recommendations.length,
          implementationStepCount:
            optimizationResult.implementationSteps.length,
          alternativeOptionsCount: optimizationResult.alternativeOptions.length,
        },
        summary: {
          budgetOptimization: optimizationResult.budgetOptimization
            ? {
                totalSavings:
                  optimizationResult.budgetOptimization.totalSavings,
                optimizedCategories: Object.keys(
                  optimizationResult.budgetOptimization.optimizedAllocations ||
                    {},
                ),
                qualityMaintained:
                  optimizationResult.budgetOptimization.qualityMaintained,
              }
            : null,
          vendorOptimization: optimizationResult.vendorOptimization
            ? {
                matchCount:
                  optimizationResult.vendorOptimization.matches?.length || 0,
                averageCompatibility:
                  optimizationResult.vendorOptimization.averageCompatibility,
                emergencyAlternatives:
                  optimizationResult.vendorOptimization.emergencyAlternatives
                    ?.length || 0,
              }
            : null,
          timelineOptimization: optimizationResult.timelineOptimization
            ? {
                conflicts:
                  optimizationResult.timelineOptimization.conflicts?.length ||
                  0,
                bufferDays: optimizationResult.timelineOptimization.bufferDays,
                criticalPathLength:
                  optimizationResult.timelineOptimization.criticalPath
                    ?.length || 0,
              }
            : null,
        },
        recommendations: optimizationResult.recommendations
          .slice(0, 5)
          .map((rec) => ({
            id: rec.id,
            title: rec.title,
            category: rec.category,
            summary: rec.summary,
            confidence: rec.confidence,
            potentialSavings: rec.potentialSavings,
            implementationTime: rec.implementationTime,
            priority: rec.priority,
          })),
      },
      {
        status: 200,
        headers: {
          'X-Processing-Time': processingTime.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        },
      },
    );
  } catch (error) {
    console.error('AI Optimization Error:', error);

    // Update optimization status to failed if we have an ID
    if (optimizationId) {
      try {
        await updateOptimizationStatus(
          optimizationId,
          'failed',
          error instanceof Error ? error.message : 'Unknown error',
        );
      } catch (updateError) {
        console.error('Failed to update optimization status:', updateError);
      }
    }

    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes('OpenAI')) {
      return NextResponse.json(
        {
          error: 'AI service temporarily unavailable',
          code: 'AI_SERVICE_ERROR',
          retryAfter: 300, // 5 minutes
        },
        { status: 503 },
      );
    }

    if (error instanceof Error && error.message.includes('Rate limit')) {
      return NextResponse.json(
        {
          error: 'AI service rate limit exceeded',
          code: 'AI_RATE_LIMIT',
          retryAfter: 60, // 1 minute
        },
        { status: 429 },
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId: optimizationId,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ai/optimize - Get optimization history and status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryValidation = OptimizationQuerySchema.safeParse({
      weddingId: searchParams.get('weddingId'),
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryValidation.error.errors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    const { weddingId, status, type, limit, offset } = queryValidation.data;

    // Authentication check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const userId = await extractUserIdFromToken(authHeader);
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid token', code: 'AUTH_INVALID' },
        { status: 401 },
      );
    }

    // Verify access to wedding
    const hasAccess = await verifyWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Get optimization history from database
    const optimizations = await getOptimizationHistory(weddingId, {
      status,
      type,
      limit,
      offset,
      userId,
    });

    // Get total count for pagination
    const totalCount = await getOptimizationCount(weddingId, {
      status,
      type,
      userId,
    });

    return NextResponse.json({
      success: true,
      optimizations: optimizations.map((opt) => ({
        id: opt.id,
        type: opt.type,
        status: opt.status,
        createdAt: opt.createdAt,
        completedAt: opt.completedAt,
        processingTime: opt.processingTime,
        qualityScore: opt.qualityScore,
        potentialSavings: opt.potentialSavings,
        recommendationCount: opt.recommendationCount,
        confidence: opt.confidence,
        errorMessage: opt.errorMessage,
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Get optimizations error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

/**
 * Extract user ID from JWT token (simplified implementation)
 */
async function extractUserIdFromToken(
  authHeader: string,
): Promise<string | null> {
  try {
    // Remove 'Bearer ' prefix
    const token = authHeader.substring(7);

    // In a real implementation, you would verify the JWT and extract the user ID
    // For now, we'll use Supabase's built-in auth verification
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Token extraction error:', error);
    return null;
  }
}

/**
 * Verify user has access to wedding
 */
async function verifyWeddingAccess(
  userId: string,
  weddingId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('weddings')
      .select('couple_id, suppliers')
      .eq('id', weddingId)
      .single();

    if (error || !data) {
      return false;
    }

    // Check if user is the couple or one of the suppliers
    if (data.couple_id === userId) {
      return true;
    }

    // Check if user is a supplier for this wedding
    if (data.suppliers && Array.isArray(data.suppliers)) {
      return data.suppliers.some(
        (supplier: any) => supplier.user_id === userId,
      );
    }

    return false;
  } catch (error) {
    console.error('Access verification error:', error);
    return false;
  }
}

/**
 * Load complete wedding context from database
 */
async function loadWeddingContext(
  weddingId: string,
): Promise<WeddingContext | null> {
  try {
    const { data, error } = await supabase
      .from('weddings')
      .select(
        `
        *,
        couple:couples!inner(*),
        budget:wedding_budgets(*),
        vendors:wedding_vendors(*),
        timeline:wedding_timelines(*)
      `,
      )
      .eq('id', weddingId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      weddingId: data.id,
      coupleId: data.couple_id,
      weddingDate: new Date(data.wedding_date),
      location: data.location,
      guestCount: data.guest_count,
      style: data.wedding_style,
      budget: {
        total: data.budget?.total_budget || 0,
        allocations: data.budget?.allocations || {},
        priorities: data.budget?.priorities || [],
        constraints: data.budget?.constraints || [],
      },
      timeline: {
        weddingDate: new Date(data.wedding_date),
        tasks: data.timeline?.tasks || [],
        dependencies: data.timeline?.dependencies || [],
        constraints: data.timeline?.constraints || [],
        coupleAvailability: data.timeline?.couple_availability || {},
        vendorRequirements: data.timeline?.vendor_requirements || {},
      },
      preferences: data.preferences || [],
      currentVendors: data.vendors || [],
      planningProgress: calculatePlanningProgress(data.timeline?.tasks || []),
      coupleProfile: {
        averageAge: (data.couple.partner1_age + data.couple.partner2_age) / 2,
        previousExperience: data.couple.previous_wedding_experience || false,
        personalityTraits: data.couple.personality_profile || {},
      },
    };
  } catch (error) {
    console.error('Error loading wedding context:', error);
    return null;
  }
}

/**
 * Generate unique optimization ID
 */
function generateOptimizationId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Store optimization request in database
 */
async function storeOptimizationRequest(
  weddingId: string,
  userId: string,
  request: OptimizationRequest,
  status: 'processing' | 'completed' | 'failed',
): Promise<void> {
  try {
    await supabase.from('ai_optimizations').insert({
      id: request.id,
      wedding_id: weddingId,
      user_id: userId,
      type: request.type,
      priority: request.priority,
      status,
      request_data: request,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error storing optimization request:', error);
    throw error;
  }
}

/**
 * Store optimization result in database
 */
async function storeOptimizationResult(
  weddingId: string,
  result: OptimizationResult,
): Promise<void> {
  try {
    await supabase
      .from('ai_optimizations')
      .update({
        status: result.status,
        processing_time: result.processingTime,
        quality_score: result.qualityScore,
        potential_savings: result.potentialSavings,
        confidence: result.confidence,
        recommendation_count: result.recommendations.length,
        budget_optimization: result.budgetOptimization,
        vendor_optimization: result.vendorOptimization,
        timeline_optimization: result.timelineOptimization,
        recommendations: result.recommendations,
        implementation_steps: result.implementationSteps,
        alternative_options: result.alternativeOptions,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', result.id);
  } catch (error) {
    console.error('Error storing optimization result:', error);
    throw error;
  }
}

/**
 * Update optimization status
 */
async function updateOptimizationStatus(
  optimizationId: string,
  status: 'processing' | 'completed' | 'failed',
  errorMessage?: string,
): Promise<void> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'failed' && errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    await supabase
      .from('ai_optimizations')
      .update(updateData)
      .eq('id', optimizationId);
  } catch (error) {
    console.error('Error updating optimization status:', error);
  }
}

/**
 * Get optimization history
 */
async function getOptimizationHistory(
  weddingId: string,
  filters: {
    status?: string;
    type?: string;
    limit: number;
    offset: number;
    userId: string;
  },
): Promise<any[]> {
  try {
    let query = supabase
      .from('ai_optimizations')
      .select(
        `
        id, type, status, created_at, completed_at, processing_time,
        quality_score, potential_savings, confidence, recommendation_count,
        error_message
      `,
      )
      .eq('wedding_id', weddingId)
      .eq('user_id', filters.userId)
      .order('created_at', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error getting optimization history:', error);
    throw error;
  }
}

/**
 * Get optimization count for pagination
 */
async function getOptimizationCount(
  weddingId: string,
  filters: {
    status?: string;
    type?: string;
    userId: string;
  },
): Promise<number> {
  try {
    let query = supabase
      .from('ai_optimizations')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_id', weddingId)
      .eq('user_id', filters.userId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    const { count, error } = await query;

    if (error) {
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting optimization count:', error);
    return 0;
  }
}

/**
 * Track AI usage analytics
 */
async function trackAIUsage(metrics: {
  userId: string;
  weddingId: string;
  operationType: string;
  processingTime: number;
  qualityScore: number;
  requestType: string;
  success: boolean;
}): Promise<void> {
  try {
    await supabase.from('ai_usage_analytics').insert({
      user_id: metrics.userId,
      wedding_id: metrics.weddingId,
      operation_type: metrics.operationType,
      request_type: metrics.requestType,
      processing_time: metrics.processingTime,
      quality_score: metrics.qualityScore,
      success: metrics.success,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking AI usage:', error);
    // Don't throw - analytics failure shouldn't break the main operation
  }
}

/**
 * Calculate planning progress from timeline tasks
 */
function calculatePlanningProgress(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0;

  const completedTasks = tasks.filter(
    (task) => task.status === 'completed',
  ).length;
  return completedTasks / tasks.length;
}
