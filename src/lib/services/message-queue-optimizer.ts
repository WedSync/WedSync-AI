// WS-155: Message Queue Optimization Service
import { createClient } from '@/lib/supabase/server';
import { Redis } from 'ioredis';

interface QueueMessage {
  id: string;
  campaignId: string;
  recipientId: string;
  channel: 'email' | 'sms' | 'push';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  payload: any;
  scheduledFor?: Date;
  retryCount: number;
  metadata: Record<string, any>;
}

interface QueueMetrics {
  totalMessages: number;
  processingRate: number;
  averageLatency: number;
  successRate: number;
  errorRate: number;
  queueDepth: Record<string, number>;
}

export class MessageQueueOptimizer {
  private redis: Redis;
  private processingQueues: Map<string, any>;
  private metrics: QueueMetrics;
  private batchSize: number = 100;
  private maxConcurrency: number = 10;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    });

    this.processingQueues = new Map();
    this.metrics = {
      totalMessages: 0,
      processingRate: 0,
      averageLatency: 0,
      successRate: 0,
      errorRate: 0,
      queueDepth: {},
    };

    this.initializeQueues();
    this.startProcessing();
  }

  private initializeQueues() {
    // Create priority queues
    const priorities = ['urgent', 'high', 'normal', 'low'];
    const channels = ['email', 'sms', 'push'];

    for (const priority of priorities) {
      for (const channel of channels) {
        const queueName = `messages:${priority}:${channel}`;
        this.processingQueues.set(queueName, {
          priority,
          channel,
          processing: false,
        });
      }
    }
  }

  private startProcessing() {
    // Process queues every 1 second
    this.processingInterval = setInterval(() => {
      this.processQueues();
    }, 1000);

    // Update metrics every 10 seconds
    setInterval(() => {
      this.updateMetrics();
    }, 10000);
  }

  public async addToQueue(message: QueueMessage): Promise<void> {
    const queueName = this.getQueueName(message.priority, message.channel);

    // Add message to Redis queue
    const messageData = JSON.stringify({
      ...message,
      queuedAt: new Date().toISOString(),
      version: 1,
    });

    // Use sorted set for scheduled messages
    if (message.scheduledFor) {
      const score = message.scheduledFor.getTime();
      await this.redis.zadd(`scheduled:${queueName}`, score, messageData);
    } else {
      // Use list for immediate messages
      await this.redis.lpush(queueName, messageData);
    }

    // Update queue depth metric
    this.metrics.queueDepth[queueName] =
      (this.metrics.queueDepth[queueName] || 0) + 1;
  }

  public async addBulkToQueue(messages: QueueMessage[]): Promise<void> {
    // Group messages by queue
    const groupedMessages = this.groupMessagesByQueue(messages);

    // Use pipelining for bulk insertion
    const pipeline = this.redis.pipeline();

    for (const [queueName, queueMessages] of groupedMessages) {
      for (const message of queueMessages) {
        const messageData = JSON.stringify({
          ...message,
          queuedAt: new Date().toISOString(),
          version: 1,
        });

        if (message.scheduledFor) {
          const score = message.scheduledFor.getTime();
          pipeline.zadd(`scheduled:${queueName}`, score, messageData);
        } else {
          pipeline.lpush(queueName, messageData);
        }
      }

      this.metrics.queueDepth[queueName] =
        (this.metrics.queueDepth[queueName] || 0) + queueMessages.length;
    }

    await pipeline.exec();
  }

  private async processQueues() {
    // Process scheduled messages first
    await this.processScheduledMessages();

    // Process immediate messages by priority
    const priorities = ['urgent', 'high', 'normal', 'low'];

    for (const priority of priorities) {
      const channels = ['email', 'sms', 'push'];

      // Process channels in parallel with concurrency limit
      const channelPromises = channels.map((channel) =>
        this.processQueue(priority, channel),
      );

      await Promise.all(channelPromises);
    }
  }

  private async processScheduledMessages() {
    const now = Date.now();
    const queues = Array.from(this.processingQueues.keys());

    for (const queueName of queues) {
      const scheduledQueueName = `scheduled:${queueName}`;

      // Get messages that are due
      const messages = await this.redis.zrangebyscore(
        scheduledQueueName,
        0,
        now,
        'LIMIT',
        0,
        this.batchSize,
      );

      if (messages.length > 0) {
        // Move messages to immediate queue
        const pipeline = this.redis.pipeline();

        for (const message of messages) {
          pipeline.lpush(queueName, message);
          pipeline.zrem(scheduledQueueName, message);
        }

        await pipeline.exec();
      }
    }
  }

  private async processQueue(priority: string, channel: string): Promise<void> {
    const queueName = this.getQueueName(priority, channel);
    const queue = this.processingQueues.get(queueName);

    // Skip if already processing
    if (!queue || queue.processing) {
      return;
    }

    queue.processing = true;

    try {
      // Get batch of messages
      const messages = await this.redis.lrange(
        queueName,
        0,
        this.batchSize - 1,
      );

      if (messages.length === 0) {
        queue.processing = false;
        return;
      }

      // Process messages in parallel batches
      const batchPromises = [];
      const concurrentBatches = Math.ceil(
        messages.length / this.maxConcurrency,
      );

      for (let i = 0; i < concurrentBatches; i++) {
        const batchStart = i * this.maxConcurrency;
        const batchEnd = Math.min(
          batchStart + this.maxConcurrency,
          messages.length,
        );
        const batch = messages.slice(batchStart, batchEnd);

        batchPromises.push(this.processBatch(batch, channel));
      }

      const results = await Promise.all(batchPromises);

      // Remove processed messages from queue
      const processedCount = results.flat().filter((r) => r.success).length;

      if (processedCount > 0) {
        await this.redis.ltrim(queueName, processedCount, -1);
        this.metrics.queueDepth[queueName] = Math.max(
          0,
          (this.metrics.queueDepth[queueName] || 0) - processedCount,
        );
      }

      // Handle failed messages
      const failedMessages = results
        .flat()
        .filter((r) => !r.success)
        .map((r) => r.message);

      if (failedMessages.length > 0) {
        await this.handleFailedMessages(failedMessages, queueName);
      }
    } catch (error) {
      console.error(`Error processing queue ${queueName}:`, error);
    } finally {
      queue.processing = false;
    }
  }

  private async processBatch(
    messages: string[],
    channel: string,
  ): Promise<any[]> {
    const results = [];

    for (const messageStr of messages) {
      try {
        const message = JSON.parse(messageStr) as QueueMessage;
        const startTime = Date.now();

        // Process based on channel
        let result;
        switch (channel) {
          case 'email':
            result = await this.sendEmail(message);
            break;
          case 'sms':
            result = await this.sendSMS(message);
            break;
          case 'push':
            result = await this.sendPushNotification(message);
            break;
          default:
            throw new Error(`Unknown channel: ${channel}`);
        }

        const latency = Date.now() - startTime;
        this.updateLatencyMetric(latency);

        results.push({
          success: true,
          message,
          latency,
          result,
        });

        // Track successful send
        await this.trackMessageSent(message, result);
      } catch (error) {
        console.error('Error processing message:', error);
        results.push({
          success: false,
          message: messageStr,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private async sendEmail(message: QueueMessage): Promise<any> {
    // Implement email sending logic
    // This would integrate with your email provider
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('email_notifications')
      .insert({
        campaign_id: message.campaignId,
        recipient_id: message.recipientId,
        subject: message.payload.subject,
        content: message.payload.content,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: message.metadata,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async sendSMS(message: QueueMessage): Promise<any> {
    // Implement SMS sending logic
    // This would integrate with your SMS provider
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sms_notifications')
      .insert({
        campaign_id: message.campaignId,
        recipient_id: message.recipientId,
        message: message.payload.content,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: message.metadata,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async sendPushNotification(message: QueueMessage): Promise<any> {
    // Implement push notification logic
    // This would integrate with your push notification provider
    return { success: true, messageId: message.id };
  }

  private async handleFailedMessages(messages: string[], queueName: string) {
    const deadLetterQueue = `dlq:${queueName}`;

    for (const messageStr of messages) {
      try {
        const message = JSON.parse(messageStr) as QueueMessage;

        // Increment retry count
        message.retryCount = (message.retryCount || 0) + 1;

        // If under retry limit, requeue with exponential backoff
        if (message.retryCount < 3) {
          const delay = Math.pow(2, message.retryCount) * 1000; // Exponential backoff
          const scheduledFor = new Date(Date.now() + delay);

          message.scheduledFor = scheduledFor;
          await this.addToQueue(message);
        } else {
          // Move to dead letter queue
          await this.redis.lpush(
            deadLetterQueue,
            JSON.stringify({
              ...message,
              failedAt: new Date().toISOString(),
              originalQueue: queueName,
            }),
          );

          // Log failure
          await this.logMessageFailure(message);
        }
      } catch (error) {
        console.error('Error handling failed message:', error);
      }
    }
  }

  private async trackMessageSent(message: QueueMessage, result: any) {
    const supabase = await createClient();

    await supabase.from('message_tracking').insert({
      message_id: message.id,
      campaign_id: message.campaignId,
      recipient_id: message.recipientId,
      channel: message.channel,
      status: 'sent',
      sent_at: new Date().toISOString(),
      result_id: result.id,
    });

    this.metrics.totalMessages++;
  }

  private async logMessageFailure(message: QueueMessage) {
    const supabase = await createClient();

    await supabase.from('message_failures').insert({
      message_id: message.id,
      campaign_id: message.campaignId,
      recipient_id: message.recipientId,
      channel: message.channel,
      retry_count: message.retryCount,
      failed_at: new Date().toISOString(),
      metadata: message.metadata,
    });
  }

  private updateLatencyMetric(latency: number) {
    // Simple moving average for latency
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageLatency =
      alpha * latency + (1 - alpha) * this.metrics.averageLatency;
  }

  private async updateMetrics() {
    const supabase = await createClient();

    // Calculate success and error rates
    const { data: stats } = await supabase
      .from('message_tracking')
      .select('status')
      .gte('sent_at', new Date(Date.now() - 600000).toISOString()); // Last 10 minutes

    if (stats) {
      const total = stats.length;
      const successful = stats.filter((s) => s.status === 'sent').length;
      const failed = stats.filter((s) => s.status === 'failed').length;

      this.metrics.successRate = total > 0 ? (successful / total) * 100 : 0;
      this.metrics.errorRate = total > 0 ? (failed / total) * 100 : 0;
      this.metrics.processingRate = total / 10; // Messages per minute
    }

    // Update queue depths
    for (const queueName of this.processingQueues.keys()) {
      const depth = await this.redis.llen(queueName);
      this.metrics.queueDepth[queueName] = depth;
    }
  }

  private getQueueName(priority: string, channel: string): string {
    return `messages:${priority}:${channel}`;
  }

  private groupMessagesByQueue(
    messages: QueueMessage[],
  ): Map<string, QueueMessage[]> {
    const grouped = new Map<string, QueueMessage[]>();

    for (const message of messages) {
      const queueName = this.getQueueName(message.priority, message.channel);

      if (!grouped.has(queueName)) {
        grouped.set(queueName, []);
      }

      grouped.get(queueName)!.push(message);
    }

    return grouped;
  }

  public getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  public async getQueueStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const [queueName, queue] of this.processingQueues) {
      const depth = await this.redis.llen(queueName);
      const scheduledDepth = await this.redis.zcard(`scheduled:${queueName}`);

      status[queueName] = {
        priority: queue.priority,
        channel: queue.channel,
        processing: queue.processing,
        depth,
        scheduledDepth,
      };
    }

    return status;
  }

  public async cleanup() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    await this.redis.quit();
  }
}
