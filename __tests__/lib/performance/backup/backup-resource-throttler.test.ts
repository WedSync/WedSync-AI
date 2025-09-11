/**
 * WS-178: Backup Resource Throttler Tests
 * Team D - Round 1: Comprehensive test suite for backup resource throttling
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import BackupResourceThrottler, {
  ThrottleConfig,
  SystemMetrics,
  CircuitBreakerStatus,
  ThrottleDecision
} from '@/lib/performance/backup/backup-resource-throttler';
import { EventEmitter } from 'events';

describe('BackupResourceThrottler', () => {
  let throttler: BackupResourceThrottler;

  beforeEach(() => {
    throttler = new BackupResourceThrottler();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any active operations
    throttler.removeAllListeners();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(throttler).toBeInstanceOf(BackupResourceThrottler);
      expect(throttler).toBeInstanceOf(EventEmitter);
      
      const config = throttler['config'];
      expect(config.cpuLimit.peakHours).toBe(30);
      expect(config.cpuLimit.offPeak).toBe(80);
      expect(config.memoryLimit).toBe(500);
      expect(config.bandwidthLimit).toBe(10);
      expect(config.concurrentOperations).toBe(2);
      expect(config.adaptiveThrottling).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<ThrottleConfig> = {
        cpuLimit: {
          peakHours: 20,
          offPeak: 70
        },
        memoryLimit: 300,
        concurrentOperations: 1
      };
      
      const customThrottler = new BackupResourceThrottler(customConfig);
      const config = customThrottler['config'];
      
      expect(config.cpuLimit.peakHours).toBe(20);
      expect(config.cpuLimit.offPeak).toBe(70);
      expect(config.memoryLimit).toBe(300);
      expect(config.concurrentOperations).toBe(1);
    });

    it('should initialize circuit breaker in closed state', () => {
      const circuitBreaker = throttler['circuitBreaker'];
      
      expect(circuitBreaker.state).toBe('closed');
      expect(circuitBreaker.failureCount).toBe(0);
      expect(circuitBreaker.lastFailureTime).toBe(0);
    });
  });

  describe('Throttling Decisions', () => {
    it('should allow operation during off-peak hours with low load', async () => {
      // Mock off-peak hours
      jest.spyOn(throttler, 'isPeakHours' as any).mockReturnValue(false);
      
      // Mock low system load
      const mockMetrics: SystemMetrics = {
        cpu: { usage: 15, load: 0.15, available: 85 },
        memory: { used: 200, available: 800, percentage: 20 },
        network: { uploadSpeed: 5, downloadSpeed: 50, latency: 20 },
        database: { connections: 10, queryQueue: 0, lockContention: 0 }
      };
      
      jest.spyOn(throttler, 'getCurrentSystemLoad').mockResolvedValue(mockMetrics);
      
      const decision = await throttler.throttleBackupOperations('test-op-1');
      
      expect(decision.action).toBe('proceed');
      expect(decision.throttleLevel).toBe(0);
      expect(decision.waitTime).toBe(0);
    });

    it('should throttle during peak hours with moderate load', async () => {
      // Mock peak hours
      jest.spyOn(throttler, 'isPeakHours' as any).mockReturnValue(true);
      
      // Mock moderate system load exceeding peak hour limits
      const mockMetrics: SystemMetrics = {
        cpu: { usage: 45, load: 0.45, available: 55 }, // Above 30% peak limit
        memory: { used: 400, available: 600, percentage: 40 },
        network: { uploadSpeed: 8, downloadSpeed: 30, latency: 50 },
        database: { connections: 25, queryQueue: 2, lockContention: 0.1 }
      };
      
      jest.spyOn(throttler, 'getCurrentSystemLoad').mockResolvedValue(mockMetrics);
      
      const decision = await throttler.throttleBackupOperations('test-op-2');
      
      expect(decision.action).toBe('throttle');
      expect(decision.throttleLevel).toBeGreaterThan(0);
      expect(decision.reason).toMatch(/throttling/i);
    });

    it('should halt operations under severe load', async () => {
      // Mock high system load
      const mockMetrics: SystemMetrics = {
        cpu: { usage: 95, load: 0.95, available: 5 },
        memory: { used: 900, available: 100, percentage: 90 },
        network: { uploadSpeed: 20, downloadSpeed: 10, latency: 200 },
        database: { connections: 90, queryQueue: 15, lockContention: 5 }
      };
      
      jest.spyOn(throttler, 'getCurrentSystemLoad').mockResolvedValue(mockMetrics);
      
      const decision = await throttler.throttleBackupOperations('test-op-3');
      
      expect(decision.action).toBe('halt');
      expect(decision.throttleLevel).toBe(0);
      expect(decision.waitTime).toBeGreaterThan(0);
      expect(decision.reason).toMatch(/severe load/i);
    });

    it('should respect concurrent operation limits', async () => {
      // Mock low load but at concurrent limit
      const mockMetrics: SystemMetrics = {
        cpu: { usage: 10, load: 0.1, available: 90 },
        memory: { used: 100, available: 900, percentage: 10 },
        network: { uploadSpeed: 3, downloadSpeed: 80, latency: 10 },
        database: { connections: 5, queryQueue: 0, lockContention: 0 }
      };
      
      jest.spyOn(throttler, 'getCurrentSystemLoad').mockResolvedValue(mockMetrics);
      
      // Add operations to reach concurrent limit
      throttler['activeOperations'].add('op-1');
      throttler['activeOperations'].add('op-2'); // At limit (2)
      
      const decision = await throttler.throttleBackupOperations('test-op-4');
      
      expect(decision.action).toBe('halt');
      expect(decision.reason).toMatch(/concurrent operations/i);
    });
  });

  describe('Circuit Breaker', () => {
    it('should remain closed under normal conditions', async () => {
      // Mock healthy system
      jest.spyOn(throttler, 'checkSystemHealth' as any).mockResolvedValue({
        healthy: true,
        issues: []
      });
      
      const status = await throttler.implementCircuitBreaker();
      
      expect(status.state).toBe('closed');
      expect(status.failureCount).toBe(0);
    });

    it('should open circuit breaker when system is unhealthy', async () => {
      // Mock unhealthy system
      jest.spyOn(throttler, 'checkSystemHealth' as any).mockResolvedValue({
        healthy: false,
        issues: ['CPU usage critically high', 'Memory usage critically high']
      });
      
      await throttler.implementCircuitBreaker();
      
      const status = throttler['circuitBreaker'];
      expect(status.state).toBe('open');
      expect(status.failureCount).toBeGreaterThan(0);
      expect(status.reason).toMatch(/CPU usage critically high/);
    });

    it('should prevent operations when circuit is open', async () => {
      // Set circuit breaker to open state
      throttler['circuitBreaker'].state = 'open';
      throttler['circuitBreaker'].nextAttemptTime = Date.now() + 300000; // 5 minutes
      
      const decision = await throttler.throttleBackupOperations('test-op-5');
      
      expect(decision.action).toBe('halt');
      expect(decision.reason).toMatch(/circuit breaker is open/i);
    });

    it('should transition to half-open after timeout', async () => {
      // Set circuit breaker to open with past timeout
      throttler['circuitBreaker'] = {
        state: 'open',
        failureCount: 3,
        lastFailureTime: Date.now() - 400000,
        nextAttemptTime: Date.now() - 100000, // Past timeout
        reason: 'Test failure'
      };
      
      // Mock healthy system for recovery
      jest.spyOn(throttler, 'checkSystemHealth' as any).mockResolvedValue({
        healthy: true,
        issues: []
      });
      
      const status = await throttler.implementCircuitBreaker();
      
      expect(status.state).toBe('closed'); // Should close on healthy system
      expect(status.failureCount).toBe(0);
    });
  });

  describe('System Metrics Collection', () => {
    it('should collect comprehensive system metrics', async () => {
      const metrics = await throttler.getCurrentSystemLoad();
      
      expect(metrics).toMatchObject({
        cpu: {
          usage: expect.any(Number),
          load: expect.any(Number),
          available: expect.any(Number)
        },
        memory: {
          used: expect.any(Number),
          available: expect.any(Number),
          percentage: expect.any(Number)
        },
        network: {
          uploadSpeed: expect.any(Number),
          downloadSpeed: expect.any(Number),
          latency: expect.any(Number)
        },
        database: {
          connections: expect.any(Number),
          queryQueue: expect.any(Number),
          lockContention: expect.any(Number)
        }
      });
    });

    it('should provide realistic system metrics', async () => {
      const metrics = await throttler.getCurrentSystemLoad();
      
      // CPU metrics should be percentages
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100);
      
      // Memory percentage should be 0-100
      expect(metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.percentage).toBeLessThanOrEqual(100);
      
      // Network speeds should be positive
      expect(metrics.network.uploadSpeed).toBeGreaterThanOrEqual(0);
      expect(metrics.network.downloadSpeed).toBeGreaterThanOrEqual(0);
      
      // Database connections should be non-negative
      expect(metrics.database.connections).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Peak Hour Detection', () => {
    it('should correctly identify peak hours (6 AM - 10 PM)', () => {
      const isPeakHours = throttler['isPeakHours'].bind(throttler);
      
      // Mock different hours
      const peakHours = [6, 12, 18, 22]; // 6 AM, 12 PM, 6 PM, 10 PM
      const offPeakHours = [2, 5, 23, 1]; // 2 AM, 5 AM, 11 PM, 1 AM
      
      peakHours.forEach(hour => {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
        expect(isPeakHours()).toBe(true);
      });
      
      offPeakHours.forEach(hour => {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
        expect(isPeakHours()).toBe(false);
      });
    });
  });

  describe('Operation Lifecycle', () => {
    it('should track active operations', async () => {
      const operationId = 'lifecycle-test-1';
      
      // Mock conditions for proceeding
      jest.spyOn(throttler, 'getCurrentSystemLoad').mockResolvedValue({
        cpu: { usage: 10, load: 0.1, available: 90 },
        memory: { used: 100, available: 900, percentage: 10 },
        network: { uploadSpeed: 5, downloadSpeed: 50, latency: 20 },
        database: { connections: 5, queryQueue: 0, lockContention: 0 }
      });
      
      const decision = await throttler.throttleBackupOperations(operationId);
      
      expect(decision.action).toBe('proceed');
      expect(throttler['activeOperations'].has(operationId)).toBe(true);
    });

    it('should complete operations successfully', async () => {
      const operationId = 'lifecycle-test-2';
      
      // Add operation to active set
      throttler['activeOperations'].add(operationId);
      
      let completionEvent: any = null;
      throttler.once('operationComplete', (event) => {
        completionEvent = event;
      });
      
      await throttler.completeOperation(operationId, true);
      
      expect(throttler['activeOperations'].has(operationId)).toBe(false);
      expect(completionEvent).toMatchObject({
        operationId,
        success: true,
        activeOperations: expect.any(Number)
      });
    });

    it('should handle operation failures and update circuit breaker', async () => {
      const operationId = 'failure-test-1';
      
      throttler['activeOperations'].add(operationId);
      
      await throttler.completeOperation(operationId, false);
      
      expect(throttler['circuitBreaker'].failureCount).toBeGreaterThan(0);
      expect(throttler['activeOperations'].has(operationId)).toBe(false);
    });

    it('should trigger circuit breaker after multiple failures', async () => {
      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        const operationId = `failure-test-${i}`;
        throttler['activeOperations'].add(operationId);
        await throttler.completeOperation(operationId, false);
      }
      
      expect(throttler['circuitBreaker'].state).toBe('open');
      expect(throttler['circuitBreaker'].failureCount).toBe(3);
    });
  });

  describe('Emergency Procedures', () => {
    it('should halt all operations during emergency stop', async () => {
      const operationIds = ['emergency-1', 'emergency-2', 'emergency-3'];
      
      // Add multiple active operations
      operationIds.forEach(id => throttler['activeOperations'].add(id));
      
      let emergencyEvent: any = null;
      throttler.once('emergencyStop', (event) => {
        emergencyEvent = event;
      });
      
      const reason = 'Critical system failure detected';
      await throttler.emergencyStop(reason);
      
      expect(throttler['emergencyMode']).toBe(true);
      expect(throttler['activeOperations'].size).toBe(0);
      expect(throttler['circuitBreaker'].state).toBe('open');
      expect(emergencyEvent.reason).toBe(reason);
    });

    it('should prevent new operations during emergency mode', async () => {
      await throttler.emergencyStop('Test emergency');
      
      const decision = await throttler.throttleBackupOperations('emergency-test');
      
      expect(decision.action).toBe('halt');
      expect(decision.reason).toMatch(/emergency mode active/i);
    });

    it('should resume operations after emergency is resolved', async () => {
      await throttler.emergencyStop('Test emergency');
      
      // Mock healthy system for resumption
      jest.spyOn(throttler, 'checkSystemHealth' as any).mockResolvedValue({
        healthy: true,
        issues: []
      });
      
      let resumeEvent: any = null;
      throttler.once('operationsResumed', (event) => {
        resumeEvent = event;
      });
      
      const resumed = await throttler.resumeOperations();
      
      expect(resumed).toBe(true);
      expect(throttler['emergencyMode']).toBe(false);
      expect(throttler['circuitBreaker'].state).toBe('closed');
      expect(resumeEvent).toBeDefined();
    });

    it('should not resume operations if system is still unhealthy', async () => {
      await throttler.emergencyStop('Test emergency');
      
      // Mock unhealthy system
      jest.spyOn(throttler, 'checkSystemHealth' as any).mockResolvedValue({
        healthy: false,
        issues: ['System still overloaded']
      });
      
      const resumed = await throttler.resumeOperations();
      
      expect(resumed).toBe(false);
      expect(throttler['emergencyMode']).toBe(true);
    });
  });

  describe('Event Emissions', () => {
    it('should emit throttle decision events', async () => {
      let decisionEvent: any = null;
      throttler.once('throttleDecision', (event) => {
        decisionEvent = event;
      });
      
      await throttler.throttleBackupOperations('event-test-1');
      
      expect(decisionEvent).toMatchObject({
        operationId: 'event-test-1',
        decision: expect.any(Object),
        metrics: expect.any(Object),
        isPeakHours: expect.any(Boolean)
      });
    });

    it('should emit throttle applied events', async () => {
      let throttleEvent: any = null;
      throttler.once('throttleApplied', (event) => {
        throttleEvent = event;
      });
      
      // Mock high load to trigger throttling
      jest.spyOn(throttler, 'getCurrentSystemLoad').mockResolvedValue({
        cpu: { usage: 50, load: 0.5, available: 50 },
        memory: { used: 600, available: 400, percentage: 60 },
        network: { uploadSpeed: 12, downloadSpeed: 30, latency: 80 },
        database: { connections: 40, queryQueue: 5, lockContention: 2 }
      });
      
      await throttler.throttleBackupOperations('throttle-event-test');
      
      expect(throttleEvent).toMatchObject({
        operationId: 'throttle-event-test',
        throttleLevel: expect.any(Number),
        config: expect.any(Object)
      });
    });
  });

  describe('Wedding Context Integration', () => {
    it('should consider wedding-critical operations in health check', async () => {
      // Mock wedding-critical operations
      jest.spyOn(throttler, 'hasWeddingCriticalOperations' as any).mockResolvedValue(true);
      
      const health = await throttler['checkSystemHealth']();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Wedding-critical operations in progress');
    });

    it('should adapt throttling based on wedding activity', async () => {
      // This test would verify that throttling decisions consider
      // wedding-specific context like photo uploads, vendor coordination, etc.
      
      const operationId = 'wedding-context-test';
      
      // Mock moderate load but during critical wedding operations
      jest.spyOn(throttler, 'getCurrentSystemLoad').mockResolvedValue({
        cpu: { usage: 35, load: 0.35, available: 65 },
        memory: { used: 400, available: 600, percentage: 40 },
        network: { uploadSpeed: 8, downloadSpeed: 40, latency: 30 },
        database: { connections: 30, queryQueue: 2, lockContention: 1 }
      });
      
      jest.spyOn(throttler, 'hasWeddingCriticalOperations' as any).mockResolvedValue(true);
      
      const decision = await throttler.throttleBackupOperations(operationId);
      
      // Should be more conservative during wedding-critical operations
      expect(decision.action).toBe('halt');
    });
  });

  describe('Performance and Resource Optimization', () => {
    it('should optimize throttling decisions based on historical data', () => {
      const operationId = 'optimization-test';
      
      // Add some throttle history
      throttler['throttleHistory'].set(operationId, [10, 20, 15, 25, 30]);
      
      const history = throttler['throttleHistory'].get(operationId);
      
      expect(history).toHaveLength(5);
      expect(history).toEqual([10, 20, 15, 25, 30]);
    });

    it('should maintain throttle history with reasonable limits', () => {
      const operationId = 'history-limit-test';
      
      // Add more than 10 entries
      for (let i = 0; i < 15; i++) {
        throttler['recordThrottleDecision'](operationId, i * 5);
      }
      
      const history = throttler['throttleHistory'].get(operationId);
      
      // Should be limited to 10 entries
      expect(history!.length).toBe(10);
      expect(history![0]).toBe(25); // Should have removed early entries
      expect(history![9]).toBe(70);
    });
  });
});

describe('Integration Tests', () => {
  describe('Real-world Scenario Simulations', () => {
    it('should handle photo upload peak during backup', async () => {
      const throttler = new BackupResourceThrottler();
      
      // Simulate evening photo upload peak (8 PM)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      
      // Mock high photo upload activity affecting system
      jest.spyOn(throttler, 'getCurrentSystemLoad').mockResolvedValue({
        cpu: { usage: 40, load: 0.4, available: 60 },
        memory: { used: 550, available: 450, percentage: 55 },
        network: { uploadSpeed: 15, downloadSpeed: 25, latency: 60 },
        database: { connections: 45, queryQueue: 8, lockContention: 3 }
      });
      
      const decision = await throttler.throttleBackupOperations('photo-peak-test');
      
      expect(decision.action).toBe('throttle');
      expect(decision.reason).toMatch(/system load requires.*throttling/i);
    });

    it('should handle vendor coordination spike', async () => {
      const throttler = new BackupResourceThrottler();
      
      // Mock vendor coordination causing database load
      jest.spyOn(throttler, 'getCurrentSystemLoad').mockResolvedValue({
        cpu: { usage: 25, load: 0.25, available: 75 },
        memory: { used: 350, available: 650, percentage: 35 },
        network: { uploadSpeed: 8, downloadSpeed: 45, latency: 30 },
        database: { connections: 75, queryQueue: 12, lockContention: 8 } // High DB load
      });
      
      jest.spyOn(throttler, 'hasWeddingCriticalOperations' as any).mockResolvedValue(true);
      
      const decision = await throttler.throttleBackupOperations('vendor-spike-test');
      
      expect(decision.action).toBe('halt');
    });

    it('should optimize for off-peak wedding season', async () => {
      const throttler = new BackupResourceThrottler({
        cpuLimit: {
          peakHours: 25, // More aggressive during low season
          offPeak: 85
        },
        concurrentOperations: 3 // Allow more during low season
      });
      
      // Mock off-peak hours in low wedding season
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(3); // 3 AM
      
      jest.spyOn(throttler, 'getCurrentSystemLoad').mockResolvedValue({
        cpu: { usage: 15, load: 0.15, available: 85 },
        memory: { used: 200, available: 800, percentage: 20 },
        network: { uploadSpeed: 6, downloadSpeed: 60, latency: 15 },
        database: { connections: 8, queryQueue: 0, lockContention: 0 }
      });
      
      const decision = await throttler.throttleBackupOperations('off-peak-season-test');
      
      expect(decision.action).toBe('proceed');
      expect(decision.throttleLevel).toBe(0);
    });
  });
});