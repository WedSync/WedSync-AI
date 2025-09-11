/**
 * WS-152: Dietary Matrix Generation API
 * Path: /api/dietary/matrix/:couple_id
 * Performance Target: <2 seconds for 500 guests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dietaryService } from '@/lib/services/dietaryService';
import {
  dietaryMatrixRequestSchema,
  coupleIdParamSchema,
} from '@/lib/validations/dietary';
import { logger } from '@/lib/monitoring/logger';
import { withAuth } from '@/lib/auth/middleware';
import { DietarySeverity } from '@/types/dietary';

// Performance monitoring
const PERFORMANCE_THRESHOLD_MS = 2000; // 2 seconds

// Cache configuration
const CACHE_DURATION_MS = 300000; // 5 minutes
const matrixCache = new Map<
  string,
  {
    data: any;
    timestamp: number;
  }
>();

/**
 * GET /api/dietary/matrix/:couple_id
 * Generate comprehensive dietary matrix for event planning
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { couple_id: string } },
) {
  const startTime = Date.now();

  try {
    // Validate couple ID
    const validationResult = coupleIdParamSchema.safeParse({
      couple_id: params.couple_id,
    });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid couple ID format' },
        { status: 400 },
      );
    }

    // Get authenticated user
    const user = await withAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const includeTableAssignments =
      url.searchParams.get('include_tables') === 'true';
    const severityFilter = url.searchParams.get('severity')?.split(',') as
      | DietarySeverity[]
      | undefined;
    const allergenFilter =
      url.searchParams.get('allergens')?.split(',') || undefined;

    // Validate request parameters
    const requestValidation = dietaryMatrixRequestSchema.safeParse({
      include_table_assignments: includeTableAssignments,
      severity_filter: severityFilter,
      allergen_filter: allergenFilter,
    });

    if (!requestValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: requestValidation.error.errors,
        },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify user has access to this couple
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('id, names, event_date, venue')
      .eq('id', params.couple_id)
      .eq('user_id', user.id)
      .single();

    if (coupleError || !couple) {
      logger.warn('Unauthorized access attempt to dietary matrix', {
        user_id: user.id,
        couple_id: params.couple_id,
      });
      return NextResponse.json(
        { error: 'Couple not found or unauthorized' },
        { status: 404 },
      );
    }

    // Check cache first
    const cacheKey = `${params.couple_id}-${JSON.stringify(requestValidation.data)}`;
    const cached = matrixCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      logger.info('Dietary matrix served from cache', {
        couple_id: params.couple_id,
        cache_age_ms: Date.now() - cached.timestamp,
      });

      // Add cache headers
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'X-Cache-Age': String(
            Math.floor((Date.now() - cached.timestamp) / 1000),
          ),
        },
      });
    }

    // Generate dietary matrix
    const matrix = await dietaryService.generateDietaryMatrix(
      params.couple_id,
      requestValidation.data,
    );

    // Add event information
    const enrichedMatrix = {
      ...matrix,
      couple_names: couple.names,
      event_date: couple.event_date,
      venue: couple.venue,
    };

    // Cache the result
    matrixCache.set(cacheKey, {
      data: enrichedMatrix,
      timestamp: Date.now(),
    });

    // Clean up old cache entries
    if (matrixCache.size > 100) {
      const entries = Array.from(matrixCache.entries());
      const oldEntries = entries
        .filter(
          ([_, value]) => Date.now() - value.timestamp > CACHE_DURATION_MS,
        )
        .map(([key]) => key);
      oldEntries.forEach((key) => matrixCache.delete(key));
    }

    // Performance monitoring
    const generationTime = Date.now() - startTime;
    if (generationTime > PERFORMANCE_THRESHOLD_MS) {
      logger.warn('Dietary matrix generation exceeded performance threshold', {
        couple_id: params.couple_id,
        generation_time_ms: generationTime,
        guest_count: matrix.guest_count,
        threshold_ms: PERFORMANCE_THRESHOLD_MS,
      });
    }

    // Log successful generation
    logger.info('Dietary matrix generated successfully', {
      couple_id: params.couple_id,
      generation_time_ms: generationTime,
      guest_count: matrix.guest_count,
      critical_alerts: matrix.critical_alerts.length,
      life_threatening_count: matrix.dietary_summary.life_threatening_count,
    });

    return NextResponse.json(enrichedMatrix, {
      headers: {
        'X-Cache': 'MISS',
        'X-Generation-Time': String(generationTime),
      },
    });
  } catch (error) {
    const errorTime = Date.now() - startTime;
    logger.error('Error generating dietary matrix', {
      error,
      couple_id: params.couple_id,
      generation_time_ms: errorTime,
    });
    return NextResponse.json(
      { error: 'Failed to generate dietary matrix' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/dietary/matrix/:couple_id/refresh
 * Force refresh of dietary matrix (bypasses cache)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { couple_id: string } },
) {
  try {
    // Validate couple ID
    const validationResult = coupleIdParamSchema.safeParse({
      couple_id: params.couple_id,
    });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid couple ID format' },
        { status: 400 },
      );
    }

    // Get authenticated user
    const user = await withAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify authorization
    const { data: hasAccess } = await supabase
      .from('couples')
      .select('id')
      .eq('id', params.couple_id)
      .eq('user_id', user.id)
      .single();

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Clear cache for this couple
    const keysToDelete = Array.from(matrixCache.keys()).filter((key) =>
      key.startsWith(params.couple_id),
    );
    keysToDelete.forEach((key) => matrixCache.delete(key));

    // Generate fresh matrix
    const matrix = await dietaryService.generateDietaryMatrix(
      params.couple_id,
      { includeTableAssignments: true },
    );

    // Cache the refreshed result
    const cacheKey = `${params.couple_id}-${JSON.stringify({ includeTableAssignments: true })}`;
    matrixCache.set(cacheKey, {
      data: matrix,
      timestamp: Date.now(),
    });

    logger.info('Dietary matrix refreshed', {
      couple_id: params.couple_id,
      cleared_cache_entries: keysToDelete.length,
    });

    return NextResponse.json({
      message: 'Dietary matrix refreshed successfully',
      matrix,
    });
  } catch (error) {
    logger.error('Error refreshing dietary matrix', {
      error,
      couple_id: params.couple_id,
    });
    return NextResponse.json(
      { error: 'Failed to refresh dietary matrix' },
      { status: 500 },
    );
  }
}
