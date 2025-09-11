/**
 * PDF Analysis Job Details API Endpoint
 * WS-242: AI PDF Analysis System - Individual Job Management
 *
 * Handles individual job operations: get details, update, delete, process
 * Real-time integration for wedding industry critical operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createPDFAnalysisRepository } from '@/lib/repositories/pdfAnalysisRepository';
import { PDFAnalysisService } from '@/lib/services/pdfAnalysisService';
import { websocketProgressService } from '@/lib/services/websocketProgressService';

// Validation schemas
const jobUpdateSchema = z.object({
  status: z
    .enum(['pending', 'processing', 'completed', 'failed', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  metadata: z.record(z.any()).optional(),
});

const processJobSchema = z.object({
  enableRealTimeUpdates: z.boolean().default(true),
  enableWeddingContext: z.boolean().default(true),
  qualityThreshold: z.number().min(0).max(1).default(0.8),
  maxCost: z.number().min(0).max(2000).default(500), // £20 max
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

/**
 * GET /api/pdf-analysis/jobs/[id]
 * Get detailed job information with extracted fields and progress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const jobId = params.id;

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid job ID', code: 'INVALID_JOB_ID' },
        { status: 400 },
      );
    }

    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const repository = createPDFAnalysisRepository();

    // Get job with all details
    const jobDetails = await repository.getJobWithDetails(jobId);

    if (!jobDetails) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Verify user has access to this job's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', jobDetails.organization_id)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Get latest progress update
    const latestProgress = await repository.getLatestProgress(jobId);

    // Get progress history if job is still processing
    const progressHistory =
      jobDetails.status === 'processing'
        ? await repository.getProgressHistory(jobId)
        : [];

    // Calculate analytics
    const analytics = {
      fieldsExtracted: jobDetails.extracted_fields?.length || 0,
      averageConfidence:
        jobDetails.extracted_fields?.length > 0
          ? jobDetails.extracted_fields.reduce(
              (sum, field) => sum + (field.confidence || 0),
              0,
            ) / jobDetails.extracted_fields.length
          : 0,
      totalCost:
        jobDetails.cost_tracking?.reduce(
          (sum, cost) => sum + (cost.total_cost || 0),
          0,
        ) || 0,
      processingTime:
        jobDetails.completed_at && jobDetails.created_at
          ? new Date(jobDetails.completed_at).getTime() -
            new Date(jobDetails.created_at).getTime()
          : null,
      qualityScore: jobDetails.quality_metrics?.[0]?.accuracy_score || null,
    };

    const response = {
      success: true,
      data: {
        job: {
          id: jobDetails.id,
          fileName: jobDetails.file_name,
          fileUrl: jobDetails.file_url,
          fileSize: jobDetails.file_size,
          mimeType: jobDetails.mime_type,
          status: jobDetails.status,
          extractionType: jobDetails.extraction_type,
          priority: jobDetails.priority,
          createdAt: jobDetails.created_at,
          updatedAt: jobDetails.updated_at,
          completedAt: jobDetails.completed_at,
          failedAt: jobDetails.failed_at,
          metadata: jobDetails.metadata || {},
          organizationId: jobDetails.organization_id,
          userId: jobDetails.user_id,
        },
        progress: {
          current: latestProgress,
          history: progressHistory,
        },
        fields: {
          extracted: jobDetails.extracted_fields || [],
          count: jobDetails.extracted_fields?.length || 0,
          byType:
            jobDetails.extracted_fields?.reduce(
              (acc, field) => {
                acc[field.field_type] = (acc[field.field_type] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            ) || {},
          byConfidence: {
            high:
              jobDetails.extracted_fields?.filter(
                (f) => (f.confidence || 0) >= 0.8,
              ).length || 0,
            medium:
              jobDetails.extracted_fields?.filter(
                (f) => (f.confidence || 0) >= 0.6 && (f.confidence || 0) < 0.8,
              ).length || 0,
            low:
              jobDetails.extracted_fields?.filter(
                (f) => (f.confidence || 0) < 0.6,
              ).length || 0,
          },
        },
        costs: {
          history: jobDetails.cost_tracking || [],
          total: analytics.totalCost,
          breakdown:
            jobDetails.cost_tracking?.reduce(
              (acc, cost) => {
                acc[cost.provider] =
                  (acc[cost.provider] || 0) + (cost.total_cost || 0);
                return acc;
              },
              {} as Record<string, number>,
            ) || {},
        },
        quality: {
          metrics: jobDetails.quality_metrics || [],
          latest: jobDetails.quality_metrics?.[0] || null,
        },
        analytics,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control':
          jobDetails.status === 'processing'
            ? 'private, no-cache'
            : 'private, max-age=300',
        'X-Job-Status': jobDetails.status,
      },
    });
  } catch (error) {
    console.error('Job details API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch job details',
        code: 'FETCH_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/pdf-analysis/jobs/[id]
 * Update job status, priority, or metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const jobId = params.id;

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid job ID', code: 'INVALID_JOB_ID' },
        { status: 400 },
      );
    }

    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = jobUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const updates = validationResult.data;

    const repository = createPDFAnalysisRepository();

    // Get current job to verify access
    const currentJob = await repository.getJobWithDetails(jobId);
    if (!currentJob) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Verify user has access
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', currentJob.organization_id)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Prevent certain status transitions
    if (updates.status) {
      const invalidTransitions = {
        completed: ['processing', 'pending'],
        failed: ['processing', 'pending', 'completed'],
        cancelled: ['completed', 'failed'],
      };

      const currentStatus = currentJob.status;
      const newStatus = updates.status;

      if (invalidTransitions[currentStatus]?.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Cannot change status from ${currentStatus} to ${newStatus}`,
            code: 'INVALID_STATUS_TRANSITION',
          },
          { status: 400 },
        );
      }
    }

    // Update job
    const updatedJob = await repository.updateJobStatus(
      jobId,
      updates.status || currentJob.status,
      {
        ...currentJob.metadata,
        ...updates.metadata,
        updatedBy: user.id,
        updatedAt: new Date().toISOString(),
      },
    );

    // Update priority if provided
    if (updates.priority && updates.priority !== currentJob.priority) {
      await repository.updateJobPriority(jobId, updates.priority);
    }

    // Send real-time update if status changed
    if (updates.status && updates.status !== currentJob.status) {
      await websocketProgressService.sendProgressUpdate({
        jobId,
        stage: updates.status === 'cancelled' ? 'CANCELLED' : 'STATUS_UPDATE',
        percentage: updates.status === 'completed' ? 100 : 0,
        message: `Job status changed to ${updates.status}`,
        timestamp: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        job: updatedJob,
        changes: updates,
      },
      message: 'Job updated successfully',
    });
  } catch (error) {
    console.error('Job update API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update job',
        code: 'UPDATE_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/pdf-analysis/jobs/[id]
 * Delete a job and all associated data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const jobId = params.id;

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid job ID', code: 'INVALID_JOB_ID' },
        { status: 400 },
      );
    }

    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const repository = createPDFAnalysisRepository();

    // Get job to verify access and get file path
    const job = await repository.getJobWithDetails(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Verify user has access and proper role
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', job.organization_id)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Only allow deletion if user is admin or owner, or job is failed/cancelled
    const allowedRoles = ['owner', 'admin'];
    const allowedStatuses = ['failed', 'cancelled'];

    if (
      !allowedRoles.includes(orgMember.role) &&
      !allowedStatuses.includes(job.status)
    ) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions to delete this job',
          code: 'INSUFFICIENT_PERMISSIONS',
        },
        { status: 403 },
      );
    }

    // Prevent deletion of processing jobs
    if (job.status === 'processing') {
      return NextResponse.json(
        {
          error: 'Cannot delete job that is currently processing',
          code: 'JOB_PROCESSING',
        },
        { status: 400 },
      );
    }

    // Delete file from storage
    if (job.file_url) {
      const filePath = job.file_url.split('/').slice(-2).join('/'); // organization_id/filename
      await supabase.storage.from('pdf-analysis').remove([filePath]);
    }

    // Delete job (cascading will handle related data)
    const deleted = await repository.deleteJob(jobId);

    return NextResponse.json({
      success: true,
      data: {
        deletedJob: {
          id: job.id,
          fileName: job.file_name,
          status: job.status,
        },
      },
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Job deletion API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete job',
        code: 'DELETE_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/pdf-analysis/jobs/[id]/process
 * Trigger or re-trigger job processing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const jobId = params.id;

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid job ID', code: 'INVALID_JOB_ID' },
        { status: 400 },
      );
    }

    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = processJobSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid process options',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const options = validationResult.data;

    const repository = createPDFAnalysisRepository();

    // Get job to verify access
    const job = await repository.getJobWithDetails(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Verify user has access
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', job.organization_id)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Check if job can be processed
    const processableStatuses = ['pending', 'failed', 'cancelled'];
    if (!processableStatuses.includes(job.status)) {
      return NextResponse.json(
        {
          error: `Cannot process job with status: ${job.status}`,
          code: 'INVALID_JOB_STATUS',
        },
        { status: 400 },
      );
    }

    // Update priority if provided
    if (options.priority) {
      await repository.updateJobPriority(jobId, options.priority);
    }

    // Initialize PDF processing service
    const pdfService = new PDFAnalysisService();

    // Start processing asynchronously
    pdfService
      .processJob(jobId, {
        enableRealTimeUpdates: options.enableRealTimeUpdates,
        enableWeddingContext: options.enableWeddingContext,
        qualityThreshold: options.qualityThreshold,
        maxCost: options.maxCost,
      })
      .catch((error) => {
        console.error(`Processing failed for job ${jobId}:`, error);
        // Update job status to failed
        repository.updateJobStatus(jobId, 'failed', {
          error: error.message,
          retriedAt: new Date().toISOString(),
          failedAt: new Date().toISOString(),
        });
      });

    // Update job status to processing
    const updatedJob = await repository.updateJobStatus(jobId, 'processing', {
      processStartedAt: new Date().toISOString(),
      retriggeredBy: user.id,
      retriggerOptions: options,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          job: updatedJob,
          options,
        },
        message: 'Job processing started',
      },
      { status: 202 },
    );
  } catch (error) {
    console.error('Job processing API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to start job processing',
        code: 'PROCESS_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}
