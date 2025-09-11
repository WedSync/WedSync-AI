import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { performance } from 'perf_hooks';

// Mock dependencies for performance testing
const mockRedis = {
  hget: vi.fn(() => Promise.resolve('100')),
  hset: vi.fn(() => Promise.resolve('OK')),
  publish: vi.fn(() => Promise.resolve(1)),
  zadd: vi.fn(() => Promise.resolve(1)),
  zrange: vi.fn(() => Promise.resolve([])),
};

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: { id: 'test', organization_id: 'org-1' },
          error: null,
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: { id: 'new-id' },
          error: null,
        })),
      })),
    })),
  })),
  rpc: vi.fn(() => Promise.resolve({ data: 5, error: null })),
};

vi.mock('@/lib/redis', () => ({ redis: mockRedis }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}));

import { ChannelManager } from '@/lib/websocket/channel-manager';
import { MessageQueue } from '@/lib/websocket/message-queue';
import { PresenceManager } from '@/lib/websocket/presence-manager';

interface PerformanceMetrics {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  p99Time: number;
  throughputOps: number;
}

interface WeddingLoadTest {
  concurrent_connections: number;
  messages_per_second: number;
  wedding_count: number;
  duration_seconds: number;
}

class PerformanceBenchmark {
  private metrics: PerformanceMetrics[] = [];

  async measureOperation<T>(
    operation: string,
    iterations: number,
    fn: () => Promise<T>
  ): Promise<PerformanceMetrics> {
    const times: number[] = [];
    const startTotal = performance.now();

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const endTotal = performance.now();
    const totalTime = endTotal - startTotal;

    times.sort((a, b) => a - b);
    
    const metrics: PerformanceMetrics = {
      operation,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      minTime: times[0],
      maxTime: times[times.length - 1],
      p95Time: times[Math.floor(times.length * 0.95)],
      p99Time: times[Math.floor(times.length * 0.99)],
      throughputOps: (iterations * 1000) / totalTime,
    };

    this.metrics.push(metrics);
    return metrics;
  }

  async measureConcurrentOperations<T>(
    operation: string,
    concurrency: number,
    fn: () => Promise<T>
  ): Promise<PerformanceMetrics> {
    const promises = Array(concurrency).fill(0).map(() => fn());
    const start = performance.now();
    
    await Promise.all(promises);
    
    const end = performance.now();
    const totalTime = end - start;

    const metrics: PerformanceMetrics = {
      operation,
      iterations: concurrency,
      totalTime,
      averageTime: totalTime / concurrency,
      minTime: 0, // Not applicable for concurrent
      maxTime: 0, // Not applicable for concurrent
      p95Time: 0, // Not applicable for concurrent
      p99Time: 0, // Not applicable for concurrent
      throughputOps: (concurrency * 1000) / totalTime,
    };

    this.metrics.push(metrics);
    return metrics;
  }

  getMetrics(): PerformanceMetrics[] {
    return this.metrics;
  }

  generateReport(): string {
    let report = '\n=== WebSocket Performance Benchmark Report ===\n\n';
    
    for (const metric of this.metrics) {
      report += `Operation: ${metric.operation}\n`;
      report += `Iterations: ${metric.iterations}\n`;
      report += `Total Time: ${metric.totalTime.toFixed(2)}ms\n`;
      report += `Average Time: ${metric.averageTime.toFixed(2)}ms\n`;
      report += `Min Time: ${metric.minTime.toFixed(2)}ms\n`;
      report += `Max Time: ${metric.maxTime.toFixed(2)}ms\n`;
      report += `P95 Time: ${metric.p95Time.toFixed(2)}ms\n`;
      report += `P99 Time: ${metric.p99Time.toFixed(2)}ms\n`;
      report += `Throughput: ${metric.throughputOps.toFixed(2)} ops/sec\n`;
      report += `\n`;
    }
    
    return report;
  }
}

describe('WebSocket Performance Benchmarks', () => {
  let benchmark: PerformanceBenchmark;
  let channelManager: ChannelManager;
  let messageQueue: MessageQueue;
  let presenceManager: PresenceManager;

  beforeAll(async () => {
    benchmark = new PerformanceBenchmark();
    channelManager = new ChannelManager();
    messageQueue = new MessageQueue();
    presenceManager = new PresenceManager();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    console.log(benchmark.generateReport());
  });

  describe('Core Component Performance', () => {
    it('should benchmark channel creation performance', async () => {
      const metrics = await benchmark.measureOperation(
        'Channel Creation',
        100,
        () => channelManager.createChannel({
          name: `test:channel:${Date.now()}:${Math.random()}`,
          type: 'wedding',
          wedding_id: 'wedding-123',
          organization_id: 'org-123',
          created_by: 'user-123',
          permissions: {
            read: ['vendor', 'couple'],
            write: ['vendor'],
            admin: ['vendor'],
          },
        })
      );

      // Channel creation should average under 100ms
      expect(metrics.averageTime).toBeLessThan(100);
      // P95 should be under 200ms
      expect(metrics.p95Time).toBeLessThan(200);
      // Should handle at least 50 channels/second
      expect(metrics.throughputOps).toBeGreaterThan(50);
    });

    it('should benchmark channel subscription performance', async () => {
      const testChannelId = 'perf-test-channel';
      
      const metrics = await benchmark.measureOperation(
        'Channel Subscription',
        200,
        () => channelManager.subscribeToChannel(
          testChannelId,
          `conn-${Date.now()}-${Math.random()}`,
          'user-123',
          ['read', 'write']
        )
      );

      // Subscription should average under 50ms
      expect(metrics.averageTime).toBeLessThan(50);
      // P95 should be under 100ms
      expect(metrics.p95Time).toBeLessThan(100);
      // Should handle at least 100 subscriptions/second
      expect(metrics.throughputOps).toBeGreaterThan(100);
    });

    it('should benchmark message queuing performance', async () => {
      const testMessage = {
        id: 'msg-123',
        channel_id: 'channel-123',
        user_id: 'user-123',
        content: { message: 'Performance test message' },
        type: 'general',
        priority: 'normal',
        wedding_context: {
          wedding_id: 'wedding-123',
          event_date: '2025-06-15',
        },
        created_at: new Date(),
      };

      const metrics = await benchmark.measureOperation(
        'Message Queuing',
        500,
        () => messageQueue.queueMessage('user-123', testMessage)
      );

      // Message queuing should average under 20ms
      expect(metrics.averageTime).toBeLessThan(20);
      // P95 should be under 50ms
      expect(metrics.p95Time).toBeLessThan(50);
      // Should handle at least 500 messages/second
      expect(metrics.throughputOps).toBeGreaterThan(500);
    });

    it('should benchmark connection health monitoring performance', async () => {
      const connectionId = 'perf-test-connection';
      
      // First establish the connection
      await presenceManager.trackConnection(connectionId, 'user-123', {
        channel_ids: ['channel-123'],
        wedding_context: { wedding_id: 'wedding-123' },
      });

      const metrics = await benchmark.measureOperation(
        'Health Check Processing',
        300,
        () => presenceManager.processHeartbeat(connectionId, {
          timestamp: Date.now(),
          latency: 45,
          connection_quality: 95,
        })
      );

      // Health check processing should average under 30ms
      expect(metrics.averageTime).toBeLessThan(30);
      // P95 should be under 100ms
      expect(metrics.p95Time).toBeLessThan(100);
      // Should handle at least 200 heartbeats/second
      expect(metrics.throughputOps).toBeGreaterThan(200);
    });
  });

  describe('Concurrent Load Testing', () => {
    it('should handle concurrent channel creations', async () => {
      const metrics = await benchmark.measureConcurrentOperations(
        'Concurrent Channel Creation',
        50,
        () => channelManager.createChannel({
          name: `concurrent:channel:${Date.now()}:${Math.random()}`,
          type: 'wedding',
          wedding_id: 'wedding-123',
          organization_id: 'org-123',
          created_by: 'user-123',
          permissions: {
            read: ['vendor'],
            write: ['vendor'],
            admin: ['vendor'],
          },
        })
      );

      // Should complete 50 concurrent creations in under 2 seconds
      expect(metrics.totalTime).toBeLessThan(2000);
      // Should maintain at least 25 operations/second under load
      expect(metrics.throughputOps).toBeGreaterThan(25);
    });

    it('should handle concurrent message broadcasts', async () => {
      const testMessage = {
        id: 'concurrent-msg',
        channel_id: 'channel-123',
        user_id: 'user-123',
        content: { message: 'Concurrent broadcast test' },
        type: 'general',
        priority: 'normal',
        wedding_context: {
          wedding_id: 'wedding-123',
        },
        created_at: new Date(),
      };

      const metrics = await benchmark.measureConcurrentOperations(
        'Concurrent Message Broadcast',
        100,
        () => messageQueue.broadcastMessage('channel-123', testMessage)
      );

      // Should broadcast 100 messages concurrently in under 1 second
      expect(metrics.totalTime).toBeLessThan(1000);
      // Should maintain at least 100 broadcasts/second
      expect(metrics.throughputOps).toBeGreaterThan(100);
    });

    it('should handle concurrent connection monitoring', async () => {
      const metrics = await benchmark.measureConcurrentOperations(
        'Concurrent Connection Monitoring',
        200,
        async () => {
          const connectionId = `concurrent-conn-${Math.random()}`;
          await presenceManager.trackConnection(connectionId, 'user-123', {
            channel_ids: ['channel-123'],
          });
          
          return presenceManager.processHeartbeat(connectionId, {
            timestamp: Date.now(),
            latency: Math.random() * 100,
            connection_quality: 80 + Math.random() * 20,
          });
        }
      );

      // Should handle 200 concurrent connection operations in under 1 second
      expect(metrics.totalTime).toBeLessThan(1000);
      // Should maintain at least 200 operations/second
      expect(metrics.throughputOps).toBeGreaterThan(200);
    });
  });

  describe('Wedding Season Load Simulation', () => {
    it('should simulate peak wedding season traffic', async () => {
      const weddingLoadTest: WeddingLoadTest = {
        concurrent_connections: 500,
        messages_per_second: 1000,
        wedding_count: 25,
        duration_seconds: 10,
      };

      // Simulate multiple weddings with concurrent activity
      const simulateWeddingActivity = async (weddingId: string, connections: number) => {
        const operations = [];
        
        // Create channels for this wedding
        operations.push(
          channelManager.createChannel({
            name: `wedding:main:${weddingId}`,
            type: 'wedding',
            wedding_id: weddingId,
            organization_id: `org-${weddingId}`,
            created_by: `user-${weddingId}`,
            permissions: {
              read: ['vendor', 'couple'],
              write: ['vendor'],
              admin: ['vendor'],
            },
          })
        );

        // Simulate connections subscribing
        for (let i = 0; i < connections; i++) {
          operations.push(
            channelManager.subscribeToChannel(
              `wedding:main:${weddingId}`,
              `conn-${weddingId}-${i}`,
              `user-${weddingId}-${i}`,
              ['read', 'write']
            )
          );
        }

        // Simulate message activity
        for (let i = 0; i < 10; i++) {
          operations.push(
            messageQueue.broadcastMessage(`wedding:main:${weddingId}`, {
              id: `msg-${weddingId}-${i}`,
              channel_id: `wedding:main:${weddingId}`,
              user_id: `user-${weddingId}`,
              content: { message: `Update ${i} for wedding ${weddingId}` },
              type: 'general',
              priority: 'normal',
              wedding_context: { wedding_id: weddingId },
              created_at: new Date(),
            })
          );
        }

        return Promise.all(operations);
      };

      const start = performance.now();

      // Simulate all weddings concurrently
      const weddingPromises = Array(weddingLoadTest.wedding_count)
        .fill(0)
        .map((_, index) => 
          simulateWeddingActivity(
            `wedding-${index}`,
            Math.floor(weddingLoadTest.concurrent_connections / weddingLoadTest.wedding_count)
          )
        );

      await Promise.all(weddingPromises);

      const end = performance.now();
      const totalTime = end - start;

      // Should handle peak load in reasonable time
      expect(totalTime).toBeLessThan(5000); // Under 5 seconds

      // Calculate effective throughput
      const totalOperations = weddingLoadTest.wedding_count * (1 + 20 + 10); // channel + connections + messages
      const effectiveThroughput = (totalOperations * 1000) / totalTime;

      // Should maintain at least 100 operations/second under peak load
      expect(effectiveThroughput).toBeGreaterThan(100);

      console.log(`Peak Wedding Season Simulation:
        - Weddings: ${weddingLoadTest.wedding_count}
        - Total Operations: ${totalOperations}
        - Total Time: ${totalTime.toFixed(2)}ms
        - Throughput: ${effectiveThroughput.toFixed(2)} ops/sec
      `);
    });

    it('should handle wedding day emergency broadcasts', async () => {
      // Simulate urgent wedding day scenario
      const emergencyMessage = {
        id: 'emergency-msg',
        channel_id: 'wedding:emergency:123',
        user_id: 'venue-manager',
        content: {
          message: 'URGENT: Weather update - ceremony moved indoors',
          emergency_type: 'weather',
          requires_immediate_action: true,
        },
        type: 'urgent',
        priority: 'critical',
        wedding_context: {
          wedding_id: 'wedding-123',
          event_date: new Date().toISOString().split('T')[0],
          is_wedding_day: true,
        },
        created_at: new Date(),
      };

      // Measure emergency broadcast to 200 connections
      const metrics = await benchmark.measureOperation(
        'Emergency Wedding Day Broadcast',
        1,
        async () => {
          // Simulate broadcast to 200 active connections
          const broadcastPromises = Array(200).fill(0).map(() => 
            messageQueue.broadcastMessage('wedding:emergency:123', emergencyMessage)
          );
          
          await Promise.all(broadcastPromises);
        }
      );

      // Emergency broadcasts should complete in under 200ms
      expect(metrics.averageTime).toBeLessThan(200);
      
      console.log(`Emergency Broadcast Performance:
        - Connections: 200
        - Broadcast Time: ${metrics.averageTime.toFixed(2)}ms
        - Critical Threshold: <200ms ✓
      `);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should monitor memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create significant load
      const operations = [];
      for (let i = 0; i < 1000; i++) {
        operations.push(
          channelManager.createChannel({
            name: `memory:test:${i}`,
            type: 'wedding',
            wedding_id: `wedding-${i}`,
            organization_id: `org-${i}`,
            created_by: `user-${i}`,
            permissions: { read: ['vendor'], write: ['vendor'], admin: ['vendor'] },
          })
        );
      }

      await Promise.all(operations);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseKB = memoryIncrease / 1024;

      // Memory increase should be reasonable (under 50MB for 1000 operations)
      expect(memoryIncreaseKB).toBeLessThan(50 * 1024);

      console.log(`Memory Usage Analysis:
        - Operations: 1000
        - Memory Increase: ${memoryIncreaseKB.toFixed(2)} KB
        - Per Operation: ${(memoryIncreaseKB / 1000).toFixed(2)} KB
      `);
    });

    it('should validate resource cleanup', async () => {
      // Create connections and then clean them up
      const connectionIds = [];
      
      // Create 100 connections
      for (let i = 0; i < 100; i++) {
        const connectionId = `cleanup-test-${i}`;
        connectionIds.push(connectionId);
        
        await presenceManager.trackConnection(connectionId, `user-${i}`, {
          channel_ids: [`channel-${i}`],
        });
      }

      // Verify connections exist
      const beforeCleanup = await presenceManager.getActiveConnections();
      expect(beforeCleanup.length).toBeGreaterThan(0);

      // Clean up connections
      const cleanupStart = performance.now();
      
      for (const connectionId of connectionIds) {
        await presenceManager.removeConnection(connectionId);
      }
      
      const cleanupTime = performance.now() - cleanupStart;

      // Cleanup should be fast (under 1 second for 100 connections)
      expect(cleanupTime).toBeLessThan(1000);

      // Verify cleanup effectiveness
      const afterCleanup = await presenceManager.getActiveConnections();
      expect(afterCleanup.length).toBe(0);

      console.log(`Resource Cleanup Performance:
        - Connections Cleaned: 100
        - Cleanup Time: ${cleanupTime.toFixed(2)}ms
        - Average per Connection: ${(cleanupTime / 100).toFixed(2)}ms
      `);
    });
  });

  describe('Sub-500ms Response Time Validation', () => {
    it('should validate API response times meet requirements', async () => {
      const operations = [
        {
          name: 'Channel Creation',
          fn: () => channelManager.createChannel({
            name: `api:test:${Date.now()}`,
            type: 'wedding',
            wedding_id: 'wedding-123',
            organization_id: 'org-123',
            created_by: 'user-123',
            permissions: { read: ['vendor'], write: ['vendor'], admin: ['vendor'] },
          }),
          threshold: 100, // 100ms threshold
        },
        {
          name: 'Channel Subscription',
          fn: () => channelManager.subscribeToChannel(
            'channel-123',
            `conn-${Date.now()}`,
            'user-123',
            ['read', 'write']
          ),
          threshold: 50, // 50ms threshold
        },
        {
          name: 'Message Broadcast',
          fn: () => messageQueue.broadcastMessage('channel-123', {
            id: `msg-${Date.now()}`,
            channel_id: 'channel-123',
            user_id: 'user-123',
            content: { message: 'Response time test' },
            type: 'general',
            priority: 'normal',
            wedding_context: { wedding_id: 'wedding-123' },
            created_at: new Date(),
          }),
          threshold: 75, // 75ms threshold
        },
        {
          name: 'Health Check',
          fn: () => presenceManager.processHeartbeat('conn-123', {
            timestamp: Date.now(),
            latency: 50,
            connection_quality: 95,
          }),
          threshold: 25, // 25ms threshold
        },
      ];

      for (const operation of operations) {
        const metrics = await benchmark.measureOperation(
          operation.name,
          50,
          operation.fn
        );

        // Validate all response times meet thresholds
        expect(metrics.averageTime).toBeLessThan(operation.threshold);
        expect(metrics.p95Time).toBeLessThan(operation.threshold * 2);
        expect(metrics.maxTime).toBeLessThan(500); // Hard limit: 500ms

        console.log(`${operation.name} Response Time Validation:
          - Average: ${metrics.averageTime.toFixed(2)}ms (Threshold: ${operation.threshold}ms) ✓
          - P95: ${metrics.p95Time.toFixed(2)}ms (Threshold: ${operation.threshold * 2}ms) ✓
          - Max: ${metrics.maxTime.toFixed(2)}ms (Hard Limit: 500ms) ✓
        `);
      }
    });
  });
});