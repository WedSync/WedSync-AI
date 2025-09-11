// WS-186: Portfolio Image Upload API - Team B Round 1
// Multi-file upload with AI processing pipeline

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/validation/middleware';
import { secureStringSchema } from '@/lib/validation/schemas';
import { rateLimit } from '@/lib/security/rate-limiter';
import { imageProcessingQueue } from '@/lib/portfolio/processing-queue';

const portfolioUploadSchema = z.object({
  supplier_id: z.string().uuid(),
  category: z.enum(['ceremony', 'reception', 'portraits', 'details', 'venue']),
  files: z
    .array(
      z.object({
        name: z
          .string()
          .min(1)
          .max(255)
          .transform((val) => val.trim()),
        size: z.number().max(50 * 1024 * 1024), // 50MB limit
        type: z
          .string()
          .refine(
            (type) =>
              ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(
                type,
              ),
            'Invalid file type',
          ),
      }),
    )
    .min(1)
    .max(50), // Max 50 files per batch
  metadata: z
    .object({
      event_name: z
        .string()
        .min(1)
        .max(200)
        .transform((val) => val.trim())
        .optional(),
      event_date: z.string().datetime().optional(),
      venue_name: z
        .string()
        .min(1)
        .max(200)
        .transform((val) => val.trim())
        .optional(),
      couple_names: z
        .string()
        .min(1)
        .max(300)
        .transform((val) => val.trim())
        .optional(),
      description: z
        .string()
        .min(1)
        .max(1000)
        .transform((val) => val.trim())
        .optional(),
      tags: z
        .array(
          z
            .string()
            .min(1)
            .max(50)
            .transform((val) => val.trim()),
        )
        .max(20)
        .optional(),
      enable_ai_processing: z.boolean().default(true),
      watermark_enabled: z.boolean().default(false),
    })
    .optional(),
});

export const POST = withSecureValidation(
  portfolioUploadSchema,
  async (request: NextRequest, validatedData) => {
    try {
      // Initialize Supabase client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      // Get user session for authorization
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Authorization required' },
          { status: 401 },
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

      if (userError || !user) {
        return NextResponse.json(
          { error: 'Invalid authorization' },
          { status: 401 },
        );
      }

      // Rate limiting: 10 upload batches per hour per supplier
      const rateLimitResult = await rateLimit({
        key: `portfolio_upload:${validatedData.supplier_id}`,
        limit: 10,
        window: 3600000, // 1 hour
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            resetTime: rateLimitResult.resetTime,
            limit: rateLimitResult.limit,
          },
          { status: 429 },
        );
      }

      // Verify supplier ownership/access
      const { data: supplierAccess, error: accessError } = await supabase
        .from('user_profiles')
        .select(
          `
          organization_id,
          suppliers!inner(
            id,
            organization_id
          )
        `,
        )
        .eq('user_id', user.id)
        .eq('suppliers.id', validatedData.supplier_id)
        .single();

      if (accessError || !supplierAccess) {
        return NextResponse.json(
          { error: 'Supplier access denied' },
          { status: 403 },
        );
      }

      // Generate upload job ID
      const jobId = crypto.randomUUID();

      // Create upload job record
      const { data: uploadJob, error: jobError } = await supabase
        .from('portfolio_upload_jobs')
        .insert({
          id: jobId,
          supplier_id: validatedData.supplier_id,
          user_id: user.id,
          category: validatedData.category,
          total_files: validatedData.files.length,
          status: 'preparing',
          metadata: validatedData.metadata || {},
        })
        .select()
        .single();

      if (jobError) {
        console.error('Upload job creation error:', jobError);
        return NextResponse.json(
          { error: 'Failed to create upload job' },
          { status: 500 },
        );
      }

      // Generate presigned upload URLs for each file
      const uploadUrls = await Promise.all(
        validatedData.files.map(async (file, index) => {
          const fileName = `${validatedData.supplier_id}/${jobId}/${Date.now()}-${index}-${file.name}`;

          try {
            const { data: urlData, error: urlError } = await supabase.storage
              .from('portfolio-images')
              .createSignedUploadUrl(fileName, {
                upsert: false,
              });

            if (urlError) throw urlError;

            return {
              index,
              fileName,
              uploadUrl: urlData.signedUrl,
              originalName: file.name,
              fileSize: file.size,
              fileType: file.type,
            };
          } catch (error) {
            console.error('Upload URL generation error:', error);
            throw new Error(`Failed to generate upload URL for ${file.name}`);
          }
        }),
      );

      // Update job status to ready
      await supabase
        .from('portfolio_upload_jobs')
        .update({
          status: 'ready',
          upload_urls: uploadUrls.map((url) => ({
            index: url.index,
            fileName: url.fileName,
            originalName: url.originalName,
          })),
        })
        .eq('id', jobId);

      // Log portfolio activity
      await supabase.from('portfolio_activity_logs').insert({
        supplier_id: validatedData.supplier_id,
        user_id: user.id,
        action: 'upload_prepared',
        details: {
          jobId,
          fileCount: validatedData.files.length,
          category: validatedData.category,
        },
      });

      return NextResponse.json({
        success: true,
        jobId,
        uploadUrls: uploadUrls.map((url) => ({
          index: url.index,
          uploadUrl: url.uploadUrl,
          fileName: url.originalName,
        })),
        status: 'ready',
        totalFiles: validatedData.files.length,
        expiresIn: 3600, // URLs expire in 1 hour
      });
    } catch (error) {
      console.error('Portfolio upload API error:', error);
      return NextResponse.json(
        {
          error: 'Upload preparation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  },
);

// GET - Check upload job status and progress
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get user session for authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authorization' },
        { status: 401 },
      );
    }

    // Get upload job with processing status
    const { data: job, error: jobError } = await supabase
      .from('portfolio_upload_jobs')
      .select(
        `
        id,
        supplier_id,
        category,
        status,
        total_files,
        processed_files,
        failed_files,
        created_at,
        updated_at,
        metadata,
        error_message,
        portfolio_images!portfolio_images_upload_job_id_fkey(
          id,
          file_path,
          thumbnail_path,
          processing_status,
          ai_analysis_complete,
          created_at
        )
      `,
      )
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Upload job not found or access denied' },
        { status: 404 },
      );
    }

    // Calculate progress
    const progress =
      job.total_files > 0
        ? Math.round((job.processed_files / job.total_files) * 100)
        : 0;

    // Get processing analytics
    const processingAnalytics = {
      totalFiles: job.total_files,
      processedFiles: job.processed_files,
      failedFiles: job.failed_files,
      pendingFiles: job.total_files - job.processed_files - job.failed_files,
      progress,
      averageProcessingTime: null, // Would calculate from processing logs
      estimatedCompletion: null, // Would estimate based on current progress
    };

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: processingAnalytics,
      category: job.category,
      metadata: job.metadata,
      images:
        job.portfolio_images?.map((img: any) => ({
          id: img.id,
          filePath: img.file_path,
          thumbnailPath: img.thumbnail_path,
          processingStatus: img.processing_status,
          aiAnalysisComplete: img.ai_analysis_complete,
          uploadedAt: img.created_at,
        })) || [],
      error: job.error_message,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    });
  } catch (error) {
    console.error('Upload status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get upload status' },
      { status: 500 },
    );
  }
}
