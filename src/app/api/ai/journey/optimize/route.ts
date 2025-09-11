/**
 * WS-208: AI Journey Optimization API Endpoint
 * POST /api/ai/journey/optimize - Optimize existing journeys based on performance data
 * Team B - Secure implementation with enhanced validation and ML feedback integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { JourneySuggestionsEngine } from '@/lib/ai/journey-suggestions-engine';
import {
  JourneyOptimizationRequestSchema,
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

// Rate limiting configuration for optimization (more restrictive than generation)
const AI_OPTIMIZATION_RATE_LIMITS: Record<
  string,
  { requests: number; window: number }
> = {
  FREE: { requests: 0, window: 3600 },
  STARTER: { requests: 0, window: 3600 },
  PROFESSIONAL: { requests: 5, window: 3600 }, // 5 per hour
  SCALE: { requests: 15, window: 3600 }, // 15 per hour
  ENTERPRISE: { requests: 50, window: 3600 }, // 50 per hour
};

/**
 * Optimize existing AI-generated journeys
 * POST /api/ai/journey/optimize
 */
export const POST = withSecureValidation(
  JourneyOptimizationRequestSchema,
  async (request: NextRequest, validatedData) => {
    const startTime = Date.now();
    let auditLogId: string | null = null;

    try {
      console.log(
        '[AI Journey Optimize API] Starting journey optimization for:',
        validatedData.existingJourneyId,
      );

      // 1. Authentication check
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

      // 2. Validate vendor access
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

      // 3. Validate journey ownership and existence
      const { data: existingJourney, error: journeyError } = await supabase
        .from('customer_journeys')
        .select(
          `
          id,
          name,
          organization_id,
          steps,
          suppliers!inner(id, organization_id)
        `,
        )
        .eq('id', validatedData.existingJourneyId)
        .eq('suppliers.id', validatedData.supplierId)
        .single();

      if (journeyError || !existingJourney) {
        return NextResponse.json(
          {
            error: 'NOT_FOUND',
            message: 'Journey not found or access denied',
            timestamp: new Date().toISOString(),
          },
          { status: 404 },
        );
      }

      // 4. Get organization and validate subscription
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
              'AI journey optimization requires Professional tier or higher',
            currentTier: subscriptionInfo.tier,
            requiredTier: 'PROFESSIONAL',
            timestamp: new Date().toISOString(),
          },
          { status: 402 },
        );
      }

      // 5. Rate limiting check
      const rateLimitConfig =
        AI_OPTIMIZATION_RATE_LIMITS[subscriptionInfo.tier];
      const rateLimitResult = await defaultRateLimiter.checkLimit(
        `ai_journey_optimization:${user.id}`,
        {
          requests: rateLimitConfig.requests,
          window: rateLimitConfig.window * 1000,
          tier: subscriptionInfo.tier as SubscriptionTier,
          vendorType: validatedData.vendorType,
        },
      );

      if (!rateLimitResult.success) {
        return NextResponse.json(
          {
            error: 'RATE_LIMITED',
            message:
              'Too many optimization requests. Please wait before trying again.',
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
            },
          },
        );
      }

      // 6. Get performance data for the journey
      const { data: performanceData } = await supabase
        .from('journey_performance_data')
        .select('*')
        .eq('journey_id', validatedData.existingJourneyId)
        .order('created_at', { ascending: false });

      console.log(
        '[AI Journey Optimize API] Found performance data points:',
        performanceData?.length || 0,
      );

      // 7. Check if journey has sufficient data for optimization
      if (!performanceData || performanceData.length < 2) {
        return NextResponse.json(
          {
            error: 'INSUFFICIENT_DATA',
            message:
              'Journey needs at least 2 performance data points before optimization',
            currentDataPoints: performanceData?.length || 0,
            requiredDataPoints: 2,
            suggestion:
              'Allow the journey to run longer or gather more performance feedback',
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );
      }

      // 8. Analyze performance trends
      const performanceAnalysis = analyzePerformanceData(performanceData);

      if (performanceAnalysis.optimizationPotential < 0.1) {
        return NextResponse.json(
          {
            error: 'LOW_OPTIMIZATION_POTENTIAL',
            message:
              'Journey is already performing well. Optimization may not provide significant benefits.',
            currentPerformance: {
              completionRate: performanceAnalysis.avgCompletionRate,
              satisfactionScore: performanceAnalysis.avgSatisfactionScore,
              optimizationPotential: performanceAnalysis.optimizationPotential,
            },
            recommendation: 'Continue monitoring performance before optimizing',
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );
      }

      // 9. Create audit log
      auditLogId = await createOptimizationAuditLogEntry({
        supplierId: validatedData.supplierId,
        userId: user.id,
        existingJourneyId: validatedData.existingJourneyId,
        requestData: validatedData,
        performanceData: performanceAnalysis,
        startTime,
      });

      // 10. Optimize journey using AI engine
      console.log('[AI Journey Optimize API] Initializing optimization engine');
      const journeyEngine = new JourneySuggestionsEngine();

      const optimizedJourney = await journeyEngine.optimizeJourney(
        validatedData.existingJourneyId,
        {
          ...validatedData,
          supplierId: validatedData.supplierId,
        },
      );

      console.log(
        '[AI Journey Optimize API] Journey optimized successfully:',
        optimizedJourney.id,
      );

      // 11. Update audit log with success
      if (auditLogId) {
        await updateOptimizationAuditLogEntry(auditLogId, {
          responseStatus: 'success',
          responseData: {
            optimizedJourneyId: optimizedJourney.id,
            improvementPredictions: performanceAnalysis,
          },
          processingTimeMs: Date.now() - startTime,
        });
      }

      // 12. Return successful response
      const response = NextResponse.json({
        success: true,
        data: {
          ...optimizedJourney,
          optimization: {
            basedOnDataPoints: performanceData.length,
            performanceAnalysis,
            expectedImprovements:
              calculateExpectedImprovements(performanceAnalysis),
            originalJourneyId: validatedData.existingJourneyId,
          },
        },
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

      return response;
    } catch (error) {
      console.error('[AI Journey Optimize API] Optimization failed:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const processingTime = Date.now() - startTime;

      // Update audit log with error
      if (auditLogId) {
        await updateOptimizationAuditLogEntry(auditLogId, {
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
      } else if (errorMessage.includes('Journey not found')) {
        statusCode = 404;
        errorCode = 'JOURNEY_NOT_FOUND';
      } else if (errorMessage.includes('OpenAI')) {
        statusCode = 502;
        errorCode = 'AI_SERVICE_ERROR';
      }

      return NextResponse.json(
        {
          error: errorCode,
          message: 'Failed to optimize journey',
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
 * Analyze performance data to determine optimization opportunities
 */
function analyzePerformanceData(performanceData: any[]): {
  avgCompletionRate: number;
  avgSatisfactionScore: number;
  optimizationPotential: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  keyIssues: string[];
} {
  const completionRates = performanceData
    .map((d) => d.actual_completion_rate)
    .filter((rate) => rate !== null && rate !== undefined);

  const satisfactionScores = performanceData
    .map((d) => d.client_satisfaction_score)
    .filter((score) => score !== null && score !== undefined);

  const avgCompletionRate =
    completionRates.reduce((sum, rate) => sum + rate, 0) /
      completionRates.length || 0;
  const avgSatisfactionScore =
    satisfactionScores.reduce((sum, score) => sum + score, 0) /
      satisfactionScores.length || 0;

  // Calculate optimization potential (higher = more room for improvement)
  const completionRateGap = Math.max(0, 0.95 - avgCompletionRate);
  const satisfactionGap = Math.max(0, 5.0 - avgSatisfactionScore) / 5.0;
  const optimizationPotential = (completionRateGap + satisfactionGap) / 2;

  // Determine trend direction
  let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
  if (performanceData.length >= 3) {
    const recent = performanceData.slice(
      0,
      Math.floor(performanceData.length / 2),
    );
    const older = performanceData.slice(Math.floor(performanceData.length / 2));

    const recentAvgCompletion =
      recent.reduce((sum, d) => sum + (d.actual_completion_rate || 0), 0) /
      recent.length;
    const olderAvgCompletion =
      older.reduce((sum, d) => sum + (d.actual_completion_rate || 0), 0) /
      older.length;

    if (recentAvgCompletion > olderAvgCompletion + 0.05) {
      trendDirection = 'improving';
    } else if (recentAvgCompletion < olderAvgCompletion - 0.05) {
      trendDirection = 'declining';
    }
  }

  // Identify key issues
  const keyIssues: string[] = [];
  if (avgCompletionRate < 0.7) keyIssues.push('Low completion rate');
  if (avgSatisfactionScore < 3.5) keyIssues.push('Low client satisfaction');
  if (trendDirection === 'declining')
    keyIssues.push('Performance declining over time');

  const commonModifications = performanceData
    .flatMap((d) => d.modifications_made?.nodes_removed || [])
    .reduce(
      (acc, modification) => {
        acc[modification] = (acc[modification] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

  Object.entries(commonModifications)
    .filter(([_, count]) => count >= Math.ceil(performanceData.length * 0.3))
    .forEach(([modification, _]) => {
      keyIssues.push(`Frequently removed: ${modification}`);
    });

  return {
    avgCompletionRate,
    avgSatisfactionScore,
    optimizationPotential,
    trendDirection,
    keyIssues,
  };
}

/**
 * Calculate expected improvements from optimization
 */
function calculateExpectedImprovements(analysis: any): {
  expectedCompletionRateIncrease: number;
  expectedSatisfactionIncrease: number;
  confidenceLevel: number;
} {
  const baseImprovement = Math.min(analysis.optimizationPotential * 0.3, 0.15); // Max 15% improvement
  const trendMultiplier =
    analysis.trendDirection === 'declining'
      ? 1.2
      : analysis.trendDirection === 'improving'
        ? 0.8
        : 1.0;

  return {
    expectedCompletionRateIncrease: baseImprovement * trendMultiplier,
    expectedSatisfactionIncrease: baseImprovement * trendMultiplier * 5, // Scale to 1-5 rating
    confidenceLevel: Math.min(0.9, 0.5 + analysis.optimizationPotential * 0.5),
  };
}

/**
 * Create optimization audit log entry
 */
async function createOptimizationAuditLogEntry(data: {
  supplierId: string;
  userId: string;
  existingJourneyId: string;
  requestData: any;
  performanceData: any;
  startTime: number;
}): Promise<string | null> {
  try {
    const { data: auditEntry, error } = await supabase
      .from('ai_generation_audit_log')
      .insert({
        supplier_id: data.supplierId,
        user_id: data.userId,
        request_type: 'optimize_existing',
        request_data: {
          ...data.requestData,
          existing_journey_id: data.existingJourneyId,
          performance_analysis: data.performanceData,
        },
        ai_model_used: 'gpt-4',
        processing_time_ms: 0,
        response_status: 'processing',
      })
      .select('id')
      .single();

    if (error) {
      console.error(
        '[AI Journey Optimize API] Failed to create audit log:',
        error,
      );
      return null;
    }

    return auditEntry.id;
  } catch (error) {
    console.error('[AI Journey Optimize API] Audit log creation error:', error);
    return null;
  }
}

/**
 * Update optimization audit log entry
 */
async function updateOptimizationAuditLogEntry(
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
      console.error(
        '[AI Journey Optimize API] Failed to update audit log:',
        error,
      );
    }
  } catch (error) {
    console.error('[AI Journey Optimize API] Audit log update error:', error);
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
