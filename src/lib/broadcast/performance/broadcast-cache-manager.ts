import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { createServerClient } from '@/lib/supabase/server';

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  evictions: number;
}

export class BroadcastCacheManager {
  private redis: Redis.Cluster;
  private localCache: LRUCache<string, any>;
  private supabase;
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor() {
    this.redis = new Redis.Cluster([
      {
        host: process.env.REDIS_CLUSTER_HOST_1!,
        port: parseInt(process.env.REDIS_CLUSTER_PORT_1!),
      },
      {
        host: process.env.REDIS_CLUSTER_HOST_2!,
        port: parseInt(process.env.REDIS_CLUSTER_PORT_2!),
      },
    ]);

    // Local LRU cache for frequently accessed data
    this.localCache = new LRUCache<string, any>({
      max: 5000, // Max number of items
      maxSize: 50 * 1024 * 1024, // 50MB max memory
      sizeCalculation: (value) => JSON.stringify(value).length,
      ttl: 5 * 60 * 1000, // 5 minutes TTL
      allowStale: true, // Allow stale data during high load
      updateAgeOnGet: true,
      fetchMethod: async (key: string) => {
        // Fallback to Redis on local cache miss
        return this.getFromRedis(key);
      },
    });

    this.localCache.on('evict', () => {
      this.cacheStats.evictions++;
    });

    this.supabase = createServerClient();
  }

  // User preferences caching (frequently accessed)
  async getUserPreferences(userId: string): Promise<any> {
    const cacheKey = `user_prefs:${userId}`;

    // Check local cache first
    let preferences = this.localCache.get(cacheKey);

    if (preferences) {
      this.cacheStats.hits++;
      return preferences;
    }

    // Check Redis
    preferences = await this.getFromRedis(cacheKey);

    if (preferences) {
      this.localCache.set(cacheKey, preferences);
      this.cacheStats.hits++;
      return preferences;
    }

    // Fetch from database
    this.cacheStats.misses++;
    const { data } = await this.supabase
      .from('broadcast_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    preferences = data || this.getDefaultPreferences();

    // Cache with short TTL for user preferences (can change frequently)
    await this.setCache(cacheKey, preferences, 300); // 5 minutes
    this.localCache.set(cacheKey, preferences);

    return preferences;
  }

  // Broadcast data caching (read-heavy)
  async getBroadcast(broadcastId: string): Promise<any> {
    const cacheKey = `broadcast:${broadcastId}`;

    let broadcast = this.localCache.get(cacheKey);

    if (broadcast) {
      this.cacheStats.hits++;
      return broadcast;
    }

    broadcast = await this.getFromRedis(cacheKey);

    if (broadcast) {
      this.localCache.set(cacheKey, broadcast);
      this.cacheStats.hits++;
      return broadcast;
    }

    this.cacheStats.misses++;
    const { data } = await this.supabase
      .from('broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .single();

    if (data) {
      // Long TTL for broadcast data (immutable once sent)
      await this.setCache(cacheKey, data, 3600); // 1 hour
      this.localCache.set(cacheKey, data);
    }

    return data;
  }

  // Wedding context caching (wedding-specific optimization)
  async getWeddingTeamMembers(weddingId: string): Promise<string[]> {
    const cacheKey = `wedding_team:${weddingId}`;

    let members = this.localCache.get(cacheKey);

    if (members) {
      this.cacheStats.hits++;
      return members;
    }

    members = await this.getFromRedis(cacheKey);

    if (members) {
      this.localCache.set(cacheKey, members);
      this.cacheStats.hits++;
      return members;
    }

    this.cacheStats.misses++;
    const { data } = await this.supabase
      .from('wedding_team')
      .select('user_id')
      .eq('wedding_id', weddingId);

    members = data?.map((row) => row.user_id) || [];

    // Medium TTL for wedding team data
    await this.setCache(cacheKey, members, 900); // 15 minutes
    this.localCache.set(cacheKey, members);

    return members;
  }

  // Segment user caching (heavy computation results)
  async getSegmentUsers(segmentId: string): Promise<string[]> {
    const cacheKey = `segment_users:${segmentId}`;

    let users = await this.getFromRedis(cacheKey);

    if (users) {
      this.cacheStats.hits++;
      return users;
    }

    this.cacheStats.misses++;

    // Fetch segment criteria
    const { data: segment } = await this.supabase
      .from('broadcast_segments')
      .select('criteria')
      .eq('id', segmentId)
      .single();

    if (!segment) return [];

    // Complex user filtering based on segment criteria
    users = await this.calculateSegmentUsers(segment.criteria);

    // Cache segment results for 30 minutes (expensive to calculate)
    await this.setCache(cacheKey, users, 1800);

    return users;
  }

  private async calculateSegmentUsers(criteria: any): Promise<string[]> {
    let query = this.supabase.from('user_profiles').select('user_id');

    // Apply criteria filters
    if (criteria.roles) {
      query = query.in('role', criteria.roles);
    }

    if (criteria.tiers) {
      query = query.in('subscription_tier', criteria.tiers);
    }

    if (criteria.weddingStatus) {
      // Join with weddings table for wedding status filtering
      query = query
        .select(
          `
          user_id,
          wedding_team!inner(
            wedding:weddings!inner(status)
          )
        `,
        )
        .in('wedding_team.wedding.status', criteria.weddingStatus);
    }

    const { data } = await query;
    return data?.map((row) => row.user_id) || [];
  }

  // Delivery status caching
  async cacheDeliveryStatus(broadcastId: string, status: any): Promise<void> {
    const cacheKey = `delivery_status:${broadcastId}`;
    await this.setCache(cacheKey, status, 300); // 5 minutes
  }

  async getDeliveryStatus(broadcastId: string): Promise<any> {
    const cacheKey = `delivery_status:${broadcastId}`;
    return this.getFromRedis(cacheKey);
  }

  // Wedding season optimization (preload common data)
  async preloadWeddingSeasonData(): Promise<void> {
    console.info('Preloading wedding season data...');

    try {
      // Get active weddings in the next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { data: upcomingWeddings } = await this.supabase
        .from('weddings')
        .select('id')
        .gte('wedding_date', new Date().toISOString().split('T')[0])
        .lte('wedding_date', nextMonth.toISOString().split('T')[0])
        .eq('status', 'confirmed');

      if (upcomingWeddings) {
        // Preload wedding team data
        const preloadPromises = upcomingWeddings.map((wedding) =>
          this.getWeddingTeamMembers(wedding.id),
        );

        await Promise.allSettled(preloadPromises);

        console.info(
          `Preloaded data for ${upcomingWeddings.length} upcoming weddings`,
        );
      }

      // Preload segment data for common segments
      const commonSegments = [
        'wedding-coordinators',
        'active-couples',
        'premium-users',
      ];
      await Promise.allSettled(
        commonSegments.map((segmentId) => this.getSegmentUsers(segmentId)),
      );
    } catch (error) {
      console.error('Wedding season preload failed:', error);
    }
  }

  // Cache invalidation for real-time updates
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user_prefs:${userId}`,
      `wedding_team:*`, // Invalidate all wedding team caches (user might be in multiple)
    ];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        await this.redis.del(pattern);
        this.localCache.delete(pattern);
      }
    }
  }

  async invalidateBroadcastCache(broadcastId: string): Promise<void> {
    const cacheKey = `broadcast:${broadcastId}`;
    await this.redis.del(cacheKey);
    this.localCache.delete(cacheKey);
  }

  async invalidateWeddingCache(weddingId: string): Promise<void> {
    const patterns = [
      `wedding_team:${weddingId}`,
      `segment_users:*`, // Wedding changes might affect segments
    ];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        await this.redis.del(pattern);
        this.localCache.delete(pattern);
      }
    }
  }

  private async getFromRedis(key: string): Promise<any> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  private async setCache(
    key: string,
    value: any,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
    }
  }

  private getDefaultPreferences(): any {
    return {
      systemBroadcasts: true,
      businessBroadcasts: true,
      collaborationBroadcasts: true,
      weddingBroadcasts: true,
      criticalOnly: false,
      deliveryChannels: ['realtime', 'in_app'],
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      },
    };
  }

  // Cache performance monitoring
  async getStats(): Promise<CacheStats> {
    const memoryUsage = this.localCache.calculatedSize || 0;
    const total = this.cacheStats.hits + this.cacheStats.misses;

    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: total > 0 ? this.cacheStats.hits / total : 0,
      memoryUsage,
      evictions: this.cacheStats.evictions,
    };
  }

  // Warm-up cache for peak traffic
  async warmupCache(): Promise<void> {
    console.info('Warming up broadcast caches...');

    try {
      // Preload active segments
      const { data: activeSegments } = await this.supabase
        .from('broadcast_segments')
        .select('id')
        .eq('is_active', true);

      if (activeSegments) {
        await Promise.allSettled(
          activeSegments.map((segment) => this.getSegmentUsers(segment.id)),
        );
      }

      // Preload recent broadcast preferences for active users
      const { data: recentUsers } = await this.supabase
        .from('broadcast_deliveries')
        .select('user_id')
        .gte(
          'delivered_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .limit(1000);

      if (recentUsers) {
        const uniqueUsers = [...new Set(recentUsers.map((d) => d.user_id))];
        await Promise.allSettled(
          uniqueUsers.map((userId) => this.getUserPreferences(userId)),
        );
      }

      console.info('Cache warmup completed');
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  }

  // Memory pressure monitoring
  async monitorMemoryPressure(): Promise<void> {
    const stats = await this.getStats();
    const memoryThreshold = 40 * 1024 * 1024; // 40MB

    if (stats.memoryUsage > memoryThreshold) {
      console.warn('High memory usage in broadcast cache:', {
        usage: `${(stats.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        threshold: `${memoryThreshold / 1024 / 1024}MB`,
      });

      // Reduce cache size temporarily
      this.localCache.resize(Math.floor(this.localCache.max * 0.8));
    }
  }
}
