/**
 * WS-187: App Store Asset Generation API
 * Automated screenshot and icon generation with device simulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/validation/middleware';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AssetGenerationService } from '@/lib/app-store/asset-generator';
import { createClient } from '@/lib/supabase/server';

const assetGenerationSchema = z.object({
  asset_types: z.array(z.enum(['screenshots', 'icons', 'metadata'])),
  device_presets: z
    .array(z.string())
    .optional()
    .default(['iphone_6_7', 'iphone_6_5', 'ipad_12_9', 'android_phone']),
  store_platform: z.enum(['apple', 'google_play', 'microsoft']),
  optimization_level: z.enum(['standard', 'aggressive']).default('standard'),
  branding: z
    .object({
      primary_color: z.string().regex(/^#[0-9A-F]{6}$/i),
      secondary_color: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i)
        .optional(),
      logo_url: z.string().url().optional(),
    })
    .optional(),
  quality_settings: z
    .object({
      screenshot_quality: z.number().min(60).max(100).default(90),
      icon_quality: z.number().min(80).max(100).default(95),
      compression_type: z.enum(['lossless', 'optimized']).default('optimized'),
    })
    .optional(),
});

export const POST = withSecureValidation(
  assetGenerationSchema,
  async (request: NextRequest, validatedData) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          },
          { status: 401 },
        );
      }

      const supabase = await createClient();

      // Get user's organization for proper access control
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.organization_id) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'FORBIDDEN', message: 'No organization access' },
          },
          { status: 403 },
        );
      }

      // Initialize asset generation service
      const assetService = new AssetGenerationService(supabase);

      // Create asset generation job
      const jobData = {
        organization_id: profile.organization_id,
        job_type: 'screenshot_generation' as const,
        platform: validatedData.store_platform,
        job_config: {
          asset_types: validatedData.asset_types,
          device_presets: validatedData.device_presets,
          optimization_level: validatedData.optimization_level,
          branding: validatedData.branding,
          quality_settings: validatedData.quality_settings,
        },
        created_by: session.user.id,
      };

      const job = await assetService.createGenerationJob(jobData);

      // Start background processing
      await assetService.processAssetGeneration(job.id);

      // Return job tracking information
      return NextResponse.json({
        success: true,
        data: {
          job_id: job.id,
          status: 'queued',
          estimated_completion_minutes: estimateProcessingTime(validatedData),
          progress_url: `/api/app-store/generate/status/${job.id}`,
          webhook_url: `/api/app-store/generate/webhook/${job.id}`,
        },
      });
    } catch (error) {
      console.error('Asset generation error:', error);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'GENERATION_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to start asset generation',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 },
      );
    }
  },
);

export const GET = withSecureValidation(
  z.object({}),
  async (request: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          },
          { status: 401 },
        );
      }

      const supabase = await createClient();
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(
        parseInt(url.searchParams.get('limit') || '10'),
        50,
      );
      const status = url.searchParams.get('status');

      // Get user's organization
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.organization_id) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'FORBIDDEN', message: 'No organization access' },
          },
          { status: 403 },
        );
      }

      // Build query
      let query = supabase
        .from('asset_generation_jobs')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      // Execute paginated query
      const {
        data: jobs,
        error,
        count,
      } = await query.range((page - 1) * limit, page * limit - 1);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: {
          jobs: jobs || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            pages: Math.ceil((count || 0) / limit),
          },
        },
      });
    } catch (error) {
      console.error('Asset generation list error:', error);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: 'Failed to fetch asset generation jobs',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 },
      );
    }
  },
);

/**
 * Estimate processing time based on generation requirements
 */
function estimateProcessingTime(
  data: z.infer<typeof assetGenerationSchema>,
): number {
  let baseTime = 2; // 2 minutes base

  // Add time for each asset type
  if (data.asset_types.includes('screenshots')) {
    baseTime += data.device_presets.length * 0.5; // 30 seconds per device preset
  }

  if (data.asset_types.includes('icons')) {
    baseTime += 1; // 1 minute for icon generation
  }

  if (data.asset_types.includes('metadata')) {
    baseTime += 0.5; // 30 seconds for metadata processing
  }

  // Adjustment for optimization level
  if (data.optimization_level === 'aggressive') {
    baseTime *= 1.5;
  }

  return Math.ceil(baseTime);
}
