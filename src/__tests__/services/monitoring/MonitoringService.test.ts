import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { MonitoringService } from '@/lib/services/monitoring/MonitoringService';
import { TestFramework, TestEnvironment } from '@/lib/testing/TestFramework';

// Helper functions to reduce nesting depth
const createConcurrentPromises = (count: number, promiseFactory: () => Promise<any>) => {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(promiseFactory());
  }
  return promises;
};

const expectAllSuccessful = (results: Array<{success: boolean}>) => {
  return results.every((r) => r.success);
};

describe('MonitoringService', () => {
  let testFramework: TestFramework;
  let testEnv: TestEnvironment;
  let service: MonitoringService;

  beforeAll(async () => {
    testFramework = new TestFramework();
    testEnv = await testFramework.initializeTestEnvironment();
    service = new MonitoringService();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('System Health Monitoring', () => {
    test('should collect comprehensive system health metrics', async () => {
      const { result, metrics } = await testFramework.measurePerformance(
        () => service.collectSystemHealth(testEnv.testOrganizationId),
        'system health collection',
      );

      expect(result.success).toBe(true);
      expect(result.health_data).toBeDefined();
      expect(result.health_data.database_health).toBeDefined();
      expect(result.health_data.api_health).toBeDefined();
      expect(result.health_data.storage_health).toBeDefined();
      expect(result.health_data.overall_health_score).toBeGreaterThanOrEqual(0);
      expect(result.health_data.overall_health_score).toBeLessThanOrEqual(100);
      expect(metrics.response_time_ms).toBeLessThan(2000); // Health check < 2 seconds
    });

    test('should detect database performance issues', async () => {
      const result = await service.checkDatabaseHealth(
        testEnv.testOrganizationId,
        testEnv.testEnvironmentId,
      );

      expect(result.success).toBe(true);
      expect(result.database_metrics).toBeDefined();
      expect(result.database_metrics.connection_count).toBeGreaterThanOrEqual(
        0,
      );
      expect(result.database_metrics.query_performance).toBeDefined();
      expect(result.database_metrics.lock_contention).toBeDefined();
      expect(result.warnings).toBeDefined();

      // Should detect slow queries if any exist
      if (result.database_metrics.slow_queries.length > 0) {
        expect(result.recommendations).toContain('optimize slow queries');
      }
    });

    test('should monitor API endpoint performance', async () => {
      const result = await service.monitorAPIPerformance(
        testEnv.testOrganizationId,
        {
          time_window_minutes: 30,
          include_error_rates: true,
          include_response_times: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.api_metrics).toBeDefined();
      expect(result.api_metrics.total_requests).toBeGreaterThanOrEqual(0);
      expect(result.api_metrics.error_rate_percentage).toBeGreaterThanOrEqual(
        0,
      );
      expect(
        result.api_metrics.average_response_time_ms,
      ).toBeGreaterThanOrEqual(0);
      expect(result.api_metrics.slowest_endpoints).toBeDefined();

      // Should flag high error rates
      if (result.api_metrics.error_rate_percentage > 5) {
        expect(result.alerts).toContain('HIGH_ERROR_RATE');
      }
    });
  });

  describe('Environment Variable Monitoring', () => {
    test('should monitor environment variable usage patterns', async () => {
      const result = await service.monitorVariableUsage(
        testEnv.testOrganizationId,
        testEnv.testEnvironmentId,
        {
          include_access_patterns: true,
          include_modification_history: true,
          time_range_hours: 24,
        },
      );

      expect(result.success).toBe(true);
      expect(result.usage_metrics).toBeDefined();
      expect(result.usage_metrics.total_variables).toBeGreaterThanOrEqual(0);
      expect(result.usage_metrics.most_accessed_variables).toBeDefined();
      expect(result.usage_metrics.recent_modifications).toBeDefined();
      expect(result.usage_metrics.encryption_status_breakdown).toBeDefined();
    });

    test('should detect variable configuration drift', async () => {
      const result = await service.detectConfigurationDrift(
        testEnv.testOrganizationId,
        {
          compare_environments: [testEnv.testEnvironmentId],
          include_value_differences: false, // Security - only structure
          detect_missing_variables: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.drift_analysis).toBeDefined();
      expect(result.drift_analysis.environments_compared).toBeGreaterThan(0);
      expect(result.drift_analysis.differences_found).toBeDefined();

      if (result.drift_analysis.differences_found > 0) {
        expect(result.recommendations).toBeDefined();
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Metrics', () => {
    test('should track system performance over time', async () => {
      const result = await service.generatePerformanceReport(
        testEnv.testOrganizationId,
        {
          report_period_days: 7,
          include_trends: true,
          include_predictions: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.performance_report).toBeDefined();
      expect(result.performance_report.time_period).toBeDefined();
      expect(result.performance_report.metrics_summary).toBeDefined();
      expect(result.performance_report.trends).toBeDefined();

      // Performance report should include key metrics
      expect(
        result.performance_report.metrics_summary.average_response_time,
      ).toBeGreaterThanOrEqual(0);
      expect(
        result.performance_report.metrics_summary.peak_concurrent_users,
      ).toBeGreaterThanOrEqual(0);
      expect(
        result.performance_report.metrics_summary.error_rate,
      ).toBeGreaterThanOrEqual(0);
    });

    test('should predict performance bottlenecks', async () => {
      const result = await service.predictPerformanceBottlenecks(
        testEnv.testOrganizationId,
        {
          prediction_horizon_days: 30,
          include_capacity_planning: true,
          wedding_season_adjustment: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.predictions).toBeDefined();
      expect(result.capacity_recommendations).toBeDefined();
      expect(result.wedding_season_factors).toBeDefined();

      // Should provide actionable insights
      if (result.predictions.bottlenecks_predicted > 0) {
        expect(result.capacity_recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Real-time Monitoring', () => {
    test('should provide real-time system status', async () => {
      const { result, metrics } = await testFramework.measurePerformance(
        () => service.getRealTimeStatus(testEnv.testOrganizationId),
        'real-time status check',
      );

      expect(result.success).toBe(true);
      expect(result.realtime_data).toBeDefined();
      expect(result.realtime_data.current_users_active).toBeGreaterThanOrEqual(
        0,
      );
      expect(result.realtime_data.system_load).toBeDefined();
      expect(result.realtime_data.database_connections).toBeDefined();
      expect(result.realtime_data.last_updated).toBeDefined();
      expect(metrics.response_time_ms).toBeLessThan(500); // Real-time data < 500ms
    });

    test('should handle concurrent monitoring requests', async () => {
      const concurrentRequests = 50;
      const { metrics } = await testFramework.measurePerformance(async () => {
        const promises = createConcurrentPromises(
          concurrentRequests,
          () => service.getRealTimeStatus(testEnv.testOrganizationId)
        );
        const results = await Promise.all(promises);
        return expectAllSuccessful(results);
      }, `${concurrentRequests} concurrent monitoring requests`);

      expect(metrics.response_time_ms).toBeLessThan(3000); // 50 concurrent requests < 3 seconds
    });
  });

  describe('Wedding Day Monitoring', () => {
    test('should activate enhanced monitoring on Saturdays', async () => {
      // Mock Saturday
      const originalDate = Date;
      const mockSaturday = new Date('2024-06-01'); // Saturday
      mockSaturday.getDay = () => 6;
      global.Date = jest.fn(() => mockSaturday) as any;

      const result = await service.activateWeddingDayMonitoring(
        testEnv.testOrganizationId,
      );

      expect(result.success).toBe(true);
      expect(result.wedding_day_mode_active).toBe(true);
      expect(result.enhanced_monitoring_settings).toBeDefined();
      expect(
        result.enhanced_monitoring_settings.check_interval_seconds,
      ).toBeLessThan(60); // More frequent checks
      expect(result.enhanced_monitoring_settings.alert_threshold_reduced).toBe(
        true,
      );

      // Restore Date
      global.Date = originalDate;
    });

    test('should monitor wedding-critical variables with high priority', async () => {
      const result = await service.monitorWeddingCriticalVariables(
        testEnv.testOrganizationId,
        {
          priority_level: 'WEDDING_DAY_CRITICAL',
          check_interval_seconds: 30,
          alert_on_any_change: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.monitoring_active).toBe(true);
      expect(result.variables_monitored).toBeGreaterThanOrEqual(0);
      expect(result.alerts_configured).toBeDefined();

      if (result.variables_monitored > 0) {
        expect(result.health_status).toBeDefined();
      }
    });
  });

  describe('Alert Threshold Management', () => {
    test('should configure and validate alert thresholds', async () => {
      const thresholds = {
        response_time_warning_ms: 1000,
        response_time_critical_ms: 3000,
        error_rate_warning_percent: 2,
        error_rate_critical_percent: 5,
        database_connection_warning_percent: 80,
        database_connection_critical_percent: 95,
        disk_usage_warning_percent: 80,
        disk_usage_critical_percent: 90,
      };

      const result = await service.configureAlertThresholds(
        testEnv.testOrganizationId,
        thresholds,
      );

      expect(result.success).toBe(true);
      expect(result.thresholds_set).toBe(Object.keys(thresholds).length);
      expect(result.validation_passed).toBe(true);
    });

    test('should evaluate alert conditions correctly', async () => {
      const mockMetrics = {
        current_response_time_ms: 2500,
        current_error_rate_percent: 3.5,
        current_database_connections_percent: 85,
        current_disk_usage_percent: 75,
      };

      const result = await service.evaluateAlertConditions(
        testEnv.testOrganizationId,
        mockMetrics,
      );

      expect(result.success).toBe(true);
      expect(result.alerts_triggered).toBeDefined();

      // Based on mock data, should trigger response time and error rate alerts
      const alertTypes = result.alerts_triggered.map(
        (alert: any) => alert.alert_type,
      );
      expect(alertTypes).toContain('RESPONSE_TIME_WARNING');
      expect(alertTypes).toContain('ERROR_RATE_WARNING');
    });
  });

  describe('Metric Aggregation', () => {
    test('should aggregate metrics efficiently over time periods', async () => {
      const { result, metrics } = await testFramework.measurePerformance(
        () =>
          service.aggregateMetrics(testEnv.testOrganizationId, {
            aggregation_period: 'hourly',
            time_range_hours: 24,
            metrics: [
              'response_time',
              'error_rate',
              'throughput',
              'database_performance',
            ],
          }),
        'metric aggregation',
      );

      expect(result.success).toBe(true);
      expect(result.aggregated_data).toBeDefined();
      expect(result.aggregated_data.time_series).toBeDefined();
      expect(result.aggregated_data.summary_statistics).toBeDefined();
      expect(metrics.response_time_ms).toBeLessThan(5000); // Aggregation < 5 seconds
    });

    test('should handle large dataset aggregations', async () => {
      const { result, metrics } = await testFramework.measurePerformance(
        () =>
          service.aggregateMetrics(testEnv.testOrganizationId, {
            aggregation_period: 'daily',
            time_range_hours: 720, // 30 days
            metrics: ['response_time', 'error_rate', 'throughput'],
            include_percentiles: true,
          }),
        'large dataset aggregation',
      );

      expect(result.success).toBe(true);
      expect(result.aggregated_data.data_points).toBeGreaterThan(0);
      expect(metrics.response_time_ms).toBeLessThan(15000); // Large aggregation < 15 seconds
    });
  });

  describe('Error Handling', () => {
    test('should handle monitoring service failures gracefully', async () => {
      // Mock service failure
      const originalSupabase = service.supabase;
      service.supabase = {
        from: () => {
          throw new Error('Monitoring database unavailable');
        },
      } as any;

      const result = await service.collectSystemHealth(
        testEnv.testOrganizationId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Monitoring database unavailable');
      expect(result.fallback_monitoring_active).toBe(true);

      // Restore
      service.supabase = originalSupabase;
    });

    test('should implement monitoring service redundancy', async () => {
      const result = await service.testMonitoringRedundancy(
        testEnv.testOrganizationId,
      );

      expect(result.success).toBe(true);
      expect(result.primary_monitoring_healthy).toBeDefined();
      expect(result.backup_monitoring_healthy).toBeDefined();
      expect(result.failover_time_seconds).toBeLessThan(10); // Failover < 10 seconds
    });
  });

  describe('Data Retention and Cleanup', () => {
    test('should manage monitoring data retention properly', async () => {
      const result = await service.manageDataRetention(
        testEnv.testOrganizationId,
        {
          retention_policy_days: 90,
          archive_old_data: true,
          compress_archived_data: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.records_processed).toBeGreaterThanOrEqual(0);
      expect(result.records_archived).toBeGreaterThanOrEqual(0);
      expect(result.records_deleted).toBeGreaterThanOrEqual(0);
      expect(result.storage_freed_mb).toBeGreaterThanOrEqual(0);
    });

    test('should cleanup old monitoring data without affecting active monitoring', async () => {
      // First, verify active monitoring works
      const beforeCleanup = await service.getRealTimeStatus(
        testEnv.testOrganizationId,
      );
      expect(beforeCleanup.success).toBe(true);

      // Run cleanup
      const cleanupResult = await service.cleanupOldMonitoringData(
        testEnv.testOrganizationId,
        {
          cleanup_older_than_days: 30,
          batch_size: 1000,
          verify_integrity: true,
        },
      );

      expect(cleanupResult.success).toBe(true);

      // Verify monitoring still works after cleanup
      const afterCleanup = await service.getRealTimeStatus(
        testEnv.testOrganizationId,
      );
      expect(afterCleanup.success).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should integrate with AlertManager properly', async () => {
      const integrationResult = await service.testAlertManagerIntegration(
        testEnv.testOrganizationId,
        {
          test_alert_types: ['WARNING', 'CRITICAL', 'WEDDING_DAY_EMERGENCY'],
          verify_delivery: true,
        },
      );

      expect(integrationResult.success).toBe(true);
      expect(integrationResult.alert_manager_responsive).toBe(true);
      expect(integrationResult.test_alerts_sent).toBe(3);
      expect(integrationResult.delivery_confirmations_received).toBe(3);
    });

    test('should provide monitoring data to analytics dashboard', async () => {
      const analyticsData = await service.prepareAnalyticsDashboardData(
        testEnv.testOrganizationId,
        {
          dashboard_type: 'executive',
          time_period_days: 7,
          include_predictions: true,
        },
      );

      expect(analyticsData.success).toBe(true);
      expect(analyticsData.dashboard_data).toBeDefined();
      expect(analyticsData.dashboard_data.kpi_metrics).toBeDefined();
      expect(analyticsData.dashboard_data.trend_data).toBeDefined();
      expect(analyticsData.dashboard_data.performance_indicators).toBeDefined();
    });
  });

  describe('Load and Stress Testing', () => {
    test('should handle monitoring under high system load', async () => {
      const loadTestResults = await testFramework.performLoadTest(
        () => service.collectSystemHealth(testEnv.testOrganizationId),
        {
          concurrency: 20,
          iterations: 100,
          timeout_ms: 10000,
        },
      );

      expect(loadTestResults.success_rate).toBeGreaterThan(0.95); // 95% success rate under load
      expect(loadTestResults.average_response_time_ms).toBeLessThan(3000); // < 3 seconds under load
      expect(loadTestResults.errors.length).toBeLessThan(5); // < 5 errors out of 100 iterations
    });
  });
});
