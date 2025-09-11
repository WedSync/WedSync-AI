/**
 * WS-154 Seating Arrangements - Team-Specific Query Optimizations
 * Team E - Round 2: Optimized data access patterns for each development team
 */

import {
  seatingQueryRouter,
  createQueryContext,
} from './seating-connection-optimizer';
import { seatingCacheOps } from '../cache/seating-intelligent-cache-system';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SeatingArrangementWithDetails,
  GuestRelationship,
  ConflictDetectionResponse,
  ReceptionTableWithAssignments,
  SeatingAssignment,
} from '@/types/seating';

// ==================================================
// TEAM A - FRONTEND DATA OPTIMIZATIONS
// ==================================================

export class TeamAFrontendOptimizations {
  /**
   * Fast dashboard data loading - optimized for UI responsiveness
   * Target: <50ms for initial dashboard load
   */
  static async getDashboardData(coupleId: string): Promise<{
    arrangements: any[];
    activeArrangement: SeatingArrangementWithDetails | null;
    quickStats: {
      totalGuests: number;
      totalTables: number;
      assignedGuests: number;
      conflicts: number;
    };
  }> {
    return seatingQueryRouter.executeForFrontend(
      async (client: SupabaseClient) => {
        // Use parallel queries for maximum speed
        const [arrangements, activeArrangement, stats] = await Promise.all([
          // Lightweight arrangement list
          client
            .from('seating_arrangements')
            .select(
              `
            id,
            name,
            is_active,
            optimization_score,
            created_at,
            updated_at
          `,
            )
            .eq('couple_id', coupleId)
            .order('created_at', { ascending: false })
            .limit(10),

          // Active arrangement with essential data only
          TeamAFrontendOptimizations.getActiveArrangementLight(
            client,
            coupleId,
          ),

          // Quick stats from materialized views
          TeamAFrontendOptimizations.getQuickStats(client, coupleId),
        ]);

        return {
          arrangements: arrangements.data || [],
          activeArrangement,
          quickStats: stats,
        };
      },
    );
  }

  /**
   * Lightweight active arrangement for UI
   */
  private static async getActiveArrangementLight(
    client: SupabaseClient,
    coupleId: string,
  ): Promise<SeatingArrangementWithDetails | null> {
    const { data: arrangement } = await client
      .from('seating_arrangements')
      .select(
        `
        *,
        _tables:reception_tables!couple_id(
          id,
          table_number,
          name,
          capacity,
          _assignments:seating_assignments(
            id,
            guest_id,
            seat_number,
            _guest:guests(id, first_name, last_name, category)
          )
        )
      `,
      )
      .eq('couple_id', coupleId)
      .eq('is_active', true)
      .single();

    if (!arrangement) return null;

    // Transform to expected format
    return {
      ...arrangement,
      tables: arrangement._tables || [],
      total_guests:
        arrangement._tables?.reduce(
          (sum: number, table: any) => sum + (table._assignments?.length || 0),
          0,
        ) || 0,
      total_tables: arrangement._tables?.length || 0,
    };
  }

  /**
   * Ultra-fast stats calculation using indexes
   */
  private static async getQuickStats(
    client: SupabaseClient,
    coupleId: string,
  ): Promise<{
    totalGuests: number;
    totalTables: number;
    assignedGuests: number;
    conflicts: number;
  }> {
    // Use COUNT queries with proper indexes
    const [guestCount, tableCount, assignedCount, conflictCount] =
      await Promise.all([
        client
          .from('guests')
          .select('*', { count: 'exact', head: true })
          .eq('couple_id', coupleId)
          .eq('rsvp_status', 'attending'),

        client
          .from('reception_tables')
          .select('*', { count: 'exact', head: true })
          .eq('couple_id', coupleId)
          .eq('is_active', true),

        client.rpc('count_assigned_guests', { p_couple_id: coupleId }),

        client.rpc('count_seating_conflicts', { p_couple_id: coupleId }),
      ]);

    return {
      totalGuests: guestCount.count || 0,
      totalTables: tableCount.count || 0,
      assignedGuests: assignedCount.data || 0,
      conflicts: conflictCount.data || 0,
    };
  }

  /**
   * Paginated guest list for UI tables
   */
  static async getPaginatedGuests(
    coupleId: string,
    page: number = 0,
    pageSize: number = 50,
    search?: string,
  ): Promise<{
    guests: any[];
    totalCount: number;
    hasMore: boolean;
  }> {
    return seatingQueryRouter.executeForFrontend(
      async (client: SupabaseClient) => {
        // PERFORMANCE FIX: Use specific columns instead of nested joins to avoid N+1 queries
        let query = client
          .from('guests')
          .select(
            `
          id,
          first_name,
          last_name,
          category,
          side,
          rsvp_status
        `,
            { count: 'exact' },
          )
          .eq('couple_id', coupleId)
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('last_name', { ascending: true }); // Add explicit ordering for consistent pagination

        if (search) {
          query = query.or(
            `first_name.ilike.%${search}%,last_name.ilike.%${search}%`,
          );
        }

        const result = await query.order('last_name');

        return {
          guests: result.data || [],
          totalCount: result.count || 0,
          hasMore: result.count ? (page + 1) * pageSize < result.count : false,
        };
      },
    );
  }

  /**
   * Real-time table status for drag & drop UI
   */
  static async getTableStatusForUI(coupleId: string): Promise<{
    tables: Array<{
      id: string;
      tableNumber: number;
      name: string;
      capacity: number;
      currentGuests: number;
      utilization: number;
      conflicts: number;
      canAcceptMore: boolean;
    }>;
  }> {
    return seatingQueryRouter.executeForFrontend(
      async (client: SupabaseClient) => {
        const { data } = await client
          .from('table_assignment_optimization')
          .select('*')
          .eq('couple_id', coupleId);

        const tables = (data || []).map((table: any) => ({
          id: table.table_id,
          tableNumber: table.table_number,
          name: table.table_name || `Table ${table.table_number}`,
          capacity: table.capacity,
          currentGuests: table.current_guests,
          utilization: table.utilization_percent,
          conflicts: 0, // TODO: Add conflict count
          canAcceptMore: table.available_seats > 0,
        }));

        return { tables };
      },
    );
  }
}

// ==================================================
// TEAM B - ALGORITHM OPTIMIZATION DATA STRUCTURES
// ==================================================

export class TeamBAlgorithmOptimizations {
  /**
   * Optimized relationship matrix for algorithm processing
   * Pre-computed compatibility scores and constraints
   */
  static async getOptimizationMatrix(coupleId: string): Promise<{
    guestMatrix: Map<string, Map<string, number>>;
    constraints: Map<string, string[]>;
    tableCapacities: Map<string, number>;
    guestPreferences: Map<string, any>;
  }> {
    return seatingQueryRouter.executeForAlgorithm(
      async (client: SupabaseClient) => {
        // Get pre-computed relationship matrix
        const { data: relationships } = await client
          .from('guest_relationship_matrix')
          .select('*')
          .eq('couple_id', coupleId);

        // Build efficient data structures for algorithms
        const guestMatrix = new Map<string, Map<string, number>>();
        const constraints = new Map<string, string[]>();
        const tableCapacities = new Map<string, number>();
        const guestPreferences = new Map<string, any>();

        // Process relationship matrix into algorithm-friendly format
        relationships?.forEach((rel: any) => {
          if (!guestMatrix.has(rel.guest1_id)) {
            guestMatrix.set(rel.guest1_id, new Map());
          }
          guestMatrix
            .get(rel.guest1_id)!
            .set(rel.guest2_id, rel.compatibility_score);

          // Build constraint lists
          if (rel.must_avoid) {
            if (!constraints.has(rel.guest1_id)) {
              constraints.set(rel.guest1_id, []);
            }
            constraints.get(rel.guest1_id)!.push(rel.guest2_id);
          }
        });

        // Get table capacities
        const { data: tables } = await client
          .from('reception_tables')
          .select('id, capacity')
          .eq('couple_id', coupleId)
          .eq('is_active', true);

        tables?.forEach((table: any) => {
          tableCapacities.set(table.id, table.capacity);
        });

        return {
          guestMatrix,
          constraints,
          tableCapacities,
          guestPreferences,
        };
      },
    );
  }

  /**
   * Batch process optimization results
   */
  static async saveOptimizationResults(
    arrangementId: string,
    assignments: SeatingAssignment[],
  ): Promise<void> {
    return seatingQueryRouter.executeForAlgorithm(
      async (client: SupabaseClient) => {
        // Clear existing assignments
        await client
          .from('seating_assignments')
          .delete()
          .eq('arrangement_id', arrangementId);

        // Batch insert new assignments (up to 1000 at a time)
        const batchSize = 1000;
        for (let i = 0; i < assignments.length; i += batchSize) {
          const batch = assignments.slice(i, i + batchSize);
          await client.from('seating_assignments').insert(batch);
        }

        // Update arrangement score
        const score = await client.rpc('calculate_seating_score', {
          p_arrangement_id: arrangementId,
        });

        await client
          .from('seating_arrangements')
          .update({
            optimization_score: score.data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', arrangementId);
      },
    );
  }

  /**
   * Get algorithm performance metrics
   */
  static async getAlgorithmMetrics(coupleId: string): Promise<{
    totalRelationships: number;
    constraintViolations: number;
    optimizationOpportunities: number;
    averageTableUtilization: number;
  }> {
    return seatingQueryRouter.executeForAlgorithm(
      async (client: SupabaseClient) => {
        const [relationships, violations, opportunities, utilization] =
          await Promise.all([
            client.rpc('count_guest_relationships', { p_couple_id: coupleId }),
            client.rpc('count_constraint_violations', {
              p_couple_id: coupleId,
            }),
            client.rpc('count_optimization_opportunities', {
              p_couple_id: coupleId,
            }),
            client.rpc('calculate_average_utilization', {
              p_couple_id: coupleId,
            }),
          ]);

        return {
          totalRelationships: relationships.data || 0,
          constraintViolations: violations.data || 0,
          optimizationOpportunities: opportunities.data || 0,
          averageTableUtilization: utilization.data || 0,
        };
      },
    );
  }
}

// ==================================================
// TEAM C - REAL-TIME CONFLICT DETECTION
// ==================================================

export class TeamCRealtimeOptimizations {
  /**
   * Lightning-fast conflict detection for real-time updates
   * Target: <50ms response time
   */
  static async detectRealTimeConflicts(
    arrangementId: string,
    changeSet: {
      movedGuests?: Array<{
        guestId: string;
        fromTableId?: string;
        toTableId: string;
      }>;
      addedGuests?: Array<{ guestId: string; tableId: string }>;
      removedGuests?: Array<{ guestId: string; tableId: string }>;
    },
  ): Promise<{
    conflicts: ConflictDetectionResponse;
    affectedTables: string[];
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  }> {
    return seatingQueryRouter.executeForRealtime(
      async (client: SupabaseClient) => {
        // Get arrangement context
        const { data: arrangement } = await client
          .from('seating_arrangements')
          .select('couple_id')
          .eq('id', arrangementId)
          .single();

        if (!arrangement) {
          throw new Error('Arrangement not found');
        }

        // Fast conflict detection using cached relationship matrix
        const conflicts = await client.rpc('fast_detect_seating_conflicts', {
          p_couple_id: arrangement.couple_id,
          p_arrangement_id: arrangementId,
        });

        // Determine affected tables
        const affectedTables = new Set<string>();
        changeSet.movedGuests?.forEach((change) => {
          if (change.fromTableId) affectedTables.add(change.fromTableId);
          affectedTables.add(change.toTableId);
        });
        changeSet.addedGuests?.forEach((change) =>
          affectedTables.add(change.tableId),
        );
        changeSet.removedGuests?.forEach((change) =>
          affectedTables.add(change.tableId),
        );

        // Calculate severity
        let severity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
        const conflictData = conflicts.data || [];

        if (conflictData.some((c: any) => c.severity === 'critical'))
          severity = 'critical';
        else if (conflictData.some((c: any) => c.severity === 'high'))
          severity = 'high';
        else if (conflictData.some((c: any) => c.severity === 'medium'))
          severity = 'medium';
        else if (conflictData.length > 0) severity = 'low';

        return {
          conflicts: {
            conflicts: conflictData,
            warnings: [],
            affected_tables: Array.from(affectedTables),
            recommendation: '',
          },
          affectedTables: Array.from(affectedTables),
          severity,
        };
      },
    );
  }

  /**
   * Real-time validation during drag & drop
   */
  static async validateDragDrop(
    guestId: string,
    targetTableId: string,
    coupleId: string,
  ): Promise<{
    valid: boolean;
    conflicts: string[];
    warnings: string[];
    recommendation?: string;
  }> {
    return seatingQueryRouter.executeForRealtime(
      async (client: SupabaseClient) => {
        // Quick validation using materialized views
        const { data: guestMatrix } = await client
          .from('guest_relationship_matrix')
          .select('guest2_id, compatibility_score, must_avoid')
          .eq('couple_id', coupleId)
          .eq('guest1_id', guestId);

        const { data: tableGuests } = await client
          .from('seating_assignments')
          .select('guest_id')
          .eq('table_id', targetTableId);

        const conflicts: string[] = [];
        const warnings: string[] = [];

        // Check for direct conflicts with existing table guests
        const existingGuestIds = new Set(
          (tableGuests || []).map((g: any) => g.guest_id),
        );

        guestMatrix?.forEach((rel: any) => {
          if (existingGuestIds.has(rel.guest2_id)) {
            if (rel.must_avoid) {
              conflicts.push(
                `Cannot seat with guest ${rel.guest2_id} - marked as avoid`,
              );
            } else if (rel.compatibility_score < -50) {
              warnings.push(`Low compatibility with guest ${rel.guest2_id}`);
            }
          }
        });

        const valid = conflicts.length === 0;

        return {
          valid,
          conflicts,
          warnings,
          recommendation: valid
            ? undefined
            : 'Consider alternative table placement',
        };
      },
    );
  }

  /**
   * Subscribe to real-time arrangement changes
   */
  static subscribeToArrangementChanges(
    arrangementId: string,
    callback: (changes: any) => void,
  ): () => void {
    // Implementation would depend on Supabase realtime setup
    // This is a placeholder for the subscription logic
    console.log(`Subscribing to changes for arrangement ${arrangementId}`);
    return () => console.log('Unsubscribed');
  }
}

// ==================================================
// TEAM D - MOBILE OPTIMIZATIONS
// ==================================================

export class TeamDMobileOptimizations {
  /**
   * Lightweight data for mobile app initial load
   * Minimal data transfer for slow connections
   */
  static async getMobileArrangementSummary(coupleId: string): Promise<{
    arrangements: Array<{
      id: string;
      name: string;
      isActive: boolean;
      guestCount: number;
      tableCount: number;
      lastUpdated: string;
    }>;
    quickActions: Array<{
      type: string;
      label: string;
      data: any;
    }>;
  }> {
    return seatingQueryRouter.executeForMobile(
      async (client: SupabaseClient) => {
        // Minimal arrangement data for mobile
        const { data: arrangements } = await client
          .from('seating_arrangements')
          .select(
            `
          id,
          name,
          is_active,
          updated_at,
          _guest_count:seating_assignments(count)
        `,
          )
          .eq('couple_id', coupleId)
          .limit(5);

        const { data: tableCount } = await client
          .from('reception_tables')
          .select('*', { count: 'exact', head: true })
          .eq('couple_id', coupleId)
          .eq('is_active', true);

        const formattedArrangements = (arrangements || []).map((arr: any) => ({
          id: arr.id,
          name: arr.name,
          isActive: arr.is_active,
          guestCount: arr._guest_count?.[0]?.count || 0,
          tableCount: tableCount.count || 0,
          lastUpdated: arr.updated_at,
        }));

        const quickActions = [
          { type: 'view_conflicts', label: 'View Conflicts', data: {} },
          { type: 'auto_optimize', label: 'Auto Optimize', data: {} },
          { type: 'export_layout', label: 'Export Layout', data: {} },
        ];

        return {
          arrangements: formattedArrangements,
          quickActions,
        };
      },
    );
  }

  /**
   * Compressed table layout for mobile rendering
   */
  static async getMobileTableLayout(arrangementId: string): Promise<{
    tables: Array<{
      id: string;
      number: number;
      name: string;
      guests: Array<{
        id: string;
        name: string;
        category: string;
      }>;
      capacity: number;
      utilization: number;
    }>;
    summary: {
      totalGuests: number;
      totalTables: number;
      conflicts: number;
    };
  }> {
    return seatingQueryRouter.executeForMobile(
      async (client: SupabaseClient) => {
        const { data } = await client
          .from('reception_tables')
          .select(
            `
          id,
          table_number,
          name,
          capacity,
          seating_assignments!inner(
            guest:guests(
              id,
              first_name,
              last_name,
              category
            )
          )
        `,
          )
          .eq('seating_assignments.arrangement_id', arrangementId);

        const tables = (data || []).map((table: any) => {
          const guests =
            table.seating_assignments?.map((assignment: any) => ({
              id: assignment.guest.id,
              name: `${assignment.guest.first_name} ${assignment.guest.last_name}`,
              category: assignment.guest.category,
            })) || [];

          return {
            id: table.id,
            number: table.table_number,
            name: table.name || `Table ${table.table_number}`,
            guests,
            capacity: table.capacity,
            utilization: Math.round((guests.length / table.capacity) * 100),
          };
        });

        const totalGuests = tables.reduce(
          (sum, table) => sum + table.guests.length,
          0,
        );
        const totalTables = tables.length;

        return {
          tables,
          summary: {
            totalGuests,
            totalTables,
            conflicts: 0, // TODO: Add mobile conflict count
          },
        };
      },
    );
  }

  /**
   * Mobile-optimized search with fuzzy matching
   */
  static async mobileGuestSearch(
    coupleId: string,
    query: string,
    limit: number = 10,
  ): Promise<
    Array<{
      id: string;
      name: string;
      category: string;
      tableName?: string;
      hasConflicts: boolean;
    }>
  > {
    return seatingQueryRouter.executeForMobile(
      async (client: SupabaseClient) => {
        const { data } = await client
          .from('guests')
          .select(
            `
          id,
          first_name,
          last_name,
          category,
          seating_assignments(
            reception_tables(name, table_number)
          )
        `,
          )
          .eq('couple_id', coupleId)
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
          .limit(limit);

        return (data || []).map((guest: any) => ({
          id: guest.id,
          name: `${guest.first_name} ${guest.last_name}`,
          category: guest.category,
          tableName: guest.seating_assignments?.[0]?.reception_tables?.name,
          hasConflicts: false, // TODO: Add conflict detection
        }));
      },
    );
  }

  /**
   * Mobile-optimized batch updates
   */
  static async mobileBatchUpdate(
    updates: Array<{
      type: 'move' | 'assign' | 'unassign';
      guestId: string;
      tableId?: string;
      arrangementId: string;
    }>,
  ): Promise<{ success: boolean; errors: string[] }> {
    return seatingQueryRouter.executeForMobile(
      async (client: SupabaseClient) => {
        const errors: string[] = [];

        try {
          // Process updates in transaction
          await client.rpc('mobile_batch_seating_update', {
            p_updates: JSON.stringify(updates),
          });

          return { success: true, errors: [] };
        } catch (error) {
          errors.push(error instanceof Error ? error.message : 'Unknown error');
          return { success: false, errors };
        }
      },
    );
  }
}

// ==================================================
// EXPORTS
// ==================================================

export {
  TeamAFrontendOptimizations as TeamA,
  TeamBAlgorithmOptimizations as TeamB,
  TeamCRealtimeOptimizations as TeamC,
  TeamDMobileOptimizations as TeamD,
};
