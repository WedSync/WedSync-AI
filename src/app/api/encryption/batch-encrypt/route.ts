/**
 * WS-148 Round 2: Batch Encryption API Endpoint
 *
 * POST /api/encryption/batch-encrypt
 *
 * Performance Requirement: Process 500+ photos in under 30 seconds
 * Security Level: P0 - CRITICAL
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  advancedEncryptionMiddleware,
  BatchEncryptionOperation,
  BatchResult,
} from '@/lib/security/advanced-encryption-middleware';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Request validation schema
const BatchEncryptRequestSchema = z.object({
  operations: z
    .array(
      z.object({
        id: z.string(),
        plaintext: z.string().min(1),
        fieldType: z.string(),
        priority: z
          .enum(['high', 'normal', 'low'])
          .optional()
          .default('normal'),
      }),
    )
    .min(1)
    .max(1000), // Support up to 1000 items per batch
  priority: z.enum(['high', 'normal', 'low']).optional().default('normal'),
  callback_url: z.string().url().optional(),
});

type BatchEncryptRequest = z.infer<typeof BatchEncryptRequestSchema>;

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  const supabase = createClientComponentClient();

  try {
    // Authenticate user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = BatchEncryptRequestSchema.parse(body);

    // Get user key (organization ID for tenant isolation)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 },
      );
    }

    const userKey = profile.organization_id;

    // Convert request to batch operations
    const batchOperations: BatchEncryptionOperation[] =
      validatedRequest.operations.map((op) => ({
        id: op.id,
        plaintext: op.plaintext,
        userKey,
        fieldType: op.fieldType,
        startTime: performance.now(),
      }));

    // Track batch operation in database
    const { data: batchRecord } = await supabase
      .from('encryption.batch_operations')
      .insert({
        user_id: session.user.id,
        operation_type: 'batch_encryption',
        total_items: batchOperations.length,
        status: 'processing',
      })
      .select('batch_id')
      .single();

    // Set up progress callback for UI updates
    let progressUpdates = 0;
    advancedEncryptionMiddleware.onBatchProgress = async (progress) => {
      progressUpdates++;

      // Update database every 10 progress updates or at completion
      if (progressUpdates % 10 === 0 || progress.completed === progress.total) {
        await supabase
          .from('encryption.batch_operations')
          .update({
            completed_items: progress.completed,
            failed_items:
              progress.total - progress.completed * progress.successRate,
          })
          .eq('batch_id', batchRecord?.batch_id);
      }

      // Send callback if provided (for async processing)
      if (
        validatedRequest.callback_url &&
        progress.completed === progress.total
      ) {
        try {
          await fetch(validatedRequest.callback_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              batch_id: batchRecord?.batch_id,
              status:
                progress.successRate === 1.0 ? 'completed' : 'partial_failure',
              completed: progress.completed,
              total: progress.total,
              success_rate: progress.successRate,
            }),
          });
        } catch (callbackError) {
          console.error('Callback failed:', callbackError);
        }
      }
    };

    // Process batch encryption
    const results: BatchResult[] =
      await advancedEncryptionMiddleware.processBatchEncryption(
        batchOperations,
      );

    const totalTime = performance.now() - startTime;
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;
    const successRate = successCount / results.length;

    // Update final batch status
    await supabase
      .from('encryption.batch_operations')
      .update({
        completed_items: successCount,
        failed_items: failureCount,
        status:
          successRate === 1.0
            ? 'completed'
            : successRate > 0
              ? 'partial_failure'
              : 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('batch_id', batchRecord?.batch_id);

    // Record performance metrics
    await supabase.from('encryption.performance_metrics_v2').insert({
      operation_type: 'batch_encryption',
      user_id: session.user.id,
      field_count: batchOperations.length,
      processing_time_ms: Math.round(totalTime),
      success_rate: successRate,
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    });

    // WS-148 Performance Validation
    const performanceValidation = {
      meets_bulk_requirement:
        batchOperations.length >= 500 ? totalTime < 30000 : true,
      actual_time_ms: Math.round(totalTime),
      target_time_ms: batchOperations.length >= 500 ? 30000 : 'N/A',
      items_processed: batchOperations.length,
      throughput_items_per_second: Math.round(
        batchOperations.length / (totalTime / 1000),
      ),
    };

    // Log performance warning if targets not met
    if (batchOperations.length >= 500 && totalTime > 30000) {
      console.warn(
        `WS-148 Performance Target Violation: Batch encryption of ${batchOperations.length} items took ${totalTime}ms (target: <30000ms)`,
      );
    }

    return NextResponse.json({
      success: true,
      batch_id: batchRecord?.batch_id,
      results,
      performance: performanceValidation,
      summary: {
        total_items: batchOperations.length,
        successful: successCount,
        failed: failureCount,
        success_rate: Math.round(successRate * 100),
        processing_time_ms: Math.round(totalTime),
      },
    });
  } catch (error) {
    console.error('Batch encryption failed:', error);

    // Record failure metrics
    const totalTime = performance.now() - startTime;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('encryption.performance_metrics_v2').insert({
          operation_type: 'batch_encryption',
          user_id: session.user.id,
          processing_time_ms: Math.round(totalTime),
          success_rate: 0,
          error_details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : null,
          },
        });
      }
    } catch (metricsError) {
      console.error('Failed to record error metrics:', metricsError);
    }

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
        error: 'Batch encryption failed',
        message:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : 'Internal server error',
      },
      { status: 500 },
    );
  }
}

// GET /api/encryption/batch-encrypt - Get batch status
export async function GET(request: NextRequest) {
  const supabase = createClientComponentClient();

  try {
    // Authenticate user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get batch ID from query params
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');

    if (!batchId) {
      return NextResponse.json(
        { error: 'batch_id parameter required' },
        { status: 400 },
      );
    }

    // Fetch batch operation status
    const { data: batchOperation, error } = await supabase
      .from('encryption.batch_operations')
      .select('*')
      .eq('batch_id', batchId)
      .eq('user_id', session.user.id)
      .single();

    if (error || !batchOperation) {
      return NextResponse.json(
        { error: 'Batch operation not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      batch_id: batchOperation.batch_id,
      status: batchOperation.status,
      operation_type: batchOperation.operation_type,
      total_items: batchOperation.total_items,
      completed_items: batchOperation.completed_items,
      failed_items: batchOperation.failed_items,
      success_rate:
        batchOperation.total_items > 0
          ? batchOperation.completed_items / batchOperation.total_items
          : 0,
      started_at: batchOperation.started_at,
      completed_at: batchOperation.completed_at,
      error_summary: batchOperation.error_summary,
    });
  } catch (error) {
    console.error('Batch status retrieval failed:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve batch status' },
      { status: 500 },
    );
  }
}
