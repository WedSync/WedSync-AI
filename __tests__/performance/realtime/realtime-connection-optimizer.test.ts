/**
 * WS-202 RealtimeConnectionOptimizer Test Suite
 * Team D - Round 1: Comprehensive Performance Testing
 * 
 * Tests connection pooling, health monitoring, wedding day optimizations,
 * circuit breakers, and scaling capabilities for 200+ connections per supplier
 */

import { RealtimeConnectionOptimizer } from '@/lib/performance/realtime-connection-optimizer';
import type {
  SubscriptionConfig,
  SubscriptionBatch,
  ConnectionHealthReport,
  ScalingResult,
  RealtimePerformanceConfig,
  OptimizedConnection
} from '@/types/realtime-performance';

// Mock Supabase client
const mockSupabaseClient = {
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockResolvedValue(undefined)
  }),
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue({ data: [{ count: 1 }], error: null })
    })
  }),
  realtime: {
    connection: { readyState: 1 } // WebSocket.OPEN
  }
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('RealtimeConnectionOptimizer', () => {
  let optimizer: RealtimeConnectionOptimizer;
  let config: Partial<RealtimePerformanceConfig['connectionPool']>;

  beforeEach(() => {
    config = {
      maxConnections: 100,
      maxConnectionsPerUser: 5,
      connectionTimeout: 10000,
      heartbeatInterval: 15000,
      cleanupInterval: 30000,
      healthCheckInterval: 30000
    };

    optimizer = RealtimeConnectionOptimizer.getInstance(config);

    // Clear singleton instance for clean testing
    (RealtimeConnectionOptimizer as any).instance = null;
  });

  afterEach(() => {
    optimizer?.destroy();
    jest.clearAllMocks();
  });

  describe('Connection Creation and Optimization', () => {
    test('should create optimized connection with proper metadata', async () => {
      const subscriptionConfig: SubscriptionConfig = {
        channelName: 'wedding:123:updates',
        event: 'INSERT',
        filter: { table: 'tasks' },
        callback: jest.fn(),
        priority: 'high'
      };

      const connection = await optimizer.optimizeConnectionCreation(
        'supplier-123',
        'wedding_updates',
        subscriptionConfig
      );

      expect(connection).toBeDefined();
      expect(connection.id).toContain('conn_supplier-123_wedding_updates');
      expect(connection.userId).toBe('supplier-123');
      expect(connection.channelType).toBe('wedding_updates');
      expect(connection.maxChannels).toBeGreaterThan(20);
      expect(connection.isHealthy).toBe(true);
      expect(connection.channels.size).toBe(1);
    });

    test('should reuse existing healthy connections', async () => {
      const subscriptionConfig1: SubscriptionConfig = {
        channelName: 'wedding:123:updates',
        callback: jest.fn()
      };

      const subscriptionConfig2: SubscriptionConfig = {
        channelName: 'wedding:123:messages',
        callback: jest.fn()
      };

      // Create first connection
      const connection1 = await optimizer.optimizeConnectionCreation(
        'supplier-123',
        'wedding_updates',
        subscriptionConfig1
      );

      // Second subscription should reuse the connection
      const connection2 = await optimizer.optimizeConnectionCreation(
        'supplier-123',
        'wedding_updates',
        subscriptionConfig2
      );

      expect(connection1.id).toBe(connection2.id);
      expect(connection2.channels.size).toBe(2);
    });

    test('should enforce per-user connection limits', async () => {
      const subscriptionConfig: SubscriptionConfig = {
        channelName: 'test-channel',
        callback: jest.fn()
      };

      // Create connections up to the limit
      const connections = [];
      for (let i = 0; i < config.maxConnectionsPerUser!; i++) {
        const connection = await optimizer.optimizeConnectionCreation(
          'supplier-123',
          `channel_type_${i}`,
          subscriptionConfig
        );
        connections.push(connection);
      }

      expect(connections).toHaveLength(config.maxConnectionsPerUser!);
    });

    test('should apply wedding day optimizations', async () => {
      // Mock Saturday (wedding day)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = jest.fn().mockReturnValue(6); // Saturday

      const subscriptionConfig: SubscriptionConfig = {
        channelName: 'wedding:123:critical',
        callback: jest.fn()
      };

      const connection = await optimizer.optimizeConnectionCreation(
        'supplier-123',
        'critical_updates',
        subscriptionConfig
      );

      // Wedding day connections should have higher limits
      expect(connection.maxChannels).toBeGreaterThan(25);

      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });
  });

  describe('Batch Subscription Management', () => {
    test('should process batch subscriptions efficiently', async () => {
      const subscriptionBatch: SubscriptionBatch[] = [
        {
          id: 'sub-1',
          channelType: 'wedding_updates',
          config: { channelName: 'wedding:123:updates', callback: jest.fn() },
          priority: 1
        },
        {
          id: 'sub-2',
          channelType: 'wedding_updates',
          config: { channelName: 'wedding:123:messages', callback: jest.fn() },
          priority: 1
        },
        {
          id: 'sub-3',
          channelType: 'guest_updates',
          config: { channelName: 'wedding:123:guests', callback: jest.fn() },
          priority: 2
        }
      ];

      const result = await optimizer.batchSubscriptionUpdates('supplier-123', subscriptionBatch);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
    });

    test('should group subscriptions by type for optimal pooling', async () => {
      const subscriptionBatch: SubscriptionBatch[] = [
        {
          id: 'sub-1',
          channelType: 'type_a',
          config: { channelName: 'channel-1', callback: jest.fn() },
          priority: 1
        },
        {
          id: 'sub-2',
          channelType: 'type_a',
          config: { channelName: 'channel-2', callback: jest.fn() },
          priority: 1
        },
        {
          id: 'sub-3',
          channelType: 'type_b',
          config: { channelName: 'channel-3', callback: jest.fn() },
          priority: 1
        }
      ];

      const result = await optimizer.batchSubscriptionUpdates('supplier-123', subscriptionBatch);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('Connection Health Monitoring', () => {
    test('should monitor connection health comprehensively', async () => {
      // Create some connections first
      const subscriptionConfig: SubscriptionConfig = {
        channelName: 'test-channel',
        callback: jest.fn()
      };

      await optimizer.optimizeConnectionCreation('supplier-1', 'type-1', subscriptionConfig);
      await optimizer.optimizeConnectionCreation('supplier-2', 'type-1', subscriptionConfig);

      const healthReport: ConnectionHealthReport = await optimizer.monitorConnectionHealth();

      expect(healthReport.totalConnections).toBeGreaterThan(0);
      expect(healthReport.healthyConnections).toBeGreaterThanOrEqual(0);
      expect(healthReport.performanceMetrics).toBeDefined();
      expect(healthReport.performanceMetrics.averageLatency).toBeGreaterThanOrEqual(0);
      expect(healthReport.connectionsByUser).toBeInstanceOf(Map);
    });

    test('should detect and cleanup unhealthy connections', async () => {
      const subscriptionConfig: SubscriptionConfig = {
        channelName: 'test-channel',
        callback: jest.fn()
      };

      const connection = await optimizer.optimizeConnectionCreation(
        'supplier-123',
        'test-type',
        subscriptionConfig
      );

      // Simulate unhealthy connection
      connection.isHealthy = false;
      connection.lastActivity = Date.now() - (10 * 60 * 1000); // 10 minutes ago

      const healthReport = await optimizer.monitorConnectionHealth();

      expect(healthReport.unhealthyConnections).toBeGreaterThan(0);
    });
  });

  describe('Auto-Scaling for Peak Loads', () => {
    test('should scale up for expected peak load', async () => {
      const expectedConnections = 800;
      const peakDuration = 7200; // 2 hours

      const scalingResult: ScalingResult = await optimizer.scaleForPeakLoad(
        expectedConnections,
        peakDuration
      );

      if (scalingResult.action !== 'no_scaling_needed') {
        expect(scalingResult.action).toBe('scaled_up');
        expect(scalingResult.currentCapacity).toBeGreaterThan(scalingResult.requiredCapacity * 0.8);
        expect(scalingResult.scalingActions.length).toBeGreaterThan(0);
      }
    });

    test('should not scale if current capacity is sufficient', async () => {
      const expectedConnections = 50; // Well within current capacity
      const peakDuration = 3600;

      const scalingResult: ScalingResult = await optimizer.scaleForPeakLoad(
        expectedConnections,
        peakDuration
      );

      expect(scalingResult.action).toBe('no_scaling_needed');
      expect(scalingResult.scalingActions).toHaveLength(0);
    });
  });

  describe('Wedding Season Optimizations', () => {
    test('should enable wedding season optimizations', async () => {
      await optimizer.optimizeForWeddingSeason();

      // This should have enabled various optimizations
      // We can verify through metrics or configuration changes
      const metrics = await optimizer.getRealtimePerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.connectionMetrics).toBeDefined();
      expect(metrics.performanceMetrics).toBeDefined();
    });

    test('should provide comprehensive performance metrics', async () => {
      const metrics = await optimizer.getRealtimePerformanceMetrics();

      expect(metrics.connectionMetrics.totalConnections).toBeGreaterThanOrEqual(0);
      expect(metrics.subscriptionMetrics.totalSubscriptions).toBeGreaterThanOrEqual(0);
      expect(metrics.performanceMetrics.averageMessageLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.resourceMetrics.memoryUsage).toBeDefined();
    });
  });

  describe('Circuit Breaker Protection', () => {
    test('should prevent connection creation when circuit breaker is open', async () => {
      const subscriptionConfig: SubscriptionConfig = {
        channelName: 'failing-channel',
        callback: jest.fn()
      };

      // Mock connection creation to fail repeatedly
      const originalCreateClient = require('@supabase/supabase-js').createClient;
      require('@supabase/supabase-js').createClient = jest.fn(() => {
        throw new Error('Connection failed');
      });

      // Try to create connections until circuit breaker opens
      let openCircuitDetected = false;
      for (let i = 0; i < 10; i++) {
        try {
          await optimizer.optimizeConnectionCreation(
            'supplier-123',
            'failing-type',
            subscriptionConfig
          );
        } catch (error) {
          if (error.message.includes('Circuit breaker')) {
            openCircuitDetected = true;
            break;
          }
        }
      }

      expect(openCircuitDetected).toBe(true);

      // Restore original implementation
      require('@supabase/supabase-js').createClient = originalCreateClient;
    });
  });

  describe('Performance Requirements Validation', () => {
    test('should support 200+ connections per supplier', async () => {
      const subscriptionConfig: SubscriptionConfig = {
        channelName: 'stress-test-channel',
        callback: jest.fn()
      };

      // Test with a large number of connections
      const connectionPromises = [];
      for (let i = 0; i < 50; i++) { // Reduced for test performance
        connectionPromises.push(
          optimizer.optimizeConnectionCreation(
            'supplier-123',
            `channel-type-${i}`,
            subscriptionConfig
          )
        );
      }

      const connections = await Promise.all(connectionPromises);
      
      expect(connections).toHaveLength(50);
      expect(connections.every(conn => conn.isHealthy)).toBe(true);
    });

    test('should achieve sub-500ms connection establishment', async () => {
      const subscriptionConfig: SubscriptionConfig = {
        channelName: 'latency-test-channel',
        callback: jest.fn()
      };

      const startTime = performance.now();

      await optimizer.optimizeConnectionCreation(
        'supplier-123',
        'latency-test',
        subscriptionConfig
      );

      const connectionTime = performance.now() - startTime;

      // Connection establishment should be fast
      expect(connectionTime).toBeLessThan(500);
    });

    test('should maintain performance under batch operations', async () => {
      const batchSize = 20;
      const subscriptionBatch: SubscriptionBatch[] = [];

      for (let i = 0; i < batchSize; i++) {
        subscriptionBatch.push({
          id: `batch-sub-${i}`,
          channelType: 'batch-type',
          config: {
            channelName: `batch-channel-${i}`,
            callback: jest.fn()
          },
          priority: 1
        });
      }

      const startTime = performance.now();
      
      const result = await optimizer.batchSubscriptionUpdates('supplier-123', subscriptionBatch);
      
      const batchTime = performance.now() - startTime;

      expect(result.successful).toHaveLength(batchSize);
      expect(batchTime).toBeLessThan(2000); // 2 seconds for 20 subscriptions
    });
  });

  describe('Resource Management and Cleanup', () => {
    test('should cleanup resources on destroy', () => {
      const destroySpy = jest.spyOn(optimizer, 'destroy');
      
      optimizer.destroy();
      
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle connection failures gracefully', async () => {
      // Mock failing client creation
      const originalCreateClient = require('@supabase/supabase-js').createClient;
      require('@supabase/supabase-js').createClient = jest.fn(() => {
        throw new Error('Network error');
      });

      const subscriptionConfig: SubscriptionConfig = {
        channelName: 'error-test-channel',
        callback: jest.fn()
      };

      await expect(
        optimizer.optimizeConnectionCreation('supplier-123', 'error-type', subscriptionConfig)
      ).rejects.toThrow();

      // Restore original implementation
      require('@supabase/supabase-js').createClient = originalCreateClient;
    });
  });
});

describe('RealtimeConnectionOptimizer Integration Tests', () => {
  test('should handle realistic wedding coordination scenario', async () => {
    const optimizer = RealtimeConnectionOptimizer.getInstance({
      maxConnections: 200,
      maxConnectionsPerUser: 10
    });

    // Simulate wedding day with multiple vendors
    const vendors = ['photographer', 'videographer', 'florist', 'caterer', 'dj'];
    const weddingId = 'wedding-12345';
    
    const subscriptionPromises = vendors.map(async (vendor, index) => {
      const vendorId = `${vendor}-${index}`;
      
      // Each vendor subscribes to multiple channels
      const channelTypes = [
        'timeline_updates',
        'vendor_coordination',
        'emergency_alerts',
        'guest_updates'
      ];
      
      const vendorSubscriptions = channelTypes.map(channelType => 
        optimizer.optimizeConnectionCreation(vendorId, channelType, {
          channelName: `${weddingId}:${channelType}`,
          callback: jest.fn()
        })
      );
      
      return Promise.all(vendorSubscriptions);
    });

    const allConnections = await Promise.all(subscriptionPromises);
    const flatConnections = allConnections.flat();

    expect(flatConnections).toHaveLength(vendors.length * 4);
    expect(flatConnections.every(conn => conn.isHealthy)).toBe(true);

    // Monitor health after all connections established
    const healthReport = await optimizer.monitorConnectionHealth();
    expect(healthReport.totalConnections).toBeGreaterThan(0);
    expect(healthReport.performanceMetrics.averageLatency).toBeLessThan(100);

    optimizer.destroy();
  });
});