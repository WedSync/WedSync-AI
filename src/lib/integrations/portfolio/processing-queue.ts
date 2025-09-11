import { BaseIntegrationService } from '../BaseIntegrationService';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  IntegrationError,
  ErrorCategory,
} from '@/types/integrations';

interface ProcessingJob {
  id: string;
  type:
    | 'ai_analysis'
    | 'image_optimization'
    | 'thumbnail_generation'
    | 'metadata_extraction'
    | 'cdn_upload';
  portfolioId: string;
  userId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  data: Record<string, any>;
  progress: number; // 0-100
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
  dependencies: string[];
  estimatedDuration: number; // in seconds
  actualDuration?: number;
  resourceRequirements: {
    cpu: number; // percentage
    memory: number; // MB
    storage: number; // MB
  };
}

interface Worker {
  id: string;
  type: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentJob?: string;
  jobsProcessed: number;
  avgProcessingTime: number;
  capabilities: string[];
  resourceCapacity: {
    cpu: number;
    memory: number;
    storage: number;
  };
  resourceUtilization: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

interface QueueMetrics {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgWaitTime: number;
  avgProcessingTime: number;
  throughput: number; // jobs per minute
  errorRate: number;
}

export class ProcessingQueue extends BaseIntegrationService {
  protected serviceName = 'Processing Queue';
  private jobQueue: ProcessingJob[] = [];
  private processingJobs: Map<string, ProcessingJob> = new Map();
  private completedJobs: Map<string, ProcessingJob> = new Map();
  private workers: Map<string, Worker> = new Map();
  private jobHistory: ProcessingJob[] = [];
  private maxHistorySize = 1000;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private metrics: QueueMetrics = this.initializeMetrics();

  constructor(config: IntegrationConfig, credentials: IntegrationCredentials) {
    super(config, credentials);
    this.initializeWorkers();
    this.startScheduler();
    this.startMetricsCollection();
  }

  private initializeMetrics(): QueueMetrics {
    return {
      totalJobs: 0,
      queuedJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      avgWaitTime: 0,
      avgProcessingTime: 0,
      throughput: 0,
      errorRate: 0,
    };
  }

  private initializeWorkers(): void {
    const workerConfigs = [
      {
        id: 'ai-worker-1',
        type: 'ai_analysis',
        capabilities: ['ai_analysis', 'metadata_extraction'],
        resourceCapacity: { cpu: 80, memory: 2048, storage: 1024 },
      },
      {
        id: 'ai-worker-2',
        type: 'ai_analysis',
        capabilities: ['ai_analysis', 'metadata_extraction'],
        resourceCapacity: { cpu: 80, memory: 2048, storage: 1024 },
      },
      {
        id: 'image-worker-1',
        type: 'image_processing',
        capabilities: ['image_optimization', 'thumbnail_generation'],
        resourceCapacity: { cpu: 60, memory: 1024, storage: 2048 },
      },
      {
        id: 'image-worker-2',
        type: 'image_processing',
        capabilities: ['image_optimization', 'thumbnail_generation'],
        resourceCapacity: { cpu: 60, memory: 1024, storage: 2048 },
      },
      {
        id: 'cdn-worker-1',
        type: 'cdn_upload',
        capabilities: ['cdn_upload'],
        resourceCapacity: { cpu: 40, memory: 512, storage: 512 },
      },
    ];

    workerConfigs.forEach((config) => {
      this.workers.set(config.id, {
        ...config,
        status: 'idle',
        jobsProcessed: 0,
        avgProcessingTime: 0,
        resourceUtilization: { cpu: 0, memory: 0, storage: 0 },
      });
    });
  }

  async validateConnection(): Promise<boolean> {
    // Check if at least one worker is available
    const availableWorkers = Array.from(this.workers.values()).filter(
      (worker) => worker.status !== 'offline',
    ).length;

    return availableWorkers > 0;
  }

  async refreshToken(): Promise<string> {
    return this.credentials.apiKey;
  }

  protected async makeRequest(
    endpoint: string,
    options?: any,
  ): Promise<IntegrationResponse> {
    // For the processing queue, this would interface with job queue services
    return {
      success: true,
      data: { message: 'Processing queue operation completed' },
      timestamp: new Date(),
    };
  }

  async addJob(
    type: ProcessingJob['type'],
    portfolioId: string,
    userId: string,
    data: Record<string, any>,
    options: {
      priority?: ProcessingJob['priority'];
      maxRetries?: number;
      dependencies?: string[];
      estimatedDuration?: number;
      resourceRequirements?: Partial<ProcessingJob['resourceRequirements']>;
    } = {},
  ): Promise<string> {
    const job: ProcessingJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      portfolioId,
      userId,
      priority: options.priority || 'medium',
      status: 'queued',
      data,
      progress: 0,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      dependencies: options.dependencies || [],
      estimatedDuration:
        options.estimatedDuration || this.getEstimatedDuration(type),
      resourceRequirements: {
        cpu: 50,
        memory: 512,
        storage: 256,
        ...options.resourceRequirements,
      },
    };

    // Insert job in priority order
    this.insertJobByPriority(job);
    this.metrics.totalJobs++;
    this.metrics.queuedJobs++;

    console.log(`Job ${job.id} added to queue with priority ${job.priority}`);

    return job.id;
  }

  private insertJobByPriority(job: ProcessingJob): void {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const jobPriority = priorityOrder[job.priority];

    let insertIndex = 0;
    for (let i = 0; i < this.jobQueue.length; i++) {
      const queuedJobPriority = priorityOrder[this.jobQueue[i].priority];
      if (jobPriority > queuedJobPriority) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }

    this.jobQueue.splice(insertIndex, 0, job);
  }

  private getEstimatedDuration(type: ProcessingJob['type']): number {
    const estimations = {
      ai_analysis: 30,
      image_optimization: 15,
      thumbnail_generation: 5,
      metadata_extraction: 10,
      cdn_upload: 20,
    };
    return estimations[type] || 30;
  }

  async getJobStatus(jobId: string): Promise<ProcessingJob | null> {
    // Check processing jobs first
    const processingJob = this.processingJobs.get(jobId);
    if (processingJob) return processingJob;

    // Check completed jobs
    const completedJob = this.completedJobs.get(jobId);
    if (completedJob) return completedJob;

    // Check queue
    const queuedJob = this.jobQueue.find((job) => job.id === jobId);
    if (queuedJob) return queuedJob;

    // Check history
    return this.jobHistory.find((job) => job.id === jobId) || null;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    // Remove from queue if not started
    const queueIndex = this.jobQueue.findIndex((job) => job.id === jobId);
    if (queueIndex >= 0) {
      const job = this.jobQueue[queueIndex];
      job.status = 'cancelled';
      job.completedAt = new Date();
      this.jobQueue.splice(queueIndex, 1);
      this.addToHistory(job);
      this.metrics.queuedJobs--;
      console.log(`Job ${jobId} cancelled from queue`);
      return true;
    }

    // Mark processing job for cancellation
    const processingJob = this.processingJobs.get(jobId);
    if (processingJob) {
      processingJob.status = 'cancelled';
      console.log(`Job ${jobId} marked for cancellation`);
      return true;
    }

    return false;
  }

  private startScheduler(): void {
    this.schedulerInterval = setInterval(() => {
      this.scheduleJobs();
    }, 1000); // Run scheduler every second
  }

  private async scheduleJobs(): Promise<void> {
    if (this.jobQueue.length === 0) return;

    // Get available workers
    const availableWorkers = Array.from(this.workers.values()).filter(
      (worker) => worker.status === 'idle',
    );

    if (availableWorkers.length === 0) return;

    // Process jobs that have no pending dependencies
    const executableJobs = this.jobQueue.filter((job) =>
      this.canExecuteJob(job),
    );

    for (const job of executableJobs.slice(0, availableWorkers.length)) {
      const suitableWorker = availableWorkers.find(
        (worker) =>
          worker.capabilities.includes(job.type) &&
          this.hasResourceCapacity(worker, job.resourceRequirements),
      );

      if (suitableWorker) {
        await this.assignJobToWorker(job, suitableWorker);

        // Remove from available workers list
        const workerIndex = availableWorkers.indexOf(suitableWorker);
        availableWorkers.splice(workerIndex, 1);
      }
    }
  }

  private canExecuteJob(job: ProcessingJob): boolean {
    if (job.dependencies.length === 0) return true;

    // Check if all dependencies are completed
    return job.dependencies.every((depId) => {
      const dependency = this.completedJobs.get(depId);
      return dependency && dependency.status === 'completed';
    });
  }

  private hasResourceCapacity(
    worker: Worker,
    requirements: ProcessingJob['resourceRequirements'],
  ): boolean {
    return (
      worker.resourceCapacity.cpu >= requirements.cpu &&
      worker.resourceCapacity.memory >= requirements.memory &&
      worker.resourceCapacity.storage >= requirements.storage
    );
  }

  private async assignJobToWorker(
    job: ProcessingJob,
    worker: Worker,
  ): Promise<void> {
    // Remove job from queue
    const queueIndex = this.jobQueue.findIndex((j) => j.id === job.id);
    if (queueIndex >= 0) {
      this.jobQueue.splice(queueIndex, 1);
    }

    // Update job status
    job.status = 'processing';
    job.startedAt = new Date();
    job.progress = 0;

    // Update worker status
    worker.status = 'busy';
    worker.currentJob = job.id;
    worker.resourceUtilization = { ...job.resourceRequirements };

    // Move to processing map
    this.processingJobs.set(job.id, job);

    // Update metrics
    this.metrics.queuedJobs--;
    this.metrics.processingJobs++;

    console.log(`Job ${job.id} assigned to worker ${worker.id}`);

    // Start job processing
    this.processJob(job, worker);
  }

  private async processJob(job: ProcessingJob, worker: Worker): Promise<void> {
    try {
      const startTime = Date.now();

      // Simulate job processing with progress updates
      await this.simulateJobProcessing(job);

      const duration = (Date.now() - startTime) / 1000;

      // Job completed successfully
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.actualDuration = duration;

      this.completeJob(job, worker);
    } catch (error) {
      await this.handleJobFailure(job, worker, error as Error);
    }
  }

  private async simulateJobProcessing(job: ProcessingJob): Promise<void> {
    const totalSteps = 10;
    const stepDuration = (job.estimatedDuration * 1000) / totalSteps;

    for (let step = 1; step <= totalSteps; step++) {
      if (job.status === 'cancelled') {
        throw new Error('Job cancelled');
      }

      await new Promise((resolve) => setTimeout(resolve, stepDuration));
      job.progress = (step / totalSteps) * 100;

      // Simulate occasional failures
      if (Math.random() < 0.05 && job.retryCount === 0) {
        // 5% failure rate on first attempt
        throw new Error('Simulated processing error');
      }
    }
  }

  private completeJob(job: ProcessingJob, worker: Worker): void {
    // Remove from processing
    this.processingJobs.delete(job.id);

    // Add to completed jobs
    this.completedJobs.set(job.id, job);

    // Update worker
    worker.status = 'idle';
    worker.currentJob = undefined;
    worker.jobsProcessed++;
    worker.resourceUtilization = { cpu: 0, memory: 0, storage: 0 };

    // Update worker average processing time
    const totalTime =
      worker.avgProcessingTime * (worker.jobsProcessed - 1) +
      (job.actualDuration || 0);
    worker.avgProcessingTime = totalTime / worker.jobsProcessed;

    // Add to history
    this.addToHistory(job);

    // Update metrics
    this.metrics.processingJobs--;
    this.metrics.completedJobs++;

    console.log(
      `Job ${job.id} completed by worker ${worker.id} in ${job.actualDuration}s`,
    );

    // Clean up completed jobs periodically
    if (this.completedJobs.size > 1000) {
      this.cleanupCompletedJobs();
    }
  }

  private async handleJobFailure(
    job: ProcessingJob,
    worker: Worker,
    error: Error,
  ): Promise<void> {
    job.error = error.message;
    job.retryCount++;

    // Update worker
    worker.status = 'idle';
    worker.currentJob = undefined;
    worker.resourceUtilization = { cpu: 0, memory: 0, storage: 0 };

    // Remove from processing
    this.processingJobs.delete(job.id);
    this.metrics.processingJobs--;

    if (job.retryCount < job.maxRetries) {
      // Retry with exponential backoff
      const retryDelay = Math.pow(2, job.retryCount) * 1000;

      setTimeout(() => {
        job.status = 'queued';
        job.progress = 0;
        job.error = undefined;
        this.insertJobByPriority(job);
        this.metrics.queuedJobs++;
        console.log(
          `Job ${job.id} requeued for retry ${job.retryCount}/${job.maxRetries}`,
        );
      }, retryDelay);
    } else {
      // Job failed permanently
      job.status = 'failed';
      job.completedAt = new Date();
      this.addToHistory(job);
      this.metrics.failedJobs++;
      console.error(
        `Job ${job.id} failed permanently after ${job.retryCount} retries:`,
        error,
      );
    }
  }

  private addToHistory(job: ProcessingJob): void {
    this.jobHistory.unshift(job);

    if (this.jobHistory.length > this.maxHistorySize) {
      this.jobHistory = this.jobHistory.slice(0, this.maxHistorySize);
    }
  }

  private cleanupCompletedJobs(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const jobsToRemove: string[] = [];

    this.completedJobs.forEach((job, id) => {
      if (job.completedAt && job.completedAt < cutoffTime) {
        jobsToRemove.push(id);
      }
    });

    jobsToRemove.forEach((id) => {
      this.completedJobs.delete(id);
    });

    console.log(`Cleaned up ${jobsToRemove.length} old completed jobs`);
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 60000); // Update metrics every minute
  }

  private updateMetrics(): void {
    const currentTime = Date.now();
    const oneMinuteAgo = currentTime - 60000;

    // Calculate throughput (jobs completed in last minute)
    const recentCompletions = Array.from(this.completedJobs.values()).filter(
      (job) => job.completedAt && job.completedAt.getTime() > oneMinuteAgo,
    );

    this.metrics.throughput = recentCompletions.length;

    // Calculate average wait time
    const waitTimes = Array.from(this.completedJobs.values())
      .filter((job) => job.startedAt)
      .map(
        (job) => (job.startedAt!.getTime() - job.createdAt.getTime()) / 1000,
      );

    this.metrics.avgWaitTime =
      waitTimes.length > 0
        ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
        : 0;

    // Calculate average processing time
    const processingTimes = Array.from(this.completedJobs.values())
      .filter((job) => job.actualDuration)
      .map((job) => job.actualDuration!);

    this.metrics.avgProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) /
          processingTimes.length
        : 0;

    // Calculate error rate
    this.metrics.errorRate =
      this.metrics.totalJobs > 0
        ? (this.metrics.failedJobs / this.metrics.totalJobs) * 100
        : 0;

    // Update current queue counts
    this.metrics.queuedJobs = this.jobQueue.length;
    this.metrics.processingJobs = this.processingJobs.size;
  }

  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  getWorkerStatus(): Array<{
    id: string;
    type: string;
    status: string;
    currentJob?: string;
    jobsProcessed: number;
    avgProcessingTime: number;
    resourceUtilization: Worker['resourceUtilization'];
  }> {
    return Array.from(this.workers.values()).map((worker) => ({
      id: worker.id,
      type: worker.type,
      status: worker.status,
      currentJob: worker.currentJob,
      jobsProcessed: worker.jobsProcessed,
      avgProcessingTime: worker.avgProcessingTime,
      resourceUtilization: worker.resourceUtilization,
    }));
  }

  getQueueSnapshot(): {
    queued: ProcessingJob[];
    processing: ProcessingJob[];
    recentlyCompleted: ProcessingJob[];
    failed: ProcessingJob[];
  } {
    const recentCompletions = Array.from(this.completedJobs.values())
      .filter((job) => {
        if (!job.completedAt) return false;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return job.completedAt > oneHourAgo;
      })
      .sort(
        (a, b) =>
          (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0),
      )
      .slice(0, 20);

    const failedJobs = this.jobHistory
      .filter((job) => job.status === 'failed')
      .slice(0, 20);

    return {
      queued: [...this.jobQueue].slice(0, 20),
      processing: Array.from(this.processingJobs.values()),
      recentlyCompleted: recentCompletions,
      failed: failedJobs,
    };
  }

  async optimizeResourceAllocation(): Promise<void> {
    const metrics = this.getMetrics();
    const workers = Array.from(this.workers.values());

    // If queue is backing up, consider scaling workers
    if (metrics.queuedJobs > 50 && metrics.avgWaitTime > 120) {
      console.log('Queue is backing up, consider scaling workers');
      // In production, this would trigger auto-scaling
    }

    // If workers are underutilized, consider scaling down
    const utilization =
      workers.filter((w) => w.status === 'busy').length / workers.length;
    if (utilization < 0.3 && metrics.queuedJobs < 10) {
      console.log('Workers are underutilized, consider scaling down');
    }

    // Rebalance worker capabilities based on job types
    const jobTypeDistribution = this.analyzeJobTypeDistribution();
    console.log('Job type distribution:', jobTypeDistribution);
  }

  private analyzeJobTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    [...this.jobQueue, ...Array.from(this.processingJobs.values())].forEach(
      (job) => {
        distribution[job.type] = (distribution[job.type] || 0) + 1;
      },
    );

    return distribution;
  }

  async pauseQueue(): Promise<void> {
    // Stop scheduler
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    console.log('Processing queue paused');
  }

  async resumeQueue(): Promise<void> {
    if (!this.schedulerInterval) {
      this.startScheduler();
      console.log('Processing queue resumed');
    }
  }

  async cleanup(): Promise<void> {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Mark all processing jobs as cancelled
    this.processingJobs.forEach((job) => {
      job.status = 'cancelled';
      job.completedAt = new Date();
    });

    console.log('Processing queue cleanup completed');
  }
}
