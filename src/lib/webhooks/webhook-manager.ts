/**
 * WS-201: WedSync Webhook Manager - Core Functionality
 * Team B - Backend/API Implementation
 *
 * Comprehensive webhook management system for wedding industry:
 * - Wedding industry event handling (200+ daily notifications)
 * - Secure webhook delivery with HMAC validation
 * - Integration with photography CRM workflows
 * - Business-critical event prioritization
 * - Real-time analytics and monitoring
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  WebhookSecurity,
  WebhookSignatureValidator,
  WebhookSecurityLogger,
} from './webhook-security';
import {
  WebhookRetryHandler,
  WeddingIndustryRetryPolicies,
} from './retry-handler';
import { WebhookDeliveryQueue, getQueueInstance } from './delivery-queue';
import { z } from 'zod';

// ================================================
// TYPES AND INTERFACES
// ================================================

export interface WebhookEventData {
  eventType: string;
  organizationId: string;
  payload: any;
  metadata?: {
    clientId?: string;
    weddingId?: string;
    supplierId?: string;
    isBusinessCritical?: boolean;
    isWeddingDay?: boolean;
    organizationTier?:
      | 'free'
      | 'starter'
      | 'professional'
      | 'scale'
      | 'enterprise';
    source?: string;
    timestamp?: string;
  };
}

export interface WebhookEndpoint {
  id: string;
  organization_id: string;
  endpoint_url: string;
  secret_key: string;
  description?: string;
  integration_type: string;
  subscribed_events: string[];
  is_active: boolean;
  business_critical: boolean;
  headers?: Record<string, string>;
  timeout_seconds: number;
  retry_count: number;
  auth_config?: Record<string, any>;
  validation_config?: Record<string, any>;
}

export interface WebhookTriggerResult {
  success: boolean;
  triggeredEndpoints: number;
  failedEndpoints: number;
  deliveryIds: string[];
  errors?: Array<{
    endpointId: string;
    error: string;
  }>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  status?: 'delivered' | 'failed' | 'retrying' | 'permanently_failed';
  responseStatus?: number;
  responseTime?: number;
  error?: string;
  retryScheduled?: boolean;
  nextRetryAt?: Date;
}

export interface WeddingEventContext {
  clientId: string;
  weddingDate: string;
  venue?: string;
  supplierId: string;
  photographerId?: string;
  isWeddingDay: boolean;
  emergencyContact?: string;
}

// ================================================
// VALIDATION SCHEMAS
// ================================================

export const webhookEventDataSchema = z.object({
  eventType: z.string().min(1),
  organizationId: z.string().uuid(),
  payload: z.record(z.any()),
  metadata: z
    .object({
      clientId: z.string().uuid().optional(),
      weddingId: z.string().uuid().optional(),
      supplierId: z.string().uuid().optional(),
      isBusinessCritical: z.boolean().default(false),
      isWeddingDay: z.boolean().default(false),
      organizationTier: z
        .enum(['free', 'starter', 'professional', 'scale', 'enterprise'])
        .default('starter'),
      source: z.string().optional(),
      timestamp: z.string().optional(),
    })
    .optional(),
});

export const weddingEventContextSchema = z.object({
  clientId: z.string().uuid(),
  weddingDate: z.string().datetime(),
  venue: z.string().optional(),
  supplierId: z.string().uuid(),
  photographerId: z.string().uuid().optional(),
  isWeddingDay: z.boolean(),
  emergencyContact: z.string().optional(),
});

// ================================================
// WEDSYNC WEBHOOK MANAGER CLASS
// ================================================

class WedSyncWebhookManager {
  private supabase: SupabaseClient;
  private security: WebhookSecurity;
  private retryHandler: WebhookRetryHandler;
  private deliveryQueue: WebhookDeliveryQueue;
  private isInitialized: boolean = false;

  constructor(supabaseUrl: string, supabaseKey: string, webhookSecret: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.security = new WebhookSecurity({
      secret: webhookSecret,
      algorithm: 'sha256',
      timestampTolerance: 300,
      enableTimestampValidation: true,
    });
    this.retryHandler = new WebhookRetryHandler();
    this.deliveryQueue = getQueueInstance(supabaseUrl, supabaseKey);
  }

  /**
   * Initialize the webhook manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start the delivery queue processor
      this.deliveryQueue.start();
      this.isInitialized = true;

      console.log('WedSync Webhook Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize webhook manager:', error);
      throw error;
    }
  }

  /**
   * Shut down the webhook manager
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.deliveryQueue.stop();
      this.isInitialized = false;

      console.log('WedSync Webhook Manager shut down successfully');
    } catch (error) {
      console.error('Failed to shutdown webhook manager:', error);
    }
  }

  /**
   * Trigger webhook for any event type
   */
  async triggerWebhook(
    eventData: WebhookEventData,
  ): Promise<WebhookTriggerResult> {
    try {
      // Validate event data
      const validatedData = webhookEventDataSchema.parse(eventData);

      // Get active webhook endpoints for this organization and event type
      const { data: endpoints, error } = await this.supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('organization_id', validatedData.organizationId)
        .eq('is_active', true)
        .contains('subscribed_events', [validatedData.eventType]);

      if (error) {
        throw new Error(`Failed to fetch webhook endpoints: ${error.message}`);
      }

      if (!endpoints || endpoints.length === 0) {
        return {
          success: true,
          triggeredEndpoints: 0,
          failedEndpoints: 0,
          deliveryIds: [],
        };
      }

      // Process each endpoint
      const deliveryPromises = endpoints.map((endpoint) =>
        this.scheduleWebhookDelivery(validatedData, endpoint),
      );

      const results = await Promise.allSettled(deliveryPromises);

      // Analyze results
      let successful = 0;
      let failed = 0;
      const deliveryIds: string[] = [];
      const errors: Array<{ endpointId: string; error: string }> = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successful++;
            deliveryIds.push(result.value.deliveryId);
          } else {
            failed++;
            errors.push({
              endpointId: endpoints[index].id,
              error: result.value.error || 'Unknown error',
            });
          }
        } else {
          failed++;
          errors.push({
            endpointId: endpoints[index].id,
            error: result.reason?.message || 'Processing failed',
          });
        }
      });

      return {
        success: successful > 0 || (successful === 0 && failed === 0),
        triggeredEndpoints: successful,
        failedEndpoints: failed,
        deliveryIds,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Failed to trigger webhook:', error);
      return {
        success: false,
        triggeredEndpoints: 0,
        failedEndpoints: 1,
        deliveryIds: [],
        errors: [{ endpointId: 'unknown', error: error.message }],
      };
    }
  }

  /**
   * Schedule webhook delivery with queue management
   */
  async scheduleWebhookDelivery(
    eventData: WebhookEventData,
    endpoint: WebhookEndpoint,
  ): Promise<{ success: boolean; deliveryId?: string; error?: string }> {
    try {
      // Generate webhook signature
      const payloadString = JSON.stringify(eventData.payload);
      const signature = this.security.generateSignature(payloadString);

      // Create delivery record
      const deliveryData = {
        event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        webhook_endpoint_id: endpoint.id,
        organization_id: eventData.organizationId,
        event_type: eventData.eventType,
        payload: eventData.payload,
        signature: `sha256=${signature.signature}`,
        status: 'pending' as const,
        priority: this.calculateEventPriority(eventData),
        attempt_count: 0,
        max_retries: endpoint.retry_count,
        scheduled_at: new Date().toISOString(),
        metadata: {
          ...eventData.metadata,
          endpointDescription: endpoint.description,
          integrationType: endpoint.integration_type,
          isBusinessCritical:
            endpoint.business_critical ||
            eventData.metadata?.isBusinessCritical,
          generatedAt: new Date().toISOString(),
        },
      };

      // Enqueue delivery
      const queueResult =
        await this.deliveryQueue.enqueueDelivery(deliveryData);

      if (!queueResult.success) {
        throw new Error(queueResult.error || 'Failed to enqueue delivery');
      }

      return {
        success: true,
        deliveryId: queueResult.deliveryId,
      };
    } catch (error) {
      console.error('Failed to schedule webhook delivery:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Deliver webhook immediately (bypass queue for critical events)
   */
  async deliverWebhook(deliveryId: string): Promise<WebhookDeliveryResult> {
    try {
      // Get delivery record
      const { data: delivery, error } = await this.supabase
        .from('webhook_deliveries')
        .select(
          `
          *,
          webhook_endpoints(*)
        `,
        )
        .eq('id', deliveryId)
        .single();

      if (error || !delivery) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }

      const endpoint = delivery.webhook_endpoints;
      if (!endpoint.is_active) {
        throw new Error('Webhook endpoint is inactive');
      }

      // Update delivery status to processing
      await this.supabase
        .from('webhook_deliveries')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      // Prepare webhook delivery
      const headers = this.security.generateWebhookHeaders(
        JSON.stringify(delivery.payload),
        {
          'X-Webhook-Event-Type': delivery.event_type,
          'X-Webhook-Delivery-ID': deliveryId,
          ...endpoint.headers,
        },
      );

      // Execute delivery with retry logic
      const retryResult = await this.retryHandler.execute(
        async () => {
          const response = await fetch(endpoint.endpoint_url, {
            method: 'POST',
            headers,
            body: JSON.stringify(delivery.payload),
            signal: AbortSignal.timeout(endpoint.timeout_seconds * 1000),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return {
            status: response.status,
            body: await response.text(),
            headers: Object.fromEntries(response.headers.entries()),
          };
        },
        {
          webhookId: deliveryId,
          endpoint: endpoint.endpoint_url,
          organizationId: delivery.organization_id,
          eventType: delivery.event_type,
          isBusinessCritical:
            delivery.metadata?.isBusinessCritical || endpoint.business_critical,
        },
      );

      // Update delivery record with result
      if (retryResult.success) {
        await this.supabase
          .from('webhook_deliveries')
          .update({
            status: 'delivered',
            response_status: retryResult.result?.status,
            response_body: retryResult.result?.body,
            response_headers: retryResult.result?.headers,
            response_time_ms: retryResult.totalTime,
            completed_at: new Date().toISOString(),
          })
          .eq('id', deliveryId);

        return {
          success: true,
          status: 'delivered',
          responseStatus: retryResult.result?.status,
          responseTime: retryResult.totalTime,
        };
      } else {
        // Check if should retry or mark as permanently failed
        const shouldRetry = retryResult.totalRetries < delivery.max_retries;
        const status = shouldRetry ? 'failed' : 'permanently_failed';

        await this.supabase
          .from('webhook_deliveries')
          .update({
            status,
            error_message: retryResult.error,
            attempt_count: retryResult.totalRetries,
            response_time_ms: retryResult.totalTime,
            [shouldRetry ? 'failed_at' : 'failed_at']: new Date().toISOString(),
          })
          .eq('id', deliveryId);

        return {
          success: false,
          status: status as any,
          error: retryResult.error,
          responseTime: retryResult.totalTime,
          retryScheduled: shouldRetry,
        };
      }
    } catch (error) {
      // Update delivery as failed
      await this.supabase
        .from('webhook_deliveries')
        .update({
          status: 'failed',
          error_message: error.message,
          failed_at: new Date().toISOString(),
        })
        .eq('id', deliveryId)
        .catch(() => {}); // Ignore secondary failures

      return {
        success: false,
        status: 'failed',
        error: error.message,
      };
    }
  }

  // ================================================
  // WEDDING INDUSTRY SPECIFIC EVENT HANDLERS
  // ================================================

  /**
   * Trigger webhook when new client is created
   */
  async triggerClientCreatedWebhook(
    clientData: any,
    supplierId: string,
    context?: Partial<WeddingEventContext>,
  ): Promise<WebhookTriggerResult> {
    return this.triggerWebhook({
      eventType: 'client.created',
      organizationId: supplierId,
      payload: {
        client: clientData,
        supplier_id: supplierId,
        created_at: new Date().toISOString(),
        wedding_date: context?.weddingDate,
        venue: context?.venue,
      },
      metadata: {
        clientId: clientData.id,
        supplierId,
        weddingId: context?.weddingDate
          ? `wedding_${clientData.id}`
          : undefined,
        isBusinessCritical: true, // New clients are always business critical
        source: 'client_management',
      },
    });
  }

  /**
   * Trigger webhook when form is submitted
   */
  async triggerFormSubmittedWebhook(
    formData: any,
    responseData: any,
    supplierId: string,
    context?: Partial<WeddingEventContext>,
  ): Promise<WebhookTriggerResult> {
    return this.triggerWebhook({
      eventType: 'form.submitted',
      organizationId: supplierId,
      payload: {
        form: formData,
        responses: responseData,
        supplier_id: supplierId,
        submitted_at: new Date().toISOString(),
        client_id: context?.clientId,
      },
      metadata: {
        clientId: context?.clientId,
        supplierId,
        isBusinessCritical: formData.is_critical || false,
        isWeddingDay: context?.isWeddingDay || false,
        source: 'form_builder',
      },
    });
  }

  /**
   * Trigger webhook when journey is completed
   */
  async triggerJourneyCompletedWebhook(
    journeyData: any,
    supplierId: string,
    context?: WeddingEventContext,
  ): Promise<WebhookTriggerResult> {
    return this.triggerWebhook({
      eventType: 'journey.completed',
      organizationId: supplierId,
      payload: {
        journey: journeyData,
        supplier_id: supplierId,
        completed_at: new Date().toISOString(),
        client_id: context?.clientId,
        wedding_date: context?.weddingDate,
        completion_rate: journeyData.completion_rate || 100,
      },
      metadata: {
        clientId: context?.clientId,
        supplierId,
        weddingId: context ? `wedding_${context.clientId}` : undefined,
        isBusinessCritical: true, // Journey completions are business critical
        isWeddingDay: context?.isWeddingDay || false,
        source: 'journey_builder',
      },
    });
  }

  /**
   * Trigger webhook when wedding date changes (high priority)
   */
  async triggerWeddingDateChangedWebhook(
    weddingData: any,
    supplierId: string,
    context: WeddingEventContext,
  ): Promise<WebhookTriggerResult> {
    return this.triggerWebhook({
      eventType: 'wedding.date_changed',
      organizationId: supplierId,
      payload: {
        wedding: weddingData,
        client_id: context.clientId,
        supplier_id: supplierId,
        old_date: weddingData.old_wedding_date,
        new_date: weddingData.new_wedding_date,
        changed_at: new Date().toISOString(),
        change_reason: weddingData.change_reason,
      },
      metadata: {
        clientId: context.clientId,
        supplierId,
        weddingId: `wedding_${context.clientId}`,
        isBusinessCritical: true,
        isWeddingDay: context.isWeddingDay,
        source: 'wedding_management',
      },
    });
  }

  /**
   * Trigger payment confirmation webhook
   */
  async triggerPaymentWebhook(
    paymentData: any,
    supplierId: string,
    eventType: 'payment.received' | 'payment.failed',
    context?: Partial<WeddingEventContext>,
  ): Promise<WebhookTriggerResult> {
    return this.triggerWebhook({
      eventType,
      organizationId: supplierId,
      payload: {
        payment: paymentData,
        supplier_id: supplierId,
        client_id: context?.clientId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'GBP',
        processed_at: new Date().toISOString(),
        payment_method: paymentData.payment_method,
      },
      metadata: {
        clientId: context?.clientId,
        supplierId,
        isBusinessCritical: true, // All payments are business critical
        isWeddingDay: context?.isWeddingDay || false,
        source: 'payment_system',
      },
    });
  }

  /**
   * Trigger emergency webhook for wedding day issues
   */
  async triggerEmergencyWebhook(
    emergencyData: any,
    supplierId: string,
    context: WeddingEventContext,
  ): Promise<WebhookTriggerResult> {
    // For emergency events, bypass normal queue and deliver immediately
    const result = await this.triggerWebhook({
      eventType: 'wedding.emergency',
      organizationId: supplierId,
      payload: {
        emergency: emergencyData,
        client_id: context.clientId,
        supplier_id: supplierId,
        wedding_date: context.weddingDate,
        venue: context.venue,
        emergency_type: emergencyData.type,
        severity: emergencyData.severity,
        description: emergencyData.description,
        contact_info: context.emergencyContact,
        reported_at: new Date().toISOString(),
      },
      metadata: {
        clientId: context.clientId,
        supplierId,
        weddingId: `wedding_${context.clientId}`,
        isBusinessCritical: true,
        isWeddingDay: true, // Always wedding day for emergencies
        source: 'emergency_system',
      },
    });

    // For each triggered delivery, attempt immediate delivery
    if (result.success && result.deliveryIds.length > 0) {
      const immediateDeliveries = result.deliveryIds.map((id) =>
        this.deliverWebhook(id).catch((error) =>
          console.error(
            `Emergency webhook immediate delivery failed for ${id}:`,
            error,
          ),
        ),
      );

      await Promise.allSettled(immediateDeliveries);
    }

    return result;
  }

  // ================================================
  // WEBHOOK MANAGEMENT OPERATIONS
  // ================================================

  /**
   * Verify webhook signature from incoming request
   */
  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secretKey: string,
    timestamp?: string,
  ): Promise<boolean> {
    try {
      const security = new WebhookSecurity({ secret: secretKey });
      const result = security.validateSignature(
        payload,
        signature,
        timestamp ? parseInt(timestamp) : undefined,
      );

      return result.isValid;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Get webhook delivery status and analytics
   */
  async getWebhookAnalytics(
    organizationId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageResponseTime: number;
    successRate: number;
    topEventTypes: Array<{ eventType: string; count: number }>;
  }> {
    try {
      const startDate =
        timeRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = timeRange?.end || new Date();

      const { data: deliveries, error } = await this.supabase
        .from('webhook_deliveries')
        .select('event_type, status, response_time_ms, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const total = deliveries?.length || 0;
      const successful =
        deliveries?.filter((d) => d.status === 'delivered').length || 0;
      const failed = total - successful;

      const responseTimes =
        deliveries
          ?.filter((d) => d.response_time_ms)
          .map((d) => d.response_time_ms) || [];

      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) /
            responseTimes.length
          : 0;

      // Count event types
      const eventTypeCounts: Record<string, number> = {};
      deliveries?.forEach((d) => {
        eventTypeCounts[d.event_type] =
          (eventTypeCounts[d.event_type] || 0) + 1;
      });

      const topEventTypes = Object.entries(eventTypeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([eventType, count]) => ({ eventType, count }));

      return {
        totalDeliveries: total,
        successfulDeliveries: successful,
        failedDeliveries: failed,
        averageResponseTime: Math.round(averageResponseTime),
        successRate:
          total > 0 ? Math.round((successful / total) * 100) / 100 : 0,
        topEventTypes,
      };
    } catch (error) {
      console.error('Failed to get webhook analytics:', error);
      return {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        averageResponseTime: 0,
        successRate: 0,
        topEventTypes: [],
      };
    }
  }

  /**
   * Calculate event priority for queue processing
   */
  private calculateEventPriority(eventData: WebhookEventData): number {
    let priority = 5; // Base priority

    // Wedding day events get highest priority
    if (eventData.metadata?.isWeddingDay) {
      priority = 10;
    } else if (eventData.eventType === 'wedding.emergency') {
      priority = 10;
    } else if (eventData.metadata?.isBusinessCritical) {
      priority = 9;
    } else if (eventData.eventType.startsWith('payment.')) {
      priority = 8;
    } else if (eventData.eventType.startsWith('client.')) {
      priority = 7;
    } else if (eventData.eventType.startsWith('form.')) {
      priority = 6;
    }

    // Adjust for organization tier
    switch (eventData.metadata?.organizationTier) {
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
   * Get system health and queue status
   */
  async getSystemHealth(): Promise<{
    isHealthy: boolean;
    queueStatus: any;
    recentErrors: number;
    avgProcessingTime: number;
    issues: string[];
  }> {
    try {
      const [queueStatus, recentErrors] = await Promise.all([
        this.deliveryQueue.getQueueStatus(),
        this.supabase
          .from('webhook_deliveries')
          .select('id')
          .in('status', ['failed', 'permanently_failed'])
          .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
          .then(({ data }) => data?.length || 0),
      ]);

      const issues: string[] = [];

      if (queueStatus.queuedItems > 50) {
        issues.push(`High queue depth: ${queueStatus.queuedItems} items`);
      }

      if (queueStatus.healthScore < 0.8) {
        issues.push(`Low health score: ${queueStatus.healthScore}`);
      }

      if (recentErrors > 10) {
        issues.push(`High error rate: ${recentErrors} errors in last hour`);
      }

      return {
        isHealthy: issues.length === 0,
        queueStatus,
        recentErrors,
        avgProcessingTime: queueStatus.averageProcessingTime,
        issues,
      };
    } catch (error) {
      return {
        isHealthy: false,
        queueStatus: null,
        recentErrors: -1,
        avgProcessingTime: -1,
        issues: [`Health check failed: ${error.message}`],
      };
    }
  }
}

// ================================================
// SINGLETON MANAGER INSTANCE
// ================================================

let managerInstance: WedSyncWebhookManager | null = null;

export function getWebhookManager(
  supabaseUrl?: string,
  supabaseKey?: string,
  webhookSecret?: string,
): WedSyncWebhookManager {
  if (!managerInstance && supabaseUrl && supabaseKey && webhookSecret) {
    managerInstance = new WedSyncWebhookManager(
      supabaseUrl,
      supabaseKey,
      webhookSecret,
    );
  }

  if (!managerInstance) {
    throw new Error(
      'Webhook manager not initialized. Provide required credentials.',
    );
  }

  return managerInstance;
}

// ================================================
// EXPORTS
// ================================================

export default getWebhookManager;

export { WedSyncWebhookManager };
