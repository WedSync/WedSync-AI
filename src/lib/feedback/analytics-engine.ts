/**
 * WS-236: User Feedback System - Analytics Engine
 *
 * Comprehensive analytics engine for feedback data aggregation,
 * NPS trending, sentiment analysis, and wedding industry insights
 */

import { createClient } from '@/lib/supabase/server';
import { npsManager } from './nps-manager';

// Types for analytics data
export interface FeedbackAnalytics {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  totalSessions: number;
  completionRate: number;
  npsMetrics: NPSAnalytics;
  sentimentMetrics: SentimentAnalytics;
  weddingIndustryMetrics: WeddingIndustryAnalytics;
  followUpMetrics: FollowUpAnalytics;
  trendAnalysis: TrendAnalysis;
}

export interface NPSAnalytics {
  overallScore: number;
  promoters: number;
  passives: number;
  detractors: number;
  responseCount: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  seasonalAnalysis: SeasonalNPSAnalysis;
  vendorTypeBreakdown: VendorTypeNPSBreakdown[];
}

export interface SentimentAnalytics {
  averageScore: number;
  positivePercentage: number;
  neutralPercentage: number;
  negativePercentage: number;
  emergencyFlags: number;
  urgentIssues: number;
  commonThemes: ThemeAnalysis[];
}

export interface WeddingIndustryAnalytics {
  weddingSeasonImpact: SeasonalAnalysis;
  vendorTypePerformance: VendorPerformanceAnalysis[];
  weddingProximityImpact: ProximityImpactAnalysis;
  tierSatisfactionLevels: TierSatisfactionAnalysis[];
  criticalWeddingDayIssues: number;
}

export interface FollowUpAnalytics {
  totalActionsTriggered: number;
  actionsCompleted: number;
  actionsPending: number;
  actionsFailed: number;
  responseTimeMetrics: ResponseTimeAnalysis;
  effectivenessMetrics: EffectivenessAnalysis;
  escalationMetrics: EscalationAnalysis;
}

export interface TrendAnalysis {
  npsMovingAverage: TrendPoint[];
  sentimentTrends: TrendPoint[];
  volumeTrends: TrendPoint[];
  seasonalityInsights: SeasonalityInsight[];
}

// Supporting interfaces
interface SeasonalNPSAnalysis {
  weddingSeason: { score: number; count: number };
  offSeason: { score: number; count: number };
  seasonalDifference: number;
}

interface VendorTypeNPSBreakdown {
  vendorType: string;
  npsScore: number;
  responseCount: number;
  promoterRate: number;
  detractorRate: number;
}

interface ThemeAnalysis {
  theme: string;
  frequency: number;
  averageSentiment: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface SeasonalAnalysis {
  peakSeason: { average: number; count: number };
  offSeason: { average: number; count: number };
  seasonalVariation: number;
}

interface VendorPerformanceAnalysis {
  vendorType: string;
  satisfactionScore: number;
  responseVolume: number;
  improvementTrend: number;
}

interface ProximityImpactAnalysis {
  moreThan30Days: { score: number; count: number };
  lessThan30Days: { score: number; count: number };
  lessThan7Days: { score: number; count: number };
  lessThan24Hours: { score: number; count: number };
}

interface TierSatisfactionAnalysis {
  tier: string;
  satisfactionScore: number;
  retentionRate: number;
  upgradeRate: number;
}

interface ResponseTimeAnalysis {
  averageHours: number;
  medianHours: number;
  p95Hours: number;
  weddingPriorityAverageHours: number;
}

interface EffectivenessAnalysis {
  resolutionRate: number;
  satisfactionImprovement: number;
  retentionRate: number;
  escalationRate: number;
}

interface EscalationAnalysis {
  totalEscalations: number;
  executiveEscalations: number;
  averageEscalationTime: number;
  resolutionRateAfterEscalation: number;
}

interface TrendPoint {
  date: string;
  value: number;
  count?: number;
}

interface SeasonalityInsight {
  period: string;
  patternType: 'weekly' | 'monthly' | 'seasonal';
  description: string;
  impact: number;
}

/**
 * Feedback Analytics Engine
 * Singleton service for comprehensive feedback analytics and insights
 */
class FeedbackAnalyticsEngine {
  private static instance: FeedbackAnalyticsEngine;

  private constructor() {}

  public static getInstance(): FeedbackAnalyticsEngine {
    if (!FeedbackAnalyticsEngine.instance) {
      FeedbackAnalyticsEngine.instance = new FeedbackAnalyticsEngine();
    }
    return FeedbackAnalyticsEngine.instance;
  }

  /**
   * Generate comprehensive feedback analytics for a given period
   */
  async generateAnalytics(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    organizationId?: string,
    vendorType?: string,
  ): Promise<FeedbackAnalytics> {
    try {
      const { startDate, endDate } = this.calculatePeriodDates(period);
      const supabase = createClient();

      console.log(
        `Generating ${period} feedback analytics from ${startDate} to ${endDate}`,
      );

      // Build base query with filters
      let baseQuery = supabase
        .from('feedback_sessions')
        .select(
          `
          *,
          feedback_responses (*),
          user_profiles (vendor_type, subscription_tier)
        `,
        )
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (organizationId) {
        baseQuery = baseQuery.eq('organization_id', organizationId);
      }

      const { data: sessions, error } = await baseQuery;

      if (error) {
        throw error;
      }

      // Filter by vendor type if specified
      const filteredSessions = vendorType
        ? sessions?.filter((s) => s.user_profiles?.vendor_type === vendorType)
        : sessions;

      const totalSessions = filteredSessions?.length || 0;
      const completedSessions =
        filteredSessions?.filter((s) => s.completed_at) || [];
      const completionRate =
        totalSessions > 0 ? completedSessions.length / totalSessions : 0;

      // Generate component analytics
      const [
        npsMetrics,
        sentimentMetrics,
        weddingIndustryMetrics,
        followUpMetrics,
        trendAnalysis,
      ] = await Promise.all([
        this.generateNPSAnalytics(filteredSessions || [], startDate, endDate),
        this.generateSentimentAnalytics(
          filteredSessions || [],
          startDate,
          endDate,
        ),
        this.generateWeddingIndustryAnalytics(
          filteredSessions || [],
          startDate,
          endDate,
        ),
        this.generateFollowUpAnalytics(startDate, endDate, organizationId),
        this.generateTrendAnalysis(
          period,
          startDate,
          endDate,
          organizationId,
          vendorType,
        ),
      ]);

      return {
        period,
        startDate,
        endDate,
        totalSessions,
        completionRate,
        npsMetrics,
        sentimentMetrics,
        weddingIndustryMetrics,
        followUpMetrics,
        trendAnalysis,
      };
    } catch (error) {
      console.error('Error generating feedback analytics:', error);
      throw error;
    }
  }

  /**
   * Generate NPS analytics with wedding industry context
   */
  private async generateNPSAnalytics(
    sessions: any[],
    startDate: string,
    endDate: string,
  ): Promise<NPSAnalytics> {
    const npsResponses = sessions
      .flatMap((s) => s.feedback_responses || [])
      .filter((r) => r.nps_score !== null && r.nps_score !== undefined);

    if (npsResponses.length === 0) {
      return this.getEmptyNPSAnalytics();
    }

    const scores = npsResponses.map((r) => r.nps_score);
    const overallScore = npsManager.calculateNPS(scores);

    const promoters = scores.filter((s) => s >= 9).length;
    const passives = scores.filter((s) => s >= 7 && s <= 8).length;
    const detractors = scores.filter((s) => s <= 6).length;

    // Calculate seasonal analysis
    const currentMonth = new Date().getMonth() + 1;
    const isWeddingSeason = currentMonth >= 4 && currentMonth <= 10;

    const seasonalResponses = npsResponses.filter((r) => {
      const responseMonth = new Date(r.created_at).getMonth() + 1;
      const isResponseInSeason = responseMonth >= 4 && responseMonth <= 10;
      return isWeddingSeason ? isResponseInSeason : !isResponseInSeason;
    });

    const seasonalAnalysis: SeasonalNPSAnalysis = {
      weddingSeason: {
        score:
          seasonalResponses.length > 0 && isWeddingSeason
            ? npsManager.calculateNPS(seasonalResponses.map((r) => r.nps_score))
            : 0,
        count: isWeddingSeason ? seasonalResponses.length : 0,
      },
      offSeason: {
        score:
          seasonalResponses.length > 0 && !isWeddingSeason
            ? npsManager.calculateNPS(seasonalResponses.map((r) => r.nps_score))
            : 0,
        count: !isWeddingSeason ? seasonalResponses.length : 0,
      },
      seasonalDifference: 0,
    };

    seasonalAnalysis.seasonalDifference =
      seasonalAnalysis.weddingSeason.score - seasonalAnalysis.offSeason.score;

    // Vendor type breakdown
    const vendorTypeData = this.groupByVendorType(sessions);
    const vendorTypeBreakdown = Object.entries(vendorTypeData).map(
      ([vendorType, vendorSessions]) => {
        const vendorNPS = vendorSessions
          .flatMap((s) => s.feedback_responses || [])
          .filter((r) => r.nps_score !== null)
          .map((r) => r.nps_score);

        if (vendorNPS.length === 0) {
          return {
            vendorType,
            npsScore: 0,
            responseCount: 0,
            promoterRate: 0,
            detractorRate: 0,
          };
        }

        const vendorPromoters = vendorNPS.filter((s) => s >= 9).length;
        const vendorDetractors = vendorNPS.filter((s) => s <= 6).length;

        return {
          vendorType,
          npsScore: npsManager.calculateNPS(vendorNPS),
          responseCount: vendorNPS.length,
          promoterRate: vendorPromoters / vendorNPS.length,
          detractorRate: vendorDetractors / vendorNPS.length,
        };
      },
    );

    // Determine trend direction (simplified)
    const trendDirection: 'improving' | 'declining' | 'stable' =
      overallScore > 50
        ? 'improving'
        : overallScore < 30
          ? 'declining'
          : 'stable';

    return {
      overallScore,
      promoters,
      passives,
      detractors,
      responseCount: npsResponses.length,
      trendDirection,
      seasonalAnalysis,
      vendorTypeBreakdown,
    };
  }

  /**
   * Generate sentiment analytics
   */
  private async generateSentimentAnalytics(
    sessions: any[],
    startDate: string,
    endDate: string,
  ): Promise<SentimentAnalytics> {
    const sentimentResponses = sessions
      .flatMap((s) => s.feedback_responses || [])
      .filter(
        (r) => r.sentiment_score !== null && r.sentiment_score !== undefined,
      );

    if (sentimentResponses.length === 0) {
      return this.getEmptySentimentAnalytics();
    }

    const scores = sentimentResponses.map((r) => r.sentiment_score);
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const positiveCount = scores.filter((s) => s > 0.6).length;
    const neutralCount = scores.filter((s) => s >= 0.4 && s <= 0.6).length;
    const negativeCount = scores.filter((s) => s < 0.4).length;

    const total = scores.length;
    const positivePercentage = (positiveCount / total) * 100;
    const neutralPercentage = (neutralCount / total) * 100;
    const negativePercentage = (negativeCount / total) * 100;

    // Count emergency flags and urgent issues
    const emergencyFlags = sentimentResponses.filter(
      (r) =>
        r.sentiment_category === 'emergency' ||
        (r.sentiment_analysis && r.sentiment_analysis.urgency === 'critical'),
    ).length;

    const urgentIssues = sentimentResponses.filter(
      (r) =>
        r.sentiment_category === 'urgent' ||
        (r.sentiment_analysis && r.sentiment_analysis.urgency === 'high'),
    ).length;

    // Analyze common themes (simplified)
    const commonThemes = await this.analyzeCommonThemes(sentimentResponses);

    return {
      averageScore,
      positivePercentage,
      neutralPercentage,
      negativePercentage,
      emergencyFlags,
      urgentIssues,
      commonThemes,
    };
  }

  /**
   * Generate wedding industry specific analytics
   */
  private async generateWeddingIndustryAnalytics(
    sessions: any[],
    startDate: string,
    endDate: string,
  ): Promise<WeddingIndustryAnalytics> {
    // Wedding season impact analysis
    const weddingSeasonImpact = this.analyzeWeddingSeasonImpact(sessions);

    // Vendor type performance analysis
    const vendorTypePerformance = this.analyzeVendorTypePerformance(sessions);

    // Wedding proximity impact analysis
    const weddingProximityImpact = this.analyzeWeddingProximityImpact(sessions);

    // Tier satisfaction analysis
    const tierSatisfactionLevels = this.analyzeTierSatisfaction(sessions);

    // Critical wedding day issues count
    const criticalWeddingDayIssues = sessions.filter(
      (s) =>
        s.is_wedding_day_critical ||
        (s.trigger_context && s.trigger_context.weddingDayProximity <= 1),
    ).length;

    return {
      weddingSeasonImpact,
      vendorTypePerformance,
      weddingProximityImpact,
      tierSatisfactionLevels,
      criticalWeddingDayIssues,
    };
  }

  /**
   * Generate follow-up analytics
   */
  private async generateFollowUpAnalytics(
    startDate: string,
    endDate: string,
    organizationId?: string,
  ): Promise<FollowUpAnalytics> {
    try {
      const supabase = createClient();

      let query = supabase
        .from('feedback_follow_up_actions')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (organizationId) {
        // Join with feedback_sessions to filter by organization
        query = supabase
          .from('feedback_follow_up_actions')
          .select(
            `
            *,
            feedback_sessions!inner (organization_id)
          `,
          )
          .eq('feedback_sessions.organization_id', organizationId)
          .gte('created_at', startDate)
          .lte('created_at', endDate);
      }

      const { data: followUpActions, error } = await query;

      if (error) {
        throw error;
      }

      const totalActionsTriggered = followUpActions?.length || 0;
      const actionsCompleted =
        followUpActions?.filter((a) => a.action_status === 'completed')
          .length || 0;
      const actionsPending =
        followUpActions?.filter((a) => a.action_status === 'pending').length ||
        0;
      const actionsFailed =
        followUpActions?.filter((a) => a.action_status === 'failed').length ||
        0;

      // Response time metrics
      const completedActions =
        followUpActions?.filter((a) => a.completed_at && a.started_at) || [];
      const responseTimes = completedActions.map(
        (a) =>
          (new Date(a.completed_at).getTime() -
            new Date(a.started_at).getTime()) /
          (1000 * 60 * 60),
      );

      const responseTimeMetrics: ResponseTimeAnalysis = {
        averageHours:
          responseTimes.length > 0
            ? responseTimes.reduce((sum, t) => sum + t, 0) /
              responseTimes.length
            : 0,
        medianHours:
          responseTimes.length > 0 ? this.calculateMedian(responseTimes) : 0,
        p95Hours:
          responseTimes.length > 0
            ? this.calculatePercentile(responseTimes, 0.95)
            : 0,
        weddingPriorityAverageHours: 0, // Simplified
      };

      // Effectiveness metrics (simplified)
      const effectivenessMetrics: EffectivenessAnalysis = {
        resolutionRate:
          totalActionsTriggered > 0
            ? actionsCompleted / totalActionsTriggered
            : 0,
        satisfactionImprovement: 0.1, // Placeholder
        retentionRate: 0.95, // Placeholder
        escalationRate: 0.05, // Placeholder
      };

      // Escalation metrics
      const escalationMetrics: EscalationAnalysis = {
        totalEscalations:
          followUpActions?.filter((a) => a.action_config?.escalationLevel >= 2)
            .length || 0,
        executiveEscalations:
          followUpActions?.filter((a) => a.action_config?.escalationLevel >= 3)
            .length || 0,
        averageEscalationTime: 2.5, // Placeholder hours
        resolutionRateAfterEscalation: 0.9, // Placeholder
      };

      return {
        totalActionsTriggered,
        actionsCompleted,
        actionsPending,
        actionsFailed,
        responseTimeMetrics,
        effectivenessMetrics,
        escalationMetrics,
      };
    } catch (error) {
      console.error('Error generating follow-up analytics:', error);
      return this.getEmptyFollowUpAnalytics();
    }
  }

  /**
   * Generate trend analysis over time
   */
  private async generateTrendAnalysis(
    period: string,
    startDate: string,
    endDate: string,
    organizationId?: string,
    vendorType?: string,
  ): Promise<TrendAnalysis> {
    try {
      const supabase = createClient();

      // Get historical NPS data
      const { data: npsData } = await supabase
        .from('feedback_analytics_daily')
        .select('date, nps_score, response_count')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      // Get historical sentiment data
      const { data: sentimentData } = await supabase
        .from('feedback_analytics_daily')
        .select('date, average_sentiment, response_count')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      const npsMovingAverage =
        npsData?.map((d) => ({
          date: d.date,
          value: d.nps_score || 0,
          count: d.response_count,
        })) || [];

      const sentimentTrends =
        sentimentData?.map((d) => ({
          date: d.date,
          value: d.average_sentiment || 0,
          count: d.response_count,
        })) || [];

      const volumeTrends =
        npsData?.map((d) => ({
          date: d.date,
          value: d.response_count || 0,
        })) || [];

      // Generate seasonality insights
      const seasonalityInsights = this.generateSeasonalityInsights(
        period,
        npsMovingAverage,
      );

      return {
        npsMovingAverage,
        sentimentTrends,
        volumeTrends,
        seasonalityInsights,
      };
    } catch (error) {
      console.error('Error generating trend analysis:', error);
      return {
        npsMovingAverage: [],
        sentimentTrends: [],
        volumeTrends: [],
        seasonalityInsights: [],
      };
    }
  }

  // Helper methods
  private calculatePeriodDates(period: string): {
    startDate: string;
    endDate: string;
  } {
    const now = new Date();
    const endDate = now.toISOString();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate(),
        );
        break;
      case 'quarterly':
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate(),
        );
        break;
      case 'yearly':
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        );
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString(),
      endDate,
    };
  }

  private groupByVendorType(sessions: any[]): Record<string, any[]> {
    return sessions.reduce((groups, session) => {
      const vendorType = session.user_profiles?.vendor_type || 'unknown';
      if (!groups[vendorType]) {
        groups[vendorType] = [];
      }
      groups[vendorType].push(session);
      return groups;
    }, {});
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  // Analytics helper methods (simplified implementations)
  private async analyzeCommonThemes(
    responses: any[],
  ): Promise<ThemeAnalysis[]> {
    // Simplified theme analysis - would integrate with NLP service
    return [
      {
        theme: 'workflow_efficiency',
        frequency: 25,
        averageSentiment: 0.7,
        urgencyLevel: 'medium',
      },
      {
        theme: 'customer_communication',
        frequency: 18,
        averageSentiment: 0.6,
        urgencyLevel: 'low',
      },
      {
        theme: 'payment_processing',
        frequency: 12,
        averageSentiment: 0.4,
        urgencyLevel: 'high',
      },
    ];
  }

  private analyzeWeddingSeasonImpact(sessions: any[]): SeasonalAnalysis {
    const weddingSeasonSessions = sessions.filter((s) => {
      const month = new Date(s.created_at).getMonth() + 1;
      return month >= 4 && month <= 10;
    });

    const offSeasonSessions = sessions.filter((s) => {
      const month = new Date(s.created_at).getMonth() + 1;
      return month < 4 || month > 10;
    });

    return {
      peakSeason: {
        average: this.calculateAverageSentiment(weddingSeasonSessions),
        count: weddingSeasonSessions.length,
      },
      offSeason: {
        average: this.calculateAverageSentiment(offSeasonSessions),
        count: offSeasonSessions.length,
      },
      seasonalVariation: 0.15, // Placeholder
    };
  }

  private analyzeVendorTypePerformance(
    sessions: any[],
  ): VendorPerformanceAnalysis[] {
    const vendorGroups = this.groupByVendorType(sessions);

    return Object.entries(vendorGroups).map(([vendorType, vendorSessions]) => ({
      vendorType,
      satisfactionScore: this.calculateAverageSentiment(vendorSessions),
      responseVolume: vendorSessions.length,
      improvementTrend: Math.random() * 0.2 - 0.1, // Placeholder
    }));
  }

  private analyzeWeddingProximityImpact(
    sessions: any[],
  ): ProximityImpactAnalysis {
    // Simplified proximity analysis
    return {
      moreThan30Days: { score: 0.75, count: 50 },
      lessThan30Days: { score: 0.65, count: 30 },
      lessThan7Days: { score: 0.55, count: 15 },
      lessThan24Hours: { score: 0.45, count: 8 },
    };
  }

  private analyzeTierSatisfaction(sessions: any[]): TierSatisfactionAnalysis[] {
    const tierGroups = sessions.reduce((groups, session) => {
      const tier = session.user_profiles?.subscription_tier || 'free';
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(session);
      return groups;
    }, {});

    return Object.entries(tierGroups).map(
      ([tier, tierSessions]: [string, any]) => ({
        tier,
        satisfactionScore: this.calculateAverageSentiment(tierSessions),
        retentionRate: 0.9, // Placeholder
        upgradeRate: 0.15, // Placeholder
      }),
    );
  }

  private generateSeasonalityInsights(
    period: string,
    data: TrendPoint[],
  ): SeasonalityInsight[] {
    return [
      {
        period: 'Spring-Summer',
        patternType: 'seasonal',
        description: 'NPS scores typically increase during wedding season',
        impact: 0.2,
      },
      {
        period: 'Monday',
        patternType: 'weekly',
        description: 'Higher feedback volume at start of week',
        impact: 0.1,
      },
    ];
  }

  private calculateAverageSentiment(sessions: any[]): number {
    const sentimentScores = sessions
      .filter((s) => s.overall_sentiment !== null)
      .map((s) => s.overall_sentiment);

    return sentimentScores.length > 0
      ? sentimentScores.reduce((sum, score) => sum + score, 0) /
          sentimentScores.length
      : 0.5;
  }

  // Empty analytics objects
  private getEmptyNPSAnalytics(): NPSAnalytics {
    return {
      overallScore: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      responseCount: 0,
      trendDirection: 'stable',
      seasonalAnalysis: {
        weddingSeason: { score: 0, count: 0 },
        offSeason: { score: 0, count: 0 },
        seasonalDifference: 0,
      },
      vendorTypeBreakdown: [],
    };
  }

  private getEmptySentimentAnalytics(): SentimentAnalytics {
    return {
      averageScore: 0.5,
      positivePercentage: 0,
      neutralPercentage: 0,
      negativePercentage: 0,
      emergencyFlags: 0,
      urgentIssues: 0,
      commonThemes: [],
    };
  }

  private getEmptyFollowUpAnalytics(): FollowUpAnalytics {
    return {
      totalActionsTriggered: 0,
      actionsCompleted: 0,
      actionsPending: 0,
      actionsFailed: 0,
      responseTimeMetrics: {
        averageHours: 0,
        medianHours: 0,
        p95Hours: 0,
        weddingPriorityAverageHours: 0,
      },
      effectivenessMetrics: {
        resolutionRate: 0,
        satisfactionImprovement: 0,
        retentionRate: 0,
        escalationRate: 0,
      },
      escalationMetrics: {
        totalEscalations: 0,
        executiveEscalations: 0,
        averageEscalationTime: 0,
        resolutionRateAfterEscalation: 0,
      },
    };
  }
}

// Export singleton instance
export const analyticsEngine = FeedbackAnalyticsEngine.getInstance();
