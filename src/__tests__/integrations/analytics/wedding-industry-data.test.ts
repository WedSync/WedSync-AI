import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WeddingIndustryDataIntegrator } from '@/lib/integrations/analytics/wedding-industry-data';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({ error: null })),
    update: vi.fn(() => ({ error: null })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
        data: [],
        error: null,
      })),
    })),
  })),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}));

// Mock wedding industry platform responses
const mockTheKnotResponse = {
  vendors: [
    {
      id: 'tk_12345',
      name: 'Elegant Moments Photography',
      category: 'photographer',
      location: { city: 'San Francisco', state: 'CA' },
      rating: 4.8,
      reviewCount: 156,
      priceRange: '$2500-4500',
      bookingsThisYear: 45,
      averageResponseTime: '2 hours',
    },
    {
      id: 'tk_67890',
      name: 'Golden Gate Venues',
      category: 'venue',
      location: { city: 'San Francisco', state: 'CA' },
      rating: 4.6,
      reviewCount: 89,
      priceRange: '$8000-15000',
      bookingsThisYear: 28,
      capacity: '100-200',
    },
  ],
  marketTrends: {
    avgPhotographyPrice: 3200,
    avgVenuePrice: 12000,
    peakSeasonBookings: 0.68,
    offSeasonBookings: 0.32,
  },
};

const mockWeddingWireResponse = {
  suppliers: [
    {
      vendorId: 'ww_abc123',
      businessName: 'Romantic Florals Co',
      category: 'florist',
      location: 'Los Angeles, CA',
      overallRating: 4.9,
      totalReviews: 203,
      startingPrice: 850,
      completedWeddings: 78,
      responseRate: 0.95,
    },
  ],
  industryInsights: {
    categoryGrowth: {
      photographer: 0.12,
      florist: 0.08,
      venue: 0.05,
      catering: 0.15,
    },
    seasonalDemand: [
      { month: 'May', demandIndex: 1.4 },
      { month: 'June', demandIndex: 1.8 },
      { month: 'July', demandIndex: 1.6 },
      { month: 'August', demandIndex: 1.9 },
      { month: 'September', demandIndex: 2.1 },
      { month: 'October', demandIndex: 1.7 },
    ],
  },
};

const mockZolaResponse = {
  registry: {
    totalCouples: 145000,
    averageRegistryValue: 8500,
    topCategories: ['home', 'kitchen', 'experiences', 'honeymoon'],
  },
  weddingTrends: [
    { trend: 'micro_weddings', adoptionRate: 0.34, growthRate: 0.28 },
    { trend: 'outdoor_ceremonies', adoptionRate: 0.67, growthRate: 0.15 },
    { trend: 'sustainable_weddings', adoptionRate: 0.23, growthRate: 0.45 },
  ],
};

describe('WeddingIndustryDataIntegrator', () => {
  let integrator: WeddingIndustryDataIntegrator;
  const mockConfig = {
    organizationId: '550e8400-e29b-41d4-a716-446655440000',
    vendorCategory: 'photographer',
    location: 'San Francisco, CA',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    integrator = new WeddingIndustryDataIntegrator(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(integrator).toBeInstanceOf(WeddingIndustryDataIntegrator);
      expect((integrator as any).organizationId).toBe(
        mockConfig.organizationId,
      );
      expect((integrator as any).vendorCategory).toBe('photographer');
      expect((integrator as any).location).toBe('San Francisco, CA');
    });

    it('should throw error for invalid organization ID', () => {
      expect(
        () =>
          new WeddingIndustryDataIntegrator({
            organizationId: 'invalid-uuid',
            vendorCategory: 'photographer',
            location: 'Test City',
          }),
      ).toThrow('Invalid organization ID format');
    });

    it('should handle missing optional parameters', () => {
      const basicIntegrator = new WeddingIndustryDataIntegrator({
        organizationId: mockConfig.organizationId,
      });
      expect((basicIntegrator as any).vendorCategory).toBeUndefined();
      expect((basicIntegrator as any).location).toBeUndefined();
    });
  });

  describe('connectToPlatform', () => {
    it('should successfully connect to The Knot', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'theknot-api-token-123',
              api_version: 'v2.1',
              rate_limit: 1000,
            }),
        }),
      ) as any;

      const result = await integrator.connectToPlatform('theknot', {
        apiKey: 'theknot-api-key',
        partnerId: 'partner-123',
        environment: 'production',
      });

      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(result.platform).toBe('theknot');
      expect(result.capabilities).toContain('vendor_directory');
      expect(result.capabilities).toContain('market_insights');
      expect(result.dataFeatures).toContain('pricing_benchmarks');
    });

    it('should successfully connect to WeddingWire', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'authenticated',
              partner_id: 'ww-partner-456',
              access_level: 'premium',
            }),
        }),
      ) as any;

      const result = await integrator.connectToPlatform('weddingwire', {
        partnerId: 'ww-partner-456',
        apiKey: 'weddingwire-api-key',
        secretKey: 'weddingwire-secret',
      });

      expect(result.success).toBe(true);
      expect(result.platform).toBe('weddingwire');
      expect(result.capabilities).toContain('supplier_analytics');
      expect(result.capabilities).toContain('competitive_insights');
    });

    it('should successfully connect to Zola', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              auth_token: 'zola-bearer-token',
              scope: 'registry_data trends_access',
              expires_in: 7200,
            }),
        }),
      ) as any;

      const result = await integrator.connectToPlatform('zola', {
        clientId: 'zola-client-id',
        clientSecret: 'zola-client-secret',
        scope: 'registry_data trends_access',
      });

      expect(result.success).toBe(true);
      expect(result.platform).toBe('zola');
      expect(result.capabilities).toContain('trend_analysis');
      expect(result.capabilities).toContain('registry_insights');
    });

    it('should handle API authentication failures', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ error: 'Invalid API credentials' }),
        }),
      ) as any;

      const result = await integrator.connectToPlatform('theknot', {
        apiKey: 'invalid-key',
        partnerId: 'invalid-partner',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('should validate required credentials for each platform', async () => {
      await expect(
        integrator.connectToPlatform('weddingwire', {}),
      ).rejects.toThrow('Missing required credentials');

      await expect(
        integrator.connectToPlatform('zola', { clientId: 'test' }),
      ).rejects.toThrow('Missing required credentials');
    });
  });

  describe('syncIndustryData', () => {
    beforeEach(() => {
      // Mock successful authentication
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token123' }),
      });
    });

    it('should sync The Knot data with vendor benchmarking', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTheKnotResponse),
        });

      const result = await integrator.syncIndustryData('theknot', {
        syncType: 'incremental',
        dataTypes: ['vendors', 'market_trends', 'pricing_data'],
        geographicFilter: {
          state: 'CA',
          city: 'San Francisco',
          radius: 50,
        },
        vendorCategoryFilter: ['photographer', 'venue'],
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeGreaterThan(0);
      expect(result.marketIntelligence).toBeDefined();
      expect(result.marketIntelligence.competitorAnalysis).toBeDefined();
      expect(result.marketIntelligence.pricingBenchmarks).toBeDefined();
    });

    it('should sync WeddingWire supplier analytics', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'authenticated' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeddingWireResponse),
        });

      const result = await integrator.syncIndustryData('weddingwire', {
        syncType: 'full',
        includeSupplierMetrics: true,
        includeIndustryTrends: true,
        competitorAnalysis: {
          includeDirectCompetitors: true,
          includeMarketLeaders: true,
          radiusMiles: 25,
        },
      });

      expect(result.success).toBe(true);
      expect(result.marketIntelligence.industryGrowthRates).toBeDefined();
      expect(result.marketIntelligence.seasonalTrends).toBeDefined();
      expect(
        result.competitorInsights.directCompetitors.length,
      ).toBeGreaterThan(0);
    });

    it('should handle rate limiting with proper backoff', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '120' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockZolaResponse),
        });

      const result = await integrator.syncIndustryData('zola', {
        syncType: 'incremental',
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateIndustryInsights', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              insights: {
                marketPosition: 'challenger',
                competitiveStrengths: ['pricing', 'response_time'],
                growthOpportunities: [
                  'off_season_marketing',
                  'premium_packages',
                ],
                benchmarkComparisons: {
                  avgRating: { yours: 4.7, market: 4.3 },
                  avgPrice: { yours: 2850, market: 3200 },
                  responseTime: { yours: '2 hours', market: '6 hours' },
                },
              },
            }),
        }),
      ) as any;
    });

    it('should generate comprehensive market intelligence report', async () => {
      const result = await integrator.generateIndustryInsights({
        insightId: '123e4567-e89b-12d3-a456-426614174000',
        insightType: 'market_analysis',
        scope: 'regional',
        vendorCategories: ['photographer'],
        geographicFilters: {
          state: 'CA',
          city: 'San Francisco',
          radius: 50,
        },
        timeframe: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
        },
        industryDataSources: ['theknot', 'weddingwire', 'zola'],
        includeActionableRecommendations: true,
      });

      expect(result.success).toBe(true);
      expect(result.marketAnalysis).toBeDefined();
      expect(result.competitiveAnalysis).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.weddingSpecifics.seasonalPatterns).toBeDefined();
    });

    it('should provide competitive positioning analysis', async () => {
      const result = await integrator.generateIndustryInsights({
        insightId: '123e4567-e89b-12d3-a456-426614174001',
        insightType: 'competitive_intelligence',
        scope: 'local',
        competitorAnalysis: {
          includeDirectCompetitors: true,
          includeMarketLeaders: true,
          pricingComparison: true,
          serviceOfferingComparison: true,
        },
      });

      expect(result.competitiveAnalysis.directCompetitors).toBeDefined();
      expect(result.competitiveAnalysis.marketLeaders).toBeDefined();
      expect(result.competitiveAnalysis.positioning).toBeDefined();
      expect(result.competitiveAnalysis.competitiveAdvantages).toBeDefined();
    });

    it('should analyze wedding industry trends', async () => {
      const result = await integrator.generateIndustryInsights({
        insightId: '123e4567-e89b-12d3-a456-426614174002',
        insightType: 'trend_analysis',
        scope: 'national',
        timeframe: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
          compareWithPreviousPeriod: true,
        },
      });

      expect(result.weddingSpecifics.emergingTrends).toBeDefined();
      expect(result.weddingSpecifics.trendAnalysis.adoptionRates).toBeDefined();
      expect(
        result.weddingSpecifics.trendAnalysis.growthProjections,
      ).toBeDefined();
    });
  });

  describe('Wedding-specific analytics', () => {
    it('should calculate seasonal wedding demand patterns', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              seasonalData: {
                peakSeasonMonths: [
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                ],
                offSeasonMonths: ['December', 'January', 'February', 'March'],
                demandIndices: {
                  May: 1.4,
                  June: 1.8,
                  July: 1.6,
                  August: 1.9,
                  September: 2.1,
                  October: 1.7,
                  November: 1.2,
                },
              },
            }),
        }),
      ) as any;

      const result = await integrator.analyzeSeasonalDemand(
        ['theknot', 'weddingwire'],
        {
          analysisYear: 2024,
          includeWeatherCorrelation: true,
          includeHolidayImpact: true,
          geographicScope: 'national',
        },
      );

      expect(result.success).toBe(true);
      expect(result.seasonalPatterns).toBeDefined();
      expect(result.seasonalPatterns.peakSeasonMonths.length).toBeGreaterThan(
        0,
      );
      expect(result.seasonalPatterns.demandIndices).toBeDefined();
      expect(result.seasonalPatterns.weatherCorrelation).toBeDefined();
    });

    it('should analyze vendor category performance', async () => {
      const result = await integrator.analyzeVendorPerformance({
        categories: ['photographer', 'venue', 'florist', 'catering'],
        metrics: [
          'booking_volume',
          'average_price',
          'customer_satisfaction',
          'market_share',
        ],
        geographicScope: 'regional',
        timeframe: 'ytd',
      });

      expect(result.success).toBe(true);
      expect(result.categoryPerformance).toBeDefined();
      expect(result.categoryPerformance.photographer).toBeDefined();
      expect(result.marketShareAnalysis).toBeDefined();
      expect(result.pricingTrends).toBeDefined();
    });

    it('should identify wedding planning timeline patterns', async () => {
      const result = await integrator.analyzePlanningTimelines(
        ['zola', 'theknot'],
        {
          analysisType: 'comprehensive',
          includeVendorBookingTimelines: true,
          includeBudgetAllocationTimelines: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.planningTimelines).toBeDefined();
      expect(result.planningTimelines.averageEngagementLength).toBeDefined();
      expect(result.planningTimelines.vendorBookingMilestones).toBeDefined();
      expect(result.planningTimelines.budgetAllocationPatterns).toBeDefined();
    });
  });

  describe('Competitive intelligence', () => {
    it('should identify direct competitors with detailed analysis', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              competitors: [
                {
                  name: 'Elite Wedding Photography',
                  category: 'photographer',
                  location: 'San Francisco, CA',
                  marketPosition: 'leader',
                  strengths: ['premium_pricing', 'luxury_clientele'],
                  weaknesses: ['limited_availability', 'high_price_point'],
                  marketShare: 0.15,
                  averageBookingValue: 4500,
                },
              ],
            }),
        }),
      ) as any;

      const result = await integrator.identifyCompetitors({
        vendorCategory: 'photographer',
        geographicScope: {
          city: 'San Francisco',
          state: 'CA',
          radius: 25,
        },
        competitorTypes: ['direct', 'indirect', 'aspirational'],
        analysisDepth: 'comprehensive',
      });

      expect(result.success).toBe(true);
      expect(result.directCompetitors.length).toBeGreaterThan(0);
      expect(result.competitiveMap).toBeDefined();
      expect(result.marketPositioning).toBeDefined();
      expect(result.threatAnalysis).toBeDefined();
    });

    it('should analyze competitor pricing strategies', async () => {
      const result = await integrator.analyzePricingStrategies({
        competitorSet: 'direct_competitors',
        pricingModels: ['package_based', 'hourly', 'value_based'],
        includeSeasonalPricing: true,
        includeBundlingAnalysis: true,
      });

      expect(result.success).toBe(true);
      expect(result.pricingAnalysis).toBeDefined();
      expect(result.pricingAnalysis.marketPriceRanges).toBeDefined();
      expect(result.pricingAnalysis.seasonalPricingPatterns).toBeDefined();
      expect(result.pricingOptimizationRecommendations).toBeDefined();
    });

    it('should track competitor service offerings and differentiation', async () => {
      const result = await integrator.analyzeServiceOfferings({
        competitorAnalysisScope: 'local_market',
        serviceCategories: ['photography', 'videography', 'editing', 'albums'],
        differentiationFactors: [
          'style',
          'delivery_time',
          'package_inclusions',
        ],
        gapAnalysis: true,
      });

      expect(result.success).toBe(true);
      expect(result.serviceComparison).toBeDefined();
      expect(result.marketGaps).toBeDefined();
      expect(result.differentiationOpportunities).toBeDefined();
    });
  });

  describe('Market opportunity analysis', () => {
    it('should identify underserved market segments', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              marketOpportunities: {
                underservedSegments: [
                  {
                    segment: 'micro_weddings',
                    demandGrowth: 0.35,
                    competitionLevel: 'low',
                    revenueOpportunity: 125000,
                  },
                  {
                    segment: 'destination_weddings',
                    demandGrowth: 0.22,
                    competitionLevel: 'medium',
                    revenueOpportunity: 85000,
                  },
                ],
              },
            }),
        }),
      ) as any;

      const result = await integrator.identifyMarketOpportunities({
        analysisScope: 'regional',
        opportunityTypes: [
          'underserved_segments',
          'emerging_trends',
          'geographic_expansion',
        ],
        riskAssessment: true,
        revenueProjections: true,
      });

      expect(result.success).toBe(true);
      expect(result.marketOpportunities).toBeDefined();
      expect(result.marketOpportunities.underservedSegments).toBeDefined();
      expect(result.opportunityScoring).toBeDefined();
      expect(result.implementationRoadmap).toBeDefined();
    });

    it('should analyze geographic expansion opportunities', async () => {
      const result = await integrator.analyzeGeographicOpportunities({
        currentMarkets: ['San Francisco, CA'],
        expansionRadius: [50, 100, 200], // miles
        expansionCriteria: ['market_size', 'competition_level', 'price_points'],
        includeMarketPenetration: true,
      });

      expect(result.success).toBe(true);
      expect(result.expansionOpportunities).toBeDefined();
      expect(result.marketSizingAnalysis).toBeDefined();
      expect(result.competitionMapping).toBeDefined();
      expect(result.expansionRecommendations).toBeDefined();
    });
  });

  describe('Data quality and validation', () => {
    it('should validate industry data quality across platforms', async () => {
      const result = await integrator.validateDataQuality(
        ['theknot', 'weddingwire', 'zola'],
        {
          validationRules: [
            'price_range_consistency',
            'rating_score_validation',
            'location_accuracy',
            'category_classification',
          ],
          crossPlatformConsistency: true,
          dataFreshnessCheck: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.validationResults).toBeDefined();
      expect(result.crossPlatformConsistency).toBeDefined();
      expect(result.dataFreshnessReport).toBeDefined();
    });

    it('should detect and flag data anomalies', async () => {
      const result = await integrator.detectDataAnomalies({
        anomalyTypes: [
          'price_outliers',
          'rating_anomalies',
          'booking_volume_spikes',
        ],
        sensitivityLevel: 'medium',
        timeframeDays: 30,
      });

      expect(result.success).toBe(true);
      expect(result.anomalies).toBeDefined();
      expect(result.anomalies.priceOutliers).toBeDefined();
      expect(result.anomalies.ratingAnomalies).toBeDefined();
      expect(result.confidenceScores).toBeDefined();
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle platform API downtime gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Service unavailable')),
      ) as any;

      const result = await integrator.syncIndustryData('theknot', {
        syncType: 'incremental',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');
      expect(result.retryStrategy).toBeDefined();
    });

    it('should validate insight generation parameters', async () => {
      await expect(
        integrator.generateIndustryInsights({
          insightId: 'invalid-uuid',
          insightType: 'market_analysis',
        }),
      ).rejects.toThrow('Invalid insight ID format');

      await expect(
        integrator.generateIndustryInsights({
          insightId: '123e4567-e89b-12d3-a456-426614174000',
          insightType: 'invalid_type' as any,
        }),
      ).rejects.toThrow('Invalid insight type');
    });

    it('should handle incomplete or corrupted data sources', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              vendors: [], // Empty data
              status: 'partial_success',
              warnings: ['Some data sources unavailable'],
            }),
        }),
      ) as any;

      const result = await integrator.syncIndustryData('weddingwire', {
        syncType: 'full',
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(0);
      expect(result.warnings).toContain('Some data sources unavailable');
      expect(result.status).toBe('partial_success');
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large-scale data synchronization efficiently', async () => {
      const largeVendorDataset = Array(5000)
        .fill(null)
        .map((_, i) => ({
          id: `vendor_${i}`,
          name: `Wedding Vendor ${i}`,
          category: ['photographer', 'venue', 'florist'][i % 3],
          location: `City ${i % 100}, State`,
          rating: 3.5 + (i % 20) * 0.1,
        }));

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ vendors: largeVendorDataset }),
        }),
      ) as any;

      const startTime = Date.now();
      const result = await integrator.syncIndustryData('theknot', {
        syncType: 'full',
        batchSize: 500,
        parallelProcessing: true,
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(5000);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.batchProcessingUsed).toBe(true);
    });

    it('should implement efficient caching for repeated queries', async () => {
      const result1 = await integrator.syncIndustryData('weddingwire', {
        syncType: 'incremental',
        enableCaching: true,
        cacheDuration: '2_hours',
      });

      const result2 = await integrator.syncIndustryData('weddingwire', {
        syncType: 'incremental',
        enableCaching: true,
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.cacheHit).toBe(true);
      expect(result2.responseTime).toBeLessThan(result1.responseTime);
    });

    it('should optimize API calls for cost efficiency', async () => {
      const result = await integrator.syncIndustryData('zola', {
        syncType: 'incremental',
        costOptimization: true,
        apiCallBudget: 1000,
        prioritizeHighValueData: true,
      });

      expect(result.success).toBe(true);
      expect(result.apiCallsUsed).toBeLessThanOrEqual(1000);
      expect(result.costOptimizationUsed).toBe(true);
      expect(result.dataPrioritization).toBeDefined();
    });
  });
});
