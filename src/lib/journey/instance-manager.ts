import { createClient } from '@/lib/supabase/server';
import { structuredLogger } from '@/lib/monitoring/structured-logger';
import { NodeExecutorFactory, NodeExecutorContext } from './executors';
import { JourneyNode, JourneyExecution } from './engine';

export interface JourneyInstance {
  id: string;
  journeyId: string;
  clientId: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  currentNodeId: string | null;
  startedAt: Date;
  completedAt?: Date;
  variables: Record<string, any>;
  executionHistory: Array<{
    nodeId: string;
    executedAt: Date;
    success: boolean;
    output?: any;
    error?: string;
  }>;
}

export class JourneyInstanceManager {
  private activeInstances = new Map<string, JourneyInstance>();
  private scheduledExecutions = new Map<string, NodeJS.Timeout>();

  /**
   * Create a new journey instance for a client
   */
  async createInstance(
    journeyId: string,
    clientId: string,
    variables?: Record<string, any>,
  ): Promise<JourneyInstance> {
    try {
      const supabase = await createClient();

      // Get journey definition
      const { data: journey, error: journeyError } = await supabase
        .from('journeys')
        .select('*')
        .eq('id', journeyId)
        .single();

      if (journeyError || !journey) {
        throw new Error(`Journey not found: ${journeyId}`);
      }

      // Create instance record
      const instance: JourneyInstance = {
        id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        journeyId,
        clientId,
        status: 'active',
        currentNodeId: this.findStartNode(journey.execution_plan),
        startedAt: new Date(),
        variables: {
          ...variables,
          journeyId,
          clientId,
          startedAt: new Date().toISOString(),
        },
        executionHistory: [],
      };

      // Save to database
      const { data: savedInstance, error: saveError } = await supabase
        .from('journey_instances')
        .insert({
          journey_id: journeyId,
          client_id: clientId,
          status: instance.status,
          current_node_id: instance.currentNodeId,
          started_at: instance.startedAt,
          variables: instance.variables,
        })
        .select()
        .single();

      if (saveError) {
        throw new Error(`Failed to create instance: ${saveError.message}`);
      }

      instance.id = savedInstance.id;

      // Store in memory
      this.activeInstances.set(instance.id, instance);

      // Start execution
      await this.executeNextNode(instance.id);

      structuredLogger.info('Journey instance created', {
        instanceId: instance.id,
        journeyId,
        clientId,
      });

      return instance;
    } catch (error) {
      structuredLogger.error('Failed to create journey instance', {
        journeyId,
        clientId,
        error,
      });
      throw error;
    }
  }

  /**
   * Execute the next node in the journey
   */
  async executeNextNode(instanceId: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance || instance.status !== 'active') {
      return;
    }

    try {
      const supabase = await createClient();

      // Get journey execution plan
      const { data: journey, error: journeyError } = await supabase
        .from('journeys')
        .select('execution_plan')
        .eq('id', instance.journeyId)
        .single();

      if (journeyError || !journey) {
        throw new Error('Journey not found');
      }

      const executionPlan = journey.execution_plan;
      const currentNode = this.findNode(executionPlan, instance.currentNodeId);

      if (!currentNode) {
        // No more nodes, mark as completed
        await this.completeInstance(instanceId);
        return;
      }

      // Check if it's an end node
      if (currentNode.type === 'end') {
        await this.completeInstance(instanceId);
        return;
      }

      // Execute the current node
      const executor = NodeExecutorFactory.getExecutor(currentNode.type);

      const context: NodeExecutorContext = {
        executionId: instance.id,
        templateId: instance.journeyId,
        stepId: currentNode.id,
        variables: instance.variables,
        clientData: await this.getClientData(instance.clientId),
      };

      const result = await executor.execute(context, currentNode.data || {});

      // Record execution
      instance.executionHistory.push({
        nodeId: currentNode.id,
        executedAt: new Date(),
        success: result.success,
        output: result.output,
        error: result.error,
      });

      // Update instance in database
      await this.updateInstanceInDatabase(instance);

      if (result.success) {
        // Move to next node
        const nextNodeId = currentNode.connections?.[0];

        if (result.pauseExecution && result.scheduleNextAt) {
          // Schedule next execution
          await this.scheduleExecution(
            instanceId,
            nextNodeId,
            result.scheduleNextAt,
          );
        } else if (nextNodeId) {
          // Continue immediately
          instance.currentNodeId = nextNodeId;
          await this.executeNextNode(instanceId);
        } else {
          // No next node, complete the journey
          await this.completeInstance(instanceId);
        }
      } else {
        // Handle failure
        if (result.error) {
          await this.handleExecutionError(instanceId, result.error);
        }
      }
    } catch (error) {
      structuredLogger.error('Node execution failed', {
        instanceId,
        error,
      });
      await this.handleExecutionError(
        instanceId,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Pause a journey instance
   */
  async pauseInstance(instanceId: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    instance.status = 'paused';

    // Cancel any scheduled executions
    const scheduled = this.scheduledExecutions.get(instanceId);
    if (scheduled) {
      clearTimeout(scheduled);
      this.scheduledExecutions.delete(instanceId);
    }

    await this.updateInstanceInDatabase(instance);

    structuredLogger.info('Journey instance paused', { instanceId });
  }

  /**
   * Resume a paused journey instance
   */
  async resumeInstance(instanceId: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance || instance.status !== 'paused') {
      throw new Error('Instance not found or not paused');
    }

    instance.status = 'active';
    await this.updateInstanceInDatabase(instance);

    // Continue execution
    await this.executeNextNode(instanceId);

    structuredLogger.info('Journey instance resumed', { instanceId });
  }

  /**
   * Get instance status and progress
   */
  async getInstanceStatus(instanceId: string): Promise<JourneyInstance | null> {
    // Try memory first
    let instance = this.activeInstances.get(instanceId);

    if (!instance) {
      // Load from database
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('journey_instances')
        .select('*')
        .eq('id', instanceId)
        .single();

      if (error || !data) {
        return null;
      }

      instance = {
        id: data.id,
        journeyId: data.journey_id,
        clientId: data.client_id,
        status: data.status,
        currentNodeId: data.current_node_id,
        startedAt: new Date(data.started_at),
        completedAt: data.completed_at
          ? new Date(data.completed_at)
          : undefined,
        variables: data.variables || {},
        executionHistory: data.execution_history || [],
      };
    }

    return instance;
  }

  /**
   * Get all active instances
   */
  async getActiveInstances(): Promise<JourneyInstance[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('journey_instances')
      .select('*')
      .eq('status', 'active');

    if (error) {
      structuredLogger.error('Failed to get active instances', { error });
      return [];
    }

    return data.map((d) => ({
      id: d.id,
      journeyId: d.journey_id,
      clientId: d.client_id,
      status: d.status,
      currentNodeId: d.current_node_id,
      startedAt: new Date(d.started_at),
      variables: d.variables || {},
      executionHistory: d.execution_history || [],
    }));
  }

  /**
   * Helper: Complete an instance
   */
  private async completeInstance(instanceId: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) return;

    instance.status = 'completed';
    instance.completedAt = new Date();

    await this.updateInstanceInDatabase(instance);
    this.activeInstances.delete(instanceId);

    structuredLogger.info('Journey instance completed', {
      instanceId,
      duration: instance.completedAt.getTime() - instance.startedAt.getTime(),
    });
  }

  /**
   * Helper: Handle execution error
   */
  private async handleExecutionError(
    instanceId: string,
    error: string,
  ): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) return;

    instance.status = 'failed';

    await this.updateInstanceInDatabase(instance);
    this.activeInstances.delete(instanceId);

    structuredLogger.error('Journey instance failed', {
      instanceId,
      error,
    });
  }

  /**
   * Helper: Schedule next execution
   */
  private async scheduleExecution(
    instanceId: string,
    nextNodeId: string | undefined,
    scheduleAt: Date,
  ): Promise<void> {
    if (!nextNodeId) return;

    const delay = scheduleAt.getTime() - Date.now();
    if (delay <= 0) {
      // Execute immediately if schedule time has passed
      const instance = this.activeInstances.get(instanceId);
      if (instance) {
        instance.currentNodeId = nextNodeId;
        await this.executeNextNode(instanceId);
      }
    } else {
      // Schedule for future
      const timeout = setTimeout(async () => {
        const instance = this.activeInstances.get(instanceId);
        if (instance && instance.status === 'active') {
          instance.currentNodeId = nextNodeId;
          await this.executeNextNode(instanceId);
        }
        this.scheduledExecutions.delete(instanceId);
      }, delay);

      this.scheduledExecutions.set(instanceId, timeout);

      structuredLogger.info('Execution scheduled', {
        instanceId,
        nextNodeId,
        scheduleAt,
      });
    }
  }

  /**
   * Helper: Update instance in database
   */
  private async updateInstanceInDatabase(
    instance: JourneyInstance,
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('journey_instances')
      .update({
        status: instance.status,
        current_node_id: instance.currentNodeId,
        completed_at: instance.completedAt,
        variables: instance.variables,
        execution_history: instance.executionHistory,
      })
      .eq('id', instance.id);

    if (error) {
      structuredLogger.error('Failed to update instance in database', {
        instanceId: instance.id,
        error,
      });
    }
  }

  /**
   * Helper: Get client data
   */
  private async getClientData(clientId: string): Promise<any> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      structuredLogger.warn('Failed to get client data', { clientId, error });
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      weddingDate: data.wedding_date,
    };
  }

  /**
   * Helper: Find start node in execution plan
   */
  private findStartNode(executionPlan: any): string | null {
    if (!executionPlan || !executionPlan.nodes) return null;

    const startNode = executionPlan.nodes.find((n: any) => n.type === 'start');
    return startNode?.id || null;
  }

  /**
   * Helper: Find node by ID
   */
  private findNode(
    executionPlan: any,
    nodeId: string | null,
  ): JourneyNode | null {
    if (!nodeId || !executionPlan || !executionPlan.nodes) return null;

    return executionPlan.nodes.find((n: any) => n.id === nodeId) || null;
  }
}

// Export singleton instance
export const journeyInstanceManager = new JourneyInstanceManager();
