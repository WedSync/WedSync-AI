/**
 * WS-241: AI Caching Strategy System - Response Optimization API
 * Team D: AI/ML Engineering Implementation
 *
 * API endpoint for AI-powered response optimization and caching decisions
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { aiCacheOrchestrator } from '@/lib/ai/caching/ai-cache-orchestrator';
import { WeddingContext } from '@/lib/ai/caching/types';

// Request validation schema
const OptimizeRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  response: z.string().min(1).max(10000),
  context: z.object({
    wedding_id: z.string(),
    couple_id: z.string(),
    wedding_date: z.string().transform((date) => new Date(date)),
    location: z.object({
      city: z.string(),
      state: z.string(),
      country: z.string(),
      venue: z.string().optional(),
    }),
    budget_range: z.enum(['low', 'medium', 'high', 'luxury']),
    wedding_style: z.enum([
      'classic',
      'modern',
      'rustic',
      'bohemian',
      'traditional',
      'destination',
      'vintage',
    ]),
    guest_count: z.number().int().min(1),
    current_planning_stage: z.enum([
      'early',
      'venue_selection',
      'vendor_booking',
      'final_details',
      'wedding_week',
    ]),
    cultural_preferences: z.array(z.string()),
    preferences: z.record(z.any()),
    timezone: z.string().optional().default('UTC'),
    season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  }),
  optimization_options: z
    .object({
      enhance_cultural_sensitivity: z.boolean().optional().default(true),
      add_budget_context: z.boolean().optional().default(true),
      include_seasonal_advice: z.boolean().optional().default(true),
      add_location_context: z.boolean().optional().default(true),
      improve_completeness: z.boolean().optional().default(true),
      force_optimization: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
  return_cache_decision: z.boolean().optional().default(true),
  return_quality_metrics: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validatedData = OptimizeRequestSchema.parse(body);

    // Derive season if not provided
    if (!validatedData.context.season) {
      const month = validatedData.context.wedding_date.getMonth();
      if (month >= 2 && month <= 4) validatedData.context.season = 'spring';
      else if (month >= 5 && month <= 7)
        validatedData.context.season = 'summer';
      else if (month >= 8 && month <= 10) validatedData.context.season = 'fall';
      else validatedData.context.season = 'winter';
    }

    // Process response optimization
    const optimizationResult =
      await aiCacheOrchestrator.optimizeResponseForCache(
        validatedData.query,
        validatedData.response,
        validatedData.context as WeddingContext,
      );

    // Get cache decision if requested
    let cacheDecision = null;
    if (validatedData.return_cache_decision) {
      const cacheResponse = await aiCacheOrchestrator.processAICacheRequest({
        query: validatedData.query,
        response: optimizationResult.optimized_response,
        context: validatedData.context as WeddingContext,
        operation: 'cache_decision',
      });

      if (cacheResponse.success) {
        cacheDecision = cacheResponse.data;
      }
    }

    // Calculate optimization metrics
    const optimizationMetrics = {
      original_length: validatedData.response.length,
      optimized_length: optimizationResult.optimized_response.length,
      length_change_percent: Math.round(
        ((optimizationResult.optimized_response.length -
          validatedData.response.length) /
          validatedData.response.length) *
          100,
      ),
      improvements_count: optimizationResult.improvements_applied.length,
      quality_improvement:
        optimizationResult.quality_assessment.overall_quality - 0.5, // Assume base quality of 0.5
    };

    // Format response
    const response = {
      success: true,
      data: {
        original_response: validatedData.response,
        optimized_response: optimizationResult.optimized_response,
        quality_assessment: validatedData.return_quality_metrics
          ? optimizationResult.quality_assessment
          : undefined,
        cache_decision: cacheDecision,
        improvements_applied: optimizationResult.improvements_applied,
        optimization_metrics: optimizationMetrics,
        context_enhancements: {
          cultural_context_added:
            optimizationResult.improvements_applied.includes(
              'Enhanced cultural sensitivity',
            ),
          budget_context_added:
            optimizationResult.improvements_applied.includes(
              'Added budget-appropriate suggestions',
            ),
          seasonal_advice_added:
            optimizationResult.improvements_applied.includes(
              'Added seasonal advice',
            ),
          location_context_added:
            optimizationResult.improvements_applied.includes(
              'Added location context',
            ),
          completeness_improved:
            optimizationResult.improvements_applied.includes(
              'Added comprehensive information',
            ),
        },
      },
      recommendations: optimizationResult.quality_assessment.improvements,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI Cache Optimization API Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
          message: 'Invalid request data',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to optimize response',
      },
      { status: 500 },
    );
  }
}

// Batch optimization endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const BatchOptimizeSchema = z.object({
      requests: z.array(OptimizeRequestSchema).max(10), // Limit to 10 requests per batch
      parallel_processing: z.boolean().optional().default(true),
    });

    const validatedData = BatchOptimizeSchema.parse(body);

    // Process requests
    const results = validatedData.parallel_processing
      ? await Promise.all(
          validatedData.requests.map(async (req) => {
            try {
              // Derive season if not provided
              if (!req.context.season) {
                const month = req.context.wedding_date.getMonth();
                if (month >= 2 && month <= 4) req.context.season = 'spring';
                else if (month >= 5 && month <= 7)
                  req.context.season = 'summer';
                else if (month >= 8 && month <= 10) req.context.season = 'fall';
                else req.context.season = 'winter';
              }

              const result = await aiCacheOrchestrator.optimizeResponseForCache(
                req.query,
                req.response,
                req.context as WeddingContext,
              );

              return {
                success: true,
                query: req.query,
                result: result,
              };
            } catch (error) {
              return {
                success: false,
                query: req.query,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          }),
        )
      : await validatedData.requests.reduce(
          async (accPromise, req) => {
            const acc = await accPromise;

            try {
              // Derive season if not provided
              if (!req.context.season) {
                const month = req.context.wedding_date.getMonth();
                if (month >= 2 && month <= 4) req.context.season = 'spring';
                else if (month >= 5 && month <= 7)
                  req.context.season = 'summer';
                else if (month >= 8 && month <= 10) req.context.season = 'fall';
                else req.context.season = 'winter';
              }

              const result = await aiCacheOrchestrator.optimizeResponseForCache(
                req.query,
                req.response,
                req.context as WeddingContext,
              );

              acc.push({
                success: true,
                query: req.query,
                result: result,
              });
            } catch (error) {
              acc.push({
                success: false,
                query: req.query,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }

            return acc;
          },
          Promise.resolve([] as any[]),
        );

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.length - successCount;

    return NextResponse.json({
      success: errorCount === 0,
      data: {
        results: results,
        summary: {
          total_requests: results.length,
          successful: successCount,
          failed: errorCount,
          success_rate: Math.round((successCount / results.length) * 100),
        },
      },
    });
  } catch (error) {
    console.error('AI Cache Batch Optimization API Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
          message: 'Invalid batch request data',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to process batch optimization',
      },
      { status: 500 },
    );
  }
}
