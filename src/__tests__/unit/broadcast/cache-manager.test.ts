import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock cache implementations for comprehensive testing
interface CacheEntry {
  key: string;
  value: any;
  createdAt: number;
  lastAccessed: number;
  ttl?: number;
  hitCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsageBytes: number;
  evictions: number;
  avgAccessTime: number;
}

class BroadcastCacheManager {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalAccessTime: 0,
    accessCount: 0,
  };
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 10000, defaultTTL: number = 300000) {
    // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  async get(key: string): Promise<any> {
    const accessStart = Date.now();

    const entry = this.cache.get(key);
    const accessTime = Date.now() - accessStart;

    this.stats.totalAccessTime += accessTime;
    this.stats.accessCount++;

    if (!entry || this.isExpired(entry)) {
      this.stats.misses++;
      if (entry) {
        this.cache.delete(key); // Remove expired entry
      }
      return null;
    }

    // Update access information
    entry.lastAccessed = Date.now();
    entry.hitCount++;
    this.stats.hits++;

    return entry.value;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Check if cache needs eviction
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    const entry: CacheEntry = {
      key,
      value,
      createdAt: now,
      lastAccessed: now,
      ttl: ttl || this.defaultTTL,
      hitCount: 0,
    };

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.resetStats();
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.createdAt > entry.ttl;
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    const avgAccessTime =
      this.stats.accessCount > 0
        ? this.stats.totalAccessTime / this.stats.accessCount
        : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalKeys: this.cache.size,
      memoryUsageBytes: this.estimateMemoryUsage(),
      evictions: this.stats.evictions,
      avgAccessTime,
    };
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      // Rough estimation: 100 bytes base + JSON string length
      const valueSize = JSON.stringify(entry.value).length;
      const keySize = entry.key.length * 2; // UTF-16 characters
      totalSize += 100 + valueSize + keySize;
    }

    return totalSize;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalAccessTime: 0,
      accessCount: 0,
    };
  }

  // Wedding-specific cache methods
  async getUserPreferences(userId: string): Promise<any> {
    const cacheKey = `user_prefs:${userId}`;
    let preferences = await this.get(cacheKey);

    if (!preferences) {
      // Simulate database fetch
      await new Promise((resolve) =>
        setTimeout(resolve, 50 + Math.random() * 100),
      );

      preferences = {
        userId,
        emailFrequency: 'immediate',
        smsEnabled: true,
        quietHours: { enabled: false, start: '22:00', end: '08:00' },
        weddingDigest: true,
        criticalOnly: false,
      };

      await this.set(cacheKey, preferences, 600000); // 10 minute TTL for user prefs
    }

    return preferences;
  }

  async getWeddingTeamMembers(weddingId: string): Promise<any> {
    const cacheKey = `wedding_team:${weddingId}`;
    let teamMembers = await this.get(cacheKey);

    if (!teamMembers) {
      // Simulate database fetch
      await new Promise((resolve) =>
        setTimeout(resolve, 80 + Math.random() * 120),
      );

      teamMembers = {
        weddingId,
        members: [
          { id: 'coord-1', role: 'coordinator', name: 'Sarah Wilson' },
          { id: 'photo-1', role: 'photographer', name: 'Mike Johnson' },
          { id: 'florist-1', role: 'florist', name: 'Emma Davis' },
        ],
        lastUpdated: Date.now(),
      };

      await this.set(cacheKey, teamMembers, 300000); // 5 minute TTL for team data
    }

    return teamMembers;
  }

  async getBroadcast(broadcastId: string): Promise<any> {
    const cacheKey = `broadcast:${broadcastId}`;
    let broadcast = await this.get(cacheKey);

    if (!broadcast) {
      // Simulate database fetch
      await new Promise((resolve) =>
        setTimeout(resolve, 30 + Math.random() * 70),
      );

      broadcast = {
        id: broadcastId,
        type: 'timeline.changed',
        priority: 'high',
        title: 'Cached Broadcast',
        message: 'This broadcast was fetched from database',
        createdAt: Date.now(),
      };

      await this.set(cacheKey, broadcast, 180000); // 3 minute TTL for broadcasts
    }

    return broadcast;
  }

  async warmupCache(): Promise<void> {
    // Simulate cache warmup with common data
    const commonUserIds = Array.from({ length: 50 }, (_, i) => `user-${i}`);
    const commonWeddingIds = Array.from(
      { length: 20 },
      (_, i) => `wedding-${i}`,
    );

    // Warm up user preferences
    for (const userId of commonUserIds) {
      await this.getUserPreferences(userId);
    }

    // Warm up wedding team data
    for (const weddingId of commonWeddingIds) {
      await this.getWeddingTeamMembers(weddingId);
    }
  }

  // Cache analysis methods for testing
  getKeysByPattern(pattern: string): string[] {
    const regex = new RegExp(pattern);
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  getExpiredKeys(): string[] {
    const expiredKeys: string[] = [];
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    return expiredKeys;
  }

  getMostAccessedKeys(
    limit: number = 10,
  ): Array<{ key: string; hitCount: number }> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, hitCount: entry.hitCount }))
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit);

    return entries;
  }

  // Performance testing method
  async performanceTest(operations: number): Promise<{
    avgGetTime: number;
    avgSetTime: number;
    hitRate: number;
  }> {
    const getTimes: number[] = [];
    const setTimes: number[] = [];

    // Perform set operations
    for (let i = 0; i < operations; i++) {
      const key = `perf_test_${i}`;
      const value = { data: `test_data_${i}`, timestamp: Date.now() };

      const setStart = Date.now();
      await this.set(key, value);
      const setTime = Date.now() - setStart;
      setTimes.push(setTime);
    }

    // Perform get operations (mix of hits and misses)
    for (let i = 0; i < operations; i++) {
      const key =
        i < operations * 0.8
          ? `perf_test_${Math.floor(Math.random() * operations)}` // 80% chance of hit
          : `perf_test_miss_${i}`; // 20% chance of miss

      const getStart = Date.now();
      await this.get(key);
      const getTime = Date.now() - getStart;
      getTimes.push(getTime);
    }

    const avgGetTime =
      getTimes.reduce((sum, time) => sum + time, 0) / getTimes.length;
    const avgSetTime =
      setTimes.reduce((sum, time) => sum + time, 0) / setTimes.length;
    const stats = await this.getStats();

    return {
      avgGetTime,
      avgSetTime,
      hitRate: stats.hitRate,
    };
  }
}

describe('BroadcastCacheManager Unit Tests', () => {
  let cacheManager: BroadcastCacheManager;

  beforeEach(() => {
    cacheManager = new BroadcastCacheManager(1000, 300000); // 1000 keys max, 5 min TTL
  });

  afterEach(async () => {
    await cacheManager.clear();
  });

  describe('Basic Cache Operations', () => {
    test('sets and gets values correctly', async () => {
      const key = 'test-key';
      const value = { message: 'test value', timestamp: Date.now() };

      await cacheManager.set(key, value);
      const retrieved = await cacheManager.get(key);

      expect(retrieved).toEqual(value);
    });

    test('returns null for non-existent keys', async () => {
      const result = await cacheManager.get('non-existent-key');
      expect(result).toBeNull();
    });

    test('deletes values correctly', async () => {
      const key = 'delete-test';
      const value = { data: 'to be deleted' };

      await cacheManager.set(key, value);
      expect(await cacheManager.get(key)).toEqual(value);

      const deleted = await cacheManager.delete(key);
      expect(deleted).toBe(true);
      expect(await cacheManager.get(key)).toBeNull();
    });

    test('clears all cache entries', async () => {
      await cacheManager.set('key1', { data: 'value1' });
      await cacheManager.set('key2', { data: 'value2' });
      await cacheManager.set('key3', { data: 'value3' });

      let stats = await cacheManager.getStats();
      expect(stats.totalKeys).toBe(3);

      await cacheManager.clear();

      stats = await cacheManager.getStats();
      expect(stats.totalKeys).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('TTL and Expiration', () => {
    test('respects TTL settings', async () => {
      const shortTTL = 100; // 100ms
      await cacheManager.set('short-lived', { data: 'expires soon' }, shortTTL);

      // Should be available immediately
      expect(await cacheManager.get('short-lived')).not.toBeNull();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be null after expiration
      expect(await cacheManager.get('short-lived')).toBeNull();
    });

    test('uses default TTL when none specified', async () => {
      await cacheManager.set('default-ttl', { data: 'uses default' });

      // Should be available
      expect(await cacheManager.get('default-ttl')).not.toBeNull();

      // Should still be available after short time (default TTL is 5 minutes)
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(await cacheManager.get('default-ttl')).not.toBeNull();
    });

    test('removes expired entries automatically', async () => {
      const shortTTL = 50;
      await cacheManager.set('expires-1', { data: 'expire 1' }, shortTTL);
      await cacheManager.set('expires-2', { data: 'expire 2' }, shortTTL);

      let stats = await cacheManager.getStats();
      expect(stats.totalKeys).toBe(2);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Access expired keys (should trigger cleanup)
      await cacheManager.get('expires-1');
      await cacheManager.get('expires-2');

      stats = await cacheManager.getStats();
      expect(stats.totalKeys).toBe(0); // Expired entries should be removed
    });

    test('identifies expired keys correctly', async () => {
      await cacheManager.set('long-lived', { data: 'lives long' }, 300000);
      await cacheManager.set('short-lived', { data: 'expires soon' }, 50);

      // Wait for short-lived to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      const expiredKeys = cacheManager.getExpiredKeys();

      expect(expiredKeys).toContain('short-lived');
      expect(expiredKeys).not.toContain('long-lived');
    });
  });

  describe('LRU Eviction', () => {
    test('evicts least recently used items when at capacity', async () => {
      // Use small cache for testing
      const smallCache = new BroadcastCacheManager(3, 300000); // Max 3 items

      // Fill cache to capacity
      await smallCache.set('item1', { data: 'first' });
      await smallCache.set('item2', { data: 'second' });
      await smallCache.set('item3', { data: 'third' });

      // Access item1 and item2 to make item3 least recently used
      await smallCache.get('item1');
      await smallCache.get('item2');

      // Add new item (should evict item3)
      await smallCache.set('item4', { data: 'fourth' });

      expect(await smallCache.get('item1')).not.toBeNull();
      expect(await smallCache.get('item2')).not.toBeNull();
      expect(await smallCache.get('item3')).toBeNull(); // Should be evicted
      expect(await smallCache.get('item4')).not.toBeNull();

      const stats = await smallCache.getStats();
      expect(stats.evictions).toBe(1);

      await smallCache.clear();
    });

    test('tracks access patterns for LRU', async () => {
      await cacheManager.set('frequent', { data: 'accessed often' });
      await cacheManager.set('infrequent', { data: 'accessed rarely' });

      // Access frequent item multiple times
      for (let i = 0; i < 5; i++) {
        await cacheManager.get('frequent');
      }

      // Access infrequent item once
      await cacheManager.get('infrequent');

      const mostAccessed = cacheManager.getMostAccessedKeys(2);

      expect(mostAccessed[0].key).toBe('frequent');
      expect(mostAccessed[0].hitCount).toBe(5);
      expect(mostAccessed[1].key).toBe('infrequent');
      expect(mostAccessed[1].hitCount).toBe(1);
    });
  });

  describe('Wedding-Specific Cache Operations', () => {
    test('caches user preferences correctly', async () => {
      const userId = 'test-user-123';

      // First access (cache miss)
      const prefs1 = await cacheManager.getUserPreferences(userId);
      expect(prefs1.userId).toBe(userId);

      // Second access (cache hit)
      const prefs2 = await cacheManager.getUserPreferences(userId);
      expect(prefs2).toEqual(prefs1);

      const stats = await cacheManager.getStats();
      expect(stats.hits).toBe(1); // Second access was a hit
      expect(stats.misses).toBe(1); // First access was a miss
    });

    test('caches wedding team members correctly', async () => {
      const weddingId = 'wedding-456';

      const team1 = await cacheManager.getWeddingTeamMembers(weddingId);
      expect(team1.weddingId).toBe(weddingId);
      expect(team1.members).toHaveLength(3);

      const team2 = await cacheManager.getWeddingTeamMembers(weddingId);
      expect(team2).toEqual(team1);

      const stats = await cacheManager.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    test('caches broadcast data correctly', async () => {
      const broadcastId = 'broadcast-789';

      const broadcast1 = await cacheManager.getBroadcast(broadcastId);
      expect(broadcast1.id).toBe(broadcastId);

      const broadcast2 = await cacheManager.getBroadcast(broadcastId);
      expect(broadcast2).toEqual(broadcast1);

      const stats = await cacheManager.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    test('warms up cache with common data', async () => {
      await cacheManager.warmupCache();

      const stats = await cacheManager.getStats();
      expect(stats.totalKeys).toBeGreaterThan(50); // Should have warmed up data

      // Subsequent access should be cache hits
      await cacheManager.getUserPreferences('user-5');
      await cacheManager.getWeddingTeamMembers('wedding-10');

      const statsAfter = await cacheManager.getStats();
      expect(statsAfter.hits).toBeGreaterThan(stats.hits);
    });
  });

  describe('Performance and Statistics', () => {
    test('tracks hit and miss rates accurately', async () => {
      // Set up some cache entries
      await cacheManager.set('hit1', { data: 'hit data 1' });
      await cacheManager.set('hit2', { data: 'hit data 2' });

      // Generate hits and misses
      await cacheManager.get('hit1'); // Hit
      await cacheManager.get('hit2'); // Hit
      await cacheManager.get('hit1'); // Hit again
      await cacheManager.get('miss1'); // Miss
      await cacheManager.get('miss2'); // Miss

      const stats = await cacheManager.getStats();

      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.6, 2); // 3/5 = 0.6
    });

    test('estimates memory usage reasonably', async () => {
      const initialStats = await cacheManager.getStats();
      const initialMemory = initialStats.memoryUsageBytes;

      // Add some data
      for (let i = 0; i < 10; i++) {
        await cacheManager.set(`key${i}`, {
          data: 'A'.repeat(100), // 100 character string
          index: i,
          timestamp: Date.now(),
        });
      }

      const finalStats = await cacheManager.getStats();
      const finalMemory = finalStats.memoryUsageBytes;

      expect(finalMemory).toBeGreaterThan(initialMemory);
      expect(finalMemory).toBeGreaterThan(1000); // Should be reasonable size
    });

    test('measures average access time', async () => {
      await cacheManager.set('access-test', { data: 'test access time' });

      // Perform multiple accesses
      for (let i = 0; i < 10; i++) {
        await cacheManager.get('access-test');
      }

      const stats = await cacheManager.getStats();

      expect(stats.avgAccessTime).toBeGreaterThan(0);
      expect(stats.avgAccessTime).toBeLessThan(10); // Should be very fast for in-memory cache
    });

    test('performance test meets requirements', async () => {
      const operations = 1000;
      const results = await cacheManager.performanceTest(operations);

      console.log('Cache Performance Test Results:', {
        operations,
        avgGetTime: `${results.avgGetTime.toFixed(2)}ms`,
        avgSetTime: `${results.avgSetTime.toFixed(2)}ms`,
        hitRate: `${(results.hitRate * 100).toFixed(2)}%`,
      });

      // Performance requirements
      expect(results.avgGetTime).toBeLessThan(5); // < 5ms average get time
      expect(results.avgSetTime).toBeLessThan(10); // < 10ms average set time
      expect(results.hitRate).toBeGreaterThan(0.7); // > 70% hit rate
    });
  });

  describe('Cache Analysis and Debugging', () => {
    test('finds keys by pattern correctly', async () => {
      await cacheManager.set('user_prefs:123', { userId: '123' });
      await cacheManager.set('user_prefs:456', { userId: '456' });
      await cacheManager.set('wedding_team:789', { weddingId: '789' });
      await cacheManager.set('broadcast:abc', { broadcastId: 'abc' });

      const userPrefsKeys = cacheManager.getKeysByPattern('^user_prefs:');
      const weddingKeys = cacheManager.getKeysByPattern('^wedding_team:');
      const broadcastKeys = cacheManager.getKeysByPattern('^broadcast:');

      expect(userPrefsKeys).toHaveLength(2);
      expect(weddingKeys).toHaveLength(1);
      expect(broadcastKeys).toHaveLength(1);

      expect(userPrefsKeys).toContain('user_prefs:123');
      expect(userPrefsKeys).toContain('user_prefs:456');
    });

    test('identifies most accessed keys correctly', async () => {
      const keys = ['popular', 'medium', 'rare'];
      const accessCounts = [10, 5, 1];

      // Set up keys
      for (const key of keys) {
        await cacheManager.set(key, { data: `${key} data` });
      }

      // Access keys different amounts
      for (let i = 0; i < keys.length; i++) {
        for (let j = 0; j < accessCounts[i]; j++) {
          await cacheManager.get(keys[i]);
        }
      }

      const mostAccessed = cacheManager.getMostAccessedKeys(3);

      expect(mostAccessed).toHaveLength(3);
      expect(mostAccessed[0].key).toBe('popular');
      expect(mostAccessed[0].hitCount).toBe(10);
      expect(mostAccessed[1].key).toBe('medium');
      expect(mostAccessed[1].hitCount).toBe(5);
      expect(mostAccessed[2].key).toBe('rare');
      expect(mostAccessed[2].hitCount).toBe(1);
    });

    test('provides comprehensive statistics', async () => {
      // Set up test scenario
      await cacheManager.set('stats-test-1', { data: 'test 1' });
      await cacheManager.set('stats-test-2', { data: 'test 2' });

      // Generate some hits and misses
      await cacheManager.get('stats-test-1'); // Hit
      await cacheManager.get('stats-test-1'); // Hit
      await cacheManager.get('non-existent'); // Miss

      const stats = await cacheManager.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 2); // 2/3
      expect(stats.totalKeys).toBe(2);
      expect(stats.memoryUsageBytes).toBeGreaterThan(0);
      expect(stats.evictions).toBe(0);
      expect(stats.avgAccessTime).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Access', () => {
    test('handles concurrent get operations', async () => {
      await cacheManager.set('concurrent-test', { data: 'concurrent access' });

      // Create multiple concurrent get operations
      const concurrentGets = Array.from({ length: 100 }, () =>
        cacheManager.get('concurrent-test'),
      );

      const results = await Promise.all(concurrentGets);

      // All should return the same value
      results.forEach((result) => {
        expect(result).toEqual({ data: 'concurrent access' });
      });

      const stats = await cacheManager.getStats();
      expect(stats.hits).toBe(100);
      expect(stats.misses).toBe(0);
    });

    test('handles concurrent set operations', async () => {
      // Create multiple concurrent set operations
      const concurrentSets = Array.from({ length: 50 }, (_, i) =>
        cacheManager.set(`concurrent-set-${i}`, {
          index: i,
          data: `data ${i}`,
        }),
      );

      await Promise.all(concurrentSets);

      // Verify all were set correctly
      for (let i = 0; i < 50; i++) {
        const result = await cacheManager.get(`concurrent-set-${i}`);
        expect(result.index).toBe(i);
        expect(result.data).toBe(`data ${i}`);
      }

      const stats = await cacheManager.getStats();
      expect(stats.totalKeys).toBe(50);
    });

    test('handles mixed concurrent operations', async () => {
      // Set up initial data
      for (let i = 0; i < 10; i++) {
        await cacheManager.set(`mixed-${i}`, { index: i });
      }

      // Create mixed operations
      const operations = [
        ...Array.from({ length: 20 }, (_, i) =>
          cacheManager.get(`mixed-${i % 10}`),
        ), // Gets (some hits, some misses)
        ...Array.from({ length: 10 }, (_, i) =>
          cacheManager.set(`new-${i}`, { newIndex: i }),
        ), // Sets
        ...Array.from({ length: 5 }, (_, i) =>
          cacheManager.delete(`mixed-${i}`),
        ), // Deletes
      ];

      await Promise.all(operations);

      const stats = await cacheManager.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.totalKeys).toBeGreaterThan(0);
    });
  });
});
