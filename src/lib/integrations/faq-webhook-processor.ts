/**
 * FAQ Webhook Processor
 * Handles incoming webhooks for FAQ-related events with comprehensive validation
 */

import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { AuditLogger } from '@/lib/audit/audit-logger';

export interface WebhookEvent {
  type: 'faq.extraction.complete' | 'faq.sync.status' | 'faq.processing.status';
  id: string;
  timestamp: Date;
  organizationId: string;
  data: any;
}

export interface WebhookProcessingResult {
  success: boolean;
  processingTimeMs: number;
  error?: string;
  eventId?: string;
}

export interface WebhookSecurityContext {
  signature: string;
  organizationId: string;
  clientIp: string;
  userAgent?: string;
}

/**
 * Comprehensive FAQ webhook processor with security and audit logging
 */
export class FAQWebhookProcessor {
  private auditLogger: AuditLogger;
  private readonly secretKey: string;

  constructor() {
    this.auditLogger = new AuditLogger();
    this.secretKey = process.env.WEBHOOK_SECRET_KEY || 'dev-secret-key';

    if (
      !process.env.WEBHOOK_SECRET_KEY &&
      process.env.NODE_ENV === 'production'
    ) {
      throw new Error('WEBHOOK_SECRET_KEY must be set in production');
    }
  }

  /**
   * Process incoming webhook with comprehensive validation
   */
  async processWebhook(
    event: WebhookEvent,
    signature: string,
    organizationId: string,
    clientIp: string,
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();

    try {
      // Verify webhook signature
      if (!this.verifySignature(JSON.stringify(event), signature)) {
        await this.auditLogger.logSecurityEvent({
          type: 'WEBHOOK_SIGNATURE_VERIFICATION_FAILED',
          organizationId,
          metadata: {
            eventType: event.type,
            eventId: event.id,
            clientIp,
            signature: signature.substring(0, 10) + '...', // Log partial signature
          },
          severity: 'HIGH',
        });

        return {
          success: false,
          processingTimeMs: Date.now() - startTime,
          error: 'Invalid webhook signature',
        };
      }

      // Validate organization access
      const supabase = createServerClient();
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, webhook_settings')
        .eq('id', organizationId)
        .single();

      if (orgError || !organization) {
        await this.auditLogger.logSecurityEvent({
          type: 'WEBHOOK_INVALID_ORGANIZATION',
          organizationId,
          metadata: {
            eventType: event.type,
            eventId: event.id,
            error: orgError?.message,
          },
          severity: 'HIGH',
        });

        return {
          success: false,
          processingTimeMs: Date.now() - startTime,
          error: 'Invalid organization',
        };
      }

      // Process webhook based on type
      let result: WebhookProcessingResult;

      switch (event.type) {
        case 'faq.extraction.complete':
          result = await this.processExtractionComplete(event, organization);
          break;
        case 'faq.sync.status':
          result = await this.processSyncStatus(event, organization);
          break;
        case 'faq.processing.status':
          result = await this.processProcessingStatus(event, organization);
          break;
        default:
          return {
            success: false,
            processingTimeMs: Date.now() - startTime,
            error: `Unknown webhook event type: ${event.type}`,
          };
      }

      // Log successful processing
      await this.auditLogger.logActivity({
        type: 'WEBHOOK_PROCESSED',
        userId: null, // Webhooks are system events
        organizationId,
        metadata: {
          eventType: event.type,
          eventId: event.id,
          processingTimeMs: result.processingTimeMs,
          success: result.success,
        },
      });

      return {
        ...result,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Webhook processing failed:', error);

      await this.auditLogger.logError({
        type: 'WEBHOOK_PROCESSING_ERROR',
        organizationId,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          eventType: event.type,
          eventId: event.id,
          clientIp,
        },
      });

      return {
        success: false,
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process FAQ extraction complete webhook
   */
  private async processExtractionComplete(
    event: WebhookEvent,
    organization: any,
  ): Promise<WebhookProcessingResult> {
    const supabase = createServerClient();

    try {
      // Validate extraction data structure
      const extractionData = event.data.extractionResults;
      if (!extractionData || typeof extractionData.totalFAQs !== 'number') {
        throw new Error('Invalid extraction results data');
      }

      // Store extraction results in the database
      const { error: insertError } = await supabase
        .from('faq_extractions')
        .insert({
          id: event.id,
          organization_id: event.organizationId,
          job_id: event.data.jobId,
          total_faqs: extractionData.totalFAQs,
          successful_extractions: extractionData.successfulExtractions,
          failed_extractions: extractionData.failedExtractions,
          processing_time_ms: event.data.metadata.processingTimeMs,
          providers_used: event.data.metadata.providersUsed,
          retry_attempts: event.data.metadata.retryAttempts,
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            sources: extractionData.sources,
            extractedFAQs: extractionData.extractedFAQs,
          },
        });

      if (insertError) {
        throw new Error(
          `Failed to store extraction results: ${insertError.message}`,
        );
      }

      // Update FAQ items with extracted content
      if (
        extractionData.extractedFAQs &&
        extractionData.extractedFAQs.length > 0
      ) {
        const faqInserts = extractionData.extractedFAQs.map((faq: any) => ({
          id: faq.id,
          organization_id: event.organizationId,
          question: faq.question,
          answer: faq.answer,
          source_url: faq.sourceUrl,
          confidence: faq.confidence,
          category: faq.category || 'general',
          status: 'pending_review',
          extraction_id: event.id,
          metadata: faq.metadata || {},
        }));

        const { error: faqError } = await supabase
          .from('faq_items')
          .upsert(faqInserts, {
            onConflict: 'id',
            ignoreDuplicates: false,
          });

        if (faqError) {
          console.warn('Some FAQ items failed to insert:', faqError.message);
          // Don't fail the entire webhook for partial FAQ insert failures
        }
      }

      // Send notification to organization users
      await this.notifyExtractionComplete(event.organizationId, extractionData);

      return {
        success: true,
        processingTimeMs: 0, // Will be set by parent
        eventId: event.id,
      };
    } catch (error) {
      return {
        success: false,
        processingTimeMs: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process sync status webhook
   */
  private async processSyncStatus(
    event: WebhookEvent,
    organization: any,
  ): Promise<WebhookProcessingResult> {
    const supabase = createServerClient();

    try {
      // Update sync status in database
      const { error: updateError } = await supabase
        .from('integration_sync_status')
        .upsert(
          {
            organization_id: event.organizationId,
            service_type: 'faq_extraction',
            status: event.data.status,
            last_sync_at: new Date(event.timestamp).toISOString(),
            sync_details: event.data,
            error_message: event.data.error || null,
          },
          { onConflict: 'organization_id,service_type' },
        );

      if (updateError) {
        throw new Error(`Failed to update sync status: ${updateError.message}`);
      }

      return {
        success: true,
        processingTimeMs: 0,
        eventId: event.id,
      };
    } catch (error) {
      return {
        success: false,
        processingTimeMs: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process processing status webhook
   */
  private async processProcessingStatus(
    event: WebhookEvent,
    organization: any,
  ): Promise<WebhookProcessingResult> {
    const supabase = createServerClient();

    try {
      // Update processing job status
      const { error: updateError } = await supabase
        .from('faq_processing_jobs')
        .update({
          status: event.data.status,
          progress: event.data.progress || 0,
          updated_at: new Date().toISOString(),
          error_message: event.data.error || null,
          metadata: event.data.metadata || {},
        })
        .eq('id', event.data.jobId)
        .eq('organization_id', event.organizationId);

      if (updateError) {
        throw new Error(
          `Failed to update processing status: ${updateError.message}`,
        );
      }

      return {
        success: true,
        processingTimeMs: 0,
        eventId: event.id,
      };
    } catch (error) {
      return {
        success: false,
        processingTimeMs: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Verify webhook signature using HMAC
   */
  private verifySignature(payload: string, signature: string): boolean {
    try {
      // In production, implement proper HMAC-SHA256 signature verification
      // For now, basic validation to prevent obvious tampering
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(payload)
        .digest('hex');

      return `sha256=${expectedSignature}` === signature;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Send notification about extraction completion
   */
  private async notifyExtractionComplete(
    organizationId: string,
    extractionData: any,
  ): Promise<void> {
    try {
      const supabase = createServerClient();

      // Get organization admin users
      const { data: admins, error } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .eq('organization_id', organizationId)
        .eq('role', 'admin');

      if (error || !admins || admins.length === 0) {
        console.warn('No admin users found for notification');
        return;
      }

      // Create notification records
      const notifications = admins.map((admin) => ({
        user_id: admin.user_id,
        organization_id: organizationId,
        type: 'faq_extraction_complete',
        title: 'FAQ Extraction Complete',
        message: `${extractionData.totalFAQs} FAQs have been extracted and are ready for review.`,
        data: {
          totalFAQs: extractionData.totalFAQs,
          successfulExtractions: extractionData.successfulExtractions,
          failedExtractions: extractionData.failedExtractions,
        },
        status: 'unread',
        created_at: new Date().toISOString(),
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.warn(
          'Failed to create notifications:',
          notificationError.message,
        );
      }

      // TODO: Send email notifications using notification service
    } catch (error) {
      console.error(
        'Failed to send extraction completion notification:',
        error,
      );
    }
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      const supabase = createServerClient();

      // Test database connectivity
      const { error } = await supabase
        .from('organizations')
        .select('count')
        .limit(1);

      if (error) {
        return {
          status: 'unhealthy',
          details: {
            error: 'Database connection failed',
            message: error.message,
          },
        };
      }

      return {
        status: 'healthy',
        details: {
          timestamp: new Date().toISOString(),
          service: 'FAQ Webhook Processor',
          version: '1.0.0',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: 'Health check failed',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

/**
 * Singleton instance
 */
let processorInstance: FAQWebhookProcessor | null = null;

/**
 * Get or create webhook processor singleton
 */
export function getFAQWebhookProcessor(): FAQWebhookProcessor {
  if (!processorInstance) {
    processorInstance = new FAQWebhookProcessor();
  }
  return processorInstance;
}
