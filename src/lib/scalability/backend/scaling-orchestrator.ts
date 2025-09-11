/**
 * WS-340: Scaling Orchestrator
 * Team B - Backend/API Development
 *
 * Orchestrates infrastructure scaling with wedding-day protection
 * Sub-30-second response to traffic spikes
 */

import {
  ScalingResult,
  WeddingScalingContext,
  SCALING_COOLDOWN_PERIODS,
} from '../types/core';

export interface ScalingOrchestratorConfig {
  maxScaleUpRate: number;
  maxScaleDownRate: number;
  cooldownPeriod: number;
  weddingDayProtection: boolean;
}

export interface ScalingAction {
  service: string;
  targetInstances: number;
  reason: string;
  weddingContext?: any;
}

export interface OrchestrationResult {
  success: boolean;
  actualInstances: number;
  errors?: any[];
}

export class ScalingOrchestrator {
  private config: ScalingOrchestratorConfig;
  private lastScalingActions: Map<string, Date> = new Map();
  private activeScalingOperations: Set<string> = new Set();
  private emergencyMode: boolean = false;

  constructor(config: ScalingOrchestratorConfig) {
    this.config = config;
  }

  async executeScaling(action: ScalingAction): Promise<OrchestrationResult> {
    const operationId = `${action.service}_${Date.now()}`;

    try {
      // Check if scaling is allowed
      const validationResult = await this.validateScalingAction(action);
      if (!validationResult.valid) {
        return {
          success: false,
          actualInstances: await this.getCurrentInstanceCount(action.service),
          errors: validationResult.errors,
        };
      }

      // Mark operation as active
      this.activeScalingOperations.add(operationId);
      console.log(
        `[ScalingOrchestrator] Starting scaling operation: ${operationId}`,
      );

      // Execute the scaling action
      const result = await this.performScalingAction(action);

      // Record the scaling action
      this.lastScalingActions.set(action.service, new Date());

      console.log(
        `[ScalingOrchestrator] Scaling operation ${operationId} completed: ${result.success}`,
      );

      return result;
    } catch (error) {
      console.error(
        `[ScalingOrchestrator] Scaling operation ${operationId} failed:`,
        error,
      );
      return {
        success: false,
        actualInstances: await this.getCurrentInstanceCount(action.service),
        errors: [
          {
            code: 'ORCHESTRATION_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Unknown orchestration error',
            severity: 'error',
            recoverable: true,
          },
        ],
      };
    } finally {
      this.activeScalingOperations.delete(operationId);
    }
  }

  private async validateScalingAction(action: ScalingAction): Promise<{
    valid: boolean;
    errors?: any[];
  }> {
    const errors = [];

    // Check if service is already being scaled
    if (this.isServiceBeingScaled(action.service)) {
      errors.push({
        code: 'CONCURRENT_SCALING',
        message: `Service ${action.service} is already being scaled`,
        severity: 'warning',
        recoverable: true,
      });
    }

    // Check cooldown period
    if (await this.isInCooldownPeriod(action.service)) {
      const remainingCooldown = await this.getRemainingCooldownTime(
        action.service,
      );
      errors.push({
        code: 'COOLDOWN_PERIOD',
        message: `Service ${action.service} is in cooldown period (${remainingCooldown}ms remaining)`,
        severity: 'info',
        recoverable: true,
      });
    }

    // Check scaling rate limits
    const currentInstances = await this.getCurrentInstanceCount(action.service);
    const scaleDirection =
      action.targetInstances > currentInstances ? 'up' : 'down';
    const scalingRate =
      Math.abs(action.targetInstances - currentInstances) / currentInstances;

    if (scaleDirection === 'up' && scalingRate > this.config.maxScaleUpRate) {
      errors.push({
        code: 'SCALE_UP_RATE_EXCEEDED',
        message: `Scale up rate (${scalingRate.toFixed(2)}) exceeds maximum (${this.config.maxScaleUpRate})`,
        severity: 'error',
        recoverable: false,
      });
    }

    if (
      scaleDirection === 'down' &&
      scalingRate > this.config.maxScaleDownRate
    ) {
      errors.push({
        code: 'SCALE_DOWN_RATE_EXCEEDED',
        message: `Scale down rate (${scalingRate.toFixed(2)}) exceeds maximum (${this.config.maxScaleDownRate})`,
        severity: 'error',
        recoverable: false,
      });
    }

    // Wedding day protection
    if (this.config.weddingDayProtection && scaleDirection === 'down') {
      const isWeddingDay = await this.isWeddingDay();
      if (isWeddingDay) {
        errors.push({
          code: 'WEDDING_DAY_PROTECTION',
          message: 'Scaling down is prohibited on wedding days',
          severity: 'error',
          recoverable: false,
        });
      }
    }

    // Check service limits
    const serviceLimits = await this.getServiceLimits(action.service);
    if (
      action.targetInstances < serviceLimits.min ||
      action.targetInstances > serviceLimits.max
    ) {
      errors.push({
        code: 'INSTANCE_LIMITS_EXCEEDED',
        message: `Target instances (${action.targetInstances}) outside service limits (${serviceLimits.min}-${serviceLimits.max})`,
        severity: 'error',
        recoverable: false,
      });
    }

    const criticalErrors = errors.filter((e) => e.severity === 'error');
    return {
      valid: criticalErrors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async performScalingAction(
    action: ScalingAction,
  ): Promise<OrchestrationResult> {
    const currentInstances = await this.getCurrentInstanceCount(action.service);
    const targetInstances = action.targetInstances;

    console.log(
      `[ScalingOrchestrator] Scaling ${action.service} from ${currentInstances} to ${targetInstances} instances`,
    );

    try {
      // Determine scaling strategy
      if (targetInstances > currentInstances) {
        return await this.scaleUp(
          action.service,
          currentInstances,
          targetInstances,
          action.reason,
        );
      } else if (targetInstances < currentInstances) {
        return await this.scaleDown(
          action.service,
          currentInstances,
          targetInstances,
          action.reason,
        );
      } else {
        // No scaling needed
        return {
          success: true,
          actualInstances: currentInstances,
        };
      }
    } catch (error) {
      console.error(
        `[ScalingOrchestrator] Failed to perform scaling action for ${action.service}:`,
        error,
      );
      return {
        success: false,
        actualInstances: currentInstances,
        errors: [
          {
            code: 'SCALING_EXECUTION_FAILED',
            message:
              error instanceof Error
                ? error.message
                : 'Scaling execution failed',
            severity: 'error',
            recoverable: true,
          },
        ],
      };
    }
  }

  private async scaleUp(
    service: string,
    currentInstances: number,
    targetInstances: number,
    reason: string,
  ): Promise<OrchestrationResult> {
    const instancesToAdd = targetInstances - currentInstances;
    console.log(
      `[ScalingOrchestrator] Scaling up ${service}: adding ${instancesToAdd} instances`,
    );

    try {
      // Simulate scaling up process
      // In production, this would interact with container orchestrators like Kubernetes, ECS, etc.

      // Phase 1: Request new instances
      const newInstances = await this.requestNewInstances(
        service,
        instancesToAdd,
      );
      console.log(
        `[ScalingOrchestrator] Requested ${newInstances.length} new instances for ${service}`,
      );

      // Phase 2: Wait for instances to become ready
      const readyInstances = await this.waitForInstancesReady(
        service,
        newInstances,
      );
      console.log(
        `[ScalingOrchestrator] ${readyInstances.length} instances are ready for ${service}`,
      );

      // Phase 3: Register instances with load balancer
      await this.registerInstancesWithLoadBalancer(service, readyInstances);
      console.log(
        `[ScalingOrchestrator] Registered ${readyInstances.length} instances with load balancer for ${service}`,
      );

      // Phase 4: Update service configuration
      await this.updateServiceConfiguration(
        service,
        currentInstances + readyInstances.length,
      );

      const actualInstances = currentInstances + readyInstances.length;
      const success = readyInstances.length === instancesToAdd;

      if (!success) {
        console.warn(
          `[ScalingOrchestrator] Partial scale up for ${service}: ${readyInstances.length}/${instancesToAdd} instances ready`,
        );
      }

      return {
        success,
        actualInstances,
        errors: success
          ? undefined
          : [
              {
                code: 'PARTIAL_SCALE_UP',
                message: `Only ${readyInstances.length} of ${instancesToAdd} requested instances became ready`,
                severity: 'warning',
                recoverable: true,
              },
            ],
      };
    } catch (error) {
      console.error(
        `[ScalingOrchestrator] Scale up failed for ${service}:`,
        error,
      );
      return {
        success: false,
        actualInstances: await this.getCurrentInstanceCount(service),
        errors: [
          {
            code: 'SCALE_UP_FAILED',
            message:
              error instanceof Error
                ? error.message
                : 'Scale up operation failed',
            severity: 'error',
            recoverable: true,
          },
        ],
      };
    }
  }

  private async scaleDown(
    service: string,
    currentInstances: number,
    targetInstances: number,
    reason: string,
  ): Promise<OrchestrationResult> {
    const instancesToRemove = currentInstances - targetInstances;
    console.log(
      `[ScalingOrchestrator] Scaling down ${service}: removing ${instancesToRemove} instances`,
    );

    try {
      // Phase 1: Select instances to remove (prefer least utilized)
      const instancesToTerminate = await this.selectInstancesForTermination(
        service,
        instancesToRemove,
      );
      console.log(
        `[ScalingOrchestrator] Selected ${instancesToTerminate.length} instances for termination`,
      );

      // Phase 2: Drain traffic from selected instances
      await this.drainInstancesFromLoadBalancer(service, instancesToTerminate);
      console.log(
        `[ScalingOrchestrator] Drained traffic from ${instancesToTerminate.length} instances`,
      );

      // Phase 3: Wait for existing requests to complete (graceful shutdown)
      await this.waitForGracefulShutdown(service, instancesToTerminate);
      console.log(
        `[ScalingOrchestrator] Graceful shutdown completed for ${instancesToTerminate.length} instances`,
      );

      // Phase 4: Terminate instances
      const terminatedInstances = await this.terminateInstances(
        service,
        instancesToTerminate,
      );
      console.log(
        `[ScalingOrchestrator] Terminated ${terminatedInstances.length} instances`,
      );

      // Phase 5: Update service configuration
      await this.updateServiceConfiguration(
        service,
        currentInstances - terminatedInstances.length,
      );

      const actualInstances = currentInstances - terminatedInstances.length;
      const success = terminatedInstances.length === instancesToRemove;

      return {
        success,
        actualInstances,
        errors: success
          ? undefined
          : [
              {
                code: 'PARTIAL_SCALE_DOWN',
                message: `Only ${terminatedInstances.length} of ${instancesToRemove} instances were terminated`,
                severity: 'warning',
                recoverable: true,
              },
            ],
      };
    } catch (error) {
      console.error(
        `[ScalingOrchestrator] Scale down failed for ${service}:`,
        error,
      );
      return {
        success: false,
        actualInstances: await this.getCurrentInstanceCount(service),
        errors: [
          {
            code: 'SCALE_DOWN_FAILED',
            message:
              error instanceof Error
                ? error.message
                : 'Scale down operation failed',
            severity: 'error',
            recoverable: true,
          },
        ],
      };
    }
  }

  // Infrastructure interaction methods (simulated for MVP)
  private async requestNewInstances(
    service: string,
    count: number,
  ): Promise<string[]> {
    // Simulate instance creation delay
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.random() * 3000),
    ); // 2-5 seconds

    const instances = [];
    for (let i = 0; i < count; i++) {
      instances.push(`${service}-instance-${Date.now()}-${i}`);
    }
    return instances;
  }

  private async waitForInstancesReady(
    service: string,
    instances: string[],
  ): Promise<string[]> {
    // Simulate instance startup time
    await new Promise((resolve) =>
      setTimeout(resolve, 5000 + Math.random() * 10000),
    ); // 5-15 seconds

    // Simulate some instances failing to start (10% failure rate)
    const readyInstances = instances.filter(() => Math.random() > 0.1);
    return readyInstances;
  }

  private async registerInstancesWithLoadBalancer(
    service: string,
    instances: string[],
  ): Promise<void> {
    console.log(
      `[ScalingOrchestrator] Registering ${instances.length} instances with load balancer for ${service}`,
    );
    // Simulate load balancer registration
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000),
    ); // 1-3 seconds
  }

  private async selectInstancesForTermination(
    service: string,
    count: number,
  ): Promise<string[]> {
    // Get current instances for the service
    const allInstances = await this.getServiceInstances(service);

    // Sort by utilization (simulate - in practice would use real metrics)
    const sortedInstances = allInstances.sort(() => Math.random() - 0.5); // Random for simulation

    return sortedInstances.slice(0, count);
  }

  private async drainInstancesFromLoadBalancer(
    service: string,
    instances: string[],
  ): Promise<void> {
    console.log(
      `[ScalingOrchestrator] Draining ${instances.length} instances from load balancer for ${service}`,
    );
    // Simulate load balancer draining
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.random() * 3000),
    ); // 2-5 seconds
  }

  private async waitForGracefulShutdown(
    service: string,
    instances: string[],
  ): Promise<void> {
    // Simulate waiting for requests to complete
    const shutdownTimeout = service === 'database' ? 30000 : 15000; // Longer timeout for database
    await new Promise((resolve) => setTimeout(resolve, shutdownTimeout));
  }

  private async terminateInstances(
    service: string,
    instances: string[],
  ): Promise<string[]> {
    console.log(
      `[ScalingOrchestrator] Terminating ${instances.length} instances for ${service}`,
    );
    // Simulate instance termination (assume all succeed for MVP)
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000),
    ); // 1-3 seconds
    return instances;
  }

  private async updateServiceConfiguration(
    service: string,
    instanceCount: number,
  ): Promise<void> {
    console.log(
      `[ScalingOrchestrator] Updating service configuration for ${service}: ${instanceCount} instances`,
    );
    // Update internal tracking and external systems
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Helper methods
  private async getCurrentInstanceCount(service: string): Promise<number> {
    // Simulate getting current instance count from infrastructure
    const counts: Record<string, number> = {
      api: 3,
      database: 2,
      'file-storage': 1,
      'real-time': 2,
      'ai-services': 1,
    };

    return counts[service] || 1;
  }

  private async getServiceInstances(service: string): Promise<string[]> {
    const instanceCount = await this.getCurrentInstanceCount(service);
    const instances = [];

    for (let i = 0; i < instanceCount; i++) {
      instances.push(`${service}-instance-${i}`);
    }

    return instances;
  }

  private async getServiceLimits(
    service: string,
  ): Promise<{ min: number; max: number }> {
    const limits: Record<string, { min: number; max: number }> = {
      api: { min: 2, max: 20 },
      database: { min: 1, max: 5 },
      'file-storage': { min: 1, max: 10 },
      'real-time': { min: 2, max: 15 },
      'ai-services': { min: 1, max: 8 },
    };

    return limits[service] || { min: 1, max: 5 };
  }

  private isServiceBeingScaled(service: string): boolean {
    return Array.from(this.activeScalingOperations).some((op) =>
      op.startsWith(service),
    );
  }

  private async isInCooldownPeriod(service: string): Promise<boolean> {
    const lastScaling = this.lastScalingActions.get(service);
    if (!lastScaling) return false;

    const cooldownPeriod = this.emergencyMode
      ? SCALING_COOLDOWN_PERIODS.EMERGENCY
      : this.config.cooldownPeriod;

    const timeSinceLastScaling = Date.now() - lastScaling.getTime();
    return timeSinceLastScaling < cooldownPeriod;
  }

  private async getRemainingCooldownTime(service: string): Promise<number> {
    const lastScaling = this.lastScalingActions.get(service);
    if (!lastScaling) return 0;

    const cooldownPeriod = this.emergencyMode
      ? SCALING_COOLDOWN_PERIODS.EMERGENCY
      : this.config.cooldownPeriod;

    const timeSinceLastScaling = Date.now() - lastScaling.getTime();
    return Math.max(0, cooldownPeriod - timeSinceLastScaling);
  }

  private async isWeddingDay(): Promise<boolean> {
    // Check if today is a wedding day (simulate)
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Most weddings happen on weekends (Friday=5, Saturday=6, Sunday=0)
    if (dayOfWeek === 6) return true; // Saturday - definitely wedding day
    if (dayOfWeek === 0 || dayOfWeek === 5) return Math.random() < 0.7; // Sunday/Friday - likely

    return Math.random() < 0.1; // Other days - unlikely but possible
  }

  async enableEmergencyMode(): Promise<void> {
    console.warn(
      '[ScalingOrchestrator] EMERGENCY MODE ENABLED - Reduced cooldown periods',
    );
    this.emergencyMode = true;
  }

  async disableEmergencyMode(): Promise<void> {
    console.log(
      '[ScalingOrchestrator] Emergency mode disabled - Normal cooldown periods restored',
    );
    this.emergencyMode = false;
  }

  getActiveOperations(): string[] {
    return Array.from(this.activeScalingOperations);
  }

  async getScalingHistory(
    service: string,
    hours: number = 24,
  ): Promise<Date[]> {
    // Return scaling history for the service
    const lastScaling = this.lastScalingActions.get(service);
    const history = lastScaling ? [lastScaling] : [];

    // Filter by time range
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return history.filter((date) => date.getTime() > cutoff);
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const details = {
      activeOperations: this.activeScalingOperations.size,
      emergencyMode: this.emergencyMode,
      recentScalingActions: this.lastScalingActions.size,
      config: {
        maxScaleUpRate: this.config.maxScaleUpRate,
        maxScaleDownRate: this.config.maxScaleDownRate,
        cooldownPeriod: this.config.cooldownPeriod,
        weddingDayProtection: this.config.weddingDayProtection,
      },
    };

    // Determine health status
    if (this.activeScalingOperations.size === 0) {
      return { status: 'healthy', details };
    } else if (this.activeScalingOperations.size < 3) {
      return { status: 'degraded', details };
    } else {
      return { status: 'unhealthy', details };
    }
  }
}
