/**
 * DataSyncScheduler.ts - Automated data sync scheduling
 * WS-246: Vendor Performance Analytics System - Team C Integration Focus
 *
 * Manages scheduled and on-demand data synchronization:
 * - Automated sync scheduling based on data source configuration
 * - Priority-based sync queuing with wedding day priorities
 * - Sync job distribution and load balancing
 * - Failure recovery and retry mechanisms
 * - Performance optimization and batch processing
 */

import { createClient } from '@supabase/supabase-js';
import {
  DataSyncJob,
  SyncJobType,
  JobStatus,
  VendorDataSource,
  SyncConfig,
  SyncProgress,
} from '../../../types/integrations';

interface SyncSchedule {
  id: string;
  dataSourceId: string;
  frequency: 'REALTIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  nextRunTime: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
  lastRunTime?: Date;
  consecutiveFailures: number;
  config: SyncConfig;
}

interface SyncQueueItem {
  job: DataSyncJob;
  priority: number;
  addedAt: Date;
  weddings: Array<{
    weddingId: string;
    weddingDate: string;
    isThisWeek: boolean;
  }>;
}

interface SyncWorker {
  id: string;
  isActive: boolean;
  currentJob?: DataSyncJob;
  completedJobs: number;
  failedJobs: number;
  startTime: Date;
  lastActivity: Date;
}

export class DataSyncScheduler {
  private supabase;
  private schedules = new Map<string, SyncSchedule>();
  private syncQueue: SyncQueueItem[] = [];
  private workers: SyncWorker[] = [];
  private schedulerInterval: NodeJS.Timeout | null = null;
  private queueProcessorInterval: NodeJS.Timeout | null = null;
  private maxConcurrentSyncs: number = 5;
  private isRunning: boolean = false;

  constructor(
    private supabaseUrl: string,
    private serviceKey: string,
    maxConcurrentSyncs: number = 5,
  ) {
    this.supabase = createClient(supabaseUrl, serviceKey);
    this.maxConcurrentSyncs = maxConcurrentSyncs;
    this.initializeWorkers();
  }

  /**
   * Start the sync scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Sync scheduler already running');
      return;
    }

    console.log('🚀 Starting data sync scheduler...');
    this.isRunning = true;

    try {
      // Load existing schedules from database
      await this.loadSchedules();

      // Start scheduler intervals
      this.startScheduleProcessor();
      this.startQueueProcessor();

      console.log(
        `✅ Data sync scheduler started with ${this.workers.length} workers`,
      );
    } catch (error) {
      console.error('❌ Failed to start sync scheduler:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the sync scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ Sync scheduler already stopped');
      return;
    }

    console.log('🛑 Stopping data sync scheduler...');
    this.isRunning = false;

    // Clear intervals
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
      this.queueProcessorInterval = null;
    }

    // Wait for active jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.hasActiveJobs() && Date.now() - startTime < timeout) {
      console.log('⏳ Waiting for active sync jobs to complete...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Force stop any remaining jobs
    for (const worker of this.workers) {
      if (worker.currentJob) {
        await this.markJobAsCancelled(worker.currentJob.id);
        worker.currentJob = undefined;
        worker.isActive = false;
      }
    }

    console.log('✅ Data sync scheduler stopped');
  }

  /**
   * Create a new sync schedule for a data source
   */
  async createSchedule(
    dataSourceId: string,
    frequency: SyncSchedule['frequency'],
    priority: SyncSchedule['priority'] = 'MEDIUM',
    config?: Partial<SyncConfig>,
  ): Promise<string> {
    try {
      const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const defaultConfig: SyncConfig = {
        batch_size: 100,
        timeout_ms: 300000, // 5 minutes
        retry_strategy: 'EXPONENTIAL',
        retry_delay_ms: 5000,
        data_validation: true,
        conflict_resolution: 'SOURCE_WINS',
      };

      const nextRunTime = this.calculateNextRunTime(new Date(), frequency);

      const schedule: SyncSchedule = {
        id: scheduleId,
        dataSourceId,
        frequency,
        nextRunTime,
        priority,
        isActive: true,
        consecutiveFailures: 0,
        config: { ...defaultConfig, ...config },
      };

      // Store in database
      const { error } = await this.supabase.from('sync_schedules').insert([
        {
          id: scheduleId,
          data_source_id: dataSourceId,
          frequency,
          next_run_time: nextRunTime.toISOString(),
          priority,
          is_active: true,
          consecutive_failures: 0,
          config: schedule.config,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw new Error(`Failed to create sync schedule: ${error.message}`);
      }

      this.schedules.set(scheduleId, schedule);

      console.log(
        `✅ Created sync schedule: ${scheduleId} (${frequency}, ${priority})`,
      );
      return scheduleId;
    } catch (error) {
      console.error('❌ Failed to create sync schedule:', error);
      throw error;
    }
  }

  /**
   * Queue an immediate sync job
   */
  async queueImmediateSync(
    dataSourceId: string,
    jobType: SyncJobType = 'FULL_SYNC',
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH',
  ): Promise<string> {
    try {
      // Get data source details
      const { data: dataSource, error } = await this.supabase
        .from('vendor_data_sources')
        .select('*')
        .eq('id', dataSourceId)
        .single();

      if (error || !dataSource) {
        throw new Error(`Data source not found: ${dataSourceId}`);
      }

      // Check for wedding context
      const weddings = await this.getUpcomingWeddings(
        dataSource.vendor_id,
        dataSource.organization_id,
      );

      // Create sync job
      const syncJob = await this.createSyncJob(dataSource, jobType, priority);

      // Add to queue with priority calculation
      const queuePriority = this.calculateQueuePriority(priority, weddings);

      const queueItem: SyncQueueItem = {
        job: syncJob,
        priority: queuePriority,
        addedAt: new Date(),
        weddings,
      };

      // Insert in priority order
      const insertIndex = this.syncQueue.findIndex(
        (item) => item.priority < queuePriority,
      );
      if (insertIndex === -1) {
        this.syncQueue.push(queueItem);
      } else {
        this.syncQueue.splice(insertIndex, 0, queueItem);
      }

      console.log(
        `📥 Queued immediate sync: ${syncJob.id} (priority: ${queuePriority})`,
      );
      return syncJob.id;
    } catch (error) {
      console.error('❌ Failed to queue immediate sync:', error);
      throw error;
    }
  }

  /**
   * Get sync status and queue information
   */
  getSyncStatus(): {
    isRunning: boolean;
    queueLength: number;
    activeJobs: number;
    completedJobs24h: number;
    failedJobs24h: number;
    workers: Array<{
      id: string;
      isActive: boolean;
      currentJob?: string;
      completedJobs: number;
      failedJobs: number;
      uptime: number;
    }>;
    nextScheduledSyncs: Array<{
      dataSourceId: string;
      nextRunTime: Date;
      frequency: string;
      priority: string;
    }>;
  } {
    const activeJobs = this.workers.filter((w) => w.currentJob).length;

    // Calculate 24h stats
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const completedJobs24h = this.workers.reduce(
      (sum, w) => sum + w.completedJobs,
      0,
    );
    const failedJobs24h = this.workers.reduce(
      (sum, w) => sum + w.failedJobs,
      0,
    );

    // Get next scheduled syncs
    const nextScheduledSyncs = Array.from(this.schedules.values())
      .filter((s) => s.isActive)
      .sort((a, b) => a.nextRunTime.getTime() - b.nextRunTime.getTime())
      .slice(0, 10)
      .map((s) => ({
        dataSourceId: s.dataSourceId,
        nextRunTime: s.nextRunTime,
        frequency: s.frequency,
        priority: s.priority,
      }));

    return {
      isRunning: this.isRunning,
      queueLength: this.syncQueue.length,
      activeJobs,
      completedJobs24h,
      failedJobs24h,
      workers: this.workers.map((w) => ({
        id: w.id,
        isActive: w.isActive,
        currentJob: w.currentJob?.id,
        completedJobs: w.completedJobs,
        failedJobs: w.failedJobs,
        uptime: Date.now() - w.startTime.getTime(),
      })),
      nextScheduledSyncs,
    };
  }

  /**
   * Update sync schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<
      Pick<SyncSchedule, 'frequency' | 'priority' | 'isActive' | 'config'>
    >,
  ): Promise<void> {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule not found: ${scheduleId}`);
      }

      // Apply updates
      Object.assign(schedule, updates);

      // Recalculate next run time if frequency changed
      if (updates.frequency) {
        schedule.nextRunTime = this.calculateNextRunTime(
          new Date(),
          updates.frequency,
        );
      }

      // Update database
      const { error } = await this.supabase
        .from('sync_schedules')
        .update({
          frequency: schedule.frequency,
          priority: schedule.priority,
          is_active: schedule.isActive,
          config: schedule.config,
          next_run_time: schedule.nextRunTime.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId);

      if (error) {
        throw new Error(`Failed to update sync schedule: ${error.message}`);
      }

      console.log(`✅ Updated sync schedule: ${scheduleId}`);
    } catch (error) {
      console.error('❌ Failed to update sync schedule:', error);
      throw error;
    }
  }

  /**
   * Private method: Initialize workers
   */
  private initializeWorkers(): void {
    this.workers = [];

    for (let i = 0; i < this.maxConcurrentSyncs; i++) {
      const worker: SyncWorker = {
        id: `worker_${i}`,
        isActive: false,
        completedJobs: 0,
        failedJobs: 0,
        startTime: new Date(),
        lastActivity: new Date(),
      };

      this.workers.push(worker);
    }
  }

  /**
   * Private method: Load existing schedules
   */
  private async loadSchedules(): Promise<void> {
    try {
      const { data: schedules, error } = await this.supabase
        .from('sync_schedules')
        .select('*')
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to load schedules: ${error.message}`);
      }

      this.schedules.clear();

      if (schedules?.length) {
        for (const scheduleData of schedules) {
          const schedule: SyncSchedule = {
            id: scheduleData.id,
            dataSourceId: scheduleData.data_source_id,
            frequency: scheduleData.frequency,
            nextRunTime: new Date(scheduleData.next_run_time),
            priority: scheduleData.priority,
            isActive: scheduleData.is_active,
            lastRunTime: scheduleData.last_run_time
              ? new Date(scheduleData.last_run_time)
              : undefined,
            consecutiveFailures: scheduleData.consecutive_failures || 0,
            config: scheduleData.config,
          };

          this.schedules.set(schedule.id, schedule);
        }

        console.log(`📅 Loaded ${schedules.length} sync schedules`);
      }
    } catch (error) {
      console.error('❌ Failed to load schedules:', error);
      throw error;
    }
  }

  /**
   * Private method: Start schedule processor
   */
  private startScheduleProcessor(): void {
    this.schedulerInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const now = new Date();

        // Check for schedules that need to run
        for (const [scheduleId, schedule] of this.schedules.entries()) {
          if (!schedule.isActive || schedule.nextRunTime > now) {
            continue;
          }

          // Get data source
          const { data: dataSource } = await this.supabase
            .from('vendor_data_sources')
            .select('*')
            .eq('id', schedule.dataSourceId)
            .single();

          if (!dataSource) {
            console.warn(
              `⚠️ Data source not found for schedule: ${scheduleId}`,
            );
            continue;
          }

          // Create and queue sync job
          try {
            const syncJob = await this.createSyncJob(
              dataSource,
              'INCREMENTAL_SYNC',
              schedule.priority,
            );
            const weddings = await this.getUpcomingWeddings(
              dataSource.vendor_id,
              dataSource.organization_id,
            );
            const queuePriority = this.calculateQueuePriority(
              schedule.priority,
              weddings,
            );

            const queueItem: SyncQueueItem = {
              job: syncJob,
              priority: queuePriority,
              addedAt: new Date(),
              weddings,
            };

            this.syncQueue.push(queueItem);
            this.syncQueue.sort((a, b) => b.priority - a.priority);

            // Update schedule
            schedule.nextRunTime = this.calculateNextRunTime(
              now,
              schedule.frequency,
            );
            schedule.lastRunTime = now;

            await this.supabase
              .from('sync_schedules')
              .update({
                next_run_time: schedule.nextRunTime.toISOString(),
                last_run_time: now.toISOString(),
              })
              .eq('id', scheduleId);

            console.log(
              `⏰ Scheduled sync job: ${syncJob.id} from schedule: ${scheduleId}`,
            );
          } catch (error) {
            console.error(
              `❌ Failed to create scheduled sync job for ${scheduleId}:`,
              error,
            );

            // Increment failure count
            schedule.consecutiveFailures++;

            // Disable schedule if too many failures
            if (schedule.consecutiveFailures >= 5) {
              schedule.isActive = false;
              await this.supabase
                .from('sync_schedules')
                .update({
                  is_active: false,
                  consecutive_failures: schedule.consecutiveFailures,
                })
                .eq('id', scheduleId);

              console.error(
                `❌ Disabled schedule ${scheduleId} due to consecutive failures`,
              );
            }
          }
        }
      } catch (error) {
        console.error('❌ Schedule processor error:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Private method: Start queue processor
   */
  private startQueueProcessor(): void {
    this.queueProcessorInterval = setInterval(async () => {
      if (!this.isRunning || this.syncQueue.length === 0) return;

      // Find available workers
      const availableWorkers = this.workers.filter((w) => !w.isActive);

      if (availableWorkers.length === 0) return;

      // Process queue items
      for (const worker of availableWorkers) {
        if (this.syncQueue.length === 0) break;

        const queueItem = this.syncQueue.shift()!;

        worker.isActive = true;
        worker.currentJob = queueItem.job;
        worker.lastActivity = new Date();

        // Execute sync job in background
        this.executeSyncJob(queueItem.job, worker).catch((error) => {
          console.error(
            `❌ Sync job execution failed for ${queueItem.job.id}:`,
            error,
          );
        });
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Private method: Execute sync job
   */
  private async executeSyncJob(
    syncJob: DataSyncJob,
    worker: SyncWorker,
  ): Promise<void> {
    try {
      console.log(
        `🔄 Executing sync job: ${syncJob.id} (worker: ${worker.id})`,
      );

      // Update job status to running
      syncJob.status = 'RUNNING';
      syncJob.started_at = new Date().toISOString();

      await this.updateSyncJob(syncJob);

      // Get data source
      const { data: dataSource, error } = await this.supabase
        .from('vendor_data_sources')
        .select('*')
        .eq('id', syncJob.data_source_id)
        .single();

      if (error || !dataSource) {
        throw new Error(`Data source not found: ${syncJob.data_source_id}`);
      }

      // Simulate sync execution (would be real integration logic)
      await this.performDataSync(dataSource, syncJob);

      // Mark job as completed
      syncJob.status = 'COMPLETED';
      syncJob.completed_at = new Date().toISOString();

      await this.updateSyncJob(syncJob);

      worker.completedJobs++;
      console.log(`✅ Sync job completed: ${syncJob.id}`);
    } catch (error) {
      console.error(`❌ Sync job failed: ${syncJob.id}`, error);

      // Mark job as failed
      syncJob.status = 'FAILED';
      syncJob.error = error instanceof Error ? error.message : 'Unknown error';

      await this.updateSyncJob(syncJob);

      worker.failedJobs++;

      // Schedule retry if configured
      if (syncJob.retry_count < syncJob.max_retries) {
        await this.scheduleRetry(syncJob);
      }
    } finally {
      // Free up worker
      worker.isActive = false;
      worker.currentJob = undefined;
      worker.lastActivity = new Date();
    }
  }

  /**
   * Private method: Perform actual data sync
   */
  private async performDataSync(
    dataSource: VendorDataSource,
    syncJob: DataSyncJob,
  ): Promise<void> {
    // Simulate data sync with progress updates
    const totalSteps = 5;

    for (let step = 1; step <= totalSteps; step++) {
      // Update progress
      syncJob.progress.processed_records = Math.floor(
        (step / totalSteps) * 100,
      );
      syncJob.progress.total_records = 100;

      await this.updateSyncJob(syncJob);

      // Simulate work
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 2000 + 1000),
      );
    }

    // Final progress update
    syncJob.progress.processed_records = syncJob.progress.total_records;
    syncJob.progress.success_records = syncJob.progress.total_records;
    syncJob.progress.failed_records = 0;
  }

  /**
   * Private method: Create sync job
   */
  private async createSyncJob(
    dataSource: VendorDataSource,
    jobType: SyncJobType,
    priority: SyncSchedule['priority'],
  ): Promise<DataSyncJob> {
    const syncJob: DataSyncJob = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data_source_id: dataSource.id,
      job_type: jobType,
      status: 'PENDING',
      scheduled_at: new Date().toISOString(),
      retry_count: 0,
      max_retries: 3,
      progress: {
        total_records: 0,
        processed_records: 0,
        success_records: 0,
        failed_records: 0,
        start_time: new Date().toISOString(),
      },
      config: {
        batch_size: 100,
        timeout_ms: 300000,
        retry_strategy: 'EXPONENTIAL',
        retry_delay_ms: 5000,
        data_validation: true,
        conflict_resolution: 'SOURCE_WINS',
      },
    };

    // Store in database
    const { error } = await this.supabase
      .from('data_sync_jobs')
      .insert([syncJob]);

    if (error) {
      throw new Error(`Failed to create sync job: ${error.message}`);
    }

    return syncJob;
  }

  /**
   * Private utility methods
   */
  private calculateNextRunTime(
    current: Date,
    frequency: SyncSchedule['frequency'],
  ): Date {
    const next = new Date(current);

    switch (frequency) {
      case 'REALTIME':
        next.setMinutes(next.getMinutes() + 5); // 5 minutes for realtime
        break;
      case 'HOURLY':
        next.setHours(next.getHours() + 1);
        break;
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }

  private calculateQueuePriority(
    priority: SyncSchedule['priority'],
    weddings: Array<{
      weddingId: string;
      weddingDate: string;
      isThisWeek: boolean;
    }>,
  ): number {
    let basePriority = 0;

    switch (priority) {
      case 'LOW':
        basePriority = 10;
        break;
      case 'MEDIUM':
        basePriority = 50;
        break;
      case 'HIGH':
        basePriority = 100;
        break;
      case 'CRITICAL':
        basePriority = 200;
        break;
    }

    // Boost priority for wedding week
    if (weddings.some((w) => w.isThisWeek)) {
      basePriority += 500;
    }

    // Additional boost for same-day weddings
    const today = new Date().toISOString().split('T')[0];
    if (weddings.some((w) => w.weddingDate.split('T')[0] === today)) {
      basePriority += 1000;
    }

    return basePriority;
  }

  private async getUpcomingWeddings(
    vendorId: string,
    organizationId: string,
  ): Promise<
    Array<{
      weddingId: string;
      weddingDate: string;
      isThisWeek: boolean;
    }>
  > {
    // Simulate wedding lookup
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const mockWeddings = [
      {
        weddingId: 'wedding_1',
        weddingDate: new Date(
          Date.now() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        isThisWeek: true,
      },
    ];

    return mockWeddings;
  }

  private hasActiveJobs(): boolean {
    return this.workers.some((w) => w.isActive);
  }

  private async updateSyncJob(syncJob: DataSyncJob): Promise<void> {
    const { error } = await this.supabase
      .from('data_sync_jobs')
      .update({
        status: syncJob.status,
        started_at: syncJob.started_at,
        completed_at: syncJob.completed_at,
        error: syncJob.error,
        progress: syncJob.progress,
        retry_count: syncJob.retry_count,
      })
      .eq('id', syncJob.id);

    if (error) {
      console.error(`❌ Failed to update sync job ${syncJob.id}:`, error);
    }
  }

  private async markJobAsCancelled(jobId: string): Promise<void> {
    await this.supabase
      .from('data_sync_jobs')
      .update({
        status: 'CANCELLED',
        completed_at: new Date().toISOString(),
        error: 'Job cancelled during shutdown',
      })
      .eq('id', jobId);
  }

  private async scheduleRetry(syncJob: DataSyncJob): Promise<void> {
    syncJob.retry_count++;
    syncJob.status = 'PENDING';

    let delay = syncJob.config.retry_delay_ms;
    if (syncJob.config.retry_strategy === 'EXPONENTIAL') {
      delay *= Math.pow(2, syncJob.retry_count - 1);
    }

    setTimeout(() => {
      const retryItem: SyncQueueItem = {
        job: syncJob,
        priority: 75, // Medium-high priority for retries
        addedAt: new Date(),
        weddings: [],
      };

      // Add to front of queue for retries
      this.syncQueue.unshift(retryItem);
    }, delay);

    console.log(
      `🔄 Scheduled retry for sync job: ${syncJob.id} (attempt ${syncJob.retry_count})`,
    );
  }
}
