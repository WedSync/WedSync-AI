/**
 * Unit tests for Redis Manager and Rate Limit Operations
 * Tests Redis connection handling and atomic operations
 */

import Redis from 'ioredis';
import { redisManager, RedisRateLimitOperations } from '@/lib/redis';
import { logger } from '@/lib/monitoring/structured-logger';

// Mock ioredis
jest.mock('ioredis');
jest.mock('@/lib/monitoring/structured-logger');

const mockRedisInstance = {
  ping: jest.fn(),
  disconnect: jest.fn(),
  eval: jest.fn(),
  zremrangebyscore: jest.fn(),
  zcard: jest.fn(),
  del: jest.fn(),
  setex: jest.fn(),
  get: jest.fn(),
  on: jest.fn(),
  connect: jest.fn()
};

const mockRedisCluster = {
  ping: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn()
};

(Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedisInstance as any);
(Redis.Cluster as jest.MockedClass<typeof Redis.Cluster>).mockImplementation(() => mockRedisCluster as any);

describe('RedisManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_CLUSTER_ENDPOINTS;
    delete process.env.REDIS_PASSWORD;
  });

  describe('initialization', () => {
    it('should initialize single Redis instance with URL', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      await redisManager.initialize();

      expect(Redis).toHaveBeenCalledWith(
        'redis://localhost:6379',
        expect.objectContaining({
          connectTimeout: 10000,
          commandTimeout: 5000,
          lazyConnect: true,
          maxRetriesPerRequest: null,
          enableOfflineQueue: false
        })
      );
    });

    it('should initialize Redis cluster with endpoints', async () => {
      process.env.REDIS_CLUSTER_ENDPOINTS = 'redis1.example.com:6379,redis2.example.com:6379';
      process.env.REDIS_PASSWORD = 'secret';

      await redisManager.initialize();

      expect(Redis.Cluster).toHaveBeenCalledWith(
        [
          { host: 'redis1.example.com', port: 6379 },
          { host: 'redis2.example.com', port: 6379 }
        ],
        expect.objectContaining({
          redisOptions: expect.objectContaining({
            password: 'secret',
            connectTimeout: 10000,
            commandTimeout: 5000,
            maxRetriesPerRequest: null
          }),
          enableOfflineQueue: false,
          maxRedirections: 16,
          scaleReads: 'slave'
        })
      );
    });

    it('should initialize development Redis when no config provided', async () => {
      await redisManager.initialize();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 6379,
          connectTimeout: 5000,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false
        })
      );
    });

    it('should handle initialization errors', async () => {
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await expect(redisManager.initialize()).rejects.toThrow('Connection failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize Redis connection',
        expect.any(Error)
      );
    });
  });

  describe('client management', () => {
    it('should return Redis client after initialization', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      await redisManager.initialize();

      const client = redisManager.getClient();
      expect(client).toBe(mockRedisInstance);
    });

    it('should return cluster client when cluster is configured', async () => {
      process.env.REDIS_CLUSTER_ENDPOINTS = 'redis1:6379';
      await redisManager.initialize();

      const client = redisManager.getClient();
      expect(client).toBe(mockRedisCluster);
    });

    it('should throw error when client not initialized', () => {
      expect(() => redisManager.getClient()).toThrow('Redis not initialized');
    });
  });

  describe('health check', () => {
    it('should return true when Redis responds to ping', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      await redisManager.initialize();
      mockRedisInstance.ping.mockResolvedValue('PONG');

      const isHealthy = await redisManager.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockRedisInstance.ping).toHaveBeenCalled();
    });

    it('should return false when Redis ping fails', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      await redisManager.initialize();
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection lost'));

      const isHealthy = await redisManager.healthCheck();

      expect(isHealthy).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Redis health check failed',
        expect.any(Error)
      );
    });
  });

  describe('connection cleanup', () => {
    it('should close single Redis connection', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      await redisManager.initialize();
      mockRedisInstance.disconnect.mockResolvedValue('OK');

      await redisManager.closeConnection();

      expect(mockRedisInstance.disconnect).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Redis connection closed');
    });

    it('should close cluster Redis connection', async () => {
      process.env.REDIS_CLUSTER_ENDPOINTS = 'redis1:6379';
      await redisManager.initialize();
      mockRedisCluster.disconnect.mockResolvedValue('OK');

      await redisManager.closeConnection();

      expect(mockRedisCluster.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnection errors', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      await redisManager.initialize();
      mockRedisInstance.disconnect.mockRejectedValue(new Error('Disconnect failed'));

      await redisManager.closeConnection();

      expect(logger.error).toHaveBeenCalledWith(
        'Error closing Redis connection',
        expect.any(Error)
      );
    });
  });
});

describe('RedisRateLimitOperations', () => {
  let operations: RedisRateLimitOperations;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.REDIS_URL = 'redis://localhost:6379';
    await redisManager.initialize();
    operations = new RedisRateLimitOperations();
  });

  describe('checkSlidingWindow', () => {
    it('should perform sliding window check with Lua script', async () => {
      const mockResult = [45, 55]; // current, remaining
      mockRedisInstance.eval.mockResolvedValue(mockResult);

      const result = await operations.checkSlidingWindow('test-key', 60000, 100, Date.now());

      expect(result.current).toBe(45);
      expect(result.remaining).toBe(55);
      expect(result.allowed).toBe(true);
      expect(mockRedisInstance.eval).toHaveBeenCalledWith(
        expect.stringContaining('ZREMRANGEBYSCORE'),
        1,
        'test-key',
        '60000',
        '100',
        expect.any(String)
      );
    });

    it('should indicate not allowed when limit exceeded', async () => {
      const mockResult = [105, -5]; // exceeded limit
      mockRedisInstance.eval.mockResolvedValue(mockResult);

      const result = await operations.checkSlidingWindow('test-key', 60000, 100);

      expect(result.current).toBe(105);
      expect(result.remaining).toBe(-5);
      expect(result.allowed).toBe(false);
    });

    it('should handle Lua script errors gracefully', async () => {
      mockRedisInstance.eval.mockRejectedValue(new Error('Script error'));

      const result = await operations.checkSlidingWindow('test-key', 60000, 100);

      expect(result.allowed).toBe(true); // Fail open
      expect(result.current).toBe(0);
      expect(result.remaining).toBe(100);
      expect(logger.error).toHaveBeenCalledWith(
        'Sliding window check failed',
        expect.any(Error),
        expect.objectContaining({ key: 'test-key' })
      );
    });
  });

  describe('getCurrentCount', () => {
    it('should get current count without incrementing', async () => {
      mockRedisInstance.zremrangebyscore.mockResolvedValue(5); // cleaned up entries
      mockRedisInstance.zcard.mockResolvedValue(42);

      const count = await operations.getCurrentCount('test-key', 60000, Date.now());

      expect(count).toBe(42);
      expect(mockRedisInstance.zremrangebyscore).toHaveBeenCalled();
      expect(mockRedisInstance.zcard).toHaveBeenCalledWith('test-key');
    });

    it('should handle errors and return 0', async () => {
      mockRedisInstance.zcard.mockRejectedValue(new Error('Redis error'));

      const count = await operations.getCurrentCount('test-key', 60000);

      expect(count).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        'Get current count failed',
        expect.any(Error),
        expect.objectContaining({ key: 'test-key' })
      );
    });
  });

  describe('resetLimit', () => {
    it('should delete key to reset limit', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      await operations.resetLimit('test-key');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle reset errors', async () => {
      mockRedisInstance.del.mockRejectedValue(new Error('Delete failed'));

      await operations.resetLimit('test-key');

      expect(logger.error).toHaveBeenCalledWith(
        'Reset limit failed',
        expect.any(Error),
        expect.objectContaining({ key: 'test-key' })
      );
    });
  });

  describe('override management', () => {
    it('should set rate limit override', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');

      await operations.setOverride('test-key', 500, 120000);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'override:test-key',
        120, // windowMs in seconds
        JSON.stringify({
          limit: 500,
          windowMs: 120000,
          createdAt: expect.any(Number)
        })
      );
    });

    it('should get rate limit override', async () => {
      const overrideData = {
        limit: 500,
        windowMs: 120000,
        createdAt: Date.now()
      };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(overrideData));

      const override = await operations.getOverride('test-key');

      expect(override).toEqual({
        limit: 500,
        windowMs: 120000
      });
    });

    it('should return null when no override exists', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const override = await operations.getOverride('test-key');

      expect(override).toBeNull();
    });

    it('should delete rate limit override', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      await operations.deleteOverride('test-key');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('override:test-key');
    });

    it('should handle override operation errors', async () => {
      mockRedisInstance.setex.mockRejectedValue(new Error('Set override failed'));

      await operations.setOverride('test-key', 500, 120000);

      expect(logger.error).toHaveBeenCalledWith(
        'Set override failed',
        expect.any(Error),
        expect.objectContaining({ key: 'test-key' })
      );
    });

    it('should handle malformed override data', async () => {
      mockRedisInstance.get.mockResolvedValue('invalid json');

      const override = await operations.getOverride('test-key');

      expect(override).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Get override failed',
        expect.any(Error),
        expect.objectContaining({ key: 'test-key' })
      );
    });
  });

  describe('Lua script generation', () => {
    it('should generate correct Lua script for sliding window', async () => {
      mockRedisInstance.eval.mockResolvedValue([50, 50]);

      await operations.checkSlidingWindow('test-key', 60000, 100, 1642781234000);

      const [script] = mockRedisInstance.eval.mock.calls[0];
      expect(script).toContain('ZREMRANGEBYSCORE');
      expect(script).toContain('ZCARD');
      expect(script).toContain('ZADD');
      expect(script).toContain('EXPIRE');
    });

    it('should use current timestamp when not provided', async () => {
      const before = Date.now();
      mockRedisInstance.eval.mockResolvedValue([50, 50]);

      await operations.checkSlidingWindow('test-key', 60000, 100);

      const [, , , , , timestamp] = mockRedisInstance.eval.mock.calls[0];
      const providedTime = parseInt(timestamp);
      const after = Date.now();

      expect(providedTime).toBeGreaterThanOrEqual(before);
      expect(providedTime).toBeLessThanOrEqual(after);
    });
  });

  describe('error handling patterns', () => {
    it('should consistently fail open on errors', async () => {
      const operations = [
        'checkSlidingWindow',
        'getCurrentCount',
        'resetLimit',
        'setOverride',
        'getOverride',
        'deleteOverride'
      ];

      // Mock all Redis operations to fail
      mockRedisInstance.eval.mockRejectedValue(new Error('Redis down'));
      mockRedisInstance.zcard.mockRejectedValue(new Error('Redis down'));
      mockRedisInstance.del.mockRejectedValue(new Error('Redis down'));
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis down'));
      mockRedisInstance.get.mockRejectedValue(new Error('Redis down'));

      for (const op of operations) {
        const result = await (operations as any)[op]('test-key', 60000, 100);
        // Each operation should handle errors gracefully
        expect(logger.error).toHaveBeenCalled();
      }

      // Sliding window should specifically fail open
      const slidingResult = await operations.checkSlidingWindow('test-key', 60000, 100);
      expect(slidingResult.allowed).toBe(true);
    });
  });
});