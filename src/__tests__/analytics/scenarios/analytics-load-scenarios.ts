/**
 * Analytics Load Scenarios - Performance Test Scenarios
 * WS-332 Team E - Comprehensive load testing scenarios for analytics dashboard
 */

import {
  LoadScenario,
  LoadOperation,
  ValidationRule,
} from '../utils/analytics-performance-runner';

export interface HighVolumeAnalyticsConfig {
  concurrentUsers: number;
  queriesPerUser: number;
  datasetSize: number;
  queryTypes: string[];
}

export interface RealTimeDashboardConfig {
  concurrentDashboards: number;
  updatesPerSecond: number;
  widgetsPerDashboard: number;
  dataPointsPerWidget: number;
  testDuration: string;
}

export interface LargeDatasetAggregationConfig {
  datasetSizes: number[];
  aggregationTypes: string[];
  concurrentAggregations: number;
}

export interface CrossPlatformIntegrationConfig {
  platforms: string[];
  dataVolume: 'small' | 'medium' | 'large' | 'enterprise';
  syncFrequency: 'real_time' | 'batch' | 'hourly';
  testDuration: string;
}

export interface WeddingSeasonPeakConfig {
  peakMultiplier: number;
  activeWeddings: number;
  vendorsAnalyzingData: number;
  couplesViewingInsights: number;
  peakDuration: string;
}

export class AnalyticsLoadScenarios {
  /**
   * Create high-volume analytics testing scenario
   */
  createHighVolumeAnalyticsTest(
    config: HighVolumeAnalyticsConfig,
  ): LoadScenario {
    const operations: LoadOperation[] = config.queryTypes.map((queryType) => ({
      type: 'query' as const,
      weight: 1.0 / config.queryTypes.length,
      parameters: {
        queryType,
        complexity: this.getQueryComplexity(queryType),
        dataSize: this.getDataSizeForDataset(config.datasetSize),
        expectedResultCount: Math.floor(config.datasetSize / 100),
      },
      timeout: this.getTimeoutForQueryType(queryType),
    }));

    const validationRules: ValidationRule[] = [
      {
        metric: 'averageQueryTime',
        threshold: 200,
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'p95QueryTime',
        threshold: 500,
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'p99QueryTime',
        threshold: 1000,
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'queryThroughput',
        threshold: 5000,
        operator: 'greater_than',
        critical: false,
      },
      {
        metric: 'errorRate',
        threshold: 0.001,
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'memoryUtilization',
        threshold: 0.8,
        operator: 'less_than',
        critical: false,
      },
      {
        metric: 'cpuUtilization',
        threshold: 0.75,
        operator: 'less_than',
        critical: false,
      },
    ];

    return {
      name: 'High-Volume Analytics Test',
      description: `Testing ${config.concurrentUsers} concurrent users executing ${config.queriesPerUser} queries each on ${config.datasetSize.toLocaleString()} records`,
      duration: 300000, // 5 minutes
      concurrency: config.concurrentUsers,
      operations,
      expectedResults: {
        averageQueryTime: 150,
        queryThroughput: 6000,
        errorRate: 0.0005,
      },
      validationRules,
    };
  }

  /**
   * Create real-time dashboard testing scenario
   */
  createRealTimeDashboardTest(config: RealTimeDashboardConfig): LoadScenario {
    const dashboardLoadWeight = 0.1; // 10% dashboard loads
    const realTimeUpdateWeight = 0.9; // 90% real-time updates

    const operations: LoadOperation[] = [
      {
        type: 'dashboard_load',
        weight: dashboardLoadWeight,
        parameters: {
          widgetCount: config.widgetsPerDashboard,
          dataPointsPerWidget: config.dataPointsPerWidget,
          cacheEnabled: true,
          renderMode: 'progressive',
        },
        timeout: 5000,
      },
      {
        type: 'real_time_update',
        weight: realTimeUpdateWeight,
        parameters: {
          updateType: 'metric_update',
          payloadSize: 'small',
          compressionEnabled: true,
          batchUpdates: true,
        },
        timeout: 1000,
      },
    ];

    const validationRules: ValidationRule[] = [
      {
        metric: 'dashboardLoadTime',
        threshold: 2000,
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'widgetRenderTime',
        threshold: 100,
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'realTimeUpdateLatency',
        threshold: 50,
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'memoryLeakage',
        threshold: 0.01,
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'websocketConnectionSuccess',
        threshold: 0.99,
        operator: 'greater_than',
        critical: true,
      },
    ];

    const testDurationMs = this.parseDuration(config.testDuration);

    return {
      name: 'Real-Time Dashboard Performance Test',
      description: `Testing ${config.concurrentDashboards} concurrent dashboards with ${config.updatesPerSecond} updates/sec for ${config.testDuration}`,
      duration: testDurationMs,
      concurrency: config.concurrentDashboards,
      operations,
      expectedResults: {
        dashboardLoadTime: 1500,
        widgetRenderTime: 80,
        realTimeUpdateLatency: 30,
        websocketConnectionSuccess: 0.995,
      },
      validationRules,
    };
  }

  /**
   * Create large dataset aggregation testing scenario
   */
  createLargeDatasetAggregationTest(
    config: LargeDatasetAggregationConfig,
  ): LoadScenario {
    const operations: LoadOperation[] = config.aggregationTypes.map(
      (aggType) => ({
        type: 'query' as const,
        weight: 1.0 / config.aggregationTypes.length,
        parameters: {
          queryType: 'aggregation',
          aggregationType: aggType,
          datasetSize:
            config.datasetSizes[
              Math.floor(Math.random() * config.datasetSizes.length)
            ],
          complexity: 'complex',
          optimizationsEnabled: true,
        },
        timeout: this.getTimeoutForAggregation(aggType),
      }),
    );

    const validationRules: ValidationRule[] = config.datasetSizes.map(
      (size) => ({
        metric: 'averageQueryTime',
        threshold: Math.min(5000, size / 10000),
        operator: 'less_than',
        critical: size > 10000000, // Critical for datasets > 10M
      }),
    );

    return {
      name: 'Large Dataset Aggregation Test',
      description: `Testing aggregations on datasets ranging from ${config.datasetSizes[0].toLocaleString()} to ${config.datasetSizes[config.datasetSizes.length - 1].toLocaleString()} records`,
      duration: 600000, // 10 minutes
      concurrency: config.concurrentAggregations,
      operations,
      expectedResults: {
        averageQueryTime: 2000,
        errorRate: 0.0001,
        memoryUtilization: 0.7,
      },
      validationRules,
    };
  }

  /**
   * Create cross-platform integration testing scenario
   */
  createCrossPlatformIntegrationTest(
    config: CrossPlatformIntegrationConfig,
  ): LoadScenario {
    const operations: LoadOperation[] = [
      {
        type: 'data_sync',
        weight: 0.7,
        parameters: {
          platforms: config.platforms,
          syncType:
            config.syncFrequency === 'real_time' ? 'incremental' : 'batch',
          recordCount: this.getRecordCountForVolume(config.dataVolume),
          consistencyCheck: true,
        },
        timeout: 30000,
      },
      {
        type: 'query',
        weight: 0.3,
        parameters: {
          queryType: 'cross_platform_validation',
          platforms: config.platforms,
          dataVolume: config.dataVolume,
        },
        timeout: 10000,
      },
    ];

    const validationRules: ValidationRule[] = [
      {
        metric: 'dataSyncLatency',
        threshold: 5000,
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'syncThroughput',
        threshold: 10000,
        operator: 'greater_than',
        critical: false,
      },
      {
        metric: 'dataConsistencyScore',
        threshold: 0.99,
        operator: 'greater_than',
        critical: true,
      },
      {
        metric: 'platformAvailability',
        threshold: 0.995,
        operator: 'greater_than',
        critical: true,
      },
    ];

    const testDurationMs = this.parseDuration(config.testDuration);

    return {
      name: 'Cross-Platform Integration Test',
      description: `Testing integration across ${config.platforms.join(', ')} with ${config.dataVolume} data volume`,
      duration: testDurationMs,
      concurrency: config.platforms.length * 10, // 10 connections per platform
      operations,
      expectedResults: {
        dataSyncLatency: 3000,
        dataConsistencyScore: 0.995,
        platformAvailability: 0.998,
      },
      validationRules,
    };
  }

  /**
   * Create wedding season peak testing scenario
   */
  createWeddingSeasonPeakTest(config: WeddingSeasonPeakConfig): LoadScenario {
    // Wedding season means higher analytics load
    const operations: LoadOperation[] = [
      {
        type: 'query',
        weight: 0.4,
        parameters: {
          queryType: 'revenue_analytics',
          complexity: 'medium',
          peakMode: true,
          weddingSeasonMultiplier: config.peakMultiplier,
        },
        timeout: 5000,
      },
      {
        type: 'dashboard_load',
        weight: 0.3,
        parameters: {
          widgetCount: 8, // More widgets during peak season
          weddingSeasonData: true,
          realTimeUpdates: true,
        },
        timeout: 3000,
      },
      {
        type: 'real_time_update',
        weight: 0.3,
        parameters: {
          updateType: 'booking_event',
          peakMultiplier: config.peakMultiplier,
          weddingSeasonMode: true,
        },
        timeout: 500,
      },
    ];

    const validationRules: ValidationRule[] = [
      {
        metric: 'systemUptime',
        threshold: 1.0,
        operator: 'equals',
        critical: true,
      },
      {
        metric: 'analyticsResponseTime',
        threshold: 300,
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'dataFreshness',
        threshold: 30,
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'userSatisfactionScore',
        threshold: 0.95,
        operator: 'greater_than',
        critical: false,
      },
    ];

    const totalConcurrency = Math.floor(
      config.vendorsAnalyzingData * 0.7 + // 70% of vendors actively using analytics
        config.couplesViewingInsights * 0.3, // 30% of couples viewing their data
    );

    const peakDurationMs = this.parseDuration(config.peakDuration);

    return {
      name: 'Wedding Season Peak Load Test',
      description: `Testing ${config.peakMultiplier}x peak load with ${config.activeWeddings} active weddings, ${totalConcurrency} concurrent users`,
      duration: peakDurationMs,
      concurrency: totalConcurrency,
      operations,
      expectedResults: {
        systemUptime: 1.0,
        analyticsResponseTime: 250,
        dataFreshness: 20,
        userSatisfactionScore: 0.97,
      },
      validationRules,
    };
  }

  /**
   * Create comprehensive stress testing scenario
   */
  createStressTestScenario(): LoadScenario {
    const operations: LoadOperation[] = [
      {
        type: 'query',
        weight: 0.5,
        parameters: {
          queryType: 'mixed_complex',
          complexity: 'very_complex',
          dataSize: 'enterprise',
          stressMode: true,
        },
        timeout: 10000,
      },
      {
        type: 'dashboard_load',
        weight: 0.25,
        parameters: {
          widgetCount: 12,
          dataComplexity: 'high',
          stressMode: true,
        },
        timeout: 8000,
      },
      {
        type: 'real_time_update',
        weight: 0.15,
        parameters: {
          updateType: 'bulk_update',
          payloadSize: 'large',
          stressMode: true,
        },
        timeout: 2000,
      },
      {
        type: 'data_sync',
        weight: 0.1,
        parameters: {
          recordCount: 100000,
          syncType: 'full',
          stressMode: true,
        },
        timeout: 30000,
      },
    ];

    const validationRules: ValidationRule[] = [
      {
        metric: 'errorRate',
        threshold: 0.05, // 5% error rate acceptable under stress
        operator: 'less_than',
        critical: true,
      },
      {
        metric: 'averageQueryTime',
        threshold: 2000,
        operator: 'less_than',
        critical: false,
      },
      {
        metric: 'memoryUtilization',
        threshold: 0.95, // 95% memory usage acceptable under stress
        operator: 'less_than',
        critical: true,
      },
    ];

    return {
      name: 'Comprehensive Stress Test',
      description:
        'Maximum load stress testing to identify system breaking points',
      duration: 900000, // 15 minutes
      concurrency: 1000, // High concurrency
      operations,
      expectedResults: {
        errorRate: 0.02,
        averageQueryTime: 1500,
        memoryUtilization: 0.85,
      },
      validationRules,
    };
  }

  // Helper methods
  private getQueryComplexity(queryType: string): string {
    const complexityMap: Record<string, string> = {
      revenue_aggregation: 'medium',
      time_series_analysis: 'complex',
      dimensional_analysis: 'complex',
      real_time_metrics: 'simple',
      seasonal_analysis: 'complex',
      predictive_analytics: 'very_complex',
      cross_platform_validation: 'medium',
    };
    return complexityMap[queryType] || 'medium';
  }

  private getDataSizeForDataset(datasetSize: number): string {
    if (datasetSize < 100000) return 'small';
    if (datasetSize < 1000000) return 'medium';
    if (datasetSize < 10000000) return 'large';
    return 'enterprise';
  }

  private getTimeoutForQueryType(queryType: string): number {
    const timeoutMap: Record<string, number> = {
      revenue_aggregation: 3000,
      time_series_analysis: 5000,
      dimensional_analysis: 8000,
      real_time_metrics: 1000,
      seasonal_analysis: 6000,
      predictive_analytics: 15000,
      cross_platform_validation: 4000,
    };
    return timeoutMap[queryType] || 5000;
  }

  private getTimeoutForAggregation(aggregationType: string): number {
    const timeoutMap: Record<string, number> = {
      sum_aggregation: 3000,
      average_calculation: 4000,
      count_distinct: 8000,
      percentile_calculation: 10000,
      time_series_rolling_average: 12000,
      complex_join_aggregation: 20000,
    };
    return timeoutMap[aggregationType] || 8000;
  }

  private getRecordCountForVolume(dataVolume: string): number {
    const volumeMap: Record<string, number> = {
      small: 10000,
      medium: 100000,
      large: 1000000,
      enterprise: 10000000,
    };
    return volumeMap[dataVolume] || 100000;
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smh])$/);
    if (!match) return 60000; // Default 1 minute

    const [, value, unit] = match;
    const numValue = parseInt(value, 10);

    switch (unit) {
      case 's':
        return numValue * 1000;
      case 'm':
        return numValue * 60 * 1000;
      case 'h':
        return numValue * 60 * 60 * 1000;
      default:
        return 60000;
    }
  }
}
