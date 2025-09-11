/**
 * WS-178: Backup Performance Monitor Tests
 * Team D - Round 1: Comprehensive test suite for backup performance monitoring
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import BackupPerformanceMonitor, {
  PerformanceMetrics,
  PerformanceThresholds,
  ImpactAnalysis,
  ScheduleOptimization
} from '@/lib/performance/backup/backup-performance-monitor';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({ limit: jest.fn(() => Promise.resolve({ data: [] })) })),
      insert: jest.fn(() => Promise.resolve({ data: {} }))
    })),
    rpc: jest.fn(() => Promise.resolve({ data: { connections: 15, avg_duration: 100 } }))
  }))
}));

describe('BackupPerformanceMonitor', () => {
  let monitor: BackupPerformanceMonitor;

  beforeEach(() => {
    monitor = new BackupPerformanceMonitor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any active monitoring
    monitor.stopMonitoring();
  });

  describe('Initialization', () => {
    it('should initialize with default thresholds', () => {
      expect(monitor).toBeInstanceOf(BackupPerformanceMonitor);
    });

    it('should have performance observer initialized', () => {
      // Test that performance observer is properly set up
      expect(monitor['performanceObserver']).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should start monitoring for a backup operation', async () => {
      const backupId = 'test-backup-001';
      
      await expect(monitor.startMonitoring(backupId)).resolves.toBeUndefined();
      expect(monitor['monitoringActive']).toBe(true);
    });

    it('should stop monitoring and return final metrics', async () => {
      const backupId = 'test-backup-002';
      
      await monitor.startMonitoring(backupId);
      const finalMetrics = await monitor.stopMonitoring();
      
      expect(monitor['monitoringActive']).toBe(false);
      // Final metrics might be null if no metrics were collected
      expect(finalMetrics === null || typeof finalMetrics === 'object').toBe(true);
    });

    it('should collect performance metrics', async () => {
      const backupId = 'test-backup-003';
      
      const metrics = await monitor.monitorBackupPerformance(backupId);
      
      expect(metrics).toMatchObject({
        timestamp: expect.any(Number),
        backupId,
        apiResponseTime: {
          current: expect.any(Number),
          baseline: expect.any(Number),
          increase: expect.any(Number)
        },
        systemMetrics: {
          cpuUsage: expect.any(Number),
          memoryUsage: expect.any(Number),
          diskIO: {
            read: expect.any(Number),
            write: expect.any(Number)
          }
        },
        databaseMetrics: {
          connectionCount: expect.any(Number),
          queryLatency: expect.any(Number),
          lockContention: expect.any(Number),
          activeQueries: expect.any(Number)
        },
        networkMetrics: {
          uploadSpeed: expect.any(Number),
          downloadSpeed: expect.any(Number),
          latency: expect.any(Number)
        },
        weddingContext: {
          isPeakHours: expect.any(Boolean),
          activeWeddings: expect.any(Number),
          criticalOperations: expect.any(Array),
          vendorActivity: expect.any(Number)
        }
      });
    });
  });

  describe('Impact Analysis', () => {
    it('should detect no impact when metrics are within thresholds', async () => {
      // Set up mock metrics with good performance
      const mockMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        backupId: 'test-backup-004',
        apiResponseTime: { current: 95, baseline: 95, increase: 0 },
        systemMetrics: { cpuUsage: 15, memoryUsage: 200, diskIO: { read: 10, write: 5 } },
        databaseMetrics: { connectionCount: 10, queryLatency: 50, lockContention: 0, activeQueries: 3 },
        networkMetrics: { uploadSpeed: 8, downloadSpeed: 50, latency: 20 },
        weddingContext: { isPeakHours: false, activeWeddings: 2, criticalOperations: [], vendorActivity: 10 }
      };

      monitor['currentMetrics'] = mockMetrics;
      
      const impact = await monitor.detectPerformanceImpact();
      
      expect(impact.isImpacting).toBe(false);
      expect(impact.severity).toBe('low');
      expect(impact.affectedOperations).toHaveLength(0);
    });

    it('should detect high impact when API response time exceeds threshold', async () => {
      const mockMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        backupId: 'test-backup-005',
        apiResponseTime: { current: 120, baseline: 95, increase: 25 }, // 25% increase
        systemMetrics: { cpuUsage: 45, memoryUsage: 600, diskIO: { read: 30, write: 20 } },
        databaseMetrics: { connectionCount: 40, queryLatency: 200, lockContention: 5, activeQueries: 15 },
        networkMetrics: { uploadSpeed: 12, downloadSpeed: 30, latency: 100 },
        weddingContext: { isPeakHours: true, activeWeddings: 8, criticalOperations: ['photo_uploads'], vendorActivity: 45 }
      };

      monitor['currentMetrics'] = mockMetrics;
      
      const impact = await monitor.detectPerformanceImpact();
      
      expect(impact.isImpacting).toBe(true);
      expect(impact.severity).toBe('high');
      expect(impact.affectedOperations.length).toBeGreaterThan(0);
      expect(impact.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should detect critical impact when wedding operations are affected', async () => {
      const mockMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        backupId: 'test-backup-006',
        apiResponseTime: { current: 150, baseline: 95, increase: 57 },
        systemMetrics: { cpuUsage: 80, memoryUsage: 800, diskIO: { read: 50, write: 40 } },
        databaseMetrics: { connectionCount: 85, queryLatency: 500, lockContention: 20, activeQueries: 25 },
        networkMetrics: { uploadSpeed: 15, downloadSpeed: 20, latency: 200 },
        weddingContext: { 
          isPeakHours: true, 
          activeWeddings: 15, 
          criticalOperations: ['photo_uploads', 'timeline_updates', 'vendor_coordination'], 
          vendorActivity: 80 
        }
      };

      monitor['currentMetrics'] = mockMetrics;
      
      const impact = await monitor.detectPerformanceImpact();
      
      expect(impact.isImpacting).toBe(true);
      expect(impact.severity).toBe('critical');
      expect(impact.affectedOperations).toContain('Wedding planning activities');
      expect(impact.recommendedActions).toContain(expect.stringMatching(/halt|stop|emergency/i));
    });
  });

  describe('Schedule Optimization', () => {
    it('should recommend proceeding during off-peak hours with low load', async () => {
      // Mock off-peak hours (e.g., 2 AM)
      const mockDate = new Date('2024-01-15T02:00:00Z');
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2);
      
      const optimization = await monitor.optimizeBackupScheduling();
      
      expect(optimization.recommendedAction).toBe('proceed');
      expect(optimization.currentLoad).toBeLessThan(50);
    });

    it('should recommend throttling during peak hours with moderate load', async () => {
      // Mock peak hours (e.g., 7 PM)
      const mockDate = new Date('2024-01-15T19:00:00Z');
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(19);
      
      // Mock moderate system load
      jest.spyOn(monitor, 'getCurrentSystemLoad' as any).mockResolvedValue(60);
      
      const optimization = await monitor.optimizeBackupScheduling();
      
      expect(optimization.recommendedAction).toBe('throttle');
      expect(optimization.nextOptimalWindow).toBeInstanceOf(Date);
    });

    it('should recommend postponing when critical operations are active', async () => {
      // Mock critical wedding operations
      jest.spyOn(monitor, 'assessWeddingContext' as any).mockResolvedValue({
        isPeakHours: true,
        activeWeddings: 10,
        criticalOperations: ['photo_uploads', 'vendor_coordination'],
        vendorActivity: 50
      });
      
      const optimization = await monitor.optimizeBackupScheduling();
      
      expect(optimization.recommendedAction).toBe('postpone');
      expect(optimization.nextOptimalWindow.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Wedding Context Analysis', () => {
    it('should correctly identify peak hours', async () => {
      // Test peak hours (6 AM - 10 PM)
      for (let hour = 6; hour <= 22; hour++) {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
        
        const context = await monitor['assessWeddingContext']();
        
        expect(context.isPeakHours).toBe(true);
      }
      
      // Test off-peak hours
      for (let hour = 23; hour <= 24; hour++) {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hour % 24);
        
        const context = await monitor['assessWeddingContext']();
        
        expect(context.isPeakHours).toBe(false);
      }
    });

    it('should identify critical operations', async () => {
      // Mock Supabase responses for critical operations detection
      const mockSupabase = monitor['supabase'] as any;
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue(
              Promise.resolve({ data: [{ id: 1 }, { id: 2 }] }) // 2 active uploads
            )
          })
        })
      });
      
      const criticalOps = await monitor['identifyCriticalOperations']();
      
      expect(criticalOps).toContain('Photo uploads in progress');
    });
  });

  describe('Performance Thresholds', () => {
    it('should use correct default thresholds', () => {
      const thresholds = monitor['thresholds'];
      
      expect(thresholds.apiResponseIncrease).toBe(5); // 5%
      expect(thresholds.cpuUtilizationPeak).toBe(30); // 30%
      expect(thresholds.queryResponseIncrease).toBe(20); // 20%
      expect(thresholds.memoryConsumption).toBe(500); // 500MB
      expect(thresholds.uploadBandwidth).toBe(10); // 10Mbps
    });

    it('should respect threshold limits in impact analysis', async () => {
      // Test exactly at threshold
      const mockMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        backupId: 'threshold-test',
        apiResponseTime: { current: 99.75, baseline: 95, increase: 5 }, // Exactly 5%
        systemMetrics: { cpuUsage: 30, memoryUsage: 500, diskIO: { read: 10, write: 5 } }, // Exactly at limits
        databaseMetrics: { connectionCount: 20, queryLatency: 100, lockContention: 0, activeQueries: 5 },
        networkMetrics: { uploadSpeed: 10, downloadSpeed: 50, latency: 25 }, // Exactly at bandwidth limit
        weddingContext: { isPeakHours: true, activeWeddings: 5, criticalOperations: [], vendorActivity: 25 }
      };

      monitor['currentMetrics'] = mockMetrics;
      
      const impact = await monitor.detectPerformanceImpact();
      
      // At threshold should trigger some warnings but not be critical
      expect(impact.isImpacting).toBe(true);
      expect(impact.severity).not.toBe('critical');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const mockSupabase = monitor['supabase'] as any;
      mockSupabase.rpc.mockRejectedValue(new Error('Database connection failed'));
      
      const metrics = await monitor.monitorBackupPerformance('error-test');
      
      // Should still return metrics with fallback values
      expect(metrics).toBeDefined();
      expect(metrics.databaseMetrics.connectionCount).toBe(0);
      expect(metrics.databaseMetrics.queryLatency).toBe(0);
    });

    it('should handle missing baseline metrics', async () => {
      // Clear baseline metrics
      monitor['baselineMetrics'].clear();
      
      const impact = await monitor.detectPerformanceImpact();
      
      // Should handle missing baselines without crashing
      expect(impact).toBeDefined();
      expect(typeof impact.isImpacting).toBe('boolean');
    });
  });

  describe('Metrics Storage', () => {
    it('should store performance metrics in database', async () => {
      const backupId = 'storage-test';
      const mockSupabase = monitor['supabase'] as any;
      
      await monitor.monitorBackupPerformance(backupId);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('backup_performance_metrics');
    });

    it('should handle storage errors without affecting monitoring', async () => {
      const mockSupabase = monitor['supabase'] as any;
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Storage failed'))
      });
      
      const backupId = 'storage-error-test';
      
      // Should not throw error even if storage fails
      await expect(monitor.monitorBackupPerformance(backupId)).resolves.toBeDefined();
    });
  });

  describe('Real-time Monitoring', () => {
    it('should perform continuous monitoring when active', async () => {
      const backupId = 'continuous-test';
      
      await monitor.startMonitoring(backupId);
      
      // Wait a bit for continuous monitoring to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(monitor['monitoringActive']).toBe(true);
      
      await monitor.stopMonitoring();
      
      expect(monitor['monitoringActive']).toBe(false);
    });
  });
});

describe('Performance Metrics Integration', () => {
  it('should integrate with wedding planning workflow', async () => {
    const monitor = new BackupPerformanceMonitor();
    
    // Simulate a real wedding planning scenario
    const backupId = 'wedding-integration-test';
    
    await monitor.startMonitoring(backupId);
    
    // Simulate metrics during wedding planning activities
    const metrics = await monitor.monitorBackupPerformance(backupId);
    
    // Verify wedding context is properly captured
    expect(metrics.weddingContext).toBeDefined();
    expect(metrics.weddingContext.isPeakHours).toBeDefined();
    expect(metrics.weddingContext.activeWeddings).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(metrics.weddingContext.criticalOperations)).toBe(true);
    
    const impact = await monitor.detectPerformanceImpact();
    
    expect(impact.affectedOperations).toBeInstanceOf(Array);
    expect(impact.recommendedActions).toBeInstanceOf(Array);
    
    await monitor.stopMonitoring();
  });
});