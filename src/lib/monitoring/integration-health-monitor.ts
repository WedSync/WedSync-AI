// WS-198 Team C Integration Architect - Integration Health Monitoring System
// Comprehensive monitoring and alerting for all third-party integrations

import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

// Types for health monitoring
export interface ServiceHealthMetrics {
  serviceName: string;
  serviceType: string;
  uptime: number; // percentage
  successRate24h: number; // percentage
  avgResponseTime: number; // milliseconds
  p95ResponseTime: number; // milliseconds
  lastFailure?: Date;
  lastSuccess?: Date;
  failureCount1h: number;
  successCount1h: number;
  circuitBreakerState: 'closed' | 'open' | 'half_open';
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  trendDirection: 'improving' | 'stable' | 'degrading';
  metadata?: Record<string, any>;
}

export interface IntegrationAlert {
  id: string;
  alertType: string;
  serviceName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  weddingImpact: boolean;
  weddingDate?: string;
  acknowledged: boolean;
  resolved: boolean;
  createdAt: Date;
  escalated: boolean;
}

export interface MonitoringConfig {
  healthCheckInterval: number; // seconds
  metricsRetentionDays: number;
  alertThresholds: {
    errorRate: number; // percentage
    responseTime: number; // milliseconds
    uptimeThreshold: number; // percentage
  };
  weddingDayThresholds: {
    errorRate: number; // stricter for wedding days
    responseTime: number; // stricter for wedding days
  };
  escalationRules: {
    criticalAlertEscalationMinutes: number;
    weddingDayEscalationMinutes: number;
  };
}

export class IntegrationHealthMonitor {
  private redis: Redis;
  private supabase;
  private config: MonitoringConfig;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config?: Partial<MonitoringConfig>) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.config = {
      healthCheckInterval: 60, // 1 minute
      metricsRetentionDays: 30,
      alertThresholds: {
        errorRate: 5.0, // 5% error rate triggers alert
        responseTime: 5000, // 5 seconds response time triggers alert
        uptimeThreshold: 99.0, // Below 99% uptime triggers alert
      },
      weddingDayThresholds: {
        errorRate: 1.0, // 1% error rate on wedding days
        responseTime: 2000, // 2 seconds response time on wedding days
      },
      escalationRules: {
        criticalAlertEscalationMinutes: 5,
        weddingDayEscalationMinutes: 2,
      },
      ...config,
    };

    this.startHealthMonitoring();
  }

  private startHealthMonitoring(): void {
    console.log('Starting integration health monitoring...');

    // Start periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
        await this.updateServiceMetrics();
        await this.evaluateAlerts();
        await this.cleanupOldMetrics();
      } catch (error) {
        console.error('Health monitoring cycle failed:', error);
      }
    }, this.config.healthCheckInterval * 1000);

    // Start escalation monitoring
    this.startEscalationMonitoring();

    console.log(
      `Integration health monitoring started (interval: ${this.config.healthCheckInterval}s)`,
    );
  }

  private async performHealthChecks(): Promise<void> {
    const services = [
      'stripe_payments',
      'email_service',
      'sms_service',
      'vendor_api',
      'calendar_integration',
      'supabase_auth',
      'supabase_storage',
    ];

    const healthCheckPromises = services.map((service) =>
      this.checkServiceHealth(service),
    );
    const healthResults = await Promise.allSettled(healthCheckPromises);

    // Process health check results
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      const result = healthResults[i];

      if (result.status === 'fulfilled') {
        await this.recordHealthMetric(service, result.value);
      } else {
        console.error(`Health check failed for ${service}:`, result.reason);
        await this.recordHealthMetric(service, {
          healthy: false,
          responseTime: 0,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
    metadata?: Record<string, any>;
  }> {
    const startTime = Date.now();

    try {
      let healthResult;

      switch (serviceName) {
        case 'stripe_payments':
          healthResult = await this.checkStripeHealth();
          break;
        case 'email_service':
          healthResult = await this.checkEmailServiceHealth();
          break;
        case 'sms_service':
          healthResult = await this.checkSmsServiceHealth();
          break;
        case 'vendor_api':
          healthResult = await this.checkVendorApiHealth();
          break;
        case 'calendar_integration':
          healthResult = await this.checkCalendarIntegrationHealth();
          break;
        case 'supabase_auth':
          healthResult = await this.checkSupabaseAuthHealth();
          break;
        case 'supabase_storage':
          healthResult = await this.checkSupabaseStorageHealth();
          break;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }

      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime,
        metadata: healthResult,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        healthy: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async checkStripeHealth(): Promise<Record<string, any>> {
    // Simulate Stripe health check (in real implementation, use Stripe API)
    if (Math.random() > 0.95) throw new Error('Stripe API error');
    return { status: 'operational', region: 'us-east-1' };
  }

  private async checkEmailServiceHealth(): Promise<Record<string, any>> {
    // Simulate email service health check (in real implementation, use actual service API)
    if (Math.random() > 0.97) throw new Error('Email service error');
    return {
      status: 'operational',
      queueDepth: Math.floor(Math.random() * 100),
    };
  }

  private async checkSmsServiceHealth(): Promise<Record<string, any>> {
    // Simulate SMS service health check
    if (Math.random() > 0.96) throw new Error('SMS service error');
    return { status: 'operational', deliveryRate: 98.5 };
  }

  private async checkVendorApiHealth(): Promise<Record<string, any>> {
    // Simulate vendor API health check
    if (Math.random() > 0.92) throw new Error('Vendor API timeout');
    return { status: 'operational', syncLag: Math.floor(Math.random() * 300) };
  }

  private async checkCalendarIntegrationHealth(): Promise<Record<string, any>> {
    // Simulate calendar integration health check
    if (Math.random() > 0.94) throw new Error('Calendar sync error');
    return { status: 'operational', lastSync: new Date().toISOString() };
  }

  private async checkSupabaseAuthHealth(): Promise<Record<string, any>> {
    // Check Supabase Auth health
    try {
      const { data } = await this.supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      return { status: 'operational', userCount: data?.users?.length || 0 };
    } catch (error) {
      throw new Error('Supabase Auth unavailable');
    }
  }

  private async checkSupabaseStorageHealth(): Promise<Record<string, any>> {
    // Check Supabase Storage health
    try {
      const { data } = await this.supabase.storage.listBuckets();
      return { status: 'operational', bucketCount: data?.length || 0 };
    } catch (error) {
      throw new Error('Supabase Storage unavailable');
    }
  }

  private async recordHealthMetric(
    serviceName: string,
    healthResult: {
      healthy: boolean;
      responseTime: number;
      error?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    const timestamp = new Date();
    const metricKey = `health_metrics:${serviceName}:${timestamp.toISOString().split('T')[0]}`;

    // Store in Redis for real-time metrics
    const redisData = {
      timestamp: timestamp.toISOString(),
      healthy: healthResult.healthy,
      responseTime: healthResult.responseTime,
      error: healthResult.error,
      metadata: healthResult.metadata,
    };

    await this.redis.lpush(metricKey, JSON.stringify(redisData));
    await this.redis.expire(
      metricKey,
      this.config.metricsRetentionDays * 24 * 60 * 60,
    );

    // Store in database for long-term analytics
    try {
      await this.supabase.from('service_health_metrics').upsert(
        {
          service_name: serviceName,
          service_type: this.getServiceTypeFromName(serviceName),
          health_status: healthResult.healthy ? 'healthy' : 'unhealthy',
          avg_response_time: healthResult.responseTime,
          p95_response_time: healthResult.responseTime, // Simplified for now
          last_failure_at: healthResult.healthy
            ? null
            : timestamp.toISOString(),
          last_success_at: healthResult.healthy
            ? timestamp.toISOString()
            : null,
          failure_count_1h: healthResult.healthy ? 0 : 1,
          success_count_1h: healthResult.healthy ? 1 : 0,
          metadata: healthResult.metadata,
        },
        { onConflict: 'service_name' },
      );
    } catch (error) {
      console.error('Failed to store health metric in database:', error);
    }
  }

  private getServiceTypeFromName(serviceName: string): string {
    if (serviceName.includes('payment') || serviceName.includes('stripe'))
      return 'payment';
    if (serviceName.includes('email')) return 'email';
    if (serviceName.includes('sms')) return 'sms';
    if (serviceName.includes('calendar')) return 'calendar';
    if (serviceName.includes('vendor')) return 'vendor_api';
    if (serviceName.includes('supabase')) return 'storage';
    return 'unknown';
  }

  private async updateServiceMetrics(): Promise<void> {
    const services = await this.getMonitoredServices();

    for (const service of services) {
      try {
        const metrics = await this.calculateServiceMetrics(service);
        await this.updateServiceHealthStatus(service, metrics);

        // Check if alerts should be triggered
        await this.checkAlertConditions(service, metrics);
      } catch (error) {
        console.error(`Failed to update metrics for ${service}:`, error);
      }
    }
  }

  private async getMonitoredServices(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('service_health_metrics')
      .select('service_name')
      .order('service_name');

    if (error) throw error;
    return data?.map((row) => row.service_name) || [];
  }

  private async calculateServiceMetrics(
    serviceName: string,
  ): Promise<ServiceHealthMetrics> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent metrics from Redis
    const metricKey = `health_metrics:${serviceName}:${now.toISOString().split('T')[0]}`;
    const recentMetrics = await this.redis.lrange(metricKey, 0, -1);
    const parsedMetrics = recentMetrics
      .map((m) => JSON.parse(m))
      .filter((m) => new Date(m.timestamp) > oneHourAgo);

    if (parsedMetrics.length === 0) {
      return {
        serviceName,
        serviceType: this.getServiceTypeFromName(serviceName),
        uptime: 0,
        successRate24h: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        failureCount1h: 0,
        successCount1h: 0,
        circuitBreakerState: 'unknown',
        healthStatus: 'unknown',
        trendDirection: 'stable',
      };
    }

    const healthyMetrics = parsedMetrics.filter((m) => m.healthy);
    const unhealthyMetrics = parsedMetrics.filter((m) => !m.healthy);

    const successRate = (healthyMetrics.length / parsedMetrics.length) * 100;
    const uptime = successRate; // Simplified calculation

    const responseTimes = parsedMetrics
      .map((m) => m.responseTime)
      .filter((rt) => rt > 0);
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const p95ResponseTime = this.calculateP95(responseTimes);

    let healthStatus: ServiceHealthMetrics['healthStatus'] = 'healthy';
    if (successRate < 95) healthStatus = 'unhealthy';
    else if (successRate < 99) healthStatus = 'degraded';

    const lastFailure =
      unhealthyMetrics.length > 0
        ? new Date(
            Math.max(
              ...unhealthyMetrics.map((m) => new Date(m.timestamp).getTime()),
            ),
          )
        : undefined;

    const lastSuccess =
      healthyMetrics.length > 0
        ? new Date(
            Math.max(
              ...healthyMetrics.map((m) => new Date(m.timestamp).getTime()),
            ),
          )
        : undefined;

    // Determine trend direction (simplified)
    const recentHalf = parsedMetrics.slice(
      0,
      Math.floor(parsedMetrics.length / 2),
    );
    const olderHalf = parsedMetrics.slice(Math.floor(parsedMetrics.length / 2));

    const recentSuccessRate =
      recentHalf.length > 0
        ? (recentHalf.filter((m) => m.healthy).length / recentHalf.length) * 100
        : 0;
    const olderSuccessRate =
      olderHalf.length > 0
        ? (olderHalf.filter((m) => m.healthy).length / olderHalf.length) * 100
        : 0;

    let trendDirection: ServiceHealthMetrics['trendDirection'] = 'stable';
    if (recentSuccessRate > olderSuccessRate + 5) trendDirection = 'improving';
    else if (recentSuccessRate < olderSuccessRate - 5)
      trendDirection = 'degrading';

    return {
      serviceName,
      serviceType: this.getServiceTypeFromName(serviceName),
      uptime,
      successRate24h: successRate,
      avgResponseTime,
      p95ResponseTime,
      lastFailure,
      lastSuccess,
      failureCount1h: unhealthyMetrics.length,
      successCount1h: healthyMetrics.length,
      circuitBreakerState: 'closed', // Would get from circuit breaker state
      healthStatus,
      trendDirection,
    };
  }

  private calculateP95(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, index)];
  }

  private async updateServiceHealthStatus(
    serviceName: string,
    metrics: ServiceHealthMetrics,
  ): Promise<void> {
    try {
      await this.supabase.from('service_health_metrics').upsert(
        {
          service_name: serviceName,
          service_type: metrics.serviceType,
          uptime_percentage: metrics.uptime,
          success_rate_24h: metrics.successRate24h,
          avg_response_time: metrics.avgResponseTime,
          p95_response_time: metrics.p95ResponseTime,
          last_failure_at: metrics.lastFailure?.toISOString(),
          last_success_at: metrics.lastSuccess?.toISOString(),
          failure_count_1h: metrics.failureCount1h,
          success_count_1h: metrics.successCount1h,
          circuit_breaker_state: metrics.circuitBreakerState,
          health_status: metrics.healthStatus,
          measured_at: new Date().toISOString(),
        },
        { onConflict: 'service_name' },
      );
    } catch (error) {
      console.error(
        `Failed to update health status for ${serviceName}:`,
        error,
      );
    }
  }

  private async checkAlertConditions(
    serviceName: string,
    metrics: ServiceHealthMetrics,
  ): Promise<void> {
    const now = new Date();
    const isWeddingDay = await this.isWeddingDayToday();
    const thresholds = isWeddingDay
      ? this.config.weddingDayThresholds
      : this.config.alertThresholds;

    // Check error rate threshold
    const errorRate = 100 - metrics.successRate24h;
    if (errorRate > thresholds.errorRate) {
      await this.createAlert({
        alertType: 'high_error_rate',
        serviceName,
        severity: isWeddingDay
          ? 'critical'
          : errorRate > 10
            ? 'high'
            : 'medium',
        title: `High Error Rate - ${serviceName}`,
        description: `Service ${serviceName} has ${errorRate.toFixed(1)}% error rate (threshold: ${thresholds.errorRate}%)`,
        weddingImpact: isWeddingDay,
        metadata: { errorRate, threshold: thresholds.errorRate, metrics },
      });
    }

    // Check response time threshold
    if (metrics.p95ResponseTime > thresholds.responseTime) {
      await this.createAlert({
        alertType: 'slow_response_time',
        serviceName,
        severity: isWeddingDay ? 'high' : 'medium',
        title: `Slow Response Time - ${serviceName}`,
        description: `Service ${serviceName} P95 response time is ${metrics.p95ResponseTime}ms (threshold: ${thresholds.responseTime}ms)`,
        weddingImpact: isWeddingDay,
        metadata: {
          responseTime: metrics.p95ResponseTime,
          threshold: thresholds.responseTime,
          metrics,
        },
      });
    }

    // Check uptime threshold
    if (metrics.uptime < this.config.alertThresholds.uptimeThreshold) {
      await this.createAlert({
        alertType: 'low_uptime',
        serviceName,
        severity: metrics.uptime < 95 ? 'critical' : 'high',
        title: `Low Uptime - ${serviceName}`,
        description: `Service ${serviceName} uptime is ${metrics.uptime.toFixed(1)}% (threshold: ${this.config.alertThresholds.uptimeThreshold}%)`,
        weddingImpact: isWeddingDay,
        metadata: {
          uptime: metrics.uptime,
          threshold: this.config.alertThresholds.uptimeThreshold,
          metrics,
        },
      });
    }

    // Check if service just recovered
    if (
      metrics.healthStatus === 'healthy' &&
      metrics.trendDirection === 'improving'
    ) {
      await this.resolveActiveAlerts(serviceName);
    }
  }

  private async isWeddingDayToday(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await this.supabase
        .from('weddings')
        .select('id')
        .eq('wedding_date', today)
        .limit(1);

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Failed to check for weddings today:', error);
      return false; // Assume no wedding day if check fails
    }
  }

  private async createAlert(alertData: {
    alertType: string;
    serviceName: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    weddingImpact: boolean;
    metadata?: any;
  }): Promise<string> {
    // Check if similar alert already exists and is unresolved
    const { data: existingAlerts } = await this.supabase
      .from('integration_alerts')
      .select('id')
      .eq('alert_type', alertData.alertType)
      .eq('service_name', alertData.serviceName)
      .is('resolved_at', null)
      .limit(1);

    if (existingAlerts && existingAlerts.length > 0) {
      // Don't create duplicate alerts
      return existingAlerts[0].id;
    }

    try {
      const { data, error } = await this.supabase
        .from('integration_alerts')
        .insert({
          alert_type: alertData.alertType,
          service_name: alertData.serviceName,
          severity: alertData.severity,
          title: alertData.title,
          description: alertData.description,
          alert_data: alertData.metadata,
          wedding_impact: alertData.weddingImpact,
          escalated:
            alertData.severity === 'critical' || alertData.weddingImpact,
        })
        .select('id')
        .single();

      if (error) throw error;

      console.log(`Alert created: ${alertData.title} (${alertData.severity})`);
      return data.id;
    } catch (error) {
      console.error('Failed to create alert:', error);
      throw error;
    }
  }

  private async resolveActiveAlerts(serviceName: string): Promise<void> {
    try {
      await this.supabase
        .from('integration_alerts')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: 'system_auto_resolution',
          resolution_notes: 'Service recovered and is now healthy',
        })
        .eq('service_name', serviceName)
        .is('resolved_at', null);

      console.log(`Auto-resolved alerts for ${serviceName}`);
    } catch (error) {
      console.error(`Failed to resolve alerts for ${serviceName}:`, error);
    }
  }

  private async evaluateAlerts(): Promise<void> {
    // Get unacknowledged critical alerts
    const { data: criticalAlerts } = await this.supabase
      .from('integration_alerts')
      .select('*')
      .eq('severity', 'critical')
      .is('acknowledged_at', null)
      .is('resolved_at', null);

    if (criticalAlerts && criticalAlerts.length > 0) {
      for (const alert of criticalAlerts) {
        const alertAge = Date.now() - new Date(alert.created_at).getTime();
        const escalationThreshold = alert.wedding_impact
          ? this.config.escalationRules.weddingDayEscalationMinutes * 60 * 1000
          : this.config.escalationRules.criticalAlertEscalationMinutes *
            60 *
            1000;

        if (alertAge > escalationThreshold && !alert.escalated) {
          await this.escalateAlert(alert.id);
        }
      }
    }
  }

  private async escalateAlert(alertId: string): Promise<void> {
    try {
      await this.supabase
        .from('integration_alerts')
        .update({
          escalated: true,
          escalated_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      console.log(`Alert escalated: ${alertId}`);

      // In a real implementation, this would trigger additional notifications
      // such as SMS, phone calls, or PagerDuty alerts
    } catch (error) {
      console.error(`Failed to escalate alert ${alertId}:`, error);
    }
  }

  private startEscalationMonitoring(): void {
    // Check for alerts that need escalation every 30 seconds
    setInterval(async () => {
      try {
        await this.evaluateAlerts();
      } catch (error) {
        console.error('Escalation monitoring failed:', error);
      }
    }, 30000);
  }

  private async cleanupOldMetrics(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.metricsRetentionDays);

    try {
      // Clean up old Redis metrics (TTL handles this automatically)
      // Clean up old database metrics
      await this.supabase
        .from('service_health_metrics')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      // Clean up old resolved alerts
      const alertCleanupDate = new Date();
      alertCleanupDate.setDate(alertCleanupDate.getDate() - 7); // Keep resolved alerts for 7 days

      await this.supabase
        .from('integration_alerts')
        .delete()
        .not('resolved_at', 'is', null)
        .lt('resolved_at', alertCleanupDate.toISOString());
    } catch (error) {
      console.error('Failed to cleanup old metrics:', error);
    }
  }

  // Public API methods
  async getServiceHealthOverview(): Promise<ServiceHealthMetrics[]> {
    const services = await this.getMonitoredServices();
    const healthOverview = [];

    for (const service of services) {
      const metrics = await this.calculateServiceMetrics(service);
      healthOverview.push(metrics);
    }

    return healthOverview.sort((a, b) => {
      // Sort by health status (unhealthy first), then by service name
      const statusOrder = { unhealthy: 0, degraded: 1, healthy: 2, unknown: 3 };
      return (
        statusOrder[a.healthStatus] - statusOrder[b.healthStatus] ||
        a.serviceName.localeCompare(b.serviceName)
      );
    });
  }

  async getActiveAlerts(): Promise<IntegrationAlert[]> {
    const { data, error } = await this.supabase
      .from('integration_alerts')
      .select('*')
      .is('resolved_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((alert) => ({
      id: alert.id,
      alertType: alert.alert_type,
      serviceName: alert.service_name,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      weddingImpact: alert.wedding_impact,
      weddingDate: alert.wedding_date,
      acknowledged: !!alert.acknowledged_at,
      resolved: !!alert.resolved_at,
      createdAt: new Date(alert.created_at),
      escalated: alert.escalated,
    }));
  }

  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<void> {
    await this.supabase
      .from('integration_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy,
      })
      .eq('id', alertId);
  }

  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    notes?: string,
  ): Promise<void> {
    await this.supabase
      .from('integration_alerts')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_notes: notes,
      })
      .eq('id', alertId);
  }

  async getServiceMetricsHistory(
    serviceName: string,
    days: number = 7,
  ): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('service_health_metrics')
      .select('*')
      .eq('service_name', serviceName)
      .gte('measured_at', startDate.toISOString())
      .order('measured_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    console.log('Integration health monitoring stopped');
  }
}
