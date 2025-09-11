import { createClient } from '@/lib/supabase/server';
import {
  CacheService,
  CACHE_PREFIXES,
  CACHE_TTL,
} from '@/lib/cache/redis-client';

interface QueryFilters {
  severity?: string[];
  actions?: string[];
  users?: string[];
  resourceTypes?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
  cursor?: string;
  weddingId?: string;
}

interface PaginationResult<T> {
  data: T[];
  hasNextPage: boolean;
  nextCursor?: string;
  totalCount?: number;
}

export class AuditQueryService {
  private static supabase = createClient();

  static async queryLogs(
    filters: QueryFilters = {},
  ): Promise<PaginationResult<any>> {
    const startTime = performance.now();

    // Generate cache key for frequent queries
    const cacheKey = this.generateCacheKey(filters);
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const limit = Math.min(filters.limit || 50, 1000);

    let query = this.supabase.from('audit_logs').select(`
        id,
        timestamp,
        user_id,
        action,
        table_name,
        record_id,
        ip_address,
        severity,
        old_values,
        new_values,
        changes,
        metadata,
        user_profiles!inner(email, full_name)
      `);

    // Apply filters with optimized index usage
    query = this.applyFilters(query, filters);

    // Apply cursor-based pagination
    if (filters.cursor) {
      query = query.lt('timestamp', filters.cursor);
    }

    // Order by timestamp DESC for latest first (uses index)
    query = query.order('timestamp', { ascending: false }).limit(limit + 1);

    const { data, error } = await query;

    if (error) {
      console.error('Audit query failed:', error);
      throw error;
    }

    const hasNextPage = data.length > limit;
    const results = hasNextPage ? data.slice(0, limit) : data;
    const nextCursor = hasNextPage
      ? results[results.length - 1].timestamp
      : undefined;

    const result = {
      data: results,
      hasNextPage,
      nextCursor,
    };

    // Cache frequently accessed queries
    if (this.shouldCache(filters)) {
      await CacheService.set(cacheKey, result, CACHE_TTL.SHORT);
    }

    const queryTime = performance.now() - startTime;
    console.log(`Audit query completed in ${queryTime}ms`);

    return result;
  }

  static async getLogStats(filters?: Partial<QueryFilters>) {
    const cacheKey = CacheService.buildKey(
      CACHE_PREFIXES.ANALYTICS,
      'audit_stats',
      JSON.stringify(filters),
    );
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    let query = this.supabase
      .from('audit_logs')
      .select('severity, action, table_name, timestamp');

    if (filters?.dateRange) {
      query = query
        .gte('timestamp', filters.dateRange.start)
        .lte('timestamp', filters.dateRange.end);
    }

    if (filters?.weddingId) {
      query = query.eq('metadata->>wedding_id', filters.weddingId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      bySeverity: this.groupBy(data || [], 'severity'),
      byAction: this.groupBy(data || [], 'action'),
      byTable: this.groupBy(data || [], 'table_name'),
      recentActivity: this.calculateRecentActivity(data || []),
    };

    await CacheService.set(cacheKey, stats, CACHE_TTL.MEDIUM);
    return stats;
  }

  private static applyFilters(query: any, filters: QueryFilters) {
    if (filters.severity?.length) {
      query = query.in('severity', filters.severity);
    }

    if (filters.actions?.length) {
      query = query.in('action', filters.actions);
    }

    if (filters.users?.length) {
      query = query.in('user_id', filters.users);
    }

    if (filters.resourceTypes?.length) {
      query = query.in('table_name', filters.resourceTypes);
    }

    if (filters.weddingId) {
      query = query.eq('metadata->>wedding_id', filters.weddingId);
    }

    if (filters.dateRange) {
      query = query
        .gte('timestamp', filters.dateRange.start)
        .lte('timestamp', filters.dateRange.end);
    }

    return query;
  }

  private static generateCacheKey(filters: QueryFilters): string {
    const key = {
      severity: filters.severity?.sort(),
      actions: filters.actions?.sort(),
      users: filters.users?.sort(),
      resourceTypes: filters.resourceTypes?.sort(),
      dateRange: filters.dateRange,
      weddingId: filters.weddingId,
    };
    return CacheService.buildKey(
      CACHE_PREFIXES.ANALYTICS,
      'audit_query',
      JSON.stringify(key),
    );
  }

  private static shouldCache(filters: QueryFilters): boolean {
    // Cache recent queries without user-specific filters
    return (
      !filters.users &&
      (!filters.dateRange ||
        new Date(filters.dateRange.start) > new Date(Date.now() - 86400000))
    ); // Last 24 hours
  }

  private static groupBy(array: any[], key: string) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || 0;
      groups[group]++;
      return groups;
    }, {});
  }

  private static calculateRecentActivity(data: any[]) {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);
    const dayAgo = new Date(now.getTime() - 86400000);

    return {
      lastHour: data.filter((item) => new Date(item.timestamp) > hourAgo)
        .length,
      lastDay: data.filter((item) => new Date(item.timestamp) > dayAgo).length,
    };
  }
}
