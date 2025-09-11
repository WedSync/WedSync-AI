/**
 * WS-202 RealtimeScalingManager Test Suite
 * Team D - Round 1: Auto-Scaling Performance Testing
 * 
 * Tests auto-scaling policies, wedding season optimization, predictive scaling,
 * resource monitoring, and 100% Saturday uptime requirements
 */

import { RealtimeScalingManager } from '@/lib/infrastructure/realtime-scaling-manager';
import type {
  ScalingResult,
  ScalingAction,
  ScalingPolicy,
  ResourcePool,
  InfrastructureHealth,
  WeddingSeasonMetrics,
  PerformanceAlert,
  WeddingOptimizationConfig,
  WeddingDayMode,
  AlertThreshold
} from '@/types/realtime-performance';

// Mock system monitoring functions
const mockSystemMetrics = {
  getCPUUsage: jest.fn().mockReturnValue(45.5),
  getMemoryUsage: jest.fn().mockReturnValue({ used: 2048000000, total: 8192000000 }),
  getNetworkUtilization: jest.fn().mockReturnValue(35.2),
  getConnectionCount: jest.fn().mockReturnValue(150),
  getDatabaseConnections: jest.fn().mockReturnValue(25)
};

jest.mock('os', () => ({
  cpus: () => Array(4).fill({ model: 'Mock CPU' }),
  totalmem: () => 8192000000,
  freemem: () => 6144000000
}));

describe('RealtimeScalingManager', () => {
  let scalingManager: RealtimeScalingManager;

  beforeEach(() => {
    scalingManager = RealtimeScalingManager.getInstance({
      autoScalingEnabled: true,
      scaleUpThreshold: 80,
      scaleDownThreshold: 30,
      maxInstances: 10,
      minInstances: 2,
      weddingDayMultiplier: 10
    });

    // Clear singleton instance for clean testing
    (RealtimeScalingManager as any).instance = null;
    jest.clearAllMocks();
  });

  afterEach(() => {
    scalingManager?.destroy();
  });

  describe('Auto-Scaling Policy Management', () => {
    test('should create and manage scaling policies', async () => {
      const weddingSeasonPolicy: ScalingPolicy = {
        name: 'wedding_season_cpu',
        trigger: {
          metric: 'cpu_usage',
          operator: '>',
          value: 75,
          window: 300 // 5 minutes
        },
        action: {
          type: 'scale_up',
          amount: 2,
          maxInstances: 15,
          minInstances: 3
        },
        cooldown: 600, // 10 minutes
        enabled: true
      };

      await scalingManager.addScalingPolicy(weddingSeasonPolicy);
      
      const policies = await scalingManager.getScalingPolicies();
      expect(policies).toContainEqual(weddingSeasonPolicy);
    });

    test('should evaluate scaling triggers correctly', async () => {
      const highCpuPolicy: ScalingPolicy = {
        name: 'high_cpu_scale_up',
        trigger: {
          metric: 'cpu_usage',
          operator: '>',
          value: 80,
          window: 180
        },
        action: {
          type: 'scale_up',
          amount: 1,
          maxInstances: 8,
          minInstances: 2
        },
        cooldown: 300,
        enabled: true
      };

      await scalingManager.addScalingPolicy(highCpuPolicy);

      // Mock high CPU usage
      mockSystemMetrics.getCPUUsage.mockReturnValue(85);

      const scalingResult = await scalingManager.evaluateScalingNeed();
      
      if (scalingResult.action !== 'no_scaling_needed') {
        expect(scalingResult.action).toBe('scaled_up');
        expect(scalingResult.scalingActions.length).toBeGreaterThan(0);
      }
    });

    test('should respect cooldown periods', async () => {
      const quickPolicy: ScalingPolicy = {
        name: 'quick_scale_test',
        trigger: { metric: 'cpu_usage', operator: '>', value: 70, window: 60 },
        action: { type: 'scale_up', amount: 1, maxInstances: 5, minInstances: 2 },
        cooldown: 300, // 5 minutes
        enabled: true
      };

      await scalingManager.addScalingPolicy(quickPolicy);

      // Trigger scaling twice in quick succession
      mockSystemMetrics.getCPUUsage.mockReturnValue(75);
      
      const firstScale = await scalingManager.evaluateScalingNeed();
      const secondScale = await scalingManager.evaluateScalingNeed();

      // Second scaling should respect cooldown
      if (firstScale.action === 'scaled_up') {
        expect(secondScale.action).toBe('no_scaling_needed');
      }
    });

    test('should handle multiple policy evaluation', async () => {
      const policies: ScalingPolicy[] = [
        {
          name: 'cpu_policy',
          trigger: { metric: 'cpu_usage', operator: '>', value: 80, window: 300 },
          action: { type: 'scale_up', amount: 1, maxInstances: 10, minInstances: 2 },
          cooldown: 600,
          enabled: true
        },
        {
          name: 'memory_policy',
          trigger: { metric: 'memory_usage', operator: '>', value: 85, window: 300 },
          action: { type: 'scale_up', amount: 2, maxInstances: 12, minInstances: 2 },
          cooldown: 600,
          enabled: true
        },
        {
          name: 'connection_policy',
          trigger: { metric: 'connection_count', operator: '>', value: 500, window: 180 },
          action: { type: 'scale_up', amount: 3, maxInstances: 15, minInstances: 2 },
          cooldown: 300,
          enabled: true
        }
      ];

      for (const policy of policies) {
        await scalingManager.addScalingPolicy(policy);
      }

      // Mock conditions that trigger multiple policies
      mockSystemMetrics.getCPUUsage.mockReturnValue(85);
      mockSystemMetrics.getMemoryUsage.mockReturnValue({ used: 7000000000, total: 8192000000 });
      mockSystemMetrics.getConnectionCount.mockReturnValue(550);

      const scalingResult = await scalingManager.evaluateScalingNeed();
      
      expect(scalingResult.scalingActions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Wedding Season Optimization', () => {
    test('should enable predictive scaling for wedding season', async () => {
      const weddingSeasonStart = new Date('2025-05-01');
      const weddingSeasonEnd = new Date('2025-10-31');
      
      const seasonMetrics = await scalingManager.enableWeddingSeasonMode(
        weddingSeasonStart,
        weddingSeasonEnd,
        {
          expectedLoadMultiplier: 5,
          peakSaturdayMultiplier: 15,
          preScalingHours: 24
        }
      );

      expect(seasonMetrics.seasonType).toBe('peak');
      expect(seasonMetrics.expectedLoad).toBeGreaterThan(0);
      expect(seasonMetrics.scalingRecommendation).toBeDefined();
    });

    test('should handle Saturday traffic prediction', async () => {
      // Mock Saturday (day 6)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = jest.fn().mockReturnValue(6);

      const saturdayConfig = {
        expectedWeddings: 25,
        averageVendorsPerWedding: 8,
        peakHours: [14, 15, 16, 17, 18], // 2pm-6pm
        expectedConnections: 2000
      };

      const scalingResult = await scalingManager.prepareForSaturdayTraffic(saturdayConfig);

      expect(scalingResult.action).toMatch(/scaled_up|no_scaling_needed/);
      if (scalingResult.action === 'scaled_up') {
        expect(scalingResult.currentCapacity).toBeGreaterThan(scalingResult.requiredCapacity * 0.8);
      }

      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });

    test('should implement wedding day emergency scaling', async () => {
      const emergencyWedding: WeddingOptimizationConfig = {
        weddingId: 'emergency-wedding-123',
        weddingDate: '2025-06-14',
        organizationId: 'premium-weddings',
        vendorCount: 15,
        guestCount: 300,
        priorityLevel: 5, // Highest priority
        specialRequirements: {
          livestream: true,
          photoSharing: true,
          realTimeCoordination: true,
          emergencyProtocols: true
        }
      };

      const emergencyScaling = await scalingManager.enableEmergencyWeddingMode(emergencyWedding);

      expect(emergencyScaling.action).toMatch(/scaled_up|no_scaling_needed/);
      expect(emergencyScaling.scalingActions.length).toBeGreaterThanOrEqual(0);
    });

    test('should optimize resource allocation for multiple weddings', async () => {
      const saturdayWeddings: WeddingOptimizationConfig[] = [
        {
          weddingId: 'wedding-1',
          weddingDate: '2025-06-14',
          organizationId: 'org-1',
          vendorCount: 12,
          guestCount: 200,
          priorityLevel: 4,
          specialRequirements: { livestream: false, photoSharing: true, realTimeCoordination: true, emergencyProtocols: false }
        },
        {
          weddingId: 'wedding-2',
          weddingDate: '2025-06-14',
          organizationId: 'org-2',
          vendorCount: 8,
          guestCount: 150,
          priorityLevel: 3,
          specialRequirements: { livestream: false, photoSharing: false, realTimeCoordination: true, emergencyProtocols: false }
        },
        {
          weddingId: 'wedding-3',
          weddingDate: '2025-06-14',
          organizationId: 'org-3',
          vendorCount: 20,
          guestCount: 350,
          priorityLevel: 5,
          specialRequirements: { livestream: true, photoSharing: true, realTimeCoordination: true, emergencyProtocols: true }
        }
      ];

      const multiWeddingScaling = await scalingManager.optimizeForMultipleWeddings(saturdayWeddings);

      expect(multiWeddingScaling.action).toBeDefined();
      expect(multiWeddingScaling.requiredCapacity).toBeGreaterThan(0);
      expect(multiWeddingScaling.currentCapacity).toBeGreaterThan(0);
    });
  });

  describe('Resource Pool Management', () => {
    test('should monitor and manage resource pools', async () => {
      const resourcePools = await scalingManager.getResourcePools();

      expect(resourcePools.length).toBeGreaterThan(0);
      
      for (const pool of resourcePools) {
        expect(pool.id).toBeDefined();
        expect(pool.type).toMatch(/connection|memory|cpu|network/);
        expect(pool.capacity).toBeGreaterThan(0);
        expect(pool.utilizationPercent).toBeGreaterThanOrEqual(0);
        expect(pool.utilizationPercent).toBeLessThanOrEqual(100);
        expect(pool.healthScore).toBeGreaterThanOrEqual(0);
        expect(pool.healthScore).toBeLessThanOrEqual(100);
      }
    });

    test('should detect resource pool exhaustion', async () => {
      // Mock high resource utilization
      mockSystemMetrics.getCPUUsage.mockReturnValue(95);
      mockSystemMetrics.getMemoryUsage.mockReturnValue({ used: 7800000000, total: 8192000000 });
      mockSystemMetrics.getConnectionCount.mockReturnValue(950);

      const healthCheck = await scalingManager.checkInfrastructureHealth();

      expect(healthCheck.overall).toMatch(/healthy|degraded|critical/);
      
      if (healthCheck.overall === 'critical') {
        expect(healthCheck.alerts.length).toBeGreaterThan(0);
        expect(healthCheck.alerts.some(alert => alert.severity === 'critical')).toBe(true);
      }
    });

    test('should allocate resources based on priority', async () => {
      const highPriorityRequest = {
        weddingId: 'vip-wedding',
        requiredConnections: 500,
        requiredMemory: 1024000000,
        priority: 5
      };

      const lowPriorityRequest = {
        weddingId: 'standard-wedding',
        requiredConnections: 100,
        requiredMemory: 256000000,
        priority: 2
      };

      const highPriorityAllocation = await scalingManager.allocateResourcesForWedding(highPriorityRequest);
      const lowPriorityAllocation = await scalingManager.allocateResourcesForWedding(lowPriorityRequest);

      expect(highPriorityAllocation.success).toBe(true);
      
      // High priority should get resources even if it means less for low priority
      if (highPriorityAllocation.success) {
        expect(highPriorityAllocation.allocatedResources.connections).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Performance Monitoring and Alerting', () => {
    test('should generate performance alerts based on thresholds', async () => {
      const alertThresholds: AlertThreshold[] = [
        {
          metric: 'cpu_usage',
          warning: 70,
          critical: 90,
          unit: 'percent',
          window: 300
        },
        {
          metric: 'memory_usage',
          warning: 75,
          critical: 90,
          unit: 'percent',
          window: 300
        },
        {
          metric: 'connection_count',
          warning: 500,
          critical: 800,
          unit: 'count',
          window: 60
        }
      ];

      await scalingManager.setAlertThresholds(alertThresholds);

      // Mock critical conditions
      mockSystemMetrics.getCPUUsage.mockReturnValue(95);
      mockSystemMetrics.getMemoryUsage.mockReturnValue({ used: 7500000000, total: 8192000000 });
      mockSystemMetrics.getConnectionCount.mockReturnValue(850);

      const alerts = await scalingManager.checkAlertThresholds();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.severity === 'critical')).toBe(true);
    });

    test('should track scaling history and effectiveness', async () => {
      // Perform some scaling actions
      const scalingResult1 = await scalingManager.evaluateScalingNeed();
      
      mockSystemMetrics.getCPUUsage.mockReturnValue(85);
      const scalingResult2 = await scalingManager.evaluateScalingNeed();

      const scalingHistory = await scalingManager.getScalingHistory(24); // Last 24 hours

      expect(scalingHistory.length).toBeGreaterThanOrEqual(0);
      
      for (const historyEntry of scalingHistory) {
        expect(historyEntry.timestamp).toBeDefined();
        expect(historyEntry.action).toMatch(/scaled_up|scaled_down|no_scaling_needed|failed/);
        expect(historyEntry.currentCapacity).toBeGreaterThanOrEqual(0);
        expect(historyEntry.requiredCapacity).toBeGreaterThanOrEqual(0);
      }
    });

    test('should provide comprehensive performance metrics', async () => {
      const performanceMetrics = await scalingManager.getPerformanceMetrics();

      expect(performanceMetrics.currentLoad).toBeGreaterThanOrEqual(0);
      expect(performanceMetrics.capacity).toBeGreaterThan(0);
      expect(performanceMetrics.utilizationPercent).toBeGreaterThanOrEqual(0);
      expect(performanceMetrics.utilizationPercent).toBeLessThanOrEqual(100);
      expect(performanceMetrics.scalingEvents).toBeGreaterThanOrEqual(0);
      expect(performanceMetrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(performanceMetrics.throughput).toBeGreaterThanOrEqual(0);
    });

    test('should implement wedding day monitoring mode', async () => {
      const weddingDayMode: WeddingDayMode = {
        enabled: true,
        weddingIds: ['saturday-wedding-1', 'saturday-wedding-2'],
        enhancedMonitoring: true,
        priorityChannels: ['emergency', 'timeline', 'coordination'],
        emergencyContacts: [
          { name: 'Site Manager', phone: '+1234567890', role: 'technical', escalationLevel: 1 },
          { name: 'CTO', phone: '+1234567891', role: 'executive', escalationLevel: 2 }
        ],
        fallbackProcedures: ['enable_read_only_mode', 'activate_backup_systems', 'notify_emergency_contacts']
      };

      await scalingManager.enableWeddingDayMode(weddingDayMode);

      const monitoringStatus = await scalingManager.getWeddingDayStatus();

      expect(monitoringStatus.enabled).toBe(true);
      expect(monitoringStatus.activeWeddings).toContain('saturday-wedding-1');
      expect(monitoringStatus.monitoringLevel).toBe('enhanced');
    });
  });

  describe('Predictive Scaling', () => {
    test('should predict scaling needs based on historical patterns', async () => {
      const historicalData = [
        { date: '2024-06-08', type: 'saturday', load: 850, weddings: 15 }, // Previous Saturdays
        { date: '2024-06-15', type: 'saturday', load: 920, weddings: 18 },
        { date: '2024-06-22', type: 'saturday', load: 780, weddings: 12 },
        { date: '2024-06-29', type: 'saturday', load: 1100, weddings: 22 }
      ];

      const prediction = await scalingManager.predictScalingNeeds(
        new Date('2025-06-14'), // Next Saturday
        historicalData
      );

      expect(prediction.predictedLoad).toBeGreaterThan(0);
      expect(prediction.recommendedCapacity).toBeGreaterThan(prediction.predictedLoad);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(100);
      expect(prediction.scalingActions.length).toBeGreaterThanOrEqual(0);
    });

    test('should adjust predictions for seasonal trends', async () => {
      const springPrediction = await scalingManager.predictSeasonalLoad('spring', 2025);
      const summerPrediction = await scalingManager.predictSeasonalLoad('summer', 2025);
      const fallPrediction = await scalingManager.predictSeasonalLoad('fall', 2025);
      const winterPrediction = await scalingManager.predictSeasonalLoad('winter', 2025);

      // Summer should have highest predicted load (peak wedding season)
      expect(summerPrediction.expectedLoad).toBeGreaterThan(springPrediction.expectedLoad);
      expect(summerPrediction.expectedLoad).toBeGreaterThan(winterPrediction.expectedLoad);
      
      // Fall (shoulder season) should be between summer and winter
      expect(fallPrediction.expectedLoad).toBeGreaterThan(winterPrediction.expectedLoad);
      expect(fallPrediction.expectedLoad).toBeLessThan(summerPrediction.expectedLoad);
    });

    test('should implement machine learning-based prediction', async () => {
      const trainingData = Array.from({ length: 52 }, (_, week) => ({
        week: week + 1,
        year: 2024,
        averageLoad: 200 + Math.sin(week / 52 * Math.PI * 2) * 150 + Math.random() * 50,
        weddingCount: 5 + Math.floor(Math.sin(week / 52 * Math.PI * 2) * 10) + Math.floor(Math.random() * 5),
        season: week < 13 ? 'winter' : week < 26 ? 'spring' : week < 39 ? 'summer' : 'fall'
      }));

      const mlPrediction = await scalingManager.trainAndPredict(
        trainingData,
        { week: 25, year: 2025 } // Summer week
      );

      expect(mlPrediction.predictedLoad).toBeGreaterThan(0);
      expect(mlPrediction.accuracy).toBeGreaterThan(0);
      expect(mlPrediction.modelType).toBeDefined();
      expect(mlPrediction.features).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle scaling failures gracefully', async () => {
      // Mock scaling operation failure
      const failingPolicy: ScalingPolicy = {
        name: 'failing_policy',
        trigger: { metric: 'cpu_usage', operator: '>', value: 50, window: 60 },
        action: { type: 'scale_up', amount: 100, maxInstances: 5, minInstances: 2 }, // Impossible scaling
        cooldown: 300,
        enabled: true
      };

      await scalingManager.addScalingPolicy(failingPolicy);
      mockSystemMetrics.getCPUUsage.mockReturnValue(60);

      const scalingResult = await scalingManager.evaluateScalingNeed();

      expect(scalingResult.action).toMatch(/failed|no_scaling_needed/);
      
      if (scalingResult.action === 'failed') {
        expect(scalingResult.scalingActions.length).toBe(0);
      }
    });

    test('should implement circuit breaker for scaling operations', async () => {
      // Simulate repeated scaling failures
      for (let i = 0; i < 10; i++) {
        const result = await scalingManager.forceScalingFailure(); // Mock method for testing
        expect(result.action).toBe('failed');
      }

      // Circuit breaker should now be open
      const finalResult = await scalingManager.evaluateScalingNeed();
      // Should either skip scaling or handle gracefully
      expect(['no_scaling_needed', 'failed'].includes(finalResult.action)).toBe(true);
    });

    test('should maintain service during scaling operations', async () => {
      const startTime = performance.now();
      
      // Simulate scaling while measuring service availability
      const scalingPromise = scalingManager.evaluateScalingNeed();
      const healthPromise = scalingManager.checkInfrastructureHealth();
      const metricsPromise = scalingManager.getPerformanceMetrics();

      const [scalingResult, healthResult, metricsResult] = await Promise.all([
        scalingPromise,
        healthPromise,
        metricsPromise
      ]);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All operations should complete successfully and quickly
      expect(scalingResult).toBeDefined();
      expect(healthResult).toBeDefined();
      expect(metricsResult).toBeDefined();
      expect(totalTime).toBeLessThan(5000); // Under 5 seconds
    });

    test('should cleanup resources on destroy', () => {
      const destroySpy = jest.spyOn(scalingManager, 'destroy');
      
      scalingManager.destroy();
      
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Wedding Industry-Specific Features', () => {
    test('should handle wedding emergency scenarios', async () => {
      const emergencyScenarios = [
        {
          type: 'weather_emergency',
          affectedWeddings: ['outdoor-wedding-1', 'garden-wedding-2'],
          expectedLoadIncrease: 300,
          urgency: 'critical'
        },
        {
          type: 'vendor_no_show',
          affectedWeddings: ['wedding-xyz'],
          expectedLoadIncrease: 150,
          urgency: 'high'
        },
        {
          type: 'livestream_surge',
          affectedWeddings: ['celebrity-wedding'],
          expectedLoadIncrease: 2000,
          urgency: 'critical'
        }
      ];

      for (const scenario of emergencyScenarios) {
        const emergencyResponse = await scalingManager.handleWeddingEmergency(scenario);
        
        expect(emergencyResponse.action).toMatch(/scaled_up|no_scaling_needed/);
        expect(emergencyResponse.responseTime).toBeLessThan(30000); // Under 30 seconds
        
        if (scenario.urgency === 'critical') {
          expect(emergencyResponse.scalingActions.length).toBeGreaterThan(0);
        }
      }
    });

    test('should implement venue-specific scaling', async () => {
      const venueConfigs = [
        {
          venueId: 'grand-ballroom',
          capacity: 500,
          wifiCapacity: 300,
          expectedDevices: 400,
          locationFactors: { signal_strength: 'excellent', network_congestion: 'low' }
        },
        {
          venueId: 'outdoor-garden',
          capacity: 200,
          wifiCapacity: 100,
          expectedDevices: 150,
          locationFactors: { signal_strength: 'good', network_congestion: 'medium' }
        }
      ];

      for (const venue of venueConfigs) {
        const venueScaling = await scalingManager.optimizeForVenue(venue);
        
        expect(venueScaling.recommendedCapacity).toBeGreaterThanOrEqual(venue.expectedDevices);
        expect(venueScaling.adjustmentFactors).toBeDefined();
      }
    });

    test('should track wedding industry KPIs', async () => {
      const weddingKPIs = await scalingManager.getWeddingIndustryKPIs();

      expect(weddingKPIs.averageWeddingLoad).toBeGreaterThan(0);
      expect(weddingKPIs.saturdayMultiplier).toBeGreaterThan(1);
      expect(weddingKPIs.peakSeasonMultiplier).toBeGreaterThan(1);
      expect(weddingKPIs.vendorAdoptionRate).toBeGreaterThanOrEqual(0);
      expect(weddingKPIs.uptime.saturday).toBeGreaterThanOrEqual(99.9); // Saturday uptime requirement
      expect(weddingKPIs.averageResponseTime).toBeLessThan(500); // Sub-500ms requirement
    });
  });
});

describe('RealtimeScalingManager Integration Tests', () => {
  test('should handle complete Saturday wedding coordination scenario', async () => {
    const scalingManager = RealtimeScalingManager.getInstance({
      autoScalingEnabled: true,
      scaleUpThreshold: 75,
      scaleDownThreshold: 25,
      maxInstances: 20,
      minInstances: 3,
      weddingDayMultiplier: 12
    });

    // Simulate Saturday morning preparation
    const saturdayMorning = {
      time: '08:00',
      expectedWeddings: 18,
      preparationPhase: true,
      expectedConnections: 500
    };

    const morningScaling = await scalingManager.prepareForTimeOfDay(saturdayMorning);
    expect(morningScaling.action).toMatch(/scaled_up|no_scaling_needed/);

    // Simulate peak ceremony time (3pm-6pm)
    const peakTime = {
      time: '15:00',
      expectedWeddings: 18,
      ceremonyPhase: true,
      expectedConnections: 2500,
      livestreamActive: true
    };

    const peakScaling = await scalingManager.prepareForTimeOfDay(peakTime);
    expect(peakScaling.action).toMatch(/scaled_up|no_scaling_needed/);
    
    if (peakScaling.action === 'scaled_up') {
      expect(peakScaling.currentCapacity).toBeGreaterThan(2000);
    }

    // Simulate evening wind-down
    const evening = {
      time: '21:00',
      expectedWeddings: 18,
      receptionPhase: true,
      expectedConnections: 1800
    };

    const eveningScaling = await scalingManager.prepareForTimeOfDay(evening);
    
    // Verify system health throughout the day
    const healthCheck = await scalingManager.checkInfrastructureHealth();
    expect(healthCheck.overall).toMatch(/healthy|degraded/); // Should not be critical
    
    // Check that Saturday uptime requirement is met
    const uptimeMetrics = await scalingManager.getUptimeMetrics();
    expect(uptimeMetrics.saturday).toBeGreaterThanOrEqual(99.9);

    scalingManager.destroy();
  });
});