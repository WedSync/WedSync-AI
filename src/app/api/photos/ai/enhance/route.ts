/**
 * WS-127: AI Photo Enhancement API Endpoint
 * Enhances photos using AI-powered algorithms
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { photoAIService } from '@/lib/ml/photo-ai-service';
import { photoEnhancementEngine } from '@/lib/ml/photo-enhancement-engine';
import { photoService } from '@/lib/services/photoService';
import { z } from 'zod';

const enhanceSchema = z.object({
  photo_id: z.string(),
  enhancement_options: z
    .object({
      enhancement_type: z
        .enum([
          'auto',
          'portrait',
          'landscape',
          'detail',
          'low_light',
          'artistic',
        ])
        .default('auto'),
      quality_target: z.enum(['web', 'print', 'professional']).default('web'),
      preserve_original: z.boolean().default(true),
      apply_watermark: z.boolean().default(false),
      batch_processing: z.boolean().default(false),
    })
    .optional(),
  custom_settings: z
    .object({
      brightness_adjustment: z.number().min(-100).max(100).default(0),
      contrast: z.number().min(-100).max(100).default(0),
      saturation: z.number().min(-100).max(100).default(0),
      sharpening_amount: z.number().min(0).max(150).default(0),
      noise_reduction: z.number().min(0).max(100).default(0),
    })
    .optional(),
});

const batchEnhanceSchema = z.object({
  photo_ids: z.array(z.string()).max(5), // Limit batch size for performance
  enhancement_options: z.object({
    enhancement_type: z
      .enum([
        'auto',
        'portrait',
        'landscape',
        'detail',
        'low_light',
        'artistic',
      ])
      .default('auto'),
    quality_target: z.enum(['web', 'print', 'professional']).default('web'),
    preserve_original: z.boolean().default(true),
    apply_watermark: z.boolean().default(false),
    batch_processing: z.boolean().default(true),
  }),
  uniform_settings: z.boolean().default(true), // Apply same settings to all photos
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const isBatch = Array.isArray(body.photo_ids);

    if (isBatch) {
      // Batch enhancement
      const { photo_ids, enhancement_options, uniform_settings } =
        batchEnhanceSchema.parse(body);

      // Check if photos exist and user has access
      const { data: photos, error: photoError } = await supabase
        .from('photos')
        .select('id, uploaded_by, organization_id, file_path')
        .in('id', photo_ids);

      if (photoError) {
        return NextResponse.json(
          { error: 'Failed to fetch photos' },
          { status: 500 },
        );
      }

      if (photos.length !== photo_ids.length) {
        return NextResponse.json(
          { error: 'Some photos not found' },
          { status: 404 },
        );
      }

      // Check permissions
      const hasAccess = photos.every(
        (photo) => photo.uploaded_by === user.id || photo.organization_id,
      );

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to some photos' },
          { status: 403 },
        );
      }

      // Process batch enhancement
      const enhancementResults = [];
      const processingErrors = [];

      for (const photo of photos) {
        try {
          const enhancedPhoto = await photoAIService.enhancePhoto(
            photo.id,
            enhancement_options,
          );

          enhancementResults.push({
            photo_id: photo.id,
            original_photo_id: enhancedPhoto.original_photo_id,
            enhanced_file_path: enhancedPhoto.enhanced_file_path,
            quality_improvement: enhancedPhoto.quality_improvement,
            file_size_change: enhancedPhoto.file_size_change,
            processing_time_ms: enhancedPhoto.processing_time_ms,
            enhancement_applied: enhancedPhoto.enhancement_applied.length,
          });

          // Store enhancement record
          await supabase.from('photo_enhancements').insert({
            id: crypto.randomUUID(),
            original_photo_id: photo.id,
            enhanced_file_path: enhancedPhoto.enhanced_file_path,
            enhancement_settings: enhancement_options,
            quality_improvement: enhancedPhoto.quality_improvement,
            processing_time_ms: enhancedPhoto.processing_time_ms,
            created_by: user.id,
          });
        } catch (error) {
          console.error(`Enhancement failed for photo ${photo.id}:`, error);
          processingErrors.push({
            photo_id: photo.id,
            error: error.message,
          });
        }
      }

      return NextResponse.json({
        success: true,
        batch_results: {
          successful: enhancementResults.length,
          failed: processingErrors.length,
          total_processing_time_ms: enhancementResults.reduce(
            (sum, r) => sum + r.processing_time_ms,
            0,
          ),
        },
        enhanced_photos: enhancementResults,
        errors: processingErrors,
      });
    } else {
      // Single photo enhancement
      const { photo_id, enhancement_options, custom_settings } =
        enhanceSchema.parse(body);

      // Check if photo exists and user has access
      const { data: photo, error: photoError } = await supabase
        .from('photos')
        .select('id, uploaded_by, organization_id, file_path, filename')
        .eq('id', photo_id)
        .single();

      if (photoError || !photo) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      }

      // Check permissions
      if (photo.uploaded_by !== user.id && !photo.organization_id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Check if enhancement already exists
      const { data: existingEnhancement } = await supabase
        .from('photo_enhancements')
        .select('*')
        .eq('original_photo_id', photo_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // If using custom settings or no existing enhancement, process the photo
      let enhancementResult;

      if (custom_settings) {
        // Use advanced enhancement engine with custom settings
        const photoBlob = await photoService.downloadPhoto(
          photo_id,
          'original',
        );

        const advancedSettings = {
          brightness_adjustment: custom_settings.brightness_adjustment,
          exposure_compensation: 0,
          highlights: 0,
          shadows: 0,
          saturation: custom_settings.saturation,
          vibrance: 0,
          temperature: 6500,
          tint: 0,
          contrast: custom_settings.contrast,
          clarity: 0,
          dehaze: 0,
          sharpening_amount: custom_settings.sharpening_amount,
          sharpening_radius: 1.0,
          noise_reduction: custom_settings.noise_reduction,
          color_noise_reduction: 0,
          lens_correction: false,
          chromatic_aberration_fix: false,
          vignette_removal: false,
          perspective_correction: false,
        };

        const processingResult =
          await photoEnhancementEngine.applyAdvancedEnhancements(
            photoBlob,
            advancedSettings,
          );

        // Upload enhanced photo
        const timestamp = Date.now();
        const enhancedPath = `photos/enhanced/${photo_id}_custom_${timestamp}.jpg`;

        await supabase.storage
          .from('photos')
          .upload(enhancedPath, processingResult.processed_blob);

        enhancementResult = {
          original_photo_id: photo_id,
          enhanced_file_path: enhancedPath,
          quality_improvement: processingResult.quality_improvement,
          file_size_change: processingResult.metadata.compression_ratio,
          processing_time_ms: processingResult.processing_time_ms,
          enhancement_applied: processingResult.operations_applied.map(
            (op) => ({
              type: op.operation,
              description: `Applied ${op.operation} with improvement score ${op.improvement_score}`,
              estimated_improvement: op.improvement_score,
              processing_time_estimate: op.processing_time,
            }),
          ),
        };
      } else {
        // Use AI-guided enhancement
        const defaultOptions = {
          enhancement_type: 'auto',
          quality_target: 'web',
          preserve_original: true,
          apply_watermark: false,
          batch_processing: false,
          ...enhancement_options,
        };

        enhancementResult = await photoAIService.enhancePhoto(
          photo_id,
          defaultOptions,
        );
      }

      // Store enhancement record
      const enhancementRecord = {
        id: crypto.randomUUID(),
        original_photo_id: photo_id,
        enhanced_file_path: enhancementResult.enhanced_file_path,
        enhancement_settings: custom_settings || enhancement_options || {},
        quality_improvement: enhancementResult.quality_improvement,
        processing_time_ms: enhancementResult.processing_time_ms,
        created_by: user.id,
      };

      const { error: insertError } = await supabase
        .from('photo_enhancements')
        .insert(enhancementRecord);

      if (insertError) {
        console.error('Failed to store enhancement record:', insertError);
        // Continue anyway - enhancement is still returned
      }

      // Get public URL for enhanced photo
      const {
        data: { publicUrl },
      } = supabase.storage
        .from('photos')
        .getPublicUrl(enhancementResult.enhanced_file_path);

      return NextResponse.json({
        success: true,
        enhancement: {
          id: enhancementRecord.id,
          original_photo_id: photo_id,
          enhanced_url: publicUrl,
          enhanced_file_path: enhancementResult.enhanced_file_path,
          quality_improvement: enhancementResult.quality_improvement,
          file_size_change: enhancementResult.file_size_change,
          processing_time_ms: enhancementResult.processing_time_ms,
          enhancements_applied: enhancementResult.enhancement_applied,
          created_at: new Date().toISOString(),
        },
        original_photo: {
          id: photo.id,
          filename: photo.filename,
        },
      });
    }
  } catch (error) {
    console.error('Photo enhancement error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Photo enhancement failed', message: error.message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photo_id');

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 },
      );
    }

    // Check if photo exists and user has access
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, uploaded_by, organization_id, filename')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Check permissions
    if (photo.uploaded_by !== user.id && !photo.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get enhancement history for this photo
    const { data: enhancements, error: enhancementError } = await supabase
      .from('photo_enhancements')
      .select('*')
      .eq('original_photo_id', photoId)
      .order('created_at', { ascending: false });

    if (enhancementError) {
      return NextResponse.json(
        { error: 'Failed to fetch enhancements' },
        { status: 500 },
      );
    }

    const formattedEnhancements = await Promise.all(
      enhancements.map(async (enhancement) => {
        // Get public URL for enhanced photo
        const {
          data: { publicUrl },
        } = supabase.storage
          .from('photos')
          .getPublicUrl(enhancement.enhanced_file_path);

        return {
          id: enhancement.id,
          enhanced_url: publicUrl,
          enhanced_file_path: enhancement.enhanced_file_path,
          enhancement_settings: enhancement.enhancement_settings,
          quality_improvement: enhancement.quality_improvement,
          processing_time_ms: enhancement.processing_time_ms,
          created_at: enhancement.created_at,
          created_by: enhancement.created_by,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      photo_id: photoId,
      original_filename: photo.filename,
      enhancements: formattedEnhancements,
      total_enhancements: enhancements.length,
    });
  } catch (error) {
    console.error('Fetch enhancement error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enhancements' },
      { status: 500 },
    );
  }
}
