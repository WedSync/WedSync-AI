/**
 * WeatherHealthMonitor - Integration Health Monitoring for Weather Services
 * Monitors health, performance, and reliability of weather integrations
 * WS-220: Weather API Integration - Team C Round 1
 */

import { createSupabaseClient } from '@/lib/supabase/client';
import { weatherSync } from './WeatherSync';
import { weatherNotificationService } from './WeatherNotificationService';
import { weatherTimelineAnalyzer } from './WeatherTimelineAnalyzer';
import { weatherDataValidator } from './WeatherDataValidator';

export interface HealthMetric {
  id: string;
  service: string;
  metric_name: string;
  value: number;
  unit: string;
  threshold_warning: number;
  threshold_critical: number;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  timestamp: string;
  tags: Record<string, string>;
}

export interface ServiceHealth {
  service_name: string;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  uptime_percentage: number;
  response_time_ms: number;
  error_rate_percentage: number;
  last_check: string;
  issues: HealthIssue[];
  performance_metrics: PerformanceMetric[];
}

export interface HealthIssue {
  id: string;
  service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  first_detected: string;
  last_seen: string;
  impact: string;
  resolution_status: 'open' | 'investigating' | 'resolved' | 'ignored';
  resolution_notes?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'improving' | 'stable' | 'degrading';
  threshold_status: 'good' | 'warning' | 'critical';
}

export interface IntegrationDashboard {
  overall_status: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealth[];
  alerts: HealthIssue[];
  performance_summary: {
    avg_response_time: number;
    total_requests_24h: number;
    error_rate_24h: number;
    uptime_24h: number;
  };
  last_updated: string;
}

export class WeatherHealthMonitor {
  private supabase;
  private readonly MONITORING_INTERVAL = 60 * 1000; // 1 minute
  private readonly HEALTH_CHECK_TIMEOUT = 10 * 1000; // 10 seconds
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metrics: Map<string, HealthMetric[]> = new Map();
  private readonly MAX_METRICS_PER_SERVICE = 100;

  constructor() {
    this.supabase = createSupabaseClient();
  }

  /**
   * Start health monitoring for all weather services
   */
  async startMonitoring(): Promise<void> {
    try {
      // Stop existing monitoring
      this.stopMonitoring();

      // Start periodic health checks
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.performHealthChecks();
        } catch (error) {
          console.error('Health check failed:', error);
          await this.logHealthIssue(
            'monitor',
            'high',
            'Health Check Failed',
            error.message,
          );
        }
      }, this.MONITORING_INTERVAL);

      // Perform initial health check
      await this.performHealthChecks();

      console.log('Weather health monitoring started');
    } catch (error) {
      console.error('Failed to start health monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Weather health monitoring stopped');
    }
  }

  /**
   * Perform comprehensive health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    const services = [
      'weather_api',
      'weather_sync',
      'notification_service',
      'timeline_analyzer',
      'data_validator',
      'database',
      'supabase_realtime',
    ];

    const healthChecks = services.map((service) =>
      this.checkServiceHealth(service),
    );

    try {
      const results = await Promise.allSettled(healthChecks);

      // Process results and update metrics
      for (let i = 0; i < results.length; i++) {
        const service = services[i];
        const result = results[i];

        if (result.status === 'rejected') {
          await this.recordHealthMetric(
            service,
            'availability',
            0,
            'boolean',
            1,
            1,
          );
          await this.logHealthIssue(
            service,
            'critical',
            'Service Health Check Failed',
            result.reason?.message || 'Unknown error',
          );
        } else {
          await this.processHealthCheckResult(service, result.value);
        }
      }

      // Check for system-wide issues
      await this.checkSystemHealth();
    } catch (error) {
      console.error('Health checks failed:', error);
    }
  }

  /**
   * Check health of individual service
   */
  private async checkServiceHealth(service: string): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      let serviceHealth: ServiceHealth = {
        service_name: service,
        status: 'unknown',
        uptime_percentage: 0,
        response_time_ms: 0,
        error_rate_percentage: 0,
        last_check: new Date().toISOString(),
        issues: [],
        performance_metrics: [],
      };

      switch (service) {
        case 'weather_api':
          serviceHealth = await this.checkWeatherAPIHealth();
          break;
        case 'weather_sync':
          serviceHealth = await this.checkWeatherSyncHealth();
          break;
        case 'notification_service':
          serviceHealth = await this.checkNotificationServiceHealth();
          break;
        case 'timeline_analyzer':
          serviceHealth = await this.checkTimelineAnalyzerHealth();
          break;
        case 'data_validator':
          serviceHealth = await this.checkDataValidatorHealth();
          break;
        case 'database':
          serviceHealth = await this.checkDatabaseHealth();
          break;
        case 'supabase_realtime':
          serviceHealth = await this.checkSupabaseRealtimeHealth();
          break;
        default:
          throw new Error(`Unknown service: ${service}`);
      }

      const responseTime = Date.now() - startTime;
      serviceHealth.response_time_ms = responseTime;

      return serviceHealth;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        service_name: service,
        status: 'critical',
        uptime_percentage: 0,
        response_time_ms: responseTime,
        error_rate_percentage: 100,
        last_check: new Date().toISOString(),
        issues: [
          {
            id: `${service}_${Date.now()}`,
            service,
            severity: 'critical',
            title: 'Service Unavailable',
            description: error.message,
            first_detected: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            impact: 'Service completely unavailable',
            resolution_status: 'open',
          },
        ],
        performance_metrics: [],
      };
    }
  }

  /**
   * Check Weather API health
   */
  private async checkWeatherAPIHealth(): Promise<ServiceHealth> {
    try {
      const testLocation = { latitude: 51.5074, longitude: -0.1278 }; // London
      const apiKey = process.env.WEATHER_API_KEY;

      if (!apiKey) {
        throw new Error('Weather API key not configured');
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${testLocation.latitude}&lon=${testLocation.longitude}&appid=${apiKey}`,
        { signal: AbortSignal.timeout(this.HEALTH_CHECK_TIMEOUT) },
      );

      if (!response.ok) {
        throw new Error(`Weather API returned status ${response.status}`);
      }

      const data = await response.json();

      return {
        service_name: 'weather_api',
        status: 'healthy',
        uptime_percentage: 100,
        response_time_ms: 0, // Will be set by caller
        error_rate_percentage: 0,
        last_check: new Date().toISOString(),
        issues: [],
        performance_metrics: [
          {
            name: 'api_response_size',
            value: JSON.stringify(data).length,
            unit: 'bytes',
            trend: 'stable',
            threshold_status: 'good',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Weather API health check failed: ${error.message}`);
    }
  }

  /**
   * Check Weather Sync service health
   */
  private async checkWeatherSyncHealth(): Promise<ServiceHealth> {
    try {
      // Check if WeatherSync is properly initialized
      const subscriptionsCount = await this.getActiveSubscriptionsCount();

      return {
        service_name: 'weather_sync',
        status: 'healthy',
        uptime_percentage: 100,
        response_time_ms: 0,
        error_rate_percentage: 0,
        last_check: new Date().toISOString(),
        issues: [],
        performance_metrics: [
          {
            name: 'active_subscriptions',
            value: subscriptionsCount,
            unit: 'count',
            trend: 'stable',
            threshold_status: subscriptionsCount > 0 ? 'good' : 'warning',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Weather Sync health check failed: ${error.message}`);
    }
  }

  /**
   * Check Notification Service health
   */
  private async checkNotificationServiceHealth(): Promise<ServiceHealth> {
    try {
      // Check notification logs for recent activity
      const { data: recentLogs, error } = await this.supabase
        .from('notification_logs')
        .select('status')
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .limit(100);

      if (error) throw error;

      const totalNotifications = recentLogs?.length || 0;
      const failedNotifications =
        recentLogs?.filter((log) => log.status === 'failed').length || 0;
      const errorRate =
        totalNotifications > 0
          ? (failedNotifications / totalNotifications) * 100
          : 0;

      return {
        service_name: 'notification_service',
        status:
          errorRate > 10 ? 'critical' : errorRate > 5 ? 'degraded' : 'healthy',
        uptime_percentage:
          totalNotifications > 0
            ? ((totalNotifications - failedNotifications) /
                totalNotifications) *
              100
            : 100,
        response_time_ms: 0,
        error_rate_percentage: errorRate,
        last_check: new Date().toISOString(),
        issues:
          errorRate > 5
            ? [
                {
                  id: `notification_error_${Date.now()}`,
                  service: 'notification_service',
                  severity: errorRate > 10 ? 'high' : 'medium',
                  title: 'High Notification Error Rate',
                  description: `${errorRate.toFixed(1)}% of notifications failed in the last 24 hours`,
                  first_detected: new Date().toISOString(),
                  last_seen: new Date().toISOString(),
                  impact: 'Users may not receive weather alerts',
                  resolution_status: 'open',
                },
              ]
            : [],
        performance_metrics: [
          {
            name: 'notifications_24h',
            value: totalNotifications,
            unit: 'count',
            trend: 'stable',
            threshold_status: 'good',
          },
          {
            name: 'error_rate',
            value: errorRate,
            unit: 'percentage',
            trend: errorRate > 5 ? 'degrading' : 'stable',
            threshold_status:
              errorRate > 10 ? 'critical' : errorRate > 5 ? 'warning' : 'good',
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Notification service health check failed: ${error.message}`,
      );
    }
  }

  /**
   * Check Timeline Analyzer health
   */
  private async checkTimelineAnalyzerHealth(): Promise<ServiceHealth> {
    try {
      // Check recent analysis activity
      const { data: recentAnalyses, error } = await this.supabase
        .from('weather_impact_assessments')
        .select('impact_level')
        .gte(
          'last_analyzed',
          new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        ) // Last hour
        .limit(100);

      if (error) throw error;

      const analysisCount = recentAnalyses?.length || 0;

      return {
        service_name: 'timeline_analyzer',
        status: 'healthy',
        uptime_percentage: 100,
        response_time_ms: 0,
        error_rate_percentage: 0,
        last_check: new Date().toISOString(),
        issues: [],
        performance_metrics: [
          {
            name: 'analyses_last_hour',
            value: analysisCount,
            unit: 'count',
            trend: 'stable',
            threshold_status: 'good',
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Timeline analyzer health check failed: ${error.message}`,
      );
    }
  }

  /**
   * Check Data Validator health
   */
  private async checkDataValidatorHealth(): Promise<ServiceHealth> {
    try {
      const stats = weatherDataValidator.getValidationStats();

      return {
        service_name: 'data_validator',
        status: 'healthy',
        uptime_percentage: 100,
        response_time_ms: 0,
        error_rate_percentage: 0,
        last_check: new Date().toISOString(),
        issues: [],
        performance_metrics: [
          {
            name: 'cache_size',
            value: stats.cacheSize,
            unit: 'count',
            trend: 'stable',
            threshold_status: 'good',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Data validator health check failed: ${error.message}`);
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();

      // Simple query to test database connectivity
      const { data, error } = await this.supabase
        .from('weather_subscriptions')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      const queryTime = Date.now() - startTime;

      if (error) throw error;

      return {
        service_name: 'database',
        status: queryTime > 1000 ? 'degraded' : 'healthy',
        uptime_percentage: 100,
        response_time_ms: queryTime,
        error_rate_percentage: 0,
        last_check: new Date().toISOString(),
        issues:
          queryTime > 1000
            ? [
                {
                  id: `db_slow_${Date.now()}`,
                  service: 'database',
                  severity: 'medium',
                  title: 'Slow Database Response',
                  description: `Database query took ${queryTime}ms`,
                  first_detected: new Date().toISOString(),
                  last_seen: new Date().toISOString(),
                  impact: 'Slower weather data processing',
                  resolution_status: 'open',
                },
              ]
            : [],
        performance_metrics: [
          {
            name: 'query_response_time',
            value: queryTime,
            unit: 'milliseconds',
            trend: 'stable',
            threshold_status: queryTime > 1000 ? 'warning' : 'good',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  /**
   * Check Supabase Realtime health
   */
  private async checkSupabaseRealtimeHealth(): Promise<ServiceHealth> {
    try {
      // Test realtime connection
      const channel = this.supabase.channel('health_check');

      const connectionPromise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Realtime connection timeout'));
        }, this.HEALTH_CHECK_TIMEOUT);

        channel
          .on('system', {}, (payload) => {
            if (payload.status === 'ok') {
              clearTimeout(timeout);
              resolve(true);
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              resolve(true);
            } else if (
              status === 'CHANNEL_ERROR' ||
              status === 'TIMED_OUT' ||
              status === 'CLOSED'
            ) {
              clearTimeout(timeout);
              reject(new Error(`Realtime connection failed: ${status}`));
            }
          });
      });

      await connectionPromise;

      // Clean up
      await channel.unsubscribe();

      return {
        service_name: 'supabase_realtime',
        status: 'healthy',
        uptime_percentage: 100,
        response_time_ms: 0,
        error_rate_percentage: 0,
        last_check: new Date().toISOString(),
        issues: [],
        performance_metrics: [],
      };
    } catch (error) {
      throw new Error(
        `Supabase Realtime health check failed: ${error.message}`,
      );
    }
  }

  /**
   * Process health check results
   */
  private async processHealthCheckResult(
    service: string,
    healthResult: ServiceHealth,
  ): Promise<void> {
    try {
      // Record metrics
      await this.recordHealthMetric(
        service,
        'response_time',
        healthResult.response_time_ms,
        'milliseconds',
        1000,
        5000,
      );
      await this.recordHealthMetric(
        service,
        'uptime',
        healthResult.uptime_percentage,
        'percentage',
        95,
        90,
      );
      await this.recordHealthMetric(
        service,
        'error_rate',
        healthResult.error_rate_percentage,
        'percentage',
        5,
        10,
      );

      // Store service health
      await this.storeServiceHealth(healthResult);

      // Process any issues
      for (const issue of healthResult.issues) {
        await this.storeHealthIssue(issue);
      }
    } catch (error) {
      console.error(
        `Failed to process health check result for ${service}:`,
        error,
      );
    }
  }

  /**
   * Record health metric
   */
  private async recordHealthMetric(
    service: string,
    metricName: string,
    value: number,
    unit: string,
    thresholdWarning: number,
    thresholdCritical: number,
  ): Promise<void> {
    const metric: HealthMetric = {
      id: `${service}_${metricName}_${Date.now()}`,
      service,
      metric_name: metricName,
      value,
      unit,
      threshold_warning: thresholdWarning,
      threshold_critical: thresholdCritical,
      status: this.determineMetricStatus(
        value,
        thresholdWarning,
        thresholdCritical,
        unit,
      ),
      timestamp: new Date().toISOString(),
      tags: { service },
    };

    // Store in memory for quick access
    if (!this.metrics.has(service)) {
      this.metrics.set(service, []);
    }

    const serviceMetrics = this.metrics.get(service)!;
    serviceMetrics.push(metric);

    // Keep only recent metrics
    if (serviceMetrics.length > this.MAX_METRICS_PER_SERVICE) {
      serviceMetrics.splice(
        0,
        serviceMetrics.length - this.MAX_METRICS_PER_SERVICE,
      );
    }

    // Store in database
    await this.storeHealthMetric(metric);
  }

  /**
   * Determine metric status based on thresholds
   */
  private determineMetricStatus(
    value: number,
    warningThreshold: number,
    criticalThreshold: number,
    unit: string,
  ): HealthMetric['status'] {
    if (unit === 'percentage' && value < criticalThreshold) {
      return 'critical';
    } else if (unit === 'percentage' && value < warningThreshold) {
      return 'warning';
    } else if (unit !== 'percentage' && value > criticalThreshold) {
      return 'critical';
    } else if (unit !== 'percentage' && value > warningThreshold) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Check overall system health
   */
  private async checkSystemHealth(): Promise<void> {
    try {
      const services = Array.from(this.metrics.keys());
      let criticalServices = 0;
      let warningServices = 0;

      for (const service of services) {
        const serviceMetrics = this.metrics.get(service) || [];
        const recentMetrics = serviceMetrics.slice(-10); // Last 10 metrics

        const criticalCount = recentMetrics.filter(
          (m) => m.status === 'critical',
        ).length;
        const warningCount = recentMetrics.filter(
          (m) => m.status === 'warning',
        ).length;

        if (criticalCount > 5) {
          criticalServices++;
        } else if (warningCount > 3) {
          warningServices++;
        }
      }

      // Log system-wide issues if detected
      if (criticalServices > 0) {
        await this.logHealthIssue(
          'system',
          'critical',
          'Multiple Critical Service Issues',
          `${criticalServices} services have critical issues`,
        );
      } else if (warningServices > 2) {
        await this.logHealthIssue(
          'system',
          'medium',
          'Multiple Service Warnings',
          `${warningServices} services have warning-level issues`,
        );
      }
    } catch (error) {
      console.error('System health check failed:', error);
    }
  }

  /**
   * Get integration dashboard data
   */
  async getIntegrationDashboard(): Promise<IntegrationDashboard> {
    try {
      const services = [
        'weather_api',
        'weather_sync',
        'notification_service',
        'timeline_analyzer',
        'data_validator',
        'database',
        'supabase_realtime',
      ];
      const serviceHealthPromises = services.map((service) =>
        this.getServiceHealthSummary(service),
      );
      const serviceHealthResults = await Promise.allSettled(
        serviceHealthPromises,
      );

      const healthyServices = serviceHealthResults.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 'healthy',
      ).length;
      const totalServices = services.length;

      const overallStatus: IntegrationDashboard['overall_status'] =
        healthyServices === totalServices
          ? 'healthy'
          : healthyServices > totalServices * 0.7
            ? 'degraded'
            : 'critical';

      const validServices = serviceHealthResults
        .filter(
          (r): r is PromiseFulfilledResult<ServiceHealth> =>
            r.status === 'fulfilled',
        )
        .map((r) => r.value);

      const performanceSummary =
        this.calculatePerformanceSummary(validServices);
      const alerts = await this.getActiveHealthIssues();

      return {
        overall_status: overallStatus,
        services: validServices,
        alerts,
        performance_summary: performanceSummary,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get integration dashboard:', error);
      throw error;
    }
  }

  /**
   * Calculate performance summary
   */
  private calculatePerformanceSummary(
    services: ServiceHealth[],
  ): IntegrationDashboard['performance_summary'] {
    const avgResponseTime =
      services.reduce((sum, s) => sum + s.response_time_ms, 0) /
      services.length;
    const avgErrorRate =
      services.reduce((sum, s) => sum + s.error_rate_percentage, 0) /
      services.length;
    const avgUptime =
      services.reduce((sum, s) => sum + s.uptime_percentage, 0) /
      services.length;

    return {
      avg_response_time: Math.round(avgResponseTime),
      total_requests_24h: 0, // Would need request logging to implement
      error_rate_24h: Math.round(avgErrorRate * 100) / 100,
      uptime_24h: Math.round(avgUptime * 100) / 100,
    };
  }

  // Helper methods for database operations
  private async getActiveSubscriptionsCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('weather_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (error) throw error;
    return count || 0;
  }

  private async getServiceHealthSummary(
    service: string,
  ): Promise<ServiceHealth> {
    // This would typically fetch from stored health data
    // For now, return basic structure
    return {
      service_name: service,
      status: 'healthy',
      uptime_percentage: 99.9,
      response_time_ms: 100,
      error_rate_percentage: 0.1,
      last_check: new Date().toISOString(),
      issues: [],
      performance_metrics: [],
    };
  }

  private async getActiveHealthIssues(): Promise<HealthIssue[]> {
    try {
      const { data, error } = await this.supabase
        .from('health_issues')
        .select('*')
        .eq('resolution_status', 'open')
        .order('severity', { ascending: false })
        .order('first_detected', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get active health issues:', error);
      return [];
    }
  }

  private async logHealthIssue(
    service: string,
    severity: HealthIssue['severity'],
    title: string,
    description: string,
  ): Promise<void> {
    const issue: Partial<HealthIssue> = {
      service,
      severity,
      title,
      description,
      first_detected: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      impact: this.calculateImpact(service, severity),
      resolution_status: 'open',
    };

    try {
      await this.storeHealthIssue(issue as HealthIssue);
    } catch (error) {
      console.error('Failed to log health issue:', error);
    }
  }

  private calculateImpact(
    service: string,
    severity: HealthIssue['severity'],
  ): string {
    const impacts = {
      weather_api: {
        critical: 'No weather data available for new subscriptions',
        high: 'Weather data updates may be delayed',
        medium: 'Some weather features may be limited',
        low: 'Minor weather service degradation',
      },
      notification_service: {
        critical: 'Weather alerts not being delivered',
        high: 'Delayed or missing weather notifications',
        medium: 'Some notification channels affected',
        low: 'Minor notification delays',
      },
      // Add more as needed
    };

    return (
      impacts[service]?.[severity] || `${severity} issue affecting ${service}`
    );
  }

  // Database storage methods (simplified)
  private async storeHealthMetric(metric: HealthMetric): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('health_metrics')
        .insert(metric);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to store health metric:', error);
    }
  }

  private async storeServiceHealth(health: ServiceHealth): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('service_health')
        .upsert(health, { onConflict: 'service_name' });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to store service health:', error);
    }
  }

  private async storeHealthIssue(issue: HealthIssue): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('health_issues')
        .upsert(issue, { onConflict: 'service,title' });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to store health issue:', error);
    }
  }
}

// Export singleton instance
export const weatherHealthMonitor = new WeatherHealthMonitor();
