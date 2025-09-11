import { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import {
  Journey,
  JourneyNode,
  JourneyNodeType,
  JourneyCondition,
} from './engine';
import { logger } from '@/lib/monitoring/structured-logger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExecutionPlan {
  journeyId: string;
  nodes: JourneyNode[];
  edges: Array<{ source: string; target: string }>;
  startNodeId: string;
  endNodeIds: string[];
  variables: Record<string, any>;
}

export interface JourneyDefinition {
  id: string;
  name: string;
  description?: string;
  canvasData: {
    nodes: Node[];
    edges: Edge[];
  };
  executionPlan: ExecutionPlan;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CanvasTransformer {
  /**
   * Validate the canvas data before transformation
   */
  validateCanvas(nodes: Node[], edges: Edge[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for start node
    const startNodes = nodes.filter((n) => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('Journey must have at least one Start node');
    } else if (startNodes.length > 1) {
      warnings.push(
        'Journey has multiple Start nodes - only the first will be used',
      );
    }

    // Check for end node
    const endNodes = nodes.filter((n) => n.type === 'end');
    if (endNodes.length === 0) {
      warnings.push(
        'Journey has no End node - consider adding one for clarity',
      );
    }

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();
    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    nodes.forEach((node) => {
      if (!connectedNodeIds.has(node.id) && node.type !== 'start') {
        warnings.push(
          `Node "${node.data.label || node.id}" is not connected to any other nodes`,
        );
      }
    });

    // Check for cycles that could cause infinite loops
    if (this.hasCycle(nodes, edges)) {
      warnings.push(
        'Journey contains cycles - ensure proper exit conditions to avoid infinite loops',
      );
    }

    // Validate node-specific configurations
    nodes.forEach((node) => {
      switch (node.type) {
        case 'email':
          if (!node.data.config?.template && !node.data.config?.content) {
            errors.push(
              `Email node "${node.data.label || node.id}" requires a template or content`,
            );
          }
          break;
        case 'condition':
          if (
            !node.data.config?.conditions ||
            node.data.config.conditions.length === 0
          ) {
            errors.push(
              `Condition node "${node.data.label || node.id}" requires at least one condition`,
            );
          }
          break;
        case 'timeline':
          if (!node.data.config?.offset) {
            errors.push(
              `Timeline node "${node.data.label || node.id}" requires a time offset configuration`,
            );
          }
          break;
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Transform React Flow canvas data to execution format
   */
  transformToExecution(
    nodes: Node[],
    edges: Edge[],
    journeyName: string = 'Untitled Journey',
  ): JourneyDefinition {
    const validation = this.validateCanvas(nodes, edges);
    if (!validation.isValid) {
      throw new Error(
        `Canvas validation failed: ${validation.errors.join(', ')}`,
      );
    }

    // Find start node
    const startNode = nodes.find((n) => n.type === 'start');
    if (!startNode) {
      throw new Error('No start node found');
    }

    // Transform nodes to execution format
    const executionNodes: JourneyNode[] = nodes.map((node) => {
      const connections = edges
        .filter((edge) => edge.source === node.id)
        .map((edge) => edge.target);

      return {
        id: node.id,
        type: this.mapNodeType(node.type || 'task'),
        name: node.data.label || node.type || 'Unnamed Node',
        description: node.data.description,
        position: node.position,
        data: this.transformNodeData(node),
        connections,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          executionCount: 0,
        },
      };
    });

    // Create execution plan
    const executionPlan: ExecutionPlan = {
      journeyId: `journey_${Date.now()}`,
      nodes: executionNodes,
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
      startNodeId: startNode.id,
      endNodeIds: nodes.filter((n) => n.type === 'end').map((n) => n.id),
      variables: {},
    };

    return {
      id: executionPlan.journeyId,
      name: journeyName,
      canvasData: { nodes, edges },
      executionPlan,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Create an executable journey instance from the definition
   */
  createExecutionPlan(definition: JourneyDefinition): ExecutionPlan {
    return definition.executionPlan;
  }

  /**
   * Persist the journey definition to database
   */
  async persistToDatabase(
    definition: JourneyDefinition,
    organizationId: string,
  ): Promise<string> {
    try {
      const response = await fetch('/api/journeys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: definition.name,
          description: definition.description,
          organization_id: organizationId,
          canvas_data: definition.canvasData,
          execution_plan: definition.executionPlan,
          is_active: definition.isActive,
          status: 'draft',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save journey to database');
      }

      const result = await response.json();

      logger.info('Journey persisted to database', {
        journeyId: result.id,
        name: definition.name,
        nodeCount: definition.executionPlan.nodes.length,
      });

      return result.id;
    } catch (error) {
      logger.error('Failed to persist journey', { error, definition });
      throw error;
    }
  }

  /**
   * Activate a journey for execution
   */
  async activateJourney(journeyId: string): Promise<void> {
    try {
      const response = await fetch(`/api/journeys/${journeyId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to activate journey');
      }

      logger.info('Journey activated', { journeyId });
    } catch (error) {
      logger.error('Failed to activate journey', { error, journeyId });
      throw error;
    }
  }

  /**
   * Helper: Map React Flow node types to execution node types
   */
  private mapNodeType(flowType: string): JourneyNodeType {
    const typeMap: Record<string, JourneyNodeType> = {
      start: 'start',
      end: 'end',
      email: 'email',
      sms: 'sms',
      timeline: 'wait',
      form: 'form',
      condition: 'condition',
      split: 'condition',
      meeting: 'task',
      review: 'review',
      task: 'task',
    };

    return typeMap[flowType] || 'task';
  }

  /**
   * Helper: Transform node configuration data
   */
  private transformNodeData(node: Node): any {
    const config = node.data.config || {};
    const baseData: any = {};

    switch (node.type) {
      case 'email':
        baseData.actionType = 'send_email';
        baseData.template = config.template;
        baseData.variables = config.variables || {};
        baseData.subject = config.subject;
        baseData.content = config.content;
        break;

      case 'sms':
        baseData.actionType = 'send_sms';
        baseData.template = config.template;
        baseData.variables = config.variables || {};
        baseData.message = config.message;
        break;

      case 'timeline':
        baseData.actionType = 'wait';
        baseData.delay = this.calculateDelayInSeconds(config.offset);
        baseData.timeUnit = config.offset?.unit || 'days';
        baseData.referencePoint =
          config.offset?.referencePoint || 'booking_date';
        break;

      case 'condition':
        baseData.actionType = 'evaluate_condition';
        baseData.conditions = this.transformConditions(config.conditions);
        break;

      case 'form':
        baseData.actionType = 'assign_form';
        baseData.formId = config.formId;
        baseData.dueDate = config.dueDate;
        break;

      case 'meeting':
        baseData.actionType = 'schedule_meeting';
        baseData.meetingType = config.meetingType;
        baseData.duration = config.duration;
        break;

      case 'review':
        baseData.actionType = 'request_review';
        baseData.reviewType = config.reviewType;
        baseData.assignee = config.assignee;
        break;

      default:
        Object.assign(baseData, config);
    }

    return baseData;
  }

  /**
   * Helper: Transform conditions to execution format
   */
  private transformConditions(conditions: any[]): JourneyCondition[] {
    if (!conditions || !Array.isArray(conditions)) {
      return [];
    }

    return conditions.map((cond) => ({
      field: cond.field || '',
      operator: cond.operator || 'equals',
      value: cond.value,
      logicalOperator: cond.logicalOperator || 'AND',
    }));
  }

  /**
   * Helper: Calculate delay in seconds from offset configuration
   */
  private calculateDelayInSeconds(offset: any): number {
    if (!offset) return 0;

    const multipliers: Record<string, number> = {
      minutes: 60,
      hours: 3600,
      days: 86400,
      weeks: 604800,
      months: 2592000, // Approximate
    };

    const value = Math.abs(offset.value || 0);
    const unit = offset.unit || 'days';
    const multiplier = multipliers[unit] || 86400;

    return value * multiplier;
  }

  /**
   * Helper: Check for cycles in the journey graph
   */
  private hasCycle(nodes: Node[], edges: Edge[]): boolean {
    const adjacencyList: Record<string, string[]> = {};

    // Build adjacency list
    nodes.forEach((node) => {
      adjacencyList[node.id] = [];
    });

    edges.forEach((edge) => {
      if (adjacencyList[edge.source]) {
        adjacencyList[edge.source].push(edge.target);
      }
    });

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      for (const neighbor of adjacencyList[nodeId] || []) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of Object.keys(adjacencyList)) {
      if (!visited.has(nodeId)) {
        if (hasCycleDFS(nodeId)) {
          return true;
        }
      }
    }

    return false;
  }
}

// Export singleton instance
export const canvasTransformer = new CanvasTransformer();
