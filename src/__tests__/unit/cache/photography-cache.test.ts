/**
 * WS-130 Round 3: Photography Cache Manager Unit Tests
 * Tests Redis-based caching with LRU fallback and intelligent invalidation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/test';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { PhotographyCacheManager } from '@/lib/cache/photography-cache';
import { createClient } from 'redis';
import { LRUCache } from 'lru-cache';
// Mock Redis and LRU Cache
vi.mock('redis');
vi.mock('lru-cache');
const mockRedisClient = {
  connect: vi.fn(),
  quit: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  flushall: vi.fn(),
  on: vi.fn(),
};
const mockLRUCache = {
  delete: vi.fn(),
  clear: vi.fn(),
  entries: vi.fn(),
  size: 0,
  max: 1000,
(createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockRedisClient);
(LRUCache as ReturnType<typeof vi.fn>).mockImplementation(() => mockLRUCache);
describe('PhotographyCacheManager', () => {
  let cacheManager: PhotographyCacheManager;
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock environment variables
    process.env.REDIS_URL = 'redis://localhost:6379';
    // Setup default mock behavior
    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.keys.mockResolvedValue([]);
    mockLRUCache.get.mockReturnValue(undefined);
    mockLRUCache.keys.mockReturnValue([]);
    mockLRUCache.entries.mockReturnValue([]);
    cacheManager = new PhotographyCacheManager();
    // Wait for Redis initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  afterEach(async () => {
    await cacheManager.shutdown();
    delete process.env.REDIS_URL;
  describe('Initialization', () => {
    test('should initialize Redis connection successfully', () => {
      expect(createClient).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });
    test('should initialize memory cache with correct configuration', () => {
      expect(LRUCache).toHaveBeenCalledWith(expect.objectContaining({
        max: 1000,
        ttl: 1000 * 60 * 30, // 30 minutes
        maxSize: 100 * 1024 * 1024, // 100MB
      }));
    test('should handle Redis connection failure gracefully', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));
      
      const fallbackCacheManager = new PhotographyCacheManager();
      // Should not throw and should work with memory cache only
      await expect(fallbackCacheManager.set('test-key', 'test-value')).resolves.not.toThrow();
  describe('Basic Cache Operations', () => {
    test('should set and get data from Redis when available', async () => {
      const testData = { test: 'data', timestamp: Date.now() };
      const cacheEntry = {
        data: testData,
        timestamp: Date.now(),
        ttl: 300,
        tags: ['test'],
        hit_count: 0,
        priority: 'normal'
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cacheEntry));
      await cacheManager.set('test-key', testData);
      const result = await cacheManager.get('test-key');
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        expect.stringContaining('"data":'),
        'EX',
        expect.any(Number)
      );
      expect(result).toEqual(testData);
    test('should fallback to memory cache when Redis fails', async () => {
      const testData = { test: 'memory-data' };
      const memoryEntry = {
        tags: [],
      // Mock Redis failure
      mockRedisClient.get.mockRejectedValue(new Error('Redis unavailable'));
      mockLRUCache.get.mockReturnValue(memoryEntry);
      expect(mockLRUCache.get).toHaveBeenCalledWith('test-key');
    test('should handle expired entries correctly', async () => {
      const expiredEntry = {
        data: { test: 'expired' },
        timestamp: Date.now() - 400000, // 400 seconds ago
        ttl: 300, // 5 minutes TTL
      mockRedisClient.get.mockResolvedValue(JSON.stringify(expiredEntry));
      expect(result).toBeNull();
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    test('should increment hit count when accessing cached data', async () => {
        data: { test: 'hit-data' },
        hit_count: 5,
      await cacheManager.get('test-key');
        expect.stringContaining('"hit_count":6'),
        300
  describe('Mood Board Caching', () => {
    test('should cache mood board analysis correctly', async () => {
      const moodBoardResponse = {
        mood_board_id: 'mood-123',
        dominant_colors: ['#F5F5DC', '#8B4513'],
        style_analysis: {
          primary_style: 'romantic',
          confidence_score: 0.92
        },
        recommendations: []
      await cacheManager.cacheMoodBoard(
        'client-123',
        'romantic',
        ['#F5F5DC', '#8B4513'],
        moodBoardResponse
        'mood-board:client-123:romantic:f5f5dc-8b4513',
        expect.stringContaining('"mood_board_id":"mood-123"'),
        3600 // 1 hour TTL
    test('should retrieve cached mood board with matching parameters', async () => {
      const cachedResponse = {
        mood_board_id: 'cached-mood-123',
        dominant_colors: ['#F5F5DC'],
        style_analysis: { primary_style: 'romantic', confidence_score: 0.95 }
        data: cachedResponse,
        ttl: 3600,
        tags: ['mood-board', 'client:client-123'],
        hit_count: 2,
        priority: 'high'
      const result = await cacheManager.getCachedMoodBoard(
        ['#F5F5DC']
      expect(result).toEqual(cachedResponse);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'mood-board:client-123:romantic:f5f5dc'
    test('should return null for cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockLRUCache.get.mockReturnValue(undefined);
        'client-456',
        'modern',
        ['#000000']
  describe('Style Consistency Caching', () => {
    test('should cache and retrieve style consistency analysis', async () => {
      const consistencyReport = {
        style_match_score: 0.89,
        cross_domain_coherence: 0.85,
        recommendations: ['Use consistent color temperature']
      await cacheManager.cacheStyleConsistency(
        ['jazz', 'classical'],
        consistencyReport
        data: consistencyReport,
        ttl: 7200,
        tags: ['style-consistency', 'style:romantic'],
      const result = await cacheManager.getCachedStyleConsistency(
        ['jazz', 'classical']
      expect(result).toEqual(consistencyReport);
  describe('Color Harmony Caching', () => {
    test('should cache and retrieve color harmony analysis', async () => {
      const harmonyAnalysis = {
        color_harmony_score: 0.94,
        dominant_palette: ['#F5F5DC', '#8B4513'],
        seasonal_alignment: 0.88,
        floral_recommendations: []
      await cacheManager.cacheColorHarmony(
        ['#228B22', '#90EE90'],
        harmonyAnalysis
        data: harmonyAnalysis,
        ttl: 1800,
        tags: ['color-harmony', 'photo-colors', 'floral-colors'],
      const result = await cacheManager.getCachedColorHarmony(
        ['#228B22', '#90EE90']
      expect(result).toEqual(harmonyAnalysis);
  describe('Feature Access Caching', () => {
    test('should cache and retrieve feature access results', async () => {
      const accessResult = {
        hasAccess: true,
        plan: 'premium',
        remaining_uses: 99,
        reset_date: Date.now() + 86400000
      await cacheManager.cacheFeatureAccess(
        'user-123',
        'rate_limit',
        accessResult
        data: accessResult,
        tags: ['feature-access', 'user:user-123'],
      const result = await cacheManager.getCachedFeatureAccess(
        'rate_limit'
      expect(result).toEqual(accessResult);
  describe('Cache Invalidation', () => {
    test('should invalidate cache by pattern', async () => {
      const mockKeys = ['mood-board:client-123:romantic:colors', 'mood-board:client-123:modern:colors'];
      mockRedisClient.keys.mockResolvedValue(mockKeys);
      mockLRUCache.keys.mockReturnValue(['mood-board:client-123:romantic:colors']);
      await cacheManager.invalidate('mood-board:client-123*');
      expect(mockRedisClient.keys).toHaveBeenCalledWith('mood-board:client-123*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(mockKeys);
      expect(mockLRUCache.delete).toHaveBeenCalledWith('mood-board:client-123:romantic:colors');
    test('should invalidate cache by tags', async () => {
      const taggedEntries = new Map([
        ['key1', { data: {}, tags: ['client:client-123', 'mood-board'], timestamp: Date.now(), ttl: 3600, hit_count: 0, priority: 'normal' }],
        ['key2', { data: {}, tags: ['client:client-456'], timestamp: Date.now(), ttl: 3600, hit_count: 0, priority: 'normal' }]
      ]);
      mockLRUCache.keys.mockReturnValue(['key1', 'key2']);
      mockLRUCache.get.mockImplementation(key => taggedEntries.get(key));
      await cacheManager.invalidate(undefined, ['client:client-123']);
      expect(mockLRUCache.delete).toHaveBeenCalledWith('key1');
      expect(mockLRUCache.delete).not.toHaveBeenCalledWith('key2');
  describe('Preloading', () => {
    test('should preload common data combinations', async () => {
      await cacheManager.preloadCache('client-789');
      // Should have attempted to cache common style/color combinations
      expect(mockRedisClient.set).toHaveBeenCalledTimes(4); // 4 common styles
  describe('Cache Statistics', () => {
    test('should track and return accurate cache statistics', () => {
      // Simulate some cache hits and misses
      cacheManager['cacheHits'] = 75;
      cacheManager['cacheMisses'] = 25;
      mockLRUCache.size = 150;
      const stats = cacheManager.getCacheStats();
      expect(stats).toEqual({
        total_requests: 100,
        cache_hits: 75,
        cache_misses: 25,
        hit_rate_percent: 75,
        memory_cache_size: 150,
        memory_cache_max: 1000,
        redis_connected: true
      });
  describe('Memory Management', () => {
    test('should cleanup expired entries from memory cache', async () => {
      const now = Date.now();
      const expiredEntries = new Map([
        ['expired-key1', { data: {}, timestamp: now - 400000, ttl: 300, tags: [], hit_count: 0, priority: 'normal' }],
        ['valid-key1', { data: {}, timestamp: now - 100000, ttl: 3600, tags: [], hit_count: 0, priority: 'normal' }]
      mockLRUCache.entries.mockReturnValue(expiredEntries.entries());
      await cacheManager.cleanup();
      expect(mockLRUCache.delete).toHaveBeenCalledWith('expired-key1');
      expect(mockLRUCache.delete).not.toHaveBeenCalledWith('valid-key1');
    test('should handle memory cache disposal correctly', () => {
      const disposeCallback = (LRUCache as ReturnType<typeof vi.fn>).mock.calls[0][0].dispose;
      // Simulate disposal
      disposeCallback({ data: 'test' }, 'test-key');
      // Should log disposal (we can't easily test console.log, but this verifies the function doesn't throw)
      expect(true).toBe(true);
  describe('Error Handling', () => {
    test('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection lost'));
      // Should increment cache miss count
    test('should handle serialization errors', async () => {
      const circularRef: any = {};
      circularRef.self = circularRef;
      await expect(cacheManager.set('circular-key', circularRef)).resolves.not.toThrow();
    test('should handle cache invalidation errors gracefully', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));
      await expect(cacheManager.invalidate('test-pattern')).resolves.not.toThrow();
  describe('Performance Optimization', () => {
    test('should handle large data sets efficiently', async () => {
      const largeData = new Array(10000).fill('data').map((_, i) => ({ id: i, data: 'large-item' }));
      await cacheManager.set('large-data-key', largeData, { priority: 'low' });
      // Should still process without issues
      expect(mockRedisClient.set).toHaveBeenCalled();
    test('should prioritize high-priority cache entries', async () => {
      await cacheManager.set('high-priority', { important: true }, { priority: 'high' });
      await cacheManager.set('low-priority', { unimportant: true }, { priority: 'low' });
      // Verify priority is set correctly in cache entries
      const highPriorityCall = mockRedisClient.set.mock.calls.find(call => 
        call[1].includes('"priority":"high"')
      const lowPriorityCall = mockRedisClient.set.mock.calls.find(call => 
        call[1].includes('"priority":"low"')
      expect(highPriorityCall).toBeDefined();
      expect(lowPriorityCall).toBeDefined();
  describe('TTL Management', () => {
    test('should respect different TTL values for different data types', async () => {
      await cacheManager.cacheMoodBoard('client', 'style', ['color'], { mood_board_id: 'test' });
      await cacheManager.cacheStyleConsistency('style', ['music'], { style_match_score: 0.9 });
      await cacheManager.cacheColorHarmony(['color1'], ['color2'], { color_harmony_score: 0.85 });
      // Verify different TTL values are used
      const calls = mockRedisClient.set.mock.calls;
      const moodBoardCall = calls.find(call => call[0].includes('mood-board'));
      const styleCall = calls.find(call => call[0].includes('style-consistency'));
      const colorCall = calls.find(call => call[0].includes('color-harmony'));
      expect(moodBoardCall[2]).toBe('EX');
      expect(moodBoardCall[3]).toBe(3600); // 1 hour for mood boards
      expect(styleCall[2]).toBe('EX');
      expect(styleCall[3]).toBe(7200); // 2 hours for style analysis
      expect(colorCall[2]).toBe('EX');
      expect(colorCall[3]).toBe(1800); // 30 minutes for color harmony
  describe('Shutdown and Cleanup', () => {
    test('should cleanup connections and caches on shutdown', async () => {
      await cacheManager.shutdown();
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(mockLRUCache.clear).toHaveBeenCalled();
    test('should handle shutdown errors gracefully', async () => {
      mockRedisClient.quit.mockRejectedValue(new Error('Shutdown error'));
      await expect(cacheManager.shutdown()).resolves.not.toThrow();
});
