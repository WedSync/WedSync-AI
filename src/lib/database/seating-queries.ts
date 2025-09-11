/**
 * WS-154 Seating Arrangements System - Database Query Layer
 * Team E - Database Schema & Data Management
 * Optimized for 200+ guest weddings with complex relationships
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ReceptionTable,
  GuestRelationship,
  SeatingArrangement,
  SeatingAssignment,
  SeatingOptimizationRule,
  SeatingArrangementWithDetails,
  ValidationResult,
  OptimizationSuggestion,
  SeatingAnalytics,
  ConflictDetectionResponse,
  CreateReceptionTableInput,
  UpdateReceptionTableInput,
  CreateGuestRelationshipInput,
  UpdateGuestRelationshipInput,
  CreateSeatingArrangementInput,
  UpdateSeatingArrangementInput,
  BulkSeatingAssignmentInput,
  SeatingArrangementFilter,
  GuestRelationshipFilter,
  SeatingAssignmentFilter,
  QueryPerformanceMetrics,
} from '@/types/seating';

export class SeatingQueriesManager {
  private supabase: SupabaseClient | null = null;
  private performanceMetrics: QueryPerformanceMetrics[] = [];

  private async getClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  private logPerformanceMetric(metric: QueryPerformanceMetrics): void {
    this.performanceMetrics.push(metric);
    // Keep only last 100 metrics
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  // ==================================================
  // RECEPTION TABLES OPERATIONS
  // ==================================================

  /**
   * Get all reception tables for a couple with assignments
   */
  async getReceptionTablesWithAssignments(
    coupleId: string,
    arrangementId?: string,
  ): Promise<{
    data: ReceptionTable[] | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      // GUARDIAN FIX: Eliminate N+1 queries with optimized single query approach
      let query = supabase
        .from('reception_tables')
        .select(
          `
          id,
          table_number,
          name,
          capacity,
          table_shape,
          position_x,
          position_y,
          couple_id,
          is_active
        `,
        )
        .eq('couple_id', coupleId)
        .eq('is_active', true);

      const tablesResult = await query.order('table_number', {
        ascending: true,
      });

      if (tablesResult.error) {
        return tablesResult;
      }

      // GUARDIAN FIX: Fetch assignments separately to avoid N+1 queries
      let assignmentsQuery = supabase
        .from('seating_assignments')
        .select(
          `
          id,
          table_id,
          guest_id,
          seat_number,
          seat_position,
          notes,
          arrangement_id,
          guest:guests(
            id,
            first_name,
            last_name,
            email,
            category,
            side,
            age_group,
            plus_one,
            plus_one_name
          )
        `,
        )
        .in('table_id', tablesResult.data?.map((t) => t.id) || []);

      if (arrangementId) {
        assignmentsQuery = assignmentsQuery.eq('arrangement_id', arrangementId);
      }

      const assignmentsResult = await assignmentsQuery;

      // GUARDIAN FIX: Combine results efficiently in memory instead of database
      const tablesWithAssignments =
        tablesResult.data?.map((table) => ({
          ...table,
          assignments:
            assignmentsResult.data?.filter(
              (assignment) => assignment.table_id === table.id,
            ) || [],
        })) || [];

      const result = {
        data: tablesWithAssignments,
        error: null,
      };

      this.logPerformanceMetric({
        query_type: 'get_reception_tables_with_assignments',
        execution_time_ms: Date.now() - startTime,
        rows_examined: result.data?.length || 0,
        rows_returned: result.data?.length || 0,
        index_usage: [
          'idx_reception_tables_couple_id',
          'idx_reception_tables_active',
        ],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Create a new reception table
   */
  async createReceptionTable(
    coupleId: string,
    tableData: CreateReceptionTableInput,
  ): Promise<{
    data: ReceptionTable | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      const result = await supabase
        .from('reception_tables')
        .insert({
          couple_id: coupleId,
          ...tableData,
        })
        .select()
        .single();

      this.logPerformanceMetric({
        query_type: 'create_reception_table',
        execution_time_ms: Date.now() - startTime,
        rows_examined: 1,
        rows_returned: 1,
        index_usage: [],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Update an existing reception table
   */
  async updateReceptionTable(
    tableId: string,
    updates: UpdateReceptionTableInput,
  ): Promise<{
    data: ReceptionTable | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      const { id, ...updateData } = updates;
      const result = await supabase
        .from('reception_tables')
        .update(updateData)
        .eq('id', tableId)
        .select()
        .single();

      this.logPerformanceMetric({
        query_type: 'update_reception_table',
        execution_time_ms: Date.now() - startTime,
        rows_examined: 1,
        rows_returned: 1,
        index_usage: ['primary_key'],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Delete a reception table
   */
  async deleteReceptionTable(
    tableId: string,
    coupleId: string,
  ): Promise<{
    error: any;
  }> {
    const supabase = await this.getClient();

    return await supabase
      .from('reception_tables')
      .delete()
      .eq('id', tableId)
      .eq('couple_id', coupleId);
  }

  // ==================================================
  // GUEST RELATIONSHIPS OPERATIONS
  // ==================================================

  /**
   * Get guest relationships with names (optimized for large datasets)
   */
  async getGuestRelationshipsWithNames(
    coupleId: string,
    filter?: GuestRelationshipFilter,
  ): Promise<{
    data: GuestRelationship[] | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      let query = supabase
        .from('guest_relationships')
        .select(
          `
          *,
          guest1:guests!guest1_id(
            id,
            first_name,
            last_name,
            category,
            side
          ),
          guest2:guests!guest2_id(
            id,
            first_name,
            last_name,
            category,
            side
          )
        `,
        )
        .eq('created_by', coupleId);

      // Apply filters
      if (filter) {
        if (filter.guest_ids) {
          query = query.or(
            `guest1_id.in.(${filter.guest_ids.join(',')}),guest2_id.in.(${filter.guest_ids.join(',')})`,
          );
        }
        if (filter.relationship_types) {
          query = query.in('relationship_type', filter.relationship_types);
        }
        if (filter.seating_preferences) {
          query = query.in('seating_preference', filter.seating_preferences);
        }
        if (filter.min_strength) {
          query = query.gte('relationship_strength', filter.min_strength);
        }
        if (filter.max_strength) {
          query = query.lte('relationship_strength', filter.max_strength);
        }
      }

      const result = await query.order('relationship_strength', {
        ascending: false,
      });

      this.logPerformanceMetric({
        query_type: 'get_guest_relationships_with_names',
        execution_time_ms: Date.now() - startTime,
        rows_examined: result.data?.length || 0,
        rows_returned: result.data?.length || 0,
        index_usage: [
          'idx_guest_relationships_guest1',
          'idx_guest_relationships_guest2',
        ],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Create a new guest relationship
   */
  async createGuestRelationship(
    coupleId: string,
    relationshipData: CreateGuestRelationshipInput,
  ): Promise<{
    data: GuestRelationship | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      // Ensure guest1_id < guest2_id for consistency
      const guest1Id = relationshipData.guest1_id;
      const guest2Id = relationshipData.guest2_id;

      if (guest1Id === guest2Id) {
        return {
          data: null,
          error: new Error('Cannot create relationship with same guest'),
        };
      }

      const result = await supabase
        .from('guest_relationships')
        .insert({
          guest1_id: guest1Id < guest2Id ? guest1Id : guest2Id,
          guest2_id: guest1Id < guest2Id ? guest2Id : guest1Id,
          relationship_type: relationshipData.relationship_type,
          seating_preference: relationshipData.seating_preference,
          relationship_strength: relationshipData.relationship_strength,
          notes: relationshipData.notes,
          created_by: coupleId,
        })
        .select()
        .single();

      this.logPerformanceMetric({
        query_type: 'create_guest_relationship',
        execution_time_ms: Date.now() - startTime,
        rows_examined: 1,
        rows_returned: 1,
        index_usage: [],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Update guest relationship
   */
  async updateGuestRelationship(
    relationshipId: string,
    updates: UpdateGuestRelationshipInput,
  ): Promise<{
    data: GuestRelationship | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      const { id, ...updateData } = updates;
      const result = await supabase
        .from('guest_relationships')
        .update(updateData)
        .eq('id', relationshipId)
        .select()
        .single();

      this.logPerformanceMetric({
        query_type: 'update_guest_relationship',
        execution_time_ms: Date.now() - startTime,
        rows_examined: 1,
        rows_returned: 1,
        index_usage: ['primary_key'],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Delete guest relationship
   */
  async deleteGuestRelationship(
    relationshipId: string,
    coupleId: string,
  ): Promise<{
    error: any;
  }> {
    const supabase = await this.getClient();

    return await supabase
      .from('guest_relationships')
      .delete()
      .eq('id', relationshipId)
      .eq('created_by', coupleId);
  }

  // ==================================================
  // SEATING ARRANGEMENTS OPERATIONS
  // ==================================================

  /**
   * Get seating arrangements with details
   */
  async getSeatingArrangements(
    coupleId: string,
    filter?: SeatingArrangementFilter,
  ): Promise<{
    data: SeatingArrangement[] | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      let query = supabase
        .from('seating_arrangements')
        .select('*')
        .eq('couple_id', coupleId);

      // Apply filters
      if (filter) {
        if (filter.is_active !== undefined) {
          query = query.eq('is_active', filter.is_active);
        }
        if (filter.created_by) {
          query = query.eq('created_by', filter.created_by);
        }
        if (filter.created_after) {
          query = query.gte('created_at', filter.created_after);
        }
        if (filter.created_before) {
          query = query.lte('created_at', filter.created_before);
        }
      }

      const result = await query.order('created_at', { ascending: false });

      this.logPerformanceMetric({
        query_type: 'get_seating_arrangements',
        execution_time_ms: Date.now() - startTime,
        rows_examined: result.data?.length || 0,
        rows_returned: result.data?.length || 0,
        index_usage: [
          'idx_seating_arrangements_couple_id',
          'idx_seating_arrangements_active',
        ],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get detailed seating arrangement with tables and assignments
   */
  async getSeatingArrangementWithDetails(arrangementId: string): Promise<{
    data: SeatingArrangementWithDetails | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      // Get arrangement
      const { data: arrangement, error: arrangementError } = await supabase
        .from('seating_arrangements')
        .select('*')
        .eq('id', arrangementId)
        .single();

      if (arrangementError || !arrangement) {
        return { data: null, error: arrangementError };
      }

      // Get tables with assignments
      const { data: tables, error: tablesError } =
        await this.getReceptionTablesWithAssignments(
          arrangement.couple_id,
          arrangementId,
        );

      if (tablesError) {
        return { data: null, error: tablesError };
      }

      // Calculate totals
      const totalGuests =
        tables?.reduce(
          (sum, table: any) => sum + (table.assignments?.length || 0),
          0,
        ) || 0;
      const totalTables = tables?.length || 0;

      const result: SeatingArrangementWithDetails = {
        ...arrangement,
        tables: tables || [],
        total_guests: totalGuests,
        total_tables: totalTables,
      };

      this.logPerformanceMetric({
        query_type: 'get_seating_arrangement_with_details',
        execution_time_ms: Date.now() - startTime,
        rows_examined: (tables?.length || 0) + 1,
        rows_returned: 1,
        index_usage: ['primary_key', 'idx_reception_tables_couple_id'],
      });

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Create a new seating arrangement
   */
  async createSeatingArrangement(
    coupleId: string,
    arrangementData: CreateSeatingArrangementInput,
  ): Promise<{
    data: SeatingArrangement | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      let newArrangement = {
        couple_id: coupleId,
        name: arrangementData.name,
        description: arrangementData.description,
        is_active: false,
        optimization_score: 0.0,
        created_by: coupleId,
      };

      // If copying from another arrangement
      if (arrangementData.copy_from_arrangement_id) {
        // Implementation for copying would go here
        // This would involve copying all seating assignments
      }

      const result = await supabase
        .from('seating_arrangements')
        .insert(newArrangement)
        .select()
        .single();

      this.logPerformanceMetric({
        query_type: 'create_seating_arrangement',
        execution_time_ms: Date.now() - startTime,
        rows_examined: 1,
        rows_returned: 1,
        index_usage: [],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Update seating arrangement
   */
  async updateSeatingArrangement(
    arrangementId: string,
    updates: UpdateSeatingArrangementInput,
  ): Promise<{
    data: SeatingArrangement | null;
    error: any;
  }> {
    const supabase = await this.getClient();

    const { id, ...updateData } = updates;
    return await supabase
      .from('seating_arrangements')
      .update(updateData)
      .eq('id', arrangementId)
      .select()
      .single();
  }

  /**
   * Delete seating arrangement
   */
  async deleteSeatingArrangement(
    arrangementId: string,
    coupleId: string,
  ): Promise<{
    error: any;
  }> {
    const supabase = await this.getClient();

    return await supabase
      .from('seating_arrangements')
      .delete()
      .eq('id', arrangementId)
      .eq('couple_id', coupleId);
  }

  // ==================================================
  // SEATING ASSIGNMENTS OPERATIONS
  // ==================================================

  /**
   * Create bulk seating assignments
   */
  async createBulkSeatingAssignments(
    assignmentData: BulkSeatingAssignmentInput,
  ): Promise<{
    data: SeatingAssignment[] | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      const assignments = assignmentData.assignments.map((assignment) => ({
        arrangement_id: assignmentData.arrangement_id,
        ...assignment,
      }));

      const result = await supabase
        .from('seating_assignments')
        .insert(assignments)
        .select();

      this.logPerformanceMetric({
        query_type: 'create_bulk_seating_assignments',
        execution_time_ms: Date.now() - startTime,
        rows_examined: assignments.length,
        rows_returned: assignments.length,
        index_usage: [],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Clear all assignments for an arrangement
   */
  async clearSeatingAssignments(arrangementId: string): Promise<{
    error: any;
  }> {
    const supabase = await this.getClient();

    return await supabase
      .from('seating_assignments')
      .delete()
      .eq('arrangement_id', arrangementId);
  }

  /**
   * Get seating assignments for an arrangement
   */
  async getSeatingAssignments(
    arrangementId: string,
    filter?: SeatingAssignmentFilter,
  ): Promise<{
    data: SeatingAssignment[] | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      let query = supabase
        .from('seating_assignments')
        .select(
          `
          *,
          guest:guests(
            id,
            first_name,
            last_name,
            email,
            category,
            side,
            age_group,
            plus_one,
            plus_one_name
          ),
          table:reception_tables(
            id,
            table_number,
            name,
            capacity,
            table_shape
          )
        `,
        )
        .eq('arrangement_id', arrangementId);

      // Apply filters
      if (filter) {
        if (filter.table_ids) {
          query = query.in('table_id', filter.table_ids);
        }
        if (filter.guest_ids) {
          query = query.in('guest_id', filter.guest_ids);
        }
      }

      const result = await query.order('table_id').order('seat_number');

      this.logPerformanceMetric({
        query_type: 'get_seating_assignments',
        execution_time_ms: Date.now() - startTime,
        rows_examined: result.data?.length || 0,
        rows_returned: result.data?.length || 0,
        index_usage: [
          'idx_seating_assignments_arrangement',
          'idx_seating_assignments_table',
        ],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  // ==================================================
  // OPTIMIZATION & VALIDATION FUNCTIONS
  // ==================================================

  /**
   * Validate seating arrangement using database function
   */
  async validateSeatingArrangement(arrangementId: string): Promise<{
    data: ValidationResult | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      const result = await supabase.rpc('validate_seating_arrangement', {
        p_arrangement_id: arrangementId,
      });

      this.logPerformanceMetric({
        query_type: 'validate_seating_arrangement',
        execution_time_ms: Date.now() - startTime,
        rows_examined: 0, // Function internal
        rows_returned: 1,
        index_usage: ['relationships_conflict_detection'],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Calculate seating score using database function
   */
  async calculateSeatingScore(arrangementId: string): Promise<{
    data: number | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      const result = await supabase.rpc('calculate_seating_score', {
        p_arrangement_id: arrangementId,
      });

      this.logPerformanceMetric({
        query_type: 'calculate_seating_score',
        execution_time_ms: Date.now() - startTime,
        rows_examined: 0, // Function internal
        rows_returned: 1,
        index_usage: ['relationships_conflict_detection'],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get relationship conflicts using database function
   */
  async getRelationshipConflicts(coupleId: string): Promise<{
    data: ConflictDetectionResponse | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      const result = await supabase.rpc('get_relationship_conflicts', {
        p_couple_id: coupleId,
      });

      this.logPerformanceMetric({
        query_type: 'get_relationship_conflicts',
        execution_time_ms: Date.now() - startTime,
        rows_examined: 0, // Function internal
        rows_returned: result.data?.length || 0,
        index_usage: ['idx_guest_relationships_preference'],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  // ==================================================
  // MATERIALIZED VIEW OPERATIONS
  // ==================================================

  /**
   * Get optimization view data for fast seating algorithms
   */
  async getSeatingOptimizationData(coupleId: string): Promise<{
    data: any[] | null;
    error: any;
  }> {
    const supabase = await this.getClient();
    const startTime = Date.now();

    try {
      const result = await supabase
        .from('seating_optimization_view')
        .select('*')
        .eq('couple_id', coupleId);

      this.logPerformanceMetric({
        query_type: 'get_seating_optimization_data',
        execution_time_ms: Date.now() - startTime,
        rows_examined: result.data?.length || 0,
        rows_returned: result.data?.length || 0,
        index_usage: ['idx_seating_optimization_view_couple'],
      });

      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Refresh materialized view (should be called after data changes)
   */
  async refreshSeatingOptimizationView(): Promise<{
    error: any;
  }> {
    const supabase = await this.getClient();

    try {
      await supabase.rpc('refresh_seating_optimization_view');
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // ==================================================
  // ANALYTICS & REPORTING
  // ==================================================

  /**
   * Get seating analytics for a couple
   */
  async getSeatingAnalytics(
    coupleId: string,
    arrangementId?: string,
  ): Promise<{
    data: SeatingAnalytics | null;
    error: any;
  }> {
    const supabase = await this.getClient();

    try {
      // This would use a complex query or stored procedure to calculate analytics
      // For now, return a placeholder structure
      const analytics: SeatingAnalytics = {
        total_score: 0,
        relationship_scores: {
          must_sit_together_satisfied: 0,
          prefer_together_satisfied: 0,
          must_separate_satisfied: 0,
          prefer_apart_satisfied: 0,
          conflicts: 0,
        },
        table_utilization: [],
        guest_satisfaction_score: 0,
      };

      return { data: analytics, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // ==================================================
  // PERFORMANCE MONITORING
  // ==================================================

  /**
   * Get query performance metrics
   */
  getPerformanceMetrics(): QueryPerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
  }

  /**
   * Get slow queries (>1000ms)
   */
  getSlowQueries(): QueryPerformanceMetrics[] {
    return this.performanceMetrics.filter(
      (metric) => metric.execution_time_ms > 1000,
    );
  }

  // ==================================================
  // UTILITY FUNCTIONS
  // ==================================================

  /**
   * Check database health for seating queries
   */
  async checkSeatingDatabaseHealth(): Promise<{
    data: {
      table_stats: any[];
      index_usage: any[];
      connection_count: number;
    } | null;
    error: any;
  }> {
    const supabase = await this.getClient();

    try {
      // This would check table statistics, index usage, etc.
      // Implementation depends on specific monitoring requirements
      return {
        data: {
          table_stats: [],
          index_usage: [],
          connection_count: 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get table sizes and row counts
   */
  async getSeatingTableStats(): Promise<{
    data: {
      reception_tables: number;
      guest_relationships: number;
      seating_arrangements: number;
      seating_assignments: number;
    } | null;
    error: any;
  }> {
    const supabase = await this.getClient();

    try {
      const [tables, relationships, arrangements, assignments] =
        await Promise.all([
          supabase
            .from('reception_tables')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('guest_relationships')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('seating_arrangements')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('seating_assignments')
            .select('*', { count: 'exact', head: true }),
        ]);

      return {
        data: {
          reception_tables: tables.count || 0,
          guest_relationships: relationships.count || 0,
          seating_arrangements: arrangements.count || 0,
          seating_assignments: assignments.count || 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  }
}

// Export singleton instance
export const seatingQueriesManager = new SeatingQueriesManager();

// Export class for dependency injection
export { SeatingQueriesManager };
