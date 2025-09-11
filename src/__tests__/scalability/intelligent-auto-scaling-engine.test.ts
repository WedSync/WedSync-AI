import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';
import { IntelligentAutoScalingEngine } from '@/lib/scalability/backend/intelligent-auto-scaling-engine';
import { WeddingLoadPredictor } from '@/lib/scalability/backend/wedding-load-predictor';
import { RealTimePerformanceMonitor } from '@/lib/scalability/backend/real-time-performance-monitor';
import type {
  SystemMetrics,
  WeddingEvent,
  ScalingDecision,
  ScalingExecution,
  CapacityForecast,
} from '@/lib/scalability/types/core';

// Mock the dependencies
jest.mock('@/lib/scalability/backend/wedding-load-predictor');
jest.mock('@/lib/scalability/backend/real-time-performance-monitor');

describe('IntelligentAutoScalingEngine', () => {
  let engine: IntelligentAutoScalingEngine;
  let mockWeddingPredictor: jest.Mocked<WeddingLoadPredictor>;
  let mockPerformanceMonitor: jest.Mocked<RealTimePerformanceMonitor>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mocked instances
    mockWeddingPredictor =
      new WeddingLoadPredictor() as jest.Mocked<WeddingLoadPredictor>;
    mockPerformanceMonitor =
      new RealTimePerformanceMonitor() as jest.Mocked<RealTimePerformanceMonitor>;

    // Create engine instance
    engine = new IntelligentAutoScalingEngine();

    // Mock private methods access
    (engine as any).weddingPredictor = mockWeddingPredictor;
    (engine as any).performanceMonitor = mockPerformanceMonitor;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('executeIntelligentScaling', () => {
    it('should execute scaling when high load is detected', async () => {
      // Arrange
      const mockMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 85,
        memoryUtilization: 80,
        requestsPerSecond: 5000,
        responseTimeP95: 800,
        databaseConnections: 180,
        errorRate: 0.02,
        serviceHealthScores: { api: 85, db: 80, auth: 90 },
        customMetrics: {},
      };

      const mockWeddingEvent: WeddingEvent = {
        id: 'wedding-123',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        estimatedGuests: 200,
        vendorCount: 8,
        isHighProfile: false,
        services: ['photography', 'catering', 'venue'],
        expectedTrafficMultiplier: 2.5,
      };

      // Mock the performance monitor to return high load metrics
      mockPerformanceMonitor.collectCurrentMetrics = jest
        .fn()
        .mockResolvedValue(mockMetrics);

      // Mock wedding predictor to return upcoming wedding
      mockWeddingPredictor.getUpcomingWeddings = jest
        .fn()
        .mockResolvedValue([mockWeddingEvent]);

      // Mock capacity forecast
      const mockCapacityForecast: CapacityForecast = {
        timeRange: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
        predictedLoad: {
          requestsPerSecond: 6000,
          concurrentUsers: 1500,
          databaseLoad: 85,
        },
        confidence: 0.92,
        scenarios: [],
      };

      mockWeddingPredictor.generateCapacityForecast = jest
        .fn()
        .mockResolvedValue(mockCapacityForecast);

      // Act
      const result: ScalingExecution = await engine.executeIntelligentScaling();

      // Assert
      expect(result.success).toBe(true);
      expect(result.decisionsExecuted).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeLessThan(30000); // Should complete in under 30 seconds
      expect(mockPerformanceMonitor.collectCurrentMetrics).toHaveBeenCalled();
      expect(mockWeddingPredictor.getUpcomingWeddings).toHaveBeenCalled();
    });

    it('should handle wedding day emergency scaling', async () => {
      // Arrange - Wedding day scenario
      const weddingDayMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 95,
        memoryUtilization: 90,
        requestsPerSecond: 8000,
        responseTimeP95: 1500,
        databaseConnections: 250,
        errorRate: 0.05,
        serviceHealthScores: { api: 70, db: 65, auth: 80 },
        customMetrics: { weddingDayActive: true },
      };

      const todayWedding: WeddingEvent = {
        id: 'wedding-emergency-123',
        date: new Date(), // Today
        estimatedGuests: 500,
        vendorCount: 15,
        isHighProfile: true,
        services: ['photography', 'catering', 'venue', 'flowers', 'music'],
        expectedTrafficMultiplier: 4.0,
      };

      mockPerformanceMonitor.collectCurrentMetrics = jest
        .fn()
        .mockResolvedValue(weddingDayMetrics);
      mockWeddingPredictor.getUpcomingWeddings = jest
        .fn()
        .mockResolvedValue([todayWedding]);

      // Act
      const result: ScalingExecution = await engine.executeIntelligentScaling();

      // Assert
      expect(result.success).toBe(true);
      expect(result.emergencyScalingActivated).toBe(true);
      expect(result.executionTimeMs).toBeLessThan(10000); // Emergency scaling should be faster
    });

    it('should optimize costs during low traffic periods', async () => {
      // Arrange - Low traffic scenario
      const lowTrafficMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 25,
        memoryUtilization: 35,
        requestsPerSecond: 150,
        responseTimeP95: 120,
        databaseConnections: 20,
        errorRate: 0.001,
        serviceHealthScores: { api: 95, db: 98, auth: 97 },
        customMetrics: {},
      };

      mockPerformanceMonitor.collectCurrentMetrics = jest
        .fn()
        .mockResolvedValue(lowTrafficMetrics);
      mockWeddingPredictor.getUpcomingWeddings = jest
        .fn()
        .mockResolvedValue([]);

      // Act
      const result: ScalingExecution = await engine.executeIntelligentScaling();

      // Assert
      expect(result.success).toBe(true);
      expect(result.costOptimizationApplied).toBe(true);
      expect(result.resourcesDownscaled).toBeGreaterThan(0);
    });
  });

  describe('analyzeSystemMetrics', () => {
    it('should correctly identify performance bottlenecks', async () => {
      // Arrange
      const metricsWithBottleneck: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 45,
        memoryUtilization: 40,
        requestsPerSecond: 2000,
        responseTimeP95: 2000, // High response time indicates bottleneck
        databaseConnections: 200, // High DB connections
        errorRate: 0.08, // High error rate
        serviceHealthScores: { api: 60, db: 40, auth: 85 }, // DB unhealthy
        customMetrics: {},
      };

      // Act
      const analysis = await engine.analyzeSystemMetrics(metricsWithBottleneck);

      // Assert
      expect(analysis.healthScore).toBeLessThan(70);
      expect(analysis.bottlenecks).toContain('database');
      expect(analysis.bottlenecks).toContain('response_time');
      expect(analysis.recommendedActions).toContain('scale_database');
      expect(analysis.scalingUrgency).toBeGreaterThan(0.7);
    });

    it('should detect healthy system state', async () => {
      // Arrange
      const healthyMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 35,
        memoryUtilization: 45,
        requestsPerSecond: 1000,
        responseTimeP95: 150,
        databaseConnections: 50,
        errorRate: 0.001,
        serviceHealthScores: { api: 95, db: 98, auth: 97 },
        customMetrics: {},
      };

      // Act
      const analysis = await engine.analyzeSystemMetrics(healthyMetrics);

      // Assert
      expect(analysis.healthScore).toBeGreaterThan(90);
      expect(analysis.bottlenecks).toHaveLength(0);
      expect(analysis.scalingUrgency).toBeLessThan(0.3);
      expect(analysis.recommendedActions).toContain(
        'maintain_current_capacity',
      );
    });
  });

  describe('predictCapacityNeeds', () => {
    it('should predict capacity needs for wedding season peak', async () => {
      // Arrange
      const weddingSeasonForecast: CapacityForecast = {
        timeRange: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
        predictedLoad: {
          requestsPerSecond: 10000,
          concurrentUsers: 3000,
          databaseLoad: 95,
        },
        confidence: 0.89,
        scenarios: [
          {
            name: 'peak_wedding_saturday',
            probability: 0.85,
            resourceRequirements: {
              cpuCores: 64,
              memoryGB: 256,
              databaseConnections: 400,
            },
          },
        ],
      };

      // Act
      const prediction = await engine.predictCapacityNeeds(
        weddingSeasonForecast,
      );

      // Assert
      expect(prediction.confidence).toBeGreaterThan(0.8);
      expect(prediction.recommendedCapacity.cpuCores).toBeGreaterThan(40);
      expect(prediction.recommendedCapacity.memoryGB).toBeGreaterThan(200);
      expect(prediction.scalingSchedule).toBeDefined();
      expect(prediction.estimatedCost.monthly).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle monitoring service failures gracefully', async () => {
      // Arrange
      mockPerformanceMonitor.collectCurrentMetrics = jest
        .fn()
        .mockRejectedValue(new Error('Monitoring service unavailable'));

      // Act
      const result = await engine.executeIntelligentScaling();

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('monitoring_service_unavailable');
      expect(result.fallbackMode).toBe(true);
    });

    it('should implement circuit breaker for repeated failures', async () => {
      // Arrange
      const error = new Error('Service failure');

      // Simulate repeated failures
      for (let i = 0; i < 5; i++) {
        mockPerformanceMonitor.collectCurrentMetrics = jest
          .fn()
          .mockRejectedValue(error);
        await engine.executeIntelligentScaling();
      }

      // Act - Next call should trigger circuit breaker
      const result = await engine.executeIntelligentScaling();

      // Assert
      expect(result.circuitBreakerOpen).toBe(true);
      expect(result.success).toBe(false);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete scaling analysis within 30 seconds', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      const result = await engine.executeIntelligentScaling();

      // Assert
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(30000); // 30 seconds
      expect(result.executionTimeMs).toBeLessThan(30000);
    });

    it('should handle concurrent scaling requests', async () => {
      // Arrange
      const concurrentRequests = Array(5)
        .fill(null)
        .map(() => engine.executeIntelligentScaling());

      // Act
      const results = await Promise.all(concurrentRequests);

      // Assert
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.executionTimeMs).toBeLessThan(30000);
      });
    });
  });

  describe('Wedding-Specific Intelligence', () => {
    it('should apply wedding day multipliers correctly', async () => {
      // Arrange
      const weddingEvent: WeddingEvent = {
        id: 'big-wedding-123',
        date: new Date(),
        estimatedGuests: 800, // Large wedding
        vendorCount: 20,
        isHighProfile: true,
        services: [
          'photography',
          'catering',
          'venue',
          'flowers',
          'music',
          'transport',
        ],
        expectedTrafficMultiplier: 5.0, // High multiplier
      };

      const baseMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 60,
        memoryUtilization: 55,
        requestsPerSecond: 2000,
        responseTimeP95: 300,
        databaseConnections: 100,
        errorRate: 0.01,
        serviceHealthScores: { api: 85, db: 88, auth: 90 },
        customMetrics: { activeWeddings: 1 },
      };

      mockPerformanceMonitor.collectCurrentMetrics = jest
        .fn()
        .mockResolvedValue(baseMetrics);
      mockWeddingPredictor.getUpcomingWeddings = jest
        .fn()
        .mockResolvedValue([weddingEvent]);

      // Act
      const result = await engine.executeIntelligentScaling();

      // Assert
      expect(result.weddingContextApplied).toBe(true);
      expect(result.trafficMultiplier).toBe(5.0);
      expect(result.decisionsExecuted).toBeGreaterThan(0);
    });

    it('should prioritize wedding day stability over cost optimization', async () => {
      // Arrange - Wedding day with moderate load
      const weddingDayEvent: WeddingEvent = {
        id: 'wedding-today-123',
        date: new Date(),
        estimatedGuests: 300,
        vendorCount: 10,
        isHighProfile: false,
        services: ['photography', 'catering', 'venue'],
        expectedTrafficMultiplier: 2.5,
      };

      const moderateMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUtilization: 50,
        memoryUtilization: 45,
        requestsPerSecond: 1500,
        responseTimeP95: 200,
        databaseConnections: 75,
        errorRate: 0.005,
        serviceHealthScores: { api: 90, db: 92, auth: 88 },
        customMetrics: { weddingDayActive: true },
      };

      mockPerformanceMonitor.collectCurrentMetrics = jest
        .fn()
        .mockResolvedValue(moderateMetrics);
      mockWeddingPredictor.getUpcomingWeddings = jest
        .fn()
        .mockResolvedValue([weddingDayEvent]);

      // Act
      const result = await engine.executeIntelligentScaling();

      // Assert
      expect(result.weddingDayMode).toBe(true);
      expect(result.costOptimizationApplied).toBe(false); // Cost optimization should be disabled on wedding days
      expect(result.stabilityPrioritized).toBe(true);
    });
  });
});
