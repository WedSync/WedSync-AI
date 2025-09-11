/**
 * AI Recommendations API Endpoints - WS-341 Team B
 *
 * Advanced AI recommendation endpoints for wedding planning with personalized
 * suggestions, category-specific recommendations, and real-time adaptation.
 *
 * Endpoints:
 * - POST /api/ai/recommendations - Generate personalized recommendations
 * - GET /api/ai/recommendations - Get existing recommendations
 * - PUT /api/ai/recommendations/feedback - Provide feedback on recommendations
 *
 * Team B - Backend Development - 2025-01-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { WeddingOptimizationEngine } from '@/lib/ai/wedding-optimization-engine';
import type {
  WeddingContext,
  AIRecommendation,
  OptimizationFeedback,
} from '@/lib/ai/types';

// ====================================================================
// SCHEMAS AND VALIDATION
// ====================================================================

const RecommendationRequestSchema = z.object({
  weddingId: z.string().uuid(),
  request: z.object({
    categories: z
      .array(
        z.enum([
          'budget',
          'vendor',
          'timeline',
          'venue',
          'catering',
          'photography',
          'flowers',
          'music',
          'decor',
          'transportation',
          'entertainment',
        ]),
      )
      .optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    limit: z.number().min(1).max(20).default(10),
    context: z
      .object({
        currentStage: z
          .enum(['early', 'planning', 'finalizing', 'last_minute'])
          .optional(),
        budgetConcerns: z.boolean().default(false),
        timeConstraints: z.boolean().default(false),
        specificNeeds: z.array(z.string()).optional(),
        excludeTypes: z.array(z.string()).optional(),
      })
      .optional(),
  }),
});

const RecommendationQuerySchema = z.object({
  weddingId: z.string().uuid(),
  category: z.string().optional(),
  status: z.enum(['active', 'accepted', 'rejected', 'implemented']).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z
    .enum(['created_at', 'confidence', 'potential_savings', 'priority'])
    .default('confidence'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const FeedbackSchema = z.object({
  recommendationId: z.string().uuid(),
  feedback: z.object({
    rating: z.number().min(1).max(5),
    outcome: z.enum(['accepted', 'rejected', 'implemented', 'modified']),
    comments: z.string().optional(),
    rejectionReason: z.string().optional(),
    modifications: z.string().optional(),
    actualSavings: z.number().optional(),
    satisfactionScore: z.number().min(0).max(1).optional(),
    wouldRecommendToOthers: z.boolean().optional(),
  }),
});

// ====================================================================
// RATE LIMITING
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
// AI ENGINE AND SUPABASE
// ====================================================================

const optimizationEngine = new WeddingOptimizationEngine({
  openaiApiKey: process.env.OPENAI_API_KEY!,
  mlConfig: {
    modelVersion: 'v2.1',
    updateFrequency: 'daily',
    confidenceThreshold: 0.75,
  },
  budgetConfig: {
    maxSavingsTarget: 0.4,
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
    learningRate: 0.15, // Higher learning rate for recommendations
    memoryWindow: 90,
    adaptationThreshold: 0.3,
    confidenceThreshold: 0.6,
  },
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ====================================================================
// API ENDPOINTS
// ====================================================================

/**
 * POST /api/ai/recommendations - Generate Personalized Recommendations
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request
    const body = await request.json();
    const validationResult = RecommendationRequestSchema.safeParse(body);

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

    const { weddingId, request: recommendationRequest } = validationResult.data;

    // Authentication
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

    // Rate limiting - more generous for recommendations
    const rateLimitResult = await rateLimiter.checkLimit(userId, {
      limit: 30, // 30 recommendation requests per hour
      window: 3600,
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

    // Verify wedding access
    const hasAccess = await verifyWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to wedding', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Load wedding context
    const weddingContext = await loadWeddingContext(weddingId);
    if (!weddingContext) {
      return NextResponse.json(
        { error: 'Wedding not found', code: 'WEDDING_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Apply context filters based on request
    const filteredContext = applyContextFilters(
      weddingContext,
      recommendationRequest.context,
    );

    // Generate AI recommendations
    const recommendations =
      await optimizationEngine.generateRecommendations(filteredContext);

    // Filter by requested categories if specified
    const filteredRecommendations = recommendationRequest.categories
      ? recommendations.filter((rec) =>
          recommendationRequest.categories!.includes(rec.category as any),
        )
      : recommendations;

    // Apply limit
    const limitedRecommendations = filteredRecommendations.slice(
      0,
      recommendationRequest.limit,
    );

    // Store recommendations in database
    await storeRecommendations(weddingId, userId, limitedRecommendations);

    // Track analytics
    await trackRecommendationUsage({
      userId,
      weddingId,
      requestType: 'generate',
      categoriesRequested: recommendationRequest.categories || ['all'],
      recommendationCount: limitedRecommendations.length,
      processingTime: Date.now() - startTime,
      success: true,
    });

    const processingTime = Date.now() - startTime;

    // Return recommendations
    return NextResponse.json(
      {
        success: true,
        recommendations: limitedRecommendations.map((rec) => ({
          id: rec.id,
          title: rec.title,
          category: rec.category,
          summary: rec.summary,
          description: rec.description,
          confidence: rec.confidence,
          potentialSavings: rec.potentialSavings,
          implementationTime: rec.implementationTime,
          implementationSteps: rec.implementationSteps,
          alternativeOptions: rec.alternativeOptions?.slice(0, 3), // Limit alternatives
          priority: rec.priority,
          benefits: rec.benefits,
          personalizedReasoning: rec.personalizedReasoning,
          tags: rec.tags,
          estimatedCost: rec.estimatedCost,
          timeToImplement: rec.timeToImplement,
          difficultyLevel: rec.difficultyLevel,
        })),
        metadata: {
          processingTime,
          totalRecommendations: recommendations.length,
          filteredCount: filteredRecommendations.length,
          averageConfidence:
            limitedRecommendations.reduce(
              (sum, rec) => sum + rec.confidence,
              0,
            ) / limitedRecommendations.length,
          categories: [
            ...new Set(limitedRecommendations.map((rec) => rec.category)),
          ],
          potentialTotalSavings: limitedRecommendations.reduce(
            (sum, rec) => sum + (rec.potentialSavings || 0),
            0,
          ),
        },
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
    console.error('AI Recommendations Error:', error);

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
          retryAfter: 300,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ai/recommendations - Get Existing Recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryValidation = RecommendationQuerySchema.safeParse({
      weddingId: searchParams.get('weddingId'),
      category: searchParams.get('category'),
      status: searchParams.get('status'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
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

    const query = queryValidation.data;

    // Authentication
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

    // Verify wedding access
    const hasAccess = await verifyWeddingAccess(userId, query.weddingId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Get recommendations from database
    const { recommendations, totalCount } = await getStoredRecommendations(
      query.weddingId,
      {
        category: query.category,
        status: query.status,
        limit: query.limit,
        offset: query.offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        userId,
      },
    );

    return NextResponse.json({
      success: true,
      recommendations: recommendations.map((rec) => ({
        id: rec.id,
        title: rec.title,
        category: rec.category,
        summary: rec.summary,
        confidence: rec.confidence,
        potentialSavings: rec.potential_savings,
        priority: rec.priority,
        status: rec.status,
        createdAt: rec.created_at,
        implementedAt: rec.implemented_at,
        feedbackRating: rec.feedback_rating,
        feedbackComments: rec.feedback_comments,
      })),
      pagination: {
        total: totalCount,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < totalCount,
      },
      summary: {
        totalRecommendations: totalCount,
        averageConfidence:
          recommendations.length > 0
            ? recommendations.reduce(
                (sum, rec) => sum + (rec.confidence || 0),
                0,
              ) / recommendations.length
            : 0,
        statusBreakdown: await getRecommendationStatusBreakdown(
          query.weddingId,
          userId,
        ),
        categoryBreakdown: await getRecommendationCategoryBreakdown(
          query.weddingId,
          userId,
        ),
      },
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/ai/recommendations/feedback - Provide Feedback on Recommendations
 */
export async function PUT(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const validationResult = FeedbackSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid feedback',
          details: validationResult.error.errors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    const { recommendationId, feedback } = validationResult.data;

    // Authentication
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

    // Verify user can provide feedback on this recommendation
    const canProvideFeedback = await verifyRecommendationAccess(
      userId,
      recommendationId,
    );
    if (!canProvideFeedback) {
      return NextResponse.json(
        { error: 'Access denied to recommendation', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Store feedback in database
    await storeFeedback(recommendationId, userId, feedback);

    // Get recommendation details for AI learning
    const recommendation = await getRecommendationDetails(recommendationId);

    if (recommendation && recommendation.wedding_id) {
      // Create optimization feedback object for AI learning
      const optimizationFeedback: OptimizationFeedback = {
        optimizationId: '', // Not applicable for direct recommendation feedback
        recommendationId,
        type: recommendation.category || 'general',
        category: recommendation.category,
        rating: feedback.rating,
        outcome: feedback.outcome,
        userComments: feedback.comments,
        rejectionReason: feedback.rejectionReason,
        satisfactionScore: feedback.satisfactionScore || feedback.rating / 5,
        actualSavings: feedback.actualSavings,
        coupleId: recommendation.couple_id,
        timestamp: new Date(),
      };

      // Feed back to AI engine for learning
      try {
        await optimizationEngine.learnFromFeedback(optimizationFeedback);
      } catch (learningError) {
        console.error('AI learning error:', learningError);
        // Don't fail the request if AI learning fails
      }
    }

    // Track feedback analytics
    await trackRecommendationUsage({
      userId,
      weddingId: recommendation?.wedding_id || '',
      requestType: 'feedback',
      recommendationId,
      feedbackRating: feedback.rating,
      feedbackOutcome: feedback.outcome,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
      recommendationId,
      feedbackId: `feedback_${recommendationId}_${Date.now()}`,
    });
  } catch (error) {
    console.error('Feedback error:', error);

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
 * Extract user ID from JWT token
 */
async function extractUserIdFromToken(
  authHeader: string,
): Promise<string | null> {
  try {
    const token = authHeader.substring(7);
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

    if (data.couple_id === userId) {
      return true;
    }

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
 * Verify user can access recommendation
 */
async function verifyRecommendationAccess(
  userId: string,
  recommendationId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('wedding_id, user_id')
      .eq('id', recommendationId)
      .single();

    if (error || !data) {
      return false;
    }

    // Check if user created the recommendation or has access to the wedding
    if (data.user_id === userId) {
      return true;
    }

    return await verifyWeddingAccess(userId, data.wedding_id);
  } catch (error) {
    console.error('Recommendation access verification error:', error);
    return false;
  }
}

/**
 * Load wedding context for recommendations
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
 * Apply context filters to wedding context
 */
function applyContextFilters(
  context: WeddingContext,
  filters?: any,
): WeddingContext {
  if (!filters) return context;

  // Apply budget constraints filter
  if (filters.budgetConcerns) {
    // Prioritize budget-saving recommendations
    context.preferences = context.preferences || [];
    context.preferences.push({
      category: 'budget',
      importance: 1.0,
      details: { focus: 'cost_savings' },
    });
  }

  // Apply time constraints filter
  if (filters.timeConstraints) {
    // Prioritize quick implementation recommendations
    context.preferences = context.preferences || [];
    context.preferences.push({
      category: 'timeline',
      importance: 0.9,
      details: { focus: 'quick_implementation' },
    });
  }

  return context;
}

/**
 * Store recommendations in database
 */
async function storeRecommendations(
  weddingId: string,
  userId: string,
  recommendations: AIRecommendation[],
): Promise<void> {
  try {
    const recommendationData = recommendations.map((rec) => ({
      id: rec.id,
      wedding_id: weddingId,
      user_id: userId,
      title: rec.title,
      category: rec.category,
      summary: rec.summary,
      description: rec.description,
      confidence: rec.confidence,
      potential_savings: rec.potentialSavings,
      implementation_time: rec.implementationTime,
      implementation_steps: rec.implementationSteps,
      alternative_options: rec.alternativeOptions,
      priority: rec.priority,
      benefits: rec.benefits,
      personalized_reasoning: rec.personalizedReasoning,
      tags: rec.tags,
      estimated_cost: rec.estimatedCost,
      time_to_implement: rec.timeToImplement,
      difficulty_level: rec.difficultyLevel,
      status: 'active',
      created_at: new Date().toISOString(),
    }));

    await supabase.from('ai_recommendations').insert(recommendationData);
  } catch (error) {
    console.error('Error storing recommendations:', error);
    throw error;
  }
}

/**
 * Get stored recommendations from database
 */
async function getStoredRecommendations(
  weddingId: string,
  filters: {
    category?: string;
    status?: string;
    limit: number;
    offset: number;
    sortBy: string;
    sortOrder: string;
    userId: string;
  },
): Promise<{ recommendations: any[]; totalCount: number }> {
  try {
    let query = supabase
      .from('ai_recommendations')
      .select('*', { count: 'exact' })
      .eq('wedding_id', weddingId);

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply sorting
    const sortColumn =
      filters.sortBy === 'potential_savings'
        ? 'potential_savings'
        : filters.sortBy === 'created_at'
          ? 'created_at'
          : filters.sortBy === 'priority'
            ? 'priority'
            : 'confidence';

    query = query.order(sortColumn, { ascending: filters.sortOrder === 'asc' });

    // Apply pagination
    query = query.range(filters.offset, filters.offset + filters.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      recommendations: data || [],
      totalCount: count || 0,
    };
  } catch (error) {
    console.error('Error getting stored recommendations:', error);
    throw error;
  }
}

/**
 * Store feedback in database
 */
async function storeFeedback(
  recommendationId: string,
  userId: string,
  feedback: any,
): Promise<void> {
  try {
    // Update recommendation with feedback
    await supabase
      .from('ai_recommendations')
      .update({
        feedback_rating: feedback.rating,
        feedback_outcome: feedback.outcome,
        feedback_comments: feedback.comments,
        rejection_reason: feedback.rejectionReason,
        feedback_modifications: feedback.modifications,
        actual_savings: feedback.actualSavings,
        satisfaction_score: feedback.satisfactionScore,
        would_recommend: feedback.wouldRecommendToOthers,
        status:
          feedback.outcome === 'implemented'
            ? 'implemented'
            : feedback.outcome === 'accepted'
              ? 'accepted'
              : feedback.outcome === 'rejected'
                ? 'rejected'
                : 'active',
        feedback_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendationId);

    // Store detailed feedback record
    await supabase.from('recommendation_feedback').insert({
      recommendation_id: recommendationId,
      user_id: userId,
      rating: feedback.rating,
      outcome: feedback.outcome,
      comments: feedback.comments,
      rejection_reason: feedback.rejectionReason,
      modifications: feedback.modifications,
      actual_savings: feedback.actualSavings,
      satisfaction_score: feedback.satisfactionScore,
      would_recommend: feedback.wouldRecommendToOthers,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error storing feedback:', error);
    throw error;
  }
}

/**
 * Get recommendation details
 */
async function getRecommendationDetails(
  recommendationId: string,
): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select(
        `
        id, wedding_id, category, title, confidence,
        weddings!inner(couple_id)
      `,
      )
      .eq('id', recommendationId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      ...data,
      couple_id: data.weddings.couple_id,
    };
  } catch (error) {
    console.error('Error getting recommendation details:', error);
    return null;
  }
}

/**
 * Get recommendation status breakdown
 */
async function getRecommendationStatusBreakdown(
  weddingId: string,
  userId: string,
): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('status')
      .eq('wedding_id', weddingId);

    if (error || !data) {
      return {};
    }

    const statusCounts = data.reduce((acc: any, rec: any) => {
      acc[rec.status] = (acc[rec.status] || 0) + 1;
      return acc;
    }, {});

    return statusCounts;
  } catch (error) {
    console.error('Error getting status breakdown:', error);
    return {};
  }
}

/**
 * Get recommendation category breakdown
 */
async function getRecommendationCategoryBreakdown(
  weddingId: string,
  userId: string,
): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('category, confidence')
      .eq('wedding_id', weddingId);

    if (error || !data) {
      return {};
    }

    const categoryStats = data.reduce((acc: any, rec: any) => {
      if (!acc[rec.category]) {
        acc[rec.category] = { count: 0, totalConfidence: 0 };
      }
      acc[rec.category].count++;
      acc[rec.category].totalConfidence += rec.confidence || 0;
      return acc;
    }, {});

    // Calculate average confidence per category
    Object.keys(categoryStats).forEach((category) => {
      categoryStats[category].averageConfidence =
        categoryStats[category].totalConfidence / categoryStats[category].count;
    });

    return categoryStats;
  } catch (error) {
    console.error('Error getting category breakdown:', error);
    return {};
  }
}

/**
 * Track recommendation usage analytics
 */
async function trackRecommendationUsage(metrics: {
  userId: string;
  weddingId: string;
  requestType: string;
  categoriesRequested?: string[];
  recommendationCount?: number;
  recommendationId?: string;
  feedbackRating?: number;
  feedbackOutcome?: string;
  processingTime?: number;
  success: boolean;
}): Promise<void> {
  try {
    await supabase.from('recommendation_analytics').insert({
      user_id: metrics.userId,
      wedding_id: metrics.weddingId,
      request_type: metrics.requestType,
      categories_requested: metrics.categoriesRequested,
      recommendation_count: metrics.recommendationCount,
      recommendation_id: metrics.recommendationId,
      feedback_rating: metrics.feedbackRating,
      feedback_outcome: metrics.feedbackOutcome,
      processing_time: metrics.processingTime,
      success: metrics.success,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking recommendation usage:', error);
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
