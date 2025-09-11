import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock auto-scaler implementation for comprehensive testing
interface ScalingMetrics {
  currentConnections: number;
  queueSize: number;
  processingLatency: number;
  errorRate: number;
  cpuUtilization: number;
  memoryUtilization: number;
  throughputPerSecond: number;
  timestamp: number;
}

interface ScalingDecision {
  action: 'scale_out' | 'scale_in' | 'no_change';
  targetInstances: number;
  reason: string;
  confidence: number;
  waitTime?: number;
}

interface ScalingThresholds {
  connections: {
    scaleOut: number;
    scaleIn: number;
  };
  queueSize: {
    scaleOut: number;
    scaleIn: number;
  };
  latency: {
    scaleOut: number;
    scaleIn: number;
  };
  cpu: {
    scaleOut: number;
    scaleIn: number;
  };
  memory: {
    scaleOut: number;
    scaleIn: number;
  };
  errorRate: {
    scaleOut: number;
  };
}

class BroadcastAutoScaler {
  private thresholds: ScalingThresholds;
  private currentInstances: number = 2;
  private minInstances: number = 1;
  private maxInstances: number = 20;
  private lastScalingTime: number = 0;
  private cooldownPeriod: number = 300000; // 5 minutes
  private scalingHistory: Array<{
    timestamp: number;
    action: string;
    fromInstances: number;
    toInstances: number;
    metrics: ScalingMetrics;
  }> = [];

  constructor() {
    this.thresholds = {
      connections: {
        scaleOut: 5000,
        scaleIn: 2000,
      },
      queueSize: {
        scaleOut: 1000,
        scaleIn: 100,
      },
      latency: {
        scaleOut: 500,
        scaleIn: 100,
      },
      cpu: {
        scaleOut: 75,
        scaleIn: 30,
      },
      memory: {
        scaleOut: 80,
        scaleIn: 40,
      },
      errorRate: {
        scaleOut: 0.05, // 5%
      },
    };
  }

  async evaluateScaling(metrics: ScalingMetrics): Promise<ScalingDecision> {
    const now = Date.now();
    const timeSinceLastScaling = now - this.lastScalingTime;

    // Check cooldown period
    if (
      timeSinceLastScaling < this.cooldownPeriod &&
      this.scalingHistory.length > 0
    ) {
      return {
        action: 'no_change',
        targetInstances: this.currentInstances,
        reason: 'Cooldown period active',
        confidence: 1.0,
        waitTime: this.cooldownPeriod - timeSinceLastScaling,
      };
    }

    // Evaluate scale-out conditions
    const scaleOutReasons: string[] = [];
    let scaleOutScore = 0;

    if (metrics.currentConnections > this.thresholds.connections.scaleOut) {
      scaleOutReasons.push(
        `High connection count: ${metrics.currentConnections}`,
      );
      scaleOutScore += 3;
    }

    if (metrics.queueSize > this.thresholds.queueSize.scaleOut) {
      scaleOutReasons.push(`High queue size: ${metrics.queueSize}`);
      scaleOutScore += 2;
    }

    if (metrics.processingLatency > this.thresholds.latency.scaleOut) {
      scaleOutReasons.push(`High latency: ${metrics.processingLatency}ms`);
      scaleOutScore += 2;
    }

    if (metrics.cpuUtilization > this.thresholds.cpu.scaleOut) {
      scaleOutReasons.push(`High CPU: ${metrics.cpuUtilization}%`);
      scaleOutScore += 2;
    }

    if (metrics.memoryUtilization > this.thresholds.memory.scaleOut) {
      scaleOutReasons.push(`High memory: ${metrics.memoryUtilization}%`);
      scaleOutScore += 2;
    }

    if (metrics.errorRate > this.thresholds.errorRate.scaleOut) {
      scaleOutReasons.push(
        `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
      );
      scaleOutScore += 3; // Error rate is critical
    }

    // Evaluate scale-in conditions
    const scaleInReasons: string[] = [];
    let scaleInScore = 0;

    if (
      metrics.currentConnections < this.thresholds.connections.scaleIn &&
      metrics.queueSize < this.thresholds.queueSize.scaleIn &&
      metrics.processingLatency < this.thresholds.latency.scaleIn &&
      metrics.cpuUtilization < this.thresholds.cpu.scaleIn &&
      metrics.memoryUtilization < this.thresholds.memory.scaleIn
    ) {
      scaleInReasons.push('All metrics below scale-in thresholds');
      scaleInScore = 2;
    }

    // Make scaling decision
    if (scaleOutScore >= 2 && this.currentInstances < this.maxInstances) {
      const targetInstances = Math.min(
        this.maxInstances,
        this.calculateScaleOutTarget(metrics, scaleOutScore),
      );

      return {
        action: 'scale_out',
        targetInstances,
        reason: scaleOutReasons.join(', '),
        confidence: Math.min(scaleOutScore / 5, 1.0),
      };
    }

    if (scaleInScore >= 2 && this.currentInstances > this.minInstances) {
      const targetInstances = Math.max(
        this.minInstances,
        this.calculateScaleInTarget(metrics),
      );

      return {
        action: 'scale_in',
        targetInstances,
        reason: scaleInReasons.join(', '),
        confidence: 0.8,
      };
    }

    return {
      action: 'no_change',
      targetInstances: this.currentInstances,
      reason: 'No scaling conditions met',
      confidence: 0.9,
    };
  }

  private calculateScaleOutTarget(
    metrics: ScalingMetrics,
    urgencyScore: number,
  ): number {
    // Base scaling factor
    let scalingFactor = 1.5; // 50% increase by default

    // Adjust based on urgency
    if (urgencyScore >= 5) {
      scalingFactor = 2.0; // Double for critical situations
    } else if (urgencyScore >= 3) {
      scalingFactor = 1.8; // 80% increase for high urgency
    }

    // Adjust based on connection load
    const connectionRatio =
      metrics.currentConnections / this.thresholds.connections.scaleOut;
    if (connectionRatio > 2) {
      scalingFactor *= 1.5; // Aggressive scaling for very high load
    }

    return Math.ceil(this.currentInstances * scalingFactor);
  }

  private calculateScaleInTarget(metrics: ScalingMetrics): number {
    // Conservative scale-in approach
    const utilizationFactor = Math.max(
      metrics.cpuUtilization / 100,
      metrics.memoryUtilization / 100,
    );

    // Never scale below 50% utilization worth of instances
    const minNeeded = Math.ceil(this.currentInstances * utilizationFactor * 2);

    return Math.max(
      this.minInstances,
      Math.min(minNeeded, this.currentInstances - 1),
    );
  }

  async executeScaling(
    decision: ScalingDecision,
    dryRun: boolean = false,
  ): Promise<{
    success: boolean;
    actualInstances: number;
    executionTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    if (dryRun) {
      return {
        success: true,
        actualInstances: decision.targetInstances,
        executionTime: 0,
      };
    }

    try {
      // Simulate AWS Auto Scaling API call delay
      const scalingDelay = decision.action === 'scale_out' ? 180000 : 60000; // 3 min out, 1 min in
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(scalingDelay, 100)),
      ); // Simulated delay

      const previousInstances = this.currentInstances;
      this.currentInstances = decision.targetInstances;
      this.lastScalingTime = Date.now();

      // Record scaling history
      this.scalingHistory.push({
        timestamp: this.lastScalingTime,
        action: decision.action,
        fromInstances: previousInstances,
        toInstances: this.currentInstances,
        metrics: {} as ScalingMetrics, // Would store actual metrics
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        actualInstances: this.currentInstances,
        executionTime,
      };
    } catch (error) {
      return {
        success: false,
        actualInstances: this.currentInstances,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown scaling error',
      };
    }
  }

  // Wedding season predictive scaling
  async predictiveScale(
    timeOfDay: number,
    dayOfWeek: number,
    isWeddingSeason: boolean,
  ): Promise<ScalingDecision> {
    let predictedLoad = 1.0;

    // Wedding season adjustment (June-September)
    if (isWeddingSeason) {
      predictedLoad *= 2.5;
    }

    // Day of week adjustment (Friday-Sunday are peak wedding days)
    if (dayOfWeek >= 5) {
      // Friday = 5, Saturday = 6, Sunday = 0
      predictedLoad *= 1.8;
    }

    // Time of day adjustment (wedding hours: 10 AM - 11 PM)
    if (timeOfDay >= 10 && timeOfDay <= 23) {
      predictedLoad *= 1.5;
    }

    // Calculate recommended instances based on predicted load
    const baseInstances = 2;
    const recommendedInstances = Math.ceil(baseInstances * predictedLoad);
    const targetInstances = Math.max(
      this.minInstances,
      Math.min(this.maxInstances, recommendedInstances),
    );

    const reasons = [];
    if (isWeddingSeason) reasons.push('Wedding season active');
    if (dayOfWeek >= 5) reasons.push('Peak wedding day');
    if (timeOfDay >= 10 && timeOfDay <= 23) reasons.push('Wedding hours');

    return {
      action:
        targetInstances > this.currentInstances
          ? 'scale_out'
          : targetInstances < this.currentInstances
            ? 'scale_in'
            : 'no_change',
      targetInstances,
      reason: `Predictive scaling: ${reasons.join(', ')} (Load factor: ${predictedLoad.toFixed(2)})`,
      confidence: 0.7,
    };
  }

  getScalingHistory(): Array<{
    timestamp: number;
    action: string;
    fromInstances: number;
    toInstances: number;
    metrics: ScalingMetrics;
  }> {
    return [...this.scalingHistory];
  }

  getCurrentInstances(): number {
    return this.currentInstances;
  }

  setCurrentInstances(instances: number): void {
    this.currentInstances = Math.max(
      this.minInstances,
      Math.min(this.maxInstances, instances),
    );
  }

  updateThresholds(newThresholds: Partial<ScalingThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  getThresholds(): ScalingThresholds {
    return { ...this.thresholds };
  }

  setCooldownPeriod(milliseconds: number): void {
    this.cooldownPeriod = milliseconds;
  }

  // Testing utilities
  simulateTimePassage(milliseconds: number): void {
    this.lastScalingTime -= milliseconds;
  }

  clearHistory(): void {
    this.scalingHistory = [];
  }

  // Health check for auto-scaler
  async healthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check configuration
    if (this.minInstances >= this.maxInstances) {
      issues.push('Invalid instance range: minInstances >= maxInstances');
    }

    if (this.cooldownPeriod < 60000) {
      recommendations.push(
        'Consider increasing cooldown period to at least 1 minute',
      );
    }

    // Check recent scaling patterns
    const recentScaling = this.scalingHistory.filter(
      (entry) => Date.now() - entry.timestamp < 3600000, // Last hour
    );

    if (recentScaling.length > 5) {
      issues.push('Excessive scaling activity (>5 operations in last hour)');
      recommendations.push('Review thresholds to reduce scaling oscillation');
    }

    // Check for scaling oscillation
    const recentActions = recentScaling.map((entry) => entry.action).slice(-4);
    if (recentActions.length >= 4) {
      const oscillating = recentActions.every((action, index) => {
        if (index === 0) return true;
        return action !== recentActions[index - 1];
      });

      if (oscillating) {
        issues.push('Scaling oscillation detected');
        recommendations.push('Increase cooldown period or adjust thresholds');
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

describe('BroadcastAutoScaler Unit Tests', () => {
  let autoScaler: BroadcastAutoScaler;

  beforeEach(() => {
    autoScaler = new BroadcastAutoScaler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    autoScaler.clearHistory();
  });

  describe('Basic Scaling Logic', () => {
    test('recommends scale-out for high connection count', async () => {
      const metrics: ScalingMetrics = {
        currentConnections: 6000, // Above 5000 threshold
        queueSize: 500,
        processingLatency: 100,
        errorRate: 0.01,
        cpuUtilization: 60,
        memoryUtilization: 65,
        throughputPerSecond: 1000,
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(metrics);

      expect(decision.action).toBe('scale_out');
      expect(decision.targetInstances).toBeGreaterThan(2);
      expect(decision.reason).toContain('High connection count');
      expect(decision.confidence).toBeGreaterThan(0.5);
    });

    test('recommends scale-out for high queue size', async () => {
      const metrics: ScalingMetrics = {
        currentConnections: 3000,
        queueSize: 1500, // Above 1000 threshold
        processingLatency: 200,
        errorRate: 0.02,
        cpuUtilization: 70,
        memoryUtilization: 75,
        throughputPerSecond: 800,
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(metrics);

      expect(decision.action).toBe('scale_out');
      expect(decision.reason).toContain('High queue size');
    });

    test('recommends scale-out for high latency', async () => {
      const metrics: ScalingMetrics = {
        currentConnections: 4000,
        queueSize: 800,
        processingLatency: 600, // Above 500ms threshold
        errorRate: 0.015,
        cpuUtilization: 65,
        memoryUtilization: 70,
        throughputPerSecond: 900,
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(metrics);

      expect(decision.action).toBe('scale_out');
      expect(decision.reason).toContain('High latency');
    });

    test('recommends scale-in for low resource utilization', async () => {
      const metrics: ScalingMetrics = {
        currentConnections: 1000, // Below 2000 threshold
        queueSize: 50, // Below 100 threshold
        processingLatency: 50, // Below 100ms threshold
        errorRate: 0.005,
        cpuUtilization: 25, // Below 30% threshold
        memoryUtilization: 35, // Below 40% threshold
        throughputPerSecond: 200,
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(metrics);

      expect(decision.action).toBe('scale_in');
      expect(decision.targetInstances).toBeLessThan(2);
      expect(decision.reason).toContain(
        'All metrics below scale-in thresholds',
      );
    });

    test('recommends no change for normal conditions', async () => {
      const metrics: ScalingMetrics = {
        currentConnections: 3500, // Between thresholds
        queueSize: 400,
        processingLatency: 200,
        errorRate: 0.02,
        cpuUtilization: 50, // Between thresholds
        memoryUtilization: 55,
        throughputPerSecond: 600,
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(metrics);

      expect(decision.action).toBe('no_change');
      expect(decision.targetInstances).toBe(2); // Current instance count
      expect(decision.reason).toContain('No scaling conditions met');
    });
  });

  describe('Critical Error Rate Scaling', () => {
    test('prioritizes scaling for high error rates', async () => {
      const metrics: ScalingMetrics = {
        currentConnections: 4000,
        queueSize: 600,
        processingLatency: 300,
        errorRate: 0.08, // 8% - critical error rate
        cpuUtilization: 60,
        memoryUtilization: 65,
        throughputPerSecond: 500,
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(metrics);

      expect(decision.action).toBe('scale_out');
      expect(decision.reason).toContain('High error rate');
      expect(decision.confidence).toBeGreaterThan(0.8); // High confidence due to error rate
      expect(decision.targetInstances).toBeGreaterThan(3); // Aggressive scaling for errors
    });

    test('combines multiple factors for scaling decision', async () => {
      const metrics: ScalingMetrics = {
        currentConnections: 5500, // High
        queueSize: 1200, // High
        processingLatency: 450, // Approaching threshold
        errorRate: 0.03,
        cpuUtilization: 80, // High
        memoryUtilization: 85, // High
        throughputPerSecond: 400,
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(metrics);

      expect(decision.action).toBe('scale_out');
      expect(decision.confidence).toBeGreaterThan(0.9); // Very high confidence
      expect(decision.targetInstances).toBeGreaterThan(4); // Aggressive scaling

      // Should mention multiple factors
      expect(decision.reason).toContain('High connection count');
      expect(decision.reason).toContain('High queue size');
      expect(decision.reason).toContain('High CPU');
      expect(decision.reason).toContain('High memory');
    });
  });

  describe('Cooldown Period Management', () => {
    test('prevents scaling during cooldown period', async () => {
      // First scaling decision
      const metrics1: ScalingMetrics = {
        currentConnections: 6000,
        queueSize: 1200,
        processingLatency: 400,
        errorRate: 0.02,
        cpuUtilization: 80,
        memoryUtilization: 85,
        throughputPerSecond: 500,
        timestamp: Date.now(),
      };

      const decision1 = await autoScaler.evaluateScaling(metrics1);
      expect(decision1.action).toBe('scale_out');

      await autoScaler.executeScaling(decision1);

      // Immediate second evaluation (should be blocked by cooldown)
      const decision2 = await autoScaler.evaluateScaling(metrics1);

      expect(decision2.action).toBe('no_change');
      expect(decision2.reason).toContain('Cooldown period active');
      expect(decision2.waitTime).toBeGreaterThan(0);
    });

    test('allows scaling after cooldown period expires', async () => {
      const metrics: ScalingMetrics = {
        currentConnections: 6000,
        queueSize: 1200,
        processingLatency: 400,
        errorRate: 0.02,
        cpuUtilization: 80,
        memoryUtilization: 85,
        throughputPerSecond: 500,
        timestamp: Date.now(),
      };

      // First scaling
      const decision1 = await autoScaler.evaluateScaling(metrics);
      await autoScaler.executeScaling(decision1);

      // Simulate cooldown period passage
      autoScaler.simulateTimePassage(300000); // 5 minutes

      // Should allow scaling again
      const decision2 = await autoScaler.evaluateScaling(metrics);
      expect(decision2.action).toBe('scale_out');
    });

    test('customizable cooldown period', async () => {
      autoScaler.setCooldownPeriod(60000); // 1 minute

      const metrics: ScalingMetrics = {
        currentConnections: 6000,
        queueSize: 1200,
        processingLatency: 400,
        errorRate: 0.02,
        cpuUtilization: 80,
        memoryUtilization: 85,
        throughputPerSecond: 500,
        timestamp: Date.now(),
      };

      const decision1 = await autoScaler.evaluateScaling(metrics);
      await autoScaler.executeScaling(decision1);

      // Should be blocked by shorter cooldown
      const decision2 = await autoScaler.evaluateScaling(metrics);
      expect(decision2.action).toBe('no_change');
      expect(decision2.waitTime).toBeLessThan(60000);
    });
  });

  describe('Instance Limits and Bounds', () => {
    test('respects maximum instance limit', async () => {
      autoScaler.setCurrentInstances(20); // At maximum

      const extremeMetrics: ScalingMetrics = {
        currentConnections: 20000, // Very high load
        queueSize: 5000,
        processingLatency: 2000,
        errorRate: 0.15,
        cpuUtilization: 95,
        memoryUtilization: 90,
        throughputPerSecond: 100,
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(extremeMetrics);

      if (decision.action === 'scale_out') {
        expect(decision.targetInstances).toBeLessThanOrEqual(20);
      }
    });

    test('respects minimum instance limit', async () => {
      autoScaler.setCurrentInstances(1); // At minimum

      const lowMetrics: ScalingMetrics = {
        currentConnections: 100,
        queueSize: 5,
        processingLatency: 20,
        errorRate: 0.001,
        cpuUtilization: 10,
        memoryUtilization: 15,
        throughputPerSecond: 50,
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(lowMetrics);

      expect(decision.targetInstances).toBeGreaterThanOrEqual(1);
    });

    test('calculates appropriate scaling factors', async () => {
      autoScaler.setCurrentInstances(4);

      const metrics: ScalingMetrics = {
        currentConnections: 15000, // 3x the scale-out threshold
        queueSize: 2000,
        processingLatency: 800,
        errorRate: 0.08,
        cpuUtilization: 90,
        memoryUtilization: 95,
        throughputPerSecond: 200,
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(metrics);

      expect(decision.action).toBe('scale_out');
      expect(decision.targetInstances).toBeGreaterThan(6); // Should scale aggressively
      expect(decision.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('Wedding Season Predictive Scaling', () => {
    test('scales for wedding season peak hours', async () => {
      const saturday = 6;
      const weddingHour = 15; // 3 PM
      const isWeddingSeason = true;

      const decision = await autoScaler.predictiveScale(
        weddingHour,
        saturday,
        isWeddingSeason,
      );

      expect(decision.action).toBe('scale_out');
      expect(decision.targetInstances).toBeGreaterThan(2);
      expect(decision.reason).toContain('Wedding season active');
      expect(decision.reason).toContain('Peak wedding day');
      expect(decision.reason).toContain('Wedding hours');
    });

    test('minimal scaling for off-season weekdays', async () => {
      const tuesday = 2;
      const earlyHour = 6; // 6 AM
      const isWeddingSeason = false;

      const decision = await autoScaler.predictiveScale(
        earlyHour,
        tuesday,
        isWeddingSeason,
      );

      expect(
        decision.action === 'no_change' || decision.action === 'scale_in',
      ).toBe(true);
      expect(decision.targetInstances).toBeLessThanOrEqual(2);
    });

    test('moderate scaling for weekend non-wedding season', async () => {
      const saturday = 6;
      const afternoonHour = 14;
      const isWeddingSeason = false;

      const decision = await autoScaler.predictiveScale(
        afternoonHour,
        saturday,
        isWeddingSeason,
      );

      expect(decision.targetInstances).toBeGreaterThan(2);
      expect(decision.targetInstances).toBeLessThan(5); // Less aggressive than wedding season
      expect(decision.reason).toContain('Peak wedding day');
    });
  });

  describe('Scaling Execution', () => {
    test('executes scaling successfully', async () => {
      const decision: ScalingDecision = {
        action: 'scale_out',
        targetInstances: 4,
        reason: 'High load',
        confidence: 0.9,
      };

      const result = await autoScaler.executeScaling(decision);

      expect(result.success).toBe(true);
      expect(result.actualInstances).toBe(4);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(autoScaler.getCurrentInstances()).toBe(4);
    });

    test('records scaling history', async () => {
      const decision: ScalingDecision = {
        action: 'scale_out',
        targetInstances: 3,
        reason: 'Test scaling',
        confidence: 0.8,
      };

      await autoScaler.executeScaling(decision);

      const history = autoScaler.getScalingHistory();
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('scale_out');
      expect(history[0].fromInstances).toBe(2);
      expect(history[0].toInstances).toBe(3);
    });

    test('dry run mode does not change instances', async () => {
      const initialInstances = autoScaler.getCurrentInstances();

      const decision: ScalingDecision = {
        action: 'scale_out',
        targetInstances: 5,
        reason: 'Dry run test',
        confidence: 0.9,
      };

      const result = await autoScaler.executeScaling(decision, true);

      expect(result.success).toBe(true);
      expect(result.actualInstances).toBe(5); // Returns target
      expect(autoScaler.getCurrentInstances()).toBe(initialInstances); // Unchanged
    });
  });

  describe('Threshold Configuration', () => {
    test('updates thresholds correctly', async () => {
      const newThresholds = {
        connections: {
          scaleOut: 8000,
          scaleIn: 3000,
        },
        latency: {
          scaleOut: 750,
          scaleIn: 150,
        },
      };

      autoScaler.updateThresholds(newThresholds);
      const updatedThresholds = autoScaler.getThresholds();

      expect(updatedThresholds.connections.scaleOut).toBe(8000);
      expect(updatedThresholds.connections.scaleIn).toBe(3000);
      expect(updatedThresholds.latency.scaleOut).toBe(750);
      expect(updatedThresholds.latency.scaleIn).toBe(150);
    });

    test('respects updated thresholds in scaling decisions', async () => {
      // Update to more conservative thresholds
      autoScaler.updateThresholds({
        connections: {
          scaleOut: 10000, // Higher threshold
          scaleIn: 1000,
        },
      });

      const metrics: ScalingMetrics = {
        currentConnections: 6000, // Would trigger old threshold but not new
        queueSize: 500,
        processingLatency: 200,
        errorRate: 0.02,
        cpuUtilization: 60,
        memoryUtilization: 65,
        throughputPerSecond: 800,
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(metrics);
      expect(decision.action).toBe('no_change'); // Should not scale with higher threshold
    });
  });

  describe('Health Monitoring and Diagnostics', () => {
    test('detects configuration issues', async () => {
      // Create invalid configuration
      autoScaler.setCurrentInstances(1);
      autoScaler.updateThresholds({
        connections: {
          scaleOut: 1000,
          scaleIn: 5000, // Invalid: scale-in threshold higher than scale-out
        },
      });

      // Override internal method for testing
      (autoScaler as any).minInstances = 10;
      (autoScaler as any).maxInstances = 5; // Invalid range

      const health = await autoScaler.healthCheck();

      expect(health.healthy).toBe(false);
      expect(
        health.issues.some((issue) => issue.includes('Invalid instance range')),
      ).toBe(true);
    });

    test('detects scaling oscillation', async () => {
      // Simulate rapid back-and-forth scaling
      autoScaler.setCooldownPeriod(1000); // Very short for testing

      const scaleOutMetrics: ScalingMetrics = {
        currentConnections: 6000,
        queueSize: 1200,
        processingLatency: 600,
        errorRate: 0.02,
        cpuUtilization: 80,
        memoryUtilization: 85,
        throughputPerSecond: 400,
        timestamp: Date.now(),
      };

      const scaleInMetrics: ScalingMetrics = {
        currentConnections: 1000,
        queueSize: 50,
        processingLatency: 50,
        errorRate: 0.005,
        cpuUtilization: 20,
        memoryUtilization: 30,
        throughputPerSecond: 100,
        timestamp: Date.now(),
      };

      // Create oscillation pattern
      for (let i = 0; i < 4; i++) {
        const metrics = i % 2 === 0 ? scaleOutMetrics : scaleInMetrics;
        const decision = await autoScaler.evaluateScaling(metrics);
        await autoScaler.executeScaling(decision);

        // Simulate time passage to avoid cooldown
        autoScaler.simulateTimePassage(2000);
      }

      const health = await autoScaler.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.issues.some((issue) => issue.includes('oscillation'))).toBe(
        true,
      );
      expect(
        health.recommendations.some((rec) => rec.includes('cooldown period')),
      ).toBe(true);
    });

    test('identifies excessive scaling activity', async () => {
      autoScaler.setCooldownPeriod(1000); // Short cooldown for testing

      // Generate many scaling events
      for (let i = 0; i < 6; i++) {
        const metrics: ScalingMetrics = {
          currentConnections: 6000,
          queueSize: 1000,
          processingLatency: 500,
          errorRate: 0.02,
          cpuUtilization: 75,
          memoryUtilization: 80,
          throughputPerSecond: 500,
          timestamp: Date.now(),
        };

        const decision = await autoScaler.evaluateScaling(metrics);
        await autoScaler.executeScaling(decision);
        autoScaler.simulateTimePassage(2000);
      }

      const health = await autoScaler.healthCheck();

      expect(health.healthy).toBe(false);
      expect(
        health.issues.some((issue) =>
          issue.includes('Excessive scaling activity'),
        ),
      ).toBe(true);
    });

    test('provides recommendations for improvement', async () => {
      autoScaler.setCooldownPeriod(30000); // 30 seconds

      const health = await autoScaler.healthCheck();

      expect(
        health.recommendations.some((rec) =>
          rec.includes('increasing cooldown period'),
        ),
      ).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('handles extreme metric values gracefully', async () => {
      const extremeMetrics: ScalingMetrics = {
        currentConnections: 1000000, // Extreme values
        queueSize: 100000,
        processingLatency: 10000,
        errorRate: 0.99,
        cpuUtilization: 150, // Over 100%
        memoryUtilization: 200,
        throughputPerSecond: -100, // Negative
        timestamp: Date.now(),
      };

      const decision = await autoScaler.evaluateScaling(extremeMetrics);

      expect(decision).toBeDefined();
      expect(decision.targetInstances).toBeLessThanOrEqual(20); // Respects max
      expect(decision.targetInstances).toBeGreaterThanOrEqual(1); // Respects min
    });

    test('maintains consistency across multiple evaluations', async () => {
      const consistentMetrics: ScalingMetrics = {
        currentConnections: 4000,
        queueSize: 600,
        processingLatency: 300,
        errorRate: 0.02,
        cpuUtilization: 60,
        memoryUtilization: 65,
        throughputPerSecond: 700,
        timestamp: Date.now(),
      };

      // Multiple evaluations with same metrics should produce same result
      const decisions = await Promise.all([
        autoScaler.evaluateScaling(consistentMetrics),
        autoScaler.evaluateScaling(consistentMetrics),
        autoScaler.evaluateScaling(consistentMetrics),
      ]);

      const firstDecision = decisions[0];
      decisions.forEach((decision) => {
        expect(decision.action).toBe(firstDecision.action);
        expect(decision.targetInstances).toBe(firstDecision.targetInstances);
      });
    });

    test('performs well with high frequency evaluations', async () => {
      const testCount = 1000;
      const metrics: ScalingMetrics = {
        currentConnections: 3000,
        queueSize: 400,
        processingLatency: 200,
        errorRate: 0.01,
        cpuUtilization: 50,
        memoryUtilization: 55,
        throughputPerSecond: 600,
        timestamp: Date.now(),
      };

      const startTime = Date.now();

      const evaluationPromises = Array.from({ length: testCount }, () =>
        autoScaler.evaluateScaling(metrics),
      );

      const results = await Promise.all(evaluationPromises);

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / testCount;

      expect(results).toHaveLength(testCount);
      expect(avgTime).toBeLessThan(10); // Should be fast (< 10ms per evaluation)

      console.log(
        `Auto-scaler performance: ${avgTime.toFixed(2)}ms avg per evaluation`,
      );
    });
  });
});
