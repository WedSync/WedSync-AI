import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  user_type: string;
  wedding_context: any;
  reach_score: number;
  impact_score: number;
  confidence_score: number;
  effort_score: number;
  rice_calculated_score: number;
  final_priority_score: number;
  vote_count: number;
  comment_count: number;
  status: string;
  created_at: string;
  pain_points: string[];
}

export interface VendorImpact {
  affected_vendor_types: string[];
  business_disruption_level: 'low' | 'medium' | 'high' | 'critical';
  revenue_impact_potential: number;
  competitive_advantage_score: number;
}

export interface ProductInsights {
  top_requested_categories: CategoryInsight[];
  wedding_size_patterns: WeddingSizePattern[];
  user_type_priorities: UserTypePriority[];
  seasonal_trends: SeasonalTrend[];
  critical_gaps: CriticalGap[];
}

export interface CategoryInsight {
  category: string;
  request_count: number;
  average_priority_score: number;
  total_votes: number;
  completion_rate: number;
}

export interface WeddingSizePattern {
  wedding_size: string;
  request_count: number;
  average_urgency: number;
  top_pain_points: string[];
}

export interface UserTypePriority {
  user_type: string;
  request_count: number;
  average_vote_weight: number;
  most_requested_category: string;
}

export interface SeasonalTrend {
  month: number;
  month_name: string;
  request_count: number;
  urgency_multiplier: number;
  top_categories: string[];
}

export interface CriticalGap {
  description: string;
  affected_users: number;
  business_impact: number;
  implementation_difficulty: number;
  recommendation: string;
}

export class WeddingIndustryAnalytics {
  async calculateWeddingInsights(featureRequest: FeatureRequest) {
    const insights = {
      seasonal_relevance: this.calculateSeasonalRelevance(featureRequest),
      vendor_impact: this.calculateVendorImpact(featureRequest),
      couple_benefit: this.calculateCoupleBenefit(featureRequest),
      implementation_urgency:
        this.calculateImplementationUrgency(featureRequest),
    };

    return insights;
  }

  private calculateSeasonalRelevance(request: FeatureRequest): number {
    const currentMonth = new Date().getMonth() + 1;
    const peakMonths = [4, 5, 6, 7, 8, 9, 10]; // Apr-Oct wedding season

    let seasonalScore = 1.0;

    // Boost score during peak wedding season
    if (peakMonths.includes(currentMonth)) {
      seasonalScore *= 1.3;
    }

    // Additional boost for timeline-related features during planning season
    if (
      request.category === 'timeline_management' &&
      [1, 2, 3].includes(currentMonth)
    ) {
      seasonalScore *= 1.2; // Planning happens in winter for summer weddings
    }

    // Budget features are most important during early planning
    if (
      request.category === 'budget_tracking' &&
      [1, 2, 3, 4].includes(currentMonth)
    ) {
      seasonalScore *= 1.15;
    }

    // Guest management peaks before RSVP deadlines
    if (
      request.category === 'guest_management' &&
      [2, 3, 4, 5].includes(currentMonth)
    ) {
      seasonalScore *= 1.1;
    }

    return Math.min(2.0, seasonalScore);
  }

  private calculateVendorImpact(request: FeatureRequest): VendorImpact {
    const vendorTypes = this.extractVendorTypes(request.wedding_context);
    const impactScore = request.reach_score * request.impact_score;

    return {
      affected_vendor_types: vendorTypes,
      business_disruption_level: this.assessBusinessDisruption(request),
      revenue_impact_potential: this.estimateRevenueImpact(
        request,
        vendorTypes,
      ),
      competitive_advantage_score: impactScore * 0.1,
    };
  }

  private calculateCoupleBenefit(request: FeatureRequest): number {
    let benefitScore = request.impact_score;

    // Categories that directly benefit couples get higher scores
    const coupleFocusedCategories = [
      'guest_management',
      'budget_tracking',
      'timeline_management',
    ];

    if (coupleFocusedCategories.includes(request.category)) {
      benefitScore *= 1.2;
    }

    // Features that reduce wedding stress get bonus
    const stressReducingKeywords = [
      'automation',
      'notification',
      'reminder',
      'sync',
    ];
    const hasStressReduction = stressReducingKeywords.some(
      (keyword) =>
        request.title.toLowerCase().includes(keyword) ||
        request.description.toLowerCase().includes(keyword),
    );

    if (hasStressReduction) {
      benefitScore *= 1.15;
    }

    return Math.min(10, benefitScore);
  }

  private calculateImplementationUrgency(request: FeatureRequest): number {
    let urgencyScore = request.final_priority_score;

    // Wedding day critical features get maximum urgency
    const weddingDayKeywords = ['ceremony', 'reception', 'day of', 'live'];
    const isWeddingDayCritical = weddingDayKeywords.some(
      (keyword) =>
        request.title.toLowerCase().includes(keyword) ||
        request.description.toLowerCase().includes(keyword),
    );

    if (isWeddingDayCritical) {
      urgencyScore *= 1.5;
    }

    // High vote count indicates community demand
    if (request.vote_count > 50) urgencyScore *= 1.3;
    if (request.vote_count > 100) urgencyScore *= 1.5;

    // Security and performance issues get urgency boost
    if (['security', 'performance'].includes(request.category)) {
      urgencyScore *= 1.4;
    }

    return urgencyScore;
  }

  private extractVendorTypes(weddingContext: any): string[] {
    if (!weddingContext) return ['general'];

    const categoryToVendors: { [key: string]: string[] } = {
      timeline_management: ['wedding_planner', 'photographer', 'coordinator'],
      budget_tracking: ['all_vendors', 'couples'],
      guest_management: ['couples', 'caterer', 'venue'],
      vendor_coordination: ['all_vendors', 'wedding_planner'],
      communications: ['all_vendors', 'couples'],
      photography: ['photographer', 'videographer'],
      venue: ['venue', 'coordinator'],
      catering: ['caterer', 'venue'],
    };

    return categoryToVendors[weddingContext.category] || ['general'];
  }

  private assessBusinessDisruption(
    request: FeatureRequest,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const disruptionScore = request.effort_score * (request.reach_score / 10);

    if (disruptionScore >= 8) return 'critical';
    if (disruptionScore >= 6) return 'high';
    if (disruptionScore >= 4) return 'medium';
    return 'low';
  }

  private estimateRevenueImpact(
    request: FeatureRequest,
    vendorTypes: string[],
  ): number {
    // Base revenue impact calculation
    let revenueImpact = request.reach_score * request.impact_score * 1000; // Base in dollars

    // Multiply by affected vendor types
    revenueImpact *= Math.max(1, vendorTypes.length * 0.5);

    // Marketplace and payment features have higher revenue impact
    if (
      request.category === 'integrations' ||
      request.title.toLowerCase().includes('payment') ||
      request.title.toLowerCase().includes('marketplace')
    ) {
      revenueImpact *= 2;
    }

    return Math.round(revenueImpact);
  }

  async generateProductInsights(): Promise<ProductInsights> {
    try {
      // Get data from last 30 days
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data: recentRequests, error } = await supabase
        .from('feature_requests')
        .select(
          `
          id,
          category,
          user_type,
          wedding_context,
          final_priority_score,
          vote_count,
          comment_count,
          created_at,
          status,
          pain_points,
          reach_score,
          impact_score
        `,
        )
        .gte('created_at', thirtyDaysAgo);

      if (error) {
        console.error('Error fetching recent requests:', error);
        throw error;
      }

      const requests = recentRequests || [];

      return {
        top_requested_categories: await this.analyzeTopCategories(requests),
        wedding_size_patterns: this.analyzeWeddingSizePatterns(requests),
        user_type_priorities: this.analyzeUserTypePriorities(requests),
        seasonal_trends: this.analyzeSeasonalTrends(requests),
        critical_gaps: this.identifyCriticalGaps(requests),
      };
    } catch (error) {
      console.error('Error generating product insights:', error);
      throw error;
    }
  }

  private async analyzeTopCategories(
    requests: any[],
  ): Promise<CategoryInsight[]> {
    const categoryStats = new Map<
      string,
      {
        count: number;
        totalPriority: number;
        totalVotes: number;
        completedCount: number;
      }
    >();

    requests.forEach((request) => {
      const category = request.category;
      const stats = categoryStats.get(category) || {
        count: 0,
        totalPriority: 0,
        totalVotes: 0,
        completedCount: 0,
      };

      stats.count++;
      stats.totalPriority += request.final_priority_score || 0;
      stats.totalVotes += request.vote_count || 0;
      if (request.status === 'completed') stats.completedCount++;

      categoryStats.set(category, stats);
    });

    return Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        request_count: stats.count,
        average_priority_score: stats.totalPriority / stats.count,
        total_votes: stats.totalVotes,
        completion_rate: stats.completedCount / stats.count,
      }))
      .sort((a, b) => b.request_count - a.request_count)
      .slice(0, 10);
  }

  private analyzeWeddingSizePatterns(requests: any[]): WeddingSizePattern[] {
    const sizePatterns = new Map<
      string,
      {
        count: number;
        totalUrgency: number;
        painPoints: string[];
      }
    >();

    requests.forEach((request) => {
      const weddingSize = request.wedding_context?.wedding_size || 'unknown';
      const pattern = sizePatterns.get(weddingSize) || {
        count: 0,
        totalUrgency: 0,
        painPoints: [],
      };

      pattern.count++;
      pattern.totalUrgency += request.final_priority_score || 0;
      pattern.painPoints.push(...(request.pain_points || []));

      sizePatterns.set(weddingSize, pattern);
    });

    return Array.from(sizePatterns.entries())
      .map(([size, pattern]) => ({
        wedding_size: size,
        request_count: pattern.count,
        average_urgency: pattern.totalUrgency / pattern.count,
        top_pain_points: this.getTopPainPoints(pattern.painPoints),
      }))
      .sort((a, b) => b.request_count - a.request_count);
  }

  private analyzeUserTypePriorities(requests: any[]): UserTypePriority[] {
    const userStats = new Map<
      string,
      {
        count: number;
        totalVoteWeight: number;
        categories: { [key: string]: number };
      }
    >();

    requests.forEach((request) => {
      const userType = request.user_type || 'unknown';
      const stats = userStats.get(userType) || {
        count: 0,
        totalVoteWeight: 0,
        categories: {},
      };

      stats.count++;
      stats.totalVoteWeight += 1; // Default weight, could be enhanced with actual vote weights
      stats.categories[request.category] =
        (stats.categories[request.category] || 0) + 1;

      userStats.set(userType, stats);
    });

    return Array.from(userStats.entries())
      .map(([userType, stats]) => ({
        user_type: userType,
        request_count: stats.count,
        average_vote_weight: stats.totalVoteWeight / stats.count,
        most_requested_category:
          Object.entries(stats.categories).sort(
            ([, a], [, b]) => b - a,
          )[0]?.[0] || 'unknown',
      }))
      .sort((a, b) => b.request_count - a.request_count);
  }

  private analyzeSeasonalTrends(requests: any[]): SeasonalTrend[] {
    const monthlyStats = new Map<
      number,
      {
        count: number;
        urgencySum: number;
        categories: { [key: string]: number };
      }
    >();

    requests.forEach((request) => {
      const month = new Date(request.created_at).getMonth() + 1;
      const stats = monthlyStats.get(month) || {
        count: 0,
        urgencySum: 0,
        categories: {},
      };

      stats.count++;
      stats.urgencySum += request.final_priority_score || 0;
      stats.categories[request.category] =
        (stats.categories[request.category] || 0) + 1;

      monthlyStats.set(month, stats);
    });

    const monthNames = [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return Array.from(monthlyStats.entries())
      .map(([month, stats]) => ({
        month,
        month_name: monthNames[month],
        request_count: stats.count,
        urgency_multiplier: this.calculateSeasonalMultiplier(month),
        top_categories: Object.entries(stats.categories)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([category]) => category),
      }))
      .sort((a, b) => a.month - b.month);
  }

  private identifyCriticalGaps(requests: any[]): CriticalGap[] {
    const gaps: CriticalGap[] = [];

    // Analyze common pain points without solutions
    const painPointFrequency = new Map<string, number>();
    requests.forEach((request) => {
      (request.pain_points || []).forEach((point: string) => {
        painPointFrequency.set(point, (painPointFrequency.get(point) || 0) + 1);
      });
    });

    // Identify high-frequency pain points with low solution rate
    Array.from(painPointFrequency.entries())
      .filter(([, frequency]) => frequency >= 5) // Minimum threshold
      .forEach(([painPoint, frequency]) => {
        const relatedRequests = requests.filter((req) =>
          (req.pain_points || []).includes(painPoint),
        );
        const completedRequests = relatedRequests.filter(
          (req) => req.status === 'completed',
        );

        if (completedRequests.length / relatedRequests.length < 0.3) {
          // Less than 30% completion rate
          gaps.push({
            description: `Insufficient solutions for: ${painPoint}`,
            affected_users: frequency,
            business_impact: this.calculateGapBusinessImpact(relatedRequests),
            implementation_difficulty:
              this.calculateGapDifficulty(relatedRequests),
            recommendation: this.generateGapRecommendation(
              painPoint,
              relatedRequests,
            ),
          });
        }
      });

    return gaps.slice(0, 5); // Return top 5 critical gaps
  }

  private getTopPainPoints(painPoints: string[]): string[] {
    const frequency = new Map<string, number>();
    painPoints.forEach((point) => {
      frequency.set(point, (frequency.get(point) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([point]) => point);
  }

  private calculateSeasonalMultiplier(month: number): number {
    const peakMonths = [4, 5, 6, 7, 8, 9, 10]; // Apr-Oct
    return peakMonths.includes(month) ? 1.3 : 1.0;
  }

  private calculateGapBusinessImpact(requests: any[]): number {
    const totalImpact = requests.reduce(
      (sum, req) => sum + (req.reach_score || 0) * (req.impact_score || 0),
      0,
    );
    return Math.round(totalImpact / requests.length);
  }

  private calculateGapDifficulty(requests: any[]): number {
    const avgEffort =
      requests.reduce((sum, req) => sum + (req.effort_score || 5), 0) /
      requests.length;
    return Math.round(avgEffort);
  }

  private generateGapRecommendation(
    painPoint: string,
    requests: any[],
  ): string {
    const urgentCount = requests.filter(
      (req) => req.final_priority_score > 50,
    ).length;
    const avgRiceScore =
      requests.reduce((sum, req) => sum + (req.rice_calculated_score || 0), 0) /
      requests.length;

    if (urgentCount > requests.length * 0.6) {
      return `HIGH PRIORITY: Address ${painPoint} immediately - affects ${urgentCount} urgent requests`;
    } else if (avgRiceScore > 40) {
      return `STRATEGIC: Develop comprehensive solution for ${painPoint} - high RICE score indicates good ROI`;
    } else {
      return `CONSIDER: Evaluate feasibility of addressing ${painPoint} in next quarter`;
    }
  }
}

// Export singleton instance
export const weddingAnalytics = new WeddingIndustryAnalytics();
