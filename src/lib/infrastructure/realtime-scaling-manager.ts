/**
 * WS-202 Supabase Realtime Scaling Manager
 * Team D - Round 1: Auto-Scaling Infrastructure System
 *
 * Handles intelligent auto-scaling for 10x wedding season traffic spikes
 * with predictive scaling and wedding day optimization patterns
 */

import type {
  ScalingResult,
  ScalingAction,
  ScalingPolicy,
  ResourcePool,
  InfrastructureHealth,
  WeddingSeasonMetrics,
  PerformanceAlert,
  AlertThreshold,
  RealtimePerformanceConfig,
  RealtimePerformanceError,
  RealtimeHooks,
  WeddingOptimizationConfig,
} from '@/types/realtime-performance';

import { WeddingDayError } from '@/types/realtime-performance';

interface ScalingDecision {
  shouldScale: boolean;
  direction: 'up' | 'down' | 'maintain';
  targetCapacity: number;
  confidence: number;
  reasoning: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface WeddingSeasonPredictor {
  currentSeason: 'peak' | 'shoulder' | 'off';
  expectedLoadMultiplier: number;
  peakHours: number[];
  weddingDayForecast: {
    activeWeddings: number;
    expectedConnections: number;
    peakTime: string;
  };
}

interface ResourceMonitor {
  cpu: {
    current: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    threshold: number;
  };
  memory: {
    current: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    threshold: number;
  };
  connections: {
    active: number;
    capacity: number;
    utilization: number;
    threshold: number;
  };
  latency: {
    p95: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    threshold: number;
  };
}

export class RealtimeScalingManager {
  private static instance: RealtimeScalingManager;
  private scalingPolicies: Map<string, ScalingPolicy> = new Map();
  private resourcePools: Map<string, ResourcePool> = new Map();
  private scalingHistory: ScalingResult[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private weddingDayMode: boolean = false;
  private hooks: RealtimeHooks = {};
  private lastScalingAction: number = 0;
  private scalingCooldownPeriod: number = 300000; // 5 minutes

  private config: RealtimePerformanceConfig['scaling'] = {
    autoScalingEnabled: true,
    scaleUpThreshold: 0.8, // 80% utilization
    scaleDownThreshold: 0.3, // 30% utilization
    maxInstances: 50,
    minInstances: 3,
    weddingDayMultiplier: 3.0,
  };

  private alertThresholds: AlertThreshold[] = [
    {
      metric: 'connection_utilization',
      warning: 75,
      critical: 90,
      unit: 'percentage',
      window: 300, // 5 minutes
    },
    {
      metric: 'response_latency_p95',
      warning: 400,
      critical: 500,
      unit: 'milliseconds',
      window: 120, // 2 minutes
    },
    {
      metric: 'memory_usage',
      warning: 80,
      critical: 95,
      unit: 'percentage',
      window: 180, // 3 minutes
    },
    {
      metric: 'error_rate',
      warning: 2,
      critical: 5,
      unit: 'percentage',
      window: 60, // 1 minute
    },
  ];

  constructor(config?: Partial<RealtimePerformanceConfig['scaling']>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeScalingPolicies();
    this.initializeResourcePools();
    this.startResourceMonitoring();
  }

  // Singleton pattern for efficient resource management
  static getInstance(
    config?: Partial<RealtimePerformanceConfig['scaling']>,
  ): RealtimeScalingManager {
    if (!this.instance) {
      this.instance = new RealtimeScalingManager(config);
    }
    return this.instance;
  }

  // Set performance hooks for notifications
  setHooks(hooks: RealtimeHooks): void {
    this.hooks = { ...this.hooks, ...hooks };
  }

  // Main scaling decision engine
  async evaluateScalingNeed(): Promise<ScalingDecision> {
    const resourceMetrics = await this.getCurrentResourceMetrics();
    const weddingMetrics = await this.getWeddingSeasonMetrics();
    const healthStatus = await this.getInfrastructureHealth();

    let decision: ScalingDecision = {
      shouldScale: false,
      direction: 'maintain',
      targetCapacity: this.getCurrentCapacity(),
      confidence: 0,
      reasoning: [],
      urgency: 'low',
    };

    // Check if we're in cooldown period
    const timeSinceLastScaling = Date.now() - this.lastScalingAction;
    if (
      timeSinceLastScaling < this.scalingCooldownPeriod &&
      !this.weddingDayMode
    ) {
      decision.reasoning.push(
        `In cooldown period (${Math.floor(timeSinceLastScaling / 1000)}s remaining)`,
      );
      return decision;
    }

    // Evaluate scaling triggers
    const triggers = await this.evaluateScalingTriggers(
      resourceMetrics,
      weddingMetrics,
      healthStatus,
    );

    if (triggers.scaleUp.length > 0) {
      decision.shouldScale = true;
      decision.direction = 'up';
      decision.targetCapacity = await this.calculateScaleUpTarget(
        resourceMetrics,
        weddingMetrics,
      );
      decision.confidence = Math.min(triggers.scaleUp.length * 0.3, 1.0);
      decision.reasoning = triggers.scaleUp;
      decision.urgency = this.determineUrgency(triggers.scaleUp);
    } else if (triggers.scaleDown.length > 0 && !this.weddingDayMode) {
      decision.shouldScale = true;
      decision.direction = 'down';
      decision.targetCapacity =
        await this.calculateScaleDownTarget(resourceMetrics);
      decision.confidence = Math.min(triggers.scaleDown.length * 0.2, 0.8);
      decision.reasoning = triggers.scaleDown;
      decision.urgency = 'low';
    }

    // Wedding day overrides
    if (this.weddingDayMode) {
      decision = await this.applyWeddingDayOverrides(decision, weddingMetrics);
    }

    return decision;
  }

  // Execute scaling actions based on decision
  async executeScaling(decision: ScalingDecision): Promise<ScalingResult> {
    if (!decision.shouldScale || !this.config.autoScalingEnabled) {
      return {
        action: 'no_scaling_needed',
        currentCapacity: this.getCurrentCapacity(),
        requiredCapacity: decision.targetCapacity,
        scalingActions: [],
        timestamp: Date.now(),
      };
    }

    const scalingActions: ScalingAction[] = [];
    const currentCapacity = this.getCurrentCapacity();

    try {
      // Generate scaling actions based on direction and urgency
      if (decision.direction === 'up') {
        const upActions = await this.generateScaleUpActions(
          currentCapacity,
          decision.targetCapacity,
          decision.urgency,
        );
        scalingActions.push(...upActions);
      } else if (decision.direction === 'down') {
        const downActions = await this.generateScaleDownActions(
          currentCapacity,
          decision.targetCapacity,
        );
        scalingActions.push(...downActions);
      }

      // Execute actions sequentially with proper coordination
      await this.executeScalingActions(scalingActions, decision.urgency);

      // Update resource pools
      await this.updateResourcePools(decision.targetCapacity);

      // Record scaling history
      const result: ScalingResult = {
        action: decision.direction === 'up' ? 'scaled_up' : 'scaled_down',
        currentCapacity: decision.targetCapacity,
        requiredCapacity: decision.targetCapacity,
        scalingActions,
        timestamp: Date.now(),
      };

      this.scalingHistory.push(result);
      this.lastScalingAction = Date.now();

      // Trigger scaling event hook
      if (this.hooks.onScalingEvent) {
        this.hooks.onScalingEvent(result);
      }

      console.log(
        `Scaling ${decision.direction} completed: ${currentCapacity} → ${decision.targetCapacity}`,
      );
      return result;
    } catch (error) {
      console.error('Scaling execution failed:', error);

      const failureResult: ScalingResult = {
        action: 'failed',
        currentCapacity,
        requiredCapacity: decision.targetCapacity,
        scalingActions,
        timestamp: Date.now(),
      };

      // Trigger emergency protocols if scaling fails on wedding day
      if (this.weddingDayMode) {
        await this.triggerWeddingDayEmergencyProtocol(error as Error, decision);
      }

      return failureResult;
    }
  }

  // Wedding season predictive scaling
  async enableWeddingSeasonMode(
    seasonType: 'peak' | 'shoulder' | 'off' = 'peak',
  ): Promise<void> {
    console.log(`🌸 Enabling wedding season mode: ${seasonType}`);

    // Adjust scaling parameters for wedding season
    const seasonMultipliers = {
      peak: {
        scaleUp: 0.7,
        scaleDown: 0.4,
        maxInstances: this.config.maxInstances * 2,
      },
      shoulder: {
        scaleUp: 0.75,
        scaleDown: 0.35,
        maxInstances: this.config.maxInstances * 1.5,
      },
      off: {
        scaleUp: 0.8,
        scaleDown: 0.3,
        maxInstances: this.config.maxInstances,
      },
    };

    const multiplier = seasonMultipliers[seasonType];
    this.config.scaleUpThreshold = multiplier.scaleUp;
    this.config.scaleDownThreshold = multiplier.scaleDown;
    this.config.maxInstances = multiplier.maxInstances;

    // Proactive scaling for known peak periods
    await this.scheduleProactiveScaling(seasonType);
  }

  // Wedding day emergency mode
  async enableWeddingDayMode(
    activeWeddings: WeddingOptimizationConfig[],
  ): Promise<void> {
    this.weddingDayMode = true;
    console.log(
      `💒 Wedding Day Mode activated for ${activeWeddings.length} weddings`,
    );

    // Calculate required capacity for all active weddings
    const totalGuestCount = activeWeddings.reduce(
      (sum, wedding) => sum + wedding.guestCount,
      0,
    );
    const totalVendorCount = activeWeddings.reduce(
      (sum, wedding) => sum + wedding.vendorCount,
      0,
    );
    const expectedConnections = totalGuestCount * 0.6 + totalVendorCount * 8; // Rough estimate

    // Pre-scale for wedding day load
    const targetCapacity = Math.min(
      Math.ceil(expectedConnections / 20), // 20 connections per instance
      this.config.maxInstances,
    );

    const currentCapacity = this.getCurrentCapacity();
    if (targetCapacity > currentCapacity) {
      await this.executeScaling({
        shouldScale: true,
        direction: 'up',
        targetCapacity,
        confidence: 1.0,
        reasoning: ['Wedding day pre-scaling'],
        urgency: 'high',
      });
    }

    // Set aggressive monitoring
    this.scalingCooldownPeriod = 60000; // 1 minute cooldown for wedding day

    // Enable priority alerting
    this.alertThresholds.forEach((threshold) => {
      threshold.warning *= 0.8; // Lower warning thresholds
      threshold.critical *= 0.9; // Lower critical thresholds
    });

    // Schedule wedding day monitoring
    this.scheduleWeddingDayMonitoring(activeWeddings);
  }

  // Predictive scaling based on historical patterns
  async predictiveScale(hoursAhead: number = 2): Promise<void> {
    const prediction = await this.generateLoadPrediction(hoursAhead);

    if (prediction.confidence > 0.7) {
      // Only act on high-confidence predictions
      const currentCapacity = this.getCurrentCapacity();
      const predictedNeeded = Math.ceil(prediction.expectedConnections / 20);

      if (predictedNeeded > currentCapacity * 1.2) {
        console.log(
          `Predictive scaling: preparing for ${prediction.expectedConnections} connections`,
        );

        // Pre-scale gradually
        const intermediateCapacity = Math.ceil(currentCapacity * 1.3);
        await this.executeScaling({
          shouldScale: true,
          direction: 'up',
          targetCapacity: Math.min(
            intermediateCapacity,
            this.config.maxInstances,
          ),
          confidence: prediction.confidence,
          reasoning: [
            `Predictive scaling for ${hoursAhead}h ahead`,
            `Expected load: ${prediction.expectedConnections} connections`,
          ],
          urgency: 'medium',
        });
      }
    }
  }

  // Resource monitoring and health assessment
  private async getCurrentResourceMetrics(): Promise<ResourceMonitor> {
    // This would integrate with actual monitoring systems
    // For now, we'll simulate metrics

    const connectionPool = this.resourcePools.get('connections');
    const connectionUtilization = connectionPool
      ? connectionPool.allocated / connectionPool.capacity
      : 0.5;

    return {
      cpu: {
        current: 45 + Math.random() * 30, // 45-75% usage
        trend: connectionUtilization > 0.7 ? 'increasing' : 'stable',
        threshold: 80,
      },
      memory: {
        current: 60 + Math.random() * 20, // 60-80% usage
        trend: 'stable',
        threshold: 85,
      },
      connections: {
        active: connectionPool?.allocated || 100,
        capacity: connectionPool?.capacity || 200,
        utilization: connectionUtilization * 100,
        threshold: this.config.scaleUpThreshold * 100,
      },
      latency: {
        p95: 200 + connectionUtilization * 300, // Higher load = higher latency
        trend: connectionUtilization > 0.8 ? 'increasing' : 'stable',
        threshold: 500,
      },
    };
  }

  private async getWeddingSeasonMetrics(): Promise<WeddingSeasonMetrics> {
    const month = new Date().getMonth() + 1;
    const isWeekend = [0, 6].includes(new Date().getDay()); // Sunday or Saturday

    let seasonType: 'peak' | 'shoulder' | 'off';
    let expectedLoadMultiplier: number;

    if (month >= 5 && month <= 9) {
      seasonType = 'peak';
      expectedLoadMultiplier = isWeekend ? 5.0 : 2.0;
    } else if ([3, 4, 10].includes(month)) {
      seasonType = 'shoulder';
      expectedLoadMultiplier = isWeekend ? 3.0 : 1.5;
    } else {
      seasonType = 'off';
      expectedLoadMultiplier = isWeekend ? 1.5 : 0.8;
    }

    const currentLoad = this.getCurrentLoad();
    const capacityUtilization = currentLoad / this.getCurrentCapacity();

    return {
      seasonType,
      expectedLoadMultiplier,
      currentLoad,
      scalingRecommendation:
        capacityUtilization > 0.8
          ? 'scale_up'
          : capacityUtilization < 0.3
            ? 'scale_down'
            : 'maintain',
      capacityUtilization,
      costOptimizationScore: this.calculateCostOptimizationScore(
        capacityUtilization,
        seasonType,
      ),
    };
  }

  private async evaluateScalingTriggers(
    resourceMetrics: ResourceMonitor,
    weddingMetrics: WeddingSeasonMetrics,
    healthStatus: InfrastructureHealth,
  ) {
    const scaleUp: string[] = [];
    const scaleDown: string[] = [];

    // Connection utilization triggers
    if (
      resourceMetrics.connections.utilization >
      this.config.scaleUpThreshold * 100
    ) {
      scaleUp.push(
        `Connection utilization: ${resourceMetrics.connections.utilization.toFixed(1)}% > ${this.config.scaleUpThreshold * 100}%`,
      );
    } else if (
      resourceMetrics.connections.utilization <
      this.config.scaleDownThreshold * 100
    ) {
      scaleDown.push(
        `Connection utilization: ${resourceMetrics.connections.utilization.toFixed(1)}% < ${this.config.scaleDownThreshold * 100}%`,
      );
    }

    // Latency triggers
    if (resourceMetrics.latency.p95 > 400) {
      scaleUp.push(
        `P95 latency: ${resourceMetrics.latency.p95.toFixed(0)}ms > 400ms`,
      );
    }

    // CPU utilization triggers
    if (resourceMetrics.cpu.current > 80) {
      scaleUp.push(
        `CPU utilization: ${resourceMetrics.cpu.current.toFixed(1)}% > 80%`,
      );
    }

    // Memory utilization triggers
    if (resourceMetrics.memory.current > 85) {
      scaleUp.push(
        `Memory utilization: ${resourceMetrics.memory.current.toFixed(1)}% > 85%`,
      );
    }

    // Wedding season adjustments
    if (
      weddingMetrics.seasonType === 'peak' &&
      weddingMetrics.scalingRecommendation === 'scale_up'
    ) {
      scaleUp.push('Peak wedding season detected - proactive scaling');
    }

    // Health-based triggers
    if (healthStatus.overall === 'degraded') {
      scaleUp.push('Infrastructure health degraded');
    }

    return { scaleUp, scaleDown };
  }

  private async calculateScaleUpTarget(
    resourceMetrics: ResourceMonitor,
    weddingMetrics: WeddingSeasonMetrics,
  ): Promise<number> {
    const currentCapacity = this.getCurrentCapacity();
    let targetCapacity = currentCapacity;

    // Base scaling calculation
    const utilizationRatio = resourceMetrics.connections.utilization / 100;
    if (utilizationRatio > 0.8) {
      const scaleMultiplier = Math.min(utilizationRatio * 1.5, 2.0);
      targetCapacity = Math.ceil(currentCapacity * scaleMultiplier);
    }

    // Wedding season adjustments
    if (weddingMetrics.seasonType === 'peak') {
      targetCapacity = Math.ceil(targetCapacity * 1.3);
    }

    // Wedding day emergency scaling
    if (this.weddingDayMode) {
      targetCapacity = Math.ceil(
        targetCapacity * this.config.weddingDayMultiplier,
      );
    }

    // Apply limits
    return Math.min(targetCapacity, this.config.maxInstances);
  }

  private async calculateScaleDownTarget(
    resourceMetrics: ResourceMonitor,
  ): Promise<number> {
    const currentCapacity = this.getCurrentCapacity();
    const utilizationRatio = resourceMetrics.connections.utilization / 100;

    if (utilizationRatio < 0.3) {
      // Scale down gradually - never more than 50% at once
      const scaleMultiplier = Math.max(utilizationRatio * 2, 0.5);
      const targetCapacity = Math.ceil(currentCapacity * scaleMultiplier);
      return Math.max(targetCapacity, this.config.minInstances);
    }

    return currentCapacity;
  }

  private async generateScaleUpActions(
    currentCapacity: number,
    targetCapacity: number,
    urgency: string,
  ): Promise<ScalingAction[]> {
    const actions: ScalingAction[] = [];
    const capacityIncrease = targetCapacity - currentCapacity;

    if (urgency === 'critical' || this.weddingDayMode) {
      // Immediate scaling for critical situations
      actions.push({
        type: 'increase_pool_size',
        from: currentCapacity,
        to: targetCapacity,
        estimatedDuration: 30, // 30 seconds
      });
    } else {
      // Gradual scaling for normal situations
      const stepsNeeded = Math.ceil(
        capacityIncrease / Math.max(Math.floor(currentCapacity * 0.3), 1),
      );
      let stepCapacity = currentCapacity;

      for (let i = 0; i < stepsNeeded; i++) {
        const nextStepIncrease = Math.min(
          Math.ceil(capacityIncrease / stepsNeeded),
          targetCapacity - stepCapacity,
        );

        if (nextStepIncrease > 0) {
          actions.push({
            type: 'increase_pool_size',
            from: stepCapacity,
            to: stepCapacity + nextStepIncrease,
            estimatedDuration: 60, // 60 seconds per step
          });
          stepCapacity += nextStepIncrease;
        }
      }
    }

    // Pre-warm connections for faster allocation
    if (capacityIncrease > 5) {
      actions.push({
        type: 'prewarm_connections',
        target: Math.floor(capacityIncrease * 0.3),
        estimatedDuration: 90,
      });
    }

    return actions;
  }

  private async generateScaleDownActions(
    currentCapacity: number,
    targetCapacity: number,
  ): Promise<ScalingAction[]> {
    const actions: ScalingAction[] = [];
    const capacityDecrease = currentCapacity - targetCapacity;

    // Gradual scale-down to avoid service disruption
    const stepsNeeded = Math.ceil(
      capacityDecrease / Math.max(Math.floor(currentCapacity * 0.2), 1),
    );
    let stepCapacity = currentCapacity;

    for (let i = 0; i < stepsNeeded; i++) {
      const nextStepDecrease = Math.min(
        Math.ceil(capacityDecrease / stepsNeeded),
        stepCapacity - targetCapacity,
      );

      if (nextStepDecrease > 0) {
        actions.push({
          type: 'increase_pool_size', // Use same type but with lower target
          from: stepCapacity,
          to: stepCapacity - nextStepDecrease,
          estimatedDuration: 120, // 2 minutes per step for graceful shutdown
        });
        stepCapacity -= nextStepDecrease;
      }
    }

    return actions;
  }

  private async executeScalingActions(
    actions: ScalingAction[],
    urgency: string,
  ): Promise<void> {
    const executionDelay = urgency === 'critical' ? 0 : 1000; // No delay for critical actions

    for (const action of actions) {
      try {
        await this.executeScalingAction(action);

        if (
          executionDelay > 0 &&
          actions.indexOf(action) < actions.length - 1
        ) {
          await new Promise((resolve) => setTimeout(resolve, executionDelay));
        }
      } catch (error) {
        console.error('Scaling action failed:', action, error);
        throw error;
      }
    }
  }

  private async executeScalingAction(action: ScalingAction): Promise<void> {
    switch (action.type) {
      case 'increase_pool_size':
        await this.updateConnectionPoolSize(action.to!);
        console.log(
          `Connection pool size updated: ${action.from} → ${action.to}`,
        );
        break;

      case 'prewarm_connections':
        await this.prewarmConnections(action.target!);
        console.log(`Pre-warmed ${action.target} connections`);
        break;

      case 'enable_aggressive_cleanup':
        // This would enable more frequent connection cleanup
        console.log(
          `Enabled aggressive cleanup with ${action.cleanupInterval}s interval`,
        );
        break;

      case 'add_connection_pool':
        // This would add additional connection pools for high load
        console.log('Added additional connection pool');
        break;
    }
  }

  // Resource pool management
  private initializeResourcePools(): void {
    this.resourcePools.set('connections', {
      id: 'connections',
      type: 'connection',
      capacity: 200,
      available: 150,
      allocated: 50,
      utilizationPercent: 25,
      healthScore: 100,
    });

    this.resourcePools.set('memory', {
      id: 'memory',
      type: 'memory',
      capacity: 8192, // 8GB
      available: 6144, // 6GB
      allocated: 2048, // 2GB
      utilizationPercent: 25,
      healthScore: 95,
    });

    this.resourcePools.set('cpu', {
      id: 'cpu',
      type: 'cpu',
      capacity: 800, // 800% (8 cores)
      available: 600,
      allocated: 200,
      utilizationPercent: 25,
      healthScore: 98,
    });
  }

  private async updateResourcePools(newCapacity: number): Promise<void> {
    const connectionPool = this.resourcePools.get('connections');
    if (connectionPool) {
      connectionPool.capacity = newCapacity * 20; // 20 connections per instance
      connectionPool.available =
        connectionPool.capacity - connectionPool.allocated;
      connectionPool.utilizationPercent =
        (connectionPool.allocated / connectionPool.capacity) * 100;
    }
  }

  private async updateConnectionPoolSize(newSize: number): Promise<void> {
    // This would interface with actual infrastructure scaling APIs
    console.log(`Updating connection pool size to ${newSize}`);
  }

  private async prewarmConnections(count: number): Promise<void> {
    // This would pre-establish connections for faster allocation
    console.log(`Pre-warming ${count} connections`);
  }

  // Initialize scaling policies
  private initializeScalingPolicies(): void {
    // Connection utilization policy
    this.scalingPolicies.set('connection_utilization', {
      name: 'Connection Utilization',
      trigger: {
        metric: 'connection_utilization',
        operator: '>',
        value: this.config.scaleUpThreshold * 100,
        window: 300, // 5 minutes
      },
      action: {
        type: 'scale_up',
        amount: 2,
        maxInstances: this.config.maxInstances,
        minInstances: this.config.minInstances,
      },
      cooldown: 300, // 5 minutes
      enabled: true,
    });

    // Latency policy
    this.scalingPolicies.set('latency', {
      name: 'Response Latency',
      trigger: {
        metric: 'p95_latency',
        operator: '>',
        value: 400,
        window: 120, // 2 minutes
      },
      action: {
        type: 'scale_up',
        amount: 1,
        maxInstances: this.config.maxInstances,
        minInstances: this.config.minInstances,
      },
      cooldown: 180, // 3 minutes
      enabled: true,
    });
  }

  // Wedding day specific methods
  private async applyWeddingDayOverrides(
    decision: ScalingDecision,
    weddingMetrics: WeddingSeasonMetrics,
  ): Promise<ScalingDecision> {
    // Wedding day never scales down
    if (decision.direction === 'down') {
      decision.shouldScale = false;
      decision.direction = 'maintain';
      decision.reasoning.push('Wedding day mode: scaling down disabled');
    }

    // More aggressive scale-up on wedding day
    if (decision.direction === 'up') {
      decision.targetCapacity = Math.ceil(
        decision.targetCapacity * this.config.weddingDayMultiplier,
      );
      decision.urgency = decision.urgency === 'low' ? 'medium' : 'critical';
      decision.reasoning.push('Wedding day mode: enhanced scaling applied');
    }

    return decision;
  }

  private async scheduleWeddingDayMonitoring(
    weddings: WeddingOptimizationConfig[],
  ): Promise<void> {
    // This would set up enhanced monitoring for wedding day
    console.log(
      `Scheduled enhanced monitoring for ${weddings.length} weddings`,
    );
  }

  private async triggerWeddingDayEmergencyProtocol(
    error: Error,
    decision: ScalingDecision,
  ): Promise<void> {
    const weddingError = new WeddingDayError(
      `Critical scaling failure on wedding day: ${error.message}`,
      'emergency_wedding_scaling_failure',
      { decision, originalError: error.message },
    );

    if (this.hooks.onEmergencyMode) {
      this.hooks.onEmergencyMode({
        id: `wedding_emergency_${Date.now()}`,
        type: 'wedding_day',
        severity: 'critical',
        message: weddingError.message,
        value: decision.targetCapacity,
        threshold: decision.targetCapacity * 0.8,
        timestamp: Date.now(),
        metadata: { error: error.message, decision },
      });
    }
  }

  // Monitoring and health assessment
  private startResourceMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        const decision = await this.evaluateScalingNeed();

        if (decision.shouldScale && decision.confidence > 0.5) {
          console.log(
            `Scaling recommendation: ${decision.direction} to ${decision.targetCapacity} (confidence: ${decision.confidence})`,
          );

          // Auto-execute high-confidence scaling decisions
          if (decision.confidence > 0.8 || decision.urgency === 'critical') {
            await this.executeScaling(decision);
          }
        }

        // Check for alerts
        await this.checkAlertThresholds();
      } catch (error) {
        console.error('Resource monitoring error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private async checkAlertThresholds(): Promise<void> {
    const resourceMetrics = await this.getCurrentResourceMetrics();

    for (const threshold of this.alertThresholds) {
      let currentValue = 0;

      switch (threshold.metric) {
        case 'connection_utilization':
          currentValue = resourceMetrics.connections.utilization;
          break;
        case 'response_latency_p95':
          currentValue = resourceMetrics.latency.p95;
          break;
        case 'memory_usage':
          currentValue = resourceMetrics.memory.current;
          break;
      }

      if (currentValue > threshold.critical) {
        await this.triggerAlert(
          'critical',
          threshold.metric,
          currentValue,
          threshold.critical,
        );
      } else if (currentValue > threshold.warning) {
        await this.triggerAlert(
          'medium',
          threshold.metric,
          currentValue,
          threshold.warning,
        );
      }
    }
  }

  private async triggerAlert(
    severity: 'low' | 'medium' | 'high' | 'critical',
    metric: string,
    value: number,
    threshold: number,
  ): Promise<void> {
    const alert: PerformanceAlert = {
      id: `alert_${metric}_${Date.now()}`,
      type: metric.includes('latency')
        ? 'latency'
        : metric.includes('connection')
          ? 'connection_count'
          : metric.includes('memory')
            ? 'memory'
            : 'error_rate',
      severity,
      message: `${metric} threshold exceeded: ${value.toFixed(2)} > ${threshold}`,
      value,
      threshold,
      timestamp: Date.now(),
      metadata: { metric },
    };

    // Wedding day alerts get immediate escalation
    if (this.weddingDayMode) {
      alert.severity = alert.severity === 'low' ? 'medium' : 'critical';
      alert.type = 'wedding_day';
    }

    console.warn(
      `Performance Alert [${severity.toUpperCase()}]: ${alert.message}`,
    );

    // Trigger alert hooks
    if (severity === 'critical' && this.hooks.onEmergencyMode) {
      this.hooks.onEmergencyMode(alert);
    }
  }

  // Prediction and optimization methods
  private async generateLoadPrediction(hoursAhead: number): Promise<{
    expectedConnections: number;
    confidence: number;
    reasoning: string[];
  }> {
    const currentHour = new Date().getHours();
    const targetHour = (currentHour + hoursAhead) % 24;
    const isWeekend = [0, 6].includes(new Date().getDay());

    // Simple prediction based on time patterns
    let expectedConnections = this.getCurrentLoad();
    let confidence = 0.5;
    const reasoning: string[] = [];

    // Weekend patterns
    if (isWeekend) {
      if (targetHour >= 10 && targetHour <= 16) {
        // Wedding ceremony times
        expectedConnections *= 3.0;
        reasoning.push('Weekend wedding ceremony peak hours');
        confidence += 0.3;
      } else if (targetHour >= 17 && targetHour <= 23) {
        // Reception times
        expectedConnections *= 4.0;
        reasoning.push('Weekend wedding reception peak hours');
        confidence += 0.4;
      }
    }

    // Seasonal adjustments
    const month = new Date().getMonth() + 1;
    if (month >= 5 && month <= 9) {
      expectedConnections *= 1.5;
      reasoning.push('Peak wedding season');
      confidence += 0.2;
    }

    return {
      expectedConnections: Math.ceil(expectedConnections),
      confidence: Math.min(confidence, 1.0),
      reasoning,
    };
  }

  private async scheduleProactiveScaling(
    seasonType: 'peak' | 'shoulder' | 'off',
  ): Promise<void> {
    // This would integrate with calendar systems to schedule scaling
    console.log(`Scheduled proactive scaling for ${seasonType} season`);
  }

  // Infrastructure health assessment
  private async getInfrastructureHealth(): Promise<InfrastructureHealth> {
    const connectionPool = this.resourcePools.get('connections');
    const memoryPool = this.resourcePools.get('memory');

    return {
      overall:
        connectionPool?.healthScore > 90
          ? 'healthy'
          : connectionPool?.healthScore > 70
            ? 'degraded'
            : 'critical',
      components: {
        database: 'healthy',
        cache: 'healthy',
        websockets: connectionPool?.healthScore > 90 ? 'healthy' : 'degraded',
        loadBalancer: 'healthy',
      },
      resourcePools: Array.from(this.resourcePools.values()),
      alerts: [], // Would contain active alerts
      lastChecked: Date.now(),
    };
  }

  // Utility methods
  private getCurrentCapacity(): number {
    return this.resourcePools.get('connections')?.capacity || 200;
  }

  private getCurrentLoad(): number {
    return this.resourcePools.get('connections')?.allocated || 50;
  }

  private determineUrgency(
    triggers: string[],
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (triggers.some((t) => t.includes('latency') || t.includes('critical'))) {
      return 'critical';
    }
    if (triggers.some((t) => t.includes('CPU') || t.includes('memory'))) {
      return 'high';
    }
    if (triggers.length > 2) {
      return 'medium';
    }
    return 'low';
  }

  private calculateCostOptimizationScore(
    utilization: number,
    seasonType: string,
  ): number {
    let score = 100;

    // Penalize over-provisioning
    if (utilization < 0.3) {
      score -= (0.3 - utilization) * 100;
    }

    // Penalize under-provisioning
    if (utilization > 0.8) {
      score -= (utilization - 0.8) * 50;
    }

    // Seasonal adjustments
    if (seasonType === 'off' && utilization > 0.5) {
      score -= 20; // Off-season should run leaner
    }

    return Math.max(score, 0);
  }

  // Cleanup and resource management
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.scalingPolicies.clear();
    this.resourcePools.clear();
    this.scalingHistory = [];

    console.log('RealtimeScalingManager destroyed successfully');
  }
}

export default RealtimeScalingManager;
