/**
 * WS-142: MetricsAggregator - Daily Health Score Calculations and Caching
 * Automated metrics aggregation system for performance optimization and scheduled processing
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { redis } from '@/lib/redis';
import { customerHealthService } from './customer-health-service';
import { activityTracker } from './activity-tracker';
import { riskAssessmentService } from './risk-assessment';
import { healthScoringEngine } from './health-scoring-engine';

export interface MetricsAggregationJob {
  jobId: string;
  jobType:
    | 'health_scores'
    | 'activity_metrics'
    | 'risk_assessments'
    | 'comprehensive';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  organizationId?: string;
  userIds?: string[];
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;

  // Configuration
  config: AggregationConfig;

  // Progress tracking
  totalItems: number;
  processedItems: number;
  failedItems: number;
  progressPercentage: number;

  // Results
  results: AggregationResults;

  // Error handling
  errors: JobError[];
  retryCount: number;
  maxRetries: number;
}

export interface AggregationConfig {
  batchSize: number;
  concurrency: number;
  cacheResults: boolean;
  cacheTTL: number; // seconds
  includeHistorical: boolean;
  timeframe: '7d' | '30d' | '90d';
  refreshFrequency: 'hourly' | 'daily' | 'weekly';
  alertThresholds: AlertThreshold[];
}

export interface AlertThreshold {
  metricType: 'health_score' | 'risk_level' | 'activity_level';
  condition: 'above' | 'below' | 'equals';
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'notify' | 'escalate';
}

export interface AggregationResults {
  healthScores: HealthScoreAggregation;
  activityMetrics: ActivityAggregation;
  riskAssessments: RiskAggregation;
  organizationMetrics: OrganizationAggregation;
  summary: AggregationSummary;
}

export interface HealthScoreAggregation {
  totalUsers: number;
  averageHealthScore: number;
  healthDistribution: Record<string, number>;
  trends: HealthTrend[];
  benchmarks: HealthBenchmark[];
  alerts: MetricAlert[];
}

export interface ActivityAggregation {
  totalActivities: number;
  uniqueActiveUsers: number;
  featureUsageStats: FeatureUsageStats[];
  adoptionRates: AdoptionRateStats;
  engagementMetrics: EngagementMetrics;
  patterns: UsagePattern[];
}

export interface RiskAggregation {
  totalAssessments: number;
  riskDistribution: Record<string, number>;
  averageChurnProbability: number;
  highRiskUsers: RiskUser[];
  interventionsNeeded: InterventionNeeded[];
  trends: RiskTrend[];
}

export interface OrganizationAggregation {
  organizationId?: string;
  totalUsers: number;
  activeUsers: number;
  healthyUsers: number;
  atRiskUsers: number;
  averageEngagement: number;
  topFeatures: TopFeature[];
  growthMetrics: GrowthMetrics;
}

export interface AggregationSummary {
  processingTime: number;
  dataFreshness: Date;
  qualityScore: number;
  anomaliesDetected: Anomaly[];
  recommendations: string[];
  nextScheduledRun: Date;
}

export interface JobError {
  errorId: string;
  userId?: string;
  errorType: 'validation' | 'processing' | 'timeout' | 'dependency' | 'system';
  message: string;
  stack?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
}

export interface MetricAlert {
  alertId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: Record<string, number>;
  affectedUsers: string[];
  triggeredAt: Date;
  acknowledged: boolean;
}

interface ScheduledJob {
  jobId: string;
  cronExpression: string;
  jobType: string;
  config: AggregationConfig;
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  runCount: number;
  averageDuration: number;
}

const metricsJobSchema = z.object({
  jobType: z.enum([
    'health_scores',
    'activity_metrics',
    'risk_assessments',
    'comprehensive',
  ]),
  organizationId: z.string().uuid().optional(),
  userIds: z.array(z.string().uuid()).optional(),
  config: z.object({
    batchSize: z.number().min(1).max(100).default(10),
    concurrency: z.number().min(1).max(5).default(2),
    cacheResults: z.boolean().default(true),
    cacheTTL: z.number().default(3600),
    includeHistorical: z.boolean().default(true),
    timeframe: z.enum(['7d', '30d', '90d']).default('30d'),
  }),
});

export class MetricsAggregator {
  private supabase: SupabaseClient;
  private cachePrefix = 'metrics_agg:';
  private jobQueue: Map<string, MetricsAggregationJob> = new Map();
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private isProcessing = false;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
    this.initializeScheduler();
  }

  /**
   * Schedule a metrics aggregation job
   */
  async scheduleAggregation(
    jobType: MetricsAggregationJob['jobType'],
    config: Partial<AggregationConfig>,
    organizationId?: string,
    userIds?: string[],
    scheduledFor: Date = new Date(),
  ): Promise<string> {
    try {
      const validation = metricsJobSchema.safeParse({
        jobType,
        organizationId,
        userIds,
        config,
      });

      if (!validation.success) {
        throw new Error(
          `Invalid job configuration: ${validation.error.message}`,
        );
      }

      const jobId = crypto.randomUUID();
      const totalItems =
        userIds?.length ||
        (await this.estimateJobSize(organizationId, jobType));

      const job: MetricsAggregationJob = {
        jobId,
        jobType,
        status: 'pending',
        organizationId,
        userIds,
        scheduledFor,
        config: {
          batchSize: 10,
          concurrency: 2,
          cacheResults: true,
          cacheTTL: 3600,
          includeHistorical: true,
          timeframe: '30d',
          refreshFrequency: 'daily',
          alertThresholds: [],
          ...config,
        },
        totalItems,
        processedItems: 0,
        failedItems: 0,
        progressPercentage: 0,
        results: this.getEmptyResults(),
        errors: [],
        retryCount: 0,
        maxRetries: 3,
      };

      this.jobQueue.set(jobId, job);

      // Store job in database for persistence
      await this.storeJob(job);

      // If scheduled for now, start processing immediately
      if (scheduledFor <= new Date()) {
        setImmediate(() => this.processJob(jobId));
      }

      return jobId;
    } catch (error) {
      console.error('Error scheduling aggregation job:', error);
      throw error;
    }
  }

  /**
   * Process a specific aggregation job
   */
  async processJob(jobId: string): Promise<MetricsAggregationJob> {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'pending') {
      throw new Error(`Job ${jobId} is not in pending state`);
    }

    try {
      // Update job status
      job.status = 'running';
      job.startedAt = new Date();
      await this.updateJobStatus(job);

      console.log(`Starting metrics aggregation job ${jobId} (${job.jobType})`);

      // Process based on job type
      switch (job.jobType) {
        case 'health_scores':
          await this.processHealthScores(job);
          break;
        case 'activity_metrics':
          await this.processActivityMetrics(job);
          break;
        case 'risk_assessments':
          await this.processRiskAssessments(job);
          break;
        case 'comprehensive':
          await this.processComprehensiveAggregation(job);
          break;
      }

      // Complete the job
      job.status = 'completed';
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt!.getTime();
      job.progressPercentage = 100;

      // Generate summary
      job.results.summary = await this.generateSummary(job);

      // Cache results if configured
      if (job.config.cacheResults) {
        await this.cacheJobResults(job);
      }

      // Check for alerts
      await this.checkAndTriggerAlerts(job);

      console.log(
        `Completed metrics aggregation job ${jobId} in ${job.duration}ms`,
      );
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);

      job.status = 'failed';
      job.completedAt = new Date();
      job.errors.push({
        errorId: crypto.randomUUID(),
        errorType: 'processing',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
        severity: 'high',
        retryable: true,
      });

      // Retry if within limits
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = 'pending';
        console.log(`Retrying job ${jobId}, attempt ${job.retryCount}`);
        setTimeout(() => this.processJob(jobId), 30000); // Retry after 30 seconds
      }
    } finally {
      await this.updateJobStatus(job);
    }

    return job;
  }

  /**
   * Get job status and results
   */
  async getJobStatus(jobId: string): Promise<MetricsAggregationJob | null> {
    const job = this.jobQueue.get(jobId);
    if (job) {
      return job;
    }

    // Try to load from database
    return await this.loadJobFromDb(jobId);
  }

  /**
   * Run daily health score aggregation for all users
   */
  async runDailyAggregation(organizationId?: string): Promise<string> {
    const config: AggregationConfig = {
      batchSize: 20,
      concurrency: 3,
      cacheResults: true,
      cacheTTL: 86400, // 24 hours
      includeHistorical: true,
      timeframe: '30d',
      refreshFrequency: 'daily',
      alertThresholds: [
        {
          metricType: 'health_score',
          condition: 'below',
          value: 40,
          severity: 'high',
          action: 'escalate',
        },
        {
          metricType: 'risk_level',
          condition: 'above',
          value: 80,
          severity: 'critical',
          action: 'escalate',
        },
      ],
    };

    return await this.scheduleAggregation(
      'comprehensive',
      config,
      organizationId,
    );
  }

  /**
   * Get aggregated metrics for dashboard display
   */
  async getAggregatedMetrics(
    organizationId?: string,
    cacheKey?: string,
  ): Promise<AggregationResults> {
    const key =
      cacheKey || `${this.cachePrefix}dashboard:${organizationId || 'global'}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache read error for aggregated metrics:', error);
    }

    // If no cached data, return latest completed job results
    const latestJob = await this.getLatestCompletedJob(organizationId);
    return latestJob?.results || this.getEmptyResults();
  }

  /**
   * Setup recurring aggregation jobs
   */
  async setupRecurringJobs(): Promise<void> {
    // Daily comprehensive aggregation
    await this.scheduleRecurringJob(
      'comprehensive',
      '0 2 * * *', // Daily at 2 AM
      {
        batchSize: 25,
        concurrency: 4,
        cacheResults: true,
        cacheTTL: 86400,
        includeHistorical: true,
        timeframe: '30d',
        refreshFrequency: 'daily',
        alertThresholds: [],
      },
    );

    // Hourly activity metrics for active organizations
    await this.scheduleRecurringJob(
      'activity_metrics',
      '0 * * * *', // Every hour
      {
        batchSize: 50,
        concurrency: 2,
        cacheResults: true,
        cacheTTL: 3600,
        includeHistorical: false,
        timeframe: '7d',
        refreshFrequency: 'hourly',
        alertThresholds: [],
      },
    );

    console.log('Recurring aggregation jobs have been set up');
  }

  // Private helper methods

  private async processHealthScores(job: MetricsAggregationJob): Promise<void> {
    const userIds =
      job.userIds || (await this.getUserIdsForProcessing(job.organizationId));
    const batchSize = job.config.batchSize;

    const healthScoreResults: any[] = [];

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      try {
        const batchPromises = batch.map(async (userId) => {
          try {
            const healthResult =
              await customerHealthService.calculateHealthScoreFromActivity(
                userId,
                job.organizationId,
                job.config.timeframe,
              );
            return { userId, result: healthResult };
          } catch (error) {
            job.errors.push({
              errorId: crypto.randomUUID(),
              userId,
              errorType: 'processing',
              message: `Health score calculation failed: ${error}`,
              timestamp: new Date(),
              severity: 'medium',
              retryable: true,
            });
            return { userId, error };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.result) {
            healthScoreResults.push(result.value.result);
            job.processedItems++;
          } else {
            job.failedItems++;
          }
        });

        job.progressPercentage = Math.round(
          (job.processedItems / job.totalItems) * 100,
        );
        await this.updateJobProgress(job);
      } catch (error) {
        console.error(`Batch processing error for health scores:`, error);
      }
    }

    // Aggregate results
    job.results.healthScores = this.aggregateHealthScores(healthScoreResults);
  }

  private async processActivityMetrics(
    job: MetricsAggregationJob,
  ): Promise<void> {
    try {
      const adoptionMetrics = await activityTracker.getFeatureAdoptionMetrics(
        job.organizationId,
        undefined,
        job.config.timeframe,
      );

      const usagePatterns = await activityTracker.detectUsagePatterns(
        job.organizationId,
        job.config.timeframe,
      );

      const activityInsights = await activityTracker.generateActivityInsights(
        job.organizationId,
        undefined,
        job.config.timeframe,
      );

      job.results.activityMetrics = {
        totalActivities: adoptionMetrics.reduce(
          (sum, m) => sum + m.usageCount,
          0,
        ),
        uniqueActiveUsers: adoptionMetrics.reduce(
          (sum, m) => sum + m.uniqueUsers,
          0,
        ),
        featureUsageStats: adoptionMetrics.map((m) => ({
          featureKey: m.featureKey,
          featureName: m.featureName,
          usageCount: m.usageCount,
          adoptionRate: m.adoptionRate,
          trend: m.trendDirection,
        })),
        adoptionRates: {
          overall: Math.round(
            adoptionMetrics.reduce((sum, m) => sum + m.adoptionRate, 0) /
              Math.max(adoptionMetrics.length, 1),
          ),
          byCategory: {},
        },
        engagementMetrics: {
          averageEngagement: 75, // Would calculate from real data
          activeUsers: adoptionMetrics.reduce(
            (sum, m) => sum + m.uniqueUsers,
            0,
          ),
          sessionFrequency: 2.3,
        },
        patterns: usagePatterns,
      };

      job.processedItems = job.totalItems;
      job.progressPercentage = 100;
    } catch (error) {
      throw error;
    }
  }

  private async processRiskAssessments(
    job: MetricsAggregationJob,
  ): Promise<void> {
    const userIds =
      job.userIds || (await this.getUserIdsForProcessing(job.organizationId));
    const riskResults = await riskAssessmentService.batchAssessRisk(
      userIds,
      job.organizationId,
      { forceRefresh: true },
    );

    const riskArray = Array.from(riskResults.values());

    job.results.riskAssessments = {
      totalAssessments: riskArray.length,
      riskDistribution: this.calculateRiskDistribution(riskArray),
      averageChurnProbability: Math.round(
        riskArray.reduce((sum, r) => sum + r.churnProbability, 0) /
          Math.max(riskArray.length, 1),
      ),
      highRiskUsers: riskArray
        .filter((r) => ['high', 'critical'].includes(r.riskLevel))
        .map((r) => ({
          userId: r.userId,
          riskLevel: r.riskLevel,
          churnProbability: r.churnProbability,
          primaryRiskCategory: r.riskCategory,
        })),
      interventionsNeeded: riskArray
        .filter((r) => r.interventionRecommendations.length > 0)
        .map((r) => ({
          userId: r.userId,
          urgency: r.interventionRecommendations[0]?.priority || 'medium',
          recommendations: r.interventionRecommendations.slice(0, 3),
        })),
      trends: [],
    };

    job.processedItems = userIds.length;
    job.progressPercentage = 100;
  }

  private async processComprehensiveAggregation(
    job: MetricsAggregationJob,
  ): Promise<void> {
    // Process all metric types
    await Promise.all([
      this.processHealthScores(job),
      this.processActivityMetrics(job),
      this.processRiskAssessments(job),
    ]);

    // Generate organization-level metrics
    job.results.organizationMetrics =
      await this.generateOrganizationMetrics(job);
  }

  private async generateOrganizationMetrics(
    job: MetricsAggregationJob,
  ): Promise<OrganizationAggregation> {
    const totalUsers = job.totalItems;
    const healthyUsers = job.results.healthScores.healthDistribution.good || 0;
    const atRiskUsers = job.results.riskAssessments.highRiskUsers.length;

    return {
      organizationId: job.organizationId,
      totalUsers,
      activeUsers: job.results.activityMetrics.uniqueActiveUsers,
      healthyUsers,
      atRiskUsers,
      averageEngagement:
        job.results.activityMetrics.engagementMetrics.averageEngagement,
      topFeatures: job.results.activityMetrics.featureUsageStats
        .slice(0, 5)
        .map((f) => ({
          featureKey: f.featureKey,
          featureName: f.featureName,
          usage: f.usageCount,
          adoption: f.adoptionRate,
        })),
      growthMetrics: {
        userGrowth: 0, // Would calculate from historical data
        engagementGrowth: 0,
        featureAdoptionGrowth: 0,
      },
    };
  }

  private aggregateHealthScores(results: any[]): HealthScoreAggregation {
    if (results.length === 0) {
      return {
        totalUsers: 0,
        averageHealthScore: 0,
        healthDistribution: {},
        trends: [],
        benchmarks: [],
        alerts: [],
      };
    }

    const healthScores = results.map((r) => r.healthScore.overall_health_score);
    const averageHealthScore = Math.round(
      healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length,
    );

    const distribution: Record<string, number> = {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0,
      critical: 0,
    };

    healthScores.forEach((score) => {
      if (score >= 90) distribution.excellent++;
      else if (score >= 75) distribution.good++;
      else if (score >= 60) distribution.average++;
      else if (score >= 40) distribution.poor++;
      else distribution.critical++;
    });

    return {
      totalUsers: results.length,
      averageHealthScore,
      healthDistribution: distribution,
      trends: [],
      benchmarks: [],
      alerts: [],
    };
  }

  private calculateRiskDistribution(risks: any[]): Record<string, number> {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    risks.forEach((risk) => {
      distribution[risk.riskLevel as keyof typeof distribution]++;
    });
    return distribution;
  }

  private async generateSummary(
    job: MetricsAggregationJob,
  ): Promise<AggregationSummary> {
    return {
      processingTime: job.duration || 0,
      dataFreshness: new Date(),
      qualityScore: Math.round(
        ((job.processedItems - job.failedItems) / job.totalItems) * 100,
      ),
      anomaliesDetected: [],
      recommendations: this.generateRecommendations(job),
      nextScheduledRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day
    };
  }

  private generateRecommendations(job: MetricsAggregationJob): string[] {
    const recommendations: string[] = [];

    if (job.results.riskAssessments.highRiskUsers.length > 0) {
      recommendations.push(
        `${job.results.riskAssessments.highRiskUsers.length} users require immediate attention due to high churn risk`,
      );
    }

    if (job.results.healthScores.averageHealthScore < 60) {
      recommendations.push(
        'Overall user health is below average - consider launching engagement campaign',
      );
    }

    return recommendations;
  }

  private async checkAndTriggerAlerts(
    job: MetricsAggregationJob,
  ): Promise<void> {
    // Check configured alert thresholds and trigger notifications
    for (const threshold of job.config.alertThresholds) {
      // Implementation would check thresholds and trigger alerts
    }
  }

  // Database and utility methods

  private async estimateJobSize(
    organizationId?: string,
    jobType?: string,
  ): Promise<number> {
    const { count, error } = await this.supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq(organizationId ? 'organization_id' : 'id', organizationId || '');

    return error ? 100 : count || 100; // Default estimate
  }

  private async getUserIdsForProcessing(
    organizationId?: string,
  ): Promise<string[]> {
    let query = this.supabase.from('user_profiles').select('id');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.limit(1000);

    return error ? [] : data.map((u) => u.id);
  }

  private async storeJob(job: MetricsAggregationJob): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('metrics_aggregation_jobs')
        .insert({
          job_id: job.jobId,
          job_type: job.jobType,
          status: job.status,
          organization_id: job.organizationId,
          config: job.config,
          scheduled_for: job.scheduledFor.toISOString(),
          total_items: job.totalItems,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing aggregation job:', error);
    }
  }

  private async updateJobStatus(job: MetricsAggregationJob): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('metrics_aggregation_jobs')
        .update({
          status: job.status,
          started_at: job.startedAt?.toISOString(),
          completed_at: job.completedAt?.toISOString(),
          duration: job.duration,
          processed_items: job.processedItems,
          failed_items: job.failedItems,
          progress_percentage: job.progressPercentage,
          results: job.results,
          errors: job.errors,
        })
        .eq('job_id', job.jobId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  }

  private async updateJobProgress(job: MetricsAggregationJob): Promise<void> {
    // Update progress in database and cache for real-time monitoring
    try {
      await redis.setex(
        `${this.cachePrefix}progress:${job.jobId}`,
        300, // 5 minutes
        JSON.stringify({
          jobId: job.jobId,
          status: job.status,
          progressPercentage: job.progressPercentage,
          processedItems: job.processedItems,
          totalItems: job.totalItems,
        }),
      );
    } catch (error) {
      console.warn('Error updating job progress cache:', error);
    }
  }

  private async cacheJobResults(job: MetricsAggregationJob): Promise<void> {
    const cacheKey = `${this.cachePrefix}results:${job.organizationId || 'global'}:${job.jobType}`;

    try {
      await redis.setex(
        cacheKey,
        job.config.cacheTTL,
        JSON.stringify(job.results),
      );
    } catch (error) {
      console.warn('Error caching job results:', error);
    }
  }

  private async loadJobFromDb(
    jobId: string,
  ): Promise<MetricsAggregationJob | null> {
    try {
      const { data, error } = await this.supabase
        .from('metrics_aggregation_jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error || !data) return null;

      return {
        jobId: data.job_id,
        jobType: data.job_type,
        status: data.status,
        organizationId: data.organization_id,
        config: data.config,
        scheduledFor: new Date(data.scheduled_for),
        startedAt: data.started_at ? new Date(data.started_at) : undefined,
        completedAt: data.completed_at
          ? new Date(data.completed_at)
          : undefined,
        duration: data.duration,
        totalItems: data.total_items,
        processedItems: data.processed_items || 0,
        failedItems: data.failed_items || 0,
        progressPercentage: data.progress_percentage || 0,
        results: data.results || this.getEmptyResults(),
        errors: data.errors || [],
        retryCount: data.retry_count || 0,
        maxRetries: 3,
      };
    } catch (error) {
      console.error('Error loading job from database:', error);
      return null;
    }
  }

  private async getLatestCompletedJob(
    organizationId?: string,
  ): Promise<MetricsAggregationJob | null> {
    try {
      let query = this.supabase
        .from('metrics_aggregation_jobs')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.single();

      return error ? null : await this.loadJobFromDb(data.job_id);
    } catch (error) {
      return null;
    }
  }

  private async scheduleRecurringJob(
    jobType: string,
    cronExpression: string,
    config: AggregationConfig,
  ): Promise<void> {
    const jobId = crypto.randomUUID();
    const scheduledJob: ScheduledJob = {
      jobId,
      cronExpression,
      jobType,
      config,
      isActive: true,
      nextRun: this.calculateNextRun(cronExpression),
      runCount: 0,
      averageDuration: 0,
    };

    this.scheduledJobs.set(jobId, scheduledJob);
  }

  private calculateNextRun(cronExpression: string): Date {
    // Simplified cron calculation - would use proper cron library in production
    return new Date(Date.now() + 24 * 60 * 60 * 1000); // Next day
  }

  private async initializeScheduler(): Promise<void> {
    // Initialize the job scheduler
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processScheduledJobs();
      }
    }, 60000); // Check every minute
  }

  private async processScheduledJobs(): Promise<void> {
    const now = new Date();

    for (const [jobId, scheduledJob] of this.scheduledJobs.entries()) {
      if (scheduledJob.isActive && scheduledJob.nextRun <= now) {
        try {
          await this.scheduleAggregation(
            scheduledJob.jobType as MetricsAggregationJob['jobType'],
            scheduledJob.config,
          );

          scheduledJob.lastRun = now;
          scheduledJob.nextRun = this.calculateNextRun(
            scheduledJob.cronExpression,
          );
          scheduledJob.runCount++;
        } catch (error) {
          console.error(`Error processing scheduled job ${jobId}:`, error);
        }
      }
    }
  }

  private getEmptyResults(): AggregationResults {
    return {
      healthScores: {
        totalUsers: 0,
        averageHealthScore: 0,
        healthDistribution: {},
        trends: [],
        benchmarks: [],
        alerts: [],
      },
      activityMetrics: {
        totalActivities: 0,
        uniqueActiveUsers: 0,
        featureUsageStats: [],
        adoptionRates: { overall: 0, byCategory: {} },
        engagementMetrics: {
          averageEngagement: 0,
          activeUsers: 0,
          sessionFrequency: 0,
        },
        patterns: [],
      },
      riskAssessments: {
        totalAssessments: 0,
        riskDistribution: {},
        averageChurnProbability: 0,
        highRiskUsers: [],
        interventionsNeeded: [],
        trends: [],
      },
      organizationMetrics: {
        totalUsers: 0,
        activeUsers: 0,
        healthyUsers: 0,
        atRiskUsers: 0,
        averageEngagement: 0,
        topFeatures: [],
        growthMetrics: {
          userGrowth: 0,
          engagementGrowth: 0,
          featureAdoptionGrowth: 0,
        },
      },
      summary: {
        processingTime: 0,
        dataFreshness: new Date(),
        qualityScore: 0,
        anomaliesDetected: [],
        recommendations: [],
        nextScheduledRun: new Date(),
      },
    };
  }
}

// Additional interfaces for comprehensive metrics
interface FeatureUsageStats {
  featureKey: string;
  featureName: string;
  usageCount: number;
  adoptionRate: number;
  trend: string;
}

interface AdoptionRateStats {
  overall: number;
  byCategory: Record<string, number>;
}

interface EngagementMetrics {
  averageEngagement: number;
  activeUsers: number;
  sessionFrequency: number;
}

interface UsagePattern {
  patternId: string;
  description: string;
  frequency: number;
  users: string[];
}

interface RiskUser {
  userId: string;
  riskLevel: string;
  churnProbability: number;
  primaryRiskCategory: string;
}

interface InterventionNeeded {
  userId: string;
  urgency: string;
  recommendations: any[];
}

interface RiskTrend {
  date: Date;
  averageRisk: number;
  distribution: Record<string, number>;
}

interface TopFeature {
  featureKey: string;
  featureName: string;
  usage: number;
  adoption: number;
}

interface GrowthMetrics {
  userGrowth: number;
  engagementGrowth: number;
  featureAdoptionGrowth: number;
}

interface HealthTrend {
  date: Date;
  averageScore: number;
  distribution: Record<string, number>;
}

interface HealthBenchmark {
  category: string;
  benchmark: number;
  current: number;
  variance: number;
}

interface Anomaly {
  type: string;
  description: string;
  severity: string;
  affectedMetric: string;
}

// Export singleton instance
export const metricsAggregator = new MetricsAggregator();
