import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { AuditLogger } from '@/lib/audit/AuditLogger';
import { createMockSupabaseClient } from '../utils/supabase-mock';
import { AuditTestFramework } from '../audit/framework/AuditTestFramework';

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
}

describe('Audit Performance and Load Testing', () => {
  let auditLogger: AuditLogger;
  let mockSupabase: any;
  let testFramework: AuditTestFramework;
  let performanceMetrics: PerformanceMetrics;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    auditLogger = new AuditLogger(mockSupabase);
    testFramework = new AuditTestFramework();
    performanceMetrics = {
      responseTime: 0,
      throughput: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      errorRate: 0
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Response Time Benchmarks', () => {
    it('should log single audit entry within 100ms', async () => {
      const startTime = performance.now();
      
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.task.create',
        resourceId: 'task-456',
        details: testFramework.generateWeddingTaskData()
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(100);
      performanceMetrics.responseTime = responseTime;
    });

    it('should handle batch audit logging within performance thresholds', async () => {
      const batchSize = 50;
      const auditEntries = Array.from({ length: batchSize }, (_, i) => ({
        userId: `user-${i}`,
        action: 'wedding.guest.add',
        resourceId: `guest-${i}`,
        details: testFramework.generateWeddingGuestData()
      }));

      const startTime = performance.now();
      
      await Promise.all(
        auditEntries.map(entry => auditLogger.logAction(entry))
      );
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgResponseTime = totalTime / batchSize;
      
      expect(avgResponseTime).toBeLessThan(50); // 50ms per entry in batch
      expect(totalTime).toBeLessThan(5000); // 5 seconds total
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrentUsers = 20;
      const actionsPerUser = 10;
      
      const concurrentTests = Array.from({ length: concurrentUsers }, async (_, userId) => {
        const userActions = Array.from({ length: actionsPerUser }, async (_, actionId) => {
          const startTime = performance.now();
          
          await auditLogger.logAction({
            userId: `user-${userId}`,
            action: 'wedding.vendor.view',
            resourceId: `vendor-${actionId}`,
            details: testFramework.generateWeddingVendorData()
          });
          
          return performance.now() - startTime;
        });
        
        return Promise.all(userActions);
      });

      const allResponseTimes = (await Promise.all(concurrentTests)).flat();
      const avgResponseTime = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
      const p95ResponseTime = allResponseTimes.sort((a, b) => a - b)[Math.floor(allResponseTimes.length * 0.95)];
      
      expect(avgResponseTime).toBeLessThan(200);
      expect(p95ResponseTime).toBeLessThan(500);
    });
  });

  describe('Throughput Testing', () => {
    it('should handle minimum 1000 audit entries per minute', async () => {
      const testDuration = 10000; // 10 seconds test
      const expectedThroughput = Math.floor(1000 / 6); // 10 seconds worth
      let processedEntries = 0;
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < testDuration) {
        await auditLogger.logAction({
          userId: `user-${processedEntries}`,
          action: 'wedding.task.update',
          resourceId: `task-${processedEntries}`,
          details: { status: 'completed', timestamp: new Date() }
        });
        
        processedEntries++;
      }
      
      const actualThroughput = processedEntries;
      expect(actualThroughput).toBeGreaterThanOrEqual(expectedThroughput);
      performanceMetrics.throughput = actualThroughput;
    });

    it('should scale throughput with wedding event load', async () => {
      const weddingEventTypes = [
        'venue_booking',
        'caterer_booking',
        'photographer_booking',
        'guest_invitation_sent',
        'rsvp_received',
        'payment_processed',
        'menu_selection',
        'seating_arrangement'
      ];

      const simultaneousWeddings = 10;
      const eventsPerWedding = 20;
      
      const startTime = performance.now();
      
      const weddingTests = Array.from({ length: simultaneousWeddings }, async (_, weddingId) => {
        const weddingEvents = Array.from({ length: eventsPerWedding }, async (_, eventId) => {
          const eventType = weddingEventTypes[eventId % weddingEventTypes.length];
          
          return auditLogger.logAction({
            userId: `couple-${weddingId}`,
            action: `wedding.${eventType}`,
            resourceId: `wedding-${weddingId}-${eventType}-${eventId}`,
            details: {
              weddingId: `wedding-${weddingId}`,
              eventType,
              timestamp: new Date(),
              data: testFramework.generateWeddingEventData(eventType)
            }
          });
        });
        
        return Promise.all(weddingEvents);
      });

      await Promise.all(weddingTests);
      
      const endTime = performance.now();
      const totalEvents = simultaneousWeddings * eventsPerWedding;
      const eventsPerSecond = totalEvents / ((endTime - startTime) / 1000);
      
      expect(eventsPerSecond).toBeGreaterThan(50); // 50 events per second minimum
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process 1000 audit entries
      for (let i = 0; i < 1000; i++) {
        await auditLogger.logAction({
          userId: `user-${i}`,
          action: 'wedding.photo.upload',
          resourceId: `photo-${i}`,
          details: testFramework.generateLargePhotoMetadata()
        });
        
        // Check memory every 100 entries
        if (i % 100 === 0 && global.gc) {
          global.gc(); // Force garbage collection if available
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseKB = memoryIncrease / 1024;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncreaseKB).toBeLessThan(50 * 1024);
      performanceMetrics.memoryUsage = memoryIncreaseKB;
    });

    it('should handle large audit payloads efficiently', async () => {
      const largePayloadSizes = [10, 50, 100, 500]; // KB sizes
      
      for (const size of largePayloadSizes) {
        const largePayload = {
          description: 'x'.repeat(size * 1024),
          metadata: testFramework.generateWeddingTaskData(),
          attachments: Array.from({ length: 10 }, (_, i) => ({
            id: `attachment-${i}`,
            name: `file-${i}.jpg`,
            data: 'x'.repeat(1000) // 1KB each
          }))
        };
        
        const startTime = performance.now();
        const initialMemory = process.memoryUsage().heapUsed;
        
        await auditLogger.logAction({
          userId: 'user-123',
          action: 'wedding.document.upload',
          resourceId: `doc-${size}kb`,
          details: largePayload
        });
        
        const endTime = performance.now();
        const finalMemory = process.memoryUsage().heapUsed;
        const processingTime = endTime - startTime;
        const memoryUsed = (finalMemory - initialMemory) / 1024; // KB
        
        // Processing time should scale linearly with payload size
        expect(processingTime).toBeLessThan(size * 10); // 10ms per KB
        
        // Memory usage should not exceed 2x payload size
        expect(memoryUsed).toBeLessThan(size * 2);
      }
    });
  });

  describe('Database Performance', () => {
    it('should optimize database query performance', async () => {
      // Simulate database query timing
      let queryTimes: number[] = [];
      
      mockSupabase.from.mockImplementation(() => ({
        insert: jest.fn().mockImplementation(async () => {
          const queryStart = performance.now();
          
          // Simulate database operation
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          
          const queryTime = performance.now() - queryStart;
          queryTimes.push(queryTime);
          
          return { data: [{ id: 'test-id' }], error: null };
        }),
        select: jest.fn().mockResolvedValue({ data: [], error: null })
      }));
      
      // Perform multiple audit operations
      for (let i = 0; i < 100; i++) {
        await auditLogger.logAction({
          userId: `user-${i}`,
          action: 'wedding.budget.update',
          resourceId: `budget-${i}`,
          details: testFramework.generateWeddingBudgetData()
        });
      }
      
      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const p95QueryTime = queryTimes.sort((a, b) => a - b)[Math.floor(queryTimes.length * 0.95)];
      
      expect(avgQueryTime).toBeLessThan(100); // Average under 100ms
      expect(p95QueryTime).toBeLessThan(250); // 95th percentile under 250ms
    });

    it('should handle database connection pooling efficiently', async () => {
      const connectionTests = Array.from({ length: 50 }, async (_, i) => {
        return auditLogger.logAction({
          userId: `user-${i}`,
          action: 'wedding.vendor.contact',
          resourceId: `vendor-${i}`,
          details: testFramework.generateWeddingVendorData()
        });
      });
      
      const startTime = performance.now();
      await Promise.all(connectionTests);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // Complete in under 5 seconds
    });
  });

  describe('Error Rate Monitoring', () => {
    it('should maintain error rate below 1% under normal load', async () => {
      const totalRequests = 1000;
      let errorCount = 0;
      
      for (let i = 0; i < totalRequests; i++) {
        try {
          await auditLogger.logAction({
            userId: `user-${i}`,
            action: 'wedding.timeline.update',
            resourceId: `timeline-${i}`,
            details: testFramework.generateWeddingTimelineData()
          });
        } catch (error) {
          errorCount++;
        }
      }
      
      const errorRate = (errorCount / totalRequests) * 100;
      expect(errorRate).toBeLessThan(1);
      performanceMetrics.errorRate = errorRate;
    });

    it('should handle graceful degradation under extreme load', async () => {
      const extremeLoad = 2000;
      let successCount = 0;
      let errorCount = 0;
      
      const extremeTests = Array.from({ length: extremeLoad }, async (_, i) => {
        try {
          await auditLogger.logAction({
            userId: `user-${i}`,
            action: 'wedding.emergency.update',
            resourceId: `emergency-${i}`,
            details: { priority: 'high', timestamp: new Date() }
          });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      });
      
      await Promise.allSettled(extremeTests);
      
      const totalRequests = successCount + errorCount;
      const successRate = (successCount / totalRequests) * 100;
      
      // Even under extreme load, should maintain at least 80% success rate
      expect(successRate).toBeGreaterThan(80);
    });
  });

  describe('Real-time Performance', () => {
    it('should handle real-time audit streaming with low latency', async () => {
      const streamingTests = Array.from({ length: 100 }, async (_, i) => {
        const startTime = performance.now();
        
        await auditLogger.logActionWithStreaming({
          userId: `user-${i}`,
          action: 'wedding.live.update',
          resourceId: `live-${i}`,
          details: { eventType: 'real-time', data: testFramework.generateLiveEventData() }
        });
        
        return performance.now() - startTime;
      });
      
      const latencies = await Promise.all(streamingTests);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      
      expect(avgLatency).toBeLessThan(50); // Average under 50ms
      expect(maxLatency).toBeLessThan(200); // Max under 200ms
    });

    it('should maintain performance during peak wedding season', async () => {
      // Simulate peak wedding season load (June-September)
      const peakSeasonLoad = {
        weddingsPerDay: 100,
        eventsPerWedding: 50,
        peakHours: 8 // 8 hours of peak activity
      };
      
      const eventsPerSecond = Math.ceil(
        (peakSeasonLoad.weddingsPerDay * peakSeasonLoad.eventsPerWedding) / 
        (peakSeasonLoad.peakHours * 3600)
      );
      
      const testDuration = 10000; // 10 second test
      const expectedEvents = Math.floor((eventsPerSecond * testDuration) / 1000);
      
      let processedEvents = 0;
      const startTime = Date.now();
      
      while (Date.now() - startTime < testDuration) {
        await auditLogger.logAction({
          userId: `couple-${processedEvents}`,
          action: 'wedding.peak.activity',
          resourceId: `peak-${processedEvents}`,
          details: {
            season: 'peak',
            hour: new Date().getHours(),
            data: testFramework.generateWeddingEventData('peak_activity')
          }
        });
        
        processedEvents++;
      }
      
      // Should handle at least 80% of expected load
      expect(processedEvents).toBeGreaterThanOrEqual(expectedEvents * 0.8);
    });
  });

  describe('Resource Utilization', () => {
    it('should efficiently utilize system resources', async () => {
      const resourceMonitor = {
        startCPU: process.cpuUsage(),
        startMemory: process.memoryUsage(),
        startTime: performance.now()
      };
      
      // Run intensive audit workload
      const intensiveWorkload = Array.from({ length: 500 }, (_, i) => 
        auditLogger.logAction({
          userId: `user-${i}`,
          action: 'wedding.resource.intensive',
          resourceId: `resource-${i}`,
          details: testFramework.generateComplexWeddingData()
        })
      );
      
      await Promise.all(intensiveWorkload);
      
      const endCPU = process.cpuUsage(resourceMonitor.startCPU);
      const endMemory = process.memoryUsage();
      const endTime = performance.now();
      
      const cpuUsage = (endCPU.user + endCPU.system) / 1000; // Convert to milliseconds
      const memoryIncrease = (endMemory.heapUsed - resourceMonitor.startMemory.heapUsed) / 1024 / 1024; // MB
      const duration = endTime - resourceMonitor.startTime;
      
      const cpuEfficiency = (duration / cpuUsage) * 100; // Higher is better
      
      expect(cpuEfficiency).toBeGreaterThan(50); // At least 50% efficiency
      expect(memoryIncrease).toBeLessThan(100); // Less than 100MB increase
      
      performanceMetrics.cpuUsage = cpuUsage;
      performanceMetrics.memoryUsage = memoryIncrease;
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should handle wedding day peak load', async () => {
      // Wedding day typically has intense activity bursts
      const weddingDayScenarios = [
        { phase: 'morning_prep', load: 20, duration: 2000 },
        { phase: 'ceremony', load: 50, duration: 1000 },
        { phase: 'reception', load: 100, duration: 3000 },
        { phase: 'cleanup', load: 15, duration: 1000 }
      ];
      
      for (const scenario of weddingDayScenarios) {
        const phaseTests = Array.from({ length: scenario.load }, async (_, i) => {
          const startTime = performance.now();
          
          await auditLogger.logAction({
            userId: `wedding-participant-${i}`,
            action: `wedding.${scenario.phase}`,
            resourceId: `${scenario.phase}-${i}`,
            details: {
              phase: scenario.phase,
              timestamp: new Date(),
              data: testFramework.generateWeddingPhaseData(scenario.phase)
            }
          });
          
          return performance.now() - startTime;
        });
        
        const phaseStartTime = performance.now();
        const phaseTimes = await Promise.all(phaseTests);
        const phaseDuration = performance.now() - phaseStartTime;
        
        const avgResponseTime = phaseTimes.reduce((a, b) => a + b, 0) / phaseTimes.length;
        
        expect(phaseDuration).toBeLessThan(scenario.duration);
        expect(avgResponseTime).toBeLessThan(100);
      }
    });
  });

  afterAll(() => {
    // Log performance metrics summary
    console.log('Audit Performance Test Results:', performanceMetrics);
  });
});