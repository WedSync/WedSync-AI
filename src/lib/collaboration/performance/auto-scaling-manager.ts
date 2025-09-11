// WS-342: Real-Time Wedding Collaboration - Auto-Scaling Manager
// Team B Backend Development - Batch 1 Round 1

import { EventEmitter } from 'events';

interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetCpuUsage: number; // percentage
  targetMemoryUsage: number; // percentage
  targetConnectionsPerInstance: number;
  targetResponseTime: number; // milliseconds
  scaleUpThreshold: number; // seconds before scaling up
  scaleDownThreshold: number; // seconds before scaling down
  cooldownPeriod: number; // seconds between scaling actions
  weddingSeasonMultiplier: number; // scale up factor during wedding season
  emergencyScalingEnabled: boolean;
}

interface InstanceMetrics {
  instanceId: string;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  averageResponseTime: number;
  eventThroughput: number;
  lastUpdated: Date;
  isHealthy: boolean;
  region: string;
  zone: string;
}

interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'no_action';
  targetInstances: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  estimatedTime: number; // seconds to complete
  regions?: string[];
}

interface WeddingLoadPrediction {
  weddingId: string;
  weddingDate: Date;
  expectedGuestCount: number;
  expectedVendors: number;
  predictedPeakLoad: number;
  predictedDuration: number; // hours
  recommendedInstances: number;
}

interface ScalingEvent {
  id: string;
  timestamp: Date;
  action: string;
  instanceCount: number;
  triggeredBy: string;
  completionTime?: Date;
  success: boolean;
  metrics: any;
}

export class AutoScalingManager extends EventEmitter {
  private config: ScalingConfig;
  private currentInstances: Map<string, InstanceMetrics> = new Map();
  private scalingHistory: ScalingEvent[] = [];
  private lastScalingAction: Date | null = null;
  private weddingLoadPredictions: Map<string, WeddingLoadPrediction> =
    new Map();
  private isWeddingSeason = false;
  private emergencyMode = false;

  // Monitoring intervals
  private metricsInterval: NodeJS.Timeout | null = null;
  private scalingEvaluationInterval: NodeJS.Timeout | null = null;
  private loadPredictionInterval: NodeJS.Timeout | null = null;

  constructor(config: ScalingConfig) {
    super();
    this.config = {
      minInstances: 2,
      maxInstances: 100,
      targetCpuUsage: 70,
      targetMemoryUsage: 80,
      targetConnectionsPerInstance: 1000,
      targetResponseTime: 100, // 100ms target
      scaleUpThreshold: 300, // 5 minutes
      scaleDownThreshold: 1800, // 30 minutes
      cooldownPeriod: 300, // 5 minutes
      weddingSeasonMultiplier: 2.0,
      emergencyScalingEnabled: true,
      ...config,
    };

    this.startMonitoring();
    this.evaluateWeddingSeason();
  }

  // Main scaling evaluation and decision logic
  async evaluateScaling(): Promise<ScalingDecision> {
    try {
      // Gather current system metrics
      const systemMetrics = this.calculateSystemMetrics();
      const currentInstanceCount = this.currentInstances.size;

      // Check for emergency conditions first
      if (this.config.emergencyScalingEnabled) {
        const emergencyDecision = this.checkEmergencyConditions(systemMetrics);
        if (emergencyDecision.action !== 'no_action') {
          return emergencyDecision;
        }
      }

      // Check cooldown period
      if (this.isInCooldownPeriod()) {
        return {
          action: 'no_action',
          targetInstances: currentInstanceCount,
          reason: 'Scaling cooldown period active',
          urgency: 'low',
          estimatedTime: 0,
        };
      }

      // Evaluate based on multiple metrics
      const cpuDecision = this.evaluateCpuScaling(systemMetrics);
      const memoryDecision = this.evaluateMemoryScaling(systemMetrics);
      const connectionDecision = this.evaluateConnectionScaling(systemMetrics);
      const responseTimeDecision =
        this.evaluateResponseTimeScaling(systemMetrics);
      const predictiveDecision = this.evaluatePredictiveScaling();

      // Combine decisions using weighted scoring
      const combinedDecision = this.combineScalingDecisions([
        cpuDecision,
        memoryDecision,
        connectionDecision,
        responseTimeDecision,
        predictiveDecision,
      ]);

      // Apply wedding season adjustments
      if (this.isWeddingSeason) {
        combinedDecision.targetInstances = Math.ceil(
          combinedDecision.targetInstances *
            this.config.weddingSeasonMultiplier,
        );
        combinedDecision.reason += ' (wedding season adjustment)';
      }

      // Ensure within bounds
      combinedDecision.targetInstances = Math.max(
        this.config.minInstances,
        Math.min(this.config.maxInstances, combinedDecision.targetInstances),
      );

      return combinedDecision;
    } catch (error) {
      console.error('Error evaluating scaling:', error);
      return {
        action: 'no_action',
        targetInstances: this.currentInstances.size,
        reason: 'Evaluation error',
        urgency: 'low',
        estimatedTime: 0,
      };
    }
  }

  // Execute scaling decision
  async executeScaling(
    decision: ScalingDecision,
  ): Promise<{ success: boolean; instancesCreated?: string[] }> {
    try {
      const currentCount = this.currentInstances.size;
      const scalingEventId = `scaling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create scaling event record
      const scalingEvent: ScalingEvent = {
        id: scalingEventId,
        timestamp: new Date(),
        action: decision.action,
        instanceCount: decision.targetInstances,
        triggeredBy: decision.reason,
        success: false,
        metrics: this.calculateSystemMetrics(),
      };

      this.scalingHistory.push(scalingEvent);

      // Emit scaling start event
      this.emit('scaling_started', {
        eventId: scalingEventId,
        decision,
        currentInstances: currentCount,
      });

      let instancesCreated: string[] = [];

      if (decision.action === 'scale_up') {
        const instancesToCreate = decision.targetInstances - currentCount;
        instancesCreated = await this.scaleUp(
          instancesToCreate,
          decision.regions,
        );
      } else if (decision.action === 'scale_down') {
        const instancesToRemove = currentCount - decision.targetInstances;
        await this.scaleDown(instancesToRemove);
      }

      // Update scaling event
      scalingEvent.success = true;
      scalingEvent.completionTime = new Date();
      this.lastScalingAction = new Date();

      // Emit scaling completed event
      this.emit('scaling_completed', {
        eventId: scalingEventId,
        decision,
        instancesCreated,
        newInstanceCount: this.currentInstances.size,
      });

      return { success: true, instancesCreated };
    } catch (error) {
      console.error('Error executing scaling:', error);

      this.emit('scaling_failed', {
        decision,
        error: error.message,
      });

      return { success: false };
    }
  }

  // Wedding-specific predictive scaling
  async scheduleWeddingScaling(
    weddingPrediction: WeddingLoadPrediction,
  ): Promise<{ scheduled: boolean; scheduleTime: Date }> {
    try {
      // Store prediction
      this.weddingLoadPredictions.set(
        weddingPrediction.weddingId,
        weddingPrediction,
      );

      // Calculate when to start scaling (30 minutes before wedding)
      const preScaleTime = new Date(
        weddingPrediction.weddingDate.getTime() - 30 * 60 * 1000,
      );
      const postScaleTime = new Date(
        weddingPrediction.weddingDate.getTime() +
          weddingPrediction.predictedDuration * 60 * 60 * 1000 +
          60 * 60 * 1000, // 1 hour buffer
      );

      // Schedule pre-wedding scaling
      setTimeout(
        () => {
          this.executePreWeddingScaling(weddingPrediction);
        },
        Math.max(0, preScaleTime.getTime() - Date.now()),
      );

      // Schedule post-wedding scale down
      setTimeout(
        () => {
          this.executePostWeddingScaling(weddingPrediction.weddingId);
        },
        Math.max(0, postScaleTime.getTime() - Date.now()),
      );

      this.emit('wedding_scaling_scheduled', {
        weddingId: weddingPrediction.weddingId,
        preScaleTime,
        postScaleTime,
        recommendedInstances: weddingPrediction.recommendedInstances,
      });

      return { scheduled: true, scheduleTime: preScaleTime };
    } catch (error) {
      console.error('Error scheduling wedding scaling:', error);
      return { scheduled: false, scheduleTime: new Date() };
    }
  }

  // Handle emergency scaling situations
  async handleEmergencyScaling(
    reason: string,
  ): Promise<{ success: boolean; instancesAdded: number }> {
    try {
      this.emergencyMode = true;

      // Immediate scale up to maximum capacity
      const currentCount = this.currentInstances.size;
      const emergencyTarget = Math.min(
        this.config.maxInstances,
        Math.floor(currentCount * 3), // Triple current capacity
      );

      const decision: ScalingDecision = {
        action: 'scale_up',
        targetInstances: emergencyTarget,
        reason: `Emergency scaling: ${reason}`,
        urgency: 'emergency',
        estimatedTime: 60, // Faster deployment
      };

      const result = await this.executeScaling(decision);

      this.emit('emergency_scaling_activated', {
        reason,
        currentInstances: currentCount,
        targetInstances: emergencyTarget,
        success: result.success,
      });

      return {
        success: result.success,
        instancesAdded: result.instancesCreated?.length || 0,
      };
    } catch (error) {
      console.error('Emergency scaling failed:', error);
      return { success: false, instancesAdded: 0 };
    }
  }

  // Update instance metrics (called by monitoring system)
  updateInstanceMetrics(
    instanceId: string,
    metrics: Partial<InstanceMetrics>,
  ): void {
    const existing = this.currentInstances.get(instanceId) || {
      instanceId,
      cpuUsage: 0,
      memoryUsage: 0,
      activeConnections: 0,
      averageResponseTime: 0,
      eventThroughput: 0,
      lastUpdated: new Date(),
      isHealthy: true,
      region: 'us-east-1',
      zone: 'a',
    };

    const updated = {
      ...existing,
      ...metrics,
      lastUpdated: new Date(),
    };

    this.currentInstances.set(instanceId, updated);

    // Check if instance needs immediate attention
    if (
      !updated.isHealthy ||
      updated.cpuUsage > 95 ||
      updated.memoryUsage > 95
    ) {
      this.emit('instance_unhealthy', { instanceId, metrics: updated });
    }
  }

  // Remove instance from tracking
  removeInstance(instanceId: string): void {
    this.currentInstances.delete(instanceId);
    this.emit('instance_removed', { instanceId });
  }

  // Get current scaling status
  getScalingStatus(): {
    currentInstances: number;
    targetInstances: number;
    isWeddingSeason: boolean;
    emergencyMode: boolean;
    lastScalingAction: Date | null;
    systemMetrics: any;
    predictions: WeddingLoadPrediction[];
  } {
    return {
      currentInstances: this.currentInstances.size,
      targetInstances: this.currentInstances.size, // Would be calculated from latest decision
      isWeddingSeason: this.isWeddingSeason,
      emergencyMode: this.emergencyMode,
      lastScalingAction: this.lastScalingAction,
      systemMetrics: this.calculateSystemMetrics(),
      predictions: Array.from(this.weddingLoadPredictions.values()),
    };
  }

  // Shutdown scaling manager
  async shutdown(): Promise<void> {
    console.log('Shutting down auto-scaling manager...');

    // Clear intervals
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.scalingEvaluationInterval)
      clearInterval(this.scalingEvaluationInterval);
    if (this.loadPredictionInterval) clearInterval(this.loadPredictionInterval);

    // Scale down to minimum instances if not in emergency mode
    if (!this.emergencyMode) {
      const decision: ScalingDecision = {
        action: 'scale_down',
        targetInstances: this.config.minInstances,
        reason: 'System shutdown',
        urgency: 'low',
        estimatedTime: 300,
      };

      await this.executeScaling(decision);
    }

    console.log('Auto-scaling manager shutdown complete');
  }

  // Private helper methods
  private startMonitoring(): void {
    // Evaluate scaling every 30 seconds
    this.scalingEvaluationInterval = setInterval(() => {
      this.evaluateScaling().then((decision) => {
        if (decision.action !== 'no_action') {
          this.executeScaling(decision);
        }
      });
    }, 30000);

    // Update load predictions every 5 minutes
    this.loadPredictionInterval = setInterval(() => {
      this.updateLoadPredictions();
    }, 300000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  private calculateSystemMetrics(): any {
    const instances = Array.from(this.currentInstances.values());

    if (instances.length === 0) {
      return {
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        totalConnections: 0,
        avgResponseTime: 0,
        totalEventThroughput: 0,
        healthyInstances: 0,
      };
    }

    return {
      avgCpuUsage:
        instances.reduce((sum, i) => sum + i.cpuUsage, 0) / instances.length,
      avgMemoryUsage:
        instances.reduce((sum, i) => sum + i.memoryUsage, 0) / instances.length,
      totalConnections: instances.reduce(
        (sum, i) => sum + i.activeConnections,
        0,
      ),
      avgResponseTime:
        instances.reduce((sum, i) => sum + i.averageResponseTime, 0) /
        instances.length,
      totalEventThroughput: instances.reduce(
        (sum, i) => sum + i.eventThroughput,
        0,
      ),
      healthyInstances: instances.filter((i) => i.isHealthy).length,
    };
  }

  private checkEmergencyConditions(metrics: any): ScalingDecision {
    const currentCount = this.currentInstances.size;

    // Critical response time
    if (metrics.avgResponseTime > 1000) {
      return {
        action: 'scale_up',
        targetInstances: Math.min(this.config.maxInstances, currentCount * 2),
        reason: 'Critical response time detected',
        urgency: 'emergency',
        estimatedTime: 60,
      };
    }

    // System overload
    if (metrics.avgCpuUsage > 95 && metrics.avgMemoryUsage > 90) {
      return {
        action: 'scale_up',
        targetInstances: Math.min(this.config.maxInstances, currentCount * 2),
        reason: 'System resource exhaustion',
        urgency: 'emergency',
        estimatedTime: 60,
      };
    }

    // Too many unhealthy instances
    const healthyRatio = metrics.healthyInstances / currentCount;
    if (healthyRatio < 0.5) {
      return {
        action: 'scale_up',
        targetInstances: Math.min(this.config.maxInstances, currentCount * 2),
        reason: 'Critical instance health degradation',
        urgency: 'emergency',
        estimatedTime: 60,
      };
    }

    return {
      action: 'no_action',
      targetInstances: currentCount,
      reason: 'No emergency conditions',
      urgency: 'low',
      estimatedTime: 0,
    };
  }

  private isInCooldownPeriod(): boolean {
    if (!this.lastScalingAction) return false;

    const cooldownEnd = new Date(
      this.lastScalingAction.getTime() + this.config.cooldownPeriod * 1000,
    );

    return new Date() < cooldownEnd;
  }

  private evaluateCpuScaling(metrics: any): ScalingDecision {
    const currentCount = this.currentInstances.size;

    if (metrics.avgCpuUsage > this.config.targetCpuUsage + 20) {
      return {
        action: 'scale_up',
        targetInstances: Math.ceil(currentCount * 1.5),
        reason: 'High CPU usage',
        urgency: 'medium',
        estimatedTime: 180,
      };
    }

    if (metrics.avgCpuUsage < this.config.targetCpuUsage - 30) {
      return {
        action: 'scale_down',
        targetInstances: Math.max(
          this.config.minInstances,
          Math.floor(currentCount * 0.8),
        ),
        reason: 'Low CPU usage',
        urgency: 'low',
        estimatedTime: 300,
      };
    }

    return {
      action: 'no_action',
      targetInstances: currentCount,
      reason: 'CPU usage within target range',
      urgency: 'low',
      estimatedTime: 0,
    };
  }

  private evaluateMemoryScaling(metrics: any): ScalingDecision {
    const currentCount = this.currentInstances.size;

    if (metrics.avgMemoryUsage > this.config.targetMemoryUsage + 15) {
      return {
        action: 'scale_up',
        targetInstances: Math.ceil(currentCount * 1.3),
        reason: 'High memory usage',
        urgency: 'medium',
        estimatedTime: 180,
      };
    }

    return {
      action: 'no_action',
      targetInstances: currentCount,
      reason: 'Memory usage acceptable',
      urgency: 'low',
      estimatedTime: 0,
    };
  }

  private evaluateConnectionScaling(metrics: any): ScalingDecision {
    const currentCount = this.currentInstances.size;
    const connectionsPerInstance = metrics.totalConnections / currentCount;

    if (
      connectionsPerInstance >
      this.config.targetConnectionsPerInstance * 1.2
    ) {
      return {
        action: 'scale_up',
        targetInstances: Math.ceil(
          metrics.totalConnections / this.config.targetConnectionsPerInstance,
        ),
        reason: 'High connection density',
        urgency: 'medium',
        estimatedTime: 180,
      };
    }

    return {
      action: 'no_action',
      targetInstances: currentCount,
      reason: 'Connection density acceptable',
      urgency: 'low',
      estimatedTime: 0,
    };
  }

  private evaluateResponseTimeScaling(metrics: any): ScalingDecision {
    const currentCount = this.currentInstances.size;

    if (metrics.avgResponseTime > this.config.targetResponseTime * 2) {
      return {
        action: 'scale_up',
        targetInstances: Math.ceil(currentCount * 1.5),
        reason: 'Poor response time performance',
        urgency: 'high',
        estimatedTime: 120,
      };
    }

    return {
      action: 'no_action',
      targetInstances: currentCount,
      reason: 'Response time acceptable',
      urgency: 'low',
      estimatedTime: 0,
    };
  }

  private evaluatePredictiveScaling(): ScalingDecision {
    const currentCount = this.currentInstances.size;
    const upcomingWeddings = this.getUpcomingWeddings();

    if (upcomingWeddings.length > 0) {
      const maxRecommended = Math.max(
        ...upcomingWeddings.map((w) => w.recommendedInstances),
      );

      if (maxRecommended > currentCount) {
        return {
          action: 'scale_up',
          targetInstances: maxRecommended,
          reason: 'Predictive scaling for upcoming weddings',
          urgency: 'medium',
          estimatedTime: 300,
        };
      }
    }

    return {
      action: 'no_action',
      targetInstances: currentCount,
      reason: 'No upcoming load predicted',
      urgency: 'low',
      estimatedTime: 0,
    };
  }

  private combineScalingDecisions(
    decisions: ScalingDecision[],
  ): ScalingDecision {
    // Simple weighted average approach
    const weights = { emergency: 4, high: 3, medium: 2, low: 1 };

    let totalWeight = 0;
    let weightedTargetSum = 0;
    let highestUrgency: any = 'low';
    let reasons: string[] = [];

    for (const decision of decisions) {
      const weight = weights[decision.urgency];
      totalWeight += weight;
      weightedTargetSum += decision.targetInstances * weight;

      if (weights[decision.urgency] > weights[highestUrgency]) {
        highestUrgency = decision.urgency;
      }

      if (decision.action !== 'no_action') {
        reasons.push(decision.reason);
      }
    }

    const targetInstances = Math.round(weightedTargetSum / totalWeight);
    const currentCount = this.currentInstances.size;

    let action: 'scale_up' | 'scale_down' | 'no_action';
    if (targetInstances > currentCount) {
      action = 'scale_up';
    } else if (targetInstances < currentCount) {
      action = 'scale_down';
    } else {
      action = 'no_action';
    }

    return {
      action,
      targetInstances,
      reason: reasons.length > 0 ? reasons.join('; ') : 'No scaling needed',
      urgency: highestUrgency,
      estimatedTime: 180,
    };
  }

  private async scaleUp(
    instancesToCreate: number,
    regions?: string[],
  ): Promise<string[]> {
    const createdInstances: string[] = [];

    for (let i = 0; i < instancesToCreate; i++) {
      const instanceId = `instance_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`;

      // Simulate instance creation
      setTimeout(() => {
        this.currentInstances.set(instanceId, {
          instanceId,
          cpuUsage: 10,
          memoryUsage: 20,
          activeConnections: 0,
          averageResponseTime: 50,
          eventThroughput: 0,
          lastUpdated: new Date(),
          isHealthy: true,
          region: regions?.[i % regions.length] || 'us-east-1',
          zone: ['a', 'b', 'c'][i % 3],
        });

        this.emit('instance_created', { instanceId });
      }, 60000); // 1 minute simulation delay

      createdInstances.push(instanceId);
    }

    return createdInstances;
  }

  private async scaleDown(instancesToRemove: number): Promise<void> {
    const instances = Array.from(this.currentInstances.entries());

    // Sort by resource usage (remove least utilized first)
    instances.sort(
      ([, a], [, b]) =>
        a.cpuUsage + a.memoryUsage - (b.cpuUsage + b.memoryUsage),
    );

    const toRemove = instances.slice(0, instancesToRemove);

    for (const [instanceId] of toRemove) {
      this.currentInstances.delete(instanceId);
      this.emit('instance_terminated', { instanceId });
    }
  }

  private async executePreWeddingScaling(
    prediction: WeddingLoadPrediction,
  ): Promise<void> {
    const decision: ScalingDecision = {
      action: 'scale_up',
      targetInstances: prediction.recommendedInstances,
      reason: `Pre-wedding scaling for ${prediction.weddingId}`,
      urgency: 'high',
      estimatedTime: 300,
    };

    await this.executeScaling(decision);
  }

  private async executePostWeddingScaling(weddingId: string): Promise<void> {
    // Remove prediction
    this.weddingLoadPredictions.delete(weddingId);

    // Scale down if no other weddings are coming up
    const remainingPredictions = Array.from(
      this.weddingLoadPredictions.values(),
    );
    const baselineInstances = this.isWeddingSeason
      ? this.config.minInstances * 2
      : this.config.minInstances;

    const targetInstances =
      remainingPredictions.length > 0
        ? Math.max(...remainingPredictions.map((p) => p.recommendedInstances))
        : baselineInstances;

    if (targetInstances < this.currentInstances.size) {
      const decision: ScalingDecision = {
        action: 'scale_down',
        targetInstances,
        reason: `Post-wedding scaling for ${weddingId}`,
        urgency: 'low',
        estimatedTime: 600,
      };

      await this.executeScaling(decision);
    }
  }

  private getUpcomingWeddings(): WeddingLoadPrediction[] {
    const now = Date.now();
    const next2Hours = now + 2 * 60 * 60 * 1000;

    return Array.from(this.weddingLoadPredictions.values())
      .filter((prediction) => {
        const weddingTime = prediction.weddingDate.getTime();
        return weddingTime > now && weddingTime < next2Hours;
      })
      .sort((a, b) => a.weddingDate.getTime() - b.weddingDate.getTime());
  }

  private evaluateWeddingSeason(): void {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    // Wedding season is typically April-October (months 4-10)
    this.isWeddingSeason = month >= 4 && month <= 10;

    // Check for peak months (June, July, August, September)
    if ([6, 7, 8, 9].includes(month)) {
      this.config.weddingSeasonMultiplier = 2.5;
    } else if (this.isWeddingSeason) {
      this.config.weddingSeasonMultiplier = 1.5;
    } else {
      this.config.weddingSeasonMultiplier = 1.0;
    }
  }

  private updateLoadPredictions(): void {
    // This would fetch wedding data from database to predict load
    // For now, we'll just clean up old predictions
    const now = Date.now();

    for (const [
      weddingId,
      prediction,
    ] of this.weddingLoadPredictions.entries()) {
      const weddingTime = prediction.weddingDate.getTime();
      const endTime =
        weddingTime +
        prediction.predictedDuration * 60 * 60 * 1000 +
        60 * 60 * 1000;

      if (endTime < now) {
        this.weddingLoadPredictions.delete(weddingId);
      }
    }
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Clean up scaling history
    this.scalingHistory = this.scalingHistory.filter(
      (event) => event.timestamp > cutoffTime,
    );

    // Remove instances that haven't reported metrics recently
    for (const [instanceId, metrics] of this.currentInstances.entries()) {
      if (metrics.lastUpdated < cutoffTime) {
        this.currentInstances.delete(instanceId);
        this.emit('instance_timeout', { instanceId });
      }
    }
  }
}
