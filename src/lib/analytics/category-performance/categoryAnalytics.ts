/**
 * WS-158: Advanced Category Analytics and Performance Tracking
 * Provides deep insights into category usage and optimization
 */

import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const redis = Redis.fromEnv();

// Analytics schemas
const CategoryMetricsSchema = z.object({
  categoryId: z.string(),
  period: z.enum(['hour', 'day', 'week', 'month']),
  metrics: z.object({
    totalTasks: z.number(),
    completedTasks: z.number(),
    averageCompletionTime: z.number(),
    helperUtilization: z.number(),
    reassignmentRate: z.number(),
    accuracyScore: z.number(),
    performanceScore: z.number(),
  }),
  insights: z.array(
    z.object({
      type: z.enum(['optimization', 'warning', 'success']),
      message: z.string(),
      impact: z.enum(['high', 'medium', 'low']),
      recommendation: z.string().optional(),
    }),
  ),
  timestamp: z.string(),
});

const CategoryTrendSchema = z.object({
  categoryId: z.string(),
  trendData: z.array(
    z.object({
      date: z.string(),
      value: z.number(),
      metric: z.string(),
    }),
  ),
  prediction: z.object({
    nextPeriod: z.number(),
    confidence: z.number(),
    factors: z.array(z.string()),
  }),
});

export type CategoryMetrics = z.infer<typeof CategoryMetricsSchema>;
export type CategoryTrend = z.infer<typeof CategoryTrendSchema>;

/**
 * Category Analytics Engine
 */
export class CategoryAnalyticsEngine {
  private metricsCache = new Map<string, CategoryMetrics>();
  private cacheDuration = 300; // 5 minutes

  /**
   * Calculate real-time category metrics
   */
  async calculateCategoryMetrics(
    categoryId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day',
  ): Promise<CategoryMetrics> {
    const cacheKey = `${categoryId}:${period}`;

    // Check memory cache first
    if (this.metricsCache.has(cacheKey)) {
      const cached = this.metricsCache.get(cacheKey)!;
      const age = Date.now() - new Date(cached.timestamp).getTime();
      if (age < this.cacheDuration * 1000) {
        return cached;
      }
    }

    // Calculate fresh metrics
    const startDate = this.getStartDate(period);

    // Fetch task data
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('category_id', categoryId)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Calculate core metrics
    const totalTasks = tasks?.length || 0;
    const completedTasks =
      tasks?.filter((t) => t.status === 'completed').length || 0;

    const completionTimes = tasks
      ?.filter((t) => t.completed_at)
      .map(
        (t) =>
          new Date(t.completed_at).getTime() - new Date(t.created_at).getTime(),
      );

    const averageCompletionTime = completionTimes?.length
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    // Calculate helper utilization
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('helper_id, task_id')
      .in('task_id', tasks?.map((t) => t.id) || []);

    const uniqueHelpers = new Set(assignments?.map((a) => a.helper_id)).size;
    const helperUtilization = totalTasks > 0 ? uniqueHelpers / totalTasks : 0;

    // Calculate reassignment rate
    const reassignedTasks =
      tasks?.filter((t) => t.reassignment_count > 0).length || 0;
    const reassignmentRate = totalTasks > 0 ? reassignedTasks / totalTasks : 0;

    // Calculate accuracy score (based on AI suggestions vs actual)
    const accuracyScore = await this.calculateAccuracyScore(categoryId, period);

    // Calculate overall performance score
    const performanceScore = this.calculatePerformanceScore({
      completionRate: completedTasks / (totalTasks || 1),
      averageCompletionTime,
      reassignmentRate,
      helperUtilization,
      accuracyScore,
    });

    // Generate insights
    const insights = this.generateInsights({
      totalTasks,
      completedTasks,
      averageCompletionTime,
      helperUtilization,
      reassignmentRate,
      accuracyScore,
      performanceScore,
    });

    const metrics: CategoryMetrics = {
      categoryId,
      period,
      metrics: {
        totalTasks,
        completedTasks,
        averageCompletionTime,
        helperUtilization,
        reassignmentRate,
        accuracyScore,
        performanceScore,
      },
      insights,
      timestamp: new Date().toISOString(),
    };

    // Cache the results
    this.metricsCache.set(cacheKey, metrics);
    await this.cacheInRedis(cacheKey, metrics);

    // Store in database for historical tracking
    await this.storeMetrics(metrics);

    return metrics;
  }

  /**
   * Analyze category trends and predict future patterns
   */
  async analyzeCategoryTrends(
    categoryId: string,
    metric: 'tasks' | 'completion' | 'performance' = 'tasks',
  ): Promise<CategoryTrend> {
    // Fetch historical data
    const { data: historicalData } = await supabase
      .from('category_performance_metrics')
      .select('*')
      .eq('category_id', categoryId)
      .order('timestamp', { ascending: true })
      .limit(30);

    if (!historicalData || historicalData.length === 0) {
      return {
        categoryId,
        trendData: [],
        prediction: {
          nextPeriod: 0,
          confidence: 0,
          factors: ['Insufficient data'],
        },
      };
    }

    // Process trend data
    const trendData = historicalData.map((d) => ({
      date: d.timestamp,
      value: this.getMetricValue(d, metric),
      metric,
    }));

    // Calculate prediction using simple linear regression
    const prediction = this.predictNextValue(trendData);

    return {
      categoryId,
      trendData,
      prediction,
    };
  }

  /**
   * Get comparative analytics across all categories
   */
  async getComparativeAnalytics(): Promise<{
    rankings: Array<{
      categoryId: string;
      name: string;
      score: number;
      rank: number;
    }>;
    recommendations: string[];
  }> {
    const categories = [
      'setup',
      'ceremony',
      'reception',
      'breakdown',
      'coordination',
      'vendor',
    ];
    const metricsPromises = categories.map((cat) =>
      this.calculateCategoryMetrics(cat, 'week'),
    );
    const allMetrics = await Promise.all(metricsPromises);

    // Rank categories by performance
    const rankings = allMetrics
      .map((m) => ({
        categoryId: m.categoryId,
        name: this.getCategoryName(m.categoryId),
        score: m.metrics.performanceScore,
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // Generate recommendations
    const recommendations = this.generateGlobalRecommendations(allMetrics);

    return { rankings, recommendations };
  }

  /**
   * Calculate category balancing recommendations
   */
  async getBalancingRecommendations(
    currentDistribution: Record<string, number>,
  ): Promise<{
    recommendations: Array<{
      from: string;
      to: string;
      count: number;
      reason: string;
    }>;
    optimalDistribution: Record<string, number>;
  }> {
    const total = Object.values(currentDistribution).reduce((a, b) => a + b, 0);

    // Calculate optimal distribution based on wedding flow
    const optimalDistribution = {
      setup: Math.round(total * 0.25),
      ceremony: Math.round(total * 0.15),
      reception: Math.round(total * 0.3),
      breakdown: Math.round(total * 0.15),
      coordination: Math.round(total * 0.1),
      vendor: Math.round(total * 0.05),
    };

    const recommendations: Array<{
      from: string;
      to: string;
      count: number;
      reason: string;
    }> = [];

    // Find imbalances
    for (const [category, current] of Object.entries(currentDistribution)) {
      const optimal =
        optimalDistribution[category as keyof typeof optimalDistribution] || 0;
      const diff = current - optimal;

      if (Math.abs(diff) > total * 0.05) {
        // More than 5% off
        if (diff > 0) {
          // Too many tasks in this category
          const targetCategory = this.findUnderutilizedCategory(
            currentDistribution,
            optimalDistribution,
          );
          if (targetCategory) {
            recommendations.push({
              from: category,
              to: targetCategory,
              count: Math.min(Math.abs(diff), 5),
              reason: `${category} is overloaded (${current} vs optimal ${optimal})`,
            });
          }
        }
      }
    }

    return { recommendations, optimalDistribution };
  }

  /**
   * Helper method to get period start date
   */
  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Calculate accuracy score for AI predictions
   */
  private async calculateAccuracyScore(
    categoryId: string,
    period: string,
  ): Promise<number> {
    const startDate = this.getStartDate(period);

    const { data: predictions } = await supabase
      .from('ai_category_predictions')
      .select('predicted_category, actual_category, confidence')
      .gte('created_at', startDate.toISOString());

    if (!predictions || predictions.length === 0) return 0.5;

    const correct = predictions.filter(
      (p) => p.predicted_category === p.actual_category,
    );
    const weightedScore =
      correct.reduce((acc, p) => acc + p.confidence, 0) / predictions.length;

    return Math.min(weightedScore, 1);
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(metrics: {
    completionRate: number;
    averageCompletionTime: number;
    reassignmentRate: number;
    helperUtilization: number;
    accuracyScore: number;
  }): number {
    const weights = {
      completionRate: 0.3,
      timeEfficiency: 0.2,
      reassignmentRate: 0.2,
      helperUtilization: 0.15,
      accuracyScore: 0.15,
    };

    // Normalize time efficiency (faster is better)
    const targetTime = 2 * 60 * 60 * 1000; // 2 hours target
    const timeEfficiency = Math.min(
      targetTime / (metrics.averageCompletionTime || targetTime),
      1,
    );

    const score =
      metrics.completionRate * weights.completionRate +
      timeEfficiency * weights.timeEfficiency +
      (1 - metrics.reassignmentRate) * weights.reassignmentRate +
      metrics.helperUtilization * weights.helperUtilization +
      metrics.accuracyScore * weights.accuracyScore;

    return Math.round(score * 100) / 100;
  }

  /**
   * Generate insights based on metrics
   */
  private generateInsights(metrics: any): any[] {
    const insights = [];

    // Completion rate insights
    if (metrics.completionRate < 0.7) {
      insights.push({
        type: 'warning',
        message: 'Low task completion rate detected',
        impact: 'high',
        recommendation:
          'Consider reassigning tasks or providing additional helper support',
      });
    } else if (metrics.completionRate > 0.9) {
      insights.push({
        type: 'success',
        message: 'Excellent task completion rate',
        impact: 'high',
      });
    }

    // Reassignment insights
    if (metrics.reassignmentRate > 0.3) {
      insights.push({
        type: 'warning',
        message: 'High reassignment rate indicates initial assignment issues',
        impact: 'medium',
        recommendation: 'Review helper skill matching algorithm',
      });
    }

    // Helper utilization insights
    if (metrics.helperUtilization < 0.5) {
      insights.push({
        type: 'optimization',
        message: 'Helpers are underutilized in this category',
        impact: 'medium',
        recommendation: 'Consolidate tasks or reduce helper count',
      });
    }

    // Performance insights
    if (metrics.performanceScore > 0.8) {
      insights.push({
        type: 'success',
        message: 'Category performing above expectations',
        impact: 'high',
      });
    }

    return insights;
  }

  /**
   * Store metrics in database
   */
  private async storeMetrics(metrics: CategoryMetrics): Promise<void> {
    try {
      await supabase.from('category_performance_metrics').insert({
        category_id: metrics.categoryId,
        period: metrics.period,
        metrics: metrics.metrics,
        insights: metrics.insights,
        timestamp: metrics.timestamp,
      });
    } catch (error) {
      console.error('Failed to store metrics:', error);
    }
  }

  /**
   * Cache metrics in Redis
   */
  private async cacheInRedis(
    key: string,
    metrics: CategoryMetrics,
  ): Promise<void> {
    try {
      await redis.set(`analytics:${key}`, JSON.stringify(metrics), {
        ex: this.cacheDuration,
      });
    } catch (error) {
      console.error('Redis cache error:', error);
    }
  }

  /**
   * Get metric value from data
   */
  private getMetricValue(data: any, metric: string): number {
    switch (metric) {
      case 'tasks':
        return data.metrics?.totalTasks || 0;
      case 'completion':
        return data.metrics?.completedTasks || 0;
      case 'performance':
        return data.metrics?.performanceScore || 0;
      default:
        return 0;
    }
  }

  /**
   * Predict next value using linear regression
   */
  private predictNextValue(trendData: any[]): {
    nextPeriod: number;
    confidence: number;
    factors: string[];
  } {
    if (trendData.length < 3) {
      return {
        nextPeriod: trendData[trendData.length - 1]?.value || 0,
        confidence: 0.3,
        factors: ['Insufficient historical data'],
      };
    }

    // Simple linear regression
    const n = trendData.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = trendData.map((d) => d.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const nextPeriod = slope * n + intercept;

    // Calculate confidence based on trend consistency
    const predictions = x.map((xi) => slope * xi + intercept);
    const errors = predictions.map((pred, i) => Math.abs(pred - y[i]));
    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const avgValue = y.reduce((a, b) => a + b, 0) / y.length;
    const confidence = Math.max(0.3, Math.min(0.9, 1 - avgError / avgValue));

    const factors = [];
    if (slope > 0) factors.push('Upward trend detected');
    if (slope < 0) factors.push('Downward trend detected');
    if (Math.abs(slope) < 0.1) factors.push('Stable pattern');

    return {
      nextPeriod: Math.max(0, Math.round(nextPeriod)),
      confidence: Math.round(confidence * 100) / 100,
      factors,
    };
  }

  /**
   * Get category name from ID
   */
  private getCategoryName(categoryId: string): string {
    const names: Record<string, string> = {
      setup: 'Setup & Preparation',
      ceremony: 'Ceremony',
      reception: 'Reception',
      breakdown: 'Breakdown & Cleanup',
      coordination: 'Coordination',
      vendor: 'Vendor Management',
    };
    return names[categoryId] || categoryId;
  }

  /**
   * Find underutilized category
   */
  private findUnderutilizedCategory(
    current: Record<string, number>,
    optimal: Record<string, number>,
  ): string | null {
    let maxDiff = 0;
    let targetCategory = null;

    for (const [category, optimalCount] of Object.entries(optimal)) {
      const currentCount = current[category] || 0;
      const diff = optimalCount - currentCount;
      if (diff > maxDiff) {
        maxDiff = diff;
        targetCategory = category;
      }
    }

    return targetCategory;
  }

  /**
   * Generate global recommendations
   */
  private generateGlobalRecommendations(
    allMetrics: CategoryMetrics[],
  ): string[] {
    const recommendations: string[] = [];

    // Find categories with low performance
    const lowPerformers = allMetrics.filter(
      (m) => m.metrics.performanceScore < 0.5,
    );
    if (lowPerformers.length > 0) {
      recommendations.push(
        `Focus on improving ${lowPerformers.map((m) => this.getCategoryName(m.categoryId)).join(', ')}`,
      );
    }

    // Check for imbalanced completion rates
    const completionRates = allMetrics.map(
      (m) => m.metrics.completedTasks / (m.metrics.totalTasks || 1),
    );
    const avgCompletion =
      completionRates.reduce((a, b) => a + b, 0) / completionRates.length;
    const variance =
      completionRates.reduce(
        (acc, rate) => acc + Math.pow(rate - avgCompletion, 2),
        0,
      ) / completionRates.length;

    if (variance > 0.1) {
      recommendations.push(
        'Consider rebalancing tasks across categories for more even completion',
      );
    }

    // Check helper utilization
    const avgUtilization =
      allMetrics.reduce((acc, m) => acc + m.metrics.helperUtilization, 0) /
      allMetrics.length;
    if (avgUtilization < 0.6) {
      recommendations.push(
        'Helper resources are underutilized - consider task consolidation',
      );
    }

    return recommendations;
  }
}

// Export singleton instance
export const categoryAnalytics = new CategoryAnalyticsEngine();
