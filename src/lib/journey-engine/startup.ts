import { getQueueProcessor, startQueueProcessor } from './queue-processor';
import { journeyExecutor } from './executor';
import { getErrorRecoverySystem } from './error-recovery';

/**
 * Journey Engine Startup Manager
 * Ensures all journey engine components are properly initialized
 */
export class JourneyEngineStartup {
  private static initialized = false;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Initialize all journey engine components
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private static async performInitialization(): Promise<void> {
    console.log('🚀 Initializing Journey Execution Engine...');

    try {
      // 1. Start the core executor scheduler
      console.log('   ✓ Starting journey executor scheduler...');
      // The executor starts its scheduler in the constructor

      // 2. Start the high-performance queue processor
      console.log('   ✓ Starting queue processor...');
      await startQueueProcessor();

      // 3. Initialize error recovery system
      console.log('   ✓ Initializing error recovery system...');
      getErrorRecoverySystem(); // This starts monitoring

      // 4. Verify system health
      console.log('   ✓ Verifying system health...');
      await this.verifySystemHealth();

      this.initialized = true;
      console.log('✅ Journey Execution Engine initialized successfully!');
    } catch (error) {
      console.error('❌ Journey Engine initialization failed:', error);
      throw error;
    }
  }

  /**
   * Verify all components are healthy
   */
  private static async verifySystemHealth(): Promise<void> {
    const queueProcessor = getQueueProcessor();

    // Check queue processor health
    if (!queueProcessor.isHealthy()) {
      throw new Error('Queue processor is not healthy');
    }

    // Get queue status
    const queueStatus = await queueProcessor.getQueueStatus();
    console.log('   📊 Queue Status:', {
      pending: queueStatus.pending,
      processing: queueStatus.processing,
      failed: queueStatus.failed,
      completed_today: queueStatus.completed_today,
    });

    // Get metrics
    const metrics = queueProcessor.getMetrics();
    console.log('   📈 Performance Metrics:', {
      total_processed: metrics.totalProcessed,
      success_rate:
        metrics.totalProcessed > 0
          ? Math.round((metrics.successCount / metrics.totalProcessed) * 100) +
            '%'
          : '0%',
      active_workers: metrics.activeWorkers,
      queue_depth: metrics.queueDepth,
      last_processed: metrics.lastProcessed,
    });
  }

  /**
   * Graceful shutdown of journey engine
   */
  static async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.log('🛑 Shutting down Journey Execution Engine...');

    try {
      // Stop the executor scheduler
      console.log('   ⏹️ Stopping journey executor...');
      journeyExecutor.stopScheduler();

      // Stop the queue processor
      console.log('   ⏹️ Stopping queue processor...');
      const { stopQueueProcessor } = await import('./queue-processor');
      await stopQueueProcessor();

      this.initialized = false;
      console.log('✅ Journey Execution Engine shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get current system status
   */
  static async getSystemStatus(): Promise<{
    initialized: boolean;
    components: {
      executor: boolean;
      queue_processor: boolean;
      error_recovery: boolean;
    };
    health: {
      queue_status: any;
      metrics: any;
    };
  }> {
    try {
      const queueProcessor = getQueueProcessor();
      const queueStatus = await queueProcessor.getQueueStatus();
      const metrics = queueProcessor.getMetrics();

      return {
        initialized: this.initialized,
        components: {
          executor: true, // Always true if this code is running
          queue_processor: queueProcessor.isHealthy(),
          error_recovery: true, // Always true if this code is running
        },
        health: {
          queue_status: queueStatus,
          metrics: {
            total_processed: metrics.totalProcessed,
            success_count: metrics.successCount,
            error_count: metrics.errorCount,
            success_rate:
              metrics.totalProcessed > 0
                ? Math.round(
                    (metrics.successCount / metrics.totalProcessed) * 100,
                  )
                : 0,
            active_workers: metrics.activeWorkers,
            queue_depth: metrics.queueDepth,
            last_processed: metrics.lastProcessed,
            average_processing_time: metrics.averageProcessingTime,
          },
        },
      };
    } catch (error) {
      return {
        initialized: this.initialized,
        components: {
          executor: false,
          queue_processor: false,
          error_recovery: false,
        },
        health: {
          queue_status: null,
          metrics: null,
        },
      };
    }
  }

  /**
   * Force restart the journey engine
   */
  static async restart(): Promise<void> {
    console.log('🔄 Restarting Journey Execution Engine...');

    try {
      await this.shutdown();
      this.initializationPromise = null;
      await this.initialize();
      console.log('✅ Journey Execution Engine restarted successfully');
    } catch (error) {
      console.error('❌ Error during restart:', error);
      throw error;
    }
  }

  /**
   * Auto-initialize on import if in production
   */
  static autoInitialize(): void {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.AUTO_START_JOURNEY_ENGINE === 'true'
    ) {
      setImmediate(async () => {
        try {
          await this.initialize();
        } catch (error) {
          console.error('Auto-initialization failed:', error);
          // Could trigger alerts here
        }
      });
    }
  }
}

// Auto-initialize in production
JourneyEngineStartup.autoInitialize();

// Export for manual control
export const journeyEngineStartup = JourneyEngineStartup;

// Process cleanup handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down journey engine gracefully...');
    await JourneyEngineStartup.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down journey engine gracefully...');
    await JourneyEngineStartup.shutdown();
    process.exit(0);
  });
}
