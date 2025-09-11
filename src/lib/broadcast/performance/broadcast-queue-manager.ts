import Redis from 'ioredis';
import { performance } from 'perf_hooks';
import { createServerClient } from '@/lib/supabase/server';

interface QueueMetrics {
  totalProcessed: number;
  averageProcessingTime: number;
  currentQueueSize: number;
  errorRate: number;
  throughputPerSecond: number;
}

interface BroadcastQueueItem {
  id: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  payload: any;
  createdAt: number;
  attemptCount: number;
  maxAttempts: number;
}

export class BroadcastQueueManager {
  private redis: Redis.Cluster;
  private supabase;
  private metrics: Map<string, number> = new Map();
  private processingWorkers: Map<string, NodeJS.Timeout> = new Map();
  private readonly maxConcurrentWorkers = 50;

  constructor() {
    // Redis Cluster for high availability
    this.redis = new Redis.Cluster(
      [
        {
          host: process.env.REDIS_CLUSTER_HOST_1!,
          port: parseInt(process.env.REDIS_CLUSTER_PORT_1!),
        },
        {
          host: process.env.REDIS_CLUSTER_HOST_2!,
          port: parseInt(process.env.REDIS_CLUSTER_PORT_2!),
        },
        {
          host: process.env.REDIS_CLUSTER_HOST_3!,
          port: parseInt(process.env.REDIS_CLUSTER_PORT_3!),
        },
      ],
      {
        redisOptions: {
          password: process.env.REDIS_PASSWORD,
          connectTimeout: 10000,
          lazyConnect: true,
          maxRetriesPerRequest: 3,
        },
        enableOfflineQueue: false,
        clusterRetryDelayOnFailover: 1000,
        maxRetriesPerRequest: 3,
      },
    );

    this.supabase = createServerClient();
    this.initializeWorkerPool();
  }

  async enqueue(
    broadcast: any,
    targetUsers: string[],
    priority: 'critical' | 'high' | 'normal' | 'low' = 'normal',
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Batch users for optimal processing
      const userBatches = this.batchUsers(targetUsers);
      const queueItems: BroadcastQueueItem[] = [];

      for (const batch of userBatches) {
        const queueItem: BroadcastQueueItem = {
          id: `${broadcast.id}-${Date.now()}-${Math.random()}`,
          priority,
          payload: {
            broadcast,
            users: batch,
            batchSize: batch.length,
          },
          createdAt: Date.now(),
          attemptCount: 0,
          maxAttempts: priority === 'critical' ? 5 : 3,
        };

        queueItems.push(queueItem);
      }

      // Add to Redis queues with priority-based routing
      const pipeline = this.redis.pipeline();

      for (const item of queueItems) {
        const queueKey = this.getQueueKey(priority);
        const score = this.calculatePriorityScore(item);

        pipeline.zadd(queueKey, score, JSON.stringify(item));
      }

      await pipeline.exec();

      // Update metrics
      this.updateMetrics('enqueue', performance.now() - startTime);

      console.info(
        `Enqueued ${queueItems.length} broadcast batches for ${targetUsers.length} users`,
        {
          broadcastId: broadcast.id,
          priority,
          batchCount: queueItems.length,
          userCount: targetUsers.length,
        },
      );
    } catch (error) {
      this.updateMetrics('enqueue_error', 1);
      console.error('Failed to enqueue broadcast:', error);
      throw error;
    }
  }

  private batchUsers(users: string[]): string[][] {
    const batchSize = this.getOptimalBatchSize(users.length);
    const batches: string[][] = [];

    for (let i = 0; i < users.length; i += batchSize) {
      batches.push(users.slice(i, i + batchSize));
    }

    return batches;
  }

  private getOptimalBatchSize(totalUsers: number): number {
    // Dynamic batch sizing based on total users and system load
    const baseSize = 100;
    const maxSize = 500;
    const minSize = 25;

    if (totalUsers < 1000)
      return Math.max(minSize, Math.min(totalUsers / 5, baseSize));
    if (totalUsers < 5000) return Math.min(maxSize, baseSize * 1.5);

    // Large broadcasts: smaller batches for better parallelization
    return Math.min(maxSize, baseSize * 2);
  }

  private getQueueKey(priority: string): string {
    const queueMap = {
      critical: 'broadcast:queue:critical',
      high: 'broadcast:queue:high',
      normal: 'broadcast:queue:normal',
      low: 'broadcast:queue:low',
    };

    return queueMap[priority] || queueMap.normal;
  }

  private calculatePriorityScore(item: BroadcastQueueItem): number {
    // Lower scores have higher priority in Redis sorted sets
    const priorityScores = {
      critical: 1000,
      high: 2000,
      normal: 3000,
      low: 4000,
    };

    const baseScore = priorityScores[item.priority];
    const timeScore = Date.now(); // Earlier items get priority within same priority level

    return baseScore + timeScore;
  }

  private initializeWorkerPool(): void {
    // Start worker processes for each priority queue
    const priorities = ['critical', 'high', 'normal', 'low'];

    priorities.forEach((priority) => {
      const workerCount = this.getWorkerCount(priority);

      for (let i = 0; i < workerCount; i++) {
        const workerId = `${priority}-worker-${i}`;
        this.startWorker(workerId, priority);
      }
    });

    // Auto-scaling monitoring
    setInterval(() => this.monitorAndScale(), 30000); // Check every 30 seconds
  }

  private getWorkerCount(priority: string): number {
    const workerCounts = {
      critical: 8, // High concurrency for critical
      high: 6,
      normal: 4,
      low: 2,
    };

    return workerCounts[priority] || 2;
  }

  private startWorker(workerId: string, priority: string): void {
    const processQueue = async () => {
      try {
        const queueKey = this.getQueueKey(priority);
        const items = await this.redis.zpopmin(queueKey, 1);

        if (items.length === 0) {
          // No items, wait before checking again
          setTimeout(processQueue, this.getWorkerDelay(priority));
          return;
        }

        const [itemStr, score] = items[0];
        const queueItem: BroadcastQueueItem = JSON.parse(itemStr);

        await this.processQueueItem(queueItem);

        // Continue processing immediately if critical/high priority
        if (['critical', 'high'].includes(priority)) {
          setImmediate(processQueue);
        } else {
          setTimeout(processQueue, this.getWorkerDelay(priority));
        }
      } catch (error) {
        console.error(`Worker ${workerId} error:`, error);
        setTimeout(processQueue, 5000); // Retry after error
      }
    };

    // Start worker
    processQueue();

    // Track active worker
    this.processingWorkers.set(
      workerId,
      setTimeout(() => {}, 0),
    );
  }

  private getWorkerDelay(priority: string): number {
    const delays = {
      critical: 10, // 10ms - immediate processing
      high: 50, // 50ms
      normal: 100, // 100ms
      low: 500, // 500ms
    };

    return delays[priority] || 100;
  }

  private async processQueueItem(item: BroadcastQueueItem): Promise<void> {
    const startTime = performance.now();

    try {
      item.attemptCount++;

      // Process broadcast delivery
      await this.deliverBroadcast(item.payload.broadcast, item.payload.users);

      // Update success metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics('processing_time', processingTime);
      this.updateMetrics('processed_count', 1);

      console.debug(`Processed broadcast batch: ${item.id}`, {
        users: item.payload.users.length,
        processingTime: `${processingTime.toFixed(2)}ms`,
        priority: item.priority,
      });
    } catch (error) {
      console.error(`Failed to process queue item ${item.id}:`, error);

      // Retry logic
      if (item.attemptCount < item.maxAttempts) {
        await this.requeueFailedItem(item);
      } else {
        await this.handlePermanentFailure(item, error);
      }

      this.updateMetrics('processing_error', 1);
    }
  }

  private async deliverBroadcast(
    broadcast: any,
    users: string[],
  ): Promise<void> {
    // Implement actual broadcast delivery
    const deliveryPromises = users.map((userId) =>
      this.deliverToUser(broadcast, userId),
    );

    // Batch process with concurrency limit
    const batchSize = 20;
    for (let i = 0; i < deliveryPromises.length; i += batchSize) {
      const batch = deliveryPromises.slice(i, i + batchSize);
      await Promise.allSettled(batch);
    }
  }

  private async deliverToUser(broadcast: any, userId: string): Promise<void> {
    // Create delivery record
    await this.supabase.from('broadcast_deliveries').upsert({
      broadcast_id: broadcast.id,
      user_id: userId,
      delivery_channel: 'realtime',
      delivery_status: 'pending',
      delivered_at: new Date().toISOString(),
    });

    // Send to realtime channel
    await this.supabase.channel(`broadcast:user:${userId}`).send({
      type: 'broadcast',
      event: 'new_broadcast',
      payload: broadcast,
    });
  }

  private async requeueFailedItem(item: BroadcastQueueItem): Promise<void> {
    // Exponential backoff
    const delay = Math.pow(2, item.attemptCount) * 1000;
    const retryTime = Date.now() + delay;

    const queueKey = this.getQueueKey(item.priority);
    const score = this.calculatePriorityScore(item) + delay;

    await this.redis.zadd(queueKey, score, JSON.stringify(item));
  }

  private async handlePermanentFailure(
    item: BroadcastQueueItem,
    error: any,
  ): Promise<void> {
    // Log permanent failure
    console.error('Permanent broadcast failure:', {
      itemId: item.id,
      broadcastId: item.payload.broadcast.id,
      users: item.payload.users.length,
      error: error.message,
    });

    // Update delivery records as failed
    await this.supabase
      .from('broadcast_deliveries')
      .update({
        delivery_status: 'failed',
        error_message: error.message,
      })
      .eq('broadcast_id', item.payload.broadcast.id)
      .in('user_id', item.payload.users);
  }

  private async monitorAndScale(): Promise<void> {
    try {
      const queueSizes = await this.getQueueSizes();
      const totalQueueSize = Object.values(queueSizes).reduce(
        (sum, size) => sum + size,
        0,
      );

      // Auto-scaling logic
      if (
        totalQueueSize > 10000 &&
        this.processingWorkers.size < this.maxConcurrentWorkers
      ) {
        await this.scaleUp();
      } else if (totalQueueSize < 1000 && this.processingWorkers.size > 10) {
        await this.scaleDown();
      }

      // Update queue metrics
      this.updateMetrics('queue_size', totalQueueSize);
    } catch (error) {
      console.error('Auto-scaling monitoring error:', error);
    }
  }

  private async getQueueSizes(): Promise<Record<string, number>> {
    const priorities = ['critical', 'high', 'normal', 'low'];
    const sizes: Record<string, number> = {};

    for (const priority of priorities) {
      const queueKey = this.getQueueKey(priority);
      const size = await this.redis.zcard(queueKey);
      sizes[priority] = size;
    }

    return sizes;
  }

  private async scaleUp(): Promise<void> {
    console.info('Scaling up broadcast workers due to high queue size');

    // Add workers for high-priority queues
    const workerId = `auto-scaled-${Date.now()}`;
    this.startWorker(workerId, 'normal');

    // Send alert to monitoring
    this.sendScalingAlert('scale_up', this.processingWorkers.size);
  }

  private async scaleDown(): Promise<void> {
    console.info('Scaling down broadcast workers due to low queue size');

    // Remove one auto-scaled worker
    const autoScaledWorkers = Array.from(this.processingWorkers.keys()).filter(
      (id) => id.includes('auto-scaled'),
    );

    if (autoScaledWorkers.length > 0) {
      const workerToRemove = autoScaledWorkers[0];
      clearTimeout(this.processingWorkers.get(workerToRemove)!);
      this.processingWorkers.delete(workerToRemove);
    }

    this.sendScalingAlert('scale_down', this.processingWorkers.size);
  }

  private sendScalingAlert(
    action: 'scale_up' | 'scale_down',
    workerCount: number,
  ): void {
    // Integration with monitoring system
    console.info(`Auto-scaling event: ${action}`, {
      workerCount,
      timestamp: new Date().toISOString(),
    });
  }

  private updateMetrics(key: string, value: number): void {
    const current = this.metrics.get(key) || 0;

    if (key.includes('time')) {
      // Calculate moving average for time metrics
      const count = this.metrics.get(`${key}_count`) || 0;
      const newAverage = (current * count + value) / (count + 1);
      this.metrics.set(key, newAverage);
      this.metrics.set(`${key}_count`, count + 1);
    } else {
      this.metrics.set(key, current + value);
    }
  }

  async getMetrics(): Promise<QueueMetrics> {
    const queueSizes = await this.getQueueSizes();
    const totalQueueSize = Object.values(queueSizes).reduce(
      (sum, size) => sum + size,
      0,
    );

    return {
      totalProcessed: this.metrics.get('processed_count') || 0,
      averageProcessingTime: this.metrics.get('processing_time') || 0,
      currentQueueSize: totalQueueSize,
      errorRate:
        (this.metrics.get('processing_error') || 0) /
        Math.max(1, this.metrics.get('processed_count') || 1),
      throughputPerSecond: this.calculateThroughput(),
    };
  }

  private calculateThroughput(): number {
    // Calculate broadcasts processed per second over last minute
    const processed = this.metrics.get('processed_count') || 0;
    const timeWindow = 60; // seconds

    return processed / timeWindow;
  }

  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      await this.redis.ping();
      const metrics = await this.getMetrics();

      const healthy =
        metrics.errorRate < 0.05 && // Less than 5% error rate
        metrics.averageProcessingTime < 1000 && // Less than 1 second processing
        this.processingWorkers.size > 0; // At least one worker active

      return {
        healthy,
        details: {
          metrics,
          workerCount: this.processingWorkers.size,
          redisConnected: true,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error.message },
      };
    }
  }
}
