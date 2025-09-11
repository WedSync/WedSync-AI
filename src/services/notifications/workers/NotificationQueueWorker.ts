import { Worker, Job, WorkerOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { NotificationProviderFactory } from '../providers';
import { WeddingNotificationIntelligence } from '../WeddingNotificationIntelligence';
import type {
  ProcessedNotification,
  NotificationDeliveryResult,
  NotificationChannelProvider,
} from '../../../types/notification-backend';

interface QueueJobData {
  notification: ProcessedNotification;
  channel: string;
  attempt: number;
  maxRetries: number;
  retryDelay: number;
}

interface WorkerMetrics {
  processed: number;
  failed: number;
  retries: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
  errors: Array<{ timestamp: Date; error: string; jobId: string }>;
}

export class NotificationQueueWorker {
  private workers: Map<string, Worker> = new Map();
  private redis: Redis;
  private intelligence: WeddingNotificationIntelligence;
  private metrics: Map<string, WorkerMetrics> = new Map();
  private isShuttingDown = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });

    this.intelligence = new WeddingNotificationIntelligence();
    this.initializeHealthCheck();
  }

  async startWorkers(): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Cannot start workers during shutdown');
    }

    try {
      await this.redis.connect();

      // Start workers for each notification channel
      const channels = ['email', 'sms', 'push', 'voice', 'webhook', 'in_app'];

      await Promise.all(
        channels.map((channel) => this.startChannelWorker(channel)),
      );

      // Start specialized workers
      await this.startEmergencyWorker();
      await this.startBatchWorker();
      await this.startRetryWorker();
      await this.startDeadLetterWorker();

      console.log('🚀 All notification workers started successfully');
    } catch (error) {
      console.error('❌ Failed to start notification workers:', error);
      throw error;
    }
  }

  private async startChannelWorker(channel: string): Promise<void> {
    const queueName = `notifications:${channel}`;

    const workerOptions: WorkerOptions = {
      connection: this.redis,
      concurrency: this.getWorkerConcurrency(channel),
      removeOnComplete: 100, // Keep last 100 successful jobs
      removeOnFail: 50, // Keep last 50 failed jobs
      stalledInterval: 30000, // 30 seconds
      maxStalledCount: 3,
    };

    const worker = new Worker(
      queueName,
      async (job: Job<QueueJobData>) => {
        return await this.processNotificationJob(job, channel);
      },
      workerOptions,
    );

    // Set up event listeners
    this.setupWorkerEventListeners(worker, channel);

    this.workers.set(channel, worker);
    this.initializeMetrics(channel);

    console.log(
      `✅ Started ${channel} notification worker with ${workerOptions.concurrency} concurrency`,
    );
  }

  private async startEmergencyWorker(): Promise<void> {
    const queueName = 'notifications:emergency';

    const worker = new Worker(
      queueName,
      async (job: Job<QueueJobData>) => {
        return await this.processEmergencyNotification(job);
      },
      {
        connection: this.redis,
        concurrency: 20, // High concurrency for emergencies
        removeOnComplete: 200,
        removeOnFail: 100,
        stalledInterval: 10000, // 10 seconds for emergency
        maxStalledCount: 2,
      },
    );

    this.setupWorkerEventListeners(worker, 'emergency');
    this.workers.set('emergency', worker);
    this.initializeMetrics('emergency');

    console.log('🚨 Started emergency notification worker');
  }

  private async startBatchWorker(): Promise<void> {
    const queueName = 'notifications:batch';

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        return await this.processBatchNotifications(job);
      },
      {
        connection: this.redis,
        concurrency: 5, // Lower concurrency for batch processing
        removeOnComplete: 50,
        removeOnFail: 25,
      },
    );

    this.setupWorkerEventListeners(worker, 'batch');
    this.workers.set('batch', worker);
    this.initializeMetrics('batch');

    console.log('📦 Started batch notification worker');
  }

  private async startRetryWorker(): Promise<void> {
    const queueName = 'notifications:retry';

    const worker = new Worker(
      queueName,
      async (job: Job<QueueJobData>) => {
        return await this.processRetryNotification(job);
      },
      {
        connection: this.redis,
        concurrency: 10,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    this.setupWorkerEventListeners(worker, 'retry');
    this.workers.set('retry', worker);
    this.initializeMetrics('retry');

    console.log('🔄 Started retry notification worker');
  }

  private async startDeadLetterWorker(): Promise<void> {
    const queueName = 'notifications:dead_letter';

    const worker = new Worker(
      queueName,
      async (job: Job<QueueJobData>) => {
        return await this.processDeadLetterNotification(job);
      },
      {
        connection: this.redis,
        concurrency: 2, // Low concurrency for dead letter processing
        removeOnComplete: 1000, // Keep more dead letter records
        removeOnFail: 500,
      },
    );

    this.setupWorkerEventListeners(worker, 'dead_letter');
    this.workers.set('dead_letter', worker);
    this.initializeMetrics('dead_letter');

    console.log('💀 Started dead letter notification worker');
  }

  private async processNotificationJob(
    job: Job<QueueJobData>,
    channel: string,
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();
    const { notification, attempt, maxRetries } = job.data;

    try {
      // Update job progress
      await job.updateProgress(10);

      // Get the appropriate provider
      const provider = NotificationProviderFactory.getProvider(channel as any);
      await job.updateProgress(20);

      // Apply wedding intelligence for context enrichment
      const enrichedNotification =
        await this.intelligence.enrichNotificationContext(notification);
      await job.updateProgress(40);

      // Send the notification
      const result = await provider.send(enrichedNotification);
      await job.updateProgress(90);

      // Update metrics
      this.updateMetrics(channel, true, Date.now() - startTime);

      // If successful, update analytics
      if (result.success) {
        await this.recordSuccessfulDelivery(
          enrichedNotification,
          result,
          channel,
        );
        await job.updateProgress(100);
        return result;
      } else {
        // Handle delivery failure
        if (attempt < maxRetries) {
          await this.scheduleRetry(
            enrichedNotification,
            channel,
            attempt + 1,
            result.error,
          );
        } else {
          await this.moveToDeadLetter(
            enrichedNotification,
            channel,
            result.error,
          );
        }

        this.updateMetrics(
          channel,
          false,
          Date.now() - startTime,
          result.error,
        );
        throw new Error(result.error || 'Notification delivery failed');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.updateMetrics(channel, false, Date.now() - startTime, errorMessage);

      // Schedule retry if we haven't exceeded max attempts
      if (attempt < maxRetries) {
        await this.scheduleRetry(
          notification,
          channel,
          attempt + 1,
          errorMessage,
        );
      } else {
        await this.moveToDeadLetter(notification, channel, errorMessage);
      }

      throw error;
    }
  }

  private async processEmergencyNotification(
    job: Job<QueueJobData>,
  ): Promise<NotificationDeliveryResult[]> {
    const { notification } = job.data;
    const results: NotificationDeliveryResult[] = [];

    try {
      // For emergency notifications, send to ALL available channels simultaneously
      const emergencyChannels = ['voice', 'sms', 'push', 'in_app'];

      await job.updateProgress(10);

      // Send to all channels in parallel
      const promises = emergencyChannels.map(async (channel) => {
        try {
          const provider = NotificationProviderFactory.getProvider(
            channel as any,
          );
          return await provider.send(notification);
        } catch (error) {
          return {
            success: false,
            channel,
            providerId: 'unknown',
            recipientId: notification.recipientId,
            messageId: '',
            timestamp: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          } as NotificationDeliveryResult;
        }
      });

      const channelResults = await Promise.allSettled(promises);

      channelResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            channel: emergencyChannels[index],
            providerId: 'unknown',
            recipientId: notification.recipientId,
            messageId: '',
            timestamp: new Date(),
            error: result.reason?.message || 'Channel failed',
          });
        }
      });

      await job.updateProgress(90);

      // Record emergency delivery attempts
      await this.recordEmergencyDelivery(notification, results);

      await job.updateProgress(100);

      // If at least one channel succeeded, consider it successful
      const hasSuccess = results.some((r) => r.success);
      if (!hasSuccess) {
        throw new Error('All emergency channels failed');
      }

      return results;
    } catch (error) {
      console.error('Emergency notification processing failed:', error);
      throw error;
    }
  }

  private async processBatchNotifications(job: Job): Promise<void> {
    const { notifications, channel } = job.data;
    const batchSize = 50; // Process in chunks

    try {
      const chunks = this.chunkArray(notifications, batchSize);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const progress = Math.floor(((i + 1) / chunks.length) * 100);

        // Process chunk in parallel
        await Promise.allSettled(
          chunk.map((notification: ProcessedNotification) =>
            this.processNotificationJob(
              {
                data: {
                  notification,
                  channel,
                  attempt: 1,
                  maxRetries: 3,
                  retryDelay: 1000,
                },
              } as Job<QueueJobData>,
              channel,
            ),
          ),
        );

        await job.updateProgress(progress);

        // Small delay between chunks to prevent overwhelming
        await this.sleep(100);
      }
    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    }
  }

  private async processRetryNotification(
    job: Job<QueueJobData>,
  ): Promise<NotificationDeliveryResult> {
    const { notification, channel, attempt } = job.data;

    // Add exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 60000); // Max 1 minute
    await this.sleep(delay);

    // Process as normal notification but with updated attempt count
    return await this.processNotificationJob(job, channel);
  }

  private async processDeadLetterNotification(
    job: Job<QueueJobData>,
  ): Promise<void> {
    const { notification, channel } = job.data;

    try {
      // Log to dead letter table for manual investigation
      await this.recordDeadLetter(
        notification,
        channel,
        job.failedReason || 'Max retries exceeded',
      );

      // For emergency notifications, escalate to manual intervention
      if (notification.priority === 'emergency') {
        await this.escalateEmergencyFailure(notification, channel);
      }

      console.log(
        `📝 Dead letter recorded for ${channel} notification: ${notification.id}`,
      );
    } catch (error) {
      console.error('Failed to process dead letter notification:', error);
      throw error;
    }
  }

  private setupWorkerEventListeners(worker: Worker, channel: string): void {
    worker.on('completed', (job) => {
      console.log(`✅ ${channel} job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ ${channel} job ${job?.id} failed:`, err.message);
      this.recordError(channel, err.message, job?.id || 'unknown');
    });

    worker.on('stalled', (jobId) => {
      console.warn(`⚠️ ${channel} job ${jobId} stalled`);
    });

    worker.on('error', (err) => {
      console.error(`💥 ${channel} worker error:`, err);
    });
  }

  private getWorkerConcurrency(channel: string): number {
    const concurrencyMap: Record<string, number> = {
      email: 10,
      sms: 15,
      push: 20,
      voice: 5, // Lower for voice due to cost
      webhook: 8,
      in_app: 25,
    };

    return concurrencyMap[channel] || 10;
  }

  private initializeMetrics(channel: string): void {
    this.metrics.set(channel, {
      processed: 0,
      failed: 0,
      retries: 0,
      averageProcessingTime: 0,
      errors: [],
    });
  }

  private updateMetrics(
    channel: string,
    success: boolean,
    processingTime: number,
    error?: string,
  ): void {
    const metrics = this.metrics.get(channel);
    if (!metrics) return;

    if (success) {
      metrics.processed++;
    } else {
      metrics.failed++;
      if (error) {
        this.recordError(channel, error, 'unknown');
      }
    }

    // Update average processing time
    metrics.averageProcessingTime =
      (metrics.averageProcessingTime + processingTime) /
      (metrics.processed + metrics.failed);

    metrics.lastProcessedAt = new Date();
    this.metrics.set(channel, metrics);
  }

  private recordError(channel: string, error: string, jobId: string): void {
    const metrics = this.metrics.get(channel);
    if (!metrics) return;

    metrics.errors.push({
      timestamp: new Date(),
      error,
      jobId,
    });

    // Keep only last 50 errors
    if (metrics.errors.length > 50) {
      metrics.errors = metrics.errors.slice(-50);
    }
  }

  private async scheduleRetry(
    notification: ProcessedNotification,
    channel: string,
    attempt: number,
    error?: string,
  ): Promise<void> {
    // Exponential backoff with jitter
    const baseDelay = 1000 * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, 300000); // Max 5 minutes

    console.log(
      `🔄 Scheduling retry ${attempt} for ${channel} notification in ${delay}ms`,
    );

    // Add to retry queue with delay
    await this.redis.zadd(
      'notifications:retry:scheduled',
      Date.now() + delay,
      JSON.stringify({
        notification,
        channel,
        attempt,
        maxRetries: 5,
        error,
      }),
    );

    const metrics = this.metrics.get(channel);
    if (metrics) {
      metrics.retries++;
    }
  }

  private async moveToDeadLetter(
    notification: ProcessedNotification,
    channel: string,
    error?: string,
  ): Promise<void> {
    await this.redis.lpush(
      'notifications:dead_letter',
      JSON.stringify({
        notification,
        channel,
        error,
        timestamp: new Date().toISOString(),
        attempts: 5,
      }),
    );

    console.log(
      `💀 Moved ${channel} notification to dead letter queue: ${error}`,
    );
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Placeholder methods for database operations
  private async recordSuccessfulDelivery(
    notification: ProcessedNotification,
    result: NotificationDeliveryResult,
    channel: string,
  ): Promise<void> {
    // Would implement database logging here
    console.log(
      `📊 Recording successful delivery: ${channel} - ${result.messageId}`,
    );
  }

  private async recordEmergencyDelivery(
    notification: ProcessedNotification,
    results: NotificationDeliveryResult[],
  ): Promise<void> {
    // Would implement emergency delivery logging here
    console.log(
      `🚨 Recording emergency delivery attempts: ${results.length} channels`,
    );
  }

  private async recordDeadLetter(
    notification: ProcessedNotification,
    channel: string,
    reason: string,
  ): Promise<void> {
    // Would implement dead letter logging here
    console.log(`💀 Recording dead letter: ${channel} - ${reason}`);
  }

  private async escalateEmergencyFailure(
    notification: ProcessedNotification,
    channel: string,
  ): Promise<void> {
    // Would implement emergency escalation (alerts, webhooks, etc.)
    console.log(
      `🚨🚨 ESCALATING EMERGENCY FAILURE: ${channel} for wedding ${notification.event.weddingId}`,
    );
  }

  private initializeHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check Redis connection
      await this.redis.ping();

      // Check each worker
      for (const [channel, worker] of this.workers.entries()) {
        if (!worker.isRunning()) {
          console.warn(
            `⚠️ ${channel} worker is not running, attempting restart`,
          );
          // Could implement automatic restart logic here
        }
      }

      // Check metrics for anomalies
      this.checkMetricsForAnomalies();
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  private checkMetricsForAnomalies(): void {
    for (const [channel, metrics] of this.metrics.entries()) {
      const errorRate =
        metrics.failed / (metrics.processed + metrics.failed) || 0;

      if (errorRate > 0.1) {
        // More than 10% error rate
        console.warn(
          `⚠️ High error rate detected for ${channel}: ${(errorRate * 100).toFixed(1)}%`,
        );
      }

      if (metrics.averageProcessingTime > 10000) {
        // More than 10 seconds
        console.warn(
          `⚠️ Slow processing detected for ${channel}: ${metrics.averageProcessingTime}ms avg`,
        );
      }
    }
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down notification workers...');
    this.isShuttingDown = true;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Close all workers gracefully
    const shutdownPromises = Array.from(this.workers.values()).map((worker) =>
      worker.close(),
    );

    await Promise.allSettled(shutdownPromises);

    // Close Redis connection
    await this.redis.quit();

    console.log('✅ All notification workers shut down gracefully');
  }

  getMetrics(): Map<string, WorkerMetrics> {
    return new Map(this.metrics);
  }

  getWorkerStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [channel, worker] of this.workers.entries()) {
      status[channel] = worker.isRunning();
    }
    return status;
  }
}
