'use client';

import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { GuestService, GuestAnalytics } from './guestService';
import {
  RelationshipConflictValidator,
  ConflictResult,
  SeatingConflict,
  GuestConflictInfo,
} from './relationship-conflict-validator';
import guestSyncManager, {
  GuestSyncEvent,
  useGuestSync,
} from '@/lib/realtime/guest-sync';
import { z } from 'zod';

// Type definitions for seating integration
export interface SeatingAssignment {
  id: string;
  guest_id: string;
  couple_id: string;
  table_number: number;
  seat_position: string;
  assigned_at: string;
  assigned_by: string;
  is_locked: boolean;
  notes?: string;
}

export interface SeatingTable {
  table_number: number;
  capacity: number;
  occupied_seats: number;
  available_seats: number;
  table_type: 'round' | 'rectangular' | 'cocktail' | 'head_table';
  special_requirements?: string[];
}

export interface SeatingPlan {
  couple_id: string;
  total_tables: number;
  total_capacity: number;
  total_assigned: number;
  unassigned_guests: number;
  tables: SeatingTable[];
  assignments: SeatingAssignment[];
  conflicts: SeatingConflict[];
  last_updated: string;
}

export interface SeatingOperation {
  type: 'assign' | 'reassign' | 'remove' | 'swap' | 'bulk_assign';
  guest_ids: string[];
  table_number?: number;
  seat_positions?: string[];
  reason?: string;
  validate_conflicts: boolean;
}

export interface SeatingOperationResult {
  success: boolean;
  affected_assignments: SeatingAssignment[];
  conflicts_detected: ConflictResult | null;
  warnings: string[];
  errors: string[];
  performance_metrics: {
    operation_time_ms: number;
    validation_time_ms: number;
    sync_time_ms: number;
  };
}

// Validation schemas
const seatingAssignmentSchema = z.object({
  guest_id: z.string().uuid(),
  couple_id: z.string().uuid(),
  table_number: z.number().int().positive().max(100),
  seat_position: z.string().max(10),
  is_locked: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

const seatingOperationSchema = z.object({
  type: z.enum(['assign', 'reassign', 'remove', 'swap', 'bulk_assign']),
  guest_ids: z.array(z.string().uuid()).min(1).max(50),
  table_number: z.number().int().positive().max(100).optional(),
  seat_positions: z.array(z.string().max(10)).optional(),
  reason: z.string().max(200).optional(),
  validate_conflicts: z.boolean().default(true),
});

/**
 * GuestSeatingBridge - Integration layer between guest management and seating systems
 * Coordinates data synchronization, conflict validation, and real-time updates
 */
export class GuestSeatingBridge {
  private supabase = createClient();
  private serverSupabase: ReturnType<typeof createServerClient> | null = null;
  private guestService: GuestService | null = null;
  private conflictValidator: RelationshipConflictValidator | null = null;
  private syncSubscriptions = new Map<string, string>();

  constructor(serverClient?: ReturnType<typeof createServerClient>) {
    this.serverSupabase = serverClient || null;
  }

  /**
   * Initialize bridge with required services
   */
  async initialize(): Promise<void> {
    // Initialize guest service
    if (!this.guestService) {
      const { createGuestService } = await import('./guestService');
      this.guestService = await createGuestService();
    }

    // Initialize conflict validator
    if (!this.conflictValidator) {
      const { createRelationshipConflictValidator } = await import(
        './relationship-conflict-validator'
      );
      this.conflictValidator = await createRelationshipConflictValidator(
        this.serverSupabase,
      );
    }
  }

  /**
   * Execute seating operation with full integration and conflict validation
   */
  async executeSeatingOperation(
    coupleId: string,
    operation: SeatingOperation,
  ): Promise<SeatingOperationResult> {
    const startTime = Date.now();
    const result: SeatingOperationResult = {
      success: false,
      affected_assignments: [],
      conflicts_detected: null,
      warnings: [],
      errors: [],
      performance_metrics: {
        operation_time_ms: 0,
        validation_time_ms: 0,
        sync_time_ms: 0,
      },
    };

    try {
      // Validate operation parameters
      const validatedOperation = seatingOperationSchema.parse(operation);

      // Verify guest ownership
      await this.verifyGuestOwnership(coupleId, validatedOperation.guest_ids);

      // Execute operation based on type
      const operationStartTime = Date.now();

      switch (validatedOperation.type) {
        case 'assign':
          result.affected_assignments = await this.handleAssignOperation(
            coupleId,
            validatedOperation,
          );
          break;
        case 'reassign':
          result.affected_assignments = await this.handleReassignOperation(
            coupleId,
            validatedOperation,
          );
          break;
        case 'remove':
          result.affected_assignments = await this.handleRemoveOperation(
            coupleId,
            validatedOperation,
          );
          break;
        case 'swap':
          result.affected_assignments = await this.handleSwapOperation(
            coupleId,
            validatedOperation,
          );
          break;
        case 'bulk_assign':
          result.affected_assignments = await this.handleBulkAssignOperation(
            coupleId,
            validatedOperation,
          );
          break;
      }

      result.performance_metrics.operation_time_ms =
        Date.now() - operationStartTime;

      // Validate conflicts if requested
      if (validatedOperation.validate_conflicts && this.conflictValidator) {
        const validationStartTime = Date.now();

        // Get all affected guest IDs for validation
        const affectedGuestIds = result.affected_assignments.map(
          (a) => a.guest_id,
        );
        const tableNumbers = [
          ...new Set(result.affected_assignments.map((a) => a.table_number)),
        ];

        // Validate each affected table
        for (const tableNumber of tableNumbers) {
          const tableGuestIds = await this.getTableGuestIds(
            coupleId,
            tableNumber,
          );
          const conflictResult =
            await this.conflictValidator.validateSeatingConflict(
              coupleId,
              tableGuestIds,
              tableNumber,
            );

          if (conflictResult.has_conflicts) {
            result.conflicts_detected = conflictResult;
            result.warnings.push(`Conflicts detected at table ${tableNumber}`);
          }
        }

        result.performance_metrics.validation_time_ms =
          Date.now() - validationStartTime;
      }

      // Synchronize with guest management system
      const syncStartTime = Date.now();
      await this.synchronizeGuestData(coupleId, result.affected_assignments);
      result.performance_metrics.sync_time_ms = Date.now() - syncStartTime;

      // Broadcast changes to real-time subscribers
      await this.broadcastSeatingChanges(
        coupleId,
        operation,
        result.affected_assignments,
      );

      result.success = true;
      result.performance_metrics.operation_time_ms = Date.now() - startTime;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
      result.performance_metrics.operation_time_ms = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Get complete seating plan with guest information and conflicts
   */
  async getSeatingPlan(coupleId: string): Promise<SeatingPlan> {
    const [assignments, tables, analytics] = await Promise.all([
      this.getSeatingAssignments(coupleId),
      this.getSeatingTables(coupleId),
      this.guestService?.calculateGuestCounts(coupleId),
    ]);

    // Get conflict validation for entire seating plan
    let conflicts: SeatingConflict[] = [];
    if (this.conflictValidator) {
      const validation =
        await this.conflictValidator.validateEntireSeatingPlan(coupleId);
      conflicts = Array.from(validation.tables.values()).flatMap(
        (result) => result.conflicts,
      );
    }

    const totalCapacity = tables.reduce(
      (sum, table) => sum + table.capacity,
      0,
    );
    const totalAssigned = assignments.length;
    const unassignedGuests = (analytics?.total_guests || 0) - totalAssigned;

    return {
      couple_id: coupleId,
      total_tables: tables.length,
      total_capacity: totalCapacity,
      total_assigned: totalAssigned,
      unassigned_guests: Math.max(0, unassignedGuests),
      tables,
      assignments,
      conflicts,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Sync guest changes with seating assignments
   */
  async syncGuestChanges(event: GuestSyncEvent): Promise<void> {
    if (!event.guest_id || !event.metadata?.source) {
      return;
    }

    const coupleId = event.data?.couple_id;
    if (!coupleId) {
      return;
    }

    try {
      switch (event.type) {
        case 'guest_created':
          await this.handleGuestCreated(coupleId, event.guest_id);
          break;
        case 'guest_updated':
          await this.handleGuestUpdated(coupleId, event.guest_id, event.data);
          break;
        case 'guest_deleted':
          await this.handleGuestDeleted(coupleId, event.guest_id);
          break;
        case 'rsvp_updated':
          await this.handleRSVPUpdated(coupleId, event.guest_id, event.data);
          break;
      }

      // Validate conflicts after changes
      if (this.conflictValidator) {
        const conflictResult =
          await this.conflictValidator.validateRealTimeChanges(event);
        if (conflictResult?.has_conflicts) {
          await this.broadcastConflictAlert(coupleId, conflictResult);
        }
      }
    } catch (error) {
      console.error('Failed to sync guest changes with seating:', error);
    }
  }

  /**
   * Subscribe to real-time guest updates for seating sync
   */
  subscribeToGuestUpdates(coupleId: string): string {
    const subscriptionId = guestSyncManager.subscribeToGuestUpdates(
      coupleId,
      (event) => this.syncGuestChanges(event),
      {
        includeRSVP: true,
        includeTasks: false,
        includeBudget: false,
        includeWebsite: false,
      },
    );

    this.syncSubscriptions.set(coupleId, subscriptionId);
    return subscriptionId;
  }

  /**
   * Unsubscribe from guest updates
   */
  unsubscribeFromGuestUpdates(coupleId: string): void {
    const subscriptionId = this.syncSubscriptions.get(coupleId);
    if (subscriptionId) {
      guestSyncManager.unsubscribe(subscriptionId);
      this.syncSubscriptions.delete(coupleId);
    }
  }

  /**
   * Generate optimal seating suggestions based on guest relationships
   */
  async generateSeatingOptimizationSuggestions(
    coupleId: string,
    options: {
      prioritize_families: boolean;
      avoid_conflicts: boolean;
      balance_sides: boolean;
      max_table_capacity: number;
    } = {
      prioritize_families: true,
      avoid_conflicts: true,
      balance_sides: true,
      max_table_capacity: 10,
    },
  ): Promise<{
    suggested_assignments: SeatingAssignment[];
    optimization_score: number;
    reasoning: string[];
    warnings: string[];
  }> {
    const guests = await this.getUnassignedGuests(coupleId);
    const relationships = await this.getGuestRelationships(coupleId);
    const availableTables = await this.getAvailableTables(coupleId);

    // This would integrate with Team B's optimization algorithm
    // For now, providing a basic family-based grouping approach

    const suggestions: SeatingAssignment[] = [];
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Group guests by family relationships
    const familyGroups = this.groupGuestsByFamily(guests, relationships);

    let currentTable = 1;
    let currentCapacity = 0;
    const maxCapacity = options.max_table_capacity;

    for (const [familyName, familyMembers] of familyGroups.entries()) {
      if (currentCapacity + familyMembers.length > maxCapacity) {
        currentTable++;
        currentCapacity = 0;
      }

      for (const [index, guest] of familyMembers.entries()) {
        suggestions.push({
          id: `suggestion_${guest.id}`,
          guest_id: guest.id,
          couple_id: coupleId,
          table_number: currentTable,
          seat_position: `${index + 1}`,
          assigned_at: new Date().toISOString(),
          assigned_by: 'system',
          is_locked: false,
          notes: `Auto-assigned with ${familyName} family group`,
        });
      }

      currentCapacity += familyMembers.length;
      reasoning.push(
        `Grouped ${familyName} family together at table ${currentTable}`,
      );
    }

    // Calculate optimization score (0-100)
    const optimizationScore = this.calculateOptimizationScore(
      suggestions,
      relationships,
      options,
    );

    return {
      suggested_assignments: suggestions,
      optimization_score: optimizationScore,
      reasoning,
      warnings,
    };
  }

  /**
   * Private helper methods for seating operations
   */
  private async handleAssignOperation(
    coupleId: string,
    operation: SeatingOperation,
  ): Promise<SeatingAssignment[]> {
    const assignments: SeatingAssignment[] = [];

    for (const [index, guestId] of operation.guest_ids.entries()) {
      const assignment: SeatingAssignment = {
        id: `assign_${Date.now()}_${index}`,
        guest_id: guestId,
        couple_id: coupleId,
        table_number: operation.table_number!,
        seat_position: operation.seat_positions?.[index] || `${index + 1}`,
        assigned_at: new Date().toISOString(),
        assigned_by: 'user',
        is_locked: false,
        notes: operation.reason,
      };

      const { error } = await this.supabase
        .from('seating_assignments')
        .insert(assignment);

      if (!error) {
        assignments.push(assignment);
      }
    }

    return assignments;
  }

  private async handleReassignOperation(
    coupleId: string,
    operation: SeatingOperation,
  ): Promise<SeatingAssignment[]> {
    const assignments: SeatingAssignment[] = [];

    for (const [index, guestId] of operation.guest_ids.entries()) {
      const { data: updated, error } = await this.supabase
        .from('seating_assignments')
        .update({
          table_number: operation.table_number!,
          seat_position: operation.seat_positions?.[index] || `${index + 1}`,
          assigned_at: new Date().toISOString(),
          notes: operation.reason,
        })
        .eq('guest_id', guestId)
        .eq('couple_id', coupleId)
        .select()
        .single();

      if (!error && updated) {
        assignments.push(updated);
      }
    }

    return assignments;
  }

  private async handleRemoveOperation(
    coupleId: string,
    operation: SeatingOperation,
  ): Promise<SeatingAssignment[]> {
    const { data: removed, error } = await this.supabase
      .from('seating_assignments')
      .delete()
      .eq('couple_id', coupleId)
      .in('guest_id', operation.guest_ids)
      .select();

    return removed || [];
  }

  private async handleSwapOperation(
    coupleId: string,
    operation: SeatingOperation,
  ): Promise<SeatingAssignment[]> {
    if (operation.guest_ids.length !== 2) {
      throw new Error('Swap operation requires exactly 2 guests');
    }

    // Get current assignments
    const { data: currentAssignments } = await this.supabase
      .from('seating_assignments')
      .select('*')
      .eq('couple_id', coupleId)
      .in('guest_id', operation.guest_ids);

    if (!currentAssignments || currentAssignments.length !== 2) {
      throw new Error('Both guests must have current assignments to swap');
    }

    // Swap the assignments
    const [assignment1, assignment2] = currentAssignments;
    const temp = {
      table_number: assignment1.table_number,
      seat_position: assignment1.seat_position,
    };

    const { data: updated1 } = await this.supabase
      .from('seating_assignments')
      .update({
        table_number: assignment2.table_number,
        seat_position: assignment2.seat_position,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', assignment1.id)
      .select()
      .single();

    const { data: updated2 } = await this.supabase
      .from('seating_assignments')
      .update({
        table_number: temp.table_number,
        seat_position: temp.seat_position,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', assignment2.id)
      .select()
      .single();

    return [updated1, updated2].filter(Boolean);
  }

  private async handleBulkAssignOperation(
    coupleId: string,
    operation: SeatingOperation,
  ): Promise<SeatingAssignment[]> {
    // Use transaction for bulk assignment
    const { data: assignments, error } = await this.supabase.rpc(
      'bulk_assign_seating',
      {
        couple_id_param: coupleId,
        guest_ids_param: operation.guest_ids,
        table_number_param: operation.table_number!,
        reason_param: operation.reason || 'Bulk assignment',
      },
    );

    if (error) {
      throw new Error(`Bulk assignment failed: ${error.message}`);
    }

    return assignments || [];
  }

  private async handleGuestCreated(
    coupleId: string,
    guestId: string,
  ): Promise<void> {
    // New guest created - no immediate seating action needed
    // Could trigger auto-assignment if configured
  }

  private async handleGuestUpdated(
    coupleId: string,
    guestId: string,
    data: any,
  ): Promise<void> {
    // Check if guest updates affect seating (e.g., plus one changes)
    if (data.plus_one !== undefined) {
      await this.handlePlusOneChange(coupleId, guestId, data.plus_one);
    }
  }

  private async handleGuestDeleted(
    coupleId: string,
    guestId: string,
  ): Promise<void> {
    // Remove seating assignment for deleted guest
    await this.supabase
      .from('seating_assignments')
      .delete()
      .eq('guest_id', guestId)
      .eq('couple_id', coupleId);
  }

  private async handleRSVPUpdated(
    coupleId: string,
    guestId: string,
    data: any,
  ): Promise<void> {
    if (data.rsvp_status === 'declined') {
      // Remove seating assignment for declined guests
      await this.handleGuestDeleted(coupleId, guestId);
    }
  }

  private async handlePlusOneChange(
    coupleId: string,
    guestId: string,
    hasPlusOne: boolean,
  ): Promise<void> {
    // Adjust table capacity or assignment based on plus one status
    // Implementation would depend on specific business rules
  }

  /**
   * Utility methods
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
      throw new Error('Unauthorized access to guest data');
    }
  }

  private async getSeatingAssignments(
    coupleId: string,
  ): Promise<SeatingAssignment[]> {
    const { data, error } = await this.supabase
      .from('seating_assignments')
      .select('*')
      .eq('couple_id', coupleId)
      .order('table_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch seating assignments: ${error.message}`);
    }

    return data || [];
  }

  private async getSeatingTables(coupleId: string): Promise<SeatingTable[]> {
    const { data, error } = await this.supabase.rpc(
      'get_seating_tables_summary',
      {
        couple_id_param: coupleId,
      },
    );

    if (error) {
      throw new Error(`Failed to fetch seating tables: ${error.message}`);
    }

    return data || [];
  }

  private async getTableGuestIds(
    coupleId: string,
    tableNumber: number,
  ): Promise<string[]> {
    const { data } = await this.supabase
      .from('seating_assignments')
      .select('guest_id')
      .eq('couple_id', coupleId)
      .eq('table_number', tableNumber);

    return data?.map((item) => item.guest_id) || [];
  }

  private async synchronizeGuestData(
    coupleId: string,
    assignments: SeatingAssignment[],
  ): Promise<void> {
    // Update guest records with seating information
    for (const assignment of assignments) {
      await this.supabase
        .from('guests')
        .update({
          table_number: assignment.table_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignment.guest_id)
        .eq('couple_id', coupleId);
    }
  }

  private async broadcastSeatingChanges(
    coupleId: string,
    operation: SeatingOperation,
    assignments: SeatingAssignment[],
  ): Promise<void> {
    const event: GuestSyncEvent = {
      type: 'guest_updated',
      data: {
        operation_type: operation.type,
        affected_assignments: assignments.length,
        table_numbers: [...new Set(assignments.map((a) => a.table_number))],
      },
      metadata: {
        source: 'seating',
        timestamp: new Date().toISOString(),
        integration_updates: ['guest_list', 'website'],
      },
    };

    await guestSyncManager.broadcastIntegrationUpdate(event);
  }

  private async broadcastConflictAlert(
    coupleId: string,
    conflictResult: ConflictResult,
  ): Promise<void> {
    const event: GuestSyncEvent = {
      type: 'guest_updated',
      data: {
        conflict_detected: true,
        severity_score: conflictResult.severity_score,
        conflicts_count: conflictResult.conflicts.length,
      },
      metadata: {
        source: 'seating',
        timestamp: new Date().toISOString(),
        integration_updates: ['guest_list', 'website'],
      },
    };

    await guestSyncManager.broadcastIntegrationUpdate(event);
  }

  private async getUnassignedGuests(coupleId: string): Promise<any[]> {
    const { data } = await this.supabase.rpc('get_unassigned_guests', {
      couple_id_param: coupleId,
    });

    return data || [];
  }

  private async getGuestRelationships(coupleId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('guest_relationships')
      .select('*')
      .eq('couple_id', coupleId);

    return data || [];
  }

  private async getAvailableTables(coupleId: string): Promise<number[]> {
    const { data } = await this.supabase.rpc('get_available_tables', {
      couple_id_param: coupleId,
    });

    return data || [];
  }

  private groupGuestsByFamily(
    guests: any[],
    relationships: any[],
  ): Map<string, any[]> {
    const families = new Map<string, any[]>();

    // Simple family grouping by last name
    for (const guest of guests) {
      const familyName = guest.last_name || 'Unknown';
      if (!families.has(familyName)) {
        families.set(familyName, []);
      }
      families.get(familyName)!.push(guest);
    }

    return families;
  }

  private calculateOptimizationScore(
    suggestions: SeatingAssignment[],
    relationships: any[],
    options: any,
  ): number {
    // Simplified scoring - would integrate with Team B's algorithm
    let score = 50; // Base score

    // Bonus for family groupings
    if (options.prioritize_families) {
      score += 20;
    }

    // Penalty for conflicts
    if (
      options.avoid_conflicts &&
      relationships.some((r) => r.conflict_severity !== 'neutral')
    ) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Unsubscribe from all guest updates
    for (const [coupleId] of this.syncSubscriptions) {
      this.unsubscribeFromGuestUpdates(coupleId);
    }

    // Clear conflict validator cache if available
    if (this.conflictValidator) {
      this.conflictValidator.clearCache();
    }
  }
}

// Factory function for dependency injection
export async function createGuestSeatingBridge(
  serverClient?: ReturnType<typeof createServerClient>,
): Promise<GuestSeatingBridge> {
  const bridge = new GuestSeatingBridge(serverClient);
  await bridge.initialize();
  return bridge;
}

// Export schemas for API validation
export { seatingAssignmentSchema, seatingOperationSchema };
