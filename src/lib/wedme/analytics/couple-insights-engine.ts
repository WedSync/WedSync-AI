/**
 * WedMe Analytics Platform - Couple Insights Engine
 *
 * Core personalized wedding insights service providing AI-powered analytics,
 * planning health scores, and predictive recommendations for couples.
 *
 * Key Features:
 * - Real-time planning health assessment
 * - Personalized milestone recommendations
 * - Risk factor identification and mitigation
 * - Decision journey tracking
 * - Budget alignment insights
 * - Timeline optimization recommendations
 *
 * @version 1.0.0
 * @author WedSync Development Team
 */

import { createClient } from '@supabase/supabase-js';

// Core Types and Interfaces
export interface PersonalizedInsight {
  id: string;
  type: 'milestone' | 'budget' | 'timeline' | 'vendor' | 'planning' | 'risk';
  title: string;
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  action_required: boolean;
  deadline?: Date;
  estimated_impact: number; // 1-10 scale
  related_tasks?: string[];
  confidence_score: number; // 0-1
}

export interface PlanningHealthScore {
  overall_score: number; // 0-100
  category_scores: {
    budget: number;
    timeline: number;
    vendors: number;
    planning: number;
    communication: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  last_updated: Date;
  factors: HealthFactor[];
}

export interface HealthFactor {
  category: string;
  score: number;
  weight: number;
  description: string;
  improvement_actions: string[];
}

export interface RiskFactor {
  id: string;
  type: 'budget' | 'timeline' | 'vendor' | 'weather' | 'seasonal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
  impact: number; // 1-10
  description: string;
  mitigation_strategies: string[];
  auto_detected: boolean;
}

export interface Opportunity {
  id: string;
  type: 'savings' | 'upgrade' | 'optimization' | 'vendor';
  potential_value: number;
  effort_required: 'low' | 'medium' | 'high';
  description: string;
  action_items: string[];
  expires_at?: Date;
}

export interface PersonalizedInsights {
  couple_id: string;
  wedding_id: string;
  insights: PersonalizedInsight[];
  planning_health: PlanningHealthScore;
  next_steps: string[];
  risk_factors: RiskFactor[];
  opportunities: Opportunity[];
  generated_at: Date;
  expires_at: Date;
}

// Planning Health Algorithm Constants
const HEALTH_WEIGHTS = {
  budget: 0.25,
  timeline: 0.2,
  vendors: 0.2,
  planning: 0.2,
  communication: 0.15,
};

const MILESTONE_SCORING = {
  save_the_date: { base_score: 15, critical_weeks: 26 },
  venue_booked: { base_score: 20, critical_weeks: 20 },
  photographer_booked: { base_score: 15, critical_weeks: 16 },
  catering_finalized: { base_score: 12, critical_weeks: 12 },
  invitations_sent: { base_score: 10, critical_weeks: 8 },
  final_headcount: { base_score: 8, critical_weeks: 2 },
};

/**
 * Couple Insights Engine Class
 *
 * Provides comprehensive analytics and insights for wedding couples
 * with AI-powered recommendations and real-time health monitoring.
 */
export class CoupleInsightsEngine {
  private supabase;
  private aiEnabled: boolean;

  constructor(supabaseUrl?: string, supabaseKey?: string, enableAI = true) {
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.aiEnabled = enableAI;
  }

  /**
   * Generate comprehensive personalized insights for a couple
   */
  async generateInsights(
    coupleId: string,
    weddingId: string,
  ): Promise<PersonalizedInsights> {
    try {
      // Fetch couple and wedding data
      const [coupleData, weddingData, tasksData, budgetData] =
        await Promise.all([
          this.fetchCoupleData(coupleId),
          this.fetchWeddingData(weddingId),
          this.fetchTasksData(weddingId),
          this.fetchBudgetData(weddingId),
        ]);

      // Calculate planning health score
      const planningHealth = await this.calculatePlanningHealth(
        coupleData,
        weddingData,
        tasksData,
        budgetData,
      );

      // Generate insights
      const insights = await this.generatePersonalizedInsights(
        coupleData,
        weddingData,
        tasksData,
        budgetData,
        planningHealth,
      );

      // Identify risks and opportunities
      const riskFactors = await this.identifyRiskFactors(
        weddingData,
        tasksData,
        budgetData,
      );
      const opportunities = await this.identifyOpportunities(
        weddingData,
        budgetData,
        tasksData,
      );

      // Generate next steps
      const nextSteps = this.generateNextSteps(
        insights,
        riskFactors,
        planningHealth,
      );

      const result: PersonalizedInsights = {
        couple_id: coupleId,
        wedding_id: weddingId,
        insights,
        planning_health: planningHealth,
        next_steps: nextSteps,
        risk_factors: riskFactors,
        opportunities,
        generated_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      // Store in database for caching
      await this.storeInsights(result);

      return result;
    } catch (error) {
      console.error('Error generating couple insights:', error);
      throw new Error('Failed to generate insights');
    }
  }

  /**
   * Calculate comprehensive planning health score
   */
  private async calculatePlanningHealth(
    coupleData: any,
    weddingData: any,
    tasksData: any,
    budgetData: any,
  ): Promise<PlanningHealthScore> {
    const budgetScore = this.calculateBudgetHealth(budgetData, weddingData);
    const timelineScore = this.calculateTimelineHealth(weddingData, tasksData);
    const vendorScore = this.calculateVendorHealth(weddingData, tasksData);
    const planningScore = this.calculatePlanningProgress(
      tasksData,
      weddingData,
    );
    const communicationScore = this.calculateCommunicationHealth(
      coupleData,
      weddingData,
    );

    const overallScore = Math.round(
      budgetScore * HEALTH_WEIGHTS.budget +
        timelineScore * HEALTH_WEIGHTS.timeline +
        vendorScore * HEALTH_WEIGHTS.vendors +
        planningScore * HEALTH_WEIGHTS.planning +
        communicationScore * HEALTH_WEIGHTS.communication,
    );

    return {
      overall_score: overallScore,
      category_scores: {
        budget: budgetScore,
        timeline: timelineScore,
        vendors: vendorScore,
        planning: planningScore,
        communication: communicationScore,
      },
      trend: this.calculateTrend(overallScore, weddingData.id),
      last_updated: new Date(),
      factors: this.generateHealthFactors(
        budgetScore,
        timelineScore,
        vendorScore,
        planningScore,
        communicationScore,
      ),
    };
  }

  /**
   * Calculate budget health score (0-100)
   */
  private calculateBudgetHealth(budgetData: any, weddingData: any): number {
    if (!budgetData) return 50; // Neutral if no budget data

    const totalBudget = budgetData.total_budget || 0;
    const spentAmount = budgetData.spent_amount || 0;
    const allocatedAmount = budgetData.allocated_amount || 0;

    // Calculate utilization rate
    const utilizationRate = totalBudget > 0 ? spentAmount / totalBudget : 0;

    // Ideal utilization curve based on timeline
    const weeksToWedding = this.getWeeksToWedding(weddingData.date);
    const idealUtilization = this.getIdealBudgetUtilization(weeksToWedding);

    // Score based on how close to ideal
    const utilizationDiff = Math.abs(utilizationRate - idealUtilization);
    let score = 100 - utilizationDiff * 200; // Penalty for deviation

    // Bonus for having a budget plan
    if (totalBudget > 0) score += 10;
    if (allocatedAmount > spentAmount * 0.8) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate timeline health score (0-100)
   */
  private calculateTimelineHealth(weddingData: any, tasksData: any): number {
    const weeksToWedding = this.getWeeksToWedding(weddingData.date);
    let score = 100;

    // Check critical milestones
    for (const [milestone, config] of Object.entries(MILESTONE_SCORING)) {
      const task = tasksData.find((t: any) => t.type === milestone);
      const isCompleted = task?.completed || false;

      if (!isCompleted && weeksToWedding < config.critical_weeks) {
        score -= config.base_score;
      }
    }

    // Bonus for early completion
    const completedTasks = tasksData.filter((t: any) => t.completed).length;
    const totalTasks = tasksData.length;
    if (totalTasks > 0) {
      const completionRate = completedTasks / totalTasks;
      score += completionRate * 20; // Up to 20 bonus points
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate personalized insights based on data analysis
   */
  private async generatePersonalizedInsights(
    coupleData: any,
    weddingData: any,
    tasksData: any,
    budgetData: any,
    planningHealth: PlanningHealthScore,
  ): Promise<PersonalizedInsight[]> {
    const insights: PersonalizedInsight[] = [];

    // Budget insights
    if (planningHealth.category_scores.budget < 70) {
      insights.push({
        id: `budget-${Date.now()}`,
        type: 'budget',
        title: 'Budget Optimization Needed',
        description:
          'Your current spending pattern suggests potential budget overruns. Consider reviewing vendor contracts.',
        importance: 'high',
        category: 'Financial Planning',
        action_required: true,
        estimated_impact: 8,
        confidence_score: 0.85,
      });
    }

    // Timeline insights
    const weeksToWedding = this.getWeeksToWedding(weddingData.date);
    if (weeksToWedding < 12 && planningHealth.category_scores.timeline < 70) {
      insights.push({
        id: `timeline-${Date.now()}`,
        type: 'timeline',
        title: 'Critical Timeline Alert',
        description:
          'Several key milestones are behind schedule. Immediate action needed to avoid last-minute stress.',
        importance: 'critical',
        category: 'Timeline Management',
        action_required: true,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estimated_impact: 9,
        confidence_score: 0.92,
      });
    }

    // Vendor insights
    const unbookedVendors = this.getUnbookedVendors(tasksData);
    if (unbookedVendors.length > 0 && weeksToWedding < 20) {
      insights.push({
        id: `vendor-${Date.now()}`,
        type: 'vendor',
        title: 'Vendor Booking Urgency',
        description: `${unbookedVendors.length} key vendors still need booking. Popular vendors fill up quickly.`,
        importance: 'high',
        category: 'Vendor Management',
        action_required: true,
        estimated_impact: 7,
        related_tasks: unbookedVendors,
        confidence_score: 0.88,
      });
    }

    return insights;
  }

  /**
   * Identify potential risk factors
   */
  private async identifyRiskFactors(
    weddingData: any,
    tasksData: any,
    budgetData: any,
  ): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // Budget overrun risk
    if (budgetData && budgetData.spent_amount / budgetData.total_budget > 0.8) {
      risks.push({
        id: `budget-risk-${Date.now()}`,
        type: 'budget',
        severity: 'high',
        probability: 0.7,
        impact: 8,
        description:
          'High probability of budget overrun based on current spending patterns',
        mitigation_strategies: [
          'Review and negotiate vendor contracts',
          'Cut non-essential expenses',
          'Allocate emergency fund',
          'Consider alternative options for remaining items',
        ],
        auto_detected: true,
      });
    }

    // Timeline pressure risk
    const weeksToWedding = this.getWeeksToWedding(weddingData.date);
    const incompleteTasks = tasksData.filter((t: any) => !t.completed).length;
    if (weeksToWedding < 8 && incompleteTasks > 5) {
      risks.push({
        id: `timeline-risk-${Date.now()}`,
        type: 'timeline',
        severity: 'critical',
        probability: 0.85,
        impact: 9,
        description:
          'Multiple critical tasks remain incomplete with limited time remaining',
        mitigation_strategies: [
          'Prioritize most critical tasks',
          'Delegate to wedding party or family',
          'Consider hiring a wedding coordinator',
          'Simplify remaining decisions',
        ],
        auto_detected: true,
      });
    }

    // Seasonal risk for popular dates
    if (this.isPopularWeddingMonth(weddingData.date)) {
      risks.push({
        id: `seasonal-risk-${Date.now()}`,
        type: 'seasonal',
        severity: 'medium',
        probability: 0.6,
        impact: 6,
        description:
          'Wedding date falls during peak season - vendor availability and pricing affected',
        mitigation_strategies: [
          'Book vendors as early as possible',
          'Have backup options ready',
          'Budget for peak season premiums',
          'Consider off-peak alternatives for some services',
        ],
        auto_detected: true,
      });
    }

    return risks;
  }

  /**
   * Identify optimization opportunities
   */
  private async identifyOpportunities(
    weddingData: any,
    budgetData: any,
    tasksData: any,
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    // Early booking discounts
    const weeksToWedding = this.getWeeksToWedding(weddingData.date);
    if (weeksToWedding > 20) {
      opportunities.push({
        id: `early-booking-${Date.now()}`,
        type: 'savings',
        potential_value: budgetData?.total_budget * 0.15 || 500,
        effort_required: 'low',
        description:
          'Book remaining vendors now to secure early booking discounts (10-15% savings possible)',
        action_items: [
          'Contact shortlisted vendors this week',
          'Negotiate early booking rates',
          'Secure contracts with deposit',
          'Update budget with locked-in prices',
        ],
      });
    }

    // Bundle opportunities
    const unbookedServices = this.getUnbookedServices(tasksData);
    if (
      unbookedServices.includes('photography') &&
      unbookedServices.includes('videography')
    ) {
      opportunities.push({
        id: `bundle-opportunity-${Date.now()}`,
        type: 'savings',
        potential_value: 800,
        effort_required: 'medium',
        description:
          'Bundle photography and videography services for potential 15-20% savings',
        action_items: [
          'Research photographers who also offer videography',
          'Request bundle pricing quotes',
          'Compare vs. separate bookings',
          'Negotiate package deals',
        ],
      });
    }

    return opportunities;
  }

  // Helper methods
  private getWeeksToWedding(weddingDate: string): number {
    const wedding = new Date(weddingDate);
    const now = new Date();
    return Math.ceil(
      (wedding.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
  }

  private getIdealBudgetUtilization(weeksToWedding: number): number {
    // S-curve for ideal budget utilization
    if (weeksToWedding > 30) return 0.1;
    if (weeksToWedding > 20) return 0.3;
    if (weeksToWedding > 12) return 0.6;
    if (weeksToWedding > 4) return 0.85;
    return 0.95;
  }

  private isPopularWeddingMonth(weddingDate: string): boolean {
    const month = new Date(weddingDate).getMonth();
    return [4, 5, 8, 9].includes(month); // May, June, September, October
  }

  private calculateVendorHealth(weddingData: any, tasksData: any): number {
    // Implementation for vendor health scoring
    return 75; // Placeholder
  }

  private calculatePlanningProgress(tasksData: any, weddingData: any): number {
    // Implementation for planning progress scoring
    return 80; // Placeholder
  }

  private calculateCommunicationHealth(
    coupleData: any,
    weddingData: any,
  ): number {
    // Implementation for communication health scoring
    return 85; // Placeholder
  }

  private calculateTrend(
    overallScore: number,
    weddingId: string,
  ): 'improving' | 'stable' | 'declining' {
    // Implementation for trend calculation
    return 'stable'; // Placeholder
  }

  private generateHealthFactors(
    budgetScore: number,
    timelineScore: number,
    vendorScore: number,
    planningScore: number,
    communicationScore: number,
  ): HealthFactor[] {
    return [
      {
        category: 'Budget Management',
        score: budgetScore,
        weight: HEALTH_WEIGHTS.budget,
        description: 'Financial planning and spending control',
        improvement_actions: [
          'Review budget allocation',
          'Track expenses daily',
          'Negotiate vendor prices',
        ],
      },
      {
        category: 'Timeline Progress',
        score: timelineScore,
        weight: HEALTH_WEIGHTS.timeline,
        description: 'Milestone completion and schedule adherence',
        improvement_actions: [
          'Update task priorities',
          'Set weekly goals',
          'Delegate responsibilities',
        ],
      },
    ];
  }

  private getUnbookedVendors(tasksData: any): string[] {
    // Implementation for finding unbooked vendors
    return []; // Placeholder
  }

  private getUnbookedServices(tasksData: any): string[] {
    // Implementation for finding unbooked services
    return []; // Placeholder
  }

  private generateNextSteps(
    insights: PersonalizedInsight[],
    riskFactors: RiskFactor[],
    planningHealth: PlanningHealthScore,
  ): string[] {
    const nextSteps: string[] = [];

    // Add steps based on critical insights
    insights
      .filter(
        (insight) =>
          insight.importance === 'critical' || insight.importance === 'high',
      )
      .slice(0, 3)
      .forEach((insight) => {
        nextSteps.push(`${insight.title}: ${insight.description}`);
      });

    // Add steps for high-risk factors
    riskFactors
      .filter(
        (risk) => risk.severity === 'high' || risk.severity === 'critical',
      )
      .slice(0, 2)
      .forEach((risk) => {
        nextSteps.push(`Risk Mitigation: ${risk.mitigation_strategies[0]}`);
      });

    return nextSteps;
  }

  // Data fetching methods
  private async fetchCoupleData(coupleId: string) {
    const { data } = await this.supabase
      .from('couples')
      .select('*')
      .eq('id', coupleId)
      .single();
    return data;
  }

  private async fetchWeddingData(weddingId: string) {
    const { data } = await this.supabase
      .from('weddings')
      .select('*')
      .eq('id', weddingId)
      .single();
    return data;
  }

  private async fetchTasksData(weddingId: string) {
    const { data } = await this.supabase
      .from('wedding_tasks')
      .select('*')
      .eq('wedding_id', weddingId);
    return data || [];
  }

  private async fetchBudgetData(weddingId: string) {
    const { data } = await this.supabase
      .from('wedding_budgets')
      .select('*')
      .eq('wedding_id', weddingId)
      .single();
    return data;
  }

  private async storeInsights(insights: PersonalizedInsights) {
    await this.supabase.from('couple_insights').upsert({
      couple_id: insights.couple_id,
      wedding_id: insights.wedding_id,
      insights_data: insights,
      generated_at: insights.generated_at,
      expires_at: insights.expires_at,
    });
  }
}

// Export default instance
export const coupleInsightsEngine = new CoupleInsightsEngine();
