// WS-184: High-Performance Worker Pool for Parallel Style Processing
'use client';

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface WorkerTask {
  id: string;
  type:
    | 'image_processing'
    | 'vector_similarity'
    | 'color_extraction'
    | 'batch_optimization';
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timeout: number;
  retries: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  assignedWorker?: string;
}

export interface WorkerContext {
  id: string;
  status: 'idle' | 'busy' | 'error' | 'terminated';
  currentTask?: WorkerTask;
  totalTasksProcessed: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  lastActivityAt: number;
  capabilities: WorkerCapability[];
  performanceRating: number; // 0-1 scale
  memoryUsage: number;
  errorCount: number;
}

export interface WorkerCapability {
  type: string;
  efficiency: number; // 0-1 scale
  maxConcurrency: number;
}

export interface PoolConfiguration {
  minWorkers: number;
  maxWorkers: number;
  autoScale: boolean;
  scaleUpThreshold: number; // Queue depth ratio to trigger scaling up
  scaleDownThreshold: number; // Idle time to trigger scaling down
  workerTimeout: number;
  taskTimeout: number;
  retryAttempts: number;
  loadBalancingStrategy:
    | 'round_robin'
    | 'least_loaded'
    | 'capability_based'
    | 'performance_based';
}

export interface ProcessingResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
  workerId: string;
  memoryUsage: number;
  cacheHit: boolean;
}

export interface PoolMetrics {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  queueLength: number;
  totalTasksProcessed: number;
  averageProcessingTime: number;
  throughput: number; // tasks per second
  errorRate: number;
  efficiency: number; // 0-1 scale
  memoryUsage: {
    total: number;
    average: number;
    peak: number;
  };
  performanceDistribution: {
    fast: number; // < 500ms
    normal: number; // 500ms - 2s
    slow: number; // > 2s
  };
}

class WorkerInstance {
  private worker: Worker | null = null;
  private messageHandlers = new Map<string, (data: any) => void>();

  constructor(
    public readonly id: string,
    private workerScript: string,
    private capabilities: WorkerCapability[],
  ) {}

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // In a real implementation, this would create an actual Web Worker
        // For now, we'll simulate worker behavior
        this.worker = {
          postMessage: (message: any) => this.simulateWorkerMessage(message),
          terminate: () => this.terminate(),
          onmessage: null,
          onerror: null,
        } as any;

        this.setupMessageHandling();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupMessageHandling(): void {
    if (!this.worker) return;

    this.worker.onmessage = (event) => {
      const { id, type, data } = event.data;
      const handler = this.messageHandlers.get(id);
      if (handler) {
        handler(data);
        this.messageHandlers.delete(id);
      }
    };

    this.worker.onerror = (error) => {
      console.error(`Worker ${this.id} error:`, error);
    };
  }

  private async simulateWorkerMessage(message: any): Promise<void> {
    const { id, task } = message;

    // Simulate processing time based on task type and complexity
    const processingTime = this.calculateProcessingTime(task);

    setTimeout(() => {
      const result = this.simulateTaskProcessing(task);

      // Simulate worker message response
      if (this.worker && this.worker.onmessage) {
        const response = {
          data: {
            id,
            type: 'task_complete',
            data: {
              success: true,
              result,
              processingTime,
              memoryUsage: Math.random() * 50 * 1024 * 1024, // 0-50MB
              cacheHit: Math.random() < 0.3, // 30% cache hit rate
            },
          },
        };

        // Call message handler asynchronously
        setTimeout(() => {
          if (this.worker?.onmessage) {
            this.worker.onmessage(response as any);
          }
        }, 0);
      }
    }, processingTime);
  }

  private calculateProcessingTime(task: WorkerTask): number {
    const baseTime =
      {
        image_processing: 800,
        vector_similarity: 300,
        color_extraction: 400,
        batch_optimization: 1200,
      }[task.type] || 500;

    const priorityMultiplier = {
      urgent: 0.5,
      high: 0.7,
      normal: 1.0,
      low: 1.3,
    }[task.priority];

    const randomVariation = 0.5 + Math.random(); // 50-150% variation

    return Math.floor(baseTime * priorityMultiplier * randomVariation);
  }

  private simulateTaskProcessing(task: WorkerTask): any {
    // Simulate different types of processing results
    switch (task.type) {
      case 'image_processing':
        return {
          processedImageUrl: `processed_${task.id}.webp`,
          colorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
          dominantColors: ['#FF6B6B', '#4ECDC4'],
          styleVector: Array.from({ length: 128 }, () => Math.random() * 2 - 1),
        };

      case 'vector_similarity':
        return {
          matches: Array.from({ length: 10 }, (_, i) => ({
            id: `match_${i}`,
            similarity: Math.random() * 0.3 + 0.7,
            distance: Math.random() * 0.3,
          })),
          totalCandidates: task.payload.candidates?.length || 100,
          searchTime: Math.random() * 200 + 50,
        };

      case 'color_extraction':
        return {
          palette: Array.from(
            { length: 8 },
            () =>
              `#${Math.floor(Math.random() * 16777215)
                .toString(16)
                .padStart(6, '0')}`,
          ),
          accuracy: Math.random() * 0.2 + 0.8,
          processingMethod: 'k_means_clustering',
        };

      case 'batch_optimization':
        return {
          optimizedCount: Math.floor((task.payload.inputCount || 100) * 0.7),
          compressionRatio: Math.random() * 0.3 + 1.5,
          qualityRetention: Math.random() * 0.1 + 0.9,
        };

      default:
        return { processed: true };
    }
  }

  async executeTask(task: WorkerTask): Promise<ProcessingResult> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const messageId = `task_${task.id}_${Date.now()}`;

      // Set up message handler for this task
      this.messageHandlers.set(messageId, (data) => {
        if (data.success) {
          resolve({
            taskId: task.id,
            success: true,
            result: data.result,
            processingTime: data.processingTime,
            workerId: this.id,
            memoryUsage: data.memoryUsage,
            cacheHit: data.cacheHit,
          });
        } else {
          resolve({
            taskId: task.id,
            success: false,
            error: data.error || 'Processing failed',
            processingTime: data.processingTime || 0,
            workerId: this.id,
            memoryUsage: data.memoryUsage || 0,
            cacheHit: false,
          });
        }
      });

      // Set timeout
      setTimeout(() => {
        if (this.messageHandlers.has(messageId)) {
          this.messageHandlers.delete(messageId);
          reject(new Error(`Task ${task.id} timed out`));
        }
      }, task.timeout);

      // Send task to worker
      this.worker.postMessage({
        id: messageId,
        task,
      });
    });
  }

  getCapabilities(): WorkerCapability[] {
    return [...this.capabilities];
  }

  canHandle(taskType: string): boolean {
    return this.capabilities.some((cap) => cap.type === taskType);
  }

  getEfficiency(taskType: string): number {
    const capability = this.capabilities.find((cap) => cap.type === taskType);
    return capability?.efficiency || 0;
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.messageHandlers.clear();
  }

  isAlive(): boolean {
    return this.worker !== null;
  }
}

export class ProcessingWorkerPool extends EventEmitter {
  private workers = new Map<string, WorkerContext>();
  private workerInstances = new Map<string, WorkerInstance>();
  private taskQueue: WorkerTask[] = [];
  private completedTasks: ProcessingResult[] = [];
  private config: PoolConfiguration;
  private metricsInterval?: NodeJS.Timeout;
  private scalingCheck?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(config: PoolConfiguration) {
    super();
    this.config = config;
    this.startMetricsCollection();
    this.startAutoScaling();
  }

  async initialize(): Promise<void> {
    // Create minimum number of workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      await this.createWorker();
    }

    this.emit('poolInitialized', {
      totalWorkers: this.workers.size,
      config: this.config,
    });
  }

  private async createWorker(): Promise<string> {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Define worker capabilities
    const capabilities: WorkerCapability[] = [
      {
        type: 'image_processing',
        efficiency: 0.8 + Math.random() * 0.2,
        maxConcurrency: 1,
      },
      {
        type: 'vector_similarity',
        efficiency: 0.7 + Math.random() * 0.3,
        maxConcurrency: 2,
      },
      {
        type: 'color_extraction',
        efficiency: 0.9 + Math.random() * 0.1,
        maxConcurrency: 3,
      },
      {
        type: 'batch_optimization',
        efficiency: 0.6 + Math.random() * 0.4,
        maxConcurrency: 1,
      },
    ];

    const workerInstance = new WorkerInstance(
      workerId,
      '/workers/style-processing-worker.js', // Worker script path
      capabilities,
    );

    await workerInstance.initialize();

    const workerContext: WorkerContext = {
      id: workerId,
      status: 'idle',
      totalTasksProcessed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      lastActivityAt: Date.now(),
      capabilities,
      performanceRating: 1.0,
      memoryUsage: 0,
      errorCount: 0,
    };

    this.workers.set(workerId, workerContext);
    this.workerInstances.set(workerId, workerInstance);

    this.emit('workerCreated', { workerId, capabilities });

    return workerId;
  }

  private async destroyWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    const instance = this.workerInstances.get(workerId);

    if (!worker || !instance) return;

    // Mark as terminated and clean up current task if any
    worker.status = 'terminated';
    if (worker.currentTask) {
      // Re-queue the task
      this.taskQueue.unshift(worker.currentTask);
    }

    // Terminate worker instance
    instance.terminate();

    // Remove from maps
    this.workers.delete(workerId);
    this.workerInstances.delete(workerId);

    this.emit('workerDestroyed', { workerId });
  }

  /**
   * WS-184: Submit task for processing with intelligent load balancing
   */
  async submitTask(task: WorkerTask): Promise<string> {
    // Add created timestamp
    task.createdAt = Date.now();

    // Add to queue based on priority
    const insertIndex = this.findInsertionIndex(task);
    this.taskQueue.splice(insertIndex, 0, task);

    this.emit('taskQueued', {
      taskId: task.id,
      queuePosition: insertIndex,
      queueLength: this.taskQueue.length,
    });

    // Try to process immediately if workers available
    this.processQueue();

    return task.id;
  }

  private findInsertionIndex(task: WorkerTask): number {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const taskPriority = priorityOrder[task.priority];

    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTaskPriority = priorityOrder[this.taskQueue[i].priority];
      if (taskPriority < queuedTaskPriority) {
        return i;
      }
    }

    return this.taskQueue.length;
  }

  private async processQueue(): Promise<void> {
    if (this.taskQueue.length === 0 || this.isShuttingDown) return;

    const availableWorkers = Array.from(this.workers.values()).filter(
      (worker) => worker.status === 'idle',
    );

    if (availableWorkers.length === 0) {
      // Try to scale up if auto-scaling is enabled
      if (this.config.autoScale && this.workers.size < this.config.maxWorkers) {
        const queueRatio = this.taskQueue.length / this.workers.size;
        if (queueRatio > this.config.scaleUpThreshold) {
          await this.createWorker();
          // Retry processing after creating worker
          setTimeout(() => this.processQueue(), 100);
        }
      }
      return;
    }

    // Process tasks with available workers
    const tasksToProcess = Math.min(
      this.taskQueue.length,
      availableWorkers.length,
    );

    for (let i = 0; i < tasksToProcess; i++) {
      const task = this.taskQueue.shift()!;
      const worker = this.selectWorkerForTask(task, availableWorkers);

      if (worker) {
        await this.assignTaskToWorker(task, worker);
        // Remove from available workers
        const workerIndex = availableWorkers.findIndex(
          (w) => w.id === worker.id,
        );
        if (workerIndex >= 0) {
          availableWorkers.splice(workerIndex, 1);
        }
      } else {
        // Put task back in queue if no suitable worker
        this.taskQueue.unshift(task);
        break;
      }
    }
  }

  private selectWorkerForTask(
    task: WorkerTask,
    availableWorkers: WorkerContext[],
  ): WorkerContext | null {
    // Filter workers that can handle this task type
    const capableWorkers = availableWorkers.filter((worker) =>
      worker.capabilities.some((cap) => cap.type === task.type),
    );

    if (capableWorkers.length === 0) return null;

    // Apply load balancing strategy
    switch (this.config.loadBalancingStrategy) {
      case 'round_robin':
        return capableWorkers[0]; // Simple first available

      case 'least_loaded':
        return capableWorkers.reduce((best, worker) =>
          worker.totalTasksProcessed < best.totalTasksProcessed ? worker : best,
        );

      case 'performance_based':
        return capableWorkers.reduce((best, worker) =>
          worker.performanceRating > best.performanceRating ? worker : best,
        );

      case 'capability_based':
        return capableWorkers.reduce((best, worker) => {
          const bestEfficiency =
            best.capabilities.find((cap) => cap.type === task.type)
              ?.efficiency || 0;
          const workerEfficiency =
            worker.capabilities.find((cap) => cap.type === task.type)
              ?.efficiency || 0;
          return workerEfficiency > bestEfficiency ? worker : best;
        });

      default:
        return capableWorkers[0];
    }
  }

  private async assignTaskToWorker(
    task: WorkerTask,
    workerContext: WorkerContext,
  ): Promise<void> {
    const workerInstance = this.workerInstances.get(workerContext.id);
    if (!workerInstance) {
      throw new Error(`Worker instance not found: ${workerContext.id}`);
    }

    // Update worker state
    workerContext.status = 'busy';
    workerContext.currentTask = task;
    workerContext.lastActivityAt = Date.now();
    task.startedAt = Date.now();
    task.assignedWorker = workerContext.id;

    this.emit('taskStarted', { taskId: task.id, workerId: workerContext.id });

    try {
      // Execute task
      const result = await workerInstance.executeTask(task);

      // Update worker context
      workerContext.status = 'idle';
      workerContext.currentTask = undefined;
      workerContext.totalTasksProcessed++;
      workerContext.totalProcessingTime += result.processingTime;
      workerContext.averageProcessingTime =
        workerContext.totalProcessingTime / workerContext.totalTasksProcessed;
      workerContext.memoryUsage = result.memoryUsage;
      workerContext.lastActivityAt = Date.now();

      // Update performance rating
      this.updateWorkerPerformanceRating(workerContext, result);

      // Store completed task
      task.completedAt = Date.now();
      this.completedTasks.push(result);

      // Limit completed tasks history
      if (this.completedTasks.length > 1000) {
        this.completedTasks = this.completedTasks.slice(-1000);
      }

      this.emit('taskCompleted', {
        taskId: task.id,
        workerId: workerContext.id,
        result,
      });

      // Continue processing queue
      setTimeout(() => this.processQueue(), 0);
    } catch (error) {
      // Handle task failure
      workerContext.status = 'error';
      workerContext.errorCount++;
      workerContext.currentTask = undefined;

      const errorResult: ProcessingResult = {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - (task.startedAt || task.createdAt),
        workerId: workerContext.id,
        memoryUsage: 0,
        cacheHit: false,
      };

      this.completedTasks.push(errorResult);

      this.emit('taskFailed', {
        taskId: task.id,
        workerId: workerContext.id,
        error,
      });

      // Retry task if retries remaining
      if (task.retries > 0) {
        task.retries--;
        task.assignedWorker = undefined;
        task.startedAt = undefined;
        this.taskQueue.unshift(task);
      }

      // Reset worker to idle after error handling
      setTimeout(() => {
        workerContext.status = 'idle';
        this.processQueue();
      }, 1000);
    }
  }

  private updateWorkerPerformanceRating(
    workerContext: WorkerContext,
    result: ProcessingResult,
  ): void {
    const targetProcessingTime = 1000; // 1 second target
    const timeScore = Math.max(
      0,
      1 - result.processingTime / targetProcessingTime,
    );
    const successScore = result.success ? 1 : 0;
    const memoryScore = Math.max(
      0,
      1 - result.memoryUsage / (100 * 1024 * 1024),
    ); // 100MB baseline

    const currentScore = (timeScore + successScore + memoryScore) / 3;

    // Exponential moving average
    const alpha = 0.1;
    workerContext.performanceRating =
      (1 - alpha) * workerContext.performanceRating + alpha * currentScore;

    // Clamp between 0 and 1
    workerContext.performanceRating = Math.max(
      0,
      Math.min(1, workerContext.performanceRating),
    );
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = this.getPoolMetrics();
      this.emit('metricsUpdate', metrics);
    }, 5000); // Update metrics every 5 seconds
  }

  private startAutoScaling(): void {
    if (!this.config.autoScale) return;

    this.scalingCheck = setInterval(() => {
      this.performAutoScaling();
    }, 10000); // Check scaling every 10 seconds
  }

  private async performAutoScaling(): Promise<void> {
    if (this.isShuttingDown) return;

    const currentWorkerCount = this.workers.size;
    const queueLength = this.taskQueue.length;
    const idleWorkers = Array.from(this.workers.values()).filter(
      (w) => w.status === 'idle',
    ).length;

    // Scale up logic
    if (queueLength > 0 && currentWorkerCount < this.config.maxWorkers) {
      const queueRatio = queueLength / currentWorkerCount;
      if (queueRatio > this.config.scaleUpThreshold) {
        const workersToAdd = Math.min(
          Math.ceil(queueLength / 2),
          this.config.maxWorkers - currentWorkerCount,
        );

        for (let i = 0; i < workersToAdd; i++) {
          await this.createWorker();
        }

        this.emit('scaledUp', {
          addedWorkers: workersToAdd,
          totalWorkers: this.workers.size,
        });
      }
    }

    // Scale down logic
    if (
      idleWorkers > this.config.minWorkers &&
      currentWorkerCount > this.config.minWorkers
    ) {
      const now = Date.now();
      const workersToRemove: string[] = [];

      Array.from(this.workers.values())
        .filter((w) => w.status === 'idle')
        .forEach((worker) => {
          const idleTime = now - worker.lastActivityAt;
          if (
            idleTime > this.config.scaleDownThreshold &&
            workersToRemove.length < currentWorkerCount - this.config.minWorkers
          ) {
            workersToRemove.push(worker.id);
          }
        });

      for (const workerId of workersToRemove) {
        await this.destroyWorker(workerId);
      }

      if (workersToRemove.length > 0) {
        this.emit('scaledDown', {
          removedWorkers: workersToRemove.length,
          totalWorkers: this.workers.size,
        });
      }
    }
  }

  /**
   * Get comprehensive pool metrics
   */
  getPoolMetrics(): PoolMetrics {
    const workers = Array.from(this.workers.values());
    const recentTasks = this.completedTasks.filter(
      (task) => Date.now() - (task.processingTime || 0) < 60000, // Last minute
    );

    const totalTasks = this.completedTasks.length;
    const successfulTasks = this.completedTasks.filter(
      (task) => task.success,
    ).length;
    const averageProcessingTime =
      recentTasks.length > 0
        ? recentTasks.reduce((sum, task) => sum + task.processingTime, 0) /
          recentTasks.length
        : 0;

    const memoryUsages = workers.map((w) => w.memoryUsage);
    const totalMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0);
    const averageMemory =
      memoryUsages.length > 0 ? totalMemory / memoryUsages.length : 0;
    const peakMemory = memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0;

    // Performance distribution
    const fastTasks = recentTasks.filter(
      (task) => task.processingTime < 500,
    ).length;
    const normalTasks = recentTasks.filter(
      (task) => task.processingTime >= 500 && task.processingTime <= 2000,
    ).length;
    const slowTasks = recentTasks.filter(
      (task) => task.processingTime > 2000,
    ).length;

    return {
      totalWorkers: workers.length,
      activeWorkers: workers.filter((w) => w.status === 'busy').length,
      idleWorkers: workers.filter((w) => w.status === 'idle').length,
      queueLength: this.taskQueue.length,
      totalTasksProcessed: totalTasks,
      averageProcessingTime,
      throughput: recentTasks.length / 60, // tasks per second over last minute
      errorRate:
        totalTasks > 0 ? (totalTasks - successfulTasks) / totalTasks : 0,
      efficiency:
        workers.reduce((sum, w) => sum + w.performanceRating, 0) /
        workers.length,
      memoryUsage: {
        total: totalMemory,
        average: averageMemory,
        peak: peakMemory,
      },
      performanceDistribution: {
        fast: recentTasks.length > 0 ? fastTasks / recentTasks.length : 0,
        normal: recentTasks.length > 0 ? normalTasks / recentTasks.length : 0,
        slow: recentTasks.length > 0 ? slowTasks / recentTasks.length : 0,
      },
    };
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): WorkerTask | ProcessingResult | null {
    // Check completed tasks first
    const completed = this.completedTasks.find(
      (task) => task.taskId === taskId,
    );
    if (completed) return completed;

    // Check queue
    const queued = this.taskQueue.find((task) => task.id === taskId);
    if (queued) return queued;

    // Check currently processing tasks
    const workers = Array.from(this.workers.values());
    for (const worker of workers) {
      if (worker.currentTask?.id === taskId) {
        return worker.currentTask;
      }
    }

    return null;
  }

  /**
   * Cancel queued task
   */
  cancelTask(taskId: string): boolean {
    const taskIndex = this.taskQueue.findIndex((task) => task.id === taskId);
    if (taskIndex >= 0) {
      const task = this.taskQueue.splice(taskIndex, 1)[0];
      this.emit('taskCancelled', { taskId, reason: 'manual_cancellation' });
      return true;
    }
    return false;
  }

  /**
   * Get worker status
   */
  getWorkerStatus(workerId?: string): WorkerContext | WorkerContext[] {
    if (workerId) {
      return this.workers.get(workerId) || null;
    }
    return Array.from(this.workers.values());
  }

  /**
   * Shutdown pool gracefully
   */
  async shutdown(timeoutMs: number = 30000): Promise<void> {
    this.isShuttingDown = true;

    // Stop new task processing
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    if (this.scalingCheck) {
      clearInterval(this.scalingCheck);
      this.scalingCheck = undefined;
    }

    // Wait for active tasks to complete or timeout
    const shutdownStartTime = Date.now();

    while (
      this.hasActiveTasks() &&
      Date.now() - shutdownStartTime < timeoutMs
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Force terminate all workers
    const workerIds = Array.from(this.workers.keys());
    for (const workerId of workerIds) {
      await this.destroyWorker(workerId);
    }

    this.emit('poolShutdown', {
      graceful: !this.hasActiveTasks(),
      totalTasks: this.completedTasks.length,
      remainingTasks: this.taskQueue.length,
    });
  }

  private hasActiveTasks(): boolean {
    return Array.from(this.workers.values()).some(
      (worker) => worker.status === 'busy',
    );
  }

  /**
   * Get pool configuration
   */
  getConfiguration(): PoolConfiguration {
    return { ...this.config };
  }

  /**
   * Update pool configuration
   */
  updateConfiguration(updates: Partial<PoolConfiguration>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configurationUpdated', this.config);
  }
}

export default ProcessingWorkerPool;
