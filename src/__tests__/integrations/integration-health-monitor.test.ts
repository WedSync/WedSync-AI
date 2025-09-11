import { IntegrationHealthMonitor } from '@/lib/integrations/integration-health-monitor';
import {
  SystemHealthReport,
  ServiceHealthStatus,
  SLAThreshold,
} from '@/types/faq-integration';

describe('IntegrationHealthMonitor', () => {
  let monitor: IntegrationHealthMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = new IntegrationHealthMonitor();
  });

  afterEach(() => {
    monitor.destroy();
  });

  describe('performHealthChecks', () => {
    it('should perform comprehensive health checks on all services', async () => {
      const healthReport = await monitor.performHealthChecks();

      expect(healthReport).toBeDefined();
      expect(healthReport.timestamp).toBeDefined();
      expect(healthReport.overallStatus).toBeDefined();
      expect(healthReport.services).toBeDefined();
      expect(healthReport.services.length).toBeGreaterThan(0);

      // Check that all expected services are included
      const serviceNames = healthReport.services.map((s) => s.name);
      expect(serviceNames).toContain('faq-orchestrator');
      expect(serviceNames).toContain('ai-processing-pipeline');
      expect(serviceNames).toContain('faq-sync-manager');
      expect(serviceNames).toContain('webhook-processor');
    });

    it('should calculate correct overall health status', async () => {
      const healthReport = await monitor.performHealthChecks();

      const criticalServices = healthReport.services.filter(
        (s) => s.status === 'critical_failure',
      );

      if (criticalServices.length > 0) {
        expect(healthReport.overallStatus).toBe('critical');
      } else {
        const degradedServices = healthReport.services.filter(
          (s) => s.status === 'degraded',
        );

        if (degradedServices.length > 0) {
          expect(healthReport.overallStatus).toBe('degraded');
        } else {
          expect(healthReport.overallStatus).toBe('healthy');
        }
      }
    });

    it('should include detailed service metrics', async () => {
      const healthReport = await monitor.performHealthChecks();

      healthReport.services.forEach((service) => {
        expect(service.name).toBeDefined();
        expect(service.status).toBeOneOf([
          'healthy',
          'degraded',
          'unhealthy',
          'critical_failure',
        ]);
        expect(service.responseTime).toBeGreaterThanOrEqual(0);
        expect(service.errorRate).toBeGreaterThanOrEqual(0);
        expect(service.lastChecked).toBeDefined();

        if (service.metrics) {
          expect(service.metrics.uptime).toBeGreaterThanOrEqual(0);
          expect(service.metrics.throughput).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should check SLA compliance', async () => {
      const healthReport = await monitor.performHealthChecks();

      expect(healthReport.slaCompliance).toBeDefined();
      expect(
        healthReport.slaCompliance.overallCompliance,
      ).toBeGreaterThanOrEqual(0);
      expect(healthReport.slaCompliance.overallCompliance).toBeLessThanOrEqual(
        100,
      );
      expect(healthReport.slaCompliance.serviceCompliance).toBeDefined();

      Object.values(healthReport.slaCompliance.serviceCompliance).forEach(
        (compliance) => {
          expect(compliance).toBeGreaterThanOrEqual(0);
          expect(compliance).toBeLessThanOrEqual(100);
        },
      );
    });
  });

  describe('service-specific health checks', () => {
    it('should check FAQ orchestrator health correctly', async () => {
      const orchestratorHealth =
        await monitor.checkServiceHealth('faq-orchestrator');

      expect(orchestratorHealth).toBeDefined();
      expect(orchestratorHealth.name).toBe('faq-orchestrator');
      expect(orchestratorHealth.status).toBeDefined();
      expect(orchestratorHealth.responseTime).toBeGreaterThan(0);

      // Wedding-specific checks
      if (orchestratorHealth.weddingSpecificMetrics) {
        expect(
          orchestratorHealth.weddingSpecificMetrics.averageExtractionTime,
        ).toBeGreaterThan(0);
        expect(
          orchestratorHealth.weddingSpecificMetrics.successRateByVendorType,
        ).toBeDefined();
      }
    });

    it('should check AI processing pipeline health', async () => {
      const pipelineHealth = await monitor.checkServiceHealth(
        'ai-processing-pipeline',
      );

      expect(pipelineHealth.name).toBe('ai-processing-pipeline');

      if (pipelineHealth.aiSpecificMetrics) {
        expect(
          pipelineHealth.aiSpecificMetrics.averageTokensPerFAQ,
        ).toBeGreaterThan(0);
        expect(
          pipelineHealth.aiSpecificMetrics.averageCostPerFAQ,
        ).toBeGreaterThan(0);
        expect(
          pipelineHealth.aiSpecificMetrics.modelResponseTime,
        ).toBeGreaterThan(0);
      }
    });

    it('should check sync manager health with external integrations', async () => {
      const syncHealth = await monitor.checkServiceHealth('faq-sync-manager');

      expect(syncHealth.name).toBe('faq-sync-manager');

      if (syncHealth.externalIntegrations) {
        syncHealth.externalIntegrations.forEach((integration) => {
          expect(integration.name).toBeDefined();
          expect(integration.status).toBeOneOf([
            'healthy',
            'degraded',
            'unhealthy',
          ]);
          expect(integration.lastSyncTime).toBeDefined();
        });
      }
    });

    it('should check webhook processor security metrics', async () => {
      const webhookHealth =
        await monitor.checkServiceHealth('webhook-processor');

      expect(webhookHealth.name).toBe('webhook-processor');

      if (webhookHealth.securityMetrics) {
        expect(
          webhookHealth.securityMetrics.invalidSignatureAttempts,
        ).toBeGreaterThanOrEqual(0);
        expect(
          webhookHealth.securityMetrics.rateLimitViolations,
        ).toBeGreaterThanOrEqual(0);
        expect(
          webhookHealth.securityMetrics.suspiciousIpAddresses,
        ).toBeDefined();
      }
    });
  });

  describe('SLA monitoring', () => {
    it('should monitor response time SLAs', async () => {
      const slaViolations = await monitor.checkSLACompliance();

      expect(slaViolations).toBeDefined();

      slaViolations.forEach((violation) => {
        expect(violation.service).toBeDefined();
        expect(violation.metric).toBeDefined();
        expect(violation.threshold).toBeDefined();
        expect(violation.actualValue).toBeDefined();
        expect(violation.severity).toBeOneOf([
          'low',
          'medium',
          'high',
          'critical',
        ]);
        expect(violation.timestamp).toBeDefined();
      });
    });

    it('should monitor wedding industry specific SLAs', async () => {
      const healthReport = await monitor.performHealthChecks();

      // Check wedding-specific SLA requirements
      const orchestratorService = healthReport.services.find(
        (s) => s.name === 'faq-orchestrator',
      );
      if (orchestratorService) {
        // Response time should be < 10 seconds for wedding day operations
        expect(orchestratorService.responseTime).toBeLessThan(10000);
      }

      // Uptime should be > 99.9% (wedding day requirement)
      healthReport.services.forEach((service) => {
        if (service.metrics?.uptime) {
          expect(service.metrics.uptime).toBeGreaterThan(99.9);
        }
      });
    });

    it('should calculate availability percentages correctly', async () => {
      const availability = await monitor.calculateServiceAvailability(
        'faq-orchestrator',
        24,
      ); // Last 24 hours

      expect(availability).toBeDefined();
      expect(availability.percentage).toBeGreaterThanOrEqual(0);
      expect(availability.percentage).toBeLessThanOrEqual(100);
      expect(availability.totalChecks).toBeGreaterThan(0);
      expect(availability.successfulChecks).toBeLessThanOrEqual(
        availability.totalChecks,
      );
      expect(availability.downtimeMinutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('auto-recovery mechanisms', () => {
    it('should trigger auto-recovery for degraded services', async () => {
      const mockAutoRecovery = jest.spyOn(monitor, 'attemptAutoRecovery');

      // Simulate a degraded service
      const degradedService: ServiceHealthStatus = {
        name: 'faq-orchestrator',
        status: 'degraded',
        responseTime: 8000,
        errorRate: 15,
        lastChecked: new Date(),
        issues: ['High response time', 'Elevated error rate'],
      };

      await monitor.handleServiceDegradation(degradedService);

      expect(mockAutoRecovery).toHaveBeenCalledWith('faq-orchestrator');
    });

    it('should implement circuit breaker coordination', async () => {
      const mockCircuitBreakerOpen = jest.spyOn(monitor, 'openCircuitBreaker');

      // Simulate critical service failure
      const criticalService: ServiceHealthStatus = {
        name: 'ai-processing-pipeline',
        status: 'critical_failure',
        responseTime: 30000,
        errorRate: 90,
        lastChecked: new Date(),
        issues: ['Service timeout', 'High error rate', 'Multiple failures'],
      };

      await monitor.handleServiceFailure(criticalService);

      expect(mockCircuitBreakerOpen).toHaveBeenCalledWith(
        'ai-processing-pipeline',
      );
    });
  });

  describe('metrics collection and storage', () => {
    it('should store health check results with timestamps', async () => {
      const healthReport = await monitor.performHealthChecks();

      // Simulate storing results
      await monitor.storeHealthCheckResult(healthReport);

      const historicalData = await monitor.getHealthCheckHistory(
        'faq-orchestrator',
        24,
      );
      expect(historicalData).toBeDefined();
      expect(historicalData.length).toBeGreaterThan(0);

      historicalData.forEach((entry) => {
        expect(entry.timestamp).toBeDefined();
        expect(entry.status).toBeDefined();
        expect(entry.responseTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate rolling metrics correctly', async () => {
      // Add some test data points
      const testDataPoints = [
        {
          timestamp: new Date(Date.now() - 3600000),
          responseTime: 100,
          status: 'healthy',
        },
        {
          timestamp: new Date(Date.now() - 1800000),
          responseTime: 150,
          status: 'healthy',
        },
        { timestamp: new Date(), responseTime: 200, status: 'degraded' },
      ];

      const rollingMetrics = monitor.calculateRollingMetrics(testDataPoints, 1); // 1 hour window

      expect(rollingMetrics.averageResponseTime).toBe(150); // (100 + 150 + 200) / 3
      expect(rollingMetrics.p95ResponseTime).toBeGreaterThanOrEqual(150);
      expect(rollingMetrics.healthyPercentage).toBe(66.67); // 2 out of 3 healthy
    });
  });

  describe('alerting and notifications', () => {
    it('should generate alerts for SLA violations', async () => {
      const mockAlert = jest.spyOn(monitor, 'sendAlert');

      const slaViolation = {
        service: 'faq-orchestrator',
        metric: 'responseTime',
        threshold: 2000,
        actualValue: 5000,
        severity: 'high' as const,
        timestamp: new Date(),
      };

      await monitor.processSLAViolation(slaViolation);

      expect(mockAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'high',
          message: expect.stringContaining('SLA violation'),
          service: 'faq-orchestrator',
        }),
      );
    });

    it('should escalate critical failures immediately', async () => {
      const mockEscalate = jest.spyOn(monitor, 'escalateToOnCall');

      const criticalService: ServiceHealthStatus = {
        name: 'webhook-processor',
        status: 'critical_failure',
        responseTime: 30000,
        errorRate: 100,
        lastChecked: new Date(),
        issues: ['Complete service failure'],
      };

      await monitor.handleServiceFailure(criticalService);

      expect(mockEscalate).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'webhook-processor',
          severity: 'critical',
        }),
      );
    });
  });

  describe('wedding day monitoring', () => {
    it('should switch to wedding day monitoring mode', async () => {
      await monitor.enableWeddingDayMode();

      const isWeddingDayMode = monitor.isWeddingDayModeEnabled();
      expect(isWeddingDayMode).toBe(true);

      // Should use stricter SLA thresholds
      const slaThresholds = monitor.getCurrentSLAThresholds();
      expect(
        slaThresholds['faq-orchestrator'].find(
          (t) => t.metric === 'responseTime',
        )?.threshold,
      ).toBeLessThan(1000); // Stricter than normal 2000ms
    });

    it('should prioritize critical wedding services', async () => {
      await monitor.enableWeddingDayMode();

      const healthReport = await monitor.performHealthChecks();
      const priorityServices = healthReport.services.filter(
        (s) => s.weddingCritical === true,
      );

      expect(priorityServices.length).toBeGreaterThan(0);

      // Priority services should have more frequent checks
      priorityServices.forEach((service) => {
        expect(service.checkFrequencyMs).toBeLessThan(60000); // < 1 minute
      });
    });
  });
});
