/**
 * WedMe Analytics Platform - Budget Optimization Engine
 *
 * Intelligent budget analysis and optimization system providing AI-powered
 * cost-saving recommendations, market intelligence, and financial planning
 * insights for wedding couples.
 *
 * Key Features:
 * - Industry-standard budget allocation analysis
 * - Seasonal pricing intelligence
 * - Cost optimization recommendations
 * - Budget rebalancing suggestions
 * - Market rate comparisons
 * - Savings opportunity identification
 *
 * @version 1.0.0
 * @author WedSync Development Team
 */

import { createClient } from '@supabase/supabase-js';

// Core Types and Interfaces
export interface BudgetCategory {
  category: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  typical_percentage: number;
  seasonal_variation: number;
  market_rate_min: number;
  market_rate_max: number;
  optimization_potential: number;
}

export interface BudgetOptimizationInsight {
  id: string;
  type: 'reallocation' | 'savings' | 'market_rate' | 'seasonal' | 'negotiation';
  category: string;
  current_allocation: number;
  recommended_allocation: number;
  potential_savings: number;
  confidence_level: number; // 0-1
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action_items: string[];
  implementation_difficulty: 'easy' | 'moderate' | 'difficult';
  timeline_impact: 'none' | 'minimal' | 'moderate' | 'significant';
}

export interface BudgetAnalysis {
  total_budget: number;
  spent_amount: number;
  remaining_amount: number;
  categories: BudgetCategory[];
  optimization_insights: BudgetOptimizationInsight[];
  seasonal_analysis: SeasonalPricingAnalysis;
  market_comparison: MarketComparison;
  reallocation_suggestions: ReallocationSuggestion[];
  savings_opportunities: SavingsOpportunity[];
  generated_at: Date;
}

export interface SeasonalPricingAnalysis {
  current_season: 'peak' | 'shoulder' | 'off_peak';
  season_multiplier: number;
  price_trends: {
    category: string;
    current_rate: number;
    seasonal_average: number;
    peak_rate: number;
    off_peak_rate: number;
  }[];
  timing_recommendations: string[];
}

export interface MarketComparison {
  location: string;
  market_percentile: number; // Where couple's budget sits in market (0-100)
  category_comparisons: {
    category: string;
    couple_amount: number;
    market_average: number;
    market_median: number;
    percentile: number;
    variance_explanation: string;
  }[];
}

export interface ReallocationSuggestion {
  from_category: string;
  to_category: string;
  amount: number;
  reasoning: string;
  impact_score: number;
  risk_level: 'low' | 'medium' | 'high';
}

export interface SavingsOpportunity {
  category: string;
  opportunity_type: 'bundle' | 'timing' | 'alternative' | 'negotiation' | 'diy';
  potential_savings: number;
  effort_required: 'low' | 'medium' | 'high';
  quality_impact: 'none' | 'minimal' | 'moderate' | 'significant';
  description: string;
  implementation_steps: string[];
}

// Industry Budget Standards with Seasonal Variations
const INDUSTRY_BUDGET_STANDARDS: Record<string, BudgetCategory> = {
  venue: {
    category: 'venue',
    allocated_amount: 0,
    spent_amount: 0,
    remaining_amount: 0,
    typical_percentage: 45,
    seasonal_variation: 1.3,
    market_rate_min: 8000,
    market_rate_max: 25000,
    optimization_potential: 0.15,
  },
  catering: {
    category: 'catering',
    allocated_amount: 0,
    spent_amount: 0,
    remaining_amount: 0,
    typical_percentage: 28,
    seasonal_variation: 1.15,
    market_rate_min: 4000,
    market_rate_max: 15000,
    optimization_potential: 0.12,
  },
  photography: {
    category: 'photography',
    allocated_amount: 0,
    spent_amount: 0,
    remaining_amount: 0,
    typical_percentage: 12,
    seasonal_variation: 1.25,
    market_rate_min: 2000,
    market_rate_max: 8000,
    optimization_potential: 0.2,
  },
  music_entertainment: {
    category: 'music_entertainment',
    allocated_amount: 0,
    spent_amount: 0,
    remaining_amount: 0,
    typical_percentage: 8,
    seasonal_variation: 1.2,
    market_rate_min: 800,
    market_rate_max: 3500,
    optimization_potential: 0.25,
  },
  flowers_decorations: {
    category: 'flowers_decorations',
    allocated_amount: 0,
    spent_amount: 0,
    remaining_amount: 0,
    typical_percentage: 7,
    seasonal_variation: 1.4,
    market_rate_min: 800,
    market_rate_max: 3000,
    optimization_potential: 0.3,
  },
};

// Seasonal Multipliers by Month
const SEASONAL_MULTIPLIERS = {
  january: 0.8,
  february: 0.85,
  march: 0.9,
  april: 1.1,
  may: 1.3,
  june: 1.4,
  july: 1.2,
  august: 1.15,
  september: 1.35,
  october: 1.3,
  november: 0.9,
  december: 0.85,
};

/**
 * Budget Optimization Engine Class
 *
 * Provides intelligent budget analysis, optimization recommendations,
 * and market intelligence for wedding financial planning.
 */
export class BudgetOptimizationEngine {
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
   * Perform comprehensive budget analysis and optimization
   */
  async analyzeBudget(
    weddingId: string,
    location?: string,
  ): Promise<BudgetAnalysis> {
    try {
      // Fetch budget and wedding data
      const [budgetData, weddingData, marketData] = await Promise.all([
        this.fetchBudgetData(weddingId),
        this.fetchWeddingData(weddingId),
        this.fetchMarketData(location || 'national'),
      ]);

      if (!budgetData) {
        throw new Error('Budget data not found');
      }

      // Analyze budget categories
      const categories = await this.analyzeBudgetCategories(
        budgetData,
        weddingData,
        marketData,
      );

      // Generate optimization insights
      const optimizationInsights = await this.generateOptimizationInsights(
        categories,
        weddingData,
        marketData,
      );

      // Perform seasonal analysis
      const seasonalAnalysis = await this.performSeasonalAnalysis(
        weddingData,
        categories,
      );

      // Generate market comparison
      const marketComparison = await this.generateMarketComparison(
        budgetData,
        marketData,
        location || 'national',
      );

      // Generate reallocation suggestions
      const reallocationSuggestions =
        this.generateReallocationSuggestions(categories);

      // Identify savings opportunities
      const savingsOpportunities = await this.identifySavingsOpportunities(
        categories,
        weddingData,
        seasonalAnalysis,
      );

      const analysis: BudgetAnalysis = {
        total_budget: budgetData.total_budget,
        spent_amount: budgetData.spent_amount || 0,
        remaining_amount:
          budgetData.total_budget - (budgetData.spent_amount || 0),
        categories,
        optimization_insights: optimizationInsights,
        seasonal_analysis: seasonalAnalysis,
        market_comparison: marketComparison,
        reallocation_suggestions: reallocationSuggestions,
        savings_opportunities: savingsOpportunities,
        generated_at: new Date(),
      };

      // Store analysis for caching
      await this.storeBudgetAnalysis(weddingId, analysis);

      return analysis;
    } catch (error) {
      console.error('Error analyzing budget:', error);
      throw new Error('Failed to analyze budget');
    }
  }

  /**
   * Analyze individual budget categories against industry standards
   */
  private async analyzeBudgetCategories(
    budgetData: any,
    weddingData: any,
    marketData: any,
  ): Promise<BudgetCategory[]> {
    const categories: BudgetCategory[] = [];
    const totalBudget = budgetData.total_budget;

    // Get wedding season multiplier
    const seasonMultiplier = this.getSeasonalMultiplier(weddingData.date);

    for (const [categoryKey, standard] of Object.entries(
      INDUSTRY_BUDGET_STANDARDS,
    )) {
      const categoryData = budgetData.categories?.[categoryKey] || {};

      const category: BudgetCategory = {
        category: categoryKey,
        allocated_amount:
          categoryData.allocated ||
          (totalBudget * standard.typical_percentage) / 100,
        spent_amount: categoryData.spent || 0,
        remaining_amount: 0,
        typical_percentage: standard.typical_percentage,
        seasonal_variation: seasonMultiplier,
        market_rate_min: standard.market_rate_min * seasonMultiplier,
        market_rate_max: standard.market_rate_max * seasonMultiplier,
        optimization_potential: standard.optimization_potential,
      };

      category.remaining_amount =
        category.allocated_amount - category.spent_amount;

      categories.push(category);
    }

    return categories;
  }

  /**
   * Generate optimization insights based on budget analysis
   */
  private async generateOptimizationInsights(
    categories: BudgetCategory[],
    weddingData: any,
    marketData: any,
  ): Promise<BudgetOptimizationInsight[]> {
    const insights: BudgetOptimizationInsight[] = [];

    for (const category of categories) {
      // Check for over-allocation
      const currentPercentage =
        (category.allocated_amount /
          categories.reduce((sum, c) => sum + c.allocated_amount, 0)) *
        100;
      const standardPercentage = category.typical_percentage;

      if (currentPercentage > standardPercentage * 1.2) {
        insights.push({
          id: `overallocation-${category.category}-${Date.now()}`,
          type: 'reallocation',
          category: category.category,
          current_allocation: category.allocated_amount,
          recommended_allocation:
            (categories.reduce((sum, c) => sum + c.allocated_amount, 0) *
              standardPercentage) /
            100,
          potential_savings:
            category.allocated_amount -
            (categories.reduce((sum, c) => sum + c.allocated_amount, 0) *
              standardPercentage) /
              100,
          confidence_level: 0.85,
          priority: 'high',
          description: `${category.category} allocation (${currentPercentage.toFixed(1)}%) significantly exceeds industry standard (${standardPercentage}%)`,
          action_items: [
            'Review vendor quotes for competitive pricing',
            'Consider reducing scope or finding alternatives',
            'Reallocate excess budget to underfunded categories',
          ],
          implementation_difficulty: 'moderate',
          timeline_impact: 'minimal',
        });
      }

      // Check for market rate optimization
      if (category.allocated_amount > category.market_rate_max) {
        insights.push({
          id: `market-rate-${category.category}-${Date.now()}`,
          type: 'market_rate',
          category: category.category,
          current_allocation: category.allocated_amount,
          recommended_allocation: category.market_rate_max,
          potential_savings:
            category.allocated_amount - category.market_rate_max,
          confidence_level: 0.92,
          priority: 'critical',
          description: `Current ${category.category} budget exceeds typical market rates by ${(((category.allocated_amount - category.market_rate_max) / category.market_rate_max) * 100).toFixed(1)}%`,
          action_items: [
            'Get additional quotes from vendors',
            'Negotiate current contracts',
            'Research market rates in your area',
            'Consider timing adjustments',
          ],
          implementation_difficulty: 'easy',
          timeline_impact: 'none',
        });
      }

      // Seasonal optimization opportunities
      const seasonalSavings = this.calculateSeasonalSavings(
        category,
        weddingData.date,
      );
      if (seasonalSavings > 0) {
        insights.push({
          id: `seasonal-${category.category}-${Date.now()}`,
          type: 'seasonal',
          category: category.category,
          current_allocation: category.allocated_amount,
          recommended_allocation: category.allocated_amount - seasonalSavings,
          potential_savings: seasonalSavings,
          confidence_level: 0.78,
          priority: 'medium',
          description: `Potential seasonal savings available for ${category.category} based on wedding timing`,
          action_items: [
            'Consider off-season alternatives',
            'Negotiate seasonal discounts',
            'Book during vendor slow periods',
            'Flexible date planning',
          ],
          implementation_difficulty: 'difficult',
          timeline_impact: 'significant',
        });
      }
    }

    return insights;
  }

  /**
   * Perform seasonal pricing analysis
   */
  private async performSeasonalAnalysis(
    weddingData: any,
    categories: BudgetCategory[],
  ): Promise<SeasonalPricingAnalysis> {
    const weddingMonth = new Date(weddingData.date).getMonth();
    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];
    const currentSeason = this.determineSeason(weddingMonth);
    const seasonMultiplier =
      SEASONAL_MULTIPLIERS[
        monthNames[weddingMonth] as keyof typeof SEASONAL_MULTIPLIERS
      ];

    const priceTrends = categories.map((category) => ({
      category: category.category,
      current_rate: category.allocated_amount,
      seasonal_average: category.allocated_amount / seasonMultiplier,
      peak_rate: (category.allocated_amount / seasonMultiplier) * 1.4,
      off_peak_rate: (category.allocated_amount / seasonMultiplier) * 0.8,
    }));

    const timingRecommendations = this.generateTimingRecommendations(
      currentSeason,
      categories,
    );

    return {
      current_season: currentSeason,
      season_multiplier: seasonMultiplier,
      price_trends: priceTrends,
      timing_recommendations: timingRecommendations,
    };
  }

  /**
   * Generate market comparison analysis
   */
  private async generateMarketComparison(
    budgetData: any,
    marketData: any,
    location: string,
  ): Promise<MarketComparison> {
    const marketPercentile = this.calculateMarketPercentile(
      budgetData.total_budget,
      marketData,
    );

    const categoryComparisons = Object.entries(INDUSTRY_BUDGET_STANDARDS).map(
      ([categoryKey, standard]) => {
        const coupleAmount =
          budgetData.categories?.[categoryKey]?.allocated || 0;
        const marketAverage =
          marketData.averages?.[categoryKey] || standard.market_rate_min * 1.5;
        const marketMedian =
          marketData.medians?.[categoryKey] || standard.market_rate_min * 1.2;

        return {
          category: categoryKey,
          couple_amount: coupleAmount,
          market_average: marketAverage,
          market_median: marketMedian,
          percentile: this.calculateCategoryPercentile(
            coupleAmount,
            marketData,
            categoryKey,
          ),
          variance_explanation: this.explainVariance(
            coupleAmount,
            marketAverage,
            marketMedian,
          ),
        };
      },
    );

    return {
      location,
      market_percentile: marketPercentile,
      category_comparisons: categoryComparisons,
    };
  }

  /**
   * Generate budget reallocation suggestions
   */
  private generateReallocationSuggestions(
    categories: BudgetCategory[],
  ): ReallocationSuggestion[] {
    const suggestions: ReallocationSuggestion[] = [];
    const totalAllocated = categories.reduce(
      (sum, c) => sum + c.allocated_amount,
      0,
    );

    for (const category of categories) {
      const currentPercentage =
        (category.allocated_amount / totalAllocated) * 100;
      const standardPercentage = category.typical_percentage;
      const variance = Math.abs(currentPercentage - standardPercentage);

      // Suggest reallocation if variance > 5%
      if (variance > 5) {
        const targetAmount = (totalAllocated * standardPercentage) / 100;
        const difference = category.allocated_amount - targetAmount;

        if (difference > 0) {
          // Over-allocated, suggest moving money out
          const underAllocatedCategory = categories.find((c) => {
            const cPercentage = (c.allocated_amount / totalAllocated) * 100;
            return cPercentage < c.typical_percentage - 3;
          });

          if (underAllocatedCategory) {
            suggestions.push({
              from_category: category.category,
              to_category: underAllocatedCategory.category,
              amount: Math.min(difference, targetAmount * 0.1),
              reasoning: `Rebalance budget to align with industry standards`,
              impact_score: variance / 10,
              risk_level: variance > 10 ? 'high' : 'medium',
            });
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Identify savings opportunities
   */
  private async identifySavingsOpportunities(
    categories: BudgetCategory[],
    weddingData: any,
    seasonalAnalysis: SeasonalPricingAnalysis,
  ): Promise<SavingsOpportunity[]> {
    const opportunities: SavingsOpportunity[] = [];

    // Bundle opportunities
    const hasPhotography = categories.find((c) => c.category === 'photography');
    const hasEntertainment = categories.find(
      (c) => c.category === 'music_entertainment',
    );

    if (hasPhotography && hasEntertainment) {
      opportunities.push({
        category: 'photography',
        opportunity_type: 'bundle',
        potential_savings:
          (hasPhotography.allocated_amount +
            hasEntertainment.allocated_amount) *
          0.15,
        effort_required: 'medium',
        quality_impact: 'none',
        description:
          'Bundle photography and entertainment services for package discounts',
        implementation_steps: [
          'Research vendors offering multiple services',
          'Request bundle pricing quotes',
          'Compare total cost vs separate bookings',
          'Negotiate package deals',
        ],
      });
    }

    // DIY opportunities for flowers
    const flowers = categories.find(
      (c) => c.category === 'flowers_decorations',
    );
    if (flowers && flowers.allocated_amount > 2000) {
      opportunities.push({
        category: 'flowers_decorations',
        opportunity_type: 'diy',
        potential_savings: flowers.allocated_amount * 0.4,
        effort_required: 'high',
        quality_impact: 'moderate',
        description:
          'DIY centerpieces and decorations can save 30-50% on floral budget',
        implementation_steps: [
          'Research DIY floral tutorials and guides',
          'Source wholesale flowers and supplies',
          'Recruit family/friends for assembly help',
          'Plan assembly timeline and logistics',
        ],
      });
    }

    // Off-season timing opportunities
    if (seasonalAnalysis.current_season === 'peak') {
      const offSeasonSavings = categories.reduce((total, category) => {
        return total + category.allocated_amount * 0.2;
      }, 0);

      opportunities.push({
        category: 'all',
        opportunity_type: 'timing',
        potential_savings: offSeasonSavings,
        effort_required: 'high',
        quality_impact: 'minimal',
        description:
          'Moving to off-season date could save 15-25% across all vendor categories',
        implementation_steps: [
          'Research off-season date availability',
          'Contact vendors for off-season pricing',
          'Consider guest availability for new dates',
          'Weigh savings against preference trade-offs',
        ],
      });
    }

    return opportunities;
  }

  // Helper methods
  private getSeasonalMultiplier(weddingDate: string): number {
    const month = new Date(weddingDate).getMonth();
    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];
    return (
      SEASONAL_MULTIPLIERS[
        monthNames[month] as keyof typeof SEASONAL_MULTIPLIERS
      ] || 1.0
    );
  }

  private determineSeason(month: number): 'peak' | 'shoulder' | 'off_peak' {
    if ([4, 5, 8, 9].includes(month)) return 'peak'; // May, June, September, October
    if ([3, 6, 7, 10].includes(month)) return 'shoulder'; // April, July, August, November
    return 'off_peak';
  }

  private calculateSeasonalSavings(
    category: BudgetCategory,
    weddingDate: string,
  ): number {
    const currentMultiplier = this.getSeasonalMultiplier(weddingDate);
    const offPeakMultiplier = 0.8;

    if (currentMultiplier > offPeakMultiplier) {
      return (
        (category.allocated_amount * (currentMultiplier - offPeakMultiplier)) /
        currentMultiplier
      );
    }
    return 0;
  }

  private generateTimingRecommendations(
    season: string,
    categories: BudgetCategory[],
  ): string[] {
    const recommendations: string[] = [];

    if (season === 'peak') {
      recommendations.push(
        'Consider shifting to off-season dates for significant savings',
      );
      recommendations.push(
        'Book vendors 12+ months in advance to secure better rates',
      );
      recommendations.push(
        'Be flexible with exact dates for last-minute cancellation deals',
      );
    } else if (season === 'off_peak') {
      recommendations.push('Take advantage of off-season pricing - book now!');
      recommendations.push('Negotiate additional services at no extra cost');
      recommendations.push(
        'Consider upgrading services within the same budget',
      );
    } else {
      recommendations.push(
        'Good balance of pricing and availability in shoulder season',
      );
      recommendations.push('Book soon as vendors transition to peak pricing');
    }

    return recommendations;
  }

  private calculateMarketPercentile(
    totalBudget: number,
    marketData: any,
  ): number {
    // Placeholder implementation
    return 65; // Represents 65th percentile
  }

  private calculateCategoryPercentile(
    amount: number,
    marketData: any,
    category: string,
  ): number {
    // Placeholder implementation
    return 50;
  }

  private explainVariance(
    coupleAmount: number,
    marketAverage: number,
    marketMedian: number,
  ): string {
    const averageVariance =
      ((coupleAmount - marketAverage) / marketAverage) * 100;

    if (Math.abs(averageVariance) < 10) {
      return 'Within typical market range';
    } else if (averageVariance > 0) {
      return `${averageVariance.toFixed(1)}% above market average - consider optimization`;
    } else {
      return `${Math.abs(averageVariance).toFixed(1)}% below market average - good value`;
    }
  }

  // Data fetching methods
  private async fetchBudgetData(weddingId: string) {
    const { data } = await this.supabase
      .from('wedding_budgets')
      .select('*')
      .eq('wedding_id', weddingId)
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

  private async fetchMarketData(location: string) {
    // Fetch market data - placeholder implementation
    return {
      averages: {},
      medians: {},
      percentiles: {},
    };
  }

  private async storeBudgetAnalysis(
    weddingId: string,
    analysis: BudgetAnalysis,
  ) {
    await this.supabase.from('budget_analyses').upsert({
      wedding_id: weddingId,
      analysis_data: analysis,
      generated_at: analysis.generated_at,
    });
  }
}

// Export default instance
export const budgetOptimizationEngine = new BudgetOptimizationEngine();
