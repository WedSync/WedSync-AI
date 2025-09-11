/**
 * WS-208: Journey Performance Tracker
 * Real-time performance monitoring and ML feedback collection system
 * Team B - Performance tracking for continuous AI journey improvement
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Environment validation
const env = z
  .object({
    SUPABASE_URL: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
  })
  .parse({
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Types and Interfaces
export interface PerformanceMetrics {
  journeyId: string;
  aiSuggestionId?: string;
  actualCompletionRate: number;
  clientSatisfactionScore: number;
  supplierRating: number;
  engagementMetrics: EngagementMetrics;
  modificationsMade: JourneyModifications;
  performanceNotes?: string;
  weddingOutcome: 'successful' | 'issues_minor' | 'issues_major' | 'cancelled';
}

export interface EngagementMetrics {
  email_open_rate: number;
  sms_response_rate: number;
  task_completion_time_avg: number; // in hours
  client_initiated_contact: number;
  milestone_hit_rate: number;
  communication_satisfaction: number; // 1-5 scale
  timeline_adherence: number; // percentage
}

export interface JourneyModifications {
  nodes_added: string[];
  nodes_removed: string[];
  timing_adjustments: Array<{
    node_id: string;
    original_timing: number;
    new_timing: number;
    reason: string;
  }>;
  content_changes: Array<{
    node_id: string;
    change_type: 'subject' | 'content' | 'channel';
    original_value: string;
    new_value: string;
    reason: string;
  }>;
}

export interface PerformancePrediction {
  predicted_completion_rate: number;
  predicted_engagement_score: number;
  confidence_level: number;
  risk_factors: string[];
  optimization_suggestions: string[];
}

export interface BenchmarkData {
  vendorType: string;
  serviceLevel: string;
  timelineRange: string;
  avgCompletionRate: number;
  avgSatisfactionScore: number;
  topPerformingPatterns: string[];
  commonIssues: string[];
}

/**
 * Comprehensive performance tracking system for AI-generated journeys
 * Provides real-time monitoring, ML feedback collection, and predictive analytics
 */
export class JourneyPerformanceTracker {
  private metricsCache = new Map<string, any>();
  private predictionCache = new Map<string, PerformancePrediction>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    console.log(
      '[JourneyPerformanceTracker] Initialized with ML feedback system',
    );
  }

  /**
   * Track performance metrics for a journey
   */
  async trackPerformance(metrics: PerformanceMetrics): Promise<void> {
    try {
      console.log(
        '[JourneyPerformanceTracker] Recording performance for journey:',
        metrics.journeyId,
      );

      // 1. Validate and sanitize input data
      const sanitizedMetrics = this.sanitizeMetrics(metrics);

      // 2. Store performance data
      const { data: performanceRecord, error: insertError } = await supabase
        .from('journey_performance_data')
        .insert({
          journey_id: sanitizedMetrics.journeyId,
          ai_suggestion_id: sanitizedMetrics.aiSuggestionId,
          actual_completion_rate: sanitizedMetrics.actualCompletionRate,
          client_satisfaction_score: sanitizedMetrics.clientSatisfactionScore,
          supplier_rating: sanitizedMetrics.supplierRating,
          engagement_metrics: sanitizedMetrics.engagementMetrics,
          modifications_made: sanitizedMetrics.modificationsMade,
          performance_notes: sanitizedMetrics.performanceNotes,
          wedding_outcome: sanitizedMetrics.weddingOutcome,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error(
          '[JourneyPerformanceTracker] Failed to store performance:',
          insertError,
        );
        throw new Error(`Performance tracking failed: ${insertError.message}`);
      }

      // 3. Update AI suggestion performance if linked
      if (sanitizedMetrics.aiSuggestionId) {
        await this.updateAISuggestionPerformance(sanitizedMetrics);
      }

      // 4. Trigger ML learning pipeline (async)
      this.triggerMLLearning(sanitizedMetrics).catch((error) => {
        console.error(
          '[JourneyPerformanceTracker] ML learning pipeline failed:',
          error,
        );
      });

      // 5. Check for performance alerts
      await this.checkPerformanceAlerts(sanitizedMetrics);

      // 6. Clear related caches
      this.invalidateCache(sanitizedMetrics.journeyId);

      console.log(
        '[JourneyPerformanceTracker] Performance recorded successfully:',
        performanceRecord.id,
      );
    } catch (error) {
      console.error(
        '[JourneyPerformanceTracker] Performance tracking failed:',
        error,
      );
      throw error;
    }
  }

  /**
   * Get comprehensive performance analytics for a journey
   */
  async getJourneyAnalytics(journeyId: string): Promise<{
    current: PerformanceMetrics | null;
    historical: PerformanceMetrics[];
    trends: any;
    predictions: PerformancePrediction;
    benchmarks: BenchmarkData;
    recommendations: string[];
  }> {
    try {
      // Check cache first
      const cacheKey = `analytics:${journeyId}`;
      const cached = this.metricsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      console.log(
        '[JourneyPerformanceTracker] Generating analytics for journey:',
        journeyId,
      );

      // 1. Get current performance data
      const { data: currentData } = await supabase
        .from('journey_performance_data')
        .select('*')
        .eq('journey_id', journeyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // 2. Get historical performance data
      const { data: historicalData } = await supabase
        .from('journey_performance_data')
        .select('*')
        .eq('journey_id', journeyId)
        .order('created_at', { ascending: false });

      // 3. Calculate trends
      const trends = this.calculateTrends(historicalData || []);

      // 4. Get predictions
      const predictions = await this.getPredictions(journeyId);

      // 5. Get benchmark data
      const benchmarks = await this.getBenchmarkData(journeyId);

      // 6. Generate recommendations
      const recommendations = await this.generateRecommendations(
        currentData,
        historicalData || [],
        predictions,
        benchmarks,
      );

      const analytics = {
        current: currentData,
        historical: historicalData || [],
        trends,
        predictions,
        benchmarks,
        recommendations,
      };

      // Cache the result
      this.metricsCache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now(),
      });

      return analytics;
    } catch (error) {
      console.error(
        '[JourneyPerformanceTracker] Analytics generation failed:',
        error,
      );
      throw error;
    }
  }

  /**
   * Get industry benchmarks for comparison
   */
  async getBenchmarkData(journeyId: string): Promise<BenchmarkData> {
    try {
      // Get journey details to determine vendor type and service level
      const { data: journeyDetails } = await supabase
        .from('customer_journeys')
        .select(
          `
          supplier_id,
          suppliers!inner(vendor_type, service_tier)
        `,
        )
        .eq('id', journeyId)
        .single();

      if (!journeyDetails) {
        throw new Error('Journey not found for benchmarking');
      }

      const vendorType = (journeyDetails.suppliers as any).vendor_type;
      const serviceLevel = this.mapServiceTier(
        (journeyDetails.suppliers as any).service_tier,
      );

      // Get industry averages
      const { data: benchmarkData } = await supabase.rpc(
        'get_industry_benchmarks',
        {
          p_vendor_type: vendorType,
          p_service_level: serviceLevel,
        },
      );

      return (
        benchmarkData || this.getDefaultBenchmarks(vendorType, serviceLevel)
      );
    } catch (error) {
      console.error(
        '[JourneyPerformanceTracker] Benchmark data failed:',
        error,
      );
      return this.getDefaultBenchmarks('photographer', 'premium');
    }
  }

  /**
   * Generate AI-powered performance predictions
   */
  async getPredictions(journeyId: string): Promise<PerformancePrediction> {
    try {
      // Check prediction cache
      const cached = this.predictionCache.get(journeyId);
      if (cached) {
        return cached;
      }

      // Get journey historical data for prediction
      const { data: historicalData } = await supabase
        .from('journey_performance_data')
        .select('*')
        .eq('journey_id', journeyId);

      if (!historicalData || historicalData.length < 2) {
        // Not enough data for predictions
        return {
          predicted_completion_rate: 0.75,
          predicted_engagement_score: 0.7,
          confidence_level: 0.3,
          risk_factors: ['Insufficient historical data'],
          optimization_suggestions: [
            'Collect more performance data to improve predictions',
          ],
        };
      }

      // Calculate predictions based on trends and patterns
      const predictions = this.calculatePredictions(historicalData);

      // Cache predictions for 1 hour
      this.predictionCache.set(journeyId, predictions);
      setTimeout(
        () => {
          this.predictionCache.delete(journeyId);
        },
        60 * 60 * 1000,
      );

      return predictions;
    } catch (error) {
      console.error('[JourneyPerformanceTracker] Predictions failed:', error);
      return {
        predicted_completion_rate: 0.75,
        predicted_engagement_score: 0.7,
        confidence_level: 0.2,
        risk_factors: ['Prediction calculation failed'],
        optimization_suggestions: ['Check system logs for prediction errors'],
      };
    }
  }

  /**
   * Check for performance alerts and notifications
   */
  private async checkPerformanceAlerts(
    metrics: PerformanceMetrics,
  ): Promise<void> {
    const alerts: string[] = [];

    // Low completion rate alert
    if (metrics.actualCompletionRate < 0.6) {
      alerts.push(
        `Low completion rate: ${(metrics.actualCompletionRate * 100).toFixed(1)}%`,
      );
    }

    // Low satisfaction alert
    if (metrics.clientSatisfactionScore < 3.0) {
      alerts.push(
        `Low client satisfaction: ${metrics.clientSatisfactionScore}/5`,
      );
    }

    // Poor engagement alert
    if (metrics.engagementMetrics.email_open_rate < 0.3) {
      alerts.push(
        `Low email engagement: ${(metrics.engagementMetrics.email_open_rate * 100).toFixed(1)}%`,
      );
    }

    // Wedding outcome alert
    if (['issues_major', 'cancelled'].includes(metrics.weddingOutcome)) {
      alerts.push(`Wedding outcome concern: ${metrics.weddingOutcome}`);
    }

    // Store alerts if any
    if (alerts.length > 0) {
      await supabase.from('performance_alerts').insert({
        journey_id: metrics.journeyId,
        alert_type: 'performance_degradation',
        alert_details: alerts,
        severity: this.calculateAlertSeverity(alerts),
        created_at: new Date().toISOString(),
      });

      console.warn(
        '[JourneyPerformanceTracker] Performance alerts generated:',
        alerts,
      );
    }
  }

  /**
   * Trigger ML learning pipeline for continuous improvement
   */
  private async triggerMLLearning(metrics: PerformanceMetrics): Promise<void> {
    try {
      // This would integrate with an ML pipeline in production
      // For now, we'll update pattern success rates and identify learning opportunities

      if (metrics.aiSuggestionId) {
        // Update AI suggestion performance for future improvements
        const learningData = {
          suggestion_id: metrics.aiSuggestionId,
          actual_performance: metrics.actualCompletionRate,
          satisfaction_score: metrics.clientSatisfactionScore,
          modifications_made: metrics.modificationsMade,
          outcome: metrics.weddingOutcome,
        };

        // Store in ML training dataset
        await supabase.from('ml_training_data').insert(learningData);

        console.log('[JourneyPerformanceTracker] ML training data stored');
      }

      // Update vendor pattern performance
      await this.updatePatternPerformance(metrics);
    } catch (error) {
      console.error(
        '[JourneyPerformanceTracker] ML learning pipeline error:',
        error,
      );
    }
  }

  /**
   * Update AI suggestion performance metrics
   */
  private async updateAISuggestionPerformance(
    metrics: PerformanceMetrics,
  ): Promise<void> {
    try {
      // Get current AI suggestion record
      const { data: currentSuggestion } = await supabase
        .from('ai_generated_journeys')
        .select('avg_completion_rate, avg_satisfaction_score, usage_count')
        .eq('id', metrics.aiSuggestionId)
        .single();

      if (currentSuggestion) {
        // Calculate new averages
        const newUsageCount = currentSuggestion.usage_count + 1;
        const newAvgCompletion =
          (currentSuggestion.avg_completion_rate *
            currentSuggestion.usage_count +
            metrics.actualCompletionRate) /
          newUsageCount;

        const newAvgSatisfaction =
          (currentSuggestion.avg_satisfaction_score *
            currentSuggestion.usage_count +
            metrics.clientSatisfactionScore) /
          newUsageCount;

        // Update AI suggestion record
        await supabase
          .from('ai_generated_journeys')
          .update({
            avg_completion_rate: Number(newAvgCompletion.toFixed(4)),
            avg_satisfaction_score: Number(newAvgSatisfaction.toFixed(2)),
            usage_count: newUsageCount,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', metrics.aiSuggestionId);

        console.log(
          '[JourneyPerformanceTracker] AI suggestion performance updated',
        );
      }
    } catch (error) {
      console.error(
        '[JourneyPerformanceTracker] AI suggestion update failed:',
        error,
      );
    }
  }

  /**
   * Generate performance recommendations based on data analysis
   */
  private async generateRecommendations(
    current: any,
    historical: any[],
    predictions: PerformancePrediction,
    benchmarks: BenchmarkData,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (!current) return recommendations;

    // Completion rate recommendations
    if (current.actual_completion_rate < benchmarks.avgCompletionRate) {
      recommendations.push(
        `Consider optimizing journey timing. Your completion rate (${(current.actual_completion_rate * 100).toFixed(1)}%) ` +
          `is below industry average (${(benchmarks.avgCompletionRate * 100).toFixed(1)}%)`,
      );
    }

    // Satisfaction recommendations
    if (current.client_satisfaction_score < benchmarks.avgSatisfactionScore) {
      recommendations.push(
        `Focus on improving client communication. Your satisfaction score (${current.client_satisfaction_score.toFixed(1)}) ` +
          `is below industry average (${benchmarks.avgSatisfactionScore.toFixed(1)})`,
      );
    }

    // Engagement recommendations
    if (current.engagement_metrics?.email_open_rate < 0.4) {
      recommendations.push(
        'Improve email subject lines and timing to increase open rates',
      );
    }

    if (current.engagement_metrics?.sms_response_rate < 0.3) {
      recommendations.push(
        'Consider more engaging SMS content or timing adjustments',
      );
    }

    // Modification pattern recommendations
    if (current.modifications_made?.nodes_removed?.length > 2) {
      recommendations.push(
        'High number of removed nodes suggests journey may be too complex initially',
      );
    }

    // Trend-based recommendations
    if (historical.length >= 3) {
      const recentTrend = this.calculateTrend(historical.slice(0, 3));
      if (recentTrend < -0.1) {
        recommendations.push(
          'Performance is declining. Consider journey optimization or vendor training',
        );
      }
    }

    // Risk factor recommendations
    predictions.risk_factors.forEach((risk) => {
      if (risk.includes('timeline')) {
        recommendations.push(
          'Consider adjusting journey timeline based on seasonal patterns',
        );
      }
      if (risk.includes('communication')) {
        recommendations.push(
          'Review communication frequency and channel preferences',
        );
      }
    });

    return recommendations.slice(0, 8); // Limit to top 8 recommendations
  }

  // Helper methods
  private sanitizeMetrics(metrics: PerformanceMetrics): PerformanceMetrics {
    return {
      ...metrics,
      actualCompletionRate: Math.max(
        0,
        Math.min(1, metrics.actualCompletionRate),
      ),
      clientSatisfactionScore: Math.max(
        1,
        Math.min(5, metrics.clientSatisfactionScore),
      ),
      supplierRating: Math.max(1, Math.min(5, metrics.supplierRating)),
      engagementMetrics: {
        ...metrics.engagementMetrics,
        email_open_rate: Math.max(
          0,
          Math.min(1, metrics.engagementMetrics.email_open_rate),
        ),
        sms_response_rate: Math.max(
          0,
          Math.min(1, metrics.engagementMetrics.sms_response_rate),
        ),
        milestone_hit_rate: Math.max(
          0,
          Math.min(1, metrics.engagementMetrics.milestone_hit_rate),
        ),
      },
    };
  }

  private calculateTrends(historicalData: any[]): any {
    if (historicalData.length < 2) {
      return { insufficient_data: true };
    }

    const completionRates = historicalData
      .map((d) => d.actual_completion_rate)
      .filter((r) => r !== null);
    const satisfactionScores = historicalData
      .map((d) => d.client_satisfaction_score)
      .filter((s) => s !== null);

    return {
      completion_rate_trend: this.calculateTrend(completionRates),
      satisfaction_trend: this.calculateTrend(satisfactionScores),
      data_points: historicalData.length,
      trend_direction: this.getTrendDirection(completionRates),
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const first = values[values.length - 1]; // Oldest
    const last = values[0]; // Newest
    return last - first;
  }

  private getTrendDirection(
    values: number[],
  ): 'improving' | 'declining' | 'stable' {
    const trend = this.calculateTrend(values);
    if (trend > 0.05) return 'improving';
    if (trend < -0.05) return 'declining';
    return 'stable';
  }

  private calculatePredictions(historicalData: any[]): PerformancePrediction {
    const completionRates = historicalData
      .map((d) => d.actual_completion_rate)
      .filter((r) => r !== null);
    const satisfactionScores = historicalData
      .map((d) => d.client_satisfaction_score)
      .filter((s) => s !== null);

    const avgCompletion =
      completionRates.reduce((sum, rate) => sum + rate, 0) /
      completionRates.length;
    const avgSatisfaction =
      satisfactionScores.reduce((sum, score) => sum + score, 0) /
      satisfactionScores.length;

    const trend = this.calculateTrend(completionRates);
    const predicted_completion = Math.min(
      1,
      Math.max(0, avgCompletion + trend * 0.5),
    );
    const predicted_engagement = Math.min(
      1,
      Math.max(0, avgSatisfaction / 5 + trend * 0.1),
    );

    return {
      predicted_completion_rate: Number(predicted_completion.toFixed(4)),
      predicted_engagement_score: Number(predicted_engagement.toFixed(4)),
      confidence_level: Math.min(0.9, 0.3 + (historicalData.length / 10) * 0.6),
      risk_factors: this.identifyRiskFactors(historicalData),
      optimization_suggestions:
        this.generateOptimizationSuggestions(historicalData),
    };
  }

  private identifyRiskFactors(historicalData: any[]): string[] {
    const risks: string[] = [];

    const recentData = historicalData.slice(0, 3);
    const avgRecentCompletion =
      recentData.reduce((sum, d) => sum + (d.actual_completion_rate || 0), 0) /
      recentData.length;

    if (avgRecentCompletion < 0.6) risks.push('Low completion rate trend');
    if (recentData.some((d) => d.wedding_outcome === 'issues_major'))
      risks.push('Recent wedding issues reported');

    return risks;
  }

  private generateOptimizationSuggestions(historicalData: any[]): string[] {
    const suggestions: string[] = [];

    const commonRemovals = historicalData
      .flatMap((d) => d.modifications_made?.nodes_removed || [])
      .reduce((acc: Record<string, number>, removal: string) => {
        acc[removal] = (acc[removal] || 0) + 1;
        return acc;
      }, {});

    Object.entries(commonRemovals)
      .filter(
        ([_, count]) =>
          (count as number) >= Math.ceil(historicalData.length * 0.3),
      )
      .forEach(([removal, _]) => {
        suggestions.push(
          `Consider removing "${removal}" from initial journey template`,
        );
      });

    return suggestions;
  }

  private mapServiceTier(tier: string): string {
    const mapping: Record<string, string> = {
      basic: 'basic',
      standard: 'premium',
      premium: 'premium',
      professional: 'luxury',
      enterprise: 'luxury',
    };
    return mapping[tier?.toLowerCase()] || 'premium';
  }

  private getDefaultBenchmarks(
    vendorType: string,
    serviceLevel: string,
  ): BenchmarkData {
    return {
      vendorType,
      serviceLevel,
      timelineRange: '3-12 months',
      avgCompletionRate: 0.75,
      avgSatisfactionScore: 4.2,
      topPerformingPatterns: ['standard_workflow', 'premium_touchpoints'],
      commonIssues: ['timing_delays', 'communication_gaps'],
    };
  }

  private calculateAlertSeverity(
    alerts: string[],
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (alerts.some((alert) => alert.includes('cancelled'))) return 'critical';
    if (alerts.some((alert) => alert.includes('major'))) return 'high';
    if (alerts.length > 2) return 'medium';
    return 'low';
  }

  private invalidateCache(journeyId: string): void {
    const keysToDelete = Array.from(this.metricsCache.keys()).filter((key) =>
      key.includes(journeyId),
    );
    keysToDelete.forEach((key) => this.metricsCache.delete(key));

    this.predictionCache.delete(journeyId);
  }

  private async updatePatternPerformance(
    metrics: PerformanceMetrics,
  ): Promise<void> {
    // This would update vendor journey patterns based on actual performance
    // Implementation depends on how patterns are linked to journeys
    console.log(
      '[JourneyPerformanceTracker] Pattern performance update triggered',
    );
  }
}

// Export singleton instance
export const journeyPerformanceTracker = new JourneyPerformanceTracker();
