/**
 * WS-202: Supabase Realtime Integration - Connection Monitor Test Suite
 * 
 * Tests for RealtimeConnectionMonitor covering:
 * - Connection health monitoring
 * - Automatic cleanup processes
 * - Wedding day safety protocols
 * - Connection statistics and alerts
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RealtimeConnectionMonitor, WeddingDaySafetyMonitor } from '@/lib/realtime/connection-monitor';
import type { ConnectionStats } from '@/types/realtime';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn()
};

// Mock timer functions
const mockSetInterval = jest.fn();
const mockClearInterval = jest.fn();

// Store original functions
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

describe('RealtimeConnectionMonitor', () => {
  let connectionMonitor: RealtimeConnectionMonitor;
  let onStatsUpdate: jest.Mock;
  let onConnectionAlert: jest.Mock;

  beforeEach(() => {
    // Replace timer functions with mocks
    global.setInterval = mockSetInterval as any;
    global.clearInterval = mockClearInterval as any;

    jest.clearAllMocks();
    
    // Setup callback mocks
    onStatsUpdate = jest.fn();
    onConnectionAlert = jest.fn();

    // Setup default database mocks
    mockSupabaseClient.rpc.mockResolvedValue({ data: 5, error: null });
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      count: jest.fn().mockResolvedValue({ count: 25, error: null }),
      update: jest.fn().mockResolvedValue({ error: null })
    });

    connectionMonitor = new RealtimeConnectionMonitor(mockSupabaseClient as any, {
      cleanupIntervalMs: 1000, // 1 second for testing
      connectionTimeoutMs: 2000, // 2 seconds for testing
      enableLogging: false, // Disable console logs in tests
      onStatsUpdate,
      onConnectionAlert
    });
  });

  afterEach(() => {
    // Restore original timer functions
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;

    connectionMonitor.stopMonitoring();
  });

  describe('Monitoring Lifecycle', () => {
    test('should start monitoring with correct intervals', () => {
      connectionMonitor.startMonitoring();

      expect(mockSetInterval).toHaveBeenCalledTimes(2);
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 1000); // cleanup
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30000); // stats
    });

    test('should not start monitoring twice', () => {
      connectionMonitor.startMonitoring();
      connectionMonitor.startMonitoring(); // Second call should be ignored

      expect(mockSetInterval).toHaveBeenCalledTimes(2); // Still only called twice from first start
    });

    test('should stop monitoring correctly', () => {
      connectionMonitor.startMonitoring();
      connectionMonitor.stopMonitoring();

      expect(mockClearInterval).toHaveBeenCalledTimes(2);
    });

    test('should handle stop monitoring when not started', () => {
      connectionMonitor.stopMonitoring(); // Should not throw

      expect(mockClearInterval).not.toHaveBeenCalled();
    });
  });

  describe('Connection Cleanup', () => {
    test('should perform cleanup using database function', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: 3, error: null });

      const cleanupCount = await connectionMonitor.forceCleanup();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('cleanup_inactive_subscriptions');
      expect(cleanupCount).toBe(3);
    });

    test('should handle cleanup errors gracefully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await expect(connectionMonitor.forceCleanup()).rejects.toThrow();
    });

    test('should log zero cleanups when no inactive connections', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: 0, error: null });

      const cleanupCount = await connectionMonitor.forceCleanup();

      expect(cleanupCount).toBe(0);
      expect(mockSupabaseClient.rpc).toHaveBeenCalled();
    });
  });

  describe('Connection Statistics', () => {
    test('should get connection statistics correctly', async () => {
      // Mock active connections count
      const mockActiveCount = { count: 45, error: null };
      const mockTodayMessages = { count: 1250, error: null };

      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue(mockActiveCount)
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue(mockTodayMessages)
        });

      const stats = await connectionMonitor.getConnectionStats();

      expect(stats).toEqual({
        activeConnections: 45,
        todayMessages: 1250,
        avgMessagesPerConnection: 28 // 1250 / 45 rounded
      });
    });

    test('should handle database errors in statistics', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        count: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      });

      const stats = await connectionMonitor.getConnectionStats();

      expect(stats).toEqual({
        activeConnections: 0,
        todayMessages: 0,
        avgMessagesPerConnection: 0
      });
    });

    test('should handle zero connections gracefully', async () => {
      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 0, error: null })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 100, error: null })
        });

      const stats = await connectionMonitor.getConnectionStats();

      expect(stats.activeConnections).toBe(0);
      expect(stats.avgMessagesPerConnection).toBe(0); // Should not divide by zero
    });
  });

  describe('Subscription Ping Updates', () => {
    test('should update subscription ping timestamp', async () => {
      await connectionMonitor.updateSubscriptionPing('user-123', 'form-responses');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('realtime_subscriptions');
      
      const mockFrom = mockSupabaseClient.from.mock.results[0].value;
      expect(mockFrom.update).toHaveBeenCalledWith({
        last_ping_at: expect.any(String)
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockFrom.eq).toHaveBeenCalledWith('channel_name', 'form-responses');
    });

    test('should handle ping update errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis().mockResolvedValue({ 
          error: { message: 'Update failed' } 
        })
      });

      // Should not throw - ping failures shouldn't break connections
      await expect(
        connectionMonitor.updateSubscriptionPing('user-123', 'form-responses')
      ).resolves.not.toThrow();
    });
  });

  describe('Health Report Generation', () => {
    test('should generate comprehensive health report', async () => {
      // Mock various database queries for health report
      mockSupabaseClient.from
        // Active connections
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 75, error: null })
        })
        // Today's messages
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 2100, error: null })
        })
        // Channel distribution
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          mockResolvedValue: { 
            data: [
              { channel_name: 'form-responses' },
              { channel_name: 'form-responses' },
              { channel_name: 'notifications' }
            ], 
            error: null 
          }
        })
        // Stale connections
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 5, error: null })
        });

      // Mock the select chain properly
      const mockSelect = mockSupabaseClient.from.mock.results[2].value;
      mockSelect.mockResolvedValue({
        data: [
          { channel_name: 'form-responses' },
          { channel_name: 'form-responses' },
          { channel_name: 'notifications' }
        ],
        error: null
      });

      const healthReport = await connectionMonitor.getHealthReport();

      expect(healthReport).toMatchObject({
        stats: {
          activeConnections: 75,
          todayMessages: 2100,
          avgMessagesPerConnection: 28
        },
        staleConnections: 5,
        isHealthy: true, // Under 180 connections and no alerts
        alerts: []
      });

      expect(healthReport.timestamp).toBeInstanceOf(Date);
    });

    test('should detect high connection count alerts', async () => {
      // Mock high connection count (over 150)
      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 160, error: null })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 1000, error: null })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          mockResolvedValue: { data: [], error: null }
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 2, error: null })
        });

      // Mock the channel distribution query
      const mockSelect = mockSupabaseClient.from.mock.results[2].value;
      mockSelect.mockResolvedValue({ data: [], error: null });

      const healthReport = await connectionMonitor.getHealthReport();

      expect(healthReport.alerts).toContainEqual(
        expect.objectContaining({
          type: 'high_connection_count',
          severity: 'warning',
          message: 'High connection count: 160/200'
        })
      );
    });

    test('should detect stale connection alerts', async () => {
      // Mock normal connections but many stale ones
      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 50, error: null })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 500, error: null })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          mockResolvedValue: { data: [], error: null }
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 15, error: null }) // Over 10 stale
        });

      const mockSelect = mockSupabaseClient.from.mock.results[2].value;
      mockSelect.mockResolvedValue({ data: [], error: null });

      const healthReport = await connectionMonitor.getHealthReport();

      expect(healthReport.alerts).toContainEqual(
        expect.objectContaining({
          type: 'stale_connections',
          severity: 'warning',
          message: '15 stale connections detected'
        })
      );
    });

    test('should handle health report generation errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        count: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const healthReport = await connectionMonitor.getHealthReport();

      expect(healthReport.isHealthy).toBe(false);
      expect(healthReport.alerts).toContainEqual(
        expect.objectContaining({
          type: 'system_error',
          severity: 'error',
          message: 'Failed to generate health report'
        })
      );
    });
  });

  describe('Callback Integration', () => {
    test('should call onStatsUpdate callback with stats', async () => {
      connectionMonitor.startMonitoring();

      // Mock stats update
      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 30, error: null })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 900, error: null })
        });

      // Manually trigger stats update (simulate interval)
      const statsUpdateFunction = mockSetInterval.mock.calls[1][0];
      await statsUpdateFunction();

      expect(onStatsUpdate).toHaveBeenCalledWith({
        activeConnections: 30,
        todayMessages: 900,
        avgMessagesPerConnection: 30
      });
    });

    test('should call onConnectionAlert for high connection count', async () => {
      connectionMonitor.startMonitoring();

      // Mock high connection count (over 180)
      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 185, error: null })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          count: jest.fn().mockResolvedValue({ count: 1000, error: null })
        });

      const statsUpdateFunction = mockSetInterval.mock.calls[1][0];
      await statsUpdateFunction();

      expect(onConnectionAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'capacity_warning',
          severity: 'error',
          message: 'Near capacity: 185/200 connections'
        })
      );
    });
  });
});

describe('WeddingDaySafetyMonitor', () => {
  let safetyMonitor: WeddingDaySafetyMonitor;
  let onStatsUpdate: jest.Mock;
  let onConnectionAlert: jest.Mock;

  beforeEach(() => {
    global.setInterval = mockSetInterval as any;
    global.clearInterval = mockClearInterval as any;

    jest.clearAllMocks();
    
    onStatsUpdate = jest.fn();
    onConnectionAlert = jest.fn();

    mockSupabaseClient.rpc.mockResolvedValue({ data: 0, error: null });
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue({ count: 10, error: null })
    });

    safetyMonitor = new WeddingDaySafetyMonitor(mockSupabaseClient as any, {
      cleanupIntervalMs: 5000,
      enableLogging: false,
      onStatsUpdate,
      onConnectionAlert
    });
  });

  afterEach(() => {
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;

    safetyMonitor.stopMonitoring();
  });

  describe('Wedding Day Mode', () => {
    test('should enable wedding day mode with enhanced monitoring', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      safetyMonitor.startMonitoring();
      safetyMonitor.enableWeddingDayMode();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WEDDING DAY MODE ACTIVATED')
      );

      // Should restart monitoring with reduced interval (2 minutes)
      expect(mockClearInterval).toHaveBeenCalledTimes(2); // Stop current
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 2 * 60 * 1000); // New cleanup interval

      consoleSpy.mockRestore();
    });

    test('should disable wedding day mode and restore normal intervals', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      safetyMonitor.startMonitoring();
      safetyMonitor.enableWeddingDayMode();
      safetyMonitor.disableWeddingDayMode();

      expect(consoleSpy).toHaveBeenCalledWith('✅ Wedding day mode deactivated');

      // Should restore normal 5-minute interval
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);

      consoleSpy.mockRestore();
    });

    test('should track critical alerts for wedding operations', () => {
      safetyMonitor.enableWeddingDayMode();
      
      const criticalAlerts = safetyMonitor.getCriticalAlerts();
      expect(criticalAlerts).toEqual([]);

      // Should filter alerts by severity and recency
      const alerts = safetyMonitor.getCriticalAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});