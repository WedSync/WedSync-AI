'use client';

import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { z } from 'zod';
import {
  GuestRelationship,
  ConflictSeverity,
  RelationshipType,
} from './relationship-conflict-validator';
import guestSyncManager, { GuestSyncEvent } from '@/lib/realtime/guest-sync';

// Extended type definitions for relationship management
export interface RelationshipCreateRequest {
  guest_id_1: string;
  guest_id_2: string;
  relationship_type: RelationshipType;
  conflict_severity: ConflictSeverity;
  notes?: string;
  is_bidirectional?: boolean;
  tags?: string[];
}

export interface RelationshipUpdateRequest {
  relationship_type?: RelationshipType;
  conflict_severity?: ConflictSeverity;
  notes?: string;
  is_bidirectional?: boolean;
  tags?: string[];
}

export interface RelationshipQueryOptions {
  guest_id?: string;
  relationship_types?: RelationshipType[];
  conflict_severities?: ConflictSeverity[];
  include_bidirectional?: boolean;
  tags?: string[];
  created_after?: string;
  created_before?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'conflict_severity';
  sort_order?: 'asc' | 'desc';
}

export interface BulkRelationshipOperation {
  type: 'create' | 'update' | 'delete';
  relationships: Array<
    | RelationshipCreateRequest
    | ({ id: string } & Partial<RelationshipUpdateRequest>)
  >;
  validate_conflicts?: boolean;
  batch_size?: number;
}

export interface BulkOperationResult {
  successful_count: number;
  failed_count: number;
  errors: Array<{
    index: number;
    relationship_id?: string;
    field: string;
    message: string;
  }>;
  warnings: string[];
  performance_metrics: {
    total_time_ms: number;
    validation_time_ms: number;
    database_time_ms: number;
  };
}

export interface RelationshipAnalytics {
  total_relationships: number;
  by_type: Record<RelationshipType, number>;
  by_severity: Record<ConflictSeverity, number>;
  bidirectional_count: number;
  conflict_relationships: number;
  most_connected_guests: Array<{
    guest_id: string;
    guest_name: string;
    connection_count: number;
  }>;
  relationship_density: number;
}

export interface RelationshipSuggestion {
  guest_1: { id: string; name: string };
  guest_2: { id: string; name: string };
  suggested_type: RelationshipType;
  suggested_severity: ConflictSeverity;
  confidence: number;
  reasoning: string[];
  existing_relationship?: GuestRelationship;
}

// Validation schemas
const relationshipCreateSchema = z.object({
  guest_id_1: z.string().uuid(),
  guest_id_2: z
    .string()
    .uuid()
    .refine(
      (val, ctx) => {
        return val !== ctx.parent.guest_id_1;
      },
      { message: 'Cannot create relationship with self' },
    ),
  relationship_type: z.enum([
    'family',
    'friends',
    'work',
    'romantic',
    'conflict',
    'divorced',
    'estranged',
  ]),
  conflict_severity: z.enum([
    'incompatible',
    'avoid',
    'prefer_apart',
    'neutral',
    'prefer_together',
  ]),
  notes: z.string().max(1000).optional(),
  is_bidirectional: z.boolean().default(true),
  tags: z.array(z.string().max(50)).max(10).default([]),
});

const relationshipUpdateSchema = z.object({
  relationship_type: z
    .enum([
      'family',
      'friends',
      'work',
      'romantic',
      'conflict',
      'divorced',
      'estranged',
    ])
    .optional(),
  conflict_severity: z
    .enum([
      'incompatible',
      'avoid',
      'prefer_apart',
      'neutral',
      'prefer_together',
    ])
    .optional(),
  notes: z.string().max(1000).optional(),
  is_bidirectional: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const relationshipQuerySchema = z.object({
  guest_id: z.string().uuid().optional(),
  relationship_types: z
    .array(
      z.enum([
        'family',
        'friends',
        'work',
        'romantic',
        'conflict',
        'divorced',
        'estranged',
      ]),
    )
    .optional(),
  conflict_severities: z
    .array(
      z.enum([
        'incompatible',
        'avoid',
        'prefer_apart',
        'neutral',
        'prefer_together',
      ]),
    )
    .optional(),
  include_bidirectional: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(1000).default(50),
  sort_by: z
    .enum(['created_at', 'updated_at', 'conflict_severity'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * RelationshipManagementService - Comprehensive CRUD operations for guest relationships
 * Handles all relationship data with privacy controls and conflict integration
 */
export class RelationshipManagementService {
  private supabase = createClient();
  private serverSupabase: ReturnType<typeof createServerClient> | null = null;
  private auditLogEnabled = true;

  constructor(serverClient?: ReturnType<typeof createServerClient>) {
    this.serverSupabase = serverClient || null;
  }

  /**
   * Create a new guest relationship with full validation
   * SECURITY: Verifies couple ownership of both guests
   */
  async createRelationship(
    coupleId: string,
    relationshipData: RelationshipCreateRequest,
    userId?: string,
  ): Promise<{ relationship: GuestRelationship; warnings: string[] }> {
    // Validate input data
    const validatedData = relationshipCreateSchema.parse(relationshipData);

    try {
      // SECURITY: Verify couple owns both guests
      await this.verifyGuestOwnership(coupleId, [
        validatedData.guest_id_1,
        validatedData.guest_id_2,
      ]);

      // Check for existing relationship
      const existingRelationship = await this.findExistingRelationship(
        coupleId,
        validatedData.guest_id_1,
        validatedData.guest_id_2,
      );

      const warnings: string[] = [];
      if (existingRelationship) {
        warnings.push(
          'A relationship already exists between these guests. Consider updating instead of creating.',
        );
      }

      // Create the relationship
      const { data: relationship, error } = await this.supabase
        .from('guest_relationships')
        .insert({
          couple_id: coupleId,
          guest_id_1: validatedData.guest_id_1,
          guest_id_2: validatedData.guest_id_2,
          relationship_type: validatedData.relationship_type,
          conflict_severity: validatedData.conflict_severity,
          notes: validatedData.notes,
          is_bidirectional: validatedData.is_bidirectional,
          tags: validatedData.tags,
          created_by: userId || 'system',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create relationship: ${error.message}`);
      }

      // Create reverse relationship if bidirectional
      if (validatedData.is_bidirectional) {
        await this.createReverseRelationship(relationship, coupleId, userId);
      }

      // Log audit trail
      if (this.auditLogEnabled) {
        await this.logRelationshipAction(
          'create',
          relationship.id,
          coupleId,
          userId,
        );
      }

      // Broadcast relationship change for real-time updates
      await this.broadcastRelationshipChange('created', relationship, coupleId);

      return { relationship, warnings };
    } catch (error) {
      throw new Error(
        `Relationship creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update an existing relationship with validation
   */
  async updateRelationship(
    relationshipId: string,
    coupleId: string,
    updateData: RelationshipUpdateRequest,
    userId?: string,
  ): Promise<{ relationship: GuestRelationship; warnings: string[] }> {
    // Validate input data
    const validatedData = relationshipUpdateSchema.parse(updateData);

    try {
      // Verify ownership and get current relationship
      const currentRelationship = await this.getRelationshipById(
        relationshipId,
        coupleId,
      );
      if (!currentRelationship) {
        throw new Error('Relationship not found or access denied');
      }

      const warnings: string[] = [];

      // Check if severity change creates new conflicts
      if (
        validatedData.conflict_severity &&
        validatedData.conflict_severity !==
          currentRelationship.conflict_severity
      ) {
        const severityChange = this.analyzeSeverityChange(
          currentRelationship.conflict_severity,
          validatedData.conflict_severity,
        );

        if (severityChange.warning) {
          warnings.push(severityChange.warning);
        }
      }

      // Update the relationship
      const { data: updatedRelationship, error } = await this.supabase
        .from('guest_relationships')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', relationshipId)
        .eq('couple_id', coupleId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update relationship: ${error.message}`);
      }

      // Update reverse relationship if bidirectional
      if (
        currentRelationship.is_bidirectional ||
        validatedData.is_bidirectional
      ) {
        await this.updateReverseRelationship(updatedRelationship, coupleId);
      }

      // Log audit trail
      if (this.auditLogEnabled) {
        await this.logRelationshipAction(
          'update',
          relationshipId,
          coupleId,
          userId,
          {
            changes: validatedData,
            previous_values: currentRelationship,
          },
        );
      }

      // Broadcast relationship change
      await this.broadcastRelationshipChange(
        'updated',
        updatedRelationship,
        coupleId,
      );

      return { relationship: updatedRelationship, warnings };
    } catch (error) {
      throw new Error(
        `Relationship update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a relationship with cascade handling
   */
  async deleteRelationship(
    relationshipId: string,
    coupleId: string,
    userId?: string,
  ): Promise<{ deleted: boolean; warnings: string[] }> {
    try {
      // Get relationship before deletion for audit and reverse relationship handling
      const relationship = await this.getRelationshipById(
        relationshipId,
        coupleId,
      );
      if (!relationship) {
        throw new Error('Relationship not found or access denied');
      }

      const warnings: string[] = [];

      // Delete reverse relationship if bidirectional
      if (relationship.is_bidirectional) {
        await this.deleteReverseRelationship(relationship, coupleId);
      }

      // Delete the main relationship
      const { error } = await this.supabase
        .from('guest_relationships')
        .delete()
        .eq('id', relationshipId)
        .eq('couple_id', coupleId);

      if (error) {
        throw new Error(`Failed to delete relationship: ${error.message}`);
      }

      // Log audit trail
      if (this.auditLogEnabled) {
        await this.logRelationshipAction(
          'delete',
          relationshipId,
          coupleId,
          userId,
          {
            deleted_relationship: relationship,
          },
        );
      }

      // Broadcast relationship change
      await this.broadcastRelationshipChange('deleted', relationship, coupleId);

      return { deleted: true, warnings };
    } catch (error) {
      throw new Error(
        `Relationship deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Query relationships with advanced filtering and pagination
   */
  async queryRelationships(
    coupleId: string,
    options: RelationshipQueryOptions = {},
  ): Promise<{
    relationships: GuestRelationship[];
    total_count: number;
    page: number;
    pages: number;
    has_more: boolean;
  }> {
    // Validate query options
    const validatedOptions = relationshipQuerySchema.parse(options);

    try {
      let query = this.supabase
        .from('guest_relationships')
        .select(
          `
          *,
          guest_1:guests!guest_relationships_guest_id_1_fkey(id, first_name, last_name, email),
          guest_2:guests!guest_relationships_guest_id_2_fkey(id, first_name, last_name, email)
        `,
          { count: 'exact' },
        )
        .eq('couple_id', coupleId);

      // Apply filters
      if (validatedOptions.guest_id) {
        query = query.or(
          `guest_id_1.eq.${validatedOptions.guest_id},guest_id_2.eq.${validatedOptions.guest_id}`,
        );
      }

      if (validatedOptions.relationship_types?.length) {
        query = query.in(
          'relationship_type',
          validatedOptions.relationship_types,
        );
      }

      if (validatedOptions.conflict_severities?.length) {
        query = query.in(
          'conflict_severity',
          validatedOptions.conflict_severities,
        );
      }

      if (validatedOptions.tags?.length) {
        query = query.overlaps('tags', validatedOptions.tags);
      }

      if (validatedOptions.created_after) {
        query = query.gte('created_at', validatedOptions.created_after);
      }

      if (validatedOptions.created_before) {
        query = query.lte('created_at', validatedOptions.created_before);
      }

      if (!validatedOptions.include_bidirectional) {
        query = query.eq('is_bidirectional', false);
      }

      // Apply sorting
      query = query.order(validatedOptions.sort_by, {
        ascending: validatedOptions.sort_order === 'asc',
      });

      // Apply pagination
      const offset = (validatedOptions.page - 1) * validatedOptions.limit;
      query = query.range(offset, offset + validatedOptions.limit - 1);

      const { data: relationships, error, count } = await query;

      if (error) {
        throw new Error(`Failed to query relationships: ${error.message}`);
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / validatedOptions.limit);

      return {
        relationships: relationships || [],
        total_count: totalCount,
        page: validatedOptions.page,
        pages: totalPages,
        has_more: validatedOptions.page < totalPages,
      };
    } catch (error) {
      throw new Error(
        `Relationship query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get relationship analytics for a couple
   */
  async getRelationshipAnalytics(
    coupleId: string,
  ): Promise<RelationshipAnalytics> {
    try {
      const { data: analytics, error } = await this.supabase.rpc(
        'get_relationship_analytics',
        {
          couple_id_param: coupleId,
        },
      );

      if (error) {
        throw new Error(
          `Failed to get relationship analytics: ${error.message}`,
        );
      }

      return (
        analytics?.[0] || {
          total_relationships: 0,
          by_type: {
            family: 0,
            friends: 0,
            work: 0,
            romantic: 0,
            conflict: 0,
            divorced: 0,
            estranged: 0,
          },
          by_severity: {
            incompatible: 0,
            avoid: 0,
            prefer_apart: 0,
            neutral: 0,
            prefer_together: 0,
          },
          bidirectional_count: 0,
          conflict_relationships: 0,
          most_connected_guests: [],
          relationship_density: 0,
        }
      );
    } catch (error) {
      throw new Error(
        `Analytics retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Bulk operations for efficient relationship management
   */
  async executeBulkOperation(
    coupleId: string,
    operation: BulkRelationshipOperation,
    userId?: string,
  ): Promise<BulkOperationResult> {
    const startTime = Date.now();
    const result: BulkOperationResult = {
      successful_count: 0,
      failed_count: 0,
      errors: [],
      warnings: [],
      performance_metrics: {
        total_time_ms: 0,
        validation_time_ms: 0,
        database_time_ms: 0,
      },
    };

    try {
      const batchSize = operation.batch_size || 50;
      const batches = this.createBatches(operation.relationships, batchSize);

      for (const [batchIndex, batch] of batches.entries()) {
        try {
          const batchResult = await this.processBatch(
            coupleId,
            operation.type,
            batch,
            batchIndex * batchSize,
            userId,
          );

          result.successful_count += batchResult.successful_count;
          result.failed_count += batchResult.failed_count;
          result.errors.push(...batchResult.errors);
          result.warnings.push(...batchResult.warnings);
        } catch (error) {
          result.failed_count += batch.length;
          result.errors.push({
            index: batchIndex * batchSize,
            field: 'batch_processing',
            message:
              error instanceof Error
                ? error.message
                : 'Batch processing failed',
          });
        }
      }

      result.performance_metrics.total_time_ms = Date.now() - startTime;
    } catch (error) {
      throw new Error(
        `Bulk operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return result;
  }

  /**
   * Generate relationship suggestions based on existing data patterns
   */
  async generateRelationshipSuggestions(
    coupleId: string,
    options: {
      max_suggestions?: number;
      confidence_threshold?: number;
      include_existing?: boolean;
    } = {},
  ): Promise<RelationshipSuggestion[]> {
    const maxSuggestions = options.max_suggestions || 10;
    const confidenceThreshold = options.confidence_threshold || 70;

    try {
      // Get guests with similar patterns (same last name, similar addresses, etc.)
      const { data: suggestions, error } = await this.supabase.rpc(
        'generate_relationship_suggestions',
        {
          couple_id_param: coupleId,
          max_suggestions_param: maxSuggestions,
          confidence_threshold_param: confidenceThreshold,
          include_existing_param: options.include_existing || false,
        },
      );

      if (error) {
        throw new Error(`Failed to generate suggestions: ${error.message}`);
      }

      return suggestions || [];
    } catch (error) {
      throw new Error(
        `Suggestion generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Import relationships from external sources (CSV, etc.)
   */
  async importRelationships(
    coupleId: string,
    importData: Array<{
      guest_1_identifier: string; // email, name, or ID
      guest_2_identifier: string;
      relationship_type: string;
      conflict_severity?: string;
      notes?: string;
    }>,
    userId?: string,
  ): Promise<{
    imported_count: number;
    skipped_count: number;
    error_count: number;
    errors: string[];
  }> {
    const result = {
      imported_count: 0,
      skipped_count: 0,
      error_count: 0,
      errors: [],
    };

    try {
      // Process each import row
      for (const [index, row] of importData.entries()) {
        try {
          // Resolve guest identifiers to IDs
          const guest1Id = await this.resolveGuestIdentifier(
            coupleId,
            row.guest_1_identifier,
          );
          const guest2Id = await this.resolveGuestIdentifier(
            coupleId,
            row.guest_2_identifier,
          );

          if (!guest1Id || !guest2Id) {
            result.skipped_count++;
            result.errors.push(
              `Row ${index + 1}: Could not resolve guest identifiers`,
            );
            continue;
          }

          // Create relationship
          await this.createRelationship(
            coupleId,
            {
              guest_id_1: guest1Id,
              guest_id_2: guest2Id,
              relationship_type: row.relationship_type as RelationshipType,
              conflict_severity:
                (row.conflict_severity as ConflictSeverity) || 'neutral',
              notes: row.notes,
              is_bidirectional: true,
            },
            userId,
          );

          result.imported_count++;
        } catch (error) {
          result.error_count++;
          result.errors.push(
            `Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    } catch (error) {
      throw new Error(
        `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return result;
  }

  /**
   * Private helper methods
   */
  private async verifyGuestOwnership(
    coupleId: string,
    guestIds: string[],
  ): Promise<void> {
    const { data: ownership, error } = await this.supabase.rpc(
      'verify_guest_ownership',
      {
        couple_id_param: coupleId,
        guest_ids_param: guestIds,
      },
    );

    if (error || !ownership || ownership.length !== guestIds.length) {
      throw new Error(
        'Unauthorized access to guest data. Some guests do not belong to this couple.',
      );
    }
  }

  private async getRelationshipById(
    relationshipId: string,
    coupleId: string,
  ): Promise<GuestRelationship | null> {
    const { data: relationship, error } = await this.supabase
      .from('guest_relationships')
      .select('*')
      .eq('id', relationshipId)
      .eq('couple_id', coupleId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Not found error is OK
      throw new Error(`Failed to fetch relationship: ${error.message}`);
    }

    return relationship;
  }

  private async findExistingRelationship(
    coupleId: string,
    guestId1: string,
    guestId2: string,
  ): Promise<GuestRelationship | null> {
    const { data: relationship } = await this.supabase
      .from('guest_relationships')
      .select('*')
      .eq('couple_id', coupleId)
      .or(
        `and(guest_id_1.eq.${guestId1},guest_id_2.eq.${guestId2}),and(guest_id_1.eq.${guestId2},guest_id_2.eq.${guestId1})`,
      )
      .single();

    return relationship;
  }

  private async createReverseRelationship(
    relationship: GuestRelationship,
    coupleId: string,
    userId?: string,
  ): Promise<void> {
    await this.supabase.from('guest_relationships').insert({
      couple_id: coupleId,
      guest_id_1: relationship.guest_id_2,
      guest_id_2: relationship.guest_id_1,
      relationship_type: relationship.relationship_type,
      conflict_severity: relationship.conflict_severity,
      notes: relationship.notes,
      is_bidirectional: false, // Reverse relationship is not bidirectional
      tags: relationship.tags,
      created_by: userId || 'system',
      reverse_of: relationship.id,
    });
  }

  private async updateReverseRelationship(
    relationship: GuestRelationship,
    coupleId: string,
  ): Promise<void> {
    await this.supabase
      .from('guest_relationships')
      .update({
        relationship_type: relationship.relationship_type,
        conflict_severity: relationship.conflict_severity,
        notes: relationship.notes,
        tags: relationship.tags,
        updated_at: new Date().toISOString(),
      })
      .eq('reverse_of', relationship.id)
      .eq('couple_id', coupleId);
  }

  private async deleteReverseRelationship(
    relationship: GuestRelationship,
    coupleId: string,
  ): Promise<void> {
    await this.supabase
      .from('guest_relationships')
      .delete()
      .eq('reverse_of', relationship.id)
      .eq('couple_id', coupleId);
  }

  private analyzeSeverityChange(
    oldSeverity: ConflictSeverity,
    newSeverity: ConflictSeverity,
  ): { warning?: string } {
    const severityLevels = {
      prefer_together: 1,
      neutral: 2,
      prefer_apart: 3,
      avoid: 4,
      incompatible: 5,
    };

    const oldLevel = severityLevels[oldSeverity];
    const newLevel = severityLevels[newSeverity];

    if (newLevel > oldLevel && newLevel >= 4) {
      return {
        warning:
          'Increasing conflict severity may create seating conflicts that require immediate attention.',
      };
    }

    return {};
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(
    coupleId: string,
    operationType: string,
    batch: any[],
    startIndex: number,
    userId?: string,
  ): Promise<BulkOperationResult> {
    // Implementation would process batch operations efficiently
    // This is a simplified version
    const result: BulkOperationResult = {
      successful_count: 0,
      failed_count: 0,
      errors: [],
      warnings: [],
      performance_metrics: {
        total_time_ms: 0,
        validation_time_ms: 0,
        database_time_ms: 0,
      },
    };

    for (const [index, item] of batch.entries()) {
      try {
        switch (operationType) {
          case 'create':
            await this.createRelationship(coupleId, item, userId);
            result.successful_count++;
            break;
          case 'update':
            await this.updateRelationship(item.id, coupleId, item, userId);
            result.successful_count++;
            break;
          case 'delete':
            await this.deleteRelationship(item.id, coupleId, userId);
            result.successful_count++;
            break;
        }
      } catch (error) {
        result.failed_count++;
        result.errors.push({
          index: startIndex + index,
          field: 'operation',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  private async resolveGuestIdentifier(
    coupleId: string,
    identifier: string,
  ): Promise<string | null> {
    // Try to resolve by ID first
    if (
      identifier.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      return identifier;
    }

    // Try to resolve by email
    if (identifier.includes('@')) {
      const { data: guest } = await this.supabase
        .from('guests')
        .select('id')
        .eq('couple_id', coupleId)
        .eq('email', identifier)
        .single();

      return guest?.id || null;
    }

    // Try to resolve by name
    const [firstName, lastName] = identifier.split(' ');
    if (firstName && lastName) {
      const { data: guest } = await this.supabase
        .from('guests')
        .select('id')
        .eq('couple_id', coupleId)
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .single();

      return guest?.id || null;
    }

    return null;
  }

  private async logRelationshipAction(
    action: string,
    relationshipId: string,
    coupleId: string,
    userId?: string,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.supabase.from('relationship_audit_log').insert({
        relationship_id: relationshipId,
        couple_id: coupleId,
        action,
        user_id: userId,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Non-critical - log but don't fail the operation
      console.warn('Failed to log relationship action:', error);
    }
  }

  private async broadcastRelationshipChange(
    changeType: 'created' | 'updated' | 'deleted',
    relationship: GuestRelationship,
    coupleId: string,
  ): Promise<void> {
    const event: GuestSyncEvent = {
      type: 'guest_updated',
      data: {
        relationship_change: changeType,
        relationship_id: relationship.id,
        conflict_severity: relationship.conflict_severity,
      },
      metadata: {
        source: 'guest_list',
        timestamp: new Date().toISOString(),
        integration_updates: ['rsvp', 'website', 'tasks'],
      },
    };

    await guestSyncManager.broadcastIntegrationUpdate(event);
  }

  /**
   * Utility methods for service management
   */
  setAuditLogging(enabled: boolean): void {
    this.auditLogEnabled = enabled;
  }

  async getServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    response_time_ms: number;
    database_connection: boolean;
  }> {
    const startTime = Date.now();

    try {
      // Simple health check query
      const { data, error } = await this.supabase
        .from('guest_relationships')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      return {
        status: error ? 'down' : 'healthy',
        response_time_ms: responseTime,
        database_connection: !error,
      };
    } catch (error) {
      return {
        status: 'down',
        response_time_ms: Date.now() - startTime,
        database_connection: false,
      };
    }
  }
}

// Factory function for dependency injection
export async function createRelationshipManagementService(
  serverClient?: ReturnType<typeof createServerClient>,
): Promise<RelationshipManagementService> {
  return new RelationshipManagementService(serverClient);
}

// Export validation schemas for API endpoints
export {
  relationshipCreateSchema,
  relationshipUpdateSchema,
  relationshipQuerySchema,
};
