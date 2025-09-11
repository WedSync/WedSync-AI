/**
 * Vendor Form Webhook System - Secure webhook processing for form notifications
 * WS-216 Auto-Population System - Team C Integration Infrastructure
 *
 * Features:
 * - Signature verification for multiple webhook providers
 * - Form payload parsing and validation
 * - Async processing queue for high-volume webhooks
 * - Error handling and retry logic
 * - Rate limiting and security measures
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import crypto from 'crypto';

// Webhook schemas
const WebhookEventSchema = z.object({
  platform: z.enum([
    'typeform',
    'google_forms',
    'jotform',
    'custom_html',
    'gravity_forms',
  ]),
  eventType: z.enum([
    'form_created',
    'form_updated',
    'form_deleted',
    'form_submission',
    'form_published',
  ]),
  formId: z.string(),
  organizationId: z.string().uuid(),
  payload: z.record(z.unknown()),
  signature: z.string(),
  timestamp: z.date(),
  processedAt: z.date().optional(),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
});

const WebhookProcessingJobSchema = z.object({
  jobId: z.string().uuid(),
  platform: z.enum([
    'typeform',
    'google_forms',
    'jotform',
    'custom_html',
    'gravity_forms',
  ]),
  eventType: z.enum([
    'form_created',
    'form_updated',
    'form_deleted',
    'form_submission',
    'form_published',
  ]),
  payload: z.record(z.unknown()),
  supplierId: z.string().uuid(),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
  processedAt: z.date().optional(),
  error: z.string().optional(),
  status: z
    .enum(['pending', 'processing', 'completed', 'failed'])
    .default('pending'),
});

type WebhookEvent = z.infer<typeof WebhookEventSchema>;
type WebhookProcessingJob = z.infer<typeof WebhookProcessingJobSchema>;

interface WebhookValidation {
  typeform: (payload: string, signature: string, secret: string) => boolean;
  googleForms: (payload: string, token: string, secret: string) => boolean;
  jotform: (payload: string, signature: string, secret: string) => boolean;
  custom: (payload: string, signature: string, secret: string) => boolean;
  gravityForms: (payload: string, signature: string, secret: string) => boolean;
}

interface WebhookProcessor {
  validateSignature(
    platform: string,
    signature: string,
    payload: string,
    secret: string,
  ): boolean;
  parsePayload(platform: string, payload: any): WebhookEvent | null;
  enqueueProcessing(event: WebhookEvent): Promise<void>;
  processWebhook(job: WebhookProcessingJob): Promise<void>;
}

export class VendorFormWebhookHandler implements WebhookProcessor {
  private supabase: ReturnType<typeof createClient>;
  private rateLimiter: Map<string, { count: number; resetTime: number }> =
    new Map();
  private processingQueue: Map<string, WebhookProcessingJob> = new Map();

  // Rate limiting configuration (requests per minute per platform)
  private readonly RATE_LIMITS = {
    typeform: 100,
    google_forms: 50,
    jotform: 100,
    custom_html: 30,
    gravity_forms: 60,
  };

  private readonly validationMethods: WebhookValidation = {
    typeform: this.validateTypeformSignature.bind(this),
    googleForms: this.validateGoogleFormsToken.bind(this),
    jotform: this.validateJotFormSignature.bind(this),
    custom: this.validateCustomSignature.bind(this),
    gravityForms: this.validateGravityFormsSignature.bind(this),
  };

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );

    // Start processing queue worker
    this.startQueueProcessor();
  }

  validateSignature(
    platform: string,
    signature: string,
    payload: string,
    secret: string,
  ): boolean {
    try {
      const validator =
        this.validationMethods[platform as keyof WebhookValidation];
      if (!validator) {
        console.warn(`No validation method found for platform: ${platform}`);
        return false;
      }

      return validator(payload, signature, secret);
    } catch (error) {
      console.error(`Signature validation error for ${platform}:`, error);
      return false;
    }
  }

  parsePayload(platform: string, payload: any): WebhookEvent | null {
    try {
      switch (platform) {
        case 'typeform':
          return this.parseTypeformPayload(payload);
        case 'google_forms':
          return this.parseGoogleFormsPayload(payload);
        case 'jotform':
          return this.parseJotFormPayload(payload);
        case 'custom_html':
          return this.parseCustomPayload(payload);
        case 'gravity_forms':
          return this.parseGravityFormsPayload(payload);
        default:
          console.error(`Unknown platform: ${platform}`);
          return null;
      }
    } catch (error) {
      console.error(`Payload parsing error for ${platform}:`, error);
      return null;
    }
  }

  async enqueueProcessing(event: WebhookEvent): Promise<void> {
    // Check rate limits
    if (!this.checkRateLimit(event.platform)) {
      throw new Error(`Rate limit exceeded for platform: ${event.platform}`);
    }

    // Create processing job
    const job: WebhookProcessingJob = {
      jobId: crypto.randomUUID(),
      platform: event.platform,
      eventType: event.eventType,
      payload: event.payload,
      supplierId: event.organizationId,
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
    };

    // Store in database
    const { error } = await this.supabase
      .from('integration_webhook_events')
      .insert({
        id: job.jobId,
        platform_id: event.platform,
        external_form_id: event.formId,
        event_type: event.eventType,
        payload: event.payload,
        signature: event.signature,
        processing_status: 'pending',
        retry_count: 0,
        received_at: event.timestamp.toISOString(),
      });

    if (error) {
      console.error('Failed to store webhook event:', error);
      throw new Error('Failed to store webhook event');
    }

    // Add to processing queue
    this.processingQueue.set(job.jobId, job);

    console.log(`Webhook event queued for processing: ${job.jobId}`);
  }

  async processWebhook(job: WebhookProcessingJob): Promise<void> {
    try {
      console.log(`Processing webhook job: ${job.jobId}`);

      // Update status to processing
      await this.updateJobStatus(job.jobId, 'processing');

      // Process based on event type
      switch (job.eventType) {
        case 'form_created':
        case 'form_updated':
          await this.handleFormChanged(job);
          break;
        case 'form_deleted':
          await this.handleFormDeleted(job);
          break;
        case 'form_submission':
          await this.handleFormSubmission(job);
          break;
        case 'form_published':
          await this.handleFormPublished(job);
          break;
        default:
          throw new Error(`Unsupported event type: ${job.eventType}`);
      }

      // Mark as completed
      await this.updateJobStatus(job.jobId, 'completed');
      console.log(`Webhook job completed: ${job.jobId}`);
    } catch (error) {
      console.error(`Webhook processing error for job ${job.jobId}:`, error);

      // Handle retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        await this.scheduleRetry(job);
      } else {
        await this.updateJobStatus(
          job.jobId,
          'failed',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }
  }

  // Platform-specific signature validation methods
  private validateTypeformSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');

    const receivedSignature = signature.replace('sha256=', '');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'base64'),
      Buffer.from(receivedSignature, 'base64'),
    );
  }

  private validateGoogleFormsToken(
    payload: string,
    token: string,
    secret: string,
  ): boolean {
    // Google Forms uses custom token validation
    const expectedToken = crypto
      .createHash('sha256')
      .update(secret + payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedToken, 'hex'),
      Buffer.from(token, 'hex'),
    );
  }

  private validateJotFormSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHash('md5')
      .update(payload + secret)
      .digest('hex');

    return signature === expectedSignature;
  }

  private validateCustomSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    // Default HMAC-SHA256 validation for custom forms
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    const cleanSignature = signature.replace(/^(sha256=|hmac-sha256=)/i, '');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(cleanSignature, 'hex'),
    );
  }

  private validateGravityFormsSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha1', secret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  }

  // Platform-specific payload parsing methods
  private parseTypeformPayload(payload: any): WebhookEvent | null {
    try {
      return {
        platform: 'typeform',
        eventType: this.mapTypeformEventType(payload.event_type),
        formId: payload.form_response?.form_id || payload.form?.id,
        organizationId:
          payload.organization_id || payload.form?.organization_id,
        payload: payload,
        signature: '', // Set by caller
        timestamp: new Date(payload.event_time || Date.now()),
      };
    } catch (error) {
      console.error('Typeform payload parsing error:', error);
      return null;
    }
  }

  private parseGoogleFormsPayload(payload: any): WebhookEvent | null {
    try {
      return {
        platform: 'google_forms',
        eventType: 'form_submission', // Google Forms primarily sends submission events
        formId: payload.formId,
        organizationId: payload.organization_id,
        payload: payload,
        signature: '',
        timestamp: new Date(payload.timestamp || Date.now()),
      };
    } catch (error) {
      console.error('Google Forms payload parsing error:', error);
      return null;
    }
  }

  private parseJotFormPayload(payload: any): WebhookEvent | null {
    try {
      return {
        platform: 'jotform',
        eventType: 'form_submission',
        formId: payload.formID,
        organizationId: payload.organization_id,
        payload: payload,
        signature: '',
        timestamp: new Date(
          payload.submissionID ? Date.now() : payload.created_at,
        ),
      };
    } catch (error) {
      console.error('JotForm payload parsing error:', error);
      return null;
    }
  }

  private parseCustomPayload(payload: any): WebhookEvent | null {
    try {
      return {
        platform: 'custom_html',
        eventType: payload.eventType || 'form_submission',
        formId: payload.formId || payload.form_id,
        organizationId: payload.organization_id,
        payload: payload,
        signature: '',
        timestamp: new Date(payload.timestamp || Date.now()),
      };
    } catch (error) {
      console.error('Custom payload parsing error:', error);
      return null;
    }
  }

  private parseGravityFormsPayload(payload: any): WebhookEvent | null {
    try {
      return {
        platform: 'gravity_forms',
        eventType: 'form_submission',
        formId: payload.form_id,
        organizationId: payload.organization_id,
        payload: payload,
        signature: '',
        timestamp: new Date(payload.date_created || Date.now()),
      };
    } catch (error) {
      console.error('Gravity Forms payload parsing error:', error);
      return null;
    }
  }

  private mapTypeformEventType(
    typeformEvent: string,
  ): WebhookEvent['eventType'] {
    const eventMap: Record<string, WebhookEvent['eventType']> = {
      form_response: 'form_submission',
      form_created: 'form_created',
      form_updated: 'form_updated',
      form_deleted: 'form_deleted',
      form_published: 'form_published',
    };

    return eventMap[typeformEvent] || 'form_submission';
  }

  // Rate limiting implementation
  private checkRateLimit(platform: string): boolean {
    const limit =
      this.RATE_LIMITS[platform as keyof typeof this.RATE_LIMITS] || 30;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    const current = this.rateLimiter.get(platform);

    if (!current || now > current.resetTime) {
      this.rateLimiter.set(platform, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (current.count >= limit) {
      return false;
    }

    current.count++;
    return true;
  }

  // Event handlers
  private async handleFormChanged(job: WebhookProcessingJob): Promise<void> {
    // Trigger form detection service to re-parse the form
    // This would integrate with the form detection service
    console.log(
      `Form changed event for ${job.platform} form ${job.payload.formId}`,
    );

    // Store form change event
    await this.supabase.from('form_detection_jobs').insert({
      organization_id: job.supplierId,
      platform_id: job.platform,
      form_id: job.payload.formId || job.payload.form_id,
      form_title: job.payload.title || 'Webhook Updated Form',
      status: 'pending',
      detection_method: 'webhook',
      form_metadata: {
        webhookEvent: true,
        eventType: job.eventType,
        receivedAt: new Date().toISOString(),
      },
    });
  }

  private async handleFormDeleted(job: WebhookProcessingJob): Promise<void> {
    console.log(
      `Form deleted event for ${job.platform} form ${job.payload.formId}`,
    );

    // Mark form as deleted in our system
    await this.supabase
      .from('parsed_forms')
      .update({
        metadata: {
          ...job.payload,
          deleted: true,
          deletedAt: new Date().toISOString(),
        },
      })
      .eq('platform', job.platform)
      .eq('external_form_id', job.payload.formId || job.payload.form_id);
  }

  private async handleFormSubmission(job: WebhookProcessingJob): Promise<void> {
    console.log(
      `Form submission event for ${job.platform} form ${job.payload.formId}`,
    );

    // This would typically trigger auto-population logic
    // For now, just log the submission
    await this.supabase.from('webhook_submissions').insert({
      platform: job.platform,
      form_id: job.payload.formId || job.payload.form_id,
      submission_data: job.payload,
      organization_id: job.supplierId,
      received_at: new Date().toISOString(),
    });
  }

  private async handleFormPublished(job: WebhookProcessingJob): Promise<void> {
    console.log(
      `Form published event for ${job.platform} form ${job.payload.formId}`,
    );

    // Trigger form detection for newly published forms
    await this.handleFormChanged(job);
  }

  // Queue processing
  private startQueueProcessor(): void {
    setInterval(async () => {
      await this.processQueuedJobs();
    }, 5000); // Process every 5 seconds
  }

  private async processQueuedJobs(): Promise<void> {
    // Get pending jobs from database
    const { data: pendingJobs } = await this.supabase
      .from('integration_webhook_events')
      .select('*')
      .eq('processing_status', 'pending')
      .lt('retry_count', 3)
      .order('received_at', { ascending: true })
      .limit(10);

    if (!pendingJobs || pendingJobs.length === 0) {
      return;
    }

    for (const dbJob of pendingJobs) {
      const job: WebhookProcessingJob = {
        jobId: dbJob.id,
        platform: dbJob.platform_id as any,
        eventType: dbJob.event_type as any,
        payload: dbJob.payload,
        supplierId: dbJob.organization_id || dbJob.supplier_id,
        retryCount: dbJob.retry_count,
        maxRetries: 3,
        status: 'pending',
      };

      // Process the job
      await this.processWebhook(job);
    }
  }

  private async updateJobStatus(
    jobId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    error?: string,
  ): Promise<void> {
    const updates: any = {
      processing_status: status,
    };

    if (status === 'completed') {
      updates.processed_at = new Date().toISOString();
    }

    if (error) {
      updates.error_message = error;
    }

    await this.supabase
      .from('integration_webhook_events')
      .update(updates)
      .eq('id', jobId);
  }

  private async scheduleRetry(job: WebhookProcessingJob): Promise<void> {
    // Exponential backoff: 2^retry_count minutes
    const delayMinutes = Math.pow(2, job.retryCount);
    const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    await this.supabase
      .from('integration_webhook_events')
      .update({
        retry_count: job.retryCount,
        processing_status: 'pending',
        retry_at: retryAt.toISOString(),
      })
      .eq('id', job.jobId);

    console.log(
      `Scheduled retry ${job.retryCount} for job ${job.jobId} at ${retryAt}`,
    );
  }

  // Health monitoring
  async getWebhookHealth(): Promise<any> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { data: recentEvents } = await this.supabase
      .from('integration_webhook_events')
      .select('platform_id, processing_status')
      .gte('received_at', oneHourAgo.toISOString());

    if (!recentEvents) {
      return { totalEvents: 0, platforms: {} };
    }

    const platformStats = recentEvents.reduce((acc: any, event) => {
      const platform = event.platform_id;
      if (!acc[platform]) {
        acc[platform] = { total: 0, completed: 0, failed: 0, pending: 0 };
      }

      acc[platform].total++;
      acc[platform][event.processing_status]++;

      return acc;
    }, {});

    return {
      totalEvents: recentEvents.length,
      platforms: platformStats,
      healthScore: this.calculateHealthScore(platformStats),
    };
  }

  private calculateHealthScore(stats: any): number {
    let totalEvents = 0;
    let successfulEvents = 0;

    Object.values(stats).forEach((platform: any) => {
      totalEvents += platform.total;
      successfulEvents += platform.completed;
    });

    return totalEvents > 0
      ? Math.round((successfulEvents / totalEvents) * 100)
      : 100;
  }

  // Security monitoring
  async logSecurityEvent(
    platform: string,
    sourceIP: string,
    eventType: 'invalid_signature' | 'rate_limit' | 'suspicious_activity',
    details: any,
  ): Promise<void> {
    await this.supabase.from('webhook_security_events').insert({
      platform,
      source_ip: sourceIP,
      event_type: eventType,
      details,
      created_at: new Date().toISOString(),
    });
  }
}

// Singleton instance
export const vendorFormWebhookHandler = new VendorFormWebhookHandler();
