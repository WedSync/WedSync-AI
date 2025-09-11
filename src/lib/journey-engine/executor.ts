import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { emailService } from '@/lib/email/service';
import { smsService } from '@/lib/sms/twilio';
import { getErrorRecoverySystem } from './error-recovery';

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

export type NodeType =
  | 'start'
  | 'end'
  | 'action'
  | 'condition'
  | 'split'
  | 'merge'
  | 'wait'
  | 'time_trigger'
  | 'event_trigger';

export type ActionType =
  | 'send_email'
  | 'send_sms'
  | 'send_form'
  | 'form_reminder'
  | 'create_task'
  | 'assign_task'
  | 'webhook_call'
  | 'update_field'
  | 'add_tag'
  | 'remove_tag'
  | 'internal_note';

interface JourneyNode {
  id: string;
  journey_id: string;
  node_id: string;
  type: NodeType;
  name: string;
  description?: string;
  position_x?: number;
  position_y?: number;
  config: any;
  action_type?: ActionType;
  action_config?: any;
  conditions?: any[];
  delay_value?: number;
  delay_unit?: string;
  next_nodes?: string[];
}

interface JourneyInstance {
  id: string;
  journey_id: string;
  vendor_id: string;
  client_id: string;
  state: InstanceState;
  current_node_id?: string;
  current_step: number;
  variables: Record<string, any>;
  entry_source?: string;
  entry_trigger?: string;
  entry_metadata?: any;
  next_execution_at?: Date;
  retry_count: number;
  max_retries: number;
  execution_path?: string[];
  branching_history?: any[];
  started_at: Date;
  completed_at?: Date;
  failed_at?: Date;
  last_error?: string;
  error_count: number;
}

export class JourneyExecutor {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startScheduler();
  }

  /**
   * Start the scheduler for processing journey executions
   */
  private startScheduler() {
    // Process every 30 seconds
    this.processingInterval = setInterval(() => {
      if (!this.isProcessing) {
        this.processScheduledExecutions();
      }
    }, 30000);
  }

  /**
   * Stop the scheduler
   */
  public stopScheduler() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process all scheduled executions
   */
  private async processScheduledExecutions() {
    this.isProcessing = true;
    try {
      // Get pending executions
      const { data: instances, error } = await supabase
        .from('journey_instances')
        .select('*')
        .eq('state', 'active')
        .lte('next_execution_at', new Date().toISOString())
        .limit(50);

      if (error) {
        console.error('Error fetching scheduled executions:', error);
        return;
      }

      // Process each instance
      for (const instance of instances || []) {
        await this.processInstance(instance as any);
      }

      // Process scheduled nodes
      await this.processScheduledNodes();
    } catch (error) {
      console.error('Error in scheduled execution processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process scheduled nodes from the schedules table
   */
  private async processScheduledNodes() {
    const { data: schedules, error } = await supabase
      .from('journey_schedules')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(20);

    if (error) {
      console.error('Error fetching schedules:', error);
      return;
    }

    for (const schedule of schedules || []) {
      await this.executeScheduledNode(schedule);
    }
  }

  /**
   * Execute a scheduled node
   */
  private async executeScheduledNode(schedule: any) {
    try {
      // Mark as processing
      await supabase
        .from('journey_schedules')
        .update({
          status: 'processing',
          processed_at: new Date().toISOString(),
        })
        .eq('id', schedule.id);

      // Get the instance
      const { data: instance } = await supabase
        .from('journey_instances')
        .select('*')
        .eq('id', schedule.instance_id)
        .single();

      if (!instance) return;

      // Get the node
      const { data: node } = await supabase
        .from('journey_nodes')
        .select('*')
        .eq('journey_id', instance.journey_id)
        .eq('node_id', schedule.node_id)
        .single();

      if (!node) return;

      // Execute the node
      await this.executeNode(instance as any, node as any);

      // Mark schedule as completed
      await supabase
        .from('journey_schedules')
        .update({ status: 'completed' })
        .eq('id', schedule.id);
    } catch (error) {
      console.error('Error executing scheduled node:', error);

      // Mark as failed
      await supabase
        .from('journey_schedules')
        .update({
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', schedule.id);
    }
  }

  /**
   * Start a journey for a client
   */
  async startJourney(
    journeyId: string,
    clientId: string,
    vendorId: string,
    variables: Record<string, any> = {},
    triggerEvent?: string,
  ): Promise<string> {
    try {
      // Get the journey
      const { data: journey, error: journeyError } = await supabase
        .from('journeys')
        .select('*')
        .eq('id', journeyId)
        .eq('status', 'active')
        .single();

      if (journeyError || !journey) {
        throw new Error(`Journey not found or not active: ${journeyId}`);
      }

      // Check for existing active instance
      const { data: existingInstance } = await supabase
        .from('journey_instances')
        .select('id')
        .eq('journey_id', journeyId)
        .eq('client_id', clientId)
        .eq('state', 'active')
        .single();

      if (existingInstance) {
        console.warn(
          `Client already has active instance for journey ${journeyId}`,
        );
        return existingInstance.id;
      }

      // Get the start node
      const { data: startNode, error: nodeError } = await supabase
        .from('journey_nodes')
        .select('*')
        .eq('journey_id', journeyId)
        .eq('type', 'start')
        .single();

      if (nodeError || !startNode) {
        throw new Error('No start node found in journey');
      }

      // Create instance
      const { data: instance, error: instanceError } = await supabase
        .from('journey_instances')
        .insert({
          journey_id: journeyId,
          vendor_id: vendorId,
          client_id: clientId,
          state: 'active',
          current_node_id: startNode.node_id,
          current_step: 0,
          variables,
          entry_source: triggerEvent ? 'trigger' : 'manual',
          entry_trigger: triggerEvent,
          retry_count: 0,
          max_retries: 3,
          execution_path: [startNode.node_id],
          error_count: 0,
        })
        .select()
        .single();

      if (instanceError || !instance) {
        throw new Error('Failed to create journey instance');
      }

      // Execute the start node
      await this.executeNode(instance as any, startNode as any);

      return instance.id;
    } catch (error) {
      console.error('Error starting journey:', error);
      throw error;
    }
  }

  /**
   * Process a journey instance
   */
  private async processInstance(instance: JourneyInstance) {
    try {
      if (!instance.current_node_id) return;

      // Get the current node
      const { data: node, error } = await supabase
        .from('journey_nodes')
        .select('*')
        .eq('journey_id', instance.journey_id)
        .eq('node_id', instance.current_node_id)
        .single();

      if (error || !node) {
        console.error('Node not found:', instance.current_node_id);
        return;
      }

      await this.executeNode(instance, node as any);
    } catch (error) {
      console.error('Error processing instance:', error);
      await this.handleExecutionError(instance, error);
    }
  }

  /**
   * Execute a journey node
   */
  async executeNode(
    instanceId: string,
    nodeId: string,
    variables?: any,
  ): Promise<boolean>;
  private async executeNode(
    instance: JourneyInstance,
    node: JourneyNode,
  ): Promise<void>;
  private async executeNode(
    instanceOrId: JourneyInstance | string,
    nodeOrId: JourneyNode | string,
    variables?: any,
  ): Promise<boolean | void> {
    // Handle public method signature
    if (typeof instanceOrId === 'string' && typeof nodeOrId === 'string') {
      return this.executeNodeById(instanceOrId, nodeOrId, variables);
    }

    const instance = instanceOrId as JourneyInstance;
    const node = nodeOrId as JourneyNode;
    const startTime = Date.now();
    const executionId = crypto.randomUUID();

    try {
      console.log(`Executing node ${node.name} for instance ${instance.id}`);

      // Record execution start
      await supabase.from('journey_node_executions').insert({
        id: executionId,
        instance_id: instance.id,
        journey_id: instance.journey_id,
        node_id: node.node_id,
        status: 'executing',
        started_at: new Date().toISOString(),
        input_data: instance.variables,
      });

      let nextNodeIds: string[] = [];
      let output: any = null;

      // Execute based on node type
      switch (node.type) {
        case 'start':
          nextNodeIds = node.next_nodes || [];
          break;

        case 'action':
          output = await this.executeAction(instance, node);
          nextNodeIds = node.next_nodes || [];
          break;

        case 'condition':
          const conditionMet = await this.evaluateCondition(instance, node);
          nextNodeIds = conditionMet ? node.next_nodes || [] : [];
          output = { conditionMet };
          break;

        case 'wait':
          await this.scheduleWait(instance, node);
          return; // Exit here, will continue later

        case 'split':
          nextNodeIds = await this.executeSplit(instance, node);
          break;

        case 'end':
          await this.completeJourney(instance);
          break;

        default:
          console.warn(`Unknown node type: ${node.type}`);
          nextNodeIds = node.next_nodes || [];
      }

      // Record successful execution
      await supabase
        .from('journey_node_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          output_data: output,
        })
        .eq('id', executionId);

      // Update instance path
      const newPath = [...(instance.execution_path || []), node.node_id];

      // Continue to next nodes
      if (nextNodeIds.length > 0) {
        for (const nextNodeId of nextNodeIds) {
          await this.moveToNode(instance, nextNodeId, newPath);
        }
      }
    } catch (error) {
      console.error(`Error executing node ${node.node_id}:`, error);

      // Record failed execution
      await supabase
        .from('journey_node_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', executionId);

      // Trigger error recovery system
      const errorRecovery = getErrorRecoverySystem();
      const recoveryAction = await errorRecovery.handleExecutionError(
        instance.id,
        node.node_id,
        error instanceof Error ? error : new Error('Unknown error'),
        {
          node_type: node.type,
          action_type: node.action_type,
          execution_id: executionId,
          variables: instance.variables,
        },
      );

      console.log(`Recovery action for ${node.node_id}:`, recoveryAction);

      // Handle retry logic
      if (instance.retry_count < instance.max_retries) {
        await this.scheduleRetry(instance, node);
      } else {
        await this.failJourney(instance, error);
      }
    }
  }

  /**
   * Public method to execute a node by ID
   */
  private async executeNodeById(
    instanceId: string,
    nodeId: string,
    variables: any = {},
  ): Promise<boolean> {
    try {
      // Get instance and node data
      const [instanceResult, nodeResult] = await Promise.all([
        supabase
          .from('journey_instances')
          .select('*')
          .eq('id', instanceId)
          .single(),

        supabase
          .from('journey_nodes')
          .select('*')
          .eq('node_id', nodeId)
          .single(),
      ]);

      if (instanceResult.error || !instanceResult.data) {
        throw new Error(`Instance not found: ${instanceId}`);
      }

      if (nodeResult.error || !nodeResult.data) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      const instance = {
        ...instanceResult.data,
        variables: { ...instanceResult.data.variables, ...variables },
      };
      const node = nodeResult.data;

      await this.executeNode(instance as JourneyInstance, node as JourneyNode);
      return true;
    } catch (error) {
      console.error(`Error in executeNodeById:`, error);
      return false;
    }
  }

  /**
   * Execute an action node
   */
  private async executeAction(
    instance: JourneyInstance,
    node: JourneyNode,
  ): Promise<any> {
    const { action_type, action_config = {} } = node;
    const variables = { ...instance.variables, ...action_config.variables };

    switch (action_type) {
      case 'send_email':
        return await this.sendEmail(instance, action_config, variables);

      case 'send_sms':
        return await this.sendSMS(instance, action_config, variables);

      case 'send_form':
        return await this.sendForm(instance, action_config, variables);

      case 'webhook_call':
        return await this.callWebhook(action_config, variables);

      case 'update_field':
        return await this.updateClientField(instance.client_id, action_config);

      case 'add_tag':
        return await this.addClientTag(instance.client_id, action_config.tag);

      case 'remove_tag':
        return await this.removeClientTag(
          instance.client_id,
          action_config.tag,
        );

      case 'internal_note':
        return await this.addInternalNote(instance, action_config.note);

      default:
        console.warn(`Unknown action type: ${action_type}`);
        return null;
    }
  }

  /**
   * Send email action
   */
  private async sendEmail(
    instance: JourneyInstance,
    config: any,
    variables: Record<string, any>,
  ) {
    const { template, subject, to } = config;

    const result = await emailService.sendTemplateEmail({
      to: to || variables.email || instance.variables.email,
      templateType: template,
      templateProps: variables,
      subject: subject || `Message from ${variables.vendor_name}`,
      priority: 'normal',
    });

    // Record the email sent
    await supabase.from('journey_events').insert({
      journey_id: instance.journey_id,
      instance_id: instance.id,
      client_id: instance.client_id,
      event_type: 'email_sent',
      event_source: 'system',
      event_data: { messageId: result.messageId, template },
    });

    return { messageId: result.messageId, type: 'email' };
  }

  /**
   * Send SMS action
   */
  private async sendSMS(
    instance: JourneyInstance,
    config: any,
    variables: Record<string, any>,
  ) {
    const { template, to } = config;

    const result = await smsService.sendSMS({
      to: to || variables.phone || instance.variables.phone,
      templateType: template,
      variables,
      organizationId: instance.vendor_id,
      organizationTier: variables.tier || 'PROFESSIONAL',
    });

    // Record the SMS sent
    await supabase.from('journey_events').insert({
      journey_id: instance.journey_id,
      instance_id: instance.id,
      client_id: instance.client_id,
      event_type: 'sms_sent',
      event_source: 'system',
      event_data: { messageId: result.messageId, template },
    });

    return { messageId: result.messageId, type: 'sms' };
  }

  /**
   * Send form action
   */
  private async sendForm(
    instance: JourneyInstance,
    config: any,
    variables: Record<string, any>,
  ) {
    const { formId, message } = config;

    // Create form invitation
    const { data: form, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (error || !form) {
      throw new Error(`Form not found: ${formId}`);
    }

    // Send form via email
    await this.sendEmail(
      instance,
      {
        template: 'form_invitation',
        subject: `Please complete: ${form.title}`,
        to: variables.email,
      },
      {
        ...variables,
        formTitle: form.title,
        formUrl: `${process.env.NEXT_PUBLIC_APP_URL}/forms/${form.slug}`,
        message,
      },
    );

    return { formId, sent: true };
  }

  /**
   * Call webhook action
   */
  private async callWebhook(config: any, variables: Record<string, any>) {
    const { url, method = 'POST', headers = {} } = config;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: method !== 'GET' ? JSON.stringify(variables) : undefined,
    });

    const data = await response.json();
    return { status: response.status, data };
  }

  /**
   * Update client field
   */
  private async updateClientField(clientId: string, config: any) {
    const { field, value } = config;

    const updateData: any = {};
    updateData[field] = value;

    await supabase.from('clients').update(updateData).eq('id', clientId);

    return { field, value };
  }

  /**
   * Add tag to client
   */
  private async addClientTag(clientId: string, tag: string) {
    const { data: client } = await supabase
      .from('clients')
      .select('tags')
      .eq('id', clientId)
      .single();

    const tags = client?.tags || [];
    if (!tags.includes(tag)) {
      tags.push(tag);

      await supabase.from('clients').update({ tags }).eq('id', clientId);
    }

    return { tag, added: true };
  }

  /**
   * Remove tag from client
   */
  private async removeClientTag(clientId: string, tag: string) {
    const { data: client } = await supabase
      .from('clients')
      .select('tags')
      .eq('id', clientId)
      .single();

    const tags = (client?.tags || []).filter((t: string) => t !== tag);

    await supabase.from('clients').update({ tags }).eq('id', clientId);

    return { tag, removed: true };
  }

  /**
   * Add internal note
   */
  private async addInternalNote(instance: JourneyInstance, note: string) {
    await supabase
      .from('journey_instances')
      .update({
        notes: note,
        metadata: {
          ...instance.metadata,
          lastNoteAdded: new Date().toISOString(),
        },
      })
      .eq('id', instance.id);

    return { note, added: true };
  }

  /**
   * Evaluate condition node
   */
  private async evaluateCondition(
    instance: JourneyInstance,
    node: JourneyNode,
  ): Promise<boolean> {
    const conditions = node.conditions || [];
    if (conditions.length === 0) return true;

    let result = true;
    const data = instance.variables;

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const fieldValue = data[condition.field];
      let conditionMet = false;

      switch (condition.operator) {
        case 'equals':
          conditionMet = fieldValue === condition.value;
          break;
        case 'not_equals':
          conditionMet = fieldValue !== condition.value;
          break;
        case 'contains':
          conditionMet = String(fieldValue).includes(String(condition.value));
          break;
        case 'greater_than':
          conditionMet = Number(fieldValue) > Number(condition.value);
          break;
        case 'less_than':
          conditionMet = Number(fieldValue) < Number(condition.value);
          break;
        case 'exists':
          conditionMet = fieldValue !== undefined && fieldValue !== null;
          break;
        case 'not_exists':
          conditionMet = fieldValue === undefined || fieldValue === null;
          break;
      }

      if (i === 0) {
        result = conditionMet;
      } else {
        const logicalOp = conditions[i - 1].logicalOperator || 'AND';
        if (logicalOp === 'AND') {
          result = result && conditionMet;
        } else {
          result = result || conditionMet;
        }
      }
    }

    return result;
  }

  /**
   * Execute split node
   */
  private async executeSplit(
    instance: JourneyInstance,
    node: JourneyNode,
  ): Promise<string[]> {
    const { split_type = 'all', percentage_config } = node.config;
    const nextNodes = node.next_nodes || [];

    if (split_type === 'all') {
      // Execute all paths
      return nextNodes;
    } else if (split_type === 'percentage' && percentage_config) {
      // Choose path based on percentage
      const random = Math.random() * 100;
      let cumulative = 0;

      for (const [nodeId, percentage] of Object.entries(percentage_config)) {
        cumulative += Number(percentage);
        if (random <= cumulative) {
          return [nodeId];
        }
      }
    } else if (split_type === 'random') {
      // Choose random path
      const randomIndex = Math.floor(Math.random() * nextNodes.length);
      return [nextNodes[randomIndex]];
    }

    return nextNodes;
  }

  /**
   * Schedule a wait node
   */
  private async scheduleWait(instance: JourneyInstance, node: JourneyNode) {
    const { delay_value = 0, delay_unit = 'minutes' } = node;

    const multipliers: Record<string, number> = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
    };

    const delayMs = delay_value * multipliers[delay_unit];
    const scheduledFor = new Date(Date.now() + delayMs);

    // Create schedule entry
    await supabase.from('journey_schedules').insert({
      instance_id: instance.id,
      node_id: node.node_id,
      scheduled_for: scheduledFor.toISOString(),
      schedule_type: 'delay',
      status: 'pending',
    });

    // Update instance
    await supabase
      .from('journey_instances')
      .update({
        next_execution_at: scheduledFor.toISOString(),
      })
      .eq('id', instance.id);
  }

  /**
   * Move to next node
   */
  private async moveToNode(
    instance: JourneyInstance,
    nodeId: string,
    path: string[],
  ) {
    // Get the next node
    const { data: nextNode } = await supabase
      .from('journey_nodes')
      .select('*')
      .eq('journey_id', instance.journey_id)
      .eq('node_id', nodeId)
      .single();

    if (!nextNode) {
      console.error(`Next node not found: ${nodeId}`);
      return;
    }

    // Update instance
    await supabase
      .from('journey_instances')
      .update({
        current_node_id: nodeId,
        current_step: instance.current_step + 1,
        execution_path: path,
      })
      .eq('id', instance.id);

    // Execute immediately or schedule
    const updatedInstance = {
      ...instance,
      current_node_id: nodeId,
      execution_path: path,
    };

    if (nextNode.type === 'wait' || nextNode.type === 'time_trigger') {
      await this.scheduleWait(updatedInstance, nextNode as any);
    } else {
      await this.executeNode(updatedInstance, nextNode as any);
    }
  }

  /**
   * Schedule a retry
   */
  private async scheduleRetry(instance: JourneyInstance, node: JourneyNode) {
    const retryDelay = Math.min(
      60000 * Math.pow(2, instance.retry_count),
      3600000,
    ); // Max 1 hour
    const scheduledFor = new Date(Date.now() + retryDelay);

    await supabase.from('journey_schedules').insert({
      instance_id: instance.id,
      node_id: node.node_id,
      scheduled_for: scheduledFor.toISOString(),
      schedule_type: 'retry',
      status: 'pending',
      metadata: { retryCount: instance.retry_count + 1 },
    });

    await supabase
      .from('journey_instances')
      .update({
        retry_count: instance.retry_count + 1,
        next_execution_at: scheduledFor.toISOString(),
      })
      .eq('id', instance.id);
  }

  /**
   * Complete a journey
   */
  private async completeJourney(instance: JourneyInstance) {
    await supabase
      .from('journey_instances')
      .update({
        state: 'completed',
        completed_at: new Date().toISOString(),
        total_duration_ms: Date.now() - new Date(instance.started_at).getTime(),
      })
      .eq('id', instance.id);

    // Record completion event
    await supabase.from('journey_events').insert({
      journey_id: instance.journey_id,
      instance_id: instance.id,
      client_id: instance.client_id,
      event_type: 'journey_completed',
      event_source: 'system',
      event_data: { completedAt: new Date().toISOString() },
    });
  }

  /**
   * Fail a journey
   */
  private async failJourney(instance: JourneyInstance, error: any) {
    await supabase
      .from('journey_instances')
      .update({
        state: 'failed',
        failed_at: new Date().toISOString(),
        last_error: error instanceof Error ? error.message : 'Unknown error',
        error_count: instance.error_count + 1,
      })
      .eq('id', instance.id);

    // Record failure event
    await supabase.from('journey_events').insert({
      journey_id: instance.journey_id,
      instance_id: instance.id,
      client_id: instance.client_id,
      event_type: 'journey_failed',
      event_source: 'system',
      event_data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Handle execution error
   */
  private async handleExecutionError(instance: JourneyInstance, error: any) {
    console.error(`Execution error for instance ${instance.id}:`, error);

    await supabase
      .from('journey_instances')
      .update({
        last_error: error instanceof Error ? error.message : 'Unknown error',
        error_count: instance.error_count + 1,
      })
      .eq('id', instance.id);
  }

  /**
   * Pause a journey instance
   */
  async pauseInstance(instanceId: string): Promise<boolean> {
    const { error } = await supabase
      .from('journey_instances')
      .update({
        state: 'paused',
        paused_at: new Date().toISOString(),
      })
      .eq('id', instanceId)
      .eq('state', 'active');

    return !error;
  }

  /**
   * Resume a journey instance
   */
  async resumeInstance(instanceId: string): Promise<boolean> {
    const { data: instance, error } = await supabase
      .from('journey_instances')
      .update({
        state: 'active',
        resumed_at: new Date().toISOString(),
      })
      .eq('id', instanceId)
      .eq('state', 'paused')
      .select()
      .single();

    if (!error && instance) {
      // Process immediately
      await this.processInstance(instance as any);
      return true;
    }

    return false;
  }

  /**
   * Cancel a journey instance
   */
  async cancelInstance(instanceId: string): Promise<boolean> {
    const { error } = await supabase
      .from('journey_instances')
      .update({
        state: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', instanceId)
      .in('state', ['active', 'paused']);

    // Cancel any pending schedules
    await supabase
      .from('journey_schedules')
      .update({ status: 'cancelled' })
      .eq('instance_id', instanceId)
      .eq('status', 'pending');

    return !error;
  }

  /**
   * Get journey statistics
   */
  async getJourneyStats(journeyId: string) {
    const { data: stats } = await supabase
      .from('journeys')
      .select('stats')
      .eq('id', journeyId)
      .single();

    return stats?.stats || {};
  }

  /**
   * Handle incoming webhook event
   */
  async handleWebhookEvent(event: {
    type: string;
    source: string;
    data: any;
    clientId?: string;
    journeyId?: string;
  }) {
    // Record the event
    const { data: eventRecord } = await supabase
      .from('journey_events')
      .insert({
        journey_id: event.journeyId,
        client_id: event.clientId,
        event_type: event.type,
        event_source: event.source,
        event_data: event.data,
        processed: false,
      })
      .select()
      .single();

    if (!eventRecord) return;

    // Find matching trigger-based journeys
    if (!event.journeyId && event.clientId) {
      const { data: journeys } = await supabase
        .from('journeys')
        .select('*')
        .eq('status', 'active')
        .contains('triggers', [{ eventType: event.type }]);

      for (const journey of journeys || []) {
        // Check if client should enter journey
        const triggers = journey.triggers as any[];
        const matchingTrigger = triggers.find(
          (t) => t.eventType === event.type,
        );

        if (matchingTrigger) {
          // Start journey for this client
          await this.startJourney(
            journey.id,
            event.clientId,
            journey.vendor_id,
            event.data,
            event.type,
          );
        }
      }
    }

    // Mark event as processed
    await supabase
      .from('journey_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', eventRecord.id);
  }

  /**
   * Public method for sending email - used by queue processor
   */
  async sendEmail(clientId: string, emailConfig: any): Promise<boolean> {
    try {
      // Get client data
      const { data: client } = await supabase
        .from('clients')
        .select('email, name')
        .eq('id', clientId)
        .single();

      if (!client?.email) {
        throw new Error('Client email not found');
      }

      const result = await emailService.sendEmail({
        to: client.email,
        subject: emailConfig.subject,
        templateId: emailConfig.template_id,
        variables: {
          client_name: client.name,
          ...emailConfig.variables,
        },
      });

      return result.success;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Public method for sending SMS - used by queue processor
   */
  async sendSMS(clientId: string, smsConfig: any): Promise<boolean> {
    try {
      // Get client data
      const { data: client } = await supabase
        .from('clients')
        .select('phone, name')
        .eq('id', clientId)
        .single();

      if (!client?.phone) {
        throw new Error('Client phone not found');
      }

      const result = await smsService.sendSMS({
        to: client.phone,
        message: smsConfig.message,
        variables: {
          client_name: client.name,
          ...smsConfig.variables,
        },
      });

      return result.success;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  /**
   * Public method for triggering webhooks - used by queue processor
   */
  async triggerWebhook(url: string, payload: any): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-Journey-Engine/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      return response.ok;
    } catch (error) {
      console.error('Error triggering webhook:', error);
      return false;
    }
  }
}

// Export singleton instance
export const journeyExecutor = new JourneyExecutor();
