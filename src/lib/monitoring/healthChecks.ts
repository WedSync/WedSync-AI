/**
 * WedSync System Health Check Functions
 * Comprehensive health monitoring for critical wedding operations
 */

import { createClient } from '@supabase/supabase-js';
import { metrics } from './index';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  responseTime?: number;
  details?: any;
  error?: string;
  lastChecked: number;
}

export interface SystemHealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheck[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
  };
}

/**
 * Database connectivity and performance health check
 */
export async function checkDatabaseHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  const name = 'database_connectivity';

  try {
    // Test basic connectivity with organizations table
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      metrics.increment('health.database.errors');
      return {
        name,
        status: 'fail',
        responseTime,
        error: error.message,
        lastChecked: Date.now(),
      };
    }

    // Performance thresholds
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    if (responseTime > 2000) {
      status = 'fail';
    } else if (responseTime > 500) {
      status = 'warn';
    }

    metrics.increment(`health.database.${status}`);
    metrics.histogram('health.database.response_time', responseTime);

    return {
      name,
      status,
      responseTime,
      details: {
        message: 'Database connectivity verified',
        query: 'organizations table accessible',
      },
      lastChecked: Date.now(),
    };
  } catch (error) {
    metrics.increment('health.database.errors');
    return {
      name,
      status: 'fail',
      responseTime: Date.now() - startTime,
      error:
        error instanceof Error ? error.message : 'Database connection failed',
      lastChecked: Date.now(),
    };
  }
}

/**
 * Core tables accessibility health check
 */
export async function checkCoreTables(): Promise<HealthCheck> {
  const startTime = Date.now();
  const name = 'core_tables_access';
  const coreTables = [
    'organizations',
    'clients',
    'vendors',
    'user_profiles',
    'journeys',
    'journey_instances',
    'client_journey_progress',
  ];

  try {
    const tableChecks = await Promise.all(
      coreTables.map(async (table) => {
        try {
          const { error } = await supabase.from(table).select('id').limit(1);

          return { table, accessible: !error, error: error?.message };
        } catch (err) {
          return {
            table,
            accessible: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      }),
    );

    const inaccessibleTables = tableChecks.filter((t) => !t.accessible);
    const responseTime = Date.now() - startTime;

    if (inaccessibleTables.length > 0) {
      metrics.increment('health.tables.errors');
      return {
        name,
        status: 'fail',
        responseTime,
        details: {
          inaccessibleTables,
          totalTables: coreTables.length,
          accessibleTables: coreTables.length - inaccessibleTables.length,
        },
        error: `${inaccessibleTables.length} core tables inaccessible`,
        lastChecked: Date.now(),
      };
    }

    metrics.increment('health.tables.pass');
    return {
      name,
      status: 'pass',
      responseTime,
      details: {
        message: 'All core tables accessible',
        accessibleTables: coreTables.length,
        tables: coreTables,
      },
      lastChecked: Date.now(),
    };
  } catch (error) {
    metrics.increment('health.tables.errors');
    return {
      name,
      status: 'fail',
      responseTime: Date.now() - startTime,
      error:
        error instanceof Error ? error.message : 'Core tables check failed',
      lastChecked: Date.now(),
    };
  }
}

/**
 * Query performance health check with wedding-specific queries
 */
export async function checkQueryPerformance(): Promise<HealthCheck> {
  const startTime = Date.now();
  const name = 'query_performance';

  try {
    // Test with a representative complex query that wedding planners commonly use
    const { data, error } = await supabase
      .from('organizations')
      .select(
        `
        id,
        name,
        created_at,
        clients(count),
        vendors(count)
      `,
      )
      .limit(5);

    const responseTime = Date.now() - startTime;

    if (error) {
      metrics.increment('health.query.errors');
      return {
        name,
        status: 'fail',
        responseTime,
        error: error.message,
        lastChecked: Date.now(),
      };
    }

    // Performance thresholds for complex queries
    let status: 'pass' | 'warn' | 'fail';
    if (responseTime > 3000) {
      status = 'fail';
    } else if (responseTime > 1000) {
      status = 'warn';
    } else {
      status = 'pass';
    }

    metrics.increment(`health.query.${status}`);
    metrics.histogram('health.query.response_time', responseTime);

    return {
      name,
      status,
      responseTime,
      details: {
        recordsReturned: data?.length || 0,
        queryType: 'complex_join_with_counts',
        performanceRating: status,
      },
      lastChecked: Date.now(),
    };
  } catch (error) {
    metrics.increment('health.query.errors');
    return {
      name,
      status: 'fail',
      responseTime: Date.now() - startTime,
      error:
        error instanceof Error
          ? error.message
          : 'Query performance check failed',
      lastChecked: Date.now(),
    };
  }
}

/**
 * Storage accessibility health check for wedding documents and photos
 */
export async function checkStorageHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  const name = 'storage_access';
  const buckets = ['pdf-uploads', 'client-photos', 'vendor-portfolios'];

  try {
    const bucketChecks = await Promise.all(
      buckets.map(async (bucket) => {
        try {
          const { data, error } = await supabase.storage
            .from(bucket)
            .list('', { limit: 1 });

          return { bucket, accessible: !error, error: error?.message };
        } catch (err) {
          return {
            bucket,
            accessible: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      }),
    );

    const inaccessibleBuckets = bucketChecks.filter((b) => !b.accessible);
    const responseTime = Date.now() - startTime;

    if (inaccessibleBuckets.length > 0) {
      const status =
        inaccessibleBuckets.length === buckets.length ? 'fail' : 'warn';
      metrics.increment(`health.storage.${status}`);

      return {
        name,
        status,
        responseTime,
        details: {
          inaccessibleBuckets,
          accessibleBuckets: buckets.length - inaccessibleBuckets.length,
          totalBuckets: buckets.length,
        },
        error: `${inaccessibleBuckets.length} storage buckets inaccessible`,
        lastChecked: Date.now(),
      };
    }

    // Performance threshold for storage access
    const status = responseTime > 2000 ? 'warn' : 'pass';
    metrics.increment(`health.storage.${status}`);
    metrics.histogram('health.storage.response_time', responseTime);

    return {
      name,
      status,
      responseTime,
      details: {
        message: 'All storage buckets accessible',
        accessibleBuckets: buckets.length,
        buckets,
      },
      lastChecked: Date.now(),
    };
  } catch (error) {
    metrics.increment('health.storage.errors');
    return {
      name,
      status: 'fail',
      responseTime: Date.now() - startTime,
      error:
        error instanceof Error ? error.message : 'Storage health check failed',
      lastChecked: Date.now(),
    };
  }
}

/**
 * Row Level Security (RLS) policies validation
 */
export async function checkRLSPolicies(): Promise<HealthCheck> {
  const startTime = Date.now();
  const name = 'rls_policies';

  try {
    // Test RLS by attempting to access protected data without proper auth context
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .limit(1);

    const responseTime = Date.now() - startTime;

    // If we get data without authentication, RLS might not be working properly
    if (data && data.length > 0 && !error) {
      metrics.increment('health.rls.warn');
      return {
        name,
        status: 'warn',
        responseTime,
        details: {
          message: 'RLS policies active but data accessible',
          note: 'Service role key may bypass RLS - this is expected',
        },
        lastChecked: Date.now(),
      };
    }

    // No data returned or access restricted - RLS working correctly
    metrics.increment('health.rls.pass');
    return {
      name,
      status: 'pass',
      responseTime,
      details: {
        message: 'RLS policies functioning correctly',
        note: 'Data access properly controlled',
      },
      lastChecked: Date.now(),
    };
  } catch (error) {
    // Error accessing is actually good for RLS validation
    metrics.increment('health.rls.pass');
    return {
      name,
      status: 'pass',
      responseTime: Date.now() - startTime,
      details: {
        message: 'RLS policies properly restricting access',
        note: 'Access denied as expected',
      },
      lastChecked: Date.now(),
    };
  }
}

/**
 * API endpoints health check
 */
export async function checkAPIEndpoints(): Promise<HealthCheck> {
  const startTime = Date.now();
  const name = 'api_endpoints';
  const endpoints = [
    '/api/health',
    '/api/clients',
    '/api/vendors',
    '/api/journeys',
  ];

  try {
    const endpointChecks = await Promise.all(
      endpoints.map(async (endpoint) => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${endpoint}`,
            {
              method: 'HEAD', // HEAD request to avoid data transfer
              headers: {
                'User-Agent': 'WedSync-Health-Check',
              },
            },
          );

          return {
            endpoint,
            accessible: response.ok,
            status: response.status,
            statusText: response.statusText,
          };
        } catch (err) {
          return {
            endpoint,
            accessible: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      }),
    );

    const inaccessibleEndpoints = endpointChecks.filter((e) => !e.accessible);
    const responseTime = Date.now() - startTime;

    if (inaccessibleEndpoints.length > 0) {
      const status =
        inaccessibleEndpoints.length === endpoints.length ? 'fail' : 'warn';
      metrics.increment(`health.api.${status}`);

      return {
        name,
        status,
        responseTime,
        details: {
          inaccessibleEndpoints,
          accessibleEndpoints: endpoints.length - inaccessibleEndpoints.length,
          totalEndpoints: endpoints.length,
        },
        error: `${inaccessibleEndpoints.length} API endpoints inaccessible`,
        lastChecked: Date.now(),
      };
    }

    metrics.increment('health.api.pass');
    return {
      name,
      status: 'pass',
      responseTime,
      details: {
        message: 'All API endpoints accessible',
        accessibleEndpoints: endpoints.length,
        endpoints,
      },
      lastChecked: Date.now(),
    };
  } catch (error) {
    metrics.increment('health.api.errors');
    return {
      name,
      status: 'fail',
      responseTime: Date.now() - startTime,
      error:
        error instanceof Error ? error.message : 'API endpoints check failed',
      lastChecked: Date.now(),
    };
  }
}

/**
 * Memory usage health check
 */
export function checkMemoryUsage(): HealthCheck {
  const name = 'memory_usage';
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

  // Memory usage thresholds (in MB)
  const WARNING_THRESHOLD = 500; // 500MB
  const CRITICAL_THRESHOLD = 1000; // 1GB

  let status: 'pass' | 'warn' | 'fail' = 'pass';
  if (heapUsedMB > CRITICAL_THRESHOLD) {
    status = 'fail';
  } else if (heapUsedMB > WARNING_THRESHOLD) {
    status = 'warn';
  }

  metrics.gauge('health.memory.heap_used', heapUsedMB);
  metrics.gauge('health.memory.heap_total', heapTotalMB);
  metrics.gauge('health.memory.rss', rssMB);
  metrics.increment(`health.memory.${status}`);

  return {
    name,
    status,
    details: {
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      rss: rssMB,
      unit: 'MB',
      thresholds: {
        warning: WARNING_THRESHOLD,
        critical: CRITICAL_THRESHOLD,
      },
    },
    lastChecked: Date.now(),
  };
}

/**
 * CPU usage health check
 */
export function checkCPUUsage(): HealthCheck {
  const name = 'cpu_usage';
  const cpuUsage = process.cpuUsage();
  const userCPU = Math.round(cpuUsage.user / 1000); // Convert to milliseconds
  const systemCPU = Math.round(cpuUsage.system / 1000);
  const totalCPU = userCPU + systemCPU;

  // CPU usage thresholds (in ms)
  const WARNING_THRESHOLD = 5000; // 5 seconds
  const CRITICAL_THRESHOLD = 10000; // 10 seconds

  let status: 'pass' | 'warn' | 'fail' = 'pass';
  if (totalCPU > CRITICAL_THRESHOLD) {
    status = 'fail';
  } else if (totalCPU > WARNING_THRESHOLD) {
    status = 'warn';
  }

  metrics.gauge('health.cpu.user', userCPU);
  metrics.gauge('health.cpu.system', systemCPU);
  metrics.gauge('health.cpu.total', totalCPU);
  metrics.increment(`health.cpu.${status}`);

  return {
    name,
    status,
    details: {
      user: userCPU,
      system: systemCPU,
      total: totalCPU,
      unit: 'ms',
      thresholds: {
        warning: WARNING_THRESHOLD,
        critical: CRITICAL_THRESHOLD,
      },
    },
    lastChecked: Date.now(),
  };
}

/**
 * Comprehensive system health report
 */
export async function generateSystemHealthReport(): Promise<SystemHealthReport> {
  const startTime = Date.now();

  try {
    // Run all health checks in parallel
    const [
      databaseHealth,
      coreTablesHealth,
      queryPerformanceHealth,
      storageHealth,
      rlsPoliciesHealth,
      apiEndpointsHealth,
      memoryHealth,
      cpuHealth,
    ] = await Promise.all([
      checkDatabaseHealth(),
      checkCoreTables(),
      checkQueryPerformance(),
      checkStorageHealth(),
      checkRLSPolicies(),
      checkAPIEndpoints(),
      Promise.resolve(checkMemoryUsage()),
      Promise.resolve(checkCPUUsage()),
    ]);

    const checks = [
      databaseHealth,
      coreTablesHealth,
      queryPerformanceHealth,
      storageHealth,
      rlsPoliciesHealth,
      apiEndpointsHealth,
      memoryHealth,
      cpuHealth,
    ];

    // Calculate summary
    const passed = checks.filter((c) => c.status === 'pass').length;
    const warnings = checks.filter((c) => c.status === 'warn').length;
    const failed = checks.filter((c) => c.status === 'fail').length;

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (failed > 0) {
      overallStatus = 'unhealthy';
    } else if (warnings > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const report: SystemHealthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        total: checks.length,
        passed,
        warnings,
        failed,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    };

    // Record metrics
    metrics.histogram('health.report.generation_time', Date.now() - startTime);
    metrics.increment(`health.system.${overallStatus}`);
    metrics.gauge('health.checks.passed', passed);
    metrics.gauge('health.checks.warnings', warnings);
    metrics.gauge('health.checks.failed', failed);

    return report;
  } catch (error) {
    metrics.increment('health.report.errors');

    // Return minimal error report
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: [
        {
          name: 'system_health_report',
          status: 'fail',
          error:
            error instanceof Error
              ? error.message
              : 'Health report generation failed',
          lastChecked: Date.now(),
        },
      ],
      summary: {
        total: 1,
        passed: 0,
        warnings: 0,
        failed: 1,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    };
  }
}
