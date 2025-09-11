/**
 * WS-245 Wedding Budget Optimizer - Market Pricing Integration Service
 * Comprehensive market pricing data integration with multiple vendor sources
 */

import { z } from 'zod';
import IntegrationServiceBase from './base/integration-service-base';
import type {
  MarketPricingRequest,
  MarketPricingResponse,
  PricingData,
  MarketInsights,
  PricingRecommendation,
  PricingServiceConfig,
  ValidationResult,
  SeasonalityFactor,
  RegionalPriceComparison,
} from '@/types/pricing';
import {
  ServiceType,
  RegionCode,
  Currency,
  PricingSource,
  PricingConfidence,
  MarketSegment,
} from '@/types/pricing';

// Validation schemas
const marketPricingRequestSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  region: z.nativeEnum(RegionCode),
  weddingDate: z.date().min(new Date()),
  guestCount: z.number().int().min(1).max(1000),
  budgetRange: z.object({
    min: z.number().min(100000), // £1000 minimum in pence
    max: z.number().max(100000000), // £1M maximum in pence
    currency: z.nativeEnum(Currency),
  }),
  preferredVendors: z.array(z.string()).optional(),
  excludeVendors: z.array(z.string()).optional(),
});

const apiResponseSchema = z.object({
  pricing_data: z.array(
    z.object({
      vendor_id: z.string(),
      service_type: z.string(),
      base_price: z.number(),
      currency: z.string(),
      region_code: z.string(),
      valid_from: z.string(),
      valid_until: z.string(),
      confidence: z.string(),
      source: z.string(),
      market_segment: z.string(),
      seasonal_factors: z.array(
        z.object({
          month: z.number(),
          multiplier: z.number(),
          demand: z.string(),
        }),
      ),
      guest_count_min: z.number(),
      guest_count_max: z.number(),
      additional_services: z.array(z.string()).optional(),
      exclusions: z.array(z.string()).optional(),
    }),
  ),
  market_insights: z.object({
    average_price: z.number(),
    median_price: z.number(),
    price_range_min: z.number(),
    price_range_max: z.number(),
    trend_direction: z.enum(['up', 'down', 'stable']),
    trend_percentage: z.number(),
    sample_size: z.number(),
    last_updated: z.string(),
    seasonal_trends: z.array(
      z.object({
        month: z.number(),
        multiplier: z.number(),
        demand: z.string(),
      }),
    ),
    regional_comparison: z.array(
      z.object({
        region: z.string(),
        average_price: z.number(),
        price_multiplier: z.number(),
        availability: z.string(),
      }),
    ),
  }),
  recommendations: z.array(
    z.object({
      type: z.enum([
        'cost_reduction',
        'alternative_vendor',
        'timing_optimization',
        'package_deal',
      ]),
      description: z.string(),
      potential_savings: z.number(),
      confidence: z.string(),
      effort: z.enum(['low', 'medium', 'high']),
      applicable_categories: z.array(z.string()),
      deadline: z.string().optional(),
    }),
  ),
  last_updated: z.string(),
  request_id: z.string(),
});

/**
 * Market Pricing Integration Service
 * Integrates with wedding industry APIs to fetch market pricing data
 */
export class MarketPricingIntegration extends IntegrationServiceBase<
  MarketPricingRequest,
  MarketPricingResponse
> {
  protected validateRequest(
    request: MarketPricingRequest,
  ): ValidationResult<MarketPricingRequest> {
    try {
      const validated = marketPricingRequestSchema.parse(request);

      // Additional business logic validations
      if (validated.budgetRange.min >= validated.budgetRange.max) {
        return {
          isValid: false,
          errors: ['Budget range minimum must be less than maximum'],
        };
      }

      // Check wedding date is not too far in the future (2 years max)
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
    request: MarketPricingRequest,
    requestId: string,
  ): Promise<unknown> {
    // Transform internal request format to API format
    const apiRequest = {
      service_type: request.serviceType,
      region_code: request.region,
      wedding_date: request.weddingDate.toISOString(),
      guest_count: request.guestCount,
      budget_min: request.budgetRange.min,
      budget_max: request.budgetRange.max,
      currency: request.budgetRange.currency,
      preferred_vendors: request.preferredVendors || [],
      exclude_vendors: request.excludeVendors || [],
      request_id: requestId,
      include_recommendations: true,
      include_market_insights: true,
    };

    this.logger.debug('Making market pricing API request', {
      requestId,
      endpoint: '/market-pricing/search',
      serviceType: request.serviceType,
      region: request.region,
    });

    const response = await this.createRequest(
      '/market-pricing/search',
      'POST',
      apiRequest,
      requestId,
    );
    return this.parseJsonResponse(response);
  }

  protected transformResponse(response: unknown): MarketPricingResponse {
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
      pricing: apiResponse.pricing_data.map(this.transformPricingData),
      marketInsights: this.transformMarketInsights(apiResponse.market_insights),
      recommendations: apiResponse.recommendations.map(
        this.transformRecommendation,
      ),
      lastUpdated: new Date(apiResponse.last_updated),
      requestId: apiResponse.request_id,
    };
  }

  /**
   * Transform API pricing data to internal PricingData format
   */
  private transformPricingData(apiData: any): PricingData {
    return {
      id: `${apiData.vendor_id}-${apiData.service_type}-${Date.now()}`,
      vendorId: apiData.vendor_id,
      serviceType: apiData.service_type as ServiceType,
      basePrice: Math.round(apiData.base_price * 100), // Convert to pence
      currency: apiData.currency as Currency,
      regionCode: apiData.region_code as RegionCode,
      validFrom: new Date(apiData.valid_from),
      validUntil: new Date(apiData.valid_until),
      confidence: apiData.confidence as PricingConfidence,
      source: apiData.source as PricingSource,
      metadata: {
        marketSegment: apiData.market_segment as MarketSegment,
        seasonality: apiData.seasonal_factors.map(
          (factor: any): SeasonalityFactor => ({
            month: factor.month,
            multiplier: factor.multiplier,
            demand: factor.demand as 'low' | 'medium' | 'high' | 'peak',
          }),
        ),
        demandMultiplier: this.calculateDemandMultiplier(
          apiData.seasonal_factors,
        ),
        competitiveIndex: this.calculateCompetitiveIndex(
          apiData.base_price,
          apiData.market_segment,
        ),
        guestCountRange: {
          min: apiData.guest_count_min,
          max: apiData.guest_count_max,
        },
        additionalServices: apiData.additional_services || [],
        exclusions: apiData.exclusions || [],
      },
      updatedAt: new Date(),
    };
  }

  /**
   * Transform API market insights to internal format
   */
  private transformMarketInsights(apiInsights: any): MarketInsights {
    return {
      averagePrice: Math.round(apiInsights.average_price * 100), // Convert to pence
      medianPrice: Math.round(apiInsights.median_price * 100),
      priceRange: {
        min: Math.round(apiInsights.price_range_min * 100),
        max: Math.round(apiInsights.price_range_max * 100),
        currency: Currency.GBP,
      },
      trendDirection: apiInsights.trend_direction,
      trendPercentage: apiInsights.trend_percentage,
      sampleSize: apiInsights.sample_size,
      lastUpdated: new Date(apiInsights.last_updated),
      seasonalTrends: apiInsights.seasonal_trends.map(
        (trend: any): SeasonalityFactor => ({
          month: trend.month,
          multiplier: trend.multiplier,
          demand: trend.demand as 'low' | 'medium' | 'high' | 'peak',
        }),
      ),
      regionalComparison: apiInsights.regional_comparison.map(
        (comparison: any): RegionalPriceComparison => ({
          region: comparison.region as RegionCode,
          averagePrice: Math.round(comparison.average_price * 100),
          priceMultiplier: comparison.price_multiplier,
          availability: comparison.availability as 'low' | 'medium' | 'high',
        }),
      ),
    };
  }

  /**
   * Transform API recommendations to internal format
   */
  private transformRecommendation(apiRec: any): PricingRecommendation {
    return {
      type: apiRec.type,
      description: apiRec.description,
      potentialSavings: Math.round(apiRec.potential_savings * 100), // Convert to pence
      confidence: apiRec.confidence as PricingConfidence,
      effort: apiRec.effort,
      applicableCategories: apiRec.applicable_categories.map(
        (cat: string) => cat as ServiceType,
      ),
      deadline: apiRec.deadline ? new Date(apiRec.deadline) : undefined,
    };
  }

  /**
   * Calculate demand multiplier based on seasonal factors
   */
  private calculateDemandMultiplier(seasonalFactors: any[]): number {
    if (!seasonalFactors.length) return 1.0;

    const currentMonth = new Date().getMonth() + 1;
    const currentSeasonality = seasonalFactors.find(
      (factor) => factor.month === currentMonth,
    );

    return currentSeasonality?.multiplier || 1.0;
  }

  /**
   * Calculate competitive index based on price and market segment
   */
  private calculateCompetitiveIndex(
    basePrice: number,
    marketSegment: string,
  ): number {
    const segmentMultipliers: Record<string, number> = {
      budget: 0.7,
      mid_range: 1.0,
      premium: 1.3,
      luxury: 1.8,
    };

    return segmentMultipliers[marketSegment] || 1.0;
  }

  /**
   * Get pricing data for multiple service types
   */
  async getPricingForMultipleServices(
    serviceTypes: ServiceType[],
    region: RegionCode,
    weddingDate: Date,
    guestCount: number,
    totalBudget: number,
  ): Promise<Record<ServiceType, MarketPricingResponse | null>> {
    const results: Record<ServiceType, MarketPricingResponse | null> =
      {} as any;

    // Calculate budget allocation per service type
    const budgetPerService = Math.floor(totalBudget / serviceTypes.length);

    // Execute requests in parallel with controlled concurrency
    const promises = serviceTypes.map(async (serviceType) => {
      const request: MarketPricingRequest = {
        serviceType,
        region,
        weddingDate,
        guestCount,
        budgetRange: {
          min: Math.floor(budgetPerService * 0.5), // Allow 50% flexibility
          max: Math.floor(budgetPerService * 1.5),
          currency: Currency.GBP,
        },
      };

      try {
        const result = await this.executeWithRetry(request);
        return {
          serviceType,
          data: result.success ? result.data : null,
        };
      } catch (error) {
        this.logger.error('Failed to get pricing for service type', {
          serviceType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return {
          serviceType,
          data: null,
        };
      }
    });

    const responses = await Promise.allSettled(promises);

    responses.forEach((response) => {
      if (response.status === 'fulfilled') {
        results[response.value.serviceType] = response.value.data;
      }
    });

    return results;
  }

  /**
   * Get historical pricing trends for a service type
   */
  async getHistoricalTrends(
    serviceType: ServiceType,
    region: RegionCode,
    monthsBack: number = 12,
  ): Promise<
    Array<{ month: string; averagePrice: number; sampleSize: number }>
  > {
    const historicalRequest = {
      service_type: serviceType,
      region_code: region,
      months_back: monthsBack,
      include_sample_size: true,
    };

    try {
      const response = await this.createRequest(
        '/market-pricing/historical',
        'POST',
        historicalRequest,
      );
      const data = (await this.parseJsonResponse(response)) as any;

      return data.trends.map((trend: any) => ({
        month: trend.month,
        averagePrice: Math.round(trend.average_price * 100), // Convert to pence
        sampleSize: trend.sample_size,
      }));
    } catch (error) {
      this.logger.error('Failed to retrieve historical trends', {
        serviceType,
        region,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Get vendor availability for specific dates
   */
  async getVendorAvailability(
    serviceType: ServiceType,
    region: RegionCode,
    weddingDate: Date,
  ): Promise<
    Array<{
      vendorId: string;
      availability: 'available' | 'limited' | 'unavailable';
    }>
  > {
    const availabilityRequest = {
      service_type: serviceType,
      region_code: region,
      wedding_date: weddingDate.toISOString(),
    };

    try {
      const response = await this.createRequest(
        '/vendor-availability',
        'POST',
        availabilityRequest,
      );
      const data = (await this.parseJsonResponse(response)) as any;

      return data.vendors.map((vendor: any) => ({
        vendorId: vendor.vendor_id,
        availability: vendor.availability_status,
      }));
    } catch (error) {
      this.logger.error('Failed to retrieve vendor availability', {
        serviceType,
        region,
        weddingDate,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }
}

// Factory function for creating configured instances
export function createMarketPricingIntegration(
  config: PricingServiceConfig,
): MarketPricingIntegration {
  return new MarketPricingIntegration(config);
}

// Default configuration for Wedding Wire API
export const WEDDING_WIRE_CONFIG: PricingServiceConfig = {
  baseUrl:
    process.env.WEDDING_WIRE_API_URL || 'https://api.weddingwire.co.uk/v1',
  apiKey: process.env.WEDDING_WIRE_API_KEY || '',
  timeoutMs: 10000,
  retryAttempts: 3,
  retryDelayMs: 1000,
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
  },
  cache: {
    ttlMs: 15 * 60 * 1000, // 15 minutes
    maxSize: 1000,
  },
};

// Default configuration for The Knot API
export const THE_KNOT_CONFIG: PricingServiceConfig = {
  baseUrl: process.env.THE_KNOT_API_URL || 'https://api.theknot.com/v1',
  apiKey: process.env.THE_KNOT_API_KEY || '',
  timeoutMs: 12000,
  retryAttempts: 2,
  retryDelayMs: 1500,
  rateLimit: {
    requestsPerMinute: 40,
    requestsPerHour: 500,
  },
  cache: {
    ttlMs: 20 * 60 * 1000, // 20 minutes
    maxSize: 500,
  },
};

export default MarketPricingIntegration;
