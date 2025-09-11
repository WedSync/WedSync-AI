/**
 * WS-246: Performance Scoring Algorithms
 * Team B Round 1: Wedding industry-specific scoring algorithms
 *
 * Advanced scoring algorithms designed specifically for the wedding industry,
 * incorporating seasonal patterns, vendor reliability factors, and client satisfaction metrics.
 */

import {
  ScoringAlgorithmConfig,
  ScoreCalculationResult,
  ScoreComponent,
  VendorPerformanceMetric,
  WeddingSeasonMetrics,
  VendorReliabilityMetrics,
  WeddingDayExecutionMetrics,
  MetricType,
  IndustryCategory,
  TrendDirection,
} from '@/types/analytics';

export class PerformanceScoringAlgorithms {
  // Wedding industry-specific seasonal weights
  private readonly SEASONAL_PERIODS = {
    PEAK_WEDDING_MONTHS: [5, 6, 9, 10], // May, June, September, October
    HIGH_DEMAND_MONTHS: [4, 7, 8, 11], // April, July, August, November
    SHOULDER_MONTHS: [3, 12], // March, December
    OFF_SEASON_MONTHS: [1, 2], // January, February
  };

  // Wedding day criticality factors
  private readonly WEDDING_DAY_FACTORS = {
    PUNCTUALITY_WEIGHT: 0.3, // Being on time is critical
    EQUIPMENT_RELIABILITY_WEIGHT: 0.25,
    VENDOR_COORDINATION_WEIGHT: 0.2,
    CLIENT_STRESS_REDUCTION_WEIGHT: 0.15,
    PROBLEM_RESOLUTION_WEIGHT: 0.1,
  };

  // Industry-specific performance standards
  private readonly INDUSTRY_STANDARDS = {
    photography: {
      critical_response_time_hours: 4,
      expected_booking_rate: 0.3,
      min_satisfaction_score: 85,
      reliability_threshold: 95,
    },
    catering: {
      critical_response_time_hours: 6,
      expected_booking_rate: 0.25,
      min_satisfaction_score: 90,
      reliability_threshold: 98, // Food safety critical
    },
    venues: {
      critical_response_time_hours: 12,
      expected_booking_rate: 0.4,
      min_satisfaction_score: 85,
      reliability_threshold: 95,
    },
    florist: {
      critical_response_time_hours: 8,
      expected_booking_rate: 0.28,
      min_satisfaction_score: 82,
      reliability_threshold: 90,
    },
    music: {
      critical_response_time_hours: 6,
      expected_booking_rate: 0.35,
      min_satisfaction_score: 88,
      reliability_threshold: 95,
    },
    transportation: {
      critical_response_time_hours: 4,
      expected_booking_rate: 0.2,
      min_satisfaction_score: 90,
      reliability_threshold: 99, // Critical timing
    },
    planning: {
      critical_response_time_hours: 2,
      expected_booking_rate: 0.45,
      min_satisfaction_score: 92,
      reliability_threshold: 98, // Coordination critical
    },
    decor: {
      critical_response_time_hours: 12,
      expected_booking_rate: 0.22,
      min_satisfaction_score: 80,
      reliability_threshold: 85,
    },
    other: {
      critical_response_time_hours: 8,
      expected_booking_rate: 0.25,
      min_satisfaction_score: 80,
      reliability_threshold: 85,
    },
  };

  /**
   * Calculate comprehensive wedding industry performance score
   */
  calculateWeddingIndustryScore(
    vendorId: string,
    metrics: VendorPerformanceMetric[],
    industryCategory: IndustryCategory,
    config?: Partial<ScoringAlgorithmConfig>,
  ): ScoreCalculationResult {
    const algorithmConfig = this.mergeWithDefaultConfig(config);

    // Calculate component scores with wedding-specific adjustments
    const componentScores = {
      response_score: this.calculateResponseScore(metrics, industryCategory),
      booking_score: this.calculateBookingConversionScore(
        metrics,
        industryCategory,
      ),
      satisfaction_score: this.calculateSatisfactionScore(
        metrics,
        industryCategory,
      ),
      reliability_score: this.calculateReliabilityScore(
        metrics,
        industryCategory,
      ),
      communication_score: this.calculateCommunicationScore(
        metrics,
        industryCategory,
      ),
      delivery_score: this.calculateDeliveryScore(metrics, industryCategory),
      budget_score: this.calculateBudgetAdherenceScore(
        metrics,
        industryCategory,
      ),
    };

    // Apply seasonal adjustments
    const adjustedScores = this.applySeasonalAdjustments(
      componentScores,
      metrics,
    );

    // Calculate overall score with wedding industry weights
    const overallScore = this.calculateWeightedOverallScore(
      adjustedScores,
      algorithmConfig,
    );

    // Assess confidence based on wedding industry factors
    const confidenceLevel = this.calculateWeddingIndustryConfidence(
      metrics,
      industryCategory,
    );

    return {
      vendor_id: vendorId,
      calculation_date: new Date().toISOString(),
      algorithm_used: `wedding_industry_${algorithmConfig.version}`,
      component_scores: adjustedScores,
      overall_score: overallScore,
      confidence_level: confidenceLevel,
      data_quality_indicators: {
        sample_size: metrics.length,
        data_completeness: this.calculateDataCompleteness(metrics),
        temporal_coverage: this.calculateTemporalCoverage(metrics),
      },
    };
  }

  /**
   * Calculate response time score with wedding urgency factors
   */
  private calculateResponseScore(
    metrics: VendorPerformanceMetric[],
    category: IndustryCategory,
  ): ScoreComponent {
    const responseMetrics = metrics.filter(
      (m) => m.metric_type === 'response_time',
    );

    if (responseMetrics.length === 0) {
      return this.createEmptyScoreComponent();
    }

    const standard = this.INDUSTRY_STANDARDS[category];
    const criticalThreshold = standard.critical_response_time_hours;

    let totalScore = 0;
    let weightedCount = 0;

    responseMetrics.forEach((metric) => {
      const responseHours = metric.metric_value;

      // Score based on response time relative to critical threshold
      let baseScore = 100;
      if (responseHours > criticalThreshold) {
        // Exponential decay for late responses
        const lateness = responseHours - criticalThreshold;
        baseScore = Math.max(0, 100 * Math.exp(-lateness / criticalThreshold));
      } else {
        // Bonus for very fast responses
        const fastness =
          (criticalThreshold - responseHours) / criticalThreshold;
        baseScore = 100 + fastness * 20; // Up to 20% bonus
      }

      // Apply wedding season multipliers
      const seasonMultiplier = this.getSeasonMultiplier(
        metric.calculation_date,
      );
      const adjustedScore = baseScore * seasonMultiplier;

      // Weight by confidence and recency
      const weight =
        metric.confidence_score *
        this.getRecencyWeight(metric.calculation_date);

      totalScore += adjustedScore * weight;
      weightedCount += weight;
    });

    const rawScore = weightedCount > 0 ? totalScore / weightedCount : 0;
    const normalizedScore = Math.min(100, Math.max(0, rawScore));

    return {
      raw_score: normalizedScore,
      weighted_score: normalizedScore * 0.2, // 20% weight in overall score
      contribution_to_overall: normalizedScore * 0.2,
      data_points_used: responseMetrics.length,
      confidence: this.calculateComponentConfidence(responseMetrics),
      trend: this.calculateTrend(responseMetrics),
    };
  }

  /**
   * Calculate booking conversion score with wedding industry benchmarks
   */
  private calculateBookingConversionScore(
    metrics: VendorPerformanceMetric[],
    category: IndustryCategory,
  ): ScoreComponent {
    const bookingMetrics = metrics.filter(
      (m) => m.metric_type === 'booking_conversion',
    );

    if (bookingMetrics.length === 0) {
      return this.createEmptyScoreComponent();
    }

    const standard = this.INDUSTRY_STANDARDS[category];
    const expectedRate = standard.expected_booking_rate;

    const avgConversionRate = this.calculateWeightedAverage(bookingMetrics);

    // Score relative to industry benchmark
    const performanceRatio = avgConversionRate / expectedRate;
    let score = performanceRatio * 100;

    // Apply diminishing returns for exceptional performance
    if (score > 100) {
      const excess = score - 100;
      score = 100 + excess * 0.5; // 50% of excess counts
    }

    // Penalty for very low conversion rates
    if (performanceRatio < 0.5) {
      score *= 0.5; // Heavy penalty
    }

    const normalizedScore = Math.min(150, Math.max(0, score));

    return {
      raw_score: normalizedScore,
      weighted_score: normalizedScore * 0.15,
      contribution_to_overall: normalizedScore * 0.15,
      data_points_used: bookingMetrics.length,
      confidence: this.calculateComponentConfidence(bookingMetrics),
      trend: this.calculateTrend(bookingMetrics),
    };
  }

  /**
   * Calculate client satisfaction score with wedding-specific weight
   */
  private calculateSatisfactionScore(
    metrics: VendorPerformanceMetric[],
    category: IndustryCategory,
  ): ScoreComponent {
    const satisfactionMetrics = metrics.filter(
      (m) => m.metric_type === 'client_satisfaction',
    );

    if (satisfactionMetrics.length === 0) {
      return this.createEmptyScoreComponent();
    }

    const standard = this.INDUSTRY_STANDARDS[category];
    const minThreshold = standard.min_satisfaction_score;

    // Wedding satisfaction is critical - use exponential weighting for recent feedback
    let totalScore = 0;
    let weightedCount = 0;

    satisfactionMetrics.forEach((metric) => {
      const satisfactionScore = metric.metric_value;

      // Heavy penalty if below minimum threshold
      let adjustedScore = satisfactionScore;
      if (satisfactionScore < minThreshold) {
        const deficit = (minThreshold - satisfactionScore) / minThreshold;
        adjustedScore = satisfactionScore * Math.exp(-deficit * 2);
      }

      // Exponential weighting for recent feedback (more important)
      const recencyWeight = this.getExponentialRecencyWeight(
        metric.calculation_date,
        0.9,
      );
      const confidenceWeight = Math.pow(metric.confidence_score, 0.5); // Less harsh confidence penalty

      const totalWeight = recencyWeight * confidenceWeight * metric.sample_size;

      totalScore += adjustedScore * totalWeight;
      weightedCount += totalWeight;
    });

    const rawScore = weightedCount > 0 ? totalScore / weightedCount : 0;

    return {
      raw_score: rawScore,
      weighted_score: rawScore * 0.25, // 25% weight - most important for weddings
      contribution_to_overall: rawScore * 0.25,
      data_points_used: satisfactionMetrics.length,
      confidence: this.calculateComponentConfidence(satisfactionMetrics),
      trend: this.calculateTrend(satisfactionMetrics),
    };
  }

  /**
   * Calculate reliability score with wedding day execution factors
   */
  private calculateReliabilityScore(
    metrics: VendorPerformanceMetric[],
    category: IndustryCategory,
  ): ScoreComponent {
    const reliabilityMetrics = metrics.filter(
      (m) => m.metric_type === 'reliability_score',
    );

    if (reliabilityMetrics.length === 0) {
      return this.createEmptyScoreComponent();
    }

    const standard = this.INDUSTRY_STANDARDS[category];
    const reliabilityThreshold = standard.reliability_threshold;

    // Wedding day reliability is binary - you either deliver or you don't
    let totalScore = 0;
    let weightedCount = 0;

    reliabilityMetrics.forEach((metric) => {
      const reliabilityScore = metric.metric_value;

      // Exponential penalty for reliability issues
      let adjustedScore = reliabilityScore;
      if (reliabilityScore < reliabilityThreshold) {
        const deficit = (reliabilityThreshold - reliabilityScore) / 100;
        adjustedScore = reliabilityScore * Math.exp(-deficit * 3); // Heavy penalty
      }

      // Wedding season performance is weighted more heavily
      const seasonWeight = metric.wedding_season ? 1.5 : 1.0;
      const peakWeight = metric.peak_season ? 1.8 : 1.0;

      const totalWeight = metric.confidence_score * seasonWeight * peakWeight;

      totalScore += adjustedScore * totalWeight;
      weightedCount += totalWeight;
    });

    const rawScore = weightedCount > 0 ? totalScore / weightedCount : 0;

    return {
      raw_score: rawScore,
      weighted_score: rawScore * 0.2, // 20% weight
      contribution_to_overall: rawScore * 0.2,
      data_points_used: reliabilityMetrics.length,
      confidence: this.calculateComponentConfidence(reliabilityMetrics),
      trend: this.calculateTrend(reliabilityMetrics),
    };
  }

  /**
   * Calculate communication score for ongoing client relationships
   */
  private calculateCommunicationScore(
    metrics: VendorPerformanceMetric[],
    category: IndustryCategory,
  ): ScoreComponent {
    const commMetrics = metrics.filter(
      (m) => m.metric_type === 'communication_quality',
    );

    if (commMetrics.length === 0) {
      return this.createEmptyScoreComponent();
    }

    // Communication consistency is key for wedding planning
    const values = commMetrics.map((m) => m.metric_value);
    const avgScore = this.calculateWeightedAverage(commMetrics);
    const consistency = this.calculateConsistencyScore(values);

    // Weighted combination of average quality and consistency
    const combinedScore = avgScore * 0.7 + consistency * 0.3;

    return {
      raw_score: combinedScore,
      weighted_score: combinedScore * 0.1, // 10% weight
      contribution_to_overall: combinedScore * 0.1,
      data_points_used: commMetrics.length,
      confidence: this.calculateComponentConfidence(commMetrics),
      trend: this.calculateTrend(commMetrics),
    };
  }

  /**
   * Calculate delivery score (timeline adherence)
   */
  private calculateDeliveryScore(
    metrics: VendorPerformanceMetric[],
    category: IndustryCategory,
  ): ScoreComponent {
    const deliveryMetrics = metrics.filter(
      (m) => m.metric_type === 'on_time_delivery',
    );

    if (deliveryMetrics.length === 0) {
      return this.createEmptyScoreComponent();
    }

    // Wedding timelines are fixed - there's no "close enough"
    const avgDeliveryRate = this.calculateWeightedAverage(deliveryMetrics);

    // Apply exponential penalty for late deliveries
    let adjustedScore = avgDeliveryRate;
    if (avgDeliveryRate < 95) {
      const deficit = (95 - avgDeliveryRate) / 95;
      adjustedScore = avgDeliveryRate * Math.exp(-deficit * 2);
    }

    return {
      raw_score: adjustedScore,
      weighted_score: adjustedScore * 0.08, // 8% weight
      contribution_to_overall: adjustedScore * 0.08,
      data_points_used: deliveryMetrics.length,
      confidence: this.calculateComponentConfidence(deliveryMetrics),
      trend: this.calculateTrend(deliveryMetrics),
    };
  }

  /**
   * Calculate budget adherence score
   */
  private calculateBudgetAdherenceScore(
    metrics: VendorPerformanceMetric[],
    category: IndustryCategory,
  ): ScoreComponent {
    const budgetMetrics = metrics.filter(
      (m) => m.metric_type === 'budget_adherence',
    );

    if (budgetMetrics.length === 0) {
      return this.createEmptyScoreComponent();
    }

    // Budget adherence: 100% is perfect, >100% is over budget (bad), <100% is under budget (good but suspicious)
    let totalScore = 0;
    let weightedCount = 0;

    budgetMetrics.forEach((metric) => {
      const adherencePercentage = metric.metric_value;

      let score = 0;
      if (adherencePercentage <= 100) {
        // Under or on budget - good, but very under might indicate quality issues
        if (adherencePercentage >= 90) {
          score = 100; // Perfect range
        } else if (adherencePercentage >= 80) {
          score = 90; // Good but might indicate cutting corners
        } else {
          score = 70; // Suspicious - might indicate quality compromise
        }
      } else {
        // Over budget - exponential penalty
        const overrun = (adherencePercentage - 100) / 100;
        score = Math.max(0, 100 * Math.exp(-overrun * 2));
      }

      totalScore += score * metric.confidence_score;
      weightedCount += metric.confidence_score;
    });

    const rawScore = weightedCount > 0 ? totalScore / weightedCount : 0;

    return {
      raw_score: rawScore,
      weighted_score: rawScore * 0.02, // 2% weight - least important for wedding success
      contribution_to_overall: rawScore * 0.02,
      data_points_used: budgetMetrics.length,
      confidence: this.calculateComponentConfidence(budgetMetrics),
      trend: this.calculateTrend(budgetMetrics),
    };
  }

  /**
   * Apply seasonal adjustments based on wedding industry patterns
   */
  private applySeasonalAdjustments(
    scores: any,
    metrics: VendorPerformanceMetric[],
  ): any {
    // Calculate overall seasonal distribution of metrics
    const seasonalDistribution = this.analyzeSeasonalDistribution(metrics);

    // Apply adjustments based on performance during different seasons
    const adjustedScores = { ...scores };

    Object.keys(adjustedScores).forEach((scoreKey) => {
      const score = adjustedScores[scoreKey];

      // Higher standards during peak wedding season
      if (seasonalDistribution.peakSeasonRatio > 0.4) {
        score.weighted_score *= 1.1; // 10% bonus for good peak season performance
      }

      // Account for off-season performance
      if (seasonalDistribution.offSeasonRatio > 0.3) {
        score.weighted_score *= 0.95; // Slight penalty for relying on off-season data
      }

      adjustedScores[scoreKey] = score;
    });

    return adjustedScores;
  }

  /**
   * Calculate wedding industry-specific confidence level
   */
  private calculateWeddingIndustryConfidence(
    metrics: VendorPerformanceMetric[],
    category: IndustryCategory,
  ): number {
    if (metrics.length === 0) return 0;

    // Base confidence on sample size
    const sampleSizeConfidence = Math.min(1, metrics.length / 20); // Need 20+ data points for high confidence

    // Wedding season coverage is important
    const weddingSeasonMetrics = metrics.filter((m) => m.wedding_season);
    const seasonCoverage = weddingSeasonMetrics.length / metrics.length;
    const seasonConfidence = Math.min(1, seasonCoverage * 2); // Want 50%+ wedding season data

    // Recent data is more valuable
    const recentMetrics = metrics.filter((m) => {
      const ageInDays =
        (Date.now() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return ageInDays <= 90;
    });
    const recencyConfidence = recentMetrics.length / metrics.length;

    // Data source reliability
    const avgSourceConfidence =
      metrics.reduce((sum, m) => sum + m.confidence_score, 0) / metrics.length;

    // Combined confidence
    return (
      sampleSizeConfidence * 0.3 +
      seasonConfidence * 0.25 +
      recencyConfidence * 0.25 +
      avgSourceConfidence * 0.2
    );
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private mergeWithDefaultConfig(
    config?: Partial<ScoringAlgorithmConfig>,
  ): ScoringAlgorithmConfig {
    return {
      algorithm_name: 'wedding_industry_v1',
      version: '1.0',
      weights: {
        response_time: 0.2,
        booking_conversion: 0.15,
        client_satisfaction: 0.25,
        reliability: 0.2,
        communication: 0.1,
        delivery: 0.08,
        budget_adherence: 0.02,
      },
      seasonal_adjustments: {
        peak_season_multiplier: 1.2,
        weekend_multiplier: 1.1,
        off_season_multiplier: 0.9,
      },
      industry_adjustments: {
        photography: 1.0,
        catering: 1.1,
        venues: 0.95,
        florist: 1.05,
        music: 1.0,
        transportation: 1.15,
        planning: 1.2,
        decor: 0.9,
        other: 1.0,
      },
      decay_factors: {
        recency_weight: 0.7,
        sample_size_threshold: 5,
      },
      ...config,
    };
  }

  private createEmptyScoreComponent(): ScoreComponent {
    return {
      raw_score: 0,
      weighted_score: 0,
      contribution_to_overall: 0,
      data_points_used: 0,
      confidence: 0,
      trend: 'stable' as TrendDirection,
    };
  }

  private calculateWeightedAverage(metrics: VendorPerformanceMetric[]): number {
    if (metrics.length === 0) return 0;

    let totalWeightedValue = 0;
    let totalWeight = 0;

    metrics.forEach((metric, index) => {
      const recencyWeight = Math.pow(0.9, index); // More recent data weighs more
      const confidenceWeight = metric.confidence_score;
      const sampleWeight = Math.log(metric.sample_size + 1); // Logarithmic sample size weight

      const totalMetricWeight = recencyWeight * confidenceWeight * sampleWeight;

      totalWeightedValue += metric.metric_value * totalMetricWeight;
      totalWeight += totalMetricWeight;
    });

    return totalWeight > 0 ? totalWeightedValue / totalWeight : 0;
  }

  private calculateWeightedOverallScore(
    scores: any,
    config: ScoringAlgorithmConfig,
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(scores).forEach(([key, scoreComponent]: [string, any]) => {
      const weight = this.getWeightForComponent(key, config);
      if (scoreComponent && weight > 0) {
        totalScore += scoreComponent.raw_score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.min(100, Math.max(0, totalScore)) : 0;
  }

  private getWeightForComponent(
    component: string,
    config: ScoringAlgorithmConfig,
  ): number {
    switch (component) {
      case 'response_score':
        return config.weights.response_time;
      case 'booking_score':
        return config.weights.booking_conversion;
      case 'satisfaction_score':
        return config.weights.client_satisfaction;
      case 'reliability_score':
        return config.weights.reliability;
      case 'communication_score':
        return config.weights.communication;
      case 'delivery_score':
        return config.weights.delivery;
      case 'budget_score':
        return config.weights.budget_adherence;
      default:
        return 0;
    }
  }

  private getSeasonMultiplier(date: string): number {
    const month = new Date(date).getMonth() + 1;

    if (this.SEASONAL_PERIODS.PEAK_WEDDING_MONTHS.includes(month)) {
      return 1.2; // Higher expectations
    } else if (this.SEASONAL_PERIODS.HIGH_DEMAND_MONTHS.includes(month)) {
      return 1.1;
    } else if (this.SEASONAL_PERIODS.OFF_SEASON_MONTHS.includes(month)) {
      return 0.9; // Lower expectations
    }
    return 1.0;
  }

  private getRecencyWeight(date: string): number {
    const ageInDays =
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-ageInDays / 60); // Exponential decay over 60 days
  }

  private getExponentialRecencyWeight(
    date: string,
    decayFactor: number,
  ): number {
    const ageInDays =
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
    return Math.pow(decayFactor, ageInDays);
  }

  private calculateComponentConfidence(
    metrics: VendorPerformanceMetric[],
  ): number {
    if (metrics.length === 0) return 0;

    const avgConfidence =
      metrics.reduce((sum, m) => sum + m.confidence_score, 0) / metrics.length;
    const sampleSizeConfidence = Math.min(1, metrics.length / 10);

    return (avgConfidence + sampleSizeConfidence) / 2;
  }

  private calculateTrend(metrics: VendorPerformanceMetric[]): TrendDirection {
    if (metrics.length < 3) return 'stable';

    const sortedMetrics = [...metrics].sort(
      (a, b) =>
        new Date(a.calculation_date).getTime() -
        new Date(b.calculation_date).getTime(),
    );

    const firstThird = sortedMetrics.slice(
      0,
      Math.ceil(sortedMetrics.length / 3),
    );
    const lastThird = sortedMetrics.slice(-Math.ceil(sortedMetrics.length / 3));

    const firstAvg =
      firstThird.reduce((sum, m) => sum + m.metric_value, 0) /
      firstThird.length;
    const lastAvg =
      lastThird.reduce((sum, m) => sum + m.metric_value, 0) / lastThird.length;

    const changePercent = (lastAvg - firstAvg) / firstAvg;

    if (changePercent > 0.1) return 'improving';
    if (changePercent < -0.1) return 'declining';
    return 'stable';
  }

  private calculateConsistencyScore(values: number[]): number {
    if (values.length <= 1) return 100;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation relative to mean indicates better consistency
    const coefficientOfVariation = mean !== 0 ? standardDeviation / mean : 0;

    return Math.max(0, 100 * (1 - coefficientOfVariation));
  }

  private analyzeSeasonalDistribution(metrics: VendorPerformanceMetric[]): {
    peakSeasonRatio: number;
    highSeasonRatio: number;
    shoulderSeasonRatio: number;
    offSeasonRatio: number;
  } {
    if (metrics.length === 0) {
      return {
        peakSeasonRatio: 0,
        highSeasonRatio: 0,
        shoulderSeasonRatio: 0,
        offSeasonRatio: 0,
      };
    }

    const peakCount = metrics.filter((m) => m.peak_season).length;
    const weddingSeasonCount = metrics.filter(
      (m) => m.wedding_season && !m.peak_season,
    ).length;
    const offSeasonCount = metrics.filter((m) => !m.wedding_season).length;
    const remainingCount =
      metrics.length - peakCount - weddingSeasonCount - offSeasonCount;

    return {
      peakSeasonRatio: peakCount / metrics.length,
      highSeasonRatio: weddingSeasonCount / metrics.length,
      shoulderSeasonRatio: remainingCount / metrics.length,
      offSeasonRatio: offSeasonCount / metrics.length,
    };
  }

  private calculateDataCompleteness(
    metrics: VendorPerformanceMetric[],
  ): number {
    const expectedMetricTypes = [
      'response_time',
      'booking_conversion',
      'client_satisfaction',
      'reliability_score',
    ];
    const availableTypes = new Set(metrics.map((m) => m.metric_type));

    return availableTypes.size / expectedMetricTypes.length;
  }

  private calculateTemporalCoverage(
    metrics: VendorPerformanceMetric[],
  ): number {
    if (metrics.length === 0) return 0;

    const dates = metrics.map((m) => new Date(m.calculation_date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const totalPeriod = maxDate - minDate;

    if (totalPeriod === 0) return 1; // Single day data

    const uniqueDays = new Set(metrics.map((m) => m.calculation_date)).size;
    const expectedDays = Math.ceil(totalPeriod / (1000 * 60 * 60 * 24)) + 1;

    return Math.min(1, uniqueDays / expectedDays);
  }
}
