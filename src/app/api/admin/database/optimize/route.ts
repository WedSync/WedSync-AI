/**
 * WS-234 Database Optimization API
 * POST /api/admin/database/optimize
 *
 * Execute database optimization and maintenance actions
 * Admin-only access with comprehensive safety checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { ratelimit } from '@/lib/ratelimit';
import { z } from 'zod';

// Rate limiting: 10 requests per 5 minutes for optimization actions
const optimizationRateLimit = ratelimit({
  limiter: 'sliding_window_log',
  max: 10,
  window: '5 m',
});

// Validation schema for optimization requests
const OptimizationRequestSchema = z.object({
  action: z.enum([
    'vacuum_table',
    'reindex',
    'kill_query',
    'analyze_table',
    'kill_idle_connections',
    'cleanup_logs',
    'update_statistics',
  ]),
  target: z.string().min(1),
  parameters: z.record(z.any()).optional(),
  force: z.boolean().default(false), // Emergency override
  dryRun: z.boolean().default(false), // Test mode
});

type OptimizationRequest = z.infer<typeof OptimizationRequestSchema>;

interface OptimizationResult {
  success: boolean;
  action: string;
  target: string;
  duration: number;
  beforeStats?: Record<string, any>;
  afterStats?: Record<string, any>;
  spaceReclaimed?: number;
  message: string;
  warnings?: string[];
  recommendations?: string[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting check
    const { success, limit, reset, remaining } =
      await optimizationRateLimit.limit(request.ip || 'anonymous');

    if (!success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded for database optimization',
          message:
            'Too many optimization requests. Please wait before trying again.',
          limit,
          reset,
          remaining: 0,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          },
        },
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required for database optimization' },
        { status: 401 },
      );
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required for database optimization' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    let requestData: OptimizationRequest;
    try {
      const body = await request.json();
      requestData = OptimizationRequestSchema.parse(body);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          message: 'Please provide valid optimization parameters',
        },
        { status: 400 },
      );
    }

    // Safety checks before executing optimization
    const safetyCheck = await performSafetyChecks(supabase, requestData);
    if (!safetyCheck.safe && !requestData.force) {
      return NextResponse.json(
        {
          error: 'Safety check failed',
          message: safetyCheck.message,
          warnings: safetyCheck.warnings,
          canForce: safetyCheck.canForce,
          recommendation: 'Review warnings and use force=true if necessary',
        },
        { status: 400 },
      );
    }

    // Execute optimization action
    const result = await executeOptimizationAction(supabase, requestData);

    // Log the optimization action
    await logOptimizationAction(
      supabase,
      user.id,
      requestData,
      result,
      request.ip || 'unknown',
    );

    const response = {
      success: true,
      result,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata: {
        initiatedBy: user.email,
        ipAddress: request.ip,
        weddingSafetyMode: await isWeddingSafetyMode(),
        dryRun: requestData.dryRun,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    });
  } catch (error) {
    console.error('Database optimization API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to execute database optimization',
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * Perform safety checks before executing optimization
 */
async function performSafetyChecks(
  supabase: any,
  request: OptimizationRequest,
): Promise<{
  safe: boolean;
  message: string;
  warnings: string[];
  canForce: boolean;
}> {
  const warnings: string[] = [];
  let safe = true;
  let message = 'All safety checks passed';

  try {
    // Check if it's wedding day (Saturday)
    const isWeddingDay = new Date().getDay() === 6;
    if (isWeddingDay && !request.dryRun) {
      warnings.push(
        'WARNING: Today is Saturday (wedding day) - maintenance not recommended',
      );
      if (
        request.action !== 'kill_query' &&
        request.action !== 'kill_idle_connections'
      ) {
        safe = false;
        message =
          'Database maintenance blocked on wedding days except for emergency actions';
      }
    }

    // Check current database load
    const { data: loadData } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE wait_event_type = 'Client') as waiting_connections
        FROM pg_stat_activity 
        WHERE datname = current_database();
      `,
    });

    if (loadData?.[0]?.active_connections > 50) {
      warnings.push(
        `High database load detected: ${loadData[0].active_connections} active connections`,
      );
      if (request.action === 'vacuum_table' || request.action === 'reindex') {
        warnings.push(
          'Heavy maintenance operations may impact performance under high load',
        );
      }
    }

    // Check if target table is wedding-critical
    if (
      request.action === 'vacuum_table' ||
      request.action === 'analyze_table'
    ) {
      const weddingCriticalTables = [
        'form_responses',
        'form_fields',
        'forms',
        'journey_events',
        'clients',
        'organizations',
        'payment_history',
        'invoices',
        'email_logs',
      ];

      if (
        weddingCriticalTables.some((table) => request.target.includes(table))
      ) {
        warnings.push(
          `Target table '${request.target}' is wedding-critical - proceed with caution`,
        );
      }
    }

    // Check for ongoing maintenance
    const { data: maintenanceData } = await supabase
      .from('database_maintenance_log')
      .select('maintenance_type, target_table')
      .eq('status', 'running');

    if (maintenanceData && maintenanceData.length > 0) {
      warnings.push('Other maintenance operations are currently running');
      const runningOps = maintenanceData.map(
        (op: any) => `${op.maintenance_type} on ${op.target_table}`,
      );
      warnings.push(`Running operations: ${runningOps.join(', ')}`);
    }

    // Specific action checks
    switch (request.action) {
      case 'kill_query':
        // Always allowed for emergency situations
        break;

      case 'vacuum_table':
        if (!request.target || request.target.length < 3) {
          safe = false;
          message = 'Invalid table name for VACUUM operation';
        }
        break;

      case 'reindex':
        warnings.push(
          'REINDEX operations lock tables - ensure low traffic period',
        );
        break;

      case 'kill_idle_connections':
        // Check if there are actually idle connections to kill
        const { data: idleData } = await supabase.rpc('execute_sql', {
          sql: `
            SELECT count(*) as idle_count 
            FROM pg_stat_activity 
            WHERE state = 'idle' 
              AND query_start < NOW() - INTERVAL '5 minutes';
          `,
        });

        if (!idleData?.[0]?.idle_count || idleData[0].idle_count === 0) {
          warnings.push('No idle connections found to terminate');
        }
        break;
    }
  } catch (error) {
    console.error('Safety check error:', error);
    safe = false;
    message = 'Failed to perform safety checks';
    warnings.push('Unable to verify current database state');
  }

  return {
    safe,
    message,
    warnings,
    canForce: warnings.length > 0 && !message.includes('blocked'),
  };
}

/**
 * Execute the requested optimization action
 */
async function executeOptimizationAction(
  supabase: any,
  request: OptimizationRequest,
): Promise<OptimizationResult> {
  const actionStart = Date.now();
  let beforeStats: Record<string, any> = {};
  let afterStats: Record<string, any> = {};

  try {
    // Record maintenance start
    const { data: maintenanceRecord } = await supabase
      .from('database_maintenance_log')
      .insert([
        {
          maintenance_type: request.action,
          target_table: request.target,
          status: 'running',
          initiated_by: 'admin_api',
          wedding_season_context: await isWeddingSeasonActive(),
          before_stats: {},
        },
      ])
      .select('id')
      .single();

    const maintenanceId = maintenanceRecord?.id;

    // Get before stats based on action type
    if (
      request.action === 'vacuum_table' ||
      request.action === 'analyze_table'
    ) {
      beforeStats = await getTableStats(supabase, request.target);
    }

    let result: OptimizationResult;

    if (request.dryRun) {
      result = await simulateAction(supabase, request);
    } else {
      result = await executeAction(supabase, request);
    }

    // Get after stats
    if (
      request.action === 'vacuum_table' ||
      request.action === 'analyze_table'
    ) {
      afterStats = await getTableStats(supabase, request.target);
      result.spaceReclaimed = beforeStats.size_bytes - afterStats.size_bytes;
    }

    result.beforeStats = beforeStats;
    result.afterStats = afterStats;
    result.duration = Date.now() - actionStart;

    // Update maintenance record
    if (maintenanceId) {
      await supabase
        .from('database_maintenance_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          after_stats: afterStats,
          space_reclaimed_bytes: result.spaceReclaimed || 0,
        })
        .eq('id', maintenanceId);
    }

    return result;
  } catch (error) {
    console.error('Optimization action failed:', error);

    return {
      success: false,
      action: request.action,
      target: request.target,
      duration: Date.now() - actionStart,
      message: `Failed to execute ${request.action}: ${error}`,
      warnings: ['Operation failed - check logs for details'],
    };
  }
}

/**
 * Simulate action for dry run mode
 */
async function simulateAction(
  supabase: any,
  request: OptimizationRequest,
): Promise<OptimizationResult> {
  switch (request.action) {
    case 'vacuum_table':
      const tableStats = await getTableStats(supabase, request.target);
      return {
        success: true,
        action: request.action,
        target: request.target,
        duration: 0,
        message: `DRY RUN: Would VACUUM table ${request.target}`,
        recommendations: [
          `Estimated dead tuples: ${tableStats.n_dead_tup || 0}`,
          `Table size: ${Math.round(tableStats.size_bytes / 1024 / 1024)} MB`,
          `Estimated space to reclaim: ${Math.round((tableStats.n_dead_tup || 0) * 0.1)} MB`,
        ],
      };

    case 'kill_idle_connections':
      const { data: idleConnections } = await supabase.rpc('execute_sql', {
        sql: `
          SELECT count(*) as idle_count 
          FROM pg_stat_activity 
          WHERE state = 'idle' 
            AND query_start < NOW() - INTERVAL '5 minutes';
        `,
      });

      return {
        success: true,
        action: request.action,
        target: request.target,
        duration: 0,
        message: `DRY RUN: Would terminate ${idleConnections?.[0]?.idle_count || 0} idle connections`,
        recommendations: ['This would free up connection pool capacity'],
      };

    default:
      return {
        success: true,
        action: request.action,
        target: request.target,
        duration: 0,
        message: `DRY RUN: Would execute ${request.action} on ${request.target}`,
        warnings: ['Actual impact depends on current database state'],
      };
  }
}

/**
 * Execute the actual optimization action
 */
async function executeAction(
  supabase: any,
  request: OptimizationRequest,
): Promise<OptimizationResult> {
  switch (request.action) {
    case 'vacuum_table':
      await supabase.rpc('execute_sql', {
        sql: `VACUUM (ANALYZE, VERBOSE) ${request.target};`,
      });

      return {
        success: true,
        action: request.action,
        target: request.target,
        duration: 0,
        message: `Successfully vacuumed table ${request.target}`,
        recommendations: [
          'Table maintenance completed - monitor performance improvements',
        ],
      };

    case 'analyze_table':
      await supabase.rpc('execute_sql', {
        sql: `ANALYZE ${request.target};`,
      });

      return {
        success: true,
        action: request.action,
        target: request.target,
        duration: 0,
        message: `Successfully analyzed table ${request.target}`,
        recommendations: ['Query planner statistics updated'],
      };

    case 'kill_idle_connections':
      const { data: killedConnections } = await supabase.rpc('execute_sql', {
        sql: `
          SELECT pg_terminate_backend(pid), count(*) as terminated_count
          FROM pg_stat_activity 
          WHERE state = 'idle' 
            AND query_start < NOW() - INTERVAL '5 minutes'
            AND pid != pg_backend_pid();
        `,
      });

      return {
        success: true,
        action: request.action,
        target: request.target,
        duration: 0,
        message: `Terminated ${killedConnections?.[0]?.terminated_count || 0} idle connections`,
        recommendations: ['Connection pool capacity freed up'],
      };

    case 'kill_query':
      if (!request.parameters?.pid) {
        throw new Error('Process ID (pid) required for kill_query action');
      }

      await supabase.rpc('execute_sql', {
        sql: `SELECT pg_terminate_backend(${request.parameters.pid});`,
      });

      return {
        success: true,
        action: request.action,
        target: request.target,
        duration: 0,
        message: `Terminated query with PID ${request.parameters.pid}`,
        warnings: ['Verify the impact on application functionality'],
      };

    default:
      throw new Error(`Unsupported optimization action: ${request.action}`);
  }
}

/**
 * Get table statistics for before/after comparison
 */
async function getTableStats(supabase: any, tableName: string): Promise<any> {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT 
        schemaname,
        tablename,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        n_dead_tup,
        last_vacuum,
        last_analyze
      FROM pg_stat_user_tables 
      WHERE tablename = '${tableName.replace(/[^a-zA-Z0-9_]/g, '')}';
    `,
  });

  return error ? {} : data?.[0] || {};
}

/**
 * Check if wedding season is currently active
 */
async function isWeddingSeasonActive(): Promise<boolean> {
  const month = new Date().getMonth() + 1;
  return [5, 6, 7, 9, 10].includes(month);
}

/**
 * Check if wedding safety mode is enabled (Saturday or Friday evening)
 */
async function isWeddingSafetyMode(): Promise<boolean> {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  return day === 6 || (day === 5 && hour >= 18);
}

/**
 * Log optimization action for audit trail
 */
async function logOptimizationAction(
  supabase: any,
  userId: string,
  request: OptimizationRequest,
  result: OptimizationResult,
  ipAddress: string,
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert([
      {
        user_id: userId,
        action: `database_optimize_${request.action}`,
        resource_type: 'database',
        resource_id: request.target,
        ip_address: ipAddress,
        metadata: {
          optimization_request: request,
          optimization_result: result,
          endpoint: '/api/admin/database/optimize',
          timestamp: new Date().toISOString(),
        },
      },
    ]);
  } catch (error) {
    console.error('Failed to log optimization action:', error);
  }
}
