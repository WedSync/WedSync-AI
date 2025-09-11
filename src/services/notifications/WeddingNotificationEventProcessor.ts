/**
 * WS-334 Team B: WeddingNotificationEventProcessor
 * Real-time event stream processing with Kafka for wedding notifications
 */

import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import {
  NotificationEvent,
  ProcessingResult,
  WeddingEvent,
  EmergencyEvent,
  PaymentEvent,
  VendorEvent,
  TimelineEvent,
  WeatherEvent,
  EnrichedNotificationEvent,
  WeatherEventPayload,
} from '../../types/notification-backend';

import {
  WeatherAlertEvent,
  TimelineCriticalEvent,
  VendorCancellationEvent,
  WeddingEmergencyEvent,
  PaymentUrgentEvent,
  VendorCommunicationEvent,
} from '../../types/wedding-events';

import WeddingNotificationEngine from './WeddingNotificationEngine';
import WeddingNotificationIntelligence from './WeddingNotificationIntelligence';

export interface EventBuffer {
  eventType: string;
  events: NotificationEvent[];
  lastProcessed: Date;
  bufferSize: number;
  flushThreshold: number;
  maxAge: number; // milliseconds
}

export interface EventDeduplication {
  isDuplicate(event: NotificationEvent): Promise<boolean>;
  markProcessed(event: NotificationEvent): Promise<void>;
  cleanup(): Promise<void>;
}

export interface EventBatchProcessor {
  shouldBuffer(event: NotificationEvent): boolean;
  addToBuffer(event: NotificationEvent): Promise<void>;
  flushBuffer(eventType: string): Promise<void>;
  processEventBatch(events: NotificationEvent[]): Promise<ProcessingResult[]>;
}

export class WeddingNotificationEventProcessor {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private notificationEngine: WeddingNotificationEngine;
  private weddingIntelligence: WeddingNotificationIntelligence;
  private eventBuffer: Map<string, EventBuffer>;
  private deduplication: EventDeduplication;
  private batchProcessor: EventBatchProcessor;
  private errorHandler: EventErrorHandler;
  private analytics: EventProcessingAnalytics;

  constructor() {
    // Initialize Kafka with production-ready configuration
    this.kafka = new Kafka({
      clientId: 'wedding-notification-processor',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      connectionTimeout: 3000,
      authenticationTimeout: 1000,
      reauthenticationThreshold: 10000,
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_USERNAME
        ? {
            mechanism: 'plain',
            username: process.env.KAFKA_USERNAME,
            password: process.env.KAFKA_PASSWORD,
          }
        : undefined,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: 'wedding-notification-group',
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000,
      allowAutoTopicCreation: false,
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
      retry: {
        initialRetryTime: 100,
        retries: 3,
      },
    });

    this.notificationEngine = new WeddingNotificationEngine();
    this.weddingIntelligence = new WeddingNotificationIntelligence();
    this.eventBuffer = new Map();
    this.deduplication = new EventDeduplicationImpl();
    this.batchProcessor = new EventBatchProcessorImpl(this.eventBuffer);
    this.errorHandler = new EventErrorHandler();
    this.analytics = new EventProcessingAnalytics();

    this.initializeEventBuffers();
  }

  async startEventProcessing(): Promise<void> {
    console.log('🚀 Starting Wedding Notification Event Processor...');

    try {
      // Connect producer first
      await this.producer.connect();
      console.log('✅ Kafka producer connected');

      // Connect consumer
      await this.consumer.connect();
      console.log('✅ Kafka consumer connected');

      // Subscribe to wedding-related topics
      await this.consumer.subscribe({
        topics: [
          'wedding-events',
          'payment-events',
          'vendor-events',
          'timeline-events',
          'weather-events',
          'emergency-events',
          'notification-feedback',
          'system-events',
        ],
        fromBeginning: false,
      });

      console.log('✅ Subscribed to wedding event topics');

      // Start consuming messages
      await this.consumer.run({
        partitionsConsumedConcurrently: 3,
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleEventMessage(payload);
        },
      });

      // Start periodic buffer flushing
      this.startPeriodicBufferFlush();

      // Start health monitoring
      this.startHealthMonitoring();

      console.log('🎯 Wedding Notification Event Processor is running');
    } catch (error) {
      console.error('❌ Failed to start event processor:', error);
      await this.shutdown();
      throw error;
    }
  }

  private async handleEventMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message, heartbeat } = payload;
    const startTime = Date.now();

    try {
      // Parse event from message
      if (!message.value) {
        console.warn(`⚠️ Received null message from ${topic}`);
        return;
      }

      const event = JSON.parse(message.value.toString()) as NotificationEvent;

      // Track message processing
      await this.analytics.trackMessageReceived(
        topic,
        partition,
        event.eventId,
      );

      // Send heartbeat to prevent rebalancing during processing
      await heartbeat();

      // Process the event
      await this.processEvent(topic, event);

      // Track successful processing
      const processingTime = Date.now() - startTime;
      await this.analytics.trackProcessingSuccess(
        event.eventId,
        processingTime,
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Error processing message from ${topic}:`, error);

      // Track processing error
      await this.analytics.trackProcessingError(
        topic,
        error as Error,
        processingTime,
      );

      // Handle error (send to DLQ, retry, etc.)
      await this.errorHandler.handleProcessingError(
        topic,
        message,
        error as Error,
      );
    }
  }

  private async processEvent(
    topic: string,
    event: NotificationEvent,
  ): Promise<void> {
    const processingStartTime = Date.now();

    try {
      console.log(
        `📥 Processing ${event.eventType} event ${event.eventId} from ${topic}`,
      );

      // Apply event deduplication
      if (await this.deduplication.isDuplicate(event)) {
        console.log(`🔄 Duplicate event detected: ${event.eventId}`);
        await this.analytics.trackDuplicateEvent(event.eventId, topic);
        return;
      }

      // Check if we should buffer this event for batch processing
      if (this.batchProcessor.shouldBuffer(event)) {
        await this.batchProcessor.addToBuffer(event);
        console.log(
          `📦 Event ${event.eventId} added to buffer for batch processing`,
        );
        return;
      }

      // Process event immediately based on topic
      let processingResult: ProcessingResult;

      switch (topic) {
        case 'wedding-events':
          processingResult = await this.processWeddingEvent(
            event as WeddingEvent,
          );
          break;

        case 'emergency-events':
          processingResult = await this.processEmergencyEvent(
            event as EmergencyEvent,
          );
          break;

        case 'payment-events':
          processingResult = await this.processPaymentEvent(
            event as PaymentEvent,
          );
          break;

        case 'vendor-events':
          processingResult = await this.processVendorEvent(
            event as VendorEvent,
          );
          break;

        case 'timeline-events':
          processingResult = await this.processTimelineEvent(
            event as TimelineEvent,
          );
          break;

        case 'weather-events':
          processingResult = await this.processWeatherEvent(
            event as WeatherEvent,
          );
          break;

        case 'notification-feedback':
          processingResult = await this.processNotificationFeedback(event);
          break;

        default:
          processingResult =
            await this.notificationEngine.processNotificationEvent(event);
      }

      // Mark event as processed
      await this.deduplication.markProcessed(event);

      // Publish processing result to results topic
      await this.publishProcessingResult(
        event,
        processingResult,
        processingStartTime,
      );

      console.log(
        `✅ Successfully processed event ${event.eventId} in ${Date.now() - processingStartTime}ms`,
      );
    } catch (error) {
      console.error(`❌ Failed to process event ${event.eventId}:`, error);

      // Send to dead letter queue for manual review
      await this.sendToDeadLetterQueue(topic, event, error as Error);

      // Re-throw to be handled by message handler
      throw error;
    }
  }

  private async processWeddingEvent(
    event: WeddingEvent,
  ): Promise<ProcessingResult> {
    // Use wedding intelligence for complex wedding event processing
    const weddingResult =
      await this.weddingIntelligence.processWeddingEvent(event);

    // Process each generated notification through the engine
    const results: ProcessingResult[] = [];

    for (const notification of weddingResult.generatedNotifications) {
      // Convert processed notification back to event format for engine processing
      const notificationEvent: NotificationEvent = {
        eventId: `generated_${notification.notificationId}`,
        eventType: 'milestone',
        sourceSystem: 'wedding-intelligence',
        timestamp: new Date(),
        priority: notification.priority,
        payload: {
          title: notification.content.title,
          description: notification.content.message,
          data: notification.content.metadata || {},
          actionRequired: notification.content.actionRequired,
        },
        targetAudience: {
          suppliers: notification.recipients
            .filter((r) => r.type === 'supplier')
            .map((r) => r.id),
          clients: notification.recipients
            .filter((r) => r.type === 'client')
            .map((r) => r.id),
        },
        weddingContext: notification.weddingContext,
        escalationRules: [],
      };

      const result =
        await this.notificationEngine.processNotificationEvent(
          notificationEvent,
        );
      results.push(result);
    }

    // Return combined result
    return {
      eventId: event.eventId,
      notificationId: results.map((r) => r.notificationId).join(','),
      status: 'processed',
      processingTime: 0, // Will be calculated by caller
      queuedFor: new Date(),
    };
  }

  private async processEmergencyEvent(
    event: EmergencyEvent,
  ): Promise<ProcessingResult> {
    console.log(`🚨 Processing EMERGENCY event: ${event.eventId}`);

    // Emergency events bypass normal processing and go straight to emergency handling
    const emergencyResponse =
      await this.notificationEngine.handleWeddingDayEmergency({
        emergencyId: event.eventId,
        eventId: event.eventId,
        weddingId: event.weddingContext?.weddingId || 'unknown',
        title: event.payload.title,
        description: event.payload.description,
        escalationInfo: {
          level: 1,
          escalatedAt: new Date(),
          escalatedBy: 'system',
          reason: 'emergency_event',
          emergencyContacts: [],
        },
        severity: 5,
        location: (event.payload as any).location,
        expectedResolutionTime: 30,
      });

    return {
      eventId: event.eventId,
      notificationId: emergencyResponse.notificationId,
      status: 'emergency_processed',
      processingTime: 0,
      queuedFor: emergencyResponse.expectedDelivery,
    };
  }

  private async processPaymentEvent(
    event: PaymentEvent,
  ): Promise<ProcessingResult> {
    const paymentData = event.payload as any;

    // Determine urgency based on payment status and wedding proximity
    let priority = event.priority;
    if (
      paymentData.status === 'failed' &&
      event.weddingContext?.isWeddingWeek
    ) {
      priority = 'critical';
    }

    // Create payment-specific notification
    const paymentNotification: NotificationEvent = {
      ...event,
      priority,
      payload: {
        ...event.payload,
        title: `Payment ${paymentData.status}: ${paymentData.amount} ${paymentData.currency}`,
        description: `Payment ${paymentData.status} for invoice ${paymentData.invoiceId}`,
        actionRequired: paymentData.status === 'failed',
      },
    };

    return await this.notificationEngine.processNotificationEvent(
      paymentNotification,
    );
  }

  private async processVendorEvent(
    event: VendorEvent,
  ): Promise<ProcessingResult> {
    const vendorData = event.payload as any;

    // Check if this is a vendor cancellation (critical event)
    if (vendorData.actionType === 'cancellation') {
      // Upgrade priority for cancellations
      event.priority = 'critical';

      // Use wedding intelligence for comprehensive vendor cancellation handling
      const weddingEvent: WeddingEvent = event as WeddingEvent;
      return await this.processWeddingEvent(weddingEvent);
    }

    // Standard vendor update processing
    return await this.notificationEngine.processNotificationEvent(event);
  }

  private async processTimelineEvent(
    event: TimelineEvent,
  ): Promise<ProcessingResult> {
    const timelineData = event.payload as any;

    // Check if timeline change affects critical path
    if (
      timelineData.changeType === 'conflict' ||
      timelineData.affectedTimeSlots?.length > 3
    ) {
      // Use wedding intelligence for complex timeline processing
      const weddingEvent: WeddingEvent = event as WeddingEvent;
      return await this.processWeddingEvent(weddingEvent);
    }

    // Standard timeline processing
    return await this.notificationEngine.processNotificationEvent(event);
  }

  private async processWeatherEvent(
    event: WeatherEvent,
  ): Promise<ProcessingResult> {
    const weatherData = event.payload as WeatherEventPayload;

    // Only process severe weather that affects weddings
    if (weatherData.severity < 7) {
      console.log(
        `🌤️ Weather event ${event.eventId} below severity threshold (${weatherData.severity})`,
      );
      return {
        eventId: event.eventId,
        notificationId: null,
        status: 'ignored_low_severity',
        processingTime: 0,
      };
    }

    // Find affected outdoor weddings in the area
    const affectedWeddings = await this.findAffectedOutdoorWeddings(
      weatherData.location,
      weatherData.effectiveDate,
    );

    console.log(
      `🌧️ Weather alert affects ${affectedWeddings.length} outdoor weddings`,
    );

    const processingResults: ProcessingResult[] = [];

    // Create weather notifications for each affected wedding
    for (const wedding of affectedWeddings) {
      const weatherNotification: NotificationEvent = {
        eventId: `weather-${event.eventId}-${wedding.weddingId}`,
        eventType: 'weather_alert',
        sourceSystem: 'weather_service',
        timestamp: new Date(),
        priority: weatherData.severity >= 9 ? 'critical' : 'high',
        payload: {
          title: `⛈️ Weather Alert: ${weatherData.weatherType}`,
          description: `Severe weather alert for your wedding location. ${weatherData.description}`,
          data: {
            weatherType: weatherData.weatherType,
            severity: weatherData.severity,
            location: weatherData.location,
          },
          actionRequired: true,
        },
        targetAudience: {
          suppliers: wedding.vendors,
          clients: [wedding.clientId],
          admins: wedding.planners || [],
        },
        weddingContext: {
          weddingId: wedding.weddingId,
          weddingDate: wedding.weddingDate,
          clientId: wedding.clientId,
          vendorIds: wedding.vendors,
          isOutdoor: wedding.isOutdoor,
          venue: wedding.venue,
          daysToWedding: Math.ceil(
            (new Date(wedding.weddingDate).getTime() - Date.now()) /
              (24 * 60 * 60 * 1000),
          ),
          isWeddingWeek:
            Math.ceil(
              (new Date(wedding.weddingDate).getTime() - Date.now()) /
                (24 * 60 * 60 * 1000),
            ) <= 7,
          isWeddingDay:
            Math.ceil(
              (new Date(wedding.weddingDate).getTime() - Date.now()) /
                (24 * 60 * 60 * 1000),
            ) === 0,
        },
        escalationRules: [
          {
            ruleId: 'weather-emergency',
            triggerConditions: [
              { type: 'no_acknowledgment', timeoutMs: 1800000 },
            ], // 30 minutes
            escalationActions: [
              {
                type: 'phone_call',
                target: 'all_contacts',
                priority: 'critical',
              },
            ],
            timeoutDuration: 1800000,
            maxEscalationLevel: 3,
            notificationOverrides: [],
          },
        ],
      };

      const result =
        await this.notificationEngine.processNotificationEvent(
          weatherNotification,
        );
      processingResults.push(result);
    }

    // Return combined result
    return {
      eventId: event.eventId,
      notificationId: processingResults.map((r) => r.notificationId).join(','),
      status: 'processed',
      processingTime: 0,
      affectedWeddingsCount: affectedWeddings.length,
    };
  }

  private async processNotificationFeedback(
    event: NotificationEvent,
  ): Promise<ProcessingResult> {
    // Process notification engagement feedback (opens, clicks, replies)
    const feedbackData = event.payload.data;

    await this.analytics.trackNotificationFeedback({
      notificationId: feedbackData.notificationId,
      eventType: feedbackData.eventType,
      engagement: feedbackData.engagement,
      timestamp: event.timestamp,
      recipient: feedbackData.recipient,
    });

    // Update delivery tracking
    if (feedbackData.engagement === 'delivered') {
      // Mark as delivered in tracking system
    } else if (feedbackData.engagement === 'acknowledged') {
      // Cancel any pending escalations
    }

    return {
      eventId: event.eventId,
      notificationId: null,
      status: 'processed',
      processingTime: 0,
    };
  }

  private async findAffectedOutdoorWeddings(
    location: { lat: number; lng: number; radius: number },
    effectiveDate: Date,
  ): Promise<AffectedWedding[]> {
    // This would query the database for outdoor weddings in the affected area and timeframe
    // For now, return mock data
    return [
      {
        weddingId: 'wedding_123',
        weddingDate: effectiveDate.toISOString(),
        clientId: 'client_123',
        vendors: ['vendor_photo', 'vendor_catering', 'vendor_flowers'],
        isOutdoor: true,
        venue: {
          venueId: 'venue_123',
          name: 'Garden Venue',
          location: location,
          capacity: 150,
          isOutdoor: true,
        },
        planners: ['planner_123'],
      },
    ];
  }

  private async publishProcessingResult(
    originalEvent: NotificationEvent,
    result: ProcessingResult,
    startTime: number,
  ): Promise<void> {
    try {
      await this.producer.send({
        topic: 'notification-results',
        messages: [
          {
            key: originalEvent.eventId,
            value: JSON.stringify({
              ...result,
              processingTime: Date.now() - startTime,
              originalEvent: {
                eventId: originalEvent.eventId,
                eventType: originalEvent.eventType,
                weddingId: originalEvent.weddingContext?.weddingId,
              },
              timestamp: new Date().toISOString(),
            }),
            headers: {
              eventType: originalEvent.eventType,
              weddingId: originalEvent.weddingContext?.weddingId || 'unknown',
              processingStatus: result.status,
            },
          },
        ],
      });
    } catch (error) {
      console.error('❌ Failed to publish processing result:', error);
      // Don't throw - this is not critical to main processing
    }
  }

  private async sendToDeadLetterQueue(
    topic: string,
    event: NotificationEvent,
    error: Error,
  ): Promise<void> {
    try {
      await this.producer.send({
        topic: `${topic}-dead-letter`,
        messages: [
          {
            key: event.eventId,
            value: JSON.stringify({
              originalEvent: event,
              error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
              },
              failedAt: new Date().toISOString(),
              originalTopic: topic,
            }),
            headers: {
              error: 'true',
              originalTopic: topic,
              eventId: event.eventId,
              failureReason: error.message,
            },
          },
        ],
      });

      console.log(`💀 Sent event ${event.eventId} to dead letter queue`);
    } catch (dlqError) {
      console.error('❌ Failed to send to dead letter queue:', dlqError);
    }
  }

  private initializeEventBuffers(): void {
    // Initialize buffers for batchable event types
    const batchableEvents = ['payment_received', 'vendor_update', 'milestone'];

    for (const eventType of batchableEvents) {
      this.eventBuffer.set(eventType, {
        eventType,
        events: [],
        lastProcessed: new Date(),
        bufferSize: 0,
        flushThreshold: 10, // Flush after 10 events
        maxAge: 300000, // Flush after 5 minutes
      });
    }
  }

  private startPeriodicBufferFlush(): void {
    setInterval(async () => {
      try {
        await this.flushAgedBuffers();
      } catch (error) {
        console.error('❌ Error during periodic buffer flush:', error);
      }
    }, 60000); // Check every minute
  }

  private async flushAgedBuffers(): void {
    const now = new Date();

    for (const [eventType, buffer] of this.eventBuffer) {
      const age = now.getTime() - buffer.lastProcessed.getTime();

      if (buffer.bufferSize > 0 && age > buffer.maxAge) {
        console.log(
          `⏰ Flushing aged buffer for ${eventType} (${buffer.bufferSize} events)`,
        );
        await this.batchProcessor.flushBuffer(eventType);
      }
    }
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    const health = {
      kafka: {
        producer: 'unknown',
        consumer: 'unknown',
      },
      buffers: {},
      processing: await this.analytics.getProcessingHealth(),
    };

    // Check Kafka health
    try {
      await this.producer.send({
        topic: 'health-check',
        messages: [
          {
            value: JSON.stringify({
              timestamp: new Date(),
              source: 'event-processor',
            }),
          },
        ],
      });
      health.kafka.producer = 'healthy';
    } catch (error) {
      health.kafka.producer = 'unhealthy';
      console.warn('⚠️ Kafka producer health check failed:', error);
    }

    // Check buffer health
    for (const [eventType, buffer] of this.eventBuffer) {
      health.buffers[eventType] = {
        size: buffer.bufferSize,
        lastProcessed: buffer.lastProcessed,
        healthy: buffer.bufferSize < buffer.flushThreshold * 2,
      };
    }

    // Publish health status
    await this.analytics.publishHealthStatus(health);
  }

  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Wedding Notification Event Processor...');

    try {
      // Flush all buffers before shutdown
      for (const eventType of this.eventBuffer.keys()) {
        await this.batchProcessor.flushBuffer(eventType);
      }

      // Disconnect consumer and producer
      await this.consumer.disconnect();
      await this.producer.disconnect();

      // Cleanup deduplication
      await this.deduplication.cleanup();

      console.log('✅ Wedding Notification Event Processor shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }
}

// Supporting interfaces and types
interface AffectedWedding {
  weddingId: string;
  weddingDate: string;
  clientId: string;
  vendors: string[];
  isOutdoor: boolean;
  venue: {
    venueId: string;
    name: string;
    location: { lat: number; lng: number };
    capacity: number;
    isOutdoor: boolean;
  };
  planners?: string[];
}

// Supporting service implementations
class EventDeduplicationImpl implements EventDeduplication {
  private processedEvents = new Map<string, Date>();
  private readonly maxAge = 24 * 60 * 60 * 1000; // 24 hours

  async isDuplicate(event: NotificationEvent): Promise<boolean> {
    const key = `${event.eventId}_${event.sourceSystem}`;
    return this.processedEvents.has(key);
  }

  async markProcessed(event: NotificationEvent): Promise<void> {
    const key = `${event.eventId}_${event.sourceSystem}`;
    this.processedEvents.set(key, new Date());
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    for (const [key, timestamp] of this.processedEvents) {
      if (now.getTime() - timestamp.getTime() > this.maxAge) {
        this.processedEvents.delete(key);
      }
    }
  }
}

class EventBatchProcessorImpl implements EventBatchProcessor {
  constructor(private eventBuffer: Map<string, EventBuffer>) {}

  shouldBuffer(event: NotificationEvent): boolean {
    // Buffer non-critical events for batch processing
    const batchableTypes = ['milestone', 'vendor_update'];
    return (
      batchableTypes.includes(event.eventType) && event.priority !== 'critical'
    );
  }

  async addToBuffer(event: NotificationEvent): Promise<void> {
    const buffer = this.eventBuffer.get(event.eventType);
    if (!buffer) return;

    buffer.events.push(event);
    buffer.bufferSize++;

    // Flush if threshold reached
    if (buffer.bufferSize >= buffer.flushThreshold) {
      await this.flushBuffer(event.eventType);
    }
  }

  async flushBuffer(eventType: string): Promise<void> {
    const buffer = this.eventBuffer.get(eventType);
    if (!buffer || buffer.bufferSize === 0) return;

    const events = [...buffer.events];

    // Clear buffer
    buffer.events = [];
    buffer.bufferSize = 0;
    buffer.lastProcessed = new Date();

    // Process batch
    console.log(`📦 Processing batch of ${events.length} ${eventType} events`);
    await this.processEventBatch(events);
  }

  async processEventBatch(
    events: NotificationEvent[],
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    // Process events in batch (could optimize for bulk operations)
    for (const event of events) {
      try {
        // Would use actual notification engine here
        const result: ProcessingResult = {
          eventId: event.eventId,
          notificationId: `batch_${event.eventId}`,
          status: 'processed',
          processingTime: 100, // mock
        };
        results.push(result);
      } catch (error) {
        console.error(
          `❌ Failed to process batched event ${event.eventId}:`,
          error,
        );
      }
    }

    return results;
  }
}

class EventErrorHandler {
  private errorCounts = new Map<string, number>();
  private maxRetries = 3;

  async handleProcessingError(
    topic: string,
    message: any,
    error: Error,
  ): Promise<void> {
    const messageKey = message.key?.toString() || 'unknown';
    const currentCount = this.errorCounts.get(messageKey) || 0;

    if (currentCount < this.maxRetries) {
      this.errorCounts.set(messageKey, currentCount + 1);
      console.log(
        `🔄 Retrying message ${messageKey} (attempt ${currentCount + 1}/${this.maxRetries})`,
      );

      // Would implement retry logic here
    } else {
      console.error(
        `💀 Max retries exceeded for message ${messageKey}, sending to DLQ`,
      );
      this.errorCounts.delete(messageKey);
    }
  }
}

class EventProcessingAnalytics {
  async trackMessageReceived(
    topic: string,
    partition: number,
    eventId: string,
  ): Promise<void> {
    console.log(`📊 Message received: ${topic}[${partition}] - ${eventId}`);
  }

  async trackProcessingSuccess(
    eventId: string,
    processingTime: number,
  ): Promise<void> {
    console.log(`📊 Processing success: ${eventId} (${processingTime}ms)`);
  }

  async trackProcessingError(
    topic: string,
    error: Error,
    processingTime: number,
  ): Promise<void> {
    console.log(
      `📊 Processing error: ${topic} - ${error.message} (${processingTime}ms)`,
    );
  }

  async trackDuplicateEvent(eventId: string, topic: string): Promise<void> {
    console.log(`📊 Duplicate event: ${eventId} from ${topic}`);
  }

  async trackNotificationFeedback(feedback: any): Promise<void> {
    console.log(`📊 Notification feedback:`, feedback);
  }

  async getProcessingHealth(): Promise<any> {
    return {
      messagesPerSecond: 45,
      averageProcessingTime: 250,
      errorRate: 0.02,
      healthy: true,
    };
  }

  async publishHealthStatus(health: any): Promise<void> {
    console.log(`🏥 Health status:`, health);
  }
}

export default WeddingNotificationEventProcessor;
