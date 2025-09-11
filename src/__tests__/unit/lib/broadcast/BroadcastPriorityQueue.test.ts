/**
 * BroadcastPriorityQueue Unit Tests - WS-205 Broadcast Events System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BroadcastPriorityQueue,
  BroadcastMessage,
  createWeddingBroadcastQueue,
  createTestBroadcast,
} from '@/lib/broadcast/priority-queue';

// Mock console methods for testing
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('BroadcastPriorityQueue', () => {
  let queue: BroadcastPriorityQueue;

  beforeEach(() => {
    queue = new BroadcastPriorityQueue();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Queue Operations', () => {
    it('should initialize empty queue', () => {
      expect(queue.size()).toBe(0);
      expect(queue.hasNext()).toBe(false);
      expect(queue.peek()).toBeNull();
      expect(queue.dequeue()).toBeNull();
    });

    it('should enqueue and dequeue single message', () => {
      const message = createTestBroadcast('normal', 'test.message');

      queue.enqueue(message);

      expect(queue.size()).toBe(1);
      expect(queue.hasNext()).toBe(true);
      expect(queue.peek()).toEqual(message);

      const dequeued = queue.dequeue();
      expect(dequeued).toEqual(message);
      expect(queue.size()).toBe(0);
    });

    it('should maintain priority order', () => {
      const lowMessage = createTestBroadcast('low', 'test.low');
      const normalMessage = createTestBroadcast('normal', 'test.normal');
      const highMessage = createTestBroadcast('high', 'test.high');
      const criticalMessage = createTestBroadcast('critical', 'test.critical');

      // Enqueue in random order
      queue.enqueue(normalMessage);
      queue.enqueue(lowMessage);
      queue.enqueue(criticalMessage);
      queue.enqueue(highMessage);

      // Should dequeue in priority order: critical, high, normal, low
      expect(queue.dequeue()?.priority).toBe('critical');
      expect(queue.dequeue()?.priority).toBe('high');
      expect(queue.dequeue()?.priority).toBe('normal');
      expect(queue.dequeue()?.priority).toBe('low');
    });
  });

  describe('Wedding Context Priority Boosting', () => {
    it('should boost priority for wedding-related messages', () => {
      const weddingDate = new Date();
      weddingDate.setDate(weddingDate.getDate() + 7); // Wedding in 7 days

      const normalMessage = createTestBroadcast('normal', 'test.normal');
      const weddingMessage: BroadcastMessage = {
        ...createTestBroadcast('normal', 'test.wedding'),
        weddingContext: {
          weddingId: 'wedding-123',
          coupleName: 'Test Couple',
          weddingDate,
        },
      };

      queue.enqueue(normalMessage);
      queue.enqueue(weddingMessage);

      // Wedding message should come first due to context boosting
      expect(queue.dequeue()?.type).toBe('test.wedding');
      expect(queue.dequeue()?.type).toBe('test.normal');
    });

    it('should apply higher boost for weddings within 7 days', () => {
      const nearWeddingDate = new Date();
      nearWeddingDate.setDate(nearWeddingDate.getDate() + 3); // 3 days away

      const farWeddingDate = new Date();
      farWeddingDate.setDate(farWeddingDate.getDate() + 30); // 30 days away

      const nearWeddingMessage: BroadcastMessage = {
        ...createTestBroadcast('normal', 'test.near'),
        weddingContext: {
          weddingId: 'wedding-near',
          coupleName: 'Near Couple',
          weddingDate: nearWeddingDate,
        },
      };

      const farWeddingMessage: BroadcastMessage = {
        ...createTestBroadcast('normal', 'test.far'),
        weddingContext: {
          weddingId: 'wedding-far',
          coupleName: 'Far Couple',
          weddingDate: farWeddingDate,
        },
      };

      queue.enqueue(farWeddingMessage);
      queue.enqueue(nearWeddingMessage);

      // Near wedding should come first
      expect(queue.dequeue()?.type).toBe('test.near');
      expect(queue.dequeue()?.type).toBe('test.far');
    });

    it('should apply maximum boost for Saturday weddings', () => {
      // Find next Saturday
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7));

      const saturdayWeddingMessage: BroadcastMessage = {
        ...createTestBroadcast('normal', 'test.saturday'),
        weddingContext: {
          weddingId: 'wedding-saturday',
          coupleName: 'Saturday Couple',
          weddingDate: saturday,
        },
      };

      const normalWeddingMessage: BroadcastMessage = {
        ...createTestBroadcast('high', 'test.high'),
        weddingContext: {
          weddingId: 'wedding-normal',
          coupleName: 'Normal Couple',
          weddingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      };

      queue.enqueue(normalWeddingMessage);
      queue.enqueue(saturdayWeddingMessage);

      // Saturday wedding should come first despite lower base priority
      expect(queue.dequeue()?.type).toBe('test.saturday');
    });
  });

  describe('Critical Wedding Types', () => {
    it('should boost priority for critical wedding types', () => {
      const criticalTypeMessage = createTestBroadcast(
        'normal',
        'wedding.cancelled',
      );
      const normalMessage = createTestBroadcast('high', 'test.normal');

      queue.enqueue(normalMessage);
      queue.enqueue(criticalTypeMessage);

      // Critical wedding type should come first despite lower base priority
      expect(queue.dequeue()?.type).toBe('wedding.cancelled');
      expect(queue.dequeue()?.type).toBe('test.normal');
    });

    it('should recognize all critical wedding types', () => {
      const criticalTypes = [
        'wedding.cancelled',
        'payment.failure',
        'security.alert',
        'venue.emergency',
        'weather.alert',
      ];

      const normalMessage = createTestBroadcast('high', 'test.normal');
      queue.enqueue(normalMessage);

      criticalTypes.forEach((type) => {
        const criticalMessage = createTestBroadcast('normal', type);
        queue.enqueue(criticalMessage);
      });

      // All critical types should come before normal high priority message
      for (let i = 0; i < criticalTypes.length; i++) {
        const dequeued = queue.dequeue();
        expect(criticalTypes).toContain(dequeued?.type);
      }

      expect(queue.dequeue()?.type).toBe('test.normal');
    });
  });

  describe('Expired Message Handling', () => {
    it('should reject expired messages at enqueue', () => {
      const expiredMessage: BroadcastMessage = {
        ...createTestBroadcast('normal', 'test.expired'),
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      queue.enqueue(expiredMessage);

      expect(queue.size()).toBe(0);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Dropping expired broadcast message'),
      );
    });

    it('should clean expired messages from queue', async () => {
      const validMessage = createTestBroadcast('normal', 'test.valid');
      const expiredMessage: BroadcastMessage = {
        ...createTestBroadcast('normal', 'test.expired'),
        expiresAt: new Date(Date.now() + 100), // Expires in 100ms
      };

      queue.enqueue(validMessage);
      queue.enqueue(expiredMessage);

      expect(queue.size()).toBe(2);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 200));

      const removedCount = queue.cleanExpired();
      expect(removedCount).toBe(1);
      expect(queue.size()).toBe(1);
      expect(queue.peek()?.type).toBe('test.valid');
    });
  });

  describe('Duplicate Message Prevention', () => {
    it('should prevent duplicate messages', () => {
      const message = createTestBroadcast('normal', 'test.message');
      const duplicateMessage = { ...message }; // Same ID

      queue.enqueue(message);
      queue.enqueue(duplicateMessage);

      expect(queue.size()).toBe(1);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate broadcast message ignored'),
      );
    });
  });

  describe('Queue Management', () => {
    it('should clear all messages', () => {
      queue.enqueue(createTestBroadcast('normal', 'test.1'));
      queue.enqueue(createTestBroadcast('high', 'test.2'));

      expect(queue.size()).toBe(2);

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.hasNext()).toBe(false);
    });

    it('should remove message by ID', () => {
      const message1 = createTestBroadcast('normal', 'test.1');
      const message2 = createTestBroadcast('normal', 'test.2');

      queue.enqueue(message1);
      queue.enqueue(message2);

      expect(queue.size()).toBe(2);

      const removed = queue.removeMessage(message1.id);
      expect(removed).toBe(true);
      expect(queue.size()).toBe(1);
      expect(queue.peek()?.id).toBe(message2.id);
    });

    it('should return false when removing non-existent message', () => {
      const message = createTestBroadcast('normal', 'test.message');
      queue.enqueue(message);

      const removed = queue.removeMessage('non-existent-id');
      expect(removed).toBe(false);
      expect(queue.size()).toBe(1);
    });
  });

  describe('Query Methods', () => {
    beforeEach(() => {
      const weddingMessage: BroadcastMessage = {
        ...createTestBroadcast('high', 'wedding.update'),
        weddingContext: {
          weddingId: 'wedding-123',
          coupleName: 'Test Couple',
          weddingDate: new Date(),
        },
      };

      queue.enqueue(createTestBroadcast('critical', 'test.critical'));
      queue.enqueue(createTestBroadcast('high', 'test.high'));
      queue.enqueue(weddingMessage);
      queue.enqueue(createTestBroadcast('low', 'test.low'));
    });

    it('should get messages by priority', () => {
      const criticalMessages = queue.getMessagesByPriority('critical');
      const highMessages = queue.getMessagesByPriority('high');

      expect(criticalMessages).toHaveLength(1);
      expect(criticalMessages[0].priority).toBe('critical');

      expect(highMessages).toHaveLength(2); // Both high priority messages
      highMessages.forEach((msg) => expect(msg.priority).toBe('high'));
    });

    it('should get messages for specific wedding', () => {
      const weddingMessages = queue.getMessagesForWedding('wedding-123');

      expect(weddingMessages).toHaveLength(1);
      expect(weddingMessages[0].weddingContext?.weddingId).toBe('wedding-123');
    });

    it('should return comprehensive queue statistics', () => {
      const stats = queue.getStats();

      expect(stats.total).toBe(4);
      expect(stats.byCritical).toBe(1);
      expect(stats.byHigh).toBe(2);
      expect(stats.byLow).toBe(1);
      expect(stats.weddingRelated).toBe(1);
      expect(stats.expired).toBe(0);
      expect(typeof stats.oldestTimestamp).toBe('number');
      expect(typeof stats.newestTimestamp).toBe('number');
    });
  });

  describe('Factory Functions', () => {
    it('should create wedding broadcast queue with automatic cleanup', () => {
      const weddingQueue = createWeddingBroadcastQueue();

      expect(weddingQueue).toBeInstanceOf(BroadcastPriorityQueue);
      expect(weddingQueue.size()).toBe(0);
    });

    it('should create test broadcast with defaults', () => {
      const testBroadcast = createTestBroadcast();

      expect(testBroadcast.priority).toBe('normal');
      expect(testBroadcast.type).toBe('test.message');
      expect(testBroadcast.title).toContain('normal priority');
      expect(testBroadcast.metadata?.testMessage).toBe(true);
    });

    it('should create test broadcast with wedding context', () => {
      const testBroadcast = createTestBroadcast(
        'high',
        'wedding.test',
        'wedding-123',
      );

      expect(testBroadcast.priority).toBe('high');
      expect(testBroadcast.type).toBe('wedding.test');
      expect(testBroadcast.weddingContext).toBeDefined();
      expect(testBroadcast.weddingContext?.weddingId).toBe('wedding-123');
      expect(testBroadcast.weddingContext?.coupleName).toBe('Test Couple');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queue operations gracefully', () => {
      expect(queue.dequeue()).toBeNull();
      expect(queue.peek()).toBeNull();
      expect(queue.removeMessage('non-existent')).toBe(false);
      expect(queue.cleanExpired()).toBe(0);
      expect(queue.getMessagesByPriority('critical')).toHaveLength(0);
      expect(queue.getMessagesForWedding('wedding-123')).toHaveLength(0);
    });

    it('should handle null/undefined wedding contexts', () => {
      const messageWithNullWedding: BroadcastMessage = {
        ...createTestBroadcast('normal', 'test.message'),
        weddingContext: undefined,
      };

      expect(() => queue.enqueue(messageWithNullWedding)).not.toThrow();
      expect(queue.size()).toBe(1);
    });

    it('should handle malformed dates in wedding context', () => {
      const messageWithBadDate: BroadcastMessage = {
        ...createTestBroadcast('normal', 'test.message'),
        weddingContext: {
          weddingId: 'wedding-123',
          coupleName: 'Test Couple',
          weddingDate: new Date('invalid-date'),
        },
      };

      // Should not throw, but priority calculation might be affected
      expect(() => queue.enqueue(messageWithBadDate)).not.toThrow();
      expect(queue.size()).toBe(1);
    });
  });
});
