import { createClient } from '@/lib/supabase/client';
import { Logger } from '@/lib/logging/Logger';
import { z } from 'zod';

// Performance metrics schema validation
const PerformanceMetricSchema = z.object({
  component: z.enum([
    'semantic-analyzer',
    'rice-scorer',
    'content-pipeline',
    'predictive-engine',
  ]),
  operation: z.string(),
  duration: z.number(),
  success: z.boolean(),
  error_message: z.string().optional(),
  input_size: z.number().optional(),
  output_size: z.number().optional(),
  tokens_used: z.number().optional(),
  cost_cents: z.number().optional(),
  tier: z.enum(['free', 'starter', 'professional', 'scale', 'enterprise']),
  user_id: z.string(),
  organization_id: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
});

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;

interface AlertThresholds {
  maxResponseTime: number; // milliseconds
  maxErrorRate: number; // percentage (0-100)
  maxTokensPerHour: number;
  maxCostPerHour: number; // cents
  minSuccessRate: number; // percentage (0-100)
}

interface ComponentHealth {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'down';
  lastCheck: Date;
  metrics: {
    avgResponseTime: number;
    errorRate: number;
    tokensUsed: number;
    totalCost: number;
    successRate: number;
    requestCount: number;
  };
  issues: string[];
}

export class AIPerformanceMonitor {
  private logger: Logger;
  private supabase = createClient();
  private metrics: PerformanceMetric[] = [];
  private alertThresholds: Record<string, AlertThresholds> = {
    'semantic-analyzer': {
      maxResponseTime: 5000, // 5 seconds for embedding generation
      maxErrorRate: 5,
      maxTokensPerHour: 100000,
      maxCostPerHour: 500, // $5.00
      minSuccessRate: 95,
    },
    'rice-scorer': {
      maxResponseTime: 2000, // 2 seconds for scoring
      maxErrorRate: 2,
      maxTokensPerHour: 50000,
      maxCostPerHour: 200, // $2.00
      minSuccessRate: 98,
    },
    'content-pipeline': {
      maxResponseTime: 8000, // 8 seconds for comprehensive analysis
      maxErrorRate: 5,
      maxTokensPerHour: 200000,
      maxCostPerHour: 1000, // $10.00
      minSuccessRate: 95,
    },
    'predictive-engine': {
      maxResponseTime: 10000, // 10 seconds for ML predictions
      maxErrorRate: 8,
      maxTokensPerHour: 150000,
      maxCostPerHour: 800, // $8.00
      minSuccessRate: 92,
    },
  };

  constructor() {
    this.logger = new Logger('AIPerformanceMonitor');
  }

  /**
   * Record performance metric for AI component
   */
  async recordMetric(
    metric: Omit<PerformanceMetric, 'timestamp'>,
  ): Promise<void> {
    try {
      const validatedMetric = PerformanceMetricSchema.parse({
        ...metric,
        timestamp: new Date(),
      });

      // Store in memory for immediate analysis
      this.metrics.push(validatedMetric);

      // Persist to database for historical analysis
      const { error } = await this.supabase
        .from('ai_performance_metrics')
        .insert([
          {
            component: validatedMetric.component,
            operation: validatedMetric.operation,
            duration_ms: validatedMetric.duration,
            success: validatedMetric.success,
            error_message: validatedMetric.error_message,
            input_size: validatedMetric.input_size,
            output_size: validatedMetric.output_size,
            tokens_used: validatedMetric.tokens_used,
            cost_cents: validatedMetric.cost_cents,
            tier: validatedMetric.tier,
            user_id: validatedMetric.user_id,
            organization_id: validatedMetric.organization_id,
            metadata: validatedMetric.metadata,
            created_at: validatedMetric.timestamp.toISOString(),
          },
        ]);

      if (error) {
        this.logger.error('Failed to record AI performance metric', {
          error,
          metric: validatedMetric,
        });
      }

      // Check for immediate alerts
      await this.checkAlertConditions(validatedMetric.component);
    } catch (error) {
      this.logger.error('Error recording performance metric', {
        error,
        metric,
      });
    }
  }

  /**
   * Get health status for all AI components
   */
  async getComponentHealth(): Promise<ComponentHealth[]> {
    const components = [
      'semantic-analyzer',
      'rice-scorer',
      'content-pipeline',
      'predictive-engine',
    ];
    const healthReports: ComponentHealth[] = [];

    for (const component of components) {
      const health = await this.getComponentHealthStatus(component);
      healthReports.push(health);
    }

    return healthReports;
  }

  /**
   * Get health status for specific component
   */
  private async getComponentHealthStatus(
    component: string,
  ): Promise<ComponentHealth> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Get recent metrics from database
    const { data: recentMetrics, error } = await this.supabase
      .from('ai_performance_metrics')
      .select('*')
      .eq('component', component)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch component metrics', {
        error,
        component,
      });
      return {
        component,
        status: 'down',
        lastCheck: new Date(),
        metrics: {
          avgResponseTime: 0,
          errorRate: 100,
          tokensUsed: 0,
          totalCost: 0,
          successRate: 0,
          requestCount: 0,
        },
        issues: ['Failed to fetch metrics from database'],
      };
    }

    const metrics = recentMetrics || [];
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter((m) => m.success).length;
    const avgResponseTime =
      totalRequests > 0
        ? metrics.reduce((sum, m) => sum + (m.duration_ms || 0), 0) /
          totalRequests
        : 0;
    const errorRate =
      totalRequests > 0
        ? ((totalRequests - successfulRequests) / totalRequests) * 100
        : 0;
    const tokensUsed = metrics.reduce(
      (sum, m) => sum + (m.tokens_used || 0),
      0,
    );
    const totalCost = metrics.reduce((sum, m) => sum + (m.cost_cents || 0), 0);
    const successRate =
      totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;

    // Determine health status
    const thresholds = this.alertThresholds[component];
    const issues: string[] = [];
    let status: ComponentHealth['status'] = 'healthy';

    if (avgResponseTime > thresholds.maxResponseTime) {
      issues.push(
        `High response time: ${avgResponseTime.toFixed(0)}ms (threshold: ${thresholds.maxResponseTime}ms)`,
      );
      status = 'warning';
    }

    if (errorRate > thresholds.maxErrorRate) {
      issues.push(
        `High error rate: ${errorRate.toFixed(1)}% (threshold: ${thresholds.maxErrorRate}%)`,
      );
      status = 'critical';
    }

    if (successRate < thresholds.minSuccessRate) {
      issues.push(
        `Low success rate: ${successRate.toFixed(1)}% (threshold: ${thresholds.minSuccessRate}%)`,
      );
      status = 'critical';
    }

    if (tokensUsed > thresholds.maxTokensPerHour) {
      issues.push(
        `High token usage: ${tokensUsed} (threshold: ${thresholds.maxTokensPerHour})`,
      );
      if (status === 'healthy') status = 'warning';
    }

    if (totalCost > thresholds.maxCostPerHour) {
      issues.push(
        `High cost: $${(totalCost / 100).toFixed(2)} (threshold: $${thresholds.maxCostPerHour / 100})`,
      );
      if (status === 'healthy') status = 'warning';
    }

    if (totalRequests === 0) {
      issues.push('No recent activity detected');
      status = 'warning';
    }

    return {
      component,
      status,
      lastCheck: new Date(),
      metrics: {
        avgResponseTime,
        errorRate,
        tokensUsed,
        totalCost,
        successRate,
        requestCount: totalRequests,
      },
      issues,
    };
  }

  /**
   * Check alert conditions for component
   */
  private async checkAlertConditions(component: string): Promise<void> {
    const health = await this.getComponentHealthStatus(component);

    if (health.status === 'critical' || health.status === 'down') {
      await this.triggerAlert(component, health);
    }
  }

  /**
   * Trigger alert for component issues
   */
  private async triggerAlert(
    component: string,
    health: ComponentHealth,
  ): Promise<void> {
    const alert = {
      type: 'ai_performance_alert',
      severity: health.status === 'down' ? 'critical' : 'warning',
      component,
      message: `AI Component ${component} is ${health.status}`,
      details: {
        issues: health.issues,
        metrics: health.metrics,
        timestamp: new Date().toISOString(),
      },
    };

    // Store alert in database
    const { error } = await this.supabase.from('system_alerts').insert([
      {
        type: alert.type,
        severity: alert.severity,
        component: alert.component,
        message: alert.message,
        details: alert.details,
        created_at: new Date().toISOString(),
        resolved: false,
      },
    ]);

    if (error) {
      this.logger.error('Failed to create alert', { error, alert });
    } else {
      this.logger.warn('AI Performance Alert Triggered', alert);
    }

    // In production, this would also:
    // - Send Slack/email notifications
    // - Create PagerDuty incidents
    // - Update monitoring dashboards
  }

  /**
   * Get performance trends for component over time
   */
  async getPerformanceTrends(
    component: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
  ): Promise<{
    timestamps: string[];
    responseTimes: number[];
    errorRates: number[];
    successRates: number[];
    costs: number[];
    tokenUsage: number[];
  }> {
    const timeRangeHours = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
    }[timeRange];

    const startTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    const { data: metrics, error } = await this.supabase
      .from('ai_performance_metrics')
      .select('*')
      .eq('component', component)
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error('Failed to fetch performance trends', {
        error,
        component,
      });
      return {
        timestamps: [],
        responseTimes: [],
        errorRates: [],
        successRates: [],
        costs: [],
        tokenUsage: [],
      };
    }

    // Group metrics by time buckets for trend analysis
    const bucketSize = Math.max(1, Math.floor(timeRangeHours / 50)); // ~50 data points
    const buckets = new Map<string, any[]>();

    (metrics || []).forEach((metric) => {
      const timestamp = new Date(metric.created_at);
      const bucketKey = new Date(
        Math.floor(timestamp.getTime() / (bucketSize * 60 * 60 * 1000)) *
          (bucketSize * 60 * 60 * 1000),
      ).toISOString();

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(metric);
    });

    const timestamps: string[] = [];
    const responseTimes: number[] = [];
    const errorRates: number[] = [];
    const successRates: number[] = [];
    const costs: number[] = [];
    const tokenUsage: number[] = [];

    Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([timestamp, bucketMetrics]) => {
        const totalRequests = bucketMetrics.length;
        const successfulRequests = bucketMetrics.filter(
          (m) => m.success,
        ).length;
        const avgResponseTime =
          bucketMetrics.reduce((sum, m) => sum + (m.duration_ms || 0), 0) /
          totalRequests;
        const errorRate =
          ((totalRequests - successfulRequests) / totalRequests) * 100;
        const successRate = (successfulRequests / totalRequests) * 100;
        const totalCost = bucketMetrics.reduce(
          (sum, m) => sum + (m.cost_cents || 0),
          0,
        );
        const totalTokens = bucketMetrics.reduce(
          (sum, m) => sum + (m.tokens_used || 0),
          0,
        );

        timestamps.push(timestamp);
        responseTimes.push(avgResponseTime);
        errorRates.push(errorRate);
        successRates.push(successRate);
        costs.push(totalCost);
        tokenUsage.push(totalTokens);
      });

    return {
      timestamps,
      responseTimes,
      errorRates,
      successRates,
      costs,
      tokenUsage,
    };
  }

  /**
   * Get cost analysis and budget tracking
   */
  async getCostAnalysis(
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
  ): Promise<{
    totalCost: number;
    costByComponent: Record<string, number>;
    costByTier: Record<string, number>;
    projectedMonthlyCost: number;
    budgetUtilization: number;
    topCostDrivers: Array<{
      component: string;
      operation: string;
      cost: number;
      count: number;
    }>;
  }> {
    const timeRangeHours = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
    }[timeRange];

    const startTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    const { data: metrics, error } = await this.supabase
      .from('ai_performance_metrics')
      .select('component, operation, cost_cents, tier, created_at')
      .gte('created_at', startTime.toISOString());

    if (error) {
      this.logger.error('Failed to fetch cost analysis data', { error });
      return {
        totalCost: 0,
        costByComponent: {},
        costByTier: {},
        projectedMonthlyCost: 0,
        budgetUtilization: 0,
        topCostDrivers: [],
      };
    }

    const costs = (metrics || []).map((m) => m.cost_cents || 0);
    const totalCost = costs.reduce((sum, cost) => sum + cost, 0);

    // Cost by component
    const costByComponent: Record<string, number> = {};
    const costByTier: Record<string, number> = {};
    const operationCosts = new Map<string, { cost: number; count: number }>();

    (metrics || []).forEach((metric) => {
      const cost = metric.cost_cents || 0;

      // By component
      costByComponent[metric.component] =
        (costByComponent[metric.component] || 0) + cost;

      // By tier
      costByTier[metric.tier] = (costByTier[metric.tier] || 0) + cost;

      // By operation
      const key = `${metric.component}:${metric.operation}`;
      const existing = operationCosts.get(key) || { cost: 0, count: 0 };
      operationCosts.set(key, {
        cost: existing.cost + cost,
        count: existing.count + 1,
      });
    });

    // Project monthly cost based on current usage
    const hoursInMonth = 24 * 30;
    const projectedMonthlyCost = (totalCost / timeRangeHours) * hoursInMonth;

    // Calculate budget utilization (assuming $100/month budget)
    const monthlyBudget = 10000; // 10000 cents = $100
    const budgetUtilization = (projectedMonthlyCost / monthlyBudget) * 100;

    // Top cost drivers
    const topCostDrivers = Array.from(operationCosts.entries())
      .map(([key, data]) => {
        const [component, operation] = key.split(':');
        return {
          component,
          operation,
          cost: data.cost,
          count: data.count,
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    return {
      totalCost,
      costByComponent,
      costByTier,
      projectedMonthlyCost,
      budgetUtilization,
      topCostDrivers,
    };
  }

  /**
   * Wedding industry specific monitoring
   */
  async getWeddingSeasonalMetrics(): Promise<{
    peakSeasonPerformance: ComponentHealth[];
    shoulderSeasonPerformance: ComponentHealth[];
    offSeasonPerformance: ComponentHealth[];
    weddingDayAlerts: Array<{
      date: string;
      component: string;
      issue: string;
      impact: 'low' | 'medium' | 'high' | 'critical';
    }>;
  }> {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const isPeakSeason = currentMonth >= 5 && currentMonth <= 10; // May-October
    const isShoulderSeason = [4, 11].includes(currentMonth); // April, November

    // Get Saturday performance metrics (wedding days)
    const saturdayMetrics = await this.getWeddingDayPerformance();

    return {
      peakSeasonPerformance: isPeakSeason
        ? await this.getComponentHealth()
        : [],
      shoulderSeasonPerformance: isShoulderSeason
        ? await this.getComponentHealth()
        : [],
      offSeasonPerformance:
        !isPeakSeason && !isShoulderSeason
          ? await this.getComponentHealth()
          : [],
      weddingDayAlerts: saturdayMetrics,
    };
  }

  /**
   * Get performance metrics specifically for Saturdays (wedding days)
   */
  private async getWeddingDayPerformance(): Promise<
    Array<{
      date: string;
      component: string;
      issue: string;
      impact: 'low' | 'medium' | 'high' | 'critical';
    }>
  > {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: metrics, error } = await this.supabase
      .from('ai_performance_metrics')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch wedding day performance', { error });
      return [];
    }

    const weddingDayAlerts: Array<{
      date: string;
      component: string;
      issue: string;
      impact: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    // Filter for Saturdays and analyze performance
    (metrics || []).forEach((metric) => {
      const metricDate = new Date(metric.created_at);
      const isSaturday = metricDate.getDay() === 6;

      if (isSaturday) {
        const responseTime = metric.duration_ms || 0;
        const thresholds = this.alertThresholds[metric.component];

        if (!metric.success) {
          weddingDayAlerts.push({
            date: metricDate.toISOString().split('T')[0],
            component: metric.component,
            issue: `Failed operation: ${metric.operation}`,
            impact: 'critical',
          });
        } else if (responseTime > thresholds.maxResponseTime * 1.5) {
          weddingDayAlerts.push({
            date: metricDate.toISOString().split('T')[0],
            component: metric.component,
            issue: `Very slow response: ${responseTime}ms`,
            impact: 'high',
          });
        } else if (responseTime > thresholds.maxResponseTime) {
          weddingDayAlerts.push({
            date: metricDate.toISOString().split('T')[0],
            component: metric.component,
            issue: `Slow response: ${responseTime}ms`,
            impact: 'medium',
          });
        }
      }
    });

    return weddingDayAlerts.slice(0, 50); // Limit to recent 50 alerts
  }
}
