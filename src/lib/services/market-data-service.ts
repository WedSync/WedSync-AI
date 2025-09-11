import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import Decimal from 'decimal.js';

// Types for market data integration
export interface MarketDataRequest {
  location: string;
  service_category: string;
  wedding_type?:
    | 'intimate'
    | 'traditional'
    | 'destination'
    | 'luxury'
    | 'budget';
  guest_count_range?: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  currency: 'GBP' | 'USD' | 'EUR' | 'AUD' | 'CAD';
}

export interface MarketPricingResponse {
  service_category: string;
  location: string;
  average_price: number;
  median_price: number;
  price_range_min: number;
  price_range_max: number;
  confidence_score: number;
  sample_size: number;
  regional_multiplier: number;
  seasonal_multiplier: number;
  currency: string;
  last_updated: string;
  trending_direction: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

export interface PricingTrend {
  service_category: string;
  location: string;
  time_period: string;
  price_changes: Array<{
    date: string;
    average_price: number;
    sample_size: number;
  }>;
  trend_analysis: {
    direction: 'increasing' | 'decreasing' | 'stable';
    percentage_change: number;
    volatility_score: number;
    seasonal_pattern: boolean;
  };
}

export interface PricingForecast {
  service_category: string;
  location: string;
  forecast_period: string;
  predicted_prices: Array<{
    date: string;
    predicted_price: number;
    confidence_interval_lower: number;
    confidence_interval_upper: number;
    confidence_score: number;
  }>;
  factors: {
    seasonal_impact: number;
    regional_growth: number;
    market_demand: number;
    economic_indicators: number;
  };
}

export interface VendorPricingData {
  vendor_id: string;
  vendor_name: string;
  service_category: string;
  location: string;
  pricing_tiers: Array<{
    tier_name: string;
    base_price: number;
    guest_count_min: number;
    guest_count_max: number;
    included_services: string[];
    additional_costs: Array<{
      service: string;
      cost: number;
      unit: string;
    }>;
  }>;
  rating: number;
  reviews_count: number;
  availability_score: number;
  last_updated: string;
}

export interface MarketIntelligence {
  location: string;
  market_summary: {
    total_vendors: number;
    average_pricing: Record<string, number>;
    market_saturation: 'low' | 'medium' | 'high';
    competition_level: 'low' | 'medium' | 'high';
  };
  regional_insights: {
    premium_locations: string[];
    budget_friendly_areas: string[];
    emerging_markets: string[];
    seasonal_hotspots: Record<string, string[]>;
  };
  pricing_recommendations: {
    best_value_categories: string[];
    negotiate_categories: string[];
    splurge_worthy_categories: string[];
    timing_sensitive_categories: string[];
  };
  forecast: {
    next_quarter_outlook: 'increasing' | 'stable' | 'decreasing';
    annual_growth_prediction: number;
    risk_factors: string[];
  };
}

class MarketDataService {
  private supabase;
  private cacheTTL = 3600000; // 1 hour in milliseconds
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Fetch current market pricing for a specific service category
   */
  async fetchMarketPricing(
    request: MarketDataRequest,
  ): Promise<MarketPricingResponse> {
    try {
      const cacheKey = this.generateCacheKey('pricing', request);
      const cached = this.getCachedData(cacheKey);

      if (cached) return cached;

      // Query market pricing data from database
      let query = this.supabase
        .from('market_pricing_data')
        .select('*')
        .eq('service_category', request.service_category)
        .eq('location', request.location)
        .eq('currency', request.currency)
        .eq('is_active', true);

      if (request.wedding_type) {
        query = query.eq('wedding_type', request.wedding_type);
      }

      const { data, error } = await query
        .order('confidence_score', { ascending: false })
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      let pricingData: MarketPricingResponse;

      if (data) {
        // Use database data
        pricingData = {
          service_category: data.service_category,
          location: data.location,
          average_price: data.average_price,
          median_price: data.median_price || data.average_price,
          price_range_min: data.price_range_min,
          price_range_max: data.price_range_max,
          confidence_score: data.confidence_score,
          sample_size: data.sample_size || 100,
          regional_multiplier: data.regional_multiplier,
          seasonal_multiplier: data.seasonal_multiplier,
          currency: data.currency,
          last_updated: data.last_updated,
          trending_direction: data.trending_direction || 'stable',
          trend_percentage: data.trend_percentage || 0,
        };
      } else {
        // Fallback to estimated pricing
        pricingData = this.generateFallbackPricing(request);
      }

      // Apply real-time adjustments
      const adjustedPricing = await this.applyRealTimeAdjustments(
        pricingData,
        request,
      );

      // Cache the result
      this.setCachedData(cacheKey, adjustedPricing);

      return adjustedPricing;
    } catch (error) {
      console.error('Market pricing fetch failed:', error);
      // Return fallback pricing on error
      return this.generateFallbackPricing(request);
    }
  }

  /**
   * Analyze historical pricing trends
   */
  async analyzePricingTrends(
    serviceCategory: string,
    location: string,
    timeRange: '3months' | '6months' | '1year' | '2years' = '1year',
  ): Promise<PricingTrend> {
    try {
      const monthsBack =
        timeRange === '3months'
          ? 3
          : timeRange === '6months'
            ? 6
            : timeRange === '1year'
              ? 12
              : 24;

      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

      const { data, error } = await this.supabase
        .from('pricing_history')
        .select('*')
        .eq('service_category', serviceCategory)
        .eq('location', location)
        .gte('date', cutoffDate.toISOString())
        .order('date', { ascending: true });

      if (error) throw error;

      const priceChanges = (data || []).map((record) => ({
        date: record.date,
        average_price: record.average_price,
        sample_size: record.sample_size || 50,
      }));

      // Analyze trend
      const trendAnalysis = this.calculateTrendAnalysis(priceChanges);

      return {
        service_category: serviceCategory,
        location,
        time_period: timeRange,
        price_changes: priceChanges,
        trend_analysis: trendAnalysis,
      };
    } catch (error) {
      console.error('Pricing trend analysis failed:', error);
      return this.generateFallbackTrend(serviceCategory, location, timeRange);
    }
  }

  /**
   * Generate pricing forecasts using trend analysis
   */
  async generatePricingForecast(
    serviceCategory: string,
    location: string,
    forecastMonths: number = 6,
  ): Promise<PricingForecast> {
    try {
      // Get historical trends
      const trends = await this.analyzePricingTrends(
        serviceCategory,
        location,
        '1year',
      );

      // Get current market factors
      const marketFactors = await this.getMarketFactors(location);

      // Generate forecast points
      const predictedPrices = [];
      const currentDate = new Date();
      const currentPrice =
        trends.price_changes.length > 0
          ? trends.price_changes[trends.price_changes.length - 1].average_price
          : 1000;

      for (let month = 1; month <= forecastMonths; month++) {
        const forecastDate = new Date(currentDate);
        forecastDate.setMonth(forecastDate.getMonth() + month);

        // Apply trend projection
        const trendMultiplier =
          1 + (trends.trend_analysis.percentage_change / 100) * (month / 12);

        // Apply seasonal adjustment
        const seasonalAdjustment = this.getSeasonalAdjustment(
          forecastDate.getMonth(),
        );

        // Apply market factors
        const marketAdjustment = this.calculateMarketAdjustment(marketFactors);

        const predictedPrice =
          currentPrice *
          trendMultiplier *
          seasonalAdjustment *
          marketAdjustment;

        // Calculate confidence interval (wider for further dates)
        const confidenceWidth =
          predictedPrice * 0.15 * (month / forecastMonths);

        predictedPrices.push({
          date: forecastDate.toISOString().split('T')[0],
          predicted_price: Math.round(predictedPrice),
          confidence_interval_lower: Math.round(
            predictedPrice - confidenceWidth,
          ),
          confidence_interval_upper: Math.round(
            predictedPrice + confidenceWidth,
          ),
          confidence_score: Math.max(0.3, 0.9 - month * 0.1), // Decreasing confidence over time
        });
      }

      return {
        service_category: serviceCategory,
        location,
        forecast_period: `${forecastMonths} months`,
        predicted_prices: predictedPrices,
        factors: {
          seasonal_impact: this.calculateSeasonalImpact(serviceCategory),
          regional_growth: marketFactors.regional_growth,
          market_demand: marketFactors.demand_level,
          economic_indicators: marketFactors.economic_factor,
        },
      };
    } catch (error) {
      console.error('Pricing forecast generation failed:', error);
      return this.generateFallbackForecast(
        serviceCategory,
        location,
        forecastMonths,
      );
    }
  }

  /**
   * Get comprehensive market intelligence for a location
   */
  async getMarketIntelligence(location: string): Promise<MarketIntelligence> {
    try {
      const cacheKey = this.generateCacheKey('intelligence', { location });
      const cached = this.getCachedData(cacheKey);

      if (cached) return cached;

      // Aggregate data from multiple sources
      const [vendorData, pricingData, trendsData] = await Promise.all([
        this.getVendorStatistics(location),
        this.getLocationPricingData(location),
        this.getLocationTrends(location),
      ]);

      const intelligence: MarketIntelligence = {
        location,
        market_summary: {
          total_vendors: vendorData.total_count,
          average_pricing: pricingData.averages,
          market_saturation: this.assessMarketSaturation(
            vendorData.total_count,
            vendorData.demand_ratio,
          ),
          competition_level: this.assessCompetitionLevel(
            vendorData.price_variance,
            vendorData.quality_variance,
          ),
        },
        regional_insights: {
          premium_locations: pricingData.premium_areas,
          budget_friendly_areas: pricingData.budget_areas,
          emerging_markets: trendsData.growth_areas,
          seasonal_hotspots: trendsData.seasonal_patterns,
        },
        pricing_recommendations: {
          best_value_categories: this.identifyBestValueCategories(
            pricingData.category_analysis,
          ),
          negotiate_categories: this.identifyNegotiableCategories(
            pricingData.category_analysis,
          ),
          splurge_worthy_categories: this.identifySplurgeCategories(
            pricingData.category_analysis,
          ),
          timing_sensitive_categories: this.identifyTimingSensitiveCategories(
            trendsData.seasonal_categories,
          ),
        },
        forecast: {
          next_quarter_outlook: trendsData.short_term_direction,
          annual_growth_prediction: trendsData.annual_growth_rate,
          risk_factors: this.identifyRiskFactors(trendsData, pricingData),
        },
      };

      // Cache the intelligence
      this.setCachedData(cacheKey, intelligence);

      return intelligence;
    } catch (error) {
      console.error('Market intelligence generation failed:', error);
      return this.generateFallbackIntelligence(location);
    }
  }

  /**
   * Update market pricing data (for admin/enterprise users)
   */
  async updateMarketPricing(
    organizationId: string,
    pricingData: Partial<MarketPricingResponse> & {
      service_category: string;
      location: string;
      currency: string;
    },
  ): Promise<void> {
    try {
      const updateData = {
        ...pricingData,
        updated_by_organization: organizationId,
        last_updated: new Date().toISOString(),
        is_active: true,
      };

      const { error } = await this.supabase
        .from('market_pricing_data')
        .upsert([updateData], {
          onConflict: 'service_category,location,currency',
        });

      if (error) throw error;

      // Invalidate related cache entries
      this.invalidateCache(pricingData.service_category, pricingData.location);

      // Log the update for audit
      await this.logMarketDataUpdate(organizationId, pricingData);
    } catch (error) {
      console.error('Market pricing update failed:', error);
      throw new Error('Failed to update market pricing data');
    }
  }

  // Private helper methods

  /**
   * Generate cache key for requests
   */
  private generateCacheKey(type: string, data: any): string {
    const keyData = typeof data === 'object' ? JSON.stringify(data) : data;
    return `${type}:${Buffer.from(keyData).toString('base64')}`;
  }

  /**
   * Get cached data if still valid
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    this.cache.delete(key); // Remove expired cache
    return null;
  }

  /**
   * Set data in cache
   */
  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Apply real-time market adjustments
   */
  private async applyRealTimeAdjustments(
    pricingData: MarketPricingResponse,
    request: MarketDataRequest,
  ): Promise<MarketPricingResponse> {
    // Apply currency conversion if needed
    if (request.currency !== pricingData.currency) {
      const conversionRate = await this.getCurrencyConversion(
        pricingData.currency,
        request.currency,
      );
      return {
        ...pricingData,
        average_price: pricingData.average_price * conversionRate,
        median_price: pricingData.median_price * conversionRate,
        price_range_min: pricingData.price_range_min * conversionRate,
        price_range_max: pricingData.price_range_max * conversionRate,
        currency: request.currency,
      };
    }

    // Apply demand-based adjustments
    const demandAdjustment = await this.getDemandAdjustment(
      request.location,
      request.service_category,
    );

    return {
      ...pricingData,
      average_price: pricingData.average_price * demandAdjustment,
      median_price: pricingData.median_price * demandAdjustment,
      price_range_min: pricingData.price_range_min * demandAdjustment,
      price_range_max: pricingData.price_range_max * demandAdjustment,
    };
  }

  /**
   * Generate fallback pricing when no data available
   */
  private generateFallbackPricing(
    request: MarketDataRequest,
  ): MarketPricingResponse {
    const basePrices: Record<string, number> = {
      VENUE: 8000,
      CATERING: 5000,
      PHOTOGRAPHY: 2000,
      VIDEOGRAPHY: 1500,
      MUSIC: 800,
      FLOWERS: 1200,
      ATTIRE: 800,
      TRANSPORTATION: 400,
      ACCESSORIES: 300,
    };

    const basePrice = basePrices[request.service_category] || 1000;

    // Apply location multiplier
    const locationMultiplier = request.location.toLowerCase().includes('london')
      ? 1.3
      : 1.0;

    // Apply wedding type multiplier
    const typeMultipliers = {
      luxury: 2.0,
      traditional: 1.0,
      intimate: 0.8,
      budget: 0.6,
      destination: 1.5,
    };
    const typeMultiplier = request.wedding_type
      ? typeMultipliers[request.wedding_type]
      : 1.0;

    const adjustedPrice = basePrice * locationMultiplier * typeMultiplier;

    return {
      service_category: request.service_category,
      location: request.location,
      average_price: adjustedPrice,
      median_price: adjustedPrice * 0.95,
      price_range_min: adjustedPrice * 0.7,
      price_range_max: adjustedPrice * 1.4,
      confidence_score: 0.6, // Lower confidence for fallback data
      sample_size: 50,
      regional_multiplier: locationMultiplier,
      seasonal_multiplier: 1.0,
      currency: request.currency,
      last_updated: new Date().toISOString(),
      trending_direction: 'stable',
      trend_percentage: 0,
    };
  }

  /**
   * Calculate trend analysis from price changes
   */
  private calculateTrendAnalysis(
    priceChanges: Array<{
      date: string;
      average_price: number;
      sample_size: number;
    }>,
  ): any {
    if (priceChanges.length < 2) {
      return {
        direction: 'stable' as const,
        percentage_change: 0,
        volatility_score: 0,
        seasonal_pattern: false,
      };
    }

    const firstPrice = priceChanges[0].average_price;
    const lastPrice = priceChanges[priceChanges.length - 1].average_price;
    const percentageChange = ((lastPrice - firstPrice) / firstPrice) * 100;

    // Calculate volatility (standard deviation of price changes)
    const priceChangeRates = priceChanges.slice(1).map((change, index) => {
      const prevPrice = priceChanges[index].average_price;
      return ((change.average_price - prevPrice) / prevPrice) * 100;
    });

    const avgChangeRate =
      priceChangeRates.reduce((sum, rate) => sum + rate, 0) /
      priceChangeRates.length;
    const volatility = Math.sqrt(
      priceChangeRates.reduce(
        (sum, rate) => sum + Math.pow(rate - avgChangeRate, 2),
        0,
      ) / priceChangeRates.length,
    );

    // Detect seasonal patterns (simplified)
    const seasonalPattern = this.detectSeasonalPattern(priceChanges);

    return {
      direction:
        percentageChange > 2
          ? ('increasing' as const)
          : percentageChange < -2
            ? ('decreasing' as const)
            : ('stable' as const),
      percentage_change: percentageChange,
      volatility_score: volatility,
      seasonal_pattern: seasonalPattern,
    };
  }

  /**
   * Detect seasonal patterns in pricing data
   */
  private detectSeasonalPattern(
    priceChanges: Array<{ date: string; average_price: number }>,
  ): boolean {
    // Simple seasonal detection - look for recurring patterns
    // More sophisticated analysis would use FFT or seasonal decomposition
    if (priceChanges.length < 12) return false;

    const monthlyPrices = new Array(12)
      .fill(0)
      .map(() => ({ total: 0, count: 0 }));

    priceChanges.forEach((change) => {
      const month = new Date(change.date).getMonth();
      monthlyPrices[month].total += change.average_price;
      monthlyPrices[month].count += 1;
    });

    const monthlyAverages = monthlyPrices
      .map((month) => (month.count > 0 ? month.total / month.count : 0))
      .filter((avg) => avg > 0);

    if (monthlyAverages.length < 6) return false;

    const overallAvg =
      monthlyAverages.reduce((sum, avg) => sum + avg, 0) /
      monthlyAverages.length;
    const variance =
      monthlyAverages.reduce(
        (sum, avg) => sum + Math.pow(avg - overallAvg, 2),
        0,
      ) / monthlyAverages.length;
    const stdDev = Math.sqrt(variance);

    // If standard deviation is > 10% of mean, consider it seasonal
    return stdDev / overallAvg > 0.1;
  }

  /**
   * Get seasonal adjustment factor for a given month
   */
  private getSeasonalAdjustment(month: number): number {
    // Wedding season typically peaks in May-September
    const seasonalMultipliers = [
      0.85, // January
      0.85, // February
      0.9, // March
      1.05, // April
      1.2, // May (peak season starts)
      1.25, // June
      1.3, // July (peak)
      1.25, // August
      1.2, // September
      1.05, // October
      0.9, // November
      0.8, // December
    ];

    return seasonalMultipliers[month] || 1.0;
  }

  /**
   * Calculate seasonal impact for a service category
   */
  private calculateSeasonalImpact(serviceCategory: string): number {
    const seasonalImpacts: Record<string, number> = {
      VENUE: 0.8, // High seasonal impact
      FLOWERS: 0.9, // Very high seasonal impact
      PHOTOGRAPHY: 0.7, // Moderate seasonal impact
      CATERING: 0.6, // Moderate seasonal impact
      MUSIC: 0.7, // Moderate seasonal impact
      VIDEOGRAPHY: 0.6, // Lower seasonal impact
      ATTIRE: 0.3, // Low seasonal impact
      TRANSPORTATION: 0.5, // Moderate seasonal impact
      ACCESSORIES: 0.2, // Very low seasonal impact
    };

    return seasonalImpacts[serviceCategory] || 0.5;
  }

  /**
   * Get other market factors
   */
  private async getMarketFactors(location: string): Promise<any> {
    // This would typically integrate with economic APIs
    // For now, return reasonable defaults
    return {
      regional_growth: 0.03, // 3% annual growth
      demand_level: 0.7, // 70% demand level
      economic_factor: 1.0, // Neutral economic conditions
    };
  }

  /**
   * Calculate market adjustment factor
   */
  private calculateMarketAdjustment(factors: any): number {
    return (
      1.0 +
      factors.regional_growth * factors.demand_level * factors.economic_factor
    );
  }

  /**
   * Get currency conversion rate
   */
  private async getCurrencyConversion(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) return 1.0;

    // Simplified currency conversion - in production would use real-time rates
    const rates: Record<string, Record<string, number>> = {
      GBP: { USD: 1.27, EUR: 1.17, AUD: 1.91, CAD: 1.71 },
      USD: { GBP: 0.79, EUR: 0.92, AUD: 1.5, CAD: 1.35 },
      EUR: { GBP: 0.85, USD: 1.09, AUD: 1.63, CAD: 1.47 },
    };

    return rates[fromCurrency]?.[toCurrency] || 1.0;
  }

  /**
   * Get demand adjustment for location/category
   */
  private async getDemandAdjustment(
    location: string,
    category: string,
  ): Promise<number> {
    // Simplified demand calculation - in production would use real data
    return 1.0; // No adjustment for now
  }

  /**
   * Generate fallback trend data
   */
  private generateFallbackTrend(
    serviceCategory: string,
    location: string,
    timeRange: string,
  ): PricingTrend {
    return {
      service_category: serviceCategory,
      location,
      time_period: timeRange,
      price_changes: [],
      trend_analysis: {
        direction: 'stable',
        percentage_change: 0,
        volatility_score: 0,
        seasonal_pattern: false,
      },
    };
  }

  /**
   * Generate fallback forecast
   */
  private generateFallbackForecast(
    serviceCategory: string,
    location: string,
    forecastMonths: number,
  ): PricingForecast {
    const basePrice = 1000; // Default price
    const predictedPrices = [];

    for (let month = 1; month <= forecastMonths; month++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + month);

      predictedPrices.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted_price: basePrice,
        confidence_interval_lower: basePrice * 0.85,
        confidence_interval_upper: basePrice * 1.15,
        confidence_score: 0.5,
      });
    }

    return {
      service_category: serviceCategory,
      location,
      forecast_period: `${forecastMonths} months`,
      predicted_prices: predictedPrices,
      factors: {
        seasonal_impact: 0.5,
        regional_growth: 0.03,
        market_demand: 0.7,
        economic_indicators: 1.0,
      },
    };
  }

  /**
   * Stub methods for market intelligence (would be implemented with real data)
   */
  private async getVendorStatistics(location: string): Promise<any> {
    return {
      total_count: 150,
      demand_ratio: 0.7,
      price_variance: 0.3,
      quality_variance: 0.2,
    };
  }

  private async getLocationPricingData(location: string): Promise<any> {
    return {
      averages: { VENUE: 8000, CATERING: 5000, PHOTOGRAPHY: 2000 },
      premium_areas: ['Central London', 'Chelsea', 'Kensington'],
      budget_areas: ['East London', 'South London'],
      category_analysis: {},
    };
  }

  private async getLocationTrends(location: string): Promise<any> {
    return {
      growth_areas: ['Canary Wharf', 'Kings Cross'],
      seasonal_patterns: {},
      short_term_direction: 'stable' as const,
      annual_growth_rate: 3.5,
      seasonal_categories: [],
    };
  }

  private assessMarketSaturation(
    vendorCount: number,
    demandRatio: number,
  ): 'low' | 'medium' | 'high' {
    const saturationScore = vendorCount / (demandRatio * 1000); // Simplified calculation
    return saturationScore < 0.3
      ? 'low'
      : saturationScore > 0.7
        ? 'high'
        : 'medium';
  }

  private assessCompetitionLevel(
    priceVariance: number,
    qualityVariance: number,
  ): 'low' | 'medium' | 'high' {
    const competitionScore = priceVariance + qualityVariance;
    return competitionScore < 0.3
      ? 'low'
      : competitionScore > 0.6
        ? 'high'
        : 'medium';
  }

  private identifyBestValueCategories(categoryAnalysis: any): string[] {
    return ['PHOTOGRAPHY', 'MUSIC']; // Simplified
  }

  private identifyNegotiableCategories(categoryAnalysis: any): string[] {
    return ['VENUE', 'CATERING']; // Simplified
  }

  private identifySplurgeCategories(categoryAnalysis: any): string[] {
    return ['PHOTOGRAPHY', 'VIDEOGRAPHY']; // Simplified
  }

  private identifyTimingSensitiveCategories(seasonalCategories: any): string[] {
    return ['FLOWERS', 'VENUE']; // Simplified
  }

  private identifyRiskFactors(trendsData: any, pricingData: any): string[] {
    return ['Seasonal demand fluctuation', 'Limited vendor availability']; // Simplified
  }

  private generateFallbackIntelligence(location: string): MarketIntelligence {
    return {
      location,
      market_summary: {
        total_vendors: 100,
        average_pricing: {},
        market_saturation: 'medium',
        competition_level: 'medium',
      },
      regional_insights: {
        premium_locations: [],
        budget_friendly_areas: [],
        emerging_markets: [],
        seasonal_hotspots: {},
      },
      pricing_recommendations: {
        best_value_categories: [],
        negotiate_categories: [],
        splurge_worthy_categories: [],
        timing_sensitive_categories: [],
      },
      forecast: {
        next_quarter_outlook: 'stable',
        annual_growth_prediction: 3.0,
        risk_factors: [],
      },
    };
  }

  private invalidateCache(serviceCategory: string, location: string): void {
    // Remove cache entries related to this category/location
    for (const [key] of this.cache) {
      if (key.includes(serviceCategory) && key.includes(location)) {
        this.cache.delete(key);
      }
    }
  }

  private async logMarketDataUpdate(
    organizationId: string,
    pricingData: any,
  ): Promise<void> {
    try {
      await this.supabase.from('market_data_audit').insert({
        organization_id: organizationId,
        service_category: pricingData.service_category,
        location: pricingData.location,
        action_type: 'UPDATE_PRICING',
        previous_price: null, // Would track previous value in production
        new_price: pricingData.average_price,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log market data update:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }
}

export const marketDataService = new MarketDataService();
