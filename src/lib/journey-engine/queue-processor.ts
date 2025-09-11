import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { JourneyExecutor } from './executor';
import { JourneyStateMachine } from './state-machine';

interface QueueProcessorConfig {
  batchSize: number;
  maxConcurrency: number;
  retryDelay: number;
  maxRetries: number;
  healthCheckInterval: number;
  metricsInterval: number;
}

interface ProcessingMetrics {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  averageProcessingTime: number;
  queueDepth: number;
  activeWorkers: number;
  lastProcessed: Date | null;
}

export class HighPerformanceQueueProcessor {
  private supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private config: QueueProcessorConfig = {
    batchSize: 10,
    maxConcurrency: 5,
    retryDelay: 5000,
    maxRetries: 3,
    healthCheckInterval: 30000,
    metricsInterval: 10000,
  };

  private executor: JourneyExecutor;
  private isRunning = false;
  private activeWorkers = 0;
  private workerPool: Set<Promise<void>> = new Set();
  private metrics: ProcessingMetrics = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    averageProcessingTime: 0,
    queueDepth: 0,
    activeWorkers: 0,
    lastProcessed: null,
  };

  private healthCheckTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;

  constructor(config?: Partial<QueueProcessorConfig>) {
    this.config = { ...this.config, ...config };
    this.executor = new JourneyExecutor();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Queue processor is already running');
      return;
    }

    console.log('Starting high-performance queue processor...');
    this.isRunning = true;

    // Start health monitoring
    this.startHealthChecks();
    this.startMetricsCollection();

    // Initialize worker pool
    for (let i = 0; i < this.config.maxConcurrency; i++) {
      this.spawnWorker();
    }

    console.log(
      `Queue processor started with ${this.config.maxConcurrency} workers`,
    );
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('Stopping queue processor...');
    this.isRunning = false;

    // Stop timers
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);

    // Wait for all workers to complete
    await Promise.all(this.workerPool);

    console.log('Queue processor stopped');
  }

  private spawnWorker(): void {
    const workerPromise = this.runWorker();
    this.workerPool.add(workerPromise);

    workerPromise.finally(() => {
      this.workerPool.delete(workerPromise);
      this.activeWorkers--;

      // Respawn worker if processor is still running
      if (this.isRunning && this.workerPool.size < this.config.maxConcurrency) {
        setTimeout(() => this.spawnWorker(), 1000);
      }
    });
  }

  private async runWorker(): Promise<void> {
    this.activeWorkers++;

    while (this.isRunning) {
      try {
        const batch = await this.fetchNextBatch();

        if (batch.length === 0) {
          // No work available, wait before checking again
          await this.sleep(2000);
          continue;
        }

        await this.processBatch(batch);
      } catch (error) {
        console.error('Worker error:', error);
        await this.sleep(this.config.retryDelay);
      }
    }
  }

  private async fetchNextBatch(): Promise<any[]> {
    try {
      // Fetch pending schedules with priority and batching
      const { data: schedules, error } = await this.supabase
        .from('journey_schedules')
        .select(
          `
          *,
          instance:journey_instances(
            id,
            journey_id,
            client_id,
            vendor_id,
            state,
            current_node_id,
            variables
          )
        `,
        )
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('scheduled_for', { ascending: true })
        .limit(this.config.batchSize);

      if (error) {
        console.error('Error fetching batch:', error);
        return [];
      }

      // Mark schedules as processing to avoid duplicate work
      if (schedules && schedules.length > 0) {
        const scheduleIds = schedules.map((s) => s.id);
        await this.supabase
          .from('journey_schedules')
          .update({
            status: 'processing',
            processing_started_at: new Date().toISOString(),
          })
          .in('id', scheduleIds);
      }

      return schedules || [];
    } catch (error) {
      console.error('Error in fetchNextBatch:', error);
      return [];
    }
  }

  private async processBatch(batch: any[]): Promise<void> {
    const processingPromises = batch.map((schedule) =>
      this.processSchedule(schedule).catch((error) => {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        return { scheduleId: schedule.id, error };
      }),
    );

    const results = await Promise.allSettled(processingPromises);

    // Update metrics
    results.forEach((result) => {
      this.metrics.totalProcessed++;
      if (result.status === 'fulfilled') {
        this.metrics.successCount++;
      } else {
        this.metrics.errorCount++;
      }
    });

    this.metrics.lastProcessed = new Date();
  }

  private async processSchedule(schedule: any): Promise<void> {
    const startTime = Date.now();

    try {
      const instance = schedule.instance;

      if (!instance) {
        throw new Error(`No instance found for schedule ${schedule.id}`);
      }

      // Check if instance is still in a processable state
      if (!['active', 'paused'].includes(instance.state)) {
        await this.markScheduleCompleted(
          schedule.id,
          'Instance not in processable state',
        );
        return;
      }

      // Execute the scheduled action
      let success = false;

      switch (schedule.action_type) {
        case 'execute_node':
          success = await this.executor.executeNode(
            instance.id,
            schedule.node_id,
            instance.variables || {},
          );
          break;

        case 'send_email':
          success = await this.executor.sendEmail(
            instance.client_id,
            schedule.action_data,
          );
          break;

        case 'send_sms':
          success = await this.executor.sendSMS(
            instance.client_id,
            schedule.action_data,
          );
          break;

        case 'webhook':
          success = await this.executor.triggerWebhook(
            schedule.action_data.url,
            schedule.action_data.payload,
          );
          break;

        case 'delay':
          // For delay actions, just mark as completed
          success = true;
          break;

        default:
          throw new Error(`Unknown action type: ${schedule.action_type}`);
      }

      if (success) {
        await this.markScheduleCompleted(schedule.id);

        // Update processing time metrics
        const processingTime = Date.now() - startTime;
        this.updateProcessingTimeMetrics(processingTime);
      } else {
        await this.handleScheduleFailure(schedule);
      }
    } catch (error) {
      console.error(`Error processing schedule ${schedule.id}:`, error);
      await this.handleScheduleFailure(schedule, error as Error);
    }
  }

  private async markScheduleCompleted(
    scheduleId: string,
    note?: string,
  ): Promise<void> {
    await this.supabase
      .from('journey_schedules')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processing_notes: note,
      })
      .eq('id', scheduleId);
  }

  private async handleScheduleFailure(
    schedule: any,
    error?: Error,
  ): Promise<void> {
    const retryCount = (schedule.retry_count || 0) + 1;

    if (retryCount < this.config.maxRetries) {
      // Retry with exponential backoff
      const retryDelay = this.config.retryDelay * Math.pow(2, retryCount - 1);
      const nextRetry = new Date(Date.now() + retryDelay);

      await this.supabase
        .from('journey_schedules')
        .update({
          status: 'pending',
          retry_count: retryCount,
          scheduled_for: nextRetry.toISOString(),
          last_error: error?.message || 'Processing failed',
          processing_started_at: null,
        })
        .eq('id', schedule.id);
    } else {
      // Mark as failed after max retries
      await this.supabase
        .from('journey_schedules')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          last_error: error?.message || 'Max retries exceeded',
          processing_started_at: null,
        })
        .eq('id', schedule.id);

      // Update instance state if needed
      if (schedule.instance) {
        await JourneyStateMachine.transitionInstance(
          schedule.instance.id,
          schedule.instance.state,
          'failed',
          `Schedule ${schedule.id} failed after max retries`,
        );
      }
    }
  }

  private updateProcessingTimeMetrics(processingTime: number): void {
    const currentAvg = this.metrics.averageProcessingTime;
    const total = this.metrics.totalProcessed;

    this.metrics.averageProcessingTime =
      (currentAvg * (total - 1) + processingTime) / total;
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(async () => {
      await this.collectMetrics();
    }, this.config.metricsInterval);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check database connectivity
      const { error } = await this.supabase
        .from('journey_schedules')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Health check failed - database error:', error);
        return;
      }

      // Check for stuck processing schedules
      const stuckThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes

      const { data: stuckSchedules } = await this.supabase
        .from('journey_schedules')
        .select('id')
        .eq('status', 'processing')
        .lt('processing_started_at', stuckThreshold.toISOString());

      if (stuckSchedules && stuckSchedules.length > 0) {
        console.warn(
          `Found ${stuckSchedules.length} stuck schedules, resetting...`,
        );

        await this.supabase
          .from('journey_schedules')
          .update({
            status: 'pending',
            processing_started_at: null,
            retry_count: 0,
          })
          .in(
            'id',
            stuckSchedules.map((s) => s.id),
          );
      }

      // Auto-scale worker pool if needed
      await this.autoScaleWorkers();
    } catch (error) {
      console.error('Health check error:', error);
    }
  }

  private async autoScaleWorkers(): Promise<void> {
    try {
      // Get current queue depth
      const { count: queueDepth } = await this.supabase
        .from('journey_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString());

      this.metrics.queueDepth = queueDepth || 0;
      this.metrics.activeWorkers = this.activeWorkers;

      // Scale up if queue is deep and we have capacity
      if (
        queueDepth &&
        queueDepth > 20 &&
        this.workerPool.size < this.config.maxConcurrency
      ) {
        console.log(`Scaling up workers due to queue depth: ${queueDepth}`);
        this.spawnWorker();
      }

      // Scale down if queue is empty and we have excess workers
      if ((queueDepth || 0) === 0 && this.workerPool.size > 2) {
        // Let natural worker lifecycle handle scale down
        console.log('Queue empty, allowing workers to scale down naturally');
      }
    } catch (error) {
      console.error('Auto-scaling error:', error);
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Store current metrics in database for monitoring
      await this.supabase.from('journey_metrics').insert({
        metric_type: 'queue_processor_stats',
        value: this.metrics.totalProcessed,
        labels: {
          success_count: this.metrics.successCount,
          error_count: this.metrics.errorCount,
          average_processing_time: this.metrics.averageProcessingTime,
          queue_depth: this.metrics.queueDepth,
          active_workers: this.metrics.activeWorkers,
          success_rate:
            this.metrics.totalProcessed > 0
              ? this.metrics.successCount / this.metrics.totalProcessed
              : 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Metrics collection error:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public methods for monitoring
  getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }

  isHealthy(): boolean {
    return this.isRunning && this.activeWorkers > 0;
  }

  async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    completed_today: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { count: pending },
      { count: processing },
      { count: failed },
      { count: completedToday },
    ] = await Promise.all([
      this.supabase
        .from('journey_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),

      this.supabase
        .from('journey_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processing'),

      this.supabase
        .from('journey_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),

      this.supabase
        .from('journey_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString()),
    ]);

    return {
      pending: pending || 0,
      processing: processing || 0,
      failed: failed || 0,
      completed_today: completedToday || 0,
    };
  }
}

// Global singleton instance
let queueProcessor: HighPerformanceQueueProcessor | null = null;

export function getQueueProcessor(): HighPerformanceQueueProcessor {
  if (!queueProcessor) {
    queueProcessor = new HighPerformanceQueueProcessor({
      maxConcurrency: parseInt(process.env.QUEUE_MAX_CONCURRENCY || '5'),
      batchSize: parseInt(process.env.QUEUE_BATCH_SIZE || '10'),
      maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3'),
    });
  }
  return queueProcessor;
}

export function startQueueProcessor(): Promise<void> {
  return getQueueProcessor().start();
}

export function stopQueueProcessor(): Promise<void> {
  return queueProcessor?.stop() || Promise.resolve();
}
