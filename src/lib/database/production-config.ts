/**
 * Production Database Configuration
 * Implements read replicas, connection pooling, and production optimizations
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import { circuitBreakers } from '@/lib/resilience/circuit-breaker';

interface DatabaseConfig {
  // Connection settings
  primary: {
    url: string;
    key: string;
    maxConnections: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
  };
  readReplicas: Array<{
    url: string;
    key: string;
    weight: number; // Load balancing weight
    region: string;
  }>;

  // Pool settings
  pooling: {
    enabled: boolean;
    minConnections: number;
    maxConnections: number;
    acquireTimeoutMs: number;
    createTimeoutMs: number;
    destroyTimeoutMs: number;
    idleTimeoutMs: number;
    reapIntervalMs: number;
  };

  // SSL/TLS settings
  ssl: {
    enabled: boolean;
    rejectUnauthorized: boolean;
    cert?: string;
    key?: string;
    ca?: string;
  };

  // Performance settings
  performance: {
    statementTimeout: number;
    queryTimeout: number;
    maxRetries: number;
    retryDelayMs: number;
    slowQueryThresholdMs: number;
  };

  // Monitoring settings
  monitoring: {
    enableQueryLogging: boolean;
    enablePerformanceTracking: boolean;
    logSlowQueries: boolean;
    metricsCollection: boolean;
  };
}

// Production database configuration
const productionConfig: DatabaseConfig = {
  primary: {
    url: process.env.SUPABASE_DB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    maxConnections: 100,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 10000,
  },

  readReplicas: [
    // Add read replicas based on your Supabase setup
    ...(process.env.SUPABASE_READ_REPLICA_1_URL
      ? [
          {
            url: process.env.SUPABASE_READ_REPLICA_1_URL,
            key:
              process.env.SUPABASE_READ_REPLICA_1_KEY ||
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
            weight: 1,
            region: process.env.SUPABASE_READ_REPLICA_1_REGION || 'us-east-1',
          },
        ]
      : []),

    ...(process.env.SUPABASE_READ_REPLICA_2_URL
      ? [
          {
            url: process.env.SUPABASE_READ_REPLICA_2_URL,
            key:
              process.env.SUPABASE_READ_REPLICA_2_KEY ||
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
            weight: 1,
            region: process.env.SUPABASE_READ_REPLICA_2_REGION || 'us-west-2',
          },
        ]
      : []),
  ],

  pooling: {
    enabled: true,
    minConnections: 5,
    maxConnections: 50,
    acquireTimeoutMs: 30000,
    createTimeoutMs: 10000,
    destroyTimeoutMs: 5000,
    idleTimeoutMs: 30000,
    reapIntervalMs: 1000,
  },

  ssl: {
    enabled: process.env.NODE_ENV === 'production',
    rejectUnauthorized: true,
  },

  performance: {
    statementTimeout: 30000, // 30 seconds
    queryTimeout: 15000, // 15 seconds
    maxRetries: 3,
    retryDelayMs: 1000,
    slowQueryThresholdMs: 1000, // 1 second
  },

  monitoring: {
    enableQueryLogging: process.env.NODE_ENV !== 'production',
    enablePerformanceTracking: true,
    logSlowQueries: true,
    metricsCollection: true,
  },
};

class DatabaseManager {
  private config: DatabaseConfig;
  private primaryClient: any;
  private readClients: Map<string, any> = new Map();
  private connectionPools: Map<string, any> = new Map();
  private roundRobinIndex = 0;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.initializePrimaryConnection();
    this.initializeReadReplicas();
  }

  private initializePrimaryConnection(): void {
    this.primaryClient = createClient(
      this.config.primary.url,
      this.config.primary.key,
      {
        auth: {
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'X-Client-Info': 'wedsync-production',
          },
        },
      },
    );

    logger.info('Primary database connection initialized', {
      url: this.config.primary.url.replace(/\/\/.*@/, '//***@'), // Hide credentials
      maxConnections: this.config.primary.maxConnections,
    });
  }

  private initializeReadReplicas(): void {
    for (const replica of this.config.readReplicas) {
      const client = createClient(replica.url, replica.key, {
        auth: {
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'X-Client-Info': 'wedsync-replica',
            'X-Replica-Region': replica.region,
          },
        },
      });

      this.readClients.set(replica.region, client);

      logger.info('Read replica connection initialized', {
        region: replica.region,
        weight: replica.weight,
      });
    }
  }

  // Get primary database client for write operations
  getPrimaryClient() {
    return this.primaryClient;
  }

  // Get read replica client with load balancing
  getReadClient(preferredRegion?: string) {
    if (this.readClients.size === 0) {
      return this.primaryClient; // Fallback to primary
    }

    // Try preferred region first
    if (preferredRegion && this.readClients.has(preferredRegion)) {
      return this.readClients.get(preferredRegion);
    }

    // Round-robin load balancing
    const replicas = Array.from(this.readClients.values());
    const client = replicas[this.roundRobinIndex % replicas.length];
    this.roundRobinIndex++;

    return client;
  }

  // Execute query with automatic read/write routing
  async executeQuery(
    query: string,
    params: any[] = [],
    options: {
      operation: 'read' | 'write';
      timeout?: number;
      preferredRegion?: string;
      retries?: number;
    },
  ) {
    const startTime = Date.now();
    const {
      operation,
      timeout,
      preferredRegion,
      retries = this.config.performance.maxRetries,
    } = options;

    const client =
      operation === 'write'
        ? this.getPrimaryClient()
        : this.getReadClient(preferredRegion);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Use circuit breaker for database operations
        const result = await circuitBreakers.database.execute(async () => {
          // Apply timeout if specified
          const queryTimeout = timeout || this.config.performance.queryTimeout;

          const queryPromise = client.rpc('exec_sql', {
            sql: query,
            params: params,
          });

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Query timeout')), queryTimeout);
          });

          return Promise.race([queryPromise, timeoutPromise]);
        });

        const duration = Date.now() - startTime;

        // Track performance metrics
        this.trackQueryMetrics(query, operation, duration, true, attempt);

        // Log slow queries
        if (
          duration > this.config.performance.slowQueryThresholdMs &&
          this.config.monitoring.logSlowQueries
        ) {
          logger.warn('Slow query detected', {
            query: query.substring(0, 200), // Truncate for logging
            duration,
            operation,
            attempt,
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        const duration = Date.now() - startTime;

        this.trackQueryMetrics(query, operation, duration, false, attempt);

        logger.error(
          `Database query failed (attempt ${attempt}/${retries})`,
          error as Error,
          {
            query: query.substring(0, 200),
            operation,
            attempt,
            duration,
          },
        );

        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }

        // Wait before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.performance.retryDelayMs * attempt),
        );
      }
    }

    throw lastError || new Error('Database query failed after all retries');
  }

  // Specialized methods for common operations
  async select(table: string, conditions: any = {}, options: any = {}) {
    const client = this.getReadClient(options.preferredRegion);

    let query = client.from(table).select(options.select || '*');

    // Apply conditions
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    // Apply additional options
    if (options.limit) query = query.limit(options.limit);
    if (options.offset)
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    if (options.orderBy)
      query = query.order(options.orderBy, {
        ascending: options.ascending !== false,
      });

    return query;
  }

  async insert(table: string, data: any | any[], options: any = {}) {
    const client = this.getPrimaryClient();

    let query = client.from(table).insert(data);

    if (options.onConflict) {
      query = query.onConflict(options.onConflict);
    }

    if (options.ignoreDuplicates) {
      query = query.onConflict().ignore();
    }

    return query;
  }

  async update(table: string, data: any, conditions: any = {}) {
    const client = this.getPrimaryClient();

    let query = client.from(table).update(data);

    // Apply conditions
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    return query;
  }

  async delete(table: string, conditions: any = {}) {
    const client = this.getPrimaryClient();

    let query = client.from(table).delete();

    // Apply conditions
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    return query;
  }

  // Health check for all database connections
  async healthCheck(): Promise<{
    primary: boolean;
    readReplicas: { [region: string]: boolean };
    totalConnections: number;
    poolStatus?: any;
  }> {
    const health = {
      primary: false,
      readReplicas: {} as { [region: string]: boolean },
      totalConnections: 0,
      poolStatus: undefined,
    };

    // Check primary connection
    try {
      await this.primaryClient
        .from('organizations')
        .select('count', { count: 'exact' })
        .limit(1);
      health.primary = true;
    } catch (error) {
      logger.error('Primary database health check failed', error as Error);
    }

    // Check read replicas - use forEach for downlevelIteration compatibility
    this.readClients.forEach(async (client, region) => {
      try {
        await client
          .from('organizations')
          .select('count', { count: 'exact' })
          .limit(1);
        health.readReplicas[region] = true;
      } catch (error) {
        logger.error(
          `Read replica health check failed for region ${region}`,
          error as Error,
        );
        health.readReplicas[region] = false;
      }
    });

    return health;
  }

  private trackQueryMetrics(
    query: string,
    operation: 'read' | 'write',
    duration: number,
    success: boolean,
    attempt: number,
  ): void {
    if (!this.config.monitoring.metricsCollection) return;

    const queryType = this.extractQueryType(query);

    metrics.incrementCounter('database.queries', 1, {
      operation,
      query_type: queryType,
      success: success.toString(),
      attempt: attempt.toString(),
    });

    metrics.recordHistogram('database.query_duration', duration, {
      operation,
      query_type: queryType,
    });

    if (!success) {
      metrics.incrementCounter('database.query_errors', 1, {
        operation,
        query_type: queryType,
      });
    }
  }

  private extractQueryType(query: string): string {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.startsWith('select')) return 'select';
    if (normalizedQuery.startsWith('insert')) return 'insert';
    if (normalizedQuery.startsWith('update')) return 'update';
    if (normalizedQuery.startsWith('delete')) return 'delete';
    if (normalizedQuery.startsWith('create')) return 'create';
    if (normalizedQuery.startsWith('alter')) return 'alter';
    if (normalizedQuery.startsWith('drop')) return 'drop';

    return 'other';
  }

  // Get database statistics
  async getStatistics(): Promise<{
    connections: {
      active: number;
      idle: number;
      total: number;
    };
    performance: {
      avgQueryTime: number;
      slowQueries: number;
      totalQueries: number;
    };
    replication: {
      replicaCount: number;
      replicationLag?: number;
    };
  }> {
    // This would be implemented with actual database monitoring queries
    // For now, return basic info
    return {
      connections: {
        active: 0,
        idle: 0,
        total: this.config.primary.maxConnections,
      },
      performance: {
        avgQueryTime: 0,
        slowQueries: 0,
        totalQueries: 0,
      },
      replication: {
        replicaCount: this.readClients.size,
        replicationLag: undefined,
      },
    };
  }

  // Close all connections
  async shutdown(): Promise<void> {
    logger.info('Shutting down database connections');

    // Close connection pools if any - use forEach for downlevelIteration compatibility
    this.connectionPools.forEach(async (pool) => {
      try {
        await pool.end();
      } catch (error) {
        logger.error('Error closing connection pool', error as Error);
      }
    });

    logger.info('Database connections shutdown complete');
  }
}

// Create production database manager instance
export const productionDB = new DatabaseManager(productionConfig);

// Helper functions for common database operations
export async function queryWithRetry(
  query: string,
  params: any[] = [],
  operation: 'read' | 'write' = 'read',
  options: {
    timeout?: number;
    preferredRegion?: string;
    retries?: number;
  } = {},
) {
  return productionDB.executeQuery(query, params, { operation, ...options });
}

// Read operations with automatic replica routing
export async function readQuery(
  query: string,
  params: any[] = [],
  options: { timeout?: number; preferredRegion?: string } = {},
) {
  return queryWithRetry(query, params, 'read', options);
}

// Write operations to primary database
export async function writeQuery(
  query: string,
  params: any[] = [],
  options: { timeout?: number; retries?: number } = {},
) {
  return queryWithRetry(query, params, 'write', options);
}

// Get optimized client for specific operations
export function getOptimizedClient(
  operation: 'read' | 'write',
  region?: string,
) {
  return operation === 'write'
    ? productionDB.getPrimaryClient()
    : productionDB.getReadClient(region);
}

// Database health check endpoint helper
export async function checkDatabaseHealth() {
  return productionDB.healthCheck();
}

// Export configuration for external use
export { productionConfig, DatabaseManager };

// Environment-specific configurations
export const getDatabaseConfig = (
  env: 'development' | 'staging' | 'production',
): DatabaseConfig => {
  const baseConfig = { ...productionConfig };

  if (env === 'development') {
    baseConfig.monitoring.enableQueryLogging = true;
    baseConfig.performance.slowQueryThresholdMs = 500; // More sensitive in dev
    baseConfig.pooling.maxConnections = 10; // Smaller pool for dev
  } else if (env === 'staging') {
    baseConfig.pooling.maxConnections = 25; // Medium pool for staging
    baseConfig.performance.slowQueryThresholdMs = 750;
  }

  return baseConfig;
};
