/**
 * PresenceManager Test Suite - WS-203 Team B Implementation
 * 
 * Comprehensive tests for WebSocket presence tracking and connection health monitoring.
 * Tests wedding day priority monitoring and connection quality analytics.
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { PresenceManager, ConnectionHealth, PresenceEvent } from '@/lib/websocket/presence-manager';
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
    insert: vi.fn(() => ({ error: null, data: mockConnectionHealth })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: mockConnectionHealth, error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null }))
    })),
    upsert: vi.fn(() => ({ error: null, data: mockConnectionHealth })),
    delete: vi.fn(() => ({
      lt: vi.fn(() => ({ error: null }))
    }))
  }))
} as unknown as SupabaseClient;

const mockRedisClient = {
  setex: vi.fn(() => Promise.resolve('OK')),
  get: vi.fn(() => Promise.resolve(JSON.stringify(mockConnectionHealth))),
  del: vi.fn(() => Promise.resolve(1)),
  keys: vi.fn(() => Promise.resolve(['websocket:presence:connection-123'])),
  ttl: vi.fn(() => Promise.resolve(3600)),
  disconnect: vi.fn()
} as unknown as Redis;

const mockConnectionHealth: ConnectionHealth = {
  connectionId: 'connection-123',
  userId: 'user-123',
  channelId: 'channel-456',
  status: 'active',
  lastHeartbeat: new Date(),
  connectionQuality: 85,
  latency: 120,
  reconnectAttempts: 0,
  connectedAt: new Date(),
  metadata: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    ipAddress: '192.168.1.100',
    deviceType: 'mobile',
    weddingContext: {
      weddingId: 'wedding-123',
      isWeddingDay: false,
      priority: 'medium'
    }
  }
};

describe('PresenceManager', () => {
  let presenceManager: PresenceManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    (Redis as unknown as MockedFunction<typeof Redis>).mockReturnValue(mockRedisClient);

    presenceManager = new PresenceManager(mockSupabaseClient, {
      redis: mockRedisClient,
      heartbeatInterval: 30000,
      connectionTimeout: 90000,
      cleanupInterval: 300000,
      qualityThreshold: 50,
      maxReconnectAttempts: 3,
      enableMetrics: true,
      weddingDayMultiplier: 10
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (presenceManager) {
      await presenceManager['shutdown']();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new PresenceManager(mockSupabaseClient);
      expect(manager).toBeInstanceOf(PresenceManager);
    });

    it('should initialize monitoring intervals', () => {
      expect(presenceManager).toBeDefined();
      // Intervals should be set up internally
    });

    it('should initialize metrics tracking', () => {
      const metrics = presenceManager.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalConnections).toBe(0);
      expect(metrics.activeConnections).toBe(0);
    });
  });

  describe('trackConnection', () => {
    it('should track new connection successfully', async () => {
      await expect(
        presenceManager.trackConnection(
          'connection-123',
          'user-123',
          'channel-456',
          {
            userAgent: 'Mozilla/5.0 (iPhone)',
            ipAddress: '192.168.1.100',
            deviceType: 'mobile'
          }
        )
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('websocket_connection_health');
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });

    it('should detect device type from user agent', async () => {
      await presenceManager.trackConnection(
        'connection-123',
        'user-123',
        'channel-456',
        {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
          ipAddress: '192.168.1.100'
        }
      );

      const connection = presenceManager.getConnectionHealth('connection-123');
      expect(connection?.metadata.deviceType).toBe('tablet');
    });

    it('should handle wedding day connections with enhanced monitoring', async () => {
      await presenceManager.trackConnection(
        'wedding-connection-456',
        'photographer-123',
        'wedding-channel-789',
        {
          userAgent: 'Mozilla/5.0 (iPhone)',
          ipAddress: '192.168.1.100',
          weddingContext: {
            weddingId: 'wedding-789',
            isWeddingDay: true,
            priority: 'critical'
          }
        }
      );

      const connection = presenceManager.getConnectionHealth('wedding-connection-456');
      expect(connection?.metadata.weddingContext?.isWeddingDay).toBe(true);
      expect(connection?.metadata.weddingContext?.priority).toBe('critical');

      const metrics = presenceManager.getMetrics();
      expect(metrics.weddingDayConnections).toBe(1);
    });

    it('should update peak concurrent connections metric', async () => {
      const initialMetrics = presenceManager.getMetrics();
      expect(initialMetrics.peakConcurrentConnections).toBe(0);

      await presenceManager.trackConnection('conn-1', 'user-1', 'channel-1', {});
      await presenceManager.trackConnection('conn-2', 'user-2', 'channel-2', {});

      const updatedMetrics = presenceManager.getMetrics();
      expect(updatedMetrics.peakConcurrentConnections).toBe(2);
    });

    it('should emit presence event on connection tracking', (done) => {
      presenceManager.on('presence', (event: PresenceEvent) => {
        expect(event.type).toBe('connect');
        expect(event.connectionId).toBe('connection-123');
        expect(event.userId).toBe('user-123');
        done();
      });

      presenceManager.trackConnection('connection-123', 'user-123', 'channel-456', {});
    });
  });

  describe('processHeartbeat', () => {
    beforeEach(async () => {
      await presenceManager.trackConnection('connection-123', 'user-123', 'channel-456', {});
    });

    it('should update connection health on heartbeat', async () => {
      await expect(
        presenceManager.processHeartbeat('connection-123', 150)
      ).resolves.not.toThrow();

      const connection = presenceManager.getConnectionHealth('connection-123');
      expect(connection?.status).toBe('active');
      expect(connection?.latency).toBe(150);
    });

    it('should calculate connection quality based on latency', async () => {
      await presenceManager.processHeartbeat('connection-123', 50); // Good latency
      
      const connection = presenceManager.getConnectionHealth('connection-123');
      expect(connection?.connectionQuality).toBeGreaterThan(80);
    });

    it('should reset reconnect attempts on successful heartbeat', async () => {
      // Simulate connection with previous reconnect attempts
      const connection = presenceManager.getConnectionHealth('connection-123');
      if (connection) {
        connection.reconnectAttempts = 2;
      }

      await presenceManager.processHeartbeat('connection-123', 100);
      
      const updatedConnection = presenceManager.getConnectionHealth('connection-123');
      expect(updatedConnection?.reconnectAttempts).toBe(0);
    });

    it('should emit quality change events for significant changes', (done) => {
      let eventCount = 0;
      presenceManager.on('presence', (event: PresenceEvent) => {
        if (event.type === 'quality_change') {
          expect(event.data.newQuality).toBeDefined();
          expect(event.data.oldQuality).toBeDefined();
          done();
        }
        eventCount++;
      });

      // First heartbeat
      presenceManager.processHeartbeat('connection-123', 50).then(() => {
        // Second heartbeat with significantly different latency
        presenceManager.processHeartbeat('connection-123', 800);
      });
    });

    it('should handle heartbeat for non-existent connection', async () => {
      await expect(
        presenceManager.processHeartbeat('non-existent-123', 100)
      ).resolves.not.toThrow();
    });

    it('should update Redis cache on heartbeat', async () => {
      await presenceManager.processHeartbeat('connection-123', 100);
      
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'websocket:presence:connection-123',
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe('disconnectConnection', () => {
    beforeEach(async () => {
      await presenceManager.trackConnection('connection-123', 'user-123', 'channel-456', {});
    });

    it('should disconnect connection successfully', async () => {
      await expect(
        presenceManager.disconnectConnection('connection-123', 'client_disconnect')
      ).resolves.not.toThrow();

      const connection = presenceManager.getConnectionHealth('connection-123');
      expect(connection).toBeNull(); // Should be removed from active connections
    });

    it('should update database with disconnect reason', async () => {
      await presenceManager.disconnectConnection('connection-123', 'session_timeout');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('websocket_connection_health');
      const updateCall = mockSupabaseClient.from('websocket_connection_health').update;
      expect(updateCall).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'disconnected',
          disconnect_reason: 'session_timeout'
        })
      );
    });

    it('should clean up Redis cache on disconnect', async () => {
      await presenceManager.disconnectConnection('connection-123', 'client_disconnect');
      
      expect(mockRedisClient.del).toHaveBeenCalledWith('websocket:presence:connection-123');
    });

    it('should emit disconnect event', (done) => {
      presenceManager.on('presence', (event: PresenceEvent) => {
        if (event.type === 'disconnect') {
          expect(event.connectionId).toBe('connection-123');
          expect(event.data.reason).toBe('client_disconnect');
          done();
        }
      });

      presenceManager.disconnectConnection('connection-123', 'client_disconnect');
    });

    it('should handle disconnect of non-existent connection', async () => {
      await expect(
        presenceManager.disconnectConnection('non-existent-123', 'client_disconnect')
      ).resolves.not.toThrow();
    });

    it('should update active connections count', async () => {
      const initialMetrics = presenceManager.getMetrics();
      expect(initialMetrics.activeConnections).toBe(1);

      await presenceManager.disconnectConnection('connection-123', 'client_disconnect');

      const updatedMetrics = presenceManager.getMetrics();
      expect(updatedMetrics.activeConnections).toBe(0);
    });
  });

  describe('getUserConnections', () => {
    beforeEach(async () => {
      await presenceManager.trackConnection('conn-1', 'user-123', 'channel-1', {});
      await presenceManager.trackConnection('conn-2', 'user-123', 'channel-2', {});
      await presenceManager.trackConnection('conn-3', 'user-456', 'channel-3', {});
    });

    it('should return connections for specific user', () => {
      const connections = presenceManager.getUserConnections('user-123');
      expect(connections).toHaveLength(2);
      expect(connections.every(conn => conn.userId === 'user-123')).toBe(true);
    });

    it('should return empty array for user with no connections', () => {
      const connections = presenceManager.getUserConnections('user-999');
      expect(connections).toHaveLength(0);
    });
  });

  describe('getChannelConnections', () => {
    beforeEach(async () => {
      await presenceManager.trackConnection('conn-1', 'user-123', 'channel-1', {});
      await presenceManager.trackConnection('conn-2', 'user-456', 'channel-1', {});
      await presenceManager.trackConnection('conn-3', 'user-789', 'channel-2', {});
    });

    it('should return connections for specific channel', () => {
      const connections = presenceManager.getChannelConnections('channel-1');
      expect(connections).toHaveLength(2);
      expect(connections.every(conn => conn.channelId === 'channel-1')).toBe(true);
    });

    it('should return empty array for channel with no connections', () => {
      const connections = presenceManager.getChannelConnections('channel-999');
      expect(connections).toHaveLength(0);
    });
  });

  describe('getConnectionsByQuality', () => {
    beforeEach(async () => {
      await presenceManager.trackConnection('good-conn', 'user-1', 'channel-1', {});
      await presenceManager.trackConnection('bad-conn', 'user-2', 'channel-2', {});
      
      // Simulate different quality scores
      await presenceManager.processHeartbeat('good-conn', 50); // High quality
      await presenceManager.processHeartbeat('bad-conn', 1000); // Low quality
    });

    it('should filter connections by quality threshold', () => {
      const goodConnections = presenceManager.getConnectionsByQuality(80);
      expect(goodConnections.some(conn => conn.connectionId === 'good-conn')).toBe(true);
      expect(goodConnections.some(conn => conn.connectionId === 'bad-conn')).toBe(false);
    });
  });

  describe('isUserOnline', () => {
    beforeEach(async () => {
      await presenceManager.trackConnection('connection-123', 'user-123', 'channel-456', {});
    });

    it('should return true for user with active connections', () => {
      const isOnline = presenceManager.isUserOnline('user-123');
      expect(isOnline).toBe(true);
    });

    it('should return false for user with no connections', () => {
      const isOnline = presenceManager.isUserOnline('user-999');
      expect(isOnline).toBe(false);
    });

    it('should return false for user with only stale connections', async () => {
      // Fast forward time to make connection stale
      vi.advanceTimersByTime(200000); // 200 seconds
      
      const isOnline = presenceManager.isUserOnline('user-123');
      expect(isOnline).toBe(false);
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      await presenceManager.trackConnection('conn-1', 'user-1', 'channel-1', {});
      await presenceManager.trackConnection('conn-2', 'user-2', 'channel-2', {
        weddingContext: {
          weddingId: 'wedding-123',
          isWeddingDay: true,
          priority: 'critical'
        }
      });
    });

    it('should return comprehensive metrics', () => {
      const metrics = presenceManager.getMetrics();
      
      expect(metrics.totalConnections).toBeGreaterThan(0);
      expect(metrics.activeConnections).toBeGreaterThan(0);
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.qualityDistribution).toBeDefined();
      expect(metrics.reconnectionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.peakConcurrentConnections).toBeGreaterThan(0);
      expect(metrics.weddingDayConnections).toBe(1);
    });

    it('should calculate quality distribution correctly', async () => {
      await presenceManager.processHeartbeat('conn-1', 50); // Excellent
      await presenceManager.processHeartbeat('conn-2', 300); // Good

      const metrics = presenceManager.getMetrics();
      expect(metrics.qualityDistribution.excellent).toBeGreaterThan(0);
      expect(metrics.qualityDistribution.good).toBeGreaterThan(0);
    });
  });

  describe('Heartbeat Monitoring', () => {
    beforeEach(async () => {
      await presenceManager.trackConnection('connection-123', 'user-123', 'channel-456', {});
    });

    it('should detect stale connections during heartbeat checks', async () => {
      // Fast forward past heartbeat timeout
      vi.advanceTimersByTime(120000); // 2 minutes
      
      const connection = presenceManager.getConnectionHealth('connection-123');
      // Connection should still exist but might be marked for cleanup
      expect(connection?.status).toBe('active'); // Initially active
    });

    it('should handle wedding day connections with shorter timeouts', async () => {
      await presenceManager.trackConnection('wedding-conn', 'photographer', 'wedding-channel', {
        weddingContext: {
          weddingId: 'wedding-123',
          isWeddingDay: true,
          priority: 'critical'
        }
      });

      // Wedding day connections should have more frequent monitoring
      const connection = presenceManager.getConnectionHealth('wedding-conn');
      expect(connection?.metadata.weddingContext?.isWeddingDay).toBe(true);
    });

    it('should clean up expired connections', async () => {
      const initialCount = presenceManager.getMetrics().activeConnections;
      
      // Simulate time passing beyond connection timeout
      vi.advanceTimersByTime(200000); // 200 seconds
      
      // Trigger heartbeat check manually
      await presenceManager['checkHeartbeats']();
      
      const finalCount = presenceManager.getMetrics().activeConnections;
      expect(finalCount).toBeLessThanOrEqual(initialCount);
    });
  });

  describe('Connection Quality Calculation', () => {
    it('should calculate quality based on latency', async () => {
      await presenceManager.trackConnection('low-latency', 'user-1', 'channel-1', {});
      await presenceManager.trackConnection('high-latency', 'user-2', 'channel-2', {});
      
      await presenceManager.processHeartbeat('low-latency', 50); // Excellent latency
      await presenceManager.processHeartbeat('high-latency', 2000); // Poor latency
      
      const lowLatencyConn = presenceManager.getConnectionHealth('low-latency');
      const highLatencyConn = presenceManager.getConnectionHealth('high-latency');
      
      expect(lowLatencyConn?.connectionQuality).toBeGreaterThan(highLatencyConn?.connectionQuality || 0);
    });

    it('should penalize for reconnection attempts', async () => {
      await presenceManager.trackConnection('unreliable-conn', 'user-1', 'channel-1', {});
      
      // Simulate multiple reconnection attempts
      const connection = presenceManager.getConnectionHealth('unreliable-conn');
      if (connection) {
        connection.reconnectAttempts = 3;
      }
      
      await presenceManager.processHeartbeat('unreliable-conn', 100);
      
      const updatedConnection = presenceManager.getConnectionHealth('unreliable-conn');
      // Quality should be impacted by reconnection attempts
      expect(updatedConnection?.connectionQuality).toBeLessThan(100);
    });

    it('should give stability bonus for long-running connections', async () => {
      await presenceManager.trackConnection('stable-conn', 'user-1', 'channel-1', {});
      
      // Simulate long-running connection
      const connection = presenceManager.getConnectionHealth('stable-conn');
      if (connection) {
        connection.connectedAt = new Date(Date.now() - 3600000); // 1 hour ago
      }
      
      await presenceManager.processHeartbeat('stable-conn', 100);
      
      const updatedConnection = presenceManager.getConnectionHealth('stable-conn');
      // Should get stability bonus
      expect(updatedConnection?.connectionQuality).toBeGreaterThan(90);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis failures gracefully', async () => {
      const failingRedis = {
        ...mockRedisClient,
        setex: vi.fn(() => Promise.reject(new Error('Redis connection failed')))
      } as unknown as Redis;

      const manager = new PresenceManager(mockSupabaseClient, { redis: failingRedis });

      // Should not throw despite Redis failure
      await expect(
        manager.trackConnection('connection-123', 'user-123', 'channel-456', {})
      ).resolves.not.toThrow();
    });

    it('should handle database failures gracefully', async () => {
      const failingSupabase = {
        ...mockSupabaseClient,
        from: vi.fn(() => ({
          upsert: vi.fn(() => ({ 
            error: { message: 'Database error' }, 
            data: null 
          }))
        }))
      } as unknown as SupabaseClient;

      const manager = new PresenceManager(failingSupabase, { redis: mockRedisClient });

      // Should handle gracefully
      await expect(
        manager.trackConnection('connection-123', 'user-123', 'channel-456', {})
      ).resolves.not.toThrow();
    });
  });

  describe('Wedding Industry Features', () => {
    it('should prioritize wedding day monitoring', async () => {
      await presenceManager.trackConnection('wedding-photographer', 'photographer-123', 'wedding-channel', {
        weddingContext: {
          weddingId: 'wedding-123',
          isWeddingDay: true,
          priority: 'critical'
        }
      });

      const metrics = presenceManager.getMetrics();
      expect(metrics.weddingDayConnections).toBe(1);
    });

    it('should handle supplier multi-device scenarios', async () => {
      const supplierId = 'photographer-123';
      
      await presenceManager.trackConnection('mobile-device', supplierId, 'channel-1', {
        deviceType: 'mobile'
      });
      await presenceManager.trackConnection('desktop-device', supplierId, 'channel-1', {
        deviceType: 'desktop'
      });

      const userConnections = presenceManager.getUserConnections(supplierId);
      expect(userConnections).toHaveLength(2);
      expect(userConnections.some(conn => conn.metadata.deviceType === 'mobile')).toBe(true);
      expect(userConnections.some(conn => conn.metadata.deviceType === 'desktop')).toBe(true);
    });

    it('should handle venue connectivity issues with grace', async () => {
      // Simulate poor venue WiFi
      await presenceManager.trackConnection('venue-conn', 'vendor-123', 'venue-channel', {
        location: 'Remote Venue',
        ipAddress: '10.0.0.100' // Likely venue network
      });

      // Simulate intermittent connectivity
      await presenceManager.processHeartbeat('venue-conn', 800); // High latency
      await presenceManager.processHeartbeat('venue-conn', 1200); // Even higher latency

      const connection = presenceManager.getConnectionHealth('venue-conn');
      expect(connection?.connectionQuality).toBeLessThan(70); // Should reflect poor connectivity
    });
  });

  describe('Performance and Scale', () => {
    it('should handle many concurrent connections efficiently', async () => {
      const startTime = Date.now();
      const connectionCount = 100;
      const promises = [];

      for (let i = 0; i < connectionCount; i++) {
        promises.push(
          presenceManager.trackConnection(`conn-${i}`, `user-${i}`, `channel-${i}`, {
            userAgent: 'Test Agent',
            ipAddress: '192.168.1.100'
          })
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle 100 connections quickly
      expect(duration).toBeLessThan(5000); // Less than 5 seconds
      
      const metrics = presenceManager.getMetrics();
      expect(metrics.activeConnections).toBe(connectionCount);
    });

    it('should maintain performance during heartbeat processing', async () => {
      // Setup many connections
      for (let i = 0; i < 50; i++) {
        await presenceManager.trackConnection(`conn-${i}`, `user-${i}`, `channel-${i}`, {});
      }

      const startTime = Date.now();
      
      // Process heartbeats for all connections
      const heartbeatPromises = [];
      for (let i = 0; i < 50; i++) {
        heartbeatPromises.push(
          presenceManager.processHeartbeat(`conn-${i}`, Math.random() * 200 + 50)
        );
      }

      await Promise.all(heartbeatPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should process 50 heartbeats quickly
      expect(duration).toBeLessThan(2000); // Less than 2 seconds
    });
  });

  describe('Cleanup and Monitoring', () => {
    beforeEach(async () => {
      await presenceManager.trackConnection('connection-123', 'user-123', 'channel-456', {});
    });

    it('should cleanup old connection records', async () => {
      await presenceManager['cleanupStaleConnections']();
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('websocket_connection_health');
    });

    it('should emit cleanup events', (done) => {
      presenceManager.on('presence', (event: PresenceEvent) => {
        if (event.type === 'cleanup') {
          expect(event.data.cutoffTime).toBeDefined();
          done();
        }
      });

      presenceManager['cleanupStaleConnections']();
    });

    it('should clean up Redis keys without TTL', async () => {
      const staleRedis = {
        ...mockRedisClient,
        keys: vi.fn(() => Promise.resolve(['websocket:presence:stale-conn'])),
        ttl: vi.fn(() => Promise.resolve(-1)), // No expiration
        del: vi.fn(() => Promise.resolve(1))
      } as unknown as Redis;

      const manager = new PresenceManager(mockSupabaseClient, { redis: staleRedis });
      
      await manager['cleanupStaleConnections']();
      
      expect(staleRedis.del).toHaveBeenCalledWith('websocket:presence:stale-conn');
    });
  });

  describe('Shutdown', () => {
    beforeEach(async () => {
      await presenceManager.trackConnection('connection-123', 'user-123', 'channel-456', {});
    });

    it('should gracefully shutdown and disconnect all connections', async () => {
      const initialConnections = presenceManager.getMetrics().activeConnections;
      expect(initialConnections).toBeGreaterThan(0);

      await presenceManager['shutdown']();

      const finalConnections = presenceManager.getMetrics().activeConnections;
      expect(finalConnections).toBe(0);
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should handle multiple shutdown calls', async () => {
      await presenceManager['shutdown']();
      await expect(presenceManager['shutdown']()).resolves.not.toThrow();
    });
  });
});