/**
 * WS-152: Caterer Export API
 * Path: /api/dietary/export/:couple_id
 * Generates comprehensive caterer reports with safety protocols
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dietaryService } from '@/lib/services/dietaryService';
import {
  catererExportRequestSchema,
  coupleIdParamSchema,
} from '@/lib/validations/dietary';
import { logger } from '@/lib/monitoring/logger';
import { withAuth } from '@/lib/auth/middleware';

// Export rate limiting
const EXPORT_RATE_LIMIT = {
  window: 300000, // 5 minutes
  maxExports: 10,
};

const exportCounts = new Map<string, { count: number; resetTime: number }>();

function checkExportLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = exportCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    exportCounts.set(userId, {
      count: 1,
      resetTime: now + EXPORT_RATE_LIMIT.window,
    });
    return true;
  }

  if (userLimit.count >= EXPORT_RATE_LIMIT.maxExports) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * POST /api/dietary/export/:couple_id
 * Generate caterer export in various formats
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { couple_id: string } },
) {
  const startTime = Date.now();

  try {
    // Validate couple ID
    const coupleValidation = coupleIdParamSchema.safeParse({
      couple_id: params.couple_id,
    });
    if (!coupleValidation.success) {
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

    // Check export rate limit
    if (!checkExportLimit(user.id)) {
      return NextResponse.json(
        {
          error: 'Export rate limit exceeded',
          message: 'Please wait before generating another export',
        },
        { status: 429 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = catererExportRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid export parameters',
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify user has access to this couple
    const { data: couple } = await supabase
      .from('couples')
      .select('id, names, event_date, venue')
      .eq('id', params.couple_id)
      .eq('user_id', user.id)
      .single();

    if (!couple) {
      logger.warn('Unauthorized caterer export attempt', {
        user_id: user.id,
        couple_id: params.couple_id,
      });
      return NextResponse.json(
        { error: 'Couple not found or unauthorized' },
        { status: 404 },
      );
    }

    // Generate caterer export
    const exportData = await dietaryService.generateCatererExport(
      params.couple_id,
      validation.data.format,
      {
        includePhotos: validation.data.include_photos,
        language: validation.data.language,
        kitchenCardFormat: validation.data.kitchen_card_format,
      },
    );

    // Log export generation
    await supabase.from('dietary_export_log').insert({
      couple_id: params.couple_id,
      user_id: user.id,
      format: validation.data.format,
      generated_at: new Date(),
      critical_count: exportData.critical_medical_alerts.length,
      total_requirements: exportData.dietary_matrix.guest_count,
    });

    const generationTime = Date.now() - startTime;

    logger.info('Caterer export generated', {
      couple_id: params.couple_id,
      format: validation.data.format,
      generation_time_ms: generationTime,
      critical_alerts: exportData.critical_medical_alerts.length,
      total_requirements: exportData.dietary_matrix.guest_count,
    });

    // Handle different export formats
    switch (validation.data.format) {
      case 'PDF':
        // For PDF, we would typically generate a file and return a download URL
        // For now, return the data with instructions
        return NextResponse.json({
          message: 'PDF export generated',
          download_url: `/api/dietary/export/download/${params.couple_id}/caterer-export.pdf`,
          expires_at: new Date(Date.now() + 3600000), // 1 hour
          data: exportData,
        });

      case 'EXCEL':
        // For Excel, similar to PDF
        return NextResponse.json({
          message: 'Excel export generated',
          download_url: `/api/dietary/export/download/${params.couple_id}/caterer-export.xlsx`,
          expires_at: new Date(Date.now() + 3600000),
          data: exportData,
        });

      case 'JSON':
      default:
        // Return raw JSON data
        return NextResponse.json(exportData, {
          headers: {
            'Content-Disposition': `attachment; filename="dietary-export-${params.couple_id}.json"`,
            'X-Generation-Time': String(generationTime),
          },
        });
    }
  } catch (error) {
    logger.error('Error generating caterer export', {
      error,
      couple_id: params.couple_id,
    });
    return NextResponse.json(
      { error: 'Failed to generate caterer export' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/dietary/export/:couple_id/status
 * Check export generation status (for async exports)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { couple_id: string } },
) {
  try {
    // Get authenticated user
    const user = await withAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get recent exports for this couple
    const { data: exports, error } = await supabase
      .from('dietary_export_log')
      .select('*')
      .eq('couple_id', params.couple_id)
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      couple_id: params.couple_id,
      exports: exports || [],
      can_generate: checkExportLimit(user.id),
    });
  } catch (error) {
    logger.error('Error fetching export status', {
      error,
      couple_id: params.couple_id,
    });
    return NextResponse.json(
      { error: 'Failed to fetch export status' },
      { status: 500 },
    );
  }
}
