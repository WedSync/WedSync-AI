/**
 * WS-333 Team B: Automated Report Scheduling System
 * Advanced cron-based report scheduling with wedding season awareness
 * Handles enterprise-scale automated report generation with intelligent scheduling
 */

import * as cron from 'node-cron';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { createWeddingReportingEngine } from './ReportingEngineBackend';
import {
  ReportSchedule,
  ScheduledReportJob,
  ReportScheduleConfig,
  PeakSeasonAdjustment,
  ScheduleMetrics,
  CronScheduleAnalysis,
  WeddingSeasonOptimization,
} from '../../types/reporting-backend';

export class WeddingReportScheduler {
  private redis: Redis;
  private supabase: any;
  private reportingEngine: any;
  private scheduleQueue: Queue;
  private scheduleWorker: Worker;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  // Wedding-specific scheduling optimization
  private readonly WEDDING_SEASON_CONFIG = {
    peak_months: [5, 6, 7, 8, 9, 10], // May through October
    peak_multiplier: 2.0,
    weekend_priority: 1.5,
    off_season_reduction: 0.5,
    wedding_day_emergency_priority: 100,
  };

  private readonly DEFAULT_SCHEDULES = {
    // Daily operational reports (higher frequency during peak season)
    daily_operations: '0 6 * * *', // 6 AM daily
    weekend_summary: '0 8 * * 1', // 8 AM every Monday
    supplier_performance: '0 7 * * *', // 7 AM daily
    revenue_snapshot: '0 9 * * *', // 9 AM daily

    // Weekly summary reports
    weekly_analytics: '0 9 * * 1', // 9 AM every Monday
    client_satisfaction: '0 10 * * 2', // 10 AM every Tuesday
    booking_trends: '0 11 * * 3', // 11 AM every Wednesday

    // Monthly executive reports
    monthly_executive: '0 8 1 * *', // 8 AM on 1st of each month
    seasonal_analysis: '0 9 1 */3 *', // 9 AM every quarter
    annual_portfolio: '0 10 1 1 *', // 10 AM on January 1st
  };

  constructor(config: ReportScheduleConfig) {
    this.redis = new Redis({
      host: config.redisHost || 'localhost',
      port: config.redisPort || 6379,
      db: 3, // Dedicated DB for scheduling
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.reportingEngine = createWeddingReportingEngine({
      weddingSeasonScaling: true,
      enablePerformanceMonitoring: true,
      scheduledReporting: true,
    });

    // Initialize Bull MQ for job processing
    this.scheduleQueue = new Queue('wedding-report-schedule', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.scheduleWorker = new Worker(
      'wedding-report-schedule',
      this.processScheduledReport.bind(this),
      {
        connection: this.redis,
        concurrency: config.concurrency || 5,
        limiter: {
          max: config.rateLimitMax || 10,
          duration: config.rateLimitDuration || 60000,
        },
      },
    );
  }

  async initialize(): Promise<void> {
    console.log('📅 Initializing Wedding Report Scheduler...');

    try {
      // Connect to Redis
      await this.redis.connect();
      console.log('✅ Connected to Redis for scheduling');

      // Load existing schedules from database
      await this.loadExistingSchedules();

      // Initialize default wedding industry schedules
      await this.initializeDefaultSchedules();

      // Start the scheduler
      await this.startScheduler();

      // Initialize performance monitoring
      this.startSchedulerMonitoring();

      this.isRunning = true;
      console.log('🚀 Wedding Report Scheduler initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize report scheduler:', error);
      throw new Error(`Scheduler initialization failed: ${error.message}`);
    }
  }

  private async loadExistingSchedules(): Promise<void> {
    const { data: schedules, error } = await this.supabase
      .from('report_schedules')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to load schedules: ${error.message}`);
    }

    console.log(`📋 Loading ${schedules?.length || 0} existing schedules`);

    for (const schedule of schedules || []) {
      await this.scheduleReport(schedule.schedule_config);
    }
  }

  private async initializeDefaultSchedules(): Promise<void> {
    console.log('🎯 Initializing default wedding industry schedules...');

    for (const [name, cronExpression] of Object.entries(
      this.DEFAULT_SCHEDULES,
    )) {
      const defaultSchedule: ReportSchedule = {
        scheduleId: `default_${name}`,
        reportConfiguration: {
          reportType: this.getReportTypeForSchedule(name),
          title: `Automated ${name.replace(/_/g, ' ')} Report`,
          dataFilters: {
            dynamicDateRange: {
              period: this.getPeriodForSchedule(name),
              offset: 0,
            },
          },
          outputFormat: ['pdf', 'excel'],
          recipients: [process.env.ADMIN_EMAIL || 'admin@wedsync.com'],
          userId: 'system',
          organizationId: 'global',
        },
        cronExpression,
        timezone: 'UTC',
        deliveryMethod: {
          type: 'email',
          configuration: {
            emailTemplate: 'automated_report',
          },
        },
        weddingSeasonAware: true,
        peakSeasonAdjustments: this.generateSeasonAdjustments(),
      };

      await this.scheduleReport(defaultSchedule);
    }
  }

  async scheduleReport(schedule: ReportSchedule): Promise<string> {
    const { scheduleId, cronExpression, weddingSeasonAware } = schedule;

    console.log(
      `📅 Scheduling report: ${scheduleId} with cron: ${cronExpression}`,
    );

    // Validate cron expression
    if (!this.isValidCronExpression(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Analyze cron schedule for wedding optimization
    const analysis = this.analyzeCronSchedule(
      cronExpression,
      weddingSeasonAware,
    );

    // Apply wedding season adjustments if enabled
    let optimizedCron = cronExpression;
    if (weddingSeasonAware && schedule.peakSeasonAdjustments) {
      optimizedCron = this.applySeasonalOptimizations(cronExpression, analysis);
    }

    // Create the cron job
    const cronTask = cron.schedule(
      optimizedCron,
      async () => {
        await this.triggerScheduledReport(schedule);
      },
      {
        scheduled: false,
        timezone: schedule.timezone || 'UTC',
      },
    );

    // Store the cron task
    this.cronJobs.set(scheduleId, cronTask);

    // Store schedule metadata in Redis for quick access
    await this.redis.hset(`schedule:${scheduleId}`, {
      original_cron: cronExpression,
      optimized_cron: optimizedCron,
      next_execution: this.calculateNextExecution(
        optimizedCron,
        schedule.timezone,
      ),
      wedding_aware: weddingSeasonAware,
      created_at: new Date().toISOString(),
      schedule_config: JSON.stringify(schedule),
    });

    console.log(`✅ Report scheduled: ${scheduleId}`);
    return scheduleId;
  }

  private async triggerScheduledReport(
    schedule: ReportSchedule,
  ): Promise<void> {
    const { scheduleId, reportConfiguration } = schedule;

    try {
      console.log(`🎯 Triggering scheduled report: ${scheduleId}`);

      // Apply wedding context optimizations
      const optimizedConfig =
        await this.optimizeReportForCurrentContext(reportConfiguration);

      // Add to processing queue with appropriate priority
      const priority = this.calculateJobPriority(schedule);

      const job = await this.scheduleQueue.add(
        'generate_scheduled_report',
        {
          scheduleId,
          reportConfiguration: optimizedConfig,
          scheduledAt: new Date(),
          priority,
          weddingSeasonContext: await this.getCurrentWeddingSeasonContext(),
        },
        {
          priority,
          delay: this.calculateOptimalDelay(),
          jobId: `${scheduleId}_${Date.now()}`,
        },
      );

      // Update execution metrics
      await this.updateScheduleMetrics(scheduleId, 'triggered');

      console.log(`📊 Scheduled report queued: ${job.id}`);
    } catch (error) {
      console.error(
        `❌ Failed to trigger scheduled report ${scheduleId}:`,
        error,
      );
      await this.handleScheduleError(scheduleId, error);
    }
  }

  private async processScheduledReport(job: Job): Promise<any> {
    const { scheduleId, reportConfiguration, weddingSeasonContext } = job.data;

    try {
      console.log(`⚡ Processing scheduled report: ${scheduleId}`);

      // Generate the report using the reporting engine
      const reportResult = await this.reportingEngine.generateReport({
        ...reportConfiguration,
        reportId: `scheduled_${scheduleId}_${Date.now()}`,
        priority: job.opts.priority > 80 ? 'high' : 'normal',
        weddingContext: weddingSeasonContext,
        scheduledGeneration: true,
      });

      // Handle report delivery based on schedule configuration
      await this.deliverScheduledReport(reportResult, job.data);

      // Update success metrics
      await this.updateScheduleMetrics(scheduleId, 'completed');

      return {
        success: true,
        reportId: reportResult.reportId,
        generatedAt: reportResult.generatedAt,
        processingTime: reportResult.processingTime,
      };
    } catch (error) {
      console.error(`❌ Scheduled report processing failed:`, error);
      await this.updateScheduleMetrics(scheduleId, 'failed');
      throw error;
    }
  }

  private async deliverScheduledReport(
    reportResult: any,
    jobData: any,
  ): Promise<void> {
    const { reportConfiguration, scheduleId } = jobData;

    // Store report metadata in database
    await this.supabase.from('report_generation_jobs').insert({
      report_id: reportResult.reportId,
      schedule_id: scheduleId,
      organization_id: reportConfiguration.organizationId || 'global',
      user_id: reportConfiguration.userId || 'system',
      status: 'completed',
      output_urls: reportResult.outputUrls,
      metadata: {
        scheduled: true,
        wedding_season_context: jobData.weddingSeasonContext,
        processing_metrics: reportResult.metadata,
      },
      created_at: new Date(),
      completed_at: new Date(),
    });

    // Send via configured delivery method
    if (
      reportConfiguration.recipients &&
      reportConfiguration.recipients.length > 0
    ) {
      await this.sendReportNotification(reportResult, reportConfiguration);
    }

    // Archive report if configured
    if (reportConfiguration.autoArchive) {
      await this.archiveReport(reportResult);
    }
  }

  private async sendReportNotification(
    reportResult: any,
    config: any,
  ): Promise<void> {
    // Implementation would integrate with email service (Resend)
    // For now, log the notification
    console.log(`📧 Report notification sent for: ${reportResult.reportId}`);
    console.log(`Recipients: ${config.recipients.join(', ')}`);
    console.log(`Report URLs: ${JSON.stringify(reportResult.outputUrls)}`);
  }

  private applySeasonalOptimizations(
    cronExpression: string,
    analysis: CronScheduleAnalysis,
  ): string {
    if (!this.isCurrentlyPeakSeason()) {
      return cronExpression; // No changes during off-season
    }

    // During peak season, increase frequency for critical reports
    if (analysis.isDailyReport && analysis.isBusinessCritical) {
      // Convert daily reports to twice daily during peak season
      const parts = cronExpression.split(' ');
      if (parts[1] !== '*') {
        // If specific hour is set
        const hour = parseInt(parts[1]);
        const secondHour = (hour + 12) % 24;
        parts[1] = `${hour},${secondHour}`;
        return parts.join(' ');
      }
    }

    return cronExpression;
  }

  private calculateJobPriority(schedule: ReportSchedule): number {
    let basePriority = 50; // Default priority

    // Wedding day reports get highest priority
    if (schedule.reportConfiguration.reportType === 'wedding_day_emergency') {
      return 100;
    }

    // Peak season boost
    if (this.isCurrentlyPeakSeason()) {
      basePriority += 20;
    }

    // Weekend boost (Saturday reports are critical)
    if (this.isWeekend()) {
      basePriority += 15;
    }

    // Business critical reports
    const criticalTypes = ['financial', 'operational', 'emergency_alerts'];
    if (criticalTypes.includes(schedule.reportConfiguration.reportType)) {
      basePriority += 25;
    }

    return Math.min(basePriority, 100);
  }

  private async optimizeReportForCurrentContext(config: any): Promise<any> {
    const context = await this.getCurrentWeddingSeasonContext();

    return {
      ...config,
      weddingContext: context,
      optimizationHints: {
        peak_season: context.isPeakSeason,
        weekend_priority: context.isWeekend,
        current_season: context.currentSeason,
        estimated_load: context.estimatedSystemLoad,
      },
    };
  }

  private async getCurrentWeddingSeasonContext(): Promise<any> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const dayOfWeek = now.getDay();

    return {
      isPeakSeason:
        this.WEDDING_SEASON_CONFIG.peak_months.includes(currentMonth),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      currentSeason: this.getCurrentSeason(),
      currentMonth,
      dayOfWeek,
      estimatedSystemLoad: await this.getEstimatedSystemLoad(),
      activeWeddingsToday: await this.getActiveWeddingsCount(),
      upcomingWeddingsWeek: await this.getUpcomingWeddingsCount(7),
    };
  }

  private async getEstimatedSystemLoad(): Promise<number> {
    // Get current system metrics from Redis
    const activeJobs = await this.scheduleQueue.getWaiting();
    const processingJobs = await this.scheduleQueue.getActive();

    const totalJobs = activeJobs.length + processingJobs.length;

    // Convert to 0-1 scale (0 = no load, 1 = maximum load)
    return Math.min(totalJobs / 100, 1);
  }

  private async getActiveWeddingsCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const { count } = await this.supabase
      .from('weddings')
      .select('*', { count: 'exact', head: true })
      .eq('wedding_date', today)
      .eq('status', 'confirmed');

    return count || 0;
  }

  private async getUpcomingWeddingsCount(days: number): Promise<number> {
    const startDate = new Date();
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const { count } = await this.supabase
      .from('weddings')
      .select('*', { count: 'exact', head: true })
      .gte('wedding_date', startDate.toISOString().split('T')[0])
      .lte('wedding_date', endDate.toISOString().split('T')[0])
      .eq('status', 'confirmed');

    return count || 0;
  }

  private analyzeCronSchedule(
    cronExpression: string,
    weddingAware: boolean,
  ): CronScheduleAnalysis {
    const parts = cronExpression.split(' ');

    return {
      isDailyReport: parts[2] === '*' && parts[3] === '*' && parts[4] === '*',
      isWeeklyReport: parts[4] !== '*' && parts[3] === '*',
      isMonthlyReport: parts[2] !== '*' && parts[3] !== '*',
      isBusinessCritical: this.determineIfBusinessCritical(cronExpression),
      executionFrequency: this.calculateExecutionFrequency(cronExpression),
      peakSeasonImpact: weddingAware,
      estimatedProcessingLoad: this.estimateProcessingLoad(cronExpression),
    };
  }

  private determineIfBusinessCritical(cronExpression: string): boolean {
    // Business critical reports typically run during business hours
    const parts = cronExpression.split(' ');
    const hour = parts[1];

    if (hour === '*') return false;

    const hourNum = parseInt(hour);
    return hourNum >= 6 && hourNum <= 18; // 6 AM to 6 PM
  }

  private calculateExecutionFrequency(cronExpression: string): number {
    const parts = cronExpression.split(' ');

    // Calculate approximate executions per week
    let executions = 1;

    if (parts[4] === '*') executions *= 7; // Daily
    if (parts[3] === '*') executions *= 4; // Every week of month
    if (parts[1] !== '*' && parts[1].includes(',')) {
      executions *= parts[1].split(',').length; // Multiple times per day
    }

    return executions;
  }

  private estimateProcessingLoad(
    cronExpression: string,
  ): 'low' | 'medium' | 'high' {
    const frequency = this.calculateExecutionFrequency(cronExpression);

    if (frequency >= 14) return 'high'; // More than twice daily
    if (frequency >= 7) return 'medium'; // Daily
    return 'low'; // Less than daily
  }

  private calculateOptimalDelay(): number {
    const currentLoad = this.getEstimatedSystemLoad();

    // Add delay during high load periods
    if (currentLoad > 0.8) return 300000; // 5 minute delay
    if (currentLoad > 0.6) return 120000; // 2 minute delay
    if (currentLoad > 0.4) return 30000; // 30 second delay

    return 0; // No delay
  }

  private startSchedulerMonitoring(): void {
    setInterval(async () => {
      await this.updateSchedulerMetrics();
      await this.checkScheduleHealth();
      await this.cleanupCompletedJobs();
    }, 300000); // Every 5 minutes
  }

  private async updateSchedulerMetrics(): Promise<void> {
    const metrics: ScheduleMetrics = {
      totalSchedules: this.cronJobs.size,
      activeSchedules: Array.from(this.cronJobs.values()).filter(
        (job) => job.running,
      ).length,
      queuedJobs: (await this.scheduleQueue.getWaiting()).length,
      processingJobs: (await this.scheduleQueue.getActive()).length,
      completedToday: await this.getCompletedJobsCount(1),
      failedToday: await this.getFailedJobsCount(1),
      avgProcessingTime: await this.getAverageProcessingTime(),
      lastExecutionTime: new Date(),
    };

    await this.redis.hset('scheduler:metrics', {
      ...metrics,
      updated_at: new Date().toISOString(),
    });
  }

  private async checkScheduleHealth(): Promise<void> {
    const failedJobs = await this.scheduleQueue.getFailed();

    if (failedJobs.length > 10) {
      console.warn(`⚠️ High number of failed jobs: ${failedJobs.length}`);
    }

    // Check for stuck jobs
    const activeJobs = await this.scheduleQueue.getActive();
    const stuckJobs = activeJobs.filter(
      (job) => Date.now() - job.processedOn > 1800000, // 30 minutes
    );

    if (stuckJobs.length > 0) {
      console.warn(`⚠️ Found ${stuckJobs.length} stuck jobs`);
      // Could implement stuck job recovery here
    }
  }

  private async cleanupCompletedJobs(): Promise<void> {
    // Clean up old completed jobs to prevent queue bloat
    await this.scheduleQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // 24 hours, keep 100
    await this.scheduleQueue.clean(7 * 24 * 60 * 60 * 1000, 10, 'failed'); // 7 days, keep 10
  }

  // Helper methods
  private isValidCronExpression(expression: string): boolean {
    return cron.validate(expression);
  }

  private calculateNextExecution(
    cronExpression: string,
    timezone: string = 'UTC',
  ): Date {
    // For production, use proper cron parser
    const now = new Date();
    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Placeholder: next day
  }

  private isCurrentlyPeakSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    return this.WEDDING_SEASON_CONFIG.peak_months.includes(currentMonth);
  }

  private isWeekend(): boolean {
    const dayOfWeek = new Date().getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 9) return 'summer';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 10 && month <= 11) return 'fall';
    return 'winter';
  }

  private getReportTypeForSchedule(scheduleName: string): string {
    const mapping = {
      daily_operations: 'operational',
      weekend_summary: 'operational',
      supplier_performance: 'supplier_performance',
      revenue_snapshot: 'financial',
      weekly_analytics: 'booking_trends',
      client_satisfaction: 'client_satisfaction',
      booking_trends: 'booking_trends',
      monthly_executive: 'financial',
      seasonal_analysis: 'seasonal_analysis',
      annual_portfolio: 'wedding_portfolio',
    };

    return mapping[scheduleName] || 'operational';
  }

  private getPeriodForSchedule(
    scheduleName: string,
  ): 'last_week' | 'last_month' | 'last_quarter' | 'last_year' {
    if (scheduleName.includes('daily')) return 'last_week';
    if (scheduleName.includes('weekly')) return 'last_week';
    if (scheduleName.includes('monthly')) return 'last_month';
    if (scheduleName.includes('seasonal')) return 'last_quarter';
    if (scheduleName.includes('annual')) return 'last_year';
    return 'last_week';
  }

  private generateSeasonAdjustments(): PeakSeasonAdjustment[] {
    return [
      {
        season: 'summer',
        frequency_multiplier: 2.0,
        priority_boost: 2,
        resource_allocation: 1.5,
      },
      {
        season: 'spring',
        frequency_multiplier: 1.5,
        priority_boost: 1,
        resource_allocation: 1.2,
      },
      {
        season: 'fall',
        frequency_multiplier: 1.5,
        priority_boost: 1,
        resource_allocation: 1.2,
      },
      {
        season: 'winter',
        frequency_multiplier: 0.7,
        priority_boost: 0,
        resource_allocation: 0.8,
      },
    ];
  }

  private async getCompletedJobsCount(days: number): Promise<number> {
    const completed = await this.scheduleQueue.getCompleted();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return completed.filter((job) => job.finishedOn && job.finishedOn > cutoff)
      .length;
  }

  private async getFailedJobsCount(days: number): Promise<number> {
    const failed = await this.scheduleQueue.getFailed();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return failed.filter((job) => job.failedReason && job.processedOn > cutoff)
      .length;
  }

  private async getAverageProcessingTime(): Promise<number> {
    const completed = await this.scheduleQueue.getCompleted(0, 100);

    if (completed.length === 0) return 0;

    const totalTime = completed.reduce((sum, job) => {
      return sum + (job.finishedOn - job.processedOn);
    }, 0);

    return totalTime / completed.length;
  }

  private async updateScheduleMetrics(
    scheduleId: string,
    event: 'triggered' | 'completed' | 'failed',
  ): Promise<void> {
    const key = `schedule:${scheduleId}:metrics`;

    await this.redis.hincrby(key, `${event}_count`, 1);
    await this.redis.hset(key, `last_${event}`, new Date().toISOString());

    if (event === 'completed' || event === 'failed') {
      const triggered = await this.redis.hget(key, 'last_triggered');
      if (triggered) {
        const processingTime = Date.now() - new Date(triggered).getTime();
        await this.redis.hset(key, 'last_processing_time', processingTime);
      }
    }
  }

  private async handleScheduleError(
    scheduleId: string,
    error: any,
  ): Promise<void> {
    console.error(`❌ Schedule error for ${scheduleId}:`, error);

    await this.redis.lpush(
      `schedule:${scheduleId}:errors`,
      JSON.stringify({
        error: error.message,
        timestamp: new Date(),
        stack: error.stack,
      }),
    );

    // Keep only last 10 errors
    await this.redis.ltrim(`schedule:${scheduleId}:errors`, 0, 9);
  }

  private async archiveReport(reportResult: any): Promise<void> {
    // Implementation would move report files to long-term storage
    console.log(`📦 Archiving report: ${reportResult.reportId}`);
  }

  private async startScheduler(): Promise<void> {
    // Start all registered cron jobs
    for (const [scheduleId, cronTask] of this.cronJobs) {
      cronTask.start();
      console.log(`▶️ Started schedule: ${scheduleId}`);
    }
  }

  async getScheduleStatus(scheduleId: string): Promise<any> {
    const schedule = await this.redis.hgetall(`schedule:${scheduleId}`);
    const metrics = await this.redis.hgetall(`schedule:${scheduleId}:metrics`);

    return {
      scheduleId,
      isActive:
        this.cronJobs.has(scheduleId) && this.cronJobs.get(scheduleId)?.running,
      nextExecution: schedule.next_execution,
      lastTriggered: metrics.last_triggered,
      lastCompleted: metrics.last_completed,
      triggeredCount: parseInt(metrics.triggered_count || '0'),
      completedCount: parseInt(metrics.completed_count || '0'),
      failedCount: parseInt(metrics.failed_count || '0'),
      lastProcessingTime: parseInt(metrics.last_processing_time || '0'),
      config: JSON.parse(schedule.schedule_config || '{}'),
    };
  }

  async cancelSchedule(scheduleId: string): Promise<boolean> {
    const cronTask = this.cronJobs.get(scheduleId);

    if (!cronTask) {
      return false;
    }

    cronTask.stop();
    cronTask.destroy();
    this.cronJobs.delete(scheduleId);

    // Update database
    await this.supabase
      .from('report_schedules')
      .update({ is_active: false, updated_at: new Date() })
      .eq('schedule_id', scheduleId);

    // Remove from Redis
    await this.redis.del(`schedule:${scheduleId}`);

    console.log(`🛑 Cancelled schedule: ${scheduleId}`);
    return true;
  }

  async getSchedulerStats(): Promise<ScheduleMetrics> {
    const metrics = await this.redis.hgetall('scheduler:metrics');

    return {
      totalSchedules: parseInt(metrics.totalSchedules || '0'),
      activeSchedules: parseInt(metrics.activeSchedules || '0'),
      queuedJobs: parseInt(metrics.queuedJobs || '0'),
      processingJobs: parseInt(metrics.processingJobs || '0'),
      completedToday: parseInt(metrics.completedToday || '0'),
      failedToday: parseInt(metrics.failedToday || '0'),
      avgProcessingTime: parseInt(metrics.avgProcessingTime || '0'),
      lastExecutionTime: new Date(metrics.updated_at || Date.now()),
    };
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Wedding Report Scheduler...');

    this.isRunning = false;

    // Stop all cron jobs
    for (const [scheduleId, cronTask] of this.cronJobs) {
      cronTask.stop();
      cronTask.destroy();
      console.log(`⏹️ Stopped schedule: ${scheduleId}`);
    }

    // Close worker and queue
    await this.scheduleWorker.close();
    await this.scheduleQueue.close();

    // Disconnect Redis
    await this.redis.disconnect();

    console.log('✅ Report scheduler shutdown complete');
  }
}

// Factory function for creating the scheduler
export function createWeddingReportScheduler(
  config: ReportScheduleConfig,
): WeddingReportScheduler {
  return new WeddingReportScheduler(config);
}

// Export for use in API routes and background services
export { WeddingReportScheduler };
