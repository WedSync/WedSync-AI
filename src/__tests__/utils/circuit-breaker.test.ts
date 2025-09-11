/**
 * WS-254: Comprehensive Unit Tests for Circuit Breaker
 * 90%+ coverage target for circuit breaker implementation
 * Team B Backend Implementation
 */

import {
  CircuitBreaker,
  CircuitBreakerState,
  CircuitBreakerError,
  circuitBreakerManager,
} from '@/lib/utils/circuit-breaker';
import { jest } from '@jest/globals';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 1000, // 1 second for faster tests
      monitoringPeriod: 5000, // 5 seconds
      successThreshold: 2,
      timeout: 500,
      name: 'TestCircuitBreaker',
    });

    mockFn = jest.fn();
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const cb = new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 300000,
      });

      expect(cb.getStats().state).toBe(CircuitBreakerState.CLOSED);
      expect(cb.getStats().failures).toBe(0);
      expect(cb.getStats().successes).toBe(0);
    });

    it('should accept custom options', () => {
      const options = {
        failureThreshold: 10,
        recoveryTimeout: 30000,
        monitoringPeriod: 120000,
        successThreshold: 5,
        timeout: 15000,
        name: 'CustomBreaker',
      };

      const cb = new CircuitBreaker(options);
      expect(cb).toBeDefined();
    });
  });

  describe('CLOSED state behavior', () => {
    it('should allow requests when closed', async () => {
      mockFn.mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should track successful requests', async () => {
      mockFn.mockResolvedValue('success');

      await circuitBreaker.execute(mockFn);
      await circuitBreaker.execute(mockFn);

      const stats = circuitBreaker.getStats();
      expect(stats.successes).toBe(2);
      expect(stats.requests).toBe(2);
      expect(stats.failures).toBe(0);
    });

    it('should track failed requests', async () => {
      mockFn.mockRejectedValue(new Error('test error'));

      try {
        await circuitBreaker.execute(mockFn);
      } catch (error) {
        expect(error.message).toBe('test error');
      }

      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(1);
      expect(stats.successes).toBe(0);
      expect(stats.requests).toBe(1);
    });

    it('should open after threshold failures', async () => {
      mockFn.mockRejectedValue(new Error('test error'));

      // Fail 3 times (our threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('OPEN state behavior', () => {
    beforeEach(async () => {
      // Force circuit breaker to OPEN state
      mockFn.mockRejectedValue(new Error('test error'));

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.OPEN);
    });

    it('should reject requests immediately when open', async () => {
      mockFn.mockResolvedValue('success');

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        CircuitBreakerError,
      );
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      mockFn.mockResolvedValue('success');

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.getStats().state).toBe(
        CircuitBreakerState.HALF_OPEN,
      );
    });

    it('should include state in error message', async () => {
      try {
        await circuitBreaker.execute(mockFn);
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerError);
        expect(error.message).toContain('OPEN');
        expect(error.state).toBe(CircuitBreakerState.OPEN);
      }
    });
  });

  describe('HALF_OPEN state behavior', () => {
    beforeEach(async () => {
      // Force to OPEN state
      mockFn.mockRejectedValue(new Error('test error'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch (error) {
          // Expected
        }
      }

      // Wait for recovery timeout to transition to HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    it('should allow limited requests in half-open state', async () => {
      mockFn.mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFn);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should close after successful threshold', async () => {
      mockFn.mockResolvedValue('success');

      // Execute successful requests equal to successThreshold (2)
      await circuitBreaker.execute(mockFn);
      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should open immediately on any failure', async () => {
      mockFn.mockRejectedValue(new Error('test error'));

      try {
        await circuitBreaker.execute(mockFn);
      } catch (error) {
        // Expected
      }

      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.OPEN);
    });

    it('should reset success counter when entering half-open', async () => {
      mockFn.mockResolvedValue('success');

      // First success
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.getStats().state).toBe(
        CircuitBreakerState.HALF_OPEN,
      );

      // Should still be half-open with 1 success
      const stats = circuitBreaker.getStats();
      expect(stats.successes).toBe(1);
    });
  });

  describe('Timeout handling', () => {
    it('should timeout long-running functions', async () => {
      const slowFn = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second
        return 'success';
      });

      await expect(circuitBreaker.execute(slowFn)).rejects.toThrow(
        'Request timeout',
      );
    });

    it('should treat timeouts as failures', async () => {
      const slowFn = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return 'success';
      });

      try {
        await circuitBreaker.execute(slowFn);
      } catch (error) {
        // Expected timeout
      }

      expect(circuitBreaker.getStats().failures).toBe(1);
    });

    it('should clear timeout on successful completion', async () => {
      const fastFn = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms < 500ms timeout
        return 'success';
      });

      const result = await circuitBreaker.execute(fastFn);
      expect(result).toBe('success');
      expect(circuitBreaker.getStats().successes).toBe(1);
    });
  });

  describe('Statistics tracking', () => {
    it('should provide comprehensive stats', async () => {
      mockFn.mockResolvedValue('success');
      await circuitBreaker.execute(mockFn);

      const stats = circuitBreaker.getStats();

      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('failures');
      expect(stats).toHaveProperty('successes');
      expect(stats).toHaveProperty('requests');
      expect(stats).toHaveProperty('lastFailureTime');
      expect(stats).toHaveProperty('lastSuccessTime');
      expect(stats).toHaveProperty('stateChangedAt');
      expect(stats).toHaveProperty('uptime');

      expect(stats.successes).toBe(1);
      expect(stats.requests).toBe(1);
      expect(stats.lastSuccessTime).toBeGreaterThan(0);
    });

    it('should calculate uptime correctly', async () => {
      mockFn.mockResolvedValue('success');

      // 3 successful requests
      await circuitBreaker.execute(mockFn);
      await circuitBreaker.execute(mockFn);
      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker.getStats().uptime).toBe(100);

      // Add 1 failure
      mockFn.mockRejectedValue(new Error('error'));
      try {
        await circuitBreaker.execute(mockFn);
      } catch (error) {
        // Expected
      }

      // Should be 75% uptime (3 success out of 4 total)
      expect(circuitBreaker.getStats().uptime).toBe(75);
    });

    it('should track last failure and success times', async () => {
      mockFn.mockResolvedValue('success');
      await circuitBreaker.execute(mockFn);

      const successTime = circuitBreaker.getStats().lastSuccessTime;
      expect(successTime).toBeGreaterThan(0);

      mockFn.mockRejectedValue(new Error('error'));
      try {
        await circuitBreaker.execute(mockFn);
      } catch (error) {
        // Expected
      }

      const failureTime = circuitBreaker.getStats().lastFailureTime;
      expect(failureTime).toBeGreaterThan(successTime!);
    });
  });

  describe('Manual controls', () => {
    it('should reset circuit breaker state', async () => {
      // Create failures
      mockFn.mockRejectedValue(new Error('error'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.OPEN);

      circuitBreaker.reset();

      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.requests).toBe(0);
    });

    it('should force circuit breaker to open', () => {
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.CLOSED);

      circuitBreaker.forceOpen();

      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.OPEN);
    });

    it('should reject requests after forced open', async () => {
      circuitBreaker.forceOpen();

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        CircuitBreakerError,
      );
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle functions that throw non-Error objects', async () => {
      const fn = jest.fn(async () => {
        throw 'string error'; // eslint-disable-line @typescript-eslint/no-throw-literal
      });

      await expect(circuitBreaker.execute(fn)).rejects.toBe('string error');
      expect(circuitBreaker.getStats().failures).toBe(1);
    });

    it('should handle synchronous functions', async () => {
      const syncFn = jest.fn(() => 'sync result');

      const result = await circuitBreaker.execute(async () => syncFn());
      expect(result).toBe('sync result');
    });

    it('should handle functions that return promises', async () => {
      const promiseFn = jest.fn(() => Promise.resolve('promise result'));

      const result = await circuitBreaker.execute(promiseFn);
      expect(result).toBe('promise result');
    });
  });

  describe('Performance considerations', () => {
    it('should handle many concurrent requests', async () => {
      mockFn.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'success';
      });

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(circuitBreaker.execute(mockFn));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
      expect(results.every((r) => r === 'success')).toBe(true);
      expect(circuitBreaker.getStats().successes).toBe(100);
    });

    it('should maintain performance under load', async () => {
      mockFn.mockResolvedValue('success');

      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(circuitBreaker.execute(mockFn));
      }

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  describe('Memory management', () => {
    it('should not leak memory with many operations', async () => {
      mockFn.mockResolvedValue('success');

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        await circuitBreaker.execute(mockFn);
      }

      const stats = circuitBreaker.getStats();
      expect(stats.successes).toBe(1000);
      expect(stats.requests).toBe(1000);

      // Circuit breaker should still be functional
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
    });
  });
});

describe('CircuitBreakerManager', () => {
  beforeEach(() => {
    circuitBreakerManager.resetAll();
  });

  describe('Circuit breaker management', () => {
    it('should create and manage multiple circuit breakers', () => {
      const cb1 = circuitBreakerManager.getCircuitBreaker('service1', {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 300000,
      });

      const cb2 = circuitBreakerManager.getCircuitBreaker('service2', {
        failureThreshold: 3,
        recoveryTimeout: 30000,
        monitoringPeriod: 180000,
      });

      expect(cb1).not.toBe(cb2);
      expect(cb1.getStats().state).toBe(CircuitBreakerState.CLOSED);
      expect(cb2.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should return same instance for same name', () => {
      const cb1 = circuitBreakerManager.getCircuitBreaker('service1', {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 300000,
      });

      const cb2 = circuitBreakerManager.getCircuitBreaker('service1', {
        failureThreshold: 10, // Different options
        recoveryTimeout: 120000,
        monitoringPeriod: 600000,
      });

      expect(cb1).toBe(cb2); // Should return same instance
    });

    it('should get stats for all circuit breakers', async () => {
      const cb1 = circuitBreakerManager.getCircuitBreaker('service1', {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 300000,
      });

      const cb2 = circuitBreakerManager.getCircuitBreaker('service2', {
        failureThreshold: 3,
        recoveryTimeout: 30000,
        monitoringPeriod: 180000,
      });

      // Execute some operations
      await cb1.execute(async () => 'success');
      try {
        await cb2.execute(async () => {
          throw new Error('error');
        });
      } catch (error) {
        // Expected
      }

      const allStats = circuitBreakerManager.getAllStats();

      expect(allStats).toHaveProperty('service1');
      expect(allStats).toHaveProperty('service2');
      expect(allStats.service1.successes).toBe(1);
      expect(allStats.service2.failures).toBe(1);
    });

    it('should reset all circuit breakers', async () => {
      const cb1 = circuitBreakerManager.getCircuitBreaker('service1', {
        failureThreshold: 1,
        recoveryTimeout: 60000,
        monitoringPeriod: 300000,
      });

      const cb2 = circuitBreakerManager.getCircuitBreaker('service2', {
        failureThreshold: 1,
        recoveryTimeout: 30000,
        monitoringPeriod: 180000,
      });

      // Cause failures to open circuit breakers
      try {
        await cb1.execute(async () => {
          throw new Error('error');
        });
      } catch (error) {
        // Expected
      }

      try {
        await cb2.execute(async () => {
          throw new Error('error');
        });
      } catch (error) {
        // Expected
      }

      expect(cb1.getStats().state).toBe(CircuitBreakerState.OPEN);
      expect(cb2.getStats().state).toBe(CircuitBreakerState.OPEN);

      circuitBreakerManager.resetAll();

      expect(cb1.getStats().state).toBe(CircuitBreakerState.CLOSED);
      expect(cb2.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should provide health status summary', async () => {
      const cb1 = circuitBreakerManager.getCircuitBreaker('healthy-service', {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 300000,
      });

      const cb2 = circuitBreakerManager.getCircuitBreaker('unhealthy-service', {
        failureThreshold: 1,
        recoveryTimeout: 30000,
        monitoringPeriod: 180000,
      });

      // Make healthy service successful
      for (let i = 0; i < 10; i++) {
        await cb1.execute(async () => 'success');
      }

      // Make unhealthy service fail
      try {
        await cb2.execute(async () => {
          throw new Error('error');
        });
      } catch (error) {
        // Expected
      }

      const health = circuitBreakerManager.getHealthStatus();

      expect(health.total).toBe(2);
      expect(health.healthy).toBe(1);
      expect(health.unhealthy).toBe(1);
      expect(health.degraded).toBe(0);
    });
  });
});

describe('OpenAI Circuit Breaker Factory', () => {
  it('should create OpenAI-specific circuit breaker', async () => {
    const { createOpenAICircuitBreaker } = await import(
      '@/lib/utils/circuit-breaker'
    );
    const openAIBreaker = createOpenAICircuitBreaker();

    expect(openAIBreaker).toBeInstanceOf(CircuitBreaker);
    expect(openAIBreaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
  });

  it('should have appropriate settings for OpenAI service', async () => {
    const { createOpenAICircuitBreaker } = await import(
      '@/lib/utils/circuit-breaker'
    );
    const openAIBreaker = createOpenAICircuitBreaker();

    // Test that it can handle multiple requests
    const mockOpenAICall = jest.fn().mockResolvedValue('AI response');

    for (let i = 0; i < 3; i++) {
      const result = await openAIBreaker.execute(mockOpenAICall);
      expect(result).toBe('AI response');
    }

    expect(openAIBreaker.getStats().successes).toBe(3);
  });
});

// Test utilities
export const createMockAsyncFunction = (
  behavior: 'success' | 'failure' | 'timeout' = 'success',
) => {
  switch (behavior) {
    case 'success':
      return jest.fn().mockResolvedValue('success');
    case 'failure':
      return jest.fn().mockRejectedValue(new Error('mock error'));
    case 'timeout':
      return jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
        return 'success';
      });
    default:
      return jest.fn().mockResolvedValue('success');
  }
};
