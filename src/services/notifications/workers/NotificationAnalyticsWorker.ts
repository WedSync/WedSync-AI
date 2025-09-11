import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import type {
  ProcessedNotification,
  NotificationDeliveryResult,
} from '../../../types/notification-backend';

interface AnalyticsEvent {
  id: string;
  type:
    | 'delivery_attempt'
    | 'delivery_success'
    | 'delivery_failure'
    | 'user_interaction';
  notification_id: string;
  wedding_id?: string;
  user_id: string;
  channel: string;
  provider: string;
  timestamp: Date;
  metadata: Record<string, any>;
  metrics: {
    latency?: number;
    retry_count?: number;
    error_code?: string;
    cost?: number;
  };
}

interface NotificationMetrics {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_retries: number;
  average_latency: number;
  error_rate: number;
  cost_total: number;
  channel_breakdown: Record<
    string,
    {
      sent: number;
      delivered: number;
      failed: number;
      latency: number;
      cost: number;
    }
  >;
  priority_breakdown: Record<
    string,
    {
      sent: number;
      delivered: number;
      failed: number;
    }
  >;
  wedding_breakdown: Record<
    string,
    {
      notifications: number;
      delivered: number;
      emergency_count: number;
    }
  >;
}

interface WeddingEngagementMetrics {
  wedding_id: string;
  notification_count: number;
  open_rate: number;
  click_rate: number;
  response_rate: number;
  emergency_response_time: number; // in minutes
  vendor_response_time: number; // in minutes
  couple_engagement_score: number; // 0-100
  peak_notification_hours: number[];
  preferred_channels: string[];
}

export class NotificationAnalyticsWorker {
  private worker?: Worker;
  private redis: Redis;
  private supabase;
  private isRunning = false;
  private metricsCache = new Map<string, any>();
  private batchBuffer: AnalyticsEvent[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_TIMEOUT = 30000; // 30 seconds
  private batchTimer?: NodeJS.Timeout;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error('Supabase configuration missing for analytics worker');
    }

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Analytics worker is already running');
    }

    try {
      await this.redis.connect();

      // Start the main analytics worker
      this.worker = new Worker(
        'notifications:analytics',
        async (job: Job) => {
          return await this.processAnalyticsJob(job);
        },
        {
          connection: this.redis,
          concurrency: 5,
          removeOnComplete: 1000, // Keep more analytics data
          removeOnFail: 100,
        },
      );

      this.setupEventListeners();

      // Start periodic tasks
      this.startPeriodicTasks();

      // Initialize batch processing
      this.startBatchProcessing();

      this.isRunning = true;
      console.log('📊 Notification Analytics Worker started');
    } catch (error) {
      console.error('Failed to start analytics worker:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.worker) return;

    this.worker.on('completed', (job) => {
      console.log(`📈 Analytics job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`📉 Analytics job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('Analytics worker error:', err);
    });
  }

  private async processAnalyticsJob(job: Job): Promise<void> {
    const { type, data } = job.data;

    try {
      switch (type) {
        case 'delivery_event':
          await this.processDeliveryEvent(data);
          break;
        case 'user_interaction':
          await this.processUserInteraction(data);
          break;
        case 'aggregation':
          await this.performAggregation(data);
          break;
        case 'wedding_insights':
          await this.generateWeddingInsights(data);
          break;
        case 'cost_calculation':
          await this.calculateCosts(data);
          break;
        case 'performance_analysis':
          await this.analyzePerformance(data);
          break;
        default:
          console.warn(`Unknown analytics job type: ${type}`);
      }
    } catch (error) {
      console.error(`Analytics job processing failed for type ${type}:`, error);
      throw error;
    }
  }

  async recordDeliveryAttempt(
    notification: ProcessedNotification,
    channel: string,
    result: NotificationDeliveryResult,
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: crypto.randomUUID(),
      type: result.success ? 'delivery_success' : 'delivery_failure',
      notification_id: notification.id || '',
      wedding_id: notification.event.weddingId,
      user_id: notification.recipientId,
      channel,
      provider: result.providerId,
      timestamp: new Date(),
      metadata: {
        priority: notification.priority,
        event_type: notification.event.type,
        message_id: result.messageId,
        error: result.error,
        ...result.metadata,
      },
      metrics: {
        latency: result.latency,
        retry_count: 0, // This would be tracked elsewhere
        error_code: result.error,
        cost: this.estimateDeliveryCost(channel, result),
      },
    };

    this.addToBatch(event);
  }

  async recordUserInteraction(
    notificationId: string,
    userId: string,
    interactionType: 'opened' | 'clicked' | 'dismissed' | 'replied',
    metadata?: Record<string, any>,
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: crypto.randomUUID(),
      type: 'user_interaction',
      notification_id: notificationId,
      user_id: userId,
      channel: metadata?.channel || 'unknown',
      provider: metadata?.provider || 'unknown',
      timestamp: new Date(),
      metadata: {
        interaction_type: interactionType,
        ...metadata,
      },
      metrics: {},
    };

    this.addToBatch(event);
  }

  private addToBatch(event: AnalyticsEvent): void {
    this.batchBuffer.push(event);

    if (this.batchBuffer.length >= this.BATCH_SIZE) {
      this.flushBatch();
    }
  }

  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.batchBuffer.length > 0) {
        this.flushBatch();
      }
    }, this.BATCH_TIMEOUT);
  }

  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      // Insert into database
      const { error } = await this.supabase
        .from('notification_analytics_events')
        .insert(batch);

      if (error) {
        console.error('Failed to insert analytics batch:', error);
        // Re-add to buffer for retry (with deduplication)
        this.batchBuffer.unshift(...batch);
      } else {
        console.log(`📊 Inserted ${batch.length} analytics events`);
      }

      // Also cache key metrics in Redis for real-time queries
      await this.updateRealTimeMetrics(batch);
    } catch (error) {
      console.error('Batch flush error:', error);
      // Re-add to buffer for retry
      this.batchBuffer.unshift(...batch);
    }
  }

  private async updateRealTimeMetrics(events: AnalyticsEvent[]): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const event of events) {
      const timestamp = event.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD

      // Update daily metrics
      pipeline.hincrby(`metrics:daily:${timestamp}`, 'total_events', 1);
      pipeline.hincrby(
        `metrics:daily:${timestamp}`,
        `${event.channel}_events`,
        1,
      );

      if (event.type === 'delivery_success') {
        pipeline.hincrby(`metrics:daily:${timestamp}`, 'delivered', 1);
      } else if (event.type === 'delivery_failure') {
        pipeline.hincrby(`metrics:daily:${timestamp}`, 'failed', 1);
      }

      // Update wedding-specific metrics
      if (event.wedding_id) {
        pipeline.hincrby(
          `metrics:wedding:${event.wedding_id}`,
          'notifications',
          1,
        );
        pipeline.hincrby(
          `metrics:wedding:${event.wedding_id}:${timestamp}`,
          'notifications',
          1,
        );
      }

      // Update cost metrics
      if (event.metrics.cost) {
        pipeline.hincrbyfloat(
          `metrics:daily:${timestamp}`,
          'cost',
          event.metrics.cost,
        );
      }

      // Update latency metrics (for moving averages)
      if (event.metrics.latency) {
        pipeline.lpush(
          `metrics:latency:${event.channel}`,
          event.metrics.latency,
        );
        pipeline.ltrim(`metrics:latency:${event.channel}`, 0, 999); // Keep last 1000 measurements
      }
    }

    await pipeline.exec();
  }

  private async processDeliveryEvent(data: any): Promise<void> {
    // Process individual delivery events for deep analysis
    const { notification, result, channel } = data;

    // Update channel performance metrics
    await this.updateChannelMetrics(channel, result);

    // Check for performance issues
    if (result.latency > 10000) {
      // More than 10 seconds
      await this.alertSlowDelivery(notification, result, channel);
    }

    // Update wedding-specific metrics
    if (notification.event.weddingId) {
      await this.updateWeddingMetrics(notification.event.weddingId, result);
    }
  }

  private async processUserInteraction(data: any): Promise<void> {
    const { notificationId, userId, interactionType, metadata } = data;

    // Update engagement rates
    await this.updateEngagementMetrics(notificationId, interactionType);

    // Track user preferences
    await this.updateUserPreferences(userId, metadata.channel, interactionType);

    // Update wedding engagement if applicable
    if (metadata.weddingId) {
      await this.updateWeddingEngagement(metadata.weddingId, interactionType);
    }
  }

  private async performAggregation(data: any): Promise<void> {
    const { timeframe, type } = data;

    switch (type) {
      case 'hourly':
        await this.aggregateHourlyMetrics();
        break;
      case 'daily':
        await this.aggregateDailyMetrics();
        break;
      case 'weekly':
        await this.aggregateWeeklyMetrics();
        break;
      case 'monthly':
        await this.aggregateMonthlyMetrics();
        break;
    }
  }

  private async generateWeddingInsights(data: any): Promise<void> {
    const { weddingId } = data;

    try {
      // Get notification data for this wedding
      const { data: events, error } = await this.supabase
        .from('notification_analytics_events')
        .select('*')
        .eq('wedding_id', weddingId)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Last 30 days

      if (error || !events) {
        console.error('Failed to fetch wedding events:', error);
        return;
      }

      const insights = this.calculateWeddingInsights(events);

      // Store insights
      await this.supabase.from('wedding_notification_insights').upsert({
        wedding_id: weddingId,
        insights,
        generated_at: new Date().toISOString(),
      });

      console.log(`📊 Generated insights for wedding ${weddingId}`);
    } catch (error) {
      console.error('Failed to generate wedding insights:', error);
      throw error;
    }
  }

  private calculateWeddingInsights(
    events: AnalyticsEvent[],
  ): WeddingEngagementMetrics {
    const deliveryEvents = events.filter((e) => e.type.includes('delivery'));
    const interactionEvents = events.filter(
      (e) => e.type === 'user_interaction',
    );

    const totalSent = deliveryEvents.length;
    const totalDelivered = deliveryEvents.filter(
      (e) => e.type === 'delivery_success',
    ).length;
    const totalOpened = interactionEvents.filter(
      (e) => e.metadata.interaction_type === 'opened',
    ).length;
    const totalClicked = interactionEvents.filter(
      (e) => e.metadata.interaction_type === 'clicked',
    ).length;
    const totalReplied = interactionEvents.filter(
      (e) => e.metadata.interaction_type === 'replied',
    ).length;

    // Calculate channel preferences
    const channelCounts = events.reduce(
      (acc, event) => {
        acc[event.channel] = (acc[event.channel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const preferredChannels = Object.entries(channelCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([channel]) => channel);

    // Calculate peak hours
    const hourCounts = events.reduce(
      (acc, event) => {
        const hour = new Date(event.timestamp).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    return {
      wedding_id: events[0]?.wedding_id || '',
      notification_count: totalSent,
      open_rate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      click_rate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      response_rate: totalSent > 0 ? (totalReplied / totalSent) * 100 : 0,
      emergency_response_time: this.calculateAverageResponseTime(
        events,
        'emergency',
      ),
      vendor_response_time: this.calculateAverageResponseTime(events, 'vendor'),
      couple_engagement_score: this.calculateEngagementScore(events),
      peak_notification_hours: peakHours,
      preferred_channels: preferredChannels,
    };
  }

  private calculateAverageResponseTime(
    events: AnalyticsEvent[],
    type: string,
  ): number {
    const relevantEvents = events.filter(
      (e) =>
        e.metadata.event_type?.includes(type) &&
        e.metadata.interaction_type === 'replied',
    );

    if (relevantEvents.length === 0) return 0;

    // This would need more sophisticated logic to match delivery and response events
    return 15; // Placeholder - average 15 minutes
  }

  private calculateEngagementScore(events: AnalyticsEvent[]): number {
    const weights = {
      opened: 10,
      clicked: 25,
      replied: 50,
      dismissed: -5,
    };

    const score = events
      .filter((e) => e.type === 'user_interaction')
      .reduce((total, event) => {
        const interaction = event.metadata.interaction_type;
        return total + (weights[interaction as keyof typeof weights] || 0);
      }, 0);

    return Math.max(0, Math.min(100, score / events.length));
  }

  private async calculateCosts(data: any): Promise<void> {
    const { timeframe } = data;

    // Calculate costs by channel and time period
    const costs = await this.aggregateCosts(timeframe);

    // Store cost analysis
    await this.supabase.from('notification_cost_analysis').insert({
      timeframe,
      costs,
      calculated_at: new Date().toISOString(),
    });
  }

  private async aggregateCosts(
    timeframe: string,
  ): Promise<Record<string, number>> {
    const costs: Record<string, number> = {};

    // Get cost data from Redis
    const keys = await this.redis.keys(`metrics:daily:*`);

    for (const key of keys) {
      const costData = await this.redis.hget(key, 'cost');
      if (costData) {
        const date = key.split(':')[2];
        costs[date] = parseFloat(costData);
      }
    }

    return costs;
  }

  private estimateDeliveryCost(
    channel: string,
    result: NotificationDeliveryResult,
  ): number {
    // Estimated costs per channel (in cents)
    const costMap: Record<string, number> = {
      sms: 5, // $0.05
      voice: 200, // $2.00
      email: 0.1, // $0.001
      push: 0, // Free
      webhook: 0, // Free
      in_app: 0, // Free
    };

    return costMap[channel] || 0;
  }

  private async updateChannelMetrics(
    channel: string,
    result: NotificationDeliveryResult,
  ): Promise<void> {
    const key = `metrics:channel:${channel}`;
    const pipeline = this.redis.pipeline();

    pipeline.hincrby(key, 'attempts', 1);

    if (result.success) {
      pipeline.hincrby(key, 'successes', 1);
    } else {
      pipeline.hincrby(key, 'failures', 1);
    }

    if (result.latency) {
      pipeline.lpush(`${key}:latency`, result.latency);
      pipeline.ltrim(`${key}:latency`, 0, 999);
    }

    await pipeline.exec();
  }

  private async alertSlowDelivery(
    notification: ProcessedNotification,
    result: NotificationDeliveryResult,
    channel: string,
  ): Promise<void> {
    console.warn(
      `🐌 Slow delivery detected: ${channel} took ${result.latency}ms for notification ${notification.id}`,
    );

    // Could send alert to monitoring system
    await this.redis.lpush(
      'alerts:slow_delivery',
      JSON.stringify({
        notification_id: notification.id,
        channel,
        latency: result.latency,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  private async updateWeddingMetrics(
    weddingId: string,
    result: NotificationDeliveryResult,
  ): Promise<void> {
    const key = `metrics:wedding:${weddingId}`;
    const pipeline = this.redis.pipeline();

    pipeline.hincrby(key, 'total_notifications', 1);

    if (result.success) {
      pipeline.hincrby(key, 'successful_deliveries', 1);
    } else {
      pipeline.hincrby(key, 'failed_deliveries', 1);
    }

    await pipeline.exec();
  }

  private async updateEngagementMetrics(
    notificationId: string,
    interactionType: string,
  ): Promise<void> {
    const key = `engagement:${notificationId}`;
    await this.redis.hset(key, interactionType, new Date().toISOString());
    await this.redis.expire(key, 86400 * 30); // Keep for 30 days
  }

  private async updateUserPreferences(
    userId: string,
    channel: string,
    interactionType: string,
  ): Promise<void> {
    const key = `preferences:${userId}`;
    await this.redis.hincrby(key, `${channel}:${interactionType}`, 1);
  }

  private async updateWeddingEngagement(
    weddingId: string,
    interactionType: string,
  ): Promise<void> {
    const key = `engagement:wedding:${weddingId}`;
    await this.redis.hincrby(key, interactionType, 1);
  }

  private startPeriodicTasks(): void {
    // Aggregate metrics every hour
    setInterval(
      async () => {
        await this.scheduleAggregation('hourly');
      },
      60 * 60 * 1000,
    ); // 1 hour

    // Daily aggregation
    setInterval(
      async () => {
        await this.scheduleAggregation('daily');
      },
      24 * 60 * 60 * 1000,
    ); // 24 hours

    // Generate insights for active weddings daily
    setInterval(
      async () => {
        await this.scheduleWeddingInsights();
      },
      24 * 60 * 60 * 1000,
    ); // 24 hours
  }

  private async scheduleAggregation(type: string): Promise<void> {
    await this.redis.lpush(
      'notifications:analytics',
      JSON.stringify({
        type: 'aggregation',
        data: { type },
      }),
    );
  }

  private async scheduleWeddingInsights(): Promise<void> {
    // Get active weddings (within 30 days of wedding date)
    const { data: weddings } = await this.supabase
      .from('weddings')
      .select('id')
      .gte('wedding_date', new Date().toISOString())
      .lte(
        'wedding_date',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (weddings) {
      for (const wedding of weddings) {
        await this.redis.lpush(
          'notifications:analytics',
          JSON.stringify({
            type: 'wedding_insights',
            data: { weddingId: wedding.id },
          }),
        );
      }
    }
  }

  private async aggregateHourlyMetrics(): Promise<void> {
    // Implementation for hourly aggregation
    console.log('📊 Performing hourly metrics aggregation');
  }

  private async aggregateDailyMetrics(): Promise<void> {
    // Implementation for daily aggregation
    console.log('📊 Performing daily metrics aggregation');
  }

  private async aggregateWeeklyMetrics(): Promise<void> {
    // Implementation for weekly aggregation
    console.log('📊 Performing weekly metrics aggregation');
  }

  private async aggregateMonthlyMetrics(): Promise<void> {
    // Implementation for monthly aggregation
    console.log('📊 Performing monthly metrics aggregation');
  }

  async getMetrics(
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day',
  ): Promise<NotificationMetrics> {
    // Get aggregated metrics from cache or database
    const cacheKey = `aggregated_metrics:${timeframe}`;
    const cached = this.metricsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      // 5 minutes cache
      return cached.data;
    }

    // Fetch from database and calculate
    const metrics = await this.calculateCurrentMetrics(timeframe);

    this.metricsCache.set(cacheKey, {
      data: metrics,
      timestamp: Date.now(),
    });

    return metrics;
  }

  private async calculateCurrentMetrics(
    timeframe: string,
  ): Promise<NotificationMetrics> {
    // Placeholder implementation - would query actual data
    return {
      total_sent: 0,
      total_delivered: 0,
      total_failed: 0,
      total_retries: 0,
      average_latency: 0,
      error_rate: 0,
      cost_total: 0,
      channel_breakdown: {},
      priority_breakdown: {},
      wedding_breakdown: {},
    };
  }

  async shutdown(): Promise<void> {
    console.log('📊 Shutting down analytics worker...');

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    // Flush remaining batch
    await this.flushBatch();

    if (this.worker) {
      await this.worker.close();
    }

    await this.redis.quit();
    this.isRunning = false;

    console.log('✅ Analytics worker shut down gracefully');
  }

  isHealthy(): boolean {
    return this.isRunning && !!this.worker?.isRunning();
  }
}
