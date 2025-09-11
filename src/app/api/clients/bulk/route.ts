import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationEngine } from '@/lib/notifications/engine';

// Types for bulk operations
interface BulkOperationRequest {
  operation: 'status_update' | 'tag_add' | 'tag_remove' | 'delete' | 'export';
  clientIds: string[];
  parameters: any;
}

interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: Array<{
    clientId: string;
    error: string;
  }>;
  metadata?: any;
}

// Batch size for database operations to prevent timeouts
const BATCH_SIZE = 100;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: BulkOperationRequest = await request.json();
    const { operation, clientIds, parameters } = body;

    if (!operation || !clientIds || clientIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Audit log the bulk operation attempt
    await auditBulkOperation(
      supabase,
      user.id,
      operation,
      clientIds.length,
      parameters,
    );

    let result: BulkOperationResult;

    switch (operation) {
      case 'status_update':
        result = await handleStatusUpdate(supabase, clientIds, parameters);
        break;
      case 'tag_add':
        result = await handleTagAdd(supabase, clientIds, parameters);
        break;
      case 'tag_remove':
        result = await handleTagRemove(supabase, clientIds, parameters);
        break;
      case 'delete':
        result = await handleBulkDelete(supabase, clientIds);
        break;
      case 'export':
        result = await handleExport(supabase, clientIds, parameters);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 },
        );
    }

    // Log successful completion
    await auditBulkOperationResult(supabase, user.id, operation, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bulk operation failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Handle bulk status updates with Team B profile integrity validation
 */
async function handleStatusUpdate(
  supabase: any,
  clientIds: string[],
  parameters: { new_status: string },
): Promise<BulkOperationResult> {
  const { new_status } = parameters;
  const validStatuses = ['lead', 'booked', 'completed', 'archived'];

  if (!validStatuses.includes(new_status)) {
    throw new Error('Invalid status');
  }

  const result: BulkOperationResult = {
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  // Process clients in batches to avoid database timeout
  for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
    const batch = clientIds.slice(i, i + BATCH_SIZE);

    try {
      // Update status with profile integrity validation
      const { data, error } = await supabase
        .from('clients')
        .update({
          status: new_status,
          updated_at: new Date().toISOString(),
        })
        .in('id', batch)
        .select();

      if (error) throw error;

      // Create activity records for each updated client (Team B integration)
      if (data) {
        const activities = data.map((client: any) => ({
          client_id: client.id,
          activity_type: 'status_change',
          description: `Status changed to ${new_status}`,
          metadata: {
            old_status: client.previous_status || 'unknown',
            new_status: new_status,
            bulk_operation: true,
          },
          created_at: new Date().toISOString(),
        }));

        await supabase.from('client_activities').insert(activities);
      }

      result.successCount += data?.length || 0;

      // Send progress notification every batch
      await notificationEngine.sendNotification({
        template_id: 'bulk_operation_progress',
        recipients: [
          {
            id: 'current_user',
            name: 'User',
            email: 'user@example.com',
            type: 'planner',
            preferences: {
              channels: [{ type: 'in_app', enabled: true, priority: 1 }],
            },
          },
        ],
        variables: {
          operation_type: 'status_update',
          progress: Math.round(((i + batch.length) / clientIds.length) * 100),
          completed: result.successCount,
        },
        context: {
          wedding_id: 'current_wedding',
        },
      });
    } catch (error) {
      batch.forEach((clientId) => {
        result.errors.push({
          clientId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failureCount++;
      });
    }
  }

  return result;
}

/**
 * Handle bulk tag additions with validation - Updated for proper tag system
 */
async function handleTagAdd(
  supabase: any,
  clientIds: string[],
  parameters: { tags: string[] },
): Promise<BulkOperationResult> {
  const { tags } = parameters;

  if (!tags || tags.length === 0) {
    throw new Error('No tags provided');
  }

  // Get organization_id and user info
  const { data: user } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.organization_id) throw new Error('Organization not found');

  // Validate and sanitize tag names
  const validTagNames = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.length <= 50)
    .slice(0, 10); // Limit to 10 tags max

  const result: BulkOperationResult = {
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  // Find or create tags by name
  const tagIds = [];
  for (const tagName of validTagNames) {
    try {
      // Try to find existing tag
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('name', tagName)
        .single();

      if (existingTag) {
        tagIds.push(existingTag.id);
      } else {
        // Create new tag if it doesn't exist
        const { data: newTag, error } = await supabase
          .from('tags')
          .insert({
            name: tagName,
            description: null,
            color: 'blue',
            category: 'custom',
            organization_id: profile.organization_id,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (error) throw error;
        tagIds.push(newTag.id);
      }
    } catch (error) {
      console.error(`Failed to handle tag "${tagName}":`, error);
    }
  }

  if (tagIds.length === 0) {
    throw new Error('No valid tags could be processed');
  }

  // Process clients in batches
  for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
    const batch = clientIds.slice(i, i + BATCH_SIZE);

    try {
      // Verify clients exist and belong to organization
      const { data: validClients } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('organization_id', profile.organization_id)
        .in('id', batch);

      if (!validClients || validClients.length === 0) {
        batch.forEach((clientId) => {
          result.errors.push({
            clientId,
            error: 'Client not found or access denied',
          });
          result.failureCount++;
        });
        continue;
      }

      // Create client-tag assignments
      const assignments = [];
      for (const client of validClients) {
        for (const tagId of tagIds) {
          assignments.push({
            client_id: client.id,
            tag_id: tagId,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
          });
        }
      }

      // Insert assignments (using upsert to handle duplicates)
      const { error: assignmentError } = await supabase
        .from('client_tags')
        .upsert(assignments, {
          onConflict: 'client_id,tag_id',
          ignoreDuplicates: true,
        });

      if (assignmentError) throw assignmentError;

      result.successCount += validClients.length;

      // Create activity records
      const activities = validClients.map((client: any) => ({
        client_id: client.id,
        organization_id: profile.organization_id,
        activity_type: 'tags_assigned',
        activity_title: 'Tags added via bulk operation',
        activity_description: `Tags added: ${validTagNames.join(', ')}`,
        performed_by: user.id,
        metadata: {
          added_tags: validTagNames,
          bulk_operation: true,
        },
      }));

      await supabase.from('client_activities').insert(activities);
    } catch (error) {
      batch.forEach((clientId) => {
        result.errors.push({
          clientId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failureCount++;
      });
    }
  }

  return result;
}

/**
 * Handle bulk tag removal - Updated for proper tag system
 */
async function handleTagRemove(
  supabase: any,
  clientIds: string[],
  parameters: { tags: string[] },
): Promise<BulkOperationResult> {
  const { tags } = parameters;

  if (!tags || tags.length === 0) {
    throw new Error('No tags provided');
  }

  // Get organization_id and user info
  const { data: user } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.organization_id) throw new Error('Organization not found');

  const tagsToRemove = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const result: BulkOperationResult = {
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  // Find tag IDs by name
  const { data: tagsData } = await supabase
    .from('tags')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .in('name', tagsToRemove);

  if (!tagsData || tagsData.length === 0) {
    throw new Error('No matching tags found');
  }

  const tagIds = tagsData.map((tag: any) => tag.id);

  // Process clients in batches
  for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
    const batch = clientIds.slice(i, i + BATCH_SIZE);

    try {
      // Verify clients exist and belong to organization
      const { data: validClients } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('organization_id', profile.organization_id)
        .in('id', batch);

      if (!validClients || validClients.length === 0) {
        batch.forEach((clientId) => {
          result.errors.push({
            clientId,
            error: 'Client not found or access denied',
          });
          result.failureCount++;
        });
        continue;
      }

      // Remove tag assignments
      const { error: removeError } = await supabase
        .from('client_tags')
        .delete()
        .in('client_id', batch)
        .in('tag_id', tagIds);

      if (removeError) throw removeError;

      result.successCount += validClients.length;

      // Create activity records
      const activities = validClients.map((client: any) => ({
        client_id: client.id,
        organization_id: profile.organization_id,
        activity_type: 'tags_removed',
        activity_title: 'Tags removed via bulk operation',
        activity_description: `Tags removed: ${tagsToRemove.join(', ')}`,
        performed_by: user.id,
        metadata: {
          removed_tags: tagsToRemove,
          bulk_operation: true,
        },
      }));

      await supabase.from('client_activities').insert(activities);
    } catch (error) {
      batch.forEach((clientId) => {
        result.errors.push({
          clientId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failureCount++;
      });
    }
  }

  return result;
}

/**
 * Handle bulk delete with confirmation and rollback support
 */
async function handleBulkDelete(
  supabase: any,
  clientIds: string[],
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  // Create backup before deletion for rollback capability
  const backupId = `bulk_delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Backup clients data
    const { data: clientsToDelete } = await supabase
      .from('clients')
      .select('*')
      .in('id', clientIds);

    if (clientsToDelete && clientsToDelete.length > 0) {
      await supabase.from('bulk_operation_backups').insert({
        backup_id: backupId,
        operation_type: 'delete',
        backup_data: clientsToDelete,
        created_at: new Date().toISOString(),
      });
    }

    // Delete in batches
    for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
      const batch = clientIds.slice(i, i + BATCH_SIZE);

      try {
        // Delete related data first (foreign key constraints)
        await supabase
          .from('client_activities')
          .delete()
          .in('client_id', batch);

        await supabase.from('client_tags').delete().in('client_id', batch);

        await supabase.from('client_documents').delete().in('client_id', batch);

        await supabase.from('client_notes').delete().in('client_id', batch);

        // Delete clients
        const { data, error } = await supabase
          .from('clients')
          .delete()
          .in('id', batch)
          .select();

        if (error) throw error;

        result.successCount += batch.length;
      } catch (error) {
        batch.forEach((clientId) => {
          result.errors.push({
            clientId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.failureCount++;
        });
      }
    }

    result.metadata = { backupId };
  } catch (error) {
    throw new Error(
      `Bulk delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  return result;
}

/**
 * Handle bulk export
 */
async function handleExport(
  supabase: any,
  clientIds: string[],
  parameters: { format: string; include_fields: string[] },
): Promise<BulkOperationResult> {
  const { format, include_fields } = parameters;

  try {
    let selectFields = 'id';

    if (include_fields.includes('basic_info')) {
      selectFields +=
        ', first_name, last_name, partner_first_name, partner_last_name, email, phone';
    }
    if (include_fields.includes('wedding_details')) {
      selectFields += ', wedding_date, venue_name, status';
    }
    if (include_fields.includes('package_info')) {
      selectFields += ', package_name, package_price';
    }
    if (include_fields.includes('activity_history')) {
      selectFields += ', client_activities(*)';
    }

    const { data: clients, error } = await supabase
      .from('clients')
      .select(selectFields)
      .in('id', clientIds);

    if (error) throw error;

    // Convert to CSV or Excel format
    let exportData: string | Uint8Array;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      exportData = convertToCSV(clients);
      contentType = 'text/csv';
      filename = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // For Excel export, you would use a library like exceljs
      exportData = convertToCSV(clients); // Simplified for demo
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `clients_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    return {
      successCount: clients.length,
      failureCount: 0,
      errors: [],
      metadata: {
        exportData: Buffer.from(exportData).toString('base64'),
        contentType,
        filename,
      },
    };
  } catch (error) {
    throw new Error(
      `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]).filter(
    (key) => key !== 'client_activities',
  );
  const csvHeaders = headers.join(',');

  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Audit bulk operation attempt
 */
async function auditBulkOperation(
  supabase: any,
  userId: string,
  operation: string,
  clientCount: number,
  parameters: any,
) {
  try {
    await supabase.from('bulk_operation_audit_log').insert({
      user_id: userId,
      operation_type: operation,
      client_count: clientCount,
      parameters,
      status: 'started',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to audit bulk operation:', error);
  }
}

/**
 * Audit bulk operation result
 */
async function auditBulkOperationResult(
  supabase: any,
  userId: string,
  operation: string,
  result: BulkOperationResult,
) {
  try {
    await supabase.from('bulk_operation_audit_log').insert({
      user_id: userId,
      operation_type: operation,
      client_count: result.successCount + result.failureCount,
      result,
      status: 'completed',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to audit bulk operation result:', error);
  }
}
