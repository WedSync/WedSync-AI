import { NotificationQueueWorker } from './NotificationQueueWorker';
import { NotificationAnalyticsWorker } from './NotificationAnalyticsWorker';
import { WeddingNotificationEngine } from '../WeddingNotificationEngine';
import { NotificationChannelRouter } from '../NotificationChannelRouter';
import { WeddingNotificationEventProcessor } from '../WeddingNotificationEventProcessor';
import { Redis } from 'ioredis';
import type {
  ProcessedNotification,
  NotificationDeliveryResult,
} from '../../../types/notification-backend';

interface WorkerHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'starting' | 'stopping';
  uptime: number;
  lastError?: string;
  metrics?: Record<string, any>;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical' | 'down';
  workers: WorkerHealth[];
  redis: boolean;
  queues: Record<
    string,
    {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    }
  >;
  lastHealthCheck: Date;
}

interface WorkerMetrics {
  totalProcessed: number;
  totalFailed: number;
  averageLatency: number;
  errorRate: number;
  throughput: number; // per minute
  memoryUsage: number;
  cpuUsage: number;
}

export class NotificationWorkerCoordinator {
  private queueWorker: NotificationQueueWorker;
  private analyticsWorker: NotificationAnalyticsWorker;
  private notificationEngine: WeddingNotificationEngine;
  private channelRouter: NotificationChannelRouter;
  private eventProcessor: WeddingNotificationEventProcessor;
  private redis: Redis;

  private startTime = new Date();
  private isRunning = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsCollectionInterval?: NodeJS.Timeout;
  private shutdownPromise?: Promise<void>;
  private lastHealthCheck?: Date;

  constructor() {
    this.queueWorker = new NotificationQueueWorker();
    this.analyticsWorker = new NotificationAnalyticsWorker();
    this.notificationEngine = new WeddingNotificationEngine();
    this.channelRouter = new NotificationChannelRouter();
    this.eventProcessor = new WeddingNotificationEventProcessor();

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    // Handle process signals for graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGQUIT', () => this.shutdown());

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception in notification system:', error);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(
        'Unhandled rejection in notification system:',
        reason,
        promise,
      );
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Notification worker coordinator is already running');
    }

    console.log('🚀 Starting WedSync Notification System...');
    this.startTime = new Date();

    try {
      // Connect to Redis first
      await this.redis.connect();
      console.log('✅ Connected to Redis');

      // Start core notification engine
      await this.notificationEngine.initialize();
      console.log('✅ Notification Engine initialized');

      // Start channel router
      await this.channelRouter.initialize();
      console.log('✅ Channel Router initialized');

      // Start event processor
      await this.eventProcessor.start();
      console.log('✅ Event Processor started');

      // Start queue workers
      await this.queueWorker.startWorkers();
      console.log('✅ Queue Workers started');

      // Start analytics worker
      await this.analyticsWorker.start();
      console.log('✅ Analytics Worker started');

      // Initialize monitoring
      this.startHealthChecks();
      this.startMetricsCollection();

      this.isRunning = true;

      console.log('🎉 WedSync Notification System fully operational!');
      console.log(`📊 System started at: ${this.startTime.toISOString()}`);

      // Log initial system status
      const health = await this.getSystemHealth();
      console.log('🏥 Initial system health:', health.overall);
    } catch (error) {
      console.error('❌ Failed to start notification system:', error);
      await this.cleanup();
      throw error;
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        this.lastHealthCheck = new Date();

        // Log health status changes
        if (health.overall !== 'healthy') {
          console.warn(`⚠️ System health degraded: ${health.overall}`);
          console.warn(
            'Unhealthy workers:',
            health.workers.filter((w) => w.status !== 'healthy'),
          );
        }

        // Auto-recovery for unhealthy workers
        await this.attemptAutoRecovery(health);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();

        // Store metrics in Redis for dashboard
        await this.redis.hset('system:metrics', {
          timestamp: new Date().toISOString(),
          ...metrics,
        });

        // Alert on critical metrics
        if (metrics.errorRate > 0.1) {
          // > 10% error rate
          console.warn(
            `🚨 High error rate detected: ${(metrics.errorRate * 100).toFixed(1)}%`,
          );
        }

        if (metrics.averageLatency > 5000) {
          // > 5 seconds
          console.warn(`🐌 High latency detected: ${metrics.averageLatency}ms`);
        }
      } catch (error) {
        console.error('Metrics collection failed:', error);
      }
    }, 60000); // Every minute
  }

  private async attemptAutoRecovery(health: SystemHealth): Promise<void> {
    for (const worker of health.workers) {
      if (worker.status === 'unhealthy') {
        console.log(`🔄 Attempting auto-recovery for ${worker.name}`);

        try {
          switch (worker.name) {
            case 'queue':
              // Restart individual queue workers if needed
              console.log('🔄 Queue worker recovery not implemented yet');
              break;
            case 'analytics':
              // Restart analytics worker
              console.log('🔄 Analytics worker recovery not implemented yet');
              break;
            case 'event_processor':
              // Restart event processor
              console.log('🔄 Event processor recovery not implemented yet');
              break;
          }
        } catch (error) {
          console.error(`❌ Auto-recovery failed for ${worker.name}:`, error);
        }
      }
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const workers: WorkerHealth[] = [];

    try {
      // Check queue worker
      const queueStatus = this.queueWorker.getWorkerStatus();
      const queueMetrics = this.queueWorker.getMetrics();

      workers.push({
        name: 'queue',
        status: Object.values(queueStatus).every(Boolean)
          ? 'healthy'
          : 'unhealthy',
        uptime: Date.now() - this.startTime.getTime(),
        metrics: {
          channels: Object.keys(queueStatus).length,
          activeChannels: Object.values(queueStatus).filter(Boolean).length,
          totalProcessed: Array.from(queueMetrics.values()).reduce(
            (sum, m) => sum + m.processed,
            0,
          ),
          totalFailed: Array.from(queueMetrics.values()).reduce(
            (sum, m) => sum + m.failed,
            0,
          ),
        },
      });

      // Check analytics worker
      workers.push({
        name: 'analytics',
        status: this.analyticsWorker.isHealthy() ? 'healthy' : 'unhealthy',
        uptime: Date.now() - this.startTime.getTime(),
      });

      // Check event processor
      const eventProcessorHealth = await this.eventProcessor.getHealthStatus();
      workers.push({
        name: 'event_processor',
        status: eventProcessorHealth.healthy ? 'healthy' : 'unhealthy',
        uptime: Date.now() - this.startTime.getTime(),
        lastError: eventProcessorHealth.lastError,
        metrics: {
          eventsProcessed: eventProcessorHealth.eventsProcessed,
          avgProcessingTime: eventProcessorHealth.avgProcessingTime,
        },
      });

      // Check Redis
      let redisHealthy = false;
      try {
        await this.redis.ping();
        redisHealthy = true;
      } catch (error) {
        console.error('Redis health check failed:', error);
      }

      // Get queue statistics
      const queues = await this.getQueueStatistics();

      // Determine overall health
      const unhealthyWorkers = workers.filter((w) => w.status !== 'healthy');
      let overall: 'healthy' | 'degraded' | 'critical' | 'down' = 'healthy';

      if (!redisHealthy) {
        overall = 'critical';
      } else if (unhealthyWorkers.length > 0) {
        overall =
          unhealthyWorkers.length > workers.length / 2
            ? 'critical'
            : 'degraded';
      }

      return {
        overall,
        workers,
        redis: redisHealthy,
        queues,
        lastHealthCheck: new Date(),
      };
    } catch (error) {
      console.error('System health check failed:', error);
      return {
        overall: 'down',
        workers: [],
        redis: false,
        queues: {},
        lastHealthCheck: new Date(),
      };
    }
  }

  private async getQueueStatistics(): Promise<Record<string, any>> {
    const queues = [
      'notifications:email',
      'notifications:sms',
      'notifications:push',
      'notifications:voice',
      'notifications:webhook',
      'notifications:in_app',
      'notifications:emergency',
      'notifications:batch',
      'notifications:retry',
      'notifications:dead_letter',
    ];

    const stats: Record<string, any> = {};

    for (const queueName of queues) {
      try {
        const waiting = await this.redis.llen(`bull:${queueName}:wait`);
        const active = await this.redis.llen(`bull:${queueName}:active`);
        const completed = await this.redis.llen(`bull:${queueName}:completed`);
        const failed = await this.redis.llen(`bull:${queueName}:failed`);

        stats[queueName] = { waiting, active, completed, failed };
      } catch (error) {
        stats[queueName] = {
          waiting: -1,
          active: -1,
          completed: -1,
          failed: -1,
        };
      }
    }

    return stats;
  }

  private async collectMetrics(): Promise<WorkerMetrics> {
    try {
      const queueMetrics = this.queueWorker.getMetrics();
      const analyticsMetrics = await this.analyticsWorker.getMetrics();

      // Aggregate metrics across all workers
      const totalProcessed = Array.from(queueMetrics.values()).reduce(
        (sum, m) => sum + m.processed,
        0,
      );
      const totalFailed = Array.from(queueMetrics.values()).reduce(
        (sum, m) => sum + m.failed,
        0,
      );
      const averageLatency =
        Array.from(queueMetrics.values()).reduce(
          (sum, m) => sum + m.averageProcessingTime,
          0,
        ) / queueMetrics.size || 0;

      const errorRate = totalProcessed > 0 ? totalFailed / totalProcessed : 0;

      // Calculate throughput (jobs per minute)
      const uptimeMinutes = (Date.now() - this.startTime.getTime()) / 60000;
      const throughput = uptimeMinutes > 0 ? totalProcessed / uptimeMinutes : 0;

      // Get memory and CPU usage
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        totalProcessed,
        totalFailed,
        averageLatency,
        errorRate,
        throughput,
        memoryUsage: memoryUsage.rss / 1024 / 1024, // MB
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // seconds
      };
    } catch (error) {
      console.error('Failed to collect metrics:', error);
      return {
        totalProcessed: 0,
        totalFailed: 0,
        averageLatency: 0,
        errorRate: 0,
        throughput: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      };
    }
  }

  async sendNotification(
    notification: ProcessedNotification,
    options?: {
      priority?: 'emergency' | 'high' | 'medium' | 'low';
      channels?: string[];
      delay?: number;
    },
  ): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Notification system is not running');
    }

    try {
      // Use the notification engine to process and route the notification
      const result = await this.notificationEngine.processNotification(
        notification,
        {
          priority: options?.priority,
          preferredChannels: options?.channels,
          delay: options?.delay,
        },
      );

      return result.id;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  async getNotificationStatus(notificationId: string): Promise<{
    id: string;
    status: 'pending' | 'processing' | 'delivered' | 'failed' | 'retrying';
    attempts: number;
    lastAttempt?: Date;
    deliveryResults: NotificationDeliveryResult[];
  }> {
    // Get status from Redis cache
    const statusKey = `notification:${notificationId}:status`;
    const status = await this.redis.hgetall(statusKey);

    if (!status || Object.keys(status).length === 0) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    return {
      id: notificationId,
      status: status.status as any,
      attempts: parseInt(status.attempts || '0'),
      lastAttempt: status.lastAttempt
        ? new Date(status.lastAttempt)
        : undefined,
      deliveryResults: status.deliveryResults
        ? JSON.parse(status.deliveryResults)
        : [],
    };
  }

  async getSystemMetrics(): Promise<{
    health: SystemHealth;
    metrics: WorkerMetrics;
    uptime: number;
    version: string;
  }> {
    const [health, metrics] = await Promise.all([
      this.getSystemHealth(),
      this.collectMetrics(),
    ]);

    return {
      health,
      metrics,
      uptime: Date.now() - this.startTime.getTime(),
      version: '1.0.0', // Would be from package.json
    };
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up notification system resources...');

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    // Close Redis connection
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }

  async shutdown(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = this._performShutdown();
    return this.shutdownPromise;
  }

  private async _performShutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Gracefully shutting down WedSync Notification System...');
    this.isRunning = false;

    try {
      // Stop accepting new work first
      console.log('📋 Stopping new work acceptance...');

      // Shutdown workers in reverse order of startup
      const shutdownTasks = [
        {
          name: 'Analytics Worker',
          task: () => this.analyticsWorker.shutdown(),
        },
        { name: 'Queue Workers', task: () => this.queueWorker.shutdown() },
        { name: 'Event Processor', task: () => this.eventProcessor.stop() },
        { name: 'Channel Router', task: () => this.channelRouter.shutdown() },
        {
          name: 'Notification Engine',
          task: () => this.notificationEngine.shutdown(),
        },
      ];

      for (const { name, task } of shutdownTasks) {
        try {
          console.log(`🛑 Shutting down ${name}...`);
          await Promise.race([
            task(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Shutdown timeout')), 30000),
            ),
          ]);
          console.log(`✅ ${name} shut down successfully`);
        } catch (error) {
          console.error(`❌ Failed to shutdown ${name}:`, error);
        }
      }

      // Final cleanup
      await this.cleanup();

      console.log('✅ WedSync Notification System shut down gracefully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  // Utility method to check if system is ready
  isReady(): boolean {
    return this.isRunning;
  }

  // Get detailed worker information for debugging
  async getDetailedWorkerInfo(): Promise<Record<string, any>> {
    return {
      queueWorkers: {
        status: this.queueWorker.getWorkerStatus(),
        metrics: Object.fromEntries(this.queueWorker.getMetrics()),
      },
      analyticsWorker: {
        healthy: this.analyticsWorker.isHealthy(),
      },
      systemMetrics: await this.collectMetrics(),
      uptime: Date.now() - this.startTime.getTime(),
      lastHealthCheck: this.lastHealthCheck?.toISOString(),
    };
  }
}
