/**
 * Database Connection Management and Leak Prevention
 * Implements robust database connection pooling and error recovery
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';

export interface DatabaseConfig {
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  healthCheckInterval: number;
  enableConnectionPooling: boolean;
  enableQueryLogging: boolean;
}

export interface ConnectionStats {
  active: number;
  idle: number;
  total: number;
  failed: number;
  created: number;
  destroyed: number;
}

interface PooledConnection {
  client: SupabaseClient;
  id: string;
  created: number;
  lastUsed: number;
  queryCount: number;
  isHealthy: boolean;
  inUse: boolean;
}

export class DatabaseManager {
  private config: DatabaseConfig;
  private connectionPool: Map<string, PooledConnection> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private stats: ConnectionStats = {
    active: 0,
    idle: 0,
    total: 0,
    failed: 0,
    created: 0,
    destroyed: 0,
  };

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = {
      maxConnections: 10,
      connectionTimeout: 30000, // 30 seconds
      queryTimeout: 60000, // 60 seconds
      retryAttempts: 3,
      retryDelay: 1000,
      healthCheckInterval: 300000, // 5 minutes
      enableConnectionPooling: true,
      enableQueryLogging: process.env.NODE_ENV === 'development',
      ...config,
    };

    if (this.config.enableConnectionPooling) {
      this.initializeConnectionPool();
      this.startHealthChecking();
    }
  }

  /**
   * Get a database connection from the pool or create new one
   */
  async getConnection(): Promise<SupabaseClient> {
    if (!this.config.enableConnectionPooling) {
      return this.createDirectConnection();
    }

    // Try to get an available connection from pool
    const availableConnection = this.getAvailableConnection();
    if (availableConnection) {
      availableConnection.inUse = true;
      availableConnection.lastUsed = Date.now();
      this.updateStats();
      return availableConnection.client;
    }

    // Create new connection if pool not full
    if (this.connectionPool.size < this.config.maxConnections) {
      return await this.createPooledConnection();
    }

    // Wait for a connection to become available
    return await this.waitForAvailableConnection();
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(client: SupabaseClient): void {
    if (!this.config.enableConnectionPooling) {
      return; // Direct connections don't need releasing
    }

    for (const [id, connection] of this.connectionPool.entries()) {
      if (connection.client === client) {
        connection.inUse = false;
        connection.lastUsed = Date.now();
        this.updateStats();

        logger.debug('Connection released to pool', {
          connectionId: id,
          queryCount: connection.queryCount,
        });

        return;
      }
    }

    logger.warn('Attempted to release unknown connection');
  }

  /**
   * Execute query with connection management and retry logic
   */
  async executeQuery<T>(
    query: () => Promise<T>,
    queryName: string,
    retryable: boolean = true,
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      const connection = await this.getConnection();

      try {
        const result = await this.withTimeout(
          query(),
          this.config.queryTimeout,
          `Query ${queryName} timed out`,
        );

        const duration = Date.now() - startTime;

        // Log successful query
        if (this.config.enableQueryLogging) {
          logger.debug('Database query executed', {
            queryName,
            duration,
            attempt,
            connectionId: this.getConnectionId(connection),
          });
        }

        // Record metrics
        metrics.recordHistogram('database.query_duration', duration, {
          query: queryName,
          status: 'success',
        });

        // Update connection stats
        this.incrementQueryCount(connection);

        this.releaseConnection(connection);
        return result;
      } catch (error) {
        lastError = error as Error;

        logger.error(`Database query failed (attempt ${attempt})`, lastError, {
          queryName,
          attempt,
          connectionId: this.getConnectionId(connection),
        });

        // Check if error is retryable
        const isRetryableError = retryable && this.isRetryableError(lastError);
        const isLastAttempt = attempt >= this.config.retryAttempts;

        // Mark connection as unhealthy if it's a connection error
        if (this.isConnectionError(lastError)) {
          this.markConnectionUnhealthy(connection);
        }

        this.releaseConnection(connection);

        // Don't retry if not retryable or last attempt
        if (!isRetryableError || isLastAttempt) {
          break;
        }

        // Exponential backoff for retries
        await this.delay(this.config.retryDelay * Math.pow(2, attempt - 1));
      }
    }

    // Record failed query metrics
    metrics.incrementCounter('database.query_failed', 1, {
      query: queryName,
      error: lastError.name,
    });

    this.stats.failed++;

    throw lastError;
  }

  /**
   * Execute query with automatic connection management
   */
  async withConnection<T>(
    operation: (client: SupabaseClient) => Promise<T>,
    operationName: string = 'unknown',
  ): Promise<T> {
    return this.executeQuery(async () => {
      const connection = await this.getConnection();
      try {
        return await operation(connection);
      } finally {
        this.releaseConnection(connection);
      }
    }, operationName);
  }

  /**
   * Transaction wrapper with retry logic
   */
  async withTransaction<T>(
    operations: (client: SupabaseClient) => Promise<T>,
    transactionName: string = 'unknown',
  ): Promise<T> {
    return this.executeQuery(
      async () => {
        const connection = await this.getConnection();

        try {
          // Start transaction
          await connection.rpc('begin_transaction');

          const result = await operations(connection);

          // Commit transaction
          await connection.rpc('commit_transaction');

          return result;
        } catch (error) {
          // Rollback on error
          try {
            await connection.rpc('rollback_transaction');
          } catch (rollbackError) {
            logger.error(
              'Transaction rollback failed',
              rollbackError as Error,
              {
                transactionName,
                originalError: (error as Error).message,
              },
            );
          }

          throw error;
        } finally {
          this.releaseConnection(connection);
        }
      },
      `transaction_${transactionName}`,
      false, // Transactions should not be retried
    );
  }

  /**
   * Health check for database connections
   */
  async performHealthCheck(): Promise<{
    healthy: boolean;
    connections: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let healthyConnections = 0;

    logger.info('Starting database health check');

    // Check each connection in the pool
    for (const [id, connection] of this.connectionPool.entries()) {
      try {
        // Simple health check query
        await this.withTimeout(
          connection.client
            .from('information_schema.tables')
            .select('count')
            .limit(1),
          5000,
          'Health check timeout',
        );

        connection.isHealthy = true;
        healthyConnections++;
      } catch (error) {
        connection.isHealthy = false;
        issues.push(`Connection ${id}: ${(error as Error).message}`);

        logger.warn('Unhealthy database connection detected', {
          connectionId: id,
          error: (error as Error).message,
        });
      }
    }

    // Test creating a new connection
    try {
      const testConnection = await this.createDirectConnection();
      await this.withTimeout(
        testConnection
          .from('information_schema.tables')
          .select('count')
          .limit(1),
        5000,
        'New connection test timeout',
      );
    } catch (error) {
      issues.push(`New connection test failed: ${(error as Error).message}`);
    }

    const healthy = issues.length === 0 && healthyConnections > 0;

    // Record health check metrics
    metrics.recordGauge('database.healthy_connections', healthyConnections);
    metrics.recordGauge('database.total_connections', this.connectionPool.size);
    metrics.incrementCounter('database.health_checks', 1, {
      status: healthy ? 'pass' : 'fail',
    });

    return {
      healthy,
      connections: healthyConnections,
      issues,
    };
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): ConnectionStats & {
    poolSize: number;
    maxConnections: number;
    connectionUtilization: number;
  } {
    this.updateStats();

    return {
      ...this.stats,
      poolSize: this.connectionPool.size,
      maxConnections: this.config.maxConnections,
      connectionUtilization: this.stats.active / this.config.maxConnections,
    };
  }

  /**
   * Clean up expired and unhealthy connections
   */
  async cleanupConnections(): Promise<void> {
    const now = Date.now();
    const maxIdleTime = 600000; // 10 minutes
    const connectionsToRemove: string[] = [];

    for (const [id, connection] of this.connectionPool.entries()) {
      const idleTime = now - connection.lastUsed;
      const shouldRemove =
        !connection.isHealthy || (idleTime > maxIdleTime && !connection.inUse);

      if (shouldRemove) {
        connectionsToRemove.push(id);
      }
    }

    for (const id of connectionsToRemove) {
      await this.removeConnection(id);
    }

    if (connectionsToRemove.length > 0) {
      logger.info('Cleaned up database connections', {
        removedCount: connectionsToRemove.length,
        totalConnections: this.connectionPool.size,
      });
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down database manager');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Close all connections
    const shutdownPromises = Array.from(this.connectionPool.keys()).map((id) =>
      this.removeConnection(id),
    );

    await Promise.allSettled(shutdownPromises);
    this.connectionPool.clear();

    logger.info('Database manager shutdown complete');
  }

  // Private methods
  private initializeConnectionPool(): void {
    logger.info('Initializing database connection pool', {
      maxConnections: this.config.maxConnections,
    });

    // Pre-create some connections
    const initialConnections = Math.min(3, this.config.maxConnections);

    for (let i = 0; i < initialConnections; i++) {
      this.createPooledConnection().catch((error) => {
        logger.error('Failed to create initial connection', error);
      });
    }
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
        await this.cleanupConnections();
      } catch (error) {
        logger.error('Health check failed', error as Error);
      }
    }, this.config.healthCheckInterval);
  }

  private createDirectConnection(): SupabaseClient {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: 'public',
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  private async createPooledConnection(): Promise<SupabaseClient> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const client = this.createDirectConnection();

      // Test the connection
      await this.withTimeout(
        client.from('information_schema.tables').select('count').limit(1),
        this.config.connectionTimeout,
        'Connection test timeout',
      );

      const connection: PooledConnection = {
        client,
        id: connectionId,
        created: Date.now(),
        lastUsed: Date.now(),
        queryCount: 0,
        isHealthy: true,
        inUse: true,
      };

      this.connectionPool.set(connectionId, connection);
      this.stats.created++;
      this.stats.total++;

      logger.debug('Created new pooled connection', { connectionId });

      return client;
    } catch (error) {
      logger.error('Failed to create pooled connection', error as Error);
      throw error;
    }
  }

  private getAvailableConnection(): PooledConnection | null {
    for (const connection of this.connectionPool.values()) {
      if (!connection.inUse && connection.isHealthy) {
        return connection;
      }
    }
    return null;
  }

  private async waitForAvailableConnection(): Promise<SupabaseClient> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for available database connection'));
      }, this.config.connectionTimeout);

      const checkForConnection = () => {
        const available = this.getAvailableConnection();
        if (available) {
          clearTimeout(timeout);
          available.inUse = true;
          available.lastUsed = Date.now();
          resolve(available.client);
        } else {
          setTimeout(checkForConnection, 100);
        }
      };

      checkForConnection();
    });
  }

  private getConnectionId(client: SupabaseClient): string {
    for (const [id, connection] of this.connectionPool.entries()) {
      if (connection.client === client) {
        return id;
      }
    }
    return 'unknown';
  }

  private incrementQueryCount(client: SupabaseClient): void {
    for (const connection of this.connectionPool.values()) {
      if (connection.client === client) {
        connection.queryCount++;
        break;
      }
    }
  }

  private markConnectionUnhealthy(client: SupabaseClient): void {
    for (const connection of this.connectionPool.values()) {
      if (connection.client === client) {
        connection.isHealthy = false;
        break;
      }
    }
  }

  private async removeConnection(connectionId: string): Promise<void> {
    const connection = this.connectionPool.get(connectionId);
    if (connection) {
      try {
        // Close connection gracefully
        // Note: Supabase client doesn't have explicit close method
        // Connection will be closed when the object is garbage collected

        this.connectionPool.delete(connectionId);
        this.stats.destroyed++;
        this.stats.total--;

        logger.debug('Removed connection from pool', { connectionId });
      } catch (error) {
        logger.error('Error removing connection', error as Error, {
          connectionId,
        });
      }
    }
  }

  private updateStats(): void {
    let active = 0;
    let idle = 0;

    for (const connection of this.connectionPool.values()) {
      if (connection.inUse) {
        active++;
      } else {
        idle++;
      }
    }

    this.stats.active = active;
    this.stats.idle = idle;
  }

  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      'connection',
      'timeout',
      'network',
      'temporary',
      'unavailable',
      'busy',
    ];

    return retryablePatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern),
    );
  }

  private isConnectionError(error: Error): boolean {
    const connectionPatterns = [
      'connection refused',
      'connection lost',
      'connection timeout',
      'network error',
      'socket',
    ];

    return connectionPatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern),
    );
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();

// Utility functions
export function withDatabaseConnection<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  operationName?: string,
): Promise<T> {
  return databaseManager.withConnection(operation, operationName);
}

export function withDatabaseTransaction<T>(
  operations: (client: SupabaseClient) => Promise<T>,
  transactionName?: string,
): Promise<T> {
  return databaseManager.withTransaction(operations, transactionName);
}
