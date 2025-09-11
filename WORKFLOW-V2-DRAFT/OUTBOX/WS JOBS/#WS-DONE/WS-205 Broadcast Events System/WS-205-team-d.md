# WS-205 Team D: Broadcast Events System - Performance & Scalability

## Team D Responsibilities: Performance Optimization, Scalability Architecture & Load Management

**Feature**: WS-205 Broadcast Events System
**Team Focus**: Performance optimization, scalability architecture, load balancing, caching strategies
**Duration**: Sprint 21 (Current)
**Dependencies**: Team B (Backend Infrastructure), Team C (Integration Services)
**MCP Integration**: Use Sequential Thinking MCP for performance architecture, Ref MCP for optimization patterns, Context7 MCP for performance tools

## Technical Foundation from Feature Designer

**Source**: `/WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/WS-205-broadcast-events-system-technical.md`

### Performance Requirements Overview
The broadcast system must handle enterprise-scale wedding industry traffic with specific performance characteristics:

1. **10,000+ concurrent broadcast connections** during peak wedding seasons
2. **Sub-100ms broadcast processing** from creation to delivery initiation
3. **99.9% uptime** during critical wedding events
4. **Wedding season traffic spikes** (June: 3x normal load, December: 2x normal load)
5. **Multi-region deployment** for global wedding industry coverage

### Wedding Industry Performance Context
- **June wedding season**: 40% of annual weddings, requiring 3x capacity scaling
- **Weekend traffic**: 80% of wedding events occur Friday-Sunday
- **Time zone coordination**: Multi-region broadcast delivery optimization  
- **Emergency broadcasts**: <5 second delivery for wedding day crises
- **Photographer workflows**: Real-time timeline updates during shoots

## Primary Deliverables

### 1. Broadcast Queue Performance Architecture

Create high-performance priority queue system for broadcast processing:

```typescript
// /wedsync/src/lib/broadcast/performance/broadcast-queue-manager.ts
import Redis from 'ioredis';
import { performance } from 'perf_hooks';
import { createServerClient } from '@/lib/supabase/server';

interface QueueMetrics {
  totalProcessed: number;
  averageProcessingTime: number;
  currentQueueSize: number;
  errorRate: number;
  throughputPerSecond: number;
}

interface BroadcastQueueItem {
  id: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  payload: any;
  createdAt: number;
  attemptCount: number;
  maxAttempts: number;
}

export class BroadcastQueueManager {
  private redis: Redis.Cluster;
  private supabase;
  private metrics: Map<string, number> = new Map();
  private processingWorkers: Map<string, NodeJS.Timeout> = new Map();
  private readonly maxConcurrentWorkers = 50;

  constructor() {
    // Redis Cluster for high availability
    this.redis = new Redis.Cluster([
      {
        host: process.env.REDIS_CLUSTER_HOST_1!,
        port: parseInt(process.env.REDIS_CLUSTER_PORT_1!)
      },
      {
        host: process.env.REDIS_CLUSTER_HOST_2!,
        port: parseInt(process.env.REDIS_CLUSTER_PORT_2!)
      },
      {
        host: process.env.REDIS_CLUSTER_HOST_3!,
        port: parseInt(process.env.REDIS_CLUSTER_PORT_3!)
      }
    ], {
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 10000,
        lazyConnect: true,
        maxRetriesPerRequest: 3
      },
      enableOfflineQueue: false,
      clusterRetryDelayOnFailover: 1000,
      maxRetriesPerRequest: 3
    });

    this.supabase = createServerClient();
    this.initializeWorkerPool();
  }

  async enqueue(
    broadcast: any,
    targetUsers: string[],
    priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Batch users for optimal processing
      const userBatches = this.batchUsers(targetUsers);
      const queueItems: BroadcastQueueItem[] = [];

      for (const batch of userBatches) {
        const queueItem: BroadcastQueueItem = {
          id: `${broadcast.id}-${Date.now()}-${Math.random()}`,
          priority,
          payload: {
            broadcast,
            users: batch,
            batchSize: batch.length
          },
          createdAt: Date.now(),
          attemptCount: 0,
          maxAttempts: priority === 'critical' ? 5 : 3
        };

        queueItems.push(queueItem);
      }

      // Add to Redis queues with priority-based routing
      const pipeline = this.redis.pipeline();
      
      for (const item of queueItems) {
        const queueKey = this.getQueueKey(priority);
        const score = this.calculatePriorityScore(item);
        
        pipeline.zadd(queueKey, score, JSON.stringify(item));
      }

      await pipeline.exec();

      // Update metrics
      this.updateMetrics('enqueue', performance.now() - startTime);
      
      console.info(`Enqueued ${queueItems.length} broadcast batches for ${targetUsers.length} users`, {
        broadcastId: broadcast.id,
        priority,
        batchCount: queueItems.length,
        userCount: targetUsers.length
      });

    } catch (error) {
      this.updateMetrics('enqueue_error', 1);
      console.error('Failed to enqueue broadcast:', error);
      throw error;
    }
  }

  private batchUsers(users: string[]): string[][] {
    const batchSize = this.getOptimalBatchSize(users.length);
    const batches: string[][] = [];
    
    for (let i = 0; i < users.length; i += batchSize) {
      batches.push(users.slice(i, i + batchSize));
    }
    
    return batches;
  }

  private getOptimalBatchSize(totalUsers: number): number {
    // Dynamic batch sizing based on total users and system load
    const baseSize = 100;
    const maxSize = 500;
    const minSize = 25;

    if (totalUsers < 1000) return Math.max(minSize, Math.min(totalUsers / 5, baseSize));
    if (totalUsers < 5000) return Math.min(maxSize, baseSize * 1.5);
    
    // Large broadcasts: smaller batches for better parallelization
    return Math.min(maxSize, baseSize * 2);
  }

  private getQueueKey(priority: string): string {
    const queueMap = {
      critical: 'broadcast:queue:critical',
      high: 'broadcast:queue:high', 
      normal: 'broadcast:queue:normal',
      low: 'broadcast:queue:low'
    };
    
    return queueMap[priority] || queueMap.normal;
  }

  private calculatePriorityScore(item: BroadcastQueueItem): number {
    // Lower scores have higher priority in Redis sorted sets
    const priorityScores = {
      critical: 1000,
      high: 2000,
      normal: 3000,
      low: 4000
    };

    const baseScore = priorityScores[item.priority];
    const timeScore = Date.now(); // Earlier items get priority within same priority level
    
    return baseScore + timeScore;
  }

  private initializeWorkerPool(): void {
    // Start worker processes for each priority queue
    const priorities = ['critical', 'high', 'normal', 'low'];
    
    priorities.forEach(priority => {
      const workerCount = this.getWorkerCount(priority);
      
      for (let i = 0; i < workerCount; i++) {
        const workerId = `${priority}-worker-${i}`;
        this.startWorker(workerId, priority);
      }
    });

    // Auto-scaling monitoring
    setInterval(() => this.monitorAndScale(), 30000); // Check every 30 seconds
  }

  private getWorkerCount(priority: string): number {
    const workerCounts = {
      critical: 8,  // High concurrency for critical
      high: 6,
      normal: 4,
      low: 2
    };
    
    return workerCounts[priority] || 2;
  }

  private startWorker(workerId: string, priority: string): void {
    const processQueue = async () => {
      try {
        const queueKey = this.getQueueKey(priority);
        const items = await this.redis.zpopmin(queueKey, 1);
        
        if (items.length === 0) {
          // No items, wait before checking again
          setTimeout(processQueue, this.getWorkerDelay(priority));
          return;
        }

        const [itemStr, score] = items[0];
        const queueItem: BroadcastQueueItem = JSON.parse(itemStr);
        
        await this.processQueueItem(queueItem);
        
        // Continue processing immediately if critical/high priority
        if (['critical', 'high'].includes(priority)) {
          setImmediate(processQueue);
        } else {
          setTimeout(processQueue, this.getWorkerDelay(priority));
        }
        
      } catch (error) {
        console.error(`Worker ${workerId} error:`, error);
        setTimeout(processQueue, 5000); // Retry after error
      }
    };

    // Start worker
    processQueue();
    
    // Track active worker
    this.processingWorkers.set(workerId, setTimeout(() => {}, 0));
  }

  private getWorkerDelay(priority: string): number {
    const delays = {
      critical: 10,   // 10ms - immediate processing
      high: 50,       // 50ms
      normal: 100,    // 100ms
      low: 500        // 500ms
    };
    
    return delays[priority] || 100;
  }

  private async processQueueItem(item: BroadcastQueueItem): Promise<void> {
    const startTime = performance.now();
    
    try {
      item.attemptCount++;
      
      // Process broadcast delivery
      await this.deliverBroadcast(item.payload.broadcast, item.payload.users);
      
      // Update success metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics('processing_time', processingTime);
      this.updateMetrics('processed_count', 1);
      
      console.debug(`Processed broadcast batch: ${item.id}`, {
        users: item.payload.users.length,
        processingTime: `${processingTime.toFixed(2)}ms`,
        priority: item.priority
      });
      
    } catch (error) {
      console.error(`Failed to process queue item ${item.id}:`, error);
      
      // Retry logic
      if (item.attemptCount < item.maxAttempts) {
        await this.requeueFailedItem(item);
      } else {
        await this.handlePermanentFailure(item, error);
      }
      
      this.updateMetrics('processing_error', 1);
    }
  }

  private async deliverBroadcast(broadcast: any, users: string[]): Promise<void> {
    // Implement actual broadcast delivery
    const deliveryPromises = users.map(userId => 
      this.deliverToUser(broadcast, userId)
    );
    
    // Batch process with concurrency limit
    const batchSize = 20;
    for (let i = 0; i < deliveryPromises.length; i += batchSize) {
      const batch = deliveryPromises.slice(i, i + batchSize);
      await Promise.allSettled(batch);
    }
  }

  private async deliverToUser(broadcast: any, userId: string): Promise<void> {
    // Create delivery record
    await this.supabase
      .from('broadcast_deliveries')
      .upsert({
        broadcast_id: broadcast.id,
        user_id: userId,
        delivery_channel: 'realtime',
        delivery_status: 'pending',
        delivered_at: new Date().toISOString()
      });

    // Send to realtime channel
    await this.supabase.channel(`broadcast:user:${userId}`).send({
      type: 'broadcast',
      event: 'new_broadcast',
      payload: broadcast
    });
  }

  private async requeueFailedItem(item: BroadcastQueueItem): Promise<void> {
    // Exponential backoff
    const delay = Math.pow(2, item.attemptCount) * 1000;
    const retryTime = Date.now() + delay;
    
    const queueKey = this.getQueueKey(item.priority);
    const score = this.calculatePriorityScore(item) + delay;
    
    await this.redis.zadd(queueKey, score, JSON.stringify(item));
  }

  private async handlePermanentFailure(item: BroadcastQueueItem, error: any): Promise<void> {
    // Log permanent failure
    console.error('Permanent broadcast failure:', {
      itemId: item.id,
      broadcastId: item.payload.broadcast.id,
      users: item.payload.users.length,
      error: error.message
    });
    
    // Update delivery records as failed
    await this.supabase
      .from('broadcast_deliveries')
      .update({
        delivery_status: 'failed',
        error_message: error.message
      })
      .eq('broadcast_id', item.payload.broadcast.id)
      .in('user_id', item.payload.users);
  }

  private async monitorAndScale(): Promise<void> {
    try {
      const queueSizes = await this.getQueueSizes();
      const totalQueueSize = Object.values(queueSizes).reduce((sum, size) => sum + size, 0);
      
      // Auto-scaling logic
      if (totalQueueSize > 10000 && this.processingWorkers.size < this.maxConcurrentWorkers) {
        await this.scaleUp();
      } else if (totalQueueSize < 1000 && this.processingWorkers.size > 10) {
        await this.scaleDown();
      }
      
      // Update queue metrics
      this.updateMetrics('queue_size', totalQueueSize);
      
    } catch (error) {
      console.error('Auto-scaling monitoring error:', error);
    }
  }

  private async getQueueSizes(): Promise<Record<string, number>> {
    const priorities = ['critical', 'high', 'normal', 'low'];
    const sizes: Record<string, number> = {};
    
    for (const priority of priorities) {
      const queueKey = this.getQueueKey(priority);
      const size = await this.redis.zcard(queueKey);
      sizes[priority] = size;
    }
    
    return sizes;
  }

  private async scaleUp(): Promise<void> {
    console.info('Scaling up broadcast workers due to high queue size');
    
    // Add workers for high-priority queues
    const workerId = `auto-scaled-${Date.now()}`;
    this.startWorker(workerId, 'normal');
    
    // Send alert to monitoring
    this.sendScalingAlert('scale_up', this.processingWorkers.size);
  }

  private async scaleDown(): Promise<void> {
    console.info('Scaling down broadcast workers due to low queue size');
    
    // Remove one auto-scaled worker
    const autoScaledWorkers = Array.from(this.processingWorkers.keys())
      .filter(id => id.includes('auto-scaled'));
    
    if (autoScaledWorkers.length > 0) {
      const workerToRemove = autoScaledWorkers[0];
      clearTimeout(this.processingWorkers.get(workerToRemove)!);
      this.processingWorkers.delete(workerToRemove);
    }
    
    this.sendScalingAlert('scale_down', this.processingWorkers.size);
  }

  private sendScalingAlert(action: 'scale_up' | 'scale_down', workerCount: number): void {
    // Integration with monitoring system
    console.info(`Auto-scaling event: ${action}`, {
      workerCount,
      timestamp: new Date().toISOString()
    });
  }

  private updateMetrics(key: string, value: number): void {
    const current = this.metrics.get(key) || 0;
    
    if (key.includes('time')) {
      // Calculate moving average for time metrics
      const count = this.metrics.get(`${key}_count`) || 0;
      const newAverage = (current * count + value) / (count + 1);
      this.metrics.set(key, newAverage);
      this.metrics.set(`${key}_count`, count + 1);
    } else {
      this.metrics.set(key, current + value);
    }
  }

  async getMetrics(): Promise<QueueMetrics> {
    const queueSizes = await this.getQueueSizes();
    const totalQueueSize = Object.values(queueSizes).reduce((sum, size) => sum + size, 0);
    
    return {
      totalProcessed: this.metrics.get('processed_count') || 0,
      averageProcessingTime: this.metrics.get('processing_time') || 0,
      currentQueueSize: totalQueueSize,
      errorRate: (this.metrics.get('processing_error') || 0) / Math.max(1, this.metrics.get('processed_count') || 1),
      throughputPerSecond: this.calculateThroughput()
    };
  }

  private calculateThroughput(): number {
    // Calculate broadcasts processed per second over last minute
    const processed = this.metrics.get('processed_count') || 0;
    const timeWindow = 60; // seconds
    
    return processed / timeWindow;
  }

  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      await this.redis.ping();
      const metrics = await this.getMetrics();
      
      const healthy = 
        metrics.errorRate < 0.05 && // Less than 5% error rate
        metrics.averageProcessingTime < 1000 && // Less than 1 second processing
        this.processingWorkers.size > 0; // At least one worker active
      
      return {
        healthy,
        details: {
          metrics,
          workerCount: this.processingWorkers.size,
          redisConnected: true
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error.message }
      };
    }
  }
}
```

### 2. Broadcast Caching Strategy

Implement intelligent caching for broadcast data and delivery optimization:

```typescript
// /wedsync/src/lib/broadcast/performance/broadcast-cache-manager.ts
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
    evictions: 0
  };

  constructor() {
    this.redis = new Redis.Cluster([
      {
        host: process.env.REDIS_CLUSTER_HOST_1!,
        port: parseInt(process.env.REDIS_CLUSTER_PORT_1!)
      },
      {
        host: process.env.REDIS_CLUSTER_HOST_2!,
        port: parseInt(process.env.REDIS_CLUSTER_PORT_2!)
      }
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
      }
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

    members = data?.map(row => row.user_id) || [];
    
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
    let query = this.supabase
      .from('user_profiles')
      .select('user_id');

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
        .select(`
          user_id,
          wedding_team!inner(
            wedding:weddings!inner(status)
          )
        `)
        .in('wedding_team.wedding.status', criteria.weddingStatus);
    }

    const { data } = await query;
    return data?.map(row => row.user_id) || [];
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
        const preloadPromises = upcomingWeddings.map(wedding => 
          this.getWeddingTeamMembers(wedding.id)
        );
        
        await Promise.allSettled(preloadPromises);
        
        console.info(`Preloaded data for ${upcomingWeddings.length} upcoming weddings`);
      }

      // Preload segment data for common segments
      const commonSegments = ['wedding-coordinators', 'active-couples', 'premium-users'];
      await Promise.allSettled(
        commonSegments.map(segmentId => this.getSegmentUsers(segmentId))
      );

    } catch (error) {
      console.error('Wedding season preload failed:', error);
    }
  }

  // Cache invalidation for real-time updates
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user_prefs:${userId}`,
      `wedding_team:*` // Invalidate all wedding team caches (user might be in multiple)
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
      `segment_users:*` // Wedding changes might affect segments
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

  private async setCache(key: string, value: any, ttlSeconds: number): Promise<void> {
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
        timezone: 'UTC'
      }
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
      evictions: this.cacheStats.evictions
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
          activeSegments.map(segment => this.getSegmentUsers(segment.id))
        );
      }

      // Preload recent broadcast preferences for active users
      const { data: recentUsers } = await this.supabase
        .from('broadcast_deliveries')
        .select('user_id')
        .gte('delivered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1000);

      if (recentUsers) {
        const uniqueUsers = [...new Set(recentUsers.map(d => d.user_id))];
        await Promise.allSettled(
          uniqueUsers.map(userId => this.getUserPreferences(userId))
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
        threshold: `${memoryThreshold / 1024 / 1024}MB`
      });

      // Reduce cache size temporarily
      this.localCache.resize(Math.floor(this.localCache.max * 0.8));
    }
  }
}
```

### 3. Auto-Scaling Configuration

Wedding season traffic auto-scaling system:

```typescript
// /wedsync/src/lib/broadcast/performance/auto-scaler.ts
import { CloudWatch } from '@aws/client-cloudwatch';
import { ApplicationAutoScaling } from '@aws/client-application-autoscaling';

interface ScalingMetrics {
  currentConnections: number;
  queueSize: number;
  processingLatency: number;
  errorRate: number;
  cpuUtilization: number;
  memoryUtilization: number;
}

interface ScalingRule {
  metric: keyof ScalingMetrics;
  threshold: number;
  comparison: 'greater' | 'less';
  action: 'scale_out' | 'scale_in';
  cooldown: number; // minutes
}

export class BroadcastAutoScaler {
  private cloudWatch: CloudWatch;
  private autoScaling: ApplicationAutoScaling;
  private lastScalingAction: Map<string, number> = new Map();
  
  private readonly weddingSeasonRules: ScalingRule[] = [
    // Aggressive scaling for wedding season
    {
      metric: 'currentConnections',
      threshold: 5000,
      comparison: 'greater',
      action: 'scale_out',
      cooldown: 5 // Fast scaling during peaks
    },
    {
      metric: 'queueSize',
      threshold: 1000,
      comparison: 'greater', 
      action: 'scale_out',
      cooldown: 3
    },
    {
      metric: 'processingLatency',
      threshold: 500, // 500ms
      comparison: 'greater',
      action: 'scale_out',
      cooldown: 5
    },
    {
      metric: 'errorRate',
      threshold: 0.02, // 2%
      comparison: 'greater',
      action: 'scale_out',
      cooldown: 10
    }
  ];

  private readonly normalSeasonRules: ScalingRule[] = [
    // Conservative scaling for normal periods
    {
      metric: 'currentConnections',
      threshold: 10000,
      comparison: 'greater',
      action: 'scale_out', 
      cooldown: 10
    },
    {
      metric: 'currentConnections',
      threshold: 2000,
      comparison: 'less',
      action: 'scale_in',
      cooldown: 20
    }
  ];

  constructor() {
    this.cloudWatch = new CloudWatch({
      region: process.env.AWS_REGION
    });
    
    this.autoScaling = new ApplicationAutoScaling({
      region: process.env.AWS_REGION
    });
  }

  async evaluateScaling(metrics: ScalingMetrics): Promise<void> {
    const isWeddingSeason = this.isWeddingSeason();
    const rules = isWeddingSeason ? this.weddingSeasonRules : this.normalSeasonRules;
    
    for (const rule of rules) {
      if (this.shouldTriggerScaling(rule, metrics)) {
        await this.executeScaling(rule);
      }
    }
  }

  private isWeddingSeason(): boolean {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-based month
    
    // Peak wedding months: May, June, September, October
    const peakMonths = [5, 6, 9, 10];
    return peakMonths.includes(month);
  }

  private shouldTriggerScaling(rule: ScalingRule, metrics: ScalingMetrics): boolean {
    const metricValue = metrics[rule.metric];
    const cooldownKey = `${rule.metric}_${rule.action}`;
    const lastAction = this.lastScalingAction.get(cooldownKey) || 0;
    const cooldownExpired = Date.now() - lastAction > rule.cooldown * 60 * 1000;
    
    if (!cooldownExpired) {
      return false;
    }

    if (rule.comparison === 'greater') {
      return metricValue > rule.threshold;
    } else {
      return metricValue < rule.threshold;
    }
  }

  private async executeScaling(rule: ScalingRule): Promise<void> {
    try {
      const serviceName = 'broadcast-service';
      const scalableDimension = 'ecs:service:DesiredCount';
      
      if (rule.action === 'scale_out') {
        await this.scaleOut(serviceName, scalableDimension);
      } else {
        await this.scaleIn(serviceName, scalableDimension);
      }
      
      // Record scaling action
      const cooldownKey = `${rule.metric}_${rule.action}`;
      this.lastScalingAction.set(cooldownKey, Date.now());
      
      console.info(`Auto-scaling executed:`, {
        rule: rule.metric,
        action: rule.action,
        threshold: rule.threshold
      });
      
    } catch (error) {
      console.error('Auto-scaling failed:', error);
    }
  }

  private async scaleOut(serviceName: string, scalableDimension: string): Promise<void> {
    // Get current capacity
    const { scalableTargets } = await this.autoScaling.describeScalableTargets({
      ServiceNamespace: 'ecs',
      ResourceIds: [`service/broadcast-cluster/${serviceName}`],
      ScalableDimension: scalableDimension
    });

    if (!scalableTargets || scalableTargets.length === 0) {
      throw new Error('No scalable targets found');
    }

    const current = scalableTargets[0];
    const newCapacity = Math.min(
      (current.DesiredCapacity || 1) * 2, // Double capacity
      current.MaxCapacity || 50 // Respect max capacity
    );

    await this.autoScaling.putScalingPolicy({
      PolicyName: 'broadcast-scale-out',
      ServiceNamespace: 'ecs',
      ResourceId: `service/broadcast-cluster/${serviceName}`,
      ScalableDimension: scalableDimension,
      PolicyType: 'StepScaling',
      StepScalingPolicyConfiguration: {
        AdjustmentType: 'ExactCapacity',
        StepAdjustments: [{
          ScalingAdjustment: newCapacity,
          MetricIntervalLowerBound: 0
        }],
        Cooldown: 300
      }
    });
  }

  private async scaleIn(serviceName: string, scalableDimension: string): Promise<void> {
    const { scalableTargets } = await this.autoScaling.describeScalableTargets({
      ServiceNamespace: 'ecs', 
      ResourceIds: [`service/broadcast-cluster/${serviceName}`],
      ScalableDimension: scalableDimension
    });

    if (!scalableTargets || scalableTargets.length === 0) {
      throw new Error('No scalable targets found');
    }

    const current = scalableTargets[0];
    const newCapacity = Math.max(
      Math.ceil((current.DesiredCapacity || 1) / 2), // Halve capacity
      current.MinCapacity || 2 // Respect min capacity
    );

    await this.autoScaling.putScalingPolicy({
      PolicyName: 'broadcast-scale-in',
      ServiceNamespace: 'ecs',
      ResourceId: `service/broadcast-cluster/${serviceName}`,
      ScalableDimension: scalableDimension,
      PolicyType: 'StepScaling',
      StepScalingPolicyConfiguration: {
        AdjustmentType: 'ExactCapacity',
        StepAdjustments: [{
          ScalingAdjustment: newCapacity,
          MetricIntervalUpperBound: 0
        }],
        Cooldown: 600 // Longer cooldown for scale-in
      }
    });
  }

  // Custom CloudWatch metrics for broadcast-specific monitoring
  async publishCustomMetrics(metrics: ScalingMetrics): Promise<void> {
    const metricData = [
      {
        MetricName: 'BroadcastConnections',
        Value: metrics.currentConnections,
        Unit: 'Count',
        Dimensions: [{
          Name: 'Service',
          Value: 'broadcast-system'
        }]
      },
      {
        MetricName: 'BroadcastQueueSize',
        Value: metrics.queueSize,
        Unit: 'Count',
        Dimensions: [{
          Name: 'Service', 
          Value: 'broadcast-system'
        }]
      },
      {
        MetricName: 'BroadcastLatency',
        Value: metrics.processingLatency,
        Unit: 'Milliseconds',
        Dimensions: [{
          Name: 'Service',
          Value: 'broadcast-system'  
        }]
      },
      {
        MetricName: 'BroadcastErrorRate',
        Value: metrics.errorRate * 100,
        Unit: 'Percent',
        Dimensions: [{
          Name: 'Service',
          Value: 'broadcast-system'
        }]
      }
    ];

    await this.cloudWatch.putMetricData({
      Namespace: 'WedSync/Broadcast',
      MetricData: metricData
    });
  }

  // Predictive scaling for known wedding events
  async schedulePredictiveScaling(weddingId: string, weddingDate: Date): Promise<void> {
    try {
      // Get wedding size to estimate load
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select('guest_count, team_members')
        .eq('id', weddingId)
        .single();

      if (!wedding) return;

      // Estimate load: team members * activity factor + guest notifications
      const estimatedConnections = (wedding.team_members || 5) * 10 + (wedding.guest_count || 0) * 0.1;
      
      // Schedule scale-out 2 hours before wedding
      const scaleOutTime = new Date(weddingDate.getTime() - 2 * 60 * 60 * 1000);
      
      // Schedule scale-in 6 hours after wedding  
      const scaleInTime = new Date(weddingDate.getTime() + 6 * 60 * 60 * 1000);

      console.info(`Scheduled predictive scaling for wedding ${weddingId}:`, {
        estimatedConnections,
        scaleOutTime,
        scaleInTime
      });

      // Implementation would use AWS EventBridge or similar for scheduling
      
    } catch (error) {
      console.error(`Predictive scaling failed for wedding ${weddingId}:`, error);
    }
  }
}
```

## Evidence-Based Completion Requirements

### 1. Performance Architecture Files
Team D must provide evidence of created files:

```bash
# Performance architecture files
ls -la wedsync/src/lib/broadcast/performance/
# Expected: broadcast-queue-manager.ts, broadcast-cache-manager.ts, auto-scaler.ts

# Performance monitoring
ls -la wedsync/src/lib/broadcast/monitoring/
# Expected: metrics-collector.ts, performance-dashboard.ts

# Load testing scripts
ls -la wedsync/scripts/performance/
# Expected: broadcast-load-test.ts, wedding-season-simulation.ts
```

### 2. Performance Benchmarks
```bash
# Queue processing performance test
npm run perf:queue-manager -- --target-throughput=1000

# Cache performance validation  
npm run perf:cache-hit-rate -- --target-rate=0.95

# Auto-scaling simulation
npm run perf:auto-scaling -- --traffic-spike=3x

# Wedding season load simulation
npm run perf:wedding-season -- --concurrent-weddings=100
```

### 3. Scalability Validation
```bash
# Test 10,000 concurrent connections
npm run scale:connection-test -- --connections=10000

# Measure sub-100ms processing
npm run scale:latency-test -- --max-latency=100

# Validate 99.9% uptime capability
npm run scale:availability-test -- --duration=24h
```

### 4. Redis Cluster Performance
```bash
# Test Redis cluster failover
npm run test:redis-failover

# Validate queue persistence
npm run test:queue-persistence

# Measure cache hit rates
npm run test:cache-performance
```

## Wedding Season Optimization Features

### Peak Traffic Handling
- **June traffic spike**: 3x capacity auto-scaling
- **Weekend concentration**: 80% traffic on Fri-Sun optimization
- **Time zone distribution**: Multi-region processing coordination
- **Emergency broadcast priority**: <5 second delivery guarantee

### Performance Monitoring
- Real-time throughput tracking
- Cache hit rate optimization
- Auto-scaling decision logging
- Wedding-specific performance metrics

### Predictive Scaling
- Wedding date-based capacity planning
- Guest count impact estimation
- Vendor team size optimization
- Multi-wedding coordination

## Completion Checklist

- [ ] High-performance broadcast queue with Redis cluster implemented
- [ ] Intelligent caching strategy with LRU and Redis layers created
- [ ] Auto-scaling configuration for wedding season traffic built
- [ ] Performance monitoring and metrics collection system completed
- [ ] Load balancing optimization for concurrent connections implemented
- [ ] Wedding season predictive scaling logic finished
- [ ] Memory pressure monitoring and optimization created
- [ ] Cache invalidation strategies for real-time updates implemented
- [ ] Performance benchmarks and load testing scripts created
- [ ] Auto-scaling cooldown and threshold optimization completed
- [ ] Multi-region deployment architecture documented
- [ ] Failover and disaster recovery procedures implemented
- [ ] Performance dashboard and alerting system created
- [ ] Wedding industry specific optimizations validated
- [ ] File existence verification completed
- [ ] Performance benchmarks achieved (10K connections, <100ms processing)
- [ ] Scalability validation passed (99.9% uptime capability)
- [ ] Redis cluster performance verified

**Estimated Completion**: End of Sprint 21
**Success Criteria**: Broadcast system capable of handling 10,000+ concurrent connections with sub-100ms processing latency, 99.9% uptime during wedding events, and intelligent auto-scaling for 3x traffic spikes during peak wedding season.

**Next Steps**: Upon completion of WS-205 Team D performance optimization, the broadcast system will have enterprise-grade scalability supporting wedding industry peak loads with exceptional performance characteristics.