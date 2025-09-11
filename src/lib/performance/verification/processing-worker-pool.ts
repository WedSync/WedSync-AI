import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { EventEmitter } from 'events';

export interface WorkerPoolConfig {
  maxWorkers: number;
  maxConcurrentTasks: number;
  idleTimeout: number;
  taskTimeout: number;
  healthCheckInterval: number;
}

export interface WorkerTask {
  id: string;
  type: 'ocr' | 'preprocessing' | 'validation';
  data: any;
  priority: number;
  createdAt: Date;
  timeout: number;
}

export interface WorkerResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
  workerId: string;
}

export interface WorkerStats {
  id: string;
  status: 'idle' | 'busy' | 'error' | 'terminated';
  tasksCompleted: number;
  tasksErrored: number;
  averageTaskTime: number;
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
  queueLength: number;
}

export interface PoolStatistics {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  errorWorkers: number;
  totalTasksProcessed: number;
  totalTasksErrored: number;
  averageTaskTime: number;
  throughputPerSecond: number;
  queuedTasks: number;
  poolUtilization: number;
}

class WorkerInstance extends EventEmitter {
  public readonly id: string;
  public readonly worker: Worker;
  public status: 'idle' | 'busy' | 'error' | 'terminated' = 'idle';
  public currentTask: WorkerTask | null = null;
  public tasksCompleted: number = 0;
  public tasksErrored: number = 0;
  public totalProcessingTime: number = 0;
  public createdAt: Date = new Date();
  private healthCheckTimer?: NodeJS.Timeout;
  private taskTimeoutTimer?: NodeJS.Timeout;

  constructor(id: string, workerScript: string) {
    super();
    this.id = id;
    this.worker = new Worker(workerScript, {
      workerData: { workerId: id },
    });

    this.setupEventHandlers();
    this.startHealthCheck();
  }

  private setupEventHandlers(): void {
    this.worker.on('message', (message) => {
      if (message.type === 'task_complete') {
        this.handleTaskComplete(message);
      } else if (message.type === 'health_check') {
        this.handleHealthCheck(message);
      }
    });

    this.worker.on('error', (error) => {
      console.error(`Worker ${this.id} error:`, error);
      this.status = 'error';
      this.emit('error', error);
    });

    this.worker.on('exit', (code) => {
      console.log(`Worker ${this.id} exited with code ${code}`);
      this.status = 'terminated';
      this.cleanup();
      this.emit('exit', code);
    });
  }

  private handleTaskComplete(message: any): void {
    if (!this.currentTask) return;

    const processingTime = Date.now() - this.currentTask.createdAt.getTime();
    this.totalProcessingTime += processingTime;

    if (message.success) {
      this.tasksCompleted++;
    } else {
      this.tasksErrored++;
    }

    const result: WorkerResult = {
      taskId: this.currentTask.id,
      success: message.success,
      result: message.result,
      error: message.error,
      processingTime,
      workerId: this.id,
    };

    this.currentTask = null;
    this.status = 'idle';
    this.clearTaskTimeout();

    this.emit('task_complete', result);
  }

  private handleHealthCheck(message: any): void {
    // Update worker health metrics
    this.emit('health_update', {
      workerId: this.id,
      memoryUsage: message.memoryUsage,
      cpuUsage: message.cpuUsage,
    });
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.worker.postMessage({ type: 'health_check' });
    }, 10000); // Every 10 seconds
  }

  private setTaskTimeout(timeout: number): void {
    this.taskTimeoutTimer = setTimeout(() => {
      console.warn(`Task timeout for worker ${this.id}`);
      this.handleTaskTimeout();
    }, timeout);
  }

  private clearTaskTimeout(): void {
    if (this.taskTimeoutTimer) {
      clearTimeout(this.taskTimeoutTimer);
      this.taskTimeoutTimer = undefined;
    }
  }

  private handleTaskTimeout(): void {
    if (this.currentTask) {
      const result: WorkerResult = {
        taskId: this.currentTask.id,
        success: false,
        error: 'Task timeout',
        processingTime: Date.now() - this.currentTask.createdAt.getTime(),
        workerId: this.id,
      };

      this.tasksErrored++;
      this.currentTask = null;
      this.status = 'error';

      this.emit('task_complete', result);
    }
  }

  executeTask(task: WorkerTask): boolean {
    if (this.status !== 'idle') {
      return false;
    }

    this.currentTask = task;
    this.status = 'busy';
    this.setTaskTimeout(task.timeout);

    this.worker.postMessage({
      type: 'execute_task',
      taskId: task.id,
      taskType: task.type,
      taskData: task.data,
    });

    return true;
  }

  getStats(): WorkerStats {
    const uptime = Date.now() - this.createdAt.getTime();
    const avgTaskTime =
      this.tasksCompleted > 0
        ? this.totalProcessingTime / this.tasksCompleted
        : 0;

    return {
      id: this.id,
      status: this.status,
      tasksCompleted: this.tasksCompleted,
      tasksErrored: this.tasksErrored,
      averageTaskTime: avgTaskTime,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      uptime,
      queueLength: this.currentTask ? 1 : 0,
    };
  }

  private cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.clearTaskTimeout();
  }

  async terminate(): Promise<void> {
    this.cleanup();
    await this.worker.terminate();
    this.status = 'terminated';
  }
}

export class ProcessingWorkerPool extends EventEmitter {
  private workers: Map<string, WorkerInstance> = new Map();
  private taskQueue: WorkerTask[] = [];
  private config: WorkerPoolConfig;
  private isInitialized: boolean = false;
  private statistics: PoolStatistics;
  private monitoringTimer?: NodeJS.Timeout;

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    super();

    this.config = {
      maxWorkers: 8,
      maxConcurrentTasks: 32,
      idleTimeout: 300000, // 5 minutes
      taskTimeout: 30000, // 30 seconds
      healthCheckInterval: 30000, // 30 seconds
      ...config,
    };

    this.statistics = {
      totalWorkers: 0,
      activeWorkers: 0,
      idleWorkers: 0,
      errorWorkers: 0,
      totalTasksProcessed: 0,
      totalTasksErrored: 0,
      averageTaskTime: 0,
      throughputPerSecond: 0,
      queuedTasks: 0,
      poolUtilization: 0,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Create initial worker pool
    await this.createWorkers(this.config.maxWorkers);

    // Start monitoring
    this.startPoolMonitoring();

    this.isInitialized = true;
  }

  private async createWorkers(count: number): Promise<void> {
    const workerScript = __filename; // Use current file as worker script

    for (let i = 0; i < count; i++) {
      const workerId = `worker_${i}_${Date.now()}`;
      const worker = new WorkerInstance(workerId, workerScript);

      // Setup worker event handlers
      worker.on('task_complete', (result: WorkerResult) => {
        this.handleWorkerTaskComplete(result);
      });

      worker.on('error', (error) => {
        this.handleWorkerError(workerId, error);
      });

      worker.on('exit', () => {
        this.handleWorkerExit(workerId);
      });

      this.workers.set(workerId, worker);
    }

    this.statistics.totalWorkers = this.workers.size;
    console.log(`Created ${count} workers for processing pool`);
  }

  async submitTask(task: Omit<WorkerTask, 'createdAt'>): Promise<string> {
    const fullTask: WorkerTask = {
      ...task,
      createdAt: new Date(),
    };

    // Add to queue
    this.taskQueue.push(fullTask);
    this.taskQueue.sort((a, b) => b.priority - a.priority); // Sort by priority descending

    this.statistics.queuedTasks = this.taskQueue.length;

    // Try to assign immediately
    await this.processTaskQueue();

    return fullTask.id;
  }

  private async processTaskQueue(): Promise<void> {
    while (this.taskQueue.length > 0) {
      const availableWorker = this.findAvailableWorker();
      if (!availableWorker) break;

      const task = this.taskQueue.shift();
      if (!task) break;

      const success = availableWorker.executeTask(task);
      if (!success) {
        // Worker couldn't take the task, put it back
        this.taskQueue.unshift(task);
        break;
      }
    }

    this.statistics.queuedTasks = this.taskQueue.length;
  }

  private findAvailableWorker(): WorkerInstance | null {
    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') {
        return worker;
      }
    }
    return null;
  }

  private handleWorkerTaskComplete(result: WorkerResult): void {
    if (result.success) {
      this.statistics.totalTasksProcessed++;
    } else {
      this.statistics.totalTasksErrored++;
    }

    // Update average task time
    const totalTasks =
      this.statistics.totalTasksProcessed + this.statistics.totalTasksErrored;
    if (totalTasks > 0) {
      const totalTime =
        this.statistics.averageTaskTime * (totalTasks - 1) +
        result.processingTime;
      this.statistics.averageTaskTime = totalTime / totalTasks;
    }

    // Try to process more queued tasks
    this.processTaskQueue();

    // Emit result
    this.emit('task_complete', result);
  }

  private handleWorkerError(workerId: string, error: Error): void {
    console.error(`Worker ${workerId} encountered error:`, error);

    // Try to restart the worker
    this.restartWorker(workerId);
  }

  private handleWorkerExit(workerId: string): void {
    console.log(`Worker ${workerId} exited`);
    this.workers.delete(workerId);
    this.statistics.totalWorkers = this.workers.size;

    // Create replacement worker if needed
    if (this.isInitialized && this.workers.size < this.config.maxWorkers) {
      this.createWorkers(1);
    }
  }

  private async restartWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (worker) {
      await worker.terminate();
      this.workers.delete(workerId);
    }

    // Create replacement
    await this.createWorkers(1);
  }

  private startPoolMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.updatePoolStatistics();
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private updatePoolStatistics(): void {
    let activeWorkers = 0;
    let idleWorkers = 0;
    let errorWorkers = 0;

    for (const worker of this.workers.values()) {
      switch (worker.status) {
        case 'busy':
          activeWorkers++;
          break;
        case 'idle':
          idleWorkers++;
          break;
        case 'error':
          errorWorkers++;
          break;
      }
    }

    this.statistics.activeWorkers = activeWorkers;
    this.statistics.idleWorkers = idleWorkers;
    this.statistics.errorWorkers = errorWorkers;
    this.statistics.poolUtilization =
      this.workers.size > 0 ? (activeWorkers / this.workers.size) * 100 : 0;

    // Calculate throughput (tasks per second over last interval)
    const now = Date.now();
    const intervalSeconds = this.config.healthCheckInterval / 1000;
    this.statistics.throughputPerSecond =
      this.statistics.totalTasksProcessed / intervalSeconds;
  }

  private performHealthChecks(): void {
    for (const worker of this.workers.values()) {
      // Check if worker is responsive
      if (worker.status === 'error') {
        console.warn(`Restarting unhealthy worker ${worker.id}`);
        this.restartWorker(worker.id);
      }
    }
  }

  getWorkerStatistics(): WorkerStats[] {
    return Array.from(this.workers.values()).map((worker) => worker.getStats());
  }

  getPoolStatistics(): PoolStatistics {
    return { ...this.statistics };
  }

  async scalePool(targetSize: number): Promise<void> {
    const currentSize = this.workers.size;

    if (targetSize > currentSize) {
      // Scale up
      const workersToCreate = Math.min(
        targetSize - currentSize,
        this.config.maxWorkers - currentSize,
      );
      await this.createWorkers(workersToCreate);
    } else if (targetSize < currentSize) {
      // Scale down
      const workersToRemove = currentSize - targetSize;
      const idleWorkers = Array.from(this.workers.values())
        .filter((worker) => worker.status === 'idle')
        .slice(0, workersToRemove);

      for (const worker of idleWorkers) {
        await worker.terminate();
        this.workers.delete(worker.id);
      }

      this.statistics.totalWorkers = this.workers.size;
    }
  }

  async drainAndShutdown(timeout: number = 30000): Promise<void> {
    console.log('Draining worker pool...');

    // Wait for current tasks to complete or timeout
    const startTime = Date.now();
    while (
      this.statistics.activeWorkers > 0 &&
      Date.now() - startTime < timeout
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.updatePoolStatistics();
    }

    // Terminate all workers
    const terminationPromises = Array.from(this.workers.values()).map(
      (worker) => worker.terminate(),
    );

    await Promise.all(terminationPromises);

    this.workers.clear();
    this.taskQueue = [];

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    this.isInitialized = false;
    console.log('Worker pool shutdown complete');
  }

  async shutdown(): Promise<void> {
    await this.drainAndShutdown();
  }
}

// Worker thread code
if (!isMainThread && parentPort) {
  const { workerId } = workerData;
  let isHealthy = true;

  console.log(`Worker ${workerId} started`);

  parentPort.on('message', async (message) => {
    try {
      if (message.type === 'execute_task') {
        const result = await executeTask(message);
        parentPort!.postMessage({
          type: 'task_complete',
          taskId: message.taskId,
          success: true,
          result,
        });
      } else if (message.type === 'health_check') {
        const memoryUsage = process.memoryUsage();
        parentPort!.postMessage({
          type: 'health_check',
          memoryUsage: memoryUsage.heapUsed / 1024 / 1024,
          cpuUsage: process.cpuUsage().user / 1000000,
        });
      }
    } catch (error) {
      parentPort!.postMessage({
        type: 'task_complete',
        taskId: message.taskId,
        success: false,
        error: (error as Error).message,
      });
    }
  });

  async function executeTask(message: any): Promise<any> {
    const { taskType, taskData } = message;

    // Simulate task processing time
    const processingTime = 100 + Math.random() * 2000;
    await new Promise((resolve) => setTimeout(resolve, processingTime));

    switch (taskType) {
      case 'ocr':
        return {
          extractedText: 'Mock OCR result for document',
          confidence: 0.85 + Math.random() * 0.15,
          processingTime,
        };

      case 'preprocessing':
        return {
          optimizedBuffer: Buffer.from('mock optimized image data'),
          appliedFilters: ['noise_reduction', 'contrast_enhancement'],
          processingTime,
        };

      case 'validation':
        return {
          isValid: Math.random() > 0.1, // 90% validation success rate
          validationScore: Math.random() * 100,
          processingTime,
        };

      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }
}

// Export singleton instance
export const processingWorkerPool = new ProcessingWorkerPool();
