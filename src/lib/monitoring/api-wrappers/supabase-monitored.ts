/**
 * WS-233 API Usage Monitoring - Supabase Wrapper
 * Team C Integration: Monitored wrapper for Supabase operations
 * Integrates usage tracking with existing Supabase client
 */

import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import {
  trackSupabaseUsage,
  apiUsageTracker,
} from '@/lib/monitoring/api-usage-tracker';
import { logger } from '@/lib/monitoring/edge-logger';
import { v4 as uuidv4 } from 'uuid';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Monitored Supabase Client Wrapper
 * Adds usage tracking, cost monitoring, and rate limiting to Supabase operations
 */
export class MonitoredSupabaseClient {
  private client: SupabaseClient;
  private organizationId: string;
  private userId?: string;
  private isServerClient: boolean;

  constructor(
    organizationId: string,
    userId?: string,
    isServerClient: boolean = false,
  ) {
    this.organizationId = organizationId;
    this.userId = userId;
    this.isServerClient = isServerClient;
    this.client = isServerClient ? createServerClient() : createClient();
  }

  /**
   * Monitored database query operations
   */
  from<T = any>(table: string) {
    const originalClient = this.client;
    const organizationId = this.organizationId;
    const userId = this.userId;

    // Create a proxy that intercepts query methods
    const monitoredQueryBuilder = {
      select: (columns?: string) => {
        const builder = originalClient.from(table).select(columns);
        return this.wrapQueryBuilder(builder, 'SELECT', table, { columns });
      },

      insert: (values: any) => {
        const builder = originalClient.from(table).insert(values);
        return this.wrapQueryBuilder(builder, 'INSERT', table, {
          rowCount: Array.isArray(values) ? values.length : 1,
        });
      },

      update: (values: any) => {
        const builder = originalClient.from(table).update(values);
        return this.wrapQueryBuilder(builder, 'UPDATE', table, {
          hasValues: true,
        });
      },

      upsert: (values: any) => {
        const builder = originalClient.from(table).upsert(values);
        return this.wrapQueryBuilder(builder, 'UPSERT', table, {
          rowCount: Array.isArray(values) ? values.length : 1,
        });
      },

      delete: () => {
        const builder = originalClient.from(table).delete();
        return this.wrapQueryBuilder(builder, 'DELETE', table, {});
      },
    };

    return monitoredQueryBuilder;
  }

  /**
   * Monitored authentication operations
   */
  get auth() {
    const originalAuth = this.client.auth;
    const organizationId = this.organizationId;
    const userId = this.userId;

    return {
      ...originalAuth,

      signIn: async (credentials: any) => {
        const requestId = uuidv4();
        const startTime = Date.now();

        try {
          const result = await originalAuth.signInWithPassword(credentials);
          const duration = Date.now() - startTime;

          await trackSupabaseUsage(
            organizationId,
            '/auth/signin',
            'POST',
            requestId,
            duration,
            result.error ? 400 : 200,
            'auth',
            1,
            userId,
          );

          logger.info('Supabase auth signin', {
            organizationId,
            userId,
            requestId,
            duration,
            success: !result.error,
            error: result.error?.message,
          });

          return result;
        } catch (error) {
          await this.trackFailedRequest(
            '/auth/signin',
            'POST',
            requestId,
            startTime,
            500,
            error.message,
          );
          throw error;
        }
      },

      signUp: async (credentials: any) => {
        const requestId = uuidv4();
        const startTime = Date.now();

        try {
          const result = await originalAuth.signUp(credentials);
          const duration = Date.now() - startTime;

          await trackSupabaseUsage(
            organizationId,
            '/auth/signup',
            'POST',
            requestId,
            duration,
            result.error ? 400 : 200,
            'auth',
            1,
            userId,
          );

          logger.info('Supabase auth signup', {
            organizationId,
            userId,
            requestId,
            duration,
            success: !result.error,
            error: result.error?.message,
          });

          return result;
        } catch (error) {
          await this.trackFailedRequest(
            '/auth/signup',
            'POST',
            requestId,
            startTime,
            500,
            error.message,
          );
          throw error;
        }
      },

      signOut: async () => {
        const requestId = uuidv4();
        const startTime = Date.now();

        try {
          const result = await originalAuth.signOut();
          const duration = Date.now() - startTime;

          await trackSupabaseUsage(
            organizationId,
            '/auth/signout',
            'POST',
            requestId,
            duration,
            result.error ? 400 : 200,
            'auth',
            1,
            userId,
          );

          logger.info('Supabase auth signout', {
            organizationId,
            userId,
            requestId,
            duration,
            success: !result.error,
          });

          return result;
        } catch (error) {
          await this.trackFailedRequest(
            '/auth/signout',
            'POST',
            requestId,
            startTime,
            500,
            error.message,
          );
          throw error;
        }
      },
    };
  }

  /**
   * Monitored storage operations
   */
  get storage() {
    const originalStorage = this.client.storage;
    const organizationId = this.organizationId;
    const userId = this.userId;

    return {
      from: (bucketId: string) => {
        const bucket = originalStorage.from(bucketId);

        return {
          ...bucket,

          upload: async (path: string, file: any, options?: any) => {
            const requestId = uuidv4();
            const startTime = Date.now();

            try {
              const result = await bucket.upload(path, file, options);
              const duration = Date.now() - startTime;
              const fileSize = this.getFileSize(file);

              await trackSupabaseUsage(
                organizationId,
                `/storage/${bucketId}/upload`,
                'POST',
                requestId,
                duration,
                result.error ? 400 : 200,
                'storage',
                Math.ceil(fileSize / (1024 * 1024)), // Size in MB
                userId,
              );

              logger.info('Supabase storage upload', {
                organizationId,
                userId,
                requestId,
                bucketId,
                path,
                duration,
                fileSize,
                success: !result.error,
                error: result.error?.message,
              });

              return result;
            } catch (error) {
              await this.trackFailedRequest(
                `/storage/${bucketId}/upload`,
                'POST',
                requestId,
                startTime,
                500,
                error.message,
              );
              throw error;
            }
          },

          download: async (path: string) => {
            const requestId = uuidv4();
            const startTime = Date.now();

            try {
              const result = await bucket.download(path);
              const duration = Date.now() - startTime;
              const fileSize = result.data ? result.data.size : 0;

              await trackSupabaseUsage(
                organizationId,
                `/storage/${bucketId}/download`,
                'GET',
                requestId,
                duration,
                result.error ? 400 : 200,
                'storage',
                Math.ceil(fileSize / (1024 * 1024)), // Size in MB
                userId,
              );

              logger.info('Supabase storage download', {
                organizationId,
                userId,
                requestId,
                bucketId,
                path,
                duration,
                fileSize,
                success: !result.error,
                error: result.error?.message,
              });

              return result;
            } catch (error) {
              await this.trackFailedRequest(
                `/storage/${bucketId}/download`,
                'GET',
                requestId,
                startTime,
                500,
                error.message,
              );
              throw error;
            }
          },

          remove: async (paths: string[]) => {
            const requestId = uuidv4();
            const startTime = Date.now();

            try {
              const result = await bucket.remove(paths);
              const duration = Date.now() - startTime;

              await trackSupabaseUsage(
                organizationId,
                `/storage/${bucketId}/remove`,
                'DELETE',
                requestId,
                duration,
                result.error ? 400 : 200,
                'storage',
                paths.length, // Number of files removed
                userId,
              );

              logger.info('Supabase storage remove', {
                organizationId,
                userId,
                requestId,
                bucketId,
                pathCount: paths.length,
                duration,
                success: !result.error,
                error: result.error?.message,
              });

              return result;
            } catch (error) {
              await this.trackFailedRequest(
                `/storage/${bucketId}/remove`,
                'DELETE',
                requestId,
                startTime,
                500,
                error.message,
              );
              throw error;
            }
          },
        };
      },
    };
  }

  /**
   * Monitored real-time operations
   */
  channel(name: string, opts?: any) {
    const channel = this.client.channel(name, opts);
    const originalSubscribe = channel.subscribe;
    const organizationId = this.organizationId;
    const userId = this.userId;

    // Wrap subscribe to track usage
    channel.subscribe = async (callback: any) => {
      const requestId = uuidv4();
      const startTime = Date.now();

      try {
        const result = originalSubscribe.call(channel, callback);
        const duration = Date.now() - startTime;

        await trackSupabaseUsage(
          organizationId,
          `/realtime/subscribe`,
          'POST',
          requestId,
          duration,
          200,
          'realtime',
          1,
          userId,
        );

        logger.info('Supabase realtime subscribe', {
          organizationId,
          userId,
          requestId,
          channelName: name,
          duration,
        });

        return result;
      } catch (error) {
        await this.trackFailedRequest(
          '/realtime/subscribe',
          'POST',
          requestId,
          startTime,
          500,
          error.message,
        );
        throw error;
      }
    };

    return channel;
  }

  /**
   * RPC (Remote Procedure Call) monitoring
   */
  async rpc(fn: string, args?: Record<string, unknown>) {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      // Pre-flight check
      const limitCheck = await apiUsageTracker.checkUsageLimits(
        this.organizationId,
        'supabase',
        `/rpc/${fn}`,
        0.001, // Small estimated cost for RPC
      );

      if (!limitCheck.allowed) {
        const error = new Error(
          `Supabase usage blocked: ${limitCheck.warnings.join(', ')}`,
        );
        await this.trackFailedRequest(
          `/rpc/${fn}`,
          'POST',
          requestId,
          startTime,
          429,
          error.message,
        );
        throw error;
      }

      const result = await this.client.rpc(fn, args);
      const duration = Date.now() - startTime;

      await trackSupabaseUsage(
        this.organizationId,
        `/rpc/${fn}`,
        'POST',
        requestId,
        duration,
        result.error ? 400 : 200,
        'database',
        1,
        this.userId,
      );

      logger.info('Supabase RPC call', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        function: fn,
        duration,
        success: !result.error,
        error: result.error?.message,
        argCount: args ? Object.keys(args).length : 0,
      });

      return result;
    } catch (error) {
      await this.trackFailedRequest(
        `/rpc/${fn}`,
        'POST',
        requestId,
        startTime,
        500,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get usage analytics for this organization's Supabase usage
   */
  async getUsageAnalytics(dateRange: { start: Date; end: Date }) {
    return apiUsageTracker.getUsageAnalytics(
      this.organizationId,
      dateRange,
      'supabase',
    );
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus() {
    const budgets = await apiUsageTracker.getBudgetStatus(
      this.organizationId,
      'supabase',
    );
    return budgets[0] || null;
  }

  // Private helper methods

  private wrapQueryBuilder(
    builder: any,
    operation: string,
    table: string,
    metadata: any,
  ) {
    const originalExecute = builder.then;
    const organizationId = this.organizationId;
    const userId = this.userId;

    // Create a promise-like wrapper
    return {
      ...builder,

      async then(onResolve?: any, onReject?: any) {
        const requestId = uuidv4();
        const startTime = Date.now();

        try {
          // Pre-flight check for write operations
          if (['INSERT', 'UPDATE', 'DELETE', 'UPSERT'].includes(operation)) {
            const limitCheck = await apiUsageTracker.checkUsageLimits(
              organizationId,
              'supabase',
              `/db/${table}`,
              0.001, // Small estimated cost for DB operations
            );

            if (!limitCheck.allowed) {
              const error = new Error(
                `Supabase usage blocked: ${limitCheck.warnings.join(', ')}`,
              );
              await this.trackFailedRequest(
                `/db/${table}`,
                operation,
                requestId,
                startTime,
                429,
                error.message,
              );
              throw error;
            }
          }

          const result = await originalExecute.call(
            builder,
            onResolve,
            onReject,
          );
          const duration = Date.now() - startTime;

          // Calculate units for billing
          let units = 1;
          if (result.data && Array.isArray(result.data)) {
            units = Math.ceil(result.data.length / 1000); // Per 1K rows
          } else if (metadata.rowCount) {
            units = Math.ceil(metadata.rowCount / 1000);
          }

          await trackSupabaseUsage(
            organizationId,
            `/db/${table}`,
            operation,
            requestId,
            duration,
            result.error ? 400 : 200,
            'database',
            units,
            userId,
          );

          logger.info('Supabase database operation', {
            organizationId,
            userId,
            requestId,
            operation,
            table,
            duration,
            success: !result.error,
            error: result.error?.message,
            rowCount: Array.isArray(result.data) ? result.data.length : 0,
            units,
          });

          return result;
        } catch (error) {
          await this.trackFailedRequest(
            `/db/${table}`,
            operation,
            requestId,
            startTime,
            500,
            error.message,
          );
          throw error;
        }
      },

      // Preserve query builder methods by proxying them
      eq: (column: string, value: any) =>
        this.wrapQueryBuilder(
          builder.eq(column, value),
          operation,
          table,
          metadata,
        ),
      neq: (column: string, value: any) =>
        this.wrapQueryBuilder(
          builder.neq(column, value),
          operation,
          table,
          metadata,
        ),
      gt: (column: string, value: any) =>
        this.wrapQueryBuilder(
          builder.gt(column, value),
          operation,
          table,
          metadata,
        ),
      gte: (column: string, value: any) =>
        this.wrapQueryBuilder(
          builder.gte(column, value),
          operation,
          table,
          metadata,
        ),
      lt: (column: string, value: any) =>
        this.wrapQueryBuilder(
          builder.lt(column, value),
          operation,
          table,
          metadata,
        ),
      lte: (column: string, value: any) =>
        this.wrapQueryBuilder(
          builder.lte(column, value),
          operation,
          table,
          metadata,
        ),
      like: (column: string, pattern: string) =>
        this.wrapQueryBuilder(
          builder.like(column, pattern),
          operation,
          table,
          metadata,
        ),
      ilike: (column: string, pattern: string) =>
        this.wrapQueryBuilder(
          builder.ilike(column, pattern),
          operation,
          table,
          metadata,
        ),
      is: (column: string, value: any) =>
        this.wrapQueryBuilder(
          builder.is(column, value),
          operation,
          table,
          metadata,
        ),
      in: (column: string, values: any[]) =>
        this.wrapQueryBuilder(
          builder.in(column, values),
          operation,
          table,
          metadata,
        ),
      contains: (column: string, value: any) =>
        this.wrapQueryBuilder(
          builder.contains(column, value),
          operation,
          table,
          metadata,
        ),
      containedBy: (column: string, value: any) =>
        this.wrapQueryBuilder(
          builder.containedBy(column, value),
          operation,
          table,
          metadata,
        ),
      rangeGt: (column: string, range: string) =>
        this.wrapQueryBuilder(
          builder.rangeGt(column, range),
          operation,
          table,
          metadata,
        ),
      rangeGte: (column: string, range: string) =>
        this.wrapQueryBuilder(
          builder.rangeGte(column, range),
          operation,
          table,
          metadata,
        ),
      rangeLt: (column: string, range: string) =>
        this.wrapQueryBuilder(
          builder.rangeLt(column, range),
          operation,
          table,
          metadata,
        ),
      rangeLte: (column: string, range: string) =>
        this.wrapQueryBuilder(
          builder.rangeLte(column, range),
          operation,
          table,
          metadata,
        ),
      rangeAdjacent: (column: string, range: string) =>
        this.wrapQueryBuilder(
          builder.rangeAdjacent(column, range),
          operation,
          table,
          metadata,
        ),
      overlaps: (column: string, value: any) =>
        this.wrapQueryBuilder(
          builder.overlaps(column, value),
          operation,
          table,
          metadata,
        ),
      textSearch: (column: string, query: string, config?: any) =>
        this.wrapQueryBuilder(
          builder.textSearch(column, query, config),
          operation,
          table,
          metadata,
        ),
      match: (query: Record<string, any>) =>
        this.wrapQueryBuilder(builder.match(query), operation, table, metadata),
      not: (column: string, operator: string, value: any) =>
        this.wrapQueryBuilder(
          builder.not(column, operator, value),
          operation,
          table,
          metadata,
        ),
      or: (filters: string, foreignTable?: any) =>
        this.wrapQueryBuilder(
          builder.or(filters, foreignTable),
          operation,
          table,
          metadata,
        ),
      filter: (column: string, operator: string, value: any) =>
        this.wrapQueryBuilder(
          builder.filter(column, operator, value),
          operation,
          table,
          metadata,
        ),
      order: (column: string, options?: any) =>
        this.wrapQueryBuilder(
          builder.order(column, options),
          operation,
          table,
          metadata,
        ),
      limit: (count: number, foreignTable?: any) =>
        this.wrapQueryBuilder(
          builder.limit(count, foreignTable),
          operation,
          table,
          metadata,
        ),
      range: (from: number, to: number, foreignTable?: any) =>
        this.wrapQueryBuilder(
          builder.range(from, to, foreignTable),
          operation,
          table,
          metadata,
        ),
      abortSignal: (signal: AbortSignal) =>
        this.wrapQueryBuilder(
          builder.abortSignal(signal),
          operation,
          table,
          metadata,
        ),
      single: () =>
        this.wrapQueryBuilder(builder.single(), operation, table, metadata),
      maybeSingle: () =>
        this.wrapQueryBuilder(
          builder.maybeSingle(),
          operation,
          table,
          metadata,
        ),
      csv: () =>
        this.wrapQueryBuilder(builder.csv(), operation, table, metadata),
    };
  }

  private getFileSize(file: any): number {
    if (file instanceof File) return file.size;
    if (file instanceof Blob) return file.size;
    if (file instanceof ArrayBuffer) return file.byteLength;
    if (typeof file === 'string') return file.length;
    return 0;
  }

  private async trackFailedRequest(
    endpoint: string,
    method: string,
    requestId: string,
    startTime: number,
    statusCode: number,
    errorMessage: string,
  ): Promise<void> {
    const duration = Date.now() - startTime;

    try {
      await trackSupabaseUsage(
        this.organizationId,
        endpoint,
        method,
        requestId,
        duration,
        statusCode,
        'database',
        0, // No units for failed requests
        this.userId,
      );
    } catch (trackingError) {
      logger.error('Failed to track Supabase error', {
        organizationId: this.organizationId,
        requestId,
        trackingError: trackingError.message,
        originalError: errorMessage,
      });
    }
  }
}

/**
 * Factory functions to create monitored Supabase clients
 */
export function createMonitoredSupabaseClient(
  organizationId: string,
  userId?: string,
): MonitoredSupabaseClient {
  return new MonitoredSupabaseClient(organizationId, userId, false);
}

export function createMonitoredSupabaseServerClient(
  organizationId: string,
  userId?: string,
): MonitoredSupabaseClient {
  return new MonitoredSupabaseClient(organizationId, userId, true);
}

/**
 * Convenience wrapper that creates monitored client with same interface
 */
export function wrapSupabaseClientWithMonitoring(
  organizationId: string,
  userId?: string,
  isServerClient: boolean = false,
) {
  return new MonitoredSupabaseClient(organizationId, userId, isServerClient);
}

// Export for backward compatibility
export {
  createClient as baseCreateClient,
  createServerClient as baseCreateServerClient,
};
