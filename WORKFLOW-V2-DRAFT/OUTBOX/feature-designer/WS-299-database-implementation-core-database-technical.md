# WS-299: Database Implementation - Core Database - Technical Specification

## Feature Overview
**Feature ID:** WS-299  
**Feature Name:** Database Implementation - Core Database  
**Feature Type:** Technical Architecture  
**Priority:** P0 - Critical (Platform Foundation)  
**Estimated Effort:** 4 person-weeks  

## User Stories

### Primary User Stories

#### US-299-001: Wedding Photographer Platform Reliability
**As a** professional wedding photographer relying on WedSync for client management  
**I want the** database to be highly available and performant  
**So that I can** access my client data 24/7 without system downtime affecting my business

**Acceptance Criteria:**
- Database uptime is 99.9% or higher
- My client queries return results in under 200ms
- The system handles 1000+ concurrent users without degradation
- Automatic backups protect my data from loss
- Database automatically scales with my growing client base

**Example Scenario:**
Sarah's Photography has 150 active couples and receives 50+ form submissions daily. During peak wedding season (June-September), her team accesses client data constantly. The database maintains fast response times even when multiple staff members work simultaneously, and automated scaling handles increased load without manual intervention.

#### US-299-002: Engaged Couple Data Consistency
**As an** engaged couple using WedMe across multiple devices  
**I want my** wedding data to stay synchronized and consistent  
**So that** changes I make on mobile instantly appear on my partner's laptop

**Acceptance Criteria:**
- Updates on any device appear immediately on all other devices
- No data loss occurs during network interruptions
- Concurrent edits by both partners are handled gracefully
- Real-time notifications inform us of each other's changes
- Data integrity is maintained even during system failures

**Example Scenario:**
Emma updates the guest count from her phone while Jake simultaneously edits the timeline on his laptop. Both changes are saved correctly, they receive real-time notifications of each other's updates, and their connected photographers see the latest information instantly without conflicts or data corruption.

#### US-299-003: Wedding Supplier Business Continuity
**As a** wedding venue owner with seasonal revenue peaks  
**I need the** database to handle massive traffic spikes during busy periods  
**So that my** booking system doesn't crash when couples are making critical decisions

**Acceptance Criteria:**
- Database automatically scales during high-traffic periods
- Performance remains consistent under 10x normal load
- Cost optimization prevents overspending during quiet periods
- Monitoring alerts me to potential issues before they impact clients
- Disaster recovery ensures minimal downtime if failures occur

**Example Scenario:**
Luxury Wedding Venue sees 500% traffic increase during "engagement season" (December-February) when couples book next year's dates. The database automatically provisions additional resources, maintains sub-second response times for availability searches, and optimizes costs by scaling down during off-peak months.

#### US-299-004: Wedding Industry Developer Platform
**As a** developer building integrations with WedSync/WedMe  
**I want** reliable database APIs with clear performance characteristics  
**So that I can** build applications that clients can depend on

**Acceptance Criteria:**
- API response times have predictable latency (p95 < 500ms)
- Database connection pools prevent timeout errors
- Comprehensive monitoring provides visibility into performance
- Error handling gracefully manages temporary failures
- Documentation clearly explains performance expectations

**Example Scenario:**
Third-party developer builds a mobile app for wedding photographers using WedSync APIs. The app makes 100+ database queries per photo shoot to sync client details, forms, and timeline data. Predictable performance allows proper mobile app caching strategies, and detailed metrics help optimize integration efficiency.

## Database Implementation

### Supabase Project Configuration

```typescript
// supabase/config/database.ts
export interface DatabaseConfig {
  projectId: string;
  region: string;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  connectionPooling: {
    enabled: boolean;
    maxConnections: number;
    pgbouncerMode: 'transaction' | 'session';
  };
  extensions: string[];
  backups: {
    enabled: boolean;
    pitrRetentionDays: number;
    scheduledBackups: boolean;
  };
  monitoring: {
    realTimeEnabled: boolean;
    logsRetentionDays: number;
    metricsRetentionDays: number;
  };
}

export const productionConfig: DatabaseConfig = {
  projectId: process.env.SUPABASE_PROJECT_ID!,
  region: 'us-east-1',
  tier: 'pro', // Start with Pro, scale to Enterprise
  connectionPooling: {
    enabled: true,
    maxConnections: 100,
    pgbouncerMode: 'transaction'
  },
  extensions: [
    'uuid-ossp',
    'pgcrypto',
    'pg_stat_statements',
    'pg_trgm',
    'postgis',
    'timescaledb'
  ],
  backups: {
    enabled: true,
    pitrRetentionDays: 7,
    scheduledBackups: true
  },
  monitoring: {
    realTimeEnabled: true,
    logsRetentionDays: 30,
    metricsRetentionDays: 90
  }
};

export const stagingConfig: DatabaseConfig = {
  ...productionConfig,
  tier: 'free',
  connectionPooling: {
    enabled: true,
    maxConnections: 20,
    pgbouncerMode: 'transaction'
  },
  backups: {
    enabled: true,
    pitrRetentionDays: 3,
    scheduledBackups: false
  }
};
```

### Database Client Setup

```typescript
// lib/database/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export interface DatabaseClientConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  options: {
    auth: {
      autoRefreshToken: boolean;
      persistSession: boolean;
      detectSessionInUrl: boolean;
    };
    realtime: {
      enabled: boolean;
      heartbeatIntervalMs: number;
    };
    db: {
      schema: string;
    };
  };
}

class DatabaseClient {
  private static instance: DatabaseClient;
  private supabaseClient: SupabaseClient<Database>;
  private serviceClient: SupabaseClient<Database>;
  
  private constructor() {
    // Client-side Supabase client
    this.supabaseClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        realtime: {
          enabled: true,
          heartbeatIntervalMs: 30000
        },
        db: {
          schema: 'public'
        }
      }
    );

    // Service role client for server-side operations
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.serviceClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
          },
          realtime: {
            enabled: false,
            heartbeatIntervalMs: 0
          },
          db: {
            schema: 'public'
          }
        }
      );
    }
  }

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  public getClient(): SupabaseClient<Database> {
    return this.supabaseClient;
  }

  public getServiceClient(): SupabaseClient<Database> {
    if (!this.serviceClient) {
      throw new Error('Service role client not available');
    }
    return this.serviceClient;
  }

  public async testConnection(): Promise<{
    success: boolean;
    latency: number;
    error?: string;
  }> {
    const start = Date.now();
    
    try {
      const { data, error } = await this.supabaseClient
        .from('suppliers')
        .select('count')
        .limit(1);

      if (error) throw error;

      return {
        success: true,
        latency: Date.now() - start
      };
    } catch (error: any) {
      return {
        success: false,
        latency: Date.now() - start,
        error: error.message
      };
    }
  }
}

export const databaseClient = DatabaseClient.getInstance();
export const supabase = databaseClient.getClient();
export const supabaseServiceRole = databaseClient.getServiceClient();
```

### Migration System

```typescript
// scripts/migrate.ts
import { supabaseServiceRole } from '@/lib/database/client';
import fs from 'fs';
import path from 'path';

interface Migration {
  id: string;
  name: string;
  applied_at?: string;
  checksum: string;
}

class MigrationRunner {
  private migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  
  async getMigrationsStatus(): Promise<{
    applied: Migration[];
    pending: Migration[];
  }> {
    // Get applied migrations from database
    const { data: appliedMigrations, error } = await supabaseServiceRole
      .from('migrations')
      .select('*')
      .order('applied_at', { ascending: true });

    if (error) {
      console.error('Error fetching applied migrations:', error);
      throw error;
    }

    // Get all migration files
    const migrationFiles = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const appliedIds = new Set(appliedMigrations?.map(m => m.id) || []);
    
    const pending: Migration[] = [];
    for (const file of migrationFiles) {
      const id = file.replace('.sql', '');
      if (!appliedIds.has(id)) {
        const content = fs.readFileSync(
          path.join(this.migrationsDir, file), 
          'utf-8'
        );
        pending.push({
          id,
          name: file,
          checksum: this.calculateChecksum(content)
        });
      }
    }

    return {
      applied: appliedMigrations || [],
      pending
    };
  }

  async runMigrations(dryRun: boolean = false): Promise<{
    success: boolean;
    applied: string[];
    errors: string[];
  }> {
    const { pending } = await this.getMigrationsStatus();
    const applied: string[] = [];
    const errors: string[] = [];

    for (const migration of pending) {
      try {
        console.log(`${dryRun ? '[DRY RUN] ' : ''}Running migration: ${migration.name}`);
        
        if (!dryRun) {
          const migrationSql = fs.readFileSync(
            path.join(this.migrationsDir, migration.name),
            'utf-8'
          );

          // Execute migration
          const { error: migrationError } = await supabaseServiceRole.rpc(
            'execute_sql',
            { sql: migrationSql }
          );

          if (migrationError) throw migrationError;

          // Record successful migration
          const { error: recordError } = await supabaseServiceRole
            .from('migrations')
            .insert({
              id: migration.id,
              name: migration.name,
              checksum: migration.checksum,
              applied_at: new Date().toISOString()
            });

          if (recordError) throw recordError;
        }

        applied.push(migration.name);
        console.log(`✅ Migration ${migration.name} ${dryRun ? 'validated' : 'applied'} successfully`);
        
      } catch (error: any) {
        const errorMsg = `❌ Migration ${migration.name} failed: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        break; // Stop on first error
      }
    }

    return {
      success: errors.length === 0,
      applied,
      errors
    };
  }

  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// Command line interface
if (require.main === module) {
  const runner = new MigrationRunner();
  const dryRun = process.argv.includes('--dry-run');
  
  runner.runMigrations(dryRun)
    .then(result => {
      if (result.success) {
        console.log(`\n✅ All migrations completed successfully!`);
        console.log(`Applied: ${result.applied.length} migrations`);
      } else {
        console.log(`\n❌ Migration failed!`);
        console.log(`Applied: ${result.applied.length} migrations`);
        console.log(`Errors: ${result.errors.length}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal migration error:', error);
      process.exit(1);
    });
}
```

### Performance Monitoring

```typescript
// lib/database/monitoring.ts
import { supabaseServiceRole } from '@/lib/database/client';

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    max_connections: number;
    utilization_percent: number;
  };
  performance: {
    avg_query_time_ms: number;
    slow_queries_count: number;
    queries_per_second: number;
    cache_hit_ratio: number;
  };
  storage: {
    total_size_mb: number;
    table_sizes: Array<{
      table_name: string;
      size_mb: number;
      row_count: number;
    }>;
    growth_rate_mb_per_day: number;
  };
  health: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    last_backup: string;
    replication_lag_ms?: number;
  };
}

export class DatabaseMonitor {
  async getMetrics(): Promise<DatabaseMetrics> {
    const [connections, performance, storage, health] = await Promise.all([
      this.getConnectionMetrics(),
      this.getPerformanceMetrics(),
      this.getStorageMetrics(),
      this.getHealthMetrics()
    ]);

    return {
      connections,
      performance,
      storage,
      health
    };
  }

  private async getConnectionMetrics() {
    const { data, error } = await supabaseServiceRole.rpc('get_connection_stats');
    
    if (error) {
      console.error('Error fetching connection metrics:', error);
      throw error;
    }

    return {
      active: data?.active_connections || 0,
      idle: data?.idle_connections || 0,
      max_connections: data?.max_connections || 100,
      utilization_percent: Math.round(
        ((data?.active_connections || 0) / (data?.max_connections || 100)) * 100
      )
    };
  }

  private async getPerformanceMetrics() {
    const { data, error } = await supabaseServiceRole.rpc('get_performance_stats');
    
    if (error) {
      console.error('Error fetching performance metrics:', error);
      throw error;
    }

    return {
      avg_query_time_ms: data?.avg_query_time || 0,
      slow_queries_count: data?.slow_queries_count || 0,
      queries_per_second: data?.queries_per_second || 0,
      cache_hit_ratio: Math.round((data?.cache_hit_ratio || 0) * 100)
    };
  }

  private async getStorageMetrics() {
    const { data: tableSizes, error } = await supabaseServiceRole
      .rpc('get_table_sizes');
    
    if (error) {
      console.error('Error fetching storage metrics:', error);
      throw error;
    }

    const totalSize = tableSizes?.reduce((sum: number, table: any) => 
      sum + (table.size_mb || 0), 0) || 0;

    return {
      total_size_mb: totalSize,
      table_sizes: tableSizes || [],
      growth_rate_mb_per_day: await this.calculateGrowthRate()
    };
  }

  private async getHealthMetrics() {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check connection utilization
    const connections = await this.getConnectionMetrics();
    if (connections.utilization_percent > 80) {
      status = 'warning';
      issues.push(`High connection utilization: ${connections.utilization_percent}%`);
    }

    // Check slow queries
    const performance = await this.getPerformanceMetrics();
    if (performance.slow_queries_count > 10) {
      status = performance.slow_queries_count > 50 ? 'critical' : 'warning';
      issues.push(`${performance.slow_queries_count} slow queries detected`);
    }

    // Check cache hit ratio
    if (performance.cache_hit_ratio < 95) {
      status = 'warning';
      issues.push(`Low cache hit ratio: ${performance.cache_hit_ratio}%`);
    }

    // Get last backup time
    const { data: lastBackup } = await supabaseServiceRole
      .rpc('get_last_backup_time');

    return {
      status,
      issues,
      last_backup: lastBackup?.last_backup || 'Unknown',
      replication_lag_ms: 0 // Supabase handles this internally
    };
  }

  private async calculateGrowthRate(): Promise<number> {
    // This would calculate growth based on historical data
    // For now, return a placeholder
    return 0;
  }

  async checkDatabaseHealth(): Promise<boolean> {
    try {
      const { data, error } = await supabaseServiceRole
        .from('suppliers')
        .select('count')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}

export const databaseMonitor = new DatabaseMonitor();
```

### Connection Pool Management

```typescript
// lib/database/connection-pool.ts
import { Pool, PoolConfig } from 'pg';

export interface ConnectionPoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: {
    rejectUnauthorized: boolean;
  };
  // Pool settings
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis: number;
}

export class DatabaseConnectionPool {
  private pool: Pool;
  private config: ConnectionPoolConfig;

  constructor(config: ConnectionPoolConfig) {
    this.config = config;
    this.pool = new Pool({
      ...config,
      // Pool-specific configurations
      statement_timeout: 30000, // 30 seconds
      query_timeout: 30000,
      application_name: 'wedsync-app'
    });

    // Handle pool events
    this.pool.on('connect', (client) => {
      console.log('New database connection established');
    });

    this.pool.on('error', (err, client) => {
      console.error('Database pool error:', err);
    });

    this.pool.on('remove', (client) => {
      console.log('Database connection removed from pool');
    });
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, {
          query: text.substring(0, 100),
          duration,
          params: params?.length || 0
        });
      }

      return result;
    } finally {
      client.release();
    }
  }

  async transaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  getPoolStatus() {
    return {
      total_connections: this.pool.totalCount,
      idle_connections: this.pool.idleCount,
      waiting_requests: this.pool.waitingCount,
      max_connections: this.config.max
    };
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    error?: string;
  }> {
    const start = Date.now();
    
    try {
      const result = await this.query('SELECT 1 as health_check');
      return {
        healthy: result.rows[0].health_check === 1,
        latency: Date.now() - start
      };
    } catch (error: any) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error.message
      };
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Production connection pool
export const connectionPool = new DatabaseConnectionPool({
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  ssl: {
    rejectUnauthorized: false
  },
  min: 10, // Minimum connections in pool
  max: 100, // Maximum connections in pool
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 10000, // 10 seconds
  acquireTimeoutMillis: 60000 // 60 seconds
});
```

## API Endpoints

### Database Management API

```typescript
// app/api/database/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { databaseMonitor } from '@/lib/database/monitoring';
import { connectionPool } from '@/lib/database/connection-pool';

export async function GET(request: NextRequest) {
  try {
    const [dbHealth, poolStatus, metrics] = await Promise.all([
      connectionPool.healthCheck(),
      connectionPool.getPoolStatus(),
      databaseMonitor.getMetrics()
    ]);

    const healthResponse = {
      status: dbHealth.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connection_healthy: dbHealth.healthy,
        latency_ms: dbHealth.latency,
        error: dbHealth.error
      },
      connection_pool: poolStatus,
      metrics: {
        connections: metrics.connections,
        performance: metrics.performance,
        health: metrics.health
      }
    };

    return NextResponse.json(healthResponse, {
      status: dbHealth.healthy ? 200 : 503
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// app/api/database/metrics/route.ts
export async function GET(request: NextRequest) {
  try {
    const metrics = await databaseMonitor.getMetrics();
    
    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// app/api/database/migrate/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dry_run = false } = body;

    // Import migration runner
    const { MigrationRunner } = await import('@/scripts/migrate');
    const runner = new MigrationRunner();

    const result = await runner.runMigrations(dry_run);

    return NextResponse.json({
      success: result.success,
      dry_run,
      applied_migrations: result.applied,
      errors: result.errors,
      timestamp: new Date().toISOString()
    }, { 
      status: result.success ? 200 : 400 
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
```

### Query Optimization API

```typescript
// app/api/database/optimize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/database/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, table_name } = body;

    let result;
    switch (action) {
      case 'analyze_table':
        result = await analyzeTable(table_name);
        break;
      case 'reindex_table':
        result = await reindexTable(table_name);
        break;
      case 'update_statistics':
        result = await updateStatistics();
        break;
      case 'vacuum_analyze':
        result = await vacuumAnalyze(table_name);
        break;
      default:
        throw new Error(`Unknown optimization action: ${action}`);
    }

    return NextResponse.json({
      success: true,
      action,
      table_name,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function analyzeTable(tableName: string) {
  const { data, error } = await supabaseServiceRole
    .rpc('analyze_table', { table_name: tableName });
  
  if (error) throw error;
  return data;
}

async function reindexTable(tableName: string) {
  const { data, error } = await supabaseServiceRole
    .rpc('reindex_table', { table_name: tableName });
  
  if (error) throw error;
  return data;
}

async function updateStatistics() {
  const { data, error } = await supabaseServiceRole
    .rpc('update_table_statistics');
  
  if (error) throw error;
  return data;
}

async function vacuumAnalyze(tableName: string) {
  const { data, error } = await supabaseServiceRole
    .rpc('vacuum_analyze_table', { table_name: tableName });
  
  if (error) throw error;
  return data;
}
```

## Database Functions & Procedures

### Administrative Functions

```sql
-- Function to get connection statistics
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'active_connections', (
            SELECT count(*) FROM pg_stat_activity 
            WHERE state = 'active' AND backend_type = 'client backend'
        ),
        'idle_connections', (
            SELECT count(*) FROM pg_stat_activity 
            WHERE state = 'idle' AND backend_type = 'client backend'
        ),
        'max_connections', current_setting('max_connections')::int,
        'total_connections', (
            SELECT count(*) FROM pg_stat_activity 
            WHERE backend_type = 'client backend'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get performance statistics
CREATE OR REPLACE FUNCTION get_performance_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'avg_query_time', (
            SELECT COALESCE(AVG(mean_exec_time), 0)
            FROM pg_stat_statements
            WHERE calls > 10
        ),
        'slow_queries_count', (
            SELECT COUNT(*)
            FROM pg_stat_statements
            WHERE mean_exec_time > 1000 -- queries slower than 1 second
        ),
        'queries_per_second', (
            SELECT COALESCE(SUM(calls) / GREATEST(
                EXTRACT(EPOCH FROM (now() - stats_reset)) / 60, 1
            ), 0)
            FROM pg_stat_statements, pg_stat_database
            WHERE pg_stat_database.datname = current_database()
        ),
        'cache_hit_ratio', (
            SELECT COALESCE(
                sum(blks_hit) / GREATEST(sum(blks_hit) + sum(blks_read), 1), 0
            )
            FROM pg_stat_database
            WHERE datname = current_database()
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
    table_name TEXT,
    size_mb NUMERIC,
    row_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        ROUND(pg_total_relation_size(schemaname||'.'||tablename) / 1024.0 / 1024.0, 2) as size_mb,
        n_tup_ins + n_tup_upd + n_tup_del as row_count
    FROM pg_tables t
    LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname
    WHERE t.schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to analyze table
CREATE OR REPLACE FUNCTION analyze_table(table_name TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    EXECUTE format('ANALYZE %I', table_name);
    
    SELECT json_build_object(
        'table_analyzed', table_name,
        'timestamp', now(),
        'status', 'completed'
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vacuum and analyze table
CREATE OR REPLACE FUNCTION vacuum_analyze_table(table_name TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    EXECUTE format('VACUUM ANALYZE %I', table_name);
    
    SELECT json_build_object(
        'table_vacuumed', table_name,
        'timestamp', now(),
        'status', 'completed'
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## MCP Server Usage

### Required MCP Servers

1. **PostgreSQL MCP** - Core database operations
   - Direct database queries and administration
   - Performance monitoring and optimization
   - Migration execution and validation
   - Connection pool management

2. **Supabase MCP** - Platform-specific features
   - Project configuration and management
   - Real-time subscriptions setup
   - Authentication integration
   - Edge Functions deployment

### Implementation Priority

**Phase 1 (Week 1): Core Infrastructure**
- Supabase project setup and configuration
- Database client implementation and connection pooling
- Basic health checks and monitoring
- Migration system setup

**Phase 2 (Week 2): Performance & Monitoring** 
- Comprehensive metrics collection
- Query optimization and analysis
- Connection pool tuning
- Alert system implementation

**Phase 3 (Week 3-4): Production Readiness**
- Load testing and performance validation
- Backup and recovery procedures
- Disaster recovery planning
- Documentation and runbooks

## Test Requirements

### Unit Tests

```typescript
// __tests__/database/connection-pool.test.ts
describe('Connection Pool', () => {
  let pool: DatabaseConnectionPool;
  
  beforeAll(async () => {
    pool = new DatabaseConnectionPool(testConfig);
  });

  afterAll(async () => {
    await pool.close();
  });

  test('establishes database connections', async () => {
    const health = await pool.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.latency).toBeLessThan(100);
  });

  test('handles concurrent queries', async () => {
    const queries = Array.from({ length: 10 }, () => 
      pool.query('SELECT 1 as test')
    );

    const results = await Promise.all(queries);
    expect(results).toHaveLength(10);
    expect(results.every(r => r.rows[0].test === 1)).toBe(true);
  });

  test('manages connection pool limits', async () => {
    const status = pool.getPoolStatus();
    expect(status.total_connections).toBeGreaterThan(0);
    expect(status.total_connections).toBeLessThanOrEqual(status.max_connections);
  });
});

// __tests__/database/migrations.test.ts
describe('Migration System', () => {
  test('detects pending migrations', async () => {
    const runner = new MigrationRunner();
    const status = await runner.getMigrationsStatus();
    
    expect(status.applied).toBeDefined();
    expect(status.pending).toBeDefined();
    expect(Array.isArray(status.applied)).toBe(true);
    expect(Array.isArray(status.pending)).toBe(true);
  });

  test('validates migration checksums', async () => {
    const runner = new MigrationRunner();
    const dryRunResult = await runner.runMigrations(true);
    
    expect(dryRunResult.success).toBe(true);
    expect(dryRunResult.errors).toHaveLength(0);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/database-performance.test.ts
describe('Database Performance', () => {
  test('query response times within SLA', async () => {
    const testCases = [
      { query: 'suppliers dashboard', target: 200 },
      { query: 'couple forms', target: 150 },
      { query: 'core fields sync', target: 100 },
      { query: 'guest list load', target: 300 }
    ];

    for (const testCase of testCases) {
      const start = Date.now();
      await executeTestQuery(testCase.query);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(testCase.target);
    }
  });

  test('handles concurrent user load', async () => {
    const userCount = 100;
    const queriesPerUser = 5;
    
    const userSessions = Array.from({ length: userCount }, () => 
      simulateUserSession(queriesPerUser)
    );

    const start = Date.now();
    const results = await Promise.allSettled(userSessions);
    const duration = Date.now() - start;

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const successRate = successful / userCount;

    expect(successRate).toBeGreaterThan(0.95); // 95% success rate
    expect(duration).toBeLessThan(10000); // Complete in 10 seconds
  });
});

// __tests__/integration/database-reliability.test.ts
describe('Database Reliability', () => {
  test('maintains data consistency during failures', async () => {
    const couple = await createTestCouple();
    const suppliers = await createMultipleSuppliers(3);
    
    // Start concurrent core field updates
    const updatePromises = suppliers.map(supplier => 
      updateCoreFieldValue(couple.id, 'guest_count', Math.random() * 200)
    );

    // Simulate network interruption
    await simulateNetworkFailure(1000); // 1 second outage
    
    const results = await Promise.allSettled(updatePromises);
    
    // Verify data consistency
    const finalValue = await getCoreFieldValue(couple.id, 'guest_count');
    expect(finalValue).toBeDefined();
    
    // Verify audit trail
    const auditLogs = await getAuditLogs(couple.id, 'guest_count');
    expect(auditLogs.length).toBeGreaterThan(0);
  });
});
```

### Performance Tests

```typescript
// __tests__/performance/load-testing.test.ts
describe('Database Load Testing', () => {
  test('maintains performance under peak load', async () => {
    const metrics = {
      peakUsers: 1000,
      sustainedMinutes: 5,
      maxLatency: 500,
      minSuccessRate: 0.99
    };

    const loadTest = new LoadTester({
      concurrent_users: metrics.peakUsers,
      duration_minutes: metrics.sustainedMinutes,
      scenarios: [
        { name: 'supplier_dashboard', weight: 30 },
        { name: 'couple_forms', weight: 25 },
        { name: 'core_fields_update', weight: 20 },
        { name: 'guest_management', weight: 15 },
        { name: 'timeline_updates', weight: 10 }
      ]
    });

    const results = await loadTest.run();
    
    expect(results.avg_response_time_ms).toBeLessThan(metrics.maxLatency);
    expect(results.success_rate).toBeGreaterThan(metrics.minSuccessRate);
    expect(results.errors.database_timeouts).toBe(0);
    expect(results.errors.connection_failures).toBe(0);
  });

  test('auto-scaling responds to traffic spikes', async () => {
    // Simulate traffic spike (10x normal load)
    const baselineMetrics = await measureBaseline();
    
    const spike = await simulateTrafficSpike({
      multiplier: 10,
      duration_minutes: 2,
      ramp_up_seconds: 30
    });

    expect(spike.max_response_time).toBeLessThan(baselineMetrics.avg_response_time * 3);
    expect(spike.connection_pool_scaled).toBe(true);
    expect(spike.errors.out_of_connections).toBe(0);
  });
});
```

## Acceptance Criteria

### Performance Requirements
- ✅ 99.9% uptime SLA maintained consistently
- ✅ Database queries respond in <200ms p95 under normal load
- ✅ System handles 1000+ concurrent users without degradation
- ✅ Connection pool utilization stays below 80% during peak traffic
- ✅ Auto-scaling responds to 10x traffic spikes within 30 seconds

### Reliability Requirements
- ✅ Zero data loss during system failures or outages
- ✅ Automatic failover completes in <60 seconds
- ✅ Daily backups complete successfully with integrity verification
- ✅ Point-in-time recovery available for 7-day window
- ✅ Disaster recovery tested quarterly with <4 hour RTO

### Security Requirements  
- ✅ All database connections encrypted with TLS 1.3
- ✅ Row Level Security prevents cross-tenant data access
- ✅ API keys and sensitive data encrypted using pgcrypto
- ✅ Audit logs capture all administrative operations
- ✅ Regular security patching applied within 48 hours

### Monitoring Requirements
- ✅ Comprehensive metrics collection every minute
- ✅ Alerting triggers before performance degrades
- ✅ Health check endpoints return accurate status
- ✅ Query performance monitoring identifies bottlenecks
- ✅ Capacity planning data collected automatically

### Operational Requirements
- ✅ Migration system handles schema changes safely
- ✅ Zero-downtime deployments for application updates
- ✅ Database optimization runs automatically during off-peak hours
- ✅ Documentation covers all operational procedures
- ✅ On-call runbooks provide step-by-step guidance

## Effort Estimation

**Team B (Backend): 2.5 weeks**
- Database client implementation and connection pooling (1 week)
- Migration system and administrative functions (0.5 weeks)
- Performance monitoring and optimization (0.5 weeks)
- Testing and validation (0.5 weeks)

**Team C (DevOps): 1.5 weeks**
- Supabase project configuration and setup (0.5 weeks)
- Monitoring, alerting, and backup configuration (0.5 weeks)
- Load testing and performance validation (0.5 weeks)

**Team A (Frontend): 0.5 weeks**
- Database health monitoring dashboard (0.5 weeks)

**Total Effort: 4 person-weeks** (with parallel development)

## Dependencies

**Critical Dependencies:**
- Supabase project provisioning and tier selection
- PostgreSQL extensions installation and configuration
- Environment variables and connection strings setup
- SSL certificates and network security configuration

**Integration Dependencies:**
- Authentication system integration for user context
- API rate limiting and request validation
- Real-time subscription infrastructure
- Monitoring and alerting system integration

## Risk Assessment

**High Risk:**
- Connection pool exhaustion during traffic spikes
- Migration failures causing downtime
- Performance degradation under sustained high load

**Medium Risk:**
- Backup restoration time exceeding RTO targets
- Query optimization complexity for complex reporting
- Monitoring system false positives causing alert fatigue

**Mitigation:**
- Comprehensive load testing before production deployment
- Staging environment mirrors production configuration exactly
- Automated rollback procedures for failed migrations
- Multiple monitoring thresholds to reduce false positives
- Regular disaster recovery drills to validate procedures

---

**Specification Completed:** 2025-01-20  
**Next Review:** 2025-01-27  
**Version:** 1.0