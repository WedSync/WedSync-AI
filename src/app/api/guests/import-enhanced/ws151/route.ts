/**
 * WS-151 Guest List Builder API - Team C Implementation
 * Integration with Team C infrastructure for secure file upload and processing
 *
 * Features:
 * - Secure file validation and upload (up to 10MB)
 * - Background processing with job queues
 * - Real-time progress tracking
 * - Comprehensive error reporting
 * - Rollback mechanisms
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { guestImportService } from '@/lib/upload/guest-import';
import { guestImportProcessor } from '@/lib/services/guest-import-processor';

const fileUploadSchema = z.object({
  clientId: z.string().uuid(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  validationRules: z
    .object({
      requireEmail: z.boolean().default(false),
      requirePhone: z.boolean().default(false),
      requireName: z.boolean().default(true),
      allowDuplicates: z.boolean().default(false),
      validateAddresses: z.boolean().default(true),
      normalizePhones: z.boolean().default(true),
      strictMode: z.boolean().default(false),
    })
    .optional(),
  transformationRules: z
    .object({
      normalizeNames: z.boolean().default(true),
      formatPhones: z.boolean().default(true),
      standardizeDietary: z.boolean().default(true),
      assignDefaultTable: z.string().nullable().default(null),
      autoAssignTables: z.boolean().default(false),
      setDefaultRsvpStatus: z
        .enum(['pending', 'attending', 'not_attending', 'tentative'])
        .default('pending'),
    })
    .optional(),
});

const importProgressSchema = z.object({
  importId: z.string(),
});

const rollbackSchema = z.object({
  importId: z.string(),
  reason: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('high'),
});

// POST /api/guests/import-enhanced/ws151 - Upload and queue guest list for processing
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadataStr = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!metadataStr) {
      return NextResponse.json(
        { error: 'Metadata is required' },
        { status: 400 },
      );
    }

    // Validate metadata
    const metadata = fileUploadSchema.parse(JSON.parse(metadataStr));

    // Verify user has access to client
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 },
      );
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('id', metadata.clientId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 },
      );
    }

    // Step 1: Validate file upload
    const validation = await guestImportService.validateFileUpload(
      file,
      metadata.clientId,
    );

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'File validation failed',
          errors: validation.errors,
        },
        { status: 400 },
      );
    }

    const importId = validation.importId!;

    // Step 2: Upload file to storage
    const uploadResult = await guestImportService.uploadFile(file, importId);

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'File upload failed',
          details: uploadResult.error,
          importId,
        },
        { status: 500 },
      );
    }

    // Step 3: Queue for background processing
    const jobResult = await guestImportProcessor.queueImportJob(
      importId,
      metadata.clientId,
      {
        priority: metadata.priority,
        validationRules: metadata.validationRules,
        transformationRules: metadata.transformationRules,
      },
    );

    if (!jobResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to queue import job',
          details: jobResult.error,
          importId,
        },
        { status: 500 },
      );
    }

    // Return success response with tracking information
    return NextResponse.json({
      success: true,
      import: {
        id: importId,
        jobId: jobResult.jobId,
        fileName: file.name,
        fileSize: file.size,
        clientId: metadata.clientId,
        clientName: `${client.first_name} ${client.last_name}`,
        status: 'uploaded',
        queuePosition: 'Processing will begin shortly',
      },
      tracking: {
        progressUrl: `/api/guests/import-enhanced/ws151?importId=${importId}`,
        statusUpdates: 'Real-time progress available',
        estimatedTime: `${Math.ceil(file.size / 1024 / 1024)} minutes`,
      },
    });
  } catch (error) {
    console.error('Error in WS-151 import upload:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// GET /api/guests/import-enhanced/ws151 - Get import progress
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const importId = searchParams.get('importId');

    if (!importId) {
      return NextResponse.json(
        { error: 'importId parameter required' },
        { status: 400 },
      );
    }

    // Verify user has access to this import
    const { data: importRecord } = await supabase
      .from('guest_imports')
      .select(
        `
        *,
        client:clients(
          id,
          first_name,
          last_name,
          organization_id
        )
      `,
      )
      .eq('id', importId)
      .single();

    if (!importRecord) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 });
    }

    // Check user has access to this client's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (importRecord.client.organization_id !== profile?.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get detailed progress from service
    const progress = await guestImportService.getImportProgress(importId);

    if (!progress) {
      return NextResponse.json(
        {
          error: 'Import progress not found',
          importId,
        },
        { status: 404 },
      );
    }

    // Get job status if available
    const jobs = await guestImportProcessor.getImportJobs(
      importRecord.client_id,
    );
    const relatedJob = jobs.find((job) => job.importId === importId);

    return NextResponse.json({
      success: true,
      import: {
        id: importId,
        fileName: importRecord.file_name,
        fileSize: importRecord.file_size,
        clientName: `${importRecord.client.first_name} ${importRecord.client.last_name}`,
        status: progress.status,
        progress: progress.progress,
        currentStep: progress.currentStep,
        statistics: {
          totalRows: progress.totalRows,
          processedRows: progress.processedRows,
          validRows: progress.validRows,
          errorRows: progress.errorRows,
        },
        timing: {
          startedAt: progress.startedAt,
          completedAt: progress.completedAt,
          estimatedCompletion:
            progress.startedAt && progress.progress > 0
              ? new Date(
                  progress.startedAt.getTime() +
                    (Date.now() - progress.startedAt.getTime()) *
                      (100 / progress.progress),
                )
              : null,
        },
        errors: progress.errors,
        warnings: progress.warnings,
      },
      job: relatedJob
        ? {
            id: relatedJob.id,
            status: relatedJob.status,
            retryCount: relatedJob.retryCount,
            priority: relatedJob.priority,
          }
        : null,
      actions: {
        canCancel:
          progress.status === 'processing' || progress.status === 'queued',
        canRollback: progress.status === 'completed' && progress.validRows > 0,
        canRetry: progress.status === 'failed',
      },
    });
  } catch (error) {
    console.error('Error getting import progress:', error);
    return NextResponse.json(
      {
        error: 'Failed to get import progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/guests/import-enhanced/ws151 - Rollback import
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { importId, reason, priority } = rollbackSchema.parse(body);

    // Verify user has access to this import
    const { data: importRecord } = await supabase
      .from('guest_imports')
      .select(
        `
        *,
        client:clients(
          id,
          organization_id
        )
      `,
      )
      .eq('id', importId)
      .single();

    if (!importRecord) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 });
    }

    // Check user has access
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (importRecord.client.organization_id !== profile?.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Queue rollback job
    const rollbackResult = await guestImportProcessor.queueRollbackJob(
      importId,
      reason,
      priority,
    );

    if (!rollbackResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to queue rollback',
          details: rollbackResult.error,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      rollback: {
        jobId: rollbackResult.jobId,
        importId,
        reason,
        priority,
        status: 'queued',
        message:
          'Rollback queued for processing. All imported guests will be removed.',
      },
    });
  } catch (error) {
    console.error('Error processing rollback request:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// PATCH /api/guests/import-enhanced/ws151 - Cancel import job
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, jobId } = z
      .object({
        action: z.enum(['cancel']),
        jobId: z.string(),
      })
      .parse(body);

    // Get job and verify access
    const job = await guestImportProcessor.getJobStatus(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify user access through client organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    const { data: client } = await supabase
      .from('clients')
      .select('organization_id')
      .eq('id', job.clientId)
      .single();

    if (client?.organization_id !== profile?.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (action === 'cancel') {
      const cancelResult = await guestImportProcessor.cancelJob(jobId);

      if (!cancelResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to cancel job',
            details: cancelResult.error,
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Job cancelled successfully',
        job: {
          id: jobId,
          status: 'cancelled',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing job action:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
