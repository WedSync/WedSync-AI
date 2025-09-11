/**
 * WS-245 Wedding Budget Optimizer - Comprehensive Integration Tests
 * Test suite for all pricing integration services with >90% coverage
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  MarketPricingIntegration,
  VendorCostIntegration,
  FinancialServiceIntegration,
  RegionalPricingService,
  pricingIntegrationFactory,
  PricingIntegrationSecurity
} from '@/lib/integrations/pricing-integrations';
import type {
  ServiceType,
  RegionCode,
  Currency,
  MarketPricingRequest,
  VendorCostRequest,
  FinancialServiceRequest,
  RegionalPricingRequest,
  PricingServiceConfig
} from '@/types/pricing';

// Mock fetch for API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Test configuration
const testConfig: PricingServiceConfig = {
  baseUrl: 'https://api.test.example.com',
  apiKey: 'test-api-key-12345',
  timeoutMs: 5000,
  retryAttempts: 2,
  retryDelayMs: 100,
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerHour: 1000
  },
  cache: {
    ttlMs: 60000,
    maxSize: 100
  }
};

describe('WS-245 Wedding Budget Optimizer - Pricing Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Market Pricing Integration', () => {
    let marketPricing: MarketPricingIntegration;

    beforeEach(() => {
      marketPricing = new MarketPricingIntegration(testConfig);
    });

    test('should validate market pricing request correctly', async () => {
      const validRequest: MarketPricingRequest = {
        serviceType: ServiceType.PHOTOGRAPHY,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        budgetRange: {
          min: 200000, // £2000 in pence
          max: 500000, // £5000 in pence
          currency: Currency.GBP
        }
      };

      // Mock successful API response
      const mockApiResponse = {
        pricing_data: [{
          vendor_id: 'vendor-123',
          service_type: 'photography',
          base_price: 3000, // £3000 in API (pounds)
          currency: 'GBP',
          region_code: 'UK-LON',
          valid_from: '2025-01-01T00:00:00Z',
          valid_until: '2025-12-31T23:59:59Z',
          confidence: 'high',
          source: 'wedding_wire',
          market_segment: 'premium',
          seasonal_factors: [{
            month: 6,
            multiplier: 1.2,
            demand: 'high'
          }],
          guest_count_min: 50,
          guest_count_max: 200,
          additional_services: ['engagement_session'],
          exclusions: ['travel_costs']
        }],
        market_insights: {
          average_price: 3200,
          median_price: 3000,
          price_range_min: 2000,
          price_range_max: 5000,
          trend_direction: 'up',
          trend_percentage: 5.2,
          sample_size: 150,
          last_updated: '2025-01-15T10:00:00Z',
          seasonal_trends: [{
            month: 6,
            multiplier: 1.2,
            demand: 'high'
          }],
          regional_comparison: [{
            region: 'UK-SE',
            average_price: 2800,
            price_multiplier: 0.875,
            availability: 'medium'
          }]
        },
        recommendations: [{
          type: 'timing_optimization',
          description: 'Consider booking in May for 15% savings',
          potential_savings: 450,
          confidence: 'high',
          effort: 'low',
          applicable_categories: ['photography', 'venue'],
          deadline: '2025-03-01T00:00:00Z'
        }],
        last_updated: '2025-01-15T10:00:00Z',
        request_id: 'req-12345'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await marketPricing.execute(validRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pricing).toHaveLength(1);
        expect(result.data.pricing[0].basePrice).toBe(300000); // £3000 converted to pence
        expect(result.data.marketInsights.averagePrice).toBe(320000); // £3200 converted to pence
        expect(result.data.recommendations).toHaveLength(1);
        expect(result.data.recommendations[0].potentialSavings).toBe(45000); // £450 converted to pence
      }
    });

    test('should handle invalid market pricing request', async () => {
      const invalidRequest = {
        serviceType: ServiceType.PHOTOGRAPHY,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2020-01-01'), // Date in the past
        guestCount: 120,
        budgetRange: {
          min: 500000, // Min greater than max
          max: 200000,
          currency: Currency.GBP
        }
      } as MarketPricingRequest;

      const result = await marketPricing.execute(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle API timeout correctly', async () => {
      const validRequest: MarketPricingRequest = {
        serviceType: ServiceType.VENUE,
        region: RegionCode.UK_SOUTHEAST,
        weddingDate: new Date('2025-09-20'),
        guestCount: 80,
        budgetRange: {
          min: 800000, // £8000 in pence
          max: 1500000, // £15000 in pence
          currency: Currency.GBP
        }
      };

      // Mock timeout
      mockFetch.mockRejectedValueOnce(new Error('Request timed out after 5000ms'));

      const result = await marketPricing.execute(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    test('should get pricing for multiple service types', async () => {
      const serviceTypes = [ServiceType.PHOTOGRAPHY, ServiceType.VENUE, ServiceType.CATERING];
      
      // Mock responses for each service type
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pricing_data: [],
            market_insights: { average_price: 3000, median_price: 2800, price_range_min: 2000, price_range_max: 5000, trend_direction: 'stable', trend_percentage: 0, sample_size: 100, last_updated: '2025-01-15T10:00:00Z', seasonal_trends: [], regional_comparison: [] },
            recommendations: [],
            last_updated: '2025-01-15T10:00:00Z',
            request_id: 'req-photo'
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pricing_data: [],
            market_insights: { average_price: 8000, median_price: 7500, price_range_min: 5000, price_range_max: 15000, trend_direction: 'up', trend_percentage: 3.5, sample_size: 80, last_updated: '2025-01-15T10:00:00Z', seasonal_trends: [], regional_comparison: [] },
            recommendations: [],
            last_updated: '2025-01-15T10:00:00Z',
            request_id: 'req-venue'
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pricing_data: [],
            market_insights: { average_price: 50, median_price: 48, price_range_min: 30, price_range_max: 80, trend_direction: 'stable', trend_percentage: 1.2, sample_size: 200, last_updated: '2025-01-15T10:00:00Z', seasonal_trends: [], regional_comparison: [] },
            recommendations: [],
            last_updated: '2025-01-15T10:00:00Z',
            request_id: 'req-catering'
          })
        } as Response);

      const results = await marketPricing.getPricingForMultipleServices(
        serviceTypes,
        RegionCode.UK_LONDON,
        new Date('2025-07-15'),
        100,
        1000000 // £10000 total budget in pence
      );

      expect(Object.keys(results)).toHaveLength(3);
      expect(results[ServiceType.PHOTOGRAPHY]).toBeTruthy();
      expect(results[ServiceType.VENUE]).toBeTruthy();
      expect(results[ServiceType.CATERING]).toBeTruthy();
    });
  });

  describe('Vendor Cost Integration', () => {
    let vendorCost: VendorCostIntegration;

    beforeEach(() => {
      vendorCost = new VendorCostIntegration(testConfig);
    });

    test('should handle Tave integration correctly', async () => {
      const request: VendorCostRequest = {
        vendorId: 'tave-vendor-123',
        serviceType: ServiceType.PHOTOGRAPHY,
        weddingDate: new Date('2025-08-20'),
        guestCount: 150,
        additionalRequirements: {
          engagementSession: true,
          secondShooter: true
        }
      };

      const mockResponse = {
        vendor_id: 'tave-vendor-123',
        quote_pricing: [{
          pricing_id: 'quote-456',
          base_price: 2500,
          currency: 'GBP',
          service_breakdown: [{
            service_name: 'Wedding Photography',
            price: 2000,
            description: '8-hour coverage'
          }, {
            service_name: 'Engagement Session',
            price: 300,
            description: '1-hour session'
          }, {
            service_name: 'Second Shooter',
            price: 200,
            description: 'Additional photographer'
          }]
        }],
        package_options: [{
          package_id: 'pkg-789',
          name: 'Complete Wedding Package',
          description: 'Full day coverage with engagement session',
          base_price: 2400,
          currency: 'GBP',
          inclusions: ['8-hour coverage', 'engagement session', 'online gallery'],
          exclusions: ['prints', 'albums'],
          guest_count_min: 50,
          guest_count_max: 200,
          valid_until: '2025-12-31T23:59:59Z'
        }],
        availability_status: 'available',
        valid_until: '2025-02-15T23:59:59Z',
        quotation_id: 'tave-quote-789'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await vendorCost.execute(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vendorId).toBe('tave-vendor-123');
        expect(result.data.quotePricing).toHaveLength(1);
        expect(result.data.quotePricing[0].basePrice).toBe(250000); // £2500 in pence
        expect(result.data.packageOptions).toHaveLength(1);
        expect(result.data.availabilityStatus).toBe('available');
      }
    });

    test('should handle vendor unavailability', async () => {
      const request: VendorCostRequest = {
        vendorId: 'busy-vendor-456',
        serviceType: ServiceType.VENUE,
        weddingDate: new Date('2025-06-14'), // Popular Saturday
        guestCount: 120
      };

      const mockResponse = {
        vendor_id: 'busy-vendor-456',
        quote_pricing: [],
        package_options: [],
        availability_status: 'unavailable',
        valid_until: '2025-01-20T23:59:59Z',
        quotation_id: 'unavailable-quote',
        unavailability_reason: 'Already booked for requested date'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await vendorCost.execute(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.availabilityStatus).toBe('unavailable');
        expect(result.data.quotePricing).toHaveLength(0);
      }
    });
  });

  describe('Financial Service Integration', () => {
    let financialService: FinancialServiceIntegration;

    beforeEach(() => {
      financialService = new FinancialServiceIntegration(testConfig);
    });

    test('should integrate with QuickBooks correctly', async () => {
      const request: FinancialServiceRequest = {
        organizationId: 'org-123',
        accountConnections: [{
          accountId: 'qb-account-456',
          provider: 'quickbooks',
          connectionStatus: 'active',
          lastSyncAt: new Date('2025-01-14T10:00:00Z')
        }],
        dateRange: {
          start: new Date('2024-12-01'),
          end: new Date('2025-01-14')
        },
        categories: [ServiceType.PHOTOGRAPHY, ServiceType.VENUE]
      };

      const mockResponse = {
        transactions: [{
          transaction_id: 'txn-789',
          amount: 250000, // £2500 in pence already
          currency: 'GBP',
          date: '2025-01-10T14:30:00Z',
          vendor_name: 'Amazing Photography Ltd',
          category: 'photography',
          description: 'Wedding photography deposit',
          payment_method: 'Bank Transfer',
          status: 'completed'
        }],
        category_breakdown: [{
          category: 'photography',
          total_spent: 250000,
          transaction_count: 1,
          average_amount: 250000,
          budget_allocated: 300000,
          remaining_budget: 50000
        }],
        budget_comparison: {
          total_budget: 1000000, // £10000
          total_spent: 250000,    // £2500
          total_pending: 0,
          remaining_budget: 750000, // £7500
          categories: [{
            category: 'photography',
            total_spent: 250000,
            transaction_count: 1,
            average_amount: 250000,
            budget_allocated: 300000,
            remaining_budget: 50000
          }]
        },
        savings_opportunities: [{
          category: 'photography',
          current_spend: 250000,
          recommended_spend: 200000,
          potential_savings: 50000,
          confidence: 'medium',
          action_required: 'Consider alternative photographers in nearby regions'
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await financialService.execute(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transactions).toHaveLength(1);
        expect(result.data.transactions[0].amount).toBe(250000);
        expect(result.data.budgetComparison.totalBudget).toBe(1000000);
        expect(result.data.savingsOpportunities).toHaveLength(1);
        expect(result.data.savingsOpportunities[0].potentialSavings).toBe(50000);
      }
    });

    test('should handle OAuth token expiry', async () => {
      const request: FinancialServiceRequest = {
        organizationId: 'org-456',
        accountConnections: [{
          accountId: 'expired-account',
          provider: 'quickbooks',
          connectionStatus: 'expired',
          lastSyncAt: new Date('2024-12-01T10:00:00Z')
        }],
        dateRange: {
          start: new Date('2024-12-01'),
          end: new Date('2025-01-14')
        }
      };

      mockFetch.mockRejectedValueOnce(new Error('HTTP 401: Token expired'));

      const result = await financialService.execute(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('UNKNOWN_ERROR'); // Will be mapped from HTTP 401
    });
  });

  describe('Regional Pricing Service', () => {
    let regionalPricing: RegionalPricingService;

    beforeEach(() => {
      regionalPricing = new RegionalPricingService(testConfig);
    });

    test('should compare regional pricing correctly', async () => {
      const request: RegionalPricingRequest = {
        serviceType: ServiceType.VENUE,
        regions: [RegionCode.UK_LONDON, RegionCode.UK_SOUTHEAST, RegionCode.UK_SOUTHWEST],
        weddingDate: new Date('2025-05-17'),
        guestCount: 100
      };

      const mockResponse = {
        regional_data: [
          {
            region_code: 'UK-LON',
            average_price: 12000,
            median_price: 11000,
            price_range_min: 8000,
            price_range_max: 20000,
            currency: 'GBP',
            availability_score: 'medium',
            seasonal_multiplier: 1.15,
            trend_direction: 'up',
            trend_percentage: 8.2,
            sample_size: 95,
            last_updated: '2025-01-15T10:00:00Z',
            market_maturity: 'saturated',
            vendor_density: 8.5,
            quality_score: 8.9
          },
          {
            region_code: 'UK-SE',
            average_price: 9000,
            median_price: 8500,
            price_range_min: 6000,
            price_range_max: 15000,
            currency: 'GBP',
            availability_score: 'high',
            seasonal_multiplier: 1.08,
            trend_direction: 'stable',
            trend_percentage: 2.1,
            sample_size: 78,
            last_updated: '2025-01-15T10:00:00Z',
            market_maturity: 'established',
            vendor_density: 6.2,
            quality_score: 8.1
          }
        ],
        recommendations: [{
          recommended_region: 'UK-SE',
          savings_amount: 3000,
          savings_percentage: 25.0,
          confidence: 'high',
          trade_offs: ['Slightly longer travel for London couples', 'Fewer luxury options'],
          travel_distance_km: 45,
          popularity_factor: 0.72,
          booking_difficulty: 'moderate',
          season_impact: {
            peak_months: [5, 6, 7, 8, 9],
            off_peak_savings: 15.5,
            demand_pattern: 'summer_peak'
          }
        }],
        travel_costs: [{
          from_region: 'UK-LON',
          to_region: 'UK-SE',
          distance_km: 45,
          estimated_cost_pounds: 120,
          travel_time_hours: 1.2,
          transport_methods: [{
            method: 'car',
            cost: 35,
            duration: 1.2,
            convenience_score: 8.5
          }, {
            method: 'train',
            cost: 85,
            duration: 1.8,
            convenience_score: 7.2
          }]
        }],
        market_insights: {
          most_affordable_region: 'UK-SW',
          best_value_region: 'UK-SE',
          premium_region: 'UK-LON',
          fastest_growing: 'UK-SE',
          oversupplied_regions: ['UK-SW'],
          undersupplied_regions: ['UK-LON'],
          seasonal_hotspots: [{
            region: 'UK-LON',
            peak_months: [6, 7, 8, 9],
            premium_percentage: 25.8
          }]
        },
        last_updated: '2025-01-15T10:00:00Z',
        request_id: 'regional-req-123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await regionalPricing.execute(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.regionData).toHaveLength(2);
        expect(result.data.regionData[0].averagePrice).toBe(1200000); // £12000 in pence
        expect(result.data.recommendations).toHaveLength(1);
        expect(result.data.recommendations[0].savingsAmount).toBe(300000); // £3000 in pence
        expect(result.data.travelCosts).toHaveLength(1);
        expect(result.data.marketInsights.bestValueRegion).toBe(RegionCode.UK_SOUTHEAST);
      }
    });

    test('should handle invalid region comparison request', async () => {
      const invalidRequest = {
        serviceType: ServiceType.VENUE,
        regions: [RegionCode.UK_LONDON], // Only one region (need at least 2)
        weddingDate: new Date('2025-05-17'),
        guestCount: 100
      } as RegionalPricingRequest;

      const result = await regionalPricing.execute(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Pricing Integration Factory', () => {
    test('should create all integration services', () => {
      const integrations = pricingIntegrationFactory.createDefaultIntegrations();

      expect(integrations.marketPricing).toBeInstanceOf(MarketPricingIntegration);
      expect(integrations.vendorCost).toBeInstanceOf(VendorCostIntegration);
      expect(integrations.financialService).toBeInstanceOf(FinancialServiceIntegration);
      expect(integrations.regionalPricing).toBeInstanceOf(RegionalPricingService);
    });

    test('should perform health check on all services', async () => {
      const integrations = pricingIntegrationFactory.createDefaultIntegrations();
      const healthCheck = await pricingIntegrationFactory.healthCheck();

      expect(healthCheck.status).toMatch(/healthy|degraded|unhealthy/);
      expect(healthCheck.services).toHaveProperty('marketPricing');
      expect(healthCheck.services).toHaveProperty('vendorCost');
      expect(healthCheck.services).toHaveProperty('financialService');
      expect(healthCheck.services).toHaveProperty('regionalPricing');
    });

    test('should cleanup services properly', async () => {
      const integrations = pricingIntegrationFactory.createDefaultIntegrations();
      await expect(pricingIntegrationFactory.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Security and Environment Validation', () => {
    test('should validate required environment variables', () => {
      const originalEnv = process.env;
      
      // Mock missing required variables
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined
      };

      const validation = PricingIntegrationSecurity.validateEnvironment();
      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(validation.missing).toContain('SUPABASE_SERVICE_ROLE_KEY');

      // Restore environment
      process.env = originalEnv;
    });

    test('should pass validation with required variables set', () => {
      const originalEnv = process.env;
      
      // Mock with required variables
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key'
      };

      const validation = PricingIntegrationSecurity.validateEnvironment();
      expect(validation.valid).toBe(true);
      expect(validation.missing).toHaveLength(0);

      // Restore environment  
      process.env = originalEnv;
    });

    test('should check rate limits correctly', async () => {
      const canProceed = await PricingIntegrationSecurity.checkRateLimit('wedding_wire', 'market_pricing');
      expect(typeof canProceed).toBe('boolean');
    });

    test('should audit pricing operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      await PricingIntegrationSecurity.auditPricingOperation(
        'user-123',
        'org-456',
        'market_pricing_request',
        'wedding_wire',
        { serviceType: 'photography', region: 'UK-LON' }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'PRICING_AUDIT: user-123:org-456 - wedding_wire market_pricing_request',
        expect.objectContaining({
          serviceType: 'photography',
          region: 'UK-LON'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async () => {
      const marketPricing = new MarketPricingIntegration(testConfig);
      const request: MarketPricingRequest = {
        serviceType: ServiceType.PHOTOGRAPHY,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        budgetRange: {
          min: 200000,
          max: 500000,
          currency: Currency.GBP
        }
      };

      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('ENOTFOUND api.test.example.com'));

      const result = await marketPricing.execute(request);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    test('should handle invalid JSON responses', async () => {
      const marketPricing = new MarketPricingIntegration(testConfig);
      const request: MarketPricingRequest = {
        serviceType: ServiceType.VENUE,
        region: RegionCode.UK_SOUTHEAST,
        weddingDate: new Date('2025-09-20'),
        guestCount: 80,
        budgetRange: {
          min: 800000,
          max: 1500000,
          currency: Currency.GBP
        }
      };

      // Mock invalid JSON response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); },
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await marketPricing.execute(request);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle rate limit responses', async () => {
      const marketPricing = new MarketPricingIntegration(testConfig);
      const request: MarketPricingRequest = {
        serviceType: ServiceType.FLOWERS,
        region: RegionCode.UK_NORTH,
        weddingDate: new Date('2025-04-12'),
        guestCount: 60,
        budgetRange: {
          min: 50000,
          max: 150000,
          currency: Currency.GBP
        }
      };

      // Mock rate limit error
      mockFetch.mockRejectedValueOnce(new Error('HTTP 429: Rate limit exceeded, retry after 60 seconds'));

      const result = await marketPricing.execute(request);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});

// Performance and Load Testing
describe('Performance and Scalability Tests', () => {
  test('should handle concurrent requests efficiently', async () => {
    const marketPricing = new MarketPricingIntegration(testConfig);
    
    // Mock successful responses for all requests
    const mockResponse = {
      pricing_data: [],
      market_insights: { average_price: 3000, median_price: 2800, price_range_min: 2000, price_range_max: 5000, trend_direction: 'stable', trend_percentage: 0, sample_size: 100, last_updated: '2025-01-15T10:00:00Z', seasonal_trends: [], regional_comparison: [] },
      recommendations: [],
      last_updated: '2025-01-15T10:00:00Z',
      request_id: 'concurrent-req'
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      status: 200,
      statusText: 'OK'
    } as Response);

    // Create multiple concurrent requests
    const requests = Array.from({ length: 10 }, (_, i) => ({
      serviceType: ServiceType.PHOTOGRAPHY,
      region: RegionCode.UK_LONDON,
      weddingDate: new Date('2025-06-15'),
      guestCount: 100 + i * 10,
      budgetRange: {
        min: 200000,
        max: 500000,
        currency: Currency.GBP
      }
    } as MarketPricingRequest));

    const startTime = Date.now();
    const results = await Promise.all(
      requests.map(req => marketPricing.execute(req))
    );
    const endTime = Date.now();

    // All requests should succeed
    expect(results.every(r => r.success)).toBe(true);
    
    // Should complete within reasonable time (less than 2 seconds for 10 concurrent requests)
    expect(endTime - startTime).toBeLessThan(2000);
  });

  test('should handle large datasets efficiently', async () => {
    const regionalPricing = new RegionalPricingService(testConfig);
    
    // Mock response with large dataset
    const mockResponse = {
      regional_data: Array.from({ length: 100 }, (_, i) => ({
        region_code: `UK-REGION-${i}`,
        average_price: 5000 + (i * 100),
        median_price: 4800 + (i * 95),
        price_range_min: 3000 + (i * 50),
        price_range_max: 8000 + (i * 200),
        currency: 'GBP',
        availability_score: 'medium',
        seasonal_multiplier: 1.0 + (i * 0.01),
        trend_direction: 'stable',
        trend_percentage: i * 0.1,
        sample_size: 50 + i,
        last_updated: '2025-01-15T10:00:00Z',
        market_maturity: 'established',
        vendor_density: 5.0 + (i * 0.1),
        quality_score: 7.0 + (i * 0.02)
      })),
      recommendations: [],
      travel_costs: [],
      market_insights: {
        most_affordable_region: 'UK-REGION-0',
        best_value_region: 'UK-REGION-50',
        premium_region: 'UK-REGION-99',
        fastest_growing: 'UK-REGION-25',
        oversupplied_regions: [],
        undersupplied_regions: [],
        seasonal_hotspots: []
      },
      last_updated: '2025-01-15T10:00:00Z',
      request_id: 'large-dataset-req'
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
      statusText: 'OK'
    } as Response);

    const request: RegionalPricingRequest = {
      serviceType: ServiceType.VENUE,
      regions: [RegionCode.UK_LONDON, RegionCode.UK_SOUTHEAST],
      weddingDate: new Date('2025-05-17'),
      guestCount: 100
    };

    const startTime = Date.now();
    const result = await regionalPricing.execute(request);
    const endTime = Date.now();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.regionData).toHaveLength(100);
    }
    
    // Should handle large dataset within reasonable time (less than 500ms)
    expect(endTime - startTime).toBeLessThan(500);
  });
});

// Integration Testing with Mocked External Services
describe('Integration Tests with External Services', () => {
  test('should integrate multiple pricing services for complete budget analysis', async () => {
    const factory = pricingIntegrationFactory;
    const integrations = factory.createDefaultIntegrations();

    // Mock successful responses for all services
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pricing_data: [{ vendor_id: 'v1', service_type: 'photography', base_price: 2500, currency: 'GBP', region_code: 'UK-LON', valid_from: '2025-01-01T00:00:00Z', valid_until: '2025-12-31T23:59:59Z', confidence: 'high', source: 'wedding_wire', market_segment: 'premium', seasonal_factors: [], guest_count_min: 50, guest_count_max: 200 }],
          market_insights: { average_price: 2500, median_price: 2400, price_range_min: 2000, price_range_max: 3500, trend_direction: 'stable', trend_percentage: 0, sample_size: 100, last_updated: '2025-01-15T10:00:00Z', seasonal_trends: [], regional_comparison: [] },
          recommendations: [],
          last_updated: '2025-01-15T10:00:00Z',
          request_id: 'market-req'
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          vendor_id: 'vendor-123',
          quote_pricing: [{ pricing_id: 'quote-1', base_price: 2400, currency: 'GBP', service_breakdown: [] }],
          package_options: [],
          availability_status: 'available',
          valid_until: '2025-02-15T23:59:59Z',
          quotation_id: 'vendor-quote-1'
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [],
          category_breakdown: [],
          budget_comparison: { total_budget: 1000000, total_spent: 240000, total_pending: 0, remaining_budget: 760000, categories: [] },
          savings_opportunities: []
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          regional_data: [{ region_code: 'UK-LON', average_price: 2500, median_price: 2400, price_range_min: 2000, price_range_max: 3500, currency: 'GBP', availability_score: 'medium', seasonal_multiplier: 1.1, trend_direction: 'stable', trend_percentage: 0, sample_size: 100, last_updated: '2025-01-15T10:00:00Z', market_maturity: 'established', vendor_density: 7.5, quality_score: 8.2 }],
          recommendations: [],
          travel_costs: [],
          market_insights: { most_affordable_region: 'UK-SE', best_value_region: 'UK-SE', premium_region: 'UK-LON', fastest_growing: 'UK-SE', oversupplied_regions: [], undersupplied_regions: [], seasonal_hotspots: [] },
          last_updated: '2025-01-15T10:00:00Z',
          request_id: 'regional-req'
        })
      } as Response);

    // Execute all services in sequence
    const marketRequest: MarketPricingRequest = {
      serviceType: ServiceType.PHOTOGRAPHY,
      region: RegionCode.UK_LONDON,
      weddingDate: new Date('2025-06-15'),
      guestCount: 120,
      budgetRange: { min: 200000, max: 350000, currency: Currency.GBP }
    };

    const vendorRequest: VendorCostRequest = {
      vendorId: 'vendor-123',
      serviceType: ServiceType.PHOTOGRAPHY,
      weddingDate: new Date('2025-06-15'),
      guestCount: 120
    };

    const financialRequest: FinancialServiceRequest = {
      organizationId: 'org-123',
      accountConnections: [{ accountId: 'acc-1', provider: 'quickbooks', connectionStatus: 'active', lastSyncAt: new Date() }],
      dateRange: { start: new Date('2024-12-01'), end: new Date('2025-01-15') }
    };

    const regionalRequest: RegionalPricingRequest = {
      serviceType: ServiceType.PHOTOGRAPHY,
      regions: [RegionCode.UK_LONDON, RegionCode.UK_SOUTHEAST],
      weddingDate: new Date('2025-06-15'),
      guestCount: 120
    };

    const [marketResult, vendorResult, financialResult, regionalResult] = await Promise.all([
      integrations.marketPricing.execute(marketRequest),
      integrations.vendorCost.execute(vendorRequest),
      integrations.financialService.execute(financialRequest),
      integrations.regionalPricing.execute(regionalRequest)
    ]);

    // All integrations should succeed
    expect(marketResult.success).toBe(true);
    expect(vendorResult.success).toBe(true);
    expect(financialResult.success).toBe(true);
    expect(regionalResult.success).toBe(true);

    // Results should be consistent
    if (marketResult.success && vendorResult.success) {
      expect(marketResult.data.pricing[0].basePrice).toBe(250000); // £2500 in pence
      expect(vendorResult.data.quotePricing[0].basePrice).toBe(240000); // £2400 in pence
    }
  });
});