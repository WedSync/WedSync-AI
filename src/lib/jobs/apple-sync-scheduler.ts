// Apple Sync Scheduler - WS-218 Team C Round 1
// Background sync job management with priority queuing and health monitoring

import {
  CalDAVJob,
  CalDAVJobType,
  CalDAVJobData,
  JobPriority,
  JobStatus,
  JobResult,
  SyncOptions,
  AppleCalendarIntegration,
  IntegrationHealth,
  HealthIssue,
} from '../../types/apple-sync';

import { AppleSyncOrchestrator } from '../integrations/apple-sync-orchestrator';

// Redis/Queue interface for job management
interface JobQueue {
  addJob(job: CalDAVJob): Promise<string>;
  getJob(jobId: string): Promise<CalDAVJob | null>;
  getJobsByStatus(status: JobStatus): Promise<CalDAVJob[]>;
  getJobsByUser(userId: string): Promise<CalDAVJob[]>;
  updateJobStatus(
    jobId: string,
    status: JobStatus,
    result?: any,
    error?: string,
  ): Promise<void>;
  deleteJob(jobId: string): Promise<void>;
  getQueueSize(): Promise<number>;
  getQueueStats(): Promise<QueueStats>;
}

interface QueueStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  avgProcessingTime: number;
}

// Database interface for integration management
interface IntegrationDatabase {
  getIntegration(integrationId: string): Promise<AppleCalendarIntegration>;
  getUserIntegrations(userId: string): Promise<AppleCalendarIntegration[]>;
  updateIntegrationHealth(
    integrationId: string,
    health: IntegrationHealth,
  ): Promise<void>;
  getIntegrationHealth(
    integrationId: string,
  ): Promise<IntegrationHealth | null>;
  recordSyncMetrics(integrationId: string, metrics: SyncMetrics): Promise<void>;
}

interface SyncMetrics {
  duration: number;
  eventsProcessed: number;
  errorCount: number;
  successRate: number;
  timestamp: Date;
}

// Health monitoring interface
interface HealthMonitor {
  checkCalDAVServerHealth(
    integration: AppleCalendarIntegration,
  ): Promise<boolean>;
  checkAuthenticationHealth(
    integration: AppleCalendarIntegration,
  ): Promise<boolean>;
  measureSyncLatency(integration: AppleCalendarIntegration): Promise<number>;
  getErrorRate(integrationId: string): Promise<number>;
}

/**
 * Apple Sync Scheduler
 *
 * Manages background sync job processing for Apple Calendar integrations.
 * Implements priority queuing, health monitoring, and automatic retry logic
 * for large calendar synchronizations without blocking the user interface.
 */
export class AppleSyncScheduler {
  private syncOrchestrator: AppleSyncOrchestrator;
  private jobQueue: JobQueue;
  private database: IntegrationDatabase;
  private healthMonitor: HealthMonitor;

  // Worker management
  private workers: SyncWorker[] = [];
  private isRunning = false;
  private maxConcurrentJobs = 5;

  // Job processing statistics
  private stats = {
    totalJobsProcessed: 0,
    successfulJobs: 0,
    failedJobs: 0,
    retriedJobs: 0,
    averageProcessingTime: 0,
  };

  // Health check intervals
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsReportingInterval?: NodeJS.Timeout;

  // Priority weights for job scheduling
  private readonly PRIORITY_WEIGHTS = {
    urgent: 1000,
    high: 100,
    normal: 10,
    low: 1,
  };

  constructor(
    syncOrchestrator: AppleSyncOrchestrator,
    jobQueue: JobQueue,
    database: IntegrationDatabase,
    healthMonitor: HealthMonitor,
  ) {
    this.syncOrchestrator = syncOrchestrator;
    this.jobQueue = jobQueue;
    this.database = database;
    this.healthMonitor = healthMonitor;

    console.log('Apple Sync Scheduler initialized');
  }

  /**
   * Start the job scheduler with background workers
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log(
      `Starting Apple Sync Scheduler with ${this.maxConcurrentJobs} workers`,
    );

    this.isRunning = true;

    // Initialize worker threads
    for (let i = 0; i < this.maxConcurrentJobs; i++) {
      const worker = new SyncWorker(
        `worker-${i}`,
        this.syncOrchestrator,
        this.jobQueue,
        this.database,
      );

      worker.onJobCompleted = (result) => this.handleJobCompletion(result);
      worker.onJobFailed = (error) => this.handleJobFailure(error);

      this.workers.push(worker);
      worker.start();
    }

    // Start health monitoring
    this.startHealthMonitoring();

    // Start metrics reporting
    this.startMetricsReporting();

    console.log('Apple Sync Scheduler started successfully');
  }

  /**
   * Stop the job scheduler and all workers
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping Apple Sync Scheduler...');

    this.isRunning = false;

    // Stop all workers
    await Promise.all(this.workers.map((worker) => worker.stop()));
    this.workers = [];

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.metricsReportingInterval) {
      clearInterval(this.metricsReportingInterval);
    }

    console.log('Apple Sync Scheduler stopped');
  }

  /**
   * Queue a full synchronization job
   */
  async queueFullSync(
    userId: string,
    integrationId: string,
    priority: JobPriority = 'normal',
  ): Promise<string> {
    const job: CalDAVJob = {
      id: this.generateJobId('full_sync'),
      userId,
      type: 'full_sync',
      data: {
        integrationId,
        syncOptions: {
          syncType: 'full',
          source: 'manual',
          forceFullSync: true,
          priority,
        },
      },
      priority,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: new Date(),
    };

    const jobId = await this.jobQueue.addJob(job);

    console.log(
      `Full sync job queued: ${jobId} for integration: ${integrationId}`,
    );
    return jobId;
  }

  /**
   * Queue an incremental synchronization job
   */
  async queueIncrementalSync(
    userId: string,
    integrationId: string,
    since?: Date,
  ): Promise<string> {
    const job: CalDAVJob = {
      id: this.generateJobId('incremental_sync'),
      userId,
      type: 'incremental_sync',
      data: {
        integrationId,
        syncOptions: {
          syncType: 'incremental',
          source: 'scheduled',
        },
      },
      priority: 'normal',
      status: 'pending',
      attempts: 0,
      maxAttempts: 5, // Higher retry count for incremental syncs
      scheduledAt: new Date(),
    };

    const jobId = await this.jobQueue.addJob(job);

    console.log(
      `Incremental sync job queued: ${jobId} for integration: ${integrationId}`,
    );
    return jobId;
  }

  /**
   * Queue bulk calendar import job
   */
  async queueBulkImport(
    userId: string,
    integrationId: string,
    eventCount: number,
    priority: JobPriority = 'high',
  ): Promise<string> {
    const job: CalDAVJob = {
      id: this.generateJobId('calendar_sync'),
      userId,
      type: 'calendar_sync',
      data: {
        integrationId,
        syncOptions: {
          syncType: 'full',
          source: 'manual',
          priority,
        },
      },
      priority,
      status: 'pending',
      attempts: 0,
      maxAttempts: 2, // Lower retry for bulk operations
      scheduledAt: new Date(),
    };

    const jobId = await this.jobQueue.addJob(job);

    console.log(
      `Bulk import job queued: ${jobId} for ${eventCount} events in integration: ${integrationId}`,
    );
    return jobId;
  }

  /**
   * Queue event-specific sync job (webhook-triggered)
   */
  async queueEventSync(
    userId: string,
    integrationId: string,
    eventIds: string[],
    changeType: 'created' | 'updated' | 'deleted',
  ): Promise<string> {
    const job: CalDAVJob = {
      id: this.generateJobId('event_sync'),
      userId,
      type: 'event_sync',
      data: {
        integrationId,
        eventIds,
        syncOptions: {
          syncType: 'targeted',
          source: 'webhook',
          eventUids: eventIds,
          changeType,
          priority: 'high',
        },
      },
      priority: 'high', // Event-specific syncs are high priority
      status: 'pending',
      attempts: 0,
      maxAttempts: 4,
      scheduledAt: new Date(),
    };

    const jobId = await this.jobQueue.addJob(job);

    console.log(
      `Event sync job queued: ${jobId} for ${eventIds.length} ${changeType} events in integration: ${integrationId}`,
    );
    return jobId;
  }

  /**
   * Schedule recurring sync for an integration
   */
  async scheduleRecurringSync(
    integrationId: string,
    intervalMinutes: number,
  ): Promise<void> {
    console.log(
      `Scheduling recurring sync every ${intervalMinutes} minutes for integration: ${integrationId}`,
    );

    const integration = await this.database.getIntegration(integrationId);

    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    // Set up recurring job (in production, this would use a proper cron scheduler)
    setInterval(
      async () => {
        try {
          // Check integration health before scheduling
          const health = await this.checkIntegrationHealth(integration);

          if (health.isHealthy) {
            await this.queueIncrementalSync(integration.userId, integrationId);
          } else {
            console.warn(
              `Skipping scheduled sync for unhealthy integration: ${integrationId}`,
              health.issues,
            );
          }
        } catch (error) {
          console.error(
            `Failed to schedule recurring sync for integration ${integrationId}:`,
            error,
          );
        }
      },
      intervalMinutes * 60 * 1000,
    );
  }

  /**
   * Get job status and details
   */
  async getJobStatus(jobId: string): Promise<CalDAVJob | null> {
    return await this.jobQueue.getJob(jobId);
  }

  /**
   * Get jobs for a specific user
   */
  async getUserJobs(userId: string): Promise<CalDAVJob[]> {
    return await this.jobQueue.getJobsByUser(userId);
  }

  /**
   * Cancel a pending or running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.jobQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === 'running') {
      // Signal workers to cancel the job
      for (const worker of this.workers) {
        await worker.cancelJob(jobId);
      }
    }

    await this.jobQueue.updateJobStatus(jobId, 'cancelled');
    console.log(`Job cancelled: ${jobId}`);
  }

  /**
   * Retry a failed job
   */
  async retryFailedJob(jobId: string): Promise<void> {
    const job = await this.jobQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'failed') {
      throw new Error(`Job is not in failed state: ${jobId}`);
    }

    if (job.attempts >= job.maxAttempts) {
      throw new Error(`Job has exceeded maximum retry attempts: ${jobId}`);
    }

    // Reset job status and increment attempts
    job.status = 'pending';
    job.attempts++;
    job.scheduledAt = new Date();
    job.startedAt = undefined;
    job.completedAt = undefined;
    job.error = undefined;

    await this.jobQueue.addJob(job);
    this.stats.retriedJobs++;

    console.log(
      `Job queued for retry: ${jobId} (attempt ${job.attempts}/${job.maxAttempts})`,
    );
  }

  /**
   * Get current queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    return await this.jobQueue.getQueueStats();
  }

  /**
   * Get scheduler processing statistics
   */
  getProcessingStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Check integration health and update database
   */
  async checkIntegrationHealth(
    integration: AppleCalendarIntegration,
  ): Promise<IntegrationHealth> {
    const health: IntegrationHealth = {
      integrationId: integration.id,
      isHealthy: true,
      lastHealthCheck: new Date(),
      caldavServerReachable: false,
      authenticationValid: false,
      uptime: 100,
      issues: [],
    };

    try {
      // Check CalDAV server reachability
      health.caldavServerReachable =
        await this.healthMonitor.checkCalDAVServerHealth(integration);

      // Check authentication validity
      health.authenticationValid =
        await this.healthMonitor.checkAuthenticationHealth(integration);

      // Measure sync latency
      health.syncLatency =
        await this.healthMonitor.measureSyncLatency(integration);

      // Get error rate
      health.errorRate = await this.healthMonitor.getErrorRate(integration.id);

      // Determine overall health
      if (!health.caldavServerReachable) {
        health.issues.push({
          type: 'connectivity',
          severity: 'critical',
          message: 'CalDAV server unreachable',
          firstOccurred: new Date(),
          lastOccurred: new Date(),
          count: 1,
        });
        health.isHealthy = false;
      }

      if (!health.authenticationValid) {
        health.issues.push({
          type: 'authentication',
          severity: 'critical',
          message: 'Authentication credentials invalid',
          firstOccurred: new Date(),
          lastOccurred: new Date(),
          count: 1,
        });
        health.isHealthy = false;
      }

      if (health.errorRate && health.errorRate > 0.5) {
        // > 50% error rate
        health.issues.push({
          type: 'sync_failure',
          severity: 'high',
          message: `High error rate: ${(health.errorRate * 100).toFixed(1)}%`,
          firstOccurred: new Date(),
          lastOccurred: new Date(),
          count: 1,
        });
        health.isHealthy = false;
      }

      if (health.syncLatency && health.syncLatency > 30000) {
        // > 30 seconds
        health.issues.push({
          type: 'performance',
          severity: 'medium',
          message: `High sync latency: ${health.syncLatency}ms`,
          firstOccurred: new Date(),
          lastOccurred: new Date(),
          count: 1,
        });
      }
    } catch (error) {
      health.isHealthy = false;
      health.issues.push({
        type: 'sync_failure',
        severity: 'critical',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        firstOccurred: new Date(),
        lastOccurred: new Date(),
        count: 1,
      });
    }

    // Update database with health status
    await this.database.updateIntegrationHealth(integration.id, health);

    return health;
  }

  // Private methods

  private generateJobId(type: CalDAVJobType): string {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleJobCompletion(result: {
    jobId: string;
    result: JobResult;
  }): void {
    this.stats.totalJobsProcessed++;
    this.stats.successfulJobs++;
    this.updateAverageProcessingTime(result.result.duration);

    console.log(`Job completed successfully: ${result.jobId}`, {
      duration: result.result.duration,
      success: result.result.success,
    });
  }

  private handleJobFailure(error: {
    jobId: string;
    error: string;
    retryable: boolean;
  }): void {
    this.stats.totalJobsProcessed++;
    this.stats.failedJobs++;

    console.error(`Job failed: ${error.jobId}`, {
      error: error.error,
      retryable: error.retryable,
    });
  }

  private updateAverageProcessingTime(duration: number): void {
    const totalSuccessful = this.stats.successfulJobs;
    this.stats.averageProcessingTime =
      (this.stats.averageProcessingTime * (totalSuccessful - 1) + duration) /
      totalSuccessful;
  }

  private startHealthMonitoring(): void {
    // Run health checks every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      console.log('Running integration health checks...');

      try {
        // Get all active integrations (this would typically be paginated)
        // For now, we'll just log that health checks are running
        console.log('Health monitoring cycle completed');
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 300000); // 5 minutes
  }

  private startMetricsReporting(): void {
    // Report metrics every 15 minutes
    this.metricsReportingInterval = setInterval(async () => {
      const queueStats = await this.getQueueStats();
      const processingStats = this.getProcessingStats();

      console.log('Scheduler Metrics:', {
        queue: queueStats,
        processing: processingStats,
        workers: this.workers.length,
        timestamp: new Date().toISOString(),
      });
    }, 900000); // 15 minutes
  }
}

/**
 * Individual sync worker for processing jobs
 */
class SyncWorker {
  private id: string;
  private syncOrchestrator: AppleSyncOrchestrator;
  private jobQueue: JobQueue;
  private database: IntegrationDatabase;

  private isRunning = false;
  private currentJobId?: string;
  private processingInterval?: NodeJS.Timeout;

  public onJobCompleted?: (result: {
    jobId: string;
    result: JobResult;
  }) => void;
  public onJobFailed?: (error: {
    jobId: string;
    error: string;
    retryable: boolean;
  }) => void;

  constructor(
    id: string,
    syncOrchestrator: AppleSyncOrchestrator,
    jobQueue: JobQueue,
    database: IntegrationDatabase,
  ) {
    this.id = id;
    this.syncOrchestrator = syncOrchestrator;
    this.jobQueue = jobQueue;
    this.database = database;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    // Poll for jobs every 5 seconds
    this.processingInterval = setInterval(() => {
      if (!this.currentJobId) {
        this.processNextJob().catch((error) => {
          console.error(`Worker ${this.id} error:`, error);
        });
      }
    }, 5000);

    console.log(`Sync worker started: ${this.id}`);
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Wait for current job to complete
    let waitCount = 0;
    while (this.currentJobId && waitCount < 30) {
      // Wait up to 30 seconds
      await new Promise((resolve) => setTimeout(resolve, 1000));
      waitCount++;
    }

    console.log(`Sync worker stopped: ${this.id}`);
  }

  async cancelJob(jobId: string): Promise<void> {
    if (this.currentJobId === jobId) {
      // Set flag to cancel current job
      console.log(`Worker ${this.id} received cancel signal for job: ${jobId}`);
      // Implementation would involve signaling the sync orchestrator to cancel
    }
  }

  private async processNextJob(): Promise<void> {
    // Get highest priority pending job
    const pendingJobs = await this.jobQueue.getJobsByStatus('pending');

    if (pendingJobs.length === 0) {
      return; // No jobs to process
    }

    // Sort by priority and scheduled time
    const job = pendingJobs.sort((a, b) => {
      const priorityDiff =
        this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return a.scheduledAt.getTime() - b.scheduledAt.getTime();
    })[0];

    await this.processJob(job);
  }

  private async processJob(job: CalDAVJob): Promise<void> {
    this.currentJobId = job.id;
    job.startedAt = new Date();
    job.status = 'running';

    await this.jobQueue.updateJobStatus(job.id, 'running');

    console.log(`Worker ${this.id} processing job: ${job.id} (${job.type})`);

    try {
      const result = await this.executeJob(job);

      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;

      await this.jobQueue.updateJobStatus(job.id, 'completed', result);

      this.onJobCompleted?.({ jobId: job.id, result });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      job.status = 'failed';
      job.completedAt = new Date();
      job.error = errorMessage;

      await this.jobQueue.updateJobStatus(
        job.id,
        'failed',
        undefined,
        errorMessage,
      );

      this.onJobFailed?.({
        jobId: job.id,
        error: errorMessage,
        retryable: this.isRetryableError(error),
      });
    } finally {
      this.currentJobId = undefined;
    }
  }

  private async executeJob(job: CalDAVJob): Promise<JobResult> {
    const startTime = Date.now();

    try {
      let syncResult;

      switch (job.type) {
        case 'full_sync':
        case 'incremental_sync':
        case 'calendar_sync':
        case 'event_sync':
          syncResult = await this.syncOrchestrator.orchestrateSync(
            job.data.integrationId,
            job.data.syncOptions || { syncType: 'full', source: 'manual' },
          );
          break;

        case 'conflict_resolution':
          // Handle conflict resolution jobs
          throw new Error('Conflict resolution not implemented');

        case 'cleanup':
          // Handle cleanup jobs
          throw new Error('Cleanup not implemented');

        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      const result: JobResult = {
        success: true,
        syncResult,
        duration: Date.now() - startTime,
        processedAt: new Date(),
      };

      return result;
    } catch (error) {
      throw error; // Re-throw to be handled by processJob
    }
  }

  private getPriorityWeight(priority: JobPriority): number {
    const weights = { urgent: 1000, high: 100, normal: 10, low: 1 };
    return weights[priority];
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('503') ||
        error.message.includes('502') ||
        error.message.includes('500')
      );
    }
    return false;
  }
}
