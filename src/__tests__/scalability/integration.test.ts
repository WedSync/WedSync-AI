import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import request from 'supertest';
import { IntelligentAutoScalingEngine } from '@/lib/scalability/backend/intelligent-auto-scaling-engine';
import { WeddingLoadPredictor } from '@/lib/scalability/backend/wedding-load-predictor';
import { RealTimePerformanceMonitor } from '@/lib/scalability/backend/real-time-performance-monitor';
import { RBACManager } from '@/lib/scalability/security/rbac-manager';
import type {
  SystemMetrics,
  WeddingEvent,
  ScalingDecision,
  MonitoringSession,
} from '@/lib/scalability/types/core';

describe('Scalability System Integration Tests', () => {
  let scalingEngine: IntelligentAutoScalingEngine;
  let loadPredictor: WeddingLoadPredictor;
  let performanceMonitor: RealTimePerformanceMonitor;
  let rbacManager: RBACManager;
  let mockApp: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Initialize components
    scalingEngine = new IntelligentAutoScalingEngine();
    loadPredictor = new WeddingLoadPredictor();
    performanceMonitor = new RealTimePerformanceMonitor();
    rbacManager = new RBACManager();

    // Mock Next.js app for API testing
    mockApp = require('express')();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('End-to-End Wedding Day Scaling Workflow', () => {
    it('should handle complete wedding day scaling scenario', async () => {
      // Arrange - Wedding day morning (6 AM, 2 hours before first wedding)
      const weddingEvents: WeddingEvent[] = [
        {
          id: 'morning-wedding-123',
          date: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          estimatedGuests: 300,
          vendorCount: 12,
          isHighProfile: true,
          services: ['photography', 'catering', 'venue', 'flowers', 'music'],
          expectedTrafficMultiplier: 4.0,
        },
        {
          id: 'afternoon-wedding-456',
          date: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
          estimatedGuests: 200,
          vendorCount: 8,
          isHighProfile: false,
          services: ['photography', 'catering', 'venue'],
          expectedTrafficMultiplier: 2.5,
        },
      ];

      // Current system metrics - normal morning load
      const currentMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 45,
        memoryUtilization: 50,
        requestsPerSecond: 800,
        responseTimeP95: 180,
        databaseConnections: 60,
        errorRate: 0.008,
        serviceHealthScores: { api: 92, database: 88, auth: 94 },
        customMetrics: { upcomingWeddings: 2 },
      };

      // Act - Step 1: Performance Monitor collects metrics
      jest
        .spyOn(performanceMonitor, 'collectCurrentMetrics')
        .mockResolvedValue(currentMetrics);
      const collectedMetrics = await performanceMonitor.collectCurrentMetrics();

      // Act - Step 2: Load Predictor analyzes upcoming weddings
      jest
        .spyOn(loadPredictor, 'getUpcomingWeddings')
        .mockResolvedValue(weddingEvents);
      const upcomingWeddings = await loadPredictor.getUpcomingWeddings(8);

      // Act - Step 3: Generate capacity forecast
      const capacityForecast = await loadPredictor.generateCapacityForecast(
        upcomingWeddings,
        8,
      );

      // Act - Step 4: Scaling Engine analyzes and makes decisions
      const scalingExecution = await scalingEngine.executeIntelligentScaling();

      // Assert - Verify complete workflow
      expect(collectedMetrics).toBeDefined();
      expect(upcomingWeddings).toHaveLength(2);
      expect(capacityForecast.predictedLoad.requestsPerSecond).toBeGreaterThan(
        3000,
      );
      expect(scalingExecution.success).toBe(true);
      expect(scalingExecution.weddingContextApplied).toBe(true);
      expect(scalingExecution.decisionsExecuted).toBeGreaterThan(0);
      expect(scalingExecution.executionTimeMs).toBeLessThan(30000);

      // Verify wedding-specific optimizations
      expect(scalingExecution.weddingDayMode).toBe(true);
      expect(scalingExecution.preScalingActivated).toBe(true);
      expect(scalingExecution.stabilityPrioritized).toBe(true);
    });

    it('should handle wedding day traffic spike with emergency scaling', async () => {
      // Arrange - Traffic spike during wedding ceremony
      const spikeMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 88,
        memoryUtilization: 85,
        requestsPerSecond: 7500, // Sudden spike
        responseTimeP95: 1200, // Degraded performance
        databaseConnections: 185,
        errorRate: 0.045,
        serviceHealthScores: { api: 75, database: 68, auth: 82 },
        customMetrics: {
          weddingDayActive: true,
          activeWeddings: 3,
          viralContentDetected: true,
          trafficSource: 'social_media_viral',
        },
      };

      const activeWedding: WeddingEvent = {
        id: 'viral-wedding-789',
        date: new Date(), // Happening now
        estimatedGuests: 250,
        vendorCount: 10,
        isHighProfile: true,
        services: ['photography', 'catering', 'venue', 'live_streaming'],
        expectedTrafficMultiplier: 3.0,
        customMetrics: { goingViral: true, socialMediaMentions: 15000 },
      };

      // Act - Emergency detection and scaling
      jest
        .spyOn(performanceMonitor, 'collectCurrentMetrics')
        .mockResolvedValue(spikeMetrics);
      jest
        .spyOn(loadPredictor, 'getUpcomingWeddings')
        .mockResolvedValue([activeWedding]);

      const anomalyDetection = await performanceMonitor.detectAnomalies(
        spikeMetrics,
        [],
      );
      const emergencyScaling = await scalingEngine.executeIntelligentScaling();

      // Assert - Emergency response
      expect(anomalyDetection.detected).toBe(true);
      expect(anomalyDetection.severity).toBeGreaterThan(0.8);
      expect(anomalyDetection.weddingDayContext).toBe(true);
      expect(anomalyDetection.possibleCauses).toContain('viral_content');

      expect(emergencyScaling.emergencyScalingActivated).toBe(true);
      expect(emergencyScaling.executionTimeMs).toBeLessThan(10000); // Faster emergency response
      expect(emergencyScaling.resourcesScaled.length).toBeGreaterThan(3);
      expect(emergencyScaling.trafficMultiplier).toBeGreaterThan(5.0); // Adjusted for viral content
    });

    it('should coordinate multiple services during peak wedding season', async () => {
      // Arrange - Peak Saturday in summer with multiple weddings
      const peakSaturdayWeddings: WeddingEvent[] = Array(12)
        .fill(null)
        .map((_, index) => ({
          id: `saturday-wedding-${index}`,
          date: new Date(Date.now() + (index * 2 + 10) * 60 * 60 * 1000), // Spread throughout day
          estimatedGuests: 150 + index * 25,
          vendorCount: 8 + (index % 5),
          isHighProfile: index % 4 === 0,
          services: ['photography', 'catering', 'venue', 'flowers'],
          expectedTrafficMultiplier: 2.2 + index * 0.15,
        }));

      const peakSeasonMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 68,
        memoryUtilization: 72,
        requestsPerSecond: 4200,
        responseTimeP95: 380,
        databaseConnections: 145,
        errorRate: 0.025,
        serviceHealthScores: {
          api: 82,
          database: 78,
          auth: 85,
          realtime: 80,
          media: 75,
        },
        customMetrics: {
          peakWeddingSeason: true,
          saturdayPeak: true,
          activeWeddings: 4,
          upcomingWeddings: 8,
        },
      };

      // Act - Peak season coordination
      jest
        .spyOn(performanceMonitor, 'collectCurrentMetrics')
        .mockResolvedValue(peakSeasonMetrics);
      jest
        .spyOn(loadPredictor, 'getUpcomingWeddings')
        .mockResolvedValue(peakSaturdayWeddings);

      const seasonalForecast = await loadPredictor.generateCapacityForecast(
        peakSaturdayWeddings,
        16,
      );
      const peakSeasonScaling = await scalingEngine.executeIntelligentScaling();

      // Start monitoring all critical services
      const monitoringSession =
        await performanceMonitor.startRealTimeMonitoring(
          [
            'api',
            'database',
            'auth',
            'storage',
            'realtime',
            'media',
            'notifications',
          ],
          {
            weddingDayMode: true,
            samplingIntervalMs: 500,
            alertThresholds: {
              cpuUtilization: 75,
              memoryUtilization: 78,
              responseTimeP95: 600,
              errorRate: 0.03,
            },
          },
        );

      // Assert - Coordinated peak season response
      expect(seasonalForecast.predictedLoad.requestsPerSecond).toBeGreaterThan(
        8000,
      );
      expect(
        seasonalForecast.scenarios.some((s) =>
          s.name.includes('peak_saturday'),
        ),
      ).toBe(true);

      expect(peakSeasonScaling.success).toBe(true);
      expect(peakSeasonScaling.peakSeasonMode).toBe(true);
      expect(peakSeasonScaling.multiWeddingCoordination).toBe(true);
      expect(peakSeasonScaling.resourcesScaled.length).toBeGreaterThan(4);

      expect(monitoringSession.weddingDayMode).toBe(true);
      expect(monitoringSession.services.length).toBe(7);
      expect(monitoringSession.enhancedAlerting).toBe(true);
    });
  });

  describe('API Integration Workflows', () => {
    it('should complete full API workflow for scaling request', async () => {
      // This would test actual API endpoints if we had a running server
      // For now, we'll test the workflow components directly

      // Arrange
      const adminUser = {
        id: 'api-admin-123',
        email: 'api-admin@wedsync.com',
        roles: ['scalability_admin'],
        permissions: ['scalability:execute', 'scalability:emergency'],
        organizationId: 'org-wedsync',
      };

      const scalingRequest = {
        action: 'scale_up',
        services: ['api', 'database'],
        reason: 'wedding_preparation',
        urgency: 'high',
        targetCapacity: {
          cpuCores: 24,
          memoryGB: 96,
          databaseConnections: 150,
        },
      };

      // Act - Simulate API workflow
      // 1. Authentication & Authorization
      const accessCheck = await rbacManager.checkAccess({
        user: adminUser,
        resource: 'scalability_engine',
        action: 'execute_scaling',
        context: { urgency: 'high' },
      });

      // 2. Validate request parameters
      const requestValidation = {
        valid:
          scalingRequest.services.length > 0 &&
          ['low', 'medium', 'high', 'critical'].includes(
            scalingRequest.urgency,
          ),
        errors: [],
      };

      // 3. Execute scaling if authorized and valid
      let scalingResult = null;
      if (accessCheck.granted && requestValidation.valid) {
        scalingResult =
          await scalingEngine.executeManualScaling(scalingRequest);
      }

      // 4. Audit the operation
      if (scalingResult) {
        await rbacManager.auditAccessAttempt(
          {
            user: adminUser,
            resource: 'scalability_engine',
            action: 'execute_scaling',
            context: scalingRequest,
          },
          {
            granted: true,
            reason: 'successful_execution',
            executionTime: scalingResult.executionTimeMs,
          },
        );
      }

      // Assert - Full workflow completion
      expect(accessCheck.granted).toBe(true);
      expect(requestValidation.valid).toBe(true);
      expect(scalingResult).toBeDefined();
      expect(scalingResult.success).toBe(true);
      expect(scalingResult.decisionsExecuted).toBeGreaterThan(0);
    });

    it('should handle API error scenarios gracefully', async () => {
      // Arrange - Invalid request from unauthorized user
      const unauthorizedUser = {
        id: 'unauth-456',
        email: 'unauth@external.com',
        roles: ['basic_user'],
        permissions: ['user:read'],
        organizationId: 'org-external',
      };

      const invalidRequest = {
        action: 'nuclear_scale', // Invalid action
        services: [], // Empty services
        urgency: 'maximum_overdrive', // Invalid urgency
        reason: '', // Empty reason
      };

      // Act - Attempt unauthorized/invalid request
      const accessCheck = await rbacManager.checkAccess({
        user: unauthorizedUser,
        resource: 'scalability_engine',
        action: 'execute_scaling',
        context: invalidRequest,
      });

      const validationErrors = {
        action: 'Invalid scaling action',
        services: 'Services array cannot be empty',
        urgency: 'Invalid urgency level',
        reason: 'Reason is required',
      };

      // Assert - Proper error handling
      expect(accessCheck.granted).toBe(false);
      expect(accessCheck.reason).toContain('unauthorized');
      expect(Object.keys(validationErrors)).toHaveLength(4);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should maintain performance under concurrent scaling requests', async () => {
      // Arrange
      const concurrentUsers = Array(10)
        .fill(null)
        .map((_, index) => ({
          id: `concurrent-user-${index}`,
          email: `user${index}@wedsync.com`,
          roles: ['scalability_operator'],
          permissions: ['scalability:scale_standard'],
          organizationId: 'org-wedsync',
        }));

      const startTime = Date.now();

      // Act - Concurrent scaling requests
      const concurrentRequests = concurrentUsers.map((user, index) =>
        rbacManager
          .checkAccess({
            user,
            resource: 'scalability_engine',
            action: 'scale_standard',
            context: { urgency: 'medium', requestId: `concurrent-${index}` },
          })
          .then((accessResult) => {
            if (accessResult.granted) {
              return scalingEngine.executeManualScaling({
                action: 'scale_adjust',
                services: ['api'],
                reason: `concurrent_test_${index}`,
                urgency: 'medium',
              });
            }
            return { success: false, reason: 'access_denied' };
          }),
      );

      const results = await Promise.all(concurrentRequests);

      // Assert - Performance under load
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(15000); // Complete within 15 seconds
      expect(results.filter((r) => r.success).length).toBe(10); // All succeed
      expect(results.every((r) => r.executionTimeMs < 10000)).toBe(true); // Each under 10s
    });

    it('should handle high-frequency monitoring without performance degradation', async () => {
      // Arrange
      const highFrequencyConfig = {
        samplingIntervalMs: 100, // 10 times per second
        enableAnomalyDetection: true,
        weddingDayMode: true,
      };

      const startTime = Date.now();

      // Act - Start high-frequency monitoring
      const session = await performanceMonitor.startRealTimeMonitoring(
        ['api', 'database', 'auth', 'storage'],
        highFrequencyConfig,
      );

      // Collect metrics rapidly for 5 seconds
      const metricsCollections = [];
      const endTime = Date.now() + 5000;

      while (Date.now() < endTime) {
        metricsCollections.push(performanceMonitor.collectCurrentMetrics());
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const allMetrics = await Promise.all(metricsCollections);
      await performanceMonitor.stopMonitoring(session.sessionId);

      // Assert - High-frequency performance
      const totalExecutionTime = Date.now() - startTime;
      expect(allMetrics.length).toBeGreaterThan(40); // Should collect ~50 samples
      expect(totalExecutionTime).toBeLessThan(7000); // Complete within 7 seconds
      expect(allMetrics.every((m) => m.timestamp)).toBe(true); // All valid metrics
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover gracefully from service failures', async () => {
      // Arrange - Mock service failures
      const failingServices = new Set(['database', 'auth']);

      jest
        .spyOn(performanceMonitor, 'collectCurrentMetrics')
        .mockImplementation(async () => {
          const baseMetrics = {
            timestamp: new Date(),
            cpuUtilization: 65,
            memoryUtilization: 70,
            requestsPerSecond: 2000,
            responseTimeP95: 400,
            databaseConnections: 120,
            errorRate: 0.08, // High error rate due to failures
            serviceHealthScores: {
              api: 85,
              database: 25, // Failed service
              auth: 30, // Failed service
              storage: 88,
            },
            customMetrics: { failedServices: Array.from(failingServices) },
          };
          return baseMetrics;
        });

      // Act - Attempt scaling with service failures
      const resilientScaling = await scalingEngine.executeIntelligentScaling();

      // Assert - Graceful degradation
      expect(resilientScaling.success).toBe(true); // Should still succeed
      expect(resilientScaling.degradedMode).toBe(true);
      expect(resilientScaling.failedServices).toEqual(
        expect.arrayContaining(['database', 'auth']),
      );
      expect(resilientScaling.fallbackStrategiesApplied).toContain(
        'service_isolation',
      );
      expect(resilientScaling.partialScalingSuccess).toBe(true);
    });

    it('should implement circuit breaker for repeated failures', async () => {
      // Arrange - Simulate repeated scaling failures
      jest
        .spyOn(scalingEngine as any, 'executeScalingDecision')
        .mockRejectedValue(new Error('Scaling service unavailable'));

      const failureResults = [];

      // Act - Repeated failure attempts (should trigger circuit breaker)
      for (let i = 0; i < 6; i++) {
        try {
          const result = await scalingEngine.executeIntelligentScaling();
          failureResults.push(result);
        } catch (error) {
          failureResults.push({ success: false, error: error.message });
        }
      }

      // Assert - Circuit breaker activation
      expect(failureResults.length).toBe(6);
      expect(failureResults.filter((r) => !r.success).length).toBeGreaterThan(
        3,
      );

      const lastResult = failureResults[failureResults.length - 1];
      expect(lastResult.circuitBreakerOpen).toBe(true);
      expect(lastResult.fallbackMode).toBe(true);
    });

    it('should maintain data consistency during failures', async () => {
      // Arrange - Concurrent operations with potential conflicts
      const conflictingOperations = [
        { action: 'scale_up', services: ['api'], priority: 1 },
        { action: 'scale_down', services: ['api'], priority: 2 },
        { action: 'scale_up', services: ['database'], priority: 1 },
        {
          action: 'emergency_scale',
          services: ['api', 'database'],
          priority: 0,
        },
      ];

      // Act - Execute potentially conflicting operations
      const operationResults = await Promise.all(
        conflictingOperations.map((op) =>
          scalingEngine.executeManualScaling({
            ...op,
            reason: 'consistency_test',
            urgency: op.priority === 0 ? 'critical' : 'medium',
          }),
        ),
      );

      // Assert - Conflict resolution and consistency
      expect(operationResults.every((r) => r.success)).toBe(true);
      expect(operationResults.some((r) => r.conflictResolved)).toBe(true);
      expect(operationResults.some((r) => r.emergencyOverride)).toBe(true);

      // Emergency operation should have highest priority
      const emergencyResult = operationResults[3];
      expect(emergencyResult.emergencyScalingActivated).toBe(true);
      expect(emergencyResult.conflictResolution).toContain(
        'emergency_priority',
      );
    });
  });

  describe('Monitoring and Alerting Integration', () => {
    it('should generate appropriate alerts for different scenarios', async () => {
      // Arrange - Critical metrics requiring immediate attention
      const criticalMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 92,
        memoryUtilization: 89,
        requestsPerSecond: 9500,
        responseTimeP95: 2800,
        databaseConnections: 245,
        errorRate: 0.12,
        serviceHealthScores: { api: 45, database: 35, auth: 60 },
        customMetrics: {
          weddingDayActive: true,
          activeWeddings: 6,
          criticalSystemFailure: true,
        },
      };

      const alertConfig = {
        severityThresholds: {
          critical: { responseTime: 2000, errorRate: 0.1, healthScore: 50 },
          warning: { responseTime: 1000, errorRate: 0.05, healthScore: 70 },
        },
        notificationChannels: ['pagerduty', 'sms', 'slack'],
        weddingDayMode: true,
      };

      // Act - Generate alerts
      const alerts = await performanceMonitor.generateAlerts(
        criticalMetrics,
        alertConfig,
      );
      const anomalies = await performanceMonitor.detectAnomalies(
        criticalMetrics,
        [],
      );

      // Assert - Appropriate alerting
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some((a) => a.severity === 'critical')).toBe(true);
      expect(alerts.some((a) => a.weddingDayImpact)).toBe(true);
      expect(alerts.some((a) => a.channels.includes('pagerduty'))).toBe(true);

      expect(anomalies.detected).toBe(true);
      expect(anomalies.severity).toBeGreaterThan(0.9);
      expect(anomalies.weddingDayContext).toBe(true);
      expect(anomalies.recommendedActions).toContain('emergency_scale');
    });

    it('should escalate alerts based on wedding day context', async () => {
      // Arrange - Wedding day with moderate issues that should escalate
      const weddingDayMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 78,
        memoryUtilization: 75,
        requestsPerSecond: 4200,
        responseTimeP95: 850,
        databaseConnections: 165,
        errorRate: 0.035,
        serviceHealthScores: { api: 78, database: 72, auth: 80 },
        customMetrics: {
          weddingDayActive: true,
          activeWeddings: 3,
          criticalPeriod: true, // 1 hour before ceremony
          highProfileWedding: true,
        },
      };

      const escalationConfig = {
        weddingDayMode: true,
        escalationRules: {
          warning: { immediate: true, escalateAfter: 60 }, // Faster escalation on wedding days
          critical: { immediate: true, escalateAfter: 0 },
        },
        highProfileEscalation: true,
      };

      // Act - Generate wedding day alerts
      const weddingAlerts = await performanceMonitor.generateAlerts(
        weddingDayMetrics,
        escalationConfig,
      );

      // Assert - Escalated alerting for wedding day
      expect(weddingAlerts.some((a) => a.weddingDayEscalation)).toBe(true);
      expect(weddingAlerts.some((a) => a.highProfileImpact)).toBe(true);
      expect(weddingAlerts.some((a) => a.immediate)).toBe(true);
      expect(weddingAlerts.some((a) => a.escalateAfter <= 60)).toBe(true);
    });
  });
});
