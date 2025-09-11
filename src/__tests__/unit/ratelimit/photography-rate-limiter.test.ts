/**
 * WS-130 Round 3: Photography Rate Limiter Unit Tests
 * Tests multi-tier rate limiting with priority queuing and plan-based access
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/test';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { PhotographyRateLimiter } from '@/lib/ratelimit/photography-rate-limiter';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { FeatureGateService } from '@/lib/billing/featureGating';
import { photographyCache } from '@/lib/cache/photography-cache';
// Mock dependencies
vi.mock('@upstash/ratelimit');
vi.mock('@upstash/redis');
vi.mock('@/lib/billing/featureGating');
vi.mock('@/lib/cache/photography-cache');
const mockRedis = {
  lpush: vi.fn(),
  lpop: vi.fn(),
  publish: vi.fn(),
  get: vi.fn(),
  lrange: vi.fn(),
  quit: vi.fn(),
};
const mockRateLimiter = {
  limit: vi.fn(),
(Redis as ReturnType<typeof vi.fn>edClass<typeof Redis>).mockImplementation(() => mockRedis as unknown);
(Ratelimit as ReturnType<typeof vi.fn>edClass<typeof Ratelimit>).mockImplementation(() => mockRateLimiter as unknown);
(Ratelimit.slidingWindow as ReturnType<typeof vi.fn>) = vi.fn();
const mockFeatureGateService = FeatureGateService as ReturnType<typeof vi.fn>edClass<typeof FeatureGateService>;
const mockPhotographyCache = photographyCache as ReturnType<typeof vi.fn>ed<typeof photographyCache>;
describe('PhotographyRateLimiter', () => {
  let rateLimiter: PhotographyRateLimiter;
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup environment variables
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    // Setup default mocks
    mockRateLimiter.limit.mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000
    });
    mockFeatureGateService.getUserPlanLimits.mockResolvedValue({
      plan: 'professional',
      limits: { 'ai:photo_processing': 100 }
    mockPhotographyCache.getCachedFeatureAccess.mockResolvedValue(null);
    mockPhotographyCache.cacheFeatureAccess.mockResolvedValue(undefined);
    rateLimiter = new PhotographyRateLimiter();
  });
  afterEach(async () => {
    await rateLimiter.shutdown();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  describe('Initialization', () => {
    test('should initialize Redis connection and rate limiters', () => {
      expect(Redis).toHaveBeenCalledWith({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      });
      // Should create rate limiters for all plan configurations + global limits
      expect(Ratelimit).toHaveBeenCalledTimes(17); // 5 plans * 3 configs + 2 global limits
    test('should start queue processor', () => {
      // Verify queue processor is initialized
      expect(rateLimiter['queueProcessor']).toBeDefined();
  describe('Plan-based Rate Limiting', () => {
    test('should enforce free plan restrictions', async () => {
      mockFeatureGateService.getUserPlanLimits.mockResolvedValue({
        plan: 'free',
        limits: { 'ai:photo_processing': 0 }
      mockRateLimiter.limit.mockResolvedValue({
        success: false,
        limit: 0,
        remaining: 0,
        reset: Date.now() + 60000
      const result = await rateLimiter.checkLimit('user-free-123');
      expect(result.success).toBe(false);
      expect(result.plan).toBe('free');
      expect(result.remaining).toBe(0);
    test('should allow starter plan limited usage', async () => {
        plan: 'starter',
        limits: { 'ai:photo_processing': 5 }
      const result = await rateLimiter.checkLimit('user-starter-123');
      expect(result.success).toBe(true);
      expect(result.plan).toBe('starter');
      expect(mockRateLimiter.limit).toHaveBeenCalledWith('user-starter-123');
    test('should provide higher limits for professional plan', async () => {
        plan: 'professional',
        limits: { 'ai:photo_processing': 100 }
      const result = await rateLimiter.checkLimit('user-pro-123');
      expect(result.plan).toBe('professional');
      expect(result.priority).toBe(3);
    test('should provide premium plan benefits', async () => {
        plan: 'premium',
        limits: { 'ai:photo_processing': 1000 }
      const result = await rateLimiter.checkLimit('user-premium-123');
      expect(result.plan).toBe('premium');
      expect(result.priority).toBe(7);
    test('should provide enterprise plan unlimited access', async () => {
        plan: 'enterprise',
        limits: { 'ai:photo_processing': 10000 }
      const result = await rateLimiter.checkLimit('user-enterprise-123');
      expect(result.plan).toBe('enterprise');
      expect(result.priority).toBe(10);
  describe('Global Rate Limiting', () => {
    test('should enforce global limits even for premium users', async () => {
      // Mock global limit exceeded
      let callCount = 0;
      mockRateLimiter.limit.mockImplementation((identifier) => {
        if (identifier === 'global') {
          return Promise.resolve({
            success: false,
            limit: 1000,
            remaining: 0,
            reset: Date.now() + 60000
          });
        }
        return Promise.resolve({
          success: true,
          limit: 1000,
          remaining: 999,
          reset: Date.now() + 60000
        });
      expect(result.plan).toBe('global');
      expect(result.priority).toBe(0);
  describe('Priority Queuing', () => {
    test('should add premium users to priority queue when rate limited', async () => {
      // Mock rate limit exceeded
        limit: 20,
      const result = await rateLimiter.checkLimit('user-premium-123', 'request-123');
      expect(result.pending).toBeGreaterThan(0);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'photography-ai-queue',
        expect.stringContaining('"userId":"user-premium-123"')
      );
    test('should not queue starter plan users', async () => {
        limit: 5,
      expect(result.pending).toBeUndefined();
      expect(mockRedis.lpush).not.toHaveBeenCalled();
    test('should prioritize enterprise users in queue', async () => {
      const rateLimiterWithQueue = new PhotographyRateLimiter();
      
      // Add premium user to queue first
      await rateLimiterWithQueue['addToQueue']('user-premium-123', 'req-1', 'premium', 7);
      // Add enterprise user (should be inserted at front)
      const position = await rateLimiterWithQueue['addToQueue']('user-enterprise-123', 'req-2', 'enterprise', 10);
      expect(position).toBe(1); // Should be at front of queue
      expect(rateLimiterWithQueue['queue'][0].userId).toBe('user-enterprise-123');
      expect(rateLimiterWithQueue['queue'][1].userId).toBe('user-premium-123');
  describe('Burst Handling', () => {
    test('should allow burst requests for premium plans', async () => {
      // Mock burst scenario - per-minute limit exceeded but burst available
        callCount++;
        if (callCount === 3) { // Third rate limiter call (per-minute)
            limit: 20,
          reset: Date.now() + 3600000
      const result = await rateLimiter.checkLimit('user-premium-123', 'burst-request');
      // Should be queued due to burst handling
  describe('Caching Integration', () => {
    test('should use cached rate limit results', async () => {
      const cachedResult = {
        success: true,
        limit: 100,
        remaining: 98,
        reset: Date.now() + 60000,
        priority: 3,
        timestamp: Date.now() - 10000 // 10 seconds ago
      };
      mockPhotographyCache.getCachedFeatureAccess.mockResolvedValue(cachedResult);
      const result = await rateLimiter.checkLimit('user-cached-123');
      expect(result.remaining).toBe(97); // Should decrement from cached value
      expect(mockRateLimiter.limit).not.toHaveBeenCalled();
    test('should ignore expired cache entries', async () => {
      const expiredCache = {
        timestamp: Date.now() - 40000 // 40 seconds ago (expired)
      mockPhotographyCache.getCachedFeatureAccess.mockResolvedValue(expiredCache);
      const result = await rateLimiter.checkLimit('user-expired-cache-123');
      expect(mockRateLimiter.limit).toHaveBeenCalled();
      expect(mockPhotographyCache.cacheFeatureAccess).toHaveBeenCalled();
    test('should cache successful rate limit results', async () => {
      await rateLimiter.checkLimit('user-cache-store-123');
      expect(mockPhotographyCache.cacheFeatureAccess).toHaveBeenCalledWith(
        'user-cache-store-123',
        'rate_limit',
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
  describe('Queue Processing', () => {
    test('should process queue periodically', async () => {
      // Add item to queue
      await rateLimiterWithQueue['addToQueue']('user-queue-123', 'req-queue-1', 'professional', 3);
      // Mock successful rate limit check for queued request
        remaining: 99,
      // Process queue
      await rateLimiterWithQueue['processQueue']();
      expect(mockRedis.lpop).toHaveBeenCalledWith('photography-ai-queue');
    test('should remove expired requests from queue', async () => {
      // Add expired request to queue
      const expiredRequest = {
        id: 'expired-req',
        userId: 'user-expired',
        timestamp: Date.now() - 360000, // 6 minutes ago (expired)
        planTier: 'professional',
        retryCount: 0,
        maxRetries: 3
      rateLimiterWithQueue['queue'] = [expiredRequest];
      expect(rateLimiterWithQueue['queue']).toHaveLength(0);
      expect(mockRedis.lpop).toHaveBeenCalled();
    test('should handle retry logic for failed requests', async () => {
      const retryRequest = {
        id: 'retry-req',
        userId: 'user-retry',
        timestamp: Date.now(),
        retryCount: 1,
      rateLimiterWithQueue['queue'] = [retryRequest];
      // Mock rate limit still failing
      // Should increment retry count and keep in queue
      expect(rateLimiterWithQueue['queue'][0].retryCount).toBe(2);
    test('should remove requests after max retries', async () => {
      const maxRetriesRequest = {
        id: 'max-retry-req',
        userId: 'user-max-retry',
        retryCount: 3,
      rateLimiterWithQueue['queue'] = [maxRetriesRequest];
  describe('Status and Analytics', () => {
    test('should return accurate rate limit status', async () => {
        limit: 1000,
        remaining: 850,
        reset: Date.now() + 3600000
      const status = await rateLimiter.getStatus('user-status-123');
      expect(status.plan).toBe('premium');
      expect(status.limits).toHaveLength(3); // Daily, hourly, per-minute limits
      expect(status.limits[0].remaining).toBe(850);
    test('should include queue position in status', async () => {
      // Add user to queue
      await rateLimiterWithQueue['addToQueue']('user-in-queue', 'req-1', 'professional', 3);
      await rateLimiterWithQueue['addToQueue']('user-status-queue', 'req-2', 'professional', 3);
      const status = await rateLimiterWithQueue.getStatus('user-status-queue');
      expect(status.queuePosition).toBe(2);
      expect(status.queueWaitTime).toBeGreaterThan(0);
    test('should return statistics correctly', async () => {
      const rateLimiterWithStats = new PhotographyRateLimiter();
      // Add some test data
      rateLimiterWithStats['queue'] = [
        { planTier: 'professional', userId: 'user1' } as any,
        { planTier: 'premium', userId: 'user2' } as any,
        { planTier: 'professional', userId: 'user3' } as any
      ];
      mockRedis.get.mockResolvedValue('150'); // Total processed
      mockRedis.lrange.mockResolvedValue(['30', '25', '35']); // Processing times
      const stats = await rateLimiterWithStats.getStatistics();
      expect(stats.queueLength).toBe(3);
      expect(stats.totalProcessed).toBe(150);
      expect(stats.averageWaitTime).toBe(30);
      expect(stats.planDistribution).toEqual({
        professional: 2,
        premium: 1
  describe('Error Handling', () => {
    test('should fail open on system errors', async () => {
      mockFeatureGateService.getUserPlanLimits.mockRejectedValue(new Error('Service unavailable'));
      const result = await rateLimiter.checkLimit('user-error-123');
      expect(result.plan).toBe('error');
    test('should handle Redis connection errors gracefully', async () => {
      mockRedis.lpush.mockRejectedValue(new Error('Redis connection failed'));
      // Should not throw error
      await expect(
        rateLimiter['addToQueue']('user-redis-error', 'req-error', 'professional', 3)
      ).resolves.toBeGreaterThan(0);
    test('should handle queue processing errors', async () => {
      const rateLimiterWithError = new PhotographyRateLimiter();
      rateLimiterWithError['queue'] = [{ id: 'error-req' } as any];
      // Mock error in rate limit check
      mockRateLimiter.limit.mockRejectedValue(new Error('Rate limit service error'));
      await expect(rateLimiterWithError['processQueue']()).resolves.not.toThrow();
  describe('Wait Time Estimation', () => {
    test('should estimate queue wait time accurately', () => {
      const waitTime = rateLimiter['estimateQueueWaitTime'](5, 'premium');
      expect(waitTime).toBeGreaterThan(0);
      expect(typeof waitTime).toBe('number');
    test('should provide different estimates for different plans', () => {
      const professionalWait = rateLimiter['estimateQueueWaitTime'](5, 'professional');
      const premiumWait = rateLimiter['estimateQueueWaitTime'](5, 'premium');
      // Premium should have faster processing
      expect(premiumWait).toBeLessThanOrEqual(professionalWait);
  describe('Queue Management', () => {
    test('should remove user from queue by user ID', async () => {
      await rateLimiterWithQueue['addToQueue']('user-remove-1', 'req-1', 'professional', 3);
      await rateLimiterWithQueue['addToQueue']('user-remove-2', 'req-2', 'professional', 3);
      const removed = await rateLimiterWithQueue.removeFromQueue('user-remove-1');
      expect(removed).toBe(true);
      expect(rateLimiterWithQueue['queue']).toHaveLength(1);
      expect(rateLimiterWithQueue['queue'][0].userId).toBe('user-remove-2');
    test('should remove specific request from queue', async () => {
      await rateLimiterWithQueue['addToQueue']('user-specific', 'req-1', 'professional', 3);
      await rateLimiterWithQueue['addToQueue']('user-specific', 'req-2', 'professional', 3);
      const removed = await rateLimiterWithQueue.removeFromQueue('user-specific', 'req-1');
      expect(rateLimiterWithQueue['queue'][0].id).toBe('req-2');
  describe('Cleanup and Shutdown', () => {
    test('should shutdown cleanly', async () => {
      await rateLimiter.shutdown();
      expect(mockRedis.quit).toHaveBeenCalled();
      expect(rateLimiter['queue']).toHaveLength(0);
      expect(rateLimiter['queueProcessor']).toBeUndefined();
    test('should clear queue processor interval on shutdown', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      expect(clearIntervalSpy).toHaveBeenCalled();
});
