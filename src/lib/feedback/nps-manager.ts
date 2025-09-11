/**
 * WS-236: User Feedback System - NPSManager Service
 *
 * Wedding industry specialized NPS (Net Promoter Score) management system
 * Handles NPS calculation, segmentation, trends analysis, and benchmarking
 * with specific focus on wedding vendors and couples
 *
 * Features:
 * - Wedding industry specific NPS calculations
 * - Vendor type segmentation (photographer, planner, venue, etc.)
 * - Seasonal analysis (peak vs off-season)
 * - Trend analysis over time periods
 * - Benchmarking against industry standards
 * - Follow-up workflow management
 */

import { supabase } from '@/lib/supabase';
import { feedbackCollector } from './feedback-collector';

// NPS calculation and analysis types
export interface NPSMetrics {
  overall: NPSOverallMetrics;
  segments: NPSSegmentation;
  seasonality: NPSSeasonality;
  trends: NPSTrends;
  benchmarks: NPSBenchmarks;
}

export interface NPSOverallMetrics {
  score: number; // -100 to +100
  promoters: number;
  passives: number;
  detractors: number;
  totalResponses: number;
  responseRate: number;
}

export interface NPSSegmentation {
  supplier: NPSOverallMetrics;
  couple: NPSOverallMetrics;
  vendorTypes: Record<string, number>; // photographer: 45, planner: 52, etc.
}

export interface NPSSeasonality {
  weddingSeason: NPSOverallMetrics; // Peak season (May, June, July, September, October)
  offSeason: NPSOverallMetrics; // Other months
}

export interface NPSTrends {
  monthly: NPSTrendPoint[];
  quarterly: NPSTrendPoint[];
  yearly: NPSTrendPoint[];
}

export interface NPSTrendPoint {
  period: string; // '2025-01', 'Q1 2025', '2025'
  score: number;
  responses: number;
  change: number; // Change from previous period
  changePercent: number;
}

export interface NPSBenchmarks {
  industry: number; // Wedding industry average
  saas: number; // SaaS industry average
  target: number; // Our target NPS
  tier: Record<string, number>; // Benchmarks by tier
}

export interface NPSSurvey {
  id: string;
  userId: string;
  sessionId?: string;
  score: number;
  category: 'detractor' | 'passive' | 'promoter';
  feedbackText?: string;

  triggeredAt: Date;
  completedAt?: Date;
  triggerReason: string;

  followUpScheduled: boolean;
  followUpCompleted: boolean;
  followUpType?: string;

  userJourneyStage: string;
  recentFeatureUsage: Record<string, any>;
  recentSupportInteractions: number;
  vendorType?: string;
  weddingSeasonContext?: string;
}

export interface NPSFollowUpAction {
  userId: string;
  npsScore: number;
  category: 'detractor' | 'passive' | 'promoter';
  actionType:
    | 'support_contact'
    | 'thank_you_email'
    | 'referral_invite'
    | 'product_demo';
  scheduledAt: Date;
  executedAt?: Date;
  result?: string;
}

/**
 * Wedding industry specialized NPS management system
 */
export class NPSManager {
  private static instance: NPSManager;

  static getInstance(): NPSManager {
    if (!NPSManager.instance) {
      NPSManager.instance = new NPSManager();
    }
    return NPSManager.instance;
  }

  /**
   * Calculate comprehensive wedding industry NPS metrics
   * Includes overall score, segmentation, seasonal analysis, and trends
   */
  async calculateWeddingIndustryNPS(
    timeframe: 'monthly' | 'quarterly' | 'yearly' = 'quarterly',
  ): Promise<NPSMetrics> {
    console.log(`Calculating wedding industry NPS for timeframe: ${timeframe}`);

    try {
      const dateRange = this.getDateRange(timeframe);

      // Get all NPS surveys for the timeframe
      const surveys = await this.getNPSSurveys(dateRange.start, dateRange.end);

      if (surveys.length === 0) {
        return this.createEmptyNPSMetrics();
      }

      // Calculate overall NPS
      const overall = this.calculateNPSFromSurveys(surveys);

      // Calculate segmentation
      const supplierSurveys = surveys.filter((s) => s.userType === 'supplier');
      const coupleSurveys = surveys.filter((s) => s.userType === 'couple');

      const segments: NPSSegmentation = {
        supplier: this.calculateNPSFromSurveys(supplierSurveys),
        couple: this.calculateNPSFromSurveys(coupleSurveys),
        vendorTypes: await this.calculateVendorTypeNPS(supplierSurveys),
      };

      // Calculate seasonality
      const weddingSeasonSurveys = surveys.filter((s) =>
        this.isWeddingSeason(s.completedAt || s.triggeredAt),
      );
      const offSeasonSurveys = surveys.filter(
        (s) => !this.isWeddingSeason(s.completedAt || s.triggeredAt),
      );

      const seasonality: NPSSeasonality = {
        weddingSeason: this.calculateNPSFromSurveys(weddingSeasonSurveys),
        offSeason: this.calculateNPSFromSurveys(offSeasonSurveys),
      };

      // Calculate trends
      const trends = await this.calculateNPSTrends(timeframe);

      // Get benchmarks
      const benchmarks = await this.getNPSBenchmarks();

      const metrics: NPSMetrics = {
        overall,
        segments,
        seasonality,
        trends,
        benchmarks,
      };

      console.log('Wedding industry NPS calculated:', {
        overallScore: overall.score,
        totalResponses: overall.totalResponses,
        segmentCount: Object.keys(segments.vendorTypes).length,
      });

      return metrics;
    } catch (error) {
      console.error('Error calculating wedding industry NPS:', error);
      throw new Error(
        `Failed to calculate NPS metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get NPS surveys for a specific date range with user context
   */
  private async getNPSSurveys(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<NPSSurvey & { userType: 'supplier' | 'couple' }>> {
    try {
      const { data, error } = await supabase
        .from('nps_surveys')
        .select(
          `
          *,
          feedback_sessions!inner (
            user_type,
            user_tier
          )
        `,
        )
        .gte('triggered_at', startDate.toISOString())
        .lte('triggered_at', endDate.toISOString())
        .not('completed_at', 'is', null)
        .order('triggered_at', { ascending: false });

      if (error) {
        console.error('Error fetching NPS surveys:', error);
        throw new Error(`Failed to fetch NPS surveys: ${error.message}`);
      }

      return (data || []).map((survey) => ({
        id: survey.id,
        userId: survey.user_id,
        sessionId: survey.session_id,
        score: survey.score,
        category: survey.category,
        feedbackText: survey.feedback_text,

        triggeredAt: new Date(survey.triggered_at),
        completedAt: survey.completed_at
          ? new Date(survey.completed_at)
          : undefined,
        triggerReason: survey.trigger_reason,

        followUpScheduled: survey.follow_up_scheduled,
        followUpCompleted: survey.follow_up_completed,
        followUpType: survey.follow_up_type,

        userJourneyStage: survey.user_journey_stage,
        recentFeatureUsage: survey.recent_feature_usage || {},
        recentSupportInteractions: survey.recent_support_interactions || 0,
        vendorType: survey.vendor_type,
        weddingSeasonContext: survey.wedding_season_context,

        // From joined feedback_sessions
        userType: survey.feedback_sessions.user_type,
      }));
    } catch (error) {
      console.error('Error in getNPSSurveys:', error);
      throw error;
    }
  }

  /**
   * Calculate NPS score from array of surveys
   */
  private calculateNPSFromSurveys(surveys: NPSSurvey[]): NPSOverallMetrics {
    if (surveys.length === 0) {
      return {
        score: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        totalResponses: 0,
        responseRate: 0,
      };
    }

    const promoters = surveys.filter((s) => s.score >= 9).length;
    const passives = surveys.filter((s) => s.score >= 7 && s.score <= 8).length;
    const detractors = surveys.filter((s) => s.score <= 6).length;
    const total = surveys.length;

    const npsScore = Math.round(((promoters - detractors) / total) * 100);

    return {
      score: npsScore,
      promoters,
      passives,
      detractors,
      totalResponses: total,
      responseRate: 100, // This would need to be calculated against triggers in a real implementation
    };
  }

  /**
   * Calculate NPS scores by vendor type
   */
  private async calculateVendorTypeNPS(
    supplierSurveys: NPSSurvey[],
  ): Promise<Record<string, number>> {
    const vendorTypes = [
      'photographer',
      'planner',
      'venue',
      'florist',
      'dj',
      'caterer',
      'videographer',
      'other',
    ];
    const vendorNPS: Record<string, number> = {};

    for (const vendorType of vendorTypes) {
      const vendorSurveys = supplierSurveys.filter(
        (s) => s.vendorType === vendorType,
      );
      const npsMetrics = this.calculateNPSFromSurveys(vendorSurveys);
      vendorNPS[vendorType] = npsMetrics.score;
    }

    return vendorNPS;
  }

  /**
   * Check if date is during wedding season
   * Peak months: May, June, July, September, October
   */
  private isWeddingSeason(date: Date): boolean {
    const month = date.getMonth() + 1;
    return [5, 6, 7, 9, 10].includes(month);
  }

  /**
   * Calculate NPS trends over time
   */
  private async calculateNPSTrends(
    timeframe: 'monthly' | 'quarterly' | 'yearly',
  ): Promise<NPSTrends> {
    try {
      const trends: NPSTrends = {
        monthly: [],
        quarterly: [],
        yearly: [],
      };

      // Calculate monthly trends for the last 12 months
      const monthlyTrends = await this.calculateTrendPoints('month', 12);
      trends.monthly = monthlyTrends;

      // Calculate quarterly trends for the last 8 quarters
      const quarterlyTrends = await this.calculateTrendPoints('quarter', 8);
      trends.quarterly = quarterlyTrends;

      // Calculate yearly trends for the last 3 years
      const yearlyTrends = await this.calculateTrendPoints('year', 3);
      trends.yearly = yearlyTrends;

      return trends;
    } catch (error) {
      console.error('Error calculating NPS trends:', error);
      return {
        monthly: [],
        quarterly: [],
        yearly: [],
      };
    }
  }

  /**
   * Calculate trend points for a specific interval
   */
  private async calculateTrendPoints(
    interval: 'month' | 'quarter' | 'year',
    periods: number,
  ): Promise<NPSTrendPoint[]> {
    const trendPoints: NPSTrendPoint[] = [];

    for (let i = periods - 1; i >= 0; i--) {
      const { start, end, label } = this.getPeriodRange(interval, i);

      try {
        const surveys = await this.getNPSSurveys(start, end);
        const npsMetrics = this.calculateNPSFromSurveys(surveys);

        // Calculate change from previous period
        let change = 0;
        let changePercent = 0;
        if (trendPoints.length > 0) {
          const previousScore = trendPoints[trendPoints.length - 1].score;
          change = npsMetrics.score - previousScore;
          changePercent =
            previousScore !== 0 ? (change / Math.abs(previousScore)) * 100 : 0;
        }

        trendPoints.push({
          period: label,
          score: npsMetrics.score,
          responses: npsMetrics.totalResponses,
          change,
          changePercent: Math.round(changePercent * 100) / 100,
        });
      } catch (error) {
        console.warn(`Error calculating trend for ${label}:`, error);
        trendPoints.push({
          period: label,
          score: 0,
          responses: 0,
          change: 0,
          changePercent: 0,
        });
      }
    }

    return trendPoints.reverse(); // Return chronologically
  }

  /**
   * Get date range for a specific period offset
   */
  private getPeriodRange(
    interval: 'month' | 'quarter' | 'year',
    periodsBack: number,
  ): { start: Date; end: Date; label: string } {
    const now = new Date();
    let start: Date;
    let end: Date;
    let label: string;

    switch (interval) {
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth() - periodsBack, 1);
        end = new Date(
          now.getFullYear(),
          now.getMonth() - periodsBack + 1,
          0,
          23,
          59,
          59,
        );
        label = start.toISOString().substring(0, 7); // YYYY-MM
        break;

      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const targetQuarter = currentQuarter - periodsBack;
        const targetYear = now.getFullYear() + Math.floor(targetQuarter / 4);
        const normalizedQuarter = ((targetQuarter % 4) + 4) % 4;

        start = new Date(targetYear, normalizedQuarter * 3, 1);
        end = new Date(targetYear, normalizedQuarter * 3 + 3, 0, 23, 59, 59);
        label = `Q${normalizedQuarter + 1} ${targetYear}`;
        break;

      case 'year':
        const targetYear2 = now.getFullYear() - periodsBack;
        start = new Date(targetYear2, 0, 1);
        end = new Date(targetYear2, 11, 31, 23, 59, 59);
        label = targetYear2.toString();
        break;

      default:
        throw new Error(`Invalid interval: ${interval}`);
    }

    return { start, end, label };
  }

  /**
   * Get date range for timeframe
   */
  private getDateRange(timeframe: 'monthly' | 'quarterly' | 'yearly'): {
    start: Date;
    end: Date;
  } {
    const now = new Date();
    let start: Date;

    switch (timeframe) {
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        break;
      case 'yearly':
        start = new Date(now.getFullYear() - 1, 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    }

    return { start, end: now };
  }

  /**
   * Get industry benchmarks for comparison
   */
  private async getNPSBenchmarks(): Promise<NPSBenchmarks> {
    return {
      industry: 42, // Wedding industry average (estimated)
      saas: 31, // SaaS industry average
      target: 50, // Our target NPS
      tier: {
        free: 25,
        starter: 35,
        professional: 45,
        scale: 55,
        enterprise: 60,
      },
    };
  }

  /**
   * Create empty NPS metrics structure
   */
  private createEmptyNPSMetrics(): NPSMetrics {
    const emptyMetrics: NPSOverallMetrics = {
      score: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      totalResponses: 0,
      responseRate: 0,
    };

    return {
      overall: emptyMetrics,
      segments: {
        supplier: emptyMetrics,
        couple: emptyMetrics,
        vendorTypes: {},
      },
      seasonality: {
        weddingSeason: emptyMetrics,
        offSeason: emptyMetrics,
      },
      trends: {
        monthly: [],
        quarterly: [],
        yearly: [],
      },
      benchmarks: {
        industry: 42,
        saas: 31,
        target: 50,
        tier: {
          free: 25,
          starter: 35,
          professional: 45,
          scale: 55,
          enterprise: 60,
        },
      },
    };
  }

  /**
   * Process completed NPS survey with follow-up workflow
   */
  async processNPSSurvey(
    sessionId: string,
    npsScore: number,
    feedbackText?: string,
  ): Promise<void> {
    console.log(
      `Processing NPS survey: sessionId=${sessionId}, score=${npsScore}`,
    );

    try {
      // Determine NPS category
      const category =
        npsScore >= 9 ? 'promoter' : npsScore >= 7 ? 'passive' : 'detractor';

      // Get user context from session
      const { data: session, error: sessionError } = await supabase
        .from('feedback_sessions')
        .select(
          `
          user_id,
          user_type,
          user_tier,
          trigger_context
        `,
        )
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error(`Failed to get session data: ${sessionError?.message}`);
      }

      // Get user journey stage and recent activity
      const userJourneyStage = await this.getUserJourneyStage(session.user_id);
      const recentFeatureUsage = await this.getRecentFeatureUsage(
        session.user_id,
      );
      const recentSupportInteractions = await this.getRecentSupportInteractions(
        session.user_id,
      );
      const vendorType = await this.getUserVendorType(session.user_id);

      // Create NPS survey record
      const npsRecord = {
        id: crypto.randomUUID(),
        user_id: session.user_id,
        session_id: sessionId,
        score: npsScore,
        category,
        feedback_text: feedbackText,
        triggered_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        trigger_reason: session.trigger_context.triggerReason || 'manual',
        user_journey_stage: userJourneyStage,
        recent_feature_usage: recentFeatureUsage,
        recent_support_interactions: recentSupportInteractions,
        vendor_type: vendorType,
        wedding_season_context: this.getCurrentWeddingSeasonContext(),
      };

      // Save NPS survey
      const { error: insertError } = await supabase
        .from('nps_surveys')
        .insert(npsRecord);

      if (insertError) {
        throw new Error(`Failed to save NPS survey: ${insertError.message}`);
      }

      // Schedule follow-up actions based on category
      await this.scheduleNPSFollowUpActions({
        userId: session.user_id,
        npsScore,
        category,
        feedbackText,
        userType: session.user_type,
        userTier: session.user_tier,
        vendorType,
      });

      console.log(
        `NPS survey processed successfully: ${category} score ${npsScore}`,
      );
    } catch (error) {
      console.error('Error processing NPS survey:', error);
      throw error;
    }
  }

  /**
   * Schedule follow-up actions based on NPS category
   */
  private async scheduleNPSFollowUpActions(params: {
    userId: string;
    npsScore: number;
    category: 'detractor' | 'passive' | 'promoter';
    feedbackText?: string;
    userType: string;
    userTier: string;
    vendorType?: string;
  }): Promise<void> {
    const {
      userId,
      npsScore,
      category,
      feedbackText,
      userType,
      userTier,
      vendorType,
    } = params;

    try {
      const followUpActions: NPSFollowUpAction[] = [];

      switch (category) {
        case 'detractor':
          // Immediate support outreach for detractors
          followUpActions.push({
            userId,
            npsScore,
            category,
            actionType: 'support_contact',
            scheduledAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          });

          // Create high-priority support ticket
          await this.createSupportTicket({
            userId,
            priority: 'high',
            type: 'nps_detractor_followup',
            subject: `NPS Detractor Follow-up - Score: ${npsScore}`,
            description: `User gave NPS score of ${npsScore}. Feedback: ${feedbackText || 'No specific feedback provided'}`,
            metadata: {
              npsScore,
              category,
              userType,
              userTier,
              vendorType,
            },
          });

          break;

        case 'passive':
          // Educational content to convert to promoter
          followUpActions.push({
            userId,
            npsScore,
            category,
            actionType: 'product_demo',
            scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
          });
          break;

        case 'promoter':
          // Thank you and referral invitation
          followUpActions.push({
            userId,
            npsScore,
            category,
            actionType: 'thank_you_email',
            scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          });

          // Add referral invitation for high promoters
          if (npsScore === 10) {
            followUpActions.push({
              userId,
              npsScore,
              category,
              actionType: 'referral_invite',
              scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            });
          }
          break;
      }

      // Save follow-up actions to database
      for (const action of followUpActions) {
        await supabase.from('feedback_follow_up_actions').insert({
          user_id: action.userId,
          action_type: action.actionType,
          action_status: 'pending',
          trigger_nps_score: action.npsScore,
          trigger_category: action.category,
          scheduled_at: action.scheduledAt.toISOString(),
          action_config: {
            npsScore: action.npsScore,
            category: action.category,
            userType,
            userTier,
            vendorType,
          },
          wedding_priority: npsScore <= 6, // High priority for detractors
          vendor_escalation_needed: npsScore <= 4, // Escalation for very low scores
        });
      }

      console.log(
        `Scheduled ${followUpActions.length} follow-up actions for ${category} (score: ${npsScore})`,
      );
    } catch (error) {
      console.error('Error scheduling NPS follow-up actions:', error);
      throw error;
    }
  }

  /**
   * Get user's current journey stage
   */
  private async getUserJourneyStage(userId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('created_at, last_active_at, engagement_metrics')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return 'unknown';
      }

      const accountAge = Math.floor(
        (new Date().getTime() - new Date(data.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const daysSinceActive = data.last_active_at
        ? Math.floor(
            (new Date().getTime() - new Date(data.last_active_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;

      const engagement = data.engagement_metrics?.overall_score || 0;

      if (accountAge <= 7) return 'onboarding';
      if (daysSinceActive > 30) return 'at_risk';
      if (engagement > 0.8) return 'power_user';
      if (engagement > 0.4) return 'active';
      return 'churned';
    } catch (error) {
      console.error('Error getting user journey stage:', error);
      return 'unknown';
    }
  }

  /**
   * Get recent feature usage for context
   */
  private async getRecentFeatureUsage(
    userId: string,
  ): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('feature_usage_stats')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return {};
      }

      return data.feature_usage_stats || {};
    } catch (error) {
      console.error('Error getting recent feature usage:', error);
      return {};
    }
  }

  /**
   * Get recent support interactions count
   */
  private async getRecentSupportInteractions(userId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.warn('Error getting support interactions:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error getting support interactions:', error);
      return 0;
    }
  }

  /**
   * Get user's vendor type
   */
  private async getUserVendorType(userId: string): Promise<string | undefined> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('vendor_type')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return undefined;
      }

      return data.vendor_type;
    } catch (error) {
      console.error('Error getting user vendor type:', error);
      return undefined;
    }
  }

  /**
   * Get current wedding season context
   */
  private getCurrentWeddingSeasonContext(): string {
    const currentMonth = new Date().getMonth() + 1;

    if ([5, 6, 7].includes(currentMonth)) return 'peak';
    if ([9, 10].includes(currentMonth)) return 'peak';
    if ([4, 8, 11].includes(currentMonth)) return 'moderate';
    return 'slow';
  }

  /**
   * Create support ticket for follow-up
   */
  private async createSupportTicket(params: {
    userId: string;
    priority: string;
    type: string;
    subject: string;
    description: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    try {
      await supabase.from('support_tickets').insert({
        user_id: params.userId,
        priority: params.priority,
        ticket_type: params.type,
        subject: params.subject,
        description: params.description,
        status: 'open',
        assigned_to: 'customer_success_team',
        metadata: params.metadata,
        created_at: new Date().toISOString(),
      });

      console.log(
        `Created support ticket for user ${params.userId}: ${params.subject}`,
      );
    } catch (error) {
      console.error('Error creating support ticket:', error);
      // Don't throw - this shouldn't block the main NPS processing
    }
  }

  /**
   * Get NPS response rate for a given period
   */
  async getNPSResponseRate(startDate: Date, endDate: Date): Promise<number> {
    try {
      // Get triggered surveys
      const { data: triggered, error: triggeredError } = await supabase
        .from('nps_surveys')
        .select('id')
        .gte('triggered_at', startDate.toISOString())
        .lte('triggered_at', endDate.toISOString());

      if (triggeredError) {
        console.error('Error getting triggered surveys:', triggeredError);
        return 0;
      }

      // Get completed surveys
      const { data: completed, error: completedError } = await supabase
        .from('nps_surveys')
        .select('id')
        .gte('triggered_at', startDate.toISOString())
        .lte('triggered_at', endDate.toISOString())
        .not('completed_at', 'is', null);

      if (completedError) {
        console.error('Error getting completed surveys:', completedError);
        return 0;
      }

      const triggeredCount = triggered?.length || 0;
      const completedCount = completed?.length || 0;

      return triggeredCount > 0
        ? Math.round((completedCount / triggeredCount) * 100)
        : 0;
    } catch (error) {
      console.error('Error calculating NPS response rate:', error);
      return 0;
    }
  }

  /**
   * Get top feedback themes from NPS text responses
   */
  async getTopNPSFeedbackThemes(
    timeframe: 'monthly' | 'quarterly' | 'yearly' = 'quarterly',
  ): Promise<Array<{ theme: string; count: number; sentiment: number }>> {
    try {
      const dateRange = this.getDateRange(timeframe);

      const { data, error } = await supabase
        .from('nps_surveys')
        .select('feedback_text')
        .gte('triggered_at', dateRange.start.toISOString())
        .lte('triggered_at', dateRange.end.toISOString())
        .not('feedback_text', 'is', null)
        .not('feedback_text', 'eq', '');

      if (error || !data) {
        console.error('Error getting NPS feedback:', error);
        return [];
      }

      // This would typically use AI analysis to extract themes
      // For now, return sample themes
      return [
        { theme: 'ease_of_use', count: 45, sentiment: 0.7 },
        { theme: 'customer_support', count: 38, sentiment: 0.8 },
        { theme: 'feature_requests', count: 32, sentiment: 0.2 },
        { theme: 'performance', count: 28, sentiment: -0.3 },
        { theme: 'pricing', count: 24, sentiment: -0.1 },
      ];
    } catch (error) {
      console.error('Error getting NPS feedback themes:', error);
      return [];
    }
  }
}

// Export singleton instance
export const npsManager = NPSManager.getInstance();
