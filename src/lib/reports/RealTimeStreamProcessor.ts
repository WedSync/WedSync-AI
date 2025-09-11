/**
 * WS-333 Team B: Real-Time Stream Processing Engine
 * High-performance Kafka-based real-time data processing for wedding reporting
 * Handles millions of wedding events per minute with sub-second latency
 */

import {
  KafkaConfig,
  Consumer,
  Producer,
  Kafka,
  EachMessagePayload,
} from 'kafkajs';
import { Redis } from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { createWeddingReportingEngine } from './ReportingEngineBackend';
import {
  WeddingEventStream,
  StreamProcessingConfig,
  RealtimeAggregation,
  StreamMetrics,
  WeddingEventType,
  StreamProcessingResult,
} from '../../types/realtime-streaming';

export class WeddingRealTimeStreamProcessor {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private redis: Redis;
  private supabase: any;
  private reportingEngine: any;
  private processingStats: StreamMetrics;
  private isProcessing: boolean = false;

  // Wedding-specific stream topics
  private readonly WEDDING_TOPICS = {
    BOOKINGS: 'wedding-bookings-stream',
    PAYMENTS: 'wedding-payments-stream',
    COMMUNICATIONS: 'wedding-communications-stream',
    SUPPLIER_UPDATES: 'wedding-supplier-updates-stream',
    CLIENT_INTERACTIONS: 'wedding-client-interactions-stream',
    VENUE_AVAILABILITY: 'wedding-venue-availability-stream',
    PHOTO_UPLOADS: 'wedding-photo-uploads-stream',
    TIMELINE_CHANGES: 'wedding-timeline-changes-stream',
  };

  constructor(config: StreamProcessingConfig) {
    this.kafka = new Kafka({
      clientId: 'wedding-reporting-processor',
      brokers: config.kafkaBrokers || ['localhost:9092'],
      retry: {
        retries: 8,
        factor: 0.3,
        multiplier: 2,
        maxRetryTime: 30000,
      },
      connectionTimeout: 10000,
      authenticationTimeout: 10000,
    });

    this.consumer = this.kafka.consumer({
      groupId: 'wedding-reporting-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1024 * 1024, // 1MB
      minBytes: 1,
      maxBytes: 5 * 1024 * 1024, // 5MB
      maxWaitTimeInMs: 3000,
      allowAutoTopicCreation: true,
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });

    this.redis = new Redis({
      host: config.redisHost || 'localhost',
      port: config.redisPort || 6379,
      db: 2, // Dedicated DB for streaming
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.reportingEngine = createWeddingReportingEngine({
      weddingSeasonScaling: true,
      enablePerformanceMonitoring: true,
      realTimeProcessing: true,
    });

    this.processingStats = {
      eventsProcessed: 0,
      eventsPerSecond: 0,
      avgProcessingLatency: 0,
      errorRate: 0,
      lastProcessedTimestamp: new Date(),
      activeBatches: 0,
      backpressureLevel: 0,
    };
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Wedding Real-Time Stream Processor...');

    try {
      // Connect to Kafka
      await this.producer.connect();
      await this.consumer.connect();
      console.log('✅ Connected to Kafka cluster');

      // Connect to Redis
      await this.redis.connect();
      console.log('✅ Connected to Redis streaming cache');

      // Subscribe to all wedding event topics
      for (const [topicName, topicKey] of Object.entries(this.WEDDING_TOPICS)) {
        await this.consumer.subscribe({
          topic: topicKey,
          fromBeginning: false,
        });
        console.log(`📥 Subscribed to ${topicName}: ${topicKey}`);
      }

      // Start consuming messages
      await this.startStreamProcessing();
      console.log('🔄 Started real-time stream processing');

      // Initialize performance monitoring
      this.startPerformanceMonitoring();
    } catch (error) {
      console.error('❌ Failed to initialize stream processor:', error);
      throw new Error(
        `Stream processor initialization failed: ${error.message}`,
      );
    }
  }

  private async startStreamProcessing(): Promise<void> {
    this.isProcessing = true;

    await this.consumer.run({
      partitionsConsumedConcurrently: 3, // Process 3 partitions in parallel
      eachMessage: async (payload: EachMessagePayload) => {
        const startTime = Date.now();

        try {
          await this.processWeddingEvent(payload);

          // Update performance metrics
          this.processingStats.eventsProcessed++;
          this.processingStats.avgProcessingLatency =
            (this.processingStats.avgProcessingLatency +
              (Date.now() - startTime)) /
            2;
          this.processingStats.lastProcessedTimestamp = new Date();
        } catch (error) {
          console.error('❌ Event processing failed:', error);
          await this.handleProcessingError(payload, error);
          this.processingStats.errorRate =
            (this.processingStats.errorRate + 1) /
            this.processingStats.eventsProcessed;
        }
      },
    });
  }

  private async processWeddingEvent(
    payload: EachMessagePayload,
  ): Promise<void> {
    const { topic, partition, message } = payload;
    const eventData: WeddingEventStream = JSON.parse(
      message.value?.toString() || '{}',
    );

    // Add wedding context enrichment
    const enrichedEvent = await this.enrichWeddingEvent(eventData);

    // Process based on event type with wedding-specific logic
    switch (enrichedEvent.eventType) {
      case 'wedding_booking_confirmed':
        await this.processBookingConfirmation(enrichedEvent);
        break;

      case 'wedding_payment_received':
        await this.processPaymentReceived(enrichedEvent);
        break;

      case 'supplier_status_updated':
        await this.processSupplierStatusUpdate(enrichedEvent);
        break;

      case 'venue_availability_changed':
        await this.processVenueAvailabilityChange(enrichedEvent);
        break;

      case 'client_communication_sent':
        await this.processClientCommunication(enrichedEvent);
        break;

      case 'photo_upload_completed':
        await this.processPhotoUpload(enrichedEvent);
        break;

      case 'timeline_modified':
        await this.processTimelineChange(enrichedEvent);
        break;

      default:
        await this.processGenericWeddingEvent(enrichedEvent);
    }

    // Update real-time aggregations
    await this.updateRealTimeAggregations(enrichedEvent);

    // Check for wedding day alerts
    await this.checkWeddingDayAlerts(enrichedEvent);
  }

  private async enrichWeddingEvent(
    event: WeddingEventStream,
  ): Promise<WeddingEventStream> {
    // Add wedding context from database
    const weddingContext = await this.redis.get(`wedding:${event.weddingId}`);

    if (!weddingContext) {
      // Fetch from database and cache
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select(
          `
          id,
          wedding_date,
          venue_id,
          is_weekend,
          season,
          guest_count,
          budget_tier,
          status,
          couples:couples(name),
          venue:venues(name, location)
        `,
        )
        .eq('id', event.weddingId)
        .single();

      if (wedding) {
        await this.redis.setex(
          `wedding:${event.weddingId}`,
          3600, // 1 hour cache
          JSON.stringify(wedding),
        );
        event.weddingContext = wedding;
      }
    } else {
      event.weddingContext = JSON.parse(weddingContext);
    }

    // Add supplier context if applicable
    if (event.supplierId) {
      const supplierContext = await this.redis.get(
        `supplier:${event.supplierId}`,
      );
      if (!supplierContext) {
        const { data: supplier } = await this.supabase
          .from('suppliers')
          .select('id, business_name, service_type, tier, region')
          .eq('id', event.supplierId)
          .single();

        if (supplier) {
          await this.redis.setex(
            `supplier:${event.supplierId}`,
            7200, // 2 hour cache
            JSON.stringify(supplier),
          );
          event.supplierContext = supplier;
        }
      } else {
        event.supplierContext = JSON.parse(supplierContext);
      }
    }

    return event;
  }

  private async processBookingConfirmation(
    event: WeddingEventStream,
  ): Promise<void> {
    const { weddingId, supplierId, timestamp, data } = event;

    // Update real-time booking metrics
    await this.redis.incr('metrics:bookings:today');
    await this.redis.incr(`metrics:bookings:supplier:${supplierId}`);

    // Update wedding completion percentage
    const completionPercentage =
      await this.calculateWeddingCompletion(weddingId);
    await this.redis.hset(
      `wedding:${weddingId}:stats`,
      'completion',
      completionPercentage,
    );

    // Trigger real-time dashboard update
    await this.publishDashboardUpdate({
      type: 'booking_confirmed',
      weddingId,
      supplierId,
      completionPercentage,
      timestamp,
    });

    // Check if this triggers milestone achievement
    await this.checkMilestoneAchievement(weddingId, 'booking_confirmed');
  }

  private async processPaymentReceived(
    event: WeddingEventStream,
  ): Promise<void> {
    const { weddingId, supplierId, data } = event;
    const amount = data?.amount || 0;

    // Update real-time revenue metrics
    await this.redis.incrbyfloat('metrics:revenue:today', amount);
    await this.redis.incrbyfloat(
      `metrics:revenue:supplier:${supplierId}`,
      amount,
    );

    // Update wedding payment status
    await this.redis.hincrbyfloat(
      `wedding:${weddingId}:financials`,
      'paid',
      amount,
    );

    // Check for payment milestone completion
    const totalPaid = await this.redis.hget(
      `wedding:${weddingId}:financials`,
      'paid',
    );
    const totalBudget = await this.redis.hget(
      `wedding:${weddingId}:financials`,
      'budget',
    );

    if (totalPaid && totalBudget) {
      const paymentPercentage =
        (parseFloat(totalPaid) / parseFloat(totalBudget)) * 100;

      if (paymentPercentage >= 100) {
        await this.triggerWeddingFullyPaidAlert(weddingId);
      }
    }
  }

  private async processSupplierStatusUpdate(
    event: WeddingEventStream,
  ): Promise<void> {
    const { supplierId, weddingId, data } = event;

    // Update supplier availability metrics
    await this.redis.hset(
      `supplier:${supplierId}:availability`,
      weddingId,
      data?.status || 'unknown',
    );

    // Check for supplier capacity issues
    const activeWeddings = await this.redis.hlen(
      `supplier:${supplierId}:availability`,
    );
    if (activeWeddings > 10) {
      // Alert if supplier has >10 active weddings
      await this.triggerSupplierCapacityAlert(supplierId, activeWeddings);
    }
  }

  private async updateRealTimeAggregations(
    event: WeddingEventStream,
  ): Promise<void> {
    const { eventType, weddingId, timestamp } = event;

    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    // Update hourly activity metrics
    await this.redis.incr(`metrics:activity:${today}:${hour}`);

    // Update event type distribution
    await this.redis.incr(`metrics:events:${eventType}:${today}`);

    // Update wedding-specific activity
    await this.redis.incr(`metrics:wedding:${weddingId}:activity:${today}`);

    // Update real-time leaderboards
    if (event.supplierId) {
      await this.redis.zincrby(
        'leaderboard:supplier:activity:today',
        1,
        event.supplierId,
      );
    }

    // Wedding season adjustments
    if (event.weddingContext?.is_weekend) {
      await this.redis.incr(`metrics:weekend:activity:${today}`);
    }

    const season = this.getCurrentWeddingSeason();
    await this.redis.incr(`metrics:season:${season}:activity:${today}`);
  }

  private async checkWeddingDayAlerts(
    event: WeddingEventStream,
  ): Promise<void> {
    const { weddingContext, eventType } = event;

    if (!weddingContext?.wedding_date) return;

    const weddingDate = new Date(weddingContext.wedding_date);
    const today = new Date();
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - today.getTime()) / (1000 * 3600 * 24),
    );

    // Critical alerts for weddings within 7 days
    if (daysUntilWedding <= 7 && daysUntilWedding >= 0) {
      if (eventType === 'supplier_cancellation') {
        await this.triggerEmergencyAlert({
          type: 'supplier_cancellation_near_wedding',
          weddingId: event.weddingId,
          daysUntilWedding,
          urgency: 'critical',
        });
      }

      if (eventType === 'payment_issue') {
        await this.triggerEmergencyAlert({
          type: 'payment_issue_near_wedding',
          weddingId: event.weddingId,
          daysUntilWedding,
          urgency: 'high',
        });
      }
    }

    // Wedding day monitoring (same day alerts)
    if (daysUntilWedding === 0) {
      await this.activateWeddingDayMonitoring(event.weddingId);
    }
  }

  private async publishDashboardUpdate(update: any): Promise<void> {
    // Publish to real-time dashboard via Supabase Realtime
    await this.supabase.channel('dashboard-updates').send({
      type: 'broadcast',
      event: 'realtime_update',
      payload: update,
    });

    // Also cache for immediate dashboard loads
    await this.redis.lpush(
      'dashboard:recent_updates',
      JSON.stringify({ ...update, processed_at: new Date() }),
    );
    await this.redis.ltrim('dashboard:recent_updates', 0, 99); // Keep last 100 updates
  }

  private startPerformanceMonitoring(): void {
    setInterval(async () => {
      // Calculate events per second
      const currentEvents = this.processingStats.eventsProcessed;
      const eventsInLastMinute =
        currentEvents - (this.processingStats.eventsProcessed - 60);
      this.processingStats.eventsPerSecond = eventsInLastMinute / 60;

      // Update Redis metrics
      await this.redis.hset('stream:performance', {
        events_processed: this.processingStats.eventsProcessed,
        events_per_second: this.processingStats.eventsPerSecond,
        avg_latency: this.processingStats.avgProcessingLatency,
        error_rate: this.processingStats.errorRate,
        last_update: new Date().toISOString(),
      });

      // Alert on performance degradation
      if (this.processingStats.avgProcessingLatency > 5000) {
        // >5 seconds
        console.warn(
          '⚠️ Stream processing latency high:',
          this.processingStats.avgProcessingLatency,
        );
      }

      if (this.processingStats.errorRate > 0.01) {
        // >1% error rate
        console.warn(
          '⚠️ Stream processing error rate high:',
          this.processingStats.errorRate,
        );
      }
    }, 60000); // Every minute
  }

  private async calculateWeddingCompletion(weddingId: string): Promise<number> {
    // Check completion of key wedding components
    const { data: suppliers } = await this.supabase
      .from('wedding_suppliers')
      .select('service_type, status')
      .eq('wedding_id', weddingId);

    if (!suppliers || suppliers.length === 0) return 0;

    const confirmedSuppliers = suppliers.filter(
      (s) => s.status === 'confirmed',
    ).length;
    return Math.round((confirmedSuppliers / suppliers.length) * 100);
  }

  private getCurrentWeddingSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 9) return 'summer';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 10 && month <= 11) return 'fall';
    return 'winter';
  }

  private async triggerEmergencyAlert(alert: any): Promise<void> {
    // Send to high-priority alert topic
    await this.producer.send({
      topic: 'wedding-emergency-alerts',
      messages: [
        {
          key: alert.weddingId,
          value: JSON.stringify({
            ...alert,
            timestamp: new Date(),
            processed_by: 'real-time-stream-processor',
          }),
        },
      ],
    });

    console.warn('🚨 Emergency alert triggered:', alert);
  }

  private async activateWeddingDayMonitoring(weddingId: string): Promise<void> {
    // Activate enhanced monitoring for wedding day
    await this.redis.sadd('wedding_day_monitoring', weddingId);
    await this.redis.expire('wedding_day_monitoring', 86400); // 24 hours

    console.log(
      `📍 Activated wedding day monitoring for wedding: ${weddingId}`,
    );
  }

  async getProcessingStats(): Promise<StreamMetrics> {
    return this.processingStats;
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Wedding Real-Time Stream Processor...');

    this.isProcessing = false;

    await this.consumer.disconnect();
    await this.producer.disconnect();
    await this.redis.disconnect();

    console.log('✅ Stream processor shutdown complete');
  }

  private async handleProcessingError(
    payload: EachMessagePayload,
    error: any,
  ): Promise<void> {
    const { topic, partition, message } = payload;

    // Log error details
    console.error('Stream processing error:', {
      topic,
      partition,
      offset: message.offset,
      error: error.message,
      timestamp: new Date(),
    });

    // Send to dead letter queue for manual review
    await this.producer.send({
      topic: 'wedding-events-dlq',
      messages: [
        {
          key: message.key,
          value: JSON.stringify({
            original_topic: topic,
            original_partition: partition,
            original_offset: message.offset,
            error_message: error.message,
            error_timestamp: new Date(),
            payload: message.value?.toString(),
          }),
        },
      ],
    });
  }

  private async triggerWeddingFullyPaidAlert(weddingId: string): Promise<void> {
    await this.publishDashboardUpdate({
      type: 'wedding_fully_paid',
      weddingId,
      timestamp: new Date(),
      celebration: true,
    });
  }

  private async triggerSupplierCapacityAlert(
    supplierId: string,
    activeWeddings: number,
  ): Promise<void> {
    await this.publishDashboardUpdate({
      type: 'supplier_capacity_warning',
      supplierId,
      activeWeddings,
      timestamp: new Date(),
      urgency: 'medium',
    });
  }

  private async checkMilestoneAchievement(
    weddingId: string,
    milestone: string,
  ): Promise<void> {
    // Check if this booking completes a major milestone
    const completion = await this.calculateWeddingCompletion(weddingId);

    const milestones = [25, 50, 75, 100];
    const achievedMilestone = milestones.find(
      (m) =>
        completion >= m &&
        !(await this.redis.sismember(
          `wedding:${weddingId}:milestones`,
          m.toString(),
        )),
    );

    if (achievedMilestone) {
      await this.redis.sadd(
        `wedding:${weddingId}:milestones`,
        achievedMilestone.toString(),
      );

      await this.publishDashboardUpdate({
        type: 'milestone_achieved',
        weddingId,
        milestone: achievedMilestone,
        completion,
        timestamp: new Date(),
      });
    }
  }

  private async processGenericWeddingEvent(
    event: WeddingEventStream,
  ): Promise<void> {
    // Handle any wedding event not covered by specific processors
    await this.redis.incr(`metrics:generic_events:${event.eventType}`);

    // Store in time-series for trend analysis
    const timestamp = Math.floor(Date.now() / 1000);
    await this.redis.zadd(
      `timeseries:events:${event.eventType}`,
      timestamp,
      JSON.stringify({
        weddingId: event.weddingId,
        supplierId: event.supplierId,
        data: event.data,
      }),
    );
  }

  private async processVenueAvailabilityChange(
    event: WeddingEventStream,
  ): Promise<void> {
    const { data } = event;

    if (data?.availability_status === 'unavailable') {
      // Alert affected couples immediately
      await this.triggerEmergencyAlert({
        type: 'venue_unavailable',
        venueId: data.venue_id,
        affectedWeddings: data.affected_weddings || [],
        urgency: 'critical',
      });
    }
  }

  private async processClientCommunication(
    event: WeddingEventStream,
  ): Promise<void> {
    const { weddingId, data } = event;

    // Track communication volume
    await this.redis.incr(`metrics:communications:${weddingId}:today`);

    // Analyze sentiment if available
    if (data?.sentiment) {
      await this.redis.lpush(
        `sentiment:${weddingId}`,
        JSON.stringify({
          sentiment: data.sentiment,
          timestamp: new Date(),
        }),
      );
    }
  }

  private async processPhotoUpload(event: WeddingEventStream): Promise<void> {
    const { weddingId, data } = event;

    // Update photo statistics
    await this.redis.incr(`metrics:photos:${weddingId}:uploaded`);

    if (data?.file_size) {
      await this.redis.incrbyfloat(
        `metrics:photos:${weddingId}:total_size`,
        data.file_size,
      );
    }

    // Check for portfolio completion
    const photoCount = await this.redis.get(
      `metrics:photos:${weddingId}:uploaded`,
    );
    if (photoCount && parseInt(photoCount) >= 100) {
      // Threshold for complete portfolio
      await this.publishDashboardUpdate({
        type: 'photo_portfolio_complete',
        weddingId,
        photoCount: parseInt(photoCount),
        timestamp: new Date(),
      });
    }
  }

  private async processTimelineChange(
    event: WeddingEventStream,
  ): Promise<void> {
    const { weddingId, data } = event;

    // Track timeline modifications
    await this.redis.incr(`metrics:timeline:${weddingId}:modifications`);

    // Alert if major changes close to wedding date
    if (event.weddingContext?.wedding_date) {
      const weddingDate = new Date(event.weddingContext.wedding_date);
      const daysUntil = Math.ceil(
        (weddingDate.getTime() - Date.now()) / (1000 * 3600 * 24),
      );

      if (daysUntil <= 14 && data?.major_change) {
        await this.triggerEmergencyAlert({
          type: 'major_timeline_change_near_wedding',
          weddingId,
          daysUntilWedding: daysUntil,
          changes: data.changes,
          urgency: 'high',
        });
      }
    }
  }
}

// Factory function for creating the stream processor
export function createWeddingRealTimeStreamProcessor(
  config: StreamProcessingConfig,
): WeddingRealTimeStreamProcessor {
  return new WeddingRealTimeStreamProcessor(config);
}

// Export for use in API routes and background services
export { WeddingRealTimeStreamProcessor };
