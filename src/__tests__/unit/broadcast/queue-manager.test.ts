import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock BroadcastQueueManager for comprehensive unit testing
interface QueueItem {
  id: string;
  broadcast: any;
  recipients: string[];
  priority: 'critical' | 'high' | 'normal';
  createdAt: number;
  attempts: number;
  status: 'pending' | 'processing' | 'delivered' | 'failed';
}

interface QueueMetrics {
  totalEnqueued: number;
  totalProcessed: number;
  totalFailed: number;
  currentQueueSize: number;
  avgProcessingTime: number;
  errorRate: number;
  throughputPerSecond: number;
}

class BroadcastQueueManager {
  private queue: QueueItem[] = [];
  private processing = false;
  private metrics: QueueMetrics = {
    totalEnqueued: 0,
    totalProcessed: 0,
    totalFailed: 0,
    currentQueueSize: 0,
    avgProcessingTime: 0,
    errorRate: 0,
    throughputPerSecond: 0,
  };
  private startTime = Date.now();
  private processingTimes: number[] = [];

  async enqueue(
    broadcast: any,
    recipients: string[],
    priority: 'critical' | 'high' | 'normal',
  ): Promise<string> {
    const queueItem: QueueItem = {
      id: `queue-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      broadcast,
      recipients,
      priority,
      createdAt: Date.now(),
      attempts: 0,
      status: 'pending',
    };

    // Insert with priority ordering
    this.insertByPriority(queueItem);
    this.metrics.totalEnqueued++;
    this.metrics.currentQueueSize = this.queue.length;

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }

    return queueItem.id;
  }

  private insertByPriority(item: QueueItem): void {
    const priorityOrder = { critical: 3, high: 2, normal: 1 };
    const itemPriority = priorityOrder[item.priority];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const existingPriority = priorityOrder[this.queue[i].priority];
      if (itemPriority > existingPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, item);
  }

  private async startProcessing(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      const startTime = Date.now();

      try {
        item.status = 'processing';
        await this.processItem(item);

        const processingTime = Date.now() - startTime;
        this.processingTimes.push(processingTime);
        this.updateAvgProcessingTime(processingTime);

        item.status = 'delivered';
        this.metrics.totalProcessed += item.recipients.length;
      } catch (error) {
        item.status = 'failed';
        item.attempts++;
        this.metrics.totalFailed += item.recipients.length;

        // Retry logic for failed items (up to 3 attempts)
        if (item.attempts < 3 && item.priority === 'critical') {
          item.status = 'pending';
          this.insertByPriority(item); // Re-queue for retry
        }
      }

      this.metrics.currentQueueSize = this.queue.length;
      this.updateThroughput();
    }

    this.processing = false;
  }

  private async processItem(item: QueueItem): Promise<void> {
    // Simulate broadcast processing with variable delay based on recipient count
    const baseDelay = 20;
    const perRecipientDelay = 2;
    const delay = baseDelay + item.recipients.length * perRecipientDelay;

    await new Promise((resolve) => setTimeout(resolve, delay));

    // Simulate occasional failures (higher rate for normal priority)
    const failureRate =
      item.priority === 'critical'
        ? 0.001
        : item.priority === 'high'
          ? 0.01
          : 0.02;
    if (Math.random() < failureRate) {
      throw new Error(`Processing failed for ${item.id}`);
    }
  }

  private updateAvgProcessingTime(newTime: number): void {
    if (this.processingTimes.length === 0) {
      this.metrics.avgProcessingTime = newTime;
    } else {
      // Exponential moving average
      const alpha = 0.1;
      this.metrics.avgProcessingTime =
        alpha * newTime + (1 - alpha) * this.metrics.avgProcessingTime;
    }
  }

  private updateThroughput(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.metrics.throughputPerSecond =
      elapsed > 0 ? this.metrics.totalProcessed / elapsed : 0;
    this.metrics.errorRate =
      this.metrics.totalEnqueued > 0
        ? this.metrics.totalFailed /
          (this.metrics.totalProcessed + this.metrics.totalFailed)
        : 0;
  }

  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  getQueueSnapshot(): Array<{
    id: string;
    priority: string;
    recipientCount: number;
    status: string;
  }> {
    return this.queue.map((item) => ({
      id: item.id,
      priority: item.priority,
      recipientCount: item.recipients.length,
      status: item.status,
    }));
  }

  async waitForCompletion(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (this.processing || this.queue.length > 0) {
      if (Date.now() - startTime > timeoutMs) {
        return false; // Timeout
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return true;
  }

  clear(): void {
    this.queue = [];
    this.processing = false;
    this.metrics = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalFailed: 0,
      currentQueueSize: 0,
      avgProcessingTime: 0,
      errorRate: 0,
      throughputPerSecond: 0,
    };
    this.startTime = Date.now();
    this.processingTimes = [];
  }

  // Method for testing priority queue behavior
  getPriorityDistribution(): {
    critical: number;
    high: number;
    normal: number;
  } {
    const distribution = { critical: 0, high: 0, normal: 0 };

    this.queue.forEach((item) => {
      distribution[item.priority]++;
    });

    return distribution;
  }

  // Method for testing retry behavior
  getFailedItems(): QueueItem[] {
    return this.queue.filter((item) => item.status === 'failed');
  }
}

describe('BroadcastQueueManager Unit Tests', () => {
  let queueManager: BroadcastQueueManager;

  beforeEach(() => {
    queueManager = new BroadcastQueueManager();
  });

  afterEach(() => {
    queueManager.clear();
  });

  describe('Basic Queue Operations', () => {
    test('enqueues broadcast successfully', async () => {
      const broadcast = {
        id: 'test-broadcast-1',
        type: 'timeline.changed',
        priority: 'high',
        title: 'Test Broadcast',
        message: 'Testing queue enqueue operation',
      };

      const recipients = ['user1', 'user2', 'user3'];
      const queueId = await queueManager.enqueue(broadcast, recipients, 'high');

      expect(queueId).toBeDefined();
      expect(queueId).toMatch(/^queue-item-/);

      const metrics = queueManager.getMetrics();
      expect(metrics.totalEnqueued).toBe(3); // 3 recipients
      expect(metrics.currentQueueSize).toBeGreaterThan(0);
    });

    test('processes enqueued broadcasts automatically', async () => {
      const broadcast = {
        id: 'auto-process-test',
        type: 'feature.released',
        priority: 'normal',
        title: 'Auto Process Test',
        message: 'Testing automatic processing',
      };

      const recipients = ['user1', 'user2'];
      await queueManager.enqueue(broadcast, recipients, 'normal');

      // Wait for processing to complete
      const completed = await queueManager.waitForCompletion(5000);
      expect(completed).toBe(true);

      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBe(2);
      expect(metrics.currentQueueSize).toBe(0);
    });

    test('calculates processing metrics correctly', async () => {
      const broadcasts = [
        {
          id: 'metric-test-1',
          type: 'timeline.changed',
          priority: 'high',
          title: 'Test 1',
          message: 'Message 1',
        },
        {
          id: 'metric-test-2',
          type: 'payment.received',
          priority: 'normal',
          title: 'Test 2',
          message: 'Message 2',
        },
        {
          id: 'metric-test-3',
          type: 'wedding.reminder',
          priority: 'high',
          title: 'Test 3',
          message: 'Message 3',
        },
      ];

      for (const broadcast of broadcasts) {
        await queueManager.enqueue(
          broadcast,
          ['user1', 'user2'],
          broadcast.priority as any,
        );
      }

      await queueManager.waitForCompletion(10000);

      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBe(6); // 3 broadcasts × 2 recipients
      expect(metrics.avgProcessingTime).toBeGreaterThan(0);
      expect(metrics.throughputPerSecond).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeLessThan(0.1); // Less than 10% error rate
    });
  });

  describe('Priority Queue Behavior', () => {
    test('processes critical broadcasts first', async () => {
      // Enqueue in reverse priority order
      await queueManager.enqueue(
        {
          id: 'normal-1',
          type: 'feature.update',
          priority: 'normal',
          title: 'Normal',
          message: 'Normal message',
        },
        ['user1'],
        'normal',
      );

      await queueManager.enqueue(
        {
          id: 'high-1',
          type: 'timeline.changed',
          priority: 'high',
          title: 'High',
          message: 'High message',
        },
        ['user1'],
        'high',
      );

      await queueManager.enqueue(
        {
          id: 'critical-1',
          type: 'wedding.emergency',
          priority: 'critical',
          title: 'Critical',
          message: 'Critical message',
        },
        ['user1'],
        'critical',
      );

      // Check queue ordering before processing
      const snapshot = queueManager.getQueueSnapshot();

      expect(snapshot[0].priority).toBe('critical');
      expect(snapshot[1].priority).toBe('high');
      expect(snapshot[2].priority).toBe('normal');
    });

    test('maintains priority order with multiple items of same priority', async () => {
      // Enqueue multiple critical broadcasts
      for (let i = 0; i < 5; i++) {
        await queueManager.enqueue(
          {
            id: `critical-${i}`,
            type: 'wedding.emergency',
            priority: 'critical',
            title: `Critical ${i}`,
            message: `Message ${i}`,
          },
          ['user1'],
          'critical',
        );
      }

      // Enqueue high priority broadcasts
      for (let i = 0; i < 3; i++) {
        await queueManager.enqueue(
          {
            id: `high-${i}`,
            type: 'timeline.changed',
            priority: 'high',
            title: `High ${i}`,
            message: `Message ${i}`,
          },
          ['user1'],
          'high',
        );
      }

      const snapshot = queueManager.getQueueSnapshot();
      const distribution = queueManager.getPriorityDistribution();

      // All critical items should be first
      expect(distribution.critical).toBe(5);
      expect(distribution.high).toBe(3);

      // First 5 items should be critical
      for (let i = 0; i < 5; i++) {
        expect(snapshot[i].priority).toBe('critical');
      }

      // Next 3 items should be high
      for (let i = 5; i < 8; i++) {
        expect(snapshot[i].priority).toBe('high');
      }
    });

    test('critical broadcasts can interrupt processing queue', async () => {
      // Enqueue many normal priority items first
      for (let i = 0; i < 10; i++) {
        await queueManager.enqueue(
          {
            id: `normal-${i}`,
            type: 'feature.update',
            priority: 'normal',
            title: `Normal ${i}`,
            message: `Message ${i}`,
          },
          ['user1'],
          'normal',
        );
      }

      // Allow some processing to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Enqueue critical broadcast (should go to front)
      await queueManager.enqueue(
        {
          id: 'critical-interrupt',
          type: 'wedding.emergency',
          priority: 'critical',
          title: 'Critical Interrupt',
          message: 'Emergency!',
        },
        ['user1'],
        'critical',
      );

      const snapshot = queueManager.getQueueSnapshot();

      // Critical should be at or near the front (processing may have started on first normal item)
      const criticalIndex = snapshot.findIndex(
        (item) => item.priority === 'critical',
      );
      expect(criticalIndex).toBeLessThan(3); // Should be in first few positions
    });
  });

  describe('Error Handling and Retry Logic', () => {
    test('retries failed critical broadcasts', async () => {
      // Mock a broadcast that will fail initially
      const flakyBroadcast = {
        id: 'flaky-critical',
        type: 'wedding.emergency',
        priority: 'critical',
        title: 'Flaky Critical Broadcast',
        message: 'This broadcast may fail initially',
      };

      // Use Math.random to simulate flaky behavior - some will fail, some will succeed
      const originalRandom = Math.random;
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        // First attempt fails, retry succeeds
        return callCount === 1 ? 0.01 : 0.9; // First call triggers failure, second succeeds
      });

      await queueManager.enqueue(flakyBroadcast, ['user1'], 'critical');
      await queueManager.waitForCompletion(10000);

      const metrics = queueManager.getMetrics();

      // Should eventually succeed after retry
      expect(metrics.totalProcessed).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    test('does not retry failed normal broadcasts excessively', async () => {
      // Mock consistently failing broadcast
      const failingBroadcast = {
        id: 'always-fails',
        type: 'feature.update',
        priority: 'normal',
        title: 'Failing Broadcast',
        message: 'This will always fail',
      };

      vi.spyOn(Math, 'random').mockReturnValue(0.001); // Always trigger failure

      await queueManager.enqueue(failingBroadcast, ['user1'], 'normal');
      await queueManager.waitForCompletion(5000);

      const metrics = queueManager.getMetrics();
      const failedItems = queueManager.getFailedItems();

      // Should fail and not retry excessively for normal priority
      expect(metrics.totalFailed).toBeGreaterThan(0);
      expect(failedItems.length).toBeLessThanOrEqual(1); // Should not create multiple failed entries

      vi.restoreAllMocks();
    });

    test('tracks error rates accurately', async () => {
      // Create mix of successful and failing broadcasts
      const broadcasts = Array.from({ length: 20 }, (_, i) => ({
        id: `error-rate-test-${i}`,
        type: 'feature.update',
        priority: 'normal',
        title: `Test ${i}`,
        message: `Message ${i}`,
      }));

      // Mock 20% failure rate
      vi.spyOn(Math, 'random').mockImplementation(() =>
        Math.random() < 0.2 ? 0.001 : 0.9,
      );

      for (const broadcast of broadcasts) {
        await queueManager.enqueue(broadcast, ['user1'], 'normal');
      }

      await queueManager.waitForCompletion(15000);

      const metrics = queueManager.getMetrics();

      expect(metrics.errorRate).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeLessThan(0.5); // Should be reasonable
      expect(metrics.totalProcessed + metrics.totalFailed).toBe(20); // All items processed

      vi.restoreAllMocks();
    });
  });

  describe('Performance and Throughput', () => {
    test('maintains reasonable throughput with high volume', async () => {
      const highVolumeCount = 100;
      const broadcasts = Array.from({ length: highVolumeCount }, (_, i) => ({
        id: `throughput-test-${i}`,
        type: 'timeline.changed',
        priority: i % 3 === 0 ? 'high' : 'normal',
        title: `Throughput Test ${i}`,
        message: `Testing throughput message ${i}`,
      }));

      const startTime = Date.now();

      // Enqueue all broadcasts
      for (const broadcast of broadcasts) {
        await queueManager.enqueue(
          broadcast,
          ['user1'],
          broadcast.priority as any,
        );
      }

      await queueManager.waitForCompletion(30000);

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      const metrics = queueManager.getMetrics();

      console.log('High Volume Throughput Test Results:', {
        totalBroadcasts: highVolumeCount,
        totalTime: `${totalTime.toFixed(2)}s`,
        throughput: `${metrics.throughputPerSecond.toFixed(2)} broadcasts/sec`,
        avgProcessingTime: `${metrics.avgProcessingTime.toFixed(2)}ms`,
        errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`,
      });

      expect(metrics.totalProcessed).toBe(highVolumeCount);
      expect(metrics.throughputPerSecond).toBeGreaterThan(5); // At least 5 broadcasts per second
      expect(metrics.avgProcessingTime).toBeLessThan(100); // Less than 100ms average
    });

    test('handles concurrent enqueue operations', async () => {
      const concurrentCount = 50;

      // Create concurrent enqueue operations
      const enqueuePromises = Array.from({ length: concurrentCount }, (_, i) =>
        queueManager.enqueue(
          {
            id: `concurrent-${i}`,
            type: 'feature.update',
            priority: 'normal',
            title: `Concurrent ${i}`,
            message: `Concurrent message ${i}`,
          },
          ['user1'],
          'normal',
        ),
      );

      // Execute all enqueues concurrently
      const queueIds = await Promise.all(enqueuePromises);

      // Verify all operations succeeded
      expect(queueIds).toHaveLength(concurrentCount);
      queueIds.forEach((id) => expect(id).toMatch(/^queue-item-/));

      // Wait for processing
      await queueManager.waitForCompletion(15000);

      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBe(concurrentCount);
      expect(metrics.currentQueueSize).toBe(0);
    });

    test('maintains consistent performance under sustained load', async () => {
      const sustainedDuration = 5000; // 5 seconds
      const enqueueInterval = 100; // Every 100ms
      const expectedBroadcasts = sustainedDuration / enqueueInterval;

      let enqueuedCount = 0;
      const startTime = Date.now();

      // Sustain load for specified duration
      const sustainedLoad = setInterval(async () => {
        if (Date.now() - startTime >= sustainedDuration) {
          clearInterval(sustainedLoad);
          return;
        }

        await queueManager.enqueue(
          {
            id: `sustained-${enqueuedCount}`,
            type: 'timeline.reminder',
            priority: 'high',
            title: `Sustained Load ${enqueuedCount}`,
            message: `Sustained load test message ${enqueuedCount}`,
          },
          ['user1'],
          'high',
        );

        enqueuedCount++;
      }, enqueueInterval);

      // Wait for sustained load test to complete
      await new Promise((resolve) =>
        setTimeout(resolve, sustainedDuration + 1000),
      );

      // Wait for all processing to complete
      await queueManager.waitForCompletion(10000);

      const metrics = queueManager.getMetrics();

      console.log('Sustained Load Test Results:', {
        duration: `${sustainedDuration}ms`,
        enqueuedCount,
        processed: metrics.totalProcessed,
        throughput: `${metrics.throughputPerSecond.toFixed(2)} broadcasts/sec`,
        avgProcessingTime: `${metrics.avgProcessingTime.toFixed(2)}ms`,
        queueCompletedEmpty: metrics.currentQueueSize === 0,
      });

      expect(enqueuedCount).toBeGreaterThan(expectedBroadcasts * 0.8); // Allow some variance
      expect(metrics.totalProcessed).toBe(enqueuedCount);
      expect(metrics.currentQueueSize).toBe(0);
      expect(metrics.avgProcessingTime).toBeLessThan(200); // Reasonable processing time
    });
  });

  describe('Queue State Management', () => {
    test('provides accurate queue snapshots', async () => {
      const testBroadcasts = [
        {
          id: 'snapshot-1',
          type: 'wedding.emergency',
          priority: 'critical',
          title: 'Critical',
          message: 'Critical message',
          recipients: ['user1', 'user2'],
        },
        {
          id: 'snapshot-2',
          type: 'timeline.changed',
          priority: 'high',
          title: 'High',
          message: 'High message',
          recipients: ['user3'],
        },
        {
          id: 'snapshot-3',
          type: 'feature.update',
          priority: 'normal',
          title: 'Normal',
          message: 'Normal message',
          recipients: ['user4', 'user5', 'user6'],
        },
      ];

      for (const broadcast of testBroadcasts) {
        await queueManager.enqueue(
          broadcast,
          broadcast.recipients,
          broadcast.priority as any,
        );
      }

      const snapshot = queueManager.getQueueSnapshot();

      expect(snapshot).toHaveLength(3);

      // Verify snapshot data accuracy
      snapshot.forEach((item) => {
        expect(item.id).toBeDefined();
        expect(['critical', 'high', 'normal']).toContain(item.priority);
        expect(item.recipientCount).toBeGreaterThan(0);
        expect(['pending', 'processing', 'delivered', 'failed']).toContain(
          item.status,
        );
      });

      // Verify priority ordering in snapshot
      expect(snapshot[0].priority).toBe('critical');
      expect(snapshot[1].priority).toBe('high');
      expect(snapshot[2].priority).toBe('normal');
    });

    test('clears queue and resets metrics correctly', async () => {
      // Add some items to queue
      await queueManager.enqueue(
        {
          id: 'clear-test',
          type: 'feature.update',
          priority: 'normal',
          title: 'Clear Test',
          message: 'Test',
        },
        ['user1', 'user2'],
        'normal',
      );

      // Let some processing happen
      await new Promise((resolve) => setTimeout(resolve, 200));

      const metricsBeforeClear = queueManager.getMetrics();
      expect(metricsBeforeClear.totalEnqueued).toBeGreaterThan(0);

      // Clear queue
      queueManager.clear();

      const metricsAfterClear = queueManager.getMetrics();
      const snapshot = queueManager.getQueueSnapshot();

      expect(snapshot).toHaveLength(0);
      expect(metricsAfterClear.totalEnqueued).toBe(0);
      expect(metricsAfterClear.totalProcessed).toBe(0);
      expect(metricsAfterClear.currentQueueSize).toBe(0);
      expect(metricsAfterClear.avgProcessingTime).toBe(0);
    });

    test('handles empty queue gracefully', async () => {
      // Test operations on empty queue
      const metrics = queueManager.getMetrics();
      const snapshot = queueManager.getQueueSnapshot();
      const distribution = queueManager.getPriorityDistribution();

      expect(metrics.totalEnqueued).toBe(0);
      expect(metrics.currentQueueSize).toBe(0);
      expect(snapshot).toHaveLength(0);
      expect(distribution).toEqual({ critical: 0, high: 0, normal: 0 });

      // Should complete immediately
      const completed = await queueManager.waitForCompletion(1000);
      expect(completed).toBe(true);
    });
  });
});
