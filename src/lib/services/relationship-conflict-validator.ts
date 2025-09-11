'use client';

import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { z } from 'zod';
import { GuestService } from './guestService';
import guestSyncManager, { GuestSyncEvent } from '@/lib/realtime/guest-sync';

// Type definitions for conflict detection
export type ConflictSeverity =
  | 'incompatible'
  | 'avoid'
  | 'prefer_apart'
  | 'neutral'
  | 'prefer_together';
export type RelationshipType =
  | 'family'
  | 'friends'
  | 'work'
  | 'romantic'
  | 'conflict'
  | 'divorced'
  | 'estranged';

export interface GuestRelationship {
  id: string;
  guest_id_1: string;
  guest_id_2: string;
  relationship_type: RelationshipType;
  conflict_severity: ConflictSeverity;
  notes?: string;
  is_bidirectional: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ConflictResult {
  has_conflicts: boolean;
  conflicts: SeatingConflict[];
  severity_score: number;
  resolution_suggestions: ResolutionSuggestion[];
  performance_metrics: {
    validation_time_ms: number;
    queries_executed: number;
    cache_hits: number;
  };
}

export interface SeatingConflict {
  id: string;
  guest_1: GuestConflictInfo;
  guest_2: GuestConflictInfo;
  relationship: GuestRelationship;
  severity: ConflictSeverity;
  conflict_reason: string;
  table_number?: number;
  seating_assignment_id?: string;
  confidence_score: number;
  auto_resolvable: boolean;
}

export interface GuestConflictInfo {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  category: string;
  side: string;
  current_table?: number;
  current_seat?: string;
}

export interface ResolutionSuggestion {
  type:
    | 'separate_tables'
    | 'swap_guest'
    | 'remove_assignment'
    | 'create_buffer'
    | 'manual_review';
  description: string;
  affected_guests: string[];
  confidence: number;
  effort_level: 'low' | 'medium' | 'high';
  suggested_changes: TableAssignmentChange[];
}

export interface TableAssignmentChange {
  guest_id: string;
  current_table?: number;
  suggested_table: number;
  reason: string;
}

// Validation schemas
const relationshipSchema = z.object({
  guest_id_1: z.string().uuid(),
  guest_id_2: z.string().uuid(),
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
  notes: z.string().optional(),
  is_bidirectional: z.boolean().default(true),
});

const seatingValidationSchema = z.object({
  couple_id: z.string().uuid(),
  guest_ids: z.array(z.string().uuid()).min(1),
  table_number: z.number().int().positive().optional(),
  validate_realtime: z.boolean().default(true),
});

/**
 * RelationshipConflictValidator - Core service for detecting seating conflicts
 * Integrates with existing guest management and provides real-time conflict detection
 */
export class RelationshipConflictValidator {
  private supabase = createClient();
  private serverSupabase: ReturnType<typeof createServerClient> | null = null;
  private guestService: GuestService | null = null;
  private performanceCache = new Map<string, ConflictResult>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(serverClient?: ReturnType<typeof createServerClient>) {
    this.serverSupabase = serverClient || null;
  }

  /**
   * Initialize service with guest service integration
   */
  async initialize(): Promise<void> {
    if (!this.guestService) {
      const { createGuestService } = await import('./guestService');
      this.guestService = await createGuestService();
    }
  }

  /**
   * Validate seating conflicts for a group of guests
   * SECURITY: Verifies couple ownership before accessing relationship data
   */
  async validateSeatingConflict(
    coupleId: string,
    guestIds: string[],
    tableNumber?: number,
  ): Promise<ConflictResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(coupleId, guestIds, tableNumber);

    // Check cache for performance
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return {
        ...cached,
        performance_metrics: {
          ...cached.performance_metrics,
          validation_time_ms: Date.now() - startTime,
          cache_hits: cached.performance_metrics.cache_hits + 1,
        },
      };
    }

    try {
      // CRITICAL: Verify couple owns all guest data being accessed
      await this.verifyCoupleGuestOwnership(coupleId, guestIds);

      // Get guest information with conflict analysis
      const guests = await this.getGuestConflictInfo(coupleId, guestIds);

      // Get relationships between all guests
      const relationships = await this.getGuestRelationships(
        coupleId,
        guestIds,
      );

      // Analyze conflicts
      const conflicts = await this.analyzeConflicts(guests, relationships);

      // Calculate severity score
      const severityScore = this.calculateSeverityScore(conflicts);

      // Generate resolution suggestions
      const suggestions = await this.generateResolutionSuggestions(
        conflicts,
        guests,
        tableNumber,
      );

      const result: ConflictResult = {
        has_conflicts: conflicts.length > 0,
        conflicts,
        severity_score: severityScore,
        resolution_suggestions: suggestions,
        performance_metrics: {
          validation_time_ms: Date.now() - startTime,
          queries_executed: 3 + (relationships.length > 0 ? 1 : 0),
          cache_hits: 0,
        },
      };

      // Cache result for performance
      this.setCachedResult(cacheKey, result);

      return result;
    } catch (error) {
      throw new Error(
        `Conflict validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Real-time conflict validation triggered by guest sync events
   */
  async validateRealTimeChanges(
    event: GuestSyncEvent,
  ): Promise<ConflictResult | null> {
    if (!event.guest_id || !event.metadata?.source) {
      return null;
    }

    // Extract couple ID from event data
    const coupleId = event.data?.couple_id;
    if (!coupleId) {
      return null;
    }

    // Get current seating assignment for the changed guest
    const seatingAssignment = await this.getCurrentSeatingAssignment(
      event.guest_id,
    );
    if (!seatingAssignment) {
      return null; // No seating assignment to validate
    }

    // Get all guests at the same table
    const tableGuestIds = await this.getTableGuestIds(
      coupleId,
      seatingAssignment.table_number,
    );

    // Validate conflicts for the entire table
    return await this.validateSeatingConflict(
      coupleId,
      tableGuestIds,
      seatingAssignment.table_number,
    );
  }

  /**
   * Bulk validation for entire seating plan
   */
  async validateEntireSeatingPlan(coupleId: string): Promise<{
    tables: Map<number, ConflictResult>;
    overall_conflicts: number;
    critical_conflicts: number;
    validation_time_ms: number;
  }> {
    const startTime = Date.now();

    // Get all seating assignments
    const seatingPlan = await this.getSeatingPlan(coupleId);
    const results = new Map<number, ConflictResult>();

    let overallConflicts = 0;
    let criticalConflicts = 0;

    // Validate each table
    for (const [tableNumber, guestIds] of seatingPlan.entries()) {
      const tableResult = await this.validateSeatingConflict(
        coupleId,
        guestIds,
        tableNumber,
      );
      results.set(tableNumber, tableResult);

      overallConflicts += tableResult.conflicts.length;
      criticalConflicts += tableResult.conflicts.filter(
        (c) => c.severity === 'incompatible',
      ).length;
    }

    return {
      tables: results,
      overall_conflicts: overallConflicts,
      critical_conflicts: criticalConflicts,
      validation_time_ms: Date.now() - startTime,
    };
  }

  /**
   * SECURITY: Verify couple ownership before accessing relationship data
   */
  private async verifyCoupleGuestOwnership(
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

    if (error) {
      throw new Error(`Ownership verification failed: ${error.message}`);
    }

    if (!ownership || ownership.length !== guestIds.length) {
      throw new Error(
        'Unauthorized access to guest data. Some guests do not belong to this couple.',
      );
    }
  }

  /**
   * Get guest information optimized for conflict analysis
   */
  private async getGuestConflictInfo(
    coupleId: string,
    guestIds: string[],
  ): Promise<GuestConflictInfo[]> {
    const { data: guests, error } = await this.supabase
      .from('guests')
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        category,
        side,
        seating_assignments!inner(table_number, seat_position)
      `,
      )
      .eq('couple_id', coupleId)
      .in('id', guestIds);

    if (error) {
      throw new Error(`Failed to fetch guest info: ${error.message}`);
    }

    return guests.map((guest) => ({
      id: guest.id,
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email,
      category: guest.category,
      side: guest.side,
      current_table: guest.seating_assignments?.[0]?.table_number,
      current_seat: guest.seating_assignments?.[0]?.seat_position,
    }));
  }

  /**
   * Get relationships between guests with GDPR compliance
   */
  private async getGuestRelationships(
    coupleId: string,
    guestIds: string[],
  ): Promise<GuestRelationship[]> {
    const { data: relationships, error } = await this.supabase
      .from('guest_relationships')
      .select('*')
      .eq('couple_id', coupleId)
      .or(
        `guest_id_1.in.(${guestIds.join(',')}),guest_id_2.in.(${guestIds.join(',')})`,
      )
      .order('conflict_severity', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch relationships: ${error.message}`);
    }

    return relationships || [];
  }

  /**
   * Analyze conflicts based on guest relationships
   */
  private async analyzeConflicts(
    guests: GuestConflictInfo[],
    relationships: GuestRelationship[],
  ): Promise<SeatingConflict[]> {
    const conflicts: SeatingConflict[] = [];

    // Create guest lookup for performance
    const guestLookup = new Map(guests.map((g) => [g.id, g]));

    // Analyze each relationship for conflicts
    for (const relationship of relationships) {
      const guest1 = guestLookup.get(relationship.guest_id_1);
      const guest2 = guestLookup.get(relationship.guest_id_2);

      if (!guest1 || !guest2) continue;

      // Check if guests are at same table (potential conflict)
      const sameTable =
        guest1.current_table &&
        guest2.current_table &&
        guest1.current_table === guest2.current_table;

      // Determine if this is a conflict based on severity and proximity
      const isConflict = this.isSeatingConflict(relationship, sameTable);

      if (isConflict) {
        const conflict: SeatingConflict = {
          id: `conflict_${relationship.id}`,
          guest_1: guest1,
          guest_2: guest2,
          relationship,
          severity: relationship.conflict_severity,
          conflict_reason: this.generateConflictReason(relationship),
          table_number: guest1.current_table,
          confidence_score: this.calculateConflictConfidence(relationship),
          auto_resolvable: this.isAutoResolvable(relationship),
        };

        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  /**
   * Determine if relationship creates seating conflict
   */
  private isSeatingConflict(
    relationship: GuestRelationship,
    sameTable: boolean,
  ): boolean {
    switch (relationship.conflict_severity) {
      case 'incompatible':
        return sameTable; // Can't be at same table
      case 'avoid':
        return sameTable; // Should avoid same table
      case 'prefer_apart':
        return sameTable; // Preference to be apart
      case 'prefer_together':
        return !sameTable; // Preference to be together
      case 'neutral':
      default:
        return false; // No conflict
    }
  }

  /**
   * Generate human-readable conflict reason
   */
  private generateConflictReason(relationship: GuestRelationship): string {
    const reasons = {
      incompatible:
        'These guests have an incompatible relationship and cannot be seated together',
      avoid: 'These guests should avoid being seated at the same table',
      prefer_apart: 'These guests would prefer to be seated apart',
      prefer_together: 'These guests would prefer to be seated together',
      neutral: 'No specific seating preference',
    };

    return reasons[relationship.conflict_severity] || 'Unknown conflict type';
  }

  /**
   * Calculate conflict confidence score (0-100)
   */
  private calculateConflictConfidence(relationship: GuestRelationship): number {
    const severityWeights = {
      incompatible: 100,
      avoid: 90,
      prefer_apart: 70,
      prefer_together: 60,
      neutral: 0,
    };

    let confidence = severityWeights[relationship.conflict_severity] || 50;

    // Adjust based on relationship type
    const typeWeights = {
      divorced: 20,
      estranged: 15,
      conflict: 20,
      romantic: -10, // Reduces conflict confidence
      family: -5,
      friends: -5,
      work: 0,
    };

    confidence += typeWeights[relationship.relationship_type] || 0;

    // Has notes increases confidence
    if (relationship.notes && relationship.notes.length > 10) {
      confidence += 10;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Determine if conflict can be auto-resolved
   */
  private isAutoResolvable(relationship: GuestRelationship): boolean {
    // Only auto-resolve low-severity conflicts with high confidence
    return (
      relationship.conflict_severity === 'prefer_apart' &&
      !relationship.notes?.toLowerCase().includes('manual')
    );
  }

  /**
   * Calculate overall severity score for conflicts
   */
  private calculateSeverityScore(conflicts: SeatingConflict[]): number {
    if (conflicts.length === 0) return 0;

    const severityValues = {
      incompatible: 100,
      avoid: 75,
      prefer_apart: 50,
      prefer_together: 25,
      neutral: 0,
    };

    const totalSeverity = conflicts.reduce((sum, conflict) => {
      return (
        sum +
        severityValues[conflict.severity] * (conflict.confidence_score / 100)
      );
    }, 0);

    return Math.round(totalSeverity / conflicts.length);
  }

  /**
   * Generate resolution suggestions for conflicts
   */
  private async generateResolutionSuggestions(
    conflicts: SeatingConflict[],
    guests: GuestConflictInfo[],
    tableNumber?: number,
  ): Promise<ResolutionSuggestion[]> {
    const suggestions: ResolutionSuggestion[] = [];

    for (const conflict of conflicts) {
      // Generate suggestions based on conflict type
      switch (conflict.severity) {
        case 'incompatible':
        case 'avoid':
          suggestions.push(
            await this.generateSeparationSuggestion(conflict, guests),
          );
          break;

        case 'prefer_apart':
          suggestions.push(
            await this.generatePreferenceSuggestion(conflict, guests),
          );
          break;

        case 'prefer_together':
          suggestions.push(
            await this.generateUnificationSuggestion(conflict, guests),
          );
          break;
      }
    }

    // Remove duplicates and sort by confidence
    return suggestions
      .filter(
        (suggestion, index, array) =>
          array.findIndex((s) => s.description === suggestion.description) ===
          index,
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Limit to top 5 suggestions
  }

  /**
   * Generate suggestion to separate conflicting guests
   */
  private async generateSeparationSuggestion(
    conflict: SeatingConflict,
    guests: GuestConflictInfo[],
  ): Promise<ResolutionSuggestion> {
    // Find available tables for relocation
    const availableTables = await this.findAvailableTables(conflict.guest_1.id);

    return {
      type: 'separate_tables',
      description: `Move ${conflict.guest_2.first_name} ${conflict.guest_2.last_name} to a different table to avoid conflict with ${conflict.guest_1.first_name} ${conflict.guest_1.last_name}`,
      affected_guests: [conflict.guest_2.id],
      confidence: conflict.confidence_score,
      effort_level: availableTables.length > 0 ? 'low' : 'high',
      suggested_changes: [
        {
          guest_id: conflict.guest_2.id,
          current_table: conflict.guest_2.current_table,
          suggested_table: availableTables[0] || 99,
          reason: 'Separate from conflicting guest',
        },
      ],
    };
  }

  /**
   * Generate preference-based suggestion
   */
  private async generatePreferenceSuggestion(
    conflict: SeatingConflict,
    guests: GuestConflictInfo[],
  ): Promise<ResolutionSuggestion> {
    return {
      type: 'swap_guest',
      description: `Consider swapping seating to honor preference for ${conflict.guest_1.first_name} and ${conflict.guest_2.first_name} to be seated apart`,
      affected_guests: [conflict.guest_1.id, conflict.guest_2.id],
      confidence: Math.max(50, conflict.confidence_score - 20),
      effort_level: 'medium',
      suggested_changes: [
        {
          guest_id: conflict.guest_2.id,
          current_table: conflict.guest_2.current_table,
          suggested_table: (conflict.guest_2.current_table || 1) + 1,
          reason: 'Honor seating preference',
        },
      ],
    };
  }

  /**
   * Generate unification suggestion for guests who prefer to be together
   */
  private async generateUnificationSuggestion(
    conflict: SeatingConflict,
    guests: GuestConflictInfo[],
  ): Promise<ResolutionSuggestion> {
    return {
      type: 'create_buffer',
      description: `Move ${conflict.guest_2.first_name} to the same table as ${conflict.guest_1.first_name} as they prefer to be seated together`,
      affected_guests: [conflict.guest_2.id],
      confidence: conflict.confidence_score,
      effort_level: 'low',
      suggested_changes: [
        {
          guest_id: conflict.guest_2.id,
          current_table: conflict.guest_2.current_table,
          suggested_table: conflict.guest_1.current_table || 1,
          reason: 'Honor preference to be seated together',
        },
      ],
    };
  }

  /**
   * Performance optimization helpers
   */
  private generateCacheKey(
    coupleId: string,
    guestIds: string[],
    tableNumber?: number,
  ): string {
    const sortedGuests = [...guestIds].sort();
    return `${coupleId}:${sortedGuests.join(',')}:${tableNumber || 'no-table'}`;
  }

  private getCachedResult(cacheKey: string): ConflictResult | null {
    const cached = this.performanceCache.get(cacheKey);
    if (
      cached &&
      Date.now() - cached.performance_metrics.validation_time_ms <
        this.cacheTimeout
    ) {
      return cached;
    }
    return null;
  }

  private setCachedResult(cacheKey: string, result: ConflictResult): void {
    // Limit cache size to prevent memory issues
    if (this.performanceCache.size > 100) {
      const firstKey = this.performanceCache.keys().next().value;
      this.performanceCache.delete(firstKey);
    }
    this.performanceCache.set(cacheKey, result);
  }

  /**
   * Helper methods for database operations
   */
  private async getCurrentSeatingAssignment(
    guestId: string,
  ): Promise<{ table_number: number } | null> {
    const { data } = await this.supabase
      .from('seating_assignments')
      .select('table_number')
      .eq('guest_id', guestId)
      .single();

    return data;
  }

  private async getTableGuestIds(
    coupleId: string,
    tableNumber: number,
  ): Promise<string[]> {
    const { data } = await this.supabase
      .from('seating_assignments')
      .select('guest_id')
      .eq('table_number', tableNumber)
      .eq('couple_id', coupleId);

    return data?.map((item) => item.guest_id) || [];
  }

  private async getSeatingPlan(
    coupleId: string,
  ): Promise<Map<number, string[]>> {
    const { data } = await this.supabase
      .from('seating_assignments')
      .select('table_number, guest_id')
      .eq('couple_id', coupleId);

    const plan = new Map<number, string[]>();

    data?.forEach((assignment) => {
      if (!plan.has(assignment.table_number)) {
        plan.set(assignment.table_number, []);
      }
      plan.get(assignment.table_number)?.push(assignment.guest_id);
    });

    return plan;
  }

  private async findAvailableTables(excludeGuestId: string): Promise<number[]> {
    // Simple implementation - in production would consider table capacity
    const { data } = await this.supabase
      .from('seating_assignments')
      .select('table_number')
      .neq('guest_id', excludeGuestId)
      .order('table_number');

    const usedTables = new Set(data?.map((item) => item.table_number) || []);
    const availableTables: number[] = [];

    // Find gaps in table numbering
    for (let i = 1; i <= 20; i++) {
      if (!usedTables.has(i)) {
        availableTables.push(i);
      }
    }

    return availableTables.slice(0, 3); // Return top 3 options
  }

  /**
   * Clear performance cache
   */
  clearCache(): void {
    this.performanceCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    const totalRequests = Array.from(this.performanceCache.values()).reduce(
      (sum, result) => sum + result.performance_metrics.cache_hits + 1,
      0,
    );

    const totalHits = Array.from(this.performanceCache.values()).reduce(
      (sum, result) => sum + result.performance_metrics.cache_hits,
      0,
    );

    return {
      size: this.performanceCache.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
    };
  }
}

// Factory function for dependency injection
export async function createRelationshipConflictValidator(
  serverClient?: ReturnType<typeof createServerClient>,
): Promise<RelationshipConflictValidator> {
  const validator = new RelationshipConflictValidator(serverClient);
  await validator.initialize();
  return validator;
}

// Export validation schemas for API endpoints
export { relationshipSchema, seatingValidationSchema };
