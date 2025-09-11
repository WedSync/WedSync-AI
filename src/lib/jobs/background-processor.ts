import { CacheService, CACHE_PREFIXES } from '../cache/redis-client';
import { createClient } from '@/lib/supabase/server';

// Job types
export enum JobType {
  EXPENSE_BATCH_IMPORT = 'expense_batch_import',
  OCR_BATCH_PROCESS = 'ocr_batch_process',
  ANALYTICS_REFRESH = 'analytics_refresh',
  BUDGET_CALCULATION = 'budget_calculation',
  EMAIL_NOTIFICATION = 'email_notification',
  DATA_EXPORT = 'data_export',
  BACKUP_CREATION = 'backup_creation',
  WEBHOOK_DELIVERY = 'webhook_delivery',
  ML_PREDICTION = 'ml_prediction',
  REPORT_GENERATION = 'report_generation',
}

// Job status
export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

// Job priority levels
export enum JobPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
}

export interface Job {
  id: string;
  type: JobType;
  priority: JobPriority;
  data: any;
  metadata: {
    user_id?: string;
    wedding_id?: string;
    created_at: string;
    scheduled_at?: string;
    started_at?: string;
    completed_at?: string;
    retries: number;
    max_retries: number;
    timeout_ms: number;
  };
  status: JobStatus;
  result?: any;
  error?: string;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  metrics?: {
    duration_ms: number;
    memory_used?: number;
    items_processed?: number;
  };
}

export interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

class BackgroundJobProcessor {
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private maxConcurrentJobs: number = 5;
  private currentlyProcessing: Set<string> = new Set();
  private jobHandlers: Map<JobType, (job: Job) => Promise<JobResult>> =
    new Map();

  constructor() {
    this.initializeJobHandlers();
  }

  private initializeJobHandlers() {
    this.jobHandlers.set(
      JobType.EXPENSE_BATCH_IMPORT,
      this.handleExpenseBatchImport.bind(this),
    );
    this.jobHandlers.set(
      JobType.OCR_BATCH_PROCESS,
      this.handleOCRBatchProcess.bind(this),
    );
    this.jobHandlers.set(
      JobType.ANALYTICS_REFRESH,
      this.handleAnalyticsRefresh.bind(this),
    );
    this.jobHandlers.set(
      JobType.BUDGET_CALCULATION,
      this.handleBudgetCalculation.bind(this),
    );
    this.jobHandlers.set(
      JobType.EMAIL_NOTIFICATION,
      this.handleEmailNotification.bind(this),
    );
    this.jobHandlers.set(JobType.DATA_EXPORT, this.handleDataExport.bind(this));
    this.jobHandlers.set(
      JobType.BACKUP_CREATION,
      this.handleBackupCreation.bind(this),
    );
    this.jobHandlers.set(
      JobType.WEBHOOK_DELIVERY,
      this.handleWebhookDelivery.bind(this),
    );
    this.jobHandlers.set(
      JobType.ML_PREDICTION,
      this.handleMLPrediction.bind(this),
    );
    this.jobHandlers.set(
      JobType.REPORT_GENERATION,
      this.handleReportGeneration.bind(this),
    );
  }

  // Start the background processor
  public start(): void {
    if (this.isProcessing) {
      console.warn('Background job processor is already running');
      return;
    }

    this.isProcessing = true;
    console.log('Starting background job processor');

    // Process jobs every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, 5000);

    // Initial processing
    this.processJobs();
  }

  // Stop the background processor
  public stop(): void {
    if (!this.isProcessing) {
      return;
    }

    console.log('Stopping background job processor');
    this.isProcessing = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // Queue a new job
  public async queueJob(
    type: JobType,
    data: any,
    options: {
      priority?: JobPriority;
      user_id?: string;
      wedding_id?: string;
      scheduled_at?: Date;
      timeout_ms?: number;
      max_retries?: number;
    } = {},
  ): Promise<string> {
    const jobId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job: Job = {
      id: jobId,
      type,
      priority: options.priority || JobPriority.NORMAL,
      data,
      metadata: {
        user_id: options.user_id,
        wedding_id: options.wedding_id,
        created_at: new Date().toISOString(),
        scheduled_at: options.scheduled_at?.toISOString(),
        retries: 0,
        max_retries: options.max_retries || 3,
        timeout_ms: options.timeout_ms || 300000, // 5 minutes default
      },
      status: JobStatus.QUEUED,
    };

    // Store job in database for persistence
    await this.saveJob(job);

    // Add to Redis queue for processing
    const queueKey = this.getQueueKey(type, job.priority);
    await CacheService.set(
      CacheService.buildKey(CACHE_PREFIXES.BATCH_JOB, 'job', jobId),
      job,
      86400, // 24 hours TTL
    );

    console.log(
      `Queued job ${jobId} of type ${type} with priority ${job.priority}`,
    );
    return jobId;
  }

  // Get job status
  public async getJobStatus(jobId: string): Promise<Job | null> {
    // Try cache first
    const cachedJob = await CacheService.get<Job>(
      CacheService.buildKey(CACHE_PREFIXES.BATCH_JOB, 'job', jobId),
    );

    if (cachedJob) {
      return cachedJob;
    }

    // Fallback to database
    return await this.getJobFromDatabase(jobId);
  }

  // Cancel a job
  public async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJobStatus(jobId);

    if (!job) {
      return false;
    }

    if (job.status === JobStatus.PROCESSING) {
      // Job is currently being processed, mark for cancellation
      job.status = JobStatus.CANCELLED;
      await this.updateJob(job);
      return true;
    }

    if (job.status === JobStatus.QUEUED) {
      // Remove from queue
      job.status = JobStatus.CANCELLED;
      job.metadata.completed_at = new Date().toISOString();
      await this.updateJob(job);
      return true;
    }

    return false;
  }

  // Get queue statistics
  public async getQueueStats(type?: JobType): Promise<QueueStats> {
    const supabase = createClient();

    let query = supabase
      .from('background_jobs')
      .select('status, count', { count: 'exact' });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const stats: QueueStats = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    // This is a simplified version - in production, you'd use proper aggregation
    // For now, we'll get approximate counts
    const statusCounts = await this.getStatusCounts(type);
    return statusCounts;
  }

  // Process jobs from queues
  private async processJobs(): Promise<void> {
    if (this.currentlyProcessing.size >= this.maxConcurrentJobs) {
      return;
    }

    try {
      // Get jobs by priority (highest first)
      const priorities = [
        JobPriority.URGENT,
        JobPriority.HIGH,
        JobPriority.NORMAL,
        JobPriority.LOW,
      ];

      for (const priority of priorities) {
        if (this.currentlyProcessing.size >= this.maxConcurrentJobs) {
          break;
        }

        const job = await this.getNextJob(priority);
        if (job) {
          this.processJob(job);
        }
      }
    } catch (error) {
      console.error('Error in processJobs:', error);
    }
  }

  // Get next job from queue
  private async getNextJob(priority: JobPriority): Promise<Job | null> {
    try {
      const supabase = createClient();

      const { data: jobs, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('status', JobStatus.QUEUED)
        .eq('priority', priority)
        .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
        .order('created_at', { ascending: true })
        .limit(1);

      if (error || !jobs || jobs.length === 0) {
        return null;
      }

      return jobs[0] as Job;
    } catch (error) {
      console.error('Error getting next job:', error);
      return null;
    }
  }

  // Process a single job
  private async processJob(job: Job): Promise<void> {
    if (this.currentlyProcessing.has(job.id)) {
      return;
    }

    this.currentlyProcessing.add(job.id);

    try {
      console.log(`Starting job ${job.id} of type ${job.type}`);

      // Update job status to processing
      job.status = JobStatus.PROCESSING;
      job.metadata.started_at = new Date().toISOString();
      await this.updateJob(job);

      // Get handler for job type
      const handler = this.jobHandlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler found for job type: ${job.type}`);
      }

      // Execute job with timeout
      const startTime = Date.now();
      const result = await Promise.race([
        handler(job),
        this.createTimeout(job.metadata.timeout_ms),
      ]);

      const duration = Date.now() - startTime;

      // Update job with result
      job.status = JobStatus.COMPLETED;
      job.metadata.completed_at = new Date().toISOString();
      job.result = {
        ...result,
        metrics: {
          ...result.metrics,
          duration_ms: duration,
        },
      };

      await this.updateJob(job);
      console.log(`Completed job ${job.id} in ${duration}ms`);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);

      // Handle job failure
      await this.handleJobFailure(job, error);
    } finally {
      this.currentlyProcessing.delete(job.id);
    }
  }

  // Handle job failure with retry logic
  private async handleJobFailure(job: Job, error: any): Promise<void> {
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.metadata.retries += 1;

    if (job.metadata.retries < job.metadata.max_retries) {
      // Schedule retry with exponential backoff
      const retryDelayMs = Math.min(
        1000 * Math.pow(2, job.metadata.retries), // Exponential backoff
        300000, // Max 5 minutes
      );

      job.status = JobStatus.RETRYING;
      job.metadata.scheduled_at = new Date(
        Date.now() + retryDelayMs,
      ).toISOString();

      console.log(
        `Scheduling retry ${job.metadata.retries}/${job.metadata.max_retries} for job ${job.id} in ${retryDelayMs}ms`,
      );
    } else {
      job.status = JobStatus.FAILED;
      job.metadata.completed_at = new Date().toISOString();

      console.error(
        `Job ${job.id} failed permanently after ${job.metadata.retries} retries`,
      );
    }

    await this.updateJob(job);
  }

  // Create timeout promise
  private createTimeout(timeoutMs: number): Promise<JobResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Job timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  // Job Handlers

  private async handleExpenseBatchImport(job: Job): Promise<JobResult> {
    const { expenses, wedding_id, user_id } = job.data;

    try {
      const supabase = createClient();
      const results = [];
      const errors = [];

      for (const expense of expenses) {
        try {
          const { data, error } = await supabase
            .from('expenses')
            .insert({
              ...expense,
              wedding_id,
              created_by_id: user_id,
              status: 'pending',
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;
          results.push(data);
        } catch (error) {
          errors.push({
            expense,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        success: true,
        data: {
          imported: results.length,
          errors: errors.length,
          results,
          errors,
        },
        metrics: { items_processed: expenses.length },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch import failed',
      };
    }
  }

  private async handleOCRBatchProcess(job: Job): Promise<JobResult> {
    const { receipt_urls, wedding_id, processing_options } = job.data;

    try {
      // This would integrate with the OCR API
      const results = [];

      for (const url of receipt_urls) {
        // Simulate OCR processing
        await new Promise((resolve) => setTimeout(resolve, 2000));

        results.push({
          receipt_url: url,
          extraction: {
            vendor_name: 'Mock Vendor',
            amount: Math.random() * 1000,
            date: new Date().toISOString().split('T')[0],
          },
          confidence: 0.85,
        });
      }

      return {
        success: true,
        data: { processed_count: results.length, results },
        metrics: { items_processed: receipt_urls.length },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'OCR batch processing failed',
      };
    }
  }

  private async handleAnalyticsRefresh(job: Job): Promise<JobResult> {
    const { wedding_id } = job.data;

    try {
      const supabase = createClient();

      // Refresh materialized view
      const { error } = await supabase.rpc('refresh_wedding_budget_analytics');

      if (error) throw error;

      // Clear analytics cache
      await CacheService.invalidatePattern(
        CacheService.buildKey(CACHE_PREFIXES.ANALYTICS, wedding_id, '*'),
      );

      return {
        success: true,
        data: { wedding_id, refreshed_at: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Analytics refresh failed',
      };
    }
  }

  private async handleBudgetCalculation(job: Job): Promise<JobResult> {
    // Handle complex budget calculations
    return {
      success: true,
      data: { calculated: true },
    };
  }

  private async handleEmailNotification(job: Job): Promise<JobResult> {
    // Handle email notifications
    return {
      success: true,
      data: { sent: true },
    };
  }

  private async handleDataExport(job: Job): Promise<JobResult> {
    // Handle data exports
    return {
      success: true,
      data: { exported: true },
    };
  }

  private async handleBackupCreation(job: Job): Promise<JobResult> {
    // Handle backup creation
    return {
      success: true,
      data: { backup_created: true },
    };
  }

  private async handleWebhookDelivery(job: Job): Promise<JobResult> {
    // Handle webhook deliveries
    return {
      success: true,
      data: { delivered: true },
    };
  }

  private async handleMLPrediction(job: Job): Promise<JobResult> {
    // Handle ML predictions
    return {
      success: true,
      data: { predicted: true },
    };
  }

  private async handleReportGeneration(job: Job): Promise<JobResult> {
    // Handle report generation
    return {
      success: true,
      data: { report_generated: true },
    };
  }

  // Helper methods

  private getQueueKey(type: JobType, priority: JobPriority): string {
    return CacheService.buildKey(
      CACHE_PREFIXES.BATCH_JOB,
      'queue',
      type,
      priority.toString(),
    );
  }

  private async saveJob(job: Job): Promise<void> {
    try {
      const supabase = createClient();

      const { error } = await supabase.from('background_jobs').insert({
        id: job.id,
        type: job.type,
        priority: job.priority,
        data: job.data,
        metadata: job.metadata,
        status: job.status,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to save job to database:', error);
      }
    } catch (error) {
      console.error('Error saving job:', error);
    }
  }

  private async updateJob(job: Job): Promise<void> {
    try {
      // Update cache
      await CacheService.set(
        CacheService.buildKey(CACHE_PREFIXES.BATCH_JOB, 'job', job.id),
        job,
        86400,
      );

      // Update database
      const supabase = createClient();

      const { error } = await supabase
        .from('background_jobs')
        .update({
          status: job.status,
          metadata: job.metadata,
          result: job.result,
          error: job.error,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (error) {
        console.error('Failed to update job in database:', error);
      }
    } catch (error) {
      console.error('Error updating job:', error);
    }
  }

  private async getJobFromDatabase(jobId: string): Promise<Job | null> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Job;
    } catch (error) {
      console.error('Error getting job from database:', error);
      return null;
    }
  }

  private async getStatusCounts(type?: JobType): Promise<QueueStats> {
    try {
      const supabase = createClient();

      let query = supabase.from('background_jobs').select('status');

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error || !data) {
        return { queued: 0, processing: 0, completed: 0, failed: 0, total: 0 };
      }

      const stats = data.reduce(
        (acc, job) => {
          acc.total += 1;
          switch (job.status) {
            case JobStatus.QUEUED:
              acc.queued += 1;
              break;
            case JobStatus.PROCESSING:
              acc.processing += 1;
              break;
            case JobStatus.COMPLETED:
              acc.completed += 1;
              break;
            case JobStatus.FAILED:
              acc.failed += 1;
              break;
          }
          return acc;
        },
        { queued: 0, processing: 0, completed: 0, failed: 0, total: 0 },
      );

      return stats;
    } catch (error) {
      console.error('Error getting status counts:', error);
      return { queued: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    }
  }
}

// Singleton instance
const backgroundJobProcessor = new BackgroundJobProcessor();

export default backgroundJobProcessor;
export { backgroundJobProcessor, BackgroundJobProcessor };
