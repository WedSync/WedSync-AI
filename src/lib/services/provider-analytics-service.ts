/**
 * WS-155 Round 2: Provider Analytics Service
 * Team C - Advanced Integration Phase
 *
 * Cross-provider delivery metrics, performance analysis, and optimization recommendations
 */

import { EventEmitter } from 'events';

export interface ProviderMetrics {
  provider: string;
  period: {
    start: Date;
    end: Date;
  };
  volume: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    complained: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    failureRate: number;
    complaintRate: number;
  };
  performance: {
    avgDeliveryTime: number; // milliseconds
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    uptime: number; // percentage
    healthScore: number; // 0-100
  };
  costs: {
    totalCost: number;
    costPerMessage: number;
    costPerDelivered: number;
    costPerEngagement: number;
  };
  recommendations: string[];
}

export interface ComparativeAnalysis {
  providers: string[];
  bestPerformer: {
    overall: string;
    delivery: string;
    engagement: string;
    cost: string;
    reliability: string;
  };
  insights: ProviderInsight[];
  recommendations: OptimizationRecommendation[];
}

export interface ProviderInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
  provider: string;
  metric: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
}

export interface OptimizationRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'routing' | 'timing' | 'content' | 'provider' | 'cost';
  title: string;
  description: string;
  estimatedImpact: {
    metric: string;
    improvement: number; // percentage
    confidence: number; // 0-1
  };
  implementation: string[];
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  provider?: string;
  metric: string;
}

export interface AnalyticsConfig {
  retentionDays: number;
  aggregationIntervals: ('minute' | 'hour' | 'day' | 'week' | 'month')[];
  alertThresholds: {
    deliveryRate: number;
    bounceRate: number;
    complaintRate: number;
    failureRate: number;
  };
  costTracking: boolean;
  performanceTracking: boolean;
}

export class ProviderAnalyticsService extends EventEmitter {
  private metricsStore: Map<string, ProviderMetrics[]> = new Map();
  private timeSeriesData: TimeSeriesData[] = [];
  private config: AnalyticsConfig;
  private aggregationTimer?: NodeJS.Timeout;
  private providerCosts: Map<string, CostStructure> = new Map();

  constructor(config?: Partial<AnalyticsConfig>) {
    super();
    this.config = {
      retentionDays: 90,
      aggregationIntervals: ['hour', 'day', 'week'],
      alertThresholds: {
        deliveryRate: 0.95,
        bounceRate: 0.05,
        complaintRate: 0.001,
        failureRate: 0.02,
      },
      costTracking: true,
      performanceTracking: true,
      ...config,
    };

    this.initializeCostStructures();
    this.startAggregation();
  }

  /**
   * Initialize provider cost structures
   */
  private initializeCostStructures(): void {
    this.providerCosts.set('sendgrid', {
      baseRate: 0.0008,
      tieredRates: [
        { threshold: 100000, rate: 0.00075 },
        { threshold: 500000, rate: 0.0007 },
        { threshold: 1000000, rate: 0.00065 },
      ],
      additionalCosts: {
        dedicated_ip: 80,
        email_validation: 0.001,
      },
    });

    this.providerCosts.set('twilio', {
      baseRate: 0.0075, // SMS rate
      tieredRates: [
        { threshold: 50000, rate: 0.007 },
        { threshold: 200000, rate: 0.0065 },
      ],
      additionalCosts: {
        phone_number: 1.0,
        lookup: 0.005,
      },
    });

    this.providerCosts.set('resend', {
      baseRate: 0.0004,
      tieredRates: [
        { threshold: 100000, rate: 0.00035 },
        { threshold: 1000000, rate: 0.0003 },
      ],
      additionalCosts: {},
    });
  }

  /**
   * Track a communication event
   */
  trackEvent(event: {
    provider: string;
    type:
      | 'sent'
      | 'delivered'
      | 'opened'
      | 'clicked'
      | 'bounced'
      | 'failed'
      | 'complained';
    timestamp: Date;
    messageId: string;
    responseTime?: number;
    cost?: number;
  }): void {
    // Update time series data
    this.timeSeriesData.push({
      timestamp: event.timestamp,
      value: 1,
      provider: event.provider,
      metric: event.type,
    });

    // Update provider metrics
    this.updateProviderMetrics(event);

    // Check for alerts
    this.checkAlertThresholds(event.provider);

    // Clean old data
    this.cleanOldData();
  }

  /**
   * Get provider metrics for a time period
   */
  getProviderMetrics(
    provider: string,
    startDate: Date,
    endDate: Date = new Date(),
  ): ProviderMetrics | null {
    const metrics = this.calculateMetricsForPeriod(
      provider,
      startDate,
      endDate,
    );
    if (!metrics) return null;

    // Add recommendations based on metrics
    metrics.recommendations = this.generateProviderRecommendations(metrics);

    return metrics;
  }

  /**
   * Get comparative analysis across providers
   */
  getComparativeAnalysis(
    providers: string[],
    startDate: Date,
    endDate: Date = new Date(),
  ): ComparativeAnalysis {
    const providerMetrics = providers
      .map((p) => this.getProviderMetrics(p, startDate, endDate))
      .filter(Boolean) as ProviderMetrics[];

    const analysis: ComparativeAnalysis = {
      providers,
      bestPerformer: this.identifyBestPerformers(providerMetrics),
      insights: this.generateComparativeInsights(providerMetrics),
      recommendations:
        this.generateOptimizationRecommendations(providerMetrics),
    };

    return analysis;
  }

  /**
   * Get time series data for visualization
   */
  getTimeSeries(
    metric: string,
    provider?: string,
    startDate?: Date,
    endDate: Date = new Date(),
    interval: 'minute' | 'hour' | 'day' = 'hour',
  ): TimeSeriesData[] {
    let data = this.timeSeriesData.filter((d) => {
      const matchesMetric = d.metric === metric;
      const matchesProvider = !provider || d.provider === provider;
      const matchesDateRange =
        (!startDate || d.timestamp >= startDate) && d.timestamp <= endDate;
      return matchesMetric && matchesProvider && matchesDateRange;
    });

    return this.aggregateTimeSeries(data, interval);
  }

  /**
   * Calculate provider health score
   */
  calculateHealthScore(metrics: ProviderMetrics): number {
    const weights = {
      deliveryRate: 0.3,
      openRate: 0.2,
      clickRate: 0.15,
      bounceRate: 0.15,
      failureRate: 0.1,
      complaintRate: 0.05,
      uptime: 0.05,
    };

    let score = 0;

    // Positive metrics (higher is better)
    score += metrics.rates.deliveryRate * weights.deliveryRate * 100;
    score += Math.min(metrics.rates.openRate / 0.3, 1) * weights.openRate * 100; // Normalize to 30% max
    score +=
      Math.min(metrics.rates.clickRate / 0.1, 1) * weights.clickRate * 100; // Normalize to 10% max

    // Negative metrics (lower is better)
    score +=
      (1 - Math.min(metrics.rates.bounceRate / 0.1, 1)) *
      weights.bounceRate *
      100;
    score +=
      (1 - Math.min(metrics.rates.failureRate / 0.05, 1)) *
      weights.failureRate *
      100;
    score +=
      (1 - Math.min(metrics.rates.complaintRate / 0.01, 1)) *
      weights.complaintRate *
      100;

    // Uptime
    score += (metrics.performance.uptime / 100) * weights.uptime * 100;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Get cost analysis
   */
  getCostAnalysis(
    provider: string,
    volume: number,
    includeProjections: boolean = false,
  ): CostAnalysis {
    const costStructure = this.providerCosts.get(provider);
    if (!costStructure) {
      throw new Error(`Cost structure not defined for provider: ${provider}`);
    }

    const currentCost = this.calculateCost(costStructure, volume);
    const analysis: CostAnalysis = {
      provider,
      volume,
      totalCost: currentCost.total,
      breakdown: currentCost.breakdown,
      effectiveRate: currentCost.total / volume,
      savings: [],
    };

    if (includeProjections) {
      // Calculate potential savings at different volumes
      const projections = [volume * 1.5, volume * 2, volume * 5];

      for (const projectedVolume of projections) {
        const projectedCost = this.calculateCost(
          costStructure,
          projectedVolume,
        );
        const projectedRate = projectedCost.total / projectedVolume;
        const savings =
          (analysis.effectiveRate - projectedRate) * projectedVolume;

        if (savings > 0) {
          analysis.savings.push({
            volume: projectedVolume,
            totalCost: projectedCost.total,
            effectiveRate: projectedRate,
            savingsAmount: savings,
            savingsPercent: (savings / projectedCost.total) * 100,
          });
        }
      }
    }

    return analysis;
  }

  /**
   * Calculate metrics for a time period
   */
  private calculateMetricsForPeriod(
    provider: string,
    startDate: Date,
    endDate: Date,
  ): ProviderMetrics | null {
    const events = this.timeSeriesData.filter(
      (d) =>
        d.provider === provider &&
        d.timestamp >= startDate &&
        d.timestamp <= endDate,
    );

    if (events.length === 0) return null;

    const volume = {
      sent: events.filter((e) => e.metric === 'sent').length,
      delivered: events.filter((e) => e.metric === 'delivered').length,
      opened: events.filter((e) => e.metric === 'opened').length,
      clicked: events.filter((e) => e.metric === 'clicked').length,
      bounced: events.filter((e) => e.metric === 'bounced').length,
      failed: events.filter((e) => e.metric === 'failed').length,
      complained: events.filter((e) => e.metric === 'complained').length,
    };

    const sent = Math.max(volume.sent, 1); // Avoid division by zero

    const rates = {
      deliveryRate: volume.delivered / sent,
      openRate: volume.opened / volume.delivered || 0,
      clickRate: volume.clicked / volume.opened || 0,
      bounceRate: volume.bounced / sent,
      failureRate: volume.failed / sent,
      complaintRate: volume.complained / volume.delivered || 0,
    };

    // Calculate performance metrics (simplified for this example)
    const performance = {
      avgDeliveryTime: 2500, // Would calculate from actual data
      avgResponseTime: 1500,
      p95ResponseTime: 3000,
      p99ResponseTime: 5000,
      uptime: 99.9,
      healthScore: 0,
    };

    const metrics: ProviderMetrics = {
      provider,
      period: { start: startDate, end: endDate },
      volume,
      rates,
      performance,
      costs: this.calculateProviderCosts(provider, volume.sent),
      recommendations: [],
    };

    metrics.performance.healthScore = this.calculateHealthScore(metrics);

    return metrics;
  }

  /**
   * Update provider metrics with new event
   */
  private updateProviderMetrics(event: any): void {
    if (!this.metricsStore.has(event.provider)) {
      this.metricsStore.set(event.provider, []);
    }

    // Update current hour metrics
    const now = new Date();
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);

    let hourMetrics = this.metricsStore
      .get(event.provider)!
      .find((m) => m.period.start.getTime() === hourStart.getTime());

    if (!hourMetrics) {
      hourMetrics = this.calculateMetricsForPeriod(
        event.provider,
        hourStart,
        new Date(hourStart.getTime() + 60 * 60 * 1000),
      )!;
      this.metricsStore.get(event.provider)!.push(hourMetrics);
    }
  }

  /**
   * Calculate provider costs
   */
  private calculateProviderCosts(
    provider: string,
    volume: number,
  ): ProviderMetrics['costs'] {
    const costStructure = this.providerCosts.get(provider);
    if (!costStructure) {
      return {
        totalCost: 0,
        costPerMessage: 0,
        costPerDelivered: 0,
        costPerEngagement: 0,
      };
    }

    const cost = this.calculateCost(costStructure, volume);

    return {
      totalCost: cost.total,
      costPerMessage: cost.total / Math.max(volume, 1),
      costPerDelivered: cost.total / Math.max(volume * 0.95, 1), // Assume 95% delivery
      costPerEngagement: cost.total / Math.max(volume * 0.25, 1), // Assume 25% engagement
    };
  }

  /**
   * Calculate cost based on structure
   */
  private calculateCost(
    structure: CostStructure,
    volume: number,
  ): {
    total: number;
    breakdown: Record<string, number>;
  } {
    let rate = structure.baseRate;

    // Apply tiered pricing
    for (const tier of structure.tieredRates) {
      if (volume >= tier.threshold) {
        rate = tier.rate;
      }
    }

    const messageCost = volume * rate;
    const additionalCosts = Object.values(structure.additionalCosts).reduce(
      (sum, cost) => sum + cost,
      0,
    );

    return {
      total: messageCost + additionalCosts,
      breakdown: {
        messages: messageCost,
        ...structure.additionalCosts,
      },
    };
  }

  /**
   * Identify best performers across metrics
   */
  private identifyBestPerformers(
    metrics: ProviderMetrics[],
  ): ComparativeAnalysis['bestPerformer'] {
    const bestPerformer = {
      overall: '',
      delivery: '',
      engagement: '',
      cost: '',
      reliability: '',
    };

    if (metrics.length === 0) return bestPerformer;

    // Overall best (highest health score)
    bestPerformer.overall = metrics.reduce((best, m) =>
      m.performance.healthScore > (best?.performance.healthScore || 0)
        ? m
        : best,
    ).provider;

    // Best delivery rate
    bestPerformer.delivery = metrics.reduce((best, m) =>
      m.rates.deliveryRate > (best?.rates.deliveryRate || 0) ? m : best,
    ).provider;

    // Best engagement (combined open + click rate)
    bestPerformer.engagement = metrics.reduce((best, m) => {
      const engagementScore = m.rates.openRate + m.rates.clickRate;
      const bestScore = best ? best.rates.openRate + best.rates.clickRate : 0;
      return engagementScore > bestScore ? m : best;
    }).provider;

    // Best cost efficiency
    bestPerformer.cost = metrics.reduce((best, m) =>
      m.costs.costPerMessage < (best?.costs.costPerMessage || Infinity)
        ? m
        : best,
    ).provider;

    // Best reliability (lowest failure + bounce rate)
    bestPerformer.reliability = metrics.reduce((best, m) => {
      const reliabilityScore = m.rates.failureRate + m.rates.bounceRate;
      const bestScore = best
        ? best.rates.failureRate + best.rates.bounceRate
        : Infinity;
      return reliabilityScore < bestScore ? m : best;
    }).provider;

    return bestPerformer;
  }

  /**
   * Generate comparative insights
   */
  private generateComparativeInsights(
    metrics: ProviderMetrics[],
  ): ProviderInsight[] {
    const insights: ProviderInsight[] = [];
    const avgMetrics = this.calculateAverageMetrics(metrics);

    for (const metric of metrics) {
      // Identify strengths
      if (metric.rates.deliveryRate > avgMetrics.deliveryRate * 1.1) {
        insights.push({
          type: 'strength',
          provider: metric.provider,
          metric: 'delivery_rate',
          description: `${metric.provider} has ${Math.round((metric.rates.deliveryRate - avgMetrics.deliveryRate) * 100)}% better delivery rate than average`,
          impact: 'high',
          actionable: true,
        });
      }

      // Identify weaknesses
      if (metric.rates.bounceRate > avgMetrics.bounceRate * 1.5) {
        insights.push({
          type: 'weakness',
          provider: metric.provider,
          metric: 'bounce_rate',
          description: `${metric.provider} has ${Math.round((metric.rates.bounceRate / avgMetrics.bounceRate - 1) * 100)}% higher bounce rate than average`,
          impact: 'medium',
          actionable: true,
        });
      }

      // Identify opportunities
      if (metric.costs.costPerMessage < avgMetrics.costPerMessage * 0.8) {
        insights.push({
          type: 'opportunity',
          provider: metric.provider,
          metric: 'cost',
          description: `Increase volume with ${metric.provider} to save ${Math.round((1 - metric.costs.costPerMessage / avgMetrics.costPerMessage) * 100)}% on costs`,
          impact: 'medium',
          actionable: true,
        });
      }

      // Identify threats
      if (
        metric.rates.complaintRate > this.config.alertThresholds.complaintRate
      ) {
        insights.push({
          type: 'threat',
          provider: metric.provider,
          metric: 'complaint_rate',
          description: `${metric.provider} complaint rate exceeds threshold - risk of deliverability issues`,
          impact: 'high',
          actionable: true,
        });
      }
    }

    return insights;
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    metrics: ProviderMetrics[],
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const bestPerformers = this.identifyBestPerformers(metrics);

    // Routing optimization
    if (bestPerformers.delivery !== bestPerformers.cost) {
      recommendations.push({
        priority: 'medium',
        type: 'routing',
        title: 'Implement Smart Routing',
        description: `Route high-priority messages through ${bestPerformers.delivery} and bulk messages through ${bestPerformers.cost}`,
        estimatedImpact: {
          metric: 'cost_reduction',
          improvement: 15,
          confidence: 0.8,
        },
        implementation: [
          'Configure routing rules based on message priority',
          'Set up failover from primary to secondary provider',
          'Monitor and adjust thresholds weekly',
        ],
      });
    }

    // Timing optimization
    const avgOpenRate =
      metrics.reduce((sum, m) => sum + m.rates.openRate, 0) / metrics.length;
    if (avgOpenRate < 0.25) {
      recommendations.push({
        priority: 'high',
        type: 'timing',
        title: 'Optimize Send Times',
        description:
          'Implement AI-powered send time optimization to improve engagement rates',
        estimatedImpact: {
          metric: 'open_rate',
          improvement: 30,
          confidence: 0.75,
        },
        implementation: [
          'Analyze historical engagement patterns',
          'Implement time zone adjustments',
          'Test different send times per guest segment',
        ],
      });
    }

    // Provider optimization
    const underperformers = metrics.filter(
      (m) => m.performance.healthScore < 70,
    );
    for (const provider of underperformers) {
      recommendations.push({
        priority: 'high',
        type: 'provider',
        title: `Review ${provider.provider} Configuration`,
        description: `${provider.provider} health score is ${provider.performance.healthScore}/100 - review configuration and consider alternatives`,
        estimatedImpact: {
          metric: 'health_score',
          improvement: 20,
          confidence: 0.7,
        },
        implementation: [
          `Audit ${provider.provider} account settings`,
          'Review IP reputation and domain configuration',
          'Consider migration to better performing provider',
        ],
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate provider-specific recommendations
   */
  private generateProviderRecommendations(metrics: ProviderMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.rates.deliveryRate < 0.95) {
      recommendations.push(
        'Improve delivery rate: Check sender reputation and authentication (SPF, DKIM, DMARC)',
      );
    }

    if (metrics.rates.bounceRate > 0.05) {
      recommendations.push(
        'High bounce rate: Implement email validation and list cleaning',
      );
    }

    if (metrics.rates.complaintRate > 0.001) {
      recommendations.push(
        'Complaint rate warning: Review content and unsubscribe process',
      );
    }

    if (metrics.rates.openRate < 0.2) {
      recommendations.push(
        'Low engagement: Optimize subject lines and send times',
      );
    }

    if (metrics.performance.avgDeliveryTime > 5000) {
      recommendations.push(
        'Slow delivery: Consider upgrading plan or switching providers',
      );
    }

    return recommendations;
  }

  /**
   * Calculate average metrics across providers
   */
  private calculateAverageMetrics(metrics: ProviderMetrics[]): any {
    const count = metrics.length;
    if (count === 0) return {};

    const avg: any = {
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      failureRate: 0,
      complaintRate: 0,
      costPerMessage: 0,
    };

    for (const metric of metrics) {
      avg.deliveryRate += metric.rates.deliveryRate;
      avg.openRate += metric.rates.openRate;
      avg.clickRate += metric.rates.clickRate;
      avg.bounceRate += metric.rates.bounceRate;
      avg.failureRate += metric.rates.failureRate;
      avg.complaintRate += metric.rates.complaintRate;
      avg.costPerMessage += metric.costs.costPerMessage;
    }

    Object.keys(avg).forEach((key) => {
      avg[key] /= count;
    });

    return avg;
  }

  /**
   * Aggregate time series data by interval
   */
  private aggregateTimeSeries(
    data: TimeSeriesData[],
    interval: string,
  ): TimeSeriesData[] {
    const aggregated: Map<number, TimeSeriesData> = new Map();
    const intervalMs = this.getIntervalMs(interval);

    for (const point of data) {
      const bucket =
        Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs;

      if (aggregated.has(bucket)) {
        aggregated.get(bucket)!.value += point.value;
      } else {
        aggregated.set(bucket, {
          timestamp: new Date(bucket),
          value: point.value,
          provider: point.provider,
          metric: point.metric,
        });
      }
    }

    return Array.from(aggregated.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  /**
   * Get interval in milliseconds
   */
  private getIntervalMs(interval: string): number {
    const intervals: Record<string, number> = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    return intervals[interval] || intervals.hour;
  }

  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(provider: string): void {
    const metrics = this.calculateMetricsForPeriod(
      provider,
      new Date(Date.now() - 60 * 60 * 1000), // Last hour
      new Date(),
    );

    if (!metrics) return;

    if (metrics.rates.deliveryRate < this.config.alertThresholds.deliveryRate) {
      this.emit('alert:delivery_rate', {
        provider,
        current: metrics.rates.deliveryRate,
        threshold: this.config.alertThresholds.deliveryRate,
      });
    }

    if (metrics.rates.bounceRate > this.config.alertThresholds.bounceRate) {
      this.emit('alert:bounce_rate', {
        provider,
        current: metrics.rates.bounceRate,
        threshold: this.config.alertThresholds.bounceRate,
      });
    }

    if (
      metrics.rates.complaintRate > this.config.alertThresholds.complaintRate
    ) {
      this.emit('alert:complaint_rate', {
        provider,
        current: metrics.rates.complaintRate,
        threshold: this.config.alertThresholds.complaintRate,
      });
    }
  }

  /**
   * Clean old data based on retention policy
   */
  private cleanOldData(): void {
    const cutoff = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000,
    );

    this.timeSeriesData = this.timeSeriesData.filter(
      (d) => d.timestamp > cutoff,
    );

    for (const [provider, metrics] of this.metricsStore) {
      this.metricsStore.set(
        provider,
        metrics.filter((m) => m.period.end > cutoff),
      );
    }
  }

  /**
   * Start periodic aggregation
   */
  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.emit('aggregation:start');

      for (const interval of this.config.aggregationIntervals) {
        // Aggregate metrics for each provider
        for (const provider of this.metricsStore.keys()) {
          this.aggregateProviderMetrics(provider, interval);
        }
      }

      this.emit('aggregation:complete');
    }, 60 * 1000); // Run every minute
  }

  /**
   * Aggregate provider metrics
   */
  private aggregateProviderMetrics(provider: string, interval: string): void {
    // Implementation would aggregate metrics by interval
    // For brevity, this is simplified
  }

  /**
   * Export analytics data
   */
  exportAnalytics(format: 'json' | 'csv' = 'json'): string {
    const data = {
      providers: Array.from(this.metricsStore.entries()).map(
        ([provider, metrics]) => ({
          provider,
          metrics: metrics[metrics.length - 1] || null,
        }),
      ),
      timeSeries: this.timeSeriesData.slice(-1000), // Last 1000 points
      exportedAt: new Date(),
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV format implementation
      return this.convertToCSV(data);
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    const headers = ['Provider', 'Metric', 'Value', 'Timestamp'];
    const rows: string[] = [headers.join(',')];

    for (const point of data.timeSeries) {
      rows.push(
        [
          point.provider,
          point.metric,
          point.value,
          point.timestamp.toISOString(),
        ].join(','),
      );
    }

    return rows.join('\n');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    this.metricsStore.clear();
    this.timeSeriesData = [];
    this.removeAllListeners();
  }
}

// Type definitions
interface CostStructure {
  baseRate: number;
  tieredRates: Array<{
    threshold: number;
    rate: number;
  }>;
  additionalCosts: Record<string, number>;
}

interface CostAnalysis {
  provider: string;
  volume: number;
  totalCost: number;
  breakdown: Record<string, number>;
  effectiveRate: number;
  savings: Array<{
    volume: number;
    totalCost: number;
    effectiveRate: number;
    savingsAmount: number;
    savingsPercent: number;
  }>;
}
