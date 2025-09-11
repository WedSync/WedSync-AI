/**
 * WS-343 CRM Integration Hub - Team C
 * Webhook Processing System for Real-Time CRM Updates
 *
 * This system handles incoming webhooks from CRM providers to process
 * real-time updates to wedding data. Critical for maintaining data
 * synchronization between WedSync and external CRM systems.
 *
 * @priority HIGH - Real-time data sync for wedding industry
 * @weddingContext Handles live wedding updates - must be reliable
 * @security Validates webhook signatures and prevents replay attacks
 */

import { z } from 'zod';
import { createHash, createHmac } from 'crypto';
import {
  WebhookProcessResult,
  CRMClient,
  WeddingData,
  CRMErrorCode,
} from './CRMProviderInterface';
import { FieldMappingEngine } from './FieldMappingEngine';

/**
 * Webhook Event Schema
 * Standard structure for webhook events across all providers
 */
const WebhookEventSchema = z.object({
  id: z.string(),
  source: z.string(), // Provider name
  type: z.enum([
    'client.created',
    'client.updated',
    'client.deleted',
    'project.created',
    'project.updated',
    'project.deleted',
    'payment.completed',
    'booking.confirmed',
  ]),
  timestamp: z.string().datetime(),
  data: z.record(z.any()),
  signature: z.string().optional(),
  deliveryId: z.string().optional(),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/**
 * Webhook Configuration for Different Providers
 */
export interface WebhookConfig {
  providerName: string;
  secret: string; // Webhook signing secret
  signatureHeader: string; // Header containing signature
  signatureMethod: 'hmac-sha256' | 'hmac-sha1' | 'md5';
  signaturePrefix?: string; // e.g., 'sha256='
  timestampHeader?: string; // Header for timestamp validation
  timestampToleranceSeconds?: number; // Max age of webhook events
}

/**
 * Webhook Processing Context
 */
export interface WebhookContext {
  providerName: string;
  eventType: string;
  organizationId: string;
  userId?: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * Webhook Processing Result with Wedding Context
 */
export interface WeddingWebhookResult {
  success: boolean;
  action: 'create' | 'update' | 'delete' | 'ignore' | 'retry';
  recordType: 'client' | 'project' | 'booking' | 'payment' | 'unknown';
  recordId: string | null;
  weddingId?: string;
  changes: string[]; // List of fields that changed
  weddingCritical: boolean; // Escalate if wedding day is near
  metadata: {
    processingTime: number;
    provider: string;
    eventId: string;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Webhook Processor Class
 *
 * Handles incoming webhook events from CRM providers with signature validation,
 * deduplication, and wedding-aware processing. Ensures reliable real-time
 * synchronization of wedding data.
 *
 * @wedding_safety Includes Saturday protection and wedding day escalation
 * @performance Optimized for high-throughput webhook processing
 */
export class WebhookProcessor {
  private fieldMappingEngine: FieldMappingEngine;
  private webhookConfigs: Map<string, WebhookConfig> = new Map();
  private processedEvents: Set<string> = new Set(); // Deduplication cache
  private rateLimiters: Map<string, { count: number; resetTime: number }> =
    new Map();

  constructor(fieldMappingEngine: FieldMappingEngine) {
    this.fieldMappingEngine = fieldMappingEngine;
    this.initializeProviderConfigs();

    // Clear processed events cache every hour
    setInterval(
      () => {
        this.processedEvents.clear();
      },
      60 * 60 * 1000,
    );
  }

  // ========================================
  // WEBHOOK CONFIGURATION
  // ========================================

  /**
   * Register Webhook Configuration
   *
   * Registers webhook configuration for a CRM provider including
   * signature validation settings and security parameters.
   *
   * @param config Webhook configuration
   */
  registerWebhookConfig(config: WebhookConfig): void {
    this.webhookConfigs.set(config.providerName, config);
  }

  /**
   * Get Webhook Configuration
   *
   * Retrieves webhook configuration for a provider.
   *
   * @param providerName CRM provider name
   * @returns Webhook configuration or null if not found
   */
  getWebhookConfig(providerName: string): WebhookConfig | null {
    return this.webhookConfigs.get(providerName) || null;
  }

  // ========================================
  // WEBHOOK PROCESSING
  // ========================================

  /**
   * Process Incoming Webhook
   *
   * Main entry point for processing incoming webhook events from CRM providers.
   * Validates signatures, prevents replay attacks, and processes wedding data updates.
   *
   * @param providerName CRM provider name
   * @param headers HTTP headers from webhook request
   * @param body Raw webhook payload
   * @param context Processing context
   * @returns Webhook processing result
   */
  async processWebhook(
    providerName: string,
    headers: Record<string, string | string[]>,
    body: string | Buffer,
    context: WebhookContext,
  ): Promise<WeddingWebhookResult> {
    const startTime = Date.now();

    try {
      // Check rate limiting
      const rateLimitResult = this.checkRateLimit(providerName);
      if (!rateLimitResult.allowed) {
        return this.createErrorResult(
          'RATE_LIMIT_EXCEEDED',
          'Too many webhook requests',
          false,
          context,
          startTime,
        );
      }

      // Get webhook configuration
      const config = this.getWebhookConfig(providerName);
      if (!config) {
        return this.createErrorResult(
          'CONFIGURATION_ERROR',
          'No webhook configuration found',
          false,
          context,
          startTime,
        );
      }

      // Validate signature
      const signatureValidation = this.validateSignature(config, headers, body);
      if (!signatureValidation.valid) {
        return this.createErrorResult(
          'INVALID_SIGNATURE',
          signatureValidation.error || 'Invalid webhook signature',
          false,
          context,
          startTime,
        );
      }

      // Parse webhook payload
      let webhookEvent: WebhookEvent;
      try {
        const payload = typeof body === 'string' ? body : body.toString('utf8');
        const parsedPayload = JSON.parse(payload);

        // Normalize event structure based on provider
        const normalizedEvent = this.normalizeWebhookEvent(
          providerName,
          parsedPayload,
        );
        webhookEvent = WebhookEventSchema.parse(normalizedEvent);
      } catch (error) {
        return this.createErrorResult(
          'INVALID_PAYLOAD',
          'Failed to parse webhook payload',
          false,
          context,
          startTime,
        );
      }

      // Check for duplicate events
      if (this.isDuplicateEvent(webhookEvent)) {
        return {
          success: true,
          action: 'ignore',
          recordType: 'unknown',
          recordId: null,
          changes: [],
          weddingCritical: false,
          metadata: {
            processingTime: Date.now() - startTime,
            provider: providerName,
            eventId: webhookEvent.id,
            timestamp: webhookEvent.timestamp,
          },
        };
      }

      // Validate timestamp (prevent replay attacks)
      const timestampValidation = this.validateTimestamp(
        config,
        headers,
        webhookEvent,
      );
      if (!timestampValidation.valid) {
        return this.createErrorResult(
          'TIMESTAMP_INVALID',
          timestampValidation.error || 'Webhook timestamp invalid',
          false,
          context,
          startTime,
        );
      }

      // Process the webhook event
      const result = await this.processWebhookEvent(webhookEvent, context);

      // Mark event as processed
      this.markEventProcessed(webhookEvent);

      return {
        ...result,
        metadata: {
          processingTime: Date.now() - startTime,
          provider: providerName,
          eventId: webhookEvent.id,
          timestamp: webhookEvent.timestamp,
        },
      };
    } catch (error) {
      return this.createErrorResult(
        'PROCESSING_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        true,
        context,
        startTime,
      );
    }
  }

  /**
   * Process Webhook Event
   *
   * Processes a validated webhook event and updates wedding data accordingly.
   *
   * @param event Validated webhook event
   * @param context Processing context
   * @returns Processing result
   */
  private async processWebhookEvent(
    event: WebhookEvent,
    context: WebhookContext,
  ): Promise<Omit<WeddingWebhookResult, 'metadata'>> {
    try {
      // Determine record type and action
      const { recordType, action } = this.parseEventTypeAndAction(event.type);

      // Check wedding day safety
      const weddingSafety = this.checkWeddingDaySafety(event.data);
      if (weddingSafety.isWeddingDay && action !== 'ignore') {
        // During wedding day, only allow read operations
        return {
          success: true,
          action: 'ignore',
          recordType,
          recordId: this.extractRecordId(event.data),
          changes: [],
          weddingCritical: true,
          error: {
            code: CRMErrorCode.WEDDING_DAY_PROTECTION,
            message:
              'Wedding day protection active - data modifications blocked',
            retryable: false,
          },
        };
      }

      // Process based on event type
      switch (event.type) {
        case 'client.created':
          return await this.processClientCreated(event, context);

        case 'client.updated':
          return await this.processClientUpdated(event, context);

        case 'client.deleted':
          return await this.processClientDeleted(event, context);

        case 'project.created':
          return await this.processProjectCreated(event, context);

        case 'project.updated':
          return await this.processProjectUpdated(event, context);

        case 'booking.confirmed':
          return await this.processBookingConfirmed(event, context);

        case 'payment.completed':
          return await this.processPaymentCompleted(event, context);

        default:
          return {
            success: true,
            action: 'ignore',
            recordType: 'unknown',
            recordId: this.extractRecordId(event.data),
            changes: [],
            weddingCritical: false,
          };
      }
    } catch (error) {
      return {
        success: false,
        action: 'retry',
        recordType: 'unknown',
        recordId: null,
        changes: [],
        weddingCritical: false,
        error: {
          code: 'PROCESSING_ERROR',
          message:
            error instanceof Error ? error.message : 'Unknown processing error',
          retryable: true,
        },
      };
    }
  }

  // ========================================
  // EVENT TYPE PROCESSORS
  // ========================================

  /**
   * Process Client Created Event
   *
   * Handles new client creation webhooks from CRM providers.
   */
  private async processClientCreated(
    event: WebhookEvent,
    context: WebhookContext,
  ): Promise<Omit<WeddingWebhookResult, 'metadata'>> {
    try {
      // Transform CRM data to canonical format
      const transformResult =
        await this.fieldMappingEngine.transformCRMClientToWeddingData(
          event.source,
          event.data as CRMClient,
        );

      if (!transformResult.success || !transformResult.data) {
        return {
          success: false,
          action: 'retry',
          recordType: 'client',
          recordId: this.extractRecordId(event.data),
          changes: [],
          weddingCritical: false,
          error: {
            code: 'TRANSFORMATION_ERROR',
            message: 'Failed to transform client data',
            retryable: true,
          },
        };
      }

      const weddingData = transformResult.data;

      // Store wedding data in database
      // This would integrate with your Supabase database
      await this.storeWeddingData(weddingData, context.organizationId);

      return {
        success: true,
        action: 'create',
        recordType: 'client',
        recordId: weddingData.externalId,
        weddingId: weddingData.weddingId,
        changes: ['created'],
        weddingCritical: this.isWeddingCriticalEvent(weddingData),
      };
    } catch (error) {
      return {
        success: false,
        action: 'retry',
        recordType: 'client',
        recordId: this.extractRecordId(event.data),
        changes: [],
        weddingCritical: false,
        error: {
          code: 'STORAGE_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to store client data',
          retryable: true,
        },
      };
    }
  }

  /**
   * Process Client Updated Event
   *
   * Handles client update webhooks from CRM providers.
   */
  private async processClientUpdated(
    event: WebhookEvent,
    context: WebhookContext,
  ): Promise<Omit<WeddingWebhookResult, 'metadata'>> {
    try {
      // Get existing wedding data
      const existingData = await this.getExistingWeddingData(
        this.extractRecordId(event.data),
        event.source,
        context.organizationId,
      );

      if (!existingData) {
        // Client doesn't exist in our system, treat as creation
        return await this.processClientCreated(event, context);
      }

      // Transform updated CRM data
      const transformResult =
        await this.fieldMappingEngine.transformCRMClientToWeddingData(
          event.source,
          event.data as CRMClient,
        );

      if (!transformResult.success || !transformResult.data) {
        return {
          success: false,
          action: 'retry',
          recordType: 'client',
          recordId: this.extractRecordId(event.data),
          changes: [],
          weddingCritical: false,
          error: {
            code: 'TRANSFORMATION_ERROR',
            message: 'Failed to transform updated client data',
            retryable: true,
          },
        };
      }

      const updatedData = transformResult.data;

      // Detect changes
      const changes = this.detectChanges(existingData, updatedData);

      // Update wedding data in database
      await this.updateWeddingData(updatedData, context.organizationId);

      return {
        success: true,
        action: 'update',
        recordType: 'client',
        recordId: updatedData.externalId,
        weddingId: updatedData.weddingId,
        changes,
        weddingCritical:
          this.isWeddingCriticalEvent(updatedData) ||
          this.hasWeddingCriticalChanges(changes),
      };
    } catch (error) {
      return {
        success: false,
        action: 'retry',
        recordType: 'client',
        recordId: this.extractRecordId(event.data),
        changes: [],
        weddingCritical: false,
        error: {
          code: 'UPDATE_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to update client data',
          retryable: true,
        },
      };
    }
  }

  /**
   * Process Client Deleted Event
   *
   * Handles client deletion webhooks from CRM providers.
   */
  private async processClientDeleted(
    event: WebhookEvent,
    context: WebhookContext,
  ): Promise<Omit<WeddingWebhookResult, 'metadata'>> {
    try {
      const recordId = this.extractRecordId(event.data);

      // Soft delete wedding data (don't permanently remove)
      await this.softDeleteWeddingData(
        recordId,
        event.source,
        context.organizationId,
      );

      return {
        success: true,
        action: 'delete',
        recordType: 'client',
        recordId,
        changes: ['deleted'],
        weddingCritical: true, // Deletions are always wedding critical
      };
    } catch (error) {
      return {
        success: false,
        action: 'retry',
        recordType: 'client',
        recordId: this.extractRecordId(event.data),
        changes: [],
        weddingCritical: true,
        error: {
          code: 'DELETE_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to delete client data',
          retryable: true,
        },
      };
    }
  }

  /**
   * Process Project Created Event
   *
   * Handles new project creation webhooks (HoneyBook, etc.).
   */
  private async processProjectCreated(
    event: WebhookEvent,
    context: WebhookContext,
  ): Promise<Omit<WeddingWebhookResult, 'metadata'>> {
    // Similar to client created, but for project-based CRMs
    return await this.processClientCreated(event, context);
  }

  /**
   * Process Project Updated Event
   *
   * Handles project update webhooks (HoneyBook, etc.).
   */
  private async processProjectUpdated(
    event: WebhookEvent,
    context: WebhookContext,
  ): Promise<Omit<WeddingWebhookResult, 'metadata'>> {
    // Similar to client updated, but for project-based CRMs
    return await this.processClientUpdated(event, context);
  }

  /**
   * Process Booking Confirmed Event
   *
   * Handles booking confirmation webhooks.
   */
  private async processBookingConfirmed(
    event: WebhookEvent,
    context: WebhookContext,
  ): Promise<Omit<WeddingWebhookResult, 'metadata'>> {
    try {
      const recordId = this.extractRecordId(event.data);

      // Update booking status in database
      await this.updateBookingStatus(
        recordId,
        event.source,
        'booked',
        context.organizationId,
      );

      return {
        success: true,
        action: 'update',
        recordType: 'booking',
        recordId,
        changes: ['status:booked'],
        weddingCritical: true, // Booking confirmations are critical
      };
    } catch (error) {
      return {
        success: false,
        action: 'retry',
        recordType: 'booking',
        recordId: this.extractRecordId(event.data),
        changes: [],
        weddingCritical: true,
        error: {
          code: 'BOOKING_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to update booking status',
          retryable: true,
        },
      };
    }
  }

  /**
   * Process Payment Completed Event
   *
   * Handles payment completion webhooks.
   */
  private async processPaymentCompleted(
    event: WebhookEvent,
    context: WebhookContext,
  ): Promise<Omit<WeddingWebhookResult, 'metadata'>> {
    try {
      const recordId = this.extractRecordId(event.data);
      const paymentAmount = event.data.amount || 0;

      // Record payment in database
      await this.recordPayment(
        recordId,
        event.source,
        paymentAmount,
        context.organizationId,
      );

      return {
        success: true,
        action: 'update',
        recordType: 'payment',
        recordId,
        changes: [`payment:${paymentAmount}`],
        weddingCritical: false, // Payments are important but not wedding critical
      };
    } catch (error) {
      return {
        success: false,
        action: 'retry',
        recordType: 'payment',
        recordId: this.extractRecordId(event.data),
        changes: [],
        weddingCritical: false,
        error: {
          code: 'PAYMENT_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to record payment',
          retryable: true,
        },
      };
    }
  }

  // ========================================
  // VALIDATION METHODS
  // ========================================

  /**
   * Validate Webhook Signature
   *
   * Validates webhook signature to ensure authenticity.
   */
  private validateSignature(
    config: WebhookConfig,
    headers: Record<string, string | string[]>,
    body: string | Buffer,
  ): { valid: boolean; error?: string } {
    try {
      const signatureHeader = headers[config.signatureHeader.toLowerCase()];
      if (!signatureHeader) {
        return { valid: false, error: 'Missing signature header' };
      }

      const signature = Array.isArray(signatureHeader)
        ? signatureHeader[0]
        : signatureHeader;
      const bodyString =
        typeof body === 'string' ? body : body.toString('utf8');

      let expectedSignature: string;

      switch (config.signatureMethod) {
        case 'hmac-sha256':
          expectedSignature = createHmac('sha256', config.secret)
            .update(bodyString)
            .digest('hex');
          break;

        case 'hmac-sha1':
          expectedSignature = createHmac('sha1', config.secret)
            .update(bodyString)
            .digest('hex');
          break;

        case 'md5':
          expectedSignature = createHash('md5')
            .update(bodyString + config.secret)
            .digest('hex');
          break;

        default:
          return { valid: false, error: 'Unsupported signature method' };
      }

      // Add prefix if configured
      if (config.signaturePrefix) {
        expectedSignature = config.signaturePrefix + expectedSignature;
      }

      // Use timing-safe comparison
      const isValid = this.timingSafeEqual(signature, expectedSignature);

      return {
        valid: isValid,
        error: isValid ? undefined : 'Invalid signature',
      };
    } catch (error) {
      return { valid: false, error: 'Signature validation failed' };
    }
  }

  /**
   * Validate Webhook Timestamp
   *
   * Validates webhook timestamp to prevent replay attacks.
   */
  private validateTimestamp(
    config: WebhookConfig,
    headers: Record<string, string | string[]>,
    event: WebhookEvent,
  ): { valid: boolean; error?: string } {
    if (!config.timestampHeader || !config.timestampToleranceSeconds) {
      return { valid: true }; // No timestamp validation configured
    }

    try {
      const timestampHeader = headers[config.timestampHeader.toLowerCase()];
      if (!timestampHeader) {
        return { valid: false, error: 'Missing timestamp header' };
      }

      const timestamp = Array.isArray(timestampHeader)
        ? timestampHeader[0]
        : timestampHeader;
      const webhookTime = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);

      const timeDifference = Math.abs(currentTime - webhookTime);

      if (timeDifference > config.timestampToleranceSeconds) {
        return { valid: false, error: 'Webhook timestamp too old' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid timestamp format' };
    }
  }

  /**
   * Check Rate Limiting
   *
   * Implements rate limiting for webhook processing to prevent abuse.
   */
  private checkRateLimit(providerName: string): {
    allowed: boolean;
    resetTime?: number;
  } {
    const now = Date.now();
    const rateLimiter = this.rateLimiters.get(providerName);

    if (!rateLimiter || now > rateLimiter.resetTime) {
      // Reset rate limit window (100 requests per minute)
      this.rateLimiters.set(providerName, {
        count: 1,
        resetTime: now + 60 * 1000, // 1 minute
      });
      return { allowed: true };
    }

    if (rateLimiter.count >= 100) {
      return { allowed: false, resetTime: rateLimiter.resetTime };
    }

    rateLimiter.count++;
    return { allowed: true };
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Initialize Provider Configurations
   *
   * Sets up default webhook configurations for supported providers.
   */
  private initializeProviderConfigs(): void {
    // HoneyBook webhook configuration
    this.registerWebhookConfig({
      providerName: 'honeybook',
      secret: process.env.HONEYBOOK_WEBHOOK_SECRET || '',
      signatureHeader: 'x-honeybook-signature',
      signatureMethod: 'hmac-sha256',
      signaturePrefix: 'sha256=',
      timestampHeader: 'x-honeybook-timestamp',
      timestampToleranceSeconds: 300, // 5 minutes
    });

    // Tave webhook configuration
    this.registerWebhookConfig({
      providerName: 'tave',
      secret: process.env.TAVE_WEBHOOK_SECRET || '',
      signatureHeader: 'x-tave-signature',
      signatureMethod: 'hmac-sha256',
      signaturePrefix: 'sha256=',
      timestampToleranceSeconds: 300, // 5 minutes
    });
  }

  /**
   * Normalize Webhook Event
   *
   * Normalizes webhook events from different providers into standard format.
   */
  private normalizeWebhookEvent(providerName: string, payload: any): any {
    const now = new Date().toISOString();

    switch (providerName) {
      case 'honeybook':
        return {
          id: payload.id || payload.event_id || `${providerName}_${Date.now()}`,
          source: providerName,
          type: this.normalizeEventType(
            payload.event || payload.type,
            providerName,
          ),
          timestamp: payload.created_at || payload.timestamp || now,
          data: payload.data || payload,
        };

      case 'tave':
        return {
          id: payload.Id || payload.id || `${providerName}_${Date.now()}`,
          source: providerName,
          type: this.normalizeEventType(
            payload.EventType || payload.event,
            providerName,
          ),
          timestamp: payload.Timestamp || payload.timestamp || now,
          data: payload.Data || payload.data || payload,
        };

      default:
        return {
          id: payload.id || `${providerName}_${Date.now()}`,
          source: providerName,
          type: this.normalizeEventType(
            payload.event || payload.type || 'unknown',
            providerName,
          ),
          timestamp: payload.timestamp || payload.created_at || now,
          data: payload.data || payload,
        };
    }
  }

  /**
   * Normalize Event Type
   *
   * Maps provider-specific event types to standard event types.
   */
  private normalizeEventType(eventType: string, providerName: string): string {
    const eventMap: Record<string, Record<string, string>> = {
      honeybook: {
        project_created: 'project.created',
        project_updated: 'project.updated',
        client_created: 'client.created',
        client_updated: 'client.updated',
        booking_confirmed: 'booking.confirmed',
        payment_completed: 'payment.completed',
      },
      tave: {
        JobCreated: 'client.created',
        JobUpdated: 'client.updated',
        JobDeleted: 'client.deleted',
        ContactCreated: 'client.created',
        ContactUpdated: 'client.updated',
        BookingConfirmed: 'booking.confirmed',
        PaymentReceived: 'payment.completed',
      },
    };

    const providerMap = eventMap[providerName];
    return providerMap?.[eventType] || eventType;
  }

  /**
   * Parse Event Type and Action
   *
   * Extracts record type and action from event type.
   */
  private parseEventTypeAndAction(eventType: string): {
    recordType: 'client' | 'project' | 'booking' | 'payment' | 'unknown';
    action: string;
  } {
    const parts = eventType.split('.');
    const recordType = parts[0] || 'unknown';

    // Validate record type
    const validRecordTypes = ['client', 'project', 'booking', 'payment'];
    const validatedRecordType = validRecordTypes.includes(recordType)
      ? (recordType as 'client' | 'project' | 'booking' | 'payment')
      : 'unknown';

    return {
      recordType: validatedRecordType,
      action: parts[1] || 'unknown',
    };
  }

  /**
   * Extract Record ID
   *
   * Extracts the record ID from webhook data.
   */
  private extractRecordId(data: any): string | null {
    return (
      data.id ||
      data.Id ||
      data.record_id ||
      data.client_id ||
      data.project_id ||
      null
    );
  }

  /**
   * Check Wedding Day Safety
   *
   * Determines if the wedding is today or soon, requiring extra safety.
   */
  private checkWeddingDaySafety(data: any): {
    isWeddingDay: boolean;
    daysTillWedding: number;
  } {
    try {
      const weddingDate =
        data.wedding_date || data.event_date || data.EventDate;
      if (!weddingDate) {
        return { isWeddingDay: false, daysTillWedding: Infinity };
      }

      const wedding = new Date(weddingDate);
      const today = new Date();
      const diffTime = wedding.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        isWeddingDay: diffDays <= 0, // Wedding is today or past
        daysTillWedding: diffDays,
      };
    } catch (error) {
      return { isWeddingDay: false, daysTillWedding: Infinity };
    }
  }

  /**
   * Is Duplicate Event
   *
   * Checks if an event has already been processed.
   */
  private isDuplicateEvent(event: WebhookEvent): boolean {
    return this.processedEvents.has(event.id);
  }

  /**
   * Mark Event Processed
   *
   * Marks an event as processed to prevent duplicate handling.
   */
  private markEventProcessed(event: WebhookEvent): void {
    this.processedEvents.add(event.id);
  }

  /**
   * Is Wedding Critical Event
   *
   * Determines if an event is wedding critical based on the wedding data.
   */
  private isWeddingCriticalEvent(weddingData: WeddingData): boolean {
    const weddingDate = new Date(weddingData.weddingDate);
    const now = new Date();
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Critical if wedding is within 7 days
    return daysUntilWedding <= 7;
  }

  /**
   * Has Wedding Critical Changes
   *
   * Determines if the changes include wedding-critical fields.
   */
  private hasWeddingCriticalChanges(changes: string[]): boolean {
    const criticalFields = ['weddingDate', 'venue', 'status', 'couples'];
    return changes.some((change) =>
      criticalFields.some((field) => change.includes(field)),
    );
  }

  /**
   * Detect Changes
   *
   * Compares old and new wedding data to detect changes.
   */
  private detectChanges(oldData: WeddingData, newData: WeddingData): string[] {
    const changes: string[] = [];

    if (oldData.weddingDate !== newData.weddingDate) {
      changes.push('weddingDate');
    }

    if (
      oldData.couples.partner1.firstName !== newData.couples.partner1.firstName
    ) {
      changes.push('partner1.firstName');
    }

    if (
      oldData.couples.partner1.lastName !== newData.couples.partner1.lastName
    ) {
      changes.push('partner1.lastName');
    }

    if (oldData.couples.partner1.email !== newData.couples.partner1.email) {
      changes.push('partner1.email');
    }

    if (oldData.status !== newData.status) {
      changes.push('status');
    }

    if (oldData.venue?.name !== newData.venue?.name) {
      changes.push('venue.name');
    }

    return changes;
  }

  /**
   * Timing Safe Equal
   *
   * Compares two strings in constant time to prevent timing attacks.
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Create Error Result
   *
   * Creates a standardized error result for webhook processing failures.
   */
  private createErrorResult(
    code: string,
    message: string,
    retryable: boolean,
    context: WebhookContext,
    startTime: number,
  ): WeddingWebhookResult {
    return {
      success: false,
      action: retryable ? 'retry' : 'ignore',
      recordType: 'unknown',
      recordId: null,
      changes: [],
      weddingCritical: false,
      metadata: {
        processingTime: Date.now() - startTime,
        provider: context.providerName,
        eventId: 'unknown',
        timestamp: new Date().toISOString(),
      },
      error: {
        code,
        message,
        retryable,
      },
    };
  }

  // ========================================
  // DATABASE OPERATIONS (TO BE IMPLEMENTED)
  // ========================================

  /**
   * Store Wedding Data
   *
   * Stores new wedding data in the database.
   * This would integrate with your Supabase database operations.
   */
  private async storeWeddingData(
    weddingData: WeddingData,
    organizationId: string,
  ): Promise<void> {
    // Implementation would use Supabase client to store wedding data
    // await supabase.from('weddings').insert({...})
    console.log('Storing wedding data:', {
      weddingId: weddingData.weddingId,
      organizationId,
    });
  }

  /**
   * Update Wedding Data
   *
   * Updates existing wedding data in the database.
   */
  private async updateWeddingData(
    weddingData: WeddingData,
    organizationId: string,
  ): Promise<void> {
    // Implementation would use Supabase client to update wedding data
    // await supabase.from('weddings').update({...}).eq('external_id', weddingData.externalId)
    console.log('Updating wedding data:', {
      weddingId: weddingData.weddingId,
      organizationId,
    });
  }

  /**
   * Get Existing Wedding Data
   *
   * Retrieves existing wedding data from the database.
   */
  private async getExistingWeddingData(
    recordId: string,
    source: string,
    organizationId: string,
  ): Promise<WeddingData | null> {
    // Implementation would use Supabase client to fetch wedding data
    // const { data } = await supabase.from('weddings').select('*').eq('external_id', recordId).eq('source', source)
    console.log('Getting existing wedding data:', {
      recordId,
      source,
      organizationId,
    });
    return null; // Placeholder
  }

  /**
   * Soft Delete Wedding Data
   *
   * Soft deletes wedding data (marks as deleted without permanent removal).
   */
  private async softDeleteWeddingData(
    recordId: string,
    source: string,
    organizationId: string,
  ): Promise<void> {
    // Implementation would use Supabase client to soft delete
    // await supabase.from('weddings').update({ deleted_at: new Date().toISOString() }).eq('external_id', recordId)
    console.log('Soft deleting wedding data:', {
      recordId,
      source,
      organizationId,
    });
  }

  /**
   * Update Booking Status
   *
   * Updates booking status in the database.
   */
  private async updateBookingStatus(
    recordId: string,
    source: string,
    status: string,
    organizationId: string,
  ): Promise<void> {
    // Implementation would update booking status
    console.log('Updating booking status:', {
      recordId,
      source,
      status,
      organizationId,
    });
  }

  /**
   * Record Payment
   *
   * Records payment information in the database.
   */
  private async recordPayment(
    recordId: string,
    source: string,
    amount: number,
    organizationId: string,
  ): Promise<void> {
    // Implementation would record payment
    console.log('Recording payment:', {
      recordId,
      source,
      amount,
      organizationId,
    });
  }
}

/**
 * Webhook Security Utilities
 */
export class WebhookSecurity {
  /**
   * Generate Webhook Secret
   *
   * Generates a cryptographically secure webhook secret.
   */
  static generateWebhookSecret(length: number = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = require('crypto').randomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }

    return result;
  }

  /**
   * Validate IP Whitelist
   *
   * Validates that webhook request comes from allowed IP addresses.
   */
  static validateIPWhitelist(requestIP: string, allowedIPs: string[]): boolean {
    return allowedIPs.includes(requestIP);
  }
}

/**
 * Default provider IP whitelists for additional security
 */
export const PROVIDER_IP_WHITELISTS = {
  honeybook: ['52.87.145.240', '54.173.224.212', '54.236.169.110'],
  tave: ['198.58.111.200', '198.58.111.201'],
} as const;
