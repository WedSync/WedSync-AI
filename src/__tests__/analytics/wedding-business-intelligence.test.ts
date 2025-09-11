import { WeddingBusinessIntelligence } from '../../lib/analytics/wedding-business-intelligence';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../lib/analytics/analytics-engine');
jest.mock('@supabase/supabase-js');

describe('WeddingBusinessIntelligence', () => {
  let wbi: WeddingBusinessIntelligence;
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    wbi = new WeddingBusinessIntelligence();
  });

  describe('Seasonal Analytics', () => {
    test('should analyze peak wedding seasons correctly', async () => {
      const seasonalData = await wbi.analyzeSeasonalPatterns(
        mockOrganizationId,
        {
          year: 2024,
          includeComparison: true,
        },
      );

      expect(seasonalData).toBeDefined();
      expect(seasonalData.peakSeasons).toContain('summer');
      expect(seasonalData.peakSeasons).toContain('spring');
      expect(seasonalData.monthlyBreakdown).toHaveLength(12);
      expect(seasonalData.yearOverYear).toBeDefined();

      // Validate summer is typically the highest booking season
      const summerMonths = [5, 6, 7]; // June, July, August (0-indexed)
      const summerBookings = summerMonths.reduce(
        (total, month) => total + seasonalData.monthlyBreakdown[month].bookings,
        0,
      );
      const totalBookings = seasonalData.monthlyBreakdown.reduce(
        (total, month) => total + month.bookings,
        0,
      );

      expect(summerBookings / totalBookings).toBeGreaterThan(0.4); // Summer should be >40% of bookings
    });

    test('should provide accurate wedding industry benchmarks', async () => {
      const benchmarks = await wbi.getIndustryBenchmarks('photographer', {
        region: 'UK',
        businessSize: 'small',
      });

      expect(benchmarks).toBeDefined();
      expect(benchmarks.averageBookingValue).toBeGreaterThan(0);
      expect(benchmarks.conversionRate).toBeBetween(0, 1);
      expect(benchmarks.averageResponseTime).toBeDefined();
      expect(benchmarks.clientSatisfactionScore).toBeBetween(1, 5);
      expect(benchmarks.peakSeasonPremium).toBeGreaterThan(0);
    });

    test('should calculate seasonal demand predictions', async () => {
      const demandPrediction = await wbi.predictSeasonalDemand(
        mockOrganizationId,
        {
          vendorType: 'photographer',
          forecastMonths: 12,
          includeWeatherFactors: true,
        },
      );

      expect(demandPrediction).toBeDefined();
      expect(demandPrediction.monthlyForecasts).toHaveLength(12);
      expect(demandPrediction.confidenceScore).toBeBetween(0.7, 1.0);
      expect(demandPrediction.peakDemandMonths).toBeInstanceOf(Array);
      expect(demandPrediction.recommendedPricing).toBeDefined();
    });
  });

  describe('Market Analysis', () => {
    test('should analyze competitive positioning', async () => {
      const competitive = await wbi.analyzeCompetitivePosition(
        mockOrganizationId,
        {
          vendorType: 'photographer',
          region: 'London',
          priceRange: '1000-3000',
        },
      );

      expect(competitive).toBeDefined();
      expect(competitive.marketPosition).toMatch(
        /^(leader|challenger|follower|niche)$/,
      );
      expect(competitive.priceComparison).toBeDefined();
      expect(competitive.serviceComparison).toBeDefined();
      expect(competitive.recommendations).toBeInstanceOf(Array);
      expect(competitive.threats).toBeInstanceOf(Array);
      expect(competitive.opportunities).toBeInstanceOf(Array);
    });

    test('should provide pricing optimization insights', async () => {
      const pricing = await wbi.optimizePricing(mockOrganizationId, {
        vendorType: 'photographer',
        currentPricing: {
          weddingPackage: 2000,
          engagementShoot: 300,
          albumUpgrade: 500,
        },
        targetMargin: 0.4,
        seasonalAdjustment: true,
      });

      expect(pricing).toBeDefined();
      expect(pricing.recommendedPricing.weddingPackage).toBeGreaterThan(1000);
      expect(pricing.priceElasticity).toBeBetween(-2, 0); // Negative elasticity expected
      expect(pricing.seasonalAdjustments).toBeDefined();
      expect(pricing.revenueImpact).toBeDefined();
      expect(pricing.competitiveGap).toBeDefined();
    });

    test('should identify market trends and opportunities', async () => {
      const trends = await wbi.identifyMarketTrends(mockOrganizationId, {
        timeframe: '12months',
        categories: ['styles', 'pricing', 'technology', 'customer_behavior'],
      });

      expect(trends).toBeDefined();
      expect(trends.emergingTrends).toBeInstanceOf(Array);
      expect(trends.decliningTrends).toBeInstanceOf(Array);
      expect(trends.opportunityScore).toBeBetween(0, 10);
      expect(trends.actionableInsights).toBeInstanceOf(Array);

      // Validate trend categories
      trends.emergingTrends.forEach((trend) => {
        expect(trend.category).toMatch(
          /^(styles|pricing|technology|customer_behavior)$/,
        );
        expect(trend.confidence).toBeBetween(0, 1);
        expect(trend.impact).toMatch(/^(low|medium|high)$/);
      });
    });
  });

  describe('Customer Insights', () => {
    test('should analyze customer behavior patterns', async () => {
      const behavior = await wbi.analyzeCustomerBehavior(mockOrganizationId, {
        segmentation: 'budget_based',
        timeframe: '6months',
        includeJourneyAnalysis: true,
      });

      expect(behavior).toBeDefined();
      expect(behavior.segments).toBeInstanceOf(Array);
      expect(behavior.commonJourneys).toBeInstanceOf(Array);
      expect(behavior.dropoffPoints).toBeInstanceOf(Array);
      expect(behavior.conversionFactors).toBeDefined();

      // Validate customer segments
      behavior.segments.forEach((segment) => {
        expect(segment.size).toBeGreaterThan(0);
        expect(segment.averageValue).toBeGreaterThan(0);
        expect(segment.conversionRate).toBeBetween(0, 1);
        expect(segment.characteristics).toBeInstanceOf(Array);
      });
    });

    test('should provide lead scoring insights', async () => {
      const leadScoring = await wbi.calculateLeadScoring(mockOrganizationId, {
        factors: ['budget', 'timeline', 'engagement_level', 'referral_source'],
        trainingPeriod: '12months',
      });

      expect(leadScoring).toBeDefined();
      expect(leadScoring.scoringModel).toBeDefined();
      expect(leadScoring.factors).toBeInstanceOf(Array);
      expect(leadScoring.accuracy).toBeGreaterThan(0.7); // Model should be >70% accurate
      expect(leadScoring.thresholds.hot).toBeGreaterThan(
        leadScoring.thresholds.warm,
      );
      expect(leadScoring.thresholds.warm).toBeGreaterThan(
        leadScoring.thresholds.cold,
      );
    });

    test('should predict customer lifetime value', async () => {
      const clv = await wbi.predictCustomerLifetimeValue(mockOrganizationId, {
        segmentation: 'behavior_based',
        forecastPeriod: '36months',
        includeReferrals: true,
      });

      expect(clv).toBeDefined();
      expect(clv.averageCLV).toBeGreaterThan(0);
      expect(clv.clvDistribution).toBeDefined();
      expect(clv.retentionRate).toBeBetween(0, 1);
      expect(clv.referralValue).toBeGreaterThanOrEqual(0);
      expect(clv.segmentBreakdown).toBeInstanceOf(Array);
    });
  });

  describe('Revenue Optimization', () => {
    test('should identify upselling opportunities', async () => {
      const upselling = await wbi.identifyUpsellingOpportunities(
        mockOrganizationId,
        {
          vendorType: 'photographer',
          analysisDepth: 'detailed',
        },
      );

      expect(upselling).toBeDefined();
      expect(upselling.opportunities).toBeInstanceOf(Array);
      expect(upselling.totalPotentialRevenue).toBeGreaterThan(0);
      expect(upselling.conversionProbability).toBeBetween(0, 1);
      expect(upselling.recommendedActions).toBeInstanceOf(Array);

      // Validate opportunity structure
      upselling.opportunities.forEach((opp) => {
        expect(opp.serviceType).toBeDefined();
        expect(opp.potentialValue).toBeGreaterThan(0);
        expect(opp.likelihood).toBeBetween(0, 1);
        expect(opp.timeline).toMatch(/^(immediate|short_term|long_term)$/);
      });
    });

    test('should optimize service packages', async () => {
      const packages = await wbi.optimizeServicePackages(mockOrganizationId, {
        currentPackages: [
          {
            name: 'Basic',
            price: 1500,
            features: ['6_hours', 'digital_gallery'],
          },
          {
            name: 'Premium',
            price: 2500,
            features: ['8_hours', 'digital_gallery', 'album'],
          },
          {
            name: 'Luxury',
            price: 3500,
            features: [
              '10_hours',
              'digital_gallery',
              'album',
              'engagement_shoot',
            ],
          },
        ],
        optimizationGoals: ['revenue', 'conversion', 'customer_satisfaction'],
      });

      expect(packages).toBeDefined();
      expect(packages.optimizedPackages).toBeInstanceOf(Array);
      expect(packages.expectedImpact.revenueIncrease).toBeDefined();
      expect(packages.expectedImpact.conversionImprovement).toBeDefined();
      expect(packages.pricePoints).toBeDefined();
      expect(packages.featureAnalysis).toBeDefined();
    });
  });

  describe('Reporting and Dashboards', () => {
    test('should generate executive summary report', async () => {
      const executive = await wbi.generateExecutiveSummary(mockOrganizationId, {
        period: 'quarterly',
        includeForecasts: true,
        compareToIndustry: true,
      });

      expect(executive).toBeDefined();
      expect(executive.keyMetrics).toBeDefined();
      expect(executive.trends).toBeInstanceOf(Array);
      expect(executive.recommendations).toBeInstanceOf(Array);
      expect(executive.riskFactors).toBeInstanceOf(Array);
      expect(executive.opportunities).toBeInstanceOf(Array);
      expect(executive.industryComparison).toBeDefined();
    });

    test('should create vendor-specific insights dashboard', async () => {
      const dashboard = await wbi.createVendorDashboard(mockOrganizationId, {
        vendorType: 'photographer',
        refreshFrequency: 'hourly',
        widgets: [
          'revenue_trend',
          'booking_pipeline',
          'customer_satisfaction',
          'market_position',
        ],
      });

      expect(dashboard).toBeDefined();
      expect(dashboard.widgets).toHaveLength(4);
      expect(dashboard.lastUpdated).toBeDefined();
      expect(dashboard.nextRefresh).toBeDefined();
      expect(dashboard.performance.loadTime).toBeLessThan(2000); // Should load in <2 seconds

      // Validate widget structure
      dashboard.widgets.forEach((widget) => {
        expect(widget.type).toMatch(
          /^(revenue_trend|booking_pipeline|customer_satisfaction|market_position)$/,
        );
        expect(widget.data).toBeDefined();
        expect(widget.visualization).toBeDefined();
        expect(widget.insights).toBeInstanceOf(Array);
      });
    });
  });

  describe('Wedding Industry Specific Features', () => {
    test('should handle wedding day proximity alerts', async () => {
      const alerts = await wbi.checkWeddingDayProximity(mockOrganizationId, {
        alertThresholds: [30, 14, 7, 1], // days before wedding
        includeVendorReadiness: true,
      });

      expect(alerts).toBeDefined();
      expect(alerts.upcomingWeddings).toBeInstanceOf(Array);
      expect(alerts.criticalAlerts).toBeInstanceOf(Array);
      expect(alerts.vendorReadiness).toBeDefined();

      // Validate alert structure
      alerts.upcomingWeddings.forEach((wedding) => {
        expect(wedding.daysUntilWedding).toBeGreaterThanOrEqual(0);
        expect(wedding.preparednessScore).toBeBetween(0, 100);
        expect(wedding.missingItems).toBeInstanceOf(Array);
      });
    });

    test('should analyze vendor network effectiveness', async () => {
      const network = await wbi.analyzeVendorNetwork(mockOrganizationId, {
        includeReferralAnalysis: true,
        collaborationMetrics: true,
        competitionOverlap: true,
      });

      expect(network).toBeDefined();
      expect(network.networkStrength).toBeBetween(0, 100);
      expect(network.keyPartners).toBeInstanceOf(Array);
      expect(network.referralVolume).toBeGreaterThanOrEqual(0);
      expect(network.collaborationScore).toBeBetween(0, 10);
      expect(network.marketCoverage).toBeBetween(0, 1);
    });

    test('should provide wedding trend forecasting', async () => {
      const trends = await wbi.forecastWeddingTrends({
        timeframe: '18months',
        categories: ['themes', 'colors', 'venues', 'photography_styles'],
        region: 'UK',
        confidenceThreshold: 0.7,
      });

      expect(trends).toBeDefined();
      expect(trends.emergingTrends).toBeInstanceOf(Array);
      expect(trends.fadingTrends).toBeInstanceOf(Array);
      expect(trends.seasonalVariations).toBeDefined();
      expect(trends.businessImpact).toBeDefined();

      // Validate trend forecasts
      trends.emergingTrends.forEach((trend) => {
        expect(trend.confidence).toBeGreaterThanOrEqual(0.7);
        expect(trend.category).toMatch(
          /^(themes|colors|venues|photography_styles)$/,
        );
        expect(trend.businessOpportunity).toBeGreaterThanOrEqual(0);
        expect(trend.timeline).toBeDefined();
      });
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle large datasets efficiently', async () => {
      const largeDataset = {
        organizationId: mockOrganizationId,
        dataPoints: 100000,
        timeRange: {
          start: new Date('2020-01-01'),
          end: new Date('2024-12-31'),
        },
      };

      const startTime = Date.now();
      const analysis = await wbi.processLargeDataset(largeDataset);
      const processingTime = Date.now() - startTime;

      expect(analysis).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should process 100k records in <5 seconds
      expect(analysis.recordsProcessed).toBe(100000);
      expect(analysis.insights).toBeInstanceOf(Array);
    });

    test('should maintain data quality standards', async () => {
      const qualityCheck = await wbi.validateDataQuality(mockOrganizationId, {
        tables: ['analytics_events', 'wedding_intelligence_data'],
        checks: ['completeness', 'accuracy', 'consistency', 'timeliness'],
      });

      expect(qualityCheck).toBeDefined();
      expect(qualityCheck.overallScore).toBeBetween(0.8, 1.0); // Should maintain >80% quality
      expect(qualityCheck.tableScores).toBeDefined();
      expect(qualityCheck.issues).toBeInstanceOf(Array);
      expect(qualityCheck.recommendations).toBeInstanceOf(Array);
    });

    test('should handle concurrent analysis requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        wbi.analyzeSeasonalPatterns(mockOrganizationId, {
          year: 2024,
          vendorType: 'photographer',
        }),
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.peakSeasons)).toBe(true);
      expect(totalTime).toBeLessThan(3000); // Should handle 10 concurrent requests in <3 seconds
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing data gracefully', async () => {
      const result = await wbi.analyzeSeasonalPatterns(
        '00000000-0000-0000-0000-000000000000',
        {
          year: 2024,
        },
      );

      expect(result).toBeDefined();
      expect(result.hasData).toBe(false);
      expect(result.recommendations).toContain('insufficient_data');
      expect(result.suggestedActions).toBeInstanceOf(Array);
    });

    test('should validate wedding industry constraints', async () => {
      // Test invalid wedding date (February 30th doesn't exist)
      const invalidDate = await wbi.validateWeddingContext({
        weddingDate: new Date('2024-02-30'),
        vendorType: 'photographer',
        guestCount: 150,
      });

      expect(invalidDate.isValid).toBe(false);
      expect(invalidDate.errors).toContain('invalid_wedding_date');

      // Test unrealistic guest count
      const invalidGuests = await wbi.validateWeddingContext({
        weddingDate: new Date('2024-06-15'),
        vendorType: 'photographer',
        guestCount: -5,
      });

      expect(invalidGuests.isValid).toBe(false);
      expect(invalidGuests.errors).toContain('invalid_guest_count');
    });

    test('should handle seasonal edge cases', async () => {
      // Test leap year February 29th
      const leapYear = await wbi.analyzeSeasonalPatterns(mockOrganizationId, {
        year: 2024, // Leap year
        includeLeapDayAnalysis: true,
      });

      expect(leapYear).toBeDefined();
      expect(leapYear.leapYearAdjustment).toBe(true);
      expect(leapYear.monthlyBreakdown[1].days).toBe(29); // February should have 29 days
    });
  });
});
