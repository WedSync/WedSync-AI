/**
 * API Route: Color Analysis for Florist Intelligence
 * POST /api/florist/colors/analyze - WS-253 Team C Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getColorTheoryService } from '@/lib/integrations/color-theory-service';
import { checkTierRateLimit } from '@/lib/middleware/rate-limit';
import { z } from 'zod';

// Request validation schema
const colorAnalysisSchema = z.object({
  colors: z
    .array(z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format'))
    .min(1)
    .max(10),
  harmony_type: z
    .enum([
      'complementary',
      'analogous',
      'triadic',
      'split-complementary',
      'tetradic',
      'monochromatic',
    ])
    .optional(),
  include_palette_suggestions: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Get user info from headers
    const userId = request.headers.get('x-user-id');
    const userTier = request.headers.get('x-user-tier') || 'FREE';

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = colorAnalysisSchema.parse(body);

    // Rate limiting check for color analysis
    const rateLimit = await checkTierRateLimit(
      userId,
      userTier as any,
      'colorAnalysis',
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Color analysis limit reached. Try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 },
      );
    }

    const colorService = getColorTheoryService();

    // Analyze individual colors
    const colorAnalyses = await Promise.all(
      validatedData.colors.map((color) => colorService.analyzeColor(color)),
    );

    // Analyze harmony if multiple colors
    let harmonyAnalysis = null;
    if (validatedData.colors.length > 1) {
      harmonyAnalysis = await colorService.analyzeColorHarmony(
        validatedData.colors,
        validatedData.harmony_type,
      );
    }

    // Generate palette suggestions if requested
    let paletteSuggestions = null;
    if (
      validatedData.include_palette_suggestions &&
      validatedData.colors.length > 0
    ) {
      const baseColor = validatedData.colors[0];
      const harmonyTypes = ['complementary', 'analogous', 'triadic'] as const;

      paletteSuggestions = await Promise.all(
        harmonyTypes.map(async (harmonyType) => {
          return await colorService.generateColorPalette(
            baseColor,
            harmonyType,
            2,
          );
        }),
      );
    }

    const response = NextResponse.json({
      success: true,
      data: {
        individual_analyses: colorAnalyses,
        harmony_analysis: harmonyAnalysis,
        palette_suggestions: paletteSuggestions,
        analysis_metadata: {
          total_colors_analyzed: validatedData.colors.length,
          harmony_type_detected:
            harmonyAnalysis?.harmony_type || 'single_color',
          wedding_suitability_score:
            harmonyAnalysis?.wedding_suitability.overall_score || null,
          accessibility_score:
            harmonyAnalysis?.color_accessibility.overall_contrast || null,
        },
      },
      metadata: {
        user_id: userId,
        user_tier: userTier,
        analysis_timestamp: new Date().toISOString(),
        cached: true, // Color analysis is typically cached
      },
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '200');
    response.headers.set(
      'X-RateLimit-Remaining',
      rateLimit.remaining.toString(),
    );
    response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());

    return response;
  } catch (error) {
    console.error('Color analysis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Color analysis failed',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST to analyze colors' },
    { status: 405 },
  );
}
