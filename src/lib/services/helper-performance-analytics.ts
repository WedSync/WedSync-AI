import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export interface HelperPerformanceMetrics {
  helper_id: string;
  helper_name: string;
  overall_score: number; // 0-100 scale

  // Task Completion Metrics
  total_tasks_assigned: number;
  total_tasks_completed: number;
  completion_rate: number; // 0-1
  average_completion_time: number; // minutes
  on_time_completion_rate: number; // 0-1

  // Quality Metrics
  average_client_rating: number; // 1-5 stars
  total_client_reviews: number;
  quality_trend: 'improving' | 'stable' | 'declining';

  // Responsiveness Metrics
  average_response_time: number; // minutes
  response_time_trend: 'improving' | 'stable' | 'declining';
  communication_rating: number; // 1-5 stars

  // Reliability Metrics
  no_show_rate: number; // 0-1
  cancellation_rate: number; // 0-1
  conflict_resolution_success_rate: number; // 0-1

  // Collaboration Metrics
  team_collaboration_score: number; // 0-100
  mentor_rating: number; // 1-5 stars for experienced helpers

  // Growth Metrics
  skill_development_score: number; // 0-100
  learning_velocity: number; // skills gained per month
  certification_count: number;

  // Performance Trends
  performance_trajectory: 'rising' | 'stable' | 'declining';
  recent_performance_change: number; // percentage change last month

  // AI Integration Metrics
  suggestion_acceptance_rate: number; // How often AI suggests this helper
  actual_assignment_success_rate: number; // Success rate when AI suggests
  feedback_contribution_score: number; // How much their feedback improves AI

  last_updated: Date;
  calculation_timestamp: Date;
}

export interface PerformanceAnalysisRequest {
  helper_id?: string;
  wedding_id?: string;
  date_range: {
    start: Date;
    end: Date;
  };
  metrics_type: 'overview' | 'detailed' | 'trends' | 'comparisons';
  include_predictions?: boolean;
}

export interface PerformanceInsight {
  insight_type:
    | 'strength'
    | 'improvement_area'
    | 'trend'
    | 'anomaly'
    | 'prediction';
  title: string;
  description: string;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_action: string;
  confidence_score: number;
  supporting_data: any;
}

export interface PerformanceBenchmark {
  metric_name: string;
  helper_value: number;
  category_average: number;
  top_performer_value: number;
  percentile_rank: number; // 0-100
  improvement_potential: number;
}

export interface PerformancePrediction {
  helper_id: string;
  predicted_performance_next_month: number;
  confidence_interval: [number, number];
  key_influencing_factors: string[];
  recommended_interventions: string[];
  risk_factors: string[];
}

/**
 * Helper Performance Analytics Service
 * Comprehensive analytics system for tracking and analyzing helper performance
 */
export class HelperPerformanceAnalyticsService {
  private supabase: ReturnType<typeof createClient>;
  private cache: Map<string, any> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Calculate comprehensive performance metrics for a helper
   */
  async calculateHelperMetrics(
    helperId: string,
    timeRange: { start: Date; end: Date },
  ): Promise<HelperPerformanceMetrics> {
    const cacheKey = `metrics:${helperId}:${timeRange.start.getTime()}-${timeRange.end.getTime()}`;

    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    try {
      // Get helper basic info
      const { data: helper } = await this.supabase
        .from('task_helpers')
        .select('id, name, created_at')
        .eq('id', helperId)
        .single();

      if (!helper) {
        throw new Error('Helper not found');
      }

      // Get task assignment data for the time range
      const { data: assignments } = await this.supabase
        .from('task_assignments')
        .select(
          `
          *,
          tasks(*),
          assignment_reviews(*),
          helper_ratings(*)
        `,
        )
        .eq('helper_id', helperId)
        .gte('assigned_at', timeRange.start.toISOString())
        .lte('assigned_at', timeRange.end.toISOString());

      // Calculate all metrics
      const metrics = await this.computeAllMetrics(
        helper,
        assignments || [],
        timeRange,
      );

      // Cache the result
      this.setCachedResult(cacheKey, metrics);

      return metrics;
    } catch (error) {
      console.error('Error calculating helper metrics:', error);
      throw error;
    }
  }

  /**
   * Get performance analytics for multiple helpers with comparisons
   */
  async getHelperAnalytics(request: PerformanceAnalysisRequest): Promise<{
    individual_metrics: HelperPerformanceMetrics[];
    insights: PerformanceInsight[];
    benchmarks: PerformanceBenchmark[];
    predictions?: PerformancePrediction[];
    summary_statistics: any;
  }> {
    try {
      // Get helper list based on request parameters
      const helperIds = await this.getRelevantHelpers(request);

      // Calculate metrics for all helpers
      const metricsPromises = helperIds.map((id) =>
        this.calculateHelperMetrics(id, request.date_range),
      );
      const individualMetrics = await Promise.all(metricsPromises);

      // Generate insights
      const insights = await this.generatePerformanceInsights(
        individualMetrics,
        request,
      );

      // Calculate benchmarks
      const benchmarks = await this.calculateBenchmarks(individualMetrics);

      // Generate predictions if requested
      let predictions: PerformancePrediction[] = [];
      if (request.include_predictions) {
        predictions =
          await this.generatePerformancePredictions(individualMetrics);
      }

      // Calculate summary statistics
      const summaryStatistics =
        this.calculateSummaryStatistics(individualMetrics);

      return {
        individual_metrics: individualMetrics,
        insights,
        benchmarks,
        predictions: request.include_predictions ? predictions : undefined,
        summary_statistics: summaryStatistics,
      };
    } catch (error) {
      console.error('Error getting helper analytics:', error);
      throw error;
    }
  }

  /**
   * Real-time performance monitoring for alerts
   */
  async monitorPerformanceAlerts(weddingId?: string): Promise<{
    critical_alerts: any[];
    warning_alerts: any[];
    performance_summary: any;
  }> {
    try {
      const currentTime = new Date();
      const last24Hours = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

      // Get recent performance data
      const { data: recentAssignments } = await this.supabase
        .from('task_assignments')
        .select(
          `
          *,
          tasks(*),
          task_helpers(*)
        `,
        )
        .gte('assigned_at', last24Hours.toISOString())
        .eq('wedding_id', weddingId || '')
        .order('assigned_at', { ascending: false });

      const criticalAlerts = [];
      const warningAlerts = [];

      // Check for performance issues
      const helpers = this.groupByHelper(recentAssignments || []);

      for (const [helperId, assignments] of Object.entries(helpers)) {
        const helper = assignments[0].task_helpers;

        // Check for critical issues
        const noShowCount = assignments.filter(
          (a) => a.status === 'no_show',
        ).length;
        const noShowRate = noShowCount / assignments.length;

        if (noShowRate > 0.2) {
          // More than 20% no-show rate
          criticalAlerts.push({
            type: 'high_no_show_rate',
            helper_id: helperId,
            helper_name: helper.name,
            severity: 'critical',
            description: `${helper.name} has ${(noShowRate * 100).toFixed(1)}% no-show rate in last 24 hours`,
            recommended_action:
              'Immediate review and possible reassignment of pending tasks',
          });
        }

        // Check for delays
        const delayedTasks = assignments.filter(
          (a) =>
            a.status === 'in_progress' &&
            new Date(a.scheduled_completion) < currentTime,
        );

        if (delayedTasks.length > 0) {
          warningAlerts.push({
            type: 'task_delays',
            helper_id: helperId,
            helper_name: helper.name,
            severity: 'warning',
            description: `${helper.name} has ${delayedTasks.length} overdue tasks`,
            recommended_action:
              'Check in with helper and provide support if needed',
          });
        }

        // Check response time
        const avgResponseTime = this.calculateAverageResponseTime(assignments);
        if (avgResponseTime > 120) {
          // More than 2 hours average response
          warningAlerts.push({
            type: 'slow_response',
            helper_id: helperId,
            helper_name: helper.name,
            severity: 'warning',
            description: `${helper.name} average response time is ${avgResponseTime} minutes`,
            recommended_action:
              'Review communication preferences and availability',
          });
        }
      }

      const performanceSummary = {
        total_helpers_monitored: Object.keys(helpers).length,
        total_assignments_last_24h: recentAssignments?.length || 0,
        average_completion_rate: this.calculateOverallCompletionRate(
          recentAssignments || [],
        ),
        trending_performance: this.calculatePerformanceTrend(
          recentAssignments || [],
        ),
      };

      return {
        critical_alerts: criticalAlerts,
        warning_alerts: warningAlerts,
        performance_summary: performanceSummary,
      };
    } catch (error) {
      console.error('Error monitoring performance alerts:', error);
      throw error;
    }
  }

  /**
   * Generate actionable insights from performance data
   */
  async generatePerformanceInsights(
    metrics: HelperPerformanceMetrics[],
    request: PerformanceAnalysisRequest,
  ): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    // Analyze top performers
    const topPerformers = metrics
      .filter((m) => m.overall_score > 85)
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 3);

    if (topPerformers.length > 0) {
      insights.push({
        insight_type: 'strength',
        title: 'Top Performing Helpers Identified',
        description: `${topPerformers.map((h) => h.helper_name).join(', ')} are consistently high performers`,
        impact_level: 'high',
        recommended_action:
          'Consider these helpers for complex or high-priority tasks',
        confidence_score: 0.9,
        supporting_data: {
          helpers: topPerformers.map((h) => ({
            name: h.helper_name,
            score: h.overall_score,
          })),
        },
      });
    }

    // Identify improvement opportunities
    const improvementCandidates = metrics.filter(
      (m) => m.overall_score < 70 && m.performance_trajectory !== 'declining',
    );

    if (improvementCandidates.length > 0) {
      insights.push({
        insight_type: 'improvement_area',
        title: 'Helpers with Growth Potential',
        description: `${improvementCandidates.length} helpers show potential for improvement`,
        impact_level: 'medium',
        recommended_action:
          'Provide additional training and mentorship opportunities',
        confidence_score: 0.8,
        supporting_data: {
          candidates: improvementCandidates.map((h) => ({
            name: h.helper_name,
            current_score: h.overall_score,
            main_weakness: this.identifyMainWeakness(h),
          })),
        },
      });
    }

    // Detect performance trends
    const decliningPerformers = metrics.filter(
      (m) =>
        m.performance_trajectory === 'declining' &&
        m.recent_performance_change < -10,
    );

    if (decliningPerformers.length > 0) {
      insights.push({
        insight_type: 'trend',
        title: 'Declining Performance Alert',
        description: `${decliningPerformers.length} helpers showing significant performance decline`,
        impact_level: 'critical',
        recommended_action:
          'Immediate performance review and support intervention',
        confidence_score: 0.95,
        supporting_data: {
          declining_helpers: decliningPerformers.map((h) => ({
            name: h.helper_name,
            score_change: h.recent_performance_change,
            main_issues: this.identifyPerformanceIssues(h),
          })),
        },
      });
    }

    // Identify skill gaps
    const skillGaps = this.identifySkillGaps(metrics);
    if (skillGaps.length > 0) {
      insights.push({
        insight_type: 'improvement_area',
        title: 'Skill Development Opportunities',
        description: `Common skill gaps identified across ${skillGaps.length} areas`,
        impact_level: 'medium',
        recommended_action:
          'Develop targeted training programs for identified skill gaps',
        confidence_score: 0.7,
        supporting_data: { skill_gaps: skillGaps },
      });
    }

    return insights;
  }

  /**
   * Calculate performance benchmarks against peer groups
   */
  async calculateBenchmarks(
    metrics: HelperPerformanceMetrics[],
  ): Promise<PerformanceBenchmark[]> {
    if (metrics.length === 0) return [];

    const benchmarks: PerformanceBenchmark[] = [];
    const primaryHelper = metrics[0]; // Assuming first helper is the focus

    // Key metrics to benchmark
    const keyMetrics = [
      'overall_score',
      'completion_rate',
      'average_client_rating',
      'average_response_time',
      'team_collaboration_score',
    ];

    for (const metricName of keyMetrics) {
      const helperValue = primaryHelper[
        metricName as keyof HelperPerformanceMetrics
      ] as number;
      const allValues = metrics.map(
        (m) => m[metricName as keyof HelperPerformanceMetrics] as number,
      );

      const categoryAverage =
        allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
      const topPerformerValue = Math.max(...allValues);
      const sortedValues = [...allValues].sort((a, b) => a - b);
      const percentileRank =
        (sortedValues.indexOf(helperValue) / sortedValues.length) * 100;

      benchmarks.push({
        metric_name: metricName,
        helper_value: helperValue,
        category_average: categoryAverage,
        top_performer_value: topPerformerValue,
        percentile_rank: percentileRank,
        improvement_potential: topPerformerValue - helperValue,
      });
    }

    return benchmarks;
  }

  /**
   * Generate performance predictions using trend analysis
   */
  async generatePerformancePredictions(
    metrics: HelperPerformanceMetrics[],
  ): Promise<PerformancePrediction[]> {
    const predictions: PerformancePrediction[] = [];

    for (const metric of metrics) {
      // Simple linear trend prediction (would use more sophisticated models in production)
      const currentScore = metric.overall_score;
      const recentChange = metric.recent_performance_change;

      // Predict next month's performance
      let predictedPerformance = currentScore + recentChange * 0.5; // Damped trend
      predictedPerformance = Math.max(0, Math.min(100, predictedPerformance)); // Clamp to valid range

      // Calculate confidence interval (simplified)
      const volatility = Math.abs(recentChange) * 0.3;
      const confidenceInterval: [number, number] = [
        Math.max(0, predictedPerformance - volatility),
        Math.min(100, predictedPerformance + volatility),
      ];

      // Identify key factors
      const keyFactors = this.identifyKeyFactors(metric);
      const riskFactors = this.identifyRiskFactors(metric);
      const interventions = this.recommendInterventions(
        metric,
        predictedPerformance,
      );

      predictions.push({
        helper_id: metric.helper_id,
        predicted_performance_next_month: predictedPerformance,
        confidence_interval: confidenceInterval,
        key_influencing_factors: keyFactors,
        recommended_interventions: interventions,
        risk_factors: riskFactors,
      });
    }

    return predictions;
  }

  /**
   * Core metrics computation
   */
  private async computeAllMetrics(
    helper: any,
    assignments: any[],
    timeRange: { start: Date; end: Date },
  ): Promise<HelperPerformanceMetrics> {
    const totalAssigned = assignments.length;
    const completedAssignments = assignments.filter(
      (a) => a.status === 'completed',
    );
    const totalCompleted = completedAssignments.length;

    // Task completion metrics
    const completionRate =
      totalAssigned > 0 ? totalCompleted / totalAssigned : 0;
    const averageCompletionTime =
      this.calculateAverageCompletionTime(completedAssignments);
    const onTimeRate = this.calculateOnTimeRate(completedAssignments);

    // Quality metrics
    const ratings = assignments.flatMap((a) => a.helper_ratings || []);
    const avgClientRating =
      ratings.length > 0
        ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) /
          ratings.length
        : 0;

    // Responsiveness metrics
    const avgResponseTime = this.calculateAverageResponseTime(assignments);

    // Reliability metrics
    const noShowRate =
      assignments.filter((a) => a.status === 'no_show').length /
      Math.max(totalAssigned, 1);
    const cancellationRate =
      assignments.filter((a) => a.status === 'cancelled').length /
      Math.max(totalAssigned, 1);

    // Calculate overall score
    const overallScore = this.calculateOverallScore({
      completionRate,
      avgClientRating,
      avgResponseTime,
      noShowRate,
      onTimeRate,
    });

    // Performance trajectory analysis
    const performanceTrajectory = this.analyzePerformanceTrend(assignments);
    const recentChange = this.calculateRecentPerformanceChange(assignments);

    return {
      helper_id: helper.id,
      helper_name: helper.name,
      overall_score: overallScore,

      total_tasks_assigned: totalAssigned,
      total_tasks_completed: totalCompleted,
      completion_rate: completionRate,
      average_completion_time: averageCompletionTime,
      on_time_completion_rate: onTimeRate,

      average_client_rating: avgClientRating,
      total_client_reviews: ratings.length,
      quality_trend: this.determineQualityTrend(ratings),

      average_response_time: avgResponseTime,
      response_time_trend: this.determineResponseTimeTrend(assignments),
      communication_rating: avgClientRating, // Simplified - would have separate metric

      no_show_rate: noShowRate,
      cancellation_rate: cancellationRate,
      conflict_resolution_success_rate: 0.85, // Placeholder - would calculate from conflict data

      team_collaboration_score: 80, // Placeholder - would calculate from team feedback
      mentor_rating: 4.0, // Placeholder

      skill_development_score: this.calculateSkillDevelopmentScore(
        helper,
        timeRange,
      ),
      learning_velocity: 2.5, // Placeholder
      certification_count: 3, // Placeholder

      performance_trajectory: performanceTrajectory,
      recent_performance_change: recentChange,

      suggestion_acceptance_rate: 0.75, // Placeholder - would integrate with AI system
      actual_assignment_success_rate: completionRate,
      feedback_contribution_score: 85, // Placeholder

      last_updated: new Date(),
      calculation_timestamp: new Date(),
    };
  }

  // Helper calculation methods
  private calculateAverageCompletionTime(assignments: any[]): number {
    if (assignments.length === 0) return 0;

    const completionTimes = assignments
      .filter((a) => a.completed_at && a.started_at)
      .map((a) => {
        const started = new Date(a.started_at);
        const completed = new Date(a.completed_at);
        return (completed.getTime() - started.getTime()) / (1000 * 60); // minutes
      });

    return completionTimes.length > 0
      ? completionTimes.reduce((sum, time) => sum + time, 0) /
          completionTimes.length
      : 0;
  }

  private calculateOnTimeRate(assignments: any[]): number {
    if (assignments.length === 0) return 0;

    const onTimeAssignments = assignments.filter((a) => {
      if (!a.completed_at || !a.scheduled_completion) return false;

      const completed = new Date(a.completed_at);
      const scheduled = new Date(a.scheduled_completion);
      return completed <= scheduled;
    });

    return onTimeAssignments.length / assignments.length;
  }

  private calculateAverageResponseTime(assignments: any[]): number {
    if (assignments.length === 0) return 0;

    const responseTimes = assignments
      .filter((a) => a.responded_at && a.assigned_at)
      .map((a) => {
        const assigned = new Date(a.assigned_at);
        const responded = new Date(a.responded_at);
        return (responded.getTime() - assigned.getTime()) / (1000 * 60); // minutes
      });

    return responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
      : 60; // Default 1 hour
  }

  private calculateOverallScore(metrics: {
    completionRate: number;
    avgClientRating: number;
    avgResponseTime: number;
    noShowRate: number;
    onTimeRate: number;
  }): number {
    // Weighted scoring algorithm
    let score = 0;

    // Completion rate (30% weight)
    score += metrics.completionRate * 30;

    // Client rating (25% weight)
    score += (metrics.avgClientRating / 5) * 25;

    // Response time (20% weight) - inverse relationship
    const responseTimeScore = Math.max(0, 1 - metrics.avgResponseTime / 240); // 4 hours max
    score += responseTimeScore * 20;

    // Reliability (15% weight) - inverse of no-show rate
    score += (1 - metrics.noShowRate) * 15;

    // On-time performance (10% weight)
    score += metrics.onTimeRate * 10;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  private analyzePerformanceTrend(
    assignments: any[],
  ): 'rising' | 'stable' | 'declining' {
    // Simplified trend analysis - would use more sophisticated time series analysis
    if (assignments.length < 5) return 'stable';

    const recentAssignments = assignments.slice(-5);
    const olderAssignments = assignments.slice(
      0,
      Math.min(5, assignments.length - 5),
    );

    const recentSuccessRate =
      recentAssignments.filter((a) => a.status === 'completed').length /
      recentAssignments.length;
    const olderSuccessRate =
      olderAssignments.length > 0
        ? olderAssignments.filter((a) => a.status === 'completed').length /
          olderAssignments.length
        : recentSuccessRate;

    const trend = recentSuccessRate - olderSuccessRate;

    if (trend > 0.1) return 'rising';
    if (trend < -0.1) return 'declining';
    return 'stable';
  }

  private calculateRecentPerformanceChange(assignments: any[]): number {
    // Calculate percentage change in performance over recent period
    if (assignments.length < 10) return 0;

    const midPoint = Math.floor(assignments.length / 2);
    const recentHalf = assignments.slice(midPoint);
    const olderHalf = assignments.slice(0, midPoint);

    const recentScore = this.calculatePeriodScore(recentHalf);
    const olderScore = this.calculatePeriodScore(olderHalf);

    return olderScore > 0 ? ((recentScore - olderScore) / olderScore) * 100 : 0;
  }

  private calculatePeriodScore(assignments: any[]): number {
    if (assignments.length === 0) return 0;

    const completedCount = assignments.filter(
      (a) => a.status === 'completed',
    ).length;
    const onTimeCount = assignments.filter((a) => {
      if (!a.completed_at || !a.scheduled_completion) return false;
      return new Date(a.completed_at) <= new Date(a.scheduled_completion);
    }).length;

    return ((completedCount + onTimeCount) / (assignments.length * 2)) * 100;
  }

  private calculateSkillDevelopmentScore(
    helper: any,
    timeRange: { start: Date; end: Date },
  ): number {
    // Placeholder - would track skill certifications, training completion, etc.
    return Math.random() * 40 + 60; // 60-100 range
  }

  private determineQualityTrend(
    ratings: any[],
  ): 'improving' | 'stable' | 'declining' {
    if (ratings.length < 3) return 'stable';

    // Simple trend analysis on ratings
    const recent = ratings.slice(-3);
    const older = ratings.slice(0, Math.min(3, ratings.length - 3));

    const recentAvg =
      recent.reduce((sum, r) => sum + r.rating, 0) / recent.length;
    const olderAvg =
      older.length > 0
        ? older.reduce((sum, r) => sum + r.rating, 0) / older.length
        : recentAvg;

    const diff = recentAvg - olderAvg;

    if (diff > 0.2) return 'improving';
    if (diff < -0.2) return 'declining';
    return 'stable';
  }

  private determineResponseTimeTrend(
    assignments: any[],
  ): 'improving' | 'stable' | 'declining' {
    // Similar logic to quality trend but for response times
    return 'stable'; // Placeholder
  }

  // Insight generation helper methods
  private identifyMainWeakness(metrics: HelperPerformanceMetrics): string {
    const weaknesses = [];

    if (metrics.completion_rate < 0.8) weaknesses.push('Task completion');
    if (metrics.average_client_rating < 4.0)
      weaknesses.push('Client satisfaction');
    if (metrics.average_response_time > 120) weaknesses.push('Response time');
    if (metrics.no_show_rate > 0.1) weaknesses.push('Reliability');

    return weaknesses[0] || 'General performance';
  }

  private identifyPerformanceIssues(
    metrics: HelperPerformanceMetrics,
  ): string[] {
    const issues = [];

    if (metrics.recent_performance_change < -15)
      issues.push('Significant score decline');
    if (metrics.quality_trend === 'declining')
      issues.push('Declining quality ratings');
    if (metrics.response_time_trend === 'declining')
      issues.push('Slower response times');
    if (metrics.no_show_rate > 0.15) issues.push('High no-show rate');

    return issues;
  }

  private identifySkillGaps(metrics: HelperPerformanceMetrics[]): string[] {
    // Analyze common skill gaps across helpers
    const gaps = [];

    const lowCollaborationHelpers = metrics.filter(
      (m) => m.team_collaboration_score < 70,
    );
    if (lowCollaborationHelpers.length > metrics.length * 0.3) {
      gaps.push('Team collaboration and communication');
    }

    const lowQualityHelpers = metrics.filter(
      (m) => m.average_client_rating < 4.0,
    );
    if (lowQualityHelpers.length > metrics.length * 0.25) {
      gaps.push('Client service excellence');
    }

    return gaps;
  }

  private identifyKeyFactors(metrics: HelperPerformanceMetrics): string[] {
    const factors = [];

    if (metrics.performance_trajectory === 'rising') {
      factors.push('Positive performance trend');
    }
    if (metrics.average_client_rating > 4.5) {
      factors.push('Excellent client satisfaction');
    }
    if (metrics.completion_rate > 0.9) {
      factors.push('High task completion rate');
    }

    return factors;
  }

  private identifyRiskFactors(metrics: HelperPerformanceMetrics): string[] {
    const risks = [];

    if (metrics.performance_trajectory === 'declining') {
      risks.push('Declining performance trend');
    }
    if (metrics.no_show_rate > 0.1) {
      risks.push('Reliability concerns');
    }
    if (metrics.average_response_time > 180) {
      risks.push('Slow response times');
    }

    return risks;
  }

  private recommendInterventions(
    metrics: HelperPerformanceMetrics,
    predictedPerformance: number,
  ): string[] {
    const interventions = [];

    if (predictedPerformance < metrics.overall_score) {
      interventions.push('Schedule performance review meeting');
    }
    if (metrics.skill_development_score < 70) {
      interventions.push('Provide additional training opportunities');
    }
    if (metrics.team_collaboration_score < 70) {
      interventions.push('Pair with mentor for collaboration improvement');
    }

    return interventions;
  }

  // Utility methods
  private async getRelevantHelpers(
    request: PerformanceAnalysisRequest,
  ): Promise<string[]> {
    let query = this.supabase.from('task_helpers').select('id');

    if (request.wedding_id) {
      query = query.eq('wedding_id', request.wedding_id);
    }

    if (request.helper_id) {
      query = query.eq('id', request.helper_id);
    }

    const { data: helpers } = await query;
    return helpers?.map((h) => h.id) || [];
  }

  private groupByHelper(assignments: any[]): Record<string, any[]> {
    return assignments.reduce((groups, assignment) => {
      const helperId = assignment.helper_id;
      if (!groups[helperId]) {
        groups[helperId] = [];
      }
      groups[helperId].push(assignment);
      return groups;
    }, {});
  }

  private calculateOverallCompletionRate(assignments: any[]): number {
    if (assignments.length === 0) return 0;
    const completed = assignments.filter(
      (a) => a.status === 'completed',
    ).length;
    return completed / assignments.length;
  }

  private calculatePerformanceTrend(
    assignments: any[],
  ): 'improving' | 'stable' | 'declining' {
    // Simplified trend calculation
    return 'stable'; // Placeholder
  }

  private calculateSummaryStatistics(metrics: HelperPerformanceMetrics[]): any {
    if (metrics.length === 0) return {};

    const scores = metrics.map((m) => m.overall_score);
    const completionRates = metrics.map((m) => m.completion_rate);

    return {
      total_helpers: metrics.length,
      average_score:
        scores.reduce((sum, score) => sum + score, 0) / scores.length,
      top_performer_score: Math.max(...scores),
      lowest_performer_score: Math.min(...scores),
      average_completion_rate:
        completionRates.reduce((sum, rate) => sum + rate, 0) /
        completionRates.length,
      high_performers_count: metrics.filter((m) => m.overall_score > 85).length,
      improvement_needed_count: metrics.filter((m) => m.overall_score < 70)
        .length,
    };
  }

  // Caching methods
  private getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedResult(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}

// Export singleton instance
export const helperAnalytics = new HelperPerformanceAnalyticsService();
