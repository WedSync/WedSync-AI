// WS-334 Team D: Performance Benchmark Tests
// Comprehensive performance testing to validate system requirements

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { CoupleNotificationService } from '@/services/couples/CoupleNotificationService';
import { CouplePersonalizationEngine } from '@/components/couples/personalization/CouplePersonalizationEngine';
import {
  CoupleProfile,
  WeddingContext,
  BaseNotification,
  PersonalizedNotification,
} from '@/types/couple-notifications';

// Performance test configuration
const PERFORMANCE_TARGETS = {
  PERSONALIZATION_SPEED: 1000, // <1s for AI-personalized notifications
  REALTIME_LATENCY: 100, // <100ms for real-time stream
  MOBILE_TOUCH_RESPONSE: 50, // <50ms for touch interactions
  VIRAL_CONTENT_GENERATION: 2000, // <2s for shareable content
  MILESTONE_ANIMATION_FPS: 60, // 60fps for milestone celebrations
  FRIEND_INVITATION_FLOW: 30000, // <30s for invitation completion
  SOCIAL_SHARING: 3000, // <3s for share action completion
};

// Mock high-performance data
const createTestData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    coupleProfile: {
      coupleId: `couple-${i}`,
      weddingId: `wedding-${i}`,
      partnerA: {
        partnerId: `partner-a-${i}`,
        firstName: `Sarah${i}`,
        lastName: 'Johnson',
        email: `sarah${i}@example.com`,
        communicationPreference: 'morning' as any,
        socialMediaUsage: 'high' as any,
      },
      partnerB: {
        partnerId: `partner-b-${i}`,
        firstName: `James${i}`,
        lastName: 'Smith',
        email: `james${i}@example.com`,
        communicationPreference: 'evening' as any,
        socialMediaUsage: 'medium' as any,
      },
      weddingDate: new Date('2024-06-15'),
      weddingStyle: 'romantic',
      budgetRange: 'medium' as any,
      guestCount: 150,
      viralTendencies: 'high',
      visualPreferences: {} as any,
      preferredTone: 'excited',
    } as CoupleProfile,
    weddingContext: {
      weddingId: `wedding-${i}`,
      weddingDate: new Date('2024-06-15'),
      daysToWedding: 180,
      currentPhase: 'early_planning',
      budgetUtilization: 0.3,
      vendorCategories: [],
      selectedVendors: [],
      timeline: {},
      guestList: [],
      currentStressLevel: 'low',
      planningProgress: 0.25,
    } as WeddingContext,
    baseNotification: {
      id: `notif-${i}`,
      type: 'vendor_update',
      category: 'vendor',
      title: 'Vendor Update',
      message: 'Your vendor has sent you an update!',
      priority: 'medium',
    } as BaseNotification,
  }));
};

// Performance measurement utilities
const measureTime = async <T>(
  fn: () => Promise<T>,
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

const measureMemoryUsage = () => {
  if (typeof performance.memory !== 'undefined') {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
    };
  }
  return { used: 0, total: 0, limit: 0 };
};

const calculateStats = (durations: number[]) => {
  const sorted = durations.sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: durations.reduce((a, b) => a + b, 0) / durations.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
};

// Helper functions to reduce nesting complexity (S2004)
const createMockQueryChain = () => ({
  eq: () => ({
    single: () => ({ data: {}, error: null }),
  }),
});

const createMockSelectChain = () => ({
  select: () => createMockQueryChain(),
});

const createMockUpdateChain = () => ({
  eq: () => createMockSelectChain(),
});

const createSupabaseMockTable = () => ({
  select: () => createMockQueryChain(),
  insert: () => ({ error: null }),
  upsert: () => ({ error: null }),
  update: () => createMockUpdateChain(),
});

// Additional S2004 helpers for performance testing
const createMockPersonalizedNotification = (
  coupleId: string,
  weddingId: string,
  notificationId: string = 'test-notif'
): PersonalizedNotification => ({
  notificationId,
  coupleId,
  weddingId,
  type: 'vendor_update',
  category: 'vendor',
  priority: 'medium',
  personalizationLevel: 'basic',
  emotionalTone: 'excited',
  visualTheme: {} as any,
  content: { title: 'Test', message: 'Test', personalizedElements: [] },
  sharingCapabilities: [],
  viralElements: [],
  contextualRecommendations: [],
  isRead: false,
  createdAt: new Date(),
});

// Helper for concurrent notification processing to avoid nesting
const processNotificationBatch = async (
  service: CoupleNotificationService,
  batch: Array<{ baseNotification: BaseNotification; coupleProfile: CoupleProfile; weddingContext: WeddingContext }>
): Promise<number[]> => {
  const durations: number[] = [];
  
  const promises = batch.map(async (data) => {
    const { duration } = await measureTime(async () => {
      return await service.generateAndDeliverNotification(
        data.baseNotification,
        data.coupleProfile,
        data.weddingContext,
      );
    });
    durations.push(duration);
    return duration;
  });

  await Promise.all(promises);
  return durations;
};

// Helper for stream setup to reduce nesting
const setupNotificationStreams = (
  service: CoupleNotificationService,
  testData: Array<{ coupleProfile: CoupleProfile }>
) => {
  testData.forEach((data, i) => {
    service.addNotificationStream(data.coupleProfile.coupleId, `conn-${i}`);
  });
};

// Helper for concurrent stream broadcasting
const broadcastToMultipleStreams = async (
  service: CoupleNotificationService,
  testData: Array<{ coupleProfile: CoupleProfile }>,
  baseNotification: PersonalizedNotification
): Promise<number[]> => {
  const durations: number[] = [];
  
  const promises = testData.map(async (data) => {
    const { duration } = await measureTime(async () => {
      await service.broadcastToCouple(data.coupleProfile.coupleId, {
        ...baseNotification,
        coupleId: data.coupleProfile.coupleId,
      });
    });
    durations.push(duration);
    return duration;
  });

  await Promise.all(promises);
  return durations;
};

// Helper for milestone processing to avoid nesting
const processMilestoneGeneration = async (
  service: CoupleNotificationService,
  data: { coupleProfile: CoupleProfile; weddingContext: WeddingContext },
  milestoneType: string
): Promise<number> => {
  const { duration } = await measureTime(async () => {
    return await service.createMilestoneNotification(
      milestoneType,
      data.coupleProfile,
      data.weddingContext,
    );
  });
  return duration;
};

// Helper for database operation testing
const testDatabaseOperation = async (
  service: CoupleNotificationService,
  operation: () => Promise<any>
): Promise<number> => {
  const { duration } = await measureTime(operation);
  return duration;
};

// Helper for batch processing to reduce nesting complexity
const processBatchWithTiming = async <T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<number>
): Promise<number[]> => {
  const batches = Math.ceil(items.length / batchSize);
  const allDurations: number[] = [];

  for (let i = 0; i < batches; i++) {
    const batch = items.slice(i * batchSize, (i + 1) * batchSize);
    const duration = await processor(batch);
    allDurations.push(duration);
  }

  return allDurations;
};

// Helper for throughput calculation
const calculateThroughput = (count: number, duration: number): number => {
  return count / (duration / 1000); // items per second
};

// Helper for throughput measurement for scalability testing (S2004 compliance)
const measureThroughputForCounts = async (
  service: CoupleNotificationService,
  coupleCounts: number[]
): Promise<Array<{ count: number; throughput: number }>> => {
  const results: Array<{ count: number; throughput: number }> = [];
  
  for (const count of coupleCounts) {
    const testData = createTestData(count);
    const { duration } = await measureTime(() => executeNotificationBatch(service, testData));
    
    const throughput = calculateThroughput(count, duration);
    results.push({ count, throughput });
  }
  
  return results;
};

// Helper for peak load processing (S2004 compliance)
const processPeakLoadBatches = async (
  service: CoupleNotificationService,
  peakLoad: ReturnType<typeof createTestData>,
  batchSize: number
): Promise<{ totalDuration: number; totalThroughput: number }> => {
  const startTime = performance.now();
  
  const batchProcessor = (batch: typeof peakLoad): Promise<number> => 
    measureTime(() => executeNotificationBatch(service, batch))
      .then(result => result.duration);

  await processBatchWithTiming(peakLoad, batchSize, batchProcessor);

  const totalDuration = performance.now() - startTime;
  const totalThroughput = calculateThroughput(peakLoad.length, totalDuration);
  
  return { totalDuration, totalThroughput };
};

// Core batch processor to avoid nesting in all performance tests (S2004 compliance)
const executeNotificationBatch = async (
  service: CoupleNotificationService,
  batch: ReturnType<typeof createTestData>
): Promise<void> => {
  const promises = batch.map((data) =>
    service.generateAndDeliverNotification(
      data.baseNotification,
      data.coupleProfile,
      data.weddingContext,
    ),
  );
  await Promise.all(promises);
};

// Helper for memory stability testing (S2004 compliance)
const processMemoryStabilityBatch = async (
  service: CoupleNotificationService,
  batchCount: number = 10,
  batchSize: number = 10
): Promise<void> => {
  for (let batch = 0; batch < batchCount; batch++) {
    const testData = createTestData(batchSize);
    await executeNotificationBatch(service, testData);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
};

// Helper for performance operation testing
const executePerformanceOperation = async (
  operation: { name: string; target: number; test: () => Promise<any> }
): Promise<{ name: string; duration: number; target: number; passed: boolean }> => {
  const { duration } = await measureTime(operation.test);
  const passed = duration < operation.target;
  
  return {
    name: operation.name,
    duration,
    target: operation.target,
    passed,
  };
};

describe('WS-334 Performance Benchmarks', () => {
  let notificationService: CoupleNotificationService;
  let personalizationEngine: CouplePersonalizationEngine;

  beforeAll(() => {
    // Mock Supabase for performance tests - REFACTORED FOR S2004 COMPLIANCE
    vi.mock('@/lib/supabase', () => ({
      supabase: {
        from: () => createSupabaseMockTable(),
      },
    }));

    notificationService = new CoupleNotificationService();
    personalizationEngine = new CouplePersonalizationEngine();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Personalization Performance', () => {
    it('generates AI-personalized notifications within 1 second', async () => {
      const testData = createTestData(1)[0];

      const { duration } = await measureTime(async () => {
        return await notificationService.generateAndDeliverNotification(
          testData.baseNotification,
          testData.coupleProfile,
          testData.weddingContext,
        );
      });

      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.PERSONALIZATION_SPEED);
      console.log(`✅ Personalization completed in ${duration.toFixed(2)}ms`);
    });

    it('maintains performance under concurrent load', async () => {
      const testData = createTestData(10);

      // Test concurrent personalization using helper
      const durations = await processNotificationBatch(notificationService, testData);
      const stats = calculateStats(durations);

      expect(stats.p95).toBeLessThan(
        PERFORMANCE_TARGETS.PERSONALIZATION_SPEED * 1.5,
      ); // Allow 50% increase under load
      console.log(
        `✅ Concurrent personalization P95: ${stats.p95.toFixed(2)}ms`,
      );
    });

    it('handles high-volume personalization efficiently', async () => {
      const testData = createTestData(100);
      const batchSize = 10;
      const memoryBefore = measureMemoryUsage();

      // Process batches using helper to avoid nesting
      const batchProcessor = async (batch: typeof testData): Promise<number> => {
        const { duration } = await measureTime(async () => {
          const promises = batch.map((data) =>
            notificationService.generateAndDeliverNotification(
              data.baseNotification,
              data.coupleProfile,
              data.weddingContext,
            ),
          );
          return await Promise.all(promises);
        });
        return duration;
      };

      const allDurations = await processBatchWithTiming(testData, batchSize, batchProcessor);

      const memoryAfter = measureMemoryUsage();
      const memoryIncrease = memoryAfter.used - memoryBefore.used;
      const stats = calculateStats(allDurations);

      expect(stats.avg).toBeLessThan(
        PERFORMANCE_TARGETS.PERSONALIZATION_SPEED * batchSize,
      );
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      console.log(
        `✅ High-volume processing - Avg batch: ${stats.avg.toFixed(2)}ms, Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
      );
    });
  });

  describe('Real-time Stream Performance', () => {
    it('maintains stream latency under 100ms', async () => {
      const testCouple = createTestData(1)[0];
      const connectionId = 'perf-test-conn';

      // Add stream connection
      notificationService.addNotificationStream(
        testCouple.coupleProfile.coupleId,
        connectionId,
      );

      const mockNotification = createMockPersonalizedNotification(
        testCouple.coupleProfile.coupleId,
        testCouple.weddingContext.weddingId,
        'perf-test-notif'
      );

      const { duration } = await measureTime(async () => {
        await notificationService.broadcastToCouple(
          testCouple.coupleProfile.coupleId,
          mockNotification,
        );
      });

      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.REALTIME_LATENCY);
      console.log(
        `✅ Real-time broadcast completed in ${duration.toFixed(2)}ms`,
      );
    });

    it('handles multiple concurrent streams efficiently', async () => {
      const testData = createTestData(50);

      // Set up multiple streams using helper
      setupNotificationStreams(notificationService, testData);

      const mockNotification = createMockPersonalizedNotification(
        'test-couple',
        'test-wedding',
        'concurrent-test-notif'
      );

      // Broadcast to all streams concurrently using helper
      const durations = await broadcastToMultipleStreams(
        notificationService,
        testData,
        mockNotification
      );

      const stats = calculateStats(durations);

      expect(stats.p95).toBeLessThan(PERFORMANCE_TARGETS.REALTIME_LATENCY * 2); // Allow 2x under concurrent load
      console.log(
        `✅ Concurrent stream broadcast P95: ${stats.p95.toFixed(2)}ms`,
      );
    });
  });

  describe('Viral Content Generation Performance', () => {
    it('generates shareable content within 2 seconds', async () => {
      const testData = createTestData(1)[0];

      const { duration } = await measureTime(async () => {
        // Simulate viral content generation
        const milestone = await notificationService.createMilestoneNotification(
          'venue_booked',
          testData.coupleProfile,
          testData.weddingContext,
        );
        return milestone.shareableAssets;
      });

      expect(duration).toBeLessThan(
        PERFORMANCE_TARGETS.VIRAL_CONTENT_GENERATION,
      );
      console.log(
        `✅ Viral content generation completed in ${duration.toFixed(2)}ms`,
      );
    });

    it('handles batch content generation efficiently', async () => {
      const testData = createTestData(20);
      const durations: number[] = [];

      for (const data of testData) {
        const duration = await processMilestoneGeneration(
          notificationService,
          data,
          'vendor_confirmed'
        );
        durations.push(duration);
      }

      const stats = calculateStats(durations);

      expect(stats.avg).toBeLessThan(
        PERFORMANCE_TARGETS.VIRAL_CONTENT_GENERATION,
      );
      expect(stats.p95).toBeLessThan(
        PERFORMANCE_TARGETS.VIRAL_CONTENT_GENERATION * 1.5,
      );

      console.log(
        `✅ Batch viral content generation - Avg: ${stats.avg.toFixed(2)}ms, P95: ${stats.p95.toFixed(2)}ms`,
      );
    });
  });

  describe('Database Performance', () => {
    it('maintains query performance under load', async () => {
      const testData = createTestData(50);
      const durations: number[] = [];

      // Test notification history queries using helper
      for (const data of testData.slice(0, 10)) {
        const duration = await testDatabaseOperation(
          notificationService,
          () => notificationService.getCoupleNotificationHistory(
            data.coupleProfile.coupleId,
            { limit: 50 }
          )
        );
        durations.push(duration);
      }

      const stats = calculateStats(durations);

      expect(stats.p95).toBeLessThan(50); // Database queries should be very fast with mocked data
      console.log(
        `✅ Database query performance P95: ${stats.p95.toFixed(2)}ms`,
      );
    });

    it('handles concurrent database operations efficiently', async () => {
      const testData = createTestData(20);
      const durations: number[] = [];

      const promises = testData.map(async (data) => {
        const duration = await testDatabaseOperation(
          notificationService,
          () => notificationService.trackNotificationEngagement(
            data.baseNotification.id,
            'opened',
            { timestamp: new Date() }
          )
        );
        durations.push(duration);
        return duration;
      });

      await Promise.all(promises);

      const stats = calculateStats(durations);

      expect(stats.p95).toBeLessThan(100); // Concurrent writes should complete quickly
      console.log(
        `✅ Concurrent database operations P95: ${stats.p95.toFixed(2)}ms`,
      );
    });
  });

  describe('Memory Performance', () => {
    it('maintains stable memory usage during extended operation', async () => {
      const memoryBefore = measureMemoryUsage();

      // Use helper to avoid nesting violation (S2004 compliance)
      await processMemoryStabilityBatch(notificationService, 10, 10);

      const memoryAfter = measureMemoryUsage();
      const memoryIncrease = memoryAfter.used - memoryBefore.used;

      // Memory increase should be minimal (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      console.log(
        `✅ Memory stability - Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
      );
    });

    it('cleans up notification streams properly', async () => {
      const memoryBefore = measureMemoryUsage();

      // Create and destroy many streams
      for (let i = 0; i < 1000; i++) {
        notificationService.addNotificationStream(`couple-${i}`, `conn-${i}`);
        notificationService.removeNotificationStream(
          `couple-${i}`,
          `conn-${i}`,
        );
      }

      const memoryAfter = measureMemoryUsage();
      const memoryIncrease = memoryAfter.used - memoryBefore.used;

      // Memory increase should be minimal after cleanup
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB

      console.log(
        `✅ Stream cleanup - Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
      );
    });
  });

  describe('Scalability Performance', () => {
    it('scales linearly with couple count', async () => {
      const coupleCounts = [10, 50, 100];
      
      // Use helper function to reduce nesting (S2004 compliance)
      const throughputResults = await measureThroughputForCounts(
        notificationService,
        coupleCounts
      );

      // Throughput should scale reasonably (not degrade significantly)
      const smallScaleThroughput = throughputResults[0].throughput;
      const largeScaleThroughput = throughputResults[throughputResults.length - 1].throughput;

      expect(largeScaleThroughput).toBeGreaterThan(smallScaleThroughput * 0.5); // At least 50% of small scale throughput

      const resultString = throughputResults
        .map((r) => `${r.count} couples: ${r.throughput.toFixed(2)} notifications/sec`)
        .join(', ');

      console.log('✅ Scalability results:', resultString);
    });

    it('handles peak wedding season load', async () => {
      // Simulate peak wedding season (June) with high concurrent load
      const peakLoad = createTestData(200);
      const batchSize = 20;

      // Use helper function to reduce nesting (S2004 compliance)
      const { totalDuration, totalThroughput } = await processPeakLoadBatches(
        notificationService,
        peakLoad,
        batchSize
      );

      // Should handle at least 50 notifications per second during peak load
      expect(totalThroughput).toBeGreaterThan(50);

      console.log(
        `✅ Peak season load - Processed ${peakLoad.length} notifications in ${totalDuration.toFixed(2)}ms (${totalThroughput.toFixed(2)} notifications/sec)`,
      );
    });
  });

  describe('End-to-End Performance', () => {
    it('completes full notification workflow within performance targets', async () => {
      const testData = createTestData(1)[0];

      // Full workflow: generate → personalize → deliver → track
      const workflowSteps = {
        generation: 0,
        personalization: 0,
        delivery: 0,
        tracking: 0,
      };

      // Step 1: Generate notification
      const { duration: generationDuration, result: notification } =
        await measureTime(async () => {
          return await notificationService.generateAndDeliverNotification(
            testData.baseNotification,
            testData.coupleProfile,
            testData.weddingContext,
          );
        });
      workflowSteps.generation = generationDuration;

      // Step 2: Track engagement
      const { duration: trackingDuration } = await measureTime(async () => {
        return await notificationService.trackNotificationEngagement(
          notification.notificationId,
          'opened',
          { timestamp: new Date() },
        );
      });
      workflowSteps.tracking = trackingDuration;

      const totalWorkflowTime = Object.values(workflowSteps).reduce(
        (a, b) => a + b,
        0,
      );

      // Total workflow should complete within 1.5 seconds
      expect(totalWorkflowTime).toBeLessThan(1500);

      console.log(
        `✅ Full workflow completed in ${totalWorkflowTime.toFixed(2)}ms`,
        workflowSteps,
      );
    });
  });

  describe('Performance Regression Detection', () => {
    // Helper to create baseline test operations
    const createBaselineOperations = () => {
      const testData = createTestData(1)[0];
      
      return [
        {
          name: 'Single notification generation',
          target: PERFORMANCE_TARGETS.PERSONALIZATION_SPEED,
          test: async () => {
            return await notificationService.generateAndDeliverNotification(
              testData.baseNotification,
              testData.coupleProfile,
              testData.weddingContext,
            );
          },
        },
        {
          name: 'Real-time broadcast',
          target: PERFORMANCE_TARGETS.REALTIME_LATENCY,
          test: async () => {
            const mockNotification = createMockPersonalizedNotification(
              testData.coupleProfile.coupleId,
              testData.weddingContext.weddingId,
              'baseline-test'
            );

            notificationService.addNotificationStream(
              testData.coupleProfile.coupleId,
              'baseline-conn',
            );
            await notificationService.broadcastToCouple(
              testData.coupleProfile.coupleId,
              mockNotification,
            );
          },
        },
      ];
    };

    it('maintains performance baseline for critical operations', async () => {
      const operations = createBaselineOperations();
      const results: Array<{
        name: string;
        duration: number;
        target: number;
        passed: boolean;
      }> = [];

      for (const operation of operations) {
        const result = await executePerformanceOperation(operation);
        results.push(result);
        expect(result.duration).toBeLessThan(result.target);
      }

      console.log('✅ Performance baseline results:');
      results.forEach((result) => {
        const status = result.passed ? '✅' : '❌';
        console.log(
          `  ${result.name}: ${result.duration.toFixed(2)}ms (target: ${result.target}ms) ${status}`,
        );
      });
    });
  });
});

// Export performance utilities for use in other tests
export { measureTime, measureMemoryUsage, calculateStats, PERFORMANCE_TARGETS };
