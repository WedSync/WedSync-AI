/**
 * WS-245 Wedding Budget Optimizer - Regional Pricing Service
 * Comprehensive regional pricing data collection and analysis service
 */

import { z } from 'zod';
import IntegrationServiceBase from './base/integration-service-base';
import type {
  RegionalPricingRequest,
  RegionalPricingResponse,
  RegionalPricingData,
  RegionalRecommendation,
  TravelCostEstimate,
  PricingServiceConfig,
  ValidationResult,
  ServiceType,
  RegionCode,
  Currency,
  PricingConfidence,
} from '@/types/pricing';

// Validation schemas
const regionalPricingRequestSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  regions: z.array(z.nativeEnum(RegionCode)).min(2).max(8), // Compare 2-8 regions
  weddingDate: z.date().min(new Date()),
  guestCount: z.number().int().min(1).max(1000),
});

const apiResponseSchema = z.object({
  regional_data: z.array(
    z.object({
      region_code: z.string(),
      average_price: z.number(),
      median_price: z.number(),
      price_range_min: z.number(),
      price_range_max: z.number(),
      currency: z.string(),
      availability_score: z.string(),
      seasonal_multiplier: z.number(),
      trend_direction: z.enum(['up', 'down', 'stable']),
      trend_percentage: z.number(),
      sample_size: z.number(),
      last_updated: z.string(),
      market_maturity: z.enum(['emerging', 'established', 'saturated']),
      vendor_density: z.number(),
      quality_score: z.number().min(1).max(10),
    }),
  ),
  recommendations: z.array(
    z.object({
      recommended_region: z.string(),
      savings_amount: z.number(),
      savings_percentage: z.number(),
      confidence: z.string(),
      trade_offs: z.array(z.string()),
      travel_distance_km: z.number(),
      popularity_factor: z.number(),
      booking_difficulty: z.enum(['easy', 'moderate', 'challenging']),
      season_impact: z.object({
        peak_months: z.array(z.number()),
        off_peak_savings: z.number(),
        demand_pattern: z.string(),
      }),
    }),
  ),
  travel_costs: z.array(
    z.object({
      from_region: z.string(),
      to_region: z.string(),
      distance_km: z.number(),
      estimated_cost_pounds: z.number(),
      travel_time_hours: z.number(),
      transport_methods: z.array(
        z.object({
          method: z.string(),
          cost: z.number(),
          duration: z.number(),
          convenience_score: z.number(),
        }),
      ),
    }),
  ),
  market_insights: z.object({
    most_affordable_region: z.string(),
    best_value_region: z.string(),
    premium_region: z.string(),
    fastest_growing: z.string(),
    oversupplied_regions: z.array(z.string()),
    undersupplied_regions: z.array(z.string()),
    seasonal_hotspots: z.array(
      z.object({
        region: z.string(),
        peak_months: z.array(z.number()),
        premium_percentage: z.number(),
      }),
    ),
  }),
  last_updated: z.string(),
  request_id: z.string(),
});

/**
 * Regional Pricing Service
 * Provides comprehensive regional pricing analysis and recommendations
 * for optimizing wedding budgets across different UK regions
 */
export class RegionalPricingService extends IntegrationServiceBase<
  RegionalPricingRequest,
  RegionalPricingResponse
> {
  protected validateRequest(
    request: RegionalPricingRequest,
  ): ValidationResult<RegionalPricingRequest> {
    try {
      const validated = regionalPricingRequestSchema.parse(request);

      // Business logic validations
      if (validated.regions.length < 2) {
        return {
          isValid: false,
          errors: ['Must specify at least 2 regions for comparison'],
        };
      }

      // Check for duplicate regions
      const uniqueRegions = new Set(validated.regions);
      if (uniqueRegions.size !== validated.regions.length) {
        return {
          isValid: false,
          errors: ['Duplicate regions specified'],
        };
      }

      // Validate wedding date is within 2 years
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 2);
      if (validated.weddingDate > maxDate) {
        return {
          isValid: false,
          errors: ['Wedding date cannot be more than 2 years in the future'],
        };
      }

      return {
        isValid: true,
        data: validated,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        };
      }
      return {
        isValid: false,
        errors: ['Unknown validation error'],
      };
    }
  }

  protected async makeRequest(
    request: RegionalPricingRequest,
    requestId: string,
  ): Promise<unknown> {
    // Transform internal request to API format
    const apiRequest = {
      service_type: request.serviceType,
      regions: request.regions,
      wedding_date: request.weddingDate.toISOString(),
      guest_count: request.guestCount,
      include_travel_costs: true,
      include_seasonal_analysis: true,
      include_market_insights: true,
      currency: Currency.GBP,
      request_id: requestId,
    };

    this.logger.debug('Making regional pricing API request', {
      requestId,
      endpoint: '/regional-pricing/analysis',
      serviceType: request.serviceType,
      regionCount: request.regions.length,
      regions: request.regions,
    });

    const response = await this.createRequest(
      '/regional-pricing/analysis',
      'POST',
      apiRequest,
      requestId,
    );
    return this.parseJsonResponse(response);
  }

  protected transformResponse(response: unknown): RegionalPricingResponse {
    // Validate response structure
    const validationResult = this.validateResponseStructure(
      response,
      apiResponseSchema,
    );
    if (!validationResult.isValid) {
      throw new Error(
        `Invalid API response: ${validationResult.errors?.join(', ')}`,
      );
    }

    const apiResponse = validationResult.data as z.infer<
      typeof apiResponseSchema
    >;

    // Transform API response to internal format
    return {
      regionData: apiResponse.regional_data.map(this.transformRegionalData),
      recommendations: apiResponse.recommendations.map(
        this.transformRecommendation,
      ),
      travelCosts: apiResponse.travel_costs.map(this.transformTravelCost),
      marketInsights: {
        mostAffordableRegion: apiResponse.market_insights
          .most_affordable_region as RegionCode,
        bestValueRegion: apiResponse.market_insights
          .best_value_region as RegionCode,
        premiumRegion: apiResponse.market_insights.premium_region as RegionCode,
        fastestGrowing: apiResponse.market_insights
          .fastest_growing as RegionCode,
        oversuppliedRegions:
          apiResponse.market_insights.oversupplied_regions.map(
            (r) => r as RegionCode,
          ),
        undersuppliedRegions:
          apiResponse.market_insights.undersupplied_regions.map(
            (r) => r as RegionCode,
          ),
        seasonalHotspots: apiResponse.market_insights.seasonal_hotspots.map(
          (spot) => ({
            region: spot.region as RegionCode,
            peakMonths: spot.peak_months,
            premiumPercentage: spot.premium_percentage,
          }),
        ),
      },
      lastUpdated: new Date(apiResponse.last_updated),
      requestId: apiResponse.request_id,
    };
  }

  /**
   * Transform API regional data to internal format
   */
  private transformRegionalData(apiData: any): RegionalPricingData {
    return {
      region: apiData.region_code as RegionCode,
      averagePrice: Math.round(apiData.average_price * 100), // Convert to pence
      priceRange: {
        min: Math.round(apiData.price_range_min * 100),
        max: Math.round(apiData.price_range_max * 100),
        currency: Currency.GBP,
      },
      availability: apiData.availability_score as 'low' | 'medium' | 'high',
      seasonalMultiplier: apiData.seasonal_multiplier,
      trendDirection: apiData.trend_direction,
      sampleSize: apiData.sample_size,
      metadata: {
        medianPrice: Math.round(apiData.median_price * 100),
        trendPercentage: apiData.trend_percentage,
        lastUpdated: new Date(apiData.last_updated),
        marketMaturity: apiData.market_maturity,
        vendorDensity: apiData.vendor_density,
        qualityScore: apiData.quality_score,
      },
    };
  }

  /**
   * Transform API recommendation to internal format
   */
  private transformRecommendation(apiRec: any): RegionalRecommendation {
    return {
      recommendedRegion: apiRec.recommended_region as RegionCode,
      savingsAmount: Math.round(apiRec.savings_amount * 100), // Convert to pence
      savingsPercentage: apiRec.savings_percentage,
      tradeOffs: apiRec.trade_offs,
      travelDistance: apiRec.travel_distance_km,
      confidence: apiRec.confidence as PricingConfidence,
      metadata: {
        popularityFactor: apiRec.popularity_factor,
        bookingDifficulty: apiRec.booking_difficulty,
        seasonImpact: {
          peakMonths: apiRec.season_impact.peak_months,
          offPeakSavings: Math.round(
            apiRec.season_impact.off_peak_savings * 100,
          ),
          demandPattern: apiRec.season_impact.demand_pattern,
        },
      },
    };
  }

  /**
   * Transform API travel cost to internal format
   */
  private transformTravelCost(apiCost: any): TravelCostEstimate {
    return {
      fromRegion: apiCost.from_region as RegionCode,
      toRegion: apiCost.to_region as RegionCode,
      distance: apiCost.distance_km,
      estimatedCost: Math.round(apiCost.estimated_cost_pounds * 100), // Convert to pence
      travelTime: apiCost.travel_time_hours,
      transportMethods: apiCost.transport_methods.map((method: any) => ({
        method: method.method,
        cost: Math.round(method.cost * 100), // Convert to pence
        duration: method.duration,
        convenienceScore: method.convenience_score,
      })),
    };
  }

  /**
   * Get comprehensive regional analysis for a specific service type
   */
  async getRegionalAnalysis(
    serviceType: ServiceType,
    baseRegion: RegionCode,
    weddingDate: Date,
    guestCount: number,
    comparisonRadius: 'local' | 'national' = 'local',
  ): Promise<RegionalPricingResponse | null> {
    // Define regions to compare based on radius
    const regions = this.getComparisonRegions(baseRegion, comparisonRadius);

    const request: RegionalPricingRequest = {
      serviceType,
      regions,
      weddingDate,
      guestCount,
    };

    try {
      const result = await this.executeWithRetry(request);
      return result.success ? result.data : null;
    } catch (error) {
      this.logger.error('Failed to get regional analysis', {
        serviceType,
        baseRegion,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get seasonal pricing variations for a region
   */
  async getSeasonalAnalysis(
    serviceType: ServiceType,
    region: RegionCode,
    year: number = new Date().getFullYear(),
  ): Promise<
    Array<{ month: number; priceMultiplier: number; demandLevel: string }>
  > {
    const seasonalRequest = {
      service_type: serviceType,
      region_code: region,
      analysis_year: year,
      include_demand_data: true,
    };

    try {
      const response = await this.createRequest(
        '/regional-pricing/seasonal',
        'POST',
        seasonalRequest,
      );
      const data = (await this.parseJsonResponse(response)) as any;

      return data.seasonal_data.map((season: any) => ({
        month: season.month,
        priceMultiplier: season.multiplier,
        demandLevel: season.demand_level,
      }));
    } catch (error) {
      this.logger.error('Failed to retrieve seasonal analysis', {
        serviceType,
        region,
        year,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Get optimal region recommendations based on budget constraints
   */
  async getOptimalRegions(
    serviceType: ServiceType,
    maxBudget: number, // in pence
    weddingDate: Date,
    guestCount: number,
    prioritizeDistance: boolean = true,
  ): Promise<RegionalRecommendation[]> {
    const optimizationRequest = {
      service_type: serviceType,
      max_budget: maxBudget / 100, // Convert to pounds for API
      wedding_date: weddingDate.toISOString(),
      guest_count: guestCount,
      optimization_criteria: prioritizeDistance ? 'distance' : 'savings',
      currency: Currency.GBP,
    };

    try {
      const response = await this.createRequest(
        '/regional-pricing/optimize',
        'POST',
        optimizationRequest,
      );
      const data = (await this.parseJsonResponse(response)) as any;

      return data.recommendations.map(this.transformRecommendation);
    } catch (error) {
      this.logger.error('Failed to get optimal regions', {
        serviceType,
        maxBudget,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Calculate potential savings by changing wedding regions
   */
  async calculateRegionSavings(
    serviceType: ServiceType,
    fromRegion: RegionCode,
    toRegion: RegionCode,
    weddingDate: Date,
    guestCount: number,
  ): Promise<{
    savingsAmount: number;
    savingsPercentage: number;
    travelCost: number;
    netSavings: number;
    recommendation:
      | 'highly_recommended'
      | 'recommended'
      | 'neutral'
      | 'not_recommended';
  } | null> {
    const savingsRequest = {
      service_type: serviceType,
      from_region: fromRegion,
      to_region: toRegion,
      wedding_date: weddingDate.toISOString(),
      guest_count: guestCount,
      include_travel_costs: true,
    };

    try {
      const response = await this.createRequest(
        '/regional-pricing/savings',
        'POST',
        savingsRequest,
      );
      const data = (await this.parseJsonResponse(response)) as any;

      const savingsAmount = Math.round(data.savings_amount * 100); // Convert to pence
      const travelCost = Math.round(data.travel_cost * 100); // Convert to pence
      const netSavings = savingsAmount - travelCost;

      return {
        savingsAmount,
        savingsPercentage: data.savings_percentage,
        travelCost,
        netSavings,
        recommendation: this.calculateRecommendation(netSavings, savingsAmount),
      };
    } catch (error) {
      this.logger.error('Failed to calculate region savings', {
        serviceType,
        fromRegion,
        toRegion,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get regions to compare based on base region and radius
   */
  private getComparisonRegions(
    baseRegion: RegionCode,
    radius: 'local' | 'national',
  ): RegionCode[] {
    const regionGroups = {
      london: [RegionCode.UK_LONDON, RegionCode.UK_SOUTHEAST],
      southeast: [
        RegionCode.UK_SOUTHEAST,
        RegionCode.UK_LONDON,
        RegionCode.UK_SOUTHWEST,
      ],
      southwest: [
        RegionCode.UK_SOUTHWEST,
        RegionCode.UK_SOUTHEAST,
        RegionCode.UK_WALES,
      ],
      midlands: [
        RegionCode.UK_MIDLANDS,
        RegionCode.UK_NORTH,
        RegionCode.UK_WALES,
      ],
      north: [
        RegionCode.UK_NORTH,
        RegionCode.UK_MIDLANDS,
        RegionCode.UK_SCOTLAND,
      ],
      scotland: [RegionCode.UK_SCOTLAND, RegionCode.UK_NORTH],
      wales: [
        RegionCode.UK_WALES,
        RegionCode.UK_SOUTHWEST,
        RegionCode.UK_MIDLANDS,
      ],
      northern_ireland: [RegionCode.UK_NI, RegionCode.UK_SCOTLAND],
    };

    if (radius === 'national') {
      return Object.values(RegionCode);
    }

    // Find regional group for base region
    for (const [group, regions] of Object.entries(regionGroups)) {
      if (regions.includes(baseRegion)) {
        return regions;
      }
    }

    // Fallback to all regions if no group found
    return [
      baseRegion,
      RegionCode.UK_LONDON,
      RegionCode.UK_SOUTHEAST,
      RegionCode.UK_MIDLANDS,
    ];
  }

  /**
   * Calculate recommendation level based on net savings
   */
  private calculateRecommendation(
    netSavings: number,
    grossSavings: number,
  ): 'highly_recommended' | 'recommended' | 'neutral' | 'not_recommended' {
    const savingsPercentage = (netSavings / grossSavings) * 100;

    if (savingsPercentage > 75) return 'highly_recommended';
    if (savingsPercentage > 25) return 'recommended';
    if (savingsPercentage > 0) return 'neutral';
    return 'not_recommended';
  }
}

// Factory function for creating configured instances
export function createRegionalPricingService(
  config: PricingServiceConfig,
): RegionalPricingService {
  return new RegionalPricingService(config);
}

// Default configuration for UK regional pricing service
export const UK_REGIONAL_PRICING_CONFIG: PricingServiceConfig = {
  baseUrl:
    process.env.UK_REGIONAL_PRICING_API_URL ||
    'https://api.ukweddingpricing.co.uk/v1',
  apiKey: process.env.UK_REGIONAL_PRICING_API_KEY || '',
  timeoutMs: 15000, // Longer timeout for complex regional analysis
  retryAttempts: 3,
  retryDelayMs: 2000,
  rateLimit: {
    requestsPerMinute: 30, // Lower rate limit for complex queries
    requestsPerHour: 500,
  },
  cache: {
    ttlMs: 30 * 60 * 1000, // 30 minutes cache for regional data
    maxSize: 2000,
  },
};

export default RegionalPricingService;
