// lib/services/api-analytics-service.ts
// WS-233: API Analytics Service for monitoring dashboard
// Team B - Backend Implementation
// Comprehensive analytics processing and dashboard data

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export interface AnalyticsTimeRange {
  startDate: Date;
  endDate: Date;
  period: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
}

export interface OrganizationUsageStats {
  organizationId: string;
  organizationName: string;
  subscriptionTier: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  totalBandwidth: number;
  quotaUtilization: number;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
    avgTime: number;
    errorRate: number;
  }>;
  hourlyDistribution: Record<string, number>;
  errorBreakdown: Array<{
    statusCode: number;
    count: number;
    percentage: number;
  }>;
}

export interface SystemHealthMetrics {
  timestamp: Date;
  totalRequestsPerMinute: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRatePercentage: number;
  systemResources: {
    cpuUsage: number;
    memoryUsage: number;
    databasePoolUsage: number;
    redisMemoryUsage: number;
  };
  topEndpoints: Array<{
    endpoint: string;
    requestCount: number;
    avgResponseTime: number;
    errorRate: number;
  }>;
  alertsTriggered: number;
  anomaliesDetected: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

export interface UsageTrends {
  period: string;
  requestVolume: Array<{ timestamp: Date; count: number }>;
  responseTimePattern: Array<{
    timestamp: Date;
    avgTime: number;
    p95Time: number;
  }>;
  errorRatePattern: Array<{ timestamp: Date; errorRate: number }>;
  topGrowthEndpoints: Array<{ endpoint: string; growthRate: number }>;
  tierDistribution: Record<string, number>;
  geographicDistribution: Record<string, number>;
}

export interface AlertConfiguration {
  id?: string;
  organizationId?: string;
  ruleName: string;
  ruleType:
    | 'QUOTA_THRESHOLD'
    | 'ERROR_RATE'
    | 'LATENCY_SPIKE'
    | 'TRAFFIC_ANOMALY'
    | 'SYSTEM_HEALTH';
  thresholdValue: number;
  thresholdOperator: '>' | '>=' | '<' | '<=' | '=' | '!=';
  thresholdUnit: 'PERCENTAGE' | 'COUNT' | 'MILLISECONDS' | 'BYTES';
  evaluationWindowMinutes: number;
  notificationChannels: string[];
  isEnabled: boolean;
}

export class ApiAnalyticsService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  /**
   * Get comprehensive usage analytics for an organization
   */
  async getOrganizationAnalytics(
    organizationId: string,
    timeRange: AnalyticsTimeRange,
  ): Promise<OrganizationUsageStats | null> {
    try {
      // First, get the organization details
      const { data: orgData } = await this.supabase
        .from('organizations')
        .select(
          `
          id,
          name,
          subscriptions!inner(tier, status)
        `,
        )
        .eq('id', organizationId)
        .eq('subscriptions.status', 'active')
        .single();

      if (!orgData) return null;

      // Get usage statistics for the time period
      const { data: usageStats } = await this.supabase
        .from('api_usage_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', timeRange.startDate.toISOString())
        .lte('created_at', timeRange.endDate.toISOString());

      if (!usageStats?.length) {
        return {
          organizationId,
          organizationName: orgData.name,
          subscriptionTier: orgData.subscriptions[0]?.tier || 'FREE',
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          rateLimitedRequests: 0,
          avgResponseTime: 0,
          p95ResponseTime: 0,
          totalBandwidth: 0,
          quotaUtilization: 0,
          topEndpoints: [],
          hourlyDistribution: {},
          errorBreakdown: [],
        };
      }

      // Calculate statistics
      const totalRequests = usageStats.length;
      const successfulRequests = usageStats.filter(
        (log) => log.status_code < 400,
      ).length;
      const failedRequests = usageStats.filter(
        (log) => log.status_code >= 400,
      ).length;
      const rateLimitedRequests = usageStats.filter(
        (log) => log.is_rate_limited,
      ).length;

      const responseTimes = usageStats
        .map((log) => log.response_time_ms)
        .filter((t) => t > 0);
      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

      const sortedResponseTimes = responseTimes.sort((a, b) => a - b);
      const p95ResponseTime =
        sortedResponseTimes.length > 0
          ? sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)]
          : 0;

      const totalBandwidth = usageStats.reduce(
        (sum, log) => sum + (log.response_size_bytes || 0),
        0,
      );

      // Top endpoints analysis
      const endpointStats = new Map<
        string,
        { count: number; totalTime: number; errors: number }
      >();

      usageStats.forEach((log) => {
        const endpoint = log.endpoint;
        const current = endpointStats.get(endpoint) || {
          count: 0,
          totalTime: 0,
          errors: 0,
        };
        current.count++;
        current.totalTime += log.response_time_ms || 0;
        if (log.status_code >= 400) current.errors++;
        endpointStats.set(endpoint, current);
      });

      const topEndpoints = Array.from(endpointStats.entries())
        .map(([endpoint, stats]) => ({
          endpoint,
          count: stats.count,
          avgTime: stats.totalTime / stats.count,
          errorRate: (stats.errors / stats.count) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Hourly distribution
      const hourlyDistribution: Record<string, number> = {};
      usageStats.forEach((log) => {
        const hour = new Date(log.created_at)
          .getHours()
          .toString()
          .padStart(2, '0');
        hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      });

      // Error breakdown
      const errorCounts = new Map<number, number>();
      usageStats.forEach((log) => {
        if (log.status_code >= 400) {
          errorCounts.set(
            log.status_code,
            (errorCounts.get(log.status_code) || 0) + 1,
          );
        }
      });

      const errorBreakdown = Array.from(errorCounts.entries())
        .map(([statusCode, count]) => ({
          statusCode,
          count,
          percentage: (count / failedRequests) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      // Get quota utilization
      const { data: quotaInfo } = await this.supabase.rpc(
        'check_api_usage_limits',
        { p_organization_id: organizationId },
      );

      const quotaUtilization =
        quotaInfo?.daily_limit > 0
          ? ((quotaInfo.daily_usage || 0) / quotaInfo.daily_limit) * 100
          : 0;

      return {
        organizationId,
        organizationName: orgData.name,
        subscriptionTier: orgData.subscriptions[0]?.tier || 'FREE',
        totalRequests,
        successfulRequests,
        failedRequests,
        rateLimitedRequests,
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
        totalBandwidth,
        quotaUtilization: Math.round(quotaUtilization * 100) / 100,
        topEndpoints,
        hourlyDistribution,
        errorBreakdown,
      };
    } catch (error) {
      console.error(
        '[API Analytics] Failed to get organization analytics:',
        error,
      );
      return null;
    }
  }

  /**
   * Get system-wide health metrics (admin only)
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics | null> {
    try {
      // Get the latest health metrics entry
      const { data: healthData } = await this.supabase
        .from('api_health_metrics')
        .select('*')
        .order('metric_timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!healthData) return null;

      return {
        timestamp: new Date(healthData.metric_timestamp),
        totalRequestsPerMinute: healthData.total_requests_per_minute,
        averageResponseTime: healthData.average_response_time_ms,
        p95ResponseTime: healthData.p95_response_time_ms,
        p99ResponseTime: healthData.p99_response_time_ms,
        errorRatePercentage: healthData.error_rate_percentage,
        systemResources: {
          cpuUsage: healthData.cpu_usage_percentage || 0,
          memoryUsage: healthData.memory_usage_percentage || 0,
          databasePoolUsage: healthData.database_connection_pool_usage || 0,
          redisMemoryUsage: healthData.redis_memory_usage_percentage || 0,
        },
        topEndpoints: healthData.top_endpoints || [],
        alertsTriggered: healthData.alerts_triggered || 0,
        anomaliesDetected: healthData.is_anomaly
          ? [
              {
                type: healthData.anomaly_type || 'unknown',
                severity: healthData.anomaly_severity || 'LOW',
                description: `${healthData.anomaly_type} detected at ${healthData.metric_timestamp}`,
              },
            ]
          : [],
      };
    } catch (error) {
      console.error(
        '[API Analytics] Failed to get system health metrics:',
        error,
      );
      return null;
    }
  }

  /**
   * Get usage trends over time
   */
  async getUsageTrends(
    organizationId?: string,
    timeRange: AnalyticsTimeRange = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endDate: new Date(),
      period: 'DAY',
    },
  ): Promise<UsageTrends | null> {
    try {
      let query = this.supabase
        .from('api_usage_analytics')
        .select('*')
        .gte('period_start', timeRange.startDate.toISOString())
        .lte('period_end', timeRange.endDate.toISOString())
        .eq('period_type', timeRange.period)
        .order('period_start', { ascending: true });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: analyticsData } = await query;

      if (!analyticsData?.length) return null;

      // Process request volume trends
      const requestVolume = analyticsData.map((record) => ({
        timestamp: new Date(record.period_start),
        count: record.total_requests,
      }));

      // Process response time patterns
      const responseTimePattern = analyticsData.map((record) => ({
        timestamp: new Date(record.period_start),
        avgTime: record.avg_response_time_ms,
        p95Time: record.p95_response_time_ms,
      }));

      // Process error rate patterns
      const errorRatePattern = analyticsData.map((record) => ({
        timestamp: new Date(record.period_start),
        errorRate:
          record.total_requests > 0
            ? (record.failed_requests / record.total_requests) * 100
            : 0,
      }));

      // Calculate endpoint growth rates
      const endpointGrowth = new Map<string, number[]>();
      analyticsData.forEach((record) => {
        if (record.top_endpoints) {
          record.top_endpoints.forEach((endpoint: any) => {
            if (!endpointGrowth.has(endpoint.endpoint)) {
              endpointGrowth.set(endpoint.endpoint, []);
            }
            endpointGrowth.get(endpoint.endpoint)!.push(endpoint.count);
          });
        }
      });

      const topGrowthEndpoints = Array.from(endpointGrowth.entries())
        .map(([endpoint, counts]) => {
          if (counts.length < 2) return { endpoint, growthRate: 0 };
          const growthRate =
            ((counts[counts.length - 1] - counts[0]) / counts[0]) * 100;
          return { endpoint, growthRate: Math.round(growthRate * 100) / 100 };
        })
        .sort((a, b) => b.growthRate - a.growthRate)
        .slice(0, 5);

      // Aggregate tier distribution and geographic data
      const tierDistribution: Record<string, number> = {};
      const geographicDistribution: Record<string, number> = {};

      analyticsData.forEach((record) => {
        // This would need to be calculated from raw usage logs
        // For now, we'll return empty objects as placeholders
      });

      return {
        period: timeRange.period,
        requestVolume,
        responseTimePattern,
        errorRatePattern,
        topGrowthEndpoints,
        tierDistribution,
        geographicDistribution,
      };
    } catch (error) {
      console.error('[API Analytics] Failed to get usage trends:', error);
      return null;
    }
  }

  /**
   * Configure alert rules for an organization
   */
  async configureAlerts(
    organizationId: string,
    alertConfig: AlertConfiguration,
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('api_alert_rules')
        .insert({
          organization_id: organizationId,
          rule_name: alertConfig.ruleName,
          rule_type: alertConfig.ruleType,
          threshold_value: alertConfig.thresholdValue,
          threshold_operator: alertConfig.thresholdOperator,
          threshold_unit: alertConfig.thresholdUnit,
          evaluation_window_minutes: alertConfig.evaluationWindowMinutes,
          notification_channels: alertConfig.notificationChannels,
          is_enabled: alertConfig.isEnabled,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[API Analytics] Failed to create alert rule:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('[API Analytics] Alert configuration error:', error);
      return null;
    }
  }

  /**
   * Get active alert incidents for an organization
   */
  async getActiveIncidents(organizationId?: string): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      severity: string;
      triggeredAt: Date;
      status: string;
      affectedEndpoints: string[];
    }>
  > {
    try {
      let query = this.supabase
        .from('api_alert_incidents')
        .select(
          `
          id,
          incident_title,
          incident_description,
          severity,
          triggered_at,
          status,
          affected_endpoints
        `,
        )
        .eq('status', 'ACTIVE')
        .order('triggered_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: incidents } = await query;

      return (
        incidents?.map((incident) => ({
          id: incident.id,
          title: incident.incident_title,
          description: incident.incident_description || '',
          severity: incident.severity,
          triggeredAt: new Date(incident.triggered_at),
          status: incident.status,
          affectedEndpoints: incident.affected_endpoints || [],
        })) || []
      );
    } catch (error) {
      console.error('[API Analytics] Failed to get incidents:', error);
      return [];
    }
  }

  /**
   * Generate usage analytics aggregations (background job)
   */
  async generateAnalyticsAggregations(
    organizationId?: string,
    periodType: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' = 'DAY',
  ): Promise<boolean> {
    try {
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      // Calculate period boundaries
      switch (periodType) {
        case 'HOUR':
          periodStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            now.getHours() - 1,
          );
          periodEnd = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            now.getHours(),
          );
          break;
        case 'DAY':
          periodStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1,
          );
          periodEnd = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case 'WEEK':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay() - 7);
          periodStart = new Date(
            weekStart.getFullYear(),
            weekStart.getMonth(),
            weekStart.getDate(),
          );
          periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'MONTH':
          periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      // If organizationId specified, aggregate for single org
      if (organizationId) {
        const { error } = await this.supabase.rpc(
          'aggregate_api_usage_analytics',
          {
            p_organization_id: organizationId,
            p_period_start: periodStart.toISOString(),
            p_period_end: periodEnd.toISOString(),
            p_period_type: periodType,
          },
        );

        return !error;
      }

      // Otherwise, aggregate for all organizations
      const { data: organizations } = await this.supabase
        .from('organizations')
        .select('id');

      if (!organizations) return false;

      const promises = organizations.map((org) =>
        this.supabase.rpc('aggregate_api_usage_analytics', {
          p_organization_id: org.id,
          p_period_start: periodStart.toISOString(),
          p_period_end: periodEnd.toISOString(),
          p_period_type: periodType,
        }),
      );

      const results = await Promise.allSettled(promises);
      const failures = results.filter((result) => result.status === 'rejected');

      if (failures.length > 0) {
        console.error(
          `[API Analytics] ${failures.length} aggregation failures:`,
          failures,
        );
      }

      return failures.length === 0;
    } catch (error) {
      console.error('[API Analytics] Analytics aggregation error:', error);
      return false;
    }
  }

  /**
   * Health check for analytics service
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const checks = {
        database: false,
        recentData: false,
        aggregations: false,
      };

      // Test database connection
      const { error: dbError } = await this.supabase
        .from('api_usage_logs')
        .select('id')
        .limit(1);
      checks.database = !dbError;

      // Check for recent data (last hour)
      const { data: recentData } = await this.supabase
        .from('api_usage_logs')
        .select('id')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(1);
      checks.recentData = !!recentData?.length;

      // Check analytics aggregations (last day)
      const { data: analyticsData } = await this.supabase
        .from('api_usage_analytics')
        .select('id')
        .gte(
          'period_start',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .limit(1);
      checks.aggregations = !!analyticsData?.length;

      const allHealthy = Object.values(checks).every((check) => check);

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        details: checks,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }
}

// Zod validation schemas
export const AnalyticsTimeRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  period: z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH']),
});

export const AlertConfigurationSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  ruleName: z.string().min(1).max(100),
  ruleType: z.enum([
    'QUOTA_THRESHOLD',
    'ERROR_RATE',
    'LATENCY_SPIKE',
    'TRAFFIC_ANOMALY',
    'SYSTEM_HEALTH',
  ]),
  thresholdValue: z.number().positive(),
  thresholdOperator: z.enum(['>', '>=', '<', '<=', '=', '!=']),
  thresholdUnit: z.enum(['PERCENTAGE', 'COUNT', 'MILLISECONDS', 'BYTES']),
  evaluationWindowMinutes: z.number().int().min(1).max(1440),
  notificationChannels: z.array(z.string()).min(1),
  isEnabled: z.boolean(),
});

// Singleton instance
let analyticsServiceInstance: ApiAnalyticsService | null = null;

export function getApiAnalyticsService(): ApiAnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new ApiAnalyticsService();
  }
  return analyticsServiceInstance;
}

export default ApiAnalyticsService;
