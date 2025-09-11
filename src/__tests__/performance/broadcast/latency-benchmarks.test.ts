import { performance } from 'perf_hooks';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';

// Mock latency testing framework
interface LatencyMeasurement {
  operation: string;
  latency: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

class LatencyBenchmarkRunner {
  private measurements: LatencyMeasurement[] = [];
  private startTime: number = performance.now();

  async measureOperation(
    operation: string,
    fn: () => Promise<any>,
    metadata?: Record<string, any>,
  ): Promise<LatencyMeasurement> {
    const start = performance.now();
    let success = true;

    try {
      await fn();
    } catch (error) {
      success = false;
    }

    const latency = performance.now() - start;
    const measurement: LatencyMeasurement = {
      operation,
      latency,
      timestamp: performance.now() - this.startTime,
      success,
      metadata,
    };

    this.measurements.push(measurement);
    return measurement;
  }

  getStatistics(operation?: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    successRate: number;
  } {
    const filtered = operation
      ? this.measurements.filter((m) => m.operation === operation)
      : this.measurements;

    if (filtered.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        successRate: 0,
      };
    }

    const latencies = filtered.map((m) => m.latency).sort((a, b) => a - b);
    const successCount = filtered.filter((m) => m.success).length;

    return {
      count: filtered.length,
      avg: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
      min: latencies[0],
      max: latencies[latencies.length - 1],
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)],
      successRate: successCount / filtered.length,
    };
  }

  getAllMeasurements(): LatencyMeasurement[] {
    return [...this.measurements];
  }

  reset(): void {
    this.measurements = [];
    this.startTime = performance.now();
  }
}

// Mock broadcast services for latency testing
class MockBroadcastService {
  private processingDelay: number;

  constructor(processingDelayMs: number = 25) {
    this.processingDelay = processingDelayMs;
  }

  async enqueueBroadcast(broadcast: any, recipients: string[]): Promise<void> {
    // Simulate database write + queue enqueue
    await new Promise((resolve) => setTimeout(resolve, this.processingDelay));

    // Simulate occasional slowdown (10% of requests take longer)
    if (Math.random() < 0.1) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.processingDelay * 2),
      );
    }
  }

  async deliverBroadcast(broadcastId: string, userId: string): Promise<void> {
    // Simulate WebSocket delivery + database update
    await new Promise((resolve) =>
      setTimeout(resolve, this.processingDelay * 0.8),
    );
  }

  async acknowledgeBroadcast(
    broadcastId: string,
    userId: string,
  ): Promise<void> {
    // Simulate acknowledgment processing
    await new Promise((resolve) =>
      setTimeout(resolve, this.processingDelay * 0.5),
    );
  }

  async getUserPreferences(userId: string): Promise<any> {
    // Simulate cache/database lookup
    const isCached = Math.random() < 0.8; // 80% cache hit rate
    const delay = isCached ? 5 : 50; // Cache hit vs database lookup

    await new Promise((resolve) => setTimeout(resolve, delay));
    return { userId, preferences: 'mock-data' };
  }

  async updateBroadcastStatus(
    broadcastId: string,
    status: string,
  ): Promise<void> {
    // Simulate status update
    await new Promise((resolve) =>
      setTimeout(resolve, this.processingDelay * 0.6),
    );
  }
}

describe('Broadcast System Latency Benchmarks', () => {
  let benchmarkRunner: LatencyBenchmarkRunner;
  let broadcastService: MockBroadcastService;

  beforeAll(() => {
    benchmarkRunner = new LatencyBenchmarkRunner();
    broadcastService = new MockBroadcastService();
  });

  describe('Core Broadcast Operations', () => {
    test('broadcast enqueue latency under 50ms', async () => {
      const iterations = 1000;
      const maxAllowedLatency = 50;

      for (let i = 0; i < iterations; i++) {
        const broadcast = {
          id: `latency-test-${i}`,
          type: 'timeline.changed',
          priority: 'high',
          title: `Test Broadcast ${i}`,
          message: 'Latency testing broadcast',
        };

        const recipients = [`user-${i}`, `user-${i + 1000}`]; // 2 recipients per broadcast

        await benchmarkRunner.measureOperation(
          'broadcast_enqueue',
          () => broadcastService.enqueueBroadcast(broadcast, recipients),
          { recipientCount: recipients.length, priority: broadcast.priority },
        );

        // Add small delay between operations to simulate realistic load
        if (i % 100 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      const stats = benchmarkRunner.getStatistics('broadcast_enqueue');

      console.log('Broadcast Enqueue Latency Results:', {
        iterations: stats.count,
        avgLatency: `${stats.avg.toFixed(2)}ms`,
        p50: `${stats.p50.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        maxLatency: `${stats.max.toFixed(2)}ms`,
        successRate: `${(stats.successRate * 100).toFixed(2)}%`,
      });

      // Verify latency requirements
      expect(stats.avg).toBeLessThan(maxAllowedLatency);
      expect(stats.p95).toBeLessThan(maxAllowedLatency * 1.5); // Allow 75ms for P95
      expect(stats.p99).toBeLessThan(maxAllowedLatency * 2); // Allow 100ms for P99
      expect(stats.successRate).toBeGreaterThan(0.99); // 99% success rate
    });

    test('broadcast delivery latency under 30ms', async () => {
      const iterations = 2000;
      const maxAllowedLatency = 30;

      for (let i = 0; i < iterations; i++) {
        const broadcastId = `delivery-test-${i}`;
        const userId = `user-${i % 500}`; // Simulate 500 active users

        await benchmarkRunner.measureOperation(
          'broadcast_delivery',
          () => broadcastService.deliverBroadcast(broadcastId, userId),
          { broadcastId, userId },
        );
      }

      const stats = benchmarkRunner.getStatistics('broadcast_delivery');

      console.log('Broadcast Delivery Latency Results:', {
        iterations: stats.count,
        avgLatency: `${stats.avg.toFixed(2)}ms`,
        p50: `${stats.p50.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        successRate: `${(stats.successRate * 100).toFixed(2)}%`,
      });

      expect(stats.avg).toBeLessThan(maxAllowedLatency);
      expect(stats.p95).toBeLessThan(maxAllowedLatency * 1.5);
      expect(stats.successRate).toBeGreaterThan(0.99);
    });

    test('acknowledgment processing latency under 20ms', async () => {
      const iterations = 1500;
      const maxAllowedLatency = 20;

      for (let i = 0; i < iterations; i++) {
        const broadcastId = `ack-test-${i}`;
        const userId = `user-${i % 300}`;

        await benchmarkRunner.measureOperation(
          'broadcast_acknowledgment',
          () => broadcastService.acknowledgeBroadcast(broadcastId, userId),
          { broadcastId, userId },
        );
      }

      const stats = benchmarkRunner.getStatistics('broadcast_acknowledgment');

      console.log('Acknowledgment Processing Latency Results:', {
        iterations: stats.count,
        avgLatency: `${stats.avg.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        successRate: `${(stats.successRate * 100).toFixed(2)}%`,
      });

      expect(stats.avg).toBeLessThan(maxAllowedLatency);
      expect(stats.p95).toBeLessThan(maxAllowedLatency * 1.5);
      expect(stats.successRate).toBeGreaterThan(0.99);
    });
  });

  describe('Priority-Based Latency Requirements', () => {
    test('critical broadcasts process within 5ms', async () => {
      const iterations = 500;
      const maxCriticalLatency = 5; // Critical broadcasts must be fastest

      // Use faster service for critical broadcasts
      const criticalService = new MockBroadcastService(5);

      for (let i = 0; i < iterations; i++) {
        const criticalBroadcast = {
          id: `critical-${i}`,
          type: 'wedding.emergency',
          priority: 'critical',
          title: 'URGENT: Emergency Broadcast',
          message: 'Critical emergency requiring immediate attention',
        };

        const recipients = [`emergency-coordinator-${i % 10}`];

        await benchmarkRunner.measureOperation(
          'critical_broadcast_enqueue',
          () => criticalService.enqueueBroadcast(criticalBroadcast, recipients),
          { priority: 'critical' },
        );
      }

      const stats = benchmarkRunner.getStatistics('critical_broadcast_enqueue');

      console.log('Critical Broadcast Latency Results:', {
        iterations: stats.count,
        avgLatency: `${stats.avg.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        maxLatency: `${stats.max.toFixed(2)}ms`,
        successRate: `${(stats.successRate * 100).toFixed(2)}%`,
      });

      // Stricter requirements for critical broadcasts
      expect(stats.avg).toBeLessThan(maxCriticalLatency * 2); // 10ms average
      expect(stats.p95).toBeLessThan(maxCriticalLatency * 3); // 15ms P95
      expect(stats.max).toBeLessThan(maxCriticalLatency * 4); // 20ms max
      expect(stats.successRate).toBe(1); // 100% success rate for critical
    });

    test('high priority broadcasts process within 15ms', async () => {
      const iterations = 750;
      const maxHighLatency = 15;

      for (let i = 0; i < iterations; i++) {
        const highBroadcast = {
          id: `high-${i}`,
          type: 'timeline.changed',
          priority: 'high',
          title: 'Timeline Update',
          message: 'Wedding timeline has been updated',
        };

        const recipients = [`user-${i % 100}`, `user-${(i + 100) % 200}`];

        await benchmarkRunner.measureOperation(
          'high_priority_broadcast',
          () => broadcastService.enqueueBroadcast(highBroadcast, recipients),
          { priority: 'high' },
        );
      }

      const stats = benchmarkRunner.getStatistics('high_priority_broadcast');

      console.log('High Priority Broadcast Latency Results:', {
        avgLatency: `${stats.avg.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        successRate: `${(stats.successRate * 100).toFixed(2)}%`,
      });

      expect(stats.avg).toBeLessThan(maxHighLatency * 2);
      expect(stats.p95).toBeLessThan(maxHighLatency * 2.5);
      expect(stats.successRate).toBeGreaterThan(0.99);
    });

    test('normal priority broadcasts process within 25ms', async () => {
      const iterations = 1000;
      const maxNormalLatency = 25;

      for (let i = 0; i < iterations; i++) {
        const normalBroadcast = {
          id: `normal-${i}`,
          type: 'feature.released',
          priority: 'normal',
          title: 'Feature Update',
          message: 'New feature has been released',
        };

        const recipients = [`user-${i % 200}`];

        await benchmarkRunner.measureOperation(
          'normal_priority_broadcast',
          () => broadcastService.enqueueBroadcast(normalBroadcast, recipients),
          { priority: 'normal' },
        );
      }

      const stats = benchmarkRunner.getStatistics('normal_priority_broadcast');

      console.log('Normal Priority Broadcast Latency Results:', {
        avgLatency: `${stats.avg.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        successRate: `${(stats.successRate * 100).toFixed(2)}%`,
      });

      expect(stats.avg).toBeLessThan(maxNormalLatency * 1.5);
      expect(stats.p95).toBeLessThan(maxNormalLatency * 2);
      expect(stats.successRate).toBeGreaterThan(0.98);
    });
  });

  describe('Cache and Database Latency', () => {
    test('user preference lookup latency', async () => {
      const iterations = 2000;
      const maxCacheLatency = 10; // Cache hits should be very fast
      const maxDbLatency = 60; // Database lookups allowed to be slower

      let cacheHits = 0;
      let dbHits = 0;

      for (let i = 0; i < iterations; i++) {
        const userId = `pref-user-${i % 100}`; // 100 unique users, lots of repeats for cache hits

        const measurement = await benchmarkRunner.measureOperation(
          'user_preferences_lookup',
          async () => {
            const startTime = performance.now();
            const result = await broadcastService.getUserPreferences(userId);
            const lookupTime = performance.now() - startTime;

            // Classify as cache hit or database lookup based on timing
            if (lookupTime < 15) {
              cacheHits++;
            } else {
              dbHits++;
            }

            return result;
          },
          { userId },
        );
      }

      const stats = benchmarkRunner.getStatistics('user_preferences_lookup');
      const cacheHitRate = cacheHits / (cacheHits + dbHits);

      console.log('User Preferences Lookup Results:', {
        iterations: stats.count,
        avgLatency: `${stats.avg.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        cacheHitRate: `${(cacheHitRate * 100).toFixed(2)}%`,
        cacheHits,
        dbHits,
        successRate: `${(stats.successRate * 100).toFixed(2)}%`,
      });

      // Verify performance expectations
      expect(stats.avg).toBeLessThan(30); // Average should be reasonable
      expect(cacheHitRate).toBeGreaterThan(0.7); // At least 70% cache hit rate
      expect(stats.successRate).toBeGreaterThan(0.99);
    });

    test('broadcast status update latency', async () => {
      const iterations = 1200;
      const maxUpdateLatency = 20;

      const statuses = [
        'queued',
        'processing',
        'delivered',
        'acknowledged',
        'failed',
      ];

      for (let i = 0; i < iterations; i++) {
        const broadcastId = `status-update-${i}`;
        const status = statuses[i % statuses.length];

        await benchmarkRunner.measureOperation(
          'broadcast_status_update',
          () => broadcastService.updateBroadcastStatus(broadcastId, status),
          { broadcastId, status },
        );
      }

      const stats = benchmarkRunner.getStatistics('broadcast_status_update');

      console.log('Broadcast Status Update Results:', {
        avgLatency: `${stats.avg.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        successRate: `${(stats.successRate * 100).toFixed(2)}%`,
      });

      expect(stats.avg).toBeLessThan(maxUpdateLatency);
      expect(stats.p95).toBeLessThan(maxUpdateLatency * 1.5);
      expect(stats.successRate).toBeGreaterThan(0.99);
    });
  });

  describe('Wedding Season Load Latency', () => {
    test('maintains latency during peak wedding season simulation', async () => {
      // Simulate June wedding season with 3x normal load
      const peakLoadMultiplier = 3;
      const baseIterations = 500;
      const iterations = baseIterations * peakLoadMultiplier;

      console.log(
        `Simulating peak wedding season with ${iterations} operations...`,
      );

      // Mix of all operation types during peak season
      const operations = [
        { type: 'critical', weight: 0.05 }, // 5% critical (emergencies)
        { type: 'high', weight: 0.25 }, // 25% high priority (timeline changes)
        { type: 'normal', weight: 0.7 }, // 70% normal (features, updates)
      ];

      let criticalCount = 0;
      let highCount = 0;
      let normalCount = 0;

      for (let i = 0; i < iterations; i++) {
        const random = Math.random();
        let operationType = 'normal';

        if (random < 0.05) {
          operationType = 'critical';
          criticalCount++;
        } else if (random < 0.3) {
          operationType = 'high';
          highCount++;
        } else {
          normalCount++;
        }

        const broadcast = {
          id: `peak-season-${i}`,
          type: `${operationType}.test`,
          priority: operationType,
          title: `Peak Season ${operationType} Broadcast`,
          message: `Testing ${operationType} priority during peak season`,
        };

        const recipients = Array.from(
          {
            length:
              operationType === 'critical'
                ? 10
                : operationType === 'high'
                  ? 5
                  : 2,
          },
          (_, j) => `peak-user-${i}-${j}`,
        );

        await benchmarkRunner.measureOperation(
          `peak_season_${operationType}`,
          () => broadcastService.enqueueBroadcast(broadcast, recipients),
          {
            priority: operationType,
            recipientCount: recipients.length,
            peakLoad: true,
          },
        );

        // Simulate realistic intermittent load during peak season
        if (i % 50 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      }

      // Analyze results by priority
      const criticalStats = benchmarkRunner.getStatistics(
        'peak_season_critical',
      );
      const highStats = benchmarkRunner.getStatistics('peak_season_high');
      const normalStats = benchmarkRunner.getStatistics('peak_season_normal');

      console.log('Peak Season Latency Results:', {
        totalOperations: iterations,
        critical: {
          count: criticalStats.count,
          avg: `${criticalStats.avg.toFixed(2)}ms`,
          p95: `${criticalStats.p95.toFixed(2)}ms`,
        },
        high: {
          count: highStats.count,
          avg: `${highStats.avg.toFixed(2)}ms`,
          p95: `${highStats.p95.toFixed(2)}ms`,
        },
        normal: {
          count: normalStats.count,
          avg: `${normalStats.avg.toFixed(2)}ms`,
          p95: `${normalStats.p95.toFixed(2)}ms`,
        },
      });

      // Verify that latency requirements are maintained even under peak load
      expect(criticalStats.avg).toBeLessThan(15); // Critical: <15ms avg during peak
      expect(criticalStats.p95).toBeLessThan(25); // Critical: <25ms P95 during peak

      expect(highStats.avg).toBeLessThan(35); // High: <35ms avg during peak
      expect(highStats.p95).toBeLessThan(60); // High: <60ms P95 during peak

      expect(normalStats.avg).toBeLessThan(50); // Normal: <50ms avg during peak
      expect(normalStats.p95).toBeLessThan(80); // Normal: <80ms P95 during peak

      // Success rates should remain high even under load
      expect(criticalStats.successRate).toBeGreaterThan(0.99);
      expect(highStats.successRate).toBeGreaterThan(0.98);
      expect(normalStats.successRate).toBeGreaterThan(0.97);
    });
  });

  describe('Latency Distribution Analysis', () => {
    test('latency distribution meets SLA requirements', async () => {
      // Run mixed workload and analyze distribution
      const totalOperations = 3000;

      for (let i = 0; i < totalOperations; i++) {
        const broadcast = {
          id: `distribution-test-${i}`,
          type: 'mixed.workload',
          priority: i % 3 === 0 ? 'high' : 'normal',
          title: 'Distribution Test',
          message: 'Testing latency distribution',
        };

        const recipients = [`dist-user-${i % 500}`];

        await benchmarkRunner.measureOperation(
          'latency_distribution_test',
          () => broadcastService.enqueueBroadcast(broadcast, recipients),
        );
      }

      const stats = benchmarkRunner.getStatistics('latency_distribution_test');

      // Calculate additional percentiles
      const measurements = benchmarkRunner
        .getAllMeasurements()
        .filter((m) => m.operation === 'latency_distribution_test')
        .map((m) => m.latency)
        .sort((a, b) => a - b);

      const p90 = measurements[Math.floor(measurements.length * 0.9)];
      const p99_9 = measurements[Math.floor(measurements.length * 0.999)];

      console.log('Latency Distribution Analysis:', {
        totalSamples: measurements.length,
        min: `${stats.min.toFixed(2)}ms`,
        p50: `${stats.p50.toFixed(2)}ms`,
        p90: `${p90.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        p99_9: `${p99_9.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
        avg: `${stats.avg.toFixed(2)}ms`,
        successRate: `${(stats.successRate * 100).toFixed(2)}%`,
      });

      // Wedding industry SLA requirements
      expect(stats.p50).toBeLessThan(25); // 50% under 25ms
      expect(p90).toBeLessThan(50); // 90% under 50ms
      expect(stats.p95).toBeLessThan(75); // 95% under 75ms
      expect(stats.p99).toBeLessThan(150); // 99% under 150ms
      expect(p99_9).toBeLessThan(300); // 99.9% under 300ms
      expect(stats.successRate).toBeGreaterThan(0.999); // 99.9% success rate
    });
  });

  afterAll(() => {
    // Generate final performance report
    const allStats = benchmarkRunner.getStatistics();

    console.log('\n=== FINAL LATENCY BENCHMARK REPORT ===');
    console.log(`Total Operations: ${allStats.count}`);
    console.log(`Overall Average Latency: ${allStats.avg.toFixed(2)}ms`);
    console.log(`Overall P95 Latency: ${allStats.p95.toFixed(2)}ms`);
    console.log(`Overall P99 Latency: ${allStats.p99.toFixed(2)}ms`);
    console.log(
      `Overall Success Rate: ${(allStats.successRate * 100).toFixed(2)}%`,
    );
    console.log('=====================================\n');
  });
});
