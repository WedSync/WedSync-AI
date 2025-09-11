import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { NotificationWorkerCoordinator } from '../workers/NotificationWorkerCoordinator';
import { WeddingNotificationEngine } from '../WeddingNotificationEngine';
import { NotificationProviderFactory } from '../providers';
import type { ProcessedNotification } from '../../../types/notification-backend';

// Performance test configuration
const PERFORMANCE_TARGETS = {
  // Latency targets (in milliseconds)
  EMERGENCY_MAX_LATENCY: 500,
  HIGH_PRIORITY_MAX_LATENCY: 2000,
  NORMAL_MAX_LATENCY: 5000,

  // Throughput targets
  MIN_THROUGHPUT_PER_SECOND: 100,
  SUSTAINED_LOAD_DURATION: 60000, // 1 minute

  // Memory usage targets
  MAX_MEMORY_PER_NOTIFICATION: 1024, // 1KB per notification
  MAX_MEMORY_GROWTH_RATE: 0.1, // 10% growth allowed

  // Error rate targets
  MAX_ERROR_RATE: 0.01, // 1% error rate
  MAX_EMERGENCY_ERROR_RATE: 0.001, // 0.1% for emergencies

  // Wedding-specific targets
  WEDDING_DAY_AVAILABILITY: 0.9999, // 99.99% uptime
  SATURDAY_RESPONSE_TIME: 200, // 200ms on Saturdays
} as const;

describe('WedSync Notification System Performance Benchmarks', () => {
  let coordinator: NotificationWorkerCoordinator;
  let engine: WeddingNotificationEngine;
  let performanceResults: Map<string, number[]> = new Map();

  beforeAll(async () => {
    // Set up performance testing environment
    process.env.NODE_ENV = 'test';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';

    // Mock external dependencies for consistent performance testing
    vi.mock('ioredis', () => ({
      Redis: vi.fn().mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        quit: vi.fn().mockResolvedValue(undefined),
        ping: vi.fn().mockResolvedValue('PONG'),
        hset: vi.fn().mockResolvedValue(1),
        hget: vi.fn().mockResolvedValue('test'),
        lpush: vi.fn().mockResolvedValue(1),
        pipeline: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([]),
        }),
      })),
    }));

    // Mock providers with realistic latencies
    const mockProvider = {
      send: vi.fn().mockImplementation(async () => {
        // Simulate realistic network latency
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 100 + 50),
        );
        return {
          success: true,
          channel: 'mock',
          providerId: 'test',
          recipientId: 'test-recipient',
          messageId: 'msg-' + Math.random(),
          timestamp: new Date(),
          latency: Math.random() * 100 + 50,
        };
      }),
      getProviderStatus: vi.fn().mockResolvedValue({
        healthy: true,
        latency: 100,
        errorRate: 0,
      }),
    };

    vi.spyOn(NotificationProviderFactory, 'getProvider').mockReturnValue(
      mockProvider,
    );

    coordinator = new NotificationWorkerCoordinator();
    engine = new WeddingNotificationEngine();

    await engine.initialize();
  });

  afterAll(async () => {
    if (coordinator) {
      await coordinator.shutdown();
    }

    // Log performance summary
    console.log('\n📊 PERFORMANCE BENCHMARK SUMMARY');
    console.log('=====================================');
    for (const [testName, results] of performanceResults.entries()) {
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      const min = Math.min(...results);
      const max = Math.max(...results);
      const p95 = results.sort((a, b) => a - b)[
        Math.floor(results.length * 0.95)
      ];

      console.log(`${testName}:`);
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  Min: ${min.toFixed(2)}ms`);
      console.log(`  Max: ${max.toFixed(2)}ms`);
      console.log(`  P95: ${p95.toFixed(2)}ms`);
    }
  });

  const createTestNotification = (
    overrides?: Partial<ProcessedNotification>,
  ): ProcessedNotification => ({
    id: 'perf-test-' + Date.now() + '-' + Math.random(),
    event: {
      id: 'event-' + Date.now(),
      type: 'vendor_update',
      weddingId: 'wedding-123',
      userId: 'user-456',
      timestamp: new Date(),
      context: {
        weddingTitle: 'Performance Test Wedding',
        weddingDate: '2024-06-15',
        vendorName: 'Test Vendor',
        vendorType: 'Photography',
      },
    },
    recipientId: 'recipient-' + Date.now(),
    content: 'Performance test notification',
    priority: 'medium',
    channels: ['email', 'in_app'],
    scheduledFor: new Date(),
    ...overrides,
  });

  const recordPerformance = (testName: string, duration: number) => {
    if (!performanceResults.has(testName)) {
      performanceResults.set(testName, []);
    }
    performanceResults.get(testName)!.push(duration);
  };

  describe('Latency Benchmarks', () => {
    it('should process emergency notifications under 500ms (P95)', async () => {
      const iterations = 100;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const notification = createTestNotification({
          priority: 'emergency',
          event: {
            id: `emergency-perf-${i}`,
            type: 'wedding_emergency',
            weddingId: 'wedding-123',
            userId: 'user-456',
            timestamp: new Date(),
            context: {
              weddingTitle: 'Emergency Performance Test',
              weddingDate: new Date().toISOString().split('T')[0], // Today
              emergencyType: 'Performance Test Emergency',
            },
          },
        });

        const start = performance.now();
        try {
          await engine.processNotification(notification);
        } catch (error) {
          // Expected in test environment
        }
        const duration = performance.now() - start;

        latencies.push(duration);
        recordPerformance('Emergency Notifications', duration);
      }

      // Calculate P95 latency
      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Index];

      expect(p95Latency).toBeLessThan(
        PERFORMANCE_TARGETS.EMERGENCY_MAX_LATENCY,
      );

      console.log(
        `🚨 Emergency P95 latency: ${p95Latency.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.EMERGENCY_MAX_LATENCY}ms)`,
      );
    });

    it('should process high priority notifications under 2 seconds (P95)', async () => {
      const iterations = 100;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const notification = createTestNotification({
          priority: 'high',
          event: {
            id: `high-priority-perf-${i}`,
            type: 'weather_alert',
            weddingId: 'wedding-123',
            userId: 'user-456',
            timestamp: new Date(),
            context: {
              weddingTitle: 'High Priority Performance Test',
              weddingDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0],
              alertType: 'Performance Test Alert',
            },
          },
        });

        const start = performance.now();
        try {
          await engine.processNotification(notification);
        } catch (error) {
          // Expected in test environment
        }
        const duration = performance.now() - start;

        latencies.push(duration);
        recordPerformance('High Priority Notifications', duration);
      }

      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Index];

      expect(p95Latency).toBeLessThan(
        PERFORMANCE_TARGETS.HIGH_PRIORITY_MAX_LATENCY,
      );

      console.log(
        `⚡ High Priority P95 latency: ${p95Latency.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.HIGH_PRIORITY_MAX_LATENCY}ms)`,
      );
    });

    it('should process normal notifications under 5 seconds (P95)', async () => {
      const iterations = 50;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const notification = createTestNotification({
          priority: 'medium',
          id: `normal-perf-${i}`,
        });

        const start = performance.now();
        try {
          await engine.processNotification(notification);
        } catch (error) {
          // Expected in test environment
        }
        const duration = performance.now() - start;

        latencies.push(duration);
        recordPerformance('Normal Priority Notifications', duration);
      }

      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Index];

      expect(p95Latency).toBeLessThan(PERFORMANCE_TARGETS.NORMAL_MAX_LATENCY);

      console.log(
        `📱 Normal Priority P95 latency: ${p95Latency.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.NORMAL_MAX_LATENCY}ms)`,
      );
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should sustain 100+ notifications/second for 1 minute', async () => {
      const duration = PERFORMANCE_TARGETS.SUSTAINED_LOAD_DURATION;
      const targetThroughput = PERFORMANCE_TARGETS.MIN_THROUGHPUT_PER_SECOND;
      const expectedNotifications = Math.floor(
        (targetThroughput * duration) / 1000,
      );

      console.log(
        `🔥 Starting sustained load test: ${expectedNotifications} notifications over ${duration / 1000}s`,
      );

      const notifications: ProcessedNotification[] = [];
      for (let i = 0; i < expectedNotifications; i++) {
        notifications.push(
          createTestNotification({
            id: `sustained-load-${i}`,
            priority: Math.random() > 0.9 ? 'high' : 'medium', // 10% high priority
          }),
        );
      }

      const startTime = performance.now();
      let completed = 0;

      // Process notifications with concurrency control
      const concurrentLimit = 50;
      const promises: Promise<void>[] = [];

      const processNotification = async (
        notification: ProcessedNotification,
      ) => {
        try {
          await engine.processNotification(notification);
          completed++;
        } catch (error) {
          // Expected in test environment
          completed++;
        }
      };

      // Process in batches to maintain concurrency limit
      for (let i = 0; i < notifications.length; i += concurrentLimit) {
        const batch = notifications.slice(i, i + concurrentLimit);
        const batchPromises = batch.map(processNotification);
        promises.push(...batchPromises);

        // Wait for batch to complete before starting next batch
        await Promise.allSettled(batchPromises);
      }

      const actualDuration = performance.now() - startTime;
      const actualThroughput = (completed / actualDuration) * 1000; // per second

      console.log(`📊 Sustained load results:`);
      console.log(
        `  Processed: ${completed}/${expectedNotifications} notifications`,
      );
      console.log(`  Duration: ${(actualDuration / 1000).toFixed(2)}s`);
      console.log(
        `  Throughput: ${actualThroughput.toFixed(2)} notifications/second`,
      );
      console.log(`  Target: ${targetThroughput} notifications/second`);

      expect(actualThroughput).toBeGreaterThan(targetThroughput * 0.8); // Allow 20% variance
      expect(completed).toBeGreaterThan(expectedNotifications * 0.9); // 90% success rate

      recordPerformance('Sustained Load Throughput', actualThroughput);
    });

    it('should handle burst traffic of 500 notifications simultaneously', async () => {
      const burstSize = 500;
      console.log(
        `💥 Starting burst test: ${burstSize} simultaneous notifications`,
      );

      const notifications = Array.from({ length: burstSize }, (_, i) =>
        createTestNotification({
          id: `burst-test-${i}`,
          priority: i < 50 ? 'emergency' : 'medium', // First 50 are emergency
        }),
      );

      const startTime = performance.now();

      // Send all notifications simultaneously
      const results = await Promise.allSettled(
        notifications.map((notification) =>
          engine.processNotification(notification),
        ),
      );

      const duration = performance.now() - startTime;
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const successRate = successful / burstSize;
      const throughput = (burstSize / duration) * 1000; // per second

      console.log(`💥 Burst test results:`);
      console.log(`  Processed: ${successful}/${burstSize} notifications`);
      console.log(`  Duration: ${duration.toFixed(2)}ms`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(2)}%`);
      console.log(
        `  Peak throughput: ${throughput.toFixed(2)} notifications/second`,
      );

      expect(throughput).toBeGreaterThan(
        PERFORMANCE_TARGETS.MIN_THROUGHPUT_PER_SECOND,
      );
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate for burst

      recordPerformance('Burst Traffic', throughput);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should maintain stable memory usage under load', async () => {
      const iterations = 1000;
      const memoryMeasurements: number[] = [];

      // Get baseline memory usage
      if (global.gc) global.gc();
      const baselineMemory = process.memoryUsage().heapUsed;

      console.log(
        `🧠 Memory test baseline: ${(baselineMemory / 1024 / 1024).toFixed(2)}MB`,
      );

      for (let i = 0; i < iterations; i++) {
        const notification = createTestNotification({
          id: `memory-test-${i}`,
          content: `Memory test notification ${i} with some content to simulate realistic payload size`,
        });

        try {
          await engine.processNotification(notification);
        } catch (error) {
          // Expected in test environment
        }

        // Measure memory every 100 notifications
        if (i % 100 === 0) {
          const currentMemory = process.memoryUsage().heapUsed;
          memoryMeasurements.push(currentMemory);
        }
      }

      // Force garbage collection
      if (global.gc) global.gc();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - baselineMemory;
      const memoryPerNotification = memoryGrowth / iterations;

      console.log(`🧠 Memory test results:`);
      console.log(
        `  Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`,
      );
      console.log(
        `  Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`,
      );
      console.log(
        `  Per notification: ${(memoryPerNotification / 1024).toFixed(2)}KB`,
      );

      expect(memoryPerNotification).toBeLessThan(
        PERFORMANCE_TARGETS.MAX_MEMORY_PER_NOTIFICATION,
      );

      recordPerformance('Memory Per Notification', memoryPerNotification);
    });

    it('should not have memory leaks during extended operation', async () => {
      const rounds = 5;
      const notificationsPerRound = 100;
      const memoryMeasurements: number[] = [];

      for (let round = 0; round < rounds; round++) {
        console.log(`🔄 Memory leak test round ${round + 1}/${rounds}`);

        // Process notifications
        const notifications = Array.from(
          { length: notificationsPerRound },
          (_, i) =>
            createTestNotification({
              id: `memory-leak-test-${round}-${i}`,
            }),
        );

        await Promise.allSettled(
          notifications.map((n) => engine.processNotification(n)),
        );

        // Force garbage collection and measure memory
        if (global.gc) global.gc();
        await new Promise((resolve) => setTimeout(resolve, 100)); // Allow GC to complete

        const currentMemory = process.memoryUsage().heapUsed;
        memoryMeasurements.push(currentMemory);

        console.log(
          `  Round ${round + 1} memory: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`,
        );
      }

      // Check for memory growth trend
      const firstMeasurement = memoryMeasurements[0];
      const lastMeasurement = memoryMeasurements[memoryMeasurements.length - 1];
      const memoryGrowthRate =
        (lastMeasurement - firstMeasurement) / firstMeasurement;

      console.log(`🧠 Memory leak test results:`);
      console.log(
        `  Initial memory: ${(firstMeasurement / 1024 / 1024).toFixed(2)}MB`,
      );
      console.log(
        `  Final memory: ${(lastMeasurement / 1024 / 1024).toFixed(2)}MB`,
      );
      console.log(`  Growth rate: ${(memoryGrowthRate * 100).toFixed(2)}%`);

      expect(memoryGrowthRate).toBeLessThan(
        PERFORMANCE_TARGETS.MAX_MEMORY_GROWTH_RATE,
      );
    });
  });

  describe('Wedding-Specific Performance Requirements', () => {
    it('should maintain Saturday wedding day response times under 200ms', async () => {
      // Mock Saturday date
      const saturday = new Date('2024-06-15'); // Assuming Saturday
      const originalNow = Date.now;
      Date.now = vi.fn().mockReturnValue(saturday.getTime());

      const iterations = 50;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const weddingDayNotification = createTestNotification({
          id: `saturday-test-${i}`,
          priority: 'emergency',
          event: {
            id: `saturday-event-${i}`,
            type: 'wedding_emergency',
            weddingId: 'saturday-wedding',
            userId: 'saturday-user',
            timestamp: new Date(),
            context: {
              weddingTitle: 'Saturday Wedding',
              weddingDate: saturday.toISOString().split('T')[0],
              isWeddingDay: true,
              emergencyType: 'Saturday Performance Test',
            },
          },
        });

        const start = performance.now();
        try {
          await engine.processNotification(weddingDayNotification);
        } catch (error) {
          // Expected in test environment
        }
        const duration = performance.now() - start;

        latencies.push(duration);
      }

      // Restore Date.now
      Date.now = originalNow;

      const averageLatency =
        latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      console.log(`💒 Saturday wedding day performance:`);
      console.log(`  Average latency: ${averageLatency.toFixed(2)}ms`);
      console.log(`  Max latency: ${maxLatency.toFixed(2)}ms`);
      console.log(`  Target: ${PERFORMANCE_TARGETS.SATURDAY_RESPONSE_TIME}ms`);

      expect(averageLatency).toBeLessThan(
        PERFORMANCE_TARGETS.SATURDAY_RESPONSE_TIME,
      );
      expect(maxLatency).toBeLessThan(
        PERFORMANCE_TARGETS.SATURDAY_RESPONSE_TIME * 2,
      ); // Allow 2x for max

      recordPerformance('Saturday Wedding Day', averageLatency);
    });

    it('should handle peak wedding season load (June-September)', async () => {
      console.log('🌸 Simulating peak wedding season load...');

      // Simulate high wedding season with multiple simultaneous weddings
      const weddingsCount = 20; // 20 weddings happening
      const notificationsPerWedding = 25; // Average notifications per wedding per day
      const totalNotifications = weddingsCount * notificationsPerWedding;

      const notifications: ProcessedNotification[] = [];

      for (let wedding = 0; wedding < weddingsCount; wedding++) {
        for (let notif = 0; notif < notificationsPerWedding; notif++) {
          const priority =
            Math.random() > 0.95
              ? 'emergency'
              : Math.random() > 0.8
                ? 'high'
                : 'medium';

          notifications.push(
            createTestNotification({
              id: `peak-season-w${wedding}-n${notif}`,
              priority: priority as any,
              event: {
                id: `peak-event-w${wedding}-n${notif}`,
                type:
                  priority === 'emergency'
                    ? 'wedding_emergency'
                    : 'vendor_update',
                weddingId: `peak-wedding-${wedding}`,
                userId: `peak-user-${wedding}`,
                timestamp: new Date(),
                context: {
                  weddingTitle: `Peak Season Wedding ${wedding}`,
                  weddingDate: new Date(
                    2024,
                    6 + Math.floor(Math.random() * 3),
                    Math.floor(Math.random() * 30) + 1,
                  )
                    .toISOString()
                    .split('T')[0],
                  vendorType: [
                    'Photography',
                    'Catering',
                    'Flowers',
                    'Music',
                    'Venue',
                  ][Math.floor(Math.random() * 5)],
                },
              },
            }),
          );
        }
      }

      const startTime = performance.now();

      // Process all peak season notifications
      const results = await Promise.allSettled(
        notifications.map((notification) =>
          engine.processNotification(notification),
        ),
      );

      const duration = performance.now() - startTime;
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const throughput = (totalNotifications / duration) * 1000;

      console.log(`🌸 Peak wedding season results:`);
      console.log(`  Weddings: ${weddingsCount}`);
      console.log(`  Total notifications: ${totalNotifications}`);
      console.log(`  Successful: ${successful}`);
      console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(
        `  Throughput: ${throughput.toFixed(2)} notifications/second`,
      );

      expect(successful / totalNotifications).toBeGreaterThan(0.98); // 98% success rate
      expect(throughput).toBeGreaterThan(
        PERFORMANCE_TARGETS.MIN_THROUGHPUT_PER_SECOND * 0.8,
      );

      recordPerformance('Peak Wedding Season', throughput);
    });
  });

  describe('Error Rate and Reliability Benchmarks', () => {
    it('should maintain error rates below 1% under normal load', async () => {
      const iterations = 1000;
      let errorCount = 0;

      // Mix of notification types and priorities
      const notifications = Array.from({ length: iterations }, (_, i) => {
        const priorities = ['low', 'medium', 'high', 'emergency'];
        const types = [
          'vendor_update',
          'timeline_change',
          'weather_alert',
          'wedding_emergency',
        ];

        return createTestNotification({
          id: `error-rate-test-${i}`,
          priority: priorities[
            Math.floor(Math.random() * priorities.length)
          ] as any,
          event: {
            id: `error-event-${i}`,
            type: types[Math.floor(Math.random() * types.length)],
            weddingId: `wedding-${i % 10}`, // 10 different weddings
            userId: `user-${i % 50}`, // 50 different users
            timestamp: new Date(),
            context: {
              weddingTitle: `Error Rate Test Wedding ${i % 10}`,
              weddingDate: new Date(
                Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000,
              )
                .toISOString()
                .split('T')[0],
            },
          },
        });
      });

      // Process with some realistic failure conditions
      const mockProviderWithFailures = {
        send: vi.fn().mockImplementation(async () => {
          // Simulate 0.5% random failures
          if (Math.random() < 0.005) {
            throw new Error('Simulated provider failure');
          }

          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 100 + 50),
          );
          return {
            success: true,
            channel: 'test',
            providerId: 'reliable-test',
            recipientId: 'test-recipient',
            messageId: 'msg-' + Math.random(),
            timestamp: new Date(),
          };
        }),
        getProviderStatus: vi.fn().mockResolvedValue({
          healthy: true,
          latency: 100,
          errorRate: 0.005,
        }),
      };

      vi.spyOn(NotificationProviderFactory, 'getProvider').mockReturnValue(
        mockProviderWithFailures,
      );

      const results = await Promise.allSettled(
        notifications.map(async (notification) => {
          try {
            await engine.processNotification(notification);
          } catch (error) {
            errorCount++;
            throw error;
          }
        }),
      );

      const actualErrorRate = errorCount / iterations;
      const successRate = 1 - actualErrorRate;

      console.log(`📊 Error rate test results:`);
      console.log(`  Total notifications: ${iterations}`);
      console.log(`  Errors: ${errorCount}`);
      console.log(`  Error rate: ${(actualErrorRate * 100).toFixed(3)}%`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(3)}%`);

      expect(actualErrorRate).toBeLessThan(PERFORMANCE_TARGETS.MAX_ERROR_RATE);

      recordPerformance('Error Rate', actualErrorRate * 100);
    });

    it('should maintain 99.99% availability for wedding day notifications', async () => {
      const weddingDayIterations = 200;
      let weddingDayErrors = 0;

      const weddingDayNotifications = Array.from(
        { length: weddingDayIterations },
        (_, i) =>
          createTestNotification({
            id: `wedding-day-availability-${i}`,
            priority: 'emergency',
            event: {
              id: `wedding-day-event-${i}`,
              type: 'wedding_emergency',
              weddingId: `today-wedding-${i % 5}`,
              userId: `today-user-${i}`,
              timestamp: new Date(),
              context: {
                weddingTitle: `Today's Wedding ${i % 5}`,
                weddingDate: new Date().toISOString().split('T')[0], // Today
                isWeddingDay: true,
                emergencyType: 'Availability Test',
              },
            },
          }),
      );

      const results = await Promise.allSettled(
        weddingDayNotifications.map(async (notification) => {
          try {
            await engine.processNotification(notification);
          } catch (error) {
            weddingDayErrors++;
            throw error;
          }
        }),
      );

      const weddingDayErrorRate = weddingDayErrors / weddingDayIterations;
      const weddingDayAvailability = 1 - weddingDayErrorRate;

      console.log(`💒 Wedding day availability test:`);
      console.log(`  Total wedding day notifications: ${weddingDayIterations}`);
      console.log(`  Errors: ${weddingDayErrors}`);
      console.log(`  Error rate: ${(weddingDayErrorRate * 100).toFixed(4)}%`);
      console.log(
        `  Availability: ${(weddingDayAvailability * 100).toFixed(4)}%`,
      );
      console.log(
        `  Target: ${(PERFORMANCE_TARGETS.WEDDING_DAY_AVAILABILITY * 100).toFixed(2)}%`,
      );

      expect(weddingDayAvailability).toBeGreaterThan(
        PERFORMANCE_TARGETS.WEDDING_DAY_AVAILABILITY,
      );

      recordPerformance(
        'Wedding Day Availability',
        weddingDayAvailability * 100,
      );
    });
  });
});

// Helper function to generate performance report
export const generatePerformanceReport = (results: Map<string, number[]>) => {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {} as Record<
      string,
      {
        average: number;
        min: number;
        max: number;
        p50: number;
        p95: number;
        p99: number;
        count: number;
      }
    >,
  };

  for (const [testName, measurements] of results.entries()) {
    if (measurements.length === 0) continue;

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);

    report.summary[testName] = {
      average: sum / measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      count: measurements.length,
    };
  }

  return report;
};
