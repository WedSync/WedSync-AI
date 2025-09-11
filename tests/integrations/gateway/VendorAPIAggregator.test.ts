import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VendorAPIAggregator } from '../../../src/integrations/api-gateway/VendorAPIAggregator';

// Mock dependencies
vi.mock('../../../src/integrations/api-gateway/ExternalAPIConnector');
vi.mock('../../../src/integrations/api-gateway/CrossPlatformTransformer');

describe('VendorAPIAggregator', () => {
  let aggregator: VendorAPIAggregator;
  const mockConfig = {
    maxConcurrentRequests: 10,
    requestTimeout: 30000,
    retryAttempts: 3,
    enableCaching: true,
    cacheTTL: 300000, // 5 minutes
    enableDataQuality: true,
    dataQualityThreshold: 0.8,
    weddingVendorCategories: [
      'photography', 'catering', 'florist', 'venue', 'music', 
      'planning', 'videography', 'transportation', 'rentals',
      'beauty', 'cake', 'officiant', 'lighting', 'security', 'entertainment'
    ]
  };

  beforeEach(() => {
    aggregator = new VendorAPIAggregator(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Vendor API Registration', () => {
    it('should register vendor API successfully', async () => {
      const vendorAPI = {
        apiId: 'photography-api-1',
        name: 'Premium Photography API',
        category: 'photography',
        baseUrl: 'https://api.photography.com',
        apiKey: 'test-api-key',
        version: '2.0',
        authMethod: 'api-key',
        rateLimiting: {
          requestsPerMinute: 60,
          burstLimit: 10
        },
        endpoints: {
          search: '/vendors/search',
          details: '/vendors/{id}',
          availability: '/vendors/{id}/availability',
          pricing: '/vendors/{id}/pricing'
        },
        dataMapping: {
          id: 'vendor_id',
          name: 'business_name',
          email: 'contact_email',
          phone: 'contact_phone',
          services: 'service_list'
        },
        qualityMetrics: {
          responseTimeWeight: 0.3,
          dataCompletenessWeight: 0.4,
          accuracyWeight: 0.3
        }
      };

      const result = await aggregator.registerVendorAPI(vendorAPI);

      expect(result.success).toBe(true);
      expect(result.apiId).toBe('photography-api-1');
    });

    it('should validate vendor API configuration', async () => {
      const invalidAPI = {
        apiId: '',
        name: 'Invalid API',
        category: 'invalid-category',
        baseUrl: 'invalid-url',
        apiKey: '',
        version: '',
        authMethod: 'invalid-auth',
        rateLimiting: {},
        endpoints: {},
        dataMapping: {},
        qualityMetrics: {}
      };

      await expect(aggregator.registerVendorAPI(invalidAPI)).rejects.toThrow('Invalid vendor API configuration');
    });

    it('should handle vendor API registration with different auth methods', async () => {
      const oauthAPI = {
        apiId: 'oauth-vendor-api',
        name: 'OAuth Vendor API',
        category: 'catering',
        baseUrl: 'https://api.catering.com',
        version: '1.0',
        authMethod: 'oauth2',
        oauthConfig: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          tokenUrl: 'https://api.catering.com/oauth/token',
          scope: 'read write'
        },
        rateLimiting: { requestsPerMinute: 120 },
        endpoints: { search: '/vendors' },
        dataMapping: { id: 'id', name: 'name' },
        qualityMetrics: {}
      };

      const result = await aggregator.registerVendorAPI(oauthAPI);
      expect(result.success).toBe(true);
    });
  });

  describe('Vendor Search and Discovery', () => {
    beforeEach(async () => {
      // Register test APIs
      const photographyAPI = {
        apiId: 'photography-api',
        name: 'Photography API',
        category: 'photography',
        baseUrl: 'https://api.photography.com',
        apiKey: 'photo-key',
        version: '1.0',
        authMethod: 'api-key',
        rateLimiting: { requestsPerMinute: 60 },
        endpoints: { search: '/vendors/search' },
        dataMapping: { id: 'id', name: 'business_name', location: 'address' },
        qualityMetrics: {}
      };

      const cateringAPI = {
        apiId: 'catering-api',
        name: 'Catering API',
        category: 'catering',
        baseUrl: 'https://api.catering.com',
        apiKey: 'catering-key',
        version: '1.0',
        authMethod: 'api-key',
        rateLimiting: { requestsPerMinute: 100 },
        endpoints: { search: '/caterers/find' },
        dataMapping: { id: 'caterer_id', name: 'company_name', location: 'service_area' },
        qualityMetrics: {}
      };

      await aggregator.registerVendorAPI(photographyAPI);
      await aggregator.registerVendorAPI(cateringAPI);
    });

    it('should search vendors by category', async () => {
      const searchParams = {
        category: 'photography',
        location: {
          city: 'New York',
          state: 'NY',
          radius: 50
        },
        budget: {
          min: 1000,
          max: 5000
        },
        date: '2024-06-15',
        filters: {
          style: 'modern',
          experience: 'over-5-years'
        }
      };

      const results = await aggregator.searchVendors(searchParams);

      expect(results.success).toBe(true);
      expect(results.vendors).toBeDefined();
      expect(results.totalCount).toBeGreaterThanOrEqual(0);
      expect(results.searchMetadata).toBeDefined();
    });

    it('should aggregate results from multiple APIs', async () => {
      const searchParams = {
        categories: ['photography', 'catering'],
        location: {
          city: 'Los Angeles',
          state: 'CA',
          radius: 25
        },
        date: '2024-08-20'
      };

      const results = await aggregator.searchMultipleCategories(searchParams);

      expect(results.success).toBe(true);
      expect(results.categoryResults).toBeDefined();
      expect(Object.keys(results.categoryResults)).toContain('photography');
      expect(Object.keys(results.categoryResults)).toContain('catering');
    });

    it('should handle vendor search with advanced filters', async () => {
      const advancedSearchParams = {
        category: 'photography',
        location: {
          coordinates: { lat: 40.7128, lng: -74.0060 }, // NYC
          radius: 30
        },
        date: '2024-09-14',
        filters: {
          portfolio: {
            minPhotos: 50,
            styles: ['traditional', 'photojournalistic']
          },
          pricing: {
            packageType: 'full-day',
            includesEngagement: true
          },
          availability: {
            flexibleDates: true,
            dateRange: {
              start: '2024-09-01',
              end: '2024-09-30'
            }
          }
        },
        sorting: {
          by: 'rating',
          order: 'desc'
        },
        pagination: {
          page: 1,
          limit: 20
        }
      };

      const results = await aggregator.advancedVendorSearch(advancedSearchParams);

      expect(results.success).toBe(true);
      expect(results.vendors).toBeDefined();
      expect(results.pagination).toBeDefined();
      expect(results.appliedFilters).toBeDefined();
    });

    it('should implement vendor recommendation engine', async () => {
      const userProfile = {
        userId: 'couple-123',
        weddingDetails: {
          date: '2024-07-15',
          location: {
            city: 'San Francisco',
            state: 'CA'
          },
          style: 'modern',
          budget: 25000,
          guestCount: 150
        },
        preferences: {
          photography: {
            style: 'candid',
            importance: 'high'
          },
          catering: {
            cuisine: 'italian',
            dietary: ['vegetarian-options'],
            importance: 'high'
          }
        },
        previousInteractions: [
          { vendorId: 'photo-123', action: 'viewed', timestamp: '2024-01-15T10:00:00Z' },
          { vendorId: 'photo-456', action: 'contacted', timestamp: '2024-01-16T14:30:00Z' }
        ]
      };

      const recommendations = await aggregator.getVendorRecommendations(userProfile);

      expect(recommendations.success).toBe(true);
      expect(recommendations.recommendations).toBeDefined();
      expect(recommendations.recommendations.length).toBeGreaterThan(0);
      expect(recommendations.recommendations[0].score).toBeGreaterThan(0);
      expect(recommendations.recommendations[0].reasons).toBeDefined();
    });
  });

  describe('Data Quality and Validation', () => {
    it('should assess vendor data quality', async () => {
      const vendorData = {
        id: 'vendor-123',
        name: 'Complete Photography Studio',
        email: 'info@completephoto.com',
        phone: '+1-555-123-4567',
        website: 'https://completephoto.com',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001'
        },
        services: ['wedding photography', 'engagement sessions'],
        pricing: {
          startingPrice: 2500,
          packages: [
            { name: 'Basic', price: 2500, hours: 6 },
            { name: 'Premium', price: 4000, hours: 10 }
          ]
        },
        portfolio: [
          { url: 'https://photos.com/1.jpg', title: 'Beach Wedding' },
          { url: 'https://photos.com/2.jpg', title: 'Garden Wedding' }
        ],
        reviews: {
          average: 4.8,
          count: 127,
          recent: [
            { rating: 5, comment: 'Excellent service!', date: '2024-01-10' }
          ]
        }
      };

      const qualityAssessment = await aggregator.assessDataQuality(vendorData, 'photography');

      expect(qualityAssessment.score).toBeGreaterThan(0.8); // High quality
      expect(qualityAssessment.completeness).toBeDefined();
      expect(qualityAssessment.accuracy).toBeDefined();
      expect(qualityAssessment.freshness).toBeDefined();
      expect(qualityAssessment.suggestions).toBeDefined();
    });

    it('should identify data quality issues', async () => {
      const incompleteVendorData = {
        id: 'vendor-456',
        name: 'Incomplete Vendor',
        // Missing email, phone, address
        services: [],
        // Missing pricing, portfolio, reviews
      };

      const qualityAssessment = await aggregator.assessDataQuality(incompleteVendorData, 'photography');

      expect(qualityAssessment.score).toBeLessThan(0.5); // Low quality
      expect(qualityAssessment.issues.length).toBeGreaterThan(0);
      expect(qualityAssessment.issues).toContain('missing_contact_info');
      expect(qualityAssessment.issues).toContain('no_pricing_data');
    });

    it('should validate vendor data against category requirements', async () => {
      const photographyVendorData = {
        id: 'photo-vendor-789',
        name: 'Photo Studio',
        category: 'photography',
        equipment: ['Canon 5D Mark IV', 'Sony A7R IV'],
        specializations: ['wedding', 'portrait'],
        experience: 8, // years
        certifications: ['Professional Photographers Association'],
        insuranceCoverage: {
          liability: 2000000,
          equipment: 50000
        }
      };

      const validation = await aggregator.validateVendorData(photographyVendorData, 'photography');

      expect(validation.isValid).toBe(true);
      expect(validation.categoryCompliance).toBeDefined();
      expect(validation.missingRequirements).toHaveLength(0);
    });

    it('should flag suspicious vendor data', async () => {
      const suspiciousVendorData = {
        id: 'suspicious-vendor',
        name: 'Too Good To Be True Photography',
        pricing: {
          startingPrice: 50 // Unrealistically low for photography
        },
        reviews: {
          average: 5.0,
          count: 1000, // Very high count with perfect rating - suspicious
          recent: [] // No recent reviews despite high count
        },
        contactInfo: {
          phone: '555-0000', // Generic/fake number
          email: 'test@test.com' // Generic email
        },
        website: 'http://fake-website-12345.com'
      };

      const fraudCheck = await aggregator.checkForFraudulentData(suspiciousVendorData);

      expect(fraudCheck.riskScore).toBeGreaterThan(0.7); // High risk
      expect(fraudCheck.flags.length).toBeGreaterThan(0);
      expect(fraudCheck.flags).toContain('unrealistic_pricing');
      expect(fraudCheck.flags).toContain('suspicious_reviews');
    });
  });

  describe('Availability Checking', () => {
    it('should check vendor availability for specific date', async () => {
      const availabilityRequest = {
        vendorId: 'vendor-123',
        category: 'photography',
        date: '2024-06-15',
        duration: 8, // hours
        location: {
          city: 'Boston',
          state: 'MA'
        }
      };

      const availability = await aggregator.checkAvailability(availabilityRequest);

      expect(availability.available).toBeDefined();
      expect(availability.conflictingEvents).toBeDefined();
      expect(availability.alternativeDates).toBeDefined();
      expect(availability.pricing).toBeDefined();
    });

    it('should check availability across multiple vendors', async () => {
      const multiVendorRequest = {
        vendorIds: ['vendor-123', 'vendor-456', 'vendor-789'],
        category: 'photography',
        date: '2024-07-20',
        location: {
          coordinates: { lat: 42.3601, lng: -71.0589 }, // Boston
          radius: 25
        }
      };

      const results = await aggregator.checkMultiVendorAvailability(multiVendorRequest);

      expect(results.available).toBeDefined();
      expect(results.unavailable).toBeDefined();
      expect(results.partiallyAvailable).toBeDefined();
    });

    it('should suggest alternative dates based on availability', async () => {
      const dateRequest = {
        vendorId: 'vendor-123',
        category: 'photography',
        preferredDate: '2024-06-15',
        dateRange: {
          start: '2024-06-01',
          end: '2024-06-30'
        },
        dayOfWeekPreference: 'saturday',
        avoidDates: ['2024-06-08', '2024-06-22'] // Already booked dates
      };

      const suggestions = await aggregator.suggestAlternativeDates(dateRequest);

      expect(suggestions.alternativeDates).toBeDefined();
      expect(suggestions.alternativeDates.length).toBeGreaterThan(0);
      expect(suggestions.alternativeDates[0].date).not.toBe('2024-06-15');
      expect(suggestions.alternativeDates[0].availability).toBe(true);
      expect(suggestions.seasonalPricingImpact).toBeDefined();
    });
  });

  describe('Pricing Aggregation', () => {
    it('should aggregate pricing from multiple vendors', async () => {
      const pricingRequest = {
        category: 'photography',
        serviceType: 'wedding',
        location: {
          city: 'Chicago',
          state: 'IL'
        },
        packageDetails: {
          hours: 8,
          includes: ['ceremony', 'reception', 'online-gallery']
        },
        weddingDate: '2024-09-14'
      };

      const pricingData = await aggregator.aggregatePricing(pricingRequest);

      expect(pricingData.priceRange).toBeDefined();
      expect(pricingData.averagePrice).toBeGreaterThan(0);
      expect(pricingData.marketAnalysis).toBeDefined();
      expect(pricingData.seasonalFactors).toBeDefined();
    });

    it('should provide pricing comparison across vendors', async () => {
      const comparisonRequest = {
        vendorIds: ['vendor-123', 'vendor-456', 'vendor-789'],
        category: 'photography',
        packageRequirements: {
          hours: 10,
          photographers: 2,
          includes: ['engagement-session', 'wedding-album']
        }
      };

      const comparison = await aggregator.comparePricing(comparisonRequest);

      expect(comparison.vendors).toHaveLength(3);
      expect(comparison.vendors[0].totalPrice).toBeDefined();
      expect(comparison.vendors[0].breakdown).toBeDefined();
      expect(comparison.priceAnalysis).toBeDefined();
      expect(comparison.valueScore).toBeDefined();
    });

    it('should calculate seasonal pricing adjustments', async () => {
      const seasonalRequest = {
        category: 'photography',
        basePrice: 3000,
        weddingDate: '2024-06-15', // Peak wedding season
        location: {
          city: 'Napa',
          state: 'CA' // Premium wedding destination
        }
      };

      const seasonalPricing = await aggregator.calculateSeasonalPricing(seasonalRequest);

      expect(seasonalPricing.adjustedPrice).toBeGreaterThan(3000); // Should be higher in peak season
      expect(seasonalPricing.seasonFactor).toBeDefined();
      expect(seasonalPricing.locationFactor).toBeDefined();
      expect(seasonalPricing.demandFactor).toBeDefined();
    });
  });

  describe('Caching and Performance', () => {
    it('should cache vendor search results', async () => {
      const searchParams = {
        category: 'photography',
        location: { city: 'Seattle', state: 'WA' },
        date: '2024-05-18'
      };

      const start = Date.now();
      await aggregator.searchVendors(searchParams);
      const firstCallTime = Date.now() - start;

      const start2 = Date.now();
      await aggregator.searchVendors(searchParams);
      const secondCallTime = Date.now() - start2;

      expect(secondCallTime).toBeLessThan(firstCallTime); // Should be faster due to caching
    });

    it('should invalidate cache when vendor data changes', async () => {
      const vendorUpdate = {
        vendorId: 'vendor-123',
        updates: {
          availability: { '2024-06-15': false }, // Mark date as unavailable
          pricing: { startingPrice: 3500 } // Price increase
        }
      };

      const result = await aggregator.updateVendorData(vendorUpdate);
      expect(result.success).toBe(true);
      expect(result.cacheInvalidated).toBe(true);

      // Verify cache was cleared
      const cacheStats = await aggregator.getCacheStats();
      expect(cacheStats.invalidationCount).toBeGreaterThan(0);
    });

    it('should handle concurrent aggregation requests', async () => {
      const searchParams = {
        category: 'catering',
        location: { city: 'Miami', state: 'FL' },
        date: '2024-03-22'
      };

      const promises = Array.from({ length: 5 }, () => 
        aggregator.searchVendors(searchParams)
      );

      const results = await Promise.all(promises);

      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.vendors !== undefined)).toBe(true);
    });
  });

  describe('Analytics and Metrics', () => {
    it('should collect aggregation metrics', async () => {
      const metrics = await aggregator.getAggregationMetrics();

      expect(metrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.averageResponseTime).toBeDefined();
      expect(metrics.cacheHitRate).toBeDefined();
      expect(metrics.apiHealthScores).toBeDefined();
      expect(metrics.dataQualityScores).toBeDefined();
    });

    it('should track vendor API performance', async () => {
      const performance = await aggregator.getAPIPerformanceMetrics();

      expect(performance.apiMetrics).toBeDefined();
      expect(Object.keys(performance.apiMetrics)).toContain('photography-api');
      expect(performance.overallHealth).toBeDefined();
      expect(performance.slowestAPIs).toBeDefined();
    });

    it('should generate vendor discovery analytics', async () => {
      const analytics = await aggregator.getVendorDiscoveryAnalytics({
        timeRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        },
        categories: ['photography', 'catering'],
        location: {
          state: 'CA'
        }
      });

      expect(analytics.searchVolume).toBeDefined();
      expect(analytics.popularCategories).toBeDefined();
      expect(analytics.locationTrends).toBeDefined();
      expect(analytics.conversionRates).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle API failures gracefully', async () => {
      // Simulate API failure
      const failingAPI = {
        apiId: 'failing-api',
        name: 'Failing API',
        category: 'florist',
        baseUrl: 'https://unreachable-api.com',
        apiKey: 'test-key',
        version: '1.0',
        authMethod: 'api-key',
        rateLimiting: { requestsPerMinute: 60 },
        endpoints: { search: '/vendors' },
        dataMapping: { id: 'id', name: 'name' },
        qualityMetrics: {}
      };

      await aggregator.registerVendorAPI(failingAPI);

      const searchParams = {
        category: 'florist',
        location: { city: 'Portland', state: 'OR' }
      };

      const results = await aggregator.searchVendors(searchParams);

      // Should handle gracefully and provide partial results or appropriate error
      expect(results.success).toBeDefined();
      expect(results.errors).toBeDefined();
    });

    it('should implement circuit breaker for unreliable APIs', async () => {
      // Simulate multiple failures to trigger circuit breaker
      const unreliableAPI = {
        apiId: 'unreliable-api',
        name: 'Unreliable API',
        category: 'venue',
        baseUrl: 'https://unreliable-api.com',
        apiKey: 'test-key',
        version: '1.0',
        authMethod: 'api-key',
        rateLimiting: { requestsPerMinute: 60 },
        endpoints: { search: '/venues' },
        dataMapping: { id: 'id', name: 'name' },
        qualityMetrics: {}
      };

      await aggregator.registerVendorAPI(unreliableAPI);

      // Trigger multiple failures
      const searchParams = {
        category: 'venue',
        location: { city: 'Las Vegas', state: 'NV' }
      };

      for (let i = 0; i < 6; i++) { // Exceed failure threshold
        try {
          await aggregator.searchVendors(searchParams);
        } catch (error) {
          // Expected to fail
        }
      }

      const apiStatus = await aggregator.getAPIStatus('unreliable-api');
      expect(apiStatus.circuitBreakerState).toBe('open');
    });

    it('should provide fallback data when all APIs fail', async () => {
      const searchParams = {
        category: 'photography',
        location: { city: 'Nowhere', state: 'XX' }, // Non-existent location
        fallbackToCache: true
      };

      const results = await aggregator.searchVendors(searchParams);

      expect(results.fallbackUsed).toBe(true);
      expect(results.dataSource).toBe('cache');
    });
  });
});