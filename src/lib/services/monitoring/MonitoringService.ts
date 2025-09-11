import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Monitoring schemas for validation
const SystemHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'critical']),
  timestamp: z.date(),
  environment_id: z.string().uuid().optional(),
  component: z.string(),
  metrics: z.record(z.union([z.string(), z.number(), z.boolean()])),
  response_time_ms: z.number().optional(),
  error_rate: z.number().min(0).max(1).optional(),
  availability: z.number().min(0).max(1).optional(),
});

const AlertConditionSchema = z.object({
  condition_id: z.string(),
  metric_name: z.string(),
  operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte', 'ne']),
  threshold: z.number(),
  duration_minutes: z.number().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  enabled: z.boolean().default(true),
});

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  environment_id?: string;
  component: string;
  metrics: Record<string, string | number | boolean>;
  response_time_ms?: number;
  error_rate?: number;
  availability?: number;
}

interface AlertCondition {
  condition_id: string;
  metric_name: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  threshold: number;
  duration_minutes: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
}

interface MonitoringMetrics {
  api_response_time_p95: number;
  api_response_time_p99: number;
  database_query_time_p95: number;
  encryption_operation_time_avg: number;
  active_variables_count: number;
  active_environments_count: number;
  error_rate_5m: number;
  availability_24h: number;
  storage_usage_gb: number;
  memory_usage_percent: number;
  cpu_usage_percent: number;
  disk_usage_percent: number;
}

interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'critical';
  response_time_ms: number;
  error?: string;
  last_check: Date;
  uptime_percent: number;
}

interface EnvironmentHealth {
  environment_id: string;
  environment_name: string;
  status: 'healthy' | 'degraded' | 'critical';
  missing_variables: string[];
  configuration_drift: Array<{
    variable_key: string;
    expected_value: string;
    actual_value: string;
    drift_type: 'missing' | 'modified' | 'extra';
  }>;
  security_violations: Array<{
    variable_id: string;
    violation_type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
  }>;
  deployment_readiness: boolean;
  wedding_day_readiness: boolean;
  last_validation: Date;
  health_score: number; // 0-100
}

export class MonitoringService {
  private supabase = createClient();

  /**
   * Collect system-wide monitoring metrics
   */
  async collectSystemMetrics(
    organizationId: string,
  ): Promise<MonitoringMetrics> {
    try {
      // Get API response times from recent audit logs
      const { data: apiMetrics } = await this.supabase
        .from('audit_logs')
        .select('response_time_ms')
        .eq('organization_id', organizationId)
        .eq('resource_type', 'api')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .not('response_time_ms', 'is', null);

      // Calculate percentiles for API response times
      const responseTimes =
        apiMetrics?.map((log) => log.response_time_ms).sort((a, b) => a - b) ||
        [];
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);

      // Get database query times from system_health_metrics
      const { data: dbMetrics } = await this.supabase
        .from('system_health_metrics')
        .select('metrics')
        .eq('component', 'database')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      // Get encryption operation times
      const { data: encryptionMetrics } = await this.supabase
        .from('system_health_metrics')
        .select('metrics')
        .eq('component', 'encryption')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      // Get active counts
      const { count: activeVariables } = await this.supabase
        .from('environment_variables')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      const { count: activeEnvironments } = await this.supabase
        .from('environments')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // Calculate error rate from recent audit logs
      const { data: recentLogs } = await this.supabase
        .from('audit_logs')
        .select('success')
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      const errorCount = recentLogs?.filter((log) => !log.success).length || 0;
      const totalCount = recentLogs?.length || 1;
      const errorRate = totalCount > 0 ? errorCount / totalCount : 0;

      // Calculate 24h availability
      const { data: availabilityData } = await this.supabase
        .from('system_health_metrics')
        .select('metrics')
        .eq('component', 'api')
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );

      const uptimeEvents =
        availabilityData?.filter((event) => event.metrics?.status === 'healthy')
          .length || 0;
      const totalEvents = availabilityData?.length || 1;
      const availability = totalEvents > 0 ? uptimeEvents / totalEvents : 1;

      // Get system resource usage from latest health metrics
      const { data: resourceMetrics } = await this.supabase
        .from('system_health_metrics')
        .select('metrics')
        .eq('component', 'system')
        .order('created_at', { ascending: false })
        .limit(1);

      const latestMetrics = resourceMetrics?.[0]?.metrics || {};

      return {
        api_response_time_p95: responseTimes[p95Index] || 0,
        api_response_time_p99: responseTimes[p99Index] || 0,
        database_query_time_p95: this.calculateP95(
          dbMetrics?.map((m) => m.metrics?.query_time_ms).filter(Boolean) || [],
        ),
        encryption_operation_time_avg: this.calculateAverage(
          encryptionMetrics
            ?.map((m) => m.metrics?.operation_time_ms)
            .filter(Boolean) || [],
        ),
        active_variables_count: activeVariables || 0,
        active_environments_count: activeEnvironments || 0,
        error_rate_5m: errorRate,
        availability_24h: availability,
        storage_usage_gb: Number(latestMetrics.storage_usage_gb) || 0,
        memory_usage_percent: Number(latestMetrics.memory_usage_percent) || 0,
        cpu_usage_percent: Number(latestMetrics.cpu_usage_percent) || 0,
        disk_usage_percent: Number(latestMetrics.disk_usage_percent) || 0,
      };
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      throw new Error('Failed to collect system metrics');
    }
  }

  /**
   * Record system health status
   */
  async recordHealthStatus(
    organizationId: string,
    health: SystemHealth,
  ): Promise<void> {
    try {
      const validatedHealth = SystemHealthSchema.parse(health);

      await this.supabase.from('system_health_metrics').insert({
        organization_id: organizationId,
        environment_id: validatedHealth.environment_id,
        component: validatedHealth.component,
        status: validatedHealth.status,
        metrics: validatedHealth.metrics,
        response_time_ms: validatedHealth.response_time_ms,
        error_rate: validatedHealth.error_rate,
        availability: validatedHealth.availability,
        created_at: validatedHealth.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('Error recording health status:', error);
      throw new Error('Failed to record health status');
    }
  }

  /**
   * Perform comprehensive health checks across all components
   */
  async performHealthChecks(
    organizationId: string,
  ): Promise<HealthCheckResult[]> {
    const healthChecks: HealthCheckResult[] = [];

    try {
      // Database health check
      const dbStart = Date.now();
      try {
        await this.supabase.from('environments').select('id').limit(1);
        healthChecks.push({
          component: 'database',
          status: 'healthy',
          response_time_ms: Date.now() - dbStart,
          last_check: new Date(),
          uptime_percent: 100,
        });
      } catch (error) {
        healthChecks.push({
          component: 'database',
          status: 'critical',
          response_time_ms: Date.now() - dbStart,
          error:
            error instanceof Error
              ? error.message
              : 'Database connection failed',
          last_check: new Date(),
          uptime_percent: 0,
        });
      }

      // API health check
      const apiStart = Date.now();
      try {
        const response = await fetch('/api/environment/health', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        healthChecks.push({
          component: 'api',
          status: response.ok ? 'healthy' : 'degraded',
          response_time_ms: Date.now() - apiStart,
          error: response.ok ? undefined : `HTTP ${response.status}`,
          last_check: new Date(),
          uptime_percent: response.ok ? 100 : 50,
        });
      } catch (error) {
        healthChecks.push({
          component: 'api',
          status: 'critical',
          response_time_ms: Date.now() - apiStart,
          error: error instanceof Error ? error.message : 'API unreachable',
          last_check: new Date(),
          uptime_percent: 0,
        });
      }

      // Encryption service health check
      const encStart = Date.now();
      try {
        const testData = 'health-check-test';
        const { encrypt } = await import(
          '@/lib/services/security/EncryptionService'
        );
        await encrypt(testData, 'INTERNAL');

        healthChecks.push({
          component: 'encryption',
          status: 'healthy',
          response_time_ms: Date.now() - encStart,
          last_check: new Date(),
          uptime_percent: 100,
        });
      } catch (error) {
        healthChecks.push({
          component: 'encryption',
          status: 'critical',
          response_time_ms: Date.now() - encStart,
          error:
            error instanceof Error
              ? error.message
              : 'Encryption service failed',
          last_check: new Date(),
          uptime_percent: 0,
        });
      }

      // Record health check results
      for (const check of healthChecks) {
        await this.recordHealthStatus(organizationId, {
          status: check.status,
          timestamp: check.last_check,
          component: check.component,
          metrics: {
            response_time_ms: check.response_time_ms,
            uptime_percent: check.uptime_percent,
            error: check.error || null,
          },
          response_time_ms: check.response_time_ms,
        });
      }

      return healthChecks;
    } catch (error) {
      console.error('Error performing health checks:', error);
      throw new Error('Failed to perform health checks');
    }
  }

  /**
   * Check environment-specific health and readiness
   */
  async checkEnvironmentHealth(
    organizationId: string,
    environmentId: string,
  ): Promise<EnvironmentHealth> {
    try {
      // Get environment details
      const { data: environment } = await this.supabase
        .from('environments')
        .select('*')
        .eq('id', environmentId)
        .eq('organization_id', organizationId)
        .single();

      if (!environment) {
        throw new Error('Environment not found');
      }

      // Get all variables for this environment
      const { data: variables } = await this.supabase
        .from('environment_variables')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // Get environment-specific variable values
      const { data: envValues } = await this.supabase
        .from('environment_values')
        .select('*')
        .eq('environment_id', environmentId);

      // Check for missing variables
      const requiredVariables = variables?.filter((v) => v.is_required) || [];
      const existingValues = new Set(
        envValues?.map((ev) => ev.variable_id) || [],
      );
      const missingVariables = requiredVariables
        .filter((rv) => !existingValues.has(rv.id))
        .map((rv) => rv.key);

      // Check for configuration drift (simplified - in production would compare with source of truth)
      const configurationDrift = [];

      // Check for security violations
      const securityViolations = [];

      // Check recent security audit events
      const { data: recentAudits } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('environment_id', environmentId)
        .eq('event_type', 'security_violation')
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );

      recentAudits?.forEach((audit) => {
        securityViolations.push({
          variable_id: audit.resource_id,
          violation_type: audit.event_details?.violation_type || 'unknown',
          severity: audit.risk_level as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
          description:
            audit.event_details?.description || 'Security violation detected',
        });
      });

      // Calculate deployment readiness
      const deploymentReadiness =
        missingVariables.length === 0 &&
        securityViolations.filter((sv) => sv.severity === 'CRITICAL').length ===
          0;

      // Check wedding day readiness (no critical issues + Saturday protection active)
      const currentDay = new Date().getDay();
      const isSaturday = currentDay === 6;
      const hasCriticalIssues =
        securityViolations.some((sv) => sv.severity === 'CRITICAL') ||
        missingVariables.some(
          (key) => key.includes('payment') || key.includes('wedding'),
        );
      const weddingDayReadiness =
        !hasCriticalIssues && (!isSaturday || environment.saturday_read_only);

      // Calculate overall health score (0-100)
      let healthScore = 100;
      healthScore -= missingVariables.length * 10; // -10 per missing required variable
      healthScore -= configurationDrift.length * 5; // -5 per drift issue
      healthScore -= securityViolations.reduce((acc, sv) => {
        const severityWeights = { LOW: 2, MEDIUM: 5, HIGH: 10, CRITICAL: 25 };
        return acc + severityWeights[sv.severity];
      }, 0);
      healthScore = Math.max(0, healthScore);

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (
        healthScore < 70 ||
        securityViolations.some((sv) => sv.severity === 'CRITICAL')
      ) {
        status = 'critical';
      } else if (healthScore < 90 || missingVariables.length > 0) {
        status = 'degraded';
      }

      return {
        environment_id: environmentId,
        environment_name: environment.name,
        status,
        missing_variables: missingVariables,
        configuration_drift: configurationDrift,
        security_violations: securityViolations,
        deployment_readiness: deploymentReadiness,
        wedding_day_readiness: weddingDayReadiness,
        last_validation: new Date(),
        health_score: healthScore,
      };
    } catch (error) {
      console.error('Error checking environment health:', error);
      throw new Error('Failed to check environment health');
    }
  }

  /**
   * Get current alert conditions and check for triggers
   */
  async checkAlertConditions(organizationId: string): Promise<
    Array<{
      condition: AlertCondition;
      triggered: boolean;
      current_value: number;
      duration_exceeded: boolean;
    }>
  > {
    try {
      // Get all active alert conditions
      const { data: conditions } = await this.supabase
        .from('alert_conditions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('enabled', true);

      if (!conditions || conditions.length === 0) {
        return [];
      }

      // Get current metrics
      const metrics = await this.collectSystemMetrics(organizationId);
      const results = [];

      for (const condition of conditions) {
        const validatedCondition = AlertConditionSchema.parse(condition);
        const currentValue = this.getMetricValue(
          metrics,
          validatedCondition.metric_name,
        );
        const triggered = this.evaluateCondition(
          currentValue,
          validatedCondition.operator,
          validatedCondition.threshold,
        );

        // Check if condition has been triggered for the required duration
        const durationExceeded = await this.checkConditionDuration(
          organizationId,
          validatedCondition.condition_id,
          validatedCondition.duration_minutes,
        );

        results.push({
          condition: validatedCondition,
          triggered,
          current_value: currentValue,
          duration_exceeded: durationExceeded,
        });
      }

      return results;
    } catch (error) {
      console.error('Error checking alert conditions:', error);
      throw new Error('Failed to check alert conditions');
    }
  }

  // Helper methods
  private calculateP95(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = values.sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 0;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private getMetricValue(
    metrics: MonitoringMetrics,
    metricName: string,
  ): number {
    return (metrics as any)[metricName] || 0;
  }

  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number,
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      case 'ne':
        return value !== threshold;
      default:
        return false;
    }
  }

  private async checkConditionDuration(
    organizationId: string,
    conditionId: string,
    durationMinutes: number,
  ): Promise<boolean> {
    const since = new Date(Date.now() - durationMinutes * 60 * 1000);

    // Check if condition has been continuously triggered for the required duration
    const { data: recentAlerts } = await this.supabase
      .from('alert_events')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('condition_id', conditionId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    // Simplified check - in production would need more sophisticated duration tracking
    return (recentAlerts?.length || 0) >= Math.floor(durationMinutes / 5); // Assuming checks every 5 minutes
  }
}
