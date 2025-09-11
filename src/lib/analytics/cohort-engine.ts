import { createClient } from '@supabase/supabase-js';
import { CacheManager } from '../cache/performance-cache-manager';
import { QueryOptimizer } from '../database/query-optimizer';

export interface CohortAnalysisConfig {
  name: string;
  cohortType: 'supplier_performance' | 'client_engagement' | 'revenue_growth';
  timeWindow: {
    start: Date;
    end: Date;
    granularity: 'daily' | 'weekly' | 'monthly';
  };
  segmentationCriteria: {
    businessType?: string[];
    location?: string[];
    subscriptionTier?: string[];
    customFilters?: Record<string, any>;
  };
  retentionPeriods: number[]; // [30, 60, 90, 180, 365] days
  metrics: ('retention' | 'revenue' | 'engagement' | 'conversion')[];
}

export interface CohortAnalysisResult {
  cohortId: string;
  config: CohortAnalysisConfig;
  cohorts: CohortData[];
  insights: AutomatedInsight[];
  benchmarks: CohortBenchmark[];
  calculatedAt: Date;
  status: 'completed' | 'partial' | 'failed';
}

export interface CohortData {
  cohortPeriod: string;
  cohortSize: number;
  retentionRates: Record<number, number>;
  revenueMetrics: {
    totalRevenue: number;
    averageRevenuePerUser: number;
    lifetimeValue: number;
  };
  engagementMetrics: {
    averageSessions: number;
    averageSessionDuration: number;
    featureAdoption: Record<string, number>;
  };
}

export interface AutomatedInsight {
  type: 'trend' | 'anomaly' | 'recommendation' | 'alert';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  confidence: number;
  recommendedActions?: string[];
  affectedCohorts: string[];
}

export interface CohortBenchmark {
  metric: string;
  value: number;
  percentile: number;
  industry: string;
  period: string;
}

export class CohortEngine {
  private supabase: any;
  private cacheManager: CacheManager;
  private queryOptimizer: QueryOptimizer;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.cacheManager = new CacheManager();
    this.queryOptimizer = new QueryOptimizer(this.supabase);
  }

  async calculateCohortAnalysis(
    config: CohortAnalysisConfig,
  ): Promise<CohortAnalysisResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(config);
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Create cohort definition record
      const cohortId = await this.createCohortDefinition(config);

      // Execute cohort calculations
      const cohorts = await this.executeCohortQuery(config);

      // Generate automated insights
      const insights = await this.generateInsights(cohorts, config);

      // Calculate benchmarks
      const benchmarks = await this.calculateBenchmarks(cohorts, config);

      const result: CohortAnalysisResult = {
        cohortId,
        config,
        cohorts,
        insights,
        benchmarks,
        calculatedAt: new Date(),
        status: 'completed',
      };

      // Cache result for 1 hour
      await this.cacheManager.set(cacheKey, result, 3600);

      // Store results in database
      await this.storeCohortResults(result);

      return result;
    } catch (error) {
      console.error('Cohort analysis failed:', error);
      throw new Error(`Cohort calculation failed: ${error.message}`);
    }
  }

  async updateCohortBaselines(
    cohortId: string,
    newMetrics: Record<string, number>,
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('cohort_baselines')
        .upsert({
          cohort_definition_id: cohortId,
          baseline_type: 'updated_benchmark',
          baseline_name: 'Current Performance',
          baseline_values: newMetrics,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Invalidate related caches
      await this.cacheManager.invalidate(`cohort:${cohortId}:*`);

      return data;
    } catch (error) {
      throw new Error(`Failed to update cohort baselines: ${error.message}`);
    }
  }

  private async executeCohortQuery(
    config: CohortAnalysisConfig,
  ): Promise<CohortData[]> {
    const cohortQuery = this.buildCohortSQLQuery(config);

    // Use query optimizer for performance
    const optimizedQuery = await this.queryOptimizer.optimize(cohortQuery);

    const { data, error } = await this.supabase.rpc('execute_cohort_analysis', {
      query: optimizedQuery,
      params: this.buildQueryParams(config),
    });

    if (error) throw error;

    return this.transformQueryResults(data, config);
  }

  private buildCohortSQLQuery(config: CohortAnalysisConfig): string {
    const { cohortType, timeWindow, segmentationCriteria } = config;

    let baseTable = '';
    let cohortPeriodExpression = '';

    switch (cohortType) {
      case 'supplier_performance':
        baseTable = 'suppliers';
        cohortPeriodExpression = "DATE_TRUNC('month', created_at)";
        break;
      case 'client_engagement':
        baseTable = 'clients';
        cohortPeriodExpression = "DATE_TRUNC('month', registration_date)";
        break;
      case 'revenue_growth':
        baseTable = 'supplier_transactions';
        cohortPeriodExpression = "DATE_TRUNC('month', transaction_date)";
        break;
    }

    let whereConditions = [`${cohortPeriodExpression} BETWEEN $1 AND $2`];

    if (segmentationCriteria.businessType) {
      whereConditions.push('business_type = ANY($3)');
    }
    if (segmentationCriteria.location) {
      whereConditions.push('location = ANY($4)');
    }
    if (segmentationCriteria.subscriptionTier) {
      whereConditions.push('subscription_tier = ANY($5)');
    }

    return `
      WITH cohort_base AS (
        SELECT 
          ${cohortPeriodExpression} as cohort_period,
          id as entity_id,
          created_at,
          business_type,
          location,
          subscription_tier
        FROM ${baseTable}
        WHERE ${whereConditions.join(' AND ')}
      ),
      cohort_metrics AS (
        SELECT 
          cb.cohort_period,
          cb.entity_id,
          COUNT(DISTINCT sal.id) as session_count,
          AVG(sal.session_duration) as avg_session_duration,
          SUM(COALESCE(st.amount, 0)) as total_revenue,
          MAX(sal.login_timestamp) as last_activity,
          COUNT(DISTINCT DATE(sal.login_timestamp)) as active_days
        FROM cohort_base cb
        LEFT JOIN supplier_activity_logs sal ON cb.entity_id = sal.supplier_id
        LEFT JOIN supplier_transactions st ON cb.entity_id = st.supplier_id
        GROUP BY cb.cohort_period, cb.entity_id
      )
      SELECT 
        cohort_period,
        COUNT(*) as cohort_size,
        AVG(session_count) as avg_sessions,
        AVG(avg_session_duration) as avg_duration,
        SUM(total_revenue) as total_cohort_revenue,
        AVG(total_revenue) as avg_revenue_per_user,
        COUNT(CASE WHEN last_activity > cohort_period + INTERVAL '30 days' THEN 1 END)::FLOAT / COUNT(*) as retention_30d,
        COUNT(CASE WHEN last_activity > cohort_period + INTERVAL '60 days' THEN 1 END)::FLOAT / COUNT(*) as retention_60d,
        COUNT(CASE WHEN last_activity > cohort_period + INTERVAL '90 days' THEN 1 END)::FLOAT / COUNT(*) as retention_90d
      FROM cohort_metrics
      GROUP BY cohort_period
      ORDER BY cohort_period
    `;
  }

  private buildQueryParams(config: CohortAnalysisConfig): any[] {
    const params = [config.timeWindow.start, config.timeWindow.end];

    if (config.segmentationCriteria.businessType) {
      params.push(config.segmentationCriteria.businessType);
    }
    if (config.segmentationCriteria.location) {
      params.push(config.segmentationCriteria.location);
    }
    if (config.segmentationCriteria.subscriptionTier) {
      params.push(config.segmentationCriteria.subscriptionTier);
    }

    return params;
  }

  private transformQueryResults(
    data: any[],
    config: CohortAnalysisConfig,
  ): CohortData[] {
    return data.map((row) => ({
      cohortPeriod: row.cohort_period,
      cohortSize: row.cohort_size,
      retentionRates: {
        30: row.retention_30d,
        60: row.retention_60d,
        90: row.retention_90d,
      },
      revenueMetrics: {
        totalRevenue: row.total_cohort_revenue,
        averageRevenuePerUser: row.avg_revenue_per_user,
        lifetimeValue: row.avg_revenue_per_user * 12, // Simple LTV estimation
      },
      engagementMetrics: {
        averageSessions: row.avg_sessions,
        averageSessionDuration: row.avg_duration,
        featureAdoption: {}, // Would be calculated from additional queries
      },
    }));
  }

  private async generateInsights(
    cohorts: CohortData[],
    config: CohortAnalysisConfig,
  ): Promise<AutomatedInsight[]> {
    const insights: AutomatedInsight[] = [];

    // Trend analysis
    if (cohorts.length >= 3) {
      const retentionTrend = this.analyzeTrend(
        cohorts.map((c) => c.retentionRates[30]),
      );

      if (retentionTrend.slope > 0.05) {
        insights.push({
          type: 'trend',
          severity: 'positive',
          title: 'Improving Retention Trend',
          description: `30-day retention is improving by ${(retentionTrend.slope * 100).toFixed(1)}% per cohort`,
          confidence: retentionTrend.confidence,
          affectedCohorts: cohorts.map((c) => c.cohortPeriod),
        });
      }
    }

    // Anomaly detection
    const revenueValues = cohorts.map(
      (c) => c.revenueMetrics.averageRevenuePerUser,
    );
    const revenueAnomalies = this.detectAnomalies(revenueValues);

    revenueAnomalies.forEach((anomaly, index) => {
      if (anomaly) {
        insights.push({
          type: 'anomaly',
          severity: 'warning',
          title: 'Revenue Anomaly Detected',
          description: `Cohort ${cohorts[index].cohortPeriod} shows unusual revenue patterns`,
          confidence: 0.85,
          recommendedActions: [
            'Investigate cohort composition',
            'Review pricing changes during this period',
            'Analyze competitive factors',
          ],
          affectedCohorts: [cohorts[index].cohortPeriod],
        });
      }
    });

    // Performance recommendations
    const avgRetention =
      cohorts.reduce((sum, c) => sum + c.retentionRates[30], 0) /
      cohorts.length;

    if (avgRetention < 0.5) {
      insights.push({
        type: 'recommendation',
        severity: 'warning',
        title: 'Low Retention Rate',
        description: `Average 30-day retention is ${(avgRetention * 100).toFixed(1)}%, below industry benchmark`,
        confidence: 0.9,
        recommendedActions: [
          'Implement onboarding improvements',
          'Increase early engagement touchpoints',
          'Review user experience during first 30 days',
        ],
        affectedCohorts: cohorts.map((c) => c.cohortPeriod),
      });
    }

    return insights;
  }

  private analyzeTrend(values: number[]): {
    slope: number;
    confidence: number;
  } {
    if (values.length < 3) return { slope: 0, confidence: 0 };

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const confidence = Math.min(0.95, (Math.abs(slope) * n) / 5); // Simple confidence calculation

    return { slope, confidence };
  }

  private detectAnomalies(values: number[]): boolean[] {
    if (values.length < 3) return values.map(() => false);

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
        values.length,
    );

    return values.map((value) => Math.abs(value - mean) > 2 * stdDev);
  }

  private async calculateBenchmarks(
    cohorts: CohortData[],
    config: CohortAnalysisConfig,
  ): Promise<CohortBenchmark[]> {
    // This would typically query industry benchmark data
    const benchmarks: CohortBenchmark[] = [];

    const avgRetention =
      cohorts.reduce((sum, c) => sum + c.retentionRates[30], 0) /
      cohorts.length;
    const avgRevenue =
      cohorts.reduce(
        (sum, c) => sum + c.revenueMetrics.averageRevenuePerUser,
        0,
      ) / cohorts.length;

    benchmarks.push({
      metric: '30-day Retention Rate',
      value: avgRetention,
      percentile: this.calculatePercentile(avgRetention, 0.45), // Industry benchmark
      industry: 'Wedding Technology',
      period: config.timeWindow.start.toISOString().slice(0, 7),
    });

    benchmarks.push({
      metric: 'Average Revenue per User',
      value: avgRevenue,
      percentile: this.calculatePercentile(avgRevenue, 250), // Industry benchmark
      industry: 'Wedding Technology',
      period: config.timeWindow.start.toISOString().slice(0, 7),
    });

    return benchmarks;
  }

  private calculatePercentile(value: number, benchmark: number): number {
    return Math.round((value / benchmark) * 50 + 50); // Simple percentile calculation
  }

  private async createCohortDefinition(
    config: CohortAnalysisConfig,
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('cohort_definitions')
      .insert({
        name: config.name,
        cohort_type: config.cohortType,
        segmentation_criteria: config.segmentationCriteria,
        time_window_type: 'custom',
        time_window_duration: `${Math.floor((config.timeWindow.end.getTime() - config.timeWindow.start.getTime()) / (1000 * 60 * 60 * 24))} days`,
        metrics_to_track: config.metrics,
        auto_refresh_enabled: true,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async storeCohortResults(
    result: CohortAnalysisResult,
  ): Promise<void> {
    for (const cohort of result.cohorts) {
      await this.supabase.from('cohort_metrics').insert({
        cohort_definition_id: result.cohortId,
        cohort_period: cohort.cohortPeriod,
        cohort_size: cohort.cohortSize,
        measurement_period: new Date().toISOString().slice(0, 10),
        period_offset_days: 0,
        metric_values: {
          retention_rates: cohort.retentionRates,
          revenue_metrics: cohort.revenueMetrics,
          engagement_metrics: cohort.engagementMetrics,
        },
        retention_rate: cohort.retentionRates[30],
        revenue_per_entity: cohort.revenueMetrics.averageRevenuePerUser,
        activity_score: cohort.engagementMetrics.averageSessions,
      });
    }

    // Store insights
    for (const insight of result.insights) {
      await this.supabase.from('cohort_insights').insert({
        cohort_definition_id: result.cohortId,
        insight_type: insight.type,
        severity: insight.severity,
        title: insight.title,
        description: insight.description,
        confidence_score: insight.confidence,
        recommendations: insight.recommendedActions,
        affected_periods: insight.affectedCohorts,
      });
    }
  }

  private generateCacheKey(config: CohortAnalysisConfig): string {
    const configHash = Buffer.from(JSON.stringify(config)).toString('base64');
    return `cohort:analysis:${configHash}`;
  }
}
