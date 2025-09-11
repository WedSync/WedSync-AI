import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Analytics schemas for validation
const AnalyticsQuerySchema = z.object({
  metrics: z.array(z.string()),
  dimensions: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
  date_range: z.object({
    start: z.date(),
    end: z.date(),
  }),
  granularity: z
    .enum(['hour', 'day', 'week', 'month'])
    .optional()
    .default('day'),
  limit: z.number().min(1).max(10000).optional().default(1000),
});

interface AnalyticsQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  date_range: {
    start: Date;
    end: Date;
  };
  granularity?: 'hour' | 'day' | 'week' | 'month';
  limit?: number;
}

interface AnalyticsResult {
  data: Array<Record<string, any>>;
  metadata: {
    total_rows: number;
    query_time_ms: number;
    date_range: { start: Date; end: Date };
    metrics_requested: string[];
    dimensions_requested: string[];
  };
}

interface UsageMetrics {
  total_variables: number;
  total_environments: number;
  total_deployments: number;
  total_api_calls: number;
  unique_users: number;
  avg_response_time_ms: number;
  error_rate: number;
  storage_used_gb: number;
}

interface SecurityMetrics {
  total_access_events: number;
  failed_authentications: number;
  security_violations: number;
  encryption_operations: number;
  key_rotations: number;
  compliance_score: number;
  vulnerability_count: number;
  risk_score: number;
}

interface OperationalMetrics {
  system_uptime: number;
  deployment_success_rate: number;
  backup_success_rate: number;
  avg_deployment_time_minutes: number;
  total_alerts_sent: number;
  resolved_incidents: number;
  mean_time_to_resolution_hours: number;
  customer_satisfaction_score: number;
}

interface WeddingDayMetrics {
  total_weddings_supported: number;
  saturday_uptime: number;
  wedding_day_incidents: number;
  emergency_escalations: number;
  avg_resolution_time_minutes: number;
  supplier_satisfaction_rating: number;
  zero_downtime_weddings: number;
  critical_alerts_during_weddings: number;
}

interface DashboardWidget {
  widget_id: string;
  title: string;
  type: 'chart' | 'metric' | 'table' | 'gauge' | 'heatmap';
  configuration: {
    query: AnalyticsQuery;
    visualization: Record<string, any>;
    refresh_interval_minutes: number;
    alert_thresholds?: Record<string, number>;
  };
  position: { x: number; y: number; width: number; height: number };
}

export class AnalyticsDashboardService {
  private supabase = createClient();

  /**
   * Execute analytics query and return results
   */
  async executeQuery(
    organizationId: string,
    query: AnalyticsQuery,
  ): Promise<AnalyticsResult> {
    try {
      const validatedQuery = AnalyticsQuerySchema.parse(query);
      const startTime = Date.now();

      // Build the SQL query based on metrics and dimensions requested
      const sqlQuery = this.buildAnalyticsQuery(organizationId, validatedQuery);

      // Execute the query
      const { data, error, count } = await this.supabase.rpc(
        'execute_analytics_query',
        {
          query_sql: sqlQuery,
          org_id: organizationId,
        },
      );

      if (error) {
        throw new Error(`Analytics query failed: ${error.message}`);
      }

      const queryTime = Date.now() - startTime;

      return {
        data: data || [],
        metadata: {
          total_rows: count || 0,
          query_time_ms: queryTime,
          date_range: validatedQuery.date_range,
          metrics_requested: validatedQuery.metrics,
          dimensions_requested: validatedQuery.dimensions || [],
        },
      };
    } catch (error) {
      console.error('Error executing analytics query:', error);
      throw new Error('Failed to execute analytics query');
    }
  }

  /**
   * Get comprehensive usage metrics
   */
  async getUsageMetrics(
    organizationId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<UsageMetrics> {
    try {
      // Get total active variables
      const { count: totalVariables } = await this.supabase
        .from('environment_variables')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // Get total active environments
      const { count: totalEnvironments } = await this.supabase
        .from('environments')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // Get deployments in date range
      const { count: totalDeployments } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('event_type', 'deployment')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Get API calls in date range
      const { count: totalApiCalls } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('resource_type', 'api')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Get unique users in date range
      const { data: uniqueUserData } = await this.supabase
        .from('audit_logs')
        .select('user_id')
        .eq('organization_id', organizationId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const uniqueUsers = new Set(
        uniqueUserData?.map((log) => log.user_id) || [],
      ).size;

      // Get average response time
      const { data: responseTimes } = await this.supabase
        .from('audit_logs')
        .select('response_time_ms')
        .eq('organization_id', organizationId)
        .eq('resource_type', 'api')
        .not('response_time_ms', 'is', null)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const avgResponseTime =
        responseTimes && responseTimes.length > 0
          ? responseTimes.reduce(
              (sum, log) => sum + (log.response_time_ms || 0),
              0,
            ) / responseTimes.length
          : 0;

      // Calculate error rate
      const { data: errorData } = await this.supabase
        .from('audit_logs')
        .select('success')
        .eq('organization_id', organizationId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const totalRequests = errorData?.length || 1;
      const errorCount = errorData?.filter((log) => !log.success).length || 0;
      const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

      // Get storage usage (simplified - would be from actual storage metrics)
      const storageUsed = Math.random() * 10; // Placeholder

      return {
        total_variables: totalVariables || 0,
        total_environments: totalEnvironments || 0,
        total_deployments: totalDeployments || 0,
        total_api_calls: totalApiCalls || 0,
        unique_users: uniqueUsers,
        avg_response_time_ms: Math.round(avgResponseTime),
        error_rate: Math.round(errorRate * 10000) / 10000, // 4 decimal places
        storage_used_gb: Math.round(storageUsed * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting usage metrics:', error);
      throw new Error('Failed to get usage metrics');
    }
  }

  /**
   * Get comprehensive security metrics
   */
  async getSecurityMetrics(
    organizationId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<SecurityMetrics> {
    try {
      // Get total access events
      const { count: totalAccessEvents } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .in('event_type', ['read', 'create', 'update', 'delete'])
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Get failed authentications
      const { count: failedAuths } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('event_type', 'authentication')
        .eq('success', false)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Get security violations
      const { count: securityViolations } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('event_type', 'security_violation')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Get encryption operations
      const { count: encryptionOps } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('event_type', 'encryption')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Get key rotations
      const { count: keyRotations } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('event_type', 'key_rotation')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Calculate compliance score based on various factors
      const complianceScore = await this.calculateComplianceScore(
        organizationId,
        dateRange,
      );

      // Get vulnerability count from security scans
      const { count: vulnerabilityCount } = await this.supabase
        .from('security_scan_results')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('status', 'open');

      // Calculate risk score (0-100, lower is better)
      const riskScore = await this.calculateRiskScore(organizationId, {
        securityViolations: securityViolations || 0,
        vulnerabilityCount: vulnerabilityCount || 0,
        failedAuths: failedAuths || 0,
        complianceScore,
      });

      return {
        total_access_events: totalAccessEvents || 0,
        failed_authentications: failedAuths || 0,
        security_violations: securityViolations || 0,
        encryption_operations: encryptionOps || 0,
        key_rotations: keyRotations || 0,
        compliance_score: complianceScore,
        vulnerability_count: vulnerabilityCount || 0,
        risk_score: riskScore,
      };
    } catch (error) {
      console.error('Error getting security metrics:', error);
      throw new Error('Failed to get security metrics');
    }
  }

  /**
   * Get operational metrics
   */
  async getOperationalMetrics(
    organizationId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<OperationalMetrics> {
    try {
      // Get system uptime from health metrics
      const { data: healthMetrics } = await this.supabase
        .from('system_health_metrics')
        .select('status')
        .eq('organization_id', organizationId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const totalHealthChecks = healthMetrics?.length || 1;
      const healthyChecks =
        healthMetrics?.filter((hm) => hm.status === 'healthy').length || 0;
      const systemUptime =
        totalHealthChecks > 0 ? (healthyChecks / totalHealthChecks) * 100 : 100;

      // Get deployment success rate
      const { data: deployments } = await this.supabase
        .from('audit_logs')
        .select('success')
        .eq('organization_id', organizationId)
        .eq('event_type', 'deployment')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const totalDeployments = deployments?.length || 1;
      const successfulDeployments =
        deployments?.filter((d) => d.success).length || 0;
      const deploymentSuccessRate =
        totalDeployments > 0
          ? (successfulDeployments / totalDeployments) * 100
          : 100;

      // Get backup success rate (placeholder - would come from backup system)
      const backupSuccessRate = 99.5; // Placeholder

      // Get average deployment time
      const { data: deploymentTimes } = await this.supabase
        .from('deployment_metrics')
        .select('duration_minutes')
        .eq('organization_id', organizationId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const avgDeploymentTime =
        deploymentTimes && deploymentTimes.length > 0
          ? deploymentTimes.reduce((sum, dt) => sum + dt.duration_minutes, 0) /
            deploymentTimes.length
          : 0;

      // Get total alerts sent
      const { count: totalAlerts } = await this.supabase
        .from('alert_events')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Get resolved incidents
      const { count: resolvedIncidents } = await this.supabase
        .from('alert_events')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('resolved', true)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Calculate MTTR (Mean Time to Resolution)
      const { data: incidentResolutions } = await this.supabase
        .from('alert_events')
        .select('created_at, resolved_at')
        .eq('organization_id', organizationId)
        .eq('resolved', true)
        .not('resolved_at', 'is', null)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      let meanTimeToResolution = 0;
      if (incidentResolutions && incidentResolutions.length > 0) {
        const totalResolutionTime = incidentResolutions.reduce(
          (sum, incident) => {
            const created = new Date(incident.created_at);
            const resolved = new Date(incident.resolved_at);
            return sum + (resolved.getTime() - created.getTime());
          },
          0,
        );
        meanTimeToResolution =
          totalResolutionTime / incidentResolutions.length / (1000 * 60 * 60); // Convert to hours
      }

      // Customer satisfaction score (placeholder - would come from surveys)
      const customerSatisfactionScore = 4.2; // Out of 5

      return {
        system_uptime: Math.round(systemUptime * 100) / 100,
        deployment_success_rate: Math.round(deploymentSuccessRate * 100) / 100,
        backup_success_rate: backupSuccessRate,
        avg_deployment_time_minutes: Math.round(avgDeploymentTime * 100) / 100,
        total_alerts_sent: totalAlerts || 0,
        resolved_incidents: resolvedIncidents || 0,
        mean_time_to_resolution_hours:
          Math.round(meanTimeToResolution * 100) / 100,
        customer_satisfaction_score: customerSatisfactionScore,
      };
    } catch (error) {
      console.error('Error getting operational metrics:', error);
      throw new Error('Failed to get operational metrics');
    }
  }

  /**
   * Get wedding day specific metrics
   */
  async getWeddingDayMetrics(
    organizationId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<WeddingDayMetrics> {
    try {
      // Get total weddings supported
      const { count: totalWeddings } = await this.supabase
        .from('wedding_day_alerts')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Get Saturday uptime (wedding day is typically Saturday)
      const { data: saturdayHealth } = await this.supabase
        .from('system_health_metrics')
        .select('status, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Filter for Saturdays
      const saturdayMetrics =
        saturdayHealth?.filter((metric) => {
          const date = new Date(metric.created_at);
          return date.getDay() === 6; // Saturday
        }) || [];

      const saturdayHealthyCount = saturdayMetrics.filter(
        (sm) => sm.status === 'healthy',
      ).length;
      const saturdayUptime =
        saturdayMetrics.length > 0
          ? (saturdayHealthyCount / saturdayMetrics.length) * 100
          : 100;

      // Get wedding day incidents
      const { count: weddingDayIncidents } = await this.supabase
        .from('wedding_day_alerts')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Get emergency escalations
      const { count: emergencyEscalations } = await this.supabase
        .from('wedding_day_alerts')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('priority', 'P0')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Calculate average resolution time for wedding day issues
      const { data: weddingResolutions } = await this.supabase
        .from('wedding_day_alerts')
        .select('created_at, resolved_at')
        .eq('organization_id', organizationId)
        .eq('resolved', true)
        .not('resolved_at', 'is', null)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      let avgResolutionTime = 0;
      if (weddingResolutions && weddingResolutions.length > 0) {
        const totalTime = weddingResolutions.reduce((sum, resolution) => {
          const created = new Date(resolution.created_at);
          const resolved = new Date(resolution.resolved_at);
          return sum + (resolved.getTime() - created.getTime());
        }, 0);
        avgResolutionTime = totalTime / weddingResolutions.length / (1000 * 60); // Convert to minutes
      }

      // Supplier satisfaction rating (placeholder - would come from post-wedding surveys)
      const supplierSatisfactionRating = 4.7; // Out of 5

      // Count zero-downtime weddings (weddings with no critical incidents)
      const { data: allWeddings } = await this.supabase
        .from('wedding_day_alerts')
        .select('id, priority')
        .eq('organization_id', organizationId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const weddingsWithCriticalIssues = new Set(
        allWeddings?.filter((w) => w.priority === 'P0').map((w) => w.id) || [],
      );
      const zeroDowntimeWeddings =
        (totalWeddings || 0) - weddingsWithCriticalIssues.size;

      // Get critical alerts during weddings
      const { count: criticalAlertsDuringWeddings } = await this.supabase
        .from('alert_events')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('severity', 'CRITICAL')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      return {
        total_weddings_supported: totalWeddings || 0,
        saturday_uptime: Math.round(saturdayUptime * 100) / 100,
        wedding_day_incidents: weddingDayIncidents || 0,
        emergency_escalations: emergencyEscalations || 0,
        avg_resolution_time_minutes: Math.round(avgResolutionTime * 100) / 100,
        supplier_satisfaction_rating: supplierSatisfactionRating,
        zero_downtime_weddings: Math.max(0, zeroDowntimeWeddings),
        critical_alerts_during_weddings: criticalAlertsDuringWeddings || 0,
      };
    } catch (error) {
      console.error('Error getting wedding day metrics:', error);
      throw new Error('Failed to get wedding day metrics');
    }
  }

  /**
   * Create custom dashboard for organization
   */
  async createDashboard(
    organizationId: string,
    name: string,
    widgets: DashboardWidget[],
  ): Promise<{ dashboard_id: string }> {
    try {
      const { data, error } = await this.supabase
        .from('analytics_dashboards')
        .insert({
          organization_id: organizationId,
          name,
          widgets: widgets,
          created_by: organizationId, // In production would be actual user ID
          is_default: false,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create dashboard: ${error.message}`);
      }

      return { dashboard_id: data.id };
    } catch (error) {
      console.error('Error creating dashboard:', error);
      throw new Error('Failed to create dashboard');
    }
  }

  /**
   * Get dashboard data for rendering
   */
  async getDashboardData(
    organizationId: string,
    dashboardId: string,
  ): Promise<{
    dashboard: any;
    widget_data: Array<{ widget_id: string; data: any; last_updated: Date }>;
  }> {
    try {
      // Get dashboard configuration
      const { data: dashboard } = await this.supabase
        .from('analytics_dashboards')
        .select('*')
        .eq('id', dashboardId)
        .eq('organization_id', organizationId)
        .single();

      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Execute queries for each widget
      const widgetData = [];
      for (const widget of dashboard.widgets || []) {
        try {
          const result = await this.executeQuery(
            organizationId,
            widget.configuration.query,
          );
          widgetData.push({
            widget_id: widget.widget_id,
            data: result,
            last_updated: new Date(),
          });
        } catch (error) {
          console.error(`Error loading widget ${widget.widget_id}:`, error);
          widgetData.push({
            widget_id: widget.widget_id,
            data: { error: 'Failed to load widget data' },
            last_updated: new Date(),
          });
        }
      }

      return {
        dashboard,
        widget_data: widgetData,
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw new Error('Failed to get dashboard data');
    }
  }

  // Helper methods
  private buildAnalyticsQuery(
    organizationId: string,
    query: AnalyticsQuery,
  ): string {
    // This would build complex SQL queries based on the analytics requirements
    // Simplified version for demonstration
    const dateFilter = `created_at >= '${query.date_range.start.toISOString()}' AND created_at <= '${query.date_range.end.toISOString()}'`;
    const orgFilter = `organization_id = '${organizationId}'`;

    return `
      SELECT ${query.metrics.join(', ')}${query.dimensions ? ', ' + query.dimensions.join(', ') : ''}
      FROM analytics_view
      WHERE ${orgFilter} AND ${dateFilter}
      ${query.dimensions ? `GROUP BY ${query.dimensions.join(', ')}` : ''}
      ORDER BY created_at DESC
      LIMIT ${query.limit || 1000}
    `;
  }

  private async calculateComplianceScore(
    organizationId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<number> {
    // Calculate compliance score based on various factors
    let score = 100;

    // Check for required security policies
    const { count: missingPolicies } = await this.supabase
      .from('security_policies')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('status', 'missing');

    score -= (missingPolicies || 0) * 10;

    // Check for recent security violations
    const { count: recentViolations } = await this.supabase
      .from('audit_logs')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('event_type', 'security_violation')
      .gte('created_at', dateRange.start.toISOString());

    score -= (recentViolations || 0) * 5;

    // Check for encryption compliance
    const { count: unencryptedSecrets } = await this.supabase
      .from('environment_variables')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .gte('classification_level', 5) // CONFIDENTIAL or higher
      .eq('is_encrypted', false);

    score -= (unencryptedSecrets || 0) * 15;

    return Math.max(0, Math.min(100, score));
  }

  private async calculateRiskScore(
    organizationId: string,
    factors: {
      securityViolations: number;
      vulnerabilityCount: number;
      failedAuths: number;
      complianceScore: number;
    },
  ): Promise<number> {
    let riskScore = 0;

    // Higher security violations = higher risk
    riskScore += factors.securityViolations * 5;

    // Higher vulnerability count = higher risk
    riskScore += factors.vulnerabilityCount * 3;

    // Higher failed authentications = higher risk
    riskScore += factors.failedAuths * 2;

    // Lower compliance score = higher risk
    riskScore += (100 - factors.complianceScore) * 0.5;

    return Math.min(100, Math.max(0, riskScore));
  }
}
