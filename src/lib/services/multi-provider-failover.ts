/**
 * WS-155 Round 2: Multi-Provider Failover System
 * Team C - Advanced Integration Phase
 *
 * Provides intelligent failover between multiple communication providers
 * with automatic health checks and performance optimization
 */

import { EventEmitter } from 'events';

export interface Provider {
  name: string;
  type: 'email' | 'sms' | 'push';
  priority: number;
  healthy: boolean;
  lastHealthCheck: Date;
  successRate: number;
  avgResponseTime: number;
  send: (message: Message) => Promise<SendResult>;
  healthCheck: () => Promise<boolean>;
}

export interface Message {
  id: string;
  to: string | string[];
  from?: string;
  subject?: string;
  body: string;
  html?: string;
  type: 'email' | 'sms' | 'push';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  retryCount?: number;
  originalProvider?: string;
}

export interface SendResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  responseTime: number;
  timestamp: Date;
  failoverUsed?: boolean;
  attemptNumber?: number;
}

export interface FailoverConfig {
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  failoverThreshold: number;
  priorityBoost: Record<'urgent' | 'high' | 'normal' | 'low', number>;
}

export class MultiProviderFailover extends EventEmitter {
  private providers: Map<string, Provider[]> = new Map();
  private providerStats: Map<string, ProviderStats> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private config: FailoverConfig;

  constructor(config?: Partial<FailoverConfig>) {
    super();
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 60000,
      failoverThreshold: 0.8,
      priorityBoost: {
        urgent: 100,
        high: 50,
        normal: 10,
        low: 0,
      },
      ...config,
    };
    this.startHealthChecks();
  }

  /**
   * Register a communication provider
   */
  registerProvider(type: 'email' | 'sms' | 'push', provider: Provider): void {
    if (!this.providers.has(type)) {
      this.providers.set(type, []);
    }

    const providers = this.providers.get(type)!;
    providers.push(provider);
    providers.sort((a, b) => b.priority - a.priority);

    // Initialize stats
    this.providerStats.set(provider.name, {
      totalAttempts: 0,
      successCount: 0,
      failureCount: 0,
      avgResponseTime: 0,
      lastFailure: null,
      consecutiveFailures: 0,
    });

    this.emit('provider:registered', { type, provider: provider.name });
  }

  /**
   * Send a message with automatic failover
   */
  async send(message: Message): Promise<SendResult> {
    const providers = this.getHealthyProviders(message.type, message.priority);

    if (providers.length === 0) {
      throw new Error(`No healthy ${message.type} providers available`);
    }

    let lastError: Error | null = null;
    let attemptNumber = 0;

    for (const provider of providers) {
      attemptNumber++;

      try {
        const startTime = Date.now();
        const result = await provider.send(message);
        const responseTime = Date.now() - startTime;

        // Update stats
        this.updateProviderStats(provider.name, true, responseTime);

        return {
          ...result,
          provider: provider.name,
          responseTime,
          timestamp: new Date(),
          failoverUsed: attemptNumber > 1,
          attemptNumber,
        };
      } catch (error) {
        lastError = error as Error;
        this.updateProviderStats(provider.name, false);

        this.emit('provider:failure', {
          provider: provider.name,
          message: message.id,
          error: lastError.message,
          attemptNumber,
        });

        // Check if we should continue with failover
        if (attemptNumber < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * attemptNumber);
        }
      }
    }

    throw new Error(
      `All providers failed: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * Get healthy providers sorted by performance
   */
  private getHealthyProviders(
    type: 'email' | 'sms' | 'push',
    priority: Message['priority'],
  ): Provider[] {
    const providers = this.providers.get(type) || [];
    const priorityBoost = this.config.priorityBoost[priority];

    return providers
      .filter((p) => p.healthy)
      .map((provider) => {
        const stats = this.providerStats.get(provider.name);
        const score = this.calculateProviderScore(
          provider,
          stats,
          priorityBoost,
        );
        return { provider, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(({ provider }) => provider);
  }

  /**
   * Calculate provider score for intelligent routing
   */
  private calculateProviderScore(
    provider: Provider,
    stats: ProviderStats | undefined,
    priorityBoost: number,
  ): number {
    if (!stats) return provider.priority + priorityBoost;

    const successRate =
      stats.totalAttempts > 0 ? stats.successCount / stats.totalAttempts : 1;

    const responseScore =
      stats.avgResponseTime > 0 ? 1000 / stats.avgResponseTime : 1;

    const failurePenalty = stats.consecutiveFailures * 10;

    return (
      provider.priority +
      priorityBoost +
      successRate * 100 +
      responseScore * 10 -
      failurePenalty
    );
  }

  /**
   * Update provider statistics
   */
  private updateProviderStats(
    providerName: string,
    success: boolean,
    responseTime?: number,
  ): void {
    const stats = this.providerStats.get(providerName);
    if (!stats) return;

    stats.totalAttempts++;

    if (success) {
      stats.successCount++;
      stats.consecutiveFailures = 0;

      if (responseTime) {
        stats.avgResponseTime =
          (stats.avgResponseTime * (stats.totalAttempts - 1) + responseTime) /
          stats.totalAttempts;
      }
    } else {
      stats.failureCount++;
      stats.consecutiveFailures++;
      stats.lastFailure = new Date();
    }

    // Check if provider should be marked unhealthy
    const successRate = stats.successCount / stats.totalAttempts;
    if (
      successRate < this.config.failoverThreshold &&
      stats.totalAttempts >= 10
    ) {
      this.markProviderUnhealthy(providerName);
    }
  }

  /**
   * Mark a provider as unhealthy
   */
  private markProviderUnhealthy(providerName: string): void {
    for (const providers of this.providers.values()) {
      const provider = providers.find((p) => p.name === providerName);
      if (provider) {
        provider.healthy = false;
        this.emit('provider:unhealthy', { provider: providerName });
        break;
      }
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      for (const providers of this.providers.values()) {
        for (const provider of providers) {
          try {
            const healthy = await provider.healthCheck();
            const wasUnhealthy = !provider.healthy;
            provider.healthy = healthy;
            provider.lastHealthCheck = new Date();

            if (wasUnhealthy && healthy) {
              this.emit('provider:recovered', { provider: provider.name });
              // Reset consecutive failures on recovery
              const stats = this.providerStats.get(provider.name);
              if (stats) {
                stats.consecutiveFailures = 0;
              }
            }
          } catch (error) {
            provider.healthy = false;
            this.emit('provider:healthcheck:failed', {
              provider: provider.name,
              error: (error as Error).message,
            });
          }
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Get provider statistics
   */
  getProviderStats(
    providerName?: string,
  ): ProviderStats | Map<string, ProviderStats> {
    if (providerName) {
      const stats = this.providerStats.get(providerName);
      if (!stats) throw new Error(`Provider ${providerName} not found`);
      return stats;
    }
    return new Map(this.providerStats);
  }

  /**
   * Force provider health check
   */
  async forceHealthCheck(providerName?: string): Promise<void> {
    const providersToCheck: Provider[] = [];

    if (providerName) {
      for (const providers of this.providers.values()) {
        const provider = providers.find((p) => p.name === providerName);
        if (provider) {
          providersToCheck.push(provider);
          break;
        }
      }
    } else {
      for (const providers of this.providers.values()) {
        providersToCheck.push(...providers);
      }
    }

    await Promise.all(
      providersToCheck.map(async (provider) => {
        try {
          provider.healthy = await provider.healthCheck();
          provider.lastHealthCheck = new Date();
        } catch {
          provider.healthy = false;
        }
      }),
    );
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    this.removeAllListeners();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

interface ProviderStats {
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  avgResponseTime: number;
  lastFailure: Date | null;
  consecutiveFailures: number;
}
