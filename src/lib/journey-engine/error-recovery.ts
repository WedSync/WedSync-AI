import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { JourneyStateMachine } from './state-machine';

interface ErrorRecoveryConfig {
  maxAutoRetries: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
  alertThresholds: {
    errorRate: number;
    failedInstancesPerHour: number;
    stuckInstancesCount: number;
  };
}

interface ErrorPattern {
  pattern: string;
  classification: 'transient' | 'permanent' | 'user_error';
  recovery_strategy: 'retry' | 'skip' | 'manual_intervention' | 'reset_node';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface RecoveryAction {
  type: 'retry' | 'skip' | 'reset' | 'manual' | 'circuit_break';
  delay?: number;
  max_attempts?: number;
  requires_approval?: boolean;
  escalation_level?: 'support' | 'engineering' | 'emergency';
}

export class JourneyErrorRecoverySystem {
  private supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private config: ErrorRecoveryConfig = {
    maxAutoRetries: 3,
    retryDelayMs: 5000,
    circuitBreakerThreshold: 10,
    circuitBreakerTimeoutMs: 300000, // 5 minutes
    alertThresholds: {
      errorRate: 0.1, // 10%
      failedInstancesPerHour: 50,
      stuckInstancesCount: 5,
    },
  };

  private errorPatterns: ErrorPattern[] = [
    // Network and API errors
    {
      pattern: 'timeout|connection|network|ECONNRESET|ENOTFOUND',
      classification: 'transient',
      recovery_strategy: 'retry',
      priority: 'medium',
    },
    {
      pattern: 'rate.?limit|429|too.?many.?requests',
      classification: 'transient',
      recovery_strategy: 'retry',
      priority: 'medium',
    },

    // Service errors
    {
      pattern: '5\\d\\d|internal.?server|service.?unavailable',
      classification: 'transient',
      recovery_strategy: 'retry',
      priority: 'high',
    },

    // Authentication errors
    {
      pattern: 'unauthorized|401|403|invalid.?token|expired.?token',
      classification: 'permanent',
      recovery_strategy: 'manual_intervention',
      priority: 'critical',
    },

    // Validation errors
    {
      pattern: 'validation|invalid.?input|bad.?request|400',
      classification: 'user_error',
      recovery_strategy: 'skip',
      priority: 'low',
    },

    // Data errors
    {
      pattern: 'not.?found|404|missing.?data|null.?reference',
      classification: 'user_error',
      recovery_strategy: 'skip',
      priority: 'medium',
    },

    // Template/configuration errors
    {
      pattern: 'template.?not.?found|invalid.?template|missing.?variable',
      classification: 'permanent',
      recovery_strategy: 'manual_intervention',
      priority: 'high',
    },

    // System resource errors
    {
      pattern: 'out.?of.?memory|disk.?full|resource.?exhausted',
      classification: 'transient',
      recovery_strategy: 'retry',
      priority: 'critical',
    },
  ];

  private circuitBreakers: Map<
    string,
    {
      failures: number;
      lastFailure: Date;
      isOpen: boolean;
    }
  > = new Map();

  constructor(config?: Partial<ErrorRecoveryConfig>) {
    this.config = { ...this.config, ...config };
    this.startErrorMonitoring();
  }

  async handleExecutionError(
    instanceId: string,
    nodeId: string,
    error: Error,
    context: any = {},
  ): Promise<RecoveryAction> {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Handling error for instance ${instanceId}, node ${nodeId}:`,
        error.message,
      );
    }

    // Log the error
    await this.logError(instanceId, nodeId, error, context);

    // Classify the error
    const errorPattern = this.classifyError(error.message);

    // Check circuit breaker
    const circuitKey = `${nodeId}-${errorPattern.classification}`;
    if (this.isCircuitBreakerOpen(circuitKey)) {
      return {
        type: 'circuit_break',
        requires_approval: true,
        escalation_level: 'engineering',
      };
    }

    // Determine recovery action
    const recoveryAction = await this.determineRecoveryAction(
      instanceId,
      nodeId,
      errorPattern,
      context,
    );

    // Execute recovery action
    await this.executeRecoveryAction(instanceId, nodeId, recoveryAction, error);

    // Update circuit breaker
    this.updateCircuitBreaker(circuitKey, recoveryAction.type === 'retry');

    return recoveryAction;
  }

  private classifyError(errorMessage: string): ErrorPattern {
    const lowerMessage = errorMessage.toLowerCase();

    for (const pattern of this.errorPatterns) {
      const regex = new RegExp(pattern.pattern, 'i');
      if (regex.test(lowerMessage)) {
        return pattern;
      }
    }

    // Default classification for unknown errors
    return {
      pattern: 'unknown',
      classification: 'permanent',
      recovery_strategy: 'manual_intervention',
      priority: 'medium',
    };
  }

  private async determineRecoveryAction(
    instanceId: string,
    nodeId: string,
    errorPattern: ErrorPattern,
    context: any,
  ): Promise<RecoveryAction> {
    // Get error history for this instance/node combination
    const errorHistory = await this.getErrorHistory(instanceId, nodeId);
    const recentErrors = errorHistory.filter(
      (e) => new Date(e.created_at).getTime() > Date.now() - 3600000, // Last hour
    );

    switch (errorPattern.recovery_strategy) {
      case 'retry':
        if (recentErrors.length < this.config.maxAutoRetries) {
          return {
            type: 'retry',
            delay: this.calculateRetryDelay(recentErrors.length),
            max_attempts: this.config.maxAutoRetries,
          };
        } else {
          return {
            type: 'manual',
            requires_approval: true,
            escalation_level:
              errorPattern.priority === 'critical' ? 'emergency' : 'support',
          };
        }

      case 'skip':
        return {
          type: 'skip',
        };

      case 'reset_node':
        return {
          type: 'reset',
          requires_approval: errorPattern.priority === 'critical',
        };

      case 'manual_intervention':
      default:
        return {
          type: 'manual',
          requires_approval: true,
          escalation_level: this.getEscalationLevel(errorPattern.priority),
        };
    }
  }

  private async executeRecoveryAction(
    instanceId: string,
    nodeId: string,
    action: RecoveryAction,
    originalError: Error,
  ): Promise<void> {
    switch (action.type) {
      case 'retry':
        await this.scheduleRetry(instanceId, nodeId, action.delay || 0);
        break;

      case 'skip':
        await this.skipNode(instanceId, nodeId);
        break;

      case 'reset':
        await this.resetNode(instanceId, nodeId);
        break;

      case 'manual':
        await this.createManualInterventionTicket(
          instanceId,
          nodeId,
          originalError,
          action,
        );
        break;

      case 'circuit_break':
        await this.triggerCircuitBreaker(nodeId, originalError);
        break;
    }
  }

  private async scheduleRetry(
    instanceId: string,
    nodeId: string,
    delay: number,
  ): Promise<void> {
    const retryTime = new Date(Date.now() + delay);

    await this.supabase.from('journey_schedules').insert({
      instance_id: instanceId,
      node_id: nodeId,
      action_type: 'execute_node',
      scheduled_for: retryTime.toISOString(),
      status: 'pending',
      priority: 5, // Higher priority for retries
      retry_count: 0,
      created_at: new Date().toISOString(),
    });

    console.log(
      `Scheduled retry for instance ${instanceId}, node ${nodeId} at ${retryTime}`,
    );
  }

  private async skipNode(instanceId: string, nodeId: string): Promise<void> {
    // Mark the node execution as skipped
    await this.supabase.from('journey_node_executions').insert({
      instance_id: instanceId,
      node_id: nodeId,
      status: 'skipped',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      output_data: { skipped_reason: 'error_recovery' },
    });

    // Continue to next node
    await this.advanceToNextNode(instanceId, nodeId);

    console.log(`Skipped node ${nodeId} for instance ${instanceId}`);
  }

  private async resetNode(instanceId: string, nodeId: string): Promise<void> {
    // Reset any pending schedules for this node
    await this.supabase
      .from('journey_schedules')
      .update({ status: 'cancelled' })
      .eq('instance_id', instanceId)
      .eq('node_id', nodeId)
      .eq('status', 'pending');

    // Reset node execution state
    await this.supabase
      .from('journey_node_executions')
      .update({ status: 'pending' })
      .eq('instance_id', instanceId)
      .eq('node_id', nodeId)
      .in('status', ['failed', 'executing']);

    console.log(`Reset node ${nodeId} for instance ${instanceId}`);
  }

  private async createManualInterventionTicket(
    instanceId: string,
    nodeId: string,
    error: Error,
    action: RecoveryAction,
  ): Promise<void> {
    await this.supabase.from('journey_intervention_tickets').insert({
      instance_id: instanceId,
      node_id: nodeId,
      error_message: error.message,
      error_stack: error.stack,
      escalation_level: action.escalation_level || 'support',
      status: 'open',
      priority: this.getPriorityFromEscalation(action.escalation_level),
      created_at: new Date().toISOString(),
      context_data: {
        error_classification: this.classifyError(error.message),
        recommended_action: action,
      },
    });

    // Pause the instance if critical
    if (action.escalation_level === 'emergency') {
      await JourneyStateMachine.transitionInstance(
        instanceId,
        'active',
        'paused',
        `Emergency intervention required: ${error.message}`,
      );
    }

    console.log(
      `Created manual intervention ticket for instance ${instanceId}`,
    );
  }

  private async triggerCircuitBreaker(
    nodeId: string,
    error: Error,
  ): Promise<void> {
    // Disable all executions for this node type temporarily
    await this.supabase.from('journey_circuit_breakers').upsert({
      node_id: nodeId,
      is_open: true,
      failure_count: this.config.circuitBreakerThreshold,
      last_failure: new Date().toISOString(),
      reset_at: new Date(
        Date.now() + this.config.circuitBreakerTimeoutMs,
      ).toISOString(),
      failure_reason: error.message,
    });

    console.log(`Circuit breaker opened for node ${nodeId}`);
  }

  private async advanceToNextNode(
    instanceId: string,
    currentNodeId: string,
  ): Promise<void> {
    // Get the next node in the journey
    const { data: instance } = await this.supabase
      .from('journey_instances')
      .select(
        `
        *,
        journey:journeys(*),
        current_node:journey_nodes(*)
      `,
      )
      .eq('id', instanceId)
      .single();

    if (!instance) return;

    // Get edges from current node
    const { data: edges } = await this.supabase
      .from('journey_edges')
      .select('*')
      .eq('from_node_id', currentNodeId);

    if (edges && edges.length > 0) {
      // For simplicity, take the first edge (could be enhanced with condition logic)
      const nextNodeId = edges[0].to_node_id;

      // Update instance current node
      await this.supabase
        .from('journey_instances')
        .update({
          current_node_id: nextNodeId,
          current_step: (instance.current_step || 0) + 1,
        })
        .eq('id', instanceId);

      // Schedule next node execution
      await this.supabase.from('journey_schedules').insert({
        instance_id: instanceId,
        node_id: nextNodeId,
        action_type: 'execute_node',
        scheduled_for: new Date().toISOString(),
        status: 'pending',
        priority: 3,
      });
    }
  }

  private async logError(
    instanceId: string,
    nodeId: string,
    error: Error,
    context: any,
  ): Promise<void> {
    await this.supabase.from('journey_error_logs').insert({
      instance_id: instanceId,
      node_id: nodeId,
      error_message: error.message,
      error_stack: error.stack,
      error_classification: this.classifyError(error.message).classification,
      context_data: context,
      created_at: new Date().toISOString(),
    });
  }

  private async getErrorHistory(
    instanceId: string,
    nodeId: string,
  ): Promise<any[]> {
    const { data } = await this.supabase
      .from('journey_error_logs')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('node_id', nodeId)
      .order('created_at', { ascending: false })
      .limit(10);

    return data || [];
  }

  private calculateRetryDelay(attemptNumber: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelayMs;
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);
    const jitter = Math.random() * 1000; // Random jitter up to 1 second

    return Math.min(exponentialDelay + jitter, 60000); // Max 1 minute
  }

  private isCircuitBreakerOpen(circuitKey: string): boolean {
    const circuit = this.circuitBreakers.get(circuitKey);
    if (!circuit) return false;

    if (circuit.isOpen) {
      // Check if circuit breaker should reset
      const timeSinceLastFailure = Date.now() - circuit.lastFailure.getTime();
      if (timeSinceLastFailure > this.config.circuitBreakerTimeoutMs) {
        circuit.isOpen = false;
        circuit.failures = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private updateCircuitBreaker(circuitKey: string, success: boolean): void {
    let circuit = this.circuitBreakers.get(circuitKey);
    if (!circuit) {
      circuit = { failures: 0, lastFailure: new Date(), isOpen: false };
      this.circuitBreakers.set(circuitKey, circuit);
    }

    if (success) {
      circuit.failures = 0;
    } else {
      circuit.failures++;
      circuit.lastFailure = new Date();

      if (circuit.failures >= this.config.circuitBreakerThreshold) {
        circuit.isOpen = true;
      }
    }
  }

  private getEscalationLevel(
    priority: string,
  ): 'support' | 'engineering' | 'emergency' {
    switch (priority) {
      case 'critical':
        return 'emergency';
      case 'high':
        return 'engineering';
      default:
        return 'support';
    }
  }

  private getPriorityFromEscalation(escalation?: string): number {
    switch (escalation) {
      case 'emergency':
        return 1;
      case 'engineering':
        return 2;
      case 'support':
        return 3;
      default:
        return 4;
    }
  }

  private startErrorMonitoring(): void {
    // Monitor error rates and trigger alerts
    setInterval(async () => {
      await this.checkErrorThresholds();
    }, 60000); // Check every minute
  }

  private async checkErrorThresholds(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 3600000);

      // Check error rate
      const [{ count: totalExecutions }, { count: failedExecutions }] =
        await Promise.all([
          this.supabase
            .from('journey_node_executions')
            .select('id', { count: 'exact', head: true })
            .gte('started_at', oneHourAgo.toISOString()),

          this.supabase
            .from('journey_node_executions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'failed')
            .gte('started_at', oneHourAgo.toISOString()),
        ]);

      const errorRate =
        (totalExecutions || 0) > 0
          ? (failedExecutions || 0) / (totalExecutions || 0)
          : 0;

      if (errorRate > this.config.alertThresholds.errorRate) {
        await this.triggerAlert('high_error_rate', {
          error_rate: errorRate,
          failed_executions: failedExecutions,
          total_executions: totalExecutions,
        });
      }

      // Check for stuck instances
      const { count: stuckInstances } = await this.supabase
        .from('journey_instances')
        .select('id', { count: 'exact', head: true })
        .eq('state', 'active')
        .lt('updated_at', new Date(Date.now() - 3600000).toISOString()); // Stuck for > 1 hour

      if (
        (stuckInstances || 0) > this.config.alertThresholds.stuckInstancesCount
      ) {
        await this.triggerAlert('stuck_instances', {
          stuck_count: stuckInstances,
        });
      }
    } catch (error) {
      console.error('Error checking thresholds:', error);
    }
  }

  private async triggerAlert(alertType: string, data: any): Promise<void> {
    console.warn(`ALERT: ${alertType}`, data);

    // Store alert in database
    await this.supabase.from('journey_alerts').insert({
      alert_type: alertType,
      severity: this.getAlertSeverity(alertType),
      alert_data: data,
      status: 'open',
      created_at: new Date().toISOString(),
    });

    // Could integrate with external alerting systems here
    // e.g., PagerDuty, Slack, email notifications
  }

  private getAlertSeverity(alertType: string): string {
    switch (alertType) {
      case 'high_error_rate':
        return 'high';
      case 'stuck_instances':
        return 'medium';
      default:
        return 'low';
    }
  }
}

// Global singleton
let errorRecoverySystem: JourneyErrorRecoverySystem | null = null;

export function getErrorRecoverySystem(): JourneyErrorRecoverySystem {
  if (!errorRecoverySystem) {
    errorRecoverySystem = new JourneyErrorRecoverySystem();
  }
  return errorRecoverySystem;
}
