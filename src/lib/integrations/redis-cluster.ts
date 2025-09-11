/**
 * Redis Cluster Manager for Distributed Rate Limiting
 * Extends existing Redis infrastructure for edge location replication
 * Team C - WS-199 Implementation
 */

import Redis from 'ioredis';
import { redisManager, RedisRateLimitOperations } from '@/lib/redis';
import { logger } from '@/lib/monitoring/structured-logger';

export interface ClusterStatus {
  connected: boolean;
  activeRegions: string[];
  failedRegions: string[];
  replicationHealth: 'healthy' | 'degraded' | 'failed';
  lastHealthCheck: number;
}

export interface IncrementResult {
  currentValue: number;
  edgeLocations: string[];
  replicationStatus: 'success' | 'partial' | 'failed';
  primaryResult: { current: number; remaining: number; allowed: boolean };
  inconsistencies?: { region: string; variance: number }[];
}

export interface SyncResult {
  syncedKeys: number;
  conflictsResolved: number;
  errors: { region: string; error: string }[];
  syncTimeMs: number;
}

export interface FailoverResult {
  newPrimary: string;
  failedNodes: string[];
  recoveredData: boolean;
  clientsRedirected: number;
}

/**
 * Redis Cluster Manager for Wedding Platform
 * Handles distributed rate limiting across multiple edge locations
 */
export class RedisClusterManager extends RedisRateLimitOperations {
  private clusters: Map<string, Redis> = new Map();
  private primaryCluster: Redis | null = null;
  private isHealthy: boolean = true;
  private lastHealthCheck: number = 0;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  // Edge location configurations for global wedding supplier platform
  private readonly CLUSTER_ENDPOINTS = {
    primary: process.env.UPSTASH_REDIS_PRIMARY_URL!,
    edge: {
      'us-east-1': process.env.UPSTASH_REDIS_US_EAST_URL!, // North American suppliers
      'us-west-1': process.env.UPSTASH_REDIS_US_WEST_URL!, // West Coast suppliers
      'eu-west-1': process.env.UPSTASH_REDIS_EU_WEST_URL!, // European suppliers
      'ap-southeast-1': process.env.UPSTASH_REDIS_AP_SOUTHEAST_URL!, // Australian suppliers
    },
  };

  // Replication settings optimized for wedding industry traffic patterns
  private readonly REPLICATION_CONFIG = {
    maxReplicationDelayMs: 500, // 500ms max delay for wedding coordination
    conflictResolutionStrategy: 'latest_wins' as const,
    consistencyLevel: 'eventual' as const,
    weddingSeasonReplicationFactor: 2, // Double replication during peak season
  };

  constructor() {
    super();
    this.initializeClusterEndpoints().catch((error) => {
      logger.error('Failed to initialize Redis cluster', error);
      this.isHealthy = false;
    });
  }

  /**
   * Initialize Redis connections to all edge locations
   */
  private async initializeClusterEndpoints(): Promise<void> {
    const initPromises: Array<Promise<void>> = [];

    // Initialize primary cluster
    if (this.CLUSTER_ENDPOINTS.primary) {
      initPromises.push(this.initializePrimaryCluster());
    }

    // Initialize edge location clusters
    for (const [region, url] of Object.entries(this.CLUSTER_ENDPOINTS.edge)) {
      if (url) {
        initPromises.push(this.initializeEdgeCluster(region, url));
      }
    }

    const results = await Promise.allSettled(initPromises);
    const failures = results.filter((result) => result.status === 'rejected');

    if (failures.length > 0) {
      logger.warn(`Failed to initialize ${failures.length} Redis clusters`, {
        totalClusters: results.length,
        failures: failures.length,
      });
    }

    logger.info('Redis cluster initialization complete', {
      activeRegions: Array.from(this.clusters.keys()),
      primaryActive: !!this.primaryCluster,
      healthStatus: this.isHealthy ? 'healthy' : 'degraded',
    });

    // Start periodic health checks
    this.startHealthCheckSchedule();
  }

  /**
   * Initialize primary Redis cluster
   */
  private async initializePrimaryCluster(): Promise<void> {
    try {
      const redisConfig = {
        connectTimeout: 5000,
        commandTimeout: 3000,
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        keepAlive: 30000,
        family: 4,
      };

      this.primaryCluster = new Redis(
        this.CLUSTER_ENDPOINTS.primary,
        redisConfig,
      );
      this.clusters.set('primary', this.primaryCluster);

      // Add connection event handlers
      this.primaryCluster.on('connect', () => {
        logger.info('Primary Redis cluster connected');
      });

      this.primaryCluster.on('error', (error) => {
        logger.error('Primary Redis cluster error', error);
        this.handleClusterFailure('primary', error);
      });

      await this.primaryCluster.ping();
      logger.info('Primary Redis cluster initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize primary Redis cluster', error);
      throw error;
    }
  }

  /**
   * Initialize edge location Redis cluster
   */
  private async initializeEdgeCluster(
    region: string,
    url: string,
  ): Promise<void> {
    try {
      const edgeRedis = new Redis(url, {
        connectTimeout: 10000, // Edge locations may have higher latency
        commandTimeout: 5000,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 200,
        enableOfflineQueue: false,
        keepAlive: 30000,
        family: 4,
      });

      this.clusters.set(region, edgeRedis);

      edgeRedis.on('connect', () => {
        logger.info(`Edge Redis cluster connected: ${region}`);
      });

      edgeRedis.on('error', (error) => {
        logger.error(`Edge Redis cluster error: ${region}`, error);
        this.handleClusterFailure(region, error);
      });

      await edgeRedis.ping();
      logger.info(`Edge Redis cluster initialized: ${region}`);
    } catch (error) {
      logger.warn(`Failed to initialize edge Redis cluster: ${region}`, error);
      // Don't throw - edge failures shouldn't block primary operations
    }
  }

  /**
   * Distributed increment with conflict resolution
   * Optimized for wedding industry rate limiting patterns
   */
  async distributedIncrement(
    bucketKey: string,
    windowMs: number,
    limit: number,
    edgeLocation?: string,
  ): Promise<IncrementResult> {
    const startTime = Date.now();

    try {
      // Primary increment (authoritative)
      const primaryResult = await this.checkSlidingWindow(
        bucketKey,
        windowMs,
        limit,
      );

      if (!primaryResult.allowed) {
        // Don't replicate if request is already denied
        return {
          currentValue: primaryResult.current,
          edgeLocations: [],
          replicationStatus: 'success',
          primaryResult,
        };
      }

      // Replicate to edge locations asynchronously for performance
      const replicationPromise = this.replicateToEdgeLocations(
        bucketKey,
        windowMs,
        primaryResult.current,
        edgeLocation,
      );

      // Don't await replication to avoid blocking the primary request
      replicationPromise.catch((error) => {
        logger.error('Edge replication failed', error, { bucketKey });
      });

      return {
        currentValue: primaryResult.current,
        edgeLocations: Array.from(this.clusters.keys()).filter(
          (k) => k !== 'primary',
        ),
        replicationStatus: 'success',
        primaryResult,
      };
    } catch (error) {
      logger.error('Distributed increment failed', error, { bucketKey });

      // Fallback to local Redis or fail-open strategy
      return this.getFallbackResult(bucketKey, windowMs, limit);
    }
  }

  /**
   * Replicate rate limit data to edge locations
   */
  private async replicateToEdgeLocations(
    bucketKey: string,
    windowMs: number,
    currentValue: number,
    preferredEdge?: string,
  ): Promise<void> {
    const replicationPromises: Array<Promise<void>> = [];

    // Determine replication factor based on wedding season
    const replicationFactor = this.getReplicationFactor();

    const edgeClusters = Array.from(this.clusters.entries()).filter(
      ([region]) => region !== 'primary',
    );

    // Prioritize preferred edge location (geographically closest)
    if (preferredEdge && this.clusters.has(preferredEdge)) {
      replicationPromises.push(
        this.replicateToCluster(
          preferredEdge,
          bucketKey,
          windowMs,
          currentValue,
        ),
      );
    }

    // Replicate to other edge locations based on replication factor
    const otherEdges = edgeClusters
      .filter(([region]) => region !== preferredEdge)
      .slice(0, replicationFactor - 1);

    for (const [region] of otherEdges) {
      replicationPromises.push(
        this.replicateToCluster(region, bucketKey, windowMs, currentValue),
      );
    }

    // Execute replications with timeout
    const timeout = this.REPLICATION_CONFIG.maxReplicationDelayMs;
    await Promise.race([
      Promise.allSettled(replicationPromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Replication timeout')), timeout),
      ),
    ]);
  }

  /**
   * Replicate to specific cluster with conflict resolution
   */
  private async replicateToCluster(
    region: string,
    bucketKey: string,
    windowMs: number,
    currentValue: number,
  ): Promise<void> {
    const cluster = this.clusters.get(region);
    if (!cluster) {
      throw new Error(`Cluster not found: ${region}`);
    }

    try {
      // Use Lua script for atomic replication with conflict resolution
      const replicationScript = `
        local key = KEYS[1]
        local window = tonumber(ARGV[1])
        local expected_value = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        -- Remove expired entries
        redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
        
        -- Get current count
        local current = redis.call('ZCARD', key)
        
        -- Conflict resolution: use latest value if current is lower
        if current < expected_value then
          -- Pad with synthetic entries to match expected value
          for i = current + 1, expected_value do
            redis.call('ZADD', key, now - (expected_value - i) * 100, 'sync:' .. i)
          end
          redis.call('EXPIRE', key, math.ceil(window / 1000))
          return expected_value
        end
        
        return current
      `;

      await cluster.eval(
        replicationScript,
        1,
        bucketKey,
        windowMs.toString(),
        currentValue.toString(),
        Date.now().toString(),
      );
    } catch (error) {
      logger.warn(`Replication to ${region} failed`, error, { bucketKey });
      throw error;
    }
  }

  /**
   * Handle Redis cluster node failures
   */
  async handleNodeFailure(failedRegion: string): Promise<FailoverResult> {
    logger.error(`Redis cluster node failure detected: ${failedRegion}`);

    const failedCluster = this.clusters.get(failedRegion);
    if (failedCluster) {
      try {
        await failedCluster.disconnect();
      } catch (error) {
        logger.warn(
          `Error disconnecting failed cluster: ${failedRegion}`,
          error,
        );
      }
      this.clusters.delete(failedRegion);
    }

    // If primary failed, promote an edge location
    if (failedRegion === 'primary') {
      return await this.promoteEdgeLocationToPrimary();
    }

    return {
      newPrimary: 'primary', // Primary unchanged
      failedNodes: [failedRegion],
      recoveredData: false,
      clientsRedirected: 0,
    };
  }

  /**
   * Promote an edge location to primary when primary fails
   */
  private async promoteEdgeLocationToPrimary(): Promise<FailoverResult> {
    const availableRegions = Array.from(this.clusters.keys()).filter(
      (region) => region !== 'primary',
    );

    if (availableRegions.length === 0) {
      throw new Error('No available edge locations for failover');
    }

    // Choose the healthiest edge location as new primary
    const newPrimaryRegion =
      await this.selectHealthiestEdgeLocation(availableRegions);
    const newPrimary = this.clusters.get(newPrimaryRegion);

    if (!newPrimary) {
      throw new Error(
        `Failed to get cluster for new primary: ${newPrimaryRegion}`,
      );
    }

    this.primaryCluster = newPrimary;
    this.clusters.set('primary', newPrimary);

    logger.info(`Promoted ${newPrimaryRegion} to primary Redis cluster`);

    return {
      newPrimary: newPrimaryRegion,
      failedNodes: ['primary'],
      recoveredData: true,
      clientsRedirected: 1, // Simplified metric
    };
  }

  /**
   * Select the healthiest edge location for failover
   */
  private async selectHealthiestEdgeLocation(
    regions: string[],
  ): Promise<string> {
    const healthChecks = await Promise.allSettled(
      regions.map(async (region) => {
        const cluster = this.clusters.get(region);
        if (!cluster) throw new Error(`Cluster not found: ${region}`);

        const start = Date.now();
        await cluster.ping();
        const latency = Date.now() - start;

        return { region, latency };
      }),
    );

    const healthyRegions = healthChecks
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<{
          region: string;
          latency: number;
        }> => result.status === 'fulfilled',
      )
      .map((result) => result.value)
      .sort((a, b) => a.latency - b.latency);

    if (healthyRegions.length === 0) {
      throw new Error('No healthy edge locations available for failover');
    }

    return healthyRegions[0].region;
  }

  /**
   * Synchronize rate limit buckets across all clusters
   */
  async syncRateLimitBuckets(): Promise<SyncResult> {
    const startTime = Date.now();
    const syncResults: SyncResult = {
      syncedKeys: 0,
      conflictsResolved: 0,
      errors: [],
      syncTimeMs: 0,
    };

    try {
      // Get all rate limit keys from primary
      const primaryKeys = await this.getPrimaryRateLimitKeys();

      for (const key of primaryKeys) {
        try {
          await this.syncSingleKey(key);
          syncResults.syncedKeys++;
        } catch (error) {
          syncResults.errors.push({
            region: 'sync',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      syncResults.syncTimeMs = Date.now() - startTime;

      logger.info('Rate limit bucket synchronization complete', syncResults);
      return syncResults;
    } catch (error) {
      logger.error('Rate limit bucket synchronization failed', error);
      syncResults.errors.push({
        region: 'primary',
        error: error instanceof Error ? error.message : String(error),
      });
      syncResults.syncTimeMs = Date.now() - startTime;
      return syncResults;
    }
  }

  /**
   * Get all rate limit keys from primary cluster
   */
  private async getPrimaryRateLimitKeys(): Promise<string[]> {
    if (!this.primaryCluster) {
      throw new Error('Primary cluster not available');
    }

    // Scan for rate limit keys efficiently
    const keys: string[] = [];
    const stream = this.primaryCluster.scanStream({
      match: 'ratelimit:*',
      count: 100,
    });

    stream.on('data', (resultKeys) => {
      keys.push(...resultKeys);
    });

    return new Promise((resolve, reject) => {
      stream.on('end', () => resolve(keys));
      stream.on('error', reject);
    });
  }

  /**
   * Synchronize a single rate limit key across all clusters
   */
  private async syncSingleKey(key: string): Promise<void> {
    if (!this.primaryCluster) return;

    // Get data from primary
    const primaryData = await this.primaryCluster.zrange(
      key,
      0,
      -1,
      'WITHSCORES',
    );
    const expiry = await this.primaryCluster.ttl(key);

    // Replicate to all edge locations
    const replicationPromises = Array.from(this.clusters.entries())
      .filter(([region]) => region !== 'primary')
      .map(([region, cluster]) =>
        this.syncKeyToCluster(cluster, key, primaryData, expiry),
      );

    await Promise.allSettled(replicationPromises);
  }

  /**
   * Sync key data to specific cluster
   */
  private async syncKeyToCluster(
    cluster: Redis,
    key: string,
    data: string[],
    expiry: number,
  ): Promise<void> {
    if (data.length === 0) return;

    const pipeline = cluster.pipeline();

    // Clear existing data
    pipeline.del(key);

    // Add all entries
    for (let i = 0; i < data.length; i += 2) {
      const member = data[i];
      const score = data[i + 1];
      pipeline.zadd(key, score, member);
    }

    // Set expiry if exists
    if (expiry > 0) {
      pipeline.expire(key, expiry);
    }

    await pipeline.exec();
  }

  /**
   * Get cluster status for monitoring
   */
  async getClusterStatus(): Promise<ClusterStatus> {
    const regions = Array.from(this.clusters.keys());
    const healthChecks = await Promise.allSettled(
      regions.map(async (region) => {
        const cluster = this.clusters.get(region);
        if (!cluster) throw new Error(`Cluster not found: ${region}`);
        await cluster.ping();
        return region;
      }),
    );

    const activeRegions = healthChecks
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<string>).value);

    const failedRegions = healthChecks
      .filter((result) => result.status === 'rejected')
      .map((_, index) => regions[index]);

    const replicationHealth: ClusterStatus['replicationHealth'] =
      failedRegions.length === 0
        ? 'healthy'
        : failedRegions.length < regions.length / 2
          ? 'degraded'
          : 'failed';

    return {
      connected: this.primaryCluster !== null,
      activeRegions,
      failedRegions,
      replicationHealth,
      lastHealthCheck: Date.now(),
    };
  }

  /**
   * Start periodic health checks for all clusters
   */
  private startHealthCheckSchedule(): void {
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Periodic health check failed', error);
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health check on all clusters
   */
  private async performHealthCheck(): Promise<void> {
    const status = await this.getClusterStatus();
    this.lastHealthCheck = Date.now();

    if (status.failedRegions.length > 0) {
      logger.warn('Redis cluster health check detected failures', {
        failedRegions: status.failedRegions,
        replicationHealth: status.replicationHealth,
      });

      // Attempt to reconnect failed regions
      for (const region of status.failedRegions) {
        try {
          await this.reconnectCluster(region);
        } catch (error) {
          logger.error(`Failed to reconnect cluster: ${region}`, error);
        }
      }
    }
  }

  /**
   * Reconnect a failed cluster
   */
  private async reconnectCluster(region: string): Promise<void> {
    if (region === 'primary') {
      await this.initializePrimaryCluster();
    } else {
      const url =
        this.CLUSTER_ENDPOINTS.edge[
          region as keyof typeof this.CLUSTER_ENDPOINTS.edge
        ];
      if (url) {
        await this.initializeEdgeCluster(region, url);
      }
    }
  }

  /**
   * Handle cluster failures with graceful degradation
   */
  private handleClusterFailure(region: string, error: Error): void {
    logger.error(`Redis cluster failure: ${region}`, error);

    // Remove failed cluster
    this.clusters.delete(region);

    // If too many clusters fail, trigger circuit breaker
    if (this.clusters.size < 2) {
      this.isHealthy = false;
      logger.error('Redis cluster system degraded - too few active clusters');
    }
  }

  /**
   * Get replication factor based on current conditions
   */
  private getReplicationFactor(): number {
    // Increase replication during wedding season (May-September)
    const currentMonth = new Date().getMonth() + 1;
    const isPeakSeason = currentMonth >= 5 && currentMonth <= 9;

    return isPeakSeason
      ? this.REPLICATION_CONFIG.weddingSeasonReplicationFactor
      : 1;
  }

  /**
   * Get fallback result when distributed operations fail
   */
  private getFallbackResult(
    bucketKey: string,
    windowMs: number,
    limit: number,
  ): IncrementResult {
    logger.warn('Using fallback rate limiting due to Redis cluster failure', {
      bucketKey,
    });

    return {
      currentValue: 1,
      edgeLocations: [],
      replicationStatus: 'failed',
      primaryResult: {
        current: 1,
        remaining: limit - 1,
        allowed: true,
      },
    };
  }

  /**
   * Get active edge locations for request routing
   */
  getActiveEdgeLocations(): string[] {
    return Array.from(this.clusters.keys()).filter(
      (region) => region !== 'primary',
    );
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    const disconnectPromises = Array.from(this.clusters.values()).map(
      (cluster) =>
        cluster
          .disconnect()
          .catch((error) =>
            logger.warn('Error disconnecting Redis cluster', error),
          ),
    );

    await Promise.allSettled(disconnectPromises);
    this.clusters.clear();
    this.primaryCluster = null;

    logger.info('Redis cluster manager destroyed');
  }
}

// Export singleton instance for use throughout the application
export const redisClusterManager = new RedisClusterManager();

// Wedding-specific helper functions
export function getOptimalEdgeLocation(
  supplierLocation?: string,
): string | undefined {
  // Map supplier locations to optimal edge locations for wedding coordination
  const locationMap: Record<string, string> = {
    US: 'us-east-1',
    US_WEST: 'us-west-1',
    CA: 'us-west-1',
    UK: 'eu-west-1',
    EU: 'eu-west-1',
    AU: 'ap-southeast-1',
    NZ: 'ap-southeast-1',
  };

  return supplierLocation ? locationMap[supplierLocation] : 'us-east-1';
}

export function isWeddingPeakSeason(): boolean {
  const currentMonth = new Date().getMonth() + 1;
  return currentMonth >= 5 && currentMonth <= 9;
}
