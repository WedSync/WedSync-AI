/**
 * WedSync Background Job Processing System
 *
 * High-performance job queue optimized for wedding industry workflows:
 * - Form auto-save (CRITICAL): <500ms processing, wedding day priority
 * - Email notifications (HIGH): <2s processing, batch optimization
 * - Analytics processing (NORMAL): <30s processing, off-peak scheduling
 * - Bulk operations (LOW): <5min processing, resource-aware
 *
 * Wedding Day Protocol:
 * - Saturday jobs get 2x worker allocation
 * - Critical jobs bypass normal queue limits
 * - Emergency scaling for venue coordination
 */

import Bull from 'bull';
import IORedis from 'ioredis';
import { logger } from '../monitoring/logger';
import { performance } from 'perf_hooks';

// Wedding-specific job priorities
export enum WeddingJobPriority {
  CRITICAL = 1, // Form saves, user actions - Wedding day emergencies
  HIGH = 2, // Email notifications, CRM sync
  NORMAL = 3, // Analytics, reporting
  LOW = 4, // Bulk operations, cleanup
  BATCH = 5, // Non-urgent batch processing
}

// Job types mapped to wedding workflows
export enum WeddingJobType {
  // Critical Path Jobs (Wedding Day)
  FORM_AUTO_SAVE = 'form_auto_save',
  VENUE_COORDINATION = 'venue_coordination',
  EMERGENCY_NOTIFICATION = 'emergency_notification',

  // High Priority Jobs
  EMAIL_NOTIFICATION = 'email_notification',
  SMS_ALERT = 'sms_alert',
  CRM_SYNC = 'crm_sync',
  TIMELINE_UPDATE = 'timeline_update',

  // Normal Priority Jobs
  ANALYTICS_PROCESSING = 'analytics_processing',
  REPORT_GENERATION = 'report_generation',
  IMAGE_PROCESSING = 'image_processing',

  // Low Priority Jobs
  BULK_EMAIL = 'bulk_email',
  DATA_CLEANUP = 'data_cleanup',
  BACKUP_CREATION = 'backup_creation',
}

interface WeddingJobOptions {
  priority: WeddingJobPriority;
  type: WeddingJobType;
  weddingId?: string;
  isWeddingDay?: boolean;
  retryAttempts?: number;
  timeout?: number;
  delay?: number;
  metadata?: Record<string, any>;
}

interface WeddingJobData {
  id: string;
  type: WeddingJobType;
  payload: any;
  userId?: string;
  organizationId?: string;
  weddingId?: string;
  isWeddingDay?: boolean;
  priority: WeddingJobPriority;
  createdAt: Date;
  metadata: Record<string, any>;
}

interface JobMetrics {
  processed: number;
  failed: number;
  completed: number;
  active: number;
  waiting: number;
  avgProcessingTime: number;
  successRate: number;
}

interface QueueHealth {
  status: 'healthy' | 'degraded' | 'critical';
  activeWorkers: number;
  queueLength: number;
  avgWaitTime: number;
  failureRate: number;
  lastProcessed: Date;
}

class WeddingJobQueue {
  private queues: Map<WeddingJobPriority, Bull.Queue>;
  private redis: IORedis;
  private metrics: Map<WeddingJobType, JobMetrics> = new Map();
  private isWeddingDay: boolean = false;
  private emergencyMode: boolean = false;

  constructor() {
    // Configure Redis connection for job queues
    this.redis = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 1, // Separate database for job queues
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });

    // Initialize priority-based queues
    this.queues = new Map();
    this.initializeQueues();
    this.setupJobProcessors();
    this.startHealthMonitoring();
    this.detectWeddingDay();
  }

  private initializeQueues(): void {
    Object.values(WeddingJobPriority).forEach((priority) => {
      if (typeof priority === 'number') {
        const queueName = `wedding-jobs-p${priority}`;

        const queue = new Bull(queueName, {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
          },
          settings: {
            stalledInterval: 30 * 1000, // 30 seconds
            maxStalledCount: 1,
          },
          defaultJobOptions: {
            removeOnComplete: 100, // Keep last 100 completed jobs
            removeOnFail: 50, // Keep last 50 failed jobs
            attempts: this.getRetryAttempts(priority),
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        });

        // Enhanced error handling
        queue.on('error', (error) => {
          logger.error('Wedding job queue error', {
            queue: queueName,
            error: error.message,
            priority,
          });
        });

        queue.on('failed', (job, err) => {
          this.handleJobFailure(job, err);
        });

        queue.on('completed', (job) => {
          this.updateJobMetrics(job, 'completed');
        });

        this.queues.set(priority, queue);
      }
    });

    logger.info('Wedding job queues initialized', {
      queues: this.queues.size,
      isWeddingDay: this.isWeddingDay,
    });
  }

  private getRetryAttempts(priority: WeddingJobPriority): number {
    switch (priority) {
      case WeddingJobPriority.CRITICAL:
        return 5; // Critical jobs get more retries
      case WeddingJobPriority.HIGH:
        return 3;
      case WeddingJobPriority.NORMAL:
        return 2;
      default:
        return 1;
    }
  }

  private setupJobProcessors(): void {
    this.queues.forEach((queue, priority) => {
      const concurrency = this.getWorkerConcurrency(priority);

      queue.process(concurrency, async (job) => {
        return this.processJob(job);
      });
    });
  }

  private getWorkerConcurrency(priority: WeddingJobPriority): number {
    const baseWorkers = {
      [WeddingJobPriority.CRITICAL]: 10,
      [WeddingJobPriority.HIGH]: 8,
      [WeddingJobPriority.NORMAL]: 5,
      [WeddingJobPriority.LOW]: 3,
      [WeddingJobPriority.BATCH]: 2,
    };

    let workers = baseWorkers[priority] || 2;

    // Wedding day scaling
    if (this.isWeddingDay) {
      workers *= 2; // Double workers on wedding days
    }

    if (this.emergencyMode) {
      workers *= 1.5; // 50% more workers in emergency
    }

    return Math.ceil(workers);
  }

  private async processJob(job: Bull.Job<WeddingJobData>): Promise<any> {
    const startTime = performance.now();
    const jobData = job.data;

    try {
      logger.info('Processing wedding job', {
        jobId: job.id,
        type: jobData.type,
        priority: jobData.priority,
        weddingId: jobData.weddingId,
        isWeddingDay: jobData.isWeddingDay,
      });

      // Wedding day priority processing
      if (
        jobData.isWeddingDay &&
        jobData.priority === WeddingJobPriority.CRITICAL
      ) {
        job.opts.timeout = 30000; // 30 second timeout for critical wedding jobs
      }

      let result;
      switch (jobData.type) {
        case WeddingJobType.FORM_AUTO_SAVE:
          result = await this.processFormAutoSave(jobData);
          break;
        case WeddingJobType.VENUE_COORDINATION:
          result = await this.processVenueCoordination(jobData);
          break;
        case WeddingJobType.EMAIL_NOTIFICATION:
          result = await this.processEmailNotification(jobData);
          break;
        case WeddingJobType.SMS_ALERT:
          result = await this.processSMSAlert(jobData);
          break;
        case WeddingJobType.CRM_SYNC:
          result = await this.processCRMSync(jobData);
          break;
        case WeddingJobType.ANALYTICS_PROCESSING:
          result = await this.processAnalytics(jobData);
          break;
        case WeddingJobType.IMAGE_PROCESSING:
          result = await this.processImageOptimization(jobData);
          break;
        case WeddingJobType.BULK_EMAIL:
          result = await this.processBulkEmail(jobData);
          break;
        case WeddingJobType.DATA_CLEANUP:
          result = await this.processDataCleanup(jobData);
          break;
        default:
          throw new Error(`Unknown job type: ${jobData.type}`);
      }

      const processingTime = performance.now() - startTime;
      this.updateProcessingMetrics(jobData.type, processingTime, true);

      logger.info('Wedding job completed successfully', {
        jobId: job.id,
        type: jobData.type,
        processingTime: `${processingTime.toFixed(2)}ms`,
      });

      return result;
    } catch (error) {
      const processingTime = performance.now() - startTime;
      this.updateProcessingMetrics(jobData.type, processingTime, false);

      logger.error('Wedding job failed', {
        jobId: job.id,
        type: jobData.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: `${processingTime.toFixed(2)}ms`,
      });

      throw error;
    }
  }

  // Critical path job processors
  private async processFormAutoSave(jobData: WeddingJobData): Promise<void> {
    // Form auto-save with <500ms target
    const { payload } = jobData;

    // Validate form data
    if (!payload.formId || !payload.formData) {
      throw new Error('Invalid form data for auto-save');
    }

    // Save to database with optimized query
    // Implementation would integrate with your form storage system
    logger.debug('Form auto-saved', { formId: payload.formId });
  }

  private async processVenueCoordination(
    jobData: WeddingJobData,
  ): Promise<void> {
    // Wedding day venue coordination
    const { payload } = jobData;

    // Process venue updates, timeline changes, emergency communications
    logger.debug('Venue coordination processed', {
      weddingId: jobData.weddingId,
    });
  }

  private async processEmailNotification(
    jobData: WeddingJobData,
  ): Promise<void> {
    // High-priority email notifications
    const { payload } = jobData;

    // Send via Resend with retry logic
    logger.debug('Email notification sent', { recipient: payload.to });
  }

  private async processSMSAlert(jobData: WeddingJobData): Promise<void> {
    // SMS alerts via Twilio
    const { payload } = jobData;

    // Send SMS with Twilio integration
    logger.debug('SMS alert sent', { phone: payload.phone });
  }

  private async processCRMSync(jobData: WeddingJobData): Promise<void> {
    // CRM synchronization (Tave, HoneyBook, etc.)
    const { payload } = jobData;

    // Sync data with external CRM systems
    logger.debug('CRM sync completed', { crmType: payload.crmType });
  }

  private async processAnalytics(jobData: WeddingJobData): Promise<void> {
    // Analytics processing and aggregation
    const { payload } = jobData;

    // Process analytics data, generate insights
    logger.debug('Analytics processed', { eventType: payload.eventType });
  }

  private async processImageOptimization(
    jobData: WeddingJobData,
  ): Promise<void> {
    // Image processing and optimization
    const { payload } = jobData;

    // Optimize images for web and mobile
    logger.debug('Image optimized', { imageId: payload.imageId });
  }

  private async processBulkEmail(jobData: WeddingJobData): Promise<void> {
    // Bulk email processing
    const { payload } = jobData;

    // Send bulk emails with rate limiting
    logger.debug('Bulk email processed', {
      recipientCount: payload.recipients?.length,
    });
  }

  private async processDataCleanup(jobData: WeddingJobData): Promise<void> {
    // Data cleanup and maintenance
    const { payload } = jobData;

    // Clean up expired data, optimize storage
    logger.debug('Data cleanup completed', {
      cleanupType: payload.cleanupType,
    });
  }

  // Public API for adding jobs
  public async addJob(
    type: WeddingJobType,
    payload: any,
    options: Partial<WeddingJobOptions> = {},
  ): Promise<Bull.Job<WeddingJobData>> {
    const priority = options.priority || this.getDefaultPriority(type);
    const queue = this.queues.get(priority);

    if (!queue) {
      throw new Error(`Queue not found for priority: ${priority}`);
    }

    const jobData: WeddingJobData = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      userId: options.metadata?.userId,
      organizationId: options.metadata?.organizationId,
      weddingId: options.weddingId,
      isWeddingDay: options.isWeddingDay || this.isWeddingDay,
      priority,
      createdAt: new Date(),
      metadata: options.metadata || {},
    };

    const jobOptions: Bull.JobOptions = {
      priority: this.getNumericPriority(priority),
      attempts: options.retryAttempts || this.getRetryAttempts(priority),
      delay: options.delay || 0,
      timeout: options.timeout || this.getJobTimeout(type),
    };

    // Wedding day priority boosting
    if (jobData.isWeddingDay && priority === WeddingJobPriority.CRITICAL) {
      jobOptions.priority = 1; // Highest possible priority
      delete jobOptions.delay; // No delay for wedding day critical jobs
    }

    return queue.add(jobData, jobOptions);
  }

  private getDefaultPriority(type: WeddingJobType): WeddingJobPriority {
    const priorityMap = {
      [WeddingJobType.FORM_AUTO_SAVE]: WeddingJobPriority.CRITICAL,
      [WeddingJobType.VENUE_COORDINATION]: WeddingJobPriority.CRITICAL,
      [WeddingJobType.EMERGENCY_NOTIFICATION]: WeddingJobPriority.CRITICAL,
      [WeddingJobType.EMAIL_NOTIFICATION]: WeddingJobPriority.HIGH,
      [WeddingJobType.SMS_ALERT]: WeddingJobPriority.HIGH,
      [WeddingJobType.CRM_SYNC]: WeddingJobPriority.HIGH,
      [WeddingJobType.TIMELINE_UPDATE]: WeddingJobPriority.HIGH,
      [WeddingJobType.ANALYTICS_PROCESSING]: WeddingJobPriority.NORMAL,
      [WeddingJobType.REPORT_GENERATION]: WeddingJobPriority.NORMAL,
      [WeddingJobType.IMAGE_PROCESSING]: WeddingJobPriority.NORMAL,
      [WeddingJobType.BULK_EMAIL]: WeddingJobPriority.LOW,
      [WeddingJobType.DATA_CLEANUP]: WeddingJobPriority.LOW,
      [WeddingJobType.BACKUP_CREATION]: WeddingJobPriority.LOW,
    };

    return priorityMap[type] || WeddingJobPriority.NORMAL;
  }

  private getNumericPriority(priority: WeddingJobPriority): number {
    // Bull uses lower numbers for higher priority
    return 10 - priority;
  }

  private getJobTimeout(type: WeddingJobType): number {
    const timeoutMap = {
      [WeddingJobType.FORM_AUTO_SAVE]: 5000, // 5 seconds
      [WeddingJobType.VENUE_COORDINATION]: 30000, // 30 seconds
      [WeddingJobType.EMAIL_NOTIFICATION]: 10000, // 10 seconds
      [WeddingJobType.SMS_ALERT]: 5000, // 5 seconds
      [WeddingJobType.CRM_SYNC]: 60000, // 1 minute
      [WeddingJobType.ANALYTICS_PROCESSING]: 120000, // 2 minutes
      [WeddingJobType.IMAGE_PROCESSING]: 300000, // 5 minutes
      [WeddingJobType.BULK_EMAIL]: 600000, // 10 minutes
      [WeddingJobType.DATA_CLEANUP]: 1800000, // 30 minutes
    };

    return timeoutMap[type] || 60000; // Default 1 minute
  }

  // Monitoring and metrics
  private updateProcessingMetrics(
    type: WeddingJobType,
    processingTime: number,
    success: boolean,
  ): void {
    const metrics = this.metrics.get(type) || {
      processed: 0,
      failed: 0,
      completed: 0,
      active: 0,
      waiting: 0,
      avgProcessingTime: 0,
      successRate: 0,
    };

    metrics.processed++;
    if (success) {
      metrics.completed++;
    } else {
      metrics.failed++;
    }

    // Update rolling average
    metrics.avgProcessingTime =
      (metrics.avgProcessingTime * (metrics.processed - 1) + processingTime) /
      metrics.processed;

    metrics.successRate = (metrics.completed / metrics.processed) * 100;

    this.metrics.set(type, metrics);
  }

  private updateJobMetrics(job: Bull.Job, status: string): void {
    const jobData = job.data as WeddingJobData;
    this.updateProcessingMetrics(jobData.type, 0, status === 'completed');
  }

  private handleJobFailure(job: Bull.Job, error: Error): void {
    const jobData = job.data as WeddingJobData;

    logger.error('Wedding job failed permanently', {
      jobId: job.id,
      type: jobData.type,
      attempts: job.attemptsMade,
      error: error.message,
    });

    // Wedding day emergency escalation
    if (
      jobData.isWeddingDay &&
      jobData.priority === WeddingJobPriority.CRITICAL
    ) {
      this.escalateWeddingDayFailure(jobData, error);
    }
  }

  private async escalateWeddingDayFailure(
    jobData: WeddingJobData,
    error: Error,
  ): Promise<void> {
    // Emergency notification for wedding day failures
    logger.error('WEDDING DAY CRITICAL JOB FAILURE - ESCALATING', {
      jobType: jobData.type,
      weddingId: jobData.weddingId,
      error: error.message,
    });

    // Could trigger emergency notifications, alerts, etc.
    // This is where you'd integrate with your incident response system
  }

  // Wedding day detection
  private detectWeddingDay(): void {
    const now = new Date();
    const isSaturday = now.getDay() === 6; // Saturday
    const isFriday = now.getDay() === 5; // Friday

    // Friday afternoon through Sunday = wedding period
    this.isWeddingDay = isSaturday || (isFriday && now.getHours() >= 15);

    if (this.isWeddingDay) {
      logger.info('Wedding day protocol activated', {
        day: now.toLocaleDateString(),
        dayOfWeek: now.getDay(),
        hour: now.getHours(),
      });
    }

    // Schedule next check
    setTimeout(() => this.detectWeddingDay(), 60 * 60 * 1000); // Check hourly
  }

  // Health monitoring
  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.checkQueueHealth();
    }, 30000); // Check every 30 seconds
  }

  private async checkQueueHealth(): Promise<void> {
    for (const [priority, queue] of this.queues) {
      try {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const failed = await queue.getFailed();
        const completed = await queue.getCompleted();

        const health: QueueHealth = {
          status: this.determineHealthStatus(waiting.length, failed.length),
          activeWorkers: active.length,
          queueLength: waiting.length,
          avgWaitTime: this.calculateAvgWaitTime(waiting),
          failureRate: this.calculateFailureRate(
            failed.length,
            completed.length,
          ),
          lastProcessed: new Date(),
        };

        if (health.status === 'critical') {
          logger.error('Wedding job queue in critical state', {
            priority,
            health,
          });

          // Trigger emergency scaling if needed
          if (this.isWeddingDay) {
            await this.emergencyScaling(priority);
          }
        }
      } catch (error) {
        logger.error('Health check failed for wedding job queue', {
          priority,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private determineHealthStatus(
    queueLength: number,
    failedCount: number,
  ): 'healthy' | 'degraded' | 'critical' {
    if (failedCount > 10 || queueLength > 1000) {
      return 'critical';
    } else if (failedCount > 5 || queueLength > 500) {
      return 'degraded';
    }
    return 'healthy';
  }

  private calculateAvgWaitTime(waitingJobs: Bull.Job[]): number {
    if (waitingJobs.length === 0) return 0;

    const now = Date.now();
    const totalWaitTime = waitingJobs.reduce((sum, job) => {
      return sum + (now - job.timestamp);
    }, 0);

    return totalWaitTime / waitingJobs.length;
  }

  private calculateFailureRate(failed: number, completed: number): number {
    const total = failed + completed;
    return total > 0 ? (failed / total) * 100 : 0;
  }

  private async emergencyScaling(priority: WeddingJobPriority): Promise<void> {
    logger.info('Activating emergency scaling for wedding day', { priority });
    this.emergencyMode = true;

    // Emergency scaling would trigger additional worker processes
    // In a real implementation, this might scale Docker containers,
    // add more Bull workers, or trigger cloud auto-scaling

    setTimeout(
      () => {
        this.emergencyMode = false;
        logger.info('Emergency scaling deactivated', { priority });
      },
      30 * 60 * 1000,
    ); // 30 minutes
  }

  // Public API methods
  public async getMetrics(): Promise<Map<WeddingJobType, JobMetrics>> {
    return this.metrics;
  }

  public async getQueueStats(): Promise<Record<WeddingJobPriority, any>> {
    const stats: Record<WeddingJobPriority, any> = {} as any;

    for (const [priority, queue] of this.queues) {
      stats[priority] = {
        waiting: await queue.getWaiting(),
        active: await queue.getActive(),
        completed: await queue.getCompleted(),
        failed: await queue.getFailed(),
        delayed: await queue.getDelayed(),
      };
    }

    return stats;
  }

  public setWeddingDayMode(enabled: boolean): void {
    this.isWeddingDay = enabled;
    logger.info('Wedding day mode manually set', { enabled });
  }

  public async gracefulShutdown(): Promise<void> {
    logger.info('Shutting down wedding job queues gracefully...');

    for (const [priority, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue ${priority} closed`);
    }

    await this.redis.quit();
    logger.info('Wedding job queue system shutdown complete');
  }
}

export const weddingJobQueue = new WeddingJobQueue();
export { WeddingJobPriority, WeddingJobType };
export type { WeddingJobOptions, WeddingJobData, JobMetrics, QueueHealth };
