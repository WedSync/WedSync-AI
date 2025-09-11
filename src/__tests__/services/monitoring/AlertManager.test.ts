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
import { AlertManager } from '@/lib/services/monitoring/AlertManager';
import { TestFramework, TestEnvironment } from '@/lib/testing/TestFramework';

describe('AlertManager', () => {
  let testFramework: TestFramework;
  let testEnv: TestEnvironment;
  let service: AlertManager;

  beforeAll(async () => {
    testFramework = new TestFramework();
    testEnv = await testFramework.initializeTestEnvironment();
    service = new AlertManager();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Alert Creation and Management', () => {
    test('should create alerts with proper priority classification', async () => {
      const alertData = {
        organization_id: testEnv.testOrganizationId,
        alert_type: 'SYSTEM_PERFORMANCE',
        severity: 'WARNING',
        title: 'Database response time elevated',
        message:
          'Database queries averaging 850ms, above warning threshold of 500ms',
        source_system: 'monitoring_service',
        environment_id: testEnv.testEnvironmentId,
        metadata: {
          current_response_time: 850,
          threshold: 500,
          affected_queries: ['user_profiles', 'environment_variables'],
        },
      };

      const { result, metrics } = await testFramework.measurePerformance(
        () => service.createAlert(alertData),
        'alert creation',
      );

      expect(result.success).toBe(true);
      expect(result.alert_id).toBeDefined();
      expect(result.priority_score).toBeGreaterThanOrEqual(0);
      expect(result.priority_score).toBeLessThanOrEqual(100);
      expect(result.estimated_delivery_time_seconds).toBeLessThan(60); // Warning alerts < 1 minute
      expect(metrics.response_time_ms).toBeLessThan(500); // Alert creation < 500ms
    });

    test('should handle critical alerts with maximum priority', async () => {
      const criticalAlert = {
        organization_id: testEnv.testOrganizationId,
        alert_type: 'SYSTEM_FAILURE',
        severity: 'CRITICAL',
        title: 'Database connection pool exhausted',
        message: 'All database connections in use, new requests failing',
        source_system: 'database_monitor',
        environment_id: testEnv.testEnvironmentId,
        requires_immediate_action: true,
        escalation_required: true,
      };

      const result = await service.createAlert(criticalAlert);

      expect(result.success).toBe(true);
      expect(result.priority_score).toBe(100); // Maximum priority
      expect(result.immediate_notification_sent).toBe(true);
      expect(result.escalation_initiated).toBe(true);
      expect(result.estimated_delivery_time_seconds).toBeLessThan(10); // Critical alerts < 10 seconds
    });

    test('should handle wedding day emergency alerts', async () => {
      // Mock Saturday (wedding day)
      const originalDate = Date;
      const mockSaturday = new Date('2024-06-01'); // Saturday
      mockSaturday.getDay = () => 6;
      global.Date = jest.fn(() => mockSaturday) as any;

      const weddingEmergencyAlert = {
        organization_id: testEnv.testOrganizationId,
        alert_type: 'WEDDING_DAY_EMERGENCY',
        severity: 'CRITICAL',
        title: 'Payment system failure on wedding day',
        message:
          'Stripe webhooks failing, payment confirmations not processing',
        wedding_day_context: true,
        affected_weddings_count: 5,
        requires_emergency_response: true,
      };

      const result = await service.createAlert(weddingEmergencyAlert);

      expect(result.success).toBe(true);
      expect(result.wedding_day_protocol_activated).toBe(true);
      expect(result.emergency_contacts_notified).toBe(true);
      expect(result.priority_score).toBe(100);
      expect(result.multiple_channel_delivery).toBe(true); // Email, SMS, Slack, phone calls

      // Restore Date
      global.Date = originalDate;
    });
  });

  describe('Multi-Channel Alert Delivery', () => {
    test('should deliver alerts via email channel', async () => {
      const emailAlert = {
        organization_id: testEnv.testOrganizationId,
        alert_id: 'test-alert-email-001',
        delivery_channels: ['email'],
        recipients: [testEnv.testUserEmail],
        email_template: 'system_warning',
        subject: 'WedSync System Alert: Database Performance Warning',
        priority: 'normal',
      };

      const { result, metrics } = await testFramework.measurePerformance(
        () => service.deliverAlert(emailAlert),
        'email alert delivery',
      );

      expect(result.success).toBe(true);
      expect(result.delivery_results.email.sent).toBe(true);
      expect(result.delivery_results.email.message_id).toBeDefined();
      expect(result.delivery_results.email.delivery_time_seconds).toBeLessThan(
        10,
      );
      expect(metrics.response_time_ms).toBeLessThan(2000); // Email delivery < 2 seconds
    });

    test('should deliver alerts via SMS for critical issues', async () => {
      const smsAlert = {
        organization_id: testEnv.testOrganizationId,
        alert_id: 'test-alert-sms-001',
        delivery_channels: ['sms'],
        recipients: [testEnv.testUserPhone],
        sms_message:
          'CRITICAL: WedSync system failure detected. Check dashboard immediately.',
        priority: 'critical',
      };

      const result = await service.deliverAlert(smsAlert);

      expect(result.success).toBe(true);
      expect(result.delivery_results.sms.sent).toBe(true);
      expect(result.delivery_results.sms.message_sid).toBeDefined();
      expect(result.delivery_results.sms.delivery_time_seconds).toBeLessThan(5); // SMS < 5 seconds
    });

    test('should deliver alerts via multiple channels simultaneously', async () => {
      const multiChannelAlert = {
        organization_id: testEnv.testOrganizationId,
        alert_id: 'test-alert-multi-001',
        delivery_channels: ['email', 'sms', 'slack', 'webhook'],
        priority: 'critical',
        message: 'Critical system alert requiring immediate attention',
      };

      const { result, metrics } = await testFramework.measurePerformance(
        () => service.deliverAlert(multiChannelAlert),
        'multi-channel alert delivery',
      );

      expect(result.success).toBe(true);
      expect(result.channels_attempted).toBe(4);
      expect(result.channels_successful).toBeGreaterThanOrEqual(2); // At least 2 channels successful
      expect(result.fastest_delivery_time_seconds).toBeLessThan(5); // Fastest channel < 5 seconds
      expect(metrics.response_time_ms).toBeLessThan(5000); // All channels < 5 seconds
    });
  });

  describe('Alert Escalation Management', () => {
    test('should escalate unacknowledged critical alerts', async () => {
      // Create initial alert
      const initialAlert = await service.createAlert({
        organization_id: testEnv.testOrganizationId,
        alert_type: 'SYSTEM_FAILURE',
        severity: 'CRITICAL',
        title: 'Database connection failure',
        requires_acknowledgment: true,
        escalation_timeout_minutes: 5,
      });

      // Mock time passage (6 minutes later)
      const originalDate = Date.now;
      Date.now = jest.fn(() => originalDate() + 6 * 60 * 1000);

      const escalationResult = await service.processEscalation(
        initialAlert.alert_id,
      );

      expect(escalationResult.success).toBe(true);
      expect(escalationResult.escalation_triggered).toBe(true);
      expect(escalationResult.escalation_level).toBe(1);
      expect(escalationResult.additional_contacts_notified).toBeGreaterThan(0);

      // Restore Date.now
      Date.now = originalDate;
    });

    test('should handle multi-level escalation chains', async () => {
      const escalationConfig = {
        organization_id: testEnv.testOrganizationId,
        alert_type: 'PAYMENT_SYSTEM_FAILURE',
        escalation_levels: [
          {
            level: 1,
            timeout_minutes: 5,
            contacts: ['developer'],
            channels: ['email', 'slack'],
          },
          {
            level: 2,
            timeout_minutes: 10,
            contacts: ['team_lead'],
            channels: ['sms', 'email'],
          },
          {
            level: 3,
            timeout_minutes: 15,
            contacts: ['cto'],
            channels: ['phone', 'sms', 'email'],
          },
        ],
      };

      const result = await service.configureEscalationChain(escalationConfig);

      expect(result.success).toBe(true);
      expect(result.escalation_levels_configured).toBe(3);
      expect(result.total_contacts_in_chain).toBeGreaterThanOrEqual(3);
      expect(result.configuration_validated).toBe(true);
    });
  });

  describe('Alert Suppression and Deduplication', () => {
    test('should suppress duplicate alerts within time window', async () => {
      const alertData = {
        organization_id: testEnv.testOrganizationId,
        alert_type: 'DATABASE_SLOW_QUERY',
        message: 'Query execution time exceeds threshold',
        source_identifier: 'user_profiles_query',
        suppression_window_minutes: 10,
      };

      // Send first alert
      const firstAlert = await service.createAlert(alertData);
      expect(firstAlert.success).toBe(true);
      expect(firstAlert.suppressed).toBe(false);

      // Send duplicate alert immediately
      const duplicateAlert = await service.createAlert(alertData);
      expect(duplicateAlert.success).toBe(true);
      expect(duplicateAlert.suppressed).toBe(true);
      expect(duplicateAlert.suppression_reason).toContain(
        'duplicate within suppression window',
      );
    });

    test('should group related alerts intelligently', async () => {
      const relatedAlerts = [
        {
          organization_id: testEnv.testOrganizationId,
          alert_type: 'DATABASE_CONNECTION_HIGH',
          message: 'Database connection pool at 85%',
          correlation_key: 'database_performance_issue',
        },
        {
          organization_id: testEnv.testOrganizationId,
          alert_type: 'DATABASE_SLOW_QUERY',
          message: 'Multiple slow queries detected',
          correlation_key: 'database_performance_issue',
        },
        {
          organization_id: testEnv.testOrganizationId,
          alert_type: 'API_RESPONSE_SLOW',
          message: 'API response times elevated',
          correlation_key: 'database_performance_issue',
        },
      ];

      const results = await Promise.all(
        relatedAlerts.map((alert) => service.createAlert(alert)),
      );

      // First alert should be created normally
      expect(results[0].success).toBe(true);
      expect(results[0].alert_group_id).toBeDefined();

      // Subsequent alerts should be grouped
      expect(results[1].alert_group_id).toBe(results[0].alert_group_id);
      expect(results[2].alert_group_id).toBe(results[0].alert_group_id);

      // Check group summary
      const groupSummary = await service.getAlertGroupSummary(
        results[0].alert_group_id,
      );
      expect(groupSummary.total_alerts).toBe(3);
      expect(groupSummary.correlation_analysis).toBeDefined();
    });
  });

  describe('Alert Analytics and Reporting', () => {
    test('should generate comprehensive alert analytics', async () => {
      const { result, metrics } = await testFramework.measurePerformance(
        () =>
          service.generateAlertAnalytics(testEnv.testOrganizationId, {
            time_period_days: 30,
            include_trends: true,
            include_resolution_metrics: true,
            group_by: ['alert_type', 'severity', 'day_of_week'],
          }),
        'alert analytics generation',
      );

      expect(result.success).toBe(true);
      expect(result.analytics).toBeDefined();
      expect(result.analytics.total_alerts).toBeGreaterThanOrEqual(0);
      expect(result.analytics.alert_type_breakdown).toBeDefined();
      expect(result.analytics.severity_distribution).toBeDefined();
      expect(result.analytics.resolution_time_metrics).toBeDefined();
      expect(result.analytics.trends).toBeDefined();
      expect(metrics.response_time_ms).toBeLessThan(3000); // Analytics < 3 seconds
    });

    test('should identify alert patterns and anomalies', async () => {
      const result = await service.analyzeAlertPatterns(
        testEnv.testOrganizationId,
        {
          analysis_period_days: 90,
          detect_anomalies: true,
          predict_future_alerts: true,
          include_seasonal_factors: true, // Wedding seasons
        },
      );

      expect(result.success).toBe(true);
      expect(result.patterns_identified).toBeDefined();
      expect(result.anomalies_detected).toBeDefined();
      expect(result.predictions).toBeDefined();
      expect(result.seasonal_analysis).toBeDefined();

      if (result.anomalies_detected.length > 0) {
        expect(result.recommendations).toBeDefined();
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Wedding Day Alert Protocols', () => {
    test('should activate enhanced alerting for wedding days', async () => {
      // Mock Saturday
      const originalDate = Date;
      const mockSaturday = new Date('2024-06-01'); // Saturday
      mockSaturday.getDay = () => 6;
      global.Date = jest.fn(() => mockSaturday) as any;

      const result = await service.activateWeddingDayProtocol(
        testEnv.testOrganizationId,
        {
          emergency_contacts: [testEnv.emergencyContactId],
          escalation_speed_multiplier: 3, // 3x faster escalation
          additional_channels: ['sms', 'phone'],
          monitoring_intensity: 'maximum',
        },
      );

      expect(result.success).toBe(true);
      expect(result.wedding_day_mode_active).toBe(true);
      expect(result.enhanced_monitoring_activated).toBe(true);
      expect(result.emergency_protocols_loaded).toBe(true);
      expect(result.escalation_timers_reduced).toBe(true);

      // Restore Date
      global.Date = originalDate;
    });

    test('should handle wedding day emergency contacts properly', async () => {
      const emergencyAlert = {
        organization_id: testEnv.testOrganizationId,
        alert_type: 'WEDDING_DAY_CRITICAL',
        severity: 'EMERGENCY',
        wedding_day_context: {
          active_weddings_count: 3,
          affected_suppliers: ['photographer', 'venue', 'caterer'],
          estimated_impact: 'HIGH',
        },
        requires_emergency_response: true,
      };

      const result = await service.createAlert(emergencyAlert);

      expect(result.success).toBe(true);
      expect(result.emergency_contacts_notified).toBe(true);
      expect(result.notification_channels_used).toContain('sms');
      expect(result.notification_channels_used).toContain('phone');
      expect(result.escalation_bypass_activated).toBe(true); // Skip normal escalation
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle high volume alert processing', async () => {
      const alertVolume = 100;
      const alertPromises = [];

      for (let i = 0; i < alertVolume; i++) {
        alertPromises.push(
          service.createAlert({
            organization_id: testEnv.testOrganizationId,
            alert_type: 'LOAD_TEST_ALERT',
            severity: 'INFO',
            message: `Load test alert ${i}`,
            batch_processing: true,
          }),
        );
      }

      const { metrics } = await testFramework.measurePerformance(
        () => Promise.all(alertPromises),
        `processing ${alertVolume} alerts`,
      );

      expect(metrics.response_time_ms).toBeLessThan(10000); // 100 alerts < 10 seconds
    });

    test('should maintain performance during alert delivery spikes', async () => {
      const deliverySpike = 50;
      const deliveryPromises = [];

      for (let i = 0; i < deliverySpike; i++) {
        deliveryPromises.push(
          service.deliverAlert({
            organization_id: testEnv.testOrganizationId,
            alert_id: `spike-test-${i}`,
            delivery_channels: ['email'],
            priority: 'normal',
          }),
        );
      }

      const results = await Promise.all(deliveryPromises);
      const successfulDeliveries = results.filter((r) => r.success).length;

      expect(successfulDeliveries).toBeGreaterThan(deliverySpike * 0.95); // 95% success rate
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle delivery channel failures gracefully', async () => {
      // Mock email service failure
      const originalEmailService = service.emailService;
      service.emailService = {
        send: () => {
          throw new Error('Email service temporarily unavailable');
        },
      } as any;

      const alertWithFailover = {
        organization_id: testEnv.testOrganizationId,
        alert_id: 'failover-test-001',
        delivery_channels: ['email', 'sms', 'slack'],
        failover_enabled: true,
        priority: 'critical',
      };

      const result = await service.deliverAlert(alertWithFailover);

      expect(result.success).toBe(true); // Should succeed via other channels
      expect(result.delivery_results.email.failed).toBe(true);
      expect(result.failover_channels_used).toBeGreaterThan(0);
      expect(result.final_delivery_successful).toBe(true);

      // Restore email service
      service.emailService = originalEmailService;
    });

    test('should maintain alert queue during system failures', async () => {
      // Create alerts during simulated failure
      const alertsDuringFailure = [];

      // Mock temporary system failure
      const originalCreateAlert = service.createAlert;
      let failureMode = true;

      service.createAlert = jest.fn((alertData) => {
        if (failureMode) {
          return Promise.resolve({
            success: false,
            error: 'System temporarily unavailable',
            queued_for_retry: true,
          });
        }
        return originalCreateAlert.call(service, alertData);
      });

      // Create alerts during failure
      for (let i = 0; i < 5; i++) {
        const result = await service.createAlert({
          organization_id: testEnv.testOrganizationId,
          alert_type: 'TEST_DURING_FAILURE',
          message: `Alert during failure ${i}`,
        });
        alertsDuringFailure.push(result);
      }

      // Verify alerts were queued
      alertsDuringFailure.forEach((result) => {
        expect(result.queued_for_retry).toBe(true);
      });

      // Simulate system recovery
      failureMode = false;
      service.createAlert = originalCreateAlert;

      // Process queued alerts
      const queueProcessResult = await service.processQueuedAlerts(
        testEnv.testOrganizationId,
      );
      expect(queueProcessResult.processed_alerts).toBe(5);
      expect(queueProcessResult.successful_alerts).toBe(5);
    });
  });

  describe('Integration Tests', () => {
    test('should integrate with monitoring service for alert triggers', async () => {
      const integrationResult = await service.testMonitoringIntegration(
        testEnv.testOrganizationId,
        {
          test_alert_triggers: true,
          verify_alert_creation: true,
          test_data_flow: true,
        },
      );

      expect(integrationResult.success).toBe(true);
      expect(integrationResult.monitoring_service_responsive).toBe(true);
      expect(integrationResult.alert_triggers_working).toBe(true);
      expect(integrationResult.data_flow_validated).toBe(true);
    });

    test('should coordinate with wedding day safety service', async () => {
      const coordinationResult = await service.testWeddingDaySafetyIntegration(
        testEnv.testOrganizationId,
        {
          test_emergency_protocols: true,
          verify_escalation_chains: true,
          validate_contact_management: true,
        },
      );

      expect(coordinationResult.success).toBe(true);
      expect(coordinationResult.safety_service_integration).toBe(true);
      expect(coordinationResult.emergency_protocols_validated).toBe(true);
      expect(coordinationResult.contact_chain_verified).toBe(true);
    });
  });
});
