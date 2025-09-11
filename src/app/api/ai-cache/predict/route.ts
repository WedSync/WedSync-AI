/**
 * WS-241: AI Caching Strategy System - Query Prediction API
 * Team D: AI/ML Engineering Implementation
 *
 * API endpoint for AI-powered cache prediction and proactive query caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { aiCacheOrchestrator } from '@/lib/ai/caching/ai-cache-orchestrator';
import { WeddingContext } from '@/lib/ai/caching/types';

// Request validation schema
const PredictRequestSchema = z.object({
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
  recent_queries: z.array(z.string()).optional().default([]),
  limit: z.number().int().min(1).max(50).optional().default(10),
  include_hit_probability: z.boolean().optional().default(true),
  preload_high_confidence: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validatedData = PredictRequestSchema.parse(body);

    // Derive season if not provided
    if (!validatedData.context.season) {
      const month = validatedData.context.wedding_date.getMonth();
      if (month >= 2 && month <= 4) validatedData.context.season = 'spring';
      else if (month >= 5 && month <= 7)
        validatedData.context.season = 'summer';
      else if (month >= 8 && month <= 10) validatedData.context.season = 'fall';
      else validatedData.context.season = 'winter';
    }

    // Process AI cache prediction request
    const aiResponse = await aiCacheOrchestrator.processAICacheRequest({
      query: '', // Not needed for prediction
      context: validatedData.context as WeddingContext,
      operation: 'predict',
    });

    if (!aiResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: aiResponse.error,
          message: 'Failed to generate query predictions',
        },
        { status: 500 },
      );
    }

    // Get detailed predictions with hit probabilities
    const detailedPredictions = await aiCacheOrchestrator.getPredictedQueries(
      validatedData.context as WeddingContext,
      validatedData.recent_queries,
      validatedData.limit,
    );

    // Preload high-confidence predictions if requested
    if (validatedData.preload_high_confidence) {
      const highConfidencePredictions = detailedPredictions.filter(
        (p) => p.confidence_score > 0.8,
      );

      // Trigger background preloading
      Promise.all(
        highConfidencePredictions.slice(0, 5).map(async (prediction) => {
          // This would trigger actual cache preloading in production
          console.log(`Preloading cache for: "${prediction.query}"`);
        }),
      ).catch(console.error);
    }

    // Format response
    const response = {
      success: true,
      data: {
        predictions: detailedPredictions,
        metadata: {
          total_predictions: detailedPredictions.length,
          high_confidence_count: detailedPredictions.filter(
            (p) => p.confidence_score > 0.8,
          ).length,
          average_confidence:
            detailedPredictions.reduce(
              (sum, p) => sum + p.confidence_score,
              0,
            ) / detailedPredictions.length,
          context_summary: {
            wedding_date: validatedData.context.wedding_date,
            planning_stage: validatedData.context.current_planning_stage,
            season: validatedData.context.season,
            budget_range: validatedData.context.budget_range,
          },
        },
      },
      performance: aiResponse.performance_metrics,
      recommendations: aiResponse.recommendations,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI Cache Prediction API Error:', error);

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
        message: 'Failed to process cache prediction request',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('wedding_id');
    const coupleId = searchParams.get('couple_id');

    if (!weddingId || !coupleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          message: 'wedding_id and couple_id are required',
        },
        { status: 400 },
      );
    }

    // Get basic prediction without detailed context (for quick queries)
    const mockContext: WeddingContext = {
      wedding_id: weddingId,
      couple_id: coupleId,
      wedding_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
      location: { city: 'Unknown', state: 'Unknown', country: 'Unknown' },
      budget_range: 'medium',
      wedding_style: 'modern',
      guest_count: 100,
      current_planning_stage: 'vendor_booking',
      cultural_preferences: [],
      preferences: {},
      timezone: 'UTC',
      season: 'summer',
    };

    const predictions = await aiCacheOrchestrator.getPredictedQueries(
      mockContext,
      [],
      5, // Limited predictions for GET request
    );

    return NextResponse.json({
      success: true,
      data: {
        predictions: predictions,
        note: 'Limited predictions based on minimal context. Use POST with full context for better results.',
      },
    });
  } catch (error) {
    console.error('AI Cache Prediction GET API Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to get cache predictions',
      },
      { status: 500 },
    );
  }
}
