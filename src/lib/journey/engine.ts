import { createClient } from '@/lib/supabase/server';
import { structuredLogger } from '@/lib/monitoring/structured-logger';
import { EmailService } from '@/lib/services/email-service';
import { SMSService } from '@/lib/services/sms-service';

// Journey node types
export type JourneyNodeType =
  | 'start'
  | 'email'
  | 'sms'
  | 'wait'
  | 'condition'
  | 'webhook'
  | 'form'
  | 'review'
  | 'task'
  | 'end';

// Journey execution status
export type JourneyStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

// Step execution status
export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'retry'
  | 'timeout';

// Journey node definition
export interface JourneyNode {
  id: string;
  type: JourneyNodeType;
  name: string;
  description?: string;
  position: { x: number; y: number };
  data: {
    actionType?: JourneyActionType;
    template?: string;
    variables?: Record<string, any>;
    conditions?: JourneyCondition[];
    delay?: number; // in seconds
    timeUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
    triggerEvent?: string;
    webhook?: {
      url: string;
      method: 'GET' | 'POST';
      headers?: Record<string, string>;
      body?: any;
    };
  };
  connections: string[]; // Connected node IDs
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    executionCount?: number;
    lastExecuted?: Date;
  };
}

// Journey condition
export interface JourneyCondition {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'exists'
    | 'not_exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

// Journey definition
export interface Journey {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  isActive: boolean;
  nodes: JourneyNode[];
  variables: Record<string, any>;
  triggers: {
    eventType: string;
    conditions?: JourneyCondition[];
  }[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    version: number;
    executions: number;
    lastExecuted?: Date;
  };
  settings: {
    timezone: string;
    quietHours: {
      start: string; // HH:mm format
      end: string;
    };
    maxExecutions?: number;
    retryPolicy: {
      enabled: boolean;
      maxRetries: number;
      retryDelay: number;
    };
  };
}

// Journey execution instance
export interface JourneyExecution {
  id: string;
  journeyId: string;
  participantId: string; // Client/couple ID
  participantData: Record<string, any>;
  currentNodeId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  nextExecutionAt?: Date;
  executionHistory: {
    nodeId: string;
    executedAt: Date;
    duration: number;
    success: boolean;
    error?: string;
    output?: any;
  }[];
  metadata: {
    organizationId: string;
    journeyVersion: number;
    retryCount: number;
  };
}

class JourneyExecutionEngine {
  private executions = new Map<string, JourneyExecution>();
  private journeys = new Map<string, Journey>();
  private scheduledExecutions = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.startScheduler();
  }

  /**
   * Register a journey for execution
   */
  registerJourney(journey: Journey): void {
    this.journeys.set(journey.id, journey);
    console.log(`Journey registered: ${journey.name} (${journey.id})`);
  }

  /**
   * Start journey execution for a participant
   */
  async startJourney(
    journeyId: string,
    participantId: string,
    participantData: Record<string, any>,
    triggerEvent?: string,
  ): Promise<string> {
    const journey = this.journeys.get(journeyId);
    if (!journey) {
      throw new Error(`Journey not found: ${journeyId}`);
    }

    if (!journey.isActive) {
      throw new Error(`Journey is not active: ${journeyId}`);
    }

    // Check if participant already has running execution
    const existingExecution = Array.from(this.executions.values()).find(
      (exec) =>
        exec.journeyId === journeyId &&
        exec.participantId === participantId &&
        exec.status === 'running',
    );

    if (existingExecution) {
      console.warn(
        `Participant ${participantId} already has running execution for journey ${journeyId}`,
      );
      return existingExecution.id;
    }

    // Find start node
    const startNode = journey.nodes.find((node) => node.type === 'start');
    if (!startNode) {
      throw new Error(`No start node found in journey: ${journeyId}`);
    }

    // Create execution instance
    const executionId = this.generateExecutionId();
    const execution: JourneyExecution = {
      id: executionId,
      journeyId,
      participantId,
      participantData,
      currentNodeId: startNode.id,
      status: 'running',
      startedAt: new Date(),
      executionHistory: [],
      metadata: {
        organizationId: journey.organizationId,
        journeyVersion: journey.metadata.version,
        retryCount: 0,
      },
    };

    this.executions.set(executionId, execution);

    // Start execution
    await this.executeNode(execution, startNode);

    return executionId;
  }

  /**
   * Execute a specific node
   */
  private async executeNode(
    execution: JourneyExecution,
    node: JourneyNode,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`Executing node ${node.name} for execution ${execution.id}`);

      const success = true;
      let output: any = null;
      let nextNodeIds: string[] = [];

      switch (node.type) {
        case 'start':
          // Start node just proceeds to next nodes
          nextNodeIds = node.connections;
          break;

        case 'action':
          output = await this.executeAction(execution, node);
          nextNodeIds = node.connections;
          break;

        case 'condition':
          const conditionResult = this.evaluateConditions(
            execution.participantData,
            node.data.conditions || [],
          );
          nextNodeIds = conditionResult ? node.connections : [];
          output = { conditionMet: conditionResult };
          break;

        case 'time_based':
          const delay = this.calculateDelay(node);
          if (delay > 0) {
            execution.nextExecutionAt = new Date(Date.now() + delay * 1000);
            this.scheduleExecution(execution, node, delay);
            return; // Exit here, will continue later
          }
          nextNodeIds = node.connections;
          break;

        case 'wait_delay':
          const waitDelay = node.data.delay || 0;
          if (waitDelay > 0) {
            execution.nextExecutionAt = new Date(Date.now() + waitDelay * 1000);
            this.scheduleExecution(execution, node, waitDelay);
            return;
          }
          nextNodeIds = node.connections;
          break;

        case 'split_path':
          // Execute all connected paths
          nextNodeIds = node.connections;
          break;

        case 'merge_paths':
          // Check if all paths have reached this node (simplified implementation)
          nextNodeIds = node.connections;
          break;

        case 'end':
          execution.status = 'completed';
          execution.completedAt = new Date();
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Record execution
      execution.executionHistory.push({
        nodeId: node.id,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        success,
        output,
      });

      // Update current node
      execution.currentNodeId = node.id;

      // Continue to next nodes
      if (nextNodeIds.length > 0 && execution.status === 'running') {
        const journey = this.journeys.get(execution.journeyId);
        if (journey) {
          for (const nextNodeId of nextNodeIds) {
            const nextNode = journey.nodes.find((n) => n.id === nextNodeId);
            if (nextNode) {
              await this.executeNode(execution, nextNode);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Node execution failed: ${node.id}`, error);

      execution.executionHistory.push({
        nodeId: node.id,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Handle retry logic
      const journey = this.journeys.get(execution.journeyId);
      if (
        journey?.settings.retryPolicy.enabled &&
        execution.metadata.retryCount < journey.settings.retryPolicy.maxRetries
      ) {
        execution.metadata.retryCount++;

        // Schedule retry
        setTimeout(() => {
          this.executeNode(execution, node);
        }, journey.settings.retryPolicy.retryDelay * 1000);
      } else {
        execution.status = 'failed';
      }
    }
  }

  /**
   * Execute an action node
   */
  private async executeAction(
    execution: JourneyExecution,
    node: JourneyNode,
  ): Promise<any> {
    const { actionType, template, variables = {}, webhook } = node.data;

    // Merge participant data with node variables
    const mergedVariables = { ...execution.participantData, ...variables };

    switch (actionType) {
      case 'send_email':
        const emailResult = await emailService.sendTemplateEmail({
          to: mergedVariables.email || execution.participantData.email,
          templateType: template as any,
          templateProps: mergedVariables,
          subject:
            mergedVariables.subject ||
            `Message from ${mergedVariables.vendor_name}`,
          priority: 'normal',
        });
        return { messageId: emailResult.messageId, type: 'email' };

      case 'send_sms':
        const smsResult = await smsService.sendSMS({
          to: mergedVariables.phone || execution.participantData.phone,
          templateType: template as any,
          variables: mergedVariables,
          organizationId: execution.metadata.organizationId,
          organizationTier: mergedVariables.tier || 'PROFESSIONAL',
        });
        return { messageId: smsResult.messageId, type: 'sms' };

      case 'webhook_call':
        if (webhook) {
          const response = await fetch(webhook.url, {
            method: webhook.method,
            headers: {
              'Content-Type': 'application/json',
              ...webhook.headers,
            },
            body:
              webhook.method === 'POST'
                ? JSON.stringify(webhook.body || mergedVariables)
                : undefined,
          });

          const data = await response.json();
          return { webhookResponse: data, status: response.status };
        }
        break;

      case 'create_task':
        // In a real implementation, this would create a task in your task management system
        return {
          taskId: `task_${Date.now()}`,
          title: mergedVariables.taskTitle,
          description: mergedVariables.taskDescription,
          assignee: mergedVariables.assignee,
        };

      default:
        console.warn(`Unknown action type: ${actionType}`);
        return null;
    }
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(
    data: Record<string, any>,
    conditions: JourneyCondition[],
  ): boolean {
    if (conditions.length === 0) return true;

    let result = true;

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const fieldValue = data[condition.field];
      let conditionResult = false;

      switch (condition.operator) {
        case 'equals':
          conditionResult = fieldValue === condition.value;
          break;
        case 'not_equals':
          conditionResult = fieldValue !== condition.value;
          break;
        case 'contains':
          conditionResult = String(fieldValue).includes(
            String(condition.value),
          );
          break;
        case 'greater_than':
          conditionResult = Number(fieldValue) > Number(condition.value);
          break;
        case 'less_than':
          conditionResult = Number(fieldValue) < Number(condition.value);
          break;
        case 'exists':
          conditionResult = fieldValue !== undefined && fieldValue !== null;
          break;
        case 'not_exists':
          conditionResult = fieldValue === undefined || fieldValue === null;
          break;
      }

      if (i === 0) {
        result = conditionResult;
      } else {
        const logicalOp = conditions[i - 1].logicalOperator || 'AND';
        if (logicalOp === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }
    }

    return result;
  }

  /**
   * Calculate delay for time-based nodes
   */
  private calculateDelay(node: JourneyNode): number {
    const { delay = 0, timeUnit = 'minutes' } = node.data;

    const multipliers = {
      minutes: 60,
      hours: 60 * 60,
      days: 60 * 60 * 24,
      weeks: 60 * 60 * 24 * 7,
    };

    return delay * multipliers[timeUnit];
  }

  /**
   * Schedule delayed execution
   */
  private scheduleExecution(
    execution: JourneyExecution,
    node: JourneyNode,
    delaySeconds: number,
  ): void {
    const timeoutId = setTimeout(() => {
      // Continue from this node's connections
      const journey = this.journeys.get(execution.journeyId);
      if (journey && execution.status === 'running') {
        for (const nextNodeId of node.connections) {
          const nextNode = journey.nodes.find((n) => n.id === nextNodeId);
          if (nextNode) {
            this.executeNode(execution, nextNode);
          }
        }
      }

      this.scheduledExecutions.delete(execution.id);
    }, delaySeconds * 1000);

    this.scheduledExecutions.set(execution.id, timeoutId);
  }

  /**
   * Start the scheduler for processing delayed executions
   */
  private startScheduler(): void {
    setInterval(() => {
      const now = new Date();

      // Process scheduled executions
      for (const [executionId, execution] of this.executions.entries()) {
        if (
          execution.status === 'running' &&
          execution.nextExecutionAt &&
          execution.nextExecutionAt <= now &&
          !this.scheduledExecutions.has(executionId)
        ) {
          const journey = this.journeys.get(execution.journeyId);
          const currentNode = journey?.nodes.find(
            (n) => n.id === execution.currentNodeId,
          );

          if (journey && currentNode) {
            // Continue execution from current node's connections
            for (const nextNodeId of currentNode.connections) {
              const nextNode = journey.nodes.find((n) => n.id === nextNodeId);
              if (nextNode) {
                this.executeNode(execution, nextNode);
              }
            }
          }

          execution.nextExecutionAt = undefined;
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Get execution status
   */
  getExecution(executionId: string): JourneyExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * Get all executions for a journey
   */
  getJourneyExecutions(journeyId: string): JourneyExecution[] {
    return Array.from(this.executions.values()).filter(
      (exec) => exec.journeyId === journeyId,
    );
  }

  /**
   * Pause execution
   */
  pauseExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'paused';

      // Cancel scheduled execution if any
      const timeoutId = this.scheduledExecutions.get(executionId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.scheduledExecutions.delete(executionId);
      }

      return true;
    }
    return false;
  }

  /**
   * Resume execution
   */
  async resumeExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'paused') {
      execution.status = 'running';

      const journey = this.journeys.get(execution.journeyId);
      const currentNode = journey?.nodes.find(
        (n) => n.id === execution.currentNodeId,
      );

      if (journey && currentNode) {
        await this.executeNode(execution, currentNode);
        return true;
      }
    }
    return false;
  }

  /**
   * Cancel execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && ['running', 'paused'].includes(execution.status)) {
      execution.status = 'cancelled';

      // Cancel scheduled execution if any
      const timeoutId = this.scheduledExecutions.get(executionId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.scheduledExecutions.delete(executionId);
      }

      return true;
    }
    return false;
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get journey statistics
   */
  getJourneyStats(journeyId: string): {
    totalExecutions: number;
    activeExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    averageCompletionTime: number;
  } {
    const executions = this.getJourneyExecutions(journeyId);
    const completed = executions.filter((e) => e.status === 'completed');

    const completionTimes = completed
      .filter((e) => e.completedAt)
      .map((e) => e.completedAt!.getTime() - e.startedAt.getTime());

    const averageCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

    return {
      totalExecutions: executions.length,
      activeExecutions: executions.filter((e) => e.status === 'running').length,
      completedExecutions: completed.length,
      failedExecutions: executions.filter((e) => e.status === 'failed').length,
      averageCompletionTime: Math.round(averageCompletionTime / 1000), // in seconds
    };
  }
}

// Export singleton instance
export const journeyEngine = new JourneyExecutionEngine();

// Journey templates
export const JOURNEY_TEMPLATES: Record<string, Partial<Journey>> = {
  photography: {
    name: 'Photography Wedding Journey',
    description: 'Complete workflow for wedding photographers',
    nodes: [
      {
        id: 'start_1',
        type: 'start',
        name: 'Journey Start',
        position: { x: 50, y: 200 },
        data: {},
        connections: ['welcome_email'],
      },
      {
        id: 'welcome_email',
        type: 'action',
        name: 'Send Welcome Email',
        position: { x: 200, y: 200 },
        data: {
          actionType: 'send_email',
          template: 'welcome_vendor_onboarding',
        },
        connections: ['wait_1_day'],
      },
      {
        id: 'wait_1_day',
        type: 'wait_delay',
        name: 'Wait 1 Day',
        position: { x: 350, y: 200 },
        data: {
          delay: 1,
          timeUnit: 'days',
        },
        connections: ['contract_reminder'],
      },
      {
        id: 'contract_reminder',
        type: 'action',
        name: 'Contract Reminder',
        position: { x: 500, y: 200 },
        data: {
          actionType: 'send_email',
          template: 'form_shared_with_couple',
        },
        connections: ['end_1'],
      },
      {
        id: 'end_1',
        type: 'end',
        name: 'Journey End',
        position: { x: 650, y: 200 },
        data: {},
        connections: [],
      },
    ],
  },

  dj_band: {
    name: 'DJ/Band Wedding Journey',
    description: 'Music vendor workflow automation',
    nodes: [
      {
        id: 'start_2',
        type: 'start',
        name: 'Journey Start',
        position: { x: 50, y: 200 },
        data: {},
        connections: ['welcome_music'],
      },
      {
        id: 'welcome_music',
        type: 'action',
        name: 'Welcome & Music Preferences',
        position: { x: 200, y: 200 },
        data: {
          actionType: 'send_form',
          template: 'music_preferences_form',
        },
        connections: ['timeline_planning'],
      },
      {
        id: 'timeline_planning',
        type: 'action',
        name: 'Timeline Planning',
        position: { x: 350, y: 200 },
        data: {
          actionType: 'send_email',
          template: 'timeline_planning',
        },
        connections: ['equipment_check'],
      },
      {
        id: 'equipment_check',
        type: 'action',
        name: 'Equipment Requirements',
        position: { x: 500, y: 200 },
        data: {
          actionType: 'send_form',
          template: 'equipment_requirements',
        },
        connections: ['day_of_reminder'],
      },
      {
        id: 'day_of_reminder',
        type: 'time_based',
        name: 'Day Before Reminder',
        position: { x: 650, y: 200 },
        data: {
          delay: 1,
          timeUnit: 'days',
        },
        connections: ['thank_you'],
      },
      {
        id: 'thank_you',
        type: 'action',
        name: 'Thank You & Review Request',
        position: { x: 800, y: 200 },
        data: {
          actionType: 'send_sms',
          template: 'thank_you',
        },
        connections: ['end_2'],
      },
      {
        id: 'end_2',
        type: 'end',
        name: 'Journey End',
        position: { x: 950, y: 200 },
        data: {},
        connections: [],
      },
    ],
  },
};

export default journeyEngine;
