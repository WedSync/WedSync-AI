/**
 * Analytics Data Accuracy and Integrity Testing
 * WS-332 Team E - Comprehensive validation of analytics calculations and metrics
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from '@jest/test';
import { AnalyticsDataValidator } from './utils/analytics-data-validator';
import { AnalyticsTestSuite } from './utils/analytics-test-suite';
import { WeddingDataGenerator } from './utils/wedding-data-generator';
import { AnalyticsEngine } from '../../services/analytics/analytics-engine';
import { WeddingBusinessIntelligence } from '../../services/analytics/wedding-business-intelligence';
import { PredictiveAnalyticsService } from '../../services/analytics/predictive-analytics-service';

describe('Analytics Data Accuracy and Integrity Testing', () => {
  let dataValidator: AnalyticsDataValidator;
  let testSuite: AnalyticsTestSuite;
  let weddingDataGenerator: WeddingDataGenerator;
  let analyticsEngine: AnalyticsEngine;

  beforeAll(async () => {
    // Initialize test environment
    console.log(
      '🚀 Initializing Analytics QA Testing Framework - WS-332 Team E',
    );

    dataValidator = new AnalyticsDataValidator({
      precisionTolerance: 0.001,
      aggregationValidation: true,
      realTimeValidation: true,
      crossPlatformValidation: true,
    });

    testSuite = new AnalyticsTestSuite();
    weddingDataGenerator = new WeddingDataGenerator();
    analyticsEngine = new AnalyticsEngine();
  });

  afterAll(async () => {
    // Cleanup test resources
    testSuite.cleanup();
    console.log('✅ Analytics QA Testing Framework cleanup completed');
  });

  beforeEach(async () => {
    // Reset any test state
    jest.clearAllMocks();
  });

  describe('Revenue Analytics Calculation Accuracy', () => {
    test('should accurately calculate total revenue from wedding data', async () => {
      // Generate test wedding data
      const weddingData =
        await weddingDataGenerator.generateWeddingRevenueSample({
          vendorType: 'photographer',
          weddingsCount: 50,
          dateRange: { start: '2024-01-01', end: '2024-12-31' },
          revenueRange: { min: 2000, max: 8000 },
        });

      // Calculate expected metrics manually
      const expectedMetrics =
        await dataValidator.calculateExpectedRevenue(weddingData);

      // Test analytics engine calculations
      const calculatedMetrics = await analyticsEngine.calculateMetrics({
        vendorId: weddingData.vendorId,
        timeframe: { start: '2024-01-01', end: '2024-12-31' },
        metrics: ['total_revenue', 'average_wedding_value', 'revenue_growth'],
        filters: [],
        aggregations: ['sum', 'average', 'count'],
      });

      // Validate accuracy with high precision
      expect(calculatedMetrics.results.total_revenue).toBeCloseTo(
        expectedMetrics.totalRevenue,
        2,
      );
      expect(calculatedMetrics.results.average_wedding_value).toBeCloseTo(
        expectedMetrics.averageWeddingValue,
        2,
      );
      expect(calculatedMetrics.results.revenue_growth).toBeCloseTo(
        expectedMetrics.revenueGrowth,
        3,
      );

      // Validate data integrity
      const integrityCheck =
        await dataValidator.validateDataIntegrity(calculatedMetrics);
      expect(integrityCheck.dataConsistency).toBe(true);
      expect(integrityCheck.calculationAccuracy).toBeGreaterThan(0.999);
      expect(integrityCheck.aggregationErrors).toHaveLength(0);

      console.log(
        `✅ Revenue calculation accuracy: ${(integrityCheck.calculationAccuracy * 100).toFixed(3)}%`,
      );
    });

    test('should handle edge cases in revenue calculations', async () => {
      // Test with minimal data
      const minimalWeddingData =
        await weddingDataGenerator.generateWeddingRevenueSample({
          vendorType: 'photographer',
          weddingsCount: 1,
          dateRange: { start: '2024-01-01', end: '2024-01-31' },
          revenueRange: { min: 1000, max: 1000 },
        });

      const expectedMetrics =
        await dataValidator.calculateExpectedRevenue(minimalWeddingData);
      const calculatedMetrics = await analyticsEngine.calculateMetrics({
        vendorId: minimalWeddingData.vendorId,
        timeframe: { start: '2024-01-01', end: '2024-01-31' },
        metrics: ['total_revenue', 'average_wedding_value'],
        filters: [],
        aggregations: ['sum', 'average'],
      });

      expect(calculatedMetrics.results.total_revenue).toBe(1000);
      expect(calculatedMetrics.results.average_wedding_value).toBe(1000);

      // Test with zero weddings
      const zeroWeddingData = {
        vendorId: 'test_vendor_zero',
        weddings: [],
        inquiries: [],
      };

      const zeroExpectedMetrics =
        await dataValidator.calculateExpectedRevenue(zeroWeddingData);
      expect(zeroExpectedMetrics.totalRevenue).toBe(0);
      expect(zeroExpectedMetrics.averageWeddingValue).toBe(0);
      expect(zeroExpectedMetrics.weddingCount).toBe(0);

      console.log('✅ Edge case handling validated');
    });

    test('should accurately calculate conversion rates', async () => {
      const conversionData =
        await weddingDataGenerator.generateWeddingRevenueSample({
          vendorType: 'venue',
          weddingsCount: 25,
          dateRange: { start: '2024-01-01', end: '2024-12-31' },
          revenueRange: { min: 3000, max: 12000 },
        });

      const expectedMetrics =
        await dataValidator.calculateExpectedRevenue(conversionData);
      const calculatedMetrics = await analyticsEngine.calculateMetrics({
        vendorId: conversionData.vendorId,
        timeframe: { start: '2024-01-01', end: '2024-12-31' },
        metrics: ['conversion_rate', 'inquiry_to_booking_ratio'],
        filters: [],
        aggregations: ['percentage'],
      });

      // Conversion rate should be realistic (10-40% for wedding industry)
      expect(calculatedMetrics.results.conversion_rate).toBeGreaterThan(10);
      expect(calculatedMetrics.results.conversion_rate).toBeLessThan(40);
      expect(calculatedMetrics.results.conversion_rate).toBeCloseTo(
        expectedMetrics.conversionRate,
        1,
      );

      console.log(
        `✅ Conversion rate accuracy: ${calculatedMetrics.results.conversion_rate.toFixed(1)}%`,
      );
    });
  });

  describe('Seasonal Pattern Analysis Accuracy', () => {
    test('should accurately detect wedding season patterns', async () => {
      const seasonalData =
        await weddingDataGenerator.generateSeasonalWeddingData({
          years: 3,
          seasonalVariation: true,
          weddingCountRange: { min: 5, max: 25 },
        });

      const weddingBI = new WeddingBusinessIntelligence();
      const seasonalAnalysis = await weddingBI.analyzeSeasonalPatterns(
        seasonalData.vendorId,
        3,
      );

      // Validate seasonal pattern detection
      expect(seasonalAnalysis.peakSeasons).toContainEqual(
        expect.objectContaining({ season: 'spring', isSignificant: true }),
      );
      expect(seasonalAnalysis.peakSeasons).toContainEqual(
        expect.objectContaining({ season: 'summer', isSignificant: true }),
      );

      // Validate seasonal multipliers accuracy
      const seasonalMultipliers = seasonalAnalysis.seasonalMultipliers;
      const summerMultiplier = seasonalMultipliers.find(
        (sm: any) => sm.season === 'summer',
      );
      expect(summerMultiplier.multiplier).toBeGreaterThan(1.2); // Summer should be 20%+ higher

      // Validate booking pattern accuracy
      const bookingPatterns = seasonalAnalysis.bookingPatterns;
      expect(bookingPatterns).toBeDefined();
      expect(bookingPatterns.length).toBeGreaterThan(0);

      console.log(
        `✅ Detected ${seasonalAnalysis.peakSeasons.length} peak wedding seasons`,
      );
    });

    test('should validate seasonal multiplier calculations', async () => {
      const seasonalData =
        await weddingDataGenerator.generateSeasonalWeddingData({
          years: 2,
          seasonalVariation: true,
          weddingCountRange: { min: 3, max: 15 },
        });

      const weddingBI = new WeddingBusinessIntelligence();
      const seasonalAnalysis = await weddingBI.analyzeSeasonalPatterns(
        seasonalData.vendorId,
        2,
      );

      // Validate that multipliers make business sense
      const multipliers = seasonalAnalysis.seasonalMultipliers;

      multipliers.forEach((multiplier: any) => {
        expect(multiplier.multiplier).toBeGreaterThan(0.3); // No season completely dead
        expect(multiplier.multiplier).toBeLessThan(3.0); // No season 3x higher
        expect(multiplier.season).toMatch(/spring|summer|fall|winter/);
      });

      // Summer and spring should be the highest
      const summerMult =
        multipliers.find((m: any) => m.season === 'summer')?.multiplier || 0;
      const springMult =
        multipliers.find((m: any) => m.season === 'spring')?.multiplier || 0;
      const winterMult =
        multipliers.find((m: any) => m.season === 'winter')?.multiplier || 0;

      expect(summerMult).toBeGreaterThan(winterMult);
      expect(springMult).toBeGreaterThan(winterMult);

      console.log('✅ Seasonal multiplier validation completed');
    });
  });

  describe('Real-Time Analytics Data Consistency', () => {
    test('should maintain data consistency during high-volume processing', async () => {
      // Simulate real-time data stream
      const dataStream = await testSuite.createRealTimeDataStream({
        eventTypes: ['booking_event', 'payment_received', 'client_interaction'],
        eventsPerSecond: 100,
        duration: 30, // seconds
      });

      // Process stream through analytics pipeline
      const processingResults = await testSuite.processDataStream(dataStream);

      // Validate real-time processing accuracy
      expect(processingResults.eventsProcessed).toBe(dataStream.totalEvents);
      expect(processingResults.processingLatency).toBeLessThan(100); // <100ms
      expect(processingResults.dataLossPercentage).toBeLessThan(0.001); // <0.1% data loss

      // Validate real-time metrics consistency
      const realTimeMetrics =
        await testSuite.validateRealTimeMetrics(processingResults);
      expect(realTimeMetrics.metricConsistency).toBeGreaterThan(0.99);
      expect(realTimeMetrics.anomaliesDetected).toHaveLength(0);

      console.log(
        `✅ Real-time processing: ${processingResults.eventsProcessed} events, ${processingResults.processingLatency.toFixed(1)}ms avg latency`,
      );
    });

    test('should handle burst traffic patterns', async () => {
      // Create burst traffic scenario (wedding season peak)
      const burstStream = await testSuite.createRealTimeDataStream({
        eventTypes: [
          'booking_event',
          'payment_received',
          'client_interaction',
          'form_submission',
        ],
        eventsPerSecond: 500, // 5x normal traffic
        duration: 15, // seconds
      });

      const burstResults = await testSuite.processDataStream(burstStream);

      // System should handle burst traffic gracefully
      expect(burstResults.dataLossPercentage).toBeLessThan(0.01); // <1% data loss acceptable during burst
      expect(burstResults.processingLatency).toBeLessThan(500); // <500ms during burst
      expect(burstResults.errorCount).toBeLessThan(
        burstResults.eventsProcessed * 0.005,
      ); // <0.5% error rate

      console.log(
        `✅ Burst traffic handling: ${burstResults.eventsProcessed} events processed with ${(burstResults.dataLossPercentage * 100).toFixed(3)}% data loss`,
      );
    });
  });

  describe('Cross-Platform Analytics Data Synchronization', () => {
    test('should maintain data consistency across multiple platforms', async () => {
      // Setup multiple data sources
      const dataSources = [
        { type: 'postgresql', connection: 'primary_db' },
        { type: 'redis', connection: 'analytics_cache' },
        { type: 'elasticsearch', connection: 'search_analytics' },
      ];

      // Generate consistent test data across platforms
      const testData = await weddingDataGenerator.generateCrossPlatformData({
        dataSources,
        dataConsistency: true,
        timeRange: { hours: 24 },
      });

      // Validate data synchronization accuracy
      const syncValidation =
        await dataValidator.validateCrossPlatformSync(testData);
      expect(syncValidation.dataConsistencyScore).toBeGreaterThan(0.95);
      expect(syncValidation.synchronizationDelayMs).toBeLessThan(1000);
      expect(syncValidation.dataDiscrepancies).toHaveLength(0);

      console.log(
        `✅ Cross-platform sync: ${(syncValidation.dataConsistencyScore * 100).toFixed(2)}% consistency`,
      );
    });

    test('should detect and handle data synchronization issues', async () => {
      // Generate test data with intentional inconsistencies
      const inconsistentData =
        await weddingDataGenerator.generateCrossPlatformData({
          dataSources: [
            { type: 'postgresql', connection: 'primary_db' },
            { type: 'redis', connection: 'analytics_cache' },
          ],
          dataConsistency: false, // Introduce variations
          timeRange: { hours: 12 },
        });

      const syncValidation =
        await dataValidator.validateCrossPlatformSync(inconsistentData);

      // Should detect inconsistencies
      expect(syncValidation.dataConsistencyScore).toBeLessThan(0.99);
      expect(syncValidation.dataDiscrepancies.length).toBeGreaterThan(0);

      // But should still maintain reasonable performance
      expect(syncValidation.synchronizationDelayMs).toBeLessThan(5000);
      expect(syncValidation.platformAvailability).toBeGreaterThan(0.95);

      console.log(
        `✅ Inconsistency detection: Found ${syncValidation.dataDiscrepancies.length} discrepancies`,
      );
    });
  });

  describe('Wedding Industry Analytics Accuracy', () => {
    test('should accurately categorize wedding styles and calculate metrics', async () => {
      const styleData = await weddingDataGenerator.generateWeddingStyleData({
        styles: ['rustic', 'modern', 'traditional', 'boho', 'luxury'],
        weddingsPerStyle: 100,
        revenueVariation: true,
      });

      const weddingBI = new WeddingBusinessIntelligence();
      const styleAnalysis = await weddingBI.calculateWeddingMetrics(
        styleData.vendorId,
        { start: '2024-01-01', end: '2024-12-31' },
      );

      // Validate style categorization accuracy
      const styleMetrics = styleAnalysis.weddingSpecificMetrics.weddingsByStyle;
      expect(styleMetrics).toHaveLength(5);

      styleMetrics.forEach((styleMetric: any) => {
        expect(styleMetric.count).toBeGreaterThan(0);
        expect(styleMetric.averageRevenue).toBeGreaterThan(0);
        expect(['rustic', 'modern', 'traditional', 'boho', 'luxury']).toContain(
          styleMetric.style,
        );
      });

      // Validate revenue correlation by style
      const luxuryStyle = styleMetrics.find((sm: any) => sm.style === 'luxury');
      const rusticStyle = styleMetrics.find((sm: any) => sm.style === 'rustic');
      expect(luxuryStyle.averageRevenue).toBeGreaterThan(
        rusticStyle.averageRevenue,
      );

      // Validate style categorization accuracy
      const categorization =
        await dataValidator.validateWeddingStyleCategorization(styleMetrics);
      expect(categorization.categorizationAccuracy).toBeGreaterThan(0.95);
      expect(categorization.misclassifications).toHaveLength(0);

      console.log(
        `✅ Style categorization: ${(categorization.categorizationAccuracy * 100).toFixed(1)}% accuracy`,
      );
    });

    test('should generate accurate wedding forecasts', async () => {
      const historicalData =
        await weddingDataGenerator.generateHistoricalWeddingData({
          years: 5,
          includeSeasonality: true,
          includeTrends: true,
          includeExternalFactors: true,
        });

      const predictiveAnalytics = new PredictiveAnalyticsService();
      const forecast = await predictiveAnalytics.generatePredictions(
        'wedding_booking_forecast',
        {
          vendorId: historicalData.vendorId,
          forecastHorizon: 12, // months
          includeConfidenceIntervals: true,
        },
      );

      // Validate forecast accuracy metrics
      expect(forecast.predictions).toHaveLength(12);
      expect(forecast.confidenceIntervals).toHaveLength(12);

      forecast.predictions.forEach((prediction: any) => {
        expect(prediction.predictedValue).toBeGreaterThan(0);
        expect(prediction.confidenceLevel).toBeGreaterThan(0.7); // >70% confidence
        expect(prediction.influencingFactors.length).toBeGreaterThan(0);
      });

      // Validate model performance metrics
      const modelEvaluation = await predictiveAnalytics.evaluateModelAccuracy(
        'wedding_booking_forecast',
        historicalData.testSet,
      );

      expect(modelEvaluation.accuracy).toBeGreaterThan(0.85); // >85% accuracy
      expect(modelEvaluation.meanAbsoluteError).toBeLessThan(0.15);
      expect(modelEvaluation.r2Score).toBeGreaterThan(0.8);

      console.log(
        `✅ Forecast accuracy: ${(modelEvaluation.accuracy * 100).toFixed(1)}%`,
      );
    });

    test('should validate wedding business intelligence metrics', async () => {
      const weddingData =
        await weddingDataGenerator.generateWeddingRevenueSample({
          vendorType: 'photographer',
          weddingsCount: 75,
          dateRange: { start: '2024-01-01', end: '2024-12-31' },
          revenueRange: { min: 1500, max: 6000 },
        });

      const weddingBI = new WeddingBusinessIntelligence();
      const biMetrics = await weddingBI.calculateWeddingMetrics(
        weddingData.vendorId,
        { start: '2024-01-01', end: '2024-12-31' },
      );

      // Validate wedding-specific metrics
      expect(biMetrics.weddingSpecificMetrics).toBeDefined();
      expect(
        biMetrics.weddingSpecificMetrics.averageGuestCount,
      ).toBeGreaterThan(50);
      expect(biMetrics.weddingSpecificMetrics.averageGuestCount).toBeLessThan(
        250,
      );

      expect(
        biMetrics.weddingSpecificMetrics.seasonalDistribution,
      ).toBeDefined();
      expect(
        biMetrics.weddingSpecificMetrics.averageBookingLeadTime,
      ).toBeGreaterThan(0);

      // Validate business metrics
      expect(biMetrics.businessMetrics.totalRevenue).toBeGreaterThan(0);
      expect(biMetrics.businessMetrics.averageWeddingValue).toBeGreaterThan(
        1000,
      );
      expect(biMetrics.businessMetrics.profitMargin).toBeGreaterThan(0.1); // >10%

      console.log(
        `✅ Wedding BI metrics validated: ${biMetrics.weddingSpecificMetrics.averageGuestCount} avg guests, ${biMetrics.businessMetrics.averageWeddingValue} avg value`,
      );
    });
  });

  describe('Analytics Performance and Scalability', () => {
    test('should maintain accuracy under high data volumes', async () => {
      const highVolumeData =
        await weddingDataGenerator.generateWeddingRevenueSample({
          vendorType: 'venue',
          weddingsCount: 1000, // Large dataset
          dateRange: { start: '2020-01-01', end: '2024-12-31' },
          revenueRange: { min: 1000, max: 15000 },
        });

      const startTime = Date.now();
      const expectedMetrics =
        await dataValidator.calculateExpectedRevenue(highVolumeData);
      const calculatedMetrics = await analyticsEngine.calculateMetrics({
        vendorId: highVolumeData.vendorId,
        timeframe: { start: '2020-01-01', end: '2024-12-31' },
        metrics: ['total_revenue', 'average_wedding_value', 'wedding_count'],
        filters: [],
        aggregations: ['sum', 'average', 'count'],
      });
      const processingTime = Date.now() - startTime;

      // Validate accuracy is maintained at scale
      expect(calculatedMetrics.results.total_revenue).toBeCloseTo(
        expectedMetrics.totalRevenue,
        2,
      );
      expect(calculatedMetrics.results.average_wedding_value).toBeCloseTo(
        expectedMetrics.averageWeddingValue,
        2,
      );

      // Validate performance requirements
      expect(processingTime).toBeLessThan(5000); // <5 seconds for 1000 records

      const integrityCheck =
        await dataValidator.validateDataIntegrity(calculatedMetrics);
      expect(integrityCheck.calculationAccuracy).toBeGreaterThan(0.999);

      console.log(
        `✅ High volume processing: 1000 weddings processed in ${processingTime}ms with ${(integrityCheck.calculationAccuracy * 100).toFixed(3)}% accuracy`,
      );
    });
  });

  describe('Data Quality and Validation', () => {
    test('should detect and handle data anomalies', async () => {
      // Generate data with intentional anomalies
      const anomalousData =
        await weddingDataGenerator.generateWeddingRevenueSample({
          vendorType: 'photographer',
          weddingsCount: 50,
          dateRange: { start: '2024-01-01', end: '2024-12-31' },
          revenueRange: { min: 2000, max: 8000 },
        });

      // Introduce anomalies
      anomalousData.weddings[0].totalValue = -1000; // Negative revenue
      anomalousData.weddings[1].totalValue = 100000; // Unrealistic high revenue
      anomalousData.weddings[2].date = '1900-01-01'; // Invalid date

      const calculatedMetrics = await analyticsEngine.calculateMetrics({
        vendorId: anomalousData.vendorId,
        timeframe: { start: '2024-01-01', end: '2024-12-31' },
        metrics: ['total_revenue', 'average_wedding_value'],
        filters: [],
        aggregations: ['sum', 'average'],
        enableAnomalyDetection: true,
      });

      const integrityCheck =
        await dataValidator.validateDataIntegrity(calculatedMetrics);

      // Should detect anomalies
      expect(integrityCheck.aggregationErrors.length).toBeGreaterThan(0);
      expect(integrityCheck.calculationAccuracy).toBeLessThan(0.99);
      expect(integrityCheck.anomaliesDetected.length).toBeGreaterThan(0);

      console.log(
        `✅ Anomaly detection: Found ${integrityCheck.anomaliesDetected.length} anomalies`,
      );
    });

    test('should validate data completeness and consistency', async () => {
      const testData = await weddingDataGenerator.generateWeddingRevenueSample({
        vendorType: 'florist',
        weddingsCount: 30,
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        revenueRange: { min: 800, max: 3000 },
      });

      // Validate data completeness
      expect(testData.weddings.length).toBe(30);
      expect(testData.inquiries.length).toBeGreaterThan(30); // More inquiries than bookings
      expect(testData.summary.totalWeddings).toBe(30);
      expect(testData.summary.totalRevenue).toBeGreaterThan(0);

      // Validate data relationships
      testData.weddings.forEach((wedding: any) => {
        expect(wedding.id).toBeDefined();
        expect(wedding.vendorId).toBe(testData.vendorId);
        expect(wedding.totalValue).toBeGreaterThanOrEqual(800);
        expect(wedding.totalValue).toBeLessThanOrEqual(3000);
        expect(new Date(wedding.date)).toBeInstanceOf(Date);
      });

      console.log('✅ Data completeness and consistency validated');
    });
  });
});

// Wedding-specific analytics testing
describe('Wedding Industry Analytics Accuracy', () => {
  let weddingDataGenerator: WeddingDataGenerator;
  let dataValidator: AnalyticsDataValidator;
  let weddingBI: WeddingBusinessIntelligence;

  beforeAll(async () => {
    weddingDataGenerator = new WeddingDataGenerator();
    dataValidator = new AnalyticsDataValidator({
      precisionTolerance: 0.001,
      aggregationValidation: true,
      realTimeValidation: true,
      crossPlatformValidation: true,
    });
    weddingBI = new WeddingBusinessIntelligence();
  });

  test('should accurately analyze wedding style trends and pricing', async () => {
    const styleData = await weddingDataGenerator.generateWeddingStyleData({
      styles: ['rustic', 'modern', 'traditional', 'boho', 'luxury'],
      weddingsPerStyle: 100,
      revenueVariation: true,
    });

    const styleAnalysis = await weddingBI.calculateWeddingMetrics(
      styleData.vendorId,
      { start: '2024-01-01', end: '2024-12-31' },
    );

    // Validate style categorization accuracy
    const styleMetrics = styleAnalysis.weddingSpecificMetrics.weddingsByStyle;
    expect(styleMetrics).toHaveLength(5);

    styleMetrics.forEach((styleMetric: any) => {
      expect(styleMetric.count).toBeGreaterThan(0);
      expect(styleMetric.averageRevenue).toBeGreaterThan(0);
      expect(['rustic', 'modern', 'traditional', 'boho', 'luxury']).toContain(
        styleMetric.style,
      );
    });

    // Validate revenue correlation by style
    const luxuryStyle = styleMetrics.find((sm: any) => sm.style === 'luxury');
    const rusticStyle = styleMetrics.find((sm: any) => sm.style === 'rustic');
    expect(luxuryStyle.averageRevenue).toBeGreaterThan(
      rusticStyle.averageRevenue,
    );

    console.log(
      `✅ Wedding style analysis: Luxury avg £${luxuryStyle.averageRevenue}, Rustic avg £${rusticStyle.averageRevenue}`,
    );
  });

  test('should generate accurate wedding booking forecasts', async () => {
    const historicalData =
      await weddingDataGenerator.generateHistoricalWeddingData({
        years: 5,
        includeSeasonality: true,
        includeTrends: true,
        includeExternalFactors: true,
      });

    const predictiveAnalytics = new PredictiveAnalyticsService();
    const forecast = await predictiveAnalytics.generatePredictions(
      'wedding_booking_forecast',
      {
        vendorId: historicalData.vendorId,
        forecastHorizon: 12, // months
        includeConfidenceIntervals: true,
      },
    );

    // Validate forecast accuracy metrics
    expect(forecast.predictions).toHaveLength(12);
    expect(forecast.confidenceIntervals).toHaveLength(12);

    forecast.predictions.forEach((prediction: any) => {
      expect(prediction.predictedValue).toBeGreaterThan(0);
      expect(prediction.confidenceLevel).toBeGreaterThan(0.7); // >70% confidence
      expect(prediction.influencingFactors.length).toBeGreaterThan(0);
    });

    // Validate model performance metrics
    const modelEvaluation = await predictiveAnalytics.evaluateModelAccuracy(
      'wedding_booking_forecast',
      historicalData.testSet,
    );

    expect(modelEvaluation.accuracy).toBeGreaterThan(0.85); // >85% accuracy
    expect(modelEvaluation.meanAbsoluteError).toBeLessThan(0.15);
    expect(modelEvaluation.r2Score).toBeGreaterThan(0.8);

    console.log(
      `✅ Wedding forecast model: ${(modelEvaluation.accuracy * 100).toFixed(1)}% accuracy, R² ${modelEvaluation.r2Score.toFixed(3)}`,
    );
  });

  test('should validate seasonal wedding pattern analysis', async () => {
    const seasonalData = await weddingDataGenerator.generateSeasonalWeddingData(
      {
        years: 3,
        seasonalVariation: true,
        weddingCountRange: { min: 5, max: 25 },
      },
    );

    const seasonalAnalysis = await weddingBI.analyzeSeasonalPatterns(
      seasonalData.vendorId,
      3,
    );

    // Wedding industry should show clear seasonal patterns
    expect(seasonalAnalysis.peakSeasons.length).toBeGreaterThanOrEqual(2);

    const hasSpringOrSummer = seasonalAnalysis.peakSeasons.some((season: any) =>
      ['spring', 'summer'].includes(season.season),
    );
    expect(hasSpringOrSummer).toBe(true);

    // Validate seasonal multipliers
    const seasonalMultipliers = seasonalAnalysis.seasonalMultipliers;
    expect(seasonalMultipliers.length).toBe(4); // All four seasons

    const summerMultiplier = seasonalMultipliers.find(
      (sm: any) => sm.season === 'summer',
    );
    const winterMultiplier = seasonalMultipliers.find(
      (sm: any) => sm.season === 'winter',
    );

    expect(summerMultiplier.multiplier).toBeGreaterThan(
      winterMultiplier.multiplier,
    );

    console.log(
      `✅ Seasonal analysis: ${seasonalAnalysis.peakSeasons.length} peak seasons identified`,
    );
  });
});
