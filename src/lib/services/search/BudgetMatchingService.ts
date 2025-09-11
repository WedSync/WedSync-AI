/**
 * BudgetMatchingService - Intelligent budget optimization for wedding planning
 *
 * Handles comprehensive budget analysis, vendor cost matching, and financial
 * optimization for wedding planning. Includes dynamic pricing, package optimization,
 * and intelligent cost allocation recommendations.
 *
 * Key Features:
 * - Dynamic budget allocation based on wedding priorities
 * - Vendor cost matching with package optimization
 * - Real-time pricing analysis and market comparisons
 * - Budget stretch strategies and cost-saving recommendations
 * - Financial risk assessment and contingency planning
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Budget Types
interface BudgetRequest {
  totalBudget: number;
  priorities: WeddingPriority[];
  essentialCategories: string[];
  flexibleCategories: string[];
  weddingSize: number;
  location: {
    lat: number;
    lng: number;
    region: string;
  };
  weddingDate: string;
  style: 'budget' | 'moderate' | 'luxury' | 'ultra_luxury';
}

interface WeddingPriority {
  category: string;
  importance: number; // 1-10 scale
  allocatedPercentage?: number;
  mustHaves: string[];
  niceToHaves: string[];
}

interface BudgetMatchResult {
  vendorId: string;
  matchScore: number;
  priceAnalysis: PriceAnalysis;
  packageRecommendations: PackageRecommendation[];
  budgetImpact: BudgetImpact;
  costOptimizations: CostOptimization[];
  financialRisk: FinancialRisk;
  marketComparison: MarketComparison;
}

interface PriceAnalysis {
  basePrice: number;
  estimatedTotal: number;
  priceRange: {
    min: number;
    max: number;
    typical: number;
  };
  priceFactors: PriceFactor[];
  transparencyScore: number; // How clear is the pricing
}

interface PackageRecommendation {
  packageName: string;
  price: number;
  valueScore: number;
  includes: string[];
  addOns: AddOn[];
  savingsOpportunity: number;
  fitScore: number; // How well it fits the wedding needs
}

interface BudgetImpact {
  categoryAllocation: string;
  percentageOfBudget: number;
  remainingBudget: number;
  budgetHealthScore: number; // 1-10 scale
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface CostOptimization {
  strategy: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'minor' | 'moderate' | 'significant' | 'major';
  description: string;
  tradeoffs: string[];
}

interface FinancialRisk {
  overBudgetProbability: number;
  hiddenCostLikelihood: number;
  priceVolatility: number;
  contractRisk: number;
  mitigationStrategies: string[];
}

interface MarketComparison {
  percentileRanking: number; // What percentile is this price
  competitorCount: number;
  averageMarketPrice: number;
  priceAdvantage: number; // Positive if below market, negative if above
  marketTrends: MarketTrend[];
}

interface MarketTrend {
  trend: 'increasing' | 'decreasing' | 'stable';
  magnitude: number;
  timeframe: string;
  reasoning: string;
}

interface PriceFactor {
  factor: string;
  impact: number;
  type: 'fixed' | 'variable' | 'conditional';
  description: string;
}

interface AddOn {
  name: string;
  price: number;
  value: number;
  necessity: 'essential' | 'recommended' | 'optional' | 'luxury';
}

interface BudgetAllocation {
  category: string;
  recommendedPercentage: number;
  actualAllocation: number;
  flexibility: number; // How much can this be adjusted
  marketBenchmark: number;
}

export class BudgetMatchingService {
  private supabase;

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Main budget matching method
   * Finds vendors that best match the specified budget constraints
   */
  async matchVendorsTobudget(
    request: BudgetRequest,
  ): Promise<BudgetMatchResult[]> {
    console.log('💰 Starting budget matching analysis:', {
      totalBudget: request.totalBudget,
      weddingSize: request.weddingSize,
      style: request.style,
    });

    try {
      // Get budget allocation recommendations
      const budgetAllocations = this.calculateBudgetAllocations(request);

      // Find vendors in each category
      const vendorsByCategory = await this.findVendorsByCategory(
        request,
        budgetAllocations,
      );

      // Analyze each vendor for budget fit
      const matchPromises = vendorsByCategory.flatMap((vendors) =>
        vendors.map((vendor) =>
          this.analyzeBudgetMatch(vendor, request, budgetAllocations),
        ),
      );

      const matches = await Promise.all(matchPromises);

      // Apply intelligent ranking and optimization
      const optimizedMatches = this.optimizeMatches(matches, request);

      console.log(`✅ Analyzed ${matches.length} vendors for budget matching`);
      return optimizedMatches;
    } catch (error) {
      console.error('❌ Budget matching failed:', error);
      throw new Error(
        `Budget matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Calculate recommended budget allocations by category
   */
  private calculateBudgetAllocations(
    request: BudgetRequest,
  ): BudgetAllocation[] {
    // Standard wedding budget percentages (adjust based on priorities)
    const baseBudgetBreakdown = {
      venue: { percentage: 45, flexibility: 0.1 },
      catering: { percentage: 30, flexibility: 0.15 },
      photography: { percentage: 10, flexibility: 0.05 },
      music: { percentage: 8, flexibility: 0.05 },
      flowers: { percentage: 6, flexibility: 0.1 },
      attire: { percentage: 5, flexibility: 0.05 },
      transportation: { percentage: 3, flexibility: 0.02 },
      rings: { percentage: 3, flexibility: 0.02 },
      misc: { percentage: 5, flexibility: 0.05 },
    };

    // Adjust based on wedding style
    const styleAdjustments = {
      budget: { venue: -0.05, catering: -0.05, photography: 0, flowers: -0.02 },
      moderate: { venue: 0, catering: 0, photography: 0.02, flowers: 0 },
      luxury: { venue: 0.05, catering: 0.05, photography: 0.03, flowers: 0.02 },
      ultra_luxury: {
        venue: 0.1,
        catering: 0.1,
        photography: 0.05,
        flowers: 0.05,
      },
    };

    // Apply style adjustments
    const styleAdj = styleAdjustments[request.style];
    const adjustedBreakdown = { ...baseBudgetBreakdown };

    Object.keys(styleAdj).forEach((category) => {
      if (adjustedBreakdown[category as keyof typeof adjustedBreakdown]) {
        adjustedBreakdown[
          category as keyof typeof adjustedBreakdown
        ].percentage += styleAdj[category as keyof typeof styleAdj];
      }
    });

    // Apply user priorities
    request.priorities.forEach((priority) => {
      const category = priority.category.toLowerCase();
      if (adjustedBreakdown[category as keyof typeof adjustedBreakdown]) {
        // Increase allocation for high-priority categories
        const priorityBoost = (priority.importance - 5) * 0.02; // -0.08 to +0.1
        adjustedBreakdown[
          category as keyof typeof adjustedBreakdown
        ].percentage += priorityBoost;
      }
    });

    // Normalize percentages to ensure they sum to 100%
    const totalPercentage = Object.values(adjustedBreakdown).reduce(
      (sum, item) => sum + item.percentage,
      0,
    );

    const normalizationFactor = 1 / totalPercentage;

    // Convert to BudgetAllocation objects
    return Object.entries(adjustedBreakdown).map(([category, data]) => ({
      category,
      recommendedPercentage: data.percentage * normalizationFactor,
      actualAllocation:
        data.percentage * normalizationFactor * request.totalBudget,
      flexibility: data.flexibility,
      marketBenchmark: data.percentage, // Store original as benchmark
    }));
  }

  /**
   * Find vendors in each budget category
   */
  private async findVendorsByCategory(
    request: BudgetRequest,
    allocations: BudgetAllocation[],
  ) {
    const vendorPromises = allocations.map(async (allocation) => {
      const { data: vendors, error } = await this.supabase
        .from('vendors')
        .select(
          `
          id,
          business_name,
          vendor_type,
          base_price,
          pricing_model,
          package_tiers,
          location,
          rating,
          review_count,
          pricing_transparency
        `,
        )
        .eq('vendor_type', allocation.category)
        .eq('status', 'active')
        .order('rating', { ascending: false });

      if (error) {
        console.warn(`Failed to fetch ${allocation.category} vendors:`, error);
        return [];
      }

      return vendors || [];
    });

    const vendorResults = await Promise.all(vendorPromises);
    return vendorResults.filter((vendors) => vendors.length > 0);
  }

  /**
   * Analyze how well a vendor matches the budget
   */
  private async analyzeBudgetMatch(
    vendor: any,
    request: BudgetRequest,
    allocations: BudgetAllocation[],
  ): Promise<BudgetMatchResult> {
    // Find the allocation for this vendor's category
    const categoryAllocation = allocations.find(
      (a) => a.category.toLowerCase() === vendor.vendor_type.toLowerCase(),
    );

    if (!categoryAllocation) {
      throw new Error(
        `No budget allocation found for category: ${vendor.vendor_type}`,
      );
    }

    // Analyze vendor pricing
    const priceAnalysis = this.analyzePricing(
      vendor,
      request,
      categoryAllocation,
    );

    // Calculate match score
    const matchScore = this.calculateMatchScore(
      vendor,
      request,
      categoryAllocation,
      priceAnalysis,
    );

    // Generate package recommendations
    const packageRecommendations = this.generatePackageRecommendations(
      vendor,
      categoryAllocation,
    );

    // Assess budget impact
    const budgetImpact = this.assessBudgetImpact(
      priceAnalysis,
      categoryAllocation,
      request,
    );

    // Find cost optimizations
    const costOptimizations = this.findCostOptimizations(
      vendor,
      request,
      categoryAllocation,
    );

    // Assess financial risk
    const financialRisk = this.assessFinancialRisk(
      vendor,
      priceAnalysis,
      request,
    );

    // Compare to market
    const marketComparison = await this.compareToMarket(vendor, request);

    return {
      vendorId: vendor.id,
      matchScore,
      priceAnalysis,
      packageRecommendations,
      budgetImpact,
      costOptimizations,
      financialRisk,
      marketComparison,
    };
  }

  /**
   * Analyze vendor pricing structure
   */
  private analyzePricing(
    vendor: any,
    request: BudgetRequest,
    allocation: BudgetAllocation,
  ): PriceAnalysis {
    const basePrice = vendor.base_price || 0;

    // Calculate estimated total based on wedding size and style
    let estimatedTotal = basePrice;

    // Size multiplier
    const sizeMultiplier = this.calculateSizeMultiplier(
      vendor.vendor_type,
      request.weddingSize,
    );
    estimatedTotal *= sizeMultiplier;

    // Style multiplier
    const styleMultipliers = {
      budget: 0.8,
      moderate: 1.0,
      luxury: 1.4,
      ultra_luxury: 2.0,
    };
    estimatedTotal *= styleMultipliers[request.style];

    // Location multiplier (major cities cost more)
    const locationMultiplier = this.calculateLocationMultiplier(
      request.location.region,
    );
    estimatedTotal *= locationMultiplier;

    // Calculate price range
    const priceRange = {
      min: estimatedTotal * 0.8,
      max: estimatedTotal * 1.3,
      typical: estimatedTotal,
    };

    // Identify price factors
    const priceFactors: PriceFactor[] = [
      {
        factor: 'Wedding Size',
        impact: sizeMultiplier,
        type: 'variable' as const,
        description: `${request.weddingSize} guests adjustment`,
      },
      {
        factor: 'Wedding Style',
        impact: styleMultipliers[request.style],
        type: 'fixed' as const,
        description: `${request.style} tier pricing`,
      },
      {
        factor: 'Location Premium',
        impact: locationMultiplier,
        type: 'fixed' as const,
        description: `${request.location.region} market adjustment`,
      },
    ];

    // Add seasonal factors
    const seasonalFactor = this.calculateSeasonalPricingFactor(
      request.weddingDate,
    );
    if (seasonalFactor !== 1.0) {
      estimatedTotal *= seasonalFactor;
      priceRange.min *= seasonalFactor;
      priceRange.max *= seasonalFactor;
      priceRange.typical *= seasonalFactor;

      priceFactors.push({
        factor: 'Seasonal Pricing',
        impact: seasonalFactor,
        type: 'conditional' as const,
        description:
          seasonalFactor > 1 ? 'Peak season premium' : 'Off-season discount',
      });
    }

    // Calculate transparency score
    const transparencyScore = this.calculateTransparencyScore(vendor);

    return {
      basePrice,
      estimatedTotal,
      priceRange,
      priceFactors,
      transparencyScore,
    };
  }

  /**
   * Calculate size multiplier based on vendor type and guest count
   */
  private calculateSizeMultiplier(
    vendorType: string,
    guestCount: number,
  ): number {
    const baseSize = 100; // Standard guest count
    const scalingFactors = {
      venue: 0.8, // Venues scale more linearly
      catering: 1.0, // Direct per-person scaling
      photography: 0.3, // Photography scales less with size
      music: 0.4, // Music/DJ scales moderately
      flowers: 0.6, // Florals scale moderately
      transportation: 0.9, // Transportation scales highly
      default: 0.5,
    };

    const factor =
      scalingFactors[vendorType as keyof typeof scalingFactors] ||
      scalingFactors.default;
    const ratio = guestCount / baseSize;

    return 1 + (ratio - 1) * factor;
  }

  /**
   * Calculate location pricing multiplier
   */
  private calculateLocationMultiplier(region: string): number {
    const regionMultipliers: Record<string, number> = {
      manhattan: 1.8,
      san_francisco: 1.7,
      los_angeles: 1.5,
      chicago: 1.3,
      boston: 1.4,
      seattle: 1.3,
      miami: 1.2,
      austin: 1.1,
      atlanta: 1.0,
      denver: 1.0,
      phoenix: 0.9,
      suburban: 0.8,
      rural: 0.7,
    };

    return regionMultipliers[region.toLowerCase()] || 1.0;
  }

  /**
   * Calculate seasonal pricing factor
   */
  private calculateSeasonalPricingFactor(dateString: string): number {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;

    // Peak wedding months (June-September)
    if ([6, 7, 8, 9].includes(month)) {
      return 1.2; // 20% premium
    }

    // Shoulder months (April, May, October)
    if ([4, 5, 10].includes(month)) {
      return 1.1; // 10% premium
    }

    // Off-season months (November-March)
    if ([11, 12, 1, 2, 3].includes(month)) {
      return 0.85; // 15% discount
    }

    return 1.0;
  }

  /**
   * Calculate pricing transparency score
   */
  private calculateTransparencyScore(vendor: any): number {
    let score = 5; // Base score

    // Points for clear pricing structure
    if (vendor.pricing_model === 'package') score += 2;
    if (vendor.pricing_model === 'hourly') score += 1;

    // Points for package information
    if (vendor.package_tiers && vendor.package_tiers.length > 0) score += 2;

    // Points for pricing transparency flag
    if (vendor.pricing_transparency === 'high') score += 1;

    return Math.min(10, score);
  }

  /**
   * Calculate how well vendor matches budget
   */
  private calculateMatchScore(
    vendor: any,
    request: BudgetRequest,
    allocation: BudgetAllocation,
    priceAnalysis: PriceAnalysis,
  ): number {
    let score = 0;

    // Price fit score (40% of total score)
    const budgetForCategory = allocation.actualAllocation;
    const priceFitScore = this.calculatePriceFitScore(
      priceAnalysis.estimatedTotal,
      budgetForCategory,
    );
    score += priceFitScore * 0.4;

    // Value score (25% of total score)
    const valueScore = this.calculateValueScore(vendor, priceAnalysis);
    score += valueScore * 0.25;

    // Flexibility score (20% of total score)
    const flexibilityScore = this.calculateFlexibilityScore(vendor, allocation);
    score += flexibilityScore * 0.2;

    // Quality score (15% of total score)
    const qualityScore = this.calculateQualityScore(vendor);
    score += qualityScore * 0.15;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate how well the price fits the budget
   */
  private calculatePriceFitScore(
    estimatedPrice: number,
    budgetAllocation: number,
  ): number {
    const ratio = estimatedPrice / budgetAllocation;

    if (ratio <= 0.8) return 100; // Well under budget
    if (ratio <= 1.0) return 90; // Within budget
    if (ratio <= 1.1) return 70; // Slightly over budget
    if (ratio <= 1.2) return 50; // Moderately over budget
    if (ratio <= 1.5) return 25; // Significantly over budget
    return 0; // Way over budget
  }

  /**
   * Calculate value score based on vendor offerings
   */
  private calculateValueScore(
    vendor: any,
    priceAnalysis: PriceAnalysis,
  ): number {
    let score = 50; // Base value score

    // Higher rating = better value
    if (vendor.rating >= 4.5) score += 25;
    else if (vendor.rating >= 4.0) score += 15;
    else if (vendor.rating >= 3.5) score += 5;

    // More reviews = more confidence in value
    if (vendor.review_count >= 100) score += 15;
    else if (vendor.review_count >= 50) score += 10;
    else if (vendor.review_count >= 20) score += 5;

    // Pricing transparency adds value
    score += (priceAnalysis.transparencyScore - 5) * 2;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate flexibility score
   */
  private calculateFlexibilityScore(
    vendor: any,
    allocation: BudgetAllocation,
  ): number {
    let score = 50;

    // Multiple package options = more flexibility
    if (vendor.package_tiers && vendor.package_tiers.length >= 3) score += 20;
    else if (vendor.package_tiers && vendor.package_tiers.length >= 2)
      score += 10;

    // Category flexibility
    score += allocation.flexibility * 100;

    // Pricing model flexibility
    if (vendor.pricing_model === 'custom') score += 15;
    else if (vendor.pricing_model === 'package') score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(vendor: any): number {
    let score = 0;

    // Rating score (0-100)
    score += (vendor.rating / 5) * 70;

    // Review count confidence boost
    if (vendor.review_count >= 50) score += 20;
    else if (vendor.review_count >= 20) score += 15;
    else if (vendor.review_count >= 10) score += 10;
    else if (vendor.review_count >= 5) score += 5;

    // Business verification/credentials
    if (vendor.verified) score += 10;

    return Math.min(100, score);
  }

  /**
   * Generate package recommendations
   */
  private generatePackageRecommendations(
    vendor: any,
    allocation: BudgetAllocation,
  ): PackageRecommendation[] {
    if (!vendor.package_tiers || vendor.package_tiers.length === 0) {
      return [
        {
          packageName: 'Custom Package',
          price: vendor.base_price,
          valueScore: 50,
          includes: ['Base service'],
          addOns: [],
          savingsOpportunity: 0,
          fitScore: 50,
        },
      ];
    }

    return vendor.package_tiers.map((tier: any, index: number) => {
      const fitScore = this.calculatePackageFitScore(
        tier.price,
        allocation.actualAllocation,
      );
      const valueScore = this.calculatePackageValueScore(tier, vendor);

      return {
        packageName: tier.name,
        price: tier.price,
        valueScore,
        includes: tier.includes || [],
        addOns: tier.addOns || [],
        savingsOpportunity:
          index === 0 ? 0 : vendor.package_tiers[index - 1].price - tier.price,
        fitScore,
      };
    });
  }

  /**
   * Calculate package fit score
   */
  private calculatePackageFitScore(
    packagePrice: number,
    budgetAllocation: number,
  ): number {
    return this.calculatePriceFitScore(packagePrice, budgetAllocation);
  }

  /**
   * Calculate package value score
   */
  private calculatePackageValueScore(packageTier: any, vendor: any): number {
    let score = 50;

    // More inclusions = better value
    const inclusionCount = packageTier.includes?.length || 0;
    score += Math.min(30, inclusionCount * 3);

    // Vendor rating affects package value
    score += (vendor.rating / 5 - 0.6) * 50;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Assess budget impact of choosing this vendor
   */
  private assessBudgetImpact(
    priceAnalysis: PriceAnalysis,
    allocation: BudgetAllocation,
    request: BudgetRequest,
  ): BudgetImpact {
    const percentageOfBudget =
      (priceAnalysis.estimatedTotal / request.totalBudget) * 100;
    const remainingBudget = request.totalBudget - priceAnalysis.estimatedTotal;

    // Calculate budget health score
    let healthScore = 10;
    const overBudgetAmount =
      priceAnalysis.estimatedTotal - allocation.actualAllocation;

    if (overBudgetAmount > 0) {
      const overBudgetPercentage =
        overBudgetAmount / allocation.actualAllocation;
      healthScore = Math.max(0, 10 - overBudgetPercentage * 20);
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (percentageOfBudget > allocation.recommendedPercentage * 1.3)
      riskLevel = 'critical';
    else if (percentageOfBudget > allocation.recommendedPercentage * 1.2)
      riskLevel = 'high';
    else if (percentageOfBudget > allocation.recommendedPercentage * 1.1)
      riskLevel = 'medium';

    // Generate recommendations
    const recommendations = this.generateBudgetRecommendations(
      priceAnalysis,
      allocation,
      request,
      riskLevel,
    );

    return {
      categoryAllocation: allocation.category,
      percentageOfBudget,
      remainingBudget,
      budgetHealthScore: healthScore,
      recommendations,
      riskLevel,
    };
  }

  /**
   * Generate budget recommendations
   */
  private generateBudgetRecommendations(
    priceAnalysis: PriceAnalysis,
    allocation: BudgetAllocation,
    request: BudgetRequest,
    riskLevel: string,
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('Consider vendors in a lower price tier');
      recommendations.push('Look for off-season discounts');
      recommendations.push('Reduce guest count to lower overall costs');
    } else if (riskLevel === 'high') {
      recommendations.push('Negotiate package customization');
      recommendations.push('Consider alternative dates for better pricing');
      recommendations.push(
        'Look for cost-saving opportunities in other categories',
      );
    } else if (riskLevel === 'medium') {
      recommendations.push('Budget carefully for potential overruns');
      recommendations.push(
        'Consider setting aside additional contingency funds',
      );
    } else {
      recommendations.push(
        'Great budget fit - consider upgrading other categories',
      );
      recommendations.push('Use savings for contingency or upgrades');
    }

    return recommendations;
  }

  /**
   * Find cost optimization strategies
   */
  private findCostOptimizations(
    vendor: any,
    request: BudgetRequest,
    allocation: BudgetAllocation,
  ): CostOptimization[] {
    const optimizations: CostOptimization[] = [];

    // Off-season discount optimization
    const currentDate = new Date(request.weddingDate);
    const month = currentDate.getMonth() + 1;
    if ([6, 7, 8, 9].includes(month)) {
      optimizations.push({
        strategy: 'Off-Season Date Change',
        potentialSavings: vendor.base_price * 0.15,
        effort: 'high',
        impact: 'significant',
        description: 'Move wedding to off-peak season for 15% savings',
        tradeoffs: [
          'Limited date flexibility',
          'Weather considerations',
          'Guest availability',
        ],
      });
    }

    // Package downgrade optimization
    if (vendor.package_tiers && vendor.package_tiers.length > 1) {
      const savings =
        vendor.package_tiers[1].price - vendor.package_tiers[0].price;
      optimizations.push({
        strategy: 'Package Downgrade',
        potentialSavings: savings,
        effort: 'low',
        impact: 'moderate',
        description: 'Choose basic package and add only essential upgrades',
        tradeoffs: [
          'Fewer included services',
          'May need to source items separately',
        ],
      });
    }

    // Weekday discount optimization
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 6) {
      // Saturday
      optimizations.push({
        strategy: 'Weekday Wedding',
        potentialSavings: vendor.base_price * 0.25,
        effort: 'high',
        impact: 'major',
        description: 'Move to Friday or Sunday for significant savings',
        tradeoffs: ['Guest attendance may be lower', 'Time off work required'],
      });
    }

    // Bundle discount optimization
    optimizations.push({
      strategy: 'Multi-Service Bundle',
      potentialSavings: vendor.base_price * 0.1,
      effort: 'medium',
      impact: 'moderate',
      description: 'Book multiple services with same vendor for discount',
      tradeoffs: [
        'Less vendor diversity',
        'Higher commitment to single vendor',
      ],
    });

    return optimizations;
  }

  /**
   * Assess financial risk
   */
  private assessFinancialRisk(
    vendor: any,
    priceAnalysis: PriceAnalysis,
    request: BudgetRequest,
  ): FinancialRisk {
    // Calculate over-budget probability
    const budgetBuffer = 0.1; // 10% buffer
    const priceVariability =
      (priceAnalysis.priceRange.max - priceAnalysis.priceRange.min) /
      priceAnalysis.priceRange.typical;
    const overBudgetProbability = Math.min(90, priceVariability * 100);

    // Hidden cost likelihood based on transparency
    const hiddenCostLikelihood = Math.max(
      10,
      100 - priceAnalysis.transparencyScore * 10,
    );

    // Price volatility based on vendor type and market
    const volatilityFactors = {
      venue: 20, // Venues are relatively stable
      catering: 40, // Catering costs can vary significantly
      photography: 30, // Photography is moderately stable
      flowers: 60, // Flower prices are highly volatile
      music: 25, // Music/DJ is relatively stable
      default: 35,
    };

    const priceVolatility =
      volatilityFactors[vendor.vendor_type as keyof typeof volatilityFactors] ||
      volatilityFactors.default;

    // Contract risk based on vendor rating and review count
    let contractRisk = 50;
    if (vendor.rating >= 4.5 && vendor.review_count >= 50) contractRisk = 10;
    else if (vendor.rating >= 4.0 && vendor.review_count >= 20)
      contractRisk = 25;
    else if (vendor.rating >= 3.5) contractRisk = 40;

    // Generate mitigation strategies
    const mitigationStrategies = [
      'Set aside 10-15% contingency budget',
      'Get detailed written quotes with all inclusions',
      'Negotiate fixed-price contracts when possible',
      'Request payment schedule tied to deliverables',
      'Consider wedding insurance for high-value vendors',
    ];

    return {
      overBudgetProbability,
      hiddenCostLikelihood,
      priceVolatility,
      contractRisk,
      mitigationStrategies,
    };
  }

  /**
   * Compare vendor to market averages
   */
  private async compareToMarket(
    vendor: any,
    request: BudgetRequest,
  ): Promise<MarketComparison> {
    // Get similar vendors for comparison
    const { data: competitors, error } = await this.supabase
      .from('vendors')
      .select('base_price, rating')
      .eq('vendor_type', vendor.vendor_type)
      .neq('id', vendor.id)
      .eq('status', 'active');

    if (error || !competitors || competitors.length === 0) {
      return {
        percentileRanking: 50,
        competitorCount: 0,
        averageMarketPrice: vendor.base_price,
        priceAdvantage: 0,
        marketTrends: [],
      };
    }

    const prices = competitors.map((c) => c.base_price).sort((a, b) => a - b);
    const averageMarketPrice =
      prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Calculate percentile ranking
    const lowerPrices = prices.filter(
      (price) => price < vendor.base_price,
    ).length;
    const percentileRanking = (lowerPrices / prices.length) * 100;

    // Calculate price advantage
    const priceAdvantage = averageMarketPrice - vendor.base_price;

    // Generate market trends (simplified - would use real market data)
    const marketTrends: MarketTrend[] = [
      {
        trend: 'increasing',
        magnitude: 0.05,
        timeframe: 'Next 6 months',
        reasoning: 'Seasonal demand increase expected',
      },
    ];

    return {
      percentileRanking,
      competitorCount: competitors.length,
      averageMarketPrice,
      priceAdvantage,
      marketTrends,
    };
  }

  /**
   * Optimize matches using intelligent algorithms
   */
  private optimizeMatches(
    matches: BudgetMatchResult[],
    request: BudgetRequest,
  ): BudgetMatchResult[] {
    // Sort by match score first
    const sortedMatches = matches.sort((a, b) => b.matchScore - a.matchScore);

    // Apply budget optimization logic
    const optimizedMatches = this.applyBudgetOptimization(
      sortedMatches,
      request,
    );

    // Apply diversification if multiple categories
    return this.applyDiversification(optimizedMatches, request);
  }

  /**
   * Apply budget optimization across all matches
   */
  private applyBudgetOptimization(
    matches: BudgetMatchResult[],
    request: BudgetRequest,
  ): BudgetMatchResult[] {
    // Group by category
    const categories = new Map<string, BudgetMatchResult[]>();

    matches.forEach((match) => {
      const category = match.budgetImpact.categoryAllocation;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(match);
    });

    // Optimize within each category
    const optimized: BudgetMatchResult[] = [];

    categories.forEach((categoryMatches, category) => {
      // Sort by value and budget fit
      const sorted = categoryMatches.sort((a, b) => {
        const aScore = a.matchScore + (100 - a.budgetImpact.percentageOfBudget);
        const bScore = b.matchScore + (100 - b.budgetImpact.percentageOfBudget);
        return bScore - aScore;
      });

      optimized.push(...sorted);
    });

    return optimized;
  }

  /**
   * Apply diversification to avoid concentration in single vendors
   */
  private applyDiversification(
    matches: BudgetMatchResult[],
    request: BudgetRequest,
  ): BudgetMatchResult[] {
    // For now, just return sorted matches
    // In production, would implement vendor diversification logic
    return matches;
  }

  /**
   * Generate comprehensive budget report
   */
  async generateBudgetReport(
    matches: BudgetMatchResult[],
    request: BudgetRequest,
  ) {
    const totalEstimatedCost = matches.reduce(
      (sum, match) => sum + match.priceAnalysis.estimatedTotal,
      0,
    );

    const budgetUtilization = (totalEstimatedCost / request.totalBudget) * 100;

    const report = {
      summary: {
        totalBudget: request.totalBudget,
        estimatedCost: totalEstimatedCost,
        budgetUtilization,
        remainingBudget: request.totalBudget - totalEstimatedCost,
        overBudget: totalEstimatedCost > request.totalBudget,
      },
      categories: matches.reduce(
        (acc, match) => {
          const category = match.budgetImpact.categoryAllocation;
          if (!acc[category]) {
            acc[category] = {
              allocation:
                (match.budgetImpact.percentageOfBudget * request.totalBudget) /
                100,
              estimated: match.priceAnalysis.estimatedTotal,
              variance:
                match.priceAnalysis.estimatedTotal -
                (match.budgetImpact.percentageOfBudget * request.totalBudget) /
                  100,
            };
          }
          return acc;
        },
        {} as Record<string, any>,
      ),
      optimizations: matches
        .flatMap((match) => match.costOptimizations)
        .sort((a, b) => b.potentialSavings - a.potentialSavings)
        .slice(0, 10),
      risks: matches.map((match) => ({
        vendor: match.vendorId,
        riskLevel: match.budgetImpact.riskLevel,
        overBudgetProbability: match.financialRisk.overBudgetProbability,
      })),
    };

    return report;
  }
}
