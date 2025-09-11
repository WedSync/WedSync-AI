/**
 * WS-333 Team B: Worker Thread Manager for Parallel Report Processing
 * High-performance parallel processing using Node.js worker threads
 * Optimized for wedding industry data processing at enterprise scale
 */

import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
  MessagePort,
} from 'worker_threads';
import { EventEmitter } from 'events';
import os from 'os';
import path from 'path';
import {
  WorkerThreadConfig,
  WorkerTask,
  WorkerResult,
  WorkerPoolMetrics,
  TaskPriority,
  WorkerStatus,
  TaskType,
} from '../../types/worker-threads';
import {
  ReportGenerationRequest,
  ReportGenerationResult,
} from '../../types/reporting-backend';

export class WeddingWorkerThreadManager extends EventEmitter {
  private workers: Map<number, Worker> = new Map();
  private availableWorkers: Set<number> = new Set();
  private busyWorkers: Map<number, WorkerTask> = new Map();
  private taskQueue: WorkerTask[] = [];
  private taskHistory: Map<string, WorkerResult> = new Map();
  private isShuttingDown: boolean = false;

  private readonly config: WorkerThreadConfig;
  private readonly workerScriptPath: string;

  // Wedding-specific worker optimization
  private readonly WEDDING_WORKER_TYPES = {
    DATA_AGGREGATION: 'data_aggregation',
    REPORT_GENERATION: 'report_generation',
    EXCEL_PROCESSING: 'excel_processing',
    PDF_GENERATION: 'pdf_generation',
    IMAGE_PROCESSING: 'image_processing',
    EMAIL_DELIVERY: 'email_delivery',
  };

  private metrics: WorkerPoolMetrics = {
    totalWorkers: 0,
    activeWorkers: 0,
    queuedTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    avgTaskDuration: 0,
    peakMemoryUsage: 0,
    cpuUtilization: 0,
    throughputPerHour: 0,
    lastUpdated: new Date(),
  };

  constructor(config: WorkerThreadConfig) {
    super();

    this.config = {
      maxWorkers: config.maxWorkers || os.cpus().length,
      minWorkers: config.minWorkers || 2,
      taskTimeout: config.taskTimeout || 300000, // 5 minutes
      maxQueueSize: config.maxQueueSize || 1000,
      workerIdleTimeout: config.workerIdleTimeout || 600000, // 10 minutes
      weddingSeasonScaling: config.weddingSeasonScaling || true,
      enableProfiling: config.enableProfiling || false,
      ...config,
    };

    this.workerScriptPath = path.join(__dirname, 'workers', 'ReportWorker.js');

    // Initialize metrics collection
    this.startMetricsCollection();
  }

  async initialize(): Promise<void> {
    console.log('🧵 Initializing Wedding Worker Thread Manager...');

    try {
      // Create initial worker pool
      await this.createInitialWorkerPool();

      // Start task processor
      this.startTaskProcessor();

      // Enable wedding season scaling if configured
      if (this.config.weddingSeasonScaling) {
        this.startSeasonalScaling();
      }

      console.log(
        `✅ Worker thread manager initialized with ${this.workers.size} workers`,
      );
    } catch (error) {
      console.error('❌ Failed to initialize worker thread manager:', error);
      throw new Error(
        `Worker thread manager initialization failed: ${error.message}`,
      );
    }
  }

  private async createInitialWorkerPool(): Promise<void> {
    const initialWorkerCount = this.config.minWorkers;

    for (let i = 0; i < initialWorkerCount; i++) {
      await this.createWorker();
    }
  }

  private async createWorker(): Promise<number> {
    const workerId = Date.now() + Math.random();

    const worker = new Worker(this.workerScriptPath, {
      workerData: {
        workerId,
        config: this.config,
      },
      resourceLimits: {
        maxOldGenerationSizeMb: this.config.maxMemoryPerWorker || 512,
        maxYoungGenerationSizeMb: this.config.maxMemoryPerWorker
          ? this.config.maxMemoryPerWorker / 4
          : 128,
      },
    });

    // Set up worker event handlers
    this.setupWorkerEventHandlers(workerId, worker);

    this.workers.set(workerId, worker);
    this.availableWorkers.add(workerId);
    this.metrics.totalWorkers++;

    console.log(`👷 Created worker ${workerId}`);
    return workerId;
  }

  private setupWorkerEventHandlers(workerId: number, worker: Worker): void {
    worker.on('message', (result: WorkerResult) => {
      this.handleWorkerResult(workerId, result);
    });

    worker.on('error', (error) => {
      console.error(`❌ Worker ${workerId} error:`, error);
      this.handleWorkerError(workerId, error);
    });

    worker.on('exit', (code) => {
      console.log(`🚪 Worker ${workerId} exited with code ${code}`);
      this.handleWorkerExit(workerId, code);
    });

    // Handle worker messages for profiling if enabled
    if (this.config.enableProfiling) {
      worker.on('message', (data) => {
        if (data.type === 'profile') {
          this.handleProfilingData(workerId, data);
        }
      });
    }
  }

  private handleWorkerResult(workerId: number, result: WorkerResult): void {
    const task = this.busyWorkers.get(workerId);

    if (!task) {
      console.warn(
        `⚠️ Received result from worker ${workerId} but no task found`,
      );
      return;
    }

    // Move worker back to available pool
    this.busyWorkers.delete(workerId);
    this.availableWorkers.add(workerId);
    this.metrics.activeWorkers--;

    // Update metrics
    const taskDuration = Date.now() - task.createdAt.getTime();
    this.updateTaskMetrics(result.success, taskDuration);

    // Store task result
    this.taskHistory.set(task.taskId, result);

    // Emit result event
    this.emit('taskCompleted', {
      taskId: task.taskId,
      workerId,
      result,
      duration: taskDuration,
    });

    console.log(
      `✅ Task ${task.taskId} completed by worker ${workerId} in ${taskDuration}ms`,
    );

    // Process next queued task if available
    this.processNextQueuedTask();
  }

  private handleWorkerError(workerId: number, error: Error): void {
    const task = this.busyWorkers.get(workerId);

    if (task) {
      // Mark task as failed
      const failedResult: WorkerResult = {
        taskId: task.taskId,
        success: false,
        error: error.message,
        data: null,
        duration: Date.now() - task.createdAt.getTime(),
        workerId,
        memoryUsage: process.memoryUsage(),
      };

      this.taskHistory.set(task.taskId, failedResult);
      this.metrics.failedTasks++;

      this.emit('taskFailed', {
        taskId: task.taskId,
        workerId,
        error: error.message,
      });
    }

    // Remove failed worker and replace it
    this.removeWorker(workerId);

    // Create replacement worker if not shutting down
    if (!this.isShuttingDown && this.workers.size < this.config.minWorkers) {
      this.createWorker();
    }
  }

  private handleWorkerExit(workerId: number, exitCode: number): void {
    this.removeWorker(workerId);

    // Create replacement worker if not shutting down and below minimum
    if (!this.isShuttingDown && this.workers.size < this.config.minWorkers) {
      console.log(`🔄 Replacing exited worker ${workerId}`);
      this.createWorker();
    }
  }

  private removeWorker(workerId: number): void {
    const worker = this.workers.get(workerId);

    if (worker) {
      this.workers.delete(workerId);
      this.availableWorkers.delete(workerId);
      this.busyWorkers.delete(workerId);
      this.metrics.totalWorkers--;

      if (this.metrics.activeWorkers > 0) {
        this.metrics.activeWorkers--;
      }

      // Terminate worker
      worker.terminate();
    }
  }

  async executeTask<T = any>(
    task: Omit<WorkerTask, 'taskId' | 'createdAt' | 'status'>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const fullTask: WorkerTask = {
        taskId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        status: 'queued',
        ...task,
      };

      // Check queue size
      if (this.taskQueue.length >= this.config.maxQueueSize) {
        reject(new Error('Task queue is full'));
        return;
      }

      // Set up task completion handlers
      const taskCompletedHandler = (event: any) => {
        if (event.taskId === fullTask.taskId) {
          this.removeListener('taskCompleted', taskCompletedHandler);
          this.removeListener('taskFailed', taskFailedHandler);

          if (event.result.success) {
            resolve(event.result.data);
          } else {
            reject(new Error(event.result.error || 'Task failed'));
          }
        }
      };

      const taskFailedHandler = (event: any) => {
        if (event.taskId === fullTask.taskId) {
          this.removeListener('taskCompleted', taskCompletedHandler);
          this.removeListener('taskFailed', taskFailedHandler);
          reject(new Error(event.error));
        }
      };

      this.on('taskCompleted', taskCompletedHandler);
      this.on('taskFailed', taskFailedHandler);

      // Set task timeout
      const timeout = setTimeout(() => {
        this.removeListener('taskCompleted', taskCompletedHandler);
        this.removeListener('taskFailed', taskFailedHandler);
        reject(
          new Error(
            `Task ${fullTask.taskId} timed out after ${this.config.taskTimeout}ms`,
          ),
        );
      }, this.config.taskTimeout);

      // Clear timeout when task completes
      this.once('taskCompleted', () => clearTimeout(timeout));
      this.once('taskFailed', () => clearTimeout(timeout));

      // Queue the task
      this.queueTask(fullTask);
    });
  }

  private queueTask(task: WorkerTask): void {
    // Insert task based on priority
    const insertIndex = this.findInsertPosition(task);
    this.taskQueue.splice(insertIndex, 0, task);
    this.metrics.queuedTasks++;

    // Try to process immediately if workers available
    this.processNextQueuedTask();
  }

  private findInsertPosition(task: WorkerTask): number {
    // Wedding day tasks get highest priority
    if (
      task.priority === 'critical' ||
      task.type === this.WEDDING_WORKER_TYPES.EMAIL_DELIVERY
    ) {
      return 0;
    }

    // Find position based on priority and wedding season factors
    let insertIndex = 0;

    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTask = this.taskQueue[i];

      if (
        this.getTaskPriorityScore(task) > this.getTaskPriorityScore(queuedTask)
      ) {
        break;
      }

      insertIndex = i + 1;
    }

    return insertIndex;
  }

  private getTaskPriorityScore(task: WorkerTask): number {
    let score = 0;

    // Base priority score
    switch (task.priority) {
      case 'critical':
        score += 100;
        break;
      case 'high':
        score += 75;
        break;
      case 'medium':
        score += 50;
        break;
      case 'low':
        score += 25;
        break;
      default:
        score += 10;
    }

    // Wedding-specific boosts
    if (task.weddingContext?.isWeddingDay) {
      score += 200; // Wedding day gets absolute priority
    }

    if (task.weddingContext?.isWeekend) {
      score += 30; // Weekend boost
    }

    if (task.weddingContext?.isPeakSeason) {
      score += 20; // Peak season boost
    }

    // Time-sensitive tasks
    if (task.type === this.WEDDING_WORKER_TYPES.EMAIL_DELIVERY) {
      score += 50;
    }

    return score;
  }

  private processNextQueuedTask(): void {
    if (this.taskQueue.length === 0 || this.availableWorkers.size === 0) {
      return;
    }

    const task = this.taskQueue.shift()!;
    const workerId = Array.from(this.availableWorkers)[0];

    this.assignTaskToWorker(task, workerId);
  }

  private assignTaskToWorker(task: WorkerTask, workerId: number): void {
    const worker = this.workers.get(workerId);

    if (!worker) {
      console.error(`❌ Worker ${workerId} not found`);
      // Put task back in queue
      this.taskQueue.unshift(task);
      return;
    }

    // Move worker to busy pool
    this.availableWorkers.delete(workerId);
    this.busyWorkers.set(workerId, task);
    this.metrics.activeWorkers++;
    this.metrics.queuedTasks--;

    // Update task status
    task.status = 'processing';
    task.assignedAt = new Date();

    // Send task to worker
    worker.postMessage(task);

    console.log(`🎯 Assigned task ${task.taskId} to worker ${workerId}`);
  }

  private startTaskProcessor(): void {
    // Process queued tasks every 100ms
    setInterval(() => {
      while (this.taskQueue.length > 0 && this.availableWorkers.size > 0) {
        this.processNextQueuedTask();
      }
    }, 100);
  }

  private startSeasonalScaling(): void {
    // Check every 5 minutes for scaling needs
    setInterval(async () => {
      await this.checkScalingNeeds();
    }, 300000);
  }

  private async checkScalingNeeds(): Promise<void> {
    const currentLoad = this.calculateCurrentLoad();
    const isWeddingSeason = this.isCurrentlyWeddingSeason();
    const isWeekend = this.isWeekend();

    let targetWorkerCount = this.config.minWorkers;

    // Scale based on queue length and load
    if (this.taskQueue.length > 10 || currentLoad > 0.8) {
      targetWorkerCount = Math.min(
        this.config.maxWorkers,
        this.workers.size + 2,
      );
    }

    // Wedding season scaling
    if (isWeddingSeason) {
      targetWorkerCount = Math.min(
        this.config.maxWorkers,
        targetWorkerCount * 1.5,
      );
    }

    // Weekend scaling (Saturday is critical)
    if (isWeekend) {
      targetWorkerCount = Math.min(
        this.config.maxWorkers,
        targetWorkerCount * 1.3,
      );
    }

    // Scale up if needed
    while (this.workers.size < targetWorkerCount) {
      await this.createWorker();
      // Small delay to prevent resource spikes
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Scale down if overprovisioned (but maintain minimum)
    while (
      this.workers.size > targetWorkerCount &&
      this.workers.size > this.config.minWorkers &&
      this.availableWorkers.size > 2
    ) {
      const idleWorkerId = Array.from(this.availableWorkers)[0];
      this.removeWorker(idleWorkerId);
    }
  }

  private calculateCurrentLoad(): number {
    const totalCapacity = this.workers.size;
    const activeWorkers = this.busyWorkers.size;
    const queuedTasks = this.taskQueue.length;

    // Load = (active + queued) / total capacity
    return totalCapacity > 0
      ? (activeWorkers + queuedTasks) / totalCapacity
      : 0;
  }

  private isCurrentlyWeddingSeason(): boolean {
    const month = new Date().getMonth() + 1;
    return month >= 5 && month <= 10; // May through October
  }

  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 60000); // Every minute
  }

  private updateMetrics(): void {
    // Calculate throughput
    const completedTasksLastHour = Array.from(this.taskHistory.values()).filter(
      (result) =>
        Date.now() - new Date(result.completedAt || 0).getTime() < 3600000,
    ).length;

    this.metrics.throughputPerHour = completedTasksLastHour;

    // Calculate average task duration
    const recentTasks = Array.from(this.taskHistory.values()).slice(-100);
    if (recentTasks.length > 0) {
      const totalDuration = recentTasks.reduce(
        (sum, task) => sum + (task.duration || 0),
        0,
      );
      this.metrics.avgTaskDuration = totalDuration / recentTasks.length;
    }

    // Update peak memory usage
    this.metrics.peakMemoryUsage = Math.max(
      this.metrics.peakMemoryUsage,
      process.memoryUsage().heapUsed,
    );

    // CPU utilization (simplified)
    this.metrics.cpuUtilization =
      (this.busyWorkers.size / this.workers.size) * 100;

    this.metrics.lastUpdated = new Date();
  }

  private updateTaskMetrics(success: boolean, duration: number): void {
    if (success) {
      this.metrics.completedTasks++;
    } else {
      this.metrics.failedTasks++;
    }

    // Update rolling average of task duration
    const weight = 0.1; // Exponential moving average weight
    this.metrics.avgTaskDuration =
      this.metrics.avgTaskDuration * (1 - weight) + duration * weight;
  }

  private handleProfilingData(workerId: number, data: any): void {
    if (this.config.enableProfiling) {
      // Store profiling data for analysis
      console.log(`📊 Profiling data from worker ${workerId}:`, data);
    }
  }

  // Public API methods

  async generateReport(
    request: ReportGenerationRequest,
  ): Promise<ReportGenerationResult> {
    return this.executeTask<ReportGenerationResult>({
      type: this.WEDDING_WORKER_TYPES.REPORT_GENERATION,
      priority: this.getReportPriority(request),
      data: request,
      weddingContext: {
        isWeddingDay: this.isWeddingDayReport(request),
        isWeekend: this.isWeekend(),
        isPeakSeason: this.isCurrentlyWeddingSeason(),
      },
    });
  }

  async processExcelReport(data: any): Promise<Buffer> {
    return this.executeTask<Buffer>({
      type: this.WEDDING_WORKER_TYPES.EXCEL_PROCESSING,
      priority: 'medium',
      data,
    });
  }

  async generatePDF(data: any): Promise<Buffer> {
    return this.executeTask<Buffer>({
      type: this.WEDDING_WORKER_TYPES.PDF_GENERATION,
      priority: 'medium',
      data,
    });
  }

  async processImages(images: any[]): Promise<any[]> {
    return this.executeTask<any[]>({
      type: this.WEDDING_WORKER_TYPES.IMAGE_PROCESSING,
      priority: 'low',
      data: images,
    });
  }

  async sendEmailReport(emailData: any): Promise<void> {
    return this.executeTask<void>({
      type: this.WEDDING_WORKER_TYPES.EMAIL_DELIVERY,
      priority: 'high', // Email delivery should be fast
      data: emailData,
    });
  }

  private getReportPriority(request: ReportGenerationRequest): TaskPriority {
    if (request.priority === 'wedding_day_emergency') return 'critical';
    if (request.priority === 'high') return 'high';
    if (request.priority === 'normal') return 'medium';
    return 'low';
  }

  private isWeddingDayReport(request: ReportGenerationRequest): boolean {
    return (
      request.priority === 'wedding_day_emergency' ||
      request.reportType === 'wedding_day_timeline'
    );
  }

  getMetrics(): WorkerPoolMetrics {
    return {
      ...this.metrics,
      totalWorkers: this.workers.size,
      activeWorkers: this.busyWorkers.size,
      queuedTasks: this.taskQueue.length,
    };
  }

  getWorkerStatuses(): Map<number, WorkerStatus> {
    const statuses = new Map<number, WorkerStatus>();

    for (const [workerId, worker] of this.workers) {
      const isActive = this.busyWorkers.has(workerId);
      const currentTask = this.busyWorkers.get(workerId);

      statuses.set(workerId, {
        workerId,
        status: isActive ? 'busy' : 'idle',
        currentTask: currentTask
          ? {
              taskId: currentTask.taskId,
              type: currentTask.type,
              startedAt: currentTask.assignedAt || currentTask.createdAt,
            }
          : null,
        memoryUsage: 0, // Would need to get from worker
        cpuUsage: 0, // Would need to get from worker
        tasksCompleted: 0, // Would need to track per worker
        uptime: 0, // Would need to track per worker
      });
    }

    return statuses;
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Worker Thread Manager...');

    this.isShuttingDown = true;

    // Wait for all active tasks to complete or timeout
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (
      this.busyWorkers.size > 0 &&
      Date.now() - startTime < shutdownTimeout
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(
        `⏳ Waiting for ${this.busyWorkers.size} workers to complete tasks...`,
      );
    }

    // Terminate all workers
    for (const [workerId, worker] of this.workers) {
      await worker.terminate();
      console.log(`🔌 Terminated worker ${workerId}`);
    }

    this.workers.clear();
    this.availableWorkers.clear();
    this.busyWorkers.clear();
    this.taskQueue.length = 0;

    console.log('✅ Worker thread manager shutdown complete');
  }
}

// Factory function for creating the worker thread manager
export function createWeddingWorkerThreadManager(
  config: WorkerThreadConfig,
): WeddingWorkerThreadManager {
  return new WeddingWorkerThreadManager(config);
}

// Export for use in reporting engine and API routes
export { WeddingWorkerThreadManager };
