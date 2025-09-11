import {
  AlertChannel,
  Alert,
  DeliveryResult,
  WeddingAlert,
  WeddingContext,
  AlertPriority,
} from '@/types/alerts';
import { MultiChannelOrchestrator } from '@/lib/alerts/channels/MultiChannelOrchestrator';
import { logger } from '@/lib/monitoring/logger';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

/**
 * WS-155: Enhanced Multi-Channel Notification System
 *
 * Enhances the existing MultiChannelOrchestrator with:
 * - Wedding-context-aware channel selection
 * - Sub-100ms failover with parallel processing
 * - Channel health monitoring and adaptive routing
 * - Emergency escalation protocols
 * - Performance optimization for high-frequency alerts
 *
 * Performance Requirements:
 * - Sub-100ms channel failover
 * - <500ms total delivery time for critical alerts
 * - Support 1000+ concurrent alert deliveries
 * - 99.95% delivery success rate
 */
export class WS155MultiChannelEnhancement extends EventEmitter {
  private channelHealthCache = new Map<string, ChannelHealthStatus>();
  private performanceMetrics = new Map<string, ChannelPerformanceMetrics>();
  private emergencyEscalationActive = false;
  private channelCircuitBreaker = new Map<string, CircuitBreakerState>();
  private deliveryQueue = new Map<AlertPriority, Alert[]>();

  constructor(
    private orchestrator: MultiChannelOrchestrator,
    private config: MultiChannelConfig = DEFAULT_CONFIG,
  ) {
    super();
    this.initializeChannelMonitoring();
    this.setupPerformanceOptimizations();
  }

  /**
   * Enhanced alert delivery with wedding context intelligence
   * Integrates with existing orchestrator while adding WS-155 enhancements
   */
  async deliverEnhancedAlert(
    alert: WeddingAlert,
    context?: WeddingContext,
  ): Promise<EnhancedDeliveryResult> {
    const startTime = performance.now();

    try {
      // Pre-flight channel health check
      const healthyChannels = await this.getHealthyChannels();

      // Optimize channel selection for wedding context
      const optimizedChannels = this.optimizeChannelSelection(
        alert,
        context,
        healthyChannels,
      );

      // Execute high-speed parallel delivery
      const deliveryResults = await this.executeParallelDelivery(
        alert,
        optimizedChannels,
        context,
      );

      // Handle failover if needed (sub-100ms requirement)
      const finalResults = await this.handleIntelligentFailover(
        alert,
        deliveryResults,
        optimizedChannels,
        context,
        startTime,
      );

      // Update performance metrics
      this.updateChannelMetrics(finalResults, performance.now() - startTime);

      // Check for emergency escalation needs
      await this.checkEmergencyEscalation(alert, finalResults, context);

      return {
        success: finalResults.some((r) => r.success),
        totalDeliveryTime: performance.now() - startTime,
        channelResults: finalResults,
        escalationTriggered: this.emergencyEscalationActive,
        weddingContextApplied: !!context,
        failoverExecuted: finalResults.length > optimizedChannels.length,
      };
    } catch (error) {
      logger.error('Enhanced multi-channel delivery failed:', {
        alertId: alert.id,
        error: error.message,
        context: context?.clientId,
        deliveryTime: performance.now() - startTime,
      });

      // Emergency fallback to basic orchestrator
      return this.executeEmergencyFallback(alert, context, startTime);
    }
  }

  /**
   * Intelligent channel selection based on wedding context
   * Prioritizes channels based on wedding timeline and vendor types
   */
  private optimizeChannelSelection(
    alert: WeddingAlert,
    context?: WeddingContext,
    availableChannels: AlertChannel[] = [],
  ): AlertChannel[] {
    const baseChannels =
      availableChannels.length > 0
        ? availableChannels
        : this.orchestrator.getAvailableChannels();

    // Wedding context optimization
    if (context && alert.weddingContext) {
      const { weddingPhase, timeToWedding } = alert.weddingContext;

      // Emergency wedding day protocol (within 24 hours)
      if (timeToWedding <= 24 * 60) {
        return this.getWeddingDayChannels(baseChannels, alert.priority);
      }

      // Critical wedding week protocol (within 7 days)
      if (timeToWedding <= 7 * 24 * 60) {
        return this.getWeddingWeekChannels(baseChannels, alert.priority);
      }

      // Standard wedding context optimization
      return this.getContextOptimizedChannels(baseChannels, context, alert);
    }

    // Fallback to performance-based selection
    return this.getPerformanceOptimizedChannels(baseChannels, alert.priority);
  }

  /**
   * Execute parallel delivery with sub-100ms failover capability
   */
  private async executeParallelDelivery(
    alert: WeddingAlert,
    channels: AlertChannel[],
    context?: WeddingContext,
  ): Promise<DeliveryResult[]> {
    const deliveryPromises = channels.map(async (channel, index) => {
      const deliveryStart = performance.now();

      try {
        // Check circuit breaker
        if (this.isCircuitBreakerOpen(channel.type)) {
          return {
            channel: channel.type,
            success: false,
            error: 'Circuit breaker open',
            deliveryTime: 0,
            timestamp: new Date(),
          };
        }

        // Execute delivery through existing orchestrator
        const result = await this.orchestrator.sendThroughChannel(
          channel,
          alert,
          context,
        );

        const deliveryTime = performance.now() - deliveryStart;

        // Update circuit breaker on success
        this.updateCircuitBreaker(channel.type, true, deliveryTime);

        return {
          ...result,
          deliveryTime,
          channelIndex: index,
        };
      } catch (error) {
        const deliveryTime = performance.now() - deliveryStart;

        // Update circuit breaker on failure
        this.updateCircuitBreaker(channel.type, false, deliveryTime);

        return {
          channel: channel.type,
          success: false,
          error: error.message,
          deliveryTime,
          channelIndex: index,
          timestamp: new Date(),
        };
      }
    });

    return Promise.all(deliveryPromises);
  }

  /**
   * Sub-100ms intelligent failover system
   */
  private async handleIntelligentFailover(
    alert: WeddingAlert,
    initialResults: DeliveryResult[],
    originalChannels: AlertChannel[],
    context?: WeddingContext,
    startTime: number,
  ): Promise<DeliveryResult[]> {
    const successfulDeliveries = initialResults.filter((r) => r.success);
    const failedDeliveries = initialResults.filter((r) => !r.success);

    // Check if failover is needed
    if (
      successfulDeliveries.length >=
      this.getRequiredSuccessCount(alert.priority)
    ) {
      return initialResults;
    }

    // Check if we have time for failover (sub-100ms requirement)
    const elapsed = performance.now() - startTime;
    if (elapsed > 50) {
      // Leave 50ms for failover
      return initialResults;
    }

    // Execute rapid failover
    const failoverChannels = await this.getFailoverChannels(
      originalChannels,
      failedDeliveries,
      alert,
      context,
    );

    if (failoverChannels.length === 0) {
      return initialResults;
    }

    // Execute failover deliveries
    const failoverResults = await this.executeRapidFailover(
      alert,
      failoverChannels,
      context,
      startTime,
    );

    return [...initialResults, ...failoverResults];
  }

  /**
   * Get wedding day emergency channels (within 24 hours)
   */
  private getWeddingDayChannels(
    baseChannels: AlertChannel[],
    priority: AlertPriority,
  ): AlertChannel[] {
    const weddingDayPriority = [
      'sms',
      'phone',
      'slack',
      'email',
      'webhook',
      'push',
    ];

    return baseChannels
      .sort((a, b) => {
        const aIndex = weddingDayPriority.indexOf(a.type);
        const bIndex = weddingDayPriority.indexOf(b.type);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      })
      .slice(0, priority === 'emergency' ? 6 : priority === 'critical' ? 4 : 3);
  }

  /**
   * Get wedding week priority channels (within 7 days)
   */
  private getWeddingWeekChannels(
    baseChannels: AlertChannel[],
    priority: AlertPriority,
  ): AlertChannel[] {
    const weddingWeekPriority = [
      'slack',
      'sms',
      'email',
      'webhook',
      'push',
      'phone',
    ];

    return baseChannels
      .sort((a, b) => {
        const aIndex = weddingWeekPriority.indexOf(a.type);
        const bIndex = weddingWeekPriority.indexOf(b.type);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      })
      .slice(0, priority === 'emergency' ? 5 : priority === 'critical' ? 3 : 2);
  }

  /**
   * Performance-optimized channel selection
   */
  private getPerformanceOptimizedChannels(
    baseChannels: AlertChannel[],
    priority: AlertPriority,
  ): AlertChannel[] {
    return baseChannels
      .filter((channel) => {
        const metrics = this.performanceMetrics.get(channel.type);
        return !metrics || metrics.averageDeliveryTime < 2000; // 2s max
      })
      .sort((a, b) => {
        const aMetrics = this.performanceMetrics.get(a.type);
        const bMetrics = this.performanceMetrics.get(b.type);

        const aScore = aMetrics
          ? aMetrics.successRate * (1 / aMetrics.averageDeliveryTime)
          : 0.5;
        const bScore = bMetrics
          ? bMetrics.successRate * (1 / bMetrics.averageDeliveryTime)
          : 0.5;

        return bScore - aScore;
      })
      .slice(0, this.getMaxChannelsForPriority(priority));
  }

  /**
   * Initialize channel health monitoring
   */
  private initializeChannelMonitoring(): void {
    setInterval(async () => {
      await this.updateChannelHealthStatus();
    }, 30000); // Update every 30 seconds

    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000); // Cleanup every 5 minutes
  }

  /**
   * Update channel health status
   */
  private async updateChannelHealthStatus(): Promise<void> {
    const channels = this.orchestrator.getAvailableChannels();

    for (const channel of channels) {
      try {
        const health = await this.testChannelHealth(channel);
        this.channelHealthCache.set(channel.type, {
          status: health.responsive ? 'healthy' : 'degraded',
          lastCheck: new Date(),
          responseTime: health.responseTime,
          lastError: health.error,
        });
      } catch (error) {
        this.channelHealthCache.set(channel.type, {
          status: 'unhealthy',
          lastCheck: new Date(),
          responseTime: 0,
          lastError: error.message,
        });
      }
    }
  }

  /**
   * Get healthy channels only
   */
  private async getHealthyChannels(): Promise<AlertChannel[]> {
    const allChannels = this.orchestrator.getAvailableChannels();

    return allChannels.filter((channel) => {
      const health = this.channelHealthCache.get(channel.type);
      return health && health.status !== 'unhealthy';
    });
  }

  /**
   * Circuit breaker management
   */
  private isCircuitBreakerOpen(channelType: string): boolean {
    const state = this.channelCircuitBreaker.get(channelType);
    if (!state) return false;

    if (state.state === 'open') {
      // Check if enough time has passed to try again
      const timeSinceOpen = Date.now() - state.lastFailureTime;
      if (timeSinceOpen > state.timeoutMs) {
        state.state = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(
    channelType: string,
    success: boolean,
    responseTime: number,
  ): void {
    let state = this.channelCircuitBreaker.get(channelType);
    if (!state) {
      state = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        timeoutMs: 30000, // 30 second timeout
      };
      this.channelCircuitBreaker.set(channelType, state);
    }

    if (success) {
      state.failureCount = 0;
      state.state = 'closed';
    } else {
      state.failureCount++;
      state.lastFailureTime = Date.now();

      // Open circuit breaker after 3 failures
      if (state.failureCount >= 3) {
        state.state = 'open';
        logger.warn(`Circuit breaker opened for channel: ${channelType}`);
      }
    }
  }

  /**
   * Emergency fallback to basic orchestrator
   */
  private async executeEmergencyFallback(
    alert: WeddingAlert,
    context?: WeddingContext,
    startTime: number,
  ): Promise<EnhancedDeliveryResult> {
    try {
      const basicResults = await this.orchestrator.sendAlert(alert, context);

      return {
        success: basicResults.some((r) => r.success),
        totalDeliveryTime: performance.now() - startTime,
        channelResults: basicResults,
        escalationTriggered: false,
        weddingContextApplied: false,
        failoverExecuted: false,
        emergencyFallback: true,
      };
    } catch (error) {
      return {
        success: false,
        totalDeliveryTime: performance.now() - startTime,
        channelResults: [],
        escalationTriggered: false,
        weddingContextApplied: false,
        failoverExecuted: false,
        emergencyFallback: true,
        error: error.message,
      };
    }
  }

  // Helper methods
  private getRequiredSuccessCount(priority: AlertPriority): number {
    switch (priority) {
      case 'emergency':
        return 3;
      case 'critical':
        return 2;
      case 'high':
        return 1;
      default:
        return 1;
    }
  }

  private getMaxChannelsForPriority(priority: AlertPriority): number {
    switch (priority) {
      case 'emergency':
        return 6;
      case 'critical':
        return 4;
      case 'high':
        return 3;
      default:
        return 2;
    }
  }

  private async testChannelHealth(
    channel: AlertChannel,
  ): Promise<ChannelHealthTest> {
    // Implementation would test channel connectivity
    // For now, return mock health test
    return {
      responsive: true,
      responseTime: Math.random() * 500,
      error: null,
    };
  }

  private updateChannelMetrics(
    results: DeliveryResult[],
    totalTime: number,
  ): void {
    results.forEach((result) => {
      const existing = this.performanceMetrics.get(result.channel) || {
        successRate: 0,
        averageDeliveryTime: 0,
        totalAttempts: 0,
        successfulAttempts: 0,
      };

      existing.totalAttempts++;
      if (result.success) {
        existing.successfulAttempts++;
      }

      existing.successRate =
        existing.successfulAttempts / existing.totalAttempts;
      existing.averageDeliveryTime =
        (existing.averageDeliveryTime + (result.deliveryTime || 0)) / 2;

      this.performanceMetrics.set(result.channel, existing);
    });
  }

  private cleanupOldMetrics(): void {
    // Clean up metrics older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [channelType, health] of this.channelHealthCache.entries()) {
      if (health.lastCheck.getTime() < oneHourAgo) {
        this.channelHealthCache.delete(channelType);
      }
    }
  }

  private async getFailoverChannels(
    originalChannels: AlertChannel[],
    failedDeliveries: DeliveryResult[],
    alert: WeddingAlert,
    context?: WeddingContext,
  ): Promise<AlertChannel[]> {
    const allChannels = this.orchestrator.getAvailableChannels();
    const failedChannelTypes = failedDeliveries.map((d) => d.channel);
    const usedChannelTypes = originalChannels.map((c) => c.type);

    return allChannels.filter(
      (channel) =>
        !usedChannelTypes.includes(channel.type) &&
        !this.isCircuitBreakerOpen(channel.type),
    );
  }

  private async executeRapidFailover(
    alert: WeddingAlert,
    failoverChannels: AlertChannel[],
    context?: WeddingContext,
    startTime: number,
  ): Promise<DeliveryResult[]> {
    const remainingTime = 100 - (performance.now() - startTime);
    if (remainingTime <= 10) return []; // Need at least 10ms per delivery

    const maxFailovers = Math.min(
      failoverChannels.length,
      Math.floor(remainingTime / 10),
    );

    const rapidPromises = failoverChannels
      .slice(0, maxFailovers)
      .map((channel) =>
        this.orchestrator.sendThroughChannel(channel, alert, context),
      );

    return Promise.all(rapidPromises);
  }

  private getContextOptimizedChannels(
    baseChannels: AlertChannel[],
    context: WeddingContext,
    alert: WeddingAlert,
  ): AlertChannel[] {
    // Implement wedding context optimization logic
    return baseChannels.slice(0, 3); // Placeholder
  }

  private async checkEmergencyEscalation(
    alert: WeddingAlert,
    results: DeliveryResult[],
    context?: WeddingContext,
  ): Promise<void> {
    const successCount = results.filter((r) => r.success).length;
    const requiredSuccess = this.getRequiredSuccessCount(alert.priority);

    if (successCount < requiredSuccess && alert.priority === 'emergency') {
      this.emergencyEscalationActive = true;
      this.emit('emergencyEscalation', { alert, results, context });
    }
  }

  private setupPerformanceOptimizations(): void {
    // Initialize delivery queues for different priorities
    this.deliveryQueue.set('emergency', []);
    this.deliveryQueue.set('critical', []);
    this.deliveryQueue.set('high', []);
    this.deliveryQueue.set('medium', []);
    this.deliveryQueue.set('low', []);
  }
}

// Type definitions for WS-155 enhancements
interface ChannelHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  lastError?: string;
}

interface ChannelPerformanceMetrics {
  successRate: number;
  averageDeliveryTime: number;
  totalAttempts: number;
  successfulAttempts: number;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  timeoutMs: number;
}

interface ChannelHealthTest {
  responsive: boolean;
  responseTime: number;
  error?: string | null;
}

interface MultiChannelConfig {
  maxConcurrentDeliveries: number;
  failoverTimeoutMs: number;
  circuitBreakerFailureThreshold: number;
  circuitBreakerTimeoutMs: number;
  performanceMetricsRetentionMs: number;
}

interface EnhancedDeliveryResult {
  success: boolean;
  totalDeliveryTime: number;
  channelResults: DeliveryResult[];
  escalationTriggered: boolean;
  weddingContextApplied: boolean;
  failoverExecuted: boolean;
  emergencyFallback?: boolean;
  error?: string;
}

const DEFAULT_CONFIG: MultiChannelConfig = {
  maxConcurrentDeliveries: 10,
  failoverTimeoutMs: 100,
  circuitBreakerFailureThreshold: 3,
  circuitBreakerTimeoutMs: 30000,
  performanceMetricsRetentionMs: 3600000, // 1 hour
};
