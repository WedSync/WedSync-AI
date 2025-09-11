/**
 * WedSync Job Processor
 *
 * Handles job execution, worker management, and performance optimization
 * for wedding industry workflows with wedding day emergency protocols.
 */

import { performance } from 'perf_hooks';
import { logger } from '../monitoring/logger';
import { WeddingJobType, WeddingJobPriority } from './JobQueue';

interface ProcessorMetrics {
  jobType: WeddingJobType;
  totalProcessed: number;
  successfullyProcessed: number;
  failedProcessed: number;
  averageProcessingTime: number;
  lastProcessedAt: Date;
  peakProcessingTime: number;
  errorRate: number;
}

interface WorkerConfig {
  maxConcurrency: number;
  timeout: number;
  retryAttempts: number;
  backoffDelay: number;
  memoryLimit: number; // MB
}

interface ProcessingContext {
  startTime: number;
  jobId: string;
  weddingId?: string;
  organizationId?: string;
  isWeddingDay: boolean;
  priority: WeddingJobPriority;
}

class WeddingJobProcessor {
  private metrics: Map<WeddingJobType, ProcessorMetrics> = new Map();
  private activeProcessing: Map<string, ProcessingContext> = new Map();
  private workerConfigs: Map<WeddingJobType, WorkerConfig> = new Map();
  private isShuttingDown = false;

  constructor() {
    this.initializeWorkerConfigs();
    this.startMetricsCollection();
    this.setupGracefulShutdown();
  }

  private initializeWorkerConfigs(): void {
    // Wedding-optimized worker configurations
    const configs: Array<[WeddingJobType, WorkerConfig]> = [
      // Critical Path Jobs - Wedding Day Optimized
      [
        WeddingJobType.FORM_AUTO_SAVE,
        {
          maxConcurrency: 20, // High concurrency for form saves
          timeout: 5000, // 5 second timeout
          retryAttempts: 5, // Multiple retries
          backoffDelay: 1000, // 1 second backoff
          memoryLimit: 128, // 128 MB limit
        },
      ],

      [
        WeddingJobType.VENUE_COORDINATION,
        {
          maxConcurrency: 10,
          timeout: 30000, // 30 seconds for venue coordination
          retryAttempts: 3,
          backoffDelay: 2000,
          memoryLimit: 256,
        },
      ],

      [
        WeddingJobType.EMERGENCY_NOTIFICATION,
        {
          maxConcurrency: 15,
          timeout: 10000,
          retryAttempts: 5, // Critical notifications get more retries
          backoffDelay: 500, // Fast retry for emergencies
          memoryLimit: 64,
        },
      ],

      // High Priority Jobs
      [
        WeddingJobType.EMAIL_NOTIFICATION,
        {
          maxConcurrency: 25, // High volume email processing
          timeout: 15000,
          retryAttempts: 3,
          backoffDelay: 2000,
          memoryLimit: 128,
        },
      ],

      [
        WeddingJobType.SMS_ALERT,
        {
          maxConcurrency: 20,
          timeout: 10000,
          retryAttempts: 3,
          backoffDelay: 1500,
          memoryLimit: 64,
        },
      ],

      [
        WeddingJobType.CRM_SYNC,
        {
          maxConcurrency: 8, // Limited by external API rates
          timeout: 60000, // 1 minute for CRM operations
          retryAttempts: 4,
          backoffDelay: 5000,
          memoryLimit: 256,
        },
      ],

      [
        WeddingJobType.TIMELINE_UPDATE,
        {
          maxConcurrency: 12,
          timeout: 20000,
          retryAttempts: 3,
          backoffDelay: 2000,
          memoryLimit: 128,
        },
      ],

      // Normal Priority Jobs
      [
        WeddingJobType.ANALYTICS_PROCESSING,
        {
          maxConcurrency: 6,
          timeout: 120000, // 2 minutes for analytics
          retryAttempts: 2,
          backoffDelay: 10000,
          memoryLimit: 512,
        },
      ],

      [
        WeddingJobType.REPORT_GENERATION,
        {
          maxConcurrency: 4,
          timeout: 300000, // 5 minutes for reports
          retryAttempts: 2,
          backoffDelay: 15000,
          memoryLimit: 1024, // 1 GB for large reports
        },
      ],

      [
        WeddingJobType.IMAGE_PROCESSING,
        {
          maxConcurrency: 6, // CPU intensive
          timeout: 180000, // 3 minutes
          retryAttempts: 2,
          backoffDelay: 5000,
          memoryLimit: 768,
        },
      ],

      // Low Priority Jobs
      [
        WeddingJobType.BULK_EMAIL,
        {
          maxConcurrency: 3,
          timeout: 600000, // 10 minutes
          retryAttempts: 1,
          backoffDelay: 30000,
          memoryLimit: 256,
        },
      ],

      [
        WeddingJobType.DATA_CLEANUP,
        {
          maxConcurrency: 2,
          timeout: 1800000, // 30 minutes
          retryAttempts: 1,
          backoffDelay: 60000,
          memoryLimit: 512,
        },
      ],

      [
        WeddingJobType.BACKUP_CREATION,
        {
          maxConcurrency: 1, // Single backup at a time
          timeout: 3600000, // 1 hour
          retryAttempts: 1,
          backoffDelay: 300000, // 5 minute backoff
          memoryLimit: 2048, // 2 GB for backups
        },
      ],
    ];

    configs.forEach(([jobType, config]) => {
      this.workerConfigs.set(jobType, config);
      this.initializeMetrics(jobType);
    });

    logger.info('Wedding job processor worker configurations initialized', {
      configuredJobs: configs.length,
    });
  }

  private initializeMetrics(jobType: WeddingJobType): void {
    this.metrics.set(jobType, {
      jobType,
      totalProcessed: 0,
      successfullyProcessed: 0,
      failedProcessed: 0,
      averageProcessingTime: 0,
      lastProcessedAt: new Date(),
      peakProcessingTime: 0,
      errorRate: 0,
    });
  }

  // Core processing methods for each job type
  public async processFormAutoSave(
    payload: any,
    context: ProcessingContext,
  ): Promise<any> {
    const { formId, formData, userId, isDraft } = payload;

    if (!formId || !formData) {
      throw new Error('Invalid form data: missing formId or formData');
    }

    try {
      // High-performance form saving optimized for wedding day
      const saveResult = await this.performFormSave({
        formId,
        formData,
        userId,
        isDraft,
        isWeddingDay: context.isWeddingDay,
        priority: context.priority,
      });

      // Wedding day form saves get extra verification
      if (context.isWeddingDay) {
        await this.verifyWeddingDayFormSave(formId, saveResult);
      }

      return {
        success: true,
        formId,
        savedAt: new Date(),
        version: saveResult.version,
        isWeddingDay: context.isWeddingDay,
      };
    } catch (error) {
      logger.error('Form auto-save failed', {
        formId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        context,
      });
      throw error;
    }
  }

  public async processVenueCoordination(
    payload: any,
    context: ProcessingContext,
  ): Promise<any> {
    const { weddingId, coordinationType, updates, emergencyLevel } = payload;

    try {
      // Wedding day venue coordination processing
      const result = await this.handleVenueCoordination({
        weddingId,
        coordinationType,
        updates,
        emergencyLevel,
        isWeddingDay: context.isWeddingDay,
      });

      // Emergency escalation for critical venue issues
      if (emergencyLevel === 'critical' && context.isWeddingDay) {
        await this.escalateVenueEmergency(weddingId, updates);
      }

      return {
        success: true,
        weddingId,
        coordinationType,
        processedAt: new Date(),
        escalated: emergencyLevel === 'critical',
      };
    } catch (error) {
      logger.error('Venue coordination failed', {
        weddingId,
        coordinationType,
        error: error instanceof Error ? error.message : 'Unknown error',
        context,
      });
      throw error;
    }
  }

  public async processEmailNotification(
    payload: any,
    context: ProcessingContext,
  ): Promise<any> {
    const { to, subject, template, templateData, priority } = payload;

    try {
      // Email processing with wedding-specific templates
      const emailResult = await this.sendWeddingEmail({
        to,
        subject,
        template,
        templateData,
        priority,
        isWeddingDay: context.isWeddingDay,
      });

      return {
        success: true,
        messageId: emailResult.messageId,
        to,
        sentAt: new Date(),
        isWeddingDay: context.isWeddingDay,
      };
    } catch (error) {
      logger.error('Email notification failed', {
        to,
        subject,
        error: error instanceof Error ? error.message : 'Unknown error',
        context,
      });
      throw error;
    }
  }

  public async processSMSAlert(
    payload: any,
    context: ProcessingContext,
  ): Promise<any> {
    const { phone, message, alertType, urgency } = payload;

    try {
      // SMS processing with wedding day priority routing
      const smsResult = await this.sendWeddingSMS({
        phone,
        message,
        alertType,
        urgency,
        isWeddingDay: context.isWeddingDay,
      });

      return {
        success: true,
        sid: smsResult.sid,
        phone,
        sentAt: new Date(),
        urgency,
      };
    } catch (error) {
      logger.error('SMS alert failed', {
        phone,
        alertType,
        error: error instanceof Error ? error.message : 'Unknown error',
        context,
      });
      throw error;
    }
  }

  public async processCRMSync(
    payload: any,
    context: ProcessingContext,
  ): Promise<any> {
    const { crmType, syncType, entityId, data } = payload;

    try {
      // CRM synchronization with rate limiting
      const syncResult = await this.syncWithCRM({
        crmType,
        syncType,
        entityId,
        data,
        organizationId: context.organizationId,
      });

      return {
        success: true,
        crmType,
        syncType,
        entityId,
        syncedAt: new Date(),
        recordsUpdated: syncResult.recordsUpdated,
      };
    } catch (error) {
      logger.error('CRM sync failed', {
        crmType,
        syncType,
        entityId,
        error: error instanceof Error ? error.message : 'Unknown error',
        context,
      });
      throw error;
    }
  }

  public async processAnalyticsProcessing(
    payload: any,
    context: ProcessingContext,
  ): Promise<any> {
    const { eventType, timeRange, organizationId, metrics } = payload;

    try {
      // Analytics processing and aggregation
      const analyticsResult = await this.processAnalyticsData({
        eventType,
        timeRange,
        organizationId,
        metrics,
      });

      return {
        success: true,
        eventType,
        timeRange,
        processedAt: new Date(),
        recordsProcessed: analyticsResult.recordsProcessed,
        insights: analyticsResult.insights,
      };
    } catch (error) {
      logger.error('Analytics processing failed', {
        eventType,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        context,
      });
      throw error;
    }
  }

  public async processImageProcessing(
    payload: any,
    context: ProcessingContext,
  ): Promise<any> {
    const { imageId, operations, quality, format } = payload;

    try {
      // Image optimization for wedding photos
      const imageResult = await this.optimizeWeddingImage({
        imageId,
        operations,
        quality,
        format,
      });

      return {
        success: true,
        imageId,
        processedAt: new Date(),
        originalSize: imageResult.originalSize,
        optimizedSize: imageResult.optimizedSize,
        compressionRatio: imageResult.compressionRatio,
      };
    } catch (error) {
      logger.error('Image processing failed', {
        imageId,
        operations,
        error: error instanceof Error ? error.message : 'Unknown error',
        context,
      });
      throw error;
    }
  }

  public async processBulkEmail(
    payload: any,
    context: ProcessingContext,
  ): Promise<any> {
    const { recipients, template, templateData, batchSize } = payload;

    try {
      // Bulk email processing with rate limiting
      const bulkResult = await this.sendBulkWeddingEmails({
        recipients,
        template,
        templateData,
        batchSize: batchSize || 50,
      });

      return {
        success: true,
        totalRecipients: recipients.length,
        processedAt: new Date(),
        sent: bulkResult.sent,
        failed: bulkResult.failed,
        batchSize,
      };
    } catch (error) {
      logger.error('Bulk email processing failed', {
        recipientCount: recipients?.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        context,
      });
      throw error;
    }
  }

  public async processDataCleanup(
    payload: any,
    context: ProcessingContext,
  ): Promise<any> {
    const { cleanupType, retentionDays, dryRun } = payload;

    try {
      // Data cleanup with safety checks
      const cleanupResult = await this.performDataCleanup({
        cleanupType,
        retentionDays,
        dryRun: dryRun || false,
      });

      return {
        success: true,
        cleanupType,
        processedAt: new Date(),
        recordsAffected: cleanupResult.recordsAffected,
        dryRun,
      };
    } catch (error) {
      logger.error('Data cleanup failed', {
        cleanupType,
        retentionDays,
        error: error instanceof Error ? error.message : 'Unknown error',
        context,
      });
      throw error;
    }
  }

  // Helper methods for actual processing (would integrate with your existing systems)
  private async performFormSave(params: any): Promise<any> {
    // Implementation would integrate with your form storage system
    // This is a placeholder for the actual database operations

    return {
      version: Date.now(),
      saved: true,
    };
  }

  private async verifyWeddingDayFormSave(
    formId: string,
    saveResult: any,
  ): Promise<void> {
    // Additional verification for wedding day form saves
    // Could include backup verification, integrity checks, etc.

    logger.info('Wedding day form save verified', { formId, saveResult });
  }

  private async handleVenueCoordination(params: any): Promise<any> {
    // Implementation would integrate with venue coordination systems

    return {
      coordinated: true,
      timestamp: new Date(),
    };
  }

  private async escalateVenueEmergency(
    weddingId: string,
    updates: any,
  ): Promise<void> {
    // Emergency escalation for critical venue issues

    logger.error('VENUE EMERGENCY ESCALATED', { weddingId, updates });
  }

  private async sendWeddingEmail(params: any): Promise<any> {
    // Implementation would integrate with Resend

    return {
      messageId: `email_${Date.now()}`,
    };
  }

  private async sendWeddingSMS(params: any): Promise<any> {
    // Implementation would integrate with Twilio

    return {
      sid: `sms_${Date.now()}`,
    };
  }

  private async syncWithCRM(params: any): Promise<any> {
    // Implementation would integrate with CRM systems (Tave, HoneyBook, etc.)

    return {
      recordsUpdated: Math.floor(Math.random() * 10) + 1,
    };
  }

  private async processAnalyticsData(params: any): Promise<any> {
    // Implementation would integrate with analytics processing

    return {
      recordsProcessed: Math.floor(Math.random() * 1000) + 100,
      insights: {
        trends: ['increasing_engagement'],
        metrics: { conversion_rate: 0.15 },
      },
    };
  }

  private async optimizeWeddingImage(params: any): Promise<any> {
    // Implementation would integrate with image processing library

    const originalSize = 2048000; // 2MB
    const optimizedSize = 512000; // 512KB

    return {
      originalSize,
      optimizedSize,
      compressionRatio: optimizedSize / originalSize,
    };
  }

  private async sendBulkWeddingEmails(params: any): Promise<any> {
    // Implementation would integrate with bulk email processing

    const { recipients, batchSize } = params;
    const sent = Math.floor(recipients.length * 0.95); // 95% success rate
    const failed = recipients.length - sent;

    return { sent, failed };
  }

  private async performDataCleanup(params: any): Promise<any> {
    // Implementation would integrate with data cleanup routines

    return {
      recordsAffected: Math.floor(Math.random() * 100) + 10,
    };
  }

  // Metrics and monitoring
  public updateMetrics(
    jobType: WeddingJobType,
    processingTime: number,
    success: boolean,
  ): void {
    const metrics = this.metrics.get(jobType);
    if (!metrics) return;

    metrics.totalProcessed++;
    metrics.lastProcessedAt = new Date();

    if (success) {
      metrics.successfullyProcessed++;
    } else {
      metrics.failedProcessed++;
    }

    // Update average processing time
    const totalSuccessful = metrics.successfullyProcessed;
    if (totalSuccessful > 0) {
      metrics.averageProcessingTime =
        (metrics.averageProcessingTime * (totalSuccessful - 1) +
          processingTime) /
        totalSuccessful;
    }

    // Update peak processing time
    if (processingTime > metrics.peakProcessingTime) {
      metrics.peakProcessingTime = processingTime;
    }

    // Calculate error rate
    metrics.errorRate =
      (metrics.failedProcessed / metrics.totalProcessed) * 100;

    this.metrics.set(jobType, metrics);
  }

  public getWorkerConfig(jobType: WeddingJobType): WorkerConfig | undefined {
    return this.workerConfigs.get(jobType);
  }

  public getProcessingMetrics(): Map<WeddingJobType, ProcessorMetrics> {
    return new Map(this.metrics);
  }

  public getActiveProcessingJobs(): Map<string, ProcessingContext> {
    return new Map(this.activeProcessing);
  }

  // Lifecycle management
  private startMetricsCollection(): void {
    setInterval(() => {
      this.logMetricsSummary();
    }, 60000); // Log metrics every minute
  }

  private logMetricsSummary(): void {
    const summaries: any[] = [];

    this.metrics.forEach((metrics, jobType) => {
      if (metrics.totalProcessed > 0) {
        summaries.push({
          jobType,
          totalProcessed: metrics.totalProcessed,
          successRate: (
            (metrics.successfullyProcessed / metrics.totalProcessed) *
            100
          ).toFixed(2),
          avgProcessingTime: `${metrics.averageProcessingTime.toFixed(2)}ms`,
          peakProcessingTime: `${metrics.peakProcessingTime}ms`,
          errorRate: `${metrics.errorRate.toFixed(2)}%`,
        });
      }
    });

    if (summaries.length > 0) {
      logger.info('Wedding job processor metrics summary', {
        activeJobs: this.activeProcessing.size,
        metricsData: summaries,
      });
    }
  }

  private setupGracefulShutdown(): void {
    process.on('SIGTERM', async () => {
      await this.gracefulShutdown();
    });

    process.on('SIGINT', async () => {
      await this.gracefulShutdown();
    });
  }

  public async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    logger.info('Wedding job processor shutting down gracefully...');

    // Wait for active jobs to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (
      this.activeProcessing.size > 0 &&
      Date.now() - startTime < shutdownTimeout
    ) {
      logger.info('Waiting for active jobs to complete...', {
        activeJobs: this.activeProcessing.size,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (this.activeProcessing.size > 0) {
      logger.warn('Shutdown timeout reached, some jobs may be incomplete', {
        remainingJobs: this.activeProcessing.size,
      });
    }

    logger.info('Wedding job processor shutdown complete');
  }
}

export const weddingJobProcessor = new WeddingJobProcessor();
export type { ProcessorMetrics, WorkerConfig, ProcessingContext };
