import {
  JourneyNode,
  JourneyConnection,
} from '@/app/api/journeys/[id]/canvas/route';
import {
  TimelineAnchorConfig,
  validateTimelineConfig,
} from '@/components/journey/canvas/TimelineAnchor';

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  nodeId?: string;
  connectionId?: string;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class JourneyValidator {
  /**
   * Validate a complete journey canvas
   */
  static validateJourney(
    nodes: JourneyNode[],
    connections: JourneyConnection[],
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate basic structure
    this.validateBasicStructure(nodes, errors, warnings);

    // Validate node connectivity
    this.validateConnectivity(nodes, connections, errors, warnings);

    // Validate individual nodes
    this.validateNodes(nodes, errors, warnings);

    // Validate connections
    this.validateConnections(nodes, connections, errors, warnings);

    // Validate journey flow
    this.validateJourneyFlow(nodes, connections, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate basic journey structure
   */
  private static validateBasicStructure(
    nodes: JourneyNode[],
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    // Check for empty journey
    if (nodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'Journey must contain at least one node',
      });
      return;
    }

    // Check for start nodes
    const startNodes = nodes.filter((node) => node.type === 'start');
    if (startNodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'Journey must have at least one start node',
      });
    } else if (startNodes.length > 1) {
      warnings.push({
        type: 'warning',
        message:
          'Multiple start nodes detected. Only one will be used as entry point.',
      });
    }

    // Check for end nodes
    const endNodes = nodes.filter((node) => node.type === 'end');
    if (endNodes.length === 0) {
      warnings.push({
        type: 'warning',
        message:
          'Journey should have at least one end node to properly complete',
      });
    }

    // Check for reasonable journey size
    if (nodes.length > 100) {
      warnings.push({
        type: 'warning',
        message: 'Large journey with many nodes may impact performance',
      });
    }
  }

  /**
   * Validate node connectivity
   */
  private static validateConnectivity(
    nodes: JourneyNode[],
    connections: JourneyConnection[],
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    const nodeIds = new Set(nodes.map((n) => n.node_id));
    const connectedNodes = new Set<string>();

    // Track which nodes are connected
    connections.forEach((conn) => {
      connectedNodes.add(conn.source_node_id);
      connectedNodes.add(conn.target_node_id);
    });

    // Find orphaned nodes (excluding start and end nodes)
    nodes.forEach((node) => {
      if (
        node.type !== 'start' &&
        node.type !== 'end' &&
        !connectedNodes.has(node.node_id)
      ) {
        warnings.push({
          type: 'warning',
          message: `Node "${node.name}" is not connected to any other nodes`,
          nodeId: node.node_id,
        });
      }
    });

    // Find unreachable nodes
    const reachableNodes = this.findReachableNodes(nodes, connections);
    nodes.forEach((node) => {
      if (!reachableNodes.has(node.node_id) && node.type !== 'start') {
        warnings.push({
          type: 'warning',
          message: `Node "${node.name}" is not reachable from any start node`,
          nodeId: node.node_id,
        });
      }
    });

    // Check for nodes that never reach an end
    const nodesReachingEnd = this.findNodesReachingEnd(nodes, connections);
    nodes.forEach((node) => {
      if (!nodesReachingEnd.has(node.node_id) && node.type !== 'end') {
        warnings.push({
          type: 'warning',
          message: `Node "${node.name}" has no path to an end node`,
          nodeId: node.node_id,
        });
      }
    });
  }

  /**
   * Find all nodes reachable from start nodes
   */
  private static findReachableNodes(
    nodes: JourneyNode[],
    connections: JourneyConnection[],
  ): Set<string> {
    const reachable = new Set<string>();
    const startNodes = nodes.filter((n) => n.type === 'start');
    const visited = new Set<string>();

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    connections.forEach((conn) => {
      if (!adjacency.has(conn.source_node_id)) {
        adjacency.set(conn.source_node_id, []);
      }
      adjacency.get(conn.source_node_id)!.push(conn.target_node_id);
    });

    // DFS from each start node
    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      reachable.add(nodeId);

      const neighbors = adjacency.get(nodeId) || [];
      neighbors.forEach((neighbor) => dfs(neighbor));
    };

    startNodes.forEach((node) => dfs(node.node_id));
    return reachable;
  }

  /**
   * Find all nodes that can reach an end node
   */
  private static findNodesReachingEnd(
    nodes: JourneyNode[],
    connections: JourneyConnection[],
  ): Set<string> {
    const reachingEnd = new Set<string>();
    const endNodes = nodes.filter((n) => n.type === 'end');
    const visited = new Set<string>();

    // Build reverse adjacency list
    const reverseAdjacency = new Map<string, string[]>();
    connections.forEach((conn) => {
      if (!reverseAdjacency.has(conn.target_node_id)) {
        reverseAdjacency.set(conn.target_node_id, []);
      }
      reverseAdjacency.get(conn.target_node_id)!.push(conn.source_node_id);
    });

    // DFS backwards from each end node
    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      reachingEnd.add(nodeId);

      const predecessors = reverseAdjacency.get(nodeId) || [];
      predecessors.forEach((pred) => dfs(pred));
    };

    endNodes.forEach((node) => dfs(node.node_id));
    return reachingEnd;
  }

  /**
   * Validate individual nodes
   */
  private static validateNodes(
    nodes: JourneyNode[],
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    nodes.forEach((node) => {
      // Validate node name
      if (!node.name || node.name.trim().length === 0) {
        errors.push({
          type: 'error',
          message: `Node must have a name`,
          nodeId: node.node_id,
        });
      }

      // Validate timeline nodes
      if (node.type === 'timeline') {
        this.validateTimelineNode(node, errors, warnings);
      }

      // Validate action nodes
      if (['email', 'sms', 'form'].includes(node.type)) {
        this.validateActionNode(node, errors, warnings);
      }

      // Validate condition nodes
      if (node.type === 'condition') {
        this.validateConditionNode(node, errors, warnings);
      }

      // Validate node position
      if (
        !node.canvas_position ||
        typeof node.canvas_position.x !== 'number' ||
        typeof node.canvas_position.y !== 'number'
      ) {
        warnings.push({
          type: 'warning',
          message: `Node "${node.name}" has invalid position`,
          nodeId: node.node_id,
        });
      }
    });
  }

  /**
   * Validate timeline node
   */
  private static validateTimelineNode(
    node: JourneyNode,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!node.timeline_config) {
      errors.push({
        type: 'error',
        message: `Timeline node "${node.name}" missing timeline configuration`,
        nodeId: node.node_id,
        field: 'timeline_config',
      });
      return;
    }

    const validation = validateTimelineConfig(
      node.timeline_config as TimelineAnchorConfig,
    );

    validation.errors.forEach((error) => {
      errors.push({
        type: 'error',
        message: `Timeline node "${node.name}": ${error}`,
        nodeId: node.node_id,
        field: 'timeline_config',
      });
    });

    validation.warnings.forEach((warning) => {
      warnings.push({
        type: 'warning',
        message: `Timeline node "${node.name}": ${warning}`,
        nodeId: node.node_id,
        field: 'timeline_config',
      });
    });
  }

  /**
   * Validate action node (email, sms, form)
   */
  private static validateActionNode(
    node: JourneyNode,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    const config = node.config || {};

    // Check for content configuration
    if (!config.template_id && !config.content && !config.subject) {
      warnings.push({
        type: 'warning',
        message: `${node.type} node "${node.name}" is missing content configuration`,
        nodeId: node.node_id,
        field: 'config',
      });
    }

    // Validate email-specific configuration
    if (node.type === 'email') {
      if (!config.subject && !config.template_id) {
        warnings.push({
          type: 'warning',
          message: `Email node "${node.name}" should have a subject line`,
          nodeId: node.node_id,
          field: 'subject',
        });
      }
    }

    // Validate form-specific configuration
    if (node.type === 'form') {
      if (!config.form_type && !config.template_id) {
        warnings.push({
          type: 'warning',
          message: `Form node "${node.name}" should specify a form type`,
          nodeId: node.node_id,
          field: 'form_type',
        });
      }
    }
  }

  /**
   * Validate condition node
   */
  private static validateConditionNode(
    node: JourneyNode,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    const config = node.config || {};

    if (!config.condition_type) {
      errors.push({
        type: 'error',
        message: `Condition node "${node.name}" must specify a condition type`,
        nodeId: node.node_id,
        field: 'condition_type',
      });
    }

    if (!config.field && config.condition_type !== 'always') {
      errors.push({
        type: 'error',
        message: `Condition node "${node.name}" must specify a field to check`,
        nodeId: node.node_id,
        field: 'field',
      });
    }

    if (!config.operator && config.condition_type !== 'always') {
      errors.push({
        type: 'error',
        message: `Condition node "${node.name}" must specify an operator`,
        nodeId: node.node_id,
        field: 'operator',
      });
    }
  }

  /**
   * Validate connections
   */
  private static validateConnections(
    nodes: JourneyNode[],
    connections: JourneyConnection[],
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    const nodeIds = new Set(nodes.map((n) => n.node_id));

    connections.forEach((conn) => {
      // Validate source node exists
      if (!nodeIds.has(conn.source_node_id)) {
        errors.push({
          type: 'error',
          message: `Connection references non-existent source node: ${conn.source_node_id}`,
          connectionId: conn.id,
        });
      }

      // Validate target node exists
      if (!nodeIds.has(conn.target_node_id)) {
        errors.push({
          type: 'error',
          message: `Connection references non-existent target node: ${conn.target_node_id}`,
          connectionId: conn.id,
        });
      }

      // Validate no self-connections
      if (conn.source_node_id === conn.target_node_id) {
        errors.push({
          type: 'error',
          message: 'Node cannot connect to itself',
          connectionId: conn.id,
        });
      }

      // Find source and target nodes
      const sourceNode = nodes.find((n) => n.node_id === conn.source_node_id);
      const targetNode = nodes.find((n) => n.node_id === conn.target_node_id);

      // Validate end nodes don't have outgoing connections
      if (sourceNode?.type === 'end') {
        warnings.push({
          type: 'warning',
          message: `End node "${sourceNode.name}" should not have outgoing connections`,
          connectionId: conn.id,
        });
      }

      // Validate start nodes don't have incoming connections
      if (targetNode?.type === 'start') {
        warnings.push({
          type: 'warning',
          message: `Start node "${targetNode.name}" should not have incoming connections`,
          connectionId: conn.id,
        });
      }
    });

    // Check for duplicate connections
    const connectionMap = new Map<string, number>();
    connections.forEach((conn) => {
      const key = `${conn.source_node_id}->${conn.target_node_id}`;
      connectionMap.set(key, (connectionMap.get(key) || 0) + 1);
    });

    connectionMap.forEach((count, key) => {
      if (count > 1) {
        warnings.push({
          type: 'warning',
          message: `Duplicate connection detected: ${key}`,
        });
      }
    });
  }

  /**
   * Validate journey flow logic
   */
  private static validateJourneyFlow(
    nodes: JourneyNode[],
    connections: JourneyConnection[],
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    // Check for circular dependencies
    const cycles = this.detectCycles(nodes, connections);
    cycles.forEach((cycle) => {
      warnings.push({
        type: 'warning',
        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
      });
    });

    // Check for condition nodes with missing branches
    nodes.forEach((node) => {
      if (node.type === 'condition') {
        const outgoingConnections = connections.filter(
          (c) => c.source_node_id === node.node_id,
        );
        if (outgoingConnections.length < 2) {
          warnings.push({
            type: 'warning',
            message: `Condition node "${node.name}" should have at least 2 outgoing paths`,
            nodeId: node.node_id,
          });
        }
      }
    });
  }

  /**
   * Detect cycles in the journey graph
   */
  private static detectCycles(
    nodes: JourneyNode[],
    connections: JourneyConnection[],
  ): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    nodes.forEach((node) => adjacency.set(node.node_id, []));
    connections.forEach((conn) => {
      if (adjacency.has(conn.source_node_id)) {
        adjacency.get(conn.source_node_id)!.push(conn.target_node_id);
      }
    });

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart >= 0) {
            cycles.push([...path.slice(cycleStart), neighbor]);
          }
          return true;
        }
      }

      recStack.delete(nodeId);
      path.pop();
      return false;
    };

    nodes.forEach((node) => {
      if (!visited.has(node.node_id)) {
        dfs(node.node_id);
      }
    });

    return cycles;
  }

  /**
   * Validate a journey is ready for activation
   */
  static validateForActivation(
    nodes: JourneyNode[],
    connections: JourneyConnection[],
  ): ValidationResult {
    const result = this.validateJourney(nodes, connections);

    // Additional checks for activation
    const errors = [...result.errors];
    const warnings = [...result.warnings];

    // Must have at least one action node
    const actionNodes = nodes.filter((n) =>
      ['email', 'sms', 'form', 'reminder'].includes(n.type),
    );
    if (actionNodes.length === 0) {
      errors.push({
        type: 'error',
        message:
          'Journey must have at least one action node (email, SMS, form, or reminder)',
      });
    }

    // All action nodes must be properly configured
    actionNodes.forEach((node) => {
      if (!node.config || Object.keys(node.config).length === 0) {
        errors.push({
          type: 'error',
          message: `Action node "${node.name}" must be configured before activation`,
          nodeId: node.node_id,
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const journeyValidator = JourneyValidator;
