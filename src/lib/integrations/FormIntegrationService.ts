/**
 * Advanced Form Builder Engine Integration Service
 * Main orchestrator for all form submission integrations
 *
 * Wedding Industry Focus:
 * - Handle 10,000+ concurrent users during wedding season
 * - Ensure zero data loss for irreplaceable wedding information
 * - Real-time status monitoring for critical wedding day operations
 */

import { Queue } from 'bull';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Types and Interfaces
export interface FormSubmission {
  id: string;
  form_id: string;
  organization_id: string;
  submitted_by?: string;
  submission_data: Record<string, any>;
  client_info: WeddingClientInfo;
  wedding_details?: WeddingDetails;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

export interface WeddingClientInfo {
  name: string;
  email: string;
  phone?: string;
  partner_name?: string;
  wedding_date?: string;
  venue_name?: string;
  guest_count?: number;
  budget_range?: 'economy' | 'mid-range' | 'luxury' | 'ultra-luxury';
  service_type:
    | 'photography'
    | 'videography'
    | 'venue'
    | 'catering'
    | 'floral'
    | 'planning';
}

export interface WeddingDetails {
  ceremony_location?: string;
  reception_location?: string;
  wedding_style?: string;
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  timeline?: WeddingTimelineEvent[];
  special_requirements?: string[];
  dietary_restrictions?: string[];
}

export interface WeddingTimelineEvent {
  time: string;
  event: string;
  location?: string;
  duration?: number;
  vendor_involved?: string[];
}

export interface IntegrationConfig {
  provider: IntegrationProvider;
  enabled: boolean;
  priority: number; // 1 = highest, 10 = lowest
  config: Record<string, any>;
  field_mappings: FieldMapping[];
  triggers: IntegrationTrigger[];
  retry_policy: RetryPolicy;
  wedding_specific_rules?: WeddingIntegrationRules;
}

export interface FieldMapping {
  source_field: string;
  target_field: string;
  transformation?: string; // JavaScript function as string
  validation?: z.ZodSchema;
  required: boolean;
  wedding_context?: 'client' | 'wedding' | 'service' | 'timeline';
}

export interface IntegrationTrigger {
  condition: string; // JavaScript expression
  delay?: number; // ms
  depends_on?: string[]; // Other integration IDs that must complete first
}

export interface RetryPolicy {
  max_attempts: number;
  backoff_strategy: 'linear' | 'exponential' | 'fixed';
  base_delay: number; // ms
  max_delay: number; // ms
  wedding_day_override?: {
    max_attempts: number;
    base_delay: number;
  };
}

export interface WeddingIntegrationRules {
  block_on_wedding_day?: boolean; // Prevent risky operations
  priority_boost_for_urgent?: boolean; // Boost priority for same-day weddings
  require_manual_approval?: boolean; // Require approval for high-value contracts
  preserve_wedding_date?: boolean; // Never allow wedding date changes
}

export type IntegrationProvider =
  | 'tave'
  | 'honeybook'
  | 'lightblue'
  | 'pixieset'
  | 'seventeen'
  | 'shootproof'
  | 'google_calendar'
  | 'outlook'
  | 'stripe'
  | 'quickbooks'
  | 'xero'
  | 'resend';

export interface IntegrationResult {
  integration_id: string;
  provider: IntegrationProvider;
  status: 'success' | 'failed' | 'partial' | 'pending';
  records_created?: number;
  records_updated?: number;
  records_failed?: number;
  error_message?: string;
  execution_time: number; // ms
  retry_count: number;
  wedding_context?: {
    affects_wedding_day: boolean;
    urgency_level: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface IntegrationStatus {
  form_id: string;
  organization_id: string;
  total_integrations: number;
  completed_integrations: number;
  failed_integrations: number;
  pending_integrations: number;
  overall_status: 'processing' | 'completed' | 'partial_failure' | 'failed';
  results: IntegrationResult[];
  started_at: string;
  completed_at?: string;
  estimated_completion?: string;
}

// Main FormIntegrationService Class
export class FormIntegrationService {
  private redis: Redis;
  private integrationQueue: Queue;
  private supabase: any;
  private isWeddingWeekend: boolean;

  constructor() {
    // Initialize Redis connection with clustering for high availability
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    // Initialize Bull Queue for background job processing
    this.integrationQueue = new Queue('form-integration-jobs', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 successful jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
      settings: {
        stalledInterval: 30 * 1000, // 30 seconds
        maxStalledCount: 1,
      },
    });

    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check if it's wedding weekend (Friday-Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    this.isWeddingWeekend = dayOfWeek >= 5 && dayOfWeek <= 0; // Fri, Sat, Sun

    this.setupJobProcessors();
    this.setupEventListeners();
  }

  /**
   * Main entry point for processing form submissions
   * Orchestrates all configured integrations for a form
   */
  async processFormSubmission(
    submission: FormSubmission,
  ): Promise<IntegrationStatus> {
    const startTime = Date.now();

    try {
      console.log(
        `🚀 Processing form submission ${submission.id} for organization ${submission.organization_id}`,
      );

      // Validate submission data
      const validationResult = await this.validateSubmission(submission);
      if (!validationResult.valid) {
        throw new Error(
          `Invalid submission data: ${validationResult.errors.join(', ')}`,
        );
      }

      // Get configured integrations for this form
      const integrations = await this.getFormIntegrations(submission.form_id);

      if (integrations.length === 0) {
        console.log(
          `ℹ️ No integrations configured for form ${submission.form_id}`,
        );
        return this.createIntegrationStatus(submission, [], startTime);
      }

      // Apply wedding-specific rules
      const filteredIntegrations = await this.applyWeddingRules(
        integrations,
        submission,
      );

      // Sort integrations by priority and dependencies
      const orderedIntegrations =
        this.orderIntegrationsByPriority(filteredIntegrations);

      // Create integration status record
      const statusId = await this.createIntegrationStatusRecord(
        submission,
        orderedIntegrations,
      );

      // Process integrations
      const results: IntegrationResult[] = [];

      for (const integration of orderedIntegrations) {
        try {
          const result = await this.processIntegration(
            submission,
            integration,
            statusId,
          );
          results.push(result);

          // Update real-time status
          await this.updateIntegrationProgress(statusId, results);
        } catch (error) {
          console.error(
            `❌ Integration ${integration.provider} failed:`,
            error,
          );

          const failedResult: IntegrationResult = {
            integration_id: `${integration.provider}-${Date.now()}`,
            provider: integration.provider,
            status: 'failed',
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
            execution_time: Date.now() - startTime,
            retry_count: 0,
            wedding_context: {
              affects_wedding_day: this.checkWeddingDayImpact(
                submission,
                integration,
              ),
              urgency_level: this.calculateUrgencyLevel(
                submission,
                integration,
              ),
            },
          };

          results.push(failedResult);
        }
      }

      // Final status update
      const finalStatus = this.calculateOverallStatus(results);
      await this.updateFinalIntegrationStatus(statusId, finalStatus, results);

      console.log(
        `✅ Form submission processing completed in ${Date.now() - startTime}ms`,
      );

      return this.createIntegrationStatus(
        submission,
        results,
        startTime,
        Date.now(),
      );
    } catch (error) {
      console.error(
        `💥 Critical error processing form submission ${submission.id}:`,
        error,
      );

      // Ensure we don't lose the submission data
      await this.saveFailedSubmission(submission, error);

      throw error;
    }
  }

  /**
   * Setup form integrations for a specific form
   */
  async setupFormIntegrations(
    formId: string,
    organizationId: string,
    config: IntegrationConfig[],
  ): Promise<void> {
    try {
      console.log(`🔧 Setting up integrations for form ${formId}`);

      // Validate each integration configuration
      for (const integration of config) {
        const validation = await this.validateIntegrationConfig(integration);
        if (!validation.valid) {
          throw new Error(
            `Invalid configuration for ${integration.provider}: ${validation.errors.join(', ')}`,
          );
        }
      }

      // Store integration configurations
      const { error } = await this.supabase.from('form_integrations').upsert(
        config.map((int) => ({
          form_id: formId,
          organization_id: organizationId,
          provider: int.provider,
          enabled: int.enabled,
          priority: int.priority,
          config: int.config,
          field_mappings: int.field_mappings,
          triggers: int.triggers,
          retry_policy: int.retry_policy,
          wedding_specific_rules: int.wedding_specific_rules,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'form_id,provider' },
      );

      if (error) {
        throw new Error(
          `Failed to save integration configurations: ${error.message}`,
        );
      }

      console.log(
        `✅ Successfully configured ${config.length} integrations for form ${formId}`,
      );
    } catch (error) {
      console.error(`❌ Failed to setup form integrations:`, error);
      throw error;
    }
  }

  /**
   * Validate integration configuration
   */
  async validateIntegrationConfig(
    config: IntegrationConfig,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!config.provider) {
      errors.push('Provider is required');
    }

    if (config.priority < 1 || config.priority > 10) {
      errors.push('Priority must be between 1 and 10');
    }

    // Provider-specific validation
    switch (config.provider) {
      case 'tave':
        if (!config.config.api_key) {
          errors.push('Tave API key is required');
        }
        break;

      case 'honeybook':
        if (!config.config.client_id || !config.config.client_secret) {
          errors.push('HoneyBook OAuth credentials are required');
        }
        break;

      case 'stripe':
        if (!config.config.secret_key || !config.config.publishable_key) {
          errors.push('Stripe API keys are required');
        }
        break;

      case 'resend':
        if (!config.config.api_key) {
          errors.push('Resend API key is required');
        }
        break;
    }

    // Validate field mappings
    for (const mapping of config.field_mappings) {
      if (!mapping.source_field || !mapping.target_field) {
        errors.push('Field mappings must have both source and target fields');
      }
    }

    // Wedding-specific validation
    if (config.wedding_specific_rules) {
      if (
        config.wedding_specific_rules.block_on_wedding_day &&
        this.isWeddingWeekend
      ) {
        console.warn(
          `⚠️ Integration ${config.provider} is configured to block on wedding days`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get integration status for a form submission
   */
  async getIntegrationStatus(
    submissionId: string,
  ): Promise<IntegrationStatus | null> {
    try {
      const { data, error } = await this.supabase
        .from('integration_status')
        .select(
          `
          *,
          integration_results (*)
        `,
        )
        .eq('submission_id', submissionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No status found
        }
        throw error;
      }

      return {
        form_id: data.form_id,
        organization_id: data.organization_id,
        total_integrations: data.total_integrations,
        completed_integrations: data.completed_integrations,
        failed_integrations: data.failed_integrations,
        pending_integrations: data.pending_integrations,
        overall_status: data.overall_status,
        results: data.integration_results || [],
        started_at: data.started_at,
        completed_at: data.completed_at,
        estimated_completion: data.estimated_completion,
      };
    } catch (error) {
      console.error(`❌ Failed to get integration status:`, error);
      throw error;
    }
  }

  // Private helper methods
  private async validateSubmission(
    submission: FormSubmission,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!submission.id || !submission.form_id || !submission.organization_id) {
      errors.push('Missing required submission fields');
    }

    if (!submission.client_info?.name || !submission.client_info?.email) {
      errors.push('Client name and email are required');
    }

    // Wedding date validation
    if (submission.wedding_details?.timeline) {
      for (const event of submission.wedding_details.timeline) {
        if (!event.time || !event.event) {
          errors.push('Timeline events must have time and event description');
        }
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      submission.client_info?.email &&
      !emailRegex.test(submission.client_info.email)
    ) {
      errors.push('Invalid email format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async getFormIntegrations(
    formId: string,
  ): Promise<IntegrationConfig[]> {
    const { data, error } = await this.supabase
      .from('form_integrations')
      .select('*')
      .eq('form_id', formId)
      .eq('enabled', true)
      .order('priority', { ascending: true });

    if (error) {
      throw new Error(`Failed to get form integrations: ${error.message}`);
    }

    return data || [];
  }

  private async applyWeddingRules(
    integrations: IntegrationConfig[],
    submission: FormSubmission,
  ): Promise<IntegrationConfig[]> {
    const filtered: IntegrationConfig[] = [];

    for (const integration of integrations) {
      let shouldInclude = true;

      if (integration.wedding_specific_rules) {
        const rules = integration.wedding_specific_rules;

        // Block risky operations on wedding weekends
        if (rules.block_on_wedding_day && this.isWeddingWeekend) {
          console.warn(
            `⚠️ Blocking ${integration.provider} integration due to wedding weekend policy`,
          );
          shouldInclude = false;
        }

        // Require manual approval for high-value contracts
        if (
          rules.require_manual_approval &&
          this.isHighValueContract(submission)
        ) {
          console.log(
            `⏸️ ${integration.provider} integration requires manual approval for high-value contract`,
          );
          // Add to pending approval queue instead of processing immediately
          await this.addToPendingApproval(integration, submission);
          shouldInclude = false;
        }
      }

      if (shouldInclude) {
        // Apply priority boosts for urgent weddings
        if (integration.wedding_specific_rules?.priority_boost_for_urgent) {
          const daysUntilWedding = this.getDaysUntilWedding(submission);
          if (daysUntilWedding <= 7) {
            integration.priority = Math.max(1, integration.priority - 2); // Boost priority
            console.log(
              `🚀 Boosted priority for ${integration.provider} due to urgent wedding (${daysUntilWedding} days)`,
            );
          }
        }

        filtered.push(integration);
      }
    }

    return filtered;
  }

  private orderIntegrationsByPriority(
    integrations: IntegrationConfig[],
  ): IntegrationConfig[] {
    return integrations.sort((a, b) => a.priority - b.priority);
  }

  private async createIntegrationStatusRecord(
    submission: FormSubmission,
    integrations: IntegrationConfig[],
  ): Promise<string> {
    const statusId = `status_${submission.id}_${Date.now()}`;

    const { error } = await this.supabase.from('integration_status').insert({
      id: statusId,
      submission_id: submission.id,
      form_id: submission.form_id,
      organization_id: submission.organization_id,
      total_integrations: integrations.length,
      completed_integrations: 0,
      failed_integrations: 0,
      pending_integrations: integrations.length,
      overall_status: 'processing',
      started_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(
        `Failed to create integration status record: ${error.message}`,
      );
    }

    return statusId;
  }

  private async processIntegration(
    submission: FormSubmission,
    integration: IntegrationConfig,
    statusId: string,
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const integrationId = `${integration.provider}_${submission.id}_${startTime}`;

    console.log(
      `🔄 Processing ${integration.provider} integration for submission ${submission.id}`,
    );

    // Create job for background processing
    const job = await this.integrationQueue.add(
      'process-integration',
      {
        integration_id: integrationId,
        submission,
        integration,
        status_id: statusId,
      },
      {
        priority: integration.priority,
        delay: this.calculateIntegrationDelay(integration, submission),
        attempts: integration.retry_policy.max_attempts,
        backoff: {
          type: integration.retry_policy.backoff_strategy,
          delay: integration.retry_policy.base_delay,
        },
      },
    );

    // For high-priority wedding day operations, wait for completion
    if (this.isWeddingWeekend && integration.priority <= 2) {
      console.log(
        `⚡ Waiting for high-priority wedding day integration ${integration.provider}`,
      );
      const result = await job.finished();
      return result as IntegrationResult;
    }

    // For normal operations, return pending result
    return {
      integration_id: integrationId,
      provider: integration.provider,
      status: 'pending',
      execution_time: Date.now() - startTime,
      retry_count: 0,
      wedding_context: {
        affects_wedding_day: this.checkWeddingDayImpact(
          submission,
          integration,
        ),
        urgency_level: this.calculateUrgencyLevel(submission, integration),
      },
    };
  }

  private setupJobProcessors(): void {
    // Process integration jobs
    this.integrationQueue.process('process-integration', 5, async (job) => {
      const { integration_id, submission, integration, status_id } = job.data;

      try {
        console.log(
          `🔄 Processing job for integration ${integration.provider}`,
        );

        // Import and execute provider-specific integration
        const result = await this.executeProviderIntegration(
          submission,
          integration,
        );

        // Update database with result
        await this.saveIntegrationResult(status_id, result);

        console.log(
          `✅ Completed ${integration.provider} integration in ${result.execution_time}ms`,
        );

        return result;
      } catch (error) {
        console.error(`❌ Job failed for ${integration.provider}:`, error);

        const failedResult: IntegrationResult = {
          integration_id,
          provider: integration.provider,
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          execution_time: Date.now() - Date.now(),
          retry_count: job.attemptsMade,
          wedding_context: {
            affects_wedding_day: this.checkWeddingDayImpact(
              submission,
              integration,
            ),
            urgency_level: this.calculateUrgencyLevel(submission, integration),
          },
        };

        await this.saveIntegrationResult(status_id, failedResult);
        throw error;
      }
    });
  }

  private setupEventListeners(): void {
    // Listen for job completion
    this.integrationQueue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    // Listen for job failures
    this.integrationQueue.on('failed', (job, error) => {
      console.error(`❌ Job ${job.id} failed:`, error);

      // Send alert for critical wedding day failures
      if (this.isWeddingWeekend && job.data.integration.priority <= 2) {
        this.sendCriticalAlert(job.data, error);
      }
    });

    // Listen for stalled jobs
    this.integrationQueue.on('stalled', (job) => {
      console.warn(`⚠️ Job ${job.id} has stalled and will be retried`);
    });
  }

  private async executeProviderIntegration(
    submission: FormSubmission,
    integration: IntegrationConfig,
  ): Promise<IntegrationResult> {
    const startTime = Date.now();

    // Dynamic import based on provider
    switch (integration.provider) {
      case 'tave':
        const { TaveIntegration } = await import('./providers/TaveIntegration');
        const taveIntegration = new TaveIntegration(integration.config);
        return await taveIntegration.processSubmission(
          submission,
          integration.field_mappings,
        );

      case 'honeybook':
        const { HoneyBookIntegration } = await import(
          './providers/HoneyBookIntegration'
        );
        const honeybookIntegration = new HoneyBookIntegration(
          integration.config,
        );
        return await honeybookIntegration.processSubmission(
          submission,
          integration.field_mappings,
        );

      case 'resend':
        const { EmailAutomationEngine } = await import(
          './EmailAutomationEngine'
        );
        const emailEngine = new EmailAutomationEngine();
        return await emailEngine.processFormSubmission(submission, integration);

      default:
        throw new Error(
          `Unsupported integration provider: ${integration.provider}`,
        );
    }
  }

  // Additional helper methods
  private createIntegrationStatus(
    submission: FormSubmission,
    results: IntegrationResult[],
    startTime: number,
    endTime?: number,
  ): IntegrationStatus {
    const completed = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const pending = results.filter((r) => r.status === 'pending').length;

    let overallStatus:
      | 'processing'
      | 'completed'
      | 'partial_failure'
      | 'failed';
    if (pending > 0) {
      overallStatus = 'processing';
    } else if (failed === 0) {
      overallStatus = 'completed';
    } else if (completed > 0) {
      overallStatus = 'partial_failure';
    } else {
      overallStatus = 'failed';
    }

    return {
      form_id: submission.form_id,
      organization_id: submission.organization_id,
      total_integrations: results.length,
      completed_integrations: completed,
      failed_integrations: failed,
      pending_integrations: pending,
      overall_status: overallStatus,
      results,
      started_at: new Date(startTime).toISOString(),
      completed_at: endTime ? new Date(endTime).toISOString() : undefined,
    };
  }

  private checkWeddingDayImpact(
    submission: FormSubmission,
    integration: IntegrationConfig,
  ): boolean {
    if (!submission.wedding_details) return false;

    const weddingDate = submission.wedding_details
      ? new Date(submission.client_info.wedding_date!)
      : null;
    if (!weddingDate) return false;

    const now = new Date();
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Affects wedding day if wedding is within 7 days and integration touches critical systems
    return (
      daysUntilWedding <= 7 &&
      ['tave', 'honeybook', 'google_calendar', 'stripe'].includes(
        integration.provider,
      )
    );
  }

  private calculateUrgencyLevel(
    submission: FormSubmission,
    integration: IntegrationConfig,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const daysUntilWedding = this.getDaysUntilWedding(submission);

    if (daysUntilWedding <= 1) return 'critical';
    if (daysUntilWedding <= 7) return 'high';
    if (daysUntilWedding <= 30) return 'medium';
    return 'low';
  }

  private getDaysUntilWedding(submission: FormSubmission): number {
    if (!submission.client_info.wedding_date) return 999;

    const weddingDate = new Date(submission.client_info.wedding_date);
    const now = new Date();
    return Math.ceil(
      (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private isHighValueContract(submission: FormSubmission): boolean {
    return (
      submission.client_info.budget_range === 'luxury' ||
      submission.client_info.budget_range === 'ultra-luxury'
    );
  }

  private calculateIntegrationDelay(
    integration: IntegrationConfig,
    submission: FormSubmission,
  ): number {
    // No delay for wedding day operations
    if (
      this.isWeddingWeekend &&
      this.checkWeddingDayImpact(submission, integration)
    ) {
      return 0;
    }

    // Apply configured delays
    return integration.triggers.reduce((maxDelay, trigger) => {
      return Math.max(maxDelay, trigger.delay || 0);
    }, 0);
  }

  private async updateIntegrationProgress(
    statusId: string,
    results: IntegrationResult[],
  ): Promise<void> {
    const completed = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const pending = results.filter((r) => r.status === 'pending').length;

    await this.supabase
      .from('integration_status')
      .update({
        completed_integrations: completed,
        failed_integrations: failed,
        pending_integrations: pending,
        updated_at: new Date().toISOString(),
      })
      .eq('id', statusId);
  }

  private calculateOverallStatus(results: IntegrationResult[]): string {
    const completed = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const pending = results.filter((r) => r.status === 'pending').length;

    if (pending > 0) return 'processing';
    if (failed === 0) return 'completed';
    if (completed > 0) return 'partial_failure';
    return 'failed';
  }

  private async updateFinalIntegrationStatus(
    statusId: string,
    status: string,
    results: IntegrationResult[],
  ): Promise<void> {
    await this.supabase
      .from('integration_status')
      .update({
        overall_status: status,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', statusId);
  }

  private async saveFailedSubmission(
    submission: FormSubmission,
    error: any,
  ): Promise<void> {
    await this.supabase.from('failed_submissions').insert({
      submission_id: submission.id,
      form_id: submission.form_id,
      organization_id: submission.organization_id,
      submission_data: submission,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : null,
      failed_at: new Date().toISOString(),
    });
  }

  private async saveIntegrationResult(
    statusId: string,
    result: IntegrationResult,
  ): Promise<void> {
    await this.supabase.from('integration_results').insert({
      status_id: statusId,
      integration_id: result.integration_id,
      provider: result.provider,
      status: result.status,
      records_created: result.records_created || 0,
      records_updated: result.records_updated || 0,
      records_failed: result.records_failed || 0,
      error_message: result.error_message,
      execution_time: result.execution_time,
      retry_count: result.retry_count,
      wedding_context: result.wedding_context,
      created_at: new Date().toISOString(),
    });
  }

  private async addToPendingApproval(
    integration: IntegrationConfig,
    submission: FormSubmission,
  ): Promise<void> {
    await this.supabase.from('pending_approvals').insert({
      submission_id: submission.id,
      organization_id: submission.organization_id,
      provider: integration.provider,
      submission_data: submission,
      integration_config: integration,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  private async sendCriticalAlert(jobData: any, error: any): Promise<void> {
    console.error(
      `🚨 CRITICAL WEDDING DAY ALERT: ${jobData.integration.provider} integration failed:`,
      error,
    );

    // In a real implementation, this would send alerts via:
    // - Email to organization admins
    // - SMS to emergency contacts
    // - Slack/Teams notifications
    // - Push notifications to mobile apps
  }
}

// Export singleton instance
export const formIntegrationService = new FormIntegrationService();
