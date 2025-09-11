/**
 * WS-201: Webhook Delivery Queue Management System
 * Team B - Backend/API Implementation
 *
 * Provides high-performance webhook delivery queue management:
 * - Priority-based queue processing
 * - Batch operations for high throughput
 * - Wedding industry specific prioritization
 * - Database-backed queue with health monitoring
 * - Connection pooling and resource management
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ================================================
// TYPES AND INTERFACES
// ================================================

export interface QueueConfig {
  batchSize: number;
  processingInterval: number; // milliseconds
  maxConcurrentDeliveries: number;
  healthCheckInterval: number; // milliseconds
  deadLetterThreshold: number;
  priorityLevels: number;
}

export interface WebhookDelivery {
  id: string;
  event_id: string;
  webhook_endpoint_id: string;
  organization_id: string;
  event_type: string;
  payload: any;
  signature: string;
  priority: number;
  status:
    | 'pending'
    | 'processing'
    | 'delivered'
    | 'failed'
    | 'permanently_failed'
    | 'retrying';
  attempt_count: number;
  max_retries: number;
  scheduled_at: string;
  next_retry_at?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface QueueItem {
  id: string;
  delivery_id: string;
  organization_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  scheduled_for: string;
  processing_started_at?: string;
  processing_node?: string;
  lock_expires_at?: string;
  retry_delay_seconds: number;
  max_processing_time_seconds: number;
  queue_metadata?: Record<string, any>;
  created_at: string;
}

export interface ProcessingResults {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    deliveryId: string;
    error: string;
  }>;
}

export interface QueueStatus {
  queuedItems: number;
  processingItems: number;
  completedItems: number;
  failedItems: number;
  oldestQueuedItem?: Date;
  averageProcessingTime: number;
  healthScore: number;
}

export interface QueueHealth {
  isHealthy: boolean;
  queueDepth: number;
  processingRate: number;
  errorRate: number;
  averageLatency: number;
  circuitBreakerStatus: Record<string, string>;
  lastProcessingTime: Date;
  issues: string[];
}

// ================================================
// VALIDATION SCHEMAS
// ================================================

export const queueConfigSchema = z.object({
  batchSize: z.number().min(1).max(100).default(10),
  processingInterval: z.number().min(1000).max(300000).default(30000), // 30 seconds
  maxConcurrentDeliveries: z.number().min(1).max(50).default(5),
  healthCheckInterval: z.number().min(10000).max(300000).default(60000), // 1 minute
  deadLetterThreshold: z.number().min(3).max(20).default(5),
  priorityLevels: z.number().min(3).max(10).default(10),
});

export const deliveryPrioritySchema = z.object({
  eventType: z.string(),
  isBusinessCritical: z.boolean().default(false),
  isWeddingDay: z.boolean().default(false),
  organizationTier: z
    .enum(['free', 'starter', 'professional', 'scale', 'enterprise'])
    .default('starter'),
});

// ================================================
// WEBHOOK DELIVERY QUEUE CLASS
// ================================================

class WebhookDeliveryQueue {
  private config: QueueConfig;
  private supabase: SupabaseClient;
  private processingTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private isProcessing: boolean = false;
  private nodeId: string;
  private startTime: Date = new Date();

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: Partial<QueueConfig> = {},
  ) {
    this.config = queueConfigSchema.parse(config);
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start the queue processor
   */
  start(): void {
    if (this.processingTimer) {
      return; // Already started
    }

    console.log(
      `Starting webhook delivery queue processor (Node: ${this.nodeId})`,
    );

    // Start processing timer
    this.processingTimer = setInterval(
      () => this.processQueue(),
      this.config.processingInterval,
    );

    // Start health check timer
    this.healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheckInterval,
    );

    // Process immediately on start
    this.processQueue();
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    console.log(
      `Stopped webhook delivery queue processor (Node: ${this.nodeId})`,
    );
  }

  /**
   * Enqueue webhook delivery with priority calculation
   */
  async enqueueDelivery(
    delivery: Omit<WebhookDelivery, 'id' | 'created_at'>,
  ): Promise<{
    success: boolean;
    deliveryId?: string;
    queueId?: string;
    error?: string;
  }> {
    try {
      // Calculate priority based on wedding industry factors
      const priority = this.calculatePriority({
        eventType: delivery.event_type,
        isBusinessCritical:
          (delivery.metadata as any)?.isBusinessCritical || false,
        isWeddingDay: this.isWeddingDayEvent(delivery.event_type),
        organizationTier:
          (delivery.metadata as any)?.organizationTier || 'starter',
      });

      // Insert delivery record
      const { data: deliveryData, error: deliveryError } = await this.supabase
        .from('webhook_deliveries')
        .insert({
          event_id: delivery.event_id,
          webhook_endpoint_id: delivery.webhook_endpoint_id,
          organization_id: delivery.organization_id,
          event_type: delivery.event_type,
          payload: delivery.payload,
          signature: delivery.signature,
          priority: priority,
          status: delivery.status,
          attempt_count: delivery.attempt_count || 0,
          max_retries: delivery.max_retries || 5,
          scheduled_at: delivery.scheduled_at,
          metadata: {
            ...delivery.metadata,
            enqueuedAt: new Date().toISOString(),
            nodeId: this.nodeId,
            calculatedPriority: priority,
          },
        })
        .select('id')
        .single();

      if (deliveryError) throw deliveryError;

      // Add to queue
      const scheduledFor = new Date(delivery.scheduled_at || Date.now());
      const { data: queueData, error: queueError } = await this.supabase
        .from('webhook_delivery_queue')
        .insert({
          delivery_id: deliveryData.id,
          organization_id: delivery.organization_id,
          priority: priority,
          scheduled_for: scheduledFor.toISOString(),
          retry_delay_seconds: this.calculateRetryDelay(
            delivery.attempt_count || 0,
          ),
          max_processing_time_seconds: this.getProcessingTimeout(
            delivery.event_type,
          ),
          queue_metadata: {
            eventType: delivery.event_type,
            enqueuedBy: this.nodeId,
            isWeddingDay: this.isWeddingDayEvent(delivery.event_type),
            isBusinessCritical:
              (delivery.metadata as any)?.isBusinessCritical || false,
          },
        })
        .select('id')
        .single();

      if (queueError) throw queueError;

      return {
        success: true,
        deliveryId: deliveryData.id,
        queueId: queueData.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Failed to enqueue webhook delivery:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Process queue with batch processing and priority handling
   */
  async processQueue(batchSize?: number): Promise<ProcessingResults> {
    if (this.isProcessing) {
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 1,
        errors: [{ deliveryId: 'queue', error: 'Already processing' }],
      };
    }

    this.isProcessing = true;
    const effectiveBatchSize = batchSize || this.config.batchSize;

    try {
      // Get items from queue with priority ordering
      const { data: queueItems, error: queueError } = await this.supabase
        .from('webhook_delivery_queue')
        .select(
          `
          id,
          delivery_id,
          organization_id,
          priority,
          scheduled_for,
          queue_metadata,
          webhook_deliveries!inner(*)
        `,
        )
        .eq('status', 'queued')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: false }) // Higher priority first
        .order('scheduled_for', { ascending: true }) // Older first within same priority
        .limit(effectiveBatchSize);

      if (queueError) throw queueError;

      if (!queueItems || queueItems.length === 0) {
        return {
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          errors: [],
        };
      }

      // Process items concurrently with limits
      const results = await Promise.allSettled(
        queueItems
          .slice(0, this.config.maxConcurrentDeliveries)
          .map((item) => this.processQueueItem(item as any)),
      );

      // Analyze results
      let successful = 0;
      let failed = 0;
      const errors: Array<{ deliveryId: string; error: string }> = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successful++;
          } else {
            failed++;
            errors.push({
              deliveryId: queueItems[index].delivery_id,
              error: result.value.error || 'Unknown error',
            });
          }
        } else {
          failed++;
          errors.push({
            deliveryId: queueItems[index].delivery_id,
            error: result.reason?.message || 'Processing failed',
          });
        }
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `Queue processing complete: ${successful} successful, ${failed} failed`,
        );
      }

      return {
        processed: results.length,
        successful,
        failed,
        skipped: 0,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Queue processing failed:', errorMessage);
      return {
        processed: 0,
        successful: 0,
        failed: 1,
        skipped: 0,
        errors: [{ deliveryId: 'queue', error: error.message }],
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual queue item
   */
  private async processQueueItem(
    item: QueueItem & { webhook_deliveries: WebhookDelivery },
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const lockExpiry = new Date(
      Date.now() + item.max_processing_time_seconds * 1000,
    );

    try {
      // Lock the item for processing
      const { error: lockError } = await this.supabase
        .from('webhook_delivery_queue')
        .update({
          status: 'processing',
          processing_started_at: new Date().toISOString(),
          processing_node: this.nodeId,
          lock_expires_at: lockExpiry.toISOString(),
        })
        .eq('id', item.id)
        .eq('status', 'queued'); // Only update if still queued

      if (lockError) throw lockError;

      // Get webhook endpoint configuration
      const { data: endpoint, error: endpointError } = await this.supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('id', item.webhook_deliveries.webhook_endpoint_id)
        .single();

      if (endpointError) throw endpointError;

      if (!endpoint.is_active) {
        throw new Error('Webhook endpoint is inactive');
      }

      // Perform webhook delivery
      const deliveryResult = await this.deliverWebhook(
        endpoint.endpoint_url,
        item.webhook_deliveries.payload,
        {
          ...endpoint.headers,
          'X-Webhook-Signature-256': item.webhook_deliveries.signature,
          'X-Webhook-Event-Type': item.webhook_deliveries.event_type,
          'X-Webhook-Delivery-ID': item.webhook_deliveries.id,
          'Content-Type': 'application/json',
        },
        endpoint.timeout_seconds * 1000,
      );

      if (deliveryResult.success) {
        // Update delivery as successful
        await this.supabase
          .from('webhook_deliveries')
          .update({
            status: 'delivered',
            response_status: deliveryResult.status,
            response_body: deliveryResult.body,
            response_headers: deliveryResult.headers,
            response_time_ms: deliveryResult.responseTime,
            completed_at: new Date().toISOString(),
          })
          .eq('id', item.webhook_deliveries.id);

        // Mark queue item as completed
        await this.supabase
          .from('webhook_delivery_queue')
          .update({
            status: 'completed',
          })
          .eq('id', item.id);

        return { success: true };
      } else {
        // Handle delivery failure
        const shouldRetry =
          item.webhook_deliveries.attempt_count <
          item.webhook_deliveries.max_retries;

        if (shouldRetry) {
          // Schedule retry
          const nextRetryAt = new Date(
            Date.now() + item.retry_delay_seconds * 1000,
          );

          await this.supabase
            .from('webhook_deliveries')
            .update({
              status: 'retrying',
              attempt_count: item.webhook_deliveries.attempt_count + 1,
              next_retry_at: nextRetryAt.toISOString(),
              error_message: deliveryResult.error,
              error_code: deliveryResult.statusCode?.toString(),
              response_status: deliveryResult.status,
            })
            .eq('id', item.webhook_deliveries.id);

          // Requeue with exponential backoff
          await this.enqueueDelivery({
            ...item.webhook_deliveries,
            status: 'retrying',
            attempt_count: item.webhook_deliveries.attempt_count + 1,
            scheduled_at: nextRetryAt.toISOString(),
          });
        } else {
          // Mark as permanently failed
          await this.supabase
            .from('webhook_deliveries')
            .update({
              status: 'permanently_failed',
              error_message: deliveryResult.error,
              error_code: deliveryResult.statusCode?.toString(),
              response_status: deliveryResult.status,
              failed_at: new Date().toISOString(),
            })
            .eq('id', item.webhook_deliveries.id);

          // Move to dead letter queue (handled by database trigger)
        }

        // Mark queue item as failed
        await this.supabase
          .from('webhook_delivery_queue')
          .update({
            status: 'failed',
          })
          .eq('id', item.id);

        return { success: false, error: deliveryResult.error };
      }
    } catch (error) {
      // Mark queue item as failed
      try {
        await this.supabase
          .from('webhook_delivery_queue')
          .update({
            status: 'failed',
          })
          .eq('id', item.id);
      } catch {
        // Ignore secondary failures during error handling
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliverWebhook(
    url: string,
    payload: any,
    headers: Record<string, string>,
    timeout: number,
  ): Promise<{
    success: boolean;
    status?: number;
    statusCode?: number;
    body?: string;
    headers?: Record<string, string>;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();

      if (response.ok) {
        return {
          success: true,
          status: response.status,
          body: responseBody,
          headers: Object.fromEntries(response.headers.entries()),
          responseTime,
        };
      } else {
        return {
          success: false,
          status: response.status,
          statusCode: response.status,
          body: responseBody,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        responseTime,
        error: error.message,
        statusCode: error.name === 'AbortError' ? 408 : undefined,
      };
    }
  }

  /**
   * Calculate priority based on wedding industry factors
   */
  private calculatePriority(factors: {
    eventType: string;
    isBusinessCritical: boolean;
    isWeddingDay: boolean;
    organizationTier: string;
  }): number {
    let priority = 5; // Base priority

    // Wedding day events get highest priority
    if (factors.isWeddingDay) {
      priority = 10;
    } else if (factors.isBusinessCritical) {
      priority = 9;
    } else if (factors.eventType.startsWith('payment.')) {
      priority = 8;
    } else if (factors.eventType.startsWith('client.')) {
      priority = 7;
    } else if (factors.eventType.startsWith('form.')) {
      priority = 6;
    }

    // Adjust for organization tier
    switch (factors.organizationTier) {
      case 'enterprise':
        priority = Math.min(priority + 2, 10);
        break;
      case 'scale':
        priority = Math.min(priority + 1, 10);
        break;
      case 'free':
        priority = Math.max(priority - 2, 1);
        break;
    }

    return priority;
  }

  /**
   * Check if event is wedding day related
   */
  private isWeddingDayEvent(eventType: string): boolean {
    const weddingDayEvents = [
      'wedding.day_started',
      'wedding.ceremony_completed',
      'wedding.emergency',
      'client.wedding_day_update',
    ];

    return (
      weddingDayEvents.includes(eventType) ||
      eventType.includes('wedding_day') ||
      eventType.includes('emergency')
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attemptCount: number): number {
    const delays = [0, 60, 120, 240, 480, 960]; // 0, 1, 2, 4, 8, 16 minutes
    return delays[Math.min(attemptCount, delays.length - 1)];
  }

  /**
   * Get processing timeout based on event type
   */
  private getProcessingTimeout(eventType: string): number {
    if (this.isWeddingDayEvent(eventType)) {
      return 60; // 1 minute for wedding day events
    } else if (eventType.startsWith('payment.')) {
      return 90; // 1.5 minutes for payment events
    } else {
      return 300; // 5 minutes for other events
    }
  }

  /**
   * Get queue status and metrics
   */
  async getQueueStatus(): Promise<QueueStatus> {
    try {
      const [queueStats, avgProcessingTime] = await Promise.all([
        this.supabase
          .from('webhook_delivery_queue')
          .select('status')
          .then(({ data }) => {
            const stats = { queued: 0, processing: 0, completed: 0, failed: 0 };
            data?.forEach((item) => {
              stats[item.status as keyof typeof stats]++;
            });
            return stats;
          }),

        this.supabase
          .from('webhook_deliveries')
          .select('response_time_ms')
          .not('response_time_ms', 'is', null)
          .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
          .then(({ data }) => {
            if (!data || data.length === 0) return 0;
            const total = data.reduce(
              (sum, item) => sum + (item.response_time_ms || 0),
              0,
            );
            return total / data.length;
          }),
      ]);

      // Get oldest queued item
      const { data: oldestItem } = await this.supabase
        .from('webhook_delivery_queue')
        .select('created_at')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      // Calculate health score
      const totalItems = Object.values(queueStats).reduce(
        (sum, count) => sum + count,
        0,
      );
      const healthScore =
        totalItems > 0
          ? Math.round(
              ((queueStats.completed + queueStats.processing) / totalItems) *
                100,
            ) / 100
          : 1.0;

      return {
        queuedItems: queueStats.queued,
        processingItems: queueStats.processing,
        completedItems: queueStats.completed,
        failedItems: queueStats.failed,
        oldestQueuedItem: oldestItem
          ? new Date(oldestItem.created_at)
          : undefined,
        averageProcessingTime: Math.round(avgProcessingTime),
        healthScore,
      };
    } catch (error) {
      console.error('Failed to get queue status:', error);
      return {
        queuedItems: 0,
        processingItems: 0,
        completedItems: 0,
        failedItems: 0,
        averageProcessingTime: 0,
        healthScore: 0,
      };
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<QueueHealth> {
    try {
      const status = await this.getQueueStatus();
      const uptime = Date.now() - this.startTime.getTime();
      const issues: string[] = [];

      // Check queue depth
      if (status.queuedItems > 100) {
        issues.push(`High queue depth: ${status.queuedItems} items`);
      }

      // Check processing rate
      const processingRate =
        uptime > 0 ? status.completedItems / (uptime / 60000) : 0; // per minute
      if (processingRate < 1 && status.queuedItems > 0) {
        issues.push(`Low processing rate: ${processingRate.toFixed(2)}/min`);
      }

      // Check error rate
      const totalProcessed = status.completedItems + status.failedItems;
      const errorRate =
        totalProcessed > 0 ? status.failedItems / totalProcessed : 0;
      if (errorRate > 0.1) {
        issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      }

      // Check oldest item age
      if (status.oldestQueuedItem) {
        const age = Date.now() - status.oldestQueuedItem.getTime();
        if (age > 3600000) {
          // 1 hour
          issues.push(`Old items in queue: ${Math.round(age / 60000)} minutes`);
        }
      }

      const health: QueueHealth = {
        isHealthy: issues.length === 0,
        queueDepth: status.queuedItems,
        processingRate,
        errorRate,
        averageLatency: status.averageProcessingTime,
        circuitBreakerStatus: {}, // Would be populated from retry handler
        lastProcessingTime: new Date(),
        issues,
      };

      if (process.env.NODE_ENV === 'development' && !health.isHealthy) {
        console.warn('[Queue Health Issues]', health.issues);
      }

      return health;
    } catch (error) {
      return {
        isHealthy: false,
        queueDepth: -1,
        processingRate: -1,
        errorRate: -1,
        averageLatency: -1,
        circuitBreakerStatus: {},
        lastProcessingTime: new Date(),
        issues: [`Health check failed: ${error.message}`],
      };
    }
  }

  /**
   * Priority-based business critical delivery
   */
  async prioritizeBusinessCriticalDeliveries(): Promise<{
    success: boolean;
    prioritized: number;
  }> {
    try {
      // Update priority for business critical deliveries
      const { data, error } = await this.supabase
        .from('webhook_delivery_queue')
        .update({ priority: 10 })
        .eq('status', 'queued')
        .eq('queue_metadata->>isBusinessCritical', 'true')
        .select('id');

      if (error) throw error;

      return {
        success: true,
        prioritized: data?.length || 0,
      };
    } catch (error) {
      return {
        success: false,
        prioritized: 0,
      };
    }
  }

  /**
   * Clean up old queue entries
   */
  async cleanupOldEntries(
    olderThanHours: number = 24,
  ): Promise<{ success: boolean; deleted: number }> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanHours * 3600000);

      const { data, error } = await this.supabase
        .from('webhook_delivery_queue')
        .delete()
        .in('status', ['completed', 'failed'])
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) throw error;

      return {
        success: true,
        deleted: data?.length || 0,
      };
    } catch (error) {
      return {
        success: false,
        deleted: 0,
      };
    }
  }
}

// ================================================
// SINGLETON QUEUE MANAGER
// ================================================

let queueInstance: WebhookDeliveryQueue | null = null;

function getQueueInstance(
  supabaseUrl?: string,
  supabaseKey?: string,
  config?: Partial<QueueConfig>,
): WebhookDeliveryQueue {
  if (!queueInstance && supabaseUrl && supabaseKey) {
    queueInstance = new WebhookDeliveryQueue(supabaseUrl, supabaseKey, config);
  }

  if (!queueInstance) {
    throw new Error(
      'Queue instance not initialized. Provide Supabase credentials.',
    );
  }

  return queueInstance;
}

// ================================================
// EXPORTS
// ================================================

export default WebhookDeliveryQueue;

export { WebhookDeliveryQueue, getQueueInstance };
