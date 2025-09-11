/**
 * Viral A/B Testing API - GET /api/viral/ab-testing
 * WS-141 Round 2: A/B testing framework for viral optimization
 * SECURITY: Rate limited, authenticated, validated inputs
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import {
  ViralABTestingService,
  type RelationshipType,
} from '@/lib/services/viral-ab-testing-service';

// Query parameter validation schema
const abTestingQuerySchema = z.object({
  relationship_type: z.enum(['past_client', 'vendor', 'friend']).optional(),
  timeframe: z.enum(['7d', '30d', '90d', '180d']).default('30d'),
  include_stats: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
  action: z.enum(['analyze', 'promote']).optional(),
});

// Response type for A/B testing analytics
interface ABTestingAnalyticsResponse {
  success: true;
  data: {
    relationship_type?: string;
    timeframe: string;
    variant_performance: Array<{
      variant: string;
      sent_count: number;
      opened_count: number;
      clicked_count: number;
      converted_count: number;
      open_rate: number;
      click_rate: number;
      conversion_rate: number;
      statistical_significance?: number;
      confidence_interval?: {
        lower: number;
        upper: number;
      };
    }>;
    statistical_analysis?: {
      winner: string | null;
      confidence_level: number;
      required_sample_size: number;
      current_sample_size: number;
      test_complete: boolean;
      recommendations: string[];
    };
    promotion_results?: {
      promoted: string[];
      disabled: string[];
    };
  };
  computed_at: string;
  cache_ttl: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      );
    }

    // Rate limiting for A/B testing analytics endpoints
    const rateLimitResult = await rateLimit.check(
      `viral_ab_testing:${session.user.id}`,
      15, // 15 requests
      60, // per minute
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message:
            'Too many requests. A/B testing analytics rate limit exceeded.',
          retry_after: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validationResult = abTestingQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'INVALID_QUERY_PARAMETERS',
          message: 'Invalid query parameters provided',
          details: validationResult.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`,
          ),
        },
        { status: 400 },
      );
    }

    const { relationship_type, timeframe, include_stats, action } =
      validationResult.data;
    const timeframeMap = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '180d': '180 days',
    };

    // Handle promotion action
    if (action === 'promote') {
      if (
        !session.user.role ||
        !['admin', 'marketing_manager'].includes(session.user.role)
      ) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'Insufficient permissions for variant promotion',
          },
          { status: 403 },
        );
      }

      const promotionResults =
        await ViralABTestingService.promoteWinningVariants();

      const response: ABTestingAnalyticsResponse = {
        success: true,
        data: {
          relationship_type,
          timeframe: timeframeMap[timeframe],
          variant_performance: [],
          promotion_results: promotionResults,
        },
        computed_at: new Date().toISOString(),
        cache_ttl: 0, // No cache for promotion actions
      };

      return NextResponse.json(response);
    }

    // Analyze variant performance
    const variantResults =
      await ViralABTestingService.analyzeVariantPerformance(
        relationship_type as RelationshipType | undefined,
        timeframeMap[timeframe],
      );

    if (variantResults.length === 0) {
      const response: ABTestingAnalyticsResponse = {
        success: true,
        data: {
          relationship_type,
          timeframe: timeframeMap[timeframe],
          variant_performance: [],
          statistical_analysis: {
            winner: null,
            confidence_level: 0,
            required_sample_size: 100,
            current_sample_size: 0,
            test_complete: false,
            recommendations: [
              'No A/B test data available for the specified timeframe',
              'Start sending invitations to begin collecting performance data',
              'Ensure template variants are active and properly configured',
            ],
          },
        },
        computed_at: new Date().toISOString(),
        cache_ttl: 300, // 5 minutes
      };

      return NextResponse.json(response);
    }

    // Build response
    const responseData: ABTestingAnalyticsResponse['data'] = {
      relationship_type,
      timeframe: timeframeMap[timeframe],
      variant_performance: variantResults,
    };

    // Add statistical analysis if requested
    if (include_stats) {
      const totalSampleSize = variantResults.reduce(
        (sum, r) => sum + r.sent_count,
        0,
      );
      const bestPerformer = variantResults[0]; // Results are ordered by performance
      const hasSignificantResults = variantResults.some(
        (r) => r.statistical_significance && r.statistical_significance >= 0.95,
      );

      const winner =
        hasSignificantResults && totalSampleSize >= 100
          ? bestPerformer.variant
          : null;

      const recommendations: string[] = [];

      if (totalSampleSize < 100) {
        recommendations.push(
          `Need ${100 - totalSampleSize} more samples for statistical significance`,
        );
      }

      if (!hasSignificantResults && totalSampleSize >= 100) {
        recommendations.push(
          'Results lack statistical significance - consider running test longer',
        );
      }

      if (winner) {
        recommendations.push(
          `${winner} shows statistically significant improvement - ready for promotion`,
        );
      }

      if (variantResults.length < 2) {
        recommendations.push(
          'Need at least 2 active variants for meaningful A/B testing',
        );
      }

      responseData.statistical_analysis = {
        winner,
        confidence_level: Math.max(
          ...variantResults.map((r) => r.statistical_significance || 0),
        ),
        required_sample_size: 100,
        current_sample_size: totalSampleSize,
        test_complete: !!winner,
        recommendations,
      };
    }

    // Performance requirement: Analysis under 200ms
    const processingTime = Date.now() - startTime;
    if (processingTime > 180) {
      console.warn(
        `A/B testing analysis took ${processingTime}ms - approaching 200ms limit`,
      );
    }

    const response: ABTestingAnalyticsResponse = {
      success: true,
      data: responseData,
      computed_at: new Date().toISOString(),
      cache_ttl: 300, // 5 minute cache
    };

    // Add performance headers
    return NextResponse.json(response, {
      headers: {
        'X-Processing-Time': `${processingTime}ms`,
        'Cache-Control': 'private, max-age=300', // 5 minute cache
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error('A/B testing analytics API error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to analyze A/B testing performance',
        timestamp: new Date().toISOString(),
        processing_time: `${Date.now() - startTime}ms`,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/viral/ab-testing
 * Create or update template variants
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check permissions for creating variants
    if (
      !session.user.role ||
      !['admin', 'marketing_manager', 'content_creator'].includes(
        session.user.role,
      )
    ) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Insufficient permissions to create template variants',
        },
        { status: 403 },
      );
    }

    // Rate limiting for template creation
    const rateLimitResult = await rateLimit.check(
      `viral_ab_create:${session.user.id}`,
      5, // 5 requests
      300, // per 5 minutes
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message:
            'Too many template creation requests. Please wait before creating more variants.',
          retry_after: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Parse and validate request body
    const body = await request.json();

    const templateVariantSchema = z.object({
      relationship_type: z.enum(['past_client', 'vendor', 'friend']),
      variant_name: z.string().min(1).max(50),
      template: z.string().min(10).max(2000),
      is_control: z.boolean().default(false),
      is_active: z.boolean().default(true),
    });

    const validationResult = templateVariantSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST_BODY',
          message: 'Invalid template variant data provided',
          details: validationResult.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`,
          ),
        },
        { status: 400 },
      );
    }

    const { relationship_type, variant_name, template, is_control, is_active } =
      validationResult.data;

    // Check if variant name already exists for this relationship type
    const existingVariantQuery = `
      SELECT id FROM template_variants 
      WHERE relationship_type = $1 AND variant_name = $2
    `;

    const existingResult = await fetch('/api/internal/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: existingVariantQuery,
        params: [relationship_type, variant_name],
      }),
    }).then((res) => res.json());

    if (existingResult.rows && existingResult.rows.length > 0) {
      return NextResponse.json(
        {
          error: 'VARIANT_EXISTS',
          message: `Variant '${variant_name}' already exists for ${relationship_type}`,
        },
        { status: 409 },
      );
    }

    // Create new variant
    const insertQuery = `
      INSERT INTO template_variants 
      (id, relationship_type, variant_name, template, is_control, is_active, created_by, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, relationship_type, variant_name, is_control, is_active, created_at
    `;

    const insertResult = await fetch('/api/internal/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: insertQuery,
        params: [
          relationship_type,
          variant_name,
          template,
          is_control,
          is_active,
          session.user.id,
        ],
      }),
    }).then((res) => res.json());

    if (!insertResult.rows || insertResult.rows.length === 0) {
      throw new Error('Failed to create template variant');
    }

    const createdVariant = insertResult.rows[0];

    const response = {
      success: true,
      data: {
        id: createdVariant.id,
        relationship_type: createdVariant.relationship_type,
        variant_name: createdVariant.variant_name,
        is_control: createdVariant.is_control,
        is_active: createdVariant.is_active,
        created_at: createdVariant.created_at,
      },
      message: 'Template variant created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Template variant creation error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create template variant',
        timestamp: new Date().toISOString(),
        processing_time: `${Date.now() - startTime}ms`,
      },
      { status: 500 },
    );
  }
}
