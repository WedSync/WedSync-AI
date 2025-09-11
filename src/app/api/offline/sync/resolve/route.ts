/**
 * WS-188: Conflict Resolution API
 * Team B - Backend Focus - Manual conflict resolution with user choice processing
 *
 * Handles manual conflict resolution with sophisticated merge strategies
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/validation/middleware';

// Use Supabase MCP for database operations
const supabaseMcp = {
  async executeQuery(query: string, params?: any[]) {
    // This would use the actual Supabase MCP connection
    return { data: [], error: null };
  },

  async callFunction(functionName: string, params: any) {
    // This would use the actual Supabase MCP function calling
    return { data: null, error: null };
  },
};

// Conflict resolution request schema
const ConflictResolutionSchema = z.object({
  conflictId: z.string().uuid(),
  resolution: z.object({
    strategy: z.enum([
      'use_client',
      'use_server',
      'merge_automatic',
      'merge_manual',
      'skip',
    ]),
    mergedData: z.object({}).passthrough().optional(),
    userComment: z.string().max(500).optional(),
    applyToSimilar: z.boolean().optional().default(false),
  }),
  deviceId: z.string().optional(),
  sessionId: z.string().uuid().optional(),
});

const BatchResolutionSchema = z.object({
  resolutions: z.array(ConflictResolutionSchema),
  globalStrategy: z.enum(['use_client', 'use_server', 'individual']).optional(),
  sessionId: z.string().uuid().optional(),
});

/**
 * PUT /api/offline/sync/resolve - Manual conflict resolution with user choice processing
 */
export const PUT = withSecureValidation(
  ConflictResolutionSchema,
  async (request: NextRequest, validatedData) => {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = validatedData.sessionId || crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Validate conflict ownership
      const { data: conflictData } = await supabaseMcp.executeQuery(
        `
        SELECT 
          cr.*,
          sq.operation_type,
          sq.table_name,
          sq.record_id,
          sq.data_payload as client_data,
          sq.priority,
          sq.device_id
        FROM conflict_resolution cr
        JOIN sync_queue sq ON cr.sync_queue_id = sq.id
        WHERE cr.id = $1 AND cr.user_id = $2 AND cr.status = 'pending_manual_resolution'
      `,
        [validatedData.conflictId, userId],
      );

      if (!conflictData || conflictData.length === 0) {
        return NextResponse.json(
          {
            error: 'Conflict not found or already resolved',
            conflictId: validatedData.conflictId,
          },
          { status: 404 },
        );
      }

      const conflict = conflictData[0];

      // Process the resolution
      const resolutionResult = await processConflictResolution(
        userId,
        conflict,
        validatedData.resolution,
        sessionId,
      );

      // Apply similar resolution strategy if requested
      if (validatedData.resolution.applyToSimilar) {
        await applySimilarResolutions(
          userId,
          conflict,
          validatedData.resolution,
          sessionId,
        );
      }

      // Record resolution metrics
      await recordResolutionMetrics(userId, sessionId, {
        conflictId: validatedData.conflictId,
        strategy: validatedData.resolution.strategy,
        processingTime: Date.now() - startTime,
        appliedToSimilar: validatedData.resolution.applyToSimilar || false,
        deviceId: validatedData.deviceId,
      });

      return NextResponse.json({
        success: true,
        conflictId: validatedData.conflictId,
        resolution: {
          strategy: validatedData.resolution.strategy,
          applied: resolutionResult.applied,
          serverId: resolutionResult.serverId,
          mergedData: resolutionResult.mergedData,
          similarConflictsResolved:
            resolutionResult.similarConflictsResolved || 0,
        },
        sessionId,
        processingTime: Date.now() - startTime,
      });
    } catch (error) {
      console.error(`[Conflict Resolution Error] Session ${sessionId}:`, error);
      return NextResponse.json(
        {
          error: 'Failed to resolve conflict',
          conflictId: validatedData.conflictId,
          sessionId,
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  },
);

/**
 * POST /api/offline/sync/resolve - Batch conflict resolution
 */
export const POST = withSecureValidation(
  BatchResolutionSchema,
  async (request: NextRequest, validatedData) => {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = validatedData.sessionId || crypto.randomUUID();
    const startTime = Date.now();

    try {
      const results = [];
      const errors = [];

      // Start batch resolution transaction
      await supabaseMcp.callFunction('begin_batch_conflict_resolution', {
        p_user_id: userId,
        p_session_id: sessionId,
        p_conflict_count: validatedData.resolutions.length,
      });

      for (const resolution of validatedData.resolutions) {
        try {
          // Get conflict data
          const { data: conflictData } = await supabaseMcp.executeQuery(
            `
            SELECT 
              cr.*,
              sq.operation_type,
              sq.table_name,
              sq.record_id,
              sq.data_payload as client_data,
              sq.priority,
              sq.device_id
            FROM conflict_resolution cr
            JOIN sync_queue sq ON cr.sync_queue_id = sq.id
            WHERE cr.id = $1 AND cr.user_id = $2 AND cr.status = 'pending_manual_resolution'
          `,
            [resolution.conflictId, userId],
          );

          if (!conflictData || conflictData.length === 0) {
            errors.push({
              conflictId: resolution.conflictId,
              error: 'Conflict not found or already resolved',
            });
            continue;
          }

          const conflict = conflictData[0];

          // Apply global strategy if specified
          const strategy =
            validatedData.globalStrategy === 'individual'
              ? resolution.resolution.strategy
              : validatedData.globalStrategy || resolution.resolution.strategy;

          const resolutionData = {
            ...resolution.resolution,
            strategy,
          };

          // Process resolution
          const resolutionResult = await processConflictResolution(
            userId,
            conflict,
            resolutionData,
            sessionId,
          );

          results.push({
            conflictId: resolution.conflictId,
            strategy,
            applied: resolutionResult.applied,
            serverId: resolutionResult.serverId,
            mergedData: resolutionResult.mergedData,
          });
        } catch (error) {
          errors.push({
            conflictId: resolution.conflictId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Commit batch resolution transaction
      await supabaseMcp.callFunction('commit_batch_conflict_resolution', {
        p_session_id: sessionId,
        p_resolved_count: results.length,
        p_error_count: errors.length,
      });

      // Record batch resolution metrics
      await recordResolutionMetrics(userId, sessionId, {
        batchSize: validatedData.resolutions.length,
        resolvedCount: results.length,
        errorCount: errors.length,
        processingTime: Date.now() - startTime,
        globalStrategy: validatedData.globalStrategy,
      });

      return NextResponse.json({
        success: true,
        sessionId,
        resolved: results,
        errors,
        summary: {
          totalConflicts: validatedData.resolutions.length,
          resolved: results.length,
          failed: errors.length,
          processingTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      console.error(
        `[Batch Conflict Resolution Error] Session ${sessionId}:`,
        error,
      );

      // Rollback transaction
      await supabaseMcp.callFunction('rollback_batch_conflict_resolution', {
        p_session_id: sessionId,
        p_error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        {
          error: 'Failed to resolve conflicts',
          sessionId,
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  },
);

/**
 * Process individual conflict resolution
 */
async function processConflictResolution(
  userId: string,
  conflict: any,
  resolution: any,
  sessionId: string,
) {
  const result = {
    applied: false,
    serverId: null,
    mergedData: null,
    similarConflictsResolved: 0,
  };

  try {
    switch (resolution.strategy) {
      case 'use_client':
        // Apply client data
        const clientResult = await applySyncChange(userId, {
          action: conflict.operation_type,
          table: conflict.table_name,
          id: conflict.record_id,
          data: conflict.client_data,
        });
        result.applied = true;
        result.serverId = clientResult.serverId;
        break;

      case 'use_server':
        // Keep server data, mark conflict as resolved without applying changes
        result.applied = false;
        result.serverId = conflict.server_record_id;
        break;

      case 'merge_automatic':
        // Perform automatic merge
        const autoMergedData = performAutomaticMerge(
          conflict.client_data,
          conflict.server_data,
          conflict.conflict_fields,
        );
        const autoMergeResult = await applySyncChange(userId, {
          action: conflict.operation_type,
          table: conflict.table_name,
          id: conflict.record_id,
          data: autoMergedData,
        });
        result.applied = true;
        result.serverId = autoMergeResult.serverId;
        result.mergedData = autoMergedData;
        break;

      case 'merge_manual':
        // Apply user-provided merged data
        if (!resolution.mergedData) {
          throw new Error('Manual merge requires merged data');
        }
        const manualMergeResult = await applySyncChange(userId, {
          action: conflict.operation_type,
          table: conflict.table_name,
          id: conflict.record_id,
          data: resolution.mergedData,
        });
        result.applied = true;
        result.serverId = manualMergeResult.serverId;
        result.mergedData = resolution.mergedData;
        break;

      case 'skip':
        // Skip this conflict, remove from queue
        result.applied = false;
        break;

      default:
        throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
    }

    // Mark conflict as resolved
    await supabaseMcp.callFunction('mark_conflict_resolved', {
      p_conflict_id: conflict.id,
      p_resolution_strategy: resolution.strategy,
      p_user_comment: resolution.userComment,
      p_merged_data: result.mergedData,
      p_session_id: sessionId,
    });

    // Remove from sync queue if successfully applied or skipped
    if (result.applied || resolution.strategy === 'skip') {
      await supabaseMcp.executeQuery(
        `
        UPDATE sync_queue 
        SET status = 'completed', completed_at = NOW()
        WHERE id = $1
      `,
        [conflict.sync_queue_id],
      );
    }

    return result;
  } catch (error) {
    console.error('[Conflict Resolution Processing Error]:', error);

    // Mark conflict as failed
    await supabaseMcp.callFunction('mark_conflict_failed', {
      p_conflict_id: conflict.id,
      p_error_message: error instanceof Error ? error.message : 'Unknown error',
      p_session_id: sessionId,
    });

    throw error;
  }
}

/**
 * Apply similar resolution to other conflicts
 */
async function applySimilarResolutions(
  userId: string,
  baseConflict: any,
  resolution: any,
  sessionId: string,
) {
  try {
    // Find similar conflicts (same table, conflict type, and user)
    const { data: similarConflicts } = await supabaseMcp.executeQuery(
      `
      SELECT 
        cr.*,
        sq.operation_type,
        sq.table_name,
        sq.record_id,
        sq.data_payload as client_data
      FROM conflict_resolution cr
      JOIN sync_queue sq ON cr.sync_queue_id = sq.id
      WHERE cr.user_id = $1 
        AND cr.status = 'pending_manual_resolution'
        AND cr.conflict_type = $2
        AND sq.table_name = $3
        AND cr.id != $4
      LIMIT 10
    `,
      [
        userId,
        baseConflict.conflict_type,
        baseConflict.table_name,
        baseConflict.id,
      ],
    );

    let resolvedCount = 0;

    for (const conflict of similarConflicts || []) {
      try {
        await processConflictResolution(
          userId,
          conflict,
          resolution,
          sessionId,
        );
        resolvedCount++;
      } catch (error) {
        console.error(
          `[Similar Conflict Resolution Error] Conflict ${conflict.id}:`,
          error,
        );
        // Continue with other conflicts even if one fails
      }
    }

    return { similarConflictsResolved: resolvedCount };
  } catch (error) {
    console.error('[Apply Similar Resolutions Error]:', error);
    return { similarConflictsResolved: 0 };
  }
}

/**
 * Apply sync change to database
 */
async function applySyncChange(userId: string, change: any) {
  const { action, table, id, data } = change;

  switch (action) {
    case 'create':
      const { data: created } = await supabaseMcp.executeQuery(
        `
        INSERT INTO ${table} (id, user_id, ${Object.keys(data).join(', ')})
        VALUES ($1, $2, ${Object.keys(data)
          .map((_, i) => `$${i + 3}`)
          .join(', ')})
        RETURNING id
      `,
        [id, userId, ...Object.values(data)],
      );

      return { serverId: created?.[0]?.id || id };

    case 'update':
      const setClause = Object.keys(data)
        .map((key, i) => `${key} = $${i + 3}`)
        .join(', ');
      const { data: updated } = await supabaseMcp.executeQuery(
        `
        UPDATE ${table} 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `,
        [id, userId, ...Object.values(data)],
      );

      return { serverId: updated?.[0]?.id || id };

    case 'delete':
      await supabaseMcp.executeQuery(
        `
        DELETE FROM ${table} WHERE id = $1 AND user_id = $2
      `,
        [id, userId],
      );

      return { serverId: id };

    default:
      throw new Error(`Unknown sync action: ${action}`);
  }
}

/**
 * Perform automatic merge of conflict data
 */
function performAutomaticMerge(
  clientData: any,
  serverData: any,
  conflictFields: string[],
) {
  if (typeof clientData !== 'object' || typeof serverData !== 'object') {
    return clientData; // Fallback to client data
  }

  const merged = { ...serverData };

  // Apply field-level merge strategies
  for (const field of conflictFields || []) {
    if (clientData[field] !== undefined) {
      // Simple merge strategies based on field type
      if (
        typeof clientData[field] === 'string' &&
        typeof serverData[field] === 'string'
      ) {
        // For strings, prefer non-empty values
        merged[field] = clientData[field] || serverData[field];
      } else if (
        typeof clientData[field] === 'number' &&
        typeof serverData[field] === 'number'
      ) {
        // For numbers, use the larger value
        merged[field] = Math.max(clientData[field], serverData[field]);
      } else if (
        clientData[field] instanceof Date &&
        serverData[field] instanceof Date
      ) {
        // For dates, use the more recent value
        merged[field] =
          clientData[field] > serverData[field]
            ? clientData[field]
            : serverData[field];
      } else {
        // Default to client data
        merged[field] = clientData[field];
      }
    }
  }

  return merged;
}

/**
 * Record conflict resolution metrics
 */
async function recordResolutionMetrics(
  userId: string,
  sessionId: string,
  metrics: any,
) {
  try {
    await supabaseMcp.executeQuery(
      `
      INSERT INTO conflict_resolution_metrics (
        user_id, session_id, conflict_id, resolution_strategy,
        processing_time_ms, applied_to_similar, batch_size,
        resolved_count, error_count, device_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
      [
        userId,
        sessionId,
        metrics.conflictId || null,
        metrics.strategy || metrics.globalStrategy || null,
        metrics.processingTime,
        metrics.appliedToSimilar || false,
        metrics.batchSize || 1,
        metrics.resolvedCount || 1,
        metrics.errorCount || 0,
        metrics.deviceId || null,
      ],
    );
  } catch (error) {
    console.error('[Resolution Metrics Recording Error]:', error);
  }
}
