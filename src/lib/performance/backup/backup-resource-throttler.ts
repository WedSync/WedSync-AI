/**
 * WS-178: Backup Resource Throttler
 * Team D - Round 1: Resource management and throttling for backup operations
 *
 * Implements dynamic resource throttling to ensure backup operations
 * never interfere with wedding planning activities
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface ThrottleConfig {
  cpuLimit: {
    peakHours: number; // 30% during 6AM-10PM
    offPeak: number; // 80% during 10PM-6AM
  };
  memoryLimit: number; // 500MB max
  bandwidthLimit: number; // 10Mbps max
  concurrentOperations: number; // Max simultaneous backup operations
  adaptiveThrottling: boolean; // Dynamic adjustment based on system load
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    load: number;
    available: number;
  };
  memory: {
    used: number; // MB
    available: number; // MB
    percentage: number;
  };
  network: {
    uploadSpeed: number; // Mbps
    downloadSpeed: number; // Mbps
    latency: number; // ms
  };
  database: {
    connections: number;
    queryQueue: number;
    lockContention: number;
  };
}

export interface CircuitBreakerStatus {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  reason: string;
}

export interface ThrottleDecision {
  action: 'proceed' | 'throttle' | 'halt';
  throttleLevel: number; // 0-100 percentage
  waitTime: number; // milliseconds
  reason: string;
  estimatedCompletion: Date;
}

export class BackupResourceThrottler extends EventEmitter {
  private config: ThrottleConfig;
  private circuitBreaker: CircuitBreakerStatus;
  private activeOperations: Set<string> = new Set();
  private throttleHistory: Map<string, number[]> = new Map();
  private emergencyMode = false;

  constructor(config: Partial<ThrottleConfig> = {}) {
    super();

    this.config = {
      cpuLimit: {
        peakHours: 30,
        offPeak: 80,
      },
      memoryLimit: 500,
      bandwidthLimit: 10,
      concurrentOperations: 2,
      adaptiveThrottling: true,
      ...config,
    };

    this.circuitBreaker = {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      reason: '',
    };

    this.initializeThrottling();
  }

  /**
   * Main throttling control for backup operations
   */
  async throttleBackupOperations(
    operationId: string,
  ): Promise<ThrottleDecision> {
    console.log(
      `🎛️ Evaluating throttling for backup operation: ${operationId}`,
    );

    // Check circuit breaker first
    if (this.circuitBreaker.state === 'open') {
      return this.createThrottleDecision(
        'halt',
        0,
        60000,
        'Circuit breaker is open',
        new Date(Date.now() + 3600000),
      );
    }

    // Get current system metrics
    const metrics = await this.getCurrentSystemLoad();

    // Check if we're in peak hours
    const isPeakHours = this.isPeakHours();

    // Determine throttle level based on current conditions
    const throttleAnalysis = this.analyzeThrottleNeed(metrics, isPeakHours);

    // Make throttling decision
    const decision = this.makeThrottlingDecision(
      operationId,
      throttleAnalysis,
      metrics,
    );

    // Apply throttling if needed
    if (decision.action === 'throttle') {
      await this.applyThrottling(operationId, decision.throttleLevel);
    }

    // Track operation
    if (decision.action === 'proceed' || decision.action === 'throttle') {
      this.activeOperations.add(operationId);
      this.recordThrottleDecision(operationId, decision.throttleLevel);
    }

    // Emit throttling event
    this.emit('throttleDecision', {
      operationId,
      decision,
      metrics,
      isPeakHours,
    });

    console.log(`📊 Throttle decision for ${operationId}:`, decision);

    return decision;
  }

  /**
   * Implement circuit breaker pattern for backup operations
   */
  async implementCircuitBreaker(): Promise<CircuitBreakerStatus> {
    const now = Date.now();

    // Check if we should attempt to close the circuit
    if (
      this.circuitBreaker.state === 'open' &&
      now >= this.circuitBreaker.nextAttemptTime
    ) {
      this.circuitBreaker.state = 'half-open';
      console.log('🔄 Circuit breaker moving to half-open state');
    }

    // Monitor system health for circuit breaker triggers
    const systemHealth = await this.checkSystemHealth();

    if (!systemHealth.healthy) {
      await this.triggerCircuitBreaker(systemHealth.issues);
    } else if (this.circuitBreaker.state === 'half-open') {
      // System is healthy, close the circuit
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.failureCount = 0;
      console.log('✅ Circuit breaker closed - system healthy');
    }

    return { ...this.circuitBreaker };
  }

  /**
   * Get current system resource utilization
   */
  async getCurrentSystemLoad(): Promise<SystemMetrics> {
    const startTime = performance.now();

    // Collect system metrics
    const cpuMetrics = await this.getCPUMetrics();
    const memoryMetrics = await this.getMemoryMetrics();
    const networkMetrics = await this.getNetworkMetrics();
    const databaseMetrics = await this.getDatabaseMetrics();

    const metrics: SystemMetrics = {
      cpu: cpuMetrics,
      memory: memoryMetrics,
      network: networkMetrics,
      database: databaseMetrics,
    };

    const endTime = performance.now();
    console.log(
      `📋 System metrics collected in ${(endTime - startTime).toFixed(2)}ms`,
    );

    return metrics;
  }

  /**
   * Complete operation and clean up resources
   */
  async completeOperation(
    operationId: string,
    success: boolean,
  ): Promise<void> {
    console.log(
      `🏁 Completing backup operation: ${operationId}, success: ${success}`,
    );

    // Remove from active operations
    this.activeOperations.delete(operationId);

    // Update circuit breaker based on result
    if (!success) {
      this.circuitBreaker.failureCount++;
      this.circuitBreaker.lastFailureTime = Date.now();

      if (this.circuitBreaker.failureCount >= 3) {
        await this.triggerCircuitBreaker([
          'Multiple backup operation failures',
        ]);
      }
    } else if (this.circuitBreaker.state === 'half-open') {
      // Successful operation in half-open state, close circuit
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.failureCount = 0;
    }

    // Clean up throttle history for completed operation
    this.throttleHistory.delete(operationId);

    // Emit completion event
    this.emit('operationComplete', {
      operationId,
      success,
      activeOperations: this.activeOperations.size,
    });
  }

  /**
   * Emergency stop all backup operations
   */
  async emergencyStop(reason: string): Promise<void> {
    console.error(`🚨 Emergency stop triggered: ${reason}`);

    this.emergencyMode = true;

    // Halt all active operations
    for (const operationId of this.activeOperations) {
      console.log(`⛔ Halting operation: ${operationId}`);
      this.emit('operationHalted', { operationId, reason });
    }

    // Open circuit breaker
    await this.triggerCircuitBreaker([reason]);

    // Clear active operations
    this.activeOperations.clear();

    // Log emergency event
    this.emit('emergencyStop', { reason, timestamp: Date.now() });
  }

  /**
   * Resume operations after emergency stop
   */
  async resumeOperations(): Promise<boolean> {
    console.log('🔄 Attempting to resume backup operations');

    // Check system health
    const health = await this.checkSystemHealth();

    if (health.healthy) {
      this.emergencyMode = false;
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.failureCount = 0;

      console.log('✅ Backup operations resumed');
      this.emit('operationsResumed', { timestamp: Date.now() });
      return true;
    } else {
      console.warn(
        '⚠️ System not healthy, cannot resume operations:',
        health.issues,
      );
      return false;
    }
  }

  /**
   * Initialize throttling system
   */
  private initializeThrottling(): void {
    console.log('🚀 Initializing backup resource throttling system');

    // Set up periodic system monitoring
    setInterval(async () => {
      if (this.activeOperations.size > 0) {
        const metrics = await this.getCurrentSystemLoad();
        await this.evaluateOngoingOperations(metrics);
      }
    }, 30000); // Check every 30 seconds during active operations

    // Set up circuit breaker monitoring
    setInterval(async () => {
      await this.implementCircuitBreaker();
    }, 60000); // Check circuit breaker every minute
  }

  /**
   * Check if current time is peak wedding planning hours
   */
  private isPeakHours(): boolean {
    const hour = new Date().getHours();
    return hour >= 6 && hour <= 22; // 6 AM to 10 PM
  }

  /**
   * Analyze throttling needs based on system metrics
   */
  private analyzeThrottleNeed(
    metrics: SystemMetrics,
    isPeakHours: boolean,
  ): {
    cpuThrottle: number;
    memoryThrottle: number;
    networkThrottle: number;
    overallThrottle: number;
  } {
    const cpuLimit = isPeakHours
      ? this.config.cpuLimit.peakHours
      : this.config.cpuLimit.offPeak;

    let cpuThrottle = 0;
    let memoryThrottle = 0;
    let networkThrottle = 0;

    // CPU throttling calculation
    if (metrics.cpu.usage > cpuLimit) {
      cpuThrottle = Math.min(
        90,
        ((metrics.cpu.usage - cpuLimit) / cpuLimit) * 100,
      );
    }

    // Memory throttling calculation
    if (metrics.memory.used > this.config.memoryLimit) {
      memoryThrottle = Math.min(
        95,
        ((metrics.memory.used - this.config.memoryLimit) /
          this.config.memoryLimit) *
          100,
      );
    }

    // Network throttling calculation
    if (metrics.network.uploadSpeed > this.config.bandwidthLimit) {
      networkThrottle = Math.min(
        80,
        ((metrics.network.uploadSpeed - this.config.bandwidthLimit) /
          this.config.bandwidthLimit) *
          100,
      );
    }

    // Overall throttle level is the maximum of individual throttles
    const overallThrottle = Math.max(
      cpuThrottle,
      memoryThrottle,
      networkThrottle,
    );

    return {
      cpuThrottle,
      memoryThrottle,
      networkThrottle,
      overallThrottle,
    };
  }

  /**
   * Make final throttling decision
   */
  private makeThrottlingDecision(
    operationId: string,
    throttleAnalysis: ReturnType<
      BackupResourceThrottler['analyzeThrottleNeed']
    >,
    metrics: SystemMetrics,
  ): ThrottleDecision {
    // Check if we've exceeded concurrent operation limit
    if (this.activeOperations.size >= this.config.concurrentOperations) {
      return this.createThrottleDecision(
        'halt',
        0,
        60000,
        `Maximum concurrent operations (${this.config.concurrentOperations}) reached`,
        new Date(Date.now() + 300000), // 5 minutes
      );
    }

    // Check for emergency mode
    if (this.emergencyMode) {
      return this.createThrottleDecision(
        'halt',
        0,
        300000,
        'Emergency mode active',
        new Date(Date.now() + 600000),
      );
    }

    // Determine action based on throttle level
    const throttleLevel = throttleAnalysis.overallThrottle;

    if (throttleLevel >= 80) {
      return this.createThrottleDecision(
        'halt',
        0,
        120000,
        'System under severe load',
        new Date(Date.now() + 600000),
      );
    } else if (throttleLevel >= 20) {
      return this.createThrottleDecision(
        'throttle',
        throttleLevel,
        0,
        `System load requires ${throttleLevel.toFixed(0)}% throttling`,
        this.estimateThrottledCompletion(throttleLevel),
      );
    } else {
      return this.createThrottleDecision(
        'proceed',
        0,
        0,
        'System resources available',
        new Date(Date.now() + 1800000), // 30 minutes estimated
      );
    }
  }

  /**
   * Create throttle decision object
   */
  private createThrottleDecision(
    action: ThrottleDecision['action'],
    throttleLevel: number,
    waitTime: number,
    reason: string,
    estimatedCompletion: Date,
  ): ThrottleDecision {
    return {
      action,
      throttleLevel,
      waitTime,
      reason,
      estimatedCompletion,
    };
  }

  /**
   * Apply throttling to backup operation
   */
  private async applyThrottling(
    operationId: string,
    throttleLevel: number,
  ): Promise<void> {
    console.log(
      `🎛️ Applying ${throttleLevel.toFixed(0)}% throttling to operation ${operationId}`,
    );

    // Calculate delays and resource limits based on throttle level
    const cpuDelay = Math.floor(throttleLevel * 10); // ms delay per operation
    const chunkSizeReduction = Math.floor(throttleLevel); // percentage reduction
    const networkDelay = Math.floor(throttleLevel * 5); // ms delay for network operations

    // Emit throttling configuration
    this.emit('throttleApplied', {
      operationId,
      throttleLevel,
      config: {
        cpuDelay,
        chunkSizeReduction,
        networkDelay,
      },
    });
  }

  /**
   * Record throttling decision for analysis
   */
  private recordThrottleDecision(
    operationId: string,
    throttleLevel: number,
  ): void {
    if (!this.throttleHistory.has(operationId)) {
      this.throttleHistory.set(operationId, []);
    }

    const history = this.throttleHistory.get(operationId)!;
    history.push(throttleLevel);

    // Keep only last 10 decisions
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Check system health for circuit breaker
   */
  private async checkSystemHealth(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const metrics = await this.getCurrentSystemLoad();

    // Check CPU health
    if (metrics.cpu.usage > 90) {
      issues.push('CPU usage critically high');
    }

    // Check memory health
    if (metrics.memory.percentage > 95) {
      issues.push('Memory usage critically high');
    }

    // Check database health
    if (metrics.database.connections > 80) {
      issues.push('Database connection pool near exhaustion');
    }

    // Check for wedding-critical operations
    if (await this.hasWeddingCriticalOperations()) {
      issues.push('Wedding-critical operations in progress');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Trigger circuit breaker
   */
  private async triggerCircuitBreaker(reasons: string[]): Promise<void> {
    console.warn('⚡ Circuit breaker triggered:', reasons);

    this.circuitBreaker = {
      state: 'open',
      failureCount: this.circuitBreaker.failureCount + 1,
      lastFailureTime: Date.now(),
      nextAttemptTime: Date.now() + 300000, // 5 minutes
      reason: reasons.join(', '),
    };

    // Halt all active operations
    for (const operationId of this.activeOperations) {
      this.emit('operationHalted', {
        operationId,
        reason: 'Circuit breaker triggered',
      });
    }

    this.emit('circuitBreakerTriggered', {
      reasons,
      activeOperations: this.activeOperations.size,
    });
  }

  /**
   * Evaluate ongoing operations for dynamic throttling
   */
  private async evaluateOngoingOperations(
    metrics: SystemMetrics,
  ): Promise<void> {
    for (const operationId of this.activeOperations) {
      const throttleAnalysis = this.analyzeThrottleNeed(
        metrics,
        this.isPeakHours(),
      );

      if (throttleAnalysis.overallThrottle > 50) {
        console.log(
          `🔄 Adjusting throttling for ongoing operation: ${operationId}`,
        );
        await this.applyThrottling(
          operationId,
          throttleAnalysis.overallThrottle,
        );
      }
    }
  }

  /**
   * Estimate completion time with throttling applied
   */
  private estimateThrottledCompletion(throttleLevel: number): Date {
    const baseTime = 30 * 60 * 1000; // 30 minutes base
    const throttleMultiplier = 1 + throttleLevel / 100; // Throttling increases time
    const estimatedTime = baseTime * throttleMultiplier;

    return new Date(Date.now() + estimatedTime);
  }

  /**
   * Check for wedding-critical operations
   */
  private async hasWeddingCriticalOperations(): Promise<boolean> {
    // In a real implementation, this would check for:
    // - Photo uploads in progress
    // - Timeline updates
    // - Vendor coordination activities
    // - Active couple interactions
    return false;
  }

  // System metrics collection methods (would integrate with actual monitoring)
  private async getCPUMetrics(): Promise<SystemMetrics['cpu']> {
    // Mock implementation - in production would use actual system monitoring
    const usage = Math.random() * 100;
    return {
      usage,
      load: usage / 100,
      available: 100 - usage,
    };
  }

  private async getMemoryMetrics(): Promise<SystemMetrics['memory']> {
    const memInfo = process.memoryUsage();
    const used = memInfo.heapUsed / 1024 / 1024; // Convert to MB
    const total = memInfo.heapTotal / 1024 / 1024;

    return {
      used,
      available: total - used,
      percentage: (used / total) * 100,
    };
  }

  private async getNetworkMetrics(): Promise<SystemMetrics['network']> {
    // Mock implementation
    return {
      uploadSpeed: Math.random() * 20,
      downloadSpeed: Math.random() * 100,
      latency: Math.random() * 100,
    };
  }

  private async getDatabaseMetrics(): Promise<SystemMetrics['database']> {
    // Mock implementation
    return {
      connections: Math.floor(Math.random() * 100),
      queryQueue: Math.floor(Math.random() * 10),
      lockContention: Math.random(),
    };
  }
}

export default BackupResourceThrottler;
