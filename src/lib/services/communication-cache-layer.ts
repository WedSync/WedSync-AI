// WS-155: Redis Cache Layer for Communications Performance
import { Redis } from 'ioredis';
import { createClient } from '@/lib/supabase/server';

interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  memoryUsage: number;
  keyCount: number;
  avgAccessTime: number;
}

export class CommunicationCacheLayer {
  private redis: Redis;
  private stats: CacheStats;
  private cachePatterns: Map<string, any>;
  private compressionEnabled: boolean = true;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_CACHE_DB || '1'),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsage: 0,
      keyCount: 0,
      avgAccessTime: 0,
    };

    this.cachePatterns = new Map();
    this.initializeCachePatterns();
    this.startStatsCollection();
  }

  private initializeCachePatterns() {
    // Define cache patterns and TTLs for different data types
    this.cachePatterns.set('template', {
      ttl: 3600, // 1 hour
      prefix: 'tpl:',
      compress: true,
    });

    this.cachePatterns.set('recipient', {
      ttl: 1800, // 30 minutes
      prefix: 'rcp:',
      compress: false,
    });

    this.cachePatterns.set('campaign', {
      ttl: 7200, // 2 hours
      prefix: 'cmp:',
      compress: true,
    });

    this.cachePatterns.set('analytics', {
      ttl: 300, // 5 minutes
      prefix: 'anl:',
      compress: true,
    });

    this.cachePatterns.set('provider', {
      ttl: 60, // 1 minute
      prefix: 'prv:',
      compress: false,
    });

    this.cachePatterns.set('engagement', {
      ttl: 900, // 15 minutes
      prefix: 'eng:',
      compress: true,
    });
  }

  // Template Caching
  public async getTemplate(templateId: string): Promise<any | null> {
    const startTime = Date.now();
    const cacheKey = `tpl:${templateId}`;

    try {
      const cached = await this.get(cacheKey);

      if (cached) {
        this.stats.hits++;
        return cached;
      }

      this.stats.misses++;

      // Fetch from database
      const supabase = await createClient();
      const { data } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (data) {
        // Cache the template
        await this.set(cacheKey, data, this.cachePatterns.get('template').ttl);
      }

      return data;
    } finally {
      this.updateAccessTime(Date.now() - startTime);
    }
  }

  public async cacheTemplates(templates: any[]): Promise<void> {
    const pattern = this.cachePatterns.get('template');
    const pipeline = this.redis.pipeline();

    for (const template of templates) {
      const key = `${pattern.prefix}${template.id}`;
      const value = this.serialize(template, pattern.compress);
      pipeline.setex(key, pattern.ttl, value);
    }

    await pipeline.exec();
  }

  // Recipient Data Caching
  public async getRecipient(recipientId: string): Promise<any | null> {
    const cacheKey = `rcp:${recipientId}`;
    const cached = await this.get(cacheKey);

    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;

    // Fetch from database
    const supabase = await createClient();
    const { data } = await supabase
      .from('recipients')
      .select(
        `
        *,
        engagement_history(*),
        preferences(*)
      `,
      )
      .eq('id', recipientId)
      .single();

    if (data) {
      await this.set(cacheKey, data, this.cachePatterns.get('recipient').ttl);
    }

    return data;
  }

  public async cacheRecipientBatch(
    recipientIds: string[],
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const uncachedIds: string[] = [];

    // Check cache first
    const pipeline = this.redis.pipeline();
    for (const id of recipientIds) {
      pipeline.get(`rcp:${id}`);
    }

    const cached = await pipeline.exec();

    cached?.forEach((result, index) => {
      if (result && result[1]) {
        const data = this.deserialize(result[1] as string);
        results.set(recipientIds[index], data);
        this.stats.hits++;
      } else {
        uncachedIds.push(recipientIds[index]);
        this.stats.misses++;
      }
    });

    // Fetch uncached from database
    if (uncachedIds.length > 0) {
      const supabase = await createClient();
      const { data } = await supabase
        .from('recipients')
        .select('*')
        .in('id', uncachedIds);

      if (data) {
        const cachePipeline = this.redis.pipeline();

        for (const recipient of data) {
          results.set(recipient.id, recipient);
          const key = `rcp:${recipient.id}`;
          const value = this.serialize(recipient, false);
          cachePipeline.setex(
            key,
            this.cachePatterns.get('recipient').ttl,
            value,
          );
        }

        await cachePipeline.exec();
      }
    }

    return results;
  }

  // Campaign Analytics Caching
  public async getCampaignAnalytics(campaignId: string): Promise<any | null> {
    const cacheKey = `anl:${campaignId}`;
    const cached = await this.get(cacheKey);

    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;

    // Calculate analytics
    const analytics = await this.calculateCampaignAnalytics(campaignId);

    if (analytics) {
      await this.set(
        cacheKey,
        analytics,
        this.cachePatterns.get('analytics').ttl,
      );
    }

    return analytics;
  }

  private async calculateCampaignAnalytics(campaignId: string): Promise<any> {
    const supabase = await createClient();

    const [campaign, messages, engagement] = await Promise.all([
      supabase
        .from('communication_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single(),

      supabase
        .from('campaign_messages')
        .select('*')
        .eq('campaign_id', campaignId),

      supabase
        .from('message_engagement')
        .select('*')
        .eq('campaign_id', campaignId),
    ]);

    if (!campaign.data) return null;

    const totalMessages = messages.data?.length || 0;
    const delivered =
      messages.data?.filter((m) => m.status === 'delivered').length || 0;
    const opened = engagement.data?.filter((e) => e.opened_at).length || 0;
    const clicked = engagement.data?.filter((e) => e.clicked_at).length || 0;

    return {
      campaign: campaign.data,
      metrics: {
        totalMessages,
        delivered,
        opened,
        clicked,
        deliveryRate: totalMessages > 0 ? (delivered / totalMessages) * 100 : 0,
        openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
        clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
      },
    };
  }

  // Provider Status Caching
  public async getProviderStatus(providerId: string): Promise<any | null> {
    const cacheKey = `prv:${providerId}`;
    return await this.get(cacheKey);
  }

  public async cacheProviderStatus(
    providerId: string,
    status: any,
  ): Promise<void> {
    const cacheKey = `prv:${providerId}`;
    await this.set(cacheKey, status, this.cachePatterns.get('provider').ttl);
  }

  // Engagement Pattern Caching
  public async getEngagementPattern(recipientId: string): Promise<any | null> {
    const cacheKey = `eng:${recipientId}`;
    const cached = await this.get(cacheKey);

    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;

    // Calculate engagement pattern
    const pattern = await this.calculateEngagementPattern(recipientId);

    if (pattern) {
      await this.set(
        cacheKey,
        pattern,
        this.cachePatterns.get('engagement').ttl,
      );
    }

    return pattern;
  }

  private async calculateEngagementPattern(recipientId: string): Promise<any> {
    const supabase = await createClient();

    const { data } = await supabase
      .from('recipient_engagement_history')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (!data || data.length === 0) return null;

    const pattern = {
      preferredDays: new Map<number, number>(),
      preferredHours: new Map<number, number>(),
      averageResponseTime: 0,
      engagementRate: 0,
    };

    let totalResponseTime = 0;
    let responseCount = 0;

    for (const engagement of data) {
      const date = new Date(engagement.timestamp);
      const day = date.getDay();
      const hour = date.getHours();

      pattern.preferredDays.set(day, (pattern.preferredDays.get(day) || 0) + 1);
      pattern.preferredHours.set(
        hour,
        (pattern.preferredHours.get(hour) || 0) + 1,
      );

      if (engagement.response_time) {
        totalResponseTime += engagement.response_time;
        responseCount++;
      }
    }

    pattern.averageResponseTime =
      responseCount > 0 ? totalResponseTime / responseCount : 0;

    pattern.engagementRate =
      (data.filter((e) => e.action !== 'ignored').length / data.length) * 100;

    return pattern;
  }

  // Warm Cache for Campaign
  public async warmCacheForCampaign(campaignId: string): Promise<void> {
    const supabase = await createClient();

    // Get campaign recipients
    const { data: recipients } = await supabase
      .from('campaign_recipients')
      .select('recipient_id')
      .eq('campaign_id', campaignId);

    if (!recipients) return;

    // Batch cache recipients
    const recipientIds = recipients.map((r) => r.recipient_id);
    await this.cacheRecipientBatch(recipientIds);

    // Cache campaign analytics
    await this.getCampaignAnalytics(campaignId);

    // Cache templates used in campaign
    const { data: campaign } = await supabase
      .from('communication_campaigns')
      .select('template_id')
      .eq('id', campaignId)
      .single();

    if (campaign?.template_id) {
      await this.getTemplate(campaign.template_id);
    }
  }

  // Generic Cache Operations
  private async get(key: string): Promise<any | null> {
    try {
      const value = await this.redis.get(key);

      if (value) {
        // Update access tracking
        await this.redis.hincrby(`meta:${key}`, 'accessCount', 1);
        await this.redis.hset(`meta:${key}`, 'lastAccessed', Date.now());

        return this.deserialize(value);
      }

      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  private async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      const serialized = this.serialize(value, this.shouldCompress(key));

      await this.redis.setex(key, ttl, serialized);

      // Store metadata
      await this.redis.hmset(`meta:${key}`, {
        createdAt: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
      });

      await this.redis.expire(`meta:${key}`, ttl);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  public async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();

        for (const key of keys) {
          pipeline.del(key);
          pipeline.del(`meta:${key}`);
        }

        await pipeline.exec();
        this.stats.evictions += keys.length;
      }
    } catch (error) {
      console.error(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }

  public async invalidateTemplate(templateId: string): Promise<void> {
    await this.invalidate(`tpl:${templateId}`);
  }

  public async invalidateCampaign(campaignId: string): Promise<void> {
    await this.invalidate(`cmp:${campaignId}`);
    await this.invalidate(`anl:${campaignId}`);
  }

  public async invalidateRecipient(recipientId: string): Promise<void> {
    await this.invalidate(`rcp:${recipientId}`);
    await this.invalidate(`eng:${recipientId}`);
  }

  // Serialization
  private serialize(value: any, compress: boolean): string {
    const json = JSON.stringify(value);

    if (compress && this.compressionEnabled) {
      // In production, use a compression library like pako
      return json; // Simplified for now
    }

    return json;
  }

  private deserialize(value: string): any {
    try {
      // In production, check if compressed and decompress if needed
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private shouldCompress(key: string): boolean {
    for (const [, pattern] of this.cachePatterns) {
      if (key.startsWith(pattern.prefix)) {
        return pattern.compress;
      }
    }
    return false;
  }

  // Statistics
  private updateAccessTime(duration: number) {
    const alpha = 0.1; // Smoothing factor
    this.stats.avgAccessTime =
      alpha * duration + (1 - alpha) * this.stats.avgAccessTime;
  }

  private async startStatsCollection() {
    setInterval(async () => {
      await this.collectStats();
    }, 30000); // Every 30 seconds
  }

  private async collectStats() {
    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();

      // Parse memory usage from info
      const memoryMatch = info.match(/used_memory:(\d+)/);
      if (memoryMatch) {
        this.stats.memoryUsage = parseInt(memoryMatch[1]);
      }

      this.stats.keyCount = keyCount;

      // Store stats
      const supabase = await createClient();

      await supabase.from('cache_metrics').insert({
        hits: this.stats.hits,
        misses: this.stats.misses,
        hit_rate:
          this.stats.hits > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
            : 0,
        evictions: this.stats.evictions,
        memory_usage: this.stats.memoryUsage,
        key_count: this.stats.keyCount,
        avg_access_time: this.stats.avgAccessTime,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error collecting cache stats:', error);
    }
  }

  public getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate:
        this.stats.hits > 0
          ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
          : 0,
    } as any;
  }

  public async flush(): Promise<void> {
    await this.redis.flushdb();

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsage: 0,
      keyCount: 0,
      avgAccessTime: 0,
    };
  }

  public async cleanup(): Promise<void> {
    await this.redis.quit();
  }
}
