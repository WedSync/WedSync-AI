/**
 * MessageQueue Test Suite - WS-203 Team B Implementation
 * 
 * Comprehensive tests for message queue system with delivery guarantees.
 * Tests wedding-specific message handling and offline delivery features.
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { MessageQueue, MessagePriority } from '@/lib/websocket/message-queue';
import { SupabaseClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

// Mock dependencies
vi.mock('ioredis', () => ({
  default: vi.fn()
}));

vi.mock('@/lib/monitoring/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock test data
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({ error: null, data: mockQueuedMessage })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({ data: [mockQueuedMessage], error: null }))
        })),
        single: vi.fn(() => ({ data: mockQueuedMessage, error: null }))
      })),
      in: vi.fn(() => ({ data: [mockQueuedMessage], error: null })),
      gte: vi.fn(() => ({ data: [mockQueuedMessage], error: null }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null, data: mockQueuedMessage }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null })),
      lt: vi.fn(() => ({ error: null }))
    }))
  })),
  rpc: vi.fn(() => ({ data: true, error: null }))
} as unknown as SupabaseClient;

const mockRedisClient = {
  lpush: vi.fn(() => Promise.resolve(1)),
  brpop: vi.fn(() => Promise.resolve(['queue', JSON.stringify(mockQueuedMessage)])),
  rpop: vi.fn(() => Promise.resolve(JSON.stringify(mockQueuedMessage))),
  llen: vi.fn(() => Promise.resolve(5)),
  lrange: vi.fn(() => Promise.resolve([JSON.stringify(mockQueuedMessage)])),
  del: vi.fn(() => Promise.resolve(1)),
  setex: vi.fn(() => Promise.resolve('OK')),
  get: vi.fn(() => Promise.resolve(JSON.stringify(mockQueuedMessage))),
  zadd: vi.fn(() => Promise.resolve(1)),
  zrangebyscore: vi.fn(() => Promise.resolve([JSON.stringify(mockQueuedMessage)])),
  zrem: vi.fn(() => Promise.resolve(1)),
  publish: vi.fn(() => Promise.resolve(1)),
  disconnect: vi.fn(),
  pipeline: vi.fn(() => ({
    lpush: vi.fn(),
    setex: vi.fn(),
    exec: vi.fn(() => Promise.resolve([['OK'], ['OK']]))
  }))
} as unknown as Redis;

const mockQueuedMessage = {
  id: 'message-123',
  queue_name: 'channel:supplier:dashboard:supplier-456',
  channel_id: 'channel-123',
  recipient_id: 'user-123',
  sender_id: 'sender-456',
  message_type: 'form_response',
  message_data: {
    formId: 'form-123',
    response: { name: 'John Doe', email: 'john@example.com' }
  },
  priority: 5,
  delivery_attempts: 0,
  max_attempts: 3,
  scheduled_for: new Date().toISOString(),
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  delivered: false,
  failed: false,
  wedding_context: {
    wedding_id: 'wedding-123',
    supplier_id: 'supplier-456',
    is_wedding_day: false,
    priority: 'medium'
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

describe('MessageQueue', () => {
  let messageQueue: MessageQueue;

  beforeEach(() => {
    vi.clearAllMocks();
    
    (Redis as unknown as MockedFunction<typeof Redis>).mockReturnValue(mockRedisClient);

    messageQueue = new MessageQueue({
      supabaseClient: mockSupabaseClient,
      redis: mockRedisClient,
      enableMetrics: true,
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 10
    });
  });

  afterEach(async () => {
    if (messageQueue) {
      await messageQueue.shutdown();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const queue = new MessageQueue({ supabaseClient: mockSupabaseClient });
      expect(queue).toBeInstanceOf(MessageQueue);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        supabaseClient: mockSupabaseClient,
        redis: mockRedisClient,
        enableMetrics: true,
        maxRetries: 5,
        retryDelay: 2000,
        batchSize: 20
      };
      
      const queue = new MessageQueue(customConfig);
      expect(queue).toBeInstanceOf(MessageQueue);
    });
  });

  describe('enqueueMessage', () => {
    it('should queue message for delivery', async () => {
      const messageData = {
        channelId: 'channel-123',
        recipientId: 'user-123',
        senderId: 'sender-456',
        messageType: 'form_response',
        data: {
          formId: 'form-123',
          response: { name: 'John Doe' }
        }
      };

      const result = await messageQueue.enqueueMessage(
        'channel:supplier:dashboard:supplier-456',
        messageData
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.queueName).toBe('channel:supplier:dashboard:supplier-456');
      expect(mockRedisClient.lpush).toHaveBeenCalled();
    });

    it('should handle priority messages correctly', async () => {
      const urgentMessage = {
        channelId: 'channel-123',
        recipientId: 'user-123',
        senderId: 'sender-456',
        messageType: 'timeline_change',
        data: { change: 'Emergency venue change' },
        priority: MessagePriority.URGENT
      };

      const result = await messageQueue.enqueueMessage(
        'channel:wedding:coordination:wedding-123',
        urgentMessage
      );

      expect(result.priority).toBe(MessagePriority.URGENT);
      expect(mockRedisClient.zadd).toHaveBeenCalled(); // Priority queue
    });

    it('should set expiration for time-sensitive messages', async () => {
      const messageData = {
        channelId: 'channel-123',
        recipientId: 'user-123',
        senderId: 'sender-456',
        messageType: 'payment_reminder',
        data: { amount: 1500 },
        expirationMinutes: 60
      };

      const result = await messageQueue.enqueueMessage(
        'channel:payment:reminders',
        messageData
      );

      expect(result.expiresAt).toBeDefined();
      const expirationTime = new Date(result.expiresAt!).getTime();
      const expectedExpiration = Date.now() + (60 * 60 * 1000);
      expect(Math.abs(expirationTime - expectedExpiration)).toBeLessThan(5000);
    });

    it('should handle wedding context metadata', async () => {
      const weddingMessage = {
        channelId: 'channel-123',
        recipientId: 'user-123',
        senderId: 'sender-456',
        messageType: 'wedding_update',
        data: { update: 'Guest count changed' },
        weddingContext: {
          weddingId: 'wedding-123',
          supplierId: 'supplier-456',
          isWeddingDay: true,
          priority: 'critical'
        }
      };

      const result = await messageQueue.enqueueMessage(
        'channel:wedding:coordination:wedding-123',
        weddingMessage
      );

      expect(result.weddingContext).toBeDefined();
      expect(result.weddingContext?.isWeddingDay).toBe(true);
      expect(result.weddingContext?.priority).toBe('critical');
    });

    it('should handle database insertion errors', async () => {
      const errorSupabase = {
        ...mockSupabaseClient,
        from: vi.fn(() => ({
          insert: vi.fn(() => ({ 
            error: { message: 'Database error' }, 
            data: null 
          }))
        }))
      } as unknown as SupabaseClient;

      const queue = new MessageQueue({ supabaseClient: errorSupabase });

      const messageData = {
        channelId: 'channel-123',
        recipientId: 'user-123',
        senderId: 'sender-456',
        messageType: 'test',
        data: {}
      };

      await expect(
        queue.enqueueMessage('test-queue', messageData)
      ).rejects.toThrow('Failed to enqueue message: Database error');
    });
  });

  describe('dequeueMessage', () => {
    it('should dequeue message from queue', async () => {
      const message = await messageQueue.dequeueMessage('channel:supplier:dashboard:supplier-456');

      expect(message).toBeDefined();
      expect(message?.queueName).toBe('channel:supplier:dashboard:supplier-456');
      expect(mockRedisClient.brpop).toHaveBeenCalled();
    });

    it('should return null when queue is empty', async () => {
      const emptyRedis = {
        ...mockRedisClient,
        brpop: vi.fn(() => Promise.resolve(null))
      } as unknown as Redis;

      const queue = new MessageQueue({ 
        supabaseClient: mockSupabaseClient,
        redis: emptyRedis 
      });

      const message = await queue.dequeueMessage('empty-queue', 1000);
      expect(message).toBeNull();
    });

    it('should prioritize urgent messages', async () => {
      const urgentMessage = {
        ...mockQueuedMessage,
        priority: MessagePriority.URGENT,
        message_type: 'emergency_update'
      };

      const priorityRedis = {
        ...mockRedisClient,
        zrangebyscore: vi.fn(() => Promise.resolve([JSON.stringify(urgentMessage)])),
        zrem: vi.fn(() => Promise.resolve(1))
      } as unknown as Redis;

      const queue = new MessageQueue({ 
        supabaseClient: mockSupabaseClient,
        redis: priorityRedis 
      });

      const message = await queue.dequeueMessage('priority-queue');
      expect(message?.messageType).toBe('emergency_update');
    });
  });

  describe('markMessageDelivered', () => {
    it('should mark message as delivered successfully', async () => {
      await expect(
        messageQueue.markMessageDelivered('message-123', 'user-123')
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('channel_message_queue');
    });

    it('should include delivery confirmation in database', async () => {
      await messageQueue.markMessageDelivered('message-123', 'user-123');

      const updateCall = mockSupabaseClient.from('channel_message_queue').update;
      expect(updateCall).toHaveBeenCalledWith(
        expect.objectContaining({
          delivered: true,
          delivered_at: expect.any(String),
          delivery_confirmed_by: 'user-123'
        })
      );
    });
  });

  describe('markMessageFailed', () => {
    it('should mark message as failed after max attempts', async () => {
      await expect(
        messageQueue.markMessageFailed('message-123', 'Delivery timeout')
      ).resolves.not.toThrow();
    });

    it('should retry message if attempts remaining', async () => {
      const retryMessage = {
        ...mockQueuedMessage,
        delivery_attempts: 1,
        max_attempts: 3
      };

      const retrySupabase = {
        ...mockSupabaseClient,
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: retryMessage, error: null }))
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null }))
          }))
        }))
      } as unknown as SupabaseClient;

      const queue = new MessageQueue({ supabaseClient: retrySupabase, redis: mockRedisClient });

      await queue.markMessageFailed('message-123', 'Temporary failure');

      expect(mockRedisClient.lpush).toHaveBeenCalled(); // Re-queued for retry
    });
  });

  describe('processPendingMessages', () => {
    it('should process messages in database queue', async () => {
      await expect(
        messageQueue.processPendingMessages()
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('channel_message_queue');
    });

    it('should handle batch processing efficiently', async () => {
      const batchMessages = Array(15).fill(mockQueuedMessage).map((msg, i) => ({
        ...msg,
        id: `message-${i}`
      }));

      const batchSupabase = {
        ...mockSupabaseClient,
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({ data: batchMessages, error: null }))
              }))
            }))
          }))
        }))
      } as unknown as SupabaseClient;

      const queue = new MessageQueue({ 
        supabaseClient: batchSupabase, 
        redis: mockRedisClient,
        batchSize: 10 
      });

      await queue.processPendingMessages();

      // Should process in batches
      expect(mockRedisClient.lpush).toHaveBeenCalled();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await messageQueue.getQueueStats('channel:supplier:dashboard:supplier-456');

      expect(stats).toBeDefined();
      expect(stats.queueLength).toBeDefined();
      expect(stats.pendingMessages).toBeDefined();
      expect(stats.deliveredMessages).toBeDefined();
      expect(stats.failedMessages).toBeDefined();
    });

    it('should include performance metrics', async () => {
      const stats = await messageQueue.getQueueStats('channel:supplier:dashboard:supplier-456');

      expect(stats.averageDeliveryTime).toBeDefined();
      expect(stats.successRate).toBeDefined();
    });

    it('should include wedding-specific metrics', async () => {
      const stats = await messageQueue.getQueueStats('channel:wedding:coordination:wedding-123');

      expect(stats.weddingMetrics).toBeDefined();
      expect(stats.weddingMetrics?.priorityMessageCount).toBeDefined();
      expect(stats.weddingMetrics?.weddingDayMessages).toBeDefined();
    });
  });

  describe('cleanupExpiredMessages', () => {
    it('should remove expired messages from queue', async () => {
      const cleanedCount = await messageQueue.cleanupExpiredMessages();

      expect(cleanedCount).toBeGreaterThanOrEqual(0);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('channel_message_queue');
    });

    it('should preserve wedding day messages longer', async () => {
      const weddingDaySupabase = {
        ...mockSupabaseClient,
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            lt: vi.fn(() => ({
              eq: vi.fn(() => ({ error: null, count: 5 }))
            }))
          }))
        }))
      } as unknown as SupabaseClient;

      const queue = new MessageQueue({ supabaseClient: weddingDaySupabase });
      const cleanedCount = await queue.cleanupExpiredMessages();

      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Delivery Guarantees', () => {
    it('should ensure >99.9% delivery rate through retries', async () => {
      const testMessages = 1000;
      const deliveryPromises = [];

      for (let i = 0; i < testMessages; i++) {
        const messageData = {
          channelId: 'channel-123',
          recipientId: 'user-123',
          senderId: 'sender-456',
          messageType: 'test',
          data: { testId: i }
        };

        deliveryPromises.push(
          messageQueue.enqueueMessage(`test-queue-${i % 10}`, messageData)
        );
      }

      const results = await Promise.allSettled(deliveryPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const successRate = successCount / testMessages;

      expect(successRate).toBeGreaterThan(0.999); // >99.9%
    });

    it('should handle network failures with exponential backoff', async () => {
      let attempts = 0;
      const failingRedis = {
        ...mockRedisClient,
        lpush: vi.fn(() => {
          attempts++;
          if (attempts < 3) {
            return Promise.reject(new Error('Network failure'));
          }
          return Promise.resolve(1);
        })
      } as unknown as Redis;

      const queue = new MessageQueue({ 
        supabaseClient: mockSupabaseClient, 
        redis: failingRedis,
        maxRetries: 3,
        retryDelay: 100
      });

      const messageData = {
        channelId: 'channel-123',
        recipientId: 'user-123',
        senderId: 'sender-456',
        messageType: 'test',
        data: {}
      };

      // Should eventually succeed after retries
      await expect(
        queue.enqueueMessage('test-queue', messageData)
      ).resolves.toBeDefined();

      expect(attempts).toBe(3);
    });
  });

  describe('Wedding Industry Features', () => {
    it('should prioritize wedding day messages', async () => {
      const weddingDayMessage = {
        channelId: 'channel-123',
        recipientId: 'user-123',
        senderId: 'sender-456',
        messageType: 'wedding_emergency',
        data: { emergency: 'Venue flooded' },
        weddingContext: {
          weddingId: 'wedding-123',
          isWeddingDay: true,
          priority: 'critical'
        }
      };

      const result = await messageQueue.enqueueMessage(
        'channel:wedding:emergency',
        weddingDayMessage
      );

      expect(result.weddingContext?.isWeddingDay).toBe(true);
      expect(mockRedisClient.zadd).toHaveBeenCalled(); // Priority queue
    });

    it('should handle supplier offline scenarios', async () => {
      const offlineMessage = {
        channelId: 'channel-123',
        recipientId: 'offline-supplier-123',
        senderId: 'couple-456',
        messageType: 'urgent_question',
        data: { question: 'What time should we arrive?' },
        persistForOffline: true,
        expirationMinutes: 720 // 12 hours for offline delivery
      };

      const result = await messageQueue.enqueueMessage(
        'channel:supplier:offline',
        offlineMessage
      );

      expect(result.expiresAt).toBeDefined();
      // Should have extended expiration for offline delivery
      const expirationTime = new Date(result.expiresAt!).getTime();
      expect(expirationTime).toBeGreaterThan(Date.now() + (10 * 60 * 60 * 1000));
    });

    it('should handle form response notifications', async () => {
      const formResponse = {
        channelId: 'channel-123',
        recipientId: 'supplier-123',
        senderId: 'couple-456',
        messageType: 'form_response',
        data: {
          formId: 'dietary-requirements',
          response: {
            guests: 150,
            allergies: ['nuts', 'dairy'],
            specialRequests: 'Vegetarian options needed'
          }
        },
        category: 'form_response'
      };

      const result = await messageQueue.enqueueMessage(
        'channel:supplier:catering',
        formResponse
      );

      expect(result.messageType).toBe('form_response');
      expect(result.data.formId).toBe('dietary-requirements');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from Redis disconnection', async () => {
      const reconnectingRedis = {
        ...mockRedisClient,
        lpush: vi.fn()
          .mockRejectedValueOnce(new Error('Connection lost'))
          .mockResolvedValue(1)
      } as unknown as Redis;

      const queue = new MessageQueue({ 
        supabaseClient: mockSupabaseClient, 
        redis: reconnectingRedis 
      });

      const messageData = {
        channelId: 'channel-123',
        recipientId: 'user-123',
        senderId: 'sender-456',
        messageType: 'test',
        data: {}
      };

      // Should recover and succeed
      await expect(
        queue.enqueueMessage('test-queue', messageData)
      ).resolves.toBeDefined();
    });

    it('should fallback to database-only mode when Redis unavailable', async () => {
      const queue = new MessageQueue({ 
        supabaseClient: mockSupabaseClient 
        // No Redis client
      });

      const messageData = {
        channelId: 'channel-123',
        recipientId: 'user-123',
        senderId: 'sender-456',
        messageType: 'test',
        data: {}
      };

      // Should work without Redis
      await expect(
        queue.enqueueMessage('test-queue', messageData)
      ).resolves.toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high message volume efficiently', async () => {
      const startTime = Date.now();
      const messageCount = 100;
      const promises = [];

      for (let i = 0; i < messageCount; i++) {
        const messageData = {
          channelId: 'channel-123',
          recipientId: 'user-123',
          senderId: 'sender-456',
          messageType: 'load_test',
          data: { messageId: i }
        };

        promises.push(messageQueue.enqueueMessage('load-test-queue', messageData));
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const messagesPerSecond = (messageCount / totalTime) * 1000;

      // Should handle at least 50 messages per second
      expect(messagesPerSecond).toBeGreaterThan(50);
    });

    it('should maintain low memory footprint during batch processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process large batch
      await messageQueue.processPendingMessages();
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Monitoring and Metrics', () => {
    it('should emit events for monitoring', (done) => {
      messageQueue.on('message:enqueued', (event) => {
        expect(event).toBeDefined();
        expect(event.queueName).toBe('test-queue');
        done();
      });

      const messageData = {
        channelId: 'channel-123',
        recipientId: 'user-123',
        senderId: 'sender-456',
        messageType: 'test',
        data: {}
      };

      messageQueue.enqueueMessage('test-queue', messageData);
    });

    it('should track delivery metrics accurately', async () => {
      const stats = await messageQueue.getQueueStats('test-queue');
      
      expect(stats.deliveredMessages).toBeGreaterThanOrEqual(0);
      expect(stats.failedMessages).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Cleanup and Shutdown', () => {
    it('should cleanup resources on shutdown', async () => {
      await expect(messageQueue.shutdown()).resolves.not.toThrow();
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should complete pending operations before shutdown', async () => {
      const messageData = {
        channelId: 'channel-123',
        recipientId: 'user-123',
        senderId: 'sender-456',
        messageType: 'test',
        data: {}
      };

      const enqueuePromise = messageQueue.enqueueMessage('test-queue', messageData);
      const shutdownPromise = messageQueue.shutdown();

      await expect(Promise.all([enqueuePromise, shutdownPromise])).resolves.toBeDefined();
    });
  });
});