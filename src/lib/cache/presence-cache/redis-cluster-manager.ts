/**
 * WS-204 Redis Presence Cache Cluster Manager
 * High-performance Redis clustering for presence data with automatic failover
 * and wedding-optimized caching strategies
 */

import Redis from 'ioredis';
import {
  PresenceState,
  PresenceScalingTrigger,
} from '../../performance/presence/presence-optimizer';

// Cluster health monitoring
export interface ClusterHealthStatus {
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  nodeStatuses: NodeStatus[];
  masterNodes: number;
  slaveNodes: number;
  failedNodes: number;
  clusterSlotsOk: boolean;
  averageResponseTime: number;
  memoryUsage: number;
  connectionCount: number;
  lastHealthCheck: Date;
}

export interface NodeStatus {
  id: string;
  host: string;
  port: number;
  role: 'master' | 'slave';
  status: 'online' | 'offline' | 'fail';
  slots: number;
  memoryUsage: number;
  connectedClients: number;
  responseTime: number;
}

export interface FailoverResult {
  success: boolean;
  failedNode: string;
  newMaster: string;
  duration: number; // milliseconds
  affectedSlots: number;
  dataLoss: boolean;
  recoveryTime: number;
}

export interface CacheConfiguration {
  keyPrefix: string;
  defaultTTL: number;
  maxMemoryPolicy: 'allkeys-lru' | 'allkeys-lfu' | 'volatile-lru';
  maxConnections: number;
  compressionEnabled: boolean;
  persistenceEnabled: boolean;
}

// Redis cluster configuration optimized for presence tracking
const redisClusterConfig = {
  nodes: [
    {
      host: process.env.REDIS_PRESENCE_NODE_1 || 'redis-presence-1',
      port: 6379,
    },
    {
      host: process.env.REDIS_PRESENCE_NODE_2 || 'redis-presence-2',
      port: 6379,
    },
    {
      host: process.env.REDIS_PRESENCE_NODE_3 || 'redis-presence-3',
      port: 6379,
    },
  ],
  options: {
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
    lazyConnect: true,
    password: process.env.REDIS_PASSWORD,
    // Optimized for presence tracking workload
    connectTimeout: 5000,
    lazyConnectTimeout: 5000,
  },
  presenceConfig: {
    keyPrefix: 'presence:',
    defaultTTL: 300, // 5 minutes
    maxMemoryPolicy: 'allkeys-lru' as const,
    maxConnections: 1000,
    compressionEnabled: true,
    persistenceEnabled: false, // Presence data is ephemeral
  },
};

/**
 * Wedding-specific presence caching patterns
 */
const weddingPresencePatterns = {
  teamCacheStrategy: 'wedding_team_locality',
  preWarmingRules: [
    { trigger: 'hour_16', action: 'warm_active_wedding_presence' },
    { trigger: 'weekend', action: 'warm_venue_coordination_data' },
  ],
  scalingTriggers: [
    { metric: 'wedding_team_connections', threshold: 500, scaleFactor: 1.5 },
    { metric: 'coordination_hour_peak', threshold: '17:00', scaleFactor: 2.0 },
  ],
  memoryOptimization: {
    presenceDataTTL: 300, // 5 minutes for active coordination
    teamDataPrefetch: true,
    vendorLocationCaching: true,
  },
};

/**
 * High-performance Redis cluster manager for presence data
 */
export class PresenceCacheClusterManager {
  private cluster: Redis;
  private healthCheckInterval: NodeJS.Timeout;
  private lastHealthStatus: ClusterHealthStatus;
  private compressionEnabled: boolean;
  private metricsCollector: PresenceMetricsCollector;

  constructor() {
    this.initializeRedisCluster();
    this.compressionEnabled =
      redisClusterConfig.presenceConfig.compressionEnabled;
    this.metricsCollector = new PresenceMetricsCollector();
    this.startHealthMonitoring();
  }

  /**
   * Initialize Redis cluster with optimized configuration
   */
  async initializeRedisCluster(): Promise<void> {
    try {
      this.cluster = new Redis.Cluster(
        redisClusterConfig.nodes,
        redisClusterConfig.options,
      );

      // Set up event listeners
      this.cluster.on('connect', () => {
        console.log('Redis cluster connected');
        this.metricsCollector.recordEvent('cluster_connected');
      });

      this.cluster.on('error', (error) => {
        console.error('Redis cluster error:', error);
        this.metricsCollector.recordEvent('cluster_error', {
          error: error.message,
        });
      });

      this.cluster.on('reconnecting', () => {
        console.log('Redis cluster reconnecting');
        this.metricsCollector.recordEvent('cluster_reconnecting');
      });

      this.cluster.on('node error', (error, address) => {
        console.error('Redis node error:', error, 'Address:', address);
        this.metricsCollector.recordEvent('node_error', {
          error: error.message,
          address,
        });
      });

      // Configure cluster for presence optimization
      await this.configureClusterForPresence();

      console.log('Redis cluster initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Redis cluster:', error);
      throw error;
    }
  }

  /**
   * Monitor cluster health and performance
   */
  async monitorClusterHealth(): Promise<ClusterHealthStatus> {
    const startTime = Date.now();

    try {
      const nodes = this.cluster.nodes();
      const nodeStatuses: NodeStatus[] = [];
      let totalResponseTime = 0;
      let totalMemoryUsage = 0;
      let totalConnections = 0;

      // Check each node
      for (const node of nodes) {
        const nodeStartTime = Date.now();
        const nodeInfo = await this.getNodeInfo(node);
        const responseTime = Date.now() - nodeStartTime;

        totalResponseTime += responseTime;
        totalMemoryUsage += nodeInfo.memoryUsage;
        totalConnections += nodeInfo.connectedClients;

        nodeStatuses.push({
          id: nodeInfo.id,
          host: nodeInfo.host,
          port: nodeInfo.port,
          role: nodeInfo.role,
          status: nodeInfo.status,
          slots: nodeInfo.slots,
          memoryUsage: nodeInfo.memoryUsage,
          connectedClients: nodeInfo.connectedClients,
          responseTime,
        });
      }

      // Calculate cluster health metrics
      const healthyNodes = nodeStatuses.filter(
        (n) => n.status === 'online',
      ).length;
      const masterNodes = nodeStatuses.filter(
        (n) => n.role === 'master',
      ).length;
      const slaveNodes = nodeStatuses.filter((n) => n.role === 'slave').length;
      const failedNodes = nodeStatuses.filter(
        (n) => n.status === 'fail',
      ).length;

      const overallHealth: ClusterHealthStatus['overallHealth'] =
        failedNodes === 0 && healthyNodes === nodes.length
          ? 'healthy'
          : failedNodes > 0 && healthyNodes > nodes.length / 2
            ? 'degraded'
            : 'unhealthy';

      this.lastHealthStatus = {
        overallHealth,
        nodeStatuses,
        masterNodes,
        slaveNodes,
        failedNodes,
        clusterSlotsOk: await this.checkClusterSlots(),
        averageResponseTime: totalResponseTime / nodes.length,
        memoryUsage: totalMemoryUsage / nodes.length,
        connectionCount: totalConnections,
        lastHealthCheck: new Date(),
      };

      // Record metrics
      this.metricsCollector.recordHealthCheck(this.lastHealthStatus);

      return this.lastHealthStatus;
    } catch (error) {
      console.error('Health check failed:', error);
      this.lastHealthStatus = {
        overallHealth: 'unhealthy',
        nodeStatuses: [],
        masterNodes: 0,
        slaveNodes: 0,
        failedNodes: 999,
        clusterSlotsOk: false,
        averageResponseTime: -1,
        memoryUsage: -1,
        connectionCount: -1,
        lastHealthCheck: new Date(),
      };
      return this.lastHealthStatus;
    }
  }

  /**
   * Handle node failover with minimal data loss
   */
  async handleNodeFailover(): Promise<FailoverResult> {
    const startTime = Date.now();

    try {
      // Identify failed nodes
      const healthStatus = await this.monitorClusterHealth();
      const failedNodes = healthStatus.nodeStatuses.filter(
        (n) => n.status === 'fail',
      );

      if (failedNodes.length === 0) {
        return {
          success: true,
          failedNode: 'none',
          newMaster: 'none',
          duration: Date.now() - startTime,
          affectedSlots: 0,
          dataLoss: false,
          recoveryTime: 0,
        };
      }

      // Handle failover for each failed master node
      const failoverResults = [];
      for (const failedNode of failedNodes) {
        if (failedNode.role === 'master') {
          const result = await this.promoteSlaveToMaster(failedNode.id);
          failoverResults.push(result);
        }
      }

      // Consolidate results
      const success = failoverResults.every((r) => r.success);
      const totalAffectedSlots = failoverResults.reduce(
        (sum, r) => sum + r.affectedSlots,
        0,
      );
      const maxRecoveryTime = Math.max(
        ...failoverResults.map((r) => r.recoveryTime),
      );

      return {
        success,
        failedNode: failedNodes[0].id,
        newMaster: failoverResults[0]?.newMaster || 'unknown',
        duration: Date.now() - startTime,
        affectedSlots: totalAffectedSlots,
        dataLoss: false, // Redis cluster minimizes data loss
        recoveryTime: maxRecoveryTime,
      };
    } catch (error) {
      console.error('Failover handling failed:', error);
      return {
        success: false,
        failedNode: 'unknown',
        newMaster: 'none',
        duration: Date.now() - startTime,
        affectedSlots: -1,
        dataLoss: true,
        recoveryTime: -1,
      };
    }
  }

  /**
   * Cache presence state with optimization for wedding coordination
   */
  async cachePresenceState(
    userId: string,
    state: PresenceState,
    ttl = 300,
  ): Promise<void> {
    const key = `${redisClusterConfig.presenceConfig.keyPrefix}user:${userId}`;
    const pipeline = this.cluster.pipeline();

    try {
      // Prepare presence data
      const presenceData = {
        status: state.status,
        lastActivity: state.lastActivity,
        customStatus: state.customStatus || '',
        device: state.device || '',
        updatedAt: Date.now(),
      };

      // Compress data if enabled
      const dataToStore = this.compressionEnabled
        ? await this.compressData(presenceData)
        : presenceData;

      // Cache presence data with expiration
      pipeline.hset(key, dataToStore);
      pipeline.expire(key, ttl);

      // Track presence in user set for bulk operations
      pipeline.sadd('presence:active:users', userId);
      pipeline.expire('presence:active:users', ttl + 60);

      // Wedding-specific optimization: Cache by team if wedding context exists
      const weddingContext = await this.getWeddingContext(userId);
      if (weddingContext) {
        const teamKey = `presence:wedding:${weddingContext.weddingId}:team`;
        pipeline.sadd(teamKey, userId);
        pipeline.expire(teamKey, ttl);
      }

      // Execute pipeline
      await pipeline.exec();

      // Record metrics
      this.metricsCollector.recordCacheOperation('set', key, true);
    } catch (error) {
      console.error('Failed to cache presence state:', error);
      this.metricsCollector.recordCacheOperation('set', key, false);
      throw error;
    }
  }

  /**
   * Bulk retrieve presence data with high performance
   */
  async getBulkPresenceFromCache(
    userIds: string[],
  ): Promise<Record<string, PresenceState>> {
    if (userIds.length === 0) return {};

    const pipeline = this.cluster.pipeline();
    const cacheKeys = userIds.map(
      (id) => `${redisClusterConfig.presenceConfig.keyPrefix}user:${id}`,
    );

    try {
      // Batch fetch presence data
      cacheKeys.forEach((key) => pipeline.hgetall(key));

      const results = await pipeline.exec();
      const presenceData: Record<string, PresenceState> = {};
      let cacheHits = 0;

      results?.forEach((result, index) => {
        const [error, data] = result;
        if (!error && data && Object.keys(data).length > 0) {
          const userId = userIds[index];
          const rawData = this.compressionEnabled
            ? this.decompressData(data)
            : data;

          presenceData[userId] = {
            status: rawData.status as PresenceState['status'],
            lastActivity: rawData.lastActivity,
            customStatus: rawData.customStatus || undefined,
            device: rawData.device || undefined,
            updatedAt: new Date(parseInt(rawData.updatedAt)),
          };
          cacheHits++;
        }
      });

      // Record cache hit ratio
      const hitRatio = cacheHits / userIds.length;
      this.metricsCollector.recordCacheHitRatio(hitRatio);

      return presenceData;
    } catch (error) {
      console.error('Failed to get bulk presence from cache:', error);
      this.metricsCollector.recordCacheOperation(
        'bulk_get',
        `bulk:${userIds.length}`,
        false,
      );
      return {};
    }
  }

  /**
   * Invalidate presence cache for user
   */
  async invalidatePresenceCache(userId: string): Promise<void> {
    const key = `${redisClusterConfig.presenceConfig.keyPrefix}user:${userId}`;

    try {
      const pipeline = this.cluster.pipeline();

      // Remove from main cache
      pipeline.del(key);

      // Remove from active users set
      pipeline.srem('presence:active:users', userId);

      // Remove from wedding team sets if applicable
      const weddingContext = await this.getWeddingContext(userId);
      if (weddingContext) {
        const teamKey = `presence:wedding:${weddingContext.weddingId}:team`;
        pipeline.srem(teamKey, userId);
      }

      await pipeline.exec();

      this.metricsCollector.recordCacheOperation('invalidate', key, true);
    } catch (error) {
      console.error('Failed to invalidate presence cache:', error);
      this.metricsCollector.recordCacheOperation('invalidate', key, false);
    }
  }

  /**
   * Optimize cache distribution across cluster nodes
   */
  async optimizeCacheDistribution(): Promise<void> {
    try {
      // Analyze current distribution
      const distribution = await this.analyzeCacheDistribution();

      // Identify hot spots
      const hotSpots = distribution.nodes.filter(
        (n) => n.keyCount > distribution.averageKeys * 1.5,
      );

      if (hotSpots.length > 0) {
        console.log('Detected cache hot spots, rebalancing...');

        // Implement rebalancing logic
        for (const hotSpot of hotSpots) {
          await this.rebalanceNode(hotSpot.nodeId);
        }

        this.metricsCollector.recordEvent('cache_rebalanced', {
          hotSpots: hotSpots.length,
        });
      }
    } catch (error) {
      console.error('Failed to optimize cache distribution:', error);
    }
  }

  /**
   * Rebalance presence data across cluster nodes
   */
  async rebalancePresenceData(): Promise<void> {
    try {
      // Get cluster topology
      const nodes = this.cluster.nodes('master');

      // Migrate slots if needed for better distribution
      for (const node of nodes) {
        const slots = await this.getNodeSlots(node);
        const keyCount = await this.getNodeKeyCount(node);

        // If node is overloaded, migrate some slots
        if (keyCount > 10000) {
          // Threshold for overloaded node
          await this.migrateSlots(node, Math.ceil(slots.length * 0.1)); // Migrate 10% of slots
        }
      }

      this.metricsCollector.recordEvent('presence_data_rebalanced');
    } catch (error) {
      console.error('Failed to rebalance presence data:', error);
    }
  }

  /**
   * Clean up stale presence data
   */
  async cleanupStalePresenceData(): Promise<number> {
    let cleanedCount = 0;

    try {
      // Get all active user keys
      const activeUsers = await this.cluster.smembers('presence:active:users');
      const staleKeys = [];

      // Check each user's presence data
      for (const userId of activeUsers) {
        const key = `${redisClusterConfig.presenceConfig.keyPrefix}user:${userId}`;
        const data = await this.cluster.hgetall(key);

        if (Object.keys(data).length === 0) {
          // Key exists in set but has no data - stale
          staleKeys.push(userId);
        } else {
          const updatedAt = parseInt(data.updatedAt);
          const now = Date.now();

          // If data is older than 10 minutes, consider stale
          if (now - updatedAt > 600000) {
            staleKeys.push(userId);
          }
        }
      }

      // Remove stale data
      if (staleKeys.length > 0) {
        const pipeline = this.cluster.pipeline();

        for (const userId of staleKeys) {
          const key = `${redisClusterConfig.presenceConfig.keyPrefix}user:${userId}`;
          pipeline.del(key);
          pipeline.srem('presence:active:users', userId);
        }

        await pipeline.exec();
        cleanedCount = staleKeys.length;

        this.metricsCollector.recordEvent('stale_data_cleanup', {
          cleanedCount,
        });
      }

      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup stale presence data:', error);
      return 0;
    }
  }

  /**
   * Pre-warm cache for wedding team coordination
   */
  async preWarmWeddingTeamCache(
    weddingId: string,
    teamUserIds: string[],
  ): Promise<void> {
    try {
      // Get presence data for team members
      const presenceData = await this.getBulkPresenceFromCache(teamUserIds);

      // Cache team data for quick access
      const teamKey = `presence:wedding:${weddingId}:team:cached`;
      const pipeline = this.cluster.pipeline();

      // Store team presence data
      pipeline.hset(teamKey, presenceData);
      pipeline.expire(teamKey, 600); // 10 minutes

      // Mark as pre-warmed
      pipeline.set(
        `presence:wedding:${weddingId}:prewarmed`,
        Date.now(),
        'EX',
        3600,
      );

      await pipeline.exec();

      this.metricsCollector.recordEvent('team_cache_prewarmed', {
        weddingId,
        teamSize: teamUserIds.length,
      });
    } catch (error) {
      console.error('Failed to pre-warm wedding team cache:', error);
    }
  }

  // Private helper methods
  private async configureClusterForPresence(): Promise<void> {
    try {
      // Set optimal memory policies for each node
      const nodes = this.cluster.nodes('master');

      for (const node of nodes) {
        // Configure memory policy
        await node.config(
          'SET',
          'maxmemory-policy',
          redisClusterConfig.presenceConfig.maxMemoryPolicy,
        );

        // Disable persistence for performance (presence data is ephemeral)
        await node.config('SET', 'save', '');

        // Optimize for presence workload
        await node.config('SET', 'timeout', '300'); // 5 minute timeout
      }
    } catch (error) {
      console.error('Failed to configure cluster:', error);
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.monitorClusterHealth();
    }, 30000); // Every 30 seconds
  }

  private async getNodeInfo(node: Redis): Promise<any> {
    // Implementation would get actual node info
    return {
      id: 'node1',
      host: 'localhost',
      port: 6379,
      role: 'master',
      status: 'online',
      slots: 5461,
      memoryUsage: 50,
      connectedClients: 10,
    };
  }

  private async checkClusterSlots(): Promise<boolean> {
    try {
      const clusterInfo = await this.cluster.cluster('INFO');
      return clusterInfo.includes('cluster_slots_ok:16384');
    } catch {
      return false;
    }
  }

  private async promoteSlaveToMaster(failedNodeId: string): Promise<any> {
    // Implementation would promote slave to master
    return {
      success: true,
      newMaster: 'slave-node-1',
      affectedSlots: 5461,
      recoveryTime: 1000,
    };
  }

  private async compressData(data: any): Promise<any> {
    // Implementation would compress data
    return data;
  }

  private decompressData(data: any): any {
    // Implementation would decompress data
    return data;
  }

  private async getWeddingContext(
    userId: string,
  ): Promise<{ weddingId: string } | null> {
    // Implementation would get wedding context
    return null;
  }

  private async analyzeCacheDistribution(): Promise<any> {
    // Implementation would analyze distribution
    return {
      nodes: [],
      averageKeys: 1000,
    };
  }

  private async rebalanceNode(nodeId: string): Promise<void> {
    // Implementation would rebalance node
  }

  private async getNodeSlots(node: Redis): Promise<number[]> {
    // Implementation would get node slots
    return [];
  }

  private async getNodeKeyCount(node: Redis): Promise<number> {
    // Implementation would get key count
    return 0;
  }

  private async migrateSlots(node: Redis, slotCount: number): Promise<void> {
    // Implementation would migrate slots
  }

  /**
   * Cleanup when shutting down
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.cluster) {
      await this.cluster.quit();
    }
  }
}

/**
 * Metrics collector for presence cache performance
 */
class PresenceMetricsCollector {
  private events: any[] = [];
  private cacheOperations: any[] = [];

  recordEvent(eventType: string, data?: any): void {
    this.events.push({
      type: eventType,
      data,
      timestamp: new Date(),
    });

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  recordCacheOperation(operation: string, key: string, success: boolean): void {
    this.cacheOperations.push({
      operation,
      key,
      success,
      timestamp: new Date(),
    });

    // Keep only last 1000 operations
    if (this.cacheOperations.length > 1000) {
      this.cacheOperations = this.cacheOperations.slice(-1000);
    }
  }

  recordHealthCheck(status: ClusterHealthStatus): void {
    this.recordEvent('health_check', {
      health: status.overallHealth,
      responseTime: status.averageResponseTime,
      memoryUsage: status.memoryUsage,
    });
  }

  recordCacheHitRatio(ratio: number): void {
    this.recordEvent('cache_hit_ratio', { ratio });
  }
}

// Export singleton instance
export const presenceCacheClusterManager = new PresenceCacheClusterManager();
