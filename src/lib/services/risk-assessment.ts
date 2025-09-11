/**
 * WS-142: RiskAssessment - Identify At-Risk Users with Declining Engagement
 * Comprehensive risk analysis system for customer success and churn prevention
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { redis } from '@/lib/redis';
import {
  healthScoringEngine,
  HealthScoreComponents,
} from './health-scoring-engine';
import { activityTracker } from './activity-tracker';

export interface RiskAssessment {
  userId: string;
  organizationId?: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskCategory:
    | 'engagement'
    | 'adoption'
    | 'satisfaction'
    | 'retention'
    | 'value_realization';

  // Risk components
  engagementRisk: RiskComponent;
  adoptionRisk: RiskComponent;
  satisfactionRisk: RiskComponent;
  retentionRisk: RiskComponent;
  valueRealizationRisk: RiskComponent;

  // Risk indicators
  riskIndicators: RiskIndicator[];
  churnProbability: number;
  timeToChurn: number; // days

  // Trend analysis
  riskTrend: 'improving' | 'stable' | 'deteriorating' | 'volatile';
  previousRiskScore?: number;
  riskVelocity: number; // rate of change

  // Recommendations
  interventionRecommendations: InterventionRecommendation[];

  assessedAt: Date;
  nextAssessmentDue: Date;
}

export interface RiskComponent {
  componentName: string;
  riskScore: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
  weight: number; // contribution to overall risk
  indicators: ComponentIndicator[];
  trend: 'improving' | 'stable' | 'deteriorating';
  lastUpdated: Date;
}

export interface ComponentIndicator {
  indicatorType: string;
  currentValue: number;
  benchmarkValue: number;
  threshold: number;
  variance: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface RiskIndicator {
  id: string;
  type: 'behavioral' | 'engagement' | 'technical' | 'business' | 'temporal';
  category: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  impact: number; // 0-100
  urgency: number; // 0-100

  // Data points
  currentValue: number;
  previousValue?: number;
  benchmarkValue: number;
  thresholdValue: number;

  // Context
  detectedAt: Date;
  firstSeenAt?: Date;
  frequency: 'once' | 'occasional' | 'frequent' | 'persistent';

  // Recommendations
  recommendedActions: string[];
  estimatedImpact: string;
  interventionUrgency:
    | 'immediate'
    | 'within_24h'
    | 'within_week'
    | 'next_month';
}

export interface InterventionRecommendation {
  interventionId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'proactive_outreach'
    | 'feature_guidance'
    | 'success_coaching'
    | 'technical_support'
    | 'account_management';
  title: string;
  description: string;

  // Targeting
  targetRiskFactors: string[];
  expectedImpact: number; // expected risk reduction
  confidenceLevel: number; // 0-100

  // Implementation
  actionItems: ActionItem[];
  timeframe: 'immediate' | '24_hours' | 'within_week' | 'within_month';
  estimatedEffort: 'low' | 'medium' | 'high';

  // Success metrics
  successMetrics: string[];
  expectedOutcome: string;
  followUpActions: string[];
}

export interface ActionItem {
  action: string;
  assignedTo:
    | 'customer_success'
    | 'support'
    | 'product'
    | 'sales'
    | 'automated_system';
  priority: number;
  estimatedDuration: number; // minutes
  prerequisites: string[];
}

export interface RiskBenchmark {
  userSegment: string;
  organizationSize: 'small' | 'medium' | 'large' | 'enterprise';
  industry?: string;
  timeInPlatform: 'new' | 'onboarding' | 'established' | 'mature';

  benchmarks: {
    excellentThreshold: number; // Low risk
    goodThreshold: number;
    averageThreshold: number;
    concerningThreshold: number;
    criticalThreshold: number; // High risk
  };
}

const riskAssessmentSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  includeTrendAnalysis: z.boolean().default(true),
  includeRecommendations: z.boolean().default(true),
  forceRefresh: z.boolean().default(false),
});

export class RiskAssessmentService {
  private supabase: SupabaseClient;
  private cachePrefix = 'risk_assessment:';
  private cacheTTL = 7200; // 2 hours

  // Risk component weights
  private riskWeights = {
    engagement: 0.3,
    adoption: 0.25,
    satisfaction: 0.2,
    retention: 0.15,
    value_realization: 0.1,
  };

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Perform comprehensive risk assessment for a user
   */
  async assessUserRisk(
    userId: string,
    organizationId?: string,
    options: {
      includeTrendAnalysis?: boolean;
      includeRecommendations?: boolean;
      forceRefresh?: boolean;
    } = {},
  ): Promise<RiskAssessment> {
    const validation = riskAssessmentSchema.safeParse({
      userId,
      organizationId,
      ...options,
    });

    if (!validation.success) {
      throw new Error(
        `Invalid risk assessment parameters: ${validation.error.message}`,
      );
    }

    const cacheKey = `${this.cachePrefix}${userId}`;

    // Check cache first
    if (!options.forceRefresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const cachedAssessment = JSON.parse(cached);
          if (new Date(cachedAssessment.nextAssessmentDue) > new Date()) {
            return cachedAssessment;
          }
        }
      } catch (error) {
        console.warn('Cache read error for risk assessment:', error);
      }
    }

    try {
      // Step 1: Gather comprehensive user data
      const [healthScore, activityProfile, historicalData, userContext] =
        await Promise.all([
          healthScoringEngine.calculateHealthScore(
            userId,
            options.forceRefresh,
            organizationId,
          ),
          activityTracker.getUserAdoptionProfile(userId, organizationId),
          this.getHistoricalRiskData(userId),
          this.getUserContextData(userId, organizationId),
        ]);

      // Step 2: Calculate individual risk components
      const riskComponents = await this.calculateRiskComponents(
        healthScore,
        activityProfile,
        historicalData,
        userContext,
      );

      // Step 3: Calculate overall risk score and level
      const overallRiskScore = this.calculateOverallRiskScore(riskComponents);
      const riskLevel = this.determineRiskLevel(overallRiskScore);
      const riskCategory = this.determinePrimaryRiskCategory(riskComponents);

      // Step 4: Identify specific risk indicators
      const riskIndicators = await this.identifyRiskIndicators(
        healthScore,
        activityProfile,
        riskComponents,
        historicalData,
      );

      // Step 5: Calculate churn probability and timeline
      const { churnProbability, timeToChurn } = this.calculateChurnMetrics(
        overallRiskScore,
        riskIndicators,
        historicalData,
      );

      // Step 6: Analyze trends if requested
      let trendAnalysis = { riskTrend: 'stable' as const, riskVelocity: 0 };
      if (options.includeTrendAnalysis) {
        trendAnalysis = await this.analyzeTrends(
          userId,
          overallRiskScore,
          historicalData,
        );
      }

      // Step 7: Generate intervention recommendations if requested
      let interventionRecommendations: InterventionRecommendation[] = [];
      if (options.includeRecommendations) {
        interventionRecommendations =
          await this.generateInterventionRecommendations(
            riskComponents,
            riskIndicators,
            userContext,
          );
      }

      const assessment: RiskAssessment = {
        userId,
        organizationId,
        overallRiskScore,
        riskLevel,
        riskCategory,
        engagementRisk: riskComponents.engagement,
        adoptionRisk: riskComponents.adoption,
        satisfactionRisk: riskComponents.satisfaction,
        retentionRisk: riskComponents.retention,
        valueRealizationRisk: riskComponents.value_realization,
        riskIndicators,
        churnProbability,
        timeToChurn,
        riskTrend: trendAnalysis.riskTrend,
        previousRiskScore:
          historicalData.length > 0 ? historicalData[0].risk_score : undefined,
        riskVelocity: trendAnalysis.riskVelocity,
        interventionRecommendations,
        assessedAt: new Date(),
        nextAssessmentDue: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      // Store assessment history
      await this.storeRiskAssessmentHistory(assessment);

      // Cache the result
      try {
        await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(assessment));
      } catch (error) {
        console.warn('Cache write error for risk assessment:', error);
      }

      return assessment;
    } catch (error) {
      console.error('Error assessing user risk:', error);
      throw error;
    }
  }

  /**
   * Batch assess risk for multiple users
   */
  async batchAssessRisk(
    userIds: string[],
    organizationId?: string,
    options: { forceRefresh?: boolean } = {},
  ): Promise<Map<string, RiskAssessment>> {
    const results = new Map<string, RiskAssessment>();
    const batchSize = 3; // Small batches for risk assessment

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const promises = batch.map((userId) =>
        this.assessUserRisk(userId, organizationId, options)
          .then((assessment) => ({ userId, assessment }))
          .catch((error) => ({ userId, error })),
      );

      const batchResults = await Promise.allSettled(promises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { userId, assessment, error } = result.value as any;
          if (assessment && !error) {
            results.set(userId, assessment);
          }
        }
      });
    }

    return results;
  }

  /**
   * Get high-risk users requiring immediate intervention
   */
  async getHighRiskUsers(
    organizationId?: string,
    riskLevel: 'high' | 'critical' = 'high',
    limit: number = 50,
  ): Promise<RiskAssessment[]> {
    try {
      let query = this.supabase
        .from('risk_assessment_history')
        .select('*')
        .in(
          'risk_level',
          riskLevel === 'high' ? ['high', 'critical'] : ['critical'],
        )
        .order('overall_risk_score', { ascending: false })
        .limit(limit);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: highRiskData, error } = await query;

      if (error || !highRiskData) {
        console.error('Error fetching high-risk users:', error);
        return [];
      }

      // Convert database records to RiskAssessment objects
      return highRiskData.map((record) =>
        this.convertDbRecordToRiskAssessment(record),
      );
    } catch (error) {
      console.error('Error getting high-risk users:', error);
      return [];
    }
  }

  /**
   * Monitor risk trends across organization
   */
  async getRiskTrends(
    organizationId?: string,
    timeframe: '7d' | '30d' | '90d' = '30d',
  ): Promise<RiskTrendAnalysis> {
    try {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      let query = this.supabase
        .from('risk_assessment_history')
        .select(
          `
          assessed_at,
          overall_risk_score,
          risk_level,
          churn_probability,
          user_id
        `,
        )
        .gte('assessed_at', startDate.toISOString())
        .order('assessed_at', { ascending: true });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: trendData, error } = await query;

      if (error || !trendData) {
        console.error('Error fetching risk trends:', error);
        return this.getEmptyRiskTrendAnalysis();
      }

      return this.analyzeTrendData(trendData);
    } catch (error) {
      console.error('Error getting risk trends:', error);
      return this.getEmptyRiskTrendAnalysis();
    }
  }

  // Private helper methods

  private async calculateRiskComponents(
    healthScore: HealthScoreComponents,
    activityProfile: any,
    historicalData: any[],
    userContext: any,
  ): Promise<Record<string, RiskComponent>> {
    const components: Record<string, RiskComponent> = {};

    // Engagement Risk
    components.engagement = await this.calculateEngagementRisk(
      healthScore,
      activityProfile,
      userContext,
    );

    // Adoption Risk
    components.adoption = await this.calculateAdoptionRisk(
      activityProfile,
      userContext,
    );

    // Satisfaction Risk
    components.satisfaction = await this.calculateSatisfactionRisk(
      healthScore,
      userContext,
    );

    // Retention Risk
    components.retention = await this.calculateRetentionRisk(
      healthScore,
      activityProfile,
      historicalData,
      userContext,
    );

    // Value Realization Risk
    components.value_realization = await this.calculateValueRealizationRisk(
      healthScore,
      activityProfile,
    );

    return components;
  }

  private async calculateEngagementRisk(
    healthScore: HealthScoreComponents,
    activityProfile: any,
    userContext: any,
  ): Promise<RiskComponent> {
    const engagementScore = healthScore.engagement_frequency;
    const lastActivityDays = Math.floor(
      (new Date().getTime() - activityProfile.lastActivityDate.getTime()) /
        (24 * 60 * 60 * 1000),
    );

    // Calculate risk score (inverted engagement score with recency penalty)
    let riskScore = 100 - engagementScore;
    if (lastActivityDays > 7) riskScore += Math.min(30, lastActivityDays * 2);
    if (lastActivityDays > 14) riskScore += 20;

    riskScore = Math.min(100, riskScore);

    const indicators: ComponentIndicator[] = [
      {
        indicatorType: 'login_frequency',
        currentValue: activityProfile.engagementScore,
        benchmarkValue: 75,
        threshold: 50,
        variance: 75 - activityProfile.engagementScore,
        impactLevel:
          activityProfile.engagementScore < 30
            ? 'critical'
            : activityProfile.engagementScore < 50
              ? 'high'
              : 'medium',
        description: `User engagement score: ${activityProfile.engagementScore}/100`,
      },
      {
        indicatorType: 'activity_recency',
        currentValue: lastActivityDays,
        benchmarkValue: 3,
        threshold: 7,
        variance: lastActivityDays - 3,
        impactLevel:
          lastActivityDays > 14
            ? 'critical'
            : lastActivityDays > 7
              ? 'high'
              : 'low',
        description: `Days since last activity: ${lastActivityDays}`,
      },
    ];

    return {
      componentName: 'engagement',
      riskScore,
      severity:
        riskScore >= 80
          ? 'critical'
          : riskScore >= 60
            ? 'high'
            : riskScore >= 40
              ? 'medium'
              : 'low',
      weight: this.riskWeights.engagement,
      indicators,
      trend: this.determineComponentTrend(riskScore, 'engagement'),
      lastUpdated: new Date(),
    };
  }

  private async calculateAdoptionRisk(
    activityProfile: any,
    userContext: any,
  ): Promise<RiskComponent> {
    const adoptionPercentage = activityProfile.adoptionPercentage || 0;
    const featuresUsed = activityProfile.featuresUsed || 0;

    // Risk increases with lower adoption
    const riskScore = Math.max(0, 100 - adoptionPercentage - featuresUsed * 5);

    const indicators: ComponentIndicator[] = [
      {
        indicatorType: 'feature_adoption_rate',
        currentValue: adoptionPercentage,
        benchmarkValue: 60,
        threshold: 30,
        variance: 60 - adoptionPercentage,
        impactLevel:
          adoptionPercentage < 20
            ? 'critical'
            : adoptionPercentage < 40
              ? 'high'
              : 'medium',
        description: `Feature adoption rate: ${adoptionPercentage}%`,
      },
    ];

    return {
      componentName: 'adoption',
      riskScore: Math.min(100, riskScore),
      severity:
        riskScore >= 70
          ? 'critical'
          : riskScore >= 50
            ? 'high'
            : riskScore >= 30
              ? 'medium'
              : 'low',
      weight: this.riskWeights.adoption,
      indicators,
      trend: this.determineComponentTrend(riskScore, 'adoption'),
      lastUpdated: new Date(),
    };
  }

  private async calculateSatisfactionRisk(
    healthScore: HealthScoreComponents,
    userContext: any,
  ): Promise<RiskComponent> {
    // Use support interaction quality as satisfaction proxy
    const satisfactionScore = healthScore.support_interaction_quality;
    const riskScore = 100 - satisfactionScore;

    const indicators: ComponentIndicator[] = [
      {
        indicatorType: 'support_satisfaction',
        currentValue: satisfactionScore,
        benchmarkValue: 85,
        threshold: 70,
        variance: 85 - satisfactionScore,
        impactLevel: satisfactionScore < 60 ? 'high' : 'medium',
        description: `Support satisfaction score: ${satisfactionScore}/100`,
      },
    ];

    return {
      componentName: 'satisfaction',
      riskScore: Math.min(100, riskScore),
      severity: riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
      weight: this.riskWeights.satisfaction,
      indicators,
      trend: this.determineComponentTrend(riskScore, 'satisfaction'),
      lastUpdated: new Date(),
    };
  }

  private async calculateRetentionRisk(
    healthScore: HealthScoreComponents,
    activityProfile: any,
    historicalData: any[],
    userContext: any,
  ): Promise<RiskComponent> {
    const retentionScore = healthScore.retention_indicators;
    const accountAge = userContext.accountAgeInDays || 30;

    // Higher risk for newer accounts and declining trends
    let riskScore = 100 - retentionScore;
    if (accountAge < 30) riskScore += 20; // New account risk
    if (healthScore.trend_direction === 'declining') riskScore += 25;

    const indicators: ComponentIndicator[] = [
      {
        indicatorType: 'retention_indicators',
        currentValue: retentionScore,
        benchmarkValue: 80,
        threshold: 60,
        variance: 80 - retentionScore,
        impactLevel: retentionScore < 50 ? 'critical' : 'medium',
        description: `Retention indicator score: ${retentionScore}/100`,
      },
    ];

    return {
      componentName: 'retention',
      riskScore: Math.min(100, riskScore),
      severity:
        riskScore >= 70
          ? 'critical'
          : riskScore >= 50
            ? 'high'
            : riskScore >= 30
              ? 'medium'
              : 'low',
      weight: this.riskWeights.retention,
      indicators,
      trend: this.determineComponentTrend(riskScore, 'retention'),
      lastUpdated: new Date(),
    };
  }

  private async calculateValueRealizationRisk(
    healthScore: HealthScoreComponents,
    activityProfile: any,
  ): Promise<RiskComponent> {
    const valueScore = healthScore.platform_value_realization;
    const riskScore = Math.max(0, 100 - valueScore);

    const indicators: ComponentIndicator[] = [
      {
        indicatorType: 'value_realization',
        currentValue: valueScore,
        benchmarkValue: 75,
        threshold: 50,
        variance: 75 - valueScore,
        impactLevel: valueScore < 40 ? 'high' : 'medium',
        description: `Value realization score: ${valueScore}/100`,
      },
    ];

    return {
      componentName: 'value_realization',
      riskScore,
      severity: riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
      weight: this.riskWeights.value_realization,
      indicators,
      trend: this.determineComponentTrend(riskScore, 'value_realization'),
      lastUpdated: new Date(),
    };
  }

  private calculateOverallRiskScore(
    components: Record<string, RiskComponent>,
  ): number {
    return Math.round(
      Object.values(components).reduce((total, component) => {
        return total + component.riskScore * component.weight;
      }, 0),
    );
  }

  private determineRiskLevel(
    riskScore: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  private determinePrimaryRiskCategory(
    components: Record<string, RiskComponent>,
  ): RiskAssessment['riskCategory'] {
    const sortedComponents = Object.entries(components).sort(
      ([, a], [, b]) => b.riskScore * b.weight - a.riskScore * a.weight,
    );

    return sortedComponents[0][0] as RiskAssessment['riskCategory'];
  }

  private async identifyRiskIndicators(
    healthScore: HealthScoreComponents,
    activityProfile: any,
    riskComponents: Record<string, RiskComponent>,
    historicalData: any[],
  ): Promise<RiskIndicator[]> {
    const indicators: RiskIndicator[] = [];

    // Engagement risk indicators
    if (riskComponents.engagement.riskScore > 60) {
      indicators.push({
        id: crypto.randomUUID(),
        type: 'engagement',
        category: 'User Activity',
        title: 'Low Engagement Detected',
        description: 'User engagement has dropped below healthy levels',
        severity: riskComponents.engagement.severity,
        confidence: 85,
        impact: 75,
        urgency: 80,
        currentValue: activityProfile.engagementScore,
        benchmarkValue: 75,
        thresholdValue: 50,
        detectedAt: new Date(),
        frequency: 'frequent',
        recommendedActions: [
          'Send personalized re-engagement email',
          'Schedule success manager check-in',
          'Provide feature usage tips',
        ],
        estimatedImpact: 'High - directly correlates with churn risk',
        interventionUrgency: 'within_24h',
      });
    }

    // Adoption risk indicators
    if (riskComponents.adoption.riskScore > 50) {
      indicators.push({
        id: crypto.randomUUID(),
        type: 'behavioral',
        category: 'Feature Adoption',
        title: 'Limited Feature Adoption',
        description: 'User is not exploring platform capabilities',
        severity: riskComponents.adoption.severity,
        confidence: 80,
        impact: 65,
        urgency: 60,
        currentValue: activityProfile.adoptionPercentage,
        benchmarkValue: 60,
        thresholdValue: 30,
        detectedAt: new Date(),
        frequency: 'persistent',
        recommendedActions: [
          'Initiate feature discovery tour',
          'Send targeted feature tutorials',
          'Analyze workflow optimization opportunities',
        ],
        estimatedImpact: 'Medium - affects long-term value realization',
        interventionUrgency: 'within_week',
      });
    }

    return indicators.sort(
      (a, b) => b.urgency * b.impact - a.urgency * a.impact,
    );
  }

  private calculateChurnMetrics(
    riskScore: number,
    riskIndicators: RiskIndicator[],
    historicalData: any[],
  ): { churnProbability: number; timeToChurn: number } {
    // Simplified churn calculation - would use ML models in production
    const churnProbability = Math.min(
      95,
      riskScore * 0.8 + riskIndicators.length * 5,
    );

    let timeToChurn = 365; // Default 1 year
    if (riskScore >= 80)
      timeToChurn = 30; // 1 month
    else if (riskScore >= 60)
      timeToChurn = 90; // 3 months
    else if (riskScore >= 40) timeToChurn = 180; // 6 months

    return { churnProbability: Math.round(churnProbability), timeToChurn };
  }

  private async analyzeTrends(
    userId: string,
    currentRiskScore: number,
    historicalData: any[],
  ): Promise<{
    riskTrend: 'improving' | 'stable' | 'deteriorating' | 'volatile';
    riskVelocity: number;
  }> {
    if (historicalData.length < 2) {
      return { riskTrend: 'stable', riskVelocity: 0 };
    }

    const previousScore = historicalData[0].risk_score;
    const riskVelocity = currentRiskScore - previousScore;

    let riskTrend: 'improving' | 'stable' | 'deteriorating' | 'volatile' =
      'stable';

    if (Math.abs(riskVelocity) > 20) {
      riskTrend = 'volatile';
    } else if (riskVelocity > 10) {
      riskTrend = 'deteriorating';
    } else if (riskVelocity < -10) {
      riskTrend = 'improving';
    }

    return { riskTrend, riskVelocity };
  }

  private async generateInterventionRecommendations(
    riskComponents: Record<string, RiskComponent>,
    riskIndicators: RiskIndicator[],
    userContext: any,
  ): Promise<InterventionRecommendation[]> {
    const recommendations: InterventionRecommendation[] = [];

    // High engagement risk intervention
    if (riskComponents.engagement.riskScore > 70) {
      recommendations.push({
        interventionId: crypto.randomUUID(),
        priority: 'high',
        category: 'proactive_outreach',
        title: 'Immediate Success Manager Outreach',
        description:
          'User shows signs of disengagement requiring personal intervention',
        targetRiskFactors: ['engagement_decline', 'low_activity'],
        expectedImpact: 45,
        confidenceLevel: 85,
        actionItems: [
          {
            action: 'Schedule 15-minute check-in call within 24 hours',
            assignedTo: 'customer_success',
            priority: 1,
            estimatedDuration: 30,
            prerequisites: ['User contact information verified'],
          },
          {
            action: 'Send personalized re-engagement email with usage insights',
            assignedTo: 'automated_system',
            priority: 2,
            estimatedDuration: 5,
            prerequisites: [],
          },
        ],
        timeframe: '24_hours',
        estimatedEffort: 'medium',
        successMetrics: [
          'Increased login frequency',
          'Feature usage improvement',
          'User feedback score',
        ],
        expectedOutcome: 'Renewed engagement and value recognition',
        followUpActions: [
          'Weekly check-ins for next month',
          'Feature adoption coaching',
        ],
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Database and utility helper methods

  private async getHistoricalRiskData(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('risk_assessment_history')
      .select('*')
      .eq('user_id', userId)
      .order('assessed_at', { ascending: false })
      .limit(10);

    return error ? [] : data;
  }

  private async getUserContextData(
    userId: string,
    organizationId?: string,
  ): Promise<any> {
    const { data: userProfile, error } = await this.supabase
      .from('user_profiles')
      .select(
        `
        id,
        created_at,
        last_sign_in_at,
        organization_id,
        user_type,
        organizations (
          size,
          industry
        )
      `,
      )
      .eq('id', userId)
      .single();

    if (error || !userProfile) {
      return {
        accountAgeInDays: 30,
        userType: 'standard',
        organizationSize: 'small',
      };
    }

    const accountAgeInDays = Math.floor(
      (new Date().getTime() - new Date(userProfile.created_at).getTime()) /
        (24 * 60 * 60 * 1000),
    );

    return {
      accountAgeInDays,
      userType: userProfile.user_type || 'standard',
      organizationSize: userProfile.organizations?.size || 'small',
      industry: userProfile.organizations?.industry,
    };
  }

  private async storeRiskAssessmentHistory(
    assessment: RiskAssessment,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('risk_assessment_history')
        .insert({
          user_id: assessment.userId,
          organization_id: assessment.organizationId,
          overall_risk_score: assessment.overallRiskScore,
          risk_level: assessment.riskLevel,
          risk_category: assessment.riskCategory,
          churn_probability: assessment.churnProbability,
          time_to_churn: assessment.timeToChurn,
          risk_trend: assessment.riskTrend,
          risk_velocity: assessment.riskVelocity,
          risk_indicators: assessment.riskIndicators,
          intervention_recommendations: assessment.interventionRecommendations,
          assessed_at: assessment.assessedAt.toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing risk assessment history:', error);
    }
  }

  private determineComponentTrend(
    riskScore: number,
    component: string,
  ): 'improving' | 'stable' | 'deteriorating' {
    // Simplified trend determination - would use historical data in production
    if (riskScore > 70) return 'deteriorating';
    if (riskScore < 30) return 'improving';
    return 'stable';
  }

  private convertDbRecordToRiskAssessment(record: any): RiskAssessment {
    // Convert database record to RiskAssessment object
    return {
      userId: record.user_id,
      organizationId: record.organization_id,
      overallRiskScore: record.overall_risk_score,
      riskLevel: record.risk_level,
      riskCategory: record.risk_category,
      // ... other properties would be reconstructed
    } as RiskAssessment;
  }

  private analyzeTrendData(trendData: any[]): RiskTrendAnalysis {
    // Analyze trend data and return insights
    return {
      averageRiskScore:
        trendData.reduce((sum, d) => sum + d.overall_risk_score, 0) /
        trendData.length,
      riskDistribution: this.calculateRiskDistribution(trendData),
      trendDirection: 'stable',
      usersAtRisk: trendData.filter((d) =>
        ['high', 'critical'].includes(d.risk_level),
      ).length,
      totalUsers: new Set(trendData.map((d) => d.user_id)).size,
    };
  }

  private calculateRiskDistribution(data: any[]): Record<string, number> {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    data.forEach((record) => {
      distribution[record.risk_level as keyof typeof distribution]++;
    });
    return distribution;
  }

  private getEmptyRiskTrendAnalysis(): RiskTrendAnalysis {
    return {
      averageRiskScore: 0,
      riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
      trendDirection: 'stable',
      usersAtRisk: 0,
      totalUsers: 0,
    };
  }
}

interface RiskTrendAnalysis {
  averageRiskScore: number;
  riskDistribution: Record<string, number>;
  trendDirection: 'improving' | 'stable' | 'deteriorating';
  usersAtRisk: number;
  totalUsers: number;
}

// Export singleton instance
export const riskAssessmentService = new RiskAssessmentService();
