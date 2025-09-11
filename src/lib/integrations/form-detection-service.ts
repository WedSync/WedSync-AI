/**
 * Form Detection Service - Multi-platform form detection and monitoring
 * WS-216 Auto-Population System - Team C Integration Infrastructure
 *
 * Handles:
 * - Webhook-based form creation notifications
 * - Polling-based form discovery for platforms without webhooks
 * - Form change detection (fields added/removed/modified)
 * - Platform-specific parsers (Typeform, Google Forms, custom HTML)
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ThirdPartyConnector } from './third-party-connector';
import { healthMonitor } from './connection-health-monitor';

// Form detection schemas
const DetectedFormSchema = z.object({
  platform: z.enum([
    'typeform',
    'google_forms',
    'jotform',
    'custom_html',
    'gravity_forms',
  ]),
  formId: z.string(),
  formTitle: z.string(),
  formUrl: z.string().optional(),
  fields: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      title: z.string(),
      type: z.string(),
      required: z.boolean(),
      options: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            value: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
  lastModified: z.date(),
  supplierId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const FormDetectionJobSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  platform: z.string(),
  externalFormId: z.string(),
  detectionMethod: z.enum(['webhook', 'polling']),
  formMetadata: z.record(z.unknown()).optional(),
  detectionAccuracy: z.number().min(0).max(1).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  detectedAt: z.date().optional(),
  processedAt: z.date().optional(),
});

type DetectedForm = z.infer<typeof DetectedFormSchema>;
type FormDetectionJob = z.infer<typeof FormDetectionJobSchema>;

interface DetectionEngine {
  detectNewForms(platformId: string): Promise<DetectedForm[]>;
  detectFormChanges(platformId: string, formId: string): Promise<boolean>;
  schedulePolling(platformId: string, intervalMinutes: number): void;
  stopPolling(platformId: string): void;
}

interface WebhookManager {
  registerWebhook(platformId: string, webhookUrl: string): Promise<boolean>;
  processWebhookEvent(
    platformId: string,
    payload: any,
  ): Promise<DetectedForm | null>;
  validateWebhookSignature(
    platformId: string,
    signature: string,
    payload: string,
  ): Promise<boolean>;
}

interface PollingScheduler {
  addPlatform(platformId: string, interval: number): void;
  removePlatform(platformId: string): void;
  updateInterval(platformId: string, interval: number): void;
  getScheduledPlatforms(): string[];
}

export class FormDetectionService implements DetectionEngine {
  private connector: ThirdPartyConnector;
  private webhookManager: FormWebhookManager;
  private pollingScheduler: FormPollingScheduler;
  private supabase: ReturnType<typeof createClient>;
  private detectionJobs: Map<string, FormDetectionJob> = new Map();

  constructor() {
    this.connector = new ThirdPartyConnector();
    this.webhookManager = new FormWebhookManager(this.connector);
    this.pollingScheduler = new FormPollingScheduler(this);
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
  }

  async initialize(): Promise<void> {
    // Load existing platform configurations and start monitoring
    const platforms = await this.getActivePlatforms();

    for (const platform of platforms) {
      // Set up webhooks where supported
      if (this.supportsWebhooks(platform.type)) {
        const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/webhooks/${platform.id}`;
        await this.webhookManager.registerWebhook(platform.id, webhookUrl);
      } else {
        // Set up polling for platforms without webhook support
        this.schedulePolling(platform.id, 15); // Poll every 15 minutes
      }
    }

    console.log(
      `Form Detection Service initialized for ${platforms.length} platforms`,
    );
  }

  async detectNewForms(platformId: string): Promise<DetectedForm[]> {
    try {
      const platform = await this.getPlatformConfig(platformId);
      if (!platform) {
        throw new Error(`Platform configuration not found: ${platformId}`);
      }

      // Get all forms from the platform
      const formsResult = await this.connector.fetchFormData(platformId, '*'); // Special ID for "all forms"

      if (!formsResult.success) {
        throw new Error(`Failed to fetch forms: ${formsResult.error}`);
      }

      const platformForms = Array.isArray(formsResult.data)
        ? formsResult.data
        : [formsResult.data];
      const detectedForms: DetectedForm[] = [];

      // Check each form against our existing records
      for (const form of platformForms) {
        const isNewForm = await this.isNewForm(platformId, form.formId);

        if (isNewForm) {
          const detectedForm = await this.transformToDetectedForm(
            platformId,
            form,
            platform.organization_id,
          );
          detectedForms.push(detectedForm);

          // Create detection job
          await this.createDetectionJob({
            organizationId: platform.organization_id,
            platform: platformId,
            externalFormId: form.formId,
            detectionMethod: 'polling',
            formMetadata: form.metadata,
            status: 'completed',
            detectedAt: new Date(),
            processedAt: new Date(),
          });
        }
      }

      // Update detection accuracy metrics
      if (detectedForms.length > 0) {
        await this.updateDetectionMetrics(
          platformId,
          detectedForms.length,
          platformForms.length,
        );
      }

      return detectedForms;
    } catch (error) {
      console.error(`Form detection error for platform ${platformId}:`, error);
      throw error;
    }
  }

  async detectFormChanges(
    platformId: string,
    formId: string,
  ): Promise<boolean> {
    try {
      // Get current form structure from platform
      const formResult = await this.connector.fetchFormData(platformId, formId);

      if (!formResult.success) {
        return false;
      }

      const currentForm = formResult.data;

      // Get stored form structure from our database
      const { data: storedForm } = await this.supabase
        .from('parsed_forms')
        .select('parsed_structure')
        .eq('platform', platformId)
        .eq('external_form_id', formId)
        .single();

      if (!storedForm) {
        // Form doesn't exist in our system, consider it a new form
        return true;
      }

      // Compare form structures
      const hasChanges = this.compareFormStructures(
        currentForm,
        storedForm.parsed_structure,
      );

      if (hasChanges) {
        // Update stored structure
        await this.supabase
          .from('parsed_forms')
          .update({
            parsed_structure: currentForm,
            parsed_at: new Date().toISOString(),
          })
          .eq('platform', platformId)
          .eq('external_form_id', formId);

        // Create change detection job
        await this.createDetectionJob({
          organizationId: storedForm.organization_id,
          platform: platformId,
          externalFormId: formId,
          detectionMethod: 'polling',
          formMetadata: {
            changeDetected: true,
            changeType: 'structure_modified',
          },
          status: 'completed',
          detectedAt: new Date(),
          processedAt: new Date(),
        });
      }

      return hasChanges;
    } catch (error) {
      console.error(
        `Change detection error for ${platformId}/${formId}:`,
        error,
      );
      return false;
    }
  }

  schedulePolling(platformId: string, intervalMinutes: number): void {
    this.pollingScheduler.addPlatform(platformId, intervalMinutes);
  }

  stopPolling(platformId: string): void {
    this.pollingScheduler.removePlatform(platformId);
  }

  async processWebhookDetection(
    platformId: string,
    payload: any,
  ): Promise<DetectedForm | null> {
    try {
      const detectedForm = await this.webhookManager.processWebhookEvent(
        platformId,
        payload,
      );

      if (detectedForm) {
        // Create detection job for webhook-triggered detection
        await this.createDetectionJob({
          organizationId: detectedForm.supplierId,
          platform: platformId,
          externalFormId: detectedForm.formId,
          detectionMethod: 'webhook',
          formMetadata: detectedForm.metadata,
          status: 'completed',
          detectedAt: new Date(),
          processedAt: new Date(),
        });

        // Update detection accuracy
        await this.updateDetectionMetrics(platformId, 1, 1);
      }

      return detectedForm;
    } catch (error) {
      console.error(
        `Webhook detection error for platform ${platformId}:`,
        error,
      );
      return null;
    }
  }

  private async getActivePlatforms(): Promise<any[]> {
    const { data: platforms, error } = await this.supabase
      .from('integration_platforms')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to fetch active platforms:', error);
      return [];
    }

    return platforms || [];
  }

  private async getPlatformConfig(platformId: string): Promise<any> {
    const { data: platform } = await this.supabase
      .from('integration_platforms')
      .select('*')
      .eq('id', platformId)
      .single();

    return platform;
  }

  private supportsWebhooks(platformType: string): boolean {
    const webhookSupportedPlatforms = ['typeform', 'jotform', 'gravity_forms'];
    return webhookSupportedPlatforms.includes(platformType);
  }

  private async isNewForm(
    platformId: string,
    formId: string,
  ): Promise<boolean> {
    const { data: existingForm } = await this.supabase
      .from('parsed_forms')
      .select('id')
      .eq('platform', platformId)
      .eq('external_form_id', formId)
      .single();

    return !existingForm;
  }

  private async transformToDetectedForm(
    platformId: string,
    formData: any,
    organizationId: string,
  ): Promise<DetectedForm> {
    return {
      platform: platformId as any,
      formId: formData.formId || formData.id,
      formTitle: formData.title || formData.formTitle || 'Untitled Form',
      formUrl: formData.url || formData.formUrl,
      fields: (formData.fields || []).map((field: any) => ({
        id: field.id,
        name: field.name || field.id,
        title: field.title || field.label || field.name,
        type: field.type || 'text',
        required: field.required || false,
        options: field.options || [],
      })),
      lastModified: new Date(),
      supplierId: organizationId,
      metadata: formData.metadata || {},
    };
  }

  private compareFormStructures(current: any, stored: any): boolean {
    // Simple comparison - in production, you'd want more sophisticated comparison
    const currentFields = JSON.stringify(
      current.fields?.map((f: any) => ({
        id: f.id,
        type: f.type,
        required: f.required,
      })) || [],
    );

    const storedFields = JSON.stringify(
      stored.fields?.map((f: any) => ({
        id: f.id,
        type: f.type,
        required: f.required,
      })) || [],
    );

    return currentFields !== storedFields;
  }

  private async createDetectionJob(
    job: Partial<FormDetectionJob>,
  ): Promise<void> {
    const { error } = await this.supabase.from('form_detection_jobs').insert({
      id: job.id || crypto.randomUUID(),
      organization_id: job.organizationId,
      platform: job.platform,
      external_form_id: job.externalFormId,
      detection_method: job.detectionMethod,
      form_metadata: job.formMetadata,
      detection_accuracy: job.detectionAccuracy,
      status: job.status,
      detected_at: job.detectedAt?.toISOString(),
      processed_at: job.processedAt?.toISOString(),
    });

    if (error) {
      console.error('Failed to create detection job:', error);
    }
  }

  private async updateDetectionMetrics(
    platformId: string,
    detected: number,
    total: number,
  ): Promise<void> {
    const accuracy = total > 0 ? detected / total : 0;

    const { error } = await this.supabase.from('processing_metrics').insert({
      metric_name: 'form_detection_accuracy',
      metric_value: accuracy,
      platform: platformId,
      time_period: '1h',
      recorded_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to update detection metrics:', error);
    }
  }

  // Health check integration
  async getDetectionHealth(): Promise<any> {
    const platforms = await this.getActivePlatforms();
    const health = [];

    for (const platform of platforms) {
      const platformHealth = await healthMonitor.getPlatformHealth(platform.id);
      health.push({
        platformId: platform.id,
        platformType: platform.type,
        health: platformHealth,
        pollingActive: this.pollingScheduler
          .getScheduledPlatforms()
          .includes(platform.id),
        webhookConfigured: this.supportsWebhooks(platform.type),
      });
    }

    return health;
  }
}

// Webhook Manager Implementation
class FormWebhookManager implements WebhookManager {
  constructor(private connector: ThirdPartyConnector) {}

  async registerWebhook(
    platformId: string,
    webhookUrl: string,
  ): Promise<boolean> {
    try {
      // This would typically involve platform-specific webhook setup
      // For now, we'll just log that webhook should be configured
      console.log(
        `Webhook should be configured for platform ${platformId}: ${webhookUrl}`,
      );
      return true;
    } catch (error) {
      console.error(`Failed to register webhook for ${platformId}:`, error);
      return false;
    }
  }

  async processWebhookEvent(
    platformId: string,
    payload: any,
  ): Promise<DetectedForm | null> {
    try {
      // Extract form information from webhook payload
      const formId = this.extractFormId(payload);
      if (!formId) return null;

      // Fetch full form data from the platform
      const formResult = await this.connector.fetchFormData(platformId, formId);
      if (!formResult.success) return null;

      // Transform to DetectedForm format
      // This would need platform-specific transformation logic
      return this.transformWebhookToDetectedForm(
        platformId,
        formResult.data,
        payload,
      );
    } catch (error) {
      console.error(`Webhook processing error for ${platformId}:`, error);
      return null;
    }
  }

  async validateWebhookSignature(
    platformId: string,
    signature: string,
    payload: string,
  ): Promise<boolean> {
    return this.connector.validateWebhook(platformId, signature, payload);
  }

  private extractFormId(payload: any): string | null {
    // Platform-specific form ID extraction
    return payload.form_id || payload.formId || payload.id || null;
  }

  private transformWebhookToDetectedForm(
    platformId: string,
    formData: any,
    webhookPayload: any,
  ): DetectedForm | null {
    try {
      return {
        platform: platformId as any,
        formId: formData.formId || formData.id,
        formTitle: formData.title,
        formUrl: formData.url,
        fields: formData.fields || [],
        lastModified: new Date(),
        supplierId: webhookPayload.organization_id || formData.organization_id,
        metadata: {
          webhookEvent: true,
          eventType: webhookPayload.event_type,
          receivedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Transform webhook data error:', error);
      return null;
    }
  }
}

// Polling Scheduler Implementation
class FormPollingScheduler implements PollingScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private detectionService: FormDetectionService) {}

  addPlatform(platformId: string, intervalMinutes: number): void {
    // Clear existing interval if it exists
    this.removePlatform(platformId);

    // Set up new polling interval
    const interval = setInterval(
      async () => {
        try {
          console.log(`Polling forms for platform: ${platformId}`);
          await this.detectionService.detectNewForms(platformId);
        } catch (error) {
          console.error(`Polling error for platform ${platformId}:`, error);
        }
      },
      intervalMinutes * 60 * 1000,
    );

    this.intervals.set(platformId, interval);
    console.log(
      `Polling scheduled for platform ${platformId} every ${intervalMinutes} minutes`,
    );
  }

  removePlatform(platformId: string): void {
    const interval = this.intervals.get(platformId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(platformId);
      console.log(`Polling removed for platform: ${platformId}`);
    }
  }

  updateInterval(platformId: string, intervalMinutes: number): void {
    this.addPlatform(platformId, intervalMinutes);
  }

  getScheduledPlatforms(): string[] {
    return Array.from(this.intervals.keys());
  }
}

// Singleton instance
export const formDetectionService = new FormDetectionService();
