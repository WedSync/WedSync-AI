import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type JourneyStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'archived'
  | 'deleted';
export type InstanceState =
  | 'active'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type NodeStatus =
  | 'pending'
  | 'scheduled'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

// State transition definitions
export const JOURNEY_TRANSITIONS: Record<JourneyStatus, JourneyStatus[]> = {
  draft: ['active', 'archived', 'deleted'],
  active: ['paused', 'archived', 'deleted'],
  paused: ['active', 'archived', 'deleted'],
  archived: ['active', 'deleted'],
  deleted: [], // Terminal state
};

export const INSTANCE_TRANSITIONS: Record<InstanceState, InstanceState[]> = {
  active: ['paused', 'completed', 'failed', 'cancelled'],
  paused: ['active', 'cancelled'],
  completed: [], // Terminal state
  failed: ['active'], // Can retry
  cancelled: [], // Terminal state
};

export const NODE_TRANSITIONS: Record<NodeStatus, NodeStatus[]> = {
  pending: ['scheduled', 'executing', 'skipped', 'cancelled'],
  scheduled: ['executing', 'cancelled'],
  executing: ['completed', 'failed'],
  completed: [], // Terminal state
  failed: ['pending'], // Can retry
  skipped: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Journey State Machine - Manages state transitions with validation and audit trails
 */
export class JourneyStateMachine {
  /**
   * Transition journey status with validation
   */
  static async transitionJourney(
    journeyId: string,
    fromStatus: JourneyStatus,
    toStatus: JourneyStatus,
    userId?: string,
    reason?: string,
  ): Promise<boolean> {
    // Validate transition
    if (!this.isValidJourneyTransition(fromStatus, toStatus)) {
      throw new Error(
        `Invalid journey transition: ${fromStatus} -> ${toStatus}`,
      );
    }

    // Additional business logic validation
    if (toStatus === 'active') {
      const validationResult = await this.validateJourneyActivation(journeyId);
      if (!validationResult.valid) {
        throw new Error(`Cannot activate journey: ${validationResult.reason}`);
      }
    }

    try {
      // Perform the transition
      const { error } = await supabase
        .from('journeys')
        .update({
          status: toStatus,
          updated_at: new Date().toISOString(),
          updated_by: userId,
          ...(toStatus === 'active' && {
            activated_at: new Date().toISOString(),
          }),
          ...(toStatus === 'paused' && {
            deactivated_at: new Date().toISOString(),
          }),
        })
        .eq('id', journeyId)
        .eq('status', fromStatus); // Ensure atomic update

      if (error) {
        console.error('Journey transition error:', error);
        return false;
      }

      // Create audit log
      await this.createJourneyAuditLog(
        journeyId,
        fromStatus,
        toStatus,
        userId,
        reason,
      );

      // Handle side effects
      await this.handleJourneyTransitionSideEffects(
        journeyId,
        fromStatus,
        toStatus,
      );

      return true;
    } catch (error) {
      console.error('Journey transition failed:', error);
      throw error;
    }
  }

  /**
   * Transition instance state with validation
   */
  static async transitionInstance(
    instanceId: string,
    fromState: InstanceState,
    toState: InstanceState,
    reason?: string,
    metadata?: any,
  ): Promise<boolean> {
    // Validate transition
    if (!this.isValidInstanceTransition(fromState, toState)) {
      throw new Error(
        `Invalid instance transition: ${fromState} -> ${toState}`,
      );
    }

    try {
      const updateData: any = {
        state: toState,
        ...(toState === 'paused' && { paused_at: new Date().toISOString() }),
        ...(toState === 'completed' && {
          completed_at: new Date().toISOString(),
        }),
        ...(toState === 'failed' && { failed_at: new Date().toISOString() }),
        ...(toState === 'cancelled' && {
          completed_at: new Date().toISOString(),
        }),
        ...(toState === 'active' &&
          fromState === 'paused' && { resumed_at: new Date().toISOString() }),
        ...(metadata && { metadata: { ...metadata } }),
      };

      // Calculate total duration for completed/failed/cancelled states
      if (['completed', 'failed', 'cancelled'].includes(toState)) {
        const { data: instance } = await supabase
          .from('journey_instances')
          .select('started_at')
          .eq('id', instanceId)
          .single();

        if (instance) {
          updateData.total_duration_ms =
            Date.now() - new Date(instance.started_at).getTime();
        }
      }

      const { error } = await supabase
        .from('journey_instances')
        .update(updateData)
        .eq('id', instanceId)
        .eq('state', fromState); // Ensure atomic update

      if (error) {
        console.error('Instance transition error:', error);
        return false;
      }

      // Create audit log
      await this.createInstanceAuditLog(instanceId, fromState, toState, reason);

      // Handle side effects
      await this.handleInstanceTransitionSideEffects(
        instanceId,
        fromState,
        toState,
      );

      return true;
    } catch (error) {
      console.error('Instance transition failed:', error);
      throw error;
    }
  }

  /**
   * Transition node execution status
   */
  static async transitionNodeExecution(
    executionId: string,
    fromStatus: NodeStatus,
    toStatus: NodeStatus,
    error?: string,
    output?: any,
  ): Promise<boolean> {
    // Validate transition
    if (!this.isValidNodeTransition(fromStatus, toStatus)) {
      throw new Error(`Invalid node transition: ${fromStatus} -> ${toStatus}`);
    }

    try {
      const updateData: any = {
        status: toStatus,
        ...(toStatus === 'executing' && {
          started_at: new Date().toISOString(),
        }),
        ...(toStatus === 'completed' && {
          completed_at: new Date().toISOString(),
          output_data: output,
        }),
        ...(toStatus === 'failed' && {
          completed_at: new Date().toISOString(),
          error_message: error,
        }),
      };

      // Calculate duration for completed/failed states
      if (['completed', 'failed'].includes(toStatus)) {
        const { data: execution } = await supabase
          .from('journey_node_executions')
          .select('started_at')
          .eq('id', executionId)
          .single();

        if (execution?.started_at) {
          updateData.duration_ms =
            Date.now() - new Date(execution.started_at).getTime();
        }
      }

      const { error: updateError } = await supabase
        .from('journey_node_executions')
        .update(updateData)
        .eq('id', executionId);

      if (updateError) {
        console.error('Node execution transition error:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Node execution transition failed:', error);
      throw error;
    }
  }

  /**
   * Validate journey transition
   */
  private static isValidJourneyTransition(
    from: JourneyStatus,
    to: JourneyStatus,
  ): boolean {
    return JOURNEY_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Validate instance transition
   */
  private static isValidInstanceTransition(
    from: InstanceState,
    to: InstanceState,
  ): boolean {
    return INSTANCE_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Validate node execution transition
   */
  private static isValidNodeTransition(
    from: NodeStatus,
    to: NodeStatus,
  ): boolean {
    return NODE_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Validate journey can be activated
   */
  private static async validateJourneyActivation(
    journeyId: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check if journey has required nodes
    const { data: nodes } = await supabase
      .from('journey_nodes')
      .select('type')
      .eq('journey_id', journeyId);

    if (!nodes || nodes.length === 0) {
      return { valid: false, reason: 'Journey has no nodes' };
    }

    // Must have a start node
    const hasStartNode = nodes.some((n) => n.type === 'start');
    if (!hasStartNode) {
      return { valid: false, reason: 'Journey must have a start node' };
    }

    // Must have at least one end node or terminal action
    const hasEndNode = nodes.some((n) => n.type === 'end');
    if (!hasEndNode) {
      return { valid: false, reason: 'Journey must have an end node' };
    }

    // Check for orphaned nodes (no incoming connections)
    // This would be more complex and require analyzing the canvas_data

    return { valid: true };
  }

  /**
   * Create journey audit log
   */
  private static async createJourneyAuditLog(
    journeyId: string,
    fromStatus: JourneyStatus,
    toStatus: JourneyStatus,
    userId?: string,
    reason?: string,
  ) {
    await supabase.from('journey_events').insert({
      journey_id: journeyId,
      event_type: 'status_change',
      event_source: 'system',
      event_data: {
        fromStatus,
        toStatus,
        reason,
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Create instance audit log
   */
  private static async createInstanceAuditLog(
    instanceId: string,
    fromState: InstanceState,
    toState: InstanceState,
    reason?: string,
  ) {
    // Get instance details for logging
    const { data: instance } = await supabase
      .from('journey_instances')
      .select('journey_id, client_id')
      .eq('id', instanceId)
      .single();

    if (instance) {
      await supabase.from('journey_events').insert({
        journey_id: instance.journey_id,
        instance_id: instanceId,
        client_id: instance.client_id,
        event_type: 'instance_state_change',
        event_source: 'system',
        event_data: {
          fromState,
          toState,
          reason,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Handle journey transition side effects
   */
  private static async handleJourneyTransitionSideEffects(
    journeyId: string,
    fromStatus: JourneyStatus,
    toStatus: JourneyStatus,
  ) {
    // When journey is paused, pause all active instances
    if (toStatus === 'paused') {
      await supabase
        .from('journey_instances')
        .update({
          state: 'paused',
          paused_at: new Date().toISOString(),
        })
        .eq('journey_id', journeyId)
        .eq('state', 'active');

      // Cancel pending schedules
      await supabase
        .from('journey_schedules')
        .update({ status: 'cancelled' })
        .in(
          'instance_id',
          supabase
            .from('journey_instances')
            .select('id')
            .eq('journey_id', journeyId),
        )
        .eq('status', 'pending');
    }

    // When journey is reactivated, optionally resume paused instances
    if (fromStatus === 'paused' && toStatus === 'active') {
      // This could be configurable - whether to auto-resume instances
      const autoResume = true; // Could come from journey settings

      if (autoResume) {
        await supabase
          .from('journey_instances')
          .update({
            state: 'active',
            resumed_at: new Date().toISOString(),
          })
          .eq('journey_id', journeyId)
          .eq('state', 'paused');
      }
    }

    // When journey is archived/deleted, handle cleanup
    if (['archived', 'deleted'].includes(toStatus)) {
      // Cancel all active instances
      await supabase
        .from('journey_instances')
        .update({
          state: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('journey_id', journeyId)
        .in('state', ['active', 'paused']);

      // Cancel all pending schedules
      await supabase
        .from('journey_schedules')
        .update({ status: 'cancelled' })
        .in(
          'instance_id',
          supabase
            .from('journey_instances')
            .select('id')
            .eq('journey_id', journeyId),
        )
        .eq('status', 'pending');
    }
  }

  /**
   * Handle instance transition side effects
   */
  private static async handleInstanceTransitionSideEffects(
    instanceId: string,
    fromState: InstanceState,
    toState: InstanceState,
  ) {
    // When instance completes, failed, or cancelled, clean up schedules
    if (['completed', 'failed', 'cancelled'].includes(toState)) {
      await supabase
        .from('journey_schedules')
        .update({ status: 'cancelled' })
        .eq('instance_id', instanceId)
        .eq('status', 'pending');
    }

    // When instance is paused, pause scheduled executions
    if (toState === 'paused') {
      await supabase
        .from('journey_schedules')
        .update({ status: 'paused' })
        .eq('instance_id', instanceId)
        .eq('status', 'pending');
    }

    // When instance is resumed, reactivate schedules
    if (fromState === 'paused' && toState === 'active') {
      await supabase
        .from('journey_schedules')
        .update({ status: 'pending' })
        .eq('instance_id', instanceId)
        .eq('status', 'paused');
    }
  }

  /**
   * Get available transitions for current state
   */
  static getAvailableJourneyTransitions(
    currentStatus: JourneyStatus,
  ): JourneyStatus[] {
    return JOURNEY_TRANSITIONS[currentStatus] || [];
  }

  static getAvailableInstanceTransitions(
    currentState: InstanceState,
  ): InstanceState[] {
    return INSTANCE_TRANSITIONS[currentState] || [];
  }

  static getAvailableNodeTransitions(currentStatus: NodeStatus): NodeStatus[] {
    return NODE_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Validate transition with business rules
   */
  static async validateJourneyTransition(
    journeyId: string,
    fromStatus: JourneyStatus,
    toStatus: JourneyStatus,
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check basic state machine rules
    if (!this.isValidJourneyTransition(fromStatus, toStatus)) {
      return {
        valid: false,
        reason: `Invalid state transition: ${fromStatus} -> ${toStatus}`,
      };
    }

    // Business rule validations
    switch (toStatus) {
      case 'active':
        return await this.validateJourneyActivation(journeyId);

      case 'paused':
        // Check if journey has active instances
        const { data: activeInstances } = await supabase
          .from('journey_instances')
          .select('id')
          .eq('journey_id', journeyId)
          .eq('state', 'active')
          .limit(1);

        if (!activeInstances || activeInstances.length === 0) {
          return { valid: false, reason: 'No active instances to pause' };
        }
        break;

      case 'deleted':
        // Prevent deletion if there are recent active instances
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

        const { data: recentInstances } = await supabase
          .from('journey_instances')
          .select('id')
          .eq('journey_id', journeyId)
          .gte('started_at', cutoffDate.toISOString())
          .limit(1);

        if (recentInstances && recentInstances.length > 0) {
          return {
            valid: false,
            reason:
              'Cannot delete journey with recent instances (within 30 days)',
          };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Get state machine status
   */
  static async getStateMachineStatus() {
    const { data: journeys } = await supabase
      .from('journeys')
      .select('status')
      .in('status', ['draft', 'active', 'paused', 'archived']);

    const { data: instances } = await supabase
      .from('journey_instances')
      .select('state')
      .in('state', ['active', 'paused', 'completed', 'failed']);

    const journeyStats =
      journeys?.reduce(
        (acc, j) => {
          acc[j.status] = (acc[j.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    const instanceStats =
      instances?.reduce(
        (acc, i) => {
          acc[i.state] = (acc[i.state] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    return {
      journeys: journeyStats,
      instances: instanceStats,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * State Machine Utilities
 */
export class StateMachineUtils {
  /**
   * Create state transition graph for visualization
   */
  static createTransitionGraph() {
    return {
      journey: {
        nodes: Object.keys(JOURNEY_TRANSITIONS),
        edges: Object.entries(JOURNEY_TRANSITIONS).flatMap(
          ([from, transitions]) => transitions.map((to) => ({ from, to })),
        ),
      },
      instance: {
        nodes: Object.keys(INSTANCE_TRANSITIONS),
        edges: Object.entries(INSTANCE_TRANSITIONS).flatMap(
          ([from, transitions]) => transitions.map((to) => ({ from, to })),
        ),
      },
      node: {
        nodes: Object.keys(NODE_TRANSITIONS),
        edges: Object.entries(NODE_TRANSITIONS).flatMap(([from, transitions]) =>
          transitions.map((to) => ({ from, to })),
        ),
      },
    };
  }

  /**
   * Check if state is terminal (no outgoing transitions)
   */
  static isTerminalJourneyState(state: JourneyStatus): boolean {
    return JOURNEY_TRANSITIONS[state].length === 0;
  }

  static isTerminalInstanceState(state: InstanceState): boolean {
    return INSTANCE_TRANSITIONS[state].length === 0;
  }

  static isTerminalNodeState(state: NodeStatus): boolean {
    return NODE_TRANSITIONS[state].length === 0;
  }

  /**
   * Get all reachable states from current state
   */
  static getReachableJourneyStates(from: JourneyStatus): JourneyStatus[] {
    const visited = new Set<JourneyStatus>();
    const stack = [from];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;

      visited.add(current);
      const transitions = JOURNEY_TRANSITIONS[current] || [];
      stack.push(...transitions.filter((t) => !visited.has(t)));
    }

    visited.delete(from); // Remove starting state
    return Array.from(visited);
  }
}
