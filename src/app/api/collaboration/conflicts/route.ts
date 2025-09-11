// WS-342: Real-Time Wedding Collaboration - Conflict Management API
// Team B Backend Development - Batch 1 Round 1

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ConflictResolutionEngine from '@/lib/collaboration/conflict-resolver';
import DataSynchronizationService from '@/lib/collaboration/data-sync';
import {
  DataConflict,
  ConflictResolution,
  ConflictResolutionStrategy,
} from '@/lib/collaboration/types/collaboration';

// Initialize services (singleton in production)
const conflictResolver = new ConflictResolutionEngine();
const dataSyncService = new DataSynchronizationService();

interface ConflictResolutionRequest {
  conflict_id: string;
  resolution_strategy: ConflictResolutionStrategy;
  resolution_data?: any;
  apply_immediately?: boolean;
}

interface ConflictSearchRequest {
  status?: 'unresolved' | 'resolved' | 'auto_resolved';
  table?: string;
  user_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  since?: string;
  limit?: number;
}

// Get conflicts for a wedding
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('weddingId');

    if (!weddingId) {
      return NextResponse.json(
        { error: 'Wedding ID is required' },
        { status: 400 },
      );
    }

    const status = searchParams.get(
      'status',
    ) as ConflictSearchRequest['status'];
    const table = searchParams.get('table');
    const user_id = searchParams.get('user_id');
    const priority = searchParams.get(
      'priority',
    ) as ConflictSearchRequest['priority'];
    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '50');
    const include_auto = searchParams.get('include_auto') === 'true';

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Verify user has access to this wedding
    const { data: session } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'No active collaboration session' },
        { status: 403 },
      );
    }

    // Build query for conflicts
    let query = supabase
      .from('data_conflicts')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (table) {
      query = query.eq('table_name', table);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (since) {
      query = query.gte('created_at', since);
    }

    if (!include_auto) {
      query = query.neq('resolution_strategy', 'auto_resolve');
    }

    const { data: conflicts, error: conflictsError } = await query;

    if (conflictsError) {
      console.error('Failed to get conflicts:', conflictsError);
      return NextResponse.json(
        { error: 'Failed to retrieve conflicts' },
        { status: 500 },
      );
    }

    // Get user profiles for conflict participants
    const userIds = [
      ...new Set(conflicts?.map((c) => c.user_id).filter(Boolean)),
    ];
    let userProfiles = [];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds);

      userProfiles = profiles || [];
    }

    // Enrich conflicts with user information
    const enrichedConflicts =
      conflicts?.map((conflict) => ({
        ...conflict,
        user_profile:
          userProfiles.find((profile) => profile.id === conflict.user_id) ||
          null,
      })) || [];

    // Get conflict statistics
    const { data: stats } = await supabase.rpc('get_conflict_statistics', {
      p_wedding_id: weddingId,
      p_hours_back: 24,
    });

    return NextResponse.json(
      {
        conflicts: enrichedConflicts,
        total_count: conflicts?.length || 0,
        statistics: stats || {
          total_conflicts: 0,
          unresolved_conflicts: 0,
          auto_resolved_conflicts: 0,
          manual_resolved_conflicts: 0,
          high_priority_conflicts: 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Get conflicts error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve conflicts' },
      { status: 500 },
    );
  }
}

// Resolve a conflict
export async function POST(request: NextRequest) {
  try {
    const body: ConflictResolutionRequest = await request.json();
    const {
      conflict_id,
      resolution_strategy,
      resolution_data,
      apply_immediately = true,
    } = body;

    if (!conflict_id || !resolution_strategy) {
      return NextResponse.json(
        { error: 'Conflict ID and resolution strategy are required' },
        { status: 400 },
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get the conflict to verify ownership/permissions
    const { data: conflict, error: conflictError } = await supabase
      .from('data_conflicts')
      .select('*')
      .eq('id', conflict_id)
      .single();

    if (conflictError || !conflict) {
      return NextResponse.json(
        { error: 'Conflict not found' },
        { status: 404 },
      );
    }

    // Verify user has access to this wedding
    const { data: session } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('wedding_id', conflict.wedding_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'No active collaboration session' },
        { status: 403 },
      );
    }

    // Check if user can resolve conflicts (needs moderation permission for manual resolution)
    if (
      resolution_strategy !== 'user_choice' &&
      !session.permissions.can_moderate
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions to resolve conflicts' },
        { status: 403 },
      );
    }

    // Create resolution object
    const resolution: ConflictResolution = {
      id: `resolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conflict_id: conflict_id,
      strategy: resolution_strategy,
      resolved_by: user.id,
      resolved_at: new Date(),
      resolution_data: resolution_data || {},
      applied: false,
      wedding_hierarchy_used: resolution_strategy === 'wedding_hierarchy',
    };

    // Apply the resolution through conflict resolver
    let appliedResolution: ConflictResolution;

    if (apply_immediately) {
      appliedResolution = await conflictResolver.applyResolution(resolution);
    } else {
      // Just create the resolution without applying
      const { data: savedResolution, error: saveError } = await supabase
        .from('conflict_resolutions')
        .insert({
          id: resolution.id,
          conflict_id: resolution.conflict_id,
          strategy: resolution.strategy,
          resolved_by: resolution.resolved_by,
          resolved_at: resolution.resolved_at.toISOString(),
          resolution_data: resolution.resolution_data,
          applied: false,
          wedding_hierarchy_used: resolution.wedding_hierarchy_used,
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      appliedResolution = {
        ...resolution,
        applied: false,
      };
    }

    // Update conflict status
    await supabase
      .from('data_conflicts')
      .update({
        status: apply_immediately ? 'resolved' : 'pending_resolution',
        resolved_at: apply_immediately ? new Date().toISOString() : null,
        resolved_by: user.id,
        resolution_strategy: resolution_strategy,
      })
      .eq('id', conflict_id);

    // Record resolution metrics
    await recordResolutionMetrics(
      supabase,
      conflict.wedding_id,
      appliedResolution,
      conflict,
    );

    return NextResponse.json(
      {
        success: true,
        resolution: appliedResolution,
        conflict_status: apply_immediately ? 'resolved' : 'pending_resolution',
        applied: apply_immediately,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Resolve conflict error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve conflict' },
      { status: 500 },
    );
  }
}

// Apply a pending resolution
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resolutionId = searchParams.get('resolution_id');

    if (!resolutionId) {
      return NextResponse.json(
        { error: 'Resolution ID is required' },
        { status: 400 },
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get the resolution and associated conflict
    const { data: resolution, error: resolutionError } = await supabase
      .from('conflict_resolutions')
      .select(
        `
        *,
        data_conflicts (
          wedding_id,
          table_name,
          record_id,
          conflict_data
        )
      `,
      )
      .eq('id', resolutionId)
      .single();

    if (resolutionError || !resolution) {
      return NextResponse.json(
        { error: 'Resolution not found' },
        { status: 404 },
      );
    }

    // Verify user has moderation permissions for this wedding
    const { data: session } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('wedding_id', resolution.data_conflicts.wedding_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!session || !session.permissions.can_moderate) {
      return NextResponse.json(
        { error: 'Insufficient permissions to apply resolutions' },
        { status: 403 },
      );
    }

    // Apply the resolution
    const appliedResolution = await conflictResolver.applyResolution({
      id: resolution.id,
      conflict_id: resolution.conflict_id,
      strategy: resolution.strategy,
      resolved_by: resolution.resolved_by,
      resolved_at: new Date(resolution.resolved_at),
      resolution_data: resolution.resolution_data,
      applied: false,
      wedding_hierarchy_used: resolution.wedding_hierarchy_used,
    });

    // Update conflict status
    await supabase
      .from('data_conflicts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', resolution.conflict_id);

    return NextResponse.json(
      {
        success: true,
        resolution: appliedResolution,
        message: 'Resolution applied successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Apply resolution error:', error);
    return NextResponse.json(
      { error: 'Failed to apply resolution' },
      { status: 500 },
    );
  }
}

// Bulk resolve conflicts
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      wedding_id,
      strategy,
      conflict_ids,
      apply_immediately = true,
    } = body;

    if (
      !wedding_id ||
      !strategy ||
      !conflict_ids ||
      !Array.isArray(conflict_ids)
    ) {
      return NextResponse.json(
        { error: 'Wedding ID, strategy, and conflict IDs array are required' },
        { status: 400 },
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Verify user has moderation permissions
    const { data: session } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('wedding_id', wedding_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!session || !session.permissions.can_moderate) {
      return NextResponse.json(
        { error: 'Insufficient permissions for bulk conflict resolution' },
        { status: 403 },
      );
    }

    // Get all conflicts to resolve
    const { data: conflicts, error: conflictsError } = await supabase
      .from('data_conflicts')
      .select('*')
      .eq('wedding_id', wedding_id)
      .in('id', conflict_ids)
      .eq('status', 'unresolved');

    if (conflictsError || !conflicts || conflicts.length === 0) {
      return NextResponse.json(
        { error: 'No unresolved conflicts found' },
        { status: 404 },
      );
    }

    // Process each conflict
    const results = [];
    const failures = [];

    for (const conflict of conflicts) {
      try {
        const resolution: ConflictResolution = {
          id: `bulk_resolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conflict_id: conflict.id,
          strategy: strategy,
          resolved_by: user.id,
          resolved_at: new Date(),
          resolution_data: {},
          applied: false,
          wedding_hierarchy_used: strategy === 'wedding_hierarchy',
        };

        let appliedResolution: ConflictResolution;

        if (apply_immediately) {
          appliedResolution =
            await conflictResolver.applyResolution(resolution);
        } else {
          // Save resolution without applying
          await supabase.from('conflict_resolutions').insert({
            id: resolution.id,
            conflict_id: resolution.conflict_id,
            strategy: resolution.strategy,
            resolved_by: resolution.resolved_by,
            resolved_at: resolution.resolved_at.toISOString(),
            resolution_data: resolution.resolution_data,
            applied: false,
            wedding_hierarchy_used: resolution.wedding_hierarchy_used,
          });

          appliedResolution = resolution;
        }

        // Update conflict status
        await supabase
          .from('data_conflicts')
          .update({
            status: apply_immediately ? 'resolved' : 'pending_resolution',
            resolved_at: apply_immediately ? new Date().toISOString() : null,
            resolved_by: user.id,
            resolution_strategy: strategy,
          })
          .eq('id', conflict.id);

        results.push({
          conflict_id: conflict.id,
          resolution: appliedResolution,
          success: true,
        });
      } catch (error) {
        console.error(`Failed to resolve conflict ${conflict.id}:`, error);
        failures.push({
          conflict_id: conflict.id,
          error: error.message,
          success: false,
        });
      }
    }

    return NextResponse.json(
      {
        success: results.length > 0,
        resolved_count: results.length,
        failed_count: failures.length,
        results: results,
        failures: failures,
        total_processed: conflicts.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Bulk resolve conflicts error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk resolve conflicts' },
      { status: 500 },
    );
  }
}

// Helper function to record resolution metrics
async function recordResolutionMetrics(
  supabase: any,
  weddingId: string,
  resolution: ConflictResolution,
  conflict: any,
): Promise<void> {
  try {
    await supabase.rpc('record_wedding_metric', {
      p_wedding_id: weddingId,
      p_metric_type: 'conflict_resolution',
      p_metric_value: {
        resolution_id: resolution.id,
        conflict_id: resolution.conflict_id,
        strategy: resolution.strategy,
        resolved_by: resolution.resolved_by,
        table_name: conflict.table_name,
        priority: conflict.priority,
        applied: resolution.applied,
        wedding_hierarchy_used: resolution.wedding_hierarchy_used,
        timestamp: resolution.resolved_at.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to record resolution metrics:', error);
  }
}
