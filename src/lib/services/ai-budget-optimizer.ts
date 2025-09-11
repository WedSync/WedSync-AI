import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import OpenAI from 'openai';
import Decimal from 'decimal.js';

// Types for budget optimization
export interface BudgetAllocation {
  client_id: string;
  wedding_date: string;
  guest_count: number;
  venue_location: string;
  current_budget: string;
  currency: 'GBP' | 'USD' | 'EUR' | 'AUD' | 'CAD';
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  category_name: string;
  current_allocation: string;
  priority: number;
  is_flexible: boolean;
}

export interface MarketPricingData {
  location: string;
  service_category: string;
  average_price: number;
  price_range_min: number;
  price_range_max: number;
  confidence_score: number;
  regional_multiplier: number;
  seasonal_multiplier: number;
  currency: string;
  last_updated: string;
}

export interface UserPreferences {
  primary_goal: 'minimize_cost' | 'maximize_value' | 'balance_budget';
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  savings_target_percentage?: number;
}

export interface OptimizationRecommendation {
  id: string;
  category_name: string;
  recommendation_type:
    | 'reduce_allocation'
    | 'increase_allocation'
    | 'reallocate'
    | 'vendor_switch'
    | 'timing_optimization';
  current_allocation: string;
  recommended_allocation: string;
  potential_saving: string;
  confidence_score: number;
  reasoning: string;
  supporting_data: Record<string, any>;
  implementation_difficulty: 'easy' | 'moderate' | 'difficult';
  estimated_impact: 'low' | 'medium' | 'high';
}

export interface CostSavingOpportunity {
  id: string;
  category: string;
  opportunity_type:
    | 'vendor_negotiation'
    | 'timing_change'
    | 'service_reduction'
    | 'alternative_option';
  potential_saving: string;
  confidence_score: number;
  description: string;
  action_required: string;
  deadline?: string;
  risk_level: 'low' | 'medium' | 'high';
}

export interface OptimizationResult {
  optimization_id: string;
  optimization_score: number;
  potential_savings: {
    total_amount: string;
    percentage: number;
    currency: string;
  };
  recommendations: OptimizationRecommendation[];
  optimized_allocations: Record<string, string>;
  confidence_score: number;
  market_position: 'budget' | 'moderate' | 'luxury';
  regional_multiplier: number;
  seasonal_multiplier: number;
  model_version: string;
  analysis_timestamp: string;
}

export interface WeddingContext {
  wedding_type:
    | 'intimate'
    | 'traditional'
    | 'destination'
    | 'luxury'
    | 'budget';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  venue_type:
    | 'church'
    | 'hotel'
    | 'outdoor'
    | 'registry'
    | 'destination'
    | 'home';
  guest_demographics:
    | 'young_professional'
    | 'family_focused'
    | 'mature'
    | 'mixed';
  cultural_requirements?: string[];
}

class AIBudgetOptimizer {
  private supabase;
  private openai: OpenAI;

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required for budget optimization');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Main budget optimization method - generates AI-powered recommendations
   */
  async optimizeBudget(params: {
    currentBudget: string;
    categories: BudgetCategory[];
    weddingDate: string;
    guestCount: number;
    venueLocation: string;
    marketPricing: MarketPricingData[];
    goals: UserPreferences;
  }): Promise<OptimizationResult> {
    try {
      const optimizationId = crypto.randomUUID();

      // Analyze wedding context
      const weddingContext = await this.analyzeWeddingContext(params);

      // Get market intelligence
      const marketIntelligence = await this.analyzeMarketPosition(
        params.categories,
        params.marketPricing,
      );

      // Generate AI recommendations using OpenAI
      const aiRecommendations = await this.generateAIRecommendations(
        params,
        weddingContext,
        marketIntelligence,
      );

      // Calculate optimized allocations
      const optimizedAllocations = await this.calculateOptimizedAllocations(
        params.categories,
        aiRecommendations,
      );

      // Calculate potential savings
      const potentialSavings = this.calculatePotentialSavings(
        params.categories,
        optimizedAllocations,
      );

      // Generate overall optimization score
      const optimizationScore = this.calculateOptimizationScore(
        aiRecommendations,
        potentialSavings,
        params.goals,
      );

      return {
        optimization_id: optimizationId,
        optimization_score: optimizationScore,
        potential_savings: potentialSavings,
        recommendations: aiRecommendations,
        optimized_allocations: optimizedAllocations,
        confidence_score: this.calculateOverallConfidence(aiRecommendations),
        market_position: marketIntelligence.market_position,
        regional_multiplier: marketIntelligence.regional_multiplier,
        seasonal_multiplier: marketIntelligence.seasonal_multiplier,
        model_version: 'gpt-4-turbo-2024-04-09',
        analysis_timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Budget optimization failed:', error);
      throw new Error('Failed to generate budget optimization');
    }
  }

  /**
   * Analyze cost-saving opportunities using AI and market data
   */
  async analyzeCostSavingOpportunities(
    expenses: BudgetCategory[],
    marketTrends: MarketPricingData[],
  ): Promise<CostSavingOpportunity[]> {
    try {
      const opportunities: CostSavingOpportunity[] = [];

      for (const expense of expenses) {
        const relevantTrends = marketTrends.filter((trend) =>
          trend.service_category
            .toLowerCase()
            .includes(expense.category_name.toLowerCase()),
        );

        if (relevantTrends.length === 0) continue;

        // Analyze each expense against market data
        const currentAmount = new Decimal(expense.current_allocation);
        const marketAverage = new Decimal(relevantTrends[0].average_price);
        const marketMin = new Decimal(relevantTrends[0].price_range_min);

        // Check if spending significantly above market average
        if (currentAmount.gt(marketAverage.mul(1.2))) {
          opportunities.push({
            id: crypto.randomUUID(),
            category: expense.category_name,
            opportunity_type: 'vendor_negotiation',
            potential_saving: currentAmount.sub(marketAverage).toString(),
            confidence_score: relevantTrends[0].confidence_score,
            description: `You're spending ${currentAmount.sub(marketAverage).div(marketAverage).mul(100).toFixed(1)}% above market average for ${expense.category_name}`,
            action_required:
              'Research alternative vendors or negotiate with current suppliers',
            risk_level: expense.priority > 7 ? 'high' : 'medium',
          });
        }

        // Check for seasonal optimization opportunities
        if (relevantTrends[0].seasonal_multiplier > 1.15) {
          const seasonalSaving = currentAmount.mul(
            new Decimal(relevantTrends[0].seasonal_multiplier - 1),
          );
          opportunities.push({
            id: crypto.randomUUID(),
            category: expense.category_name,
            opportunity_type: 'timing_change',
            potential_saving: seasonalSaving.toString(),
            confidence_score: 0.7,
            description: `Consider off-season booking for ${expense.category_name} to save ${seasonalSaving.div(currentAmount).mul(100).toFixed(1)}%`,
            action_required: 'Explore moving wedding date to off-peak season',
            deadline: 'Consider before final bookings',
            risk_level: 'medium',
          });
        }
      }

      // Sort by potential savings (highest first)
      return opportunities.sort((a, b) =>
        new Decimal(b.potential_saving)
          .sub(new Decimal(a.potential_saving))
          .toNumber(),
      );
    } catch (error) {
      console.error('Cost-saving analysis failed:', error);
      throw new Error('Failed to analyze cost-saving opportunities');
    }
  }

  /**
   * Generate recommendations using OpenAI GPT-4
   */
  private async generateAIRecommendations(
    params: any,
    weddingContext: WeddingContext,
    marketIntelligence: any,
  ): Promise<OptimizationRecommendation[]> {
    try {
      const prompt = this.buildOptimizationPrompt(
        params,
        weddingContext,
        marketIntelligence,
      );

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a wedding industry financial advisor with 20+ years experience helping couples optimize their wedding budgets. You understand UK wedding market pricing, vendor negotiations, and seasonal trends. Provide practical, actionable advice with specific monetary recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for consistent financial advice
        max_tokens: 2000,
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI optimization engine');
      }

      // Parse AI response into structured recommendations
      return this.parseAIRecommendations(aiResponse, params.categories);
    } catch (error) {
      console.error('AI recommendation generation failed:', error);
      // Fallback to rule-based recommendations
      return this.generateFallbackRecommendations(params.categories);
    }
  }

  /**
   * Build comprehensive prompt for AI optimization
   */
  private buildOptimizationPrompt(
    params: any,
    context: WeddingContext,
    market: any,
  ): string {
    const totalBudget = new Decimal(params.currentBudget);
    const categoriesText = params.categories
      .map((cat: BudgetCategory) => {
        const percentage = new Decimal(cat.current_allocation)
          .div(totalBudget)
          .mul(100);
        return `- ${cat.category_name}: £${cat.current_allocation} (${percentage.toFixed(1)}%, Priority: ${cat.priority}/10, Flexible: ${cat.is_flexible ? 'Yes' : 'No'})`;
      })
      .join('\n');

    return `
WEDDING BUDGET OPTIMIZATION REQUEST

WEDDING DETAILS:
- Date: ${params.weddingDate}
- Guest Count: ${params.guestCount}
- Location: ${params.venueLocation}
- Total Budget: £${params.currentBudget}
- Wedding Type: ${context.wedding_type}
- Season: ${context.season}
- Venue Type: ${context.venue_type}

CURRENT BUDGET ALLOCATION:
${categoriesText}

MARKET POSITION: ${market.market_position}
REGIONAL MULTIPLIER: ${market.regional_multiplier}
SEASONAL MULTIPLIER: ${market.seasonal_multiplier}

OPTIMIZATION GOALS:
- Primary Goal: ${params.goals.primary_goal}
- Risk Tolerance: ${params.goals.risk_tolerance}
- Savings Target: ${params.goals.savings_target_percentage || 'Not specified'}%

Please analyze this wedding budget and provide specific recommendations in this exact JSON format:

{
  "recommendations": [
    {
      "category_name": "string",
      "recommendation_type": "reduce_allocation|increase_allocation|reallocate|vendor_switch|timing_optimization",
      "current_allocation": "amount_in_pounds",
      "recommended_allocation": "new_amount_in_pounds",
      "potential_saving": "saving_amount_or_negative_if_increase",
      "confidence_score": 0.0_to_1.0,
      "reasoning": "detailed_explanation",
      "supporting_data": {
        "market_comparison": "string",
        "industry_insights": "string"
      },
      "implementation_difficulty": "easy|moderate|difficult",
      "estimated_impact": "low|medium|high"
    }
  ]
}

Focus on:
1. UK wedding industry standards
2. Seasonal pricing opportunities
3. Regional market variations
4. Vendor negotiation potential
5. Alternative service options
6. Risk vs reward for each recommendation

Provide 3-7 specific, actionable recommendations with precise monetary amounts.
`;
  }

  /**
   * Parse AI response into structured recommendations
   */
  private parseAIRecommendations(
    aiResponse: string,
    categories: BudgetCategory[],
  ): OptimizationRecommendation[] {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const recommendations: OptimizationRecommendation[] = [];

      if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        for (const rec of parsed.recommendations) {
          recommendations.push({
            id: crypto.randomUUID(),
            category_name: rec.category_name,
            recommendation_type: rec.recommendation_type,
            current_allocation: rec.current_allocation.toString(),
            recommended_allocation: rec.recommended_allocation.toString(),
            potential_saving: rec.potential_saving.toString(),
            confidence_score: Math.min(Math.max(rec.confidence_score, 0), 1),
            reasoning: rec.reasoning || 'AI-generated recommendation',
            supporting_data: rec.supporting_data || {},
            implementation_difficulty:
              rec.implementation_difficulty || 'moderate',
            estimated_impact: rec.estimated_impact || 'medium',
          });
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to parse AI recommendations:', error);
      return this.generateFallbackRecommendations(categories);
    }
  }

  /**
   * Fallback recommendations when AI fails
   */
  private generateFallbackRecommendations(
    categories: BudgetCategory[],
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Rule-based recommendations
    for (const category of categories) {
      const currentAmount = new Decimal(category.current_allocation);

      // If category is flexible and low priority, suggest reduction
      if (category.is_flexible && category.priority < 6) {
        const reduction = currentAmount.mul(0.15); // 15% reduction
        recommendations.push({
          id: crypto.randomUUID(),
          category_name: category.category_name,
          recommendation_type: 'reduce_allocation',
          current_allocation: category.current_allocation,
          recommended_allocation: currentAmount.sub(reduction).toString(),
          potential_saving: reduction.toString(),
          confidence_score: 0.6,
          reasoning: `${category.category_name} has lower priority and is flexible - consider reducing allocation by 15%`,
          supporting_data: { fallback_rule: 'low_priority_flexible' },
          implementation_difficulty: 'easy',
          estimated_impact: 'medium',
        });
      }
    }

    return recommendations;
  }

  /**
   * Analyze wedding context from parameters
   */
  private async analyzeWeddingContext(params: any): Promise<WeddingContext> {
    const guestCount = params.guestCount;
    const weddingDate = new Date(params.weddingDate);
    const month = weddingDate.getMonth();

    // Determine wedding type based on guest count and budget
    const budgetPerGuest = new Decimal(params.currentBudget).div(guestCount);
    let wedding_type: WeddingContext['wedding_type'];

    if (guestCount < 30) {
      wedding_type = 'intimate';
    } else if (budgetPerGuest.gt(200)) {
      wedding_type = 'luxury';
    } else if (budgetPerGuest.lt(80)) {
      wedding_type = 'budget';
    } else {
      wedding_type = 'traditional';
    }

    // Determine season
    const season =
      month >= 2 && month <= 4
        ? 'spring'
        : month >= 5 && month <= 7
          ? 'summer'
          : month >= 8 && month <= 10
            ? 'autumn'
            : 'winter';

    return {
      wedding_type,
      season,
      venue_type: 'traditional', // Default - would be enhanced with more data
      guest_demographics: 'mixed',
    };
  }

  /**
   * Analyze market position and regional factors
   */
  private async analyzeMarketPosition(
    categories: BudgetCategory[],
    marketData: MarketPricingData[],
  ): Promise<any> {
    let totalMarketAverage = 0;
    let totalCurrentSpend = 0;
    let regionalMultiplier = 1;
    let seasonalMultiplier = 1;

    for (const category of categories) {
      const relevantMarketData = marketData.find((md) =>
        md.service_category
          .toLowerCase()
          .includes(category.category_name.toLowerCase()),
      );

      if (relevantMarketData) {
        totalMarketAverage += relevantMarketData.average_price;
        regionalMultiplier = Math.max(
          regionalMultiplier,
          relevantMarketData.regional_multiplier,
        );
        seasonalMultiplier = Math.max(
          seasonalMultiplier,
          relevantMarketData.seasonal_multiplier,
        );
      }

      totalCurrentSpend += parseFloat(category.current_allocation);
    }

    const marketPosition =
      totalCurrentSpend < totalMarketAverage * 0.8
        ? 'budget'
        : totalCurrentSpend > totalMarketAverage * 1.3
          ? 'luxury'
          : 'moderate';

    return {
      market_position: marketPosition,
      regional_multiplier: regionalMultiplier,
      seasonal_multiplier: seasonalMultiplier,
    };
  }

  /**
   * Calculate optimized budget allocations
   */
  private async calculateOptimizedAllocations(
    categories: BudgetCategory[],
    recommendations: OptimizationRecommendation[],
  ): Promise<Record<string, string>> {
    const allocations: Record<string, string> = {};

    // Start with current allocations
    for (const category of categories) {
      allocations[category.category_name] = category.current_allocation;
    }

    // Apply recommendations
    for (const rec of recommendations) {
      if (rec.recommended_allocation) {
        allocations[rec.category_name] = rec.recommended_allocation;
      }
    }

    return allocations;
  }

  /**
   * Calculate potential savings
   */
  private calculatePotentialSavings(
    categories: BudgetCategory[],
    optimizedAllocations: Record<string, string>,
  ): any {
    let totalCurrent = new Decimal(0);
    let totalOptimized = new Decimal(0);

    for (const category of categories) {
      const current = new Decimal(category.current_allocation);
      const optimized = new Decimal(
        optimizedAllocations[category.category_name] ||
          category.current_allocation,
      );

      totalCurrent = totalCurrent.add(current);
      totalOptimized = totalOptimized.add(optimized);
    }

    const totalSavings = totalCurrent.sub(totalOptimized);
    const percentageSavings = totalSavings.div(totalCurrent).mul(100);

    return {
      total_amount: totalSavings.toString(),
      percentage: percentageSavings.toNumber(),
      currency: 'GBP', // Default for UK market
    };
  }

  /**
   * Calculate optimization score (0-100)
   */
  private calculateOptimizationScore(
    recommendations: OptimizationRecommendation[],
    savings: any,
    goals: UserPreferences,
  ): number {
    let score = 50; // Base score

    // Bonus for achieving savings
    if (savings.percentage > 0) {
      score += Math.min(savings.percentage * 2, 30); // Up to 30 points for savings
    }

    // Bonus for meeting savings target
    if (
      goals.savings_target_percentage &&
      savings.percentage >= goals.savings_target_percentage
    ) {
      score += 15;
    }

    // Bonus for high-confidence recommendations
    const avgConfidence =
      recommendations.reduce((sum, rec) => sum + rec.confidence_score, 0) /
      recommendations.length;
    score += avgConfidence * 20; // Up to 20 points for confidence

    // Penalty for high-risk recommendations if risk tolerance is conservative
    if (goals.risk_tolerance === 'conservative') {
      const highRiskCount = recommendations.filter(
        (rec) => rec.implementation_difficulty === 'difficult',
      ).length;
      score -= highRiskCount * 5;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate overall confidence from recommendations
   */
  private calculateOverallConfidence(
    recommendations: OptimizationRecommendation[],
  ): number {
    if (recommendations.length === 0) return 0;
    return (
      recommendations.reduce((sum, rec) => sum + rec.confidence_score, 0) /
      recommendations.length
    );
  }

  /**
   * Save optimization results to database
   */
  async saveOptimizationResults(
    organizationId: string,
    clientId: string,
    results: OptimizationResult,
  ): Promise<void> {
    try {
      // Save main optimization record
      const { error: optimizationError } = await this.supabase
        .from('budget_optimizations')
        .insert([
          {
            id: results.optimization_id,
            organization_id: organizationId,
            client_id: clientId,
            optimization_score: results.optimization_score,
            potential_savings: results.potential_savings.total_amount,
            savings_percentage: results.potential_savings.percentage,
            confidence_score: results.confidence_score,
            market_position: results.market_position,
            regional_multiplier: results.regional_multiplier,
            seasonal_multiplier: results.seasonal_multiplier,
            ai_model_version: results.model_version,
            optimization_status: 'completed',
            last_analyzed_at: results.analysis_timestamp,
          },
        ]);

      if (optimizationError) throw optimizationError;

      // Save recommendations
      if (results.recommendations.length > 0) {
        const recommendationRecords = results.recommendations.map((rec) => ({
          optimization_id: results.optimization_id,
          category_name: rec.category_name,
          recommendation_type: rec.recommendation_type,
          current_allocation: rec.current_allocation,
          recommended_allocation: rec.recommended_allocation,
          potential_saving: rec.potential_saving,
          confidence_score: rec.confidence_score,
          reasoning: rec.reasoning,
          supporting_data: rec.supporting_data,
          implementation_difficulty: rec.implementation_difficulty,
          estimated_impact: rec.estimated_impact,
          status: 'pending',
        }));

        const { error: recommendationError } = await this.supabase
          .from('budget_recommendations')
          .insert(recommendationRecords);

        if (recommendationError) {
          console.error('Failed to save recommendations:', recommendationError);
          // Don't throw - main optimization was saved
        }
      }
    } catch (error) {
      console.error('Failed to save optimization results:', error);
      throw new Error('Failed to save optimization results to database');
    }
  }
}

export const aiBudgetOptimizer = new AIBudgetOptimizer();
