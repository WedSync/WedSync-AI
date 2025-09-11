// WS-342: Real-Time Wedding Collaboration - Event Queue & Batching Manager
// Team B Backend Development - Batch 1 Round 1

import { EventEmitter } from 'events';
import { CollaborationEvent } from '../types/collaboration';

interface QueueConfig {
  maxQueueSize: number;
  batchSize: number;
  batchTimeout: number; // ms
  maxRetries: number;
  retryDelay: number; // ms
  priorityLevels: number;
  enableCompression: boolean;
  enablePersistence: boolean;
  deadLetterQueueSize: number;
  throughputTarget: number; // events per minute
}

interface QueuedEvent {
  id: string;
  event: CollaborationEvent;
  priority: number;
  retryCount: number;
  queuedAt: number;
  processAfter?: number;
  weddingId: string;
  eventType: string;
}

interface EventBatch {
  id: string;
  events: QueuedEvent[];
  priority: number;
  createdAt: number;
  size: number;
  weddingId?: string;
}

interface QueueStats {
  totalQueued: number;
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
  currentThroughput: number; // events per minute
  queueSizes: Map<number, number>; // priority -> size
  batchesProcessed: number;
  deadLetterCount: number;
  lastUpdated: Date;
}

interface ProcessingResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: string[];
  processingTime: number;
}

export class EventQueueManager extends EventEmitter {
  private config: QueueConfig;
  private queues: Map<number, QueuedEvent[]> = new Map(); // priority -> events
  private deadLetterQueue: QueuedEvent[] = [];
  private batchProcessors: Map<string, EventBatch> = new Map();
  private stats: QueueStats;
  private processingTimers: Map<number, NodeJS.Timeout> = new Map();
  private metricsInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly maxPriority = 5;

  constructor(config: QueueConfig) {
    super();
    this.config = {
      maxQueueSize: 100000,
      batchSize: 100,
      batchTimeout: 1000, // 1 second
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      priorityLevels: 5,
      enableCompression: true,
      enablePersistence: false,
      deadLetterQueueSize: 10000,
      throughputTarget: 1000000, // 1M events per minute
      ...config,
    };

    // Initialize priority queues
    for (let i = 1; i <= this.config.priorityLevels; i++) {
      this.queues.set(i, []);
    }

    this.stats = {
      totalQueued: 0,
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      currentThroughput: 0,
      queueSizes: new Map(),
      batchesProcessed: 0,
      deadLetterCount: 0,
      lastUpdated: new Date(),
    };

    this.startBackgroundTasks();
  }

  // Queue event with automatic batching and priority handling
  async queueEvent(
    event: CollaborationEvent,
    priority: number = 3,
    processAfter?: Date,
  ): Promise<{ success: boolean; queueId?: string; error?: string }> {
    try {
      // Validate priority
      if (priority < 1 || priority > this.config.priorityLevels) {
        priority = 3; // Default to medium priority
      }

      // Check queue size limits
      const totalQueueSize = this.getTotalQueueSize();
      if (totalQueueSize >= this.config.maxQueueSize) {
        // Try to make space by processing lower priority items
        await this.processLowPriorityBatch();

        if (this.getTotalQueueSize() >= this.config.maxQueueSize) {
          return {
            success: false,
            error: 'Queue is at maximum capacity',
          };
        }
      }

      const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const queuedEvent: QueuedEvent = {
        id: queueId,
        event: event,
        priority: priority,
        retryCount: 0,
        queuedAt: Date.now(),
        processAfter: processAfter?.getTime(),
        weddingId: event.wedding_id,
        eventType: event.type,
      };

      // Add to appropriate priority queue
      const queue = this.queues.get(priority) || [];
      queue.push(queuedEvent);
      this.queues.set(priority, queue);

      // Update stats
      this.stats.totalQueued++;
      this.updateQueueSizeStats();

      // Trigger batch processing if conditions are met
      await this.checkBatchProcessingConditions(priority);

      this.emit('event_queued', {
        queueId,
        eventType: event.type,
        priority,
        queueSize: queue.length,
        totalQueued: this.stats.totalQueued,
      });

      return { success: true, queueId };
    } catch (error) {
      console.error('Failed to queue event:', error);
      return {
        success: false,
        error: 'Failed to queue event',
      };
    }
  }

  // Process events in batches for optimal performance
  async processBatch(
    priority: number,
    maxBatchSize?: number,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const batchSize = maxBatchSize || this.config.batchSize;

    try {
      const queue = this.queues.get(priority) || [];
      if (queue.length === 0) {
        return {
          success: true,
          processedCount: 0,
          failedCount: 0,
          errors: [],
          processingTime: 0,
        };
      }

      // Filter events ready for processing
      const now = Date.now();
      const readyEvents = queue.filter(
        (event) => !event.processAfter || event.processAfter <= now,
      );

      if (readyEvents.length === 0) {
        return {
          success: true,
          processedCount: 0,
          failedCount: 0,
          errors: [],
          processingTime: 0,
        };
      }

      // Take batch from ready events
      const batch = readyEvents.slice(0, batchSize);
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Remove batched events from queue
      for (const event of batch) {
        const index = queue.indexOf(event);
        if (index > -1) {
          queue.splice(index, 1);
        }
      }

      const eventBatch: EventBatch = {
        id: batchId,
        events: batch,
        priority: priority,
        createdAt: Date.now(),
        size: batch.length,
        weddingId: this.getBatchWeddingId(batch),
      };

      this.batchProcessors.set(batchId, eventBatch);

      // Process the batch
      const result = await this.processBatchInternal(eventBatch);

      // Clean up batch processor
      this.batchProcessors.delete(batchId);

      // Update stats
      this.stats.batchesProcessed++;
      this.stats.totalProcessed += result.processedCount;
      this.stats.totalFailed += result.failedCount;

      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);

      // Handle failed events
      if (result.failedCount > 0) {
        await this.handleFailedEvents(batch, result.errors);
      }

      this.emit('batch_processed', {
        batchId,
        priority,
        size: batch.length,
        processed: result.processedCount,
        failed: result.failedCount,
        processingTime,
      });

      return {
        ...result,
        processingTime,
      };
    } catch (error) {
      console.error('Batch processing error:', error);
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [error.message],
        processingTime: Date.now() - startTime,
      };
    }
  }

  // Wedding-specific batch processing with optimizations
  async processWeddingEventBatch(weddingId: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    const allWeddingEvents: QueuedEvent[] = [];

    // Collect events for this wedding across all priority queues
    for (const [priority, queue] of this.queues.entries()) {
      const weddingEvents = queue.filter(
        (event) => event.weddingId === weddingId,
      );
      allWeddingEvents.push(...weddingEvents);
    }

    if (allWeddingEvents.length === 0) {
      return {
        success: true,
        processedCount: 0,
        failedCount: 0,
        errors: [],
        processingTime: 0,
      };
    }

    // Sort by priority (higher priority first) then by queue time
    allWeddingEvents.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.queuedAt - b.queuedAt; // Earlier first
    });

    // Create wedding-specific batch
    const batch = allWeddingEvents.slice(0, this.config.batchSize);
    const batchId = `wedding_batch_${weddingId}_${Date.now()}`;

    // Remove batched events from their respective queues
    for (const event of batch) {
      const queue = this.queues.get(event.priority) || [];
      const index = queue.indexOf(event);
      if (index > -1) {
        queue.splice(index, 1);
      }
    }

    const eventBatch: EventBatch = {
      id: batchId,
      events: batch,
      priority: Math.max(...batch.map((e) => e.priority)),
      createdAt: Date.now(),
      size: batch.length,
      weddingId: weddingId,
    };

    // Process the wedding batch
    const result = await this.processWeddingBatchInternal(eventBatch);

    return {
      ...result,
      processingTime: Date.now() - startTime,
    };
  }

  // High-throughput processing for peak loads
  async processHighThroughputMode(): Promise<{
    processed: number;
    throughput: number;
  }> {
    const startTime = Date.now();
    let totalProcessed = 0;
    const maxDuration = 5000; // 5 seconds max processing time

    while (Date.now() - startTime < maxDuration) {
      let hasWork = false;

      // Process high priority queues first
      for (let priority = this.maxPriority; priority >= 1; priority--) {
        const queue = this.queues.get(priority) || [];
        if (queue.length > 0) {
          hasWork = true;
          const result = await this.processBatch(priority, 50); // Smaller batches for speed
          totalProcessed += result.processedCount;

          // Break if we're not keeping up
          if (result.processingTime > 100) {
            // >100ms per batch
            break;
          }
        }
      }

      if (!hasWork) {
        break;
      }

      // Yield control briefly
      await new Promise((resolve) => setImmediate(resolve));
    }

    const duration = Date.now() - startTime;
    const throughput = (totalProcessed / duration) * 60000; // events per minute

    this.emit('high_throughput_processed', {
      processed: totalProcessed,
      duration,
      throughput,
    });

    return { processed: totalProcessed, throughput };
  }

  // Get queue statistics and health metrics
  getQueueStats(): QueueStats {
    this.updateQueueSizeStats();
    this.calculateThroughput();
    this.stats.lastUpdated = new Date();
    return { ...this.stats };
  }

  // Get events waiting in queue for specific wedding
  getWeddingQueueStatus(weddingId: string): {
    totalEvents: number;
    priorityBreakdown: Map<number, number>;
    oldestEvent: Date | null;
    estimatedProcessingTime: number;
  } {
    let totalEvents = 0;
    const priorityBreakdown = new Map<number, number>();
    let oldestTimestamp = Infinity;

    for (const [priority, queue] of this.queues.entries()) {
      const weddingEvents = queue.filter(
        (event) => event.weddingId === weddingId,
      );
      if (weddingEvents.length > 0) {
        totalEvents += weddingEvents.length;
        priorityBreakdown.set(priority, weddingEvents.length);

        const earliest = Math.min(...weddingEvents.map((e) => e.queuedAt));
        oldestTimestamp = Math.min(oldestTimestamp, earliest);
      }
    }

    const oldestEvent =
      oldestTimestamp === Infinity ? null : new Date(oldestTimestamp);
    const estimatedProcessingTime = this.estimateProcessingTime(totalEvents);

    return {
      totalEvents,
      priorityBreakdown,
      oldestEvent,
      estimatedProcessingTime,
    };
  }

  // Pause/resume processing (for maintenance or emergency)
  pauseProcessing(): void {
    this.isProcessing = false;

    // Clear all processing timers
    for (const timer of this.processingTimers.values()) {
      clearTimeout(timer);
    }
    this.processingTimers.clear();

    this.emit('processing_paused');
  }

  resumeProcessing(): void {
    this.isProcessing = true;

    // Restart batch processing for all priorities
    for (let priority = 1; priority <= this.config.priorityLevels; priority++) {
      this.scheduleBatchProcessing(priority);
    }

    this.emit('processing_resumed');
  }

  // Flush all queues (for shutdown or emergency)
  async flushAllQueues(): Promise<{ processed: number; failed: number }> {
    let totalProcessed = 0;
    let totalFailed = 0;

    // Process all priority queues
    for (let priority = this.maxPriority; priority >= 1; priority--) {
      while (true) {
        const result = await this.processBatch(priority);
        totalProcessed += result.processedCount;
        totalFailed += result.failedCount;

        if (result.processedCount === 0) {
          break; // No more events in this priority queue
        }
      }
    }

    // Clear any remaining events to dead letter queue
    const remainingEvents = this.getTotalQueueSize();
    if (remainingEvents > 0) {
      await this.moveAllToDeadLetter();
      totalFailed += remainingEvents;
    }

    this.emit('queues_flushed', {
      processed: totalProcessed,
      failed: totalFailed,
    });

    return { processed: totalProcessed, failed: totalFailed };
  }

  // Shutdown queue manager gracefully
  async shutdown(): Promise<void> {
    console.log('Shutting down event queue manager...');

    this.pauseProcessing();

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Try to process remaining events
    const flushResult = await this.flushAllQueues();
    console.log(
      `Queue shutdown: processed ${flushResult.processed}, failed ${flushResult.failed}`,
    );

    // Persist if enabled
    if (this.config.enablePersistence) {
      await this.persistQueues();
    }

    console.log('Event queue manager shutdown complete');
  }

  // Private helper methods
  private startBackgroundTasks(): void {
    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.updateStats();
    }, 5000); // Every 5 seconds

    // Start automatic batch processing
    this.isProcessing = true;
    for (let priority = 1; priority <= this.config.priorityLevels; priority++) {
      this.scheduleBatchProcessing(priority);
    }
  }

  private scheduleBatchProcessing(priority: number): void {
    if (!this.isProcessing) return;

    const timeout = this.config.batchTimeout / priority; // Higher priority = shorter timeout
    const timer = setTimeout(async () => {
      await this.processBatch(priority);
      this.scheduleBatchProcessing(priority); // Reschedule
    }, timeout);

    this.processingTimers.set(priority, timer);
  }

  private async checkBatchProcessingConditions(
    priority: number,
  ): Promise<void> {
    const queue = this.queues.get(priority) || [];

    // Trigger immediate processing if batch is full or high priority
    if (
      queue.length >= this.config.batchSize ||
      (priority >= 4 && queue.length >= Math.floor(this.config.batchSize / 2))
    ) {
      // Clear existing timer for this priority
      const existingTimer = this.processingTimers.get(priority);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Process immediately
      await this.processBatch(priority);

      // Reschedule
      this.scheduleBatchProcessing(priority);
    }
  }

  private async processBatchInternal(
    batch: EventBatch,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      // Group events by type for optimized processing
      const eventsByType = this.groupEventsByType(batch.events);

      // Process each type group
      for (const [eventType, events] of eventsByType.entries()) {
        try {
          const typeResult = await this.processEventTypeGroup(
            eventType,
            events,
          );
          processedCount += typeResult.processed;
          failedCount += typeResult.failed;
          errors.push(...typeResult.errors);
        } catch (error) {
          failedCount += events.length;
          errors.push(
            `Failed to process ${eventType} events: ${error.message}`,
          );
        }
      }

      return {
        success: processedCount > 0,
        processedCount,
        failedCount,
        errors,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        processedCount: 0,
        failedCount: batch.events.length,
        errors: [error.message],
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async processWeddingBatchInternal(
    batch: EventBatch,
  ): Promise<ProcessingResult> {
    // Wedding-specific optimizations
    const startTime = Date.now();

    // Sort events for optimal processing order (presence updates first, then conflicts)
    const sortedEvents = batch.events.sort((a, b) => {
      const typeOrder =
        this.getEventTypeOrder(a.event.type) -
        this.getEventTypeOrder(b.event.type);
      if (typeOrder !== 0) return typeOrder;
      return a.queuedAt - b.queuedAt;
    });

    // Process in optimized order
    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const queuedEvent of sortedEvents) {
      try {
        await this.processIndividualEvent(queuedEvent);
        processedCount++;
      } catch (error) {
        failedCount++;
        errors.push(
          `Failed to process event ${queuedEvent.id}: ${error.message}`,
        );
      }
    }

    return {
      success: processedCount > 0,
      processedCount,
      failedCount,
      errors,
      processingTime: Date.now() - startTime,
    };
  }

  private groupEventsByType(events: QueuedEvent[]): Map<string, QueuedEvent[]> {
    const groups = new Map<string, QueuedEvent[]>();

    for (const event of events) {
      const type = event.eventType;
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(event);
    }

    return groups;
  }

  private async processEventTypeGroup(
    eventType: string,
    events: QueuedEvent[],
  ): Promise<{ processed: number; failed: number; errors: string[] }> {
    // Implement type-specific batch processing optimizations
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Batch similar operations for better performance
    switch (eventType) {
      case 'presence_change':
        // Batch presence updates
        const presenceResult = await this.processBatchedPresenceUpdates(events);
        processed += presenceResult.processed;
        failed += presenceResult.failed;
        errors.push(...presenceResult.errors);
        break;

      case 'timeline_update':
      case 'budget_change':
        // Process critical updates immediately
        for (const event of events) {
          try {
            await this.processIndividualEvent(event);
            processed++;
          } catch (error) {
            failed++;
            errors.push(error.message);
          }
        }
        break;

      default:
        // Default batch processing
        for (const event of events) {
          try {
            await this.processIndividualEvent(event);
            processed++;
          } catch (error) {
            failed++;
            errors.push(error.message);
          }
        }
    }

    return { processed, failed, errors };
  }

  private async processBatchedPresenceUpdates(
    events: QueuedEvent[],
  ): Promise<{ processed: number; failed: number; errors: string[] }> {
    // Optimize presence updates by batching by user
    const userUpdates = new Map<string, QueuedEvent>();

    // Keep only the latest presence update per user
    for (const event of events) {
      const userId = event.event.user_id;
      const existing = userUpdates.get(userId);

      if (!existing || event.queuedAt > existing.queuedAt) {
        userUpdates.set(userId, event);
      }
    }

    // Process the optimized set
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const event of userUpdates.values()) {
      try {
        await this.processIndividualEvent(event);
        processed++;
      } catch (error) {
        failed++;
        errors.push(error.message);
      }
    }

    return { processed, failed, errors };
  }

  private async processIndividualEvent(event: QueuedEvent): Promise<void> {
    // Emit event for processing by the event streaming service
    this.emit('process_event', {
      event: event.event,
      queuedEvent: event,
      processingAttempt: event.retryCount + 1,
    });
  }

  private async processLowPriorityBatch(): Promise<void> {
    // Process a small batch of low priority events to make space
    await this.processBatch(1, 10);
  }

  private getBatchWeddingId(events: QueuedEvent[]): string | undefined {
    // If all events are for the same wedding, return that ID
    const weddingIds = new Set(events.map((e) => e.weddingId));
    return weddingIds.size === 1 ? Array.from(weddingIds)[0] : undefined;
  }

  private getEventTypeOrder(eventType: string): number {
    // Define processing order for event types
    const orderMap: { [key: string]: number } = {
      presence_change: 1,
      user_joined: 2,
      user_left: 3,
      timeline_update: 4,
      budget_change: 5,
      vendor_coordination: 6,
      guest_update: 7,
      conflict_detected: 8,
      conflict_resolved: 9,
    };
    return orderMap[eventType] || 10;
  }

  private getTotalQueueSize(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  private updateQueueSizeStats(): void {
    this.stats.queueSizes.clear();
    for (const [priority, queue] of this.queues.entries()) {
      this.stats.queueSizes.set(priority, queue.length);
    }
  }

  private calculateThroughput(): void {
    // Calculate current throughput based on recent processing
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // This would be calculated from actual processing events
    // For now, use processed count as approximation
    this.stats.currentThroughput = this.stats.totalProcessed;
  }

  private updateAverageProcessingTime(newTime: number): void {
    const alpha = 0.1; // Smoothing factor
    this.stats.averageProcessingTime =
      alpha * newTime + (1 - alpha) * this.stats.averageProcessingTime;
  }

  private estimateProcessingTime(eventCount: number): number {
    const avgTimePerEvent =
      this.stats.averageProcessingTime / this.config.batchSize;
    return avgTimePerEvent * eventCount;
  }

  private async handleFailedEvents(
    events: QueuedEvent[],
    errors: string[],
  ): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      event.retryCount++;

      if (event.retryCount < this.config.maxRetries) {
        // Retry with exponential backoff
        event.processAfter =
          Date.now() +
          this.config.retryDelay * Math.pow(2, event.retryCount - 1);

        // Re-queue for retry
        const queue = this.queues.get(event.priority) || [];
        queue.push(event);
      } else {
        // Move to dead letter queue
        if (this.deadLetterQueue.length < this.config.deadLetterQueueSize) {
          this.deadLetterQueue.push(event);
          this.stats.deadLetterCount++;
        }
      }
    }
  }

  private async moveAllToDeadLetter(): Promise<void> {
    for (const queue of this.queues.values()) {
      while (
        queue.length > 0 &&
        this.deadLetterQueue.length < this.config.deadLetterQueueSize
      ) {
        const event = queue.shift();
        if (event) {
          this.deadLetterQueue.push(event);
          this.stats.deadLetterCount++;
        }
      }
      queue.length = 0; // Clear remaining
    }
  }

  private updateStats(): void {
    this.updateQueueSizeStats();
    this.calculateThroughput();
    this.stats.lastUpdated = new Date();
    this.emit('stats_updated', this.stats);
  }

  private async persistQueues(): Promise<void> {
    // In a real implementation, this would persist queue state to disk
    console.log('Persisting queue state...');
  }
}
