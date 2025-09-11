/**
 * WS-168: Advanced Health Scoring Engine - Round 2 Enhancement
 * Enhanced algorithms for customer health scoring with ML-like intelligence
 * Team E - Round 2 Implementation
 */

import { createClient } from '@/lib/supabase/client';
import type {
  HealthScoreComponents,
  HealthTrendAnalysis,
  RiskAssessment,
  HealthRecommendation,
  SegmentAnalysis,
} from '@/types/customer-health';

interface AdvancedHealthMetrics {
  organizationId: string;
  overallHealthScore: number;
  components: HealthScoreComponents;
  trends: HealthTrendAnalysis;
  riskAssessment: RiskAssessment;
  recommendations: HealthRecommendation[];
  segmentAnalysis: SegmentAnalysis;
  lastCalculated: Date;
}

interface HealthFactors {
  // Engagement factors (30% weight)
  loginFrequency: number;
  featureUsage: number;
  timeSpent: number;

  // Adoption factors (30% weight)
  coreFeatureAdoption: number;
  advancedFeatureUsage: number;
  workflowCompletion: number;

  // Growth factors (25% weight)
  clientGrowth: number;
  revenueGrowth: number;
  expansionUsage: number;

  // Satisfaction factors (15% weight)
  supportTicketTrend: number;
  feedbackSentiment: number;
  npsScore: number;
}

interface HealthWeights {
  engagement: number;
  adoption: number;
  growth: number;
  satisfaction: number;
}

export class AdvancedHealthScoringEngine {
  private supabase = createClient();
  private readonly defaultWeights: HealthWeights = {
    engagement: 0.3,
    adoption: 0.3,
    growth: 0.25,
    satisfaction: 0.15,
  };

  /**
   * Calculate comprehensive health score for an organization
   */
  async calculateHealthScore(
    organizationId: string,
    timeframe: '7d' | '30d' | '90d' = '30d',
    customWeights?: Partial<HealthWeights>,
  ): Promise<AdvancedHealthMetrics> {
    const weights = { ...this.defaultWeights, ...customWeights };

    try {
      // Gather raw data from multiple sources
      const rawData = await this.gatherHealthData(organizationId, timeframe);

      // Calculate individual component scores
      const factors = await this.calculateHealthFactors(rawData, timeframe);

      // Calculate weighted components
      const components = this.calculateComponentScores(factors, weights);

      // Calculate overall health score
      const overallHealthScore = this.calculateOverallScore(
        components,
        weights,
      );

      // Perform trend analysis
      const trends = await this.analyzeTrends(organizationId, timeframe);

      // Assess risk factors
      const riskAssessment = this.assessRisk(
        factors,
        trends,
        overallHealthScore,
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        factors,
        trends,
        riskAssessment,
      );

      // Analyze customer segment
      const segmentAnalysis = this.analyzeSegment(
        overallHealthScore,
        factors,
        trends,
      );

      const healthMetrics: AdvancedHealthMetrics = {
        organizationId,
        overallHealthScore,
        components,
        trends,
        riskAssessment,
        recommendations,
        segmentAnalysis,
        lastCalculated: new Date(),
      };

      // Store the calculated metrics
      await this.storeHealthMetrics(healthMetrics);

      return healthMetrics;
    } catch (error) {
      console.error('Health score calculation error:', error);
      throw new Error(
        `Failed to calculate health score: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Batch calculate health scores for multiple organizations
   */
  async batchCalculateHealthScores(
    organizationIds: string[],
    timeframe: '7d' | '30d' | '90d' = '30d',
  ): Promise<Map<string, AdvancedHealthMetrics | null>> {
    const results = new Map<string, AdvancedHealthMetrics | null>();

    // Process in batches of 10 to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < organizationIds.length; i += batchSize) {
      const batch = organizationIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (orgId) => {
        try {
          const healthMetrics = await this.calculateHealthScore(
            orgId,
            timeframe,
          );
          results.set(orgId, healthMetrics);
        } catch (error) {
          console.error(`Failed to calculate health for ${orgId}:`, error);
          results.set(orgId, null);
        }
      });

      await Promise.allSettled(batchPromises);
    }

    return results;
  }

  /**
   * Get health score history and trends
   */
  async getHealthHistory(
    organizationId: string,
    days: number = 30,
  ): Promise<
    Array<{ date: string; score: number; components: HealthScoreComponents }>
  > {
    const { data, error } = await this.supabase
      .from('customer_health_history')
      .select('*')
      .eq('organization_id', organizationId)
      .gte(
        'calculated_at',
        new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('calculated_at', { ascending: true });

    if (error) {
      console.error('Health history query error:', error);
      return [];
    }

    return data.map((record) => ({
      date: record.calculated_at,
      score: record.overall_health_score,
      components: record.component_scores,
    }));
  }

  /**
   * Predict future health score based on trends
   */
  async predictHealthScore(
    organizationId: string,
    daysAhead: number = 30,
  ): Promise<{
    predictedScore: number;
    confidence: number;
    factors: string[];
  }> {
    const history = await this.getHealthHistory(organizationId, 90);

    if (history.length < 7) {
      return {
        predictedScore: history[history.length - 1]?.score || 50,
        confidence: 0.1,
        factors: ['Insufficient historical data'],
      };
    }

    // Simple linear regression for prediction (in production, use more sophisticated ML)
    const scores = history.map((h) => h.score);
    const trend = this.calculateLinearTrend(scores);
    const currentScore = scores[scores.length - 1];

    const predictedScore = Math.max(
      0,
      Math.min(100, currentScore + trend * daysAhead),
    );

    // Calculate confidence based on trend consistency
    const confidence = this.calculatePredictionConfidence(scores, trend);

    // Identify key factors affecting the prediction
    const factors = this.identifyPredictionFactors(history, trend);

    return {
      predictedScore: Math.round(predictedScore),
      confidence: Math.round(confidence * 100) / 100,
      factors,
    };
  }

  /**
   * Gather raw health data from multiple sources
   */
  private async gatherHealthData(organizationId: string, timeframe: string) {
    const daysBack = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Parallel data gathering from multiple tables
    const [
      activityData,
      featureUsageData,
      clientData,
      supportData,
      billingData,
      feedbackData,
    ] = await Promise.allSettled([
      this.getActivityData(organizationId, startDate),
      this.getFeatureUsageData(organizationId, startDate),
      this.getClientData(organizationId, startDate),
      this.getSupportData(organizationId, startDate),
      this.getBillingData(organizationId, startDate),
      this.getFeedbackData(organizationId, startDate),
    ]);

    return {
      activity: activityData.status === 'fulfilled' ? activityData.value : null,
      featureUsage:
        featureUsageData.status === 'fulfilled' ? featureUsageData.value : null,
      clients: clientData.status === 'fulfilled' ? clientData.value : null,
      support: supportData.status === 'fulfilled' ? supportData.value : null,
      billing: billingData.status === 'fulfilled' ? billingData.value : null,
      feedback: feedbackData.status === 'fulfilled' ? feedbackData.value : null,
    };
  }

  /**
   * Calculate individual health factors from raw data
   */
  private async calculateHealthFactors(
    rawData: any,
    timeframe: string,
  ): Promise<HealthFactors> {
    const timeMultiplier =
      timeframe === '7d' ? 4.3 : timeframe === '30d' ? 1 : 0.33; // Normalize to monthly

    return {
      // Engagement factors
      loginFrequency: this.calculateLoginFrequency(
        rawData.activity,
        timeMultiplier,
      ),
      featureUsage: this.calculateFeatureUsage(
        rawData.featureUsage,
        timeMultiplier,
      ),
      timeSpent: this.calculateTimeSpent(rawData.activity, timeMultiplier),

      // Adoption factors
      coreFeatureAdoption: this.calculateCoreFeatureAdoption(
        rawData.featureUsage,
      ),
      advancedFeatureUsage: this.calculateAdvancedFeatureUsage(
        rawData.featureUsage,
      ),
      workflowCompletion: this.calculateWorkflowCompletion(rawData.activity),

      // Growth factors
      clientGrowth: this.calculateClientGrowth(rawData.clients, timeMultiplier),
      revenueGrowth: this.calculateRevenueGrowth(
        rawData.billing,
        timeMultiplier,
      ),
      expansionUsage: this.calculateExpansionUsage(
        rawData.featureUsage,
        rawData.billing,
      ),

      // Satisfaction factors
      supportTicketTrend: this.calculateSupportTicketTrend(
        rawData.support,
        timeMultiplier,
      ),
      feedbackSentiment: this.calculateFeedbackSentiment(rawData.feedback),
      npsScore: this.calculateNPSScore(rawData.feedback),
    };
  }

  /**
   * Calculate component scores from health factors
   */
  private calculateComponentScores(
    factors: HealthFactors,
    weights: HealthWeights,
  ): HealthScoreComponents {
    return {
      engagement: Math.round(
        factors.loginFrequency * 0.4 +
          factors.featureUsage * 0.35 +
          factors.timeSpent * 0.25,
      ),
      adoption: Math.round(
        factors.coreFeatureAdoption * 0.5 +
          factors.advancedFeatureUsage * 0.3 +
          factors.workflowCompletion * 0.2,
      ),
      growth: Math.round(
        factors.clientGrowth * 0.4 +
          factors.revenueGrowth * 0.4 +
          factors.expansionUsage * 0.2,
      ),
      satisfaction: Math.round(
        factors.supportTicketTrend * 0.3 +
          factors.feedbackSentiment * 0.35 +
          factors.npsScore * 0.35,
      ),
    };
  }

  /**
   * Calculate overall weighted health score
   */
  private calculateOverallScore(
    components: HealthScoreComponents,
    weights: HealthWeights,
  ): number {
    return Math.round(
      components.engagement * weights.engagement +
        components.adoption * weights.adoption +
        components.growth * weights.growth +
        components.satisfaction * weights.satisfaction,
    );
  }

  /**
   * Analyze health trends over time
   */
  private async analyzeTrends(
    organizationId: string,
    timeframe: string,
  ): Promise<HealthTrendAnalysis> {
    const history = await this.getHealthHistory(
      organizationId,
      timeframe === '7d' ? 14 : timeframe === '30d' ? 60 : 180,
    );

    if (history.length < 3) {
      return {
        direction: 'stable',
        velocity: 0,
        volatility: 0,
        patterns: [],
      };
    }

    const scores = history.map((h) => h.score);
    const trend = this.calculateLinearTrend(scores);
    const volatility = this.calculateVolatility(scores);

    return {
      direction: trend > 1 ? 'improving' : trend < -1 ? 'declining' : 'stable',
      velocity: Math.abs(trend),
      volatility: volatility,
      patterns: this.identifyPatterns(scores),
    };
  }

  /**
   * Assess risk factors and churn probability
   */
  private assessRisk(
    factors: HealthFactors,
    trends: HealthTrendAnalysis,
    overallScore: number,
  ): RiskAssessment {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // Score-based risk
    if (overallScore < 40) riskScore += 30;
    else if (overallScore < 60) riskScore += 15;

    // Trend-based risk
    if (trends.direction === 'declining') {
      riskScore += 20;
      riskFactors.push('Declining health trend');
    }

    // Factor-based risks
    if (factors.loginFrequency < 30) {
      riskScore += 15;
      riskFactors.push('Low login frequency');
    }

    if (factors.supportTicketTrend > 70) {
      riskScore += 10;
      riskFactors.push('Increasing support tickets');
    }

    if (factors.clientGrowth < 0) {
      riskScore += 12;
      riskFactors.push('Client count declining');
    }

    // Calculate churn probability using a sophisticated model
    const churnProbability = this.calculateChurnProbability(
      factors,
      trends,
      overallScore,
    );

    return {
      riskLevel:
        riskScore > 50
          ? 'critical'
          : riskScore > 30
            ? 'high'
            : riskScore > 15
              ? 'medium'
              : 'low',
      churnProbability,
      riskFactors,
      interventionUrgency:
        riskScore > 40 ? 'immediate' : riskScore > 25 ? 'soon' : 'routine',
    };
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(
    factors: HealthFactors,
    trends: HealthTrendAnalysis,
    risk: RiskAssessment,
  ): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = [];

    // Engagement recommendations
    if (factors.loginFrequency < 40) {
      recommendations.push({
        category: 'engagement',
        priority: 'high',
        title: 'Improve Login Frequency',
        description: 'User login frequency is below healthy levels',
        actions: [
          'Send personalized email reminders',
          'Implement push notifications',
          'Create daily digest emails',
        ],
        estimatedImpact: 15,
      });
    }

    // Adoption recommendations
    if (factors.coreFeatureAdoption < 50) {
      recommendations.push({
        category: 'adoption',
        priority: 'high',
        title: 'Accelerate Feature Adoption',
        description: 'Core features are underutilized',
        actions: [
          'Schedule feature training session',
          'Create interactive tutorials',
          'Assign customer success manager',
        ],
        estimatedImpact: 20,
      });
    }

    // Growth recommendations
    if (factors.clientGrowth < 10) {
      recommendations.push({
        category: 'growth',
        priority: 'medium',
        title: 'Support Client Growth',
        description: 'Client growth rate is below potential',
        actions: [
          'Share growth best practices',
          'Introduce referral program',
          'Provide marketing templates',
        ],
        estimatedImpact: 12,
      });
    }

    // Risk-based recommendations
    if (risk.riskLevel === 'critical') {
      recommendations.unshift({
        category: 'retention',
        priority: 'critical',
        title: 'Immediate Intervention Required',
        description: 'Customer is at high risk of churn',
        actions: [
          'Schedule executive check-in call',
          'Offer premium support',
          'Create custom success plan',
        ],
        estimatedImpact: 35,
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Store calculated health metrics
   */
  private async storeHealthMetrics(
    metrics: AdvancedHealthMetrics,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('customer_health_history')
      .insert({
        organization_id: metrics.organizationId,
        overall_health_score: metrics.overallHealthScore,
        component_scores: metrics.components,
        trend_analysis: metrics.trends,
        risk_assessment: metrics.riskAssessment,
        recommendations: metrics.recommendations,
        segment_analysis: metrics.segmentAnalysis,
        calculated_at: metrics.lastCalculated.toISOString(),
      });

    if (error) {
      console.error('Failed to store health metrics:', error);
    }
  }

  // Helper calculation methods
  private calculateLoginFrequency(
    activityData: any,
    timeMultiplier: number,
  ): number {
    if (!activityData?.totalLogins) return 0;
    const normalizedLogins = activityData.totalLogins * timeMultiplier;
    return Math.min(100, (normalizedLogins / 30) * 100); // 30 logins per month = 100
  }

  private calculateFeatureUsage(
    featureData: any,
    timeMultiplier: number,
  ): number {
    if (!featureData?.featuresUsed) return 0;
    const uniqueFeatures = featureData.featuresUsed.length;
    return Math.min(100, (uniqueFeatures / 20) * 100); // 20 features = 100
  }

  private calculateTimeSpent(
    activityData: any,
    timeMultiplier: number,
  ): number {
    if (!activityData?.totalTimeMinutes) return 0;
    const normalizedTime = activityData.totalTimeMinutes * timeMultiplier;
    return Math.min(100, (normalizedTime / 1200) * 100); // 20 hours per month = 100
  }

  private calculateCoreFeatureAdoption(featureData: any): number {
    if (!featureData?.coreFeatures) return 0;
    const adoptedCore = featureData.coreFeatures.filter(
      (f: any) => f.used,
    ).length;
    return (adoptedCore / featureData.coreFeatures.length) * 100;
  }

  private calculateAdvancedFeatureUsage(featureData: any): number {
    if (!featureData?.advancedFeatures) return 0;
    const usedAdvanced = featureData.advancedFeatures.filter(
      (f: any) => f.used,
    ).length;
    return Math.min(
      100,
      (usedAdvanced / featureData.advancedFeatures.length) * 100,
    );
  }

  private calculateWorkflowCompletion(activityData: any): number {
    if (!activityData?.completedWorkflows || !activityData?.totalWorkflows)
      return 0;
    return (
      (activityData.completedWorkflows / activityData.totalWorkflows) * 100
    );
  }

  private calculateClientGrowth(
    clientData: any,
    timeMultiplier: number,
  ): number {
    if (!clientData?.growth) return 0;
    const monthlyGrowth = clientData.growth * timeMultiplier;
    return Math.max(0, Math.min(100, 50 + monthlyGrowth * 10)); // 5% growth = 100
  }

  private calculateRevenueGrowth(
    billingData: any,
    timeMultiplier: number,
  ): number {
    if (!billingData?.revenueGrowthRate) return 0;
    const monthlyGrowth = billingData.revenueGrowthRate * timeMultiplier;
    return Math.max(0, Math.min(100, 50 + monthlyGrowth * 5)); // 10% growth = 100
  }

  private calculateExpansionUsage(featureData: any, billingData: any): number {
    const planUtilization = billingData?.planUtilization || 0;
    return Math.min(100, planUtilization);
  }

  private calculateSupportTicketTrend(
    supportData: any,
    timeMultiplier: number,
  ): number {
    if (!supportData?.ticketTrend) return 100;
    // Inverse score - fewer tickets = better score
    const normalizedTrend = supportData.ticketTrend * timeMultiplier;
    return Math.max(0, 100 - normalizedTrend * 10);
  }

  private calculateFeedbackSentiment(feedbackData: any): number {
    if (!feedbackData?.sentimentScore) return 75; // Default neutral
    return Math.max(0, Math.min(100, (feedbackData.sentimentScore + 1) * 50)); // -1 to 1 -> 0 to 100
  }

  private calculateNPSScore(feedbackData: any): number {
    if (!feedbackData?.npsScore) return 70; // Default decent score
    return Math.max(0, Math.min(100, (feedbackData.npsScore + 100) / 2)); // -100 to 100 -> 0 to 100
  }

  private calculateLinearTrend(values: number[]): number {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private calculateVolatility(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    return Math.sqrt(variance);
  }

  private calculateChurnProbability(
    factors: HealthFactors,
    trends: HealthTrendAnalysis,
    score: number,
  ): number {
    let churnScore = 0;

    // Score impact (40% weight)
    churnScore += (100 - score) * 0.4;

    // Trend impact (30% weight)
    if (trends.direction === 'declining') {
      churnScore += trends.velocity * 3;
    }

    // Factor impacts (30% weight)
    if (factors.loginFrequency < 20) churnScore += 15;
    if (factors.clientGrowth < -10) churnScore += 10;
    if (factors.supportTicketTrend > 80) churnScore += 8;

    return Math.min(100, Math.max(0, churnScore));
  }

  private identifyPatterns(scores: number[]): string[] {
    const patterns: string[] = [];

    // Weekly patterns
    if (scores.length >= 7) {
      const weeklyAvg = scores.slice(-7).reduce((sum, s) => sum + s, 0) / 7;
      const prevWeekAvg =
        scores.slice(-14, -7).reduce((sum, s) => sum + s, 0) / 7;

      if (weeklyAvg > prevWeekAvg + 3) patterns.push('Weekly improvement');
      if (weeklyAvg < prevWeekAvg - 3) patterns.push('Weekly decline');
    }

    // Volatility patterns
    const volatility = this.calculateVolatility(scores);
    if (volatility > 10) patterns.push('High volatility');
    if (volatility < 3) patterns.push('Stable performance');

    return patterns;
  }

  private identifyPredictionFactors(history: any[], trend: number): string[] {
    const factors: string[] = [];

    if (trend > 2) factors.push('Strong positive trend');
    if (trend < -2) factors.push('Concerning negative trend');
    if (Math.abs(trend) < 0.5) factors.push('Stable baseline');

    // Add more sophisticated factor analysis here
    return factors;
  }

  private analyzeSegment(
    score: number,
    factors: HealthFactors,
    trends: HealthTrendAnalysis,
  ): SegmentAnalysis {
    let segment = 'healthy';
    let characteristics: string[] = [];

    if (score >= 80) {
      segment = 'champion';
      characteristics = ['High engagement', 'Strong adoption', 'Growing'];
    } else if (score >= 60) {
      segment = 'healthy';
      characteristics = ['Good engagement', 'Moderate adoption'];
    } else if (score >= 40) {
      segment = 'at_risk';
      characteristics = ['Declining engagement', 'Needs attention'];
    } else {
      segment = 'critical';
      characteristics = [
        'Low engagement',
        'High churn risk',
        'Immediate action required',
      ];
    }

    return {
      segment,
      characteristics,
      benchmarkComparison: this.calculateBenchmarkComparison(score),
      cohortAnalysis: this.calculateCohortAnalysis(factors),
    };
  }

  private calculateBenchmarkComparison(score: number): {
    percentile: number;
    industry: string;
  } {
    // Simplified benchmark comparison
    const percentile = Math.min(
      99,
      Math.max(1, Math.round((score / 100) * 95)),
    );
    return {
      percentile,
      industry: 'SaaS Platform',
    };
  }

  private calculateCohortAnalysis(factors: HealthFactors): {
    cohort: string;
    performance: string;
  } {
    // Simplified cohort analysis
    const cohort =
      factors.clientGrowth > 20
        ? 'High Growth'
        : factors.clientGrowth > 5
          ? 'Steady Growth'
          : 'Established';

    const performance =
      factors.loginFrequency > 60 ? 'Above Average' : 'Average';

    return { cohort, performance };
  }

  // Data fetching methods (simplified - in production these would query actual tables)
  private async getActivityData(organizationId: string, startDate: Date) {
    // Mock implementation - replace with actual query
    return {
      totalLogins: Math.floor(Math.random() * 50) + 10,
      totalTimeMinutes: Math.floor(Math.random() * 2000) + 500,
      completedWorkflows: Math.floor(Math.random() * 20) + 5,
      totalWorkflows: 25,
    };
  }

  private async getFeatureUsageData(organizationId: string, startDate: Date) {
    return {
      featuresUsed: Array.from(
        { length: Math.floor(Math.random() * 15) + 5 },
        (_, i) => `feature_${i}`,
      ),
      coreFeatures: Array.from({ length: 8 }, (_, i) => ({
        id: i,
        used: Math.random() > 0.3,
      })),
      advancedFeatures: Array.from({ length: 6 }, (_, i) => ({
        id: i,
        used: Math.random() > 0.6,
      })),
    };
  }

  private async getClientData(organizationId: string, startDate: Date) {
    return {
      growth: (Math.random() - 0.5) * 20, // -10% to +10% monthly growth
    };
  }

  private async getSupportData(organizationId: string, startDate: Date) {
    return {
      ticketTrend: (Math.random() - 0.5) * 10, // -5 to +5 trend
    };
  }

  private async getBillingData(organizationId: string, startDate: Date) {
    return {
      revenueGrowthRate: (Math.random() - 0.3) * 15, // -4.5% to +10.5% monthly
      planUtilization: Math.random() * 100,
    };
  }

  private async getFeedbackData(organizationId: string, startDate: Date) {
    return {
      sentimentScore: (Math.random() - 0.5) * 2, // -1 to +1
      npsScore: (Math.random() - 0.5) * 200, // -100 to +100
    };
  }
}

export const advancedHealthScoringEngine = new AdvancedHealthScoringEngine();
