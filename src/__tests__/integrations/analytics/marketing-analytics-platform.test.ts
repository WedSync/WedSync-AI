import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MarketingAnalyticsPlatform } from '@/lib/integrations/analytics/marketing-analytics-platform';

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

// Mock marketing platform responses
const mockFacebookAdsResponse = {
  data: [
    {
      id: '23843197876390014',
      name: 'Wedding Photography Lead Generation',
      account_id: '123456789',
      campaign_id: '23843197876390014',
      spend: '285.67',
      impressions: '12450',
      clicks: '342',
      actions: [
        { action_type: 'link_click', value: '342' },
        { action_type: 'lead', value: '28' },
        { action_type: 'landing_page_view', value: '298' },
      ],
      cost_per_action_type: [{ action_type: 'lead', value: '10.20' }],
      date_start: '2024-07-01',
      date_stop: '2024-07-31',
    },
  ],
  paging: {
    cursors: {
      before: 'before_cursor',
      after: 'after_cursor',
    },
  },
};

const mockGoogleAdsResponse = {
  results: [
    {
      campaign: {
        resourceName: 'customers/123456/campaigns/987654321',
        name: 'Summer Wedding Photography Ads',
        id: '987654321',
        status: 'ENABLED',
      },
      metrics: {
        impressions: '18650',
        clicks: '456',
        conversions: 34.0,
        cost_micros: '425670000', // $425.67
        ctr: 0.02446,
        average_cpc: '933542', // $0.93
        cost_per_conversion: '12519412', // $12.52
      },
      segments: {
        date: '2024-07-15',
      },
    },
  ],
};

const mockInstagramResponse = {
  data: [
    {
      id: '17841405309213314',
      username: 'elegant_weddings_sf',
      media_count: 145,
      followers_count: 8950,
      follows_count: 1200,
      media: [
        {
          id: '17895695668004550',
          media_type: 'IMAGE',
          media_url: 'https://instagram.com/image1.jpg',
          timestamp: '2024-07-15T14:30:00+0000',
          like_count: 245,
          comments_count: 18,
          caption:
            'Beautiful summer wedding at Golden Gate Park! 📸✨ #weddingphotography #sanfrancisco',
        },
      ],
    },
  ],
};

const mockMailchimpResponse = {
  campaigns: [
    {
      id: 'campaign123456',
      web_id: 42,
      type: 'regular',
      status: 'sent',
      emails_sent: 2500,
      settings: {
        subject_line: 'Summer Wedding Special - 20% Off Photography Packages',
        title: 'Summer Wedding Promotion',
      },
      report_summary: {
        opens: 650,
        unique_opens: 578,
        open_rate: 0.2312,
        clicks: 125,
        subscriber_clicks: 98,
        click_rate: 0.05,
        unsubscribed: 8,
      },
      send_time: '2024-07-10T15:00:00Z',
    },
  ],
};

describe('MarketingAnalyticsPlatform', () => {
  let platform: MarketingAnalyticsPlatform;
  const mockConfig = {
    organizationId: '550e8400-e29b-41d4-a716-446655440000',
    weddingVendorOptimized: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    platform = new MarketingAnalyticsPlatform(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(platform).toBeInstanceOf(MarketingAnalyticsPlatform);
      expect((platform as any).organizationId).toBe(mockConfig.organizationId);
      expect((platform as any).weddingVendorOptimized).toBe(true);
    });

    it('should throw error for invalid organization ID', () => {
      expect(
        () =>
          new MarketingAnalyticsPlatform({
            organizationId: 'invalid-uuid',
            weddingVendorOptimized: false,
          }),
      ).toThrow('Invalid organization ID format');
    });

    it('should initialize without wedding vendor optimization', () => {
      const basicPlatform = new MarketingAnalyticsPlatform({
        organizationId: mockConfig.organizationId,
        weddingVendorOptimized: false,
      });
      expect((basicPlatform as any).weddingVendorOptimized).toBe(false);
    });
  });

  describe('connectToPlatform', () => {
    it('should successfully connect to Facebook Ads', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'facebook-long-lived-token',
              token_type: 'bearer',
              expires_in: 5183944, // ~60 days
            }),
        }),
      ) as any;

      const result = await platform.connectToPlatform('facebook_ads', {
        appId: 'facebook-app-id',
        appSecret: 'facebook-app-secret',
        accessToken: 'facebook-user-token',
        adAccountId: 'act_123456789',
      });

      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(result.platform).toBe('facebook_ads');
      expect(result.capabilities).toContain('campaign_management');
      expect(result.capabilities).toContain('audience_insights');
      expect(result.weddingFeatures).toContain('seasonal_targeting');
    });

    it('should successfully connect to Google Ads', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'google-oauth-token',
              token_type: 'Bearer',
              expires_in: 3600,
              scope: 'https://www.googleapis.com/auth/adwords',
            }),
        }),
      ) as any;

      const result = await platform.connectToPlatform('google_ads', {
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
        refreshToken: 'google-refresh-token',
        developerId: 'google-developer-token',
        customerId: '123-456-7890',
      });

      expect(result.success).toBe(true);
      expect(result.platform).toBe('google_ads');
      expect(result.capabilities).toContain('keyword_insights');
      expect(result.capabilities).toContain('conversion_tracking');
    });

    it('should successfully connect to Instagram Business', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'instagram-access-token',
              account_type: 'BUSINESS',
              media_count: 145,
            }),
        }),
      ) as any;

      const result = await platform.connectToPlatform('instagram', {
        accessToken: 'instagram-access-token',
        businessAccountId: 'instagram-business-123',
      });

      expect(result.success).toBe(true);
      expect(result.platform).toBe('instagram');
      expect(result.capabilities).toContain('content_analytics');
      expect(result.capabilities).toContain('hashtag_insights');
    });

    it('should successfully connect to Mailchimp', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              account_id: 'mailchimp-account-123',
              account_name: 'Wedding Photography Business',
              total_subscribers: 2500,
            }),
        }),
      ) as any;

      const result = await platform.connectToPlatform('mailchimp', {
        apiKey: 'mailchimp-api-key-us1',
        serverPrefix: 'us1',
      });

      expect(result.success).toBe(true);
      expect(result.platform).toBe('mailchimp');
      expect(result.capabilities).toContain('email_analytics');
      expect(result.capabilities).toContain('automation_reporting');
    });

    it('should handle authentication failures', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Invalid access token' }),
        }),
      ) as any;

      const result = await platform.connectToPlatform('facebook_ads', {
        accessToken: 'invalid-token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('should validate required credentials for each platform', async () => {
      await expect(
        platform.connectToPlatform('google_ads', {}),
      ).rejects.toThrow('Missing required credentials');

      await expect(
        platform.connectToPlatform('mailchimp', { apiKey: 'test' }),
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

    it('should sync Facebook Ads data with wedding campaign optimization', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFacebookAdsResponse),
        });

      const result = await platform.syncPlatform('facebook_ads', {
        syncType: 'incremental',
        dateRange: {
          start: '2024-07-01T00:00:00Z',
          end: '2024-07-31T23:59:59Z',
        },
        campaignTypes: ['lead_generation', 'brand_awareness', 'conversions'],
        weddingSeasonFocus: true,
        includeAudienceInsights: true,
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeGreaterThan(0);
      expect(result.weddingInsights).toBeDefined();
      expect(result.weddingInsights.seasonalPerformance).toBeDefined();
      expect(result.campaignMetrics.totalSpend).toBeGreaterThan(0);
      expect(result.campaignMetrics.totalImpressions).toBeGreaterThan(0);
    });

    it('should sync Google Ads data with keyword insights', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGoogleAdsResponse),
        });

      const result = await platform.syncPlatform('google_ads', {
        syncType: 'full',
        includeKeywordData: true,
        includeSearchTerms: true,
        weddingKeywordFocus: [
          'wedding photographer',
          'bridal photography',
          'engagement photos',
        ],
        competitorAnalysis: true,
      });

      expect(result.success).toBe(true);
      expect(result.keywordInsights).toBeDefined();
      expect(result.keywordInsights.weddingKeywords).toBeDefined();
      expect(result.searchTermAnalysis).toBeDefined();
      expect(result.competitorKeywords).toBeDefined();
    });

    it('should sync Instagram content analytics', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockInstagramResponse),
        });

      const result = await platform.syncPlatform('instagram', {
        syncType: 'incremental',
        includeContentAnalytics: true,
        includeHashtagPerformance: true,
        weddingContentFilter: true,
        audienceInsights: true,
      });

      expect(result.success).toBe(true);
      expect(result.contentAnalytics).toBeDefined();
      expect(result.hashtagPerformance).toBeDefined();
      expect(result.weddingContentMetrics).toBeDefined();
      expect(result.audienceInsights.demographics).toBeDefined();
    });

    it('should handle API rate limiting with proper backoff', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'X-RateLimit-Reset': '3600' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMailchimpResponse),
        });

      const result = await platform.syncPlatform('mailchimp', {
        syncType: 'incremental',
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateMarketingInsights', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              insights: {
                crossPlatformROI: 3.2,
                bestPerformingChannels: ['facebook_ads', 'google_ads'],
                weddingSeasonOptimizations: {
                  peakSeasonCPA: 12.5,
                  offSeasonCPA: 18.75,
                  seasonalAudiences: ['engaged_couples', 'wedding_planners'],
                },
                budgetRecommendations: {
                  facebookAds: 0.45,
                  googleAds: 0.35,
                  instagram: 0.12,
                  emailMarketing: 0.08,
                },
              },
            }),
        }),
      ) as any;
    });

    it('should generate comprehensive marketing performance insights', async () => {
      const result = await platform.generateMarketingInsights(
        ['facebook_ads', 'google_ads', 'instagram', 'mailchimp'],
        {
          analysisType: 'comprehensive',
          timeframe: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-12-31T23:59:59Z',
          },
          includeROIAnalysis: true,
          includeCrossPlatformAttribution: true,
          weddingSeasonAnalysis: true,
          budgetOptimization: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.insights).toBeDefined();
      expect(result.insights.crossPlatformROI).toBe(3.2);
      expect(result.insights.bestPerformingChannels).toContain('facebook_ads');
      expect(result.insights.weddingSeasonOptimizations).toBeDefined();
      expect(result.budgetRecommendations).toBeDefined();
    });

    it('should provide wedding-specific campaign recommendations', async () => {
      const result = await platform.generateMarketingInsights(
        ['facebook_ads', 'instagram'],
        {
          analysisType: 'wedding_optimization',
          focusAreas: [
            'seasonal_campaigns',
            'audience_targeting',
            'creative_performance',
            'budget_allocation',
          ],
          includeCompetitorAnalysis: true,
        },
      );

      expect(result.insights.weddingOptimizations).toBeDefined();
      expect(result.insights.seasonalCampaignRecommendations).toBeDefined();
      expect(result.insights.audienceTargetingInsights).toBeDefined();
      expect(result.insights.creativePerformanceAnalysis).toBeDefined();
    });

    it('should analyze customer journey and attribution', async () => {
      const result = await platform.generateMarketingInsights(
        ['facebook_ads', 'google_ads', 'mailchimp'],
        {
          analysisType: 'customer_journey',
          attributionModel: 'wedding_journey',
          touchpointAnalysis: true,
          conversionPathMapping: true,
        },
      );

      expect(result.insights.customerJourney).toBeDefined();
      expect(result.insights.attributionAnalysis).toBeDefined();
      expect(result.insights.touchpointPerformance).toBeDefined();
      expect(result.insights.conversionPaths).toBeDefined();
    });
  });

  describe('Wedding-specific marketing optimization', () => {
    it('should optimize campaigns for wedding seasons', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              optimizations: {
                peakSeasonRecommendations: {
                  budgetIncrease: 0.4,
                  targetAudiences: ['newly_engaged', 'wedding_planning_active'],
                  adCreatives: ['outdoor_weddings', 'luxury_venues'],
                  bidStrategies: 'target_cpa',
                },
                offSeasonStrategies: {
                  budgetReduction: 0.25,
                  focusAreas: ['engagement_sessions', 'anniversary_shoots'],
                  promotionalOffers: true,
                },
              },
            }),
        }),
      ) as any;

      const result = await platform.optimizeWeddingSeasonCampaigns(
        ['facebook_ads', 'google_ads'],
        {
          seasonalStrategy: 'comprehensive',
          currentSeason: 'peak',
          includeAutomatedAdjustments: true,
          budgetFlexibility: 0.3,
        },
      );

      expect(result.success).toBe(true);
      expect(result.optimizations.peakSeasonRecommendations).toBeDefined();
      expect(result.optimizations.offSeasonStrategies).toBeDefined();
      expect(result.automatedAdjustmentsEnabled).toBe(true);
    });

    it('should analyze wedding vendor competitive landscape', async () => {
      const result = await platform.analyzeCompetitiveLandscape({
        competitorCategories: [
          'wedding_photographers',
          'wedding_venues',
          'wedding_planners',
        ],
        analysisScope: 'local',
        geographicRadius: 50, // miles
        competitiveMetrics: [
          'ad_spend',
          'keyword_overlap',
          'audience_overlap',
          'creative_themes',
        ],
      });

      expect(result.success).toBe(true);
      expect(result.competitiveAnalysis).toBeDefined();
      expect(result.competitiveAnalysis.keywordGaps).toBeDefined();
      expect(result.competitiveAnalysis.audienceOpportunities).toBeDefined();
      expect(result.competitiveAnalysis.creativeBenchmarks).toBeDefined();
    });

    it('should recommend wedding-specific audience targeting', async () => {
      const result = await platform.optimizeAudienceTargeting(
        ['facebook_ads', 'instagram'],
        {
          vendorCategory: 'photographer',
          serviceSpecialties: ['wedding_photography', 'engagement_photography'],
          geographicTargeting: {
            primaryMarkets: ['San Francisco, CA', 'San Jose, CA'],
            expansionMarkets: ['Oakland, CA', 'Napa, CA'],
          },
          weddingDemographics: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.audienceRecommendations).toBeDefined();
      expect(result.audienceRecommendations.weddingTargeting).toBeDefined();
      expect(result.audienceRecommendations.geographicExpansion).toBeDefined();
      expect(result.demographicInsights).toBeDefined();
    });
  });

  describe('Cross-platform campaign management', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {} }),
        }),
      ) as any;
    });

    it('should coordinate campaigns across multiple platforms', async () => {
      const result = await platform.coordinateCampaigns(
        ['facebook_ads', 'google_ads', 'instagram'],
        {
          campaignType: 'wedding_lead_generation',
          coordinationStrategy: 'unified_messaging',
          budgetAllocation: {
            facebook_ads: 0.45,
            google_ads: 0.4,
            instagram: 0.15,
          },
          crossPlatformTracking: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.campaignCoordination).toBeDefined();
      expect(result.unifiedMessaging).toBe(true);
      expect(result.crossPlatformTracking).toBe(true);
      expect(result.budgetOptimization).toBeDefined();
    });

    it('should optimize budget allocation based on performance', async () => {
      const result = await platform.optimizeBudgetAllocation(
        ['facebook_ads', 'google_ads', 'mailchimp'],
        {
          optimizationGoal: 'maximize_leads',
          performanceWindow: '30_days',
          includeSeasonalFactors: true,
          automaticRebalancing: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.budgetOptimization).toBeDefined();
      expect(result.budgetOptimization.recommendedAllocation).toBeDefined();
      expect(result.budgetOptimization.expectedImprovements).toBeDefined();
      expect(result.automaticRebalancing).toBe(true);
    });

    it('should track unified conversion paths', async () => {
      const result = await platform.trackUnifiedConversions(
        ['facebook_ads', 'google_ads', 'instagram', 'mailchimp'],
        {
          attributionWindow: '28_days',
          conversionGoals: [
            'lead_form_submission',
            'consultation_booking',
            'contract_signed',
          ],
          weddingJourneyMapping: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.conversionTracking).toBeDefined();
      expect(result.conversionTracking.unifiedAttribution).toBeDefined();
      expect(result.conversionTracking.weddingJourneyInsights).toBeDefined();
      expect(result.conversionGoals.length).toBe(3);
    });
  });

  describe('Advanced marketing analytics', () => {
    it('should perform cohort analysis for wedding clients', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              cohortAnalysis: {
                engagementPeriodCohorts: {
                  '3_months': { retention: 0.85, ltv: 3200 },
                  '6_months': { retention: 0.78, ltv: 2950 },
                  '12_months': { retention: 0.65, ltv: 2650 },
                },
                seasonalCohorts: {
                  spring_engaged: {
                    conversionRate: 0.24,
                    avgBookingValue: 3100,
                  },
                  summer_engaged: {
                    conversionRate: 0.31,
                    avgBookingValue: 3400,
                  },
                  fall_engaged: { conversionRate: 0.28, avgBookingValue: 2900 },
                },
              },
            }),
        }),
      ) as any;

      const result = await platform.performCohortAnalysis(
        ['facebook_ads', 'mailchimp'],
        {
          cohortType: 'engagement_period',
          analysisWindow: '24_months',
          includeSeasonalCohorts: true,
          includeLTVAnalysis: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.cohortAnalysis).toBeDefined();
      expect(result.cohortAnalysis.engagementPeriodCohorts).toBeDefined();
      expect(result.cohortAnalysis.seasonalCohorts).toBeDefined();
      expect(result.ltvInsights).toBeDefined();
    });

    it('should predict campaign performance using ML models', async () => {
      const result = await platform.predictCampaignPerformance(
        ['facebook_ads', 'google_ads'],
        {
          predictionType: 'performance_forecast',
          forecastPeriod: '90_days',
          modelType: 'wedding_seasonal',
          includeExternalFactors: [
            'weather',
            'holidays',
            'economic_indicators',
          ],
          confidenceLevel: 0.85,
        },
      );

      expect(result.success).toBe(true);
      expect(result.predictions).toBeDefined();
      expect(result.predictions.performanceForecast).toBeDefined();
      expect(result.predictions.confidenceIntervals).toBeDefined();
      expect(result.externalFactorImpact).toBeDefined();
    });

    it('should analyze creative performance and optimization', async () => {
      const result = await platform.analyzeCreativePerformance(
        ['facebook_ads', 'instagram'],
        {
          analysisType: 'comprehensive',
          includeVisualAnalysis: true,
          includeMessageTesting: true,
          weddingCreativeThemes: [
            'romantic',
            'rustic',
            'modern',
            'outdoor',
            'luxury',
          ],
        },
      );

      expect(result.success).toBe(true);
      expect(result.creativeAnalysis).toBeDefined();
      expect(result.creativeAnalysis.topPerformingThemes).toBeDefined();
      expect(result.creativeAnalysis.visualElementInsights).toBeDefined();
      expect(result.messageTestingResults).toBeDefined();
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle marketing platform API outages gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('API service unavailable')),
      ) as any;

      const result = await platform.syncPlatform('facebook_ads', {
        syncType: 'incremental',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API service unavailable');
      expect(result.retryStrategy).toBeDefined();
    });

    it('should validate marketing insight parameters', async () => {
      await expect(
        platform.generateMarketingInsights(['invalid_platform' as any], {
          analysisType: 'comprehensive',
        }),
      ).rejects.toThrow('Unsupported marketing platform');

      await expect(
        platform.generateMarketingInsights(['facebook_ads'], {
          timeframe: {
            start: '2024-12-31T00:00:00Z',
            end: '2024-01-01T00:00:00Z', // Invalid: end before start
          },
        }),
      ).rejects.toThrow('Invalid date range');
    });

    it('should handle partial platform failures in multi-platform operations', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFacebookAdsResponse),
        })
        .mockRejectedValueOnce(new Error('Google Ads API failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMailchimpResponse),
        });

      const result = await platform.coordinateCampaigns(
        ['facebook_ads', 'google_ads', 'mailchimp'],
        {
          campaignType: 'wedding_lead_generation',
          fallbackStrategy: 'continue_with_available',
        },
      );

      expect(result.partialSuccess).toBe(true);
      expect(result.successfulPlatforms).toContain('facebook_ads');
      expect(result.successfulPlatforms).toContain('mailchimp');
      expect(result.failedPlatforms).toContain('google_ads');
    });

    it('should maintain data consistency during sync failures', async () => {
      // Simulate network interruption during sync
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ data: mockFacebookAdsResponse.data.slice(0, 1) }),
        })
        .mockRejectedValueOnce(new Error('Network timeout'));

      const result = await platform.syncPlatform('facebook_ads', {
        syncType: 'incremental',
        maintainConsistency: true,
        rollbackOnFailure: true,
      });

      expect(result.success).toBe(false);
      expect(result.rollbackPerformed).toBe(true);
      expect(result.dataConsistencyMaintained).toBe(true);
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large-scale campaign data efficiently', async () => {
      const largeCampaignDataset = Array(1000)
        .fill(null)
        .map((_, i) => ({
          id: `campaign_${i}`,
          name: `Wedding Campaign ${i}`,
          spend: (2500 + (i % 1000)).toString(),
          impressions: (15000 + (i % 5000)).toString(),
          clicks: (300 + (i % 200)).toString(),
          date_start: '2024-07-01',
          date_stop: '2024-07-31',
        }));

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: largeCampaignDataset }),
        }),
      ) as any;

      const startTime = Date.now();
      const result = await platform.syncPlatform('facebook_ads', {
        syncType: 'full',
        batchSize: 100,
        parallelProcessing: true,
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1000);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.batchProcessingUsed).toBe(true);
    });

    it('should implement efficient caching for frequent queries', async () => {
      const result1 = await platform.syncPlatform('google_ads', {
        syncType: 'incremental',
        enableCaching: true,
        cacheDuration: '30_minutes',
      });

      const result2 = await platform.syncPlatform('google_ads', {
        syncType: 'incremental',
        enableCaching: true,
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.cacheHit).toBe(true);
      expect(result2.responseTime).toBeLessThan(result1.responseTime);
    });

    it('should optimize API calls to minimize costs', async () => {
      const result = await platform.syncPlatform('facebook_ads', {
        syncType: 'incremental',
        costOptimization: true,
        apiCallBudget: 500,
        prioritizeHighImpactData: true,
        aggregateWherePossible: true,
      });

      expect(result.success).toBe(true);
      expect(result.apiCallsUsed).toBeLessThanOrEqual(500);
      expect(result.costOptimizationUsed).toBe(true);
      expect(result.dataAggregationUsed).toBe(true);
    });

    it('should implement real-time campaign monitoring', async () => {
      const result = await platform.enableRealTimeMonitoring(
        ['facebook_ads', 'google_ads'],
        {
          monitoringLevel: 'comprehensive',
          alertThresholds: {
            cpa_increase: 0.2, // 20% increase
            ctr_decrease: 0.15, // 15% decrease
            budget_utilization: 0.9, // 90% of budget spent
          },
          automatedActions: [
            'pause_underperforming',
            'increase_high_performers',
          ],
        },
      );

      expect(result.success).toBe(true);
      expect(result.monitoringEnabled).toBe(true);
      expect(result.alertsConfigured).toBe(3);
      expect(result.automatedActionsEnabled).toBe(true);
    });
  });
});
