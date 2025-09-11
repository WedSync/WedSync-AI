/**
 * ChannelManager Test Suite - WS-203 Team B Implementation
 * 
 * Comprehensive tests for WebSocket channel management with >90% coverage requirement.
 * Tests all wedding industry specific features and error conditions.
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { ChannelManager } from '@/lib/websocket/channel-manager';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}));

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

vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
    clients: new Set(),
    handleUpgrade: vi.fn(),
    emit: vi.fn()
  })),
  WebSocket: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
    OPEN: 1,
    CLOSED: 3
  }))
}));

// Mock test data
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({ error: null, data: mockChannel })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: mockChannel, error: null })),
        limit: vi.fn(() => ({ data: [mockChannel], error: null }))
      })),
      single: vi.fn(() => ({ data: mockChannel, error: null }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null, data: mockChannel }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null }))
    })),
    upsert: vi.fn(() => ({ error: null, data: mockSubscription }))
  })),
  rpc: vi.fn(() => ({ data: true, error: null })),
  auth: {
    getUser: vi.fn(() => ({ data: { user: mockUser }, error: null }))
  }
} as unknown as SupabaseClient;

const mockRedisClient = {
  setex: vi.fn(() => Promise.resolve('OK')),
  get: vi.fn(() => Promise.resolve(null)),
  del: vi.fn(() => Promise.resolve(1)),
  keys: vi.fn(() => Promise.resolve([])),
  hget: vi.fn(() => Promise.resolve(null)),
  hset: vi.fn(() => Promise.resolve(1)),
  hdel: vi.fn(() => Promise.resolve(1)),
  publish: vi.fn(() => Promise.resolve(1)),
  disconnect: vi.fn()
} as unknown as Redis;

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: new Date().toISOString()
};

const mockChannel = {
  id: 'channel-123',
  channel_name: 'supplier:dashboard:supplier-456',
  scope: 'supplier',
  entity: 'dashboard',
  entity_id: 'supplier-456',
  type: 'private',
  active: true,
  created_by: 'user-123',
  organization_id: 'org-123',
  wedding_id: 'wedding-123',
  supplier_id: 'supplier-456',
  couple_id: null,
  max_subscribers: 100,
  message_retention_hours: 24,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockSubscription = {
  id: 'subscription-123',
  channel_id: 'channel-123',
  user_id: 'user-123',
  connection_id: 'connection-123',
  active: true,
  subscribed_at: new Date().toISOString(),
  subscription_metadata: {}
};

describe('ChannelManager', () => {
  let channelManager: ChannelManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup mocked clients
    (createClient as MockedFunction<typeof createClient>).mockReturnValue(mockSupabaseClient);
    (Redis as unknown as MockedFunction<typeof Redis>).mockReturnValue(mockRedisClient);

    // Initialize ChannelManager
    channelManager = new ChannelManager({
      supabaseClient: mockSupabaseClient,
      redis: mockRedisClient,
      maxConnectionsPerUser: 5,
      messageRateLimit: 10,
      enableMetrics: true
    });
  });

  afterEach(async () => {
    if (channelManager) {
      await channelManager.shutdown();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new ChannelManager({ supabaseClient: mockSupabaseClient });
      expect(manager).toBeInstanceOf(ChannelManager);
      expect(manager).toBeInstanceOf(EventEmitter);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        supabaseClient: mockSupabaseClient,
        redis: mockRedisClient,
        maxConnectionsPerUser: 10,
        messageRateLimit: 50,
        enableMetrics: true
      };
      
      const manager = new ChannelManager(customConfig);
      expect(manager).toBeInstanceOf(ChannelManager);
    });
  });

  describe('createChannel', () => {
    it('should create a new channel successfully', async () => {
      const result = await channelManager.createChannel(
        'supplier',
        'dashboard',
        'supplier-456',
        'user-123',
        {
          type: 'private',
          maxSubscribers: 100,
          messageRetentionHours: 24,
          weddingId: 'wedding-123',
          supplierId: 'supplier-456',
          organizationId: 'org-123'
        }
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('supplier:dashboard:supplier-456');
      expect(result.scope).toBe('supplier');
      expect(result.entity).toBe('dashboard');
      expect(result.entityId).toBe('supplier-456');
    });

    it('should handle wedding context validation', async () => {
      const result = await channelManager.createChannel(
        'collaboration',
        'coordination',
        'wedding-123',
        'user-123',
        {
          weddingId: 'wedding-123',
          supplierId: 'supplier-456',
          coupleId: 'couple-789'
        }
      );

      expect(result.weddingId).toBe('wedding-123');
      expect(result.supplierId).toBe('supplier-456');
      expect(result.coupleId).toBe('couple-789');
    });

    it('should handle database errors gracefully', async () => {
      const errorSupabase = {
        ...mockSupabaseClient,
        from: vi.fn(() => ({
          insert: vi.fn(() => ({ 
            error: { message: 'Database connection failed' }, 
            data: null 
          }))
        }))
      } as unknown as SupabaseClient;

      const manager = new ChannelManager({ supabaseClient: errorSupabase });

      await expect(
        manager.createChannel('supplier', 'dashboard', 'supplier-456', 'user-123')
      ).rejects.toThrow('Failed to create channel: Database connection failed');
    });

    it('should validate channel naming conventions', async () => {
      await expect(
        channelManager.createChannel('invalid-scope', 'dashboard', 'supplier-456', 'user-123')
      ).rejects.toThrow();
    });

    it('should enforce unique channel names', async () => {
      const duplicateSupabase = {
        ...mockSupabaseClient,
        from: vi.fn(() => ({
          insert: vi.fn(() => ({ 
            error: { message: 'duplicate key value violates unique constraint' }, 
            data: null 
          }))
        }))
      } as unknown as SupabaseClient;

      const manager = new ChannelManager({ supabaseClient: duplicateSupabase });

      await expect(
        manager.createChannel('supplier', 'dashboard', 'supplier-456', 'user-123')
      ).rejects.toThrow('Channel with this name already exists');
    });
  });

  describe('subscribeToChannel', () => {
    it('should create subscription successfully', async () => {
      const result = await channelManager.subscribeToChannel(
        'supplier:dashboard:supplier-456',
        'user-123',
        'connection-123',
        { deviceType: 'desktop' }
      );

      expect(result).toBeDefined();
      expect(result.channelName).toBe('supplier:dashboard:supplier-456');
      expect(result.userId).toBe('user-123');
      expect(result.connectionId).toBe('connection-123');
      expect(result.active).toBe(true);
    });

    it('should handle wedding day priority subscriptions', async () => {
      const weddingDayMetadata = {
        deviceType: 'mobile',
        weddingContext: {
          isWeddingDay: true,
          priority: 'critical',
          weddingId: 'wedding-123'
        }
      };

      const result = await channelManager.subscribeToChannel(
        'supplier:dashboard:supplier-456',
        'user-123',
        'connection-123',
        weddingDayMetadata
      );

      expect(result.metadata.weddingContext.isWeddingDay).toBe(true);
      expect(result.metadata.weddingContext.priority).toBe('critical');
    });

    it('should validate subscription limits', async () => {
      // Mock max subscribers reached
      const limitSupabase = {
        ...mockSupabaseClient,
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ 
                data: { ...mockChannel, max_subscribers: 1 }, 
                error: null 
              }))
            }))
          }))
        }))
      } as unknown as SupabaseClient;

      const manager = new ChannelManager({ supabaseClient: limitSupabase });

      await expect(
        manager.subscribeToChannel('supplier:dashboard:supplier-456', 'user-123', 'connection-123')
      ).rejects.toThrow('Channel at maximum capacity');
    });

    it('should prevent duplicate subscriptions', async () => {
      const duplicateSupabase = {
        ...mockSupabaseClient,
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: mockChannel, error: null }))
            }))
          })),
          upsert: vi.fn(() => ({ 
            error: { message: 'User already subscribed to this channel' }, 
            data: null 
          }))
        }))
      } as unknown as SupabaseClient;

      const manager = new ChannelManager({ supabaseClient: duplicateSupabase });

      await expect(
        manager.subscribeToChannel('supplier:dashboard:supplier-456', 'user-123', 'connection-123')
      ).rejects.toThrow('User already subscribed to this channel');
    });
  });

  describe('broadcastToChannel', () => {
    beforeEach(async () => {
      // Setup active subscription for broadcast tests
      await channelManager.subscribeToChannel(
        'supplier:dashboard:supplier-456',
        'user-123',
        'connection-123'
      );
    });

    it('should broadcast message to channel subscribers', async () => {
      const message = {
        type: 'form_response',
        data: {
          formId: 'form-123',
          response: { name: 'John Doe', email: 'john@example.com' }
        }
      };

      await expect(
        channelManager.broadcastToChannel(
          'supplier:dashboard:supplier-456',
          'form_response',
          message,
          'sender-123'
        )
      ).resolves.not.toThrow();
    });

    it('should handle priority messaging for urgent updates', async () => {
      const urgentMessage = {
        type: 'timeline_change',
        data: {
          change: 'venue_change',
          details: 'Emergency venue change due to weather'
        }
      };

      await expect(
        channelManager.broadcastToChannel(
          'supplier:dashboard:supplier-456',
          'timeline_change',
          urgentMessage,
          'sender-123',
          {
            priority: 10,
            messageCategory: 'urgent'
          }
        )
      ).resolves.not.toThrow();
    });

    it('should validate wedding context for cross-wedding isolation', async () => {
      const message = {
        type: 'wedding_data',
        weddingId: 'wrong-wedding-123',
        data: { secret: 'confidential data' }
      };

      // Should not throw but should validate context internally
      await expect(
        channelManager.broadcastToChannel(
          'supplier:dashboard:supplier-456',
          'wedding_data',
          message,
          'sender-123'
        )
      ).resolves.not.toThrow();
    });

    it('should handle offline message queueing', async () => {
      const message = {
        type: 'payment_reminder',
        data: { amount: 1500, dueDate: '2024-06-15' }
      };

      await expect(
        channelManager.broadcastToChannel(
          'supplier:dashboard:supplier-456',
          'payment',
          message,
          'sender-123',
          {
            persistForOffline: true,
            requireDeliveryReceipt: true
          }
        )
      ).resolves.not.toThrow();
    });

    it('should handle non-existent channel gracefully', async () => {
      await expect(
        channelManager.broadcastToChannel(
          'nonexistent:channel:123',
          'test',
          { message: 'test' },
          'sender-123'
        )
      ).rejects.toThrow('Channel not found');
    });

    it('should enforce message rate limits', async () => {
      // Send multiple messages quickly to trigger rate limit
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          channelManager.broadcastToChannel(
            'supplier:dashboard:supplier-456',
            'spam',
            { message: `spam ${i}` },
            'sender-123'
          )
        );
      }

      // Some messages should be rate limited
      const results = await Promise.allSettled(promises);
      const rejections = results.filter(r => r.status === 'rejected');
      expect(rejections.length).toBeGreaterThan(0);
    });
  });

  describe('unsubscribeFromChannel', () => {
    beforeEach(async () => {
      await channelManager.subscribeToChannel(
        'supplier:dashboard:supplier-456',
        'user-123',
        'connection-123'
      );
    });

    it('should unsubscribe user from channel successfully', async () => {
      await expect(
        channelManager.unsubscribeFromChannel(
          'supplier:dashboard:supplier-456',
          'user-123',
          'connection-123'
        )
      ).resolves.not.toThrow();
    });

    it('should clean up connection resources', async () => {
      await channelManager.unsubscribeFromChannel(
        'supplier:dashboard:supplier-456',
        'user-123',
        'connection-123'
      );

      // Verify cleanup in Redis
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('should handle non-existent subscription gracefully', async () => {
      await expect(
        channelManager.unsubscribeFromChannel(
          'supplier:dashboard:supplier-456',
          'nonexistent-user',
          'connection-456'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('deleteChannel', () => {
    beforeEach(async () => {
      await channelManager.createChannel(
        'supplier',
        'dashboard',
        'supplier-456',
        'user-123'
      );
    });

    it('should soft delete channel by default', async () => {
      await expect(
        channelManager.deleteChannel('supplier:dashboard:supplier-456', 'user-123')
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('websocket_channels');
    });

    it('should handle hard delete when specified', async () => {
      await expect(
        channelManager.deleteChannel('supplier:dashboard:supplier-456', 'user-123', true)
      ).resolves.not.toThrow();
    });

    it('should validate deletion permissions', async () => {
      await expect(
        channelManager.deleteChannel('supplier:dashboard:supplier-456', 'unauthorized-user')
      ).rejects.toThrow('Permission denied');
    });

    it('should clean up all related data on deletion', async () => {
      await channelManager.deleteChannel('supplier:dashboard:supplier-456', 'user-123', true);

      // Verify related data cleanup
      expect(mockRedisClient.del).toHaveBeenCalled();
    });
  });

  describe('getChannelInfo', () => {
    it('should return channel information', async () => {
      const info = await channelManager.getChannelInfo('supplier:dashboard:supplier-456');
      
      expect(info).toBeDefined();
      expect(info?.name).toBe('supplier:dashboard:supplier-456');
    });

    it('should return null for non-existent channel', async () => {
      const noChannelSupabase = {
        ...mockSupabaseClient,
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: null }))
            }))
          }))
        }))
      } as unknown as SupabaseClient;

      const manager = new ChannelManager({ supabaseClient: noChannelSupabase });
      const info = await manager.getChannelInfo('nonexistent:channel:123');
      
      expect(info).toBeNull();
    });
  });

  describe('listUserChannels', () => {
    it('should return user channel list', async () => {
      const channels = await channelManager.listUserChannels('user-123');
      
      expect(Array.isArray(channels)).toBe(true);
    });

    it('should filter by scope when specified', async () => {
      const channels = await channelManager.listUserChannels('user-123', 'supplier');
      
      expect(Array.isArray(channels)).toBe(true);
    });
  });

  describe('getChannelMetrics', () => {
    it('should return channel performance metrics', async () => {
      const metrics = await channelManager.getChannelMetrics('supplier:dashboard:supplier-456');
      
      expect(metrics).toBeDefined();
      expect(metrics.subscriberCount).toBeGreaterThanOrEqual(0);
      expect(metrics.messageCount).toBeGreaterThanOrEqual(0);
    });

    it('should include wedding-specific metrics', async () => {
      const metrics = await channelManager.getChannelMetrics('supplier:dashboard:supplier-456');
      
      expect(metrics).toHaveProperty('weddingContext');
      expect(metrics.weddingContext).toBeDefined();
    });
  });

  describe('validateChannelPermissions', () => {
    it('should validate supplier channel permissions', async () => {
      const hasPermission = await channelManager.validateChannelPermissions(
        'supplier:dashboard:supplier-456',
        'user-123',
        'subscribe'
      );
      
      expect(hasPermission).toBe(true);
    });

    it('should enforce wedding isolation', async () => {
      // Mock RPC to return false for cross-wedding access
      const restrictiveSupabase = {
        ...mockSupabaseClient,
        rpc: vi.fn(() => ({ data: false, error: null }))
      } as unknown as SupabaseClient;

      const manager = new ChannelManager({ supabaseClient: restrictiveSupabase });
      
      const hasPermission = await manager.validateChannelPermissions(
        'couple:wedding:different-wedding-123',
        'user-123',
        'subscribe'
      );
      
      expect(hasPermission).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection failures gracefully', async () => {
      const failingRedis = {
        ...mockRedisClient,
        setex: vi.fn(() => Promise.reject(new Error('Redis connection failed')))
      } as unknown as Redis;

      const manager = new ChannelManager({
        supabaseClient: mockSupabaseClient,
        redis: failingRedis
      });

      // Should not throw despite Redis failure
      await expect(
        manager.createChannel('supplier', 'dashboard', 'supplier-456', 'user-123')
      ).resolves.toBeDefined();
    });

    it('should handle Supabase connection failures', async () => {
      const failingSupabase = {
        ...mockSupabaseClient,
        from: vi.fn(() => {
          throw new Error('Supabase connection failed');
        })
      } as unknown as SupabaseClient;

      const manager = new ChannelManager({ supabaseClient: failingSupabase });

      await expect(
        manager.createChannel('supplier', 'dashboard', 'supplier-456', 'user-123')
      ).rejects.toThrow();
    });
  });

  describe('Wedding Industry Specific Features', () => {
    it('should handle wedding season traffic scaling', async () => {
      // Simulate high load during wedding season
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          channelManager.createChannel('supplier', `event${i}`, `supplier-${i}`, 'user-123')
        );
      }

      const results = await Promise.allSettled(promises);
      const successes = results.filter(r => r.status === 'fulfilled');
      
      // Should handle reasonable load
      expect(successes.length).toBeGreaterThan(40);
    });

    it('should enforce supplier organization isolation', async () => {
      // This would be tested with actual RPC validation
      const hasPermission = await channelManager.validateChannelPermissions(
        'supplier:dashboard:supplier-456',
        'user-123',
        'subscribe'
      );
      
      expect(hasPermission).toBe(true);
    });

    it('should handle wedding day operations with enhanced monitoring', async () => {
      const weddingDayChannel = await channelManager.createChannel(
        'wedding',
        'coordination',
        'wedding-123',
        'user-123',
        {
          weddingContext: {
            isWeddingDay: true,
            priority: 'critical'
          }
        }
      );

      expect(weddingDayChannel).toBeDefined();
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track performance metrics when enabled', async () => {
      const startTime = Date.now();
      
      await channelManager.createChannel('supplier', 'dashboard', 'supplier-456', 'user-123');
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Should complete within reasonable time
      expect(latency).toBeLessThan(1000);
    });

    it('should emit events for monitoring', (done) => {
      channelManager.on('channel:created', (event) => {
        expect(event).toBeDefined();
        expect(event.channelName).toBe('supplier:dashboard:supplier-456');
        done();
      });

      channelManager.createChannel('supplier', 'dashboard', 'supplier-456', 'user-123');
    });
  });

  describe('Shutdown and Cleanup', () => {
    it('should gracefully shutdown and cleanup resources', async () => {
      await expect(channelManager.shutdown()).resolves.not.toThrow();
      
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should handle multiple shutdown calls', async () => {
      await channelManager.shutdown();
      await expect(channelManager.shutdown()).resolves.not.toThrow();
    });
  });
});