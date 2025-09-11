// WS-232: Pricing Optimization Engine
// Team E - Platform Operations Focus
// AI-powered pricing recommendations for wedding suppliers

import { createSupabaseClient } from '@/lib/supabase';

interface PricingFeatures {
  // Current pricing position
  current_pricing_tier: 'budget' | 'mid-range' | 'premium' | 'luxury';
  price_per_service_avg: number;
  competitor_price_ratio: number;
  market_position_percentile: number;

  // Demand indicators
  inquiry_volume_trend: number;
  booking_conversion_rate: number;
  quote_acceptance_rate: number;
  seasonal_demand_multiplier: number;

  // Service quality metrics
  review_score_avg: number;
  portfolio_strength_score: number;
  response_time_score: number;
  client_satisfaction_rate: number;

  // Market conditions
  local_competition_density: number;
  market_saturation_level: number;
  average_budget_in_area: number;
  economic_conditions_score: number;

  // Business performance
  profit_margin_current: number;
  capacity_utilization: number;
  repeat_business_rate: number;
  referral_generation_rate: number;
}

export interface PricingRecommendation {
  supplier_id: string;
  service_category: string;
  current_price: number;
  recommended_price: number;
  price_change_percentage: number;
  confidence_score: number;
  expected_outcomes: PricingOutcome;
  implementation_strategy: PricingStrategy;
  market_analysis: MarketAnalysis;
  risk_assessment: PricingRisk[];
  optimization_factors: OptimizationFactor[];
  recommendation_date: Date;
  model_version: string;
  inference_time_ms: number;
}

export interface PricingOutcome {
  revenue_impact_percentage: number;
  revenue_impact_amount: number;
  booking_volume_change_percentage: number;
  profit_margin_change: number;
  market_share_impact: number;
  timeline_to_impact_months: number;
  confidence_interval: {
    low: number;
    high: number;
  };
}

export interface PricingStrategy {
  implementation_approach: 'immediate' | 'gradual' | 'seasonal' | 'tier_based';
  rollout_timeline_weeks: number;
  communication_strategy: string[];
  client_retention_measures: string[];
  monitoring_metrics: string[];
  rollback_triggers: string[];
}

export interface MarketAnalysis {
  competitor_pricing_range: {
    min: number;
    max: number;
    median: number;
    percentile_75: number;
    percentile_25: number;
  };
  market_demand_trend: 'increasing' | 'stable' | 'decreasing';
  seasonal_pricing_patterns: SeasonalPattern[];
  price_elasticity_estimate: number;
  market_opportunity_score: number;
}

export interface SeasonalPattern {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  demand_multiplier: number;
  pricing_opportunity: number;
  recommended_adjustment: number;
}

export interface PricingRisk {
  risk_type:
    | 'customer_loss'
    | 'competitor_response'
    | 'demand_reduction'
    | 'brand_perception'
    | 'market_disruption'
    | 'economic_downturn';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  potential_impact: number;
  mitigation_strategies: string[];
  monitoring_indicators: string[];
}

export interface OptimizationFactor {
  factor_type:
    | 'quality_premium'
    | 'market_positioning'
    | 'capacity_optimization'
    | 'seasonal_adjustment'
    | 'competitive_advantage'
    | 'value_proposition';
  contribution_score: number;
  description: string;
  supporting_evidence: string[];
}

export class PricingOptimizer {
  private supabase = createSupabaseClient();
  private modelVersion = '1.0.0';
  private cache = new Map<
    string,
    { recommendation: PricingRecommendation; timestamp: number }
  >();
  private cacheTTL = 60 * 60 * 1000; // 1 hour

  /**
   * Generate pricing optimization recommendation for a supplier
   */
  async optimizePricing(
    supplierId: string,
    serviceCategory: string = 'wedding_photography',
  ): Promise<PricingRecommendation> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cacheKey = `${supplierId}_${serviceCategory}`;
      const cached = this.getCachedRecommendation(cacheKey);
      if (cached) return cached;

      // Extract pricing features
      const features = await this.extractPricingFeatures(
        supplierId,
        serviceCategory,
      );

      // Analyze market conditions
      const marketAnalysis = await this.analyzeMarketConditions(
        serviceCategory,
        features,
      );

      // Generate pricing recommendation
      const pricingData = await this.generatePricingRecommendation(
        features,
        marketAnalysis,
      );

      // Assess implementation strategy
      const strategy = this.developImplementationStrategy(
        pricingData,
        features,
      );

      // Identify risks
      const risks = this.assessPricingRisks(
        pricingData,
        features,
        marketAnalysis,
      );

      // Analyze optimization factors
      const factors = this.analyzeOptimizationFactors(features, pricingData);

      const recommendation: PricingRecommendation = {
        supplier_id: supplierId,
        service_category: serviceCategory,
        current_price: features.price_per_service_avg,
        recommended_price: pricingData.recommended_price,
        price_change_percentage: pricingData.price_change_percentage,
        confidence_score: pricingData.confidence_score,
        expected_outcomes: pricingData.expected_outcomes,
        implementation_strategy: strategy,
        market_analysis: marketAnalysis,
        risk_assessment: risks,
        optimization_factors: factors,
        recommendation_date: new Date(),
        model_version: this.modelVersion,
        inference_time_ms: performance.now() - startTime,
      };

      // Cache the result
      this.setCachedRecommendation(cacheKey, recommendation);

      return recommendation;
    } catch (error) {
      console.error('Pricing optimization failed:', error);
      throw error;
    }
  }

  /**
   * Batch pricing optimization for multiple suppliers
   */
  async batchOptimizePricing(
    supplierIds: string[],
    serviceCategory: string = 'wedding_photography',
  ): Promise<PricingRecommendation[]> {
    const batchSize = 20;
    const results: PricingRecommendation[] = [];

    for (let i = 0; i < supplierIds.length; i += batchSize) {
      const batch = supplierIds.slice(i, i + batchSize);
      const batchPromises = batch.map((id) =>
        this.optimizePricing(id, serviceCategory),
      );
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(
            `Pricing optimization failed for supplier ${batch[index]}:`,
            result.reason,
          );
        }
      });
    }

    return results;
  }

  /**
   * Extract pricing-related features from supplier data
   */
  private async extractPricingFeatures(
    supplierId: string,
    serviceCategory: string,
  ): Promise<PricingFeatures> {
    // Fetch supplier data
    const { data: supplier, error: supplierError } = await this.supabase
      .from('organizations')
      .select(
        `
        id, subscription_tier, average_booking_value, client_satisfaction_score,
        total_bookings, conversion_rate, response_time_avg
      `,
      )
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      throw new Error(`Supplier data not found: ${supplierError?.message}`);
    }

    // Fetch recent booking and inquiry data
    const { data: recentActivity } = await this.supabase
      .from('bookings')
      .select('total_amount, status, created_at')
      .eq('organization_id', supplierId)
      .gte(
        'created_at',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      );

    const currentMonth = new Date().getMonth();
    const averageBookingValue = supplier.average_booking_value || 3500;

    return {
      // Current pricing position
      current_pricing_tier: this.determinePricingTier(averageBookingValue),
      price_per_service_avg: averageBookingValue,
      competitor_price_ratio: this.calculateCompetitorRatio(
        averageBookingValue,
        serviceCategory,
      ),
      market_position_percentile:
        this.calculateMarketPosition(averageBookingValue),

      // Demand indicators
      inquiry_volume_trend: this.calculateInquiryTrend(recentActivity),
      booking_conversion_rate: supplier.conversion_rate || 0.25,
      quote_acceptance_rate: 0.35, // Placeholder - would calculate from quote data
      seasonal_demand_multiplier: this.calculateSeasonalDemand(currentMonth),

      // Service quality metrics
      review_score_avg: supplier.client_satisfaction_score || 4.2,
      portfolio_strength_score: 0.75, // Placeholder - would analyze portfolio quality
      response_time_score: this.normalizeResponseTime(
        supplier.response_time_avg || 120,
      ),
      client_satisfaction_rate:
        (supplier.client_satisfaction_score || 4.2) / 5.0,

      // Market conditions (simplified - would integrate with market research APIs)
      local_competition_density: 0.6, // Placeholder
      market_saturation_level: 0.7, // Placeholder
      average_budget_in_area: 8500, // Placeholder
      economic_conditions_score: 1.0, // Placeholder

      // Business performance
      profit_margin_current: 0.35, // Placeholder - would calculate from financial data
      capacity_utilization: 0.68, // Placeholder
      repeat_business_rate: 0.22, // Placeholder
      referral_generation_rate: 0.38, // Placeholder
    };
  }

  /**
   * Analyze market conditions for pricing context
   */
  private async analyzeMarketConditions(
    serviceCategory: string,
    features: PricingFeatures,
  ): Promise<MarketAnalysis> {
    // Fetch competitor pricing data (simplified - would use market research APIs)
    const competitorPricing = {
      min: features.price_per_service_avg * 0.6,
      max: features.price_per_service_avg * 2.2,
      median: features.price_per_service_avg * 1.1,
      percentile_75: features.price_per_service_avg * 1.4,
      percentile_25: features.price_per_service_avg * 0.8,
    };

    // Analyze seasonal patterns
    const seasonalPatterns: SeasonalPattern[] = [
      {
        season: 'spring',
        demand_multiplier: 1.3,
        pricing_opportunity: 0.15,
        recommended_adjustment: 0.12,
      },
      {
        season: 'summer',
        demand_multiplier: 1.5,
        pricing_opportunity: 0.2,
        recommended_adjustment: 0.18,
      },
      {
        season: 'fall',
        demand_multiplier: 1.2,
        pricing_opportunity: 0.1,
        recommended_adjustment: 0.08,
      },
      {
        season: 'winter',
        demand_multiplier: 0.7,
        pricing_opportunity: -0.15,
        recommended_adjustment: -0.12,
      },
    ];

    return {
      competitor_pricing_range: competitorPricing,
      market_demand_trend:
        features.inquiry_volume_trend > 0.1
          ? 'increasing'
          : features.inquiry_volume_trend < -0.1
            ? 'decreasing'
            : 'stable',
      seasonal_pricing_patterns: seasonalPatterns,
      price_elasticity_estimate: this.calculatePriceElasticity(features),
      market_opportunity_score: this.calculateMarketOpportunity(features),
    };
  }

  /**
   * Generate core pricing recommendation
   */
  private async generatePricingRecommendation(
    features: PricingFeatures,
    marketAnalysis: MarketAnalysis,
  ): Promise<{
    recommended_price: number;
    price_change_percentage: number;
    confidence_score: number;
    expected_outcomes: PricingOutcome;
  }> {
    let priceAdjustment = 0;

    // Quality premium adjustment
    if (features.review_score_avg > 4.5) {
      priceAdjustment += 0.15; // 15% premium for excellent reviews
    } else if (features.review_score_avg > 4.0) {
      priceAdjustment += 0.08; // 8% premium for good reviews
    }

    // Market position adjustment
    if (features.market_position_percentile < 0.25) {
      priceAdjustment += 0.2; // Price below market - opportunity to increase
    } else if (features.market_position_percentile > 0.8) {
      priceAdjustment -= 0.05; // Price high - slight adjustment down
    }

    // Demand adjustment
    if (features.booking_conversion_rate > 0.4) {
      priceAdjustment += 0.12; // High conversion = pricing power
    } else if (features.booking_conversion_rate < 0.15) {
      priceAdjustment -= 0.08; // Low conversion = price resistance
    }

    // Capacity utilization adjustment
    if (features.capacity_utilization > 0.85) {
      priceAdjustment += 0.1; // High utilization = can charge more
    } else if (features.capacity_utilization < 0.4) {
      priceAdjustment -= 0.05; // Low utilization = competitive pricing needed
    }

    // Seasonal adjustment
    priceAdjustment += features.seasonal_demand_multiplier * 0.1 - 0.1;

    // Normalize adjustment (prevent extreme changes)
    priceAdjustment = Math.max(-0.25, Math.min(0.35, priceAdjustment));

    const recommendedPrice = Math.round(
      features.price_per_service_avg * (1 + priceAdjustment),
    );
    const priceChangePercentage = priceAdjustment * 100;

    // Calculate confidence based on data quality and market conditions
    let confidenceScore = 0.75;
    if (features.review_score_avg > 4.3) confidenceScore += 0.1;
    if (features.booking_conversion_rate > 0.3) confidenceScore += 0.08;
    if (marketAnalysis.market_demand_trend === 'increasing')
      confidenceScore += 0.07;
    confidenceScore = Math.min(0.95, confidenceScore);

    // Calculate expected outcomes
    const expectedOutcomes: PricingOutcome = {
      revenue_impact_percentage: this.calculateRevenueImpact(
        priceChangePercentage,
        features,
      ),
      revenue_impact_amount: Math.round(
        (features.price_per_service_avg * 12 * priceChangePercentage) / 100,
      ),
      booking_volume_change_percentage: this.calculateVolumeImpact(
        priceChangePercentage,
        features,
      ),
      profit_margin_change: priceChangePercentage * 0.8, // Most price change flows to profit
      market_share_impact: this.calculateMarketShareImpact(
        priceChangePercentage,
      ),
      timeline_to_impact_months: 3,
      confidence_interval: {
        low: recommendedPrice * 0.9,
        high: recommendedPrice * 1.1,
      },
    };

    return {
      recommended_price: recommendedPrice,
      price_change_percentage: priceChangePercentage,
      confidence_score: confidenceScore,
      expected_outcomes: expectedOutcomes,
    };
  }

  /**
   * Develop implementation strategy
   */
  private developImplementationStrategy(
    pricingData: any,
    features: PricingFeatures,
  ): PricingStrategy {
    const priceChange = Math.abs(pricingData.price_change_percentage);

    let approach: 'immediate' | 'gradual' | 'seasonal' | 'tier_based' =
      'immediate';
    let timelineWeeks = 2;

    if (priceChange > 20) {
      approach = 'gradual';
      timelineWeeks = 8;
    } else if (priceChange > 10) {
      approach = 'seasonal';
      timelineWeeks = 12;
    }

    return {
      implementation_approach: approach,
      rollout_timeline_weeks: timelineWeeks,
      communication_strategy: [
        'Update website pricing progressively',
        'Communicate value proposition clearly',
        'Highlight service improvements and quality',
        'Offer grandfathering for existing clients if needed',
      ],
      client_retention_measures: [
        'Personalized communication about value',
        'Loyalty discounts for repeat clients',
        'Package bundling to maintain perceived value',
        'Payment plan options for higher prices',
      ],
      monitoring_metrics: [
        'Inquiry volume changes',
        'Quote acceptance rates',
        'Booking conversion rates',
        'Client feedback and satisfaction',
        'Competitor response actions',
      ],
      rollback_triggers: [
        'Inquiry volume drops >40%',
        'Conversion rate drops >50%',
        'Negative review spike',
        'Significant competitor undercut',
      ],
    };
  }

  /**
   * Assess pricing risks
   */
  private assessPricingRisks(
    pricingData: any,
    features: PricingFeatures,
    marketAnalysis: MarketAnalysis,
  ): PricingRisk[] {
    const risks: PricingRisk[] = [];
    const priceIncrease = pricingData.price_change_percentage > 0;

    if (priceIncrease && features.booking_conversion_rate < 0.2) {
      risks.push({
        risk_type: 'customer_loss',
        severity: 'high',
        probability: 0.7,
        potential_impact: features.price_per_service_avg * 6, // 6 months revenue
        mitigation_strategies: [
          'Gradual price implementation',
          'Enhanced value communication',
          'Client retention programs',
        ],
        monitoring_indicators: ['Inquiry volume', 'Quote response rates'],
      });
    }

    if (features.local_competition_density > 0.8) {
      risks.push({
        risk_type: 'competitor_response',
        severity: 'medium',
        probability: 0.5,
        potential_impact: features.price_per_service_avg * 3,
        mitigation_strategies: [
          'Differentiation strategy',
          'Value-added services',
          'Niche market focus',
        ],
        monitoring_indicators: [
          'Competitor pricing changes',
          'Market share metrics',
        ],
      });
    }

    return risks;
  }

  /**
   * Analyze optimization factors
   */
  private analyzeOptimizationFactors(
    features: PricingFeatures,
    pricingData: any,
  ): OptimizationFactor[] {
    const factors: OptimizationFactor[] = [];

    if (features.review_score_avg > 4.5) {
      factors.push({
        factor_type: 'quality_premium',
        contribution_score: 0.25,
        description: 'Excellent customer reviews justify premium pricing',
        supporting_evidence: [
          `Average review score: ${features.review_score_avg}/5.0`,
          'Client testimonials and satisfaction metrics',
          'Award recognition and industry reputation',
        ],
      });
    }

    if (features.capacity_utilization > 0.8) {
      factors.push({
        factor_type: 'capacity_optimization',
        contribution_score: 0.2,
        description: 'High demand allows selective pricing strategy',
        supporting_evidence: [
          `Capacity utilization: ${(features.capacity_utilization * 100).toFixed(0)}%`,
          'Waitlist for services',
          'Booking lead time metrics',
        ],
      });
    }

    return factors;
  }

  /**
   * Helper methods for calculations
   */
  private determinePricingTier(
    avgBookingValue: number,
  ): 'budget' | 'mid-range' | 'premium' | 'luxury' {
    if (avgBookingValue < 2000) return 'budget';
    if (avgBookingValue < 4000) return 'mid-range';
    if (avgBookingValue < 8000) return 'premium';
    return 'luxury';
  }

  private calculateCompetitorRatio(price: number, category: string): number {
    // Simplified - would integrate with market research APIs
    const marketAverage = 4200; // Placeholder for category average
    return price / marketAverage;
  }

  private calculateMarketPosition(price: number): number {
    // Simplified percentile calculation
    const minMarketPrice = 1500;
    const maxMarketPrice = 15000;
    return (price - minMarketPrice) / (maxMarketPrice - minMarketPrice);
  }

  private calculateInquiryTrend(recentActivity: any[]): number {
    if (!recentActivity || recentActivity.length < 10) return 0;

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

    const recentInquiries = recentActivity.filter(
      (a) => new Date(a.created_at).getTime() > thirtyDaysAgo,
    ).length;

    const previousInquiries = recentActivity.filter((a) => {
      const date = new Date(a.created_at).getTime();
      return date > sixtyDaysAgo && date <= thirtyDaysAgo;
    }).length;

    if (previousInquiries === 0) return 0.1;
    return (recentInquiries - previousInquiries) / previousInquiries;
  }

  private calculateSeasonalDemand(month: number): number {
    // Wedding season demand multiplier
    const seasonalMap: Record<number, number> = {
      0: 0.7,
      1: 0.8,
      2: 0.9,
      3: 1.1,
      4: 1.3,
      5: 1.4,
      6: 1.5,
      7: 1.4,
      8: 1.3,
      9: 1.2,
      10: 1.0,
      11: 0.8,
    };
    return seasonalMap[month] || 1.0;
  }

  private normalizeResponseTime(avgMinutes: number): number {
    // Convert response time to score (lower is better)
    if (avgMinutes <= 30) return 1.0;
    if (avgMinutes <= 60) return 0.8;
    if (avgMinutes <= 120) return 0.6;
    if (avgMinutes <= 240) return 0.4;
    return 0.2;
  }

  private calculatePriceElasticity(features: PricingFeatures): number {
    // Estimate price elasticity based on market position and competition
    let elasticity = -1.2; // Base elasticity for wedding services

    if (features.current_pricing_tier === 'luxury') elasticity = -0.8; // Less elastic
    if (features.local_competition_density > 0.8) elasticity -= 0.3; // More elastic with competition
    if (features.review_score_avg > 4.5) elasticity += 0.2; // Less elastic with quality

    return Math.max(-2.0, Math.min(-0.5, elasticity));
  }

  private calculateMarketOpportunity(features: PricingFeatures): number {
    let opportunity = 0.5; // Base opportunity score

    if (features.market_position_percentile < 0.3) opportunity += 0.3; // Underpriced
    if (features.review_score_avg > 4.3) opportunity += 0.2; // Quality advantage
    if (features.capacity_utilization > 0.75) opportunity += 0.15; // High demand

    return Math.min(1.0, opportunity);
  }

  private calculateRevenueImpact(
    priceChange: number,
    features: PricingFeatures,
  ): number {
    // Revenue impact considering price elasticity
    const elasticity = this.calculatePriceElasticity(features);
    const volumeChange = elasticity * (priceChange / 100);
    return priceChange + (priceChange * volumeChange) / 100;
  }

  private calculateVolumeImpact(
    priceChange: number,
    features: PricingFeatures,
  ): number {
    // Volume change based on price elasticity
    const elasticity = this.calculatePriceElasticity(features);
    return elasticity * (priceChange / 100) * 100;
  }

  private calculateMarketShareImpact(priceChange: number): number {
    // Simplified market share impact
    return priceChange * -0.3; // Negative correlation with price increases
  }

  /**
   * Cache management
   */
  private getCachedRecommendation(key: string): PricingRecommendation | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.recommendation;
    }
    return null;
  }

  private setCachedRecommendation(
    key: string,
    recommendation: PricingRecommendation,
  ): void {
    this.cache.set(key, {
      recommendation,
      timestamp: Date.now(),
    });

    // Clean old cache entries
    if (this.cache.size > 300) {
      const oldestKeys = Array.from(this.cache.keys()).slice(0, 30);
      oldestKeys.forEach((k) => this.cache.delete(k));
    }
  }
}
