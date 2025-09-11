import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { POST as createChannel } from '@/app/api/websocket/channels/create/route';
import { POST as subscribe } from '@/app/api/websocket/channels/subscribe/route';
import { POST as unsubscribe } from '@/app/api/websocket/channels/unsubscribe/route';
import { POST as broadcast } from '@/app/api/websocket/channels/broadcast/route';
import { GET as healthCheck } from '@/app/api/websocket/health/route';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock Redis
const mockRedis = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  hset: vi.fn(),
  hget: vi.fn(),
  hdel: vi.fn(),
  expire: vi.fn(),
  zadd: vi.fn(),
  zrange: vi.fn(),
  zrem: vi.fn(),
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
};

vi.mock('@/lib/redis', () => ({
  redis: mockRedis,
}));

// Mock rate limiting
vi.mock('@/lib/rate-limit', () => ({
  rateLimitService: {
    checkLimit: vi.fn(() => Promise.resolve(true)),
    resetLimits: vi.fn(() => Promise.resolve()),
  },
}));

// Mock WebSocket security validator
vi.mock('@/lib/websocket/security-validator', () => ({
  WebSocketSecurityValidator: class {
    async validateRequest() {
      return {
        isValid: true,
        sanitizedData: {},
        securityScore: 95,
      };
    }
  },
}));

describe('WebSocket API Endpoints Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'vendor@example.com',
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Wedding Venue',
    subscription_tier: 'professional',
    owner_id: 'user-123',
  };

  const mockWedding = {
    id: 'wedding-123',
    organization_id: 'org-123',
    wedding_date: '2025-06-15',
    couple_names: 'John & Jane',
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default auth mock
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Setup default organization lookup
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'organizations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: mockOrganization,
                error: null,
              })),
            })),
          })),
        };
      }
      
      if (table === 'wedding_core_data') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: mockWedding,
                error: null,
              })),
            })),
          })),
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'channel-123' },
              error: null,
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'channel-123' },
                error: null,
              })),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Channel Creation API', () => {
    it('should create wedding channel successfully', async () => {
      const channelData = {
        name: 'wedding:main:wedding-123',
        type: 'wedding',
        wedding_id: 'wedding-123',
        description: 'Main wedding communication channel',
        permissions: {
          read: ['vendor', 'couple'],
          write: ['vendor'],
          admin: ['vendor'],
        },
      };

      const request = new NextRequest('http://localhost:3000/api/websocket/channels/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelData),
      });

      const response = await createChannel(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('channel_id');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('websocket_channels');
    });

    it('should reject channel creation for unauthorized user', async () => {
      // Mock auth failure
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      });

      const request = new NextRequest('http://localhost:3000/api/websocket/channels/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'wedding:main:wedding-123',
          type: 'wedding',
          wedding_id: 'wedding-123',
        }),
      });

      const response = await createChannel(request);
      expect(response.status).toBe(401);
    });

    it('should enforce subscription tier limits', async () => {
      // Mock starter tier organization
      const starterOrg = { ...mockOrganization, subscription_tier: 'starter' };
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: starterOrg,
                  error: null,
                })),
              })),
            })),
          };
        }
        return mockSupabaseClient.from(table);
      });

      // Mock existing channel count exceeding limit
      mockSupabaseClient.rpc.mockResolvedValue({
        data: 15, // Exceeds starter limit of 10
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/websocket/channels/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'wedding:extra:wedding-123',
          type: 'wedding',
          wedding_id: 'wedding-123',
        }),
      });

      const response = await createChannel(request);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.error).toContain('subscription tier limit');
    });
  });

  describe('Channel Subscription API', () => {
    it('should subscribe to channel successfully', async () => {
      const subscriptionData = {
        channel_id: 'channel-123',
        connection_id: 'conn-456',
        permissions: ['read', 'write'],
      };

      const request = new NextRequest('http://localhost:3000/api/websocket/channels/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionData),
      });

      const response = await subscribe(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('websocket_subscriptions');
      expect(mockRedis.hset).toHaveBeenCalled();
    });

    it('should validate wedding context isolation', async () => {
      // Mock user from different organization
      const differentUser = { id: 'user-456', email: 'other@example.com' };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: differentUser },
        error: null,
      });

      // Mock different organization
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: { ...mockOrganization, id: 'org-456', owner_id: 'user-456' },
                  error: null,
                })),
              })),
            })),
          };
        }
        return mockSupabaseClient.from(table);
      });

      const request = new NextRequest('http://localhost:3000/api/websocket/channels/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: 'channel-123',
          connection_id: 'conn-456',
        }),
      });

      const response = await subscribe(request);
      expect(response.status).toBe(403);
    });

    it('should deliver historical messages on subscription', async () => {
      // Mock historical messages
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'websocket_messages') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({
                    data: [
                      {
                        id: 'msg-1',
                        content: 'Welcome to the channel',
                        created_at: new Date().toISOString(),
                      },
                    ],
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        return mockSupabaseClient.from(table);
      });

      const request = new NextRequest('http://localhost:3000/api/websocket/channels/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: 'channel-123',
          connection_id: 'conn-456',
          include_history: true,
        }),
      });

      const response = await subscribe(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.historical_messages).toHaveLength(1);
    });
  });

  describe('Message Broadcasting API', () => {
    it('should broadcast message to all subscribers', async () => {
      // Mock active subscribers
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'websocket_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  data: [
                    { connection_id: 'conn-1', user_id: 'user-1' },
                    { connection_id: 'conn-2', user_id: 'user-2' },
                  ],
                  error: null,
                })),
              })),
            })),
          };
        }
        return mockSupabaseClient.from(table);
      });

      const messageData = {
        channel_id: 'channel-123',
        content: 'Wedding update: Venue confirmed!',
        type: 'timeline_change',
        priority: 'high',
        wedding_context: {
          wedding_id: 'wedding-123',
          event_date: '2025-06-15',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/websocket/channels/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      const response = await broadcast(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.delivered_count).toBe(2);
      expect(mockRedis.publish).toHaveBeenCalledTimes(2);
    });

    it('should queue messages for offline users', async () => {
      // Mock offline subscribers
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'websocket_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  data: [
                    { connection_id: 'offline-conn-1', user_id: 'offline-user-1' },
                  ],
                  error: null,
                })),
              })),
            })),
          };
        }
        return mockSupabaseClient.from(table);
      });

      // Mock connection as offline
      mockRedis.hget.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/websocket/channels/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: 'channel-123',
          content: 'Urgent: Payment required',
          type: 'payment',
          priority: 'urgent',
        }),
      });

      const response = await broadcast(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.queued_count).toBe(1);
      expect(mockRedis.zadd).toHaveBeenCalled(); // Queued for offline delivery
    });

    it('should respect wedding day priority', async () => {
      // Set wedding date to today (wedding day)
      const today = new Date().toISOString().split('T')[0];
      const weddingToday = { ...mockWedding, wedding_date: today };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'wedding_core_data') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: weddingToday,
                  error: null,
                })),
              })),
            })),
          };
        }
        return mockSupabaseClient.from(table);
      });

      const request = new NextRequest('http://localhost:3000/api/websocket/channels/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: 'channel-123',
          content: 'Wedding day update',
          type: 'urgent',
          priority: 'high',
          wedding_context: {
            wedding_id: 'wedding-123',
            event_date: today,
          },
        }),
      });

      const response = await broadcast(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.wedding_day_priority).toBe(true);
    });
  });

  describe('Channel Unsubscription API', () => {
    it('should unsubscribe from channel successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/websocket/channels/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: 'channel-123',
          connection_id: 'conn-456',
        }),
      });

      const response = await unsubscribe(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('websocket_subscriptions');
      expect(mockRedis.hdel).toHaveBeenCalled();
    });

    it('should clean up offline message queues', async () => {
      const request = new NextRequest('http://localhost:3000/api/websocket/channels/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: 'channel-123',
          connection_id: 'conn-456',
          cleanup_queues: true,
        }),
      });

      const response = await unsubscribe(request);
      expect(response.status).toBe(200);
      expect(mockRedis.zrem).toHaveBeenCalled(); // Queue cleanup
    });
  });

  describe('Health Check API', () => {
    it('should return system health status', async () => {
      // Mock connection metrics
      mockRedis.hget.mockImplementation((key: string) => {
        if (key.includes('connections:count')) return Promise.resolve('150');
        if (key.includes('health:score')) return Promise.resolve('98');
        return Promise.resolve('0');
      });

      const request = new NextRequest('http://localhost:3000/api/websocket/health');
      const response = await healthCheck(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.status).toBe('healthy');
      expect(result.metrics).toHaveProperty('active_connections');
      expect(result.metrics).toHaveProperty('system_health_score');
    });

    it('should detect wedding day traffic patterns', async () => {
      // Mock high wedding day traffic
      mockRedis.hget.mockImplementation((key: string) => {
        if (key.includes('connections:count')) return Promise.resolve('500'); // High traffic
        if (key.includes('wedding_day:active')) return Promise.resolve('15'); // Multiple weddings today
        return Promise.resolve('95');
      });

      const request = new NextRequest('http://localhost:3000/api/websocket/health');
      const response = await healthCheck(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.wedding_day_mode).toBe(true);
      expect(result.metrics.active_weddings_today).toBe(15);
    });

    it('should handle system overload gracefully', async () => {
      // Mock system overload
      mockRedis.hget.mockImplementation((key: string) => {
        if (key.includes('connections:count')) return Promise.resolve('1200'); // Over capacity
        if (key.includes('health:score')) return Promise.resolve('45'); // Poor health
        return Promise.resolve('0');
      });

      const request = new NextRequest('http://localhost:3000/api/websocket/health');
      const response = await healthCheck(request);
      const result = await response.json();

      expect(response.status).toBe(503);
      expect(result.status).toBe('overloaded');
      expect(result.warnings).toContain('High connection count detected');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce rate limits on high-frequency operations', async () => {
      // Mock rate limit exceeded
      const { rateLimitService } = await import('@/lib/rate-limit');
      vi.mocked(rateLimitService.checkLimit).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/websocket/channels/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: 'channel-123',
          content: 'Rapid fire message',
          type: 'general',
        }),
      });

      const response = await broadcast(request);
      expect(response.status).toBe(429);
    });

    it('should allow higher limits for premium tiers', async () => {
      // Mock enterprise tier organization
      const enterpriseOrg = { ...mockOrganization, subscription_tier: 'enterprise' };
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: enterpriseOrg,
                  error: null,
                })),
              })),
            })),
          };
        }
        return mockSupabaseClient.from(table);
      });

      const { rateLimitService } = await import('@/lib/rate-limit');
      
      // Verify higher limits are checked for enterprise
      const request = new NextRequest('http://localhost:3000/api/websocket/channels/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: 'channel-123',
          content: 'Enterprise message',
          type: 'general',
        }),
      });

      await broadcast(request);
      
      // Should check with higher enterprise limits (100 vs 20 for starter)
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        expect.stringContaining('user-123'),
        100,
        expect.any(Number)
      );
    });
  });

  describe('Wedding Season Scaling', () => {
    it('should handle peak wedding season traffic', async () => {
      // Mock peak wedding season (June)
      const juneDate = '2025-06-15';
      
      // Mock multiple active weddings
      mockSupabaseClient.rpc.mockResolvedValue({
        data: 25, // Many weddings today
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/websocket/health');
      const response = await healthCheck(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.wedding_season_mode).toBe(true);
    });

    it('should prioritize wedding day messages', async () => {
      // Mock wedding happening today
      const today = new Date().toISOString().split('T')[0];
      
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'wedding_core_data') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: { ...mockWedding, wedding_date: today },
                  error: null,
                })),
              })),
            })),
          };
        }
        return mockSupabaseClient.from(table);
      });

      const request = new NextRequest('http://localhost:3000/api/websocket/channels/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: 'channel-123',
          content: 'Critical wedding day update',
          type: 'urgent',
          priority: 'critical',
          wedding_context: {
            wedding_id: 'wedding-123',
            event_date: today,
          },
        }),
      });

      const response = await broadcast(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.priority_delivery).toBe(true);
    });
  });
});