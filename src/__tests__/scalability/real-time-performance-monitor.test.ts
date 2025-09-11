import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';
import { RealTimePerformanceMonitor } from '@/lib/scalability/backend/real-time-performance-monitor';
import type {
  SystemMetrics,
  MonitoringSession,
  AnomalyDetection,
  AlertConfiguration,
  PerformanceThreshold,
  MonitoringConfiguration,
} from '@/lib/scalability/types/core';

describe('RealTimePerformanceMonitor', () => {
  let monitor: RealTimePerformanceMonitor;
  let mockWebSocket: jest.Mocked<WebSocket>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock WebSocket
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.OPEN,
      url: 'ws://localhost:3001/monitoring',
    } as any;

    global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket);

    monitor = new RealTimePerformanceMonitor();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('startRealTimeMonitoring', () => {
    it('should initialize monitoring session successfully', async () => {
      // Arrange
      const services = ['api', 'database', 'auth', 'storage'];
      const config: MonitoringConfiguration = {
        samplingIntervalMs: 1000,
        alertThresholds: {
          cpuUtilization: 85,
          memoryUtilization: 80,
          responseTimeP95: 1000,
          errorRate: 0.05,
        },
        enableAnomalyDetection: true,
        retentionPeriodHours: 24,
      };

      // Act
      const session: MonitoringSession = await monitor.startRealTimeMonitoring(
        services,
        config,
      );

      // Assert
      expect(session.sessionId).toBeDefined();
      expect(session.startTime).toBeDefined();
      expect(session.services).toEqual(services);
      expect(session.status).toBe('active');
      expect(session.metricsCollected).toBe(0);
      expect(session.alertsGenerated).toBe(0);
      expect(global.WebSocket).toHaveBeenCalledWith(
        'ws://localhost:3001/monitoring',
      );
    });

    it('should handle wedding day monitoring with enhanced alerting', async () => {
      // Arrange
      const weddingDayServices = [
        'api',
        'database',
        'auth',
        'storage',
        'realtime',
        'media',
      ];
      const weddingDayConfig: MonitoringConfiguration = {
        samplingIntervalMs: 500, // More frequent sampling on wedding days
        alertThresholds: {
          cpuUtilization: 70, // Lower thresholds for wedding days
          memoryUtilization: 70,
          responseTimeP95: 500,
          errorRate: 0.01,
        },
        enableAnomalyDetection: true,
        retentionPeriodHours: 48, // Longer retention for wedding days
        weddingDayMode: true,
      };

      // Act
      const session = await monitor.startRealTimeMonitoring(
        weddingDayServices,
        weddingDayConfig,
      );

      // Assert
      expect(session.weddingDayMode).toBe(true);
      expect(session.enhancedAlerting).toBe(true);
      expect(session.samplingInterval).toBe(500);
      expect(session.services).toContain('realtime');
      expect(session.services).toContain('media');
    });

    it('should configure different monitoring levels', async () => {
      // Arrange
      const basicServices = ['api', 'database'];
      const basicConfig: MonitoringConfiguration = {
        monitoringLevel: 'basic',
        samplingIntervalMs: 5000,
        alertThresholds: {
          cpuUtilization: 90,
          memoryUtilization: 85,
          responseTimeP95: 2000,
          errorRate: 0.1,
        },
        enableAnomalyDetection: false,
      };

      // Act
      const session = await monitor.startRealTimeMonitoring(
        basicServices,
        basicConfig,
      );

      // Assert
      expect(session.monitoringLevel).toBe('basic');
      expect(session.anomalyDetectionEnabled).toBe(false);
      expect(session.samplingInterval).toBe(5000);
    });
  });

  describe('collectCurrentMetrics', () => {
    it('should collect comprehensive system metrics', async () => {
      // Arrange
      const services = ['api', 'database', 'auth'];
      await monitor.startRealTimeMonitoring(services);

      // Act
      const metrics: SystemMetrics = await monitor.collectCurrentMetrics();

      // Assert
      expect(metrics.timestamp).toBeDefined();
      expect(typeof metrics.cpuUtilization).toBe('number');
      expect(typeof metrics.memoryUtilization).toBe('number');
      expect(typeof metrics.requestsPerSecond).toBe('number');
      expect(typeof metrics.responseTimeP95).toBe('number');
      expect(typeof metrics.databaseConnections).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
      expect(metrics.serviceHealthScores).toBeDefined();
      expect(metrics.serviceHealthScores.api).toBeDefined();
      expect(metrics.serviceHealthScores.database).toBeDefined();
      expect(metrics.serviceHealthScores.auth).toBeDefined();
    });

    it('should include wedding-specific metrics when available', async () => {
      // Arrange
      const services = ['api', 'database', 'auth', 'realtime'];
      const weddingConfig: MonitoringConfiguration = {
        weddingDayMode: true,
        includeWeddingMetrics: true,
        samplingIntervalMs: 1000,
        alertThresholds: {
          cpuUtilization: 75,
          memoryUtilization: 75,
          responseTimeP95: 800,
          errorRate: 0.02,
        },
      };

      await monitor.startRealTimeMonitoring(services, weddingConfig);

      // Act
      const metrics = await monitor.collectCurrentMetrics();

      // Assert
      expect(metrics.customMetrics).toBeDefined();
      expect(metrics.customMetrics.activeWeddings).toBeDefined();
      expect(metrics.customMetrics.weddingDayActive).toBeDefined();
      expect(metrics.customMetrics.realtimeConnections).toBeDefined();
      expect(metrics.customMetrics.mediaUploadsPerSecond).toBeDefined();
    });

    it('should handle service unavailability gracefully', async () => {
      // Arrange
      const services = ['api', 'database', 'unavailable-service'];
      await monitor.startRealTimeMonitoring(services);

      // Mock a service failure
      jest
        .spyOn(monitor as any, 'collectServiceMetrics')
        .mockImplementation((service: string) => {
          if (service === 'unavailable-service') {
            throw new Error('Service unavailable');
          }
          return { healthScore: 95, responseTime: 150 };
        });

      // Act
      const metrics = await monitor.collectCurrentMetrics();

      // Assert
      expect(metrics.serviceHealthScores.api).toBeDefined();
      expect(metrics.serviceHealthScores.database).toBeDefined();
      expect(metrics.serviceHealthScores['unavailable-service']).toBe(0);
      expect(metrics.customMetrics.failedServices).toContain(
        'unavailable-service',
      );
    });
  });

  describe('detectAnomalies', () => {
    it('should detect CPU utilization anomalies', async () => {
      // Arrange
      const normalMetrics: SystemMetrics[] = Array(10)
        .fill(null)
        .map((_, index) => ({
          timestamp: new Date(Date.now() - (10 - index) * 60000), // Last 10 minutes
          cpuUtilization: 45 + index * 2, // Normal range 45-65%
          memoryUtilization: 50,
          requestsPerSecond: 1000,
          responseTimeP95: 200,
          databaseConnections: 50,
          errorRate: 0.01,
          serviceHealthScores: { api: 90, database: 85, auth: 88 },
          customMetrics: {},
        }));

      const spikeMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 95, // Sudden spike
        memoryUtilization: 52,
        requestsPerSecond: 1050,
        responseTimeP95: 210,
        databaseConnections: 55,
        errorRate: 0.012,
        serviceHealthScores: { api: 88, database: 80, auth: 85 },
        customMetrics: {},
      };

      // Act
      const anomaly: AnomalyDetection = await monitor.detectAnomalies(
        spikeMetrics,
        normalMetrics,
      );

      // Assert
      expect(anomaly.detected).toBe(true);
      expect(anomaly.anomalies).toContain('cpu_spike');
      expect(anomaly.severity).toBeGreaterThan(0.7);
      expect(anomaly.confidence).toBeGreaterThan(0.8);
      expect(anomaly.recommendedActions).toContain('investigate_cpu_usage');
    });

    it('should detect response time degradation', async () => {
      // Arrange
      const baselineMetrics: SystemMetrics[] = Array(15)
        .fill(null)
        .map((_, index) => ({
          timestamp: new Date(Date.now() - (15 - index) * 60000),
          cpuUtilization: 50,
          memoryUtilization: 55,
          requestsPerSecond: 800,
          responseTimeP95: 150 + (index % 3) * 10, // Stable around 150-170ms
          databaseConnections: 40,
          errorRate: 0.005,
          serviceHealthScores: { api: 92, database: 90, auth: 91 },
          customMetrics: {},
        }));

      const degradedMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 52,
        memoryUtilization: 57,
        requestsPerSecond: 820,
        responseTimeP95: 850, // Significant degradation
        databaseConnections: 45,
        errorRate: 0.008,
        serviceHealthScores: { api: 85, database: 75, auth: 88 },
        customMetrics: {},
      };

      // Act
      const anomaly = await monitor.detectAnomalies(
        degradedMetrics,
        baselineMetrics,
      );

      // Assert
      expect(anomaly.detected).toBe(true);
      expect(anomaly.anomalies).toContain('response_time_degradation');
      expect(anomaly.affectedServices).toContain('database');
      expect(anomaly.recommendedActions).toContain(
        'check_database_performance',
      );
    });

    it('should detect wedding day traffic anomalies', async () => {
      // Arrange
      const weddingDayBaseline: SystemMetrics[] = Array(20)
        .fill(null)
        .map((_, index) => ({
          timestamp: new Date(Date.now() - (20 - index) * 30000), // Last 10 minutes in 30s intervals
          cpuUtilization: 65 + (index % 5) * 2, // Wedding day normal load
          memoryUtilization: 70,
          requestsPerSecond: 3000 + (index % 7) * 200,
          responseTimeP95: 300,
          databaseConnections: 120,
          errorRate: 0.02,
          serviceHealthScores: {
            api: 80,
            database: 75,
            auth: 82,
            realtime: 85,
          },
          customMetrics: { weddingDayActive: true, activeWeddings: 3 },
        }));

      const trafficSurge: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 68,
        memoryUtilization: 72,
        requestsPerSecond: 8500, // Sudden traffic surge
        responseTimeP95: 320,
        databaseConnections: 135,
        errorRate: 0.025,
        serviceHealthScores: { api: 78, database: 70, auth: 80, realtime: 82 },
        customMetrics: {
          weddingDayActive: true,
          activeWeddings: 3,
          viralContent: true,
        },
      };

      // Act
      const anomaly = await monitor.detectAnomalies(
        trafficSurge,
        weddingDayBaseline,
      );

      // Assert
      expect(anomaly.detected).toBe(true);
      expect(anomaly.anomalies).toContain('traffic_surge');
      expect(anomaly.weddingDayContext).toBe(true);
      expect(anomaly.possibleCauses).toContain('viral_content');
      expect(anomaly.recommendedActions).toContain('prepare_auto_scaling');
    });

    it('should not flag normal variations as anomalies', async () => {
      // Arrange
      const steadyMetrics: SystemMetrics[] = Array(12)
        .fill(null)
        .map((_, index) => ({
          timestamp: new Date(Date.now() - (12 - index) * 60000),
          cpuUtilization: 55 + (index % 4) * 3, // Normal variation 55-64%
          memoryUtilization: 60 + (index % 3) * 2, // Normal variation 60-64%
          requestsPerSecond: 1500 + (index % 5) * 100, // Normal variation 1500-1900
          responseTimeP95: 180 + (index % 6) * 15, // Normal variation 180-255ms
          databaseConnections: 70 + (index % 4) * 5,
          errorRate: 0.008 + (index % 7) * 0.002,
          serviceHealthScores: {
            api: 90 + (index % 3) * 2,
            database: 85 + (index % 4) * 2,
            auth: 88 + (index % 2) * 2,
          },
          customMetrics: {},
        }));

      const currentMetrics = steadyMetrics[steadyMetrics.length - 1];

      // Act
      const anomaly = await monitor.detectAnomalies(
        currentMetrics,
        steadyMetrics.slice(0, -1),
      );

      // Assert
      expect(anomaly.detected).toBe(false);
      expect(anomaly.confidence).toBeLessThan(0.5);
      expect(anomaly.anomalies).toHaveLength(0);
    });
  });

  describe('generateAlerts', () => {
    it('should generate critical alert for wedding day service failure', async () => {
      // Arrange
      const criticalMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 85,
        memoryUtilization: 88,
        requestsPerSecond: 4000,
        responseTimeP95: 2500, // Very high response time
        databaseConnections: 200,
        errorRate: 0.15, // High error rate
        serviceHealthScores: {
          api: 45, // Critical health score
          database: 30, // Critical health score
          auth: 65,
        },
        customMetrics: {
          weddingDayActive: true,
          activeWeddings: 5,
          failedServices: ['media-upload'],
        },
      };

      const alertConfig: AlertConfiguration = {
        severityThresholds: {
          critical: { responseTime: 2000, errorRate: 0.1, healthScore: 50 },
          warning: { responseTime: 1000, errorRate: 0.05, healthScore: 70 },
          info: { responseTime: 500, errorRate: 0.02, healthScore: 85 },
        },
        notificationChannels: ['email', 'sms', 'slack', 'pagerduty'],
        escalationRules: {
          critical: { immediate: true, escalateAfter: 0 },
          warning: { immediate: false, escalateAfter: 300 },
          info: { immediate: false, escalateAfter: 900 },
        },
        weddingDayMode: true,
      };

      // Act
      const alerts = await monitor.generateAlerts(criticalMetrics, alertConfig);

      // Assert
      expect(alerts.length).toBeGreaterThan(0);

      const criticalAlert = alerts.find(
        (alert) => alert.severity === 'critical',
      );
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert!.title).toContain('Wedding Day');
      expect(criticalAlert!.channels).toContain('pagerduty');
      expect(criticalAlert!.immediate).toBe(true);
      expect(criticalAlert!.affectedServices).toContain('database');
      expect(criticalAlert!.weddingDayImpact).toBe(true);
    });

    it('should generate warning alert for performance degradation', async () => {
      // Arrange
      const warningMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 78, // Elevated but not critical
        memoryUtilization: 75,
        requestsPerSecond: 2500,
        responseTimeP95: 1200, // Warning level
        databaseConnections: 150,
        errorRate: 0.06, // Warning level
        serviceHealthScores: { api: 75, database: 72, auth: 78 }, // Warning level
        customMetrics: {},
      };

      const alertConfig: AlertConfiguration = {
        severityThresholds: {
          critical: { responseTime: 2000, errorRate: 0.1, healthScore: 50 },
          warning: { responseTime: 1000, errorRate: 0.05, healthScore: 70 },
          info: { responseTime: 500, errorRate: 0.02, healthScore: 85 },
        },
        notificationChannels: ['email', 'slack'],
        escalationRules: {
          critical: { immediate: true, escalateAfter: 0 },
          warning: { immediate: false, escalateAfter: 300 },
          info: { immediate: false, escalateAfter: 900 },
        },
      };

      // Act
      const alerts = await monitor.generateAlerts(warningMetrics, alertConfig);

      // Assert
      expect(alerts.length).toBeGreaterThan(0);

      const warningAlert = alerts.find((alert) => alert.severity === 'warning');
      expect(warningAlert).toBeDefined();
      expect(warningAlert!.channels).toContain('slack');
      expect(warningAlert!.immediate).toBe(false);
      expect(warningAlert!.escalateAfter).toBe(300);
    });

    it('should not generate alerts for healthy metrics', async () => {
      // Arrange
      const healthyMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 45,
        memoryUtilization: 50,
        requestsPerSecond: 1200,
        responseTimeP95: 180,
        databaseConnections: 60,
        errorRate: 0.008,
        serviceHealthScores: { api: 95, database: 92, auth: 94 },
        customMetrics: {},
      };

      const alertConfig: AlertConfiguration = {
        severityThresholds: {
          critical: { responseTime: 2000, errorRate: 0.1, healthScore: 50 },
          warning: { responseTime: 1000, errorRate: 0.05, healthScore: 70 },
          info: { responseTime: 500, errorRate: 0.02, healthScore: 85 },
        },
        notificationChannels: ['email'],
      };

      // Act
      const alerts = await monitor.generateAlerts(healthyMetrics, alertConfig);

      // Assert
      expect(alerts).toHaveLength(0);
    });
  });

  describe('stopMonitoring', () => {
    it('should properly cleanup monitoring session', async () => {
      // Arrange
      const services = ['api', 'database'];
      const session = await monitor.startRealTimeMonitoring(services);

      // Act
      const result = await monitor.stopMonitoring(session.sessionId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.sessionSummary).toBeDefined();
      expect(result.sessionSummary.endTime).toBeDefined();
      expect(result.sessionSummary.totalDurationMs).toBeGreaterThan(0);
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should generate session report with metrics summary', async () => {
      // Arrange
      const services = ['api', 'database', 'auth'];
      const session = await monitor.startRealTimeMonitoring(services);

      // Simulate some monitoring activity
      await monitor.collectCurrentMetrics();
      await monitor.collectCurrentMetrics();
      await monitor.collectCurrentMetrics();

      // Act
      const result = await monitor.stopMonitoring(session.sessionId);

      // Assert
      expect(result.sessionSummary.metricsCollected).toBeGreaterThan(0);
      expect(result.sessionSummary.averageMetrics).toBeDefined();
      expect(result.sessionSummary.peakMetrics).toBeDefined();
      expect(result.sessionSummary.servicesMonitored).toEqual(services);
    });
  });

  describe('Performance and Reliability', () => {
    it('should process high-frequency metrics efficiently', async () => {
      // Arrange
      const services = ['api', 'database', 'auth', 'storage', 'realtime'];
      const highFrequencyConfig: MonitoringConfiguration = {
        samplingIntervalMs: 100, // Very high frequency
        enableAnomalyDetection: true,
        alertThresholds: {
          cpuUtilization: 80,
          memoryUtilization: 75,
          responseTimeP95: 1000,
          errorRate: 0.05,
        },
      };

      const startTime = Date.now();

      // Act
      const session = await monitor.startRealTimeMonitoring(
        services,
        highFrequencyConfig,
      );

      // Collect multiple metrics rapidly
      const metricsPromises = Array(10)
        .fill(null)
        .map(() => monitor.collectCurrentMetrics());
      const metricsResults = await Promise.all(metricsPromises);

      // Assert
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(metricsResults).toHaveLength(10);
      expect(session.samplingInterval).toBe(100);
    });

    it('should handle monitoring failures gracefully', async () => {
      // Arrange
      const services = ['api', 'failing-service', 'database'];

      // Mock WebSocket failure
      mockWebSocket.readyState = WebSocket.CLOSED;
      mockWebSocket.send = jest.fn().mockImplementation(() => {
        throw new Error('WebSocket connection closed');
      });

      // Act
      const session = await monitor.startRealTimeMonitoring(services);
      const metrics = await monitor.collectCurrentMetrics();

      // Assert
      expect(session.status).toBe('degraded'); // Should switch to degraded mode
      expect(metrics).toBeDefined(); // Should still return metrics
      expect(metrics.customMetrics.monitoringDegraded).toBe(true);
    });

    it('should maintain monitoring session state correctly', async () => {
      // Arrange
      const services = ['api', 'database', 'auth'];

      // Act
      const session1 = await monitor.startRealTimeMonitoring(services);
      const session2 = await monitor.startRealTimeMonitoring([
        'storage',
        'media',
      ]);

      // Assert
      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(await monitor.getSessionStatus(session1.sessionId)).toBe('active');
      expect(await monitor.getSessionStatus(session2.sessionId)).toBe('active');

      // Stop first session
      await monitor.stopMonitoring(session1.sessionId);
      expect(await monitor.getSessionStatus(session1.sessionId)).toBe(
        'stopped',
      );
      expect(await monitor.getSessionStatus(session2.sessionId)).toBe('active');
    });
  });

  describe('Wedding-Specific Monitoring', () => {
    it('should provide enhanced monitoring for wedding critical periods', async () => {
      // Arrange
      const weddingCriticalServices = [
        'api',
        'database',
        'auth',
        'storage',
        'realtime',
        'media',
        'notifications',
      ];

      const weddingCriticalConfig: MonitoringConfiguration = {
        weddingDayMode: true,
        criticalPeriodMode: true, // 2 hours before wedding
        samplingIntervalMs: 250, // 4x per second
        alertThresholds: {
          cpuUtilization: 60, // Very low threshold
          memoryUtilization: 65,
          responseTimeP95: 300,
          errorRate: 0.005, // Very low tolerance
        },
        enableAnomalyDetection: true,
        anomalySensitivity: 'high',
        notificationChannels: ['pagerduty', 'sms', 'slack', 'email'],
      };

      // Act
      const session = await monitor.startRealTimeMonitoring(
        weddingCriticalServices,
        weddingCriticalConfig,
      );

      // Assert
      expect(session.weddingDayMode).toBe(true);
      expect(session.criticalPeriodMode).toBe(true);
      expect(session.samplingInterval).toBe(250);
      expect(session.services).toContain('media');
      expect(session.services).toContain('notifications');
      expect(session.enhancedAlerting).toBe(true);
    });

    it('should track wedding-specific performance indicators', async () => {
      // Arrange
      const weddingServices = ['api', 'database', 'realtime', 'media'];
      const weddingConfig: MonitoringConfiguration = {
        weddingDayMode: true,
        includeWeddingMetrics: true,
        customMetrics: [
          'photo_upload_success_rate',
          'guest_check_in_rate',
          'vendor_coordination_latency',
          'timeline_sync_status',
        ],
      };

      await monitor.startRealTimeMonitoring(weddingServices, weddingConfig);

      // Act
      const metrics = await monitor.collectCurrentMetrics();

      // Assert
      expect(metrics.customMetrics.photoUploadSuccessRate).toBeDefined();
      expect(metrics.customMetrics.guestCheckInRate).toBeDefined();
      expect(metrics.customMetrics.vendorCoordinationLatency).toBeDefined();
      expect(metrics.customMetrics.timelineSyncStatus).toBeDefined();
      expect(typeof metrics.customMetrics.photoUploadSuccessRate).toBe(
        'number',
      );
    });
  });
});
