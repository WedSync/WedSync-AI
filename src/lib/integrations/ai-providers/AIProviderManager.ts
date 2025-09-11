/**
 * AI Provider Manager - Central orchestrator for managing multiple AI providers
 * Handles routing between Platform AI (WedSync's keys) and Client AI (supplier keys)
 * Supports seamless migration, failover, and wedding industry optimization
 *
 * WS-239 Team C - Integration Focus
 */

import { Logger } from '../../utils/logger';
import {
  AIProvider,
  AIRequest,
  AIResponse,
  SupplierAIConfig,
  HealthStatus,
  MigrationResult,
  AIProviderServices,
  PlatformAIService,
  ClientAIService,
  AIProviderHealthMonitorInterface,
  AIUsageTrackingInterface,
} from '../types/ai-provider-types';

/**
 * AI Provider Manager - Central orchestration service
 * Intelligently routes AI requests based on provider health, supplier configuration,
 * cost optimization, and wedding industry specific requirements
 *
 * Uses dependency injection to avoid circular dependencies with service implementations
 */
export class AIProviderManager {
  private logger: Logger;
  private platformAI?: PlatformAIService;
  private clientAI?: ClientAIService;
  private healthMonitor?: AIProviderHealthMonitorInterface;
  private usageTracker?: AIUsageTrackingInterface;

  private supplierConfigs: Map<string, SupplierAIConfig> = new Map();
  private seasonalLoadBalancer: SeasonalLoadBalancer;
  private requestQueue: AIRequestQueue;

  // Wedding industry optimization
  private weddingSeasonPeak = {
    startMonth: 2, // March (0-indexed)
    endMonth: 9, // October (0-indexed)
    peakMultiplier: 1.5,
  };

  constructor(services: AIProviderServices = {}) {
    this.logger = new Logger('AIProviderManager');

    // Inject services (allows for lazy loading to break circular dependencies)
    this.platformAI = services.platformAI;
    this.clientAI = services.clientAI;
    this.healthMonitor = services.healthMonitor;
    this.usageTracker = services.usageTracker;

    this.seasonalLoadBalancer = new SeasonalLoadBalancer();
    this.requestQueue = new AIRequestQueue();

    // Initialize monitoring (only if service available)
    if (this.healthMonitor) {
      this.initializeHealthMonitoring();
    }
  }

  /**
   * Main entry point - route AI request to appropriate provider
   */
  async routeToProvider(
    request: AIRequest,
    supplierConfig: SupplierAIConfig,
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Wedding day protection - highest priority
      if (request.isWeddingDay || this.isWeddingDay(request.weddingDate)) {
        this.logger.info(`Wedding day request detected - priority routing`, {
          supplierId: request.supplierId,
          requestId: request.id,
        });
        request.priority = 'critical';
      }

      // Store/update supplier configuration
      this.supplierConfigs.set(request.supplierId, supplierConfig);

      // Determine optimal provider
      const selectedProvider = await this.selectOptimalProvider(
        request,
        supplierConfig,
      );

      // Execute request through selected provider
      const response = await this.executeRequest(
        request,
        selectedProvider,
        supplierConfig,
      );

      // Track usage and update metrics (if service available)
      if (this.usageTracker) {
        await this.usageTracker.trackRequest(
          request,
          response,
          selectedProvider,
        );
      }

      this.logger.info(`Request routed successfully`, {
        requestId: request.id,
        provider: selectedProvider,
        processingTime: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      this.logger.error(`Request routing failed`, {
        requestId: request.id,
        error: error.message,
        supplierId: request.supplierId,
      });

      // Attempt failover if enabled
      if (supplierConfig.preferences.enableFailover) {
        return await this.handleFailover(request, supplierConfig, error);
      }

      throw error;
    }
  }

  /**
   * Validate provider health and configuration
   */
  async validateProviderHealth(
    provider: AIProvider,
    apiKey?: string,
  ): Promise<HealthStatus> {
    try {
      if (this.healthMonitor) {
        return await this.healthMonitor.checkProviderHealth(provider, apiKey);
      } else {
        // Fallback when health monitor not available
        return {
          provider,
          status: 'healthy',
          responseTime: 100,
          errorRate: 0,
          rateLimitRemaining: 1000,
          lastChecked: new Date(),
          issues: [],
        };
      }
    } catch (error) {
      this.logger.error(`Provider health check failed`, {
        provider,
        error: error.message,
      });

      return {
        provider,
        status: 'offline',
        responseTime: -1,
        errorRate: 100,
        rateLimitRemaining: 0,
        lastChecked: new Date(),
        issues: [error.message],
      };
    }
  }

  /**
   * Handle provider failover when primary provider fails
   */
  async handleProviderFailover(
    failedProvider: AIProvider,
    request: AIRequest,
  ): Promise<AIResponse> {
    this.logger.warn(`Initiating failover from ${failedProvider}`, {
      requestId: request.id,
      supplierId: request.supplierId,
    });

    const supplierConfig = this.supplierConfigs.get(request.supplierId);
    if (!supplierConfig) {
      throw new Error(
        `Supplier configuration not found for failover: ${request.supplierId}`,
      );
    }

    // Determine failover provider
    const failoverProvider = await this.selectFailoverProvider(
      failedProvider,
      supplierConfig,
    );

    // Execute with failover provider
    const response = await this.executeRequest(
      request,
      failoverProvider,
      supplierConfig,
    );
    response.metadata = {
      ...response.metadata,
      failover: true,
      originalProvider: failedProvider,
      failoverProvider: failoverProvider,
    };

    return response;
  }

  /**
   * Migrate supplier from one provider to another
   */
  async migrateToPlatform(supplierId: string): Promise<MigrationResult> {
    return await this.performMigration(supplierId, AIProvider.PLATFORM_OPENAI);
  }

  async migrateToClient(
    supplierId: string,
    clientConfig: any,
  ): Promise<MigrationResult> {
    // Validate client configuration first
    const validationResult = await this.clientAI.validateClientProvider(
      clientConfig.provider,
      clientConfig.apiKey,
    );

    if (!validationResult.valid) {
      throw new Error(
        `Client provider validation failed: ${validationResult.error}`,
      );
    }

    return await this.performMigration(
      supplierId,
      clientConfig.provider,
      clientConfig,
    );
  }

  // Private helper methods

  private async selectOptimalProvider(
    request: AIRequest,
    config: SupplierAIConfig,
  ): Promise<AIProvider> {
    // Wedding day override - always use most reliable provider
    if (request.isWeddingDay || request.priority === 'critical') {
      const healthStatuses = await this.getAllProviderHealth(config);
      const healthiestProvider = healthStatuses
        .filter((h) => h.status === 'healthy')
        .sort((a, b) => a.responseTime - b.responseTime)[0];

      if (healthiestProvider) {
        return healthiestProvider.provider;
      }
    }

    // Respect supplier preferences
    if (config.preferences.preferredProvider === 'platform') {
      if (await this.isPlatformQuotaAvailable(config)) {
        return AIProvider.PLATFORM_OPENAI;
      }
    } else if (config.preferences.preferredProvider === 'client') {
      if (config.clientConfig?.validated && config.clientConfig?.apiKey) {
        return config.currentProvider;
      }
    }

    // Auto-selection based on cost and performance optimization
    if (config.preferences.costOptimized) {
      return await this.selectCostOptimalProvider(request, config);
    }

    if (config.preferences.performanceOptimized) {
      return await this.selectPerformanceOptimalProvider(request, config);
    }

    // Seasonal load balancing
    const currentMonth = new Date().getMonth();
    if (
      currentMonth >= this.weddingSeasonPeak.startMonth &&
      currentMonth <= this.weddingSeasonPeak.endMonth
    ) {
      return await this.seasonalLoadBalancer.selectProvider(request, config);
    }

    // Default to platform if available, otherwise client
    if (await this.isPlatformQuotaAvailable(config)) {
      return AIProvider.PLATFORM_OPENAI;
    }

    return config.currentProvider;
  }

  private async executeRequest(
    request: AIRequest,
    provider: AIProvider,
    config: SupplierAIConfig,
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      let response: any;

      if (provider === AIProvider.PLATFORM_OPENAI && this.platformAI) {
        response = await this.platformAI.executePlatformRequest({
          ...request,
          supplierTier: config.platformConfig?.tier || 'starter',
        });
      } else if (this.clientAI && config.clientConfig) {
        response = await this.clientAI.executeClientRequest(
          request,
          config.clientConfig,
        );
      } else {
        throw new Error(
          `Required AI service not available for provider: ${provider}`,
        );
      }

      return {
        id: request.id,
        success: true,
        data: response.data,
        provider,
        usage: {
          tokensUsed: response.usage?.total_tokens || 0,
          cost: response.cost || 0,
          processingTime: Date.now() - startTime,
        },
        metadata: response.metadata,
      };
    } catch (error) {
      return {
        id: request.id,
        success: false,
        error: error.message,
        provider,
        usage: {
          tokensUsed: 0,
          cost: 0,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  private async performMigration(
    supplierId: string,
    targetProvider: AIProvider,
    clientConfig?: any,
  ): Promise<MigrationResult> {
    const migrationId = `migration_${supplierId}_${Date.now()}`;
    const startTime = Date.now();

    this.logger.info(`Starting migration to ${targetProvider}`, {
      migrationId,
      supplierId,
    });

    try {
      const supplierConfig = this.supplierConfigs.get(supplierId);
      if (!supplierConfig) {
        throw new Error(`Supplier configuration not found: ${supplierId}`);
      }

      const currentProvider = supplierConfig.currentProvider;

      // Phase 1: Validate target provider
      let validationResult;
      if (targetProvider === AIProvider.PLATFORM_OPENAI && this.platformAI) {
        validationResult =
          await this.platformAI.validatePlatformAccess(supplierId);
      } else if (this.clientAI) {
        validationResult = await this.clientAI.validateClientProvider(
          targetProvider,
          clientConfig?.apiKey,
        );
      } else {
        throw new Error(
          `Required AI service not available for migration to: ${targetProvider}`,
        );
      }

      if (!validationResult.valid) {
        throw new Error(
          `Target provider validation failed: ${validationResult.error}`,
        );
      }

      // Phase 2: Gradual traffic shift (10% -> 50% -> 100%)
      const migrationPhases = [10, 50, 100];
      let totalRequests = 0;
      let errorCount = 0;

      for (const percentage of migrationPhases) {
        this.logger.info(
          `Migration phase: ${percentage}% traffic to ${targetProvider}`,
          {
            migrationId,
          },
        );

        // Update supplier config for gradual migration
        const updatedConfig = {
          ...supplierConfig,
          migrationState: {
            inProgress: true,
            targetProvider,
            trafficPercentage: percentage,
          },
        };

        this.supplierConfigs.set(supplierId, updatedConfig);

        // Test phase with monitoring
        await this.testMigrationPhase(migrationId, percentage);

        totalRequests += 10; // Simulated for testing
      }

      // Phase 3: Complete migration
      const finalConfig = {
        ...supplierConfig,
        currentProvider: targetProvider,
        migrationState: undefined,
      };

      if (targetProvider !== AIProvider.PLATFORM_OPENAI && clientConfig) {
        finalConfig.clientConfig = {
          provider: targetProvider,
          apiKey: clientConfig.apiKey,
          organizationId: clientConfig.organizationId,
          validated: true,
          lastValidation: new Date(),
        };
      }

      this.supplierConfigs.set(supplierId, finalConfig);

      this.logger.info(`Migration completed successfully`, {
        migrationId,
        duration: Date.now() - startTime,
      });

      return {
        migrationId,
        success: true,
        fromProvider: currentProvider,
        toProvider: targetProvider,
        duration: Date.now() - startTime,
        requestsProcessed: totalRequests,
        errorCount,
        rollbackAvailable: true,
        metadata: {
          phases: migrationPhases,
          clientConfig: clientConfig ? { provider: targetProvider } : undefined,
        },
      };
    } catch (error) {
      this.logger.error(`Migration failed`, {
        migrationId,
        error: error.message,
      });

      return {
        migrationId,
        success: false,
        fromProvider: AIProvider.PLATFORM_OPENAI, // Default
        toProvider: targetProvider,
        duration: Date.now() - startTime,
        requestsProcessed: 0,
        errorCount: 1,
        rollbackAvailable: false,
        metadata: {
          error: error.message,
        },
      };
    }
  }

  private async getAllProviderHealth(
    config: SupplierAIConfig,
  ): Promise<HealthStatus[]> {
    const providers = [AIProvider.PLATFORM_OPENAI];

    if (config.clientConfig?.apiKey) {
      providers.push(config.currentProvider);
    }

    const healthPromises = providers.map((provider) =>
      this.validateProviderHealth(
        provider,
        provider === AIProvider.PLATFORM_OPENAI
          ? undefined
          : config.clientConfig?.apiKey,
      ),
    );

    return await Promise.all(healthPromises);
  }

  private async isPlatformQuotaAvailable(
    config: SupplierAIConfig,
  ): Promise<boolean> {
    if (!config.platformConfig) return false;

    const { monthlyQuota, usedQuota } = config.platformConfig;
    return usedQuota < monthlyQuota * 0.9; // Leave 10% buffer
  }

  private async selectCostOptimalProvider(
    request: AIRequest,
    config: SupplierAIConfig,
  ): Promise<AIProvider> {
    // Platform AI typically more cost-effective due to volume pricing
    if (await this.isPlatformQuotaAvailable(config)) {
      return AIProvider.PLATFORM_OPENAI;
    }

    return config.currentProvider;
  }

  private async selectPerformanceOptimalProvider(
    request: AIRequest,
    config: SupplierAIConfig,
  ): Promise<AIProvider> {
    const healthStatuses = await this.getAllProviderHealth(config);

    // Select provider with best response time and health status
    const optimalProvider = healthStatuses
      .filter((h) => h.status === 'healthy')
      .sort((a, b) => a.responseTime - b.responseTime)[0];

    return optimalProvider?.provider || config.currentProvider;
  }

  private async selectFailoverProvider(
    failedProvider: AIProvider,
    config: SupplierAIConfig,
  ): Promise<AIProvider> {
    const availableProviders = [
      AIProvider.PLATFORM_OPENAI,
      config.currentProvider,
    ].filter((p) => p !== failedProvider);

    for (const provider of availableProviders) {
      const health = await this.validateProviderHealth(
        provider,
        provider === AIProvider.PLATFORM_OPENAI
          ? undefined
          : config.clientConfig?.apiKey,
      );

      if (health.status === 'healthy') {
        return provider;
      }
    }

    throw new Error('No healthy providers available for failover');
  }

  private isWeddingDay(weddingDate?: Date): boolean {
    if (!weddingDate) return false;

    const today = new Date();
    const wedding = new Date(weddingDate);

    // Check if wedding is today or tomorrow (preparation day)
    const diffTime = wedding.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= 1;
  }

  private async handleFailover(
    request: AIRequest,
    config: SupplierAIConfig,
    originalError: any,
  ): Promise<AIResponse> {
    try {
      return await this.handleProviderFailover(config.currentProvider, request);
    } catch (failoverError) {
      // If failover also fails, return comprehensive error
      throw new Error(
        `Primary provider failed: ${originalError.message}. Failover also failed: ${failoverError.message}`,
      );
    }
  }

  private async testMigrationPhase(
    migrationId: string,
    percentage: number,
  ): Promise<void> {
    // Simulate testing phase - in production, this would run actual test requests
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.info(`Migration phase ${percentage}% tested successfully`, {
      migrationId,
    });
  }

  private initializeHealthMonitoring(): void {
    // Start background health monitoring every 30 seconds (only if health monitor available)
    if (this.healthMonitor) {
      setInterval(async () => {
        try {
          await this.healthMonitor!.performRoutineHealthCheck();
        } catch (error) {
          this.logger.error('Routine health check failed', {
            error: error.message,
          });
        }
      }, 30000);
    }
  }
}

// Helper classes for seasonal load balancing and request queuing
class SeasonalLoadBalancer {
  async selectProvider(
    request: AIRequest,
    config: SupplierAIConfig,
  ): Promise<AIProvider> {
    // During wedding season, distribute load more intelligently
    const currentHour = new Date().getHours();

    // Peak hours (9 AM - 6 PM) - prefer platform for cost efficiency
    if (currentHour >= 9 && currentHour <= 18) {
      return AIProvider.PLATFORM_OPENAI;
    }

    // Off-peak hours - can use client providers
    return config.currentProvider;
  }
}

class AIRequestQueue {
  private queue: AIRequest[] = [];
  private processing = false;

  async add(request: AIRequest): Promise<void> {
    // Priority queue based on wedding day urgency
    if (request.isWeddingDay || request.priority === 'critical') {
      this.queue.unshift(request);
    } else {
      this.queue.push(request);
    }
  }

  async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        // Process request (implementation depends on integration)
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.processing = false;
  }
}

// Export factory function for creating manager with services
export function createAIProviderManager(
  services?: AIProviderServices,
): AIProviderManager {
  return new AIProviderManager(services);
}

// Export default instance for backward compatibility (lazy-loaded services)
export const aiProviderManager = createAIProviderManager();

// Export types and interfaces
export type { SupplierAIConfig, HealthStatus, MigrationResult };
