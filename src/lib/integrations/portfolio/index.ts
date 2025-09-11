/**
 * Portfolio Integration Services
 *
 * This module provides comprehensive integration services for the WedSync portfolio management system.
 * It includes AI-powered image analysis, global CDN delivery, real-time synchronization,
 * webhook handling, and background job processing capabilities.
 */

// Core Integration Services
export { AIServicesIntegration } from './ai-services';
export { CDNManager } from './cdn-manager';
export { RealtimeSyncManager } from './realtime-sync';
export { WebhookHandler } from './webhook-handler';
export { ProcessingQueue } from './processing-queue';

// Type definitions for portfolio integrations
export interface PortfolioIntegrationConfig {
  aiServices: {
    openai: {
      apiKey: string;
      model: string;
      maxTokens: number;
    };
    googleVision: {
      projectId: string;
      credentials: string;
    };
    fallbackStrategy: 'openai-first' | 'google-first' | 'parallel';
  };
  cdn: {
    primaryProvider: 'cloudflare' | 'aws-cloudfront' | 'fastly';
    fallbackProviders: string[];
    globalCaching: boolean;
    imageOptimization: boolean;
  };
  realtime: {
    supabaseUrl: string;
    supabaseKey: string;
    presenceTracking: boolean;
    conflictResolution: 'manual' | 'auto' | 'merge';
  };
  webhooks: {
    endpoints: Array<{
      pattern: string;
      url: string;
      secret: string;
    }>;
    retryConfig: {
      maxRetries: number;
      baseDelay: number;
      maxDelay: number;
    };
  };
  processing: {
    maxConcurrentJobs: number;
    workerTypes: string[];
    resourceLimits: {
      cpu: number;
      memory: number;
      storage: number;
    };
  };
}

export interface PortfolioAnalysisResult {
  imageId: string;
  categories: string[];
  confidence: number;
  sceneType: 'ceremony' | 'reception' | 'portrait' | 'detail' | 'candid';
  tags: string[];
  altText: string;
  colorPalette: string[];
  weddingMoments?: string[];
  emotionalContext?: string;
  photographyStyle?: string;
  processingTime: number;
  provider: 'openai' | 'google';
}

export interface PortfolioDeliveryMetrics {
  bandwidth: number;
  requests: number;
  cacheHitRatio: number;
  avgResponseTime: number;
  errorRate: number;
  topCountries: Array<{ country: string; requests: number }>;
  estimatedSavings: {
    bandwidth: number;
    loadTime: number;
  };
}

export interface PortfolioSyncStatus {
  portfolioId: string;
  connected: boolean;
  activeUsers: number;
  lastSync: Date;
  conflictsCount: number;
  optimisticUpdates: number;
  syncHealth: 'healthy' | 'degraded' | 'disconnected';
}

/**
 * Portfolio Integration Orchestrator
 *
 * Main orchestrator class that coordinates all portfolio integration services
 */
export class PortfolioIntegrationOrchestrator {
  private aiServices: AIServicesIntegration;
  private cdnManager: CDNManager;
  private realtimeSync: RealtimeSyncManager;
  private webhookHandler: WebhookHandler;
  private processingQueue: ProcessingQueue;
  private config: PortfolioIntegrationConfig;

  constructor(config: PortfolioIntegrationConfig) {
    this.config = config;

    // Initialize services with appropriate configurations
    const baseConfig = {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
      timeout: 30000,
      retryAttempts: 3,
      rateLimitPerMinute: 60,
    };

    const baseCredentials = {
      apiKey: process.env.PORTFOLIO_API_KEY || '',
      userId: 'system',
      organizationId: process.env.ORGANIZATION_ID || '',
    };

    this.aiServices = new AIServicesIntegration(baseConfig, baseCredentials);
    this.cdnManager = new CDNManager(baseConfig, baseCredentials);
    this.realtimeSync = new RealtimeSyncManager(baseConfig, baseCredentials);
    this.webhookHandler = new WebhookHandler(baseConfig, baseCredentials);
    this.processingQueue = new ProcessingQueue(baseConfig, baseCredentials);
  }

  /**
   * Initialize all portfolio integration services
   */
  async initialize(): Promise<void> {
    try {
      // Initialize webhook handlers first
      await this.webhookHandler.enableHealthCheck();

      // Start background sync
      await this.realtimeSync.enableBackgroundSync();

      // Optimize processing resources
      await this.processingQueue.optimizeResourceAllocation();

      console.log('Portfolio integration services initialized successfully');
    } catch (error) {
      console.error(
        'Failed to initialize portfolio integration services:',
        error,
      );
      throw error;
    }
  }

  /**
   * Process a new portfolio upload with comprehensive integration
   */
  async processPortfolioUpload(
    portfolioId: string,
    userId: string,
    images: Array<{
      url: string;
      filename: string;
      size: number;
      metadata?: Record<string, any>;
    }>,
  ): Promise<{
    uploadId: string;
    jobIds: string[];
    estimatedCompletion: Date;
  }> {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const jobIds: string[] = [];

    try {
      // Step 1: Upload to CDN and get optimized URLs
      for (const image of images) {
        // Add CDN upload job
        const cdnJobId = await this.processingQueue.addJob(
          'cdn_upload',
          portfolioId,
          userId,
          {
            imageUrl: image.url,
            filename: image.filename,
            uploadId,
          },
          { priority: 'high', estimatedDuration: 20 },
        );
        jobIds.push(cdnJobId);

        // Add AI analysis job (depends on CDN upload)
        const aiJobId = await this.processingQueue.addJob(
          'ai_analysis',
          portfolioId,
          userId,
          {
            imageUrl: image.url,
            filename: image.filename,
            uploadId,
          },
          {
            priority: 'medium',
            dependencies: [cdnJobId],
            estimatedDuration: 30,
          },
        );
        jobIds.push(aiJobId);

        // Add thumbnail generation job
        const thumbJobId = await this.processingQueue.addJob(
          'thumbnail_generation',
          portfolioId,
          userId,
          {
            imageUrl: image.url,
            filename: image.filename,
            uploadId,
          },
          {
            priority: 'medium',
            dependencies: [cdnJobId],
            estimatedDuration: 10,
          },
        );
        jobIds.push(thumbJobId);
      }

      // Estimate completion time based on queue status and job duration
      const queueMetrics = this.processingQueue.getMetrics();
      const estimatedWaitTime = queueMetrics.avgWaitTime;
      const estimatedProcessingTime = jobIds.length * 20; // Average 20 seconds per job
      const estimatedCompletion = new Date(
        Date.now() + (estimatedWaitTime + estimatedProcessingTime) * 1000,
      );

      // Publish webhook event for upload started
      await this.webhookHandler.publishEvent('portfolio_upload_started', {
        uploadId,
        portfolioId,
        userId,
        imageCount: images.length,
        jobIds,
        estimatedCompletion,
      });

      return {
        uploadId,
        jobIds,
        estimatedCompletion,
      };
    } catch (error) {
      console.error('Portfolio upload processing failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive portfolio status across all integration services
   */
  async getPortfolioStatus(portfolioId: string): Promise<{
    sync: PortfolioSyncStatus;
    processing: {
      activeJobs: number;
      completedJobs: number;
      failedJobs: number;
      avgProcessingTime: number;
    };
    delivery: PortfolioDeliveryMetrics;
    analytics: {
      totalImages: number;
      analyzedImages: number;
      analysisAccuracy: number;
      topCategories: Array<{ category: string; count: number }>;
    };
  }> {
    try {
      // Get sync status
      const syncConnectionStatus = this.realtimeSync.getConnectionStatus();
      const portfolioState =
        await this.realtimeSync.getPortfolioState(portfolioId);

      const syncStatus: PortfolioSyncStatus = {
        portfolioId,
        connected: syncConnectionStatus.connected,
        activeUsers: syncConnectionStatus.presenceUsers,
        lastSync: portfolioState.lastUpdated,
        conflictsCount: portfolioState.conflictsCount,
        optimisticUpdates: syncConnectionStatus.optimisticUpdates,
        syncHealth: syncConnectionStatus.connected ? 'healthy' : 'disconnected',
      };

      // Get processing status
      const processingMetrics = this.processingQueue.getMetrics();
      const processing = {
        activeJobs: processingMetrics.processingJobs,
        completedJobs: processingMetrics.completedJobs,
        failedJobs: processingMetrics.failedJobs,
        avgProcessingTime: processingMetrics.avgProcessingTime,
      };

      // Get delivery metrics
      const delivery = await this.cdnManager.getPerformanceMetrics('24h');

      // Get analytics summary (simplified)
      const analytics = {
        totalImages: portfolioState.images.length,
        analyzedImages: portfolioState.images.filter((img) => img.ai_analysis)
          .length,
        analysisAccuracy: 0.92, // Would be calculated from actual analysis results
        topCategories: [
          { category: 'ceremony', count: 45 },
          { category: 'reception', count: 38 },
          { category: 'portrait', count: 29 },
        ], // Would be calculated from actual data
      };

      return {
        sync: syncStatus,
        processing,
        delivery,
        analytics,
      };
    } catch (error) {
      console.error('Failed to get portfolio status:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time portfolio updates with comprehensive event handling
   */
  async subscribeToPortfolioUpdates(
    portfolioId: string,
    userId: string,
    callback: (event: {
      type: string;
      data: any;
      source: 'sync' | 'processing' | 'webhook' | 'cdn';
      timestamp: Date;
    }) => void,
  ): Promise<string> {
    // Subscribe to realtime sync updates
    const syncSubscriptionId = await this.realtimeSync.subscribeToPortfolio(
      portfolioId,
      userId,
      (update) => {
        callback({
          type: update.type,
          data: update.data,
          source: 'sync',
          timestamp: update.timestamp,
        });
      },
    );

    // Subscribe to relevant webhook events
    await this.webhookHandler.addSubscriber({
      id: `portfolio_${portfolioId}_webhook_subscriber`,
      pattern: 'portfolio_*',
      endpoint: `${this.config.webhooks.endpoints[0]?.url}/portfolio/${portfolioId}`,
      secret: this.config.webhooks.endpoints[0]?.secret || '',
      active: true,
      retryConfig: this.config.webhooks.retryConfig,
    });

    return syncSubscriptionId;
  }

  /**
   * Optimize portfolio delivery performance
   */
  async optimizePortfolioDelivery(portfolioId: string): Promise<{
    optimizedUrls: Record<string, string>;
    estimatedSavings: { bandwidth: number; loadTime: number };
    cacheStrategy: string;
  }> {
    try {
      const portfolioState =
        await this.realtimeSync.getPortfolioState(portfolioId);

      // Optimize image delivery
      const optimization = await this.cdnManager.optimizeImageDelivery(
        portfolioId,
        portfolioState.images.map((img) => ({
          key: img.id,
          metadata: img.metadata,
        })),
      );

      // Set aggressive cache strategy for portfolio images
      await this.cdnManager.setCacheStrategy(`portfolio/${portfolioId}/*`, {
        ttl: 86400, // 24 hours
        staleWhileRevalidate: 3600, // 1 hour
        purgeOnUpdate: true,
        varyOnUserAgent: true,
        varyOnAcceptHeader: true,
      });

      // Preload critical images
      const criticalImages = portfolioState.images
        .filter((img) => img.featured || img.priority === 'high')
        .map((img) => img.id);

      if (criticalImages.length > 0) {
        await this.cdnManager.preloadImages(criticalImages, 'high');
      }

      return {
        optimizedUrls: Object.fromEntries(optimization.optimizedUrls),
        estimatedSavings: optimization.estimatedSavings,
        cacheStrategy: 'aggressive_portfolio_caching',
      };
    } catch (error) {
      console.error('Portfolio delivery optimization failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    services: Array<{
      name: string;
      status: 'healthy' | 'degraded' | 'critical';
      responseTime?: number;
      lastCheck: Date;
    }>;
    metrics: {
      totalPortfolios: number;
      activeUsers: number;
      processingJobs: number;
      errorRate: number;
    };
  }> {
    const services = [
      { name: 'AI Services', service: this.aiServices },
      { name: 'CDN Manager', service: this.cdnManager },
      { name: 'Realtime Sync', service: this.realtimeSync },
      { name: 'Webhook Handler', service: this.webhookHandler },
      { name: 'Processing Queue', service: this.processingQueue },
    ];

    const healthChecks = await Promise.all(
      services.map(async ({ name, service }) => {
        try {
          const healthCheck = await service.healthCheck();
          return {
            name,
            status:
              healthCheck.status === 'healthy'
                ? ('healthy' as const)
                : ('critical' as const),
            responseTime: healthCheck.responseTime,
            lastCheck: healthCheck.lastChecked,
          };
        } catch (error) {
          return {
            name,
            status: 'critical' as const,
            responseTime: undefined,
            lastCheck: new Date(),
          };
        }
      }),
    );

    const criticalServices = healthChecks.filter(
      (hc) => hc.status === 'critical',
    ).length;
    const overall =
      criticalServices === 0
        ? 'healthy'
        : criticalServices < 3
          ? 'degraded'
          : 'critical';

    // Get system metrics
    const processingMetrics = this.processingQueue.getMetrics();
    const syncStatus = this.realtimeSync.getConnectionStatus();

    return {
      overall,
      services: healthChecks,
      metrics: {
        totalPortfolios: 0, // Would be fetched from database
        activeUsers: syncStatus.presenceUsers,
        processingJobs: processingMetrics.processingJobs,
        errorRate: processingMetrics.errorRate,
      },
    };
  }

  /**
   * Cleanup and shutdown all integration services
   */
  async cleanup(): Promise<void> {
    try {
      await Promise.all([
        this.realtimeSync.cleanup(),
        this.webhookHandler.cleanup(),
        this.processingQueue.cleanup(),
      ]);

      console.log('Portfolio integration services cleaned up successfully');
    } catch (error) {
      console.error('Error during portfolio integration cleanup:', error);
      throw error;
    }
  }
}

// Default export for easy importing
export default PortfolioIntegrationOrchestrator;

/**
 * Factory function to create a configured portfolio integration orchestrator
 */
export function createPortfolioIntegrationOrchestrator(
  config?: Partial<PortfolioIntegrationConfig>,
): PortfolioIntegrationOrchestrator {
  const defaultConfig: PortfolioIntegrationConfig = {
    aiServices: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4-vision-preview',
        maxTokens: 500,
      },
      googleVision: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
        credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
      },
      fallbackStrategy: 'openai-first',
    },
    cdn: {
      primaryProvider: 'cloudflare',
      fallbackProviders: ['aws-cloudfront', 'fastly'],
      globalCaching: true,
      imageOptimization: true,
    },
    realtime: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      presenceTracking: true,
      conflictResolution: 'merge',
    },
    webhooks: {
      endpoints: [
        {
          pattern: 'portfolio_*',
          url: process.env.WEBHOOK_ENDPOINT_URL || '',
          secret: process.env.WEBHOOK_SECRET || '',
        },
      ],
      retryConfig: {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
      },
    },
    processing: {
      maxConcurrentJobs: 10,
      workerTypes: ['ai_analysis', 'image_processing', 'cdn_upload'],
      resourceLimits: {
        cpu: 80,
        memory: 2048,
        storage: 4096,
      },
    },
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    aiServices: { ...defaultConfig.aiServices, ...config?.aiServices },
    cdn: { ...defaultConfig.cdn, ...config?.cdn },
    realtime: { ...defaultConfig.realtime, ...config?.realtime },
    webhooks: { ...defaultConfig.webhooks, ...config?.webhooks },
    processing: { ...defaultConfig.processing, ...config?.processing },
  };

  return new PortfolioIntegrationOrchestrator(mergedConfig);
}
