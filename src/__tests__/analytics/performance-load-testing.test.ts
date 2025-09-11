/**
 * Analytics Dashboard Performance and Load Testing
 * WS-332 Team E - Comprehensive performance validation for enterprise analytics
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/test';
import { AnalyticsPerformanceRunner } from './utils/analytics-performance-runner';
import { AnalyticsLoadScenarios } from './scenarios/analytics-load-scenarios';

describe('Analytics Dashboard Performance Testing', () => {
  let performanceRunner: AnalyticsPerformanceRunner;
  let loadScenarios: AnalyticsLoadScenarios;

  beforeAll(async () => {
    console.log(
      '🚀 Initializing Analytics Performance Testing Framework - WS-332 Team E',
    );

    performanceRunner = new AnalyticsPerformanceRunner({
      maxConcurrentAnalytics: 5000,
      dataVolume: 'enterprise', // 10M+ data points
      testDuration: '60m',
      targetEnvironment: 'staging',
    });

    loadScenarios = new AnalyticsLoadScenarios();

    // Warm up the testing environment
    console.log('🔥 Warming up performance testing environment...');
    await performanceRunner.execute(loadScenarios.createStressTestScenario());
    console.log('✅ Performance testing framework ready');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up performance testing resources...');
  });

  beforeEach(() => {
    jest.setTimeout(300000); // 5 minutes timeout for performance tests
  });

  describe('High-Volume Analytics Query Performance', () => {
    test('should handle enterprise-scale analytics queries under load', async () => {
      const highVolumeScenario = loadScenarios.createHighVolumeAnalyticsTest({
        concurrentUsers: 2000,
        queriesPerUser: 50,
        datasetSize: 10000000, // 10M records
        queryTypes: [
          'revenue_aggregation',
          'time_series_analysis',
          'dimensional_analysis',
          'real_time_metrics',
        ],
      });

      console.log(
        `🎯 Starting high-volume test: ${highVolumeScenario.description}`,
      );
      const results = await performanceRunner.execute(highVolumeScenario);

      // Performance assertions for enterprise analytics
      expect(results.averageQueryTime).toBeLessThan(200); // <200ms
      expect(results.p95QueryTime).toBeLessThan(500); // <500ms for 95th percentile
      expect(results.p99QueryTime).toBeLessThan(1000); // <1s for 99th percentile
      expect(results.queryThroughput).toBeGreaterThan(5000); // >5000 queries/second
      expect(results.errorRate).toBeLessThan(0.001); // <0.1% error rate

      // Resource utilization validation
      expect(results.memoryUtilization).toBeLessThan(0.8); // <80% memory usage
      expect(results.cpuUtilization).toBeLessThan(0.75); // <75% CPU usage
      expect(results.databaseConnectionPoolUtilization).toBeLessThan(0.9);

      console.log(
        `✅ High-volume performance: ${results.queryThroughput.toFixed(0)} queries/sec, ${results.averageQueryTime.toFixed(1)}ms avg`,
      );
      console.log(
        `📊 Resource usage: ${(results.memoryUtilization * 100).toFixed(1)}% memory, ${(results.cpuUtilization * 100).toFixed(1)}% CPU`,
      );
    });

    test('should maintain performance with complex wedding analytics queries', async () => {
      const weddingAnalyticsScenario =
        loadScenarios.createHighVolumeAnalyticsTest({
          concurrentUsers: 1000,
          queriesPerUser: 25,
          datasetSize: 5000000, // 5M wedding records
          queryTypes: [
            'seasonal_analysis',
            'wedding_style_breakdown',
            'revenue_forecasting',
            'vendor_performance_metrics',
          ],
        });

      const results = await performanceRunner.execute(weddingAnalyticsScenario);

      // Wedding-specific performance requirements
      expect(results.averageQueryTime).toBeLessThan(300); // Wedding queries can be slightly more complex
      expect(results.queryThroughput).toBeGreaterThan(3000); // >3000 queries/second for wedding analytics
      expect(results.errorRate).toBeLessThan(0.0005); // <0.05% error rate for wedding data

      // Wedding data accuracy is critical
      expect(results.errorRate).toBeLessThan(0.001);

      console.log(
        `✅ Wedding analytics performance: ${results.averageQueryTime.toFixed(1)}ms avg, ${(results.errorRate * 100).toFixed(4)}% error rate`,
      );
    });

    test('should handle burst traffic patterns during wedding season', async () => {
      // Simulate wedding season burst (June-August peak)
      const burstScenario = loadScenarios.createHighVolumeAnalyticsTest({
        concurrentUsers: 5000, // 2.5x normal traffic
        queriesPerUser: 20,
        datasetSize: 15000000, // 15M records during peak season
        queryTypes: [
          'real_time_metrics',
          'booking_funnel_analysis',
          'seasonal_trend_analysis',
          'vendor_availability_check',
        ],
      });

      const results = await performanceRunner.execute(burstScenario);

      // Should handle burst gracefully
      expect(results.averageQueryTime).toBeLessThan(400); // <400ms during burst
      expect(results.errorRate).toBeLessThan(0.005); // <0.5% error rate during burst acceptable
      expect(results.queryThroughput).toBeGreaterThan(4000); // >4000 queries/sec during burst

      console.log(
        `✅ Burst traffic handling: ${results.queryThroughput.toFixed(0)} queries/sec with ${(results.errorRate * 100).toFixed(3)}% errors`,
      );
    });
  });

  describe('Real-Time Dashboard Performance', () => {
    test('should render dashboards quickly with real-time updates', async () => {
      const realTimeDashboardScenario =
        loadScenarios.createRealTimeDashboardTest({
          concurrentDashboards: 1000,
          updatesPerSecond: 100,
          widgetsPerDashboard: 12,
          dataPointsPerWidget: 1000,
          testDuration: '30m',
        });

      console.log(
        `🎯 Starting real-time dashboard test: ${realTimeDashboardScenario.description}`,
      );
      const results = await performanceRunner.execute(
        realTimeDashboardScenario,
      );

      // Dashboard performance assertions
      expect(results.dashboardLoadTime).toBeLessThan(2000); // <2s initial load
      expect(results.widgetRenderTime).toBeLessThan(100); // <100ms per widget
      expect(results.realTimeUpdateLatency).toBeLessThan(50); // <50ms update latency
      expect(results.memoryLeakage).toBeLessThan(0.01); // <1% memory growth per hour

      // WebSocket performance validation
      expect(results.websocketConnectionSuccess).toBeGreaterThan(0.99);
      expect(results.websocketLatency).toBeLessThan(25); // <25ms WebSocket latency
      expect(results.dataCompressionRatio).toBeGreaterThan(0.7); // >70% compression

      console.log(
        `✅ Dashboard performance: ${results.dashboardLoadTime}ms load, ${results.widgetRenderTime}ms/widget`,
      );
      console.log(
        `📡 Real-time: ${results.realTimeUpdateLatency}ms latency, ${(results.websocketConnectionSuccess * 100).toFixed(1)}% connection success`,
      );
    });

    test('should handle wedding vendor dashboards efficiently', async () => {
      const vendorDashboardScenario = loadScenarios.createRealTimeDashboardTest(
        {
          concurrentDashboards: 500, // 500 wedding vendors
          updatesPerSecond: 50, // Booking notifications, inquiries, etc.
          widgetsPerDashboard: 8, // Revenue, bookings, calendar, messages, etc.
          dataPointsPerWidget: 500,
          testDuration: '15m',
        },
      );

      const results = await performanceRunner.execute(vendorDashboardScenario);

      // Wedding vendor specific requirements
      expect(results.dashboardLoadTime).toBeLessThan(1500); // <1.5s load for vendors
      expect(results.realTimeUpdateLatency).toBeLessThan(30); // <30ms for booking notifications
      expect(results.memoryLeakage).toBeLessThan(0.005); // <0.5% memory growth

      // Critical for wedding day operations
      expect(results.websocketConnectionSuccess).toBeGreaterThan(0.995); // >99.5% connection success

      console.log(
        `✅ Wedding vendor dashboards: ${results.dashboardLoadTime}ms load, ${(results.websocketConnectionSuccess * 100).toFixed(2)}% uptime`,
      );
    });

    test('should maintain performance during wedding day peak hours', async () => {
      const weddingDayScenario = loadScenarios.createRealTimeDashboardTest({
        concurrentDashboards: 2000, // Peak Saturday traffic
        updatesPerSecond: 200, // High activity during weddings
        widgetsPerDashboard: 10,
        dataPointsPerWidget: 2000, // Rich wedding day data
        testDuration: '4h', // Saturday afternoon peak
      });

      const results = await performanceRunner.execute(weddingDayScenario);

      // Wedding day requirements are stricter
      expect(results.dashboardLoadTime).toBeLessThan(1000); // <1s load on wedding day
      expect(results.realTimeUpdateLatency).toBeLessThan(25); // <25ms for critical updates
      expect(results.websocketConnectionSuccess).toBe(1.0); // 100% connection success on wedding day

      console.log(
        `✅ Wedding day performance: ${results.dashboardLoadTime}ms load, ${results.realTimeUpdateLatency}ms latency`,
      );
    });
  });

  describe('Large Dataset Aggregation Performance', () => {
    test('should efficiently aggregate massive wedding datasets', async () => {
      const aggregationScenario =
        loadScenarios.createLargeDatasetAggregationTest({
          datasetSizes: [1000000, 5000000, 10000000, 50000000], // 1M to 50M records
          aggregationTypes: [
            'sum_aggregation',
            'average_calculation',
            'count_distinct',
            'percentile_calculation',
            'time_series_rolling_average',
          ],
          concurrentAggregations: 100,
        });

      console.log(
        `🎯 Starting large dataset aggregation test: ${aggregationScenario.description}`,
      );
      const results = await performanceRunner.execute(aggregationScenario);

      // Aggregation performance assertions
      expect(results.datasetResults).toBeDefined();
      expect(results.datasetResults!.length).toBeGreaterThan(0);

      results.datasetResults!.forEach((result, index) => {
        const datasetSize = [1000000, 5000000, 10000000, 50000000][index];
        const expectedMaxTime = Math.min(5000, datasetSize / 10000); // Dynamic threshold

        expect(result.aggregationTime).toBeLessThan(expectedMaxTime);
        expect(result.memoryUsage).toBeLessThan(datasetSize * 0.1); // <10% of dataset size
        expect(result.accuracy).toBeGreaterThan(0.999); // >99.9% accuracy
      });

      console.log(`✅ Large dataset aggregation completed successfully`);
      results.datasetResults!.forEach((result, index) => {
        const size = [1000000, 5000000, 10000000, 50000000][index];
        console.log(
          `📊 ${size.toLocaleString()} records: ${result.aggregationTime.toFixed(0)}ms, ${(result.accuracy * 100).toFixed(3)}% accuracy`,
        );
      });
    });

    test('should handle wedding season data aggregations', async () => {
      // Wedding season means more complex aggregations (seasonality, trends, etc.)
      const seasonalAggregationScenario =
        loadScenarios.createLargeDatasetAggregationTest({
          datasetSizes: [2000000, 10000000, 25000000], // Wedding season datasets
          aggregationTypes: [
            'seasonal_pattern_analysis',
            'wedding_style_aggregation',
            'vendor_performance_rollup',
            'revenue_trend_calculation',
            'booking_funnel_analysis',
          ],
          concurrentAggregations: 50,
        });

      const results = await performanceRunner.execute(
        seasonalAggregationScenario,
      );

      // Wedding-specific aggregation requirements
      expect(results.averageQueryTime).toBeLessThan(3000); // <3s for wedding aggregations
      expect(results.errorRate).toBeLessThan(0.0001); // <0.01% error rate for wedding data
      expect(results.memoryUtilization).toBeLessThan(0.8); // <80% memory usage

      console.log(
        `✅ Wedding season aggregation performance: ${results.averageQueryTime.toFixed(0)}ms avg`,
      );
    });
  });

  describe('Cross-Platform Analytics Integration Performance', () => {
    test('should sync data efficiently across BI platforms', async () => {
      const integrationScenario =
        loadScenarios.createCrossPlatformIntegrationTest({
          platforms: ['tableau', 'power_bi', 'looker', 'google_analytics'],
          dataVolume: 'enterprise',
          syncFrequency: 'real_time',
          testDuration: '45m',
        });

      console.log(
        `🎯 Starting cross-platform integration test: ${integrationScenario.description}`,
      );
      const results = await performanceRunner.execute(integrationScenario);

      // Integration performance assertions
      expect(results.dataSyncLatency).toBeLessThan(5000); // <5s sync latency
      expect(results.syncThroughput).toBeGreaterThan(10000); // >10k records/second
      expect(results.dataConsistencyScore).toBeGreaterThan(0.99);
      expect(results.platformAvailability).toBeGreaterThan(0.995); // >99.5% uptime

      console.log(
        `✅ Cross-platform sync: ${results.dataSyncLatency}ms latency, ${(results.dataConsistencyScore * 100).toFixed(2)}% consistency`,
      );
      console.log(
        `🔄 Sync throughput: ${results.syncThroughput!.toFixed(0)} records/sec`,
      );
    });

    test('should handle wedding analytics across multiple platforms', async () => {
      const weddingIntegrationScenario =
        loadScenarios.createCrossPlatformIntegrationTest({
          platforms: ['power_bi', 'tableau', 'wedding_specific_bi'],
          dataVolume: 'large',
          syncFrequency: 'real_time',
          testDuration: '30m',
        });

      const results = await performanceRunner.execute(
        weddingIntegrationScenario,
      );

      // Wedding-specific integration requirements
      expect(results.dataSyncLatency).toBeLessThan(3000); // <3s for wedding data
      expect(results.dataConsistencyScore).toBeGreaterThan(0.995); // >99.5% consistency for wedding data
      expect(results.platformAvailability).toBeGreaterThan(0.99); // >99% platform availability

      console.log(
        `✅ Wedding BI integration: ${(results.dataConsistencyScore! * 100).toFixed(2)}% consistency across platforms`,
      );
    });
  });

  describe('Wedding Season Analytics Performance', () => {
    test('should handle peak wedding season analytics load', async () => {
      const weddingSeasonScenario = loadScenarios.createWeddingSeasonPeakTest({
        peakMultiplier: 10, // 10x normal traffic
        activeWeddings: 50000,
        vendorsAnalyzingData: 10000,
        couplesViewingInsights: 25000,
        peakDuration: '4h', // Saturday afternoon peak
      });

      console.log(
        `🎯 Starting wedding season peak test: ${weddingSeasonScenario.description}`,
      );
      const results = await performanceRunner.execute(weddingSeasonScenario);

      // Wedding season performance requirements
      expect(results.systemUptime).toBe(1.0); // 100% uptime during peak
      expect(results.analyticsResponseTime).toBeLessThan(300); // <300ms during peak
      expect(results.dataFreshness).toBeLessThan(30); // <30s data staleness
      expect(results.userSatisfactionScore).toBeGreaterThan(0.95);

      console.log(
        `✅ Wedding season peak: ${results.analyticsResponseTime}ms response, ${results.dataFreshness}s data freshness`,
      );
      console.log(
        `💒 User satisfaction: ${(results.userSatisfactionScore! * 100).toFixed(1)}% during peak season`,
      );
    });

    test('should maintain performance during multiple concurrent weddings', async () => {
      // Simulate Saturday with 100+ weddings happening simultaneously
      const multiWeddingScenario = loadScenarios.createWeddingSeasonPeakTest({
        peakMultiplier: 15, // Even higher peak for simultaneous weddings
        activeWeddings: 100, // 100 weddings happening at once
        vendorsAnalyzingData: 5000, // Vendors checking real-time data
        couplesViewingInsights: 10000, // Couples and families viewing updates
        peakDuration: '6h', // Full Saturday wedding day
      });

      const results = await performanceRunner.execute(multiWeddingScenario);

      // Critical requirements for wedding day
      expect(results.systemUptime).toBe(1.0); // Absolute 100% uptime
      expect(results.analyticsResponseTime).toBeLessThan(200); // <200ms for wedding day
      expect(results.dataFreshness).toBeLessThan(15); // <15s data staleness for live events
      expect(results.errorRate).toBeLessThan(0.0001); // <0.01% error rate on wedding day

      console.log(
        `✅ Multi-wedding performance: ${results.analyticsResponseTime}ms response time`,
      );
      console.log(
        `💒 Wedding day reliability: ${(results.systemUptime! * 100).toFixed(1)}% uptime, ${(results.errorRate! * 100).toFixed(4)}% error rate`,
      );
    });
  });

  describe('Performance Regression and Stability', () => {
    test('should maintain consistent performance over extended periods', async () => {
      // Long-running stability test
      const stabilityScenario = loadScenarios.createHighVolumeAnalyticsTest({
        concurrentUsers: 1000,
        queriesPerUser: 100,
        datasetSize: 5000000,
        queryTypes: [
          'revenue_aggregation',
          'real_time_metrics',
          'seasonal_analysis',
        ],
      });

      // Extend the test duration for stability testing
      stabilityScenario.duration = 1800000; // 30 minutes
      stabilityScenario.name = 'Extended Stability Test';
      stabilityScenario.description =
        'Long-running performance stability validation';

      const results = await performanceRunner.execute(stabilityScenario);

      // Stability requirements
      expect(results.memoryLeakage || 0).toBeLessThan(0.02); // <2% memory growth over 30 minutes
      expect(results.averageQueryTime).toBeLessThan(250); // Consistent performance
      expect(results.errorRate).toBeLessThan(0.001); // Low error rate over time

      console.log(
        `✅ Stability test: ${(results.memoryLeakage || 0 * 100).toFixed(2)}% memory growth over 30 minutes`,
      );
    });

    test('should recover gracefully from high load spikes', async () => {
      // Test system recovery after stress
      const recoveryScenario = loadScenarios.createStressTestScenario();
      recoveryScenario.duration = 300000; // 5 minutes of stress
      recoveryScenario.name = 'Load Spike Recovery Test';

      const stressResults = await performanceRunner.execute(recoveryScenario);

      // Allow some degradation during stress but system should not fail
      expect(stressResults.errorRate).toBeLessThan(0.1); // <10% error rate during stress
      expect(stressResults.averageQueryTime).toBeLessThan(5000); // <5s even under stress

      // After stress, system should recover quickly
      const normalScenario = loadScenarios.createHighVolumeAnalyticsTest({
        concurrentUsers: 500,
        queriesPerUser: 10,
        datasetSize: 1000000,
        queryTypes: ['real_time_metrics'],
      });

      const recoveryResults = await performanceRunner.execute(normalScenario);

      // Should recover to normal performance quickly
      expect(recoveryResults.averageQueryTime).toBeLessThan(200); // Back to normal
      expect(recoveryResults.errorRate).toBeLessThan(0.001); // Normal error rate

      console.log(
        `✅ Recovery test: ${stressResults.errorRate * 100}% errors during stress, ${recoveryResults.averageQueryTime}ms after recovery`,
      );
    });
  });

  describe('Wedding Analytics Specific Performance', () => {
    test('should efficiently handle wedding timeline analytics', async () => {
      const timelineScenario = loadScenarios.createHighVolumeAnalyticsTest({
        concurrentUsers: 800,
        queriesPerUser: 30,
        datasetSize: 3000000,
        queryTypes: [
          'wedding_timeline_analysis',
          'vendor_schedule_optimization',
          'guest_arrival_prediction',
          'photo_moment_planning',
        ],
      });

      const results = await performanceRunner.execute(timelineScenario);

      // Wedding timeline requires fast, accurate analytics
      expect(results.averageQueryTime).toBeLessThan(150); // <150ms for timeline queries
      expect(results.errorRate).toBeLessThan(0.0005); // <0.05% error rate for wedding planning
      expect(results.queryThroughput).toBeGreaterThan(5000); // High throughput for timeline updates

      console.log(
        `✅ Wedding timeline analytics: ${results.averageQueryTime}ms avg, ${results.queryThroughput.toFixed(0)} queries/sec`,
      );
    });

    test('should handle guest management analytics efficiently', async () => {
      const guestAnalyticsScenario =
        loadScenarios.createHighVolumeAnalyticsTest({
          concurrentUsers: 600,
          queriesPerUser: 40,
          datasetSize: 2000000, // Guest data across all weddings
          queryTypes: [
            'rsvp_analytics',
            'guest_dietary_analysis',
            'seating_optimization',
            'guest_communication_tracking',
          ],
        });

      const results = await performanceRunner.execute(guestAnalyticsScenario);

      // Guest management analytics requirements
      expect(results.averageQueryTime).toBeLessThan(200); // <200ms for guest queries
      expect(results.errorRate).toBeLessThan(0.001); // <0.1% error rate for guest data
      expect(results.memoryUtilization).toBeLessThan(0.7); // <70% memory for guest analytics

      console.log(
        `✅ Guest management analytics: ${results.averageQueryTime}ms avg response time`,
      );
    });
  });
});
