import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.config({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -15,
  toExpPos: 20,
  maxE: 9e15,
  minE: -9e15,
  modulo: Decimal.ROUND_FLOOR,
});

// Types for budget calculations
export interface BudgetParameters {
  total_budget: string;
  guest_count: number;
  wedding_date: string;
  venue_location: string;
  wedding_type:
    | 'intimate'
    | 'traditional'
    | 'destination'
    | 'luxury'
    | 'budget';
  currency: 'GBP' | 'USD' | 'EUR' | 'AUD' | 'CAD';
  client_preferences?: {
    photography_importance: number;
    venue_importance: number;
    catering_importance: number;
    music_importance: number;
    flowers_importance: number;
  };
}

export interface BudgetAllocationResult {
  category_name: string;
  recommended_amount: string;
  percentage_of_total: string;
  priority_score: number;
  is_essential: boolean;
  typical_range_min: string;
  typical_range_max: string;
  regional_adjustment: string;
  seasonal_adjustment: string;
}

export interface SavingsAnalysis {
  total_current_spend: string;
  total_optimized_spend: string;
  total_savings: string;
  savings_percentage: string;
  category_savings: Array<{
    category_name: string;
    current_amount: string;
    optimized_amount: string;
    savings: string;
    savings_percentage: string;
  }>;
  risk_assessment: 'low' | 'medium' | 'high';
  implementation_difficulty: 'easy' | 'moderate' | 'difficult';
}

export interface PositionAnalysis {
  market_position: 'budget' | 'moderate' | 'luxury';
  percentile_ranking: number;
  comparison_metrics: {
    total_budget_vs_average: string;
    per_guest_vs_average: string;
    venue_allocation_vs_average: string;
    photography_allocation_vs_average: string;
  };
  recommendations: string[];
  regional_context: string;
  seasonal_context: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  precision_check: boolean;
  calculation_integrity: boolean;
  total_variance: string;
}

export interface MarketDataRequest {
  location: string;
  service_categories: string[];
  currency: string;
  wedding_type?: string;
  guest_count_range?: string;
}

export interface BudgetTemplate {
  template_id: string;
  template_name: string;
  wedding_type: string;
  guest_count_range: string;
  location_type: string;
  allocations: Record<
    string,
    {
      percentage: string;
      min_percentage: string;
      max_percentage: string;
      is_essential: boolean;
      priority: number;
    }
  >;
  total_budget_range: {
    min: string;
    max: string;
    average: string;
  };
  currency: string;
  last_updated: string;
}

class BudgetCalculationService {
  private supabase;
  private currency: string;

  constructor(currency: string = 'GBP') {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.currency = currency;
  }

  /**
   * Calculate optimal budget allocation based on parameters
   */
  async calculateBudgetAllocation(
    params: BudgetParameters,
  ): Promise<BudgetAllocationResult[]> {
    try {
      const totalBudget = new Decimal(params.total_budget);

      // Get market-based allocation template
      const template = await this.getBudgetTemplate(params);

      // Get regional and seasonal adjustments
      const adjustments = await this.getRegionalSeasonalAdjustments(params);

      const allocations: BudgetAllocationResult[] = [];

      for (const [categoryName, allocation] of Object.entries(
        template.allocations,
      )) {
        // Base percentage from template
        let basePercentage = new Decimal(allocation.percentage);

        // Apply user preferences if provided
        if (params.client_preferences) {
          basePercentage = this.applyUserPreferences(
            categoryName,
            basePercentage,
            params.client_preferences,
          );
        }

        // Apply regional adjustments
        const regionalMultiplier = new Decimal(
          adjustments.regional[categoryName] || 1,
        );
        const seasonalMultiplier = new Decimal(
          adjustments.seasonal[categoryName] || 1,
        );

        const adjustedPercentage = basePercentage
          .mul(regionalMultiplier)
          .mul(seasonalMultiplier);
        const recommendedAmount = totalBudget.mul(adjustedPercentage.div(100));

        // Calculate typical range
        const minAmount = totalBudget.mul(
          new Decimal(allocation.min_percentage).div(100),
        );
        const maxAmount = totalBudget.mul(
          new Decimal(allocation.max_percentage).div(100),
        );

        allocations.push({
          category_name: categoryName,
          recommended_amount: recommendedAmount.toFixed(2),
          percentage_of_total: adjustedPercentage.toFixed(2),
          priority_score: allocation.priority,
          is_essential: allocation.is_essential,
          typical_range_min: minAmount.toFixed(2),
          typical_range_max: maxAmount.toFixed(2),
          regional_adjustment:
            regionalMultiplier.sub(1).mul(100).toFixed(1) + '%',
          seasonal_adjustment:
            seasonalMultiplier.sub(1).mul(100).toFixed(1) + '%',
        });
      }

      // Ensure allocations sum to total budget
      const normalizedAllocations = this.normalizeAllocations(
        allocations,
        totalBudget,
      );

      return normalizedAllocations.sort(
        (a, b) => b.priority_score - a.priority_score,
      );
    } catch (error) {
      console.error('Budget allocation calculation failed:', error);
      throw new Error('Failed to calculate budget allocation');
    }
  }

  /**
   * Calculate cost savings between current and optimized budgets
   */
  calculateCostSavings(
    currentBudget: any[],
    optimizedBudget: any[],
  ): SavingsAnalysis {
    try {
      let totalCurrentSpend = new Decimal(0);
      let totalOptimizedSpend = new Decimal(0);
      const categorySavings: SavingsAnalysis['category_savings'] = [];

      // Create lookup map for optimized budget
      const optimizedMap = new Map(
        optimizedBudget.map((item) => [
          item.category_name,
          new Decimal(item.amount),
        ]),
      );

      for (const currentItem of currentBudget) {
        const currentAmount = new Decimal(
          currentItem.current_allocation || currentItem.amount,
        );
        const optimizedAmount =
          optimizedMap.get(currentItem.category_name) || currentAmount;

        totalCurrentSpend = totalCurrentSpend.add(currentAmount);
        totalOptimizedSpend = totalOptimizedSpend.add(optimizedAmount);

        const savings = currentAmount.sub(optimizedAmount);
        const savingsPercentage = currentAmount.isZero()
          ? new Decimal(0)
          : savings.div(currentAmount).mul(100);

        if (!savings.isZero()) {
          categorySavings.push({
            category_name: currentItem.category_name,
            current_amount: currentAmount.toFixed(2),
            optimized_amount: optimizedAmount.toFixed(2),
            savings: savings.toFixed(2),
            savings_percentage: savingsPercentage.toFixed(2),
          });
        }
      }

      const totalSavings = totalCurrentSpend.sub(totalOptimizedSpend);
      const savingsPercentage = totalCurrentSpend.isZero()
        ? new Decimal(0)
        : totalSavings.div(totalCurrentSpend).mul(100);

      // Assess risk based on savings percentage and category changes
      const riskAssessment = this.assessSavingsRisk(
        categorySavings,
        savingsPercentage,
      );
      const implementationDifficulty =
        this.assessImplementationDifficulty(categorySavings);

      return {
        total_current_spend: totalCurrentSpend.toFixed(2),
        total_optimized_spend: totalOptimizedSpend.toFixed(2),
        total_savings: totalSavings.toFixed(2),
        savings_percentage: savingsPercentage.toFixed(2),
        category_savings: categorySavings,
        risk_assessment: riskAssessment,
        implementation_difficulty: implementationDifficulty,
      };
    } catch (error) {
      console.error('Cost savings calculation failed:', error);
      throw new Error('Failed to calculate cost savings');
    }
  }

  /**
   * Calculate market position analysis
   */
  async calculateMarketPosition(
    budget: any[],
    marketData: any[],
  ): Promise<PositionAnalysis> {
    try {
      const totalBudget = budget.reduce(
        (sum, item) =>
          sum.add(new Decimal(item.current_allocation || item.amount)),
        new Decimal(0),
      );

      const guestCount = budget[0]?.guest_count || 100; // Default fallback
      const perGuestSpend = totalBudget.div(guestCount);

      // Calculate market averages
      const marketAverages = this.calculateMarketAverages(marketData);

      // Determine market position
      const totalBudgetRatio = totalBudget.div(marketAverages.total_average);
      const marketPosition = totalBudgetRatio.lt(0.75)
        ? 'budget'
        : totalBudgetRatio.gt(1.5)
          ? 'luxury'
          : 'moderate';

      // Calculate percentile ranking (0-100)
      const percentileRanking = Math.min(
        100,
        Math.max(0, totalBudgetRatio.mul(50).toNumber()),
      );

      // Comparison metrics
      const comparisonMetrics = {
        total_budget_vs_average:
          totalBudgetRatio.sub(1).mul(100).toFixed(1) + '%',
        per_guest_vs_average:
          perGuestSpend
            .div(marketAverages.per_guest_average)
            .sub(1)
            .mul(100)
            .toFixed(1) + '%',
        venue_allocation_vs_average: this.calculateCategoryComparison(
          'VENUE',
          budget,
          marketData,
        ),
        photography_allocation_vs_average: this.calculateCategoryComparison(
          'PHOTOGRAPHY',
          budget,
          marketData,
        ),
      };

      // Generate recommendations based on position
      const recommendations = this.generateMarketRecommendations(
        marketPosition,
        comparisonMetrics,
      );

      return {
        market_position: marketPosition,
        percentile_ranking: Math.round(percentileRanking),
        comparison_metrics: comparisonMetrics,
        recommendations,
        regional_context: await this.getRegionalContext(
          budget[0]?.location || 'UK',
        ),
        seasonal_context: this.getSeasonalContext(
          budget[0]?.wedding_date || new Date().toISOString(),
        ),
      };
    } catch (error) {
      console.error('Market position calculation failed:', error);
      throw new Error('Failed to calculate market position');
    }
  }

  /**
   * Validate financial calculation accuracy and integrity
   */
  validateFinancialAccuracy(calculation: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      let totalCalculated = new Decimal(0);
      let precisionCheck = true;

      // Validate each calculation item
      if (calculation.allocations && Array.isArray(calculation.allocations)) {
        for (const item of calculation.allocations) {
          // Check for valid decimal amounts
          try {
            const amount = new Decimal(
              item.recommended_amount || item.amount || 0,
            );
            totalCalculated = totalCalculated.add(amount);

            // Check precision (should not exceed 2 decimal places for currency)
            const decimalPlaces = (amount.toString().split('.')[1] || '')
              .length;
            if (decimalPlaces > 2) {
              precisionCheck = false;
              warnings.push(
                `${item.category_name} has ${decimalPlaces} decimal places - should be 2 for currency`,
              );
            }

            // Check for negative amounts
            if (amount.isNegative()) {
              errors.push(
                `${item.category_name} has negative amount: ${amount.toString()}`,
              );
            }
          } catch (e) {
            errors.push(
              `Invalid amount for ${item.category_name}: ${item.recommended_amount || item.amount}`,
            );
            precisionCheck = false;
          }
        }
      }

      // Check total variance against expected budget
      const expectedTotal = new Decimal(
        calculation.total_budget || calculation.expected_total || 0,
      );
      const variance = totalCalculated.sub(expectedTotal).abs();
      const variancePercentage = expectedTotal.isZero()
        ? new Decimal(0)
        : variance.div(expectedTotal).mul(100);

      // Allow up to 0.01% variance due to rounding
      const calculationIntegrity = variancePercentage.lt(0.01);

      if (!calculationIntegrity) {
        errors.push(
          `Total calculation variance of ${variancePercentage.toFixed(4)}% exceeds acceptable threshold`,
        );
      }

      // Check for missing essential categories
      const essentialCategories = ['VENUE', 'CATERING', 'PHOTOGRAPHY'];
      const presentCategories =
        calculation.allocations?.map((a: any) =>
          a.category_name.toUpperCase(),
        ) || [];

      for (const essential of essentialCategories) {
        if (!presentCategories.includes(essential)) {
          warnings.push(
            `Essential category ${essential} is missing from calculations`,
          );
        }
      }

      return {
        is_valid: errors.length === 0,
        errors,
        warnings,
        precision_check: precisionCheck,
        calculation_integrity: calculationIntegrity,
        total_variance: variance.toFixed(2),
      };
    } catch (error) {
      return {
        is_valid: false,
        errors: ['Validation failed: ' + error],
        warnings,
        precision_check: false,
        calculation_integrity: false,
        total_variance: '0.00',
      };
    }
  }

  /**
   * Get market pricing data for optimization context
   */
  async getMarketPricingData(
    location: string,
    categories: string[],
    currency: string,
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('market_pricing_data')
        .select('*')
        .in('service_category', categories)
        .eq('location', location)
        .eq('currency', currency)
        .eq('is_active', true)
        .order('confidence_score', { ascending: false });

      if (error) {
        console.error('Market pricing data fetch error:', error);
        return this.getFallbackMarketPricing(categories, currency);
      }

      return data || this.getFallbackMarketPricing(categories, currency);
    } catch (error) {
      console.error('Market pricing data error:', error);
      return this.getFallbackMarketPricing(categories, currency);
    }
  }

  /**
   * Calculate potential savings from current to optimized budget
   */
  calculatePotentialSavings(
    currentCategories: any[],
    optimizedAllocations: Record<string, string>,
  ): any {
    try {
      let totalCurrentSpend = new Decimal(0);
      let totalOptimizedSpend = new Decimal(0);
      const categorySavings: any[] = [];

      for (const category of currentCategories) {
        const currentAmount = new Decimal(category.current_allocation);
        const optimizedAmount = new Decimal(
          optimizedAllocations[category.category_name] ||
            category.current_allocation,
        );

        totalCurrentSpend = totalCurrentSpend.add(currentAmount);
        totalOptimizedSpend = totalOptimizedSpend.add(optimizedAmount);

        const savings = currentAmount.sub(optimizedAmount);
        const savingsPercentage = currentAmount.isZero()
          ? new Decimal(0)
          : savings.div(currentAmount).mul(100);

        categorySavings.push({
          category_name: category.category_name,
          current_amount: currentAmount.toFixed(2),
          optimized_amount: optimizedAmount.toFixed(2),
          savings: savings.toFixed(2),
          savings_percentage: savingsPercentage.toFixed(2),
        });
      }

      const totalSavings = totalCurrentSpend.sub(totalOptimizedSpend);
      const percentageSavings = totalCurrentSpend.isZero()
        ? new Decimal(0)
        : totalSavings.div(totalCurrentSpend).mul(100);

      return {
        totalSavings: totalSavings.toFixed(2),
        percentageSavings: percentageSavings.toFixed(2),
        categorySavings,
        currency: this.currency,
      };
    } catch (error) {
      console.error('Potential savings calculation failed:', error);
      throw new Error('Failed to calculate potential savings');
    }
  }

  // Private helper methods

  /**
   * Get budget template based on parameters
   */
  private async getBudgetTemplate(
    params: BudgetParameters,
  ): Promise<BudgetTemplate> {
    try {
      const { data, error } = await this.supabase
        .from('budget_templates')
        .select('*')
        .eq('wedding_type', params.wedding_type)
        .eq('currency', params.currency)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return this.getDefaultBudgetTemplate(params);
      }

      return data;
    } catch (error) {
      console.error('Budget template fetch failed:', error);
      return this.getDefaultBudgetTemplate(params);
    }
  }

  /**
   * Default budget template when database query fails
   */
  private getDefaultBudgetTemplate(params: BudgetParameters): BudgetTemplate {
    const defaultAllocations = {
      VENUE: {
        percentage: '45',
        min_percentage: '35',
        max_percentage: '55',
        is_essential: true,
        priority: 10,
      },
      CATERING: {
        percentage: '25',
        min_percentage: '20',
        max_percentage: '35',
        is_essential: true,
        priority: 9,
      },
      PHOTOGRAPHY: {
        percentage: '10',
        min_percentage: '8',
        max_percentage: '15',
        is_essential: true,
        priority: 8,
      },
      VIDEOGRAPHY: {
        percentage: '5',
        min_percentage: '3',
        max_percentage: '8',
        is_essential: false,
        priority: 6,
      },
      MUSIC: {
        percentage: '4',
        min_percentage: '2',
        max_percentage: '6',
        is_essential: false,
        priority: 5,
      },
      FLOWERS: {
        percentage: '5',
        min_percentage: '3',
        max_percentage: '8',
        is_essential: false,
        priority: 4,
      },
      ATTIRE: {
        percentage: '3',
        min_percentage: '2',
        max_percentage: '5',
        is_essential: true,
        priority: 7,
      },
      TRANSPORTATION: {
        percentage: '2',
        min_percentage: '1',
        max_percentage: '4',
        is_essential: false,
        priority: 3,
      },
      ACCESSORIES: {
        percentage: '1',
        min_percentage: '0.5',
        max_percentage: '2',
        is_essential: false,
        priority: 2,
      },
    };

    return {
      template_id: 'default-uk-traditional',
      template_name: 'UK Traditional Wedding',
      wedding_type: params.wedding_type,
      guest_count_range: '50-150',
      location_type: 'UK',
      allocations: defaultAllocations,
      total_budget_range: {
        min: '15000',
        max: '35000',
        average: '25000',
      },
      currency: params.currency,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Get regional and seasonal pricing adjustments
   */
  private async getRegionalSeasonalAdjustments(
    params: BudgetParameters,
  ): Promise<any> {
    // This would typically fetch from market_pricing_data table
    // For now, return default adjustments

    const weddingDate = new Date(params.wedding_date);
    const month = weddingDate.getMonth();

    // Peak season (May-September) typically costs 15-25% more
    const isPeakSeason = month >= 4 && month <= 8;
    const seasonalMultiplier = isPeakSeason ? 1.2 : 0.9;

    // London typically costs 30% more than UK average
    const isLondon = params.venue_location.toLowerCase().includes('london');
    const regionalMultiplier = isLondon ? 1.3 : 1.0;

    return {
      regional: {
        VENUE: regionalMultiplier,
        CATERING: regionalMultiplier,
        PHOTOGRAPHY: regionalMultiplier * 0.9, // Less location dependent
        VIDEOGRAPHY: regionalMultiplier * 0.9,
        MUSIC: regionalMultiplier,
        FLOWERS: regionalMultiplier,
        ATTIRE: 1.0, // Not location dependent
        TRANSPORTATION: regionalMultiplier * 1.2, // More expensive in cities
        ACCESSORIES: 1.0,
      },
      seasonal: {
        VENUE: seasonalMultiplier,
        CATERING: seasonalMultiplier * 0.8, // Less seasonal variation
        PHOTOGRAPHY: seasonalMultiplier,
        VIDEOGRAPHY: seasonalMultiplier,
        MUSIC: seasonalMultiplier,
        FLOWERS: seasonalMultiplier * 1.3, // Highly seasonal
        ATTIRE: 1.0, // Not seasonal
        TRANSPORTATION: seasonalMultiplier * 0.9,
        ACCESSORIES: 1.0,
      },
    };
  }

  /**
   * Apply user preferences to base percentage
   */
  private applyUserPreferences(
    categoryName: string,
    basePercentage: Decimal,
    preferences: any,
  ): Decimal {
    const importanceMapping: Record<string, keyof typeof preferences> = {
      PHOTOGRAPHY: 'photography_importance',
      VENUE: 'venue_importance',
      CATERING: 'catering_importance',
      MUSIC: 'music_importance',
      FLOWERS: 'flowers_importance',
    };

    const importanceKey = importanceMapping[categoryName];
    if (!importanceKey || !preferences[importanceKey]) {
      return basePercentage;
    }

    // Scale importance (1-10) to multiplier (0.7-1.3)
    const importance = preferences[importanceKey];
    const multiplier = 0.7 + ((importance - 1) * 0.6) / 9;

    return basePercentage.mul(multiplier);
  }

  /**
   * Normalize allocations to sum to total budget
   */
  private normalizeAllocations(
    allocations: BudgetAllocationResult[],
    totalBudget: Decimal,
  ): BudgetAllocationResult[] {
    const currentTotal = allocations.reduce(
      (sum, alloc) => sum.add(new Decimal(alloc.recommended_amount)),
      new Decimal(0),
    );

    if (currentTotal.isZero()) return allocations;

    const adjustmentRatio = totalBudget.div(currentTotal);

    return allocations.map((alloc) => ({
      ...alloc,
      recommended_amount: new Decimal(alloc.recommended_amount)
        .mul(adjustmentRatio)
        .toFixed(2),
      percentage_of_total: new Decimal(alloc.percentage_of_total)
        .mul(adjustmentRatio)
        .toFixed(2),
    }));
  }

  /**
   * Assess risk level of savings plan
   */
  private assessSavingsRisk(
    categorySavings: any[],
    totalSavingsPercentage: Decimal,
  ): 'low' | 'medium' | 'high' {
    // High savings percentage indicates higher risk
    if (totalSavingsPercentage.gt(25)) return 'high';
    if (totalSavingsPercentage.gt(15)) return 'medium';

    // Check for cuts in essential categories
    const essentialCategories = ['VENUE', 'CATERING', 'PHOTOGRAPHY'];
    const essentialCuts = categorySavings.filter(
      (saving) =>
        essentialCategories.includes(saving.category_name.toUpperCase()) &&
        new Decimal(saving.savings).gt(0),
    );

    if (essentialCuts.length > 1) return 'high';
    if (essentialCuts.length === 1) return 'medium';

    return 'low';
  }

  /**
   * Assess implementation difficulty
   */
  private assessImplementationDifficulty(
    categorySavings: any[],
  ): 'easy' | 'moderate' | 'difficult' {
    const significantChanges = categorySavings.filter(
      (saving) => Math.abs(parseFloat(saving.savings_percentage)) > 20,
    ).length;

    if (significantChanges > 3) return 'difficult';
    if (significantChanges > 1) return 'moderate';
    return 'easy';
  }

  /**
   * Calculate market averages from market data
   */
  private calculateMarketAverages(marketData: any[]): any {
    const totalAverage = marketData.reduce(
      (sum, item) => sum + (item.average_price || 0),
      0,
    );
    const averageGuestCount = 100; // Default assumption

    return {
      total_average: totalAverage,
      per_guest_average: totalAverage / averageGuestCount,
    };
  }

  /**
   * Calculate category comparison against market
   */
  private calculateCategoryComparison(
    categoryName: string,
    budget: any[],
    marketData: any[],
  ): string {
    const budgetItem = budget.find(
      (item) => item.category_name?.toUpperCase() === categoryName,
    );

    const marketItem = marketData.find(
      (item) => item.service_category?.toUpperCase() === categoryName,
    );

    if (!budgetItem || !marketItem) return '0%';

    const budgetAmount = new Decimal(
      budgetItem.current_allocation || budgetItem.amount,
    );
    const marketAverage = new Decimal(marketItem.average_price);

    if (marketAverage.isZero()) return '0%';

    return budgetAmount.div(marketAverage).sub(1).mul(100).toFixed(1) + '%';
  }

  /**
   * Generate market-based recommendations
   */
  private generateMarketRecommendations(
    position: string,
    metrics: any,
  ): string[] {
    const recommendations: string[] = [];

    switch (position) {
      case 'budget':
        recommendations.push(
          'Consider allocating more to photography and videography for lasting memories',
        );
        recommendations.push(
          'Look for venues that include catering to maximize value',
        );
        break;
      case 'luxury':
        recommendations.push(
          'Ensure spending aligns with your priorities - consider reallocating excess budget',
        );
        recommendations.push(
          'Focus on unique experiences that justify the premium spending',
        );
        break;
      default:
        recommendations.push(
          'Your budget is well-balanced for a traditional UK wedding',
        );
        recommendations.push('Consider seasonal booking for potential savings');
    }

    return recommendations;
  }

  /**
   * Get regional context information
   */
  private async getRegionalContext(location: string): Promise<string> {
    // This would typically query regional market data
    if (location.toLowerCase().includes('london')) {
      return 'London weddings typically cost 25-30% more than UK average';
    }
    return 'Regional pricing is within UK average range';
  }

  /**
   * Get seasonal context information
   */
  private getSeasonalContext(weddingDate: string): string {
    const date = new Date(weddingDate);
    const month = date.getMonth();

    if (month >= 4 && month <= 8) {
      return 'Peak wedding season - expect 15-25% higher prices';
    }
    return 'Off-peak season - potential for 10-20% savings';
  }

  /**
   * Fallback market pricing when database unavailable
   */
  private getFallbackMarketPricing(
    categories: string[],
    currency: string,
  ): any[] {
    const fallbackPricing = {
      VENUE: { average_price: 8000, confidence_score: 0.7 },
      CATERING: { average_price: 5000, confidence_score: 0.8 },
      PHOTOGRAPHY: { average_price: 2000, confidence_score: 0.9 },
      VIDEOGRAPHY: { average_price: 1500, confidence_score: 0.8 },
      MUSIC: { average_price: 800, confidence_score: 0.7 },
      FLOWERS: { average_price: 1200, confidence_score: 0.6 },
      ATTIRE: { average_price: 800, confidence_score: 0.8 },
      TRANSPORTATION: { average_price: 400, confidence_score: 0.7 },
      ACCESSORIES: { average_price: 300, confidence_score: 0.5 },
    };

    return categories.map((category) => ({
      service_category: category,
      location: 'UK',
      currency,
      average_price:
        fallbackPricing[category as keyof typeof fallbackPricing]
          ?.average_price || 1000,
      price_range_min:
        fallbackPricing[category as keyof typeof fallbackPricing]
          ?.average_price * 0.7 || 700,
      price_range_max:
        fallbackPricing[category as keyof typeof fallbackPricing]
          ?.average_price * 1.5 || 1500,
      confidence_score:
        fallbackPricing[category as keyof typeof fallbackPricing]
          ?.confidence_score || 0.6,
      regional_multiplier: 1.0,
      seasonal_multiplier: 1.0,
      last_updated: new Date().toISOString(),
    }));
  }
}

export const budgetCalculationService = new BudgetCalculationService();
