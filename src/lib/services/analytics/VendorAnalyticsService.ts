/**
 * WS-246: Vendor Performance Analytics Service
 * Team B Round 1: Core performance calculation engine
 *
 * Main service for vendor performance analytics calculations,
 * wedding industry-specific scoring, and trend analysis.
 */

import { createClient } from '@supabase/supabase-js';
import {
  VendorAnalyticsServiceInterface,
  VendorPerformanceMetric,
  VendorPerformanceScore,
  VendorPerformanceBenchmark,
  ScoreCalculationResult,
  TrendAnalysis,
  BenchmarkComparisonResponse,
  VendorRanking,
  DateRange,
  MetricType,
  IndustryCategory,
  TrendDirection,
  ScoringAlgorithmConfig,
  ScoreComponent,
  WeddingSeasonMetrics,
  VendorReliabilityMetrics,
  WeddingDayExecutionMetrics,
} from '@/types/analytics';

export class VendorAnalyticsService implements VendorAnalyticsServiceInterface {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private readonly defaultScoringConfig: ScoringAlgorithmConfig = {
    algorithm_name: 'wedding_industry_v1',
    version: '1.0',
    weights: {
      response_time: 0.2, // 20% - Critical for initial client contact
      booking_conversion: 0.15, // 15% - Revenue impact
      client_satisfaction: 0.25, // 25% - Most important for referrals
      reliability: 0.2, // 20% - Wedding day execution is critical
      communication: 0.1, // 10% - Ongoing relationship management
      delivery: 0.08, // 8% - Timeline adherence
      budget_adherence: 0.02, // 2% - Cost management
    },
    seasonal_adjustments: {
      peak_season_multiplier: 1.2, // Higher expectations in peak season
      weekend_multiplier: 1.1, // Weekends are more demanding
      off_season_multiplier: 0.9, // Lower expectations off-season
    },
    industry_adjustments: {
      photography: 1.0,
      catering: 1.1, // Higher standards for food safety
      venues: 0.95, // Generally more reliable category
      florist: 1.05,
      music: 1.0,
      transportation: 1.15, // Critical timing requirements
      planning: 1.2, // Highest standards for coordination
      decor: 0.9,
      other: 1.0,
    },
    decay_factors: {
      recency_weight: 0.7, // 70% weight to recent 90 days
      sample_size_threshold: 5, // Minimum samples for reliable score
    },
  };

  private readonly weddingSeasons: WeddingSeasonMetrics[] = [
    {
      season_type: 'peak',
      months: [5, 6, 9, 10], // May, June, September, October
      demand_multiplier: 2.0,
      performance_expectations: {
        response_time_hours: 2,
        booking_conversion_rate: 0.35,
        quality_standards: 95,
      },
    },
    {
      season_type: 'high',
      months: [4, 7, 8, 11], // April, July, August, November
      demand_multiplier: 1.5,
      performance_expectations: {
        response_time_hours: 4,
        booking_conversion_rate: 0.3,
        quality_standards: 90,
      },
    },
    {
      season_type: 'shoulder',
      months: [3, 12], // March, December
      demand_multiplier: 1.2,
      performance_expectations: {
        response_time_hours: 8,
        booking_conversion_rate: 0.25,
        quality_standards: 85,
      },
    },
    {
      season_type: 'off',
      months: [1, 2], // January, February
      demand_multiplier: 0.8,
      performance_expectations: {
        response_time_hours: 24,
        booking_conversion_rate: 0.2,
        quality_standards: 80,
      },
    },
  ];

  /**
   * Calculate comprehensive performance score for a vendor
   */
  async calculatePerformanceScore(
    vendorId: string,
    dateRange?: DateRange,
  ): Promise<ScoreCalculationResult> {
    try {
      const defaultDateRange = dateRange || {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        end: new Date().toISOString().split('T')[0],
      };

      // Fetch raw metrics for the vendor
      const { data: metrics, error } = await this.supabase
        .from('vendor_performance_metrics')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte('calculation_date', defaultDateRange.start)
        .lte('calculation_date', defaultDateRange.end)
        .order('calculation_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch metrics: ${error.message}`);
      }

      if (!metrics || metrics.length === 0) {
        throw new Error(
          'No metrics found for the specified vendor and date range',
        );
      }

      // Get vendor information for industry adjustments
      const { data: vendor } = await this.supabase
        .from('organizations')
        .select('vendor_category')
        .eq('id', vendorId)
        .single();

      const industryCategory =
        (vendor?.vendor_category as IndustryCategory) || 'other';

      // Calculate component scores
      const componentScores = await this.calculateComponentScores(
        metrics,
        industryCategory,
      );

      // Apply wedding industry specific adjustments
      const adjustedScores = this.applyWeddingIndustryAdjustments(
        componentScores,
        metrics,
        industryCategory,
      );

      // Calculate overall score
      const overallScore = this.calculateOverallScore(adjustedScores);

      // Assess data quality
      const dataQuality = this.assessDataQuality(metrics, defaultDateRange);

      const result: ScoreCalculationResult = {
        vendor_id: vendorId,
        calculation_date: new Date().toISOString(),
        algorithm_used: this.defaultScoringConfig.algorithm_name,
        component_scores: adjustedScores,
        overall_score: overallScore,
        confidence_level: dataQuality.confidence,
        data_quality_indicators: {
          sample_size: metrics.length,
          data_completeness: dataQuality.completeness,
          temporal_coverage: dataQuality.temporal_coverage,
        },
      };

      return result;
    } catch (error) {
      console.error('Error calculating performance score:', error);
      throw error;
    }
  }

  /**
   * Get historical performance metrics for a vendor
   */
  async getPerformanceHistory(
    vendorId: string,
    metrics: MetricType[],
  ): Promise<VendorPerformanceMetric[]> {
    try {
      const { data, error } = await this.supabase
        .from('vendor_performance_metrics')
        .select('*')
        .eq('vendor_id', vendorId)
        .in('metric_type', metrics)
        .order('calculation_date', { ascending: false })
        .limit(1000); // Reasonable limit for performance

      if (error) {
        throw new Error(
          `Failed to fetch performance history: ${error.message}`,
        );
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching performance history:', error);
      throw error;
    }
  }

  /**
   * Compare vendor performance to industry benchmarks
   */
  async compareToBenchmarks(
    vendorId: string,
    category: IndustryCategory,
  ): Promise<BenchmarkComparisonResponse> {
    try {
      // Get latest vendor scores
      const { data: vendorScore } = await this.supabase
        .from('vendor_performance_scores')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (!vendorScore) {
        throw new Error('No vendor scores found');
      }

      // Get industry benchmarks
      const { data: benchmarks } = await this.supabase
        .from('vendor_performance_benchmarks')
        .select('*')
        .eq('industry_category', category);

      if (!benchmarks) {
        throw new Error('No benchmarks found for industry category');
      }

      const comparisonData = benchmarks.map((benchmark) => {
        const vendorValue = this.getVendorValueForMetric(
          vendorScore,
          benchmark.metric_type,
        );
        const percentileRank = this.calculatePercentileRank(
          vendorValue,
          benchmark.industry_median,
          benchmark.industry_mean,
        );

        return {
          metric_type: benchmark.metric_type,
          vendor_value: vendorValue,
          industry_median: benchmark.industry_median,
          industry_mean: benchmark.industry_mean,
          percentile_rank: percentileRank,
          performance_rating: this.getPerformanceRating(
            vendorValue,
            benchmark,
          ) as any,
        };
      });

      const recommendations = this.generateRecommendations(
        comparisonData,
        category,
      );

      return {
        vendor_id: vendorId,
        industry_category: category,
        geographic_region: 'global', // Could be enhanced with regional data
        comparison_data: comparisonData,
        recommendations,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error comparing to benchmarks:', error);
      throw error;
    }
  }

  /**
   * Generate trend analysis for a specific metric
   */
  async generateTrendAnalysis(
    vendorId: string,
    metric: MetricType,
  ): Promise<TrendAnalysis> {
    try {
      // Get historical data for the past 12 months
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: metrics } = await this.supabase
        .from('vendor_performance_metrics')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('metric_type', metric)
        .gte('calculation_date', oneYearAgo.toISOString().split('T')[0])
        .order('calculation_date', { ascending: true });

      if (!metrics || metrics.length < 3) {
        throw new Error('Insufficient data for trend analysis');
      }

      // Calculate trend direction and strength
      const trendData = this.calculateTrend(metrics);

      // Analyze seasonal patterns
      const seasonalPatterns = this.analyzeSeasonalPatterns(metrics);

      // Generate predictions
      const predictions = this.generatePredictions(metrics, trendData);

      return {
        metric_type: metric,
        trend_direction: trendData.direction,
        trend_strength: trendData.strength,
        seasonal_patterns: seasonalPatterns,
        predictions,
      };
    } catch (error) {
      console.error('Error generating trend analysis:', error);
      throw error;
    }
  }

  /**
   * Get vendor ranking within their industry category
   */
  async getVendorRanking(
    category: IndustryCategory,
    region?: string,
  ): Promise<VendorRanking[]> {
    try {
      let query = this.supabase
        .from('vendor_performance_summary')
        .select('vendor_id, vendor_name, overall_score, vendor_category')
        .eq('vendor_category', category)
        .order('overall_score', { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch vendor rankings: ${error.message}`);
      }

      return (data || []).map((vendor, index) => ({
        vendor_id: vendor.vendor_id,
        vendor_name: vendor.vendor_name,
        overall_score: vendor.overall_score,
        rank: index + 1,
        category,
        region: region || 'global',
      }));
    } catch (error) {
      console.error('Error getting vendor rankings:', error);
      throw error;
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private async calculateComponentScores(
    metrics: VendorPerformanceMetric[],
    industryCategory: IndustryCategory,
  ): Promise<{
    response_score: ScoreComponent;
    booking_score: ScoreComponent;
    satisfaction_score: ScoreComponent;
    reliability_score: ScoreComponent;
    communication_score: ScoreComponent;
    delivery_score: ScoreComponent;
    budget_score: ScoreComponent;
  }> {
    const scoreComponents = {
      response_score: this.calculateScoreComponent(metrics, 'response_time'),
      booking_score: this.calculateScoreComponent(
        metrics,
        'booking_conversion',
      ),
      satisfaction_score: this.calculateScoreComponent(
        metrics,
        'client_satisfaction',
      ),
      reliability_score: this.calculateScoreComponent(
        metrics,
        'reliability_score',
      ),
      communication_score: this.calculateScoreComponent(
        metrics,
        'communication_quality',
      ),
      delivery_score: this.calculateScoreComponent(metrics, 'on_time_delivery'),
      budget_score: this.calculateScoreComponent(metrics, 'budget_adherence'),
    };

    return scoreComponents;
  }

  private calculateScoreComponent(
    metrics: VendorPerformanceMetric[],
    metricType: MetricType,
  ): ScoreComponent {
    const relevantMetrics = metrics.filter((m) => m.metric_type === metricType);

    if (relevantMetrics.length === 0) {
      return {
        raw_score: 0,
        weighted_score: 0,
        contribution_to_overall: 0,
        data_points_used: 0,
        confidence: 0,
        trend: 'stable',
      };
    }

    // Apply recency weighting
    const weightedSum = relevantMetrics.reduce((sum, metric, index) => {
      const recencyWeight = Math.pow(
        this.defaultScoringConfig.decay_factors.recency_weight,
        index,
      );
      return (
        sum + metric.metric_value * recencyWeight * metric.confidence_score
      );
    }, 0);

    const totalWeight = relevantMetrics.reduce((sum, _, index) => {
      const recencyWeight = Math.pow(
        this.defaultScoringConfig.decay_factors.recency_weight,
        index,
      );
      return sum + recencyWeight;
    }, 0);

    const rawScore = weightedSum / totalWeight;
    const weight = this.getMetricWeight(metricType);
    const weightedScore = rawScore * weight;

    // Calculate trend
    const trend = this.calculateSimpleTrend(relevantMetrics);

    // Calculate confidence based on sample size and data quality
    const confidence = Math.min(
      1,
      relevantMetrics.length /
        this.defaultScoringConfig.decay_factors.sample_size_threshold,
    );

    return {
      raw_score: rawScore,
      weighted_score: weightedScore,
      contribution_to_overall: weightedScore * 100, // Percentage contribution
      data_points_used: relevantMetrics.length,
      confidence,
      trend,
    };
  }

  private applyWeddingIndustryAdjustments(
    scores: any,
    metrics: VendorPerformanceMetric[],
    industryCategory: IndustryCategory,
  ): any {
    const industryMultiplier =
      this.defaultScoringConfig.industry_adjustments[industryCategory] || 1.0;

    // Check for peak wedding season performance
    const peakSeasonMetrics = metrics.filter(
      (m) => m.peak_season || m.wedding_season,
    );
    const peakSeasonRatio = peakSeasonMetrics.length / metrics.length;

    let seasonalMultiplier = 1.0;
    if (peakSeasonRatio > 0.5) {
      seasonalMultiplier =
        this.defaultScoringConfig.seasonal_adjustments.peak_season_multiplier;
    } else if (peakSeasonRatio > 0.3) {
      seasonalMultiplier =
        this.defaultScoringConfig.seasonal_adjustments.weekend_multiplier;
    }

    // Apply adjustments to all scores
    Object.keys(scores).forEach((key) => {
      if (scores[key]) {
        scores[key].weighted_score *= industryMultiplier * seasonalMultiplier;
        scores[key].contribution_to_overall = scores[key].weighted_score * 100;
      }
    });

    return scores;
  }

  private calculateOverallScore(scores: any): number {
    const totalWeightedScore = Object.values(scores).reduce(
      (sum: number, score: any) => sum + (score?.weighted_score || 0),
      0,
    );

    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, totalWeightedScore * 100));
  }

  private assessDataQuality(
    metrics: VendorPerformanceMetric[],
    dateRange: DateRange,
  ): { confidence: number; completeness: number; temporal_coverage: number } {
    const daysDifference = Math.ceil(
      (new Date(dateRange.end).getTime() -
        new Date(dateRange.start).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const uniqueDays = new Set(metrics.map((m) => m.calculation_date)).size;
    const temporal_coverage = Math.min(1, uniqueDays / daysDifference);

    const expectedMetricTypes = [
      'response_time',
      'booking_conversion',
      'client_satisfaction',
      'reliability_score',
    ];
    const availableMetricTypes = new Set(metrics.map((m) => m.metric_type));
    const completeness = availableMetricTypes.size / expectedMetricTypes.length;

    const avgConfidence =
      metrics.reduce((sum, m) => sum + m.confidence_score, 0) / metrics.length;

    return {
      confidence: (temporal_coverage + completeness + avgConfidence) / 3,
      completeness,
      temporal_coverage,
    };
  }

  private getMetricWeight(metricType: MetricType): number {
    switch (metricType) {
      case 'response_time':
        return this.defaultScoringConfig.weights.response_time;
      case 'booking_conversion':
        return this.defaultScoringConfig.weights.booking_conversion;
      case 'client_satisfaction':
        return this.defaultScoringConfig.weights.client_satisfaction;
      case 'reliability_score':
        return this.defaultScoringConfig.weights.reliability;
      case 'communication_quality':
        return this.defaultScoringConfig.weights.communication;
      case 'on_time_delivery':
        return this.defaultScoringConfig.weights.delivery;
      case 'budget_adherence':
        return this.defaultScoringConfig.weights.budget_adherence;
      default:
        return 0.1; // Default weight for other metrics
    }
  }

  private calculateSimpleTrend(
    metrics: VendorPerformanceMetric[],
  ): TrendDirection {
    if (metrics.length < 2) return 'stable';

    const recent = metrics.slice(0, Math.ceil(metrics.length / 3));
    const older = metrics.slice(-Math.ceil(metrics.length / 3));

    const recentAvg =
      recent.reduce((sum, m) => sum + m.metric_value, 0) / recent.length;
    const olderAvg =
      older.reduce((sum, m) => sum + m.metric_value, 0) / older.length;

    const difference = (recentAvg - olderAvg) / olderAvg;

    if (difference > 0.05) return 'improving';
    if (difference < -0.05) return 'declining';
    return 'stable';
  }

  private getVendorValueForMetric(
    vendorScore: VendorPerformanceScore,
    metricType: MetricType,
  ): number {
    switch (metricType) {
      case 'response_time':
        return vendorScore.response_score;
      case 'booking_conversion':
        return vendorScore.booking_score;
      case 'client_satisfaction':
        return vendorScore.satisfaction_score;
      case 'reliability_score':
        return vendorScore.reliability_score;
      case 'communication_quality':
        return vendorScore.communication_score;
      case 'on_time_delivery':
        return vendorScore.delivery_score;
      case 'budget_adherence':
        return vendorScore.budget_score;
      default:
        return vendorScore.overall_score;
    }
  }

  private calculatePercentileRank(
    value: number,
    median: number,
    mean: number,
  ): number {
    // Simplified percentile calculation - in production, you'd use more sophisticated statistics
    if (value >= median) {
      return 50 + ((value - median) / (mean - median)) * 25;
    } else {
      return 25 + ((value - median) / (median - mean)) * 25;
    }
  }

  private getPerformanceRating(
    value: number,
    benchmark: VendorPerformanceBenchmark,
  ): 'excellent' | 'good' | 'average' | 'poor' {
    if (value >= benchmark.excellent_threshold) return 'excellent';
    if (value >= benchmark.good_threshold) return 'good';
    if (value >= benchmark.average_threshold) return 'average';
    return 'poor';
  }

  private generateRecommendations(
    comparisonData: any[],
    category: IndustryCategory,
  ): string[] {
    const recommendations: string[] = [];

    comparisonData.forEach((comparison) => {
      if (comparison.performance_rating === 'poor') {
        recommendations.push(
          `Focus on improving ${comparison.metric_type.replace('_', ' ')} - currently ${Math.round(comparison.percentile_rank)}th percentile`,
        );
      }
    });

    if (recommendations.length === 0) {
      recommendations.push(
        'Great work! Continue maintaining your high performance standards.',
      );
    }

    return recommendations;
  }

  private calculateTrend(metrics: VendorPerformanceMetric[]): {
    direction: TrendDirection;
    strength: number;
  } {
    // Simple linear regression to calculate trend
    const dataPoints = metrics.map((m, index) => ({
      x: index,
      y: m.metric_value,
    }));

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0);
    const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0);
    const sumXY = dataPoints.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = dataPoints.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const strength = Math.abs(slope) / Math.max(...dataPoints.map((p) => p.y));

    let direction: TrendDirection = 'stable';
    if (slope > 0.1) direction = 'improving';
    else if (slope < -0.1) direction = 'declining';

    return { direction, strength: Math.min(1, strength) };
  }

  private analyzeSeasonalPatterns(metrics: VendorPerformanceMetric[]): any[] {
    const monthlyData: { [month: number]: number[] } = {};

    metrics.forEach((metric) => {
      const month = new Date(metric.calculation_date).getMonth() + 1;
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(metric.metric_value);
    });

    return Object.entries(monthlyData).map(([month, values]) => ({
      month: parseInt(month),
      average_value: values.reduce((sum, v) => sum + v, 0) / values.length,
      confidence_interval: [Math.min(...values), Math.max(...values)] as [
        number,
        number,
      ],
    }));
  }

  private generatePredictions(
    metrics: VendorPerformanceMetric[],
    trendData: { direction: TrendDirection; strength: number },
  ): { next_30_days: number; next_90_days: number; confidence: number } {
    const recentAvg =
      metrics.slice(0, 10).reduce((sum, m) => sum + m.metric_value, 0) /
      Math.min(10, metrics.length);

    let next30Days = recentAvg;
    let next90Days = recentAvg;

    if (trendData.direction === 'improving') {
      next30Days = recentAvg * (1 + trendData.strength * 0.1);
      next90Days = recentAvg * (1 + trendData.strength * 0.3);
    } else if (trendData.direction === 'declining') {
      next30Days = recentAvg * (1 - trendData.strength * 0.1);
      next90Days = recentAvg * (1 - trendData.strength * 0.3);
    }

    const confidence =
      Math.min(1, metrics.length / 30) * (1 - trendData.strength);

    return {
      next_30_days: next30Days,
      next_90_days: next90Days,
      confidence,
    };
  }
}
