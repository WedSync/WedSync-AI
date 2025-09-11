/**
 * Database Connection Pool Optimizer - WS-173 Backend Performance Optimization
 * Team B - Round 1 Implementation
 * Optimizes database connections for high-performance wedding management operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { metricsTracker } from '@/lib/performance/metrics-tracker';
import {
  CacheService,
  CACHE_PREFIXES,
  CACHE_TTL,
} from '@/lib/cache/redis-client';

export interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeout: number;
  createTimeout: number;
  destroyTimeout: number;
  idleTimeout: number;
  reapInterval: number;
  createRetryInterval: number;
  validateQuery?: string;
  maxUses?: number;
  testOnBorrow?: boolean;
  testOnReturn?: boolean;
  evictionRunInterval?: number;
}

export interface PoolStats {
  totalConnections: number;
  idleConnections: number;
  busyConnections: number;
  pendingAcquires: number;
  pendingCreates: number;
  acquiredConnections: number;
  releasedConnections: number;
  destroyedConnections: number;
  failedAcquires: number;
  timedOutAcquires: number;
  averageAcquireTime: number;
  averageCreateTime: number;
  pool: string;
}

export interface ConnectionMetrics {
  connectionId: string;
  createdAt: Date;
  lastUsed: Date;
  totalQueries: number;
  avgQueryTime: number;
  isHealthy: boolean;
  pool: string;
  database: string;
}

export class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool;
  private pools: Map<string, ConnectionPool> = new Map();
  private readonly defaultConfig: PoolConfig;

  // Production-optimized configuration
  private static readonly PRODUCTION_CONFIG: PoolConfig = {
    minConnections: 5,
    maxConnections: 20,
    acquireTimeout: 30000, // 30 seconds
    createTimeout: 30000,
    destroyTimeout: 5000,
    idleTimeout: 600000, // 10 minutes
    reapInterval: 60000, // 1 minute
    createRetryInterval: 1000,
    validateQuery: 'SELECT 1',
    maxUses: 10000, // Max queries per connection
    testOnBorrow: true,
    testOnReturn: false,
    evictionRunInterval: 300000, // 5 minutes
  };

  // Development configuration
  private static readonly DEVELOPMENT_CONFIG: PoolConfig = {
    minConnections: 2,
    maxConnections: 5,
    acquireTimeout: 10000,
    createTimeout: 10000,
    destroyTimeout: 3000,
    idleTimeout: 300000, // 5 minutes
    reapInterval: 30000, // 30 seconds
    createRetryInterval: 500,
    validateQuery: 'SELECT 1',
    maxUses: 1000,
    testOnBorrow: true,
    testOnReturn: false,
    evictionRunInterval: 60000, // 1 minute
  };

  static getInstance(): DatabaseConnectionPool {
    if (!DatabaseConnectionPool.instance) {
      DatabaseConnectionPool.instance = new DatabaseConnectionPool();
    }
    return DatabaseConnectionPool.instance;
  }

  constructor() {
    this.defaultConfig =
      process.env.NODE_ENV === 'production'
        ? DatabaseConnectionPool.PRODUCTION_CONFIG
        : DatabaseConnectionPool.DEVELOPMENT_CONFIG;

    // Start background maintenance
    this.startMaintenanceTasks();
  }

  /**
   * Get or create a connection pool for a specific database
   */
  getPool(
    poolName: string = 'default',
    config?: Partial<PoolConfig>,
  ): ConnectionPool {
    if (!this.pools.has(poolName)) {
      const poolConfig = { ...this.defaultConfig, ...config };
      this.pools.set(poolName, new ConnectionPool(poolName, poolConfig));
    }
    return this.pools.get(poolName)!;
  }

  /**
   * Get optimized client for specific operation type
   */
  async getOptimizedClient(
    operation: 'read' | 'write' | 'analytics' | 'bulk' = 'read',
    context: {
      organizationId?: string;
      priority?: 'high' | 'medium' | 'low';
      timeout?: number;
    } = {},
  ): Promise<{ client: SupabaseClient; release: () => Promise<void> }> {
    // Select pool based on operation type
    const poolName = this.selectPoolForOperation(operation);
    const pool = this.getPool(poolName);

    // Get connection with timeout and priority handling
    const connection = await pool.acquire(context.timeout, context.priority);

    return {
      client: connection.client,
      release: async () => {
        await pool.release(connection);
      },
    };
  }

  /**
   * Execute query with automatic connection management
   */
  async withConnection<T>(
    operation: 'read' | 'write' | 'analytics' | 'bulk',
    queryFn: (client: SupabaseClient) => Promise<T>,
    context: {
      organizationId?: string;
      priority?: 'high' | 'medium' | 'low';
      timeout?: number;
      retries?: number;
    } = {},
  ): Promise<T> {
    const retries = context.retries || 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const { client, release } = await this.getOptimizedClient(
        operation,
        context,
      );

      try {
        const startTime = Date.now();
        const result = await queryFn(client);
        const duration = Date.now() - startTime;

        // Track successful query
        await metricsTracker.trackDatabaseQuery(
          `${operation}_operation`,
          duration,
          0, // Rows would be tracked separately
          'pooled_connection',
        );

        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `Database operation failed (attempt ${attempt + 1}):`,
          error,
        );

        // Track failed query
        await metricsTracker.trackDatabaseQuery(
          `${operation}_operation_failed`,
          0,
          0,
          'pooled_connection',
        );

        if (attempt === retries) {
          throw error;
        }

        // Wait before retry with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000)),
        );
      } finally {
        await release();
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Get comprehensive pool statistics
   */
  async getPoolStatistics(): Promise<PoolStats[]> {
    const stats: PoolStats[] = [];

    await Promise.all(
      Array.from(this.pools.entries()).map(async ([poolName, pool]) => {
        const poolStats = await pool.getStatistics();
        stats.push(poolStats);
      }),
    );

    return stats;
  }

  /**
   * Health check for all pools
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    pools: Array<{
      name: string;
      healthy: boolean;
      totalConnections: number;
      issues: string[];
    }>;
  }> {
    const poolResults = [];
    let overallHealthy = true;

    await Promise.all(
      Array.from(this.pools.entries()).map(async ([poolName, pool]) => {
        const health = await pool.healthCheck();
        poolResults.push({
          name: poolName,
          ...health,
        });

        if (!health.healthy) {
          overallHealthy = false;
        }
      }),
    );

    return {
      healthy: overallHealthy,
      pools: poolResults,
    };
  }

  /**
   * Gracefully shutdown all pools
   */
  async shutdown(): Promise<void> {
    const shutdownPromises = Array.from(this.pools.values()).map((pool) =>
      pool.shutdown(),
    );
    await Promise.all(shutdownPromises);
    this.pools.clear();
  }

  // Private methods

  private selectPoolForOperation(
    operation: 'read' | 'write' | 'analytics' | 'bulk',
  ): string {
    // Route different operations to different pools for better performance
    switch (operation) {
      case 'analytics':
        return 'analytics'; // Separate pool for long-running analytics queries
      case 'bulk':
        return 'bulk'; // Separate pool for bulk operations
      case 'write':
        return 'write'; // Separate pool for writes (could be same as default)
      case 'read':
      default:
        return 'default'; // Main pool for regular reads
    }
  }

  private startMaintenanceTasks(): void {
    // Run maintenance every 5 minutes
    setInterval(async () => {
      try {
        await this.runMaintenance();
      } catch (error) {
        console.error('Pool maintenance failed:', error);
      }
    }, 300000); // 5 minutes
  }

  private async runMaintenance(): Promise<void> {
    await Promise.all(
      Array.from(this.pools.entries()).map(async ([poolName, pool]) => {
        try {
          await pool.runMaintenance();

          // Cache pool statistics
          const stats = await pool.getStatistics();
          const cacheKey = CacheService.buildKey(
            CACHE_PREFIXES.ANALYTICS,
            'pool_stats',
            poolName,
          );
          await CacheService.set(cacheKey, stats, CACHE_TTL.SHORT);
        } catch (error) {
          console.error(`Maintenance failed for pool ${poolName}:`, error);
        }
      }),
    );
  }
}

export class ConnectionPool {
  private connections: PooledConnection[] = [];
  private waitingQueue: QueuedRequest[] = [];
  private config: PoolConfig;
  private poolName: string;
  private stats: PoolStatistics;
  private maintenanceInterval?: NodeJS.Timeout;

  constructor(poolName: string, config: PoolConfig) {
    this.poolName = poolName;
    this.config = config;
    this.stats = new PoolStatistics();

    // Initialize minimum connections
    this.initializeMinConnections();

    // Start maintenance if configured
    if (config.evictionRunInterval) {
      this.startMaintenance();
    }
  }

  async acquire(
    timeout: number = this.config.acquireTimeout,
    priority: 'high' | 'medium' | 'low' = 'medium',
  ): Promise<PooledConnection> {
    const startTime = Date.now();

    try {
      // Try to get available connection first
      const availableConnection = this.findAvailableConnection();
      if (availableConnection) {
        await this.validateConnection(availableConnection);
        this.markConnectionAcquired(availableConnection);
        this.stats.recordAcquire(Date.now() - startTime);
        return availableConnection;
      }

      // Create new connection if under limit
      if (this.connections.length < this.config.maxConnections) {
        const newConnection = await this.createConnection();
        this.markConnectionAcquired(newConnection);
        this.stats.recordAcquire(Date.now() - startTime);
        return newConnection;
      }

      // Wait for available connection
      return await this.waitForConnection(timeout, priority, startTime);
    } catch (error) {
      this.stats.recordFailedAcquire();
      throw error;
    }
  }

  async release(connection: PooledConnection): Promise<void> {
    connection.isAcquired = false;
    connection.lastReleased = new Date();
    connection.totalAcquires++;

    // Check if connection should be destroyed
    if (this.shouldDestroyConnection(connection)) {
      await this.destroyConnection(connection);
    } else {
      // Process waiting queue
      this.processWaitingQueue();
    }

    this.stats.recordRelease();
  }

  async getStatistics(): Promise<PoolStats> {
    const busyConnections = this.connections.filter((c) => c.isAcquired).length;

    return {
      totalConnections: this.connections.length,
      idleConnections: this.connections.length - busyConnections,
      busyConnections,
      pendingAcquires: this.waitingQueue.length,
      pendingCreates: 0, // Would need to track connection creation promises
      acquiredConnections: this.stats.totalAcquired,
      releasedConnections: this.stats.totalReleased,
      destroyedConnections: this.stats.totalDestroyed,
      failedAcquires: this.stats.failedAcquires,
      timedOutAcquires: this.stats.timedOutAcquires,
      averageAcquireTime: this.stats.averageAcquireTime,
      averageCreateTime: this.stats.averageCreateTime,
      pool: this.poolName,
    };
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    totalConnections: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let healthy = true;

    // Check connection count
    if (this.connections.length < this.config.minConnections) {
      issues.push(
        `Below minimum connections: ${this.connections.length}/${this.config.minConnections}`,
      );
      healthy = false;
    }

    // Check for stuck connections
    const stuckConnections = this.connections.filter(
      (c) => c.isAcquired && Date.now() - c.lastAcquired!.getTime() > 300000, // 5 minutes
    );
    if (stuckConnections.length > 0) {
      issues.push(
        `${stuckConnections.length} connections stuck for >5 minutes`,
      );
      healthy = false;
    }

    // Check queue length
    if (this.waitingQueue.length > this.config.maxConnections) {
      issues.push(`Excessive queue length: ${this.waitingQueue.length}`);
      healthy = false;
    }

    return {
      healthy,
      totalConnections: this.connections.length,
      issues,
    };
  }

  async runMaintenance(): Promise<void> {
    // Remove idle connections
    await this.evictIdleConnections();

    // Validate existing connections
    await this.validateConnections();

    // Ensure minimum connections
    await this.ensureMinConnections();
  }

  async shutdown(): Promise<void> {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
    }

    // Destroy all connections
    const destroyPromises = this.connections.map((conn) =>
      this.destroyConnection(conn),
    );
    await Promise.all(destroyPromises);

    this.connections = [];
    this.waitingQueue = [];
  }

  // Private methods

  private async initializeMinConnections(): Promise<void> {
    const createPromises = [];
    for (let i = 0; i < this.config.minConnections; i++) {
      createPromises.push(this.createConnection());
    }

    try {
      const connections = await Promise.all(createPromises);
      this.connections.push(...connections);
    } catch (error) {
      console.error(
        `Failed to initialize minimum connections for pool ${this.poolName}:`,
        error,
      );
    }
  }

  private async createConnection(): Promise<PooledConnection> {
    const startTime = Date.now();

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      const client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        db: {
          schema: 'public',
        },
      });

      // Test connection
      const { error } = await client
        .from('organizations')
        .select('count', { count: 'exact', head: true });
      if (error) {
        throw new Error(`Connection test failed: ${error.message}`);
      }

      const connection: PooledConnection = {
        id: `${this.poolName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        client,
        createdAt: new Date(),
        lastUsed: new Date(),
        isAcquired: false,
        totalQueries: 0,
        totalAcquires: 0,
        isHealthy: true,
        pool: this.poolName,
      };

      this.stats.recordCreate(Date.now() - startTime);
      return connection;
    } catch (error) {
      // Log error properly with structured logging
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const logData = {
        poolName: this.poolName,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        connectionAttempt: true,
      };

      if (process.env.NODE_ENV === 'development') {
        console.error(
          `Failed to create connection for pool ${this.poolName}:`,
          logData,
        );
      }

      // Record failure in stats
      this.stats.recordFailedAcquire();

      throw new Error(`Database connection failed: ${errorMessage}`);
    }
  }

  private findAvailableConnection(): PooledConnection | null {
    return this.connections.find((c) => !c.isAcquired && c.isHealthy) || null;
  }

  private async validateConnection(
    connection: PooledConnection,
  ): Promise<void> {
    if (!this.config.testOnBorrow) return;

    try {
      const { error } = await connection.client
        .from('organizations')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        connection.isHealthy = false;
        throw new Error(`Connection validation failed: ${error.message}`);
      }

      connection.isHealthy = true;
    } catch (error) {
      connection.isHealthy = false;
      throw error;
    }
  }

  private markConnectionAcquired(connection: PooledConnection): void {
    connection.isAcquired = true;
    connection.lastAcquired = new Date();
    connection.lastUsed = new Date();
  }

  private async waitForConnection(
    timeout: number,
    priority: 'high' | 'medium' | 'low',
    startTime: number,
  ): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        const index = this.waitingQueue.findIndex(
          (req) => req.resolve === resolve,
        );
        if (index >= 0) {
          this.waitingQueue.splice(index, 1);
        }
        this.stats.recordTimeout();
        reject(new Error(`Connection acquire timeout after ${timeout}ms`));
      }, timeout);

      const request: QueuedRequest = {
        resolve: (connection: PooledConnection) => {
          clearTimeout(timeoutHandle);
          this.stats.recordAcquire(Date.now() - startTime);
          resolve(connection);
        },
        reject: (error: Error) => {
          clearTimeout(timeoutHandle);
          reject(error);
        },
        priority,
        requestedAt: new Date(),
      };

      // Insert based on priority
      this.insertRequestByPriority(request);
    });
  }

  private insertRequestByPriority(request: QueuedRequest): void {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const requestPriority = priorityOrder[request.priority];

    let insertIndex = this.waitingQueue.length;
    for (let i = 0; i < this.waitingQueue.length; i++) {
      const existingPriority = priorityOrder[this.waitingQueue[i].priority];
      if (requestPriority < existingPriority) {
        insertIndex = i;
        break;
      }
    }

    this.waitingQueue.splice(insertIndex, 0, request);
  }

  private processWaitingQueue(): void {
    if (this.waitingQueue.length === 0) return;

    const availableConnection = this.findAvailableConnection();
    if (!availableConnection) return;

    const request = this.waitingQueue.shift()!;
    this.markConnectionAcquired(availableConnection);
    request.resolve(availableConnection);
  }

  private shouldDestroyConnection(connection: PooledConnection): boolean {
    // Destroy if over max uses
    if (this.config.maxUses && connection.totalQueries >= this.config.maxUses) {
      return true;
    }

    // Destroy if unhealthy
    if (!connection.isHealthy) {
      return true;
    }

    // Destroy if over max connections and idle
    if (
      this.connections.length > this.config.maxConnections &&
      !connection.isAcquired
    ) {
      return true;
    }

    return false;
  }

  private async destroyConnection(connection: PooledConnection): Promise<void> {
    const index = this.connections.indexOf(connection);
    if (index >= 0) {
      this.connections.splice(index, 1);
    }

    // Supabase client doesn't need explicit cleanup
    this.stats.recordDestroy();
  }

  private async evictIdleConnections(): Promise<void> {
    const now = Date.now();
    const connectionsToDestroy = this.connections.filter(
      (c) =>
        !c.isAcquired &&
        now - c.lastUsed.getTime() > this.config.idleTimeout &&
        this.connections.length > this.config.minConnections,
    );

    for (const connection of connectionsToDestroy) {
      await this.destroyConnection(connection);
    }
  }

  private async validateConnections(): Promise<void> {
    const validationPromises = this.connections.map(async (connection) => {
      if (!connection.isAcquired) {
        try {
          await this.validateConnection(connection);
        } catch (error) {
          await this.destroyConnection(connection);
        }
      }
    });

    await Promise.allSettled(validationPromises);
  }

  private async ensureMinConnections(): Promise<void> {
    const needed = this.config.minConnections - this.connections.length;
    if (needed <= 0) return;

    const createPromises = [];
    for (let i = 0; i < needed; i++) {
      createPromises.push(
        this.createConnection().catch((err) => {
          console.error('Failed to create connection during maintenance:', err);
          return null;
        }),
      );
    }

    const newConnections = await Promise.all(createPromises);
    this.connections.push(
      ...(newConnections.filter((c) => c !== null) as PooledConnection[]),
    );
  }

  private startMaintenance(): void {
    this.maintenanceInterval = setInterval(
      () => this.runMaintenance(),
      this.config.evictionRunInterval!,
    );
  }
}

// Supporting interfaces and classes

interface PooledConnection {
  id: string;
  client: SupabaseClient;
  createdAt: Date;
  lastUsed: Date;
  lastAcquired?: Date;
  lastReleased?: Date;
  isAcquired: boolean;
  totalQueries: number;
  totalAcquires: number;
  isHealthy: boolean;
  pool: string;
}

interface QueuedRequest {
  resolve: (connection: PooledConnection) => void;
  reject: (error: Error) => void;
  priority: 'high' | 'medium' | 'low';
  requestedAt: Date;
}

class PoolStatistics {
  totalAcquired = 0;
  totalReleased = 0;
  totalCreated = 0;
  totalDestroyed = 0;
  failedAcquires = 0;
  timedOutAcquires = 0;
  acquireTimes: number[] = [];
  createTimes: number[] = [];

  recordAcquire(time: number): void {
    this.totalAcquired++;
    this.acquireTimes.push(time);
    // Keep only last 100 measurements
    if (this.acquireTimes.length > 100) {
      this.acquireTimes.shift();
    }
  }

  recordRelease(): void {
    this.totalReleased++;
  }

  recordCreate(time: number): void {
    this.totalCreated++;
    this.createTimes.push(time);
    if (this.createTimes.length > 100) {
      this.createTimes.shift();
    }
  }

  recordDestroy(): void {
    this.totalDestroyed++;
  }

  recordFailedAcquire(): void {
    this.failedAcquires++;
  }

  recordTimeout(): void {
    this.timedOutAcquires++;
  }

  get averageAcquireTime(): number {
    return this.acquireTimes.length > 0
      ? this.acquireTimes.reduce((sum, time) => sum + time, 0) /
          this.acquireTimes.length
      : 0;
  }

  get averageCreateTime(): number {
    return this.createTimes.length > 0
      ? this.createTimes.reduce((sum, time) => sum + time, 0) /
          this.createTimes.length
      : 0;
  }
}

// Export singleton instance
export const connectionPool = DatabaseConnectionPool.getInstance();

// Utility functions
export async function withPooledConnection<T>(
  operation: 'read' | 'write' | 'analytics' | 'bulk',
  queryFn: (client: SupabaseClient) => Promise<T>,
  options: {
    organizationId?: string;
    priority?: 'high' | 'medium' | 'low';
    timeout?: number;
    retries?: number;
  } = {},
): Promise<T> {
  return connectionPool.withConnection(operation, queryFn, options);
}
