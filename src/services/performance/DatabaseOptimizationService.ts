import { createClient } from '@supabase/supabase-js';

export class DatabaseOptimizationService {
  private supabase;
  private connectionPool: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: 'public',
        },
        auth: {
          persistSession: false,
        },
      },
    );
  }

  // Optimized bulk client insertion
  async bulkInsertClients(
    clients: any[],
    batchSize: number = 100,
  ): Promise<void> {
    const batches = this.chunkArray(clients, batchSize);

    for (const batch of batches) {
      try {
        const { error } = await this.supabase.from('clients').upsert(batch, {
          onConflict: 'external_crm_id,crm_integration_id',
          ignoreDuplicates: false,
        });

        if (error) {
          console.error('Bulk insert error:', error);
          // Try individual inserts for the failed batch
          await this.insertBatchIndividually(batch);
        }
      } catch (error) {
        console.error('Bulk insert failed:', error);
        await this.insertBatchIndividually(batch);
      }
    }
  }

  // Optimized queries with proper indexing
  async getIntegrationWithOptimization(integrationId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('crm_integrations')
      .select(
        `
        *,
        suppliers!inner (
          id,
          subscription_tier,
          user_id
        )
      `,
      )
      .eq('id', integrationId)
      .single();

    if (error) throw error;
    return data;
  }

  // Efficient pagination for large datasets
  async getPaginatedSyncJobs(
    integrationId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: any[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      this.supabase
        .from('crm_sync_jobs')
        .select('*')
        .eq('integration_id', integrationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),

      this.supabase
        .from('crm_sync_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('integration_id', integrationId),
    ]);

    const data = dataResult.data || [];
    const total = countResult.count || 0;
    const hasMore = offset + data.length < total;

    return { data, total, hasMore };
  }

  // Connection pooling for high-concurrency operations
  async executeWithPool<T>(operation: () => Promise<T>): Promise<T> {
    // Implementation would use pgbouncer or similar connection pooling
    return operation();
  }

  // Database health monitoring
  async checkDatabaseHealth(): Promise<{
    connectionCount: number;
    slowQueries: any[];
    indexUsage: any[];
    tableStats: any[];
  }> {
    try {
      const [
        connectionResult,
        slowQueriesResult,
        indexUsageResult,
        tableStatsResult,
      ] = await Promise.all([
        this.supabase.rpc('get_connection_count'),
        this.supabase.rpc('get_slow_queries'),
        this.supabase.rpc('get_index_usage'),
        this.supabase.rpc('get_table_stats'),
      ]);

      return {
        connectionCount: connectionResult.data || 0,
        slowQueries: slowQueriesResult.data || [],
        indexUsage: indexUsageResult.data || [],
        tableStats: tableStatsResult.data || [],
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        connectionCount: 0,
        slowQueries: [],
        indexUsage: [],
        tableStats: [],
      };
    }
  }

  // Optimized client search with full-text search
  async searchClients(
    organizationId: string,
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ data: any[]; total: number }> {
    const searchQuery = query.trim().replace(/\s+/g, ' & ');

    const [dataResult, countResult] = await Promise.all([
      this.supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .textSearch('search_vector', searchQuery)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),

      this.supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .textSearch('search_vector', searchQuery),
    ]);

    return {
      data: dataResult.data || [],
      total: countResult.count || 0,
    };
  }

  // Bulk update operations with optimized queries
  async bulkUpdateClients(
    updates: Array<{ id: string; data: any }>,
  ): Promise<void> {
    const batches = this.chunkArray(updates, 100);

    for (const batch of batches) {
      // Use PostgreSQL CASE statements for efficient bulk updates
      const ids = batch.map((u) => u.id);
      const updateColumns: Record<string, string> = {};

      // Get all unique columns being updated
      const allColumns = new Set<string>();
      batch.forEach((update) => {
        Object.keys(update.data).forEach((col) => allColumns.add(col));
      });

      // Build CASE statements for each column
      allColumns.forEach((column) => {
        const cases = batch
          .filter((u) => u.data[column] !== undefined)
          .map((u) => `WHEN id = '${u.id}' THEN '${u.data[column]}'`)
          .join(' ');

        if (cases) {
          updateColumns[column] = `CASE ${cases} ELSE ${column} END`;
        }
      });

      // Execute the batch update using RPC for complex updates
      const { error } = await this.supabase.rpc('bulk_update_clients', {
        client_ids: ids,
        update_data: updateColumns,
      });

      if (error) {
        console.error('Bulk update failed:', error);
        // Fallback to individual updates
        await this.updateBatchIndividually(batch);
      }
    }
  }

  // Analyze query performance
  async analyzeQueryPerformance(query: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc('explain_query', {
        query_text: query,
      });

      if (error) {
        console.error('Query analysis failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Query analysis error:', error);
      return null;
    }
  }

  // Create optimized indexes based on query patterns
  async createOptimizedIndexes(): Promise<void> {
    const indexes = [
      // Client search optimizations
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_email 
       ON clients(organization_id, email)`,

      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_phone 
       ON clients(organization_id, phone)`,

      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_wedding_date 
       ON clients(wedding_date) WHERE wedding_date IS NOT NULL`,

      // CRM integration optimizations
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_crm_external 
       ON clients(crm_integration_id, external_crm_id)`,

      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_jobs_org_status 
       ON crm_sync_jobs(organization_id, status, created_at DESC)`,

      // Full-text search optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_search 
       ON clients USING GIN(to_tsvector('english', 
         coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '')
       ))`,

      // Partial indexes for active data
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_active 
       ON clients(organization_id, updated_at) 
       WHERE status != 'archived'`,

      // Composite indexes for common query patterns
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_status_date 
       ON clients(organization_id, status, wedding_date)`,
    ];

    for (const indexQuery of indexes) {
      try {
        await this.supabase.rpc('execute_sql', { sql: indexQuery });
        console.log('Index created successfully');
      } catch (error) {
        console.error('Failed to create index:', error);
      }
    }
  }

  // Monitor table statistics
  async getTableStatistics(): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc('get_table_statistics');

      if (error) {
        console.error('Failed to get table statistics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Table statistics error:', error);
      return null;
    }
  }

  // Vacuum and analyze tables for optimization
  async optimizeTables(): Promise<void> {
    const tables = [
      'clients',
      'crm_integrations',
      'crm_sync_jobs',
      'organizations',
    ];

    for (const table of tables) {
      try {
        await this.supabase.rpc('vacuum_analyze_table', { table_name: table });
        console.log(`Optimized table: ${table}`);
      } catch (error) {
        console.error(`Failed to optimize table ${table}:`, error);
      }
    }
  }

  // Get query execution plan
  async getQueryPlan(query: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc('get_query_plan', {
        query_text: query,
      });

      return error ? null : data;
    } catch (error) {
      console.error('Query plan error:', error);
      return null;
    }
  }

  private async insertBatchIndividually(batch: any[]): Promise<void> {
    for (const item of batch) {
      try {
        await this.supabase
          .from('clients')
          .upsert(item, { onConflict: 'external_crm_id,crm_integration_id' });
      } catch (error) {
        console.error('Individual insert failed:', error, item);
      }
    }
  }

  private async updateBatchIndividually(
    batch: Array<{ id: string; data: any }>,
  ): Promise<void> {
    for (const update of batch) {
      try {
        await this.supabase
          .from('clients')
          .update(update.data)
          .eq('id', update.id);
      } catch (error) {
        console.error('Individual update failed:', error, update);
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Performance metrics collection
  async collectPerformanceMetrics(): Promise<{
    avgQueryTime: number;
    slowQueries: number;
    connectionCount: number;
    cacheHitRatio: number;
  }> {
    try {
      const { data } = await this.supabase.rpc('get_performance_metrics');

      return {
        avgQueryTime: data?.avg_query_time || 0,
        slowQueries: data?.slow_query_count || 0,
        connectionCount: data?.connection_count || 0,
        cacheHitRatio: data?.cache_hit_ratio || 0,
      };
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
      return {
        avgQueryTime: 0,
        slowQueries: 0,
        connectionCount: 0,
        cacheHitRatio: 0,
      };
    }
  }
}
