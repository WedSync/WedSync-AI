/**
 * WS-241 AI Caching Strategy System - Seasonal Scaling Scheduler
 * Background job scheduler for automated seasonal scaling
 * Team B - Backend Infrastructure & API Development
 */

import { SeasonalScalingAutomator } from './SeasonalScalingAutomator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

export interface SchedulerConfig {
  enabled: boolean;
  checkIntervalMinutes: number;
  maxConcurrentJobs: number;
  retryAttempts: number;
  retryDelayMinutes: number;
  maintenanceWindowStart: string; // HH:MM format
  maintenanceWindowEnd: string;
  skipDays: string[]; // ['saturday', 'sunday'] - days to skip scaling
  alertWebhooks: string[];
  emergencyStopEnabled: boolean;
}

export interface ScheduledJob {
  id: string;
  type:
    | 'scaling_check'
    | 'preload_cache'
    | 'cleanup_expired'
    | 'performance_analysis';
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  retryCount: number;
}

export class SeasonalScalingScheduler {
  private redis: Redis;
  private supabase: SupabaseClient;
  private scalingAutomator: SeasonalScalingAutomator;
  private isRunning = false;
  private currentJobs = new Map<string, ScheduledJob>();
  private schedulerKey = 'ai_cache:scheduler';

  private readonly defaultConfig: SchedulerConfig = {
    enabled: true,
    checkIntervalMinutes: 30, // Check every 30 minutes
    maxConcurrentJobs: 3,
    retryAttempts: 3,
    retryDelayMinutes: 15,
    maintenanceWindowStart: '02:00', // 2 AM
    maintenanceWindowEnd: '04:00', // 4 AM
    skipDays: ['saturday'], // Never scale on Saturdays (wedding days)
    alertWebhooks: [],
    emergencyStopEnabled: true,
  };

  constructor(
    supabaseUrl: string,
    supabaseServiceKey: string,
    redisUrl: string,
    config?: Partial<SchedulerConfig>,
  ) {
    this.redis = new Redis({
      url: redisUrl,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.scalingAutomator = new SeasonalScalingAutomator(
      supabaseUrl,
      supabaseServiceKey,
      redisUrl,
    );
  }

  /**
   * Start the scheduler with monitoring and job execution
   */
  public async start(config?: Partial<SchedulerConfig>): Promise<void> {
    if (this.isRunning) {
      console.warn('Seasonal scaling scheduler is already running');
      return;
    }

    const finalConfig = { ...this.defaultConfig, ...config };

    // Store config in Redis for persistence
    await this.redis.set(
      `${this.schedulerKey}:config`,
      JSON.stringify(finalConfig),
      { ex: 24 * 60 * 60 }, // 24 hours TTL
    );

    this.isRunning = true;

    console.log(
      `Starting seasonal scaling scheduler (check every ${finalConfig.checkIntervalMinutes} minutes)`,
    );

    // Initial health check
    await this.performHealthCheck();

    // Start the main scheduler loop
    this.startSchedulerLoop(finalConfig);

    // Schedule daily maintenance tasks
    this.scheduleDailyMaintenance(finalConfig);
  }

  /**
   * Stop the scheduler gracefully
   */
  public async stop(): Promise<void> {
    console.log('Stopping seasonal scaling scheduler...');
    this.isRunning = false;

    // Wait for current jobs to complete (with timeout)
    const timeout = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();

    while (this.currentJobs.size > 0 && Date.now() - startTime < timeout) {
      console.log(`Waiting for ${this.currentJobs.size} jobs to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    // Mark scheduler as stopped
    await this.redis.set(
      `${this.schedulerKey}:status`,
      JSON.stringify({
        status: 'stopped',
        stoppedAt: new Date().toISOString(),
        runningJobs: Array.from(this.currentJobs.keys()),
      }),
      { ex: 60 * 60 }, // 1 hour TTL
    );

    console.log('Seasonal scaling scheduler stopped');
  }

  /**
   * Main scheduler loop
   */
  private async startSchedulerLoop(config: SchedulerConfig): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if scheduler is enabled
        if (!config.enabled) {
          await this.sleep(config.checkIntervalMinutes * 60 * 1000);
          continue;
        }

        // Check for emergency stop
        if (
          config.emergencyStopEnabled &&
          (await this.isEmergencyStopActive())
        ) {
          console.warn('Emergency stop is active, skipping scaling checks');
          await this.sleep(config.checkIntervalMinutes * 60 * 1000);
          continue;
        }

        // Check if we should skip today
        if (this.shouldSkipToday(config.skipDays)) {
          console.log(
            'Skipping scaling checks for today due to skip day configuration',
          );
          await this.sleep(60 * 60 * 1000); // Sleep for 1 hour
          continue;
        }

        // Execute scheduled jobs
        await this.processScheduledJobs(config);

        // Schedule new jobs if needed
        await this.scheduleNewJobs(config);

        // Update scheduler health status
        await this.updateSchedulerStatus();
      } catch (error) {
        console.error('Scheduler loop error:', error);
        await this.handleSchedulerError(error);
      }

      // Wait before next check
      await this.sleep(config.checkIntervalMinutes * 60 * 1000);
    }
  }

  /**
   * Process all pending scheduled jobs
   */
  private async processScheduledJobs(config: SchedulerConfig): Promise<void> {
    // Get pending jobs from Redis
    const pendingJobs = await this.getPendingJobs();

    // Filter jobs that are ready to run
    const readyJobs = pendingJobs.filter(
      (job) => job.scheduledFor <= new Date() && job.status === 'pending',
    );

    // Check concurrent job limit
    const availableSlots = config.maxConcurrentJobs - this.currentJobs.size;
    const jobsToRun = readyJobs.slice(0, availableSlots);

    console.log(
      `Processing ${jobsToRun.length} scheduled jobs (${readyJobs.length} ready, ${availableSlots} slots available)`,
    );

    // Execute jobs concurrently
    const jobPromises = jobsToRun.map((job) => this.executeJob(job, config));
    await Promise.allSettled(jobPromises);
  }

  /**
   * Execute a single scheduled job
   */
  private async executeJob(
    job: ScheduledJob,
    config: SchedulerConfig,
  ): Promise<void> {
    const jobId = job.id;

    try {
      // Mark job as running
      job.status = 'running';
      job.startedAt = new Date();
      this.currentJobs.set(jobId, job);

      await this.updateJobStatus(job);

      console.log(`Executing job ${jobId} of type ${job.type}`);

      let result: any;

      switch (job.type) {
        case 'scaling_check':
          result = await this.executeScalingCheck();
          break;

        case 'preload_cache':
          result = await this.executePreloadCache();
          break;

        case 'cleanup_expired':
          result = await this.executeCleanupExpired();
          break;

        case 'performance_analysis':
          result = await this.executePerformanceAnalysis();
          break;

        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark job as completed
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;

      await this.updateJobStatus(job);

      console.log(`Job ${jobId} completed successfully`);
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);

      job.error = error instanceof Error ? error.message : 'Unknown error';

      // Retry logic
      if (job.retryCount < config.retryAttempts) {
        job.retryCount++;
        job.status = 'pending';
        job.scheduledFor = new Date(
          Date.now() + config.retryDelayMinutes * 60 * 1000,
        );

        console.log(
          `Scheduling retry ${job.retryCount}/${config.retryAttempts} for job ${jobId} in ${config.retryDelayMinutes} minutes`,
        );
      } else {
        job.status = 'failed';
        job.completedAt = new Date();

        // Send alert for failed job
        await this.sendJobFailureAlert(job, config.alertWebhooks);
      }

      await this.updateJobStatus(job);
    } finally {
      this.currentJobs.delete(jobId);
    }
  }

  /**
   * Execute scaling check job
   */
  private async executeScalingCheck(): Promise<any> {
    const currentSeason = this.scalingAutomator.getCurrentSeason();
    const predictions =
      await this.scalingAutomator.predictSeasonalTransition(7); // 7 days lookahead

    // Check if immediate scaling is needed
    const scalingResult = await this.scalingAutomator.executeSeasonalScaling();

    return {
      season: currentSeason.name,
      predictions: predictions.upcomingTransitions.length,
      scalingExecuted: scalingResult.scalingExecuted,
      actions: scalingResult.actions.length,
      errors: scalingResult.errors,
    };
  }

  /**
   * Execute cache preloading job
   */
  private async executePreloadCache(): Promise<any> {
    const currentSeason = this.scalingAutomator.getCurrentSeason();
    const preloadTypes = this.getPreloadTypesForSeason(currentSeason.name);

    console.log(
      `Preloading cache for ${currentSeason.name} season: ${preloadTypes.join(', ')}`,
    );

    // This would typically involve calling AI services to populate cache
    // For now, we'll simulate the preloading process
    let entriesPreloaded = 0;

    for (const cacheType of preloadTypes) {
      const entries = currentSeason.name === 'peak' ? 500 : 200;
      entriesPreloaded += entries;

      // Store preload status
      await this.redis.set(
        `ai_cache:preload:${cacheType}`,
        JSON.stringify({
          preloadedAt: new Date().toISOString(),
          entries: entries,
          season: currentSeason.name,
        }),
        { ex: 60 * 60 }, // 1 hour TTL
      );
    }

    return {
      season: currentSeason.name,
      cacheTypesPreloaded: preloadTypes.length,
      totalEntriesPreloaded: entriesPreloaded,
      strategy: currentSeason.preloadStrategy,
    };
  }

  /**
   * Execute cleanup of expired cache entries
   */
  private async executeCleanupExpired(): Promise<any> {
    // This would call the database function
    const { data, error } = await this.supabase.rpc(
      'cleanup_expired_cache_entries',
    );

    if (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }

    const deletedEntries = data || 0;

    console.log(`Cleaned up ${deletedEntries} expired cache entries`);

    return {
      deletedEntries,
      cleanupTime: new Date().toISOString(),
    };
  }

  /**
   * Execute performance analysis job
   */
  private async executePerformanceAnalysis(): Promise<any> {
    // Get cache statistics for the last 24 hours
    const { data: stats } = await this.supabase.rpc('get_cache_statistics', {
      p_time_range_hours: 24,
    });

    if (!stats || stats.length === 0) {
      return { message: 'No statistics available for analysis' };
    }

    // Analyze performance trends
    const analysis = stats.map((stat) => ({
      cache_type: stat.cache_type,
      hit_rate: stat.hit_rate,
      performance_grade: this.gradePerformance(
        stat.hit_rate,
        stat.avg_response_time_ms,
      ),
      recommendations: this.generateRecommendations(stat),
    }));

    // Store analysis results
    await this.supabase.from('ai_cache_statistics').insert({
      period_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      period_end: new Date().toISOString(),
      aggregation_level: 'daily',
      total_requests: stats.reduce((sum, s) => sum + s.total_queries, 0),
      cache_hits: stats.reduce((sum, s) => sum + s.cache_hits, 0),
      cache_misses: stats.reduce((sum, s) => sum + s.cache_misses, 0),
      avg_response_time_ms: Math.round(
        stats.reduce((sum, s, i, arr) => sum + s.avg_response_time_ms, 0) /
          stats.length,
      ),
      season: this.scalingAutomator.getCurrentSeason().name,
      data_quality_score: 100,
    });

    return {
      analysisTime: new Date().toISOString(),
      cacheTypesAnalyzed: stats.length,
      overallHitRate:
        stats.reduce((sum, s) => sum + s.hit_rate, 0) / stats.length,
      recommendations: analysis.filter((a) => a.recommendations.length > 0)
        .length,
    };
  }

  /**
   * Schedule new jobs based on current conditions
   */
  private async scheduleNewJobs(config: SchedulerConfig): Promise<void> {
    const now = new Date();

    // Schedule regular scaling check (every 2 hours)
    const lastScalingCheck = await this.getLastJobTime('scaling_check');
    if (
      !lastScalingCheck ||
      now.getTime() - lastScalingCheck.getTime() > 2 * 60 * 60 * 1000
    ) {
      await this.scheduleJob({
        id: `scaling_check_${now.getTime()}`,
        type: 'scaling_check',
        status: 'pending',
        scheduledFor: now,
        retryCount: 0,
      });
    }

    // Schedule cache cleanup (daily during maintenance window)
    if (this.isMaintenanceWindow(now, config)) {
      const lastCleanup = await this.getLastJobTime('cleanup_expired');
      if (
        !lastCleanup ||
        now.getTime() - lastCleanup.getTime() > 20 * 60 * 60 * 1000
      ) {
        // 20+ hours
        await this.scheduleJob({
          id: `cleanup_${now.getTime()}`,
          type: 'cleanup_expired',
          status: 'pending',
          scheduledFor: now,
          retryCount: 0,
        });
      }
    }

    // Schedule performance analysis (twice daily)
    const lastAnalysis = await this.getLastJobTime('performance_analysis');
    if (
      !lastAnalysis ||
      now.getTime() - lastAnalysis.getTime() > 12 * 60 * 60 * 1000
    ) {
      await this.scheduleJob({
        id: `analysis_${now.getTime()}`,
        type: 'performance_analysis',
        status: 'pending',
        scheduledFor: new Date(now.getTime() + 10 * 60 * 1000), // 10 minutes from now
        retryCount: 0,
      });
    }

    // Schedule cache preloading based on seasonal transitions
    const predictions =
      await this.scalingAutomator.predictSeasonalTransition(3); // 3 days lookahead
    if (predictions.upcomingTransitions.length > 0) {
      const transition = predictions.upcomingTransitions[0];
      const preloadTime = new Date(
        transition.date.getTime() - 4 * 60 * 60 * 1000,
      ); // 4 hours before

      if (preloadTime > now) {
        await this.scheduleJob({
          id: `preload_${transition.toSeason.name}_${transition.date.getTime()}`,
          type: 'preload_cache',
          status: 'pending',
          scheduledFor: preloadTime,
          retryCount: 0,
        });
      }
    }
  }

  // Helper methods
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldSkipToday(skipDays: string[]): boolean {
    const today = new Date()
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();
    return skipDays.includes(today);
  }

  private async isEmergencyStopActive(): Promise<boolean> {
    const emergencyStop = await this.redis.get(
      `${this.schedulerKey}:emergency_stop`,
    );
    return emergencyStop === 'active';
  }

  private isMaintenanceWindow(now: Date, config: SchedulerConfig): boolean {
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    return (
      currentTime >= config.maintenanceWindowStart &&
      currentTime <= config.maintenanceWindowEnd
    );
  }

  private async getPendingJobs(): Promise<ScheduledJob[]> {
    const jobsData = await this.redis.get(`${this.schedulerKey}:jobs`);
    return jobsData ? JSON.parse(jobsData) : [];
  }

  private async scheduleJob(job: ScheduledJob): Promise<void> {
    const jobs = await this.getPendingJobs();
    jobs.push(job);

    await this.redis.set(
      `${this.schedulerKey}:jobs`,
      JSON.stringify(jobs),
      { ex: 7 * 24 * 60 * 60 }, // 7 days TTL
    );

    console.log(
      `Scheduled job ${job.id} of type ${job.type} for ${job.scheduledFor.toISOString()}`,
    );
  }

  private async updateJobStatus(job: ScheduledJob): Promise<void> {
    await this.redis.set(
      `${this.schedulerKey}:job:${job.id}`,
      JSON.stringify(job),
      { ex: 24 * 60 * 60 }, // 24 hours TTL
    );
  }

  private async getLastJobTime(jobType: string): Promise<Date | null> {
    const jobs = await this.getPendingJobs();
    const completedJobs = jobs.filter(
      (j) => j.type === jobType && j.status === 'completed',
    );

    if (completedJobs.length === 0) return null;

    const latestJob = completedJobs.reduce((latest, job) =>
      !job.completedAt || !latest.completedAt
        ? job
        : job.completedAt > latest.completedAt
          ? job
          : latest,
    );

    return latestJob.completedAt ? new Date(latestJob.completedAt) : null;
  }

  private getPreloadTypesForSeason(season: string): string[] {
    switch (season) {
      case 'peak':
        return [
          'venue_recommendations',
          'vendor_matching',
          'budget_optimization',
          'timeline_generation',
        ];
      case 'high':
        return [
          'venue_recommendations',
          'vendor_matching',
          'budget_optimization',
        ];
      case 'moderate':
        return ['venue_recommendations', 'vendor_matching'];
      default:
        return ['vendor_matching'];
    }
  }

  private gradePerformance(hitRate: number, avgResponseTime: number): string {
    if (hitRate >= 0.9 && avgResponseTime <= 50) return 'A+';
    if (hitRate >= 0.85 && avgResponseTime <= 100) return 'A';
    if (hitRate >= 0.75 && avgResponseTime <= 150) return 'B';
    if (hitRate >= 0.6 && avgResponseTime <= 200) return 'C';
    return 'D';
  }

  private generateRecommendations(stat: any): string[] {
    const recommendations = [];

    if (stat.hit_rate < 0.8) {
      recommendations.push('Increase cache TTL or improve cache key strategy');
    }

    if (stat.avg_response_time_ms > 150) {
      recommendations.push(
        'Optimize cache retrieval or increase memory allocation',
      );
    }

    if (stat.total_size_mb > 1000) {
      recommendations.push(
        'Consider implementing more aggressive eviction policies',
      );
    }

    return recommendations;
  }

  private async sendJobFailureAlert(
    job: ScheduledJob,
    webhooks: string[],
  ): Promise<void> {
    const alert = {
      type: 'job_failure',
      job: {
        id: job.id,
        type: job.type,
        error: job.error,
        retryCount: job.retryCount,
      },
      timestamp: new Date().toISOString(),
    };

    // This would send to configured webhook URLs
    console.error('Job failure alert:', alert);
  }

  private async performHealthCheck(): Promise<void> {
    const health = await this.scalingAutomator.healthCheck();

    await this.redis.set(
      `${this.schedulerKey}:health`,
      JSON.stringify({
        status: health.status,
        checks: health.checks,
        checkedAt: new Date().toISOString(),
      }),
      { ex: 5 * 60 }, // 5 minutes TTL
    );
  }

  private async updateSchedulerStatus(): Promise<void> {
    await this.redis.set(
      `${this.schedulerKey}:status`,
      JSON.stringify({
        status: 'running',
        isRunning: this.isRunning,
        activeJobs: Array.from(this.currentJobs.keys()),
        lastCheck: new Date().toISOString(),
      }),
      { ex: 60 * 60 }, // 1 hour TTL
    );
  }

  private async handleSchedulerError(error: unknown): Promise<void> {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    await this.redis.set(
      `${this.schedulerKey}:last_error`,
      JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      { ex: 24 * 60 * 60 }, // 24 hours TTL
    );

    // Don't stop the scheduler for errors, just log and continue
    console.error('Scheduler error handled, continuing:', errorMessage);
  }

  private async scheduleDailyMaintenance(
    config: SchedulerConfig,
  ): Promise<void> {
    // This would typically integrate with a cron job system
    console.log(
      `Daily maintenance scheduled for ${config.maintenanceWindowStart}-${config.maintenanceWindowEnd}`,
    );
  }

  /**
   * Get scheduler status for monitoring
   */
  public async getStatus(): Promise<{
    isRunning: boolean;
    activeJobs: number;
    health: string;
    lastError?: string;
    nextMaintenanceWindow?: string;
  }> {
    const statusData = await this.redis.get(`${this.schedulerKey}:status`);
    const healthData = await this.redis.get(`${this.schedulerKey}:health`);
    const errorData = await this.redis.get(`${this.schedulerKey}:last_error`);

    const status = statusData ? JSON.parse(statusData) : { status: 'unknown' };
    const health = healthData ? JSON.parse(healthData) : { status: 'unknown' };
    const error = errorData ? JSON.parse(errorData) : null;

    return {
      isRunning: this.isRunning,
      activeJobs: this.currentJobs.size,
      health: health.status,
      lastError: error?.error,
      nextMaintenanceWindow: '02:00-04:00 UTC',
    };
  }
}
