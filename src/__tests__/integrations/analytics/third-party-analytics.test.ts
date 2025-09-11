import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThirdPartyAnalyticsIntegrator } from '@/lib/integrations/analytics/third-party-analytics';

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

// Mock third-party analytics platform responses
const mockGoogleAnalyticsResponse = {
  reports: [
    {
      data: {
        rows: [
          {
            dimensions: ['2024-06-01'],
            metrics: [{ values: ['1250', '850', '3.4'] }],
          },
          {
            dimensions: ['2024-07-01'],
            metrics: [{ values: ['1850', '1200', '4.2'] }],
          },
          {
            dimensions: ['2024-08-01'],
            metrics: [{ values: ['2100', '1450', '4.8'] }],
          },
        ],
        totals: [{ values: ['5200', '3500', '4.13'] }],
      },
    },
  ],
};

const mockMixpanelResponse = {
  events: {
    wedding_booking_started: {
      '2024-06-01': 145,
      '2024-07-01': 230,
      '2024-08-01': 285,
    },
    wedding_booking_completed: {
      '2024-06-01': 89,
      '2024-07-01': 156,
      '2024-08-01': 195,
    },
    vendor_profile_viewed: {
      '2024-06-01': 2850,
      '2024-07-01': 4200,
      '2024-08-01': 4950,
    },
  },
  people: {
    total: 12450,
    active_last_30_days: 3200,
  },
};

const mockAmplitudeResponse = {
  data: {
    series: [
      [89, 156, 195], // wedding_booking_completed
      [2850, 4200, 4950], // vendor_profile_viewed
      [145, 230, 285], // wedding_booking_started
    ],
    seriesLabels: ['Wedding Bookings', 'Profile Views', 'Booking Starts'],
    xValues: ['2024-06-01', '2024-07-01', '2024-08-01'],
  },
};

const mockSegmentResponse = {
  tracks: [
    {
      event: 'Wedding Booking Completed',
      properties: {
        booking_value: 2850,
        vendor_category: 'photographer',
        wedding_date: '2024-09-15',
        guest_count: 120,
      },
      timestamp: '2024-08-01T14:30:00Z',
    },
    {
      event: 'Vendor Inquiry Sent',
      properties: {
        vendor_category: 'venue',
        inquiry_type: 'pricing',
        budget_range: '15000-20000',
      },
      timestamp: '2024-08-01T15:45:00Z',
    },
  ],
};

describe('ThirdPartyAnalyticsIntegrator', () => {
  let integrator: ThirdPartyAnalyticsIntegrator;
  const mockConfig = {
    organizationId: '550e8400-e29b-41d4-a716-446655440000',
    weddingEventTracking: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    integrator = new ThirdPartyAnalyticsIntegrator(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(integrator).toBeInstanceOf(ThirdPartyAnalyticsIntegrator);
      expect((integrator as any).organizationId).toBe(
        mockConfig.organizationId,
      );
      expect((integrator as any).weddingEventTracking).toBe(true);
    });

    it('should throw error for invalid organization ID', () => {
      expect(
        () =>
          new ThirdPartyAnalyticsIntegrator({
            organizationId: 'invalid-uuid',
            weddingEventTracking: false,
          }),
      ).toThrow('Invalid organization ID format');
    });

    it('should initialize without wedding event tracking', () => {
      const basicIntegrator = new ThirdPartyAnalyticsIntegrator({
        organizationId: mockConfig.organizationId,
        weddingEventTracking: false,
      });
      expect((basicIntegrator as any).weddingEventTracking).toBe(false);
    });
  });

  describe('connectToPlatform', () => {
    it('should successfully connect to Google Analytics', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'ga-oauth-token-123',
              token_type: 'Bearer',
              expires_in: 3600,
              scope: 'https://www.googleapis.com/auth/analytics.readonly',
            }),
        }),
      ) as any;

      const result = await integrator.connectToPlatform('google_analytics', {
        clientId: 'ga-client-id',
        clientSecret: 'ga-client-secret',
        refreshToken: 'ga-refresh-token',
        viewId: '123456789',
      });

      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(result.platform).toBe('google_analytics');
      expect(result.capabilities).toContain('conversion_tracking');
      expect(result.weddingFeatures).toContain('seasonal_analysis');
    });

    it('should successfully connect to Mixpanel', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'ok',
              project_id: 'mixpanel-project-123',
            }),
        }),
      ) as any;

      const result = await integrator.connectToPlatform('mixpanel', {
        apiKey: 'mixpanel-api-key',
        apiSecret: 'mixpanel-secret',
        projectId: 'mixpanel-project-123',
      });

      expect(result.success).toBe(true);
      expect(result.platform).toBe('mixpanel');
      expect(result.capabilities).toContain('event_tracking');
      expect(result.capabilities).toContain('funnel_analysis');
    });

    it('should successfully connect to Amplitude', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              app_id: 'amplitude-app-123',
            }),
        }),
      ) as any;

      const result = await integrator.connectToPlatform('amplitude', {
        apiKey: 'amplitude-api-key',
        secretKey: 'amplitude-secret',
        appId: 'amplitude-app-123',
      });

      expect(result.success).toBe(true);
      expect(result.platform).toBe('amplitude');
      expect(result.capabilities).toContain('cohort_analysis');
      expect(result.capabilities).toContain('behavioral_analytics');
    });

    it('should handle authentication failures', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Invalid API key' }),
        }),
      ) as any;

      const result = await integrator.connectToPlatform('mixpanel', {
        apiKey: 'invalid-key',
        apiSecret: 'invalid-secret',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('should validate required credentials for each platform', async () => {
      await expect(
        integrator.connectToPlatform('google_analytics', {}),
      ).rejects.toThrow('Missing required credentials');

      await expect(
        integrator.connectToPlatform('segment', { writeKey: 'test' }),
      ).rejects.toThrow('Missing required credentials');
    });
  });

  describe('syncPlatform', () => {
    beforeEach(() => {
      // Mock successful authentication
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token123' }),
      });
    });

    it('should sync Google Analytics with wedding event tracking', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGoogleAnalyticsResponse),
        });

      const result = await integrator.syncPlatform('google_analytics', {
        syncType: 'incremental',
        dateRange: {
          start: '2024-06-01T00:00:00Z',
          end: '2024-08-31T23:59:59Z',
        },
        weddingEventFilter: true,
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeGreaterThan(0);
      expect(result.weddingMetrics).toBeDefined();
      expect(result.weddingMetrics.seasonalTrends.length).toBeGreaterThan(0);
      expect(result.platformSpecific.reports).toBe(1);
    });

    it('should sync Mixpanel with wedding funnel analysis', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'ok' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMixpanelResponse),
        });

      const result = await integrator.syncPlatform('mixpanel', {
        syncType: 'incremental',
        includeWeddingFunnel: true,
        events: [
          'wedding_booking_started',
          'wedding_booking_completed',
          'vendor_profile_viewed',
        ],
      });

      expect(result.success).toBe(true);
      expect(result.weddingMetrics.funnelAnalysis).toBeDefined();
      expect(
        result.weddingMetrics.conversionRates.booking_completion,
      ).toBeGreaterThan(0);
    });

    it('should handle rate limiting with exponential backoff', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '60' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAmplitudeResponse),
        });

      const result = await integrator.syncPlatform('amplitude', {
        syncType: 'incremental',
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('consolidateAnalytics', () => {
    beforeEach(() => {
      // Mock successful connections to all platforms
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });

    it('should consolidate data across multiple analytics platforms', async () => {
      const result = await integrator.consolidateAnalytics(
        ['google_analytics', 'mixpanel', 'amplitude'],
        {
          dateRange: {
            start: '2024-06-01T00:00:00Z',
            end: '2024-08-31T23:59:59Z',
          },
          metrics: [
            'user_acquisition',
            'engagement_metrics',
            'conversion_rates',
            'retention_analysis',
          ],
          weddingSpecificConsolidation: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.platformsProcessed).toBe(3);
      expect(result.consolidatedMetrics).toBeDefined();
      expect(result.weddingInsights).toBeDefined();
      expect(result.weddingInsights.seasonalPatterns).toBeDefined();
    });

    it('should detect data discrepancies across platforms', async () => {
      const result = await integrator.consolidateAnalytics(
        ['google_analytics', 'mixpanel'],
        {
          includeDiscrepancyAnalysis: true,
          toleranceThreshold: 0.05, // 5% tolerance
        },
      );

      expect(result.dataQuality).toBeDefined();
      expect(result.dataQuality.discrepancyAnalysis).toBeDefined();
      expect(result.dataQuality.crossPlatformConsistency).toBeDefined();
    });
  });

  describe('generateWeddingInsights', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              insights: {
                seasonalTrends: [
                  { month: 'June', bookingIndex: 1.8, conversionRate: 0.24 },
                  { month: 'July', bookingIndex: 2.1, conversionRate: 0.28 },
                  { month: 'August', bookingIndex: 2.4, conversionRate: 0.31 },
                ],
                vendorPerformance: {
                  photographer: {
                    avgBookingValue: 2850,
                    satisfactionScore: 4.7,
                  },
                  venue: { avgBookingValue: 8500, satisfactionScore: 4.5 },
                  catering: { avgBookingValue: 4200, satisfactionScore: 4.6 },
                },
              },
            }),
        }),
      ) as any;
    });

    it('should generate comprehensive wedding industry insights', async () => {
      const result = await integrator.generateWeddingInsights({
        platforms: ['google_analytics', 'mixpanel', 'amplitude'],
        analysisType: 'comprehensive',
        timeframe: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
        },
        includeSeasonalAnalysis: true,
        includeVendorPerformance: true,
        includeCustomerJourney: true,
      });

      expect(result.success).toBe(true);
      expect(result.insights).toBeDefined();
      expect(result.insights.seasonalTrends).toBeDefined();
      expect(result.insights.vendorPerformance).toBeDefined();
      expect(result.insights.customerJourneyMetrics).toBeDefined();
    });

    it('should provide actionable recommendations', async () => {
      const result = await integrator.generateWeddingInsights({
        platforms: ['google_analytics', 'mixpanel'],
        analysisType: 'optimization_focused',
        includeRecommendations: true,
      });

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toHaveProperty('category');
      expect(result.recommendations[0]).toHaveProperty('priority');
      expect(result.recommendations[0]).toHaveProperty('weddingSpecificValue');
    });
  });

  describe('Wedding event tracking', () => {
    it('should track wedding-specific events with proper categorization', async () => {
      const result = await integrator.trackWeddingEvent(
        'wedding_booking_completed',
        {
          vendorCategory: 'photographer',
          bookingValue: 2850,
          weddingDate: '2024-09-15T16:00:00Z',
          guestCount: 120,
          venue: 'outdoor',
          seasonCategory: 'peak',
        },
      );

      expect(result.success).toBe(true);
      expect(result.eventCategory).toBe('wedding_milestone');
      expect(result.weddingMetadata).toBeDefined();
      expect(result.weddingMetadata.seasonCategory).toBe('peak');
    });

    it('should calculate wedding conversion funnel metrics', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              funnel: {
                stages: [
                  { name: 'vendor_search', count: 1000 },
                  { name: 'profile_view', count: 750 },
                  { name: 'inquiry_sent', count: 300 },
                  { name: 'quote_received', count: 180 },
                  { name: 'booking_completed', count: 85 },
                ],
                conversionRates: {
                  vendor_search_to_profile_view: 0.75,
                  profile_view_to_inquiry: 0.4,
                  inquiry_to_quote: 0.6,
                  quote_to_booking: 0.47,
                },
              },
            }),
        }),
      ) as any;

      const result = await integrator.calculateWeddingFunnel(
        ['mixpanel', 'amplitude'],
        {
          funnelStages: [
            'vendor_search',
            'profile_view',
            'inquiry_sent',
            'quote_received',
            'booking_completed',
          ],
          timeframe: {
            start: '2024-06-01T00:00:00Z',
            end: '2024-08-31T23:59:59Z',
          },
        },
      );

      expect(result.success).toBe(true);
      expect(result.funnelMetrics).toBeDefined();
      expect(result.funnelMetrics.overallConversionRate).toBeGreaterThan(0);
      expect(result.funnelMetrics.bottleneckStage).toBeDefined();
    });

    it('should analyze seasonal wedding patterns', async () => {
      const result = await integrator.analyzeSeasonalPatterns(
        ['google_analytics', 'mixpanel'],
        {
          analysisType: 'comprehensive',
          includeWeatherCorrelation: true,
          includeVendorAvailability: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.seasonalInsights).toBeDefined();
      expect(result.seasonalInsights.peakSeasonMonths).toBeDefined();
      expect(result.seasonalInsights.offSeasonOpportunities).toBeDefined();
      expect(result.seasonalInsights.weatherImpactAnalysis).toBeDefined();
    });
  });

  describe('Cross-platform attribution', () => {
    it('should implement wedding-specific attribution modeling', async () => {
      const result = await integrator.buildAttributionModel(
        ['google_analytics', 'mixpanel', 'segment'],
        {
          attributionModel: 'wedding_journey',
          touchpointWeights: {
            first_touch: 0.2,
            middle_touch: 0.3,
            last_touch: 0.5,
          },
          weddingSpecificTouchpoints: [
            'initial_search',
            'vendor_profile_view',
            'inquiry_submission',
            'quote_comparison',
            'booking_completion',
          ],
        },
      );

      expect(result.success).toBe(true);
      expect(result.attributionModel).toBeDefined();
      expect(result.attributionModel.weddingJourneyOptimized).toBe(true);
      expect(result.touchpointAnalysis).toBeDefined();
    });

    it('should calculate vendor contribution across all touchpoints', async () => {
      const result = await integrator.calculateVendorAttribution({
        vendorCategories: ['photographer', 'venue', 'catering', 'florist'],
        attributionWindow: '90_days',
        includeAssistAttribution: true,
      });

      expect(result.success).toBe(true);
      expect(result.vendorAttribution).toBeDefined();
      expect(result.vendorAttribution.photographer).toBeDefined();
      expect(result.crossVendorInfluence).toBeDefined();
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle platform API outages gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error')),
      ) as any;

      const result = await integrator.syncPlatform('google_analytics', {
        syncType: 'incremental',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.retryRecommended).toBe(true);
    });

    it('should validate event tracking parameters', async () => {
      await expect(
        integrator.trackWeddingEvent('invalid_event' as any, {}),
      ).rejects.toThrow('Invalid wedding event type');

      await expect(
        integrator.trackWeddingEvent('wedding_booking_completed', {
          bookingValue: -100, // Invalid negative value
        }),
      ).rejects.toThrow('Invalid booking value');
    });

    it('should handle incomplete data gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: null, // No data returned
              status: 'success',
            }),
        }),
      ) as any;

      const result = await integrator.syncPlatform('mixpanel', {
        syncType: 'incremental',
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(0);
      expect(result.warnings).toContain('No data available for sync period');
    });
  });

  describe('Performance optimization', () => {
    it('should batch API requests for better performance', async () => {
      const result = await integrator.syncPlatform('amplitude', {
        syncType: 'full',
        batchSize: 1000,
        parallelRequests: 5,
      });

      expect(result.success).toBe(true);
      expect(result.batchingUsed).toBe(true);
      expect(result.performance.totalBatches).toBeGreaterThan(0);
      expect(result.performance.avgBatchTime).toBeDefined();
    });

    it('should implement data compression for large datasets', async () => {
      const largeDataset = Array(10000)
        .fill(null)
        .map((_, i) => ({
          event: 'vendor_profile_view',
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          properties: { vendor_id: `vendor_${i}` },
        }));

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ events: largeDataset }),
        }),
      ) as any;

      const result = await integrator.syncPlatform('segment', {
        syncType: 'full',
        enableCompression: true,
      });

      expect(result.success).toBe(true);
      expect(result.compressionUsed).toBe(true);
      expect(result.compressionRatio).toBeGreaterThan(0);
    });

    it('should cache frequently accessed data', async () => {
      const result = await integrator.syncPlatform('google_analytics', {
        syncType: 'incremental',
        enableCaching: true,
        cacheDuration: '1_hour',
      });

      expect(result.success).toBe(true);
      expect(result.cacheStatus).toBeDefined();

      // Second request should use cache
      const cachedResult = await integrator.syncPlatform('google_analytics', {
        syncType: 'incremental',
        enableCaching: true,
      });

      expect(cachedResult.cacheHit).toBe(true);
    });
  });
});
