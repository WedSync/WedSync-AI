import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Batch operation schemas
const BatchOperationSchema = z.object({
  couple_id: z.string().uuid(),
  operation_type: z.enum([
    'bulk_create',
    'bulk_update',
    'bulk_delete',
    'bulk_assign_guests',
    'bulk_reorder',
    'bulk_schedule',
    'bulk_export',
    'bulk_import',
  ]),
  items: z.array(z.record(z.any())),
  options: z
    .object({
      validate_conflicts: z.boolean().default(true),
      auto_resolve_conflicts: z.boolean().default(false),
      update_mode: z.enum(['replace', 'merge', 'append']).default('merge'),
      batch_size: z.number().min(1).max(100).default(10),
      parallel_processing: z.boolean().default(true),
      rollback_on_error: z.boolean().default(true),
    })
    .optional(),
});

const BatchProgressSchema = z.object({
  operation_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(100),
  processed_count: z.number().min(0),
  total_count: z.number().min(0),
  errors: z.array(
    z.object({
      item_index: z.number(),
      error_code: z.string(),
      error_message: z.string(),
    }),
  ),
  results: z.array(z.record(z.any())).optional(),
});

// Batch operation processor class
class BatchOperationProcessor {
  private supabase: any;
  private operationId: string;
  private coupleId: string;
  private operationType: string;
  private items: any[];
  private options: any;
  private userId: string;

  constructor(
    supabase: any,
    operationId: string,
    coupleId: string,
    operationType: string,
    items: any[],
    options: any,
    userId: string,
  ) {
    this.supabase = supabase;
    this.operationId = operationId;
    this.coupleId = coupleId;
    this.operationType = operationType;
    this.items = items;
    this.options = options || {};
    this.userId = userId;
  }

  async process(): Promise<any> {
    try {
      await this.updateProgress('processing', 0, 0, []);

      switch (this.operationType) {
        case 'bulk_create':
          return await this.processBulkCreate();
        case 'bulk_update':
          return await this.processBulkUpdate();
        case 'bulk_delete':
          return await this.processBulkDelete();
        case 'bulk_assign_guests':
          return await this.processBulkAssignGuests();
        case 'bulk_reorder':
          return await this.processBulkReorder();
        case 'bulk_schedule':
          return await this.processBulkSchedule();
        case 'bulk_export':
          return await this.processBulkExport();
        case 'bulk_import':
          return await this.processBulkImport();
        default:
          throw new Error(`Unsupported operation type: ${this.operationType}`);
      }
    } catch (error) {
      await this.updateProgress(
        'failed',
        0,
        this.items.length,
        [],
        error.message,
      );
      throw error;
    }
  }

  private async processBulkCreate(): Promise<any> {
    const results = [];
    const errors = [];
    const batchSize = this.options.batch_size || 10;

    for (let i = 0; i < this.items.length; i += batchSize) {
      const batch = this.items.slice(
        i,
        Math.min(i + batchSize, this.items.length),
      );

      try {
        // Validate each item
        const validatedBatch = [];
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          try {
            const validatedItem = await this.validatePhotoGroupData(item);
            validatedBatch.push({
              ...validatedItem,
              couple_id: this.coupleId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          } catch (validationError) {
            errors.push({
              item_index: i + j,
              error_code: 'VALIDATION_ERROR',
              error_message: validationError.message,
            });
          }
        }

        if (validatedBatch.length > 0) {
          // Insert batch
          const { data: insertedGroups, error: insertError } =
            await this.supabase
              .from('photo_groups')
              .insert(validatedBatch)
              .select();

          if (insertError) {
            throw insertError;
          }

          results.push(...(insertedGroups || []));

          // Handle guest assignments if provided
          for (let k = 0; k < insertedGroups.length; k++) {
            const insertedGroup = insertedGroups[k];
            const originalItem = validatedBatch[k];

            if (originalItem.guest_ids && originalItem.guest_ids.length > 0) {
              const assignments = originalItem.guest_ids.map(
                (guestId: string) => ({
                  photo_group_id: insertedGroup.id,
                  guest_id: guestId,
                  is_primary: false,
                }),
              );

              await this.supabase
                .from('photo_group_assignments')
                .insert(assignments);
            }
          }

          // Conflict detection if enabled
          if (this.options.validate_conflicts && insertedGroups.length > 0) {
            for (const group of insertedGroups) {
              await this.detectAndHandleConflicts(group.id);
            }
          }
        }

        // Update progress
        const processed = Math.min(i + batchSize, this.items.length);
        const progressPercent = Math.round(
          (processed / this.items.length) * 100,
        );
        await this.updateProgress(
          'processing',
          progressPercent,
          processed,
          errors,
        );
      } catch (batchError) {
        console.error('Batch creation error:', batchError);
        for (let j = 0; j < batch.length; j++) {
          errors.push({
            item_index: i + j,
            error_code: 'BATCH_ERROR',
            error_message: batchError.message,
          });
        }

        if (this.options.rollback_on_error) {
          // Rollback created items
          if (results.length > 0) {
            const createdIds = results.map((r) => r.id);
            await this.supabase
              .from('photo_groups')
              .delete()
              .in('id', createdIds);
          }
          throw new Error('Batch operation failed and was rolled back');
        }
      }
    }

    const finalStatus =
      errors.length === this.items.length ? 'failed' : 'completed';
    await this.updateProgress(
      finalStatus,
      100,
      this.items.length,
      errors,
      undefined,
      results,
    );

    return {
      status: finalStatus,
      created_count: results.length,
      error_count: errors.length,
      results,
      errors,
    };
  }

  private async processBulkUpdate(): Promise<any> {
    const results = [];
    const errors = [];
    const batchSize = this.options.batch_size || 10;

    for (let i = 0; i < this.items.length; i += batchSize) {
      const batch = this.items.slice(
        i,
        Math.min(i + batchSize, this.items.length),
      );

      try {
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];

          if (!item.id) {
            errors.push({
              item_index: i + j,
              error_code: 'MISSING_ID',
              error_message: 'Item ID is required for update operations',
            });
            continue;
          }

          try {
            // Verify access to photo group
            const { data: existingGroup } = await this.supabase
              .from('photo_groups')
              .select(
                `
                id, couple_id, version,
                clients!inner(user_profiles!inner(user_id))
              `,
              )
              .eq('id', item.id)
              .eq('clients.user_profiles.user_id', this.userId)
              .single();

            if (!existingGroup) {
              errors.push({
                item_index: i + j,
                error_code: 'NOT_FOUND',
                error_message: `Photo group ${item.id} not found or access denied`,
              });
              continue;
            }

            // Prepare update data
            const { id, guest_ids, ...updateData } = item;
            updateData.updated_at = new Date().toISOString();

            if (this.options.update_mode === 'replace') {
              // Replace all fields
            } else if (this.options.update_mode === 'merge') {
              // Only update provided fields
              Object.keys(updateData).forEach((key) => {
                if (updateData[key] === undefined) {
                  delete updateData[key];
                }
              });
            }

            // Update photo group
            const { data: updatedGroup, error: updateError } =
              await this.supabase
                .from('photo_groups')
                .update(updateData)
                .eq('id', item.id)
                .select()
                .single();

            if (updateError) {
              throw updateError;
            }

            results.push(updatedGroup);

            // Handle guest assignments update if provided
            if (guest_ids !== undefined) {
              // Delete existing assignments
              await this.supabase
                .from('photo_group_assignments')
                .delete()
                .eq('photo_group_id', item.id);

              // Add new assignments
              if (guest_ids.length > 0) {
                const assignments = guest_ids.map((guestId: string) => ({
                  photo_group_id: item.id,
                  guest_id: guestId,
                  is_primary: false,
                }));

                await this.supabase
                  .from('photo_group_assignments')
                  .insert(assignments);
              }
            }

            // Conflict detection if enabled
            if (this.options.validate_conflicts) {
              await this.detectAndHandleConflicts(item.id);
            }
          } catch (itemError) {
            errors.push({
              item_index: i + j,
              error_code: 'UPDATE_ERROR',
              error_message: itemError.message,
            });
          }
        }

        // Update progress
        const processed = Math.min(i + batchSize, this.items.length);
        const progressPercent = Math.round(
          (processed / this.items.length) * 100,
        );
        await this.updateProgress(
          'processing',
          progressPercent,
          processed,
          errors,
        );
      } catch (batchError) {
        console.error('Batch update error:', batchError);
        for (let j = 0; j < batch.length; j++) {
          errors.push({
            item_index: i + j,
            error_code: 'BATCH_ERROR',
            error_message: batchError.message,
          });
        }
      }
    }

    const finalStatus = results.length === 0 ? 'failed' : 'completed';
    await this.updateProgress(
      finalStatus,
      100,
      this.items.length,
      errors,
      undefined,
      results,
    );

    return {
      status: finalStatus,
      updated_count: results.length,
      error_count: errors.length,
      results,
      errors,
    };
  }

  private async processBulkDelete(): Promise<any> {
    const results = [];
    const errors = [];
    const deletedIds = [];

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];

      if (!item.id) {
        errors.push({
          item_index: i,
          error_code: 'MISSING_ID',
          error_message: 'Item ID is required for delete operations',
        });
        continue;
      }

      try {
        // Verify access and get group data for rollback
        const { data: existingGroup } = await this.supabase
          .from('photo_groups')
          .select(
            `
            *,
            assignments:photo_group_assignments(*),
            clients!inner(user_profiles!inner(user_id))
          `,
          )
          .eq('id', item.id)
          .eq('clients.user_profiles.user_id', this.userId)
          .single();

        if (!existingGroup) {
          errors.push({
            item_index: i,
            error_code: 'NOT_FOUND',
            error_message: `Photo group ${item.id} not found or access denied`,
          });
          continue;
        }

        // Store for potential rollback
        results.push(existingGroup);

        // Delete photo group (assignments will be cascade deleted)
        const { error: deleteError } = await this.supabase
          .from('photo_groups')
          .delete()
          .eq('id', item.id);

        if (deleteError) {
          throw deleteError;
        }

        deletedIds.push(item.id);

        // Update progress
        const progressPercent = Math.round(((i + 1) / this.items.length) * 100);
        await this.updateProgress('processing', progressPercent, i + 1, errors);
      } catch (itemError) {
        errors.push({
          item_index: i,
          error_code: 'DELETE_ERROR',
          error_message: itemError.message,
        });

        if (this.options.rollback_on_error) {
          // Rollback deleted items
          for (const deletedGroup of results) {
            const { assignments, ...groupData } = deletedGroup;
            await this.supabase.from('photo_groups').insert(groupData);

            if (assignments && assignments.length > 0) {
              await this.supabase
                .from('photo_group_assignments')
                .insert(assignments);
            }
          }
          throw new Error('Batch delete operation failed and was rolled back');
        }
      }
    }

    const finalStatus = deletedIds.length === 0 ? 'failed' : 'completed';
    await this.updateProgress(
      finalStatus,
      100,
      this.items.length,
      errors,
      undefined,
      results,
    );

    return {
      status: finalStatus,
      deleted_count: deletedIds.length,
      error_count: errors.length,
      deleted_ids: deletedIds,
      errors,
    };
  }

  private async processBulkAssignGuests(): Promise<any> {
    const results = [];
    const errors = [];

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];

      if (
        !item.photo_group_id ||
        !item.guest_ids ||
        !Array.isArray(item.guest_ids)
      ) {
        errors.push({
          item_index: i,
          error_code: 'INVALID_DATA',
          error_message: 'photo_group_id and guest_ids array are required',
        });
        continue;
      }

      try {
        // Verify access to photo group
        const { data: photoGroup } = await this.supabase
          .from('photo_groups')
          .select(
            `
            id, name,
            clients!inner(user_profiles!inner(user_id))
          `,
          )
          .eq('id', item.photo_group_id)
          .eq('clients.user_profiles.user_id', this.userId)
          .single();

        if (!photoGroup) {
          errors.push({
            item_index: i,
            error_code: 'NOT_FOUND',
            error_message: `Photo group ${item.photo_group_id} not found or access denied`,
          });
          continue;
        }

        // Handle assignment mode
        if (item.replace_existing) {
          // Delete existing assignments
          await this.supabase
            .from('photo_group_assignments')
            .delete()
            .eq('photo_group_id', item.photo_group_id);
        }

        // Create new assignments
        const assignments = item.guest_ids.map(
          (guestId: string, index: number) => ({
            photo_group_id: item.photo_group_id,
            guest_id: guestId,
            is_primary: item.primary_guest_ids?.includes(guestId) || false,
            position_notes: item.position_notes?.[index] || null,
          }),
        );

        const { data: createdAssignments, error: assignError } =
          await this.supabase
            .from('photo_group_assignments')
            .upsert(assignments, {
              onConflict: 'photo_group_id,guest_id',
              ignoreDuplicates: false,
            })
            .select();

        if (assignError) {
          throw assignError;
        }

        results.push({
          photo_group_id: item.photo_group_id,
          photo_group_name: photoGroup.name,
          assigned_count: createdAssignments?.length || 0,
          assignments: createdAssignments,
        });

        // Conflict detection if enabled
        if (this.options.validate_conflicts) {
          await this.detectAndHandleConflicts(item.photo_group_id);
        }

        // Update progress
        const progressPercent = Math.round(((i + 1) / this.items.length) * 100);
        await this.updateProgress('processing', progressPercent, i + 1, errors);
      } catch (itemError) {
        errors.push({
          item_index: i,
          error_code: 'ASSIGNMENT_ERROR',
          error_message: itemError.message,
        });
      }
    }

    const finalStatus = results.length === 0 ? 'failed' : 'completed';
    await this.updateProgress(
      finalStatus,
      100,
      this.items.length,
      errors,
      undefined,
      results,
    );

    return {
      status: finalStatus,
      processed_count: results.length,
      total_assignments: results.reduce((sum, r) => sum + r.assigned_count, 0),
      error_count: errors.length,
      results,
      errors,
    };
  }

  private async processBulkReorder(): Promise<any> {
    const results = [];
    const errors = [];

    try {
      // Validate all items have required fields
      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        if (!item.id || typeof item.priority !== 'number') {
          errors.push({
            item_index: i,
            error_code: 'INVALID_DATA',
            error_message:
              'id and priority are required for reorder operations',
          });
        }
      }

      if (errors.length > 0) {
        await this.updateProgress('failed', 0, 0, errors);
        return { status: 'failed', errors };
      }

      // Batch update priorities
      const updates = this.items.map((item) =>
        this.supabase
          .from('photo_groups')
          .update({
            priority: item.priority,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
          .select(),
      );

      const updateResults = await Promise.allSettled(updates);

      for (let i = 0; i < updateResults.length; i++) {
        const result = updateResults[i];
        if (result.status === 'fulfilled' && result.value.data) {
          results.push(result.value.data[0]);
        } else if (result.status === 'rejected') {
          errors.push({
            item_index: i,
            error_code: 'UPDATE_ERROR',
            error_message: result.reason.message,
          });
        }

        // Update progress
        const progressPercent = Math.round(((i + 1) / this.items.length) * 100);
        await this.updateProgress('processing', progressPercent, i + 1, errors);
      }

      const finalStatus = results.length === 0 ? 'failed' : 'completed';
      await this.updateProgress(
        finalStatus,
        100,
        this.items.length,
        errors,
        undefined,
        results,
      );

      return {
        status: finalStatus,
        reordered_count: results.length,
        error_count: errors.length,
        results,
        errors,
      };
    } catch (operationError) {
      await this.updateProgress('failed', 0, 0, [
        {
          item_index: -1,
          error_code: 'OPERATION_ERROR',
          error_message: operationError.message,
        },
      ]);
      throw operationError;
    }
  }

  private async processBulkSchedule(): Promise<any> {
    // Implementation for bulk scheduling operations
    const results = [];
    const errors = [];

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];

      if (!item.id || !item.timeline_slot) {
        errors.push({
          item_index: i,
          error_code: 'INVALID_DATA',
          error_message:
            'id and timeline_slot are required for schedule operations',
        });
        continue;
      }

      try {
        const { data: updatedGroup, error: scheduleError } = await this.supabase
          .from('photo_groups')
          .update({
            timeline_slot: item.timeline_slot,
            location: item.location || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
          .select()
          .single();

        if (scheduleError) {
          throw scheduleError;
        }

        results.push(updatedGroup);

        // Conflict detection if enabled
        if (this.options.validate_conflicts) {
          await this.detectAndHandleConflicts(item.id);
        }
      } catch (itemError) {
        errors.push({
          item_index: i,
          error_code: 'SCHEDULE_ERROR',
          error_message: itemError.message,
        });
      }

      // Update progress
      const progressPercent = Math.round(((i + 1) / this.items.length) * 100);
      await this.updateProgress('processing', progressPercent, i + 1, errors);
    }

    const finalStatus = results.length === 0 ? 'failed' : 'completed';
    await this.updateProgress(
      finalStatus,
      100,
      this.items.length,
      errors,
      undefined,
      results,
    );

    return {
      status: finalStatus,
      scheduled_count: results.length,
      error_count: errors.length,
      results,
      errors,
    };
  }

  private async processBulkExport(): Promise<any> {
    // Implementation for bulk export operations
    return {
      status: 'completed',
      message: 'Bulk export functionality to be implemented',
      export_url: null,
    };
  }

  private async processBulkImport(): Promise<any> {
    // Implementation for bulk import operations
    return {
      status: 'completed',
      message: 'Bulk import functionality to be implemented',
      imported_count: 0,
    };
  }

  private async validatePhotoGroupData(data: any): Promise<any> {
    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Photo group name is required');
    }

    if (
      data.estimated_time_minutes &&
      (data.estimated_time_minutes < 1 || data.estimated_time_minutes > 120)
    ) {
      throw new Error('Estimated time must be between 1 and 120 minutes');
    }

    const validPhotoTypes = [
      'family',
      'friends',
      'bridal_party',
      'groomsmen',
      'bridesmaids',
      'children',
      'special',
      'formal',
      'candid',
    ];
    if (data.photo_type && !validPhotoTypes.includes(data.photo_type)) {
      throw new Error(
        `Invalid photo type. Must be one of: ${validPhotoTypes.join(', ')}`,
      );
    }

    return {
      name: data.name.trim(),
      description: data.description || null,
      photo_type: data.photo_type || 'formal',
      priority: data.priority || 5,
      estimated_time_minutes: data.estimated_time_minutes || 10,
      location: data.location || null,
      timeline_slot: data.timeline_slot || null,
      photographer_notes: data.photographer_notes || null,
      guest_ids: data.guest_ids || [],
    };
  }

  private async detectAndHandleConflicts(photoGroupId: string): Promise<void> {
    try {
      // Call conflict detection function
      const { data: conflicts } = await this.supabase.rpc(
        'detect_photo_group_conflicts',
        { p_photo_group_id: photoGroupId },
      );

      if (
        conflicts &&
        conflicts.length > 0 &&
        this.options.auto_resolve_conflicts
      ) {
        // Simple auto-resolution for minor conflicts
        for (const conflict of conflicts) {
          if (
            conflict.severity === 'warning' &&
            conflict.conflict_type === 'guest_overlap'
          ) {
            // Auto-resolve guest overlaps by keeping in higher priority group
            // Implementation would be added here
          }
        }
      }
    } catch (conflictError) {
      console.error('Conflict detection error:', conflictError);
      // Don't fail the operation for conflict detection errors
    }
  }

  private async updateProgress(
    status: string,
    progress: number,
    processedCount: number,
    errors: any[],
    errorMessage?: string,
    results?: any[],
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        progress,
        processed_count: processedCount,
        total_items: this.items.length,
        error_details: errors.length > 0 ? JSON.stringify(errors) : null,
      };

      if (results) {
        updateData.results = results;
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (errorMessage) {
        updateData.error_details = errorMessage;
      }

      await this.supabase
        .from('photo_group_batch_operations')
        .update(updateData)
        .eq('id', this.operationId);
    } catch (updateError) {
      console.error('Failed to update batch operation progress:', updateError);
    }
  }
}

// POST /api/photo-groups/batch - Start batch operation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { couple_id, operation_type, items, options } =
      BatchOperationSchema.parse(body);

    // Verify user has access to this couple
    const { data: client } = await supabase
      .from('clients')
      .select(
        `
        id,
        user_profiles!inner(user_id)
      `,
      )
      .eq('id', couple_id)
      .eq('user_profiles.user_id', user.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user profile ID
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    // Create batch operation record
    const operationId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data: batchOperation, error: createError } = await supabase
      .from('photo_group_batch_operations')
      .insert({
        id: operationId,
        couple_id,
        operation_type,
        operation_data: { items, options },
        status: 'pending',
        progress: 0,
        total_items: items.length,
        created_by: userProfile.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating batch operation:', createError);
      return NextResponse.json(
        { error: 'Failed to create batch operation' },
        { status: 500 },
      );
    }

    // Start processing (this would typically be done in a background job)
    const processor = new BatchOperationProcessor(
      supabase,
      operationId,
      couple_id,
      operation_type,
      items,
      options,
      user.id,
    );

    // For demo purposes, we'll process synchronously for smaller batches
    // In production, this should be queued for background processing
    if (items.length <= 20) {
      try {
        const result = await processor.process();
        return NextResponse.json({
          operation_id: operationId,
          status: 'completed',
          ...result,
        });
      } catch (processingError) {
        console.error('Batch processing error:', processingError);
        return NextResponse.json(
          {
            operation_id: operationId,
            status: 'failed',
            error: processingError.message,
          },
          { status: 500 },
        );
      }
    } else {
      // Queue for background processing
      // In a real implementation, you would use a job queue like Bull, Agenda, or similar
      setTimeout(async () => {
        try {
          await processor.process();
        } catch (error) {
          console.error('Background batch processing failed:', error);
        }
      }, 100);

      return NextResponse.json({
        operation_id: operationId,
        status: 'processing',
        message: 'Batch operation started. Use GET endpoint to check progress.',
        estimated_completion_time: new Date(
          Date.now() + items.length * 1000,
        ).toISOString(),
      });
    }
  } catch (error) {
    console.error('Batch operation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET /api/photo-groups/batch - Get batch operation status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const operationId = searchParams.get('operation_id');
  const coupleId = searchParams.get('couple_id');

  if (!operationId && !coupleId) {
    return NextResponse.json(
      { error: 'operation_id or couple_id is required' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase.from('photo_group_batch_operations').select(`
        id,
        operation_type,
        status,
        progress,
        processed_count,
        total_items,
        results,
        error_details,
        created_at,
        completed_at,
        couple:clients!couple_id(
          id,
          user_profiles!inner(user_id)
        )
      `);

    if (operationId) {
      query = query.eq('id', operationId);
    } else {
      query = query.eq('couple_id', coupleId);
    }

    // Verify access
    query = query.eq('couple.user_profiles.user_id', user.id);

    const { data: operations, error: operationsError } = await query
      .order('created_at', { ascending: false })
      .limit(operationId ? 1 : 50);

    if (operationsError) {
      console.error('Error fetching batch operations:', operationsError);
      return NextResponse.json(
        { error: 'Failed to fetch batch operations' },
        { status: 500 },
      );
    }

    if (operationId && (!operations || operations.length === 0)) {
      return NextResponse.json(
        { error: 'Batch operation not found' },
        { status: 404 },
      );
    }

    // Parse error details
    const processedOperations =
      operations?.map((op) => ({
        ...op,
        error_details: op.error_details ? JSON.parse(op.error_details) : null,
      })) || [];

    return NextResponse.json({
      operations: processedOperations,
      total_count: processedOperations.length,
    });
  } catch (error) {
    console.error('Get batch operations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/photo-groups/batch - Cancel batch operation
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const operationId = searchParams.get('operation_id');

  if (!operationId) {
    return NextResponse.json(
      { error: 'operation_id is required' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update operation status to cancelled
    const { data: cancelledOperation, error: cancelError } = await supabase
      .from('photo_group_batch_operations')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', operationId)
      .eq('status', 'processing') // Only allow cancelling processing operations
      .select()
      .single();

    if (cancelError || !cancelledOperation) {
      return NextResponse.json(
        {
          error: 'Failed to cancel batch operation or operation not found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: 'Batch operation cancelled successfully',
      operation_id: operationId,
      status: 'cancelled',
    });
  } catch (error) {
    console.error('Cancel batch operation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
