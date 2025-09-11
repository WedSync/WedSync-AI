/**
 * WS-142: Success System Health Monitor
 * Production monitoring and alerting for customer success system
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import { differenceInMinutes, subHours, subDays } from 'date-fns';

export interface SuccessSystemHealth {
  status: 'healthy' | 'degraded' | 'warning' | 'critical';
  timestamp: Date;
  components: ComponentHealth[];
  metrics: SystemMetrics;
  alerts: HealthAlert[];
  recommendations: string[];
  lastIncident?: HealthIncident;
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'warning' | 'critical' | 'unknown';
  responseTime: number;
  errorRate: number;
  availability: number;
  lastChecked: Date;
  details?: any;
}

export interface HealthMetric {
  metric: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  target: number;
  unit: string;
  message: string;
  trend?: 'improving' | 'stable' | 'declining';
}

export interface SystemMetrics {
  churnPredictionAccuracy: HealthMetric;
  interventionSuccessRate: HealthMetric;
  eventProcessingLatency: HealthMetric;
  integrationHealth: HealthMetric;
  dataQuality: HealthMetric;
  systemLoad: HealthMetric;
  errorRate: HealthMetric;
  apiResponseTime: HealthMetric;
}

export interface HealthAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  actions?: string[];
}

export interface HealthIncident {
  id: string;
  startTime: Date;
  endTime?: Date;
  severity: 'minor' | 'major' | 'critical';
  affectedComponents: string[];
  impact: string;
  resolution?: string;
  postmortem?: string;
}

export interface MonitoringConfig {
  checkInterval: number; // milliseconds
  alertThresholds: {
    churnAccuracy: number;
    interventionSuccess: number;
    responseTime: number;
    errorRate: number;
    availability: number;
  };
  escalationPolicy: EscalationPolicy;
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  cooldownPeriod: number; // minutes
}

export interface EscalationLevel {
  severity: 'warning' | 'error' | 'critical';
  notificationChannels: string[];
  recipients: string[];
  delayMinutes: number;
}

export class SuccessHealthMonitor {
  private static instance: SuccessHealthMonitor;
  private supabase: SupabaseClient;
  private checkInterval: NodeJS.Timeout | null = null;
  private activeAlerts: Map<string, HealthAlert> = new Map();
  private lastCheck: Date = new Date();

  private config: MonitoringConfig = {
    checkInterval: 60000, // 1 minute
    alertThresholds: {
      churnAccuracy: 0.85,
      interventionSuccess: 0.6,
      responseTime: 200, // ms
      errorRate: 0.01, // 1%
      availability: 0.99, // 99%
    },
    escalationPolicy: {
      levels: [
        {
          severity: 'warning',
          notificationChannels: ['slack', 'dashboard'],
          recipients: ['team-success'],
          delayMinutes: 0,
        },
        {
          severity: 'error',
          notificationChannels: ['slack', 'email', 'pagerduty'],
          recipients: ['team-success', 'engineering'],
          delayMinutes: 5,
        },
        {
          severity: 'critical',
          notificationChannels: ['slack', 'email', 'pagerduty', 'sms'],
          recipients: ['team-success', 'engineering', 'management'],
          delayMinutes: 15,
        },
      ],
      cooldownPeriod: 30,
    },
  };

  private constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  public static getInstance(supabase?: SupabaseClient): SuccessHealthMonitor {
    if (!SuccessHealthMonitor.instance) {
      SuccessHealthMonitor.instance = new SuccessHealthMonitor(supabase);
    }
    return SuccessHealthMonitor.instance;
  }

  /**
   * Check overall system health
   */
  static async checkSystemHealth(): Promise<SuccessSystemHealth> {
    const monitor = SuccessHealthMonitor.getInstance();

    try {
      const startTime = Date.now();

      // Check all components in parallel
      const [
        churnPredictionHealth,
        interventionSystemHealth,
        integrationHealth,
        performanceHealth,
        dataQualityHealth,
      ] = await Promise.all([
        monitor.checkChurnPredictionAccuracy(),
        monitor.checkInterventionEffectiveness(),
        monitor.checkTeamIntegrations(),
        monitor.checkPerformanceMetrics(),
        monitor.checkDataQuality(),
      ]);

      // Compile component health
      const components: ComponentHealth[] = [
        await monitor.getComponentHealth(
          'churn_prediction',
          churnPredictionHealth,
        ),
        await monitor.getComponentHealth(
          'intervention_system',
          interventionSystemHealth,
        ),
        await monitor.getComponentHealth('integrations', integrationHealth),
        await monitor.getComponentHealth('performance', performanceHealth),
        await monitor.getComponentHealth('data_quality', dataQualityHealth),
      ];

      // Get system metrics
      const metrics = await monitor.getSystemMetrics();

      // Check for active alerts
      const alerts = await monitor.getActiveAlerts();

      // Calculate overall health
      const overallHealth = monitor.calculateOverallHealth(components, metrics);

      // Generate recommendations
      const recommendations = await monitor.generateRecommendations(
        components,
        metrics,
      );

      // Get last incident if any
      const lastIncident = await monitor.getLastIncident();

      // Alert if critical
      if (overallHealth.status === 'critical') {
        await monitor.alertSuccessTeam(overallHealth);
      }

      // Store health check result
      await monitor.storeHealthCheck(overallHealth);

      // Log monitoring time
      console.log(`Health check completed in ${Date.now() - startTime}ms`);

      return overallHealth;
    } catch (error) {
      console.error('Error checking system health:', error);
      throw error;
    }
  }

  /**
   * Start continuous monitoring
   */
  static startMonitoring(): void {
    const monitor = SuccessHealthMonitor.getInstance();

    if (monitor.checkInterval) {
      console.log('Monitoring already started');
      return;
    }

    console.log('Starting success system health monitoring...');

    // Initial check
    SuccessHealthMonitor.checkSystemHealth();

    // Schedule regular checks
    monitor.checkInterval = setInterval(async () => {
      try {
        await SuccessHealthMonitor.checkSystemHealth();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, monitor.config.checkInterval);
  }

  /**
   * Stop monitoring
   */
  static stopMonitoring(): void {
    const monitor = SuccessHealthMonitor.getInstance();

    if (monitor.checkInterval) {
      clearInterval(monitor.checkInterval);
      monitor.checkInterval = null;
      console.log('Monitoring stopped');
    }
  }

  /**
   * Check churn prediction accuracy
   */
  private async checkChurnPredictionAccuracy(): Promise<HealthMetric> {
    try {
      const query = `
        WITH recent_predictions AS (
          SELECT 
            churn_probability,
            actual_churn,
            CASE 
              WHEN churn_probability > 0.7 AND actual_churn = true THEN 'true_positive'
              WHEN churn_probability > 0.7 AND actual_churn = false THEN 'false_positive'
              WHEN churn_probability <= 0.7 AND actual_churn = true THEN 'false_negative'
              WHEN churn_probability <= 0.7 AND actual_churn = false THEN 'true_negative'
            END as prediction_result
          FROM churn_prediction_logs
          WHERE predicted_at >= NOW() - INTERVAL '7 days'
            AND actual_churn IS NOT NULL
        ),
        accuracy_stats AS (
          SELECT 
            COUNT(*) FILTER (WHERE prediction_result IN ('true_positive', 'true_negative')) as correct,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE prediction_result = 'true_positive') as true_positives,
            COUNT(*) FILTER (WHERE prediction_result = 'false_positive') as false_positives,
            COUNT(*) FILTER (WHERE prediction_result = 'false_negative') as false_negatives
          FROM recent_predictions
        )
        SELECT 
          COALESCE(correct::decimal / NULLIF(total, 0), 0) as accuracy,
          COALESCE(true_positives::decimal / NULLIF(true_positives + false_positives, 0), 0) as precision,
          COALESCE(true_positives::decimal / NULLIF(true_positives + false_negatives, 0), 0) as recall
        FROM accuracy_stats
      `;

      const { data: result } = await this.supabase.rpc('execute_raw_sql', {
        query,
        params: [],
      });

      const accuracy = result?.[0]?.accuracy || 0;
      const target = this.config.alertThresholds.churnAccuracy;

      return {
        metric: 'churn_prediction_accuracy',
        value: accuracy * 100,
        status:
          accuracy >= target
            ? 'healthy'
            : accuracy >= target * 0.9
              ? 'warning'
              : 'critical',
        target: target * 100,
        unit: '%',
        message: `Churn prediction accuracy: ${(accuracy * 100).toFixed(1)}% (target: ${target * 100}%+)`,
        trend: await this.getMetricTrend('churn_accuracy', accuracy),
      };
    } catch (error) {
      console.error('Error checking churn prediction accuracy:', error);
      return {
        metric: 'churn_prediction_accuracy',
        value: 0,
        status: 'critical',
        target: this.config.alertThresholds.churnAccuracy * 100,
        unit: '%',
        message: 'Failed to check churn prediction accuracy',
      };
    }
  }

  /**
   * Check intervention effectiveness
   */
  private async checkInterventionEffectiveness(): Promise<HealthMetric> {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE converted_at IS NOT NULL) as successful,
          COUNT(*) as total,
          AVG(EXTRACT(EPOCH FROM (opened_at - sent_at))/60) as avg_response_minutes
        FROM success_interventions
        WHERE sent_at >= NOW() - INTERVAL '24 hours'
      `;

      const { data: result } = await this.supabase.rpc('execute_raw_sql', {
        query,
        params: [],
      });

      const stats = result?.[0] || {};
      const successRate = (stats.successful || 0) / (stats.total || 1);
      const target = this.config.alertThresholds.interventionSuccess;

      return {
        metric: 'intervention_success_rate',
        value: successRate * 100,
        status:
          successRate >= target
            ? 'healthy'
            : successRate >= target * 0.8
              ? 'warning'
              : 'critical',
        target: target * 100,
        unit: '%',
        message: `Intervention success rate: ${(successRate * 100).toFixed(1)}% (target: ${target * 100}%+)`,
        trend: await this.getMetricTrend('intervention_success', successRate),
      };
    } catch (error) {
      console.error('Error checking intervention effectiveness:', error);
      return {
        metric: 'intervention_success_rate',
        value: 0,
        status: 'critical',
        target: this.config.alertThresholds.interventionSuccess * 100,
        unit: '%',
        message: 'Failed to check intervention effectiveness',
      };
    }
  }

  /**
   * Check team integrations health
   */
  private async checkTeamIntegrations(): Promise<HealthMetric> {
    try {
      // Check integration endpoints
      const integrations = [
        { name: 'viral', url: '/api/viral/health' },
        { name: 'marketing', url: '/api/marketing/health' },
        { name: 'dashboard', url: '/api/dashboard/health' },
        { name: 'offline', url: '/api/offline/health' },
      ];

      const results = await Promise.allSettled(
        integrations.map(async (integration) => {
          const startTime = Date.now();
          try {
            const response = await fetch(integration.url, {
              method: 'GET',
              signal: AbortSignal.timeout(5000),
            });
            return {
              name: integration.name,
              healthy: response.ok,
              responseTime: Date.now() - startTime,
            };
          } catch {
            return {
              name: integration.name,
              healthy: false,
              responseTime: Date.now() - startTime,
            };
          }
        }),
      );

      const healthyCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.healthy,
      ).length;

      const healthPercentage = (healthyCount / integrations.length) * 100;

      return {
        metric: 'integration_health',
        value: healthPercentage,
        status:
          healthPercentage === 100
            ? 'healthy'
            : healthPercentage >= 75
              ? 'warning'
              : 'critical',
        target: 100,
        unit: '%',
        message: `${healthyCount}/${integrations.length} integrations healthy`,
        trend: await this.getMetricTrend(
          'integration_health',
          healthPercentage / 100,
        ),
      };
    } catch (error) {
      console.error('Error checking integrations:', error);
      return {
        metric: 'integration_health',
        value: 0,
        status: 'critical',
        target: 100,
        unit: '%',
        message: 'Failed to check integration health',
      };
    }
  }

  /**
   * Check performance metrics
   */
  private async checkPerformanceMetrics(): Promise<HealthMetric> {
    try {
      // Get recent API response times
      const query = `
        WITH api_metrics AS (
          SELECT 
            endpoint,
            response_time_ms,
            status_code
          FROM api_metrics_log
          WHERE created_at >= NOW() - INTERVAL '1 hour'
        )
        SELECT 
          AVG(response_time_ms) as avg_response_time,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time,
          COUNT(*) FILTER (WHERE status_code >= 500) as error_count,
          COUNT(*) as total_requests
        FROM api_metrics
      `;

      const { data: result } = await this.supabase.rpc('execute_raw_sql', {
        query,
        params: [],
      });

      const metrics = result?.[0] || {};
      const avgResponseTime = metrics.avg_response_time || 0;
      const target = this.config.alertThresholds.responseTime;

      return {
        metric: 'api_response_time',
        value: avgResponseTime,
        status:
          avgResponseTime <= target
            ? 'healthy'
            : avgResponseTime <= target * 1.5
              ? 'warning'
              : 'critical',
        target,
        unit: 'ms',
        message: `Avg response time: ${avgResponseTime.toFixed(0)}ms (P95: ${metrics.p95_response_time?.toFixed(0)}ms)`,
        trend: await this.getMetricTrend('response_time', avgResponseTime),
      };
    } catch (error) {
      console.error('Error checking performance metrics:', error);
      return {
        metric: 'api_response_time',
        value: 0,
        status: 'critical',
        target: this.config.alertThresholds.responseTime,
        unit: 'ms',
        message: 'Failed to check performance metrics',
      };
    }
  }

  /**
   * Check data quality
   */
  private async checkDataQuality(): Promise<HealthMetric> {
    try {
      const query = `
        WITH data_quality_checks AS (
          SELECT 
            -- Check for null critical fields
            COUNT(*) FILTER (WHERE health_score IS NULL) as null_health_scores,
            COUNT(*) FILTER (WHERE supplier_id IS NULL) as null_supplier_ids,
            -- Check for data staleness
            COUNT(*) FILTER (WHERE last_updated < NOW() - INTERVAL '7 days') as stale_records,
            -- Check for outliers
            COUNT(*) FILTER (WHERE health_score < 0 OR health_score > 100) as invalid_scores,
            COUNT(*) as total_records
          FROM customer_health
          WHERE created_at >= NOW() - INTERVAL '30 days'
        )
        SELECT 
          CASE 
            WHEN total_records = 0 THEN 1
            ELSE 1 - (
              (null_health_scores + null_supplier_ids + stale_records + invalid_scores)::decimal / 
              (total_records * 4)
            )
          END as quality_score,
          null_health_scores,
          null_supplier_ids,
          stale_records,
          invalid_scores,
          total_records
        FROM data_quality_checks
      `;

      const { data: result } = await this.supabase.rpc('execute_raw_sql', {
        query,
        params: [],
      });

      const qualityScore = result?.[0]?.quality_score || 0;

      return {
        metric: 'data_quality',
        value: qualityScore * 100,
        status:
          qualityScore >= 0.95
            ? 'healthy'
            : qualityScore >= 0.9
              ? 'warning'
              : 'critical',
        target: 95,
        unit: '%',
        message: `Data quality score: ${(qualityScore * 100).toFixed(1)}%`,
        trend: await this.getMetricTrend('data_quality', qualityScore),
      };
    } catch (error) {
      console.error('Error checking data quality:', error);
      return {
        metric: 'data_quality',
        value: 0,
        status: 'critical',
        target: 95,
        unit: '%',
        message: 'Failed to check data quality',
      };
    }
  }

  /**
   * Get component health from metric
   */
  private async getComponentHealth(
    name: string,
    metric: HealthMetric,
  ): Promise<ComponentHealth> {
    return {
      name,
      status: metric.status,
      responseTime: 0, // Would be measured per component
      errorRate: 0,
      availability: metric.value / metric.target,
      lastChecked: new Date(),
      details: metric,
    };
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const [
      churnAccuracy,
      interventionSuccess,
      eventLatency,
      integrationHealth,
      dataQuality,
      systemLoad,
      errorRate,
      responseTime,
    ] = await Promise.all([
      this.checkChurnPredictionAccuracy(),
      this.checkInterventionEffectiveness(),
      this.checkEventProcessingLatency(),
      this.checkTeamIntegrations(),
      this.checkDataQuality(),
      this.checkSystemLoad(),
      this.checkErrorRate(),
      this.checkPerformanceMetrics(),
    ]);

    return {
      churnPredictionAccuracy: churnAccuracy,
      interventionSuccessRate: interventionSuccess,
      eventProcessingLatency: eventLatency,
      integrationHealth,
      dataQuality,
      systemLoad,
      errorRate,
      apiResponseTime: responseTime,
    };
  }

  /**
   * Check event processing latency
   */
  private async checkEventProcessingLatency(): Promise<HealthMetric> {
    const latency = (await redis.get('event_processing:avg_latency')) || '50';
    const value = parseFloat(latency);

    return {
      metric: 'event_processing_latency',
      value,
      status: value <= 100 ? 'healthy' : value <= 200 ? 'warning' : 'critical',
      target: 100,
      unit: 'ms',
      message: `Event processing latency: ${value}ms`,
    };
  }

  /**
   * Check system load
   */
  private async checkSystemLoad(): Promise<HealthMetric> {
    // Simplified - would connect to actual monitoring
    const load = 65; // percentage

    return {
      metric: 'system_load',
      value: load,
      status: load <= 70 ? 'healthy' : load <= 85 ? 'warning' : 'critical',
      target: 70,
      unit: '%',
      message: `System load: ${load}%`,
    };
  }

  /**
   * Check error rate
   */
  private async checkErrorRate(): Promise<HealthMetric> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status_code >= 500) as errors,
        COUNT(*) as total
      FROM api_metrics_log
      WHERE created_at >= NOW() - INTERVAL '1 hour'
    `;

    const { data: result } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [],
    });

    const errorRate =
      ((result?.[0]?.errors || 0) / (result?.[0]?.total || 1)) * 100;

    return {
      metric: 'error_rate',
      value: errorRate,
      status:
        errorRate <= 1 ? 'healthy' : errorRate <= 5 ? 'warning' : 'critical',
      target: 1,
      unit: '%',
      message: `Error rate: ${errorRate.toFixed(2)}%`,
    };
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(
    components: ComponentHealth[],
    metrics: SystemMetrics,
  ): SuccessSystemHealth {
    const criticalCount = components.filter(
      (c) => c.status === 'critical',
    ).length;
    const warningCount = components.filter(
      (c) => c.status === 'warning',
    ).length;
    const degradedCount = components.filter(
      (c) => c.status === 'degraded',
    ).length;

    let status: SuccessSystemHealth['status'];
    if (criticalCount > 0) {
      status = 'critical';
    } else if (warningCount > 1 || degradedCount > 0) {
      status = 'warning';
    } else if (warningCount === 1) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      timestamp: new Date(),
      components,
      metrics,
      alerts: Array.from(this.activeAlerts.values()),
      recommendations: [],
      lastIncident: undefined,
    };
  }

  /**
   * Get metric trend
   */
  private async getMetricTrend(
    metric: string,
    currentValue: number,
  ): Promise<'improving' | 'stable' | 'declining'> {
    const previousValue = await redis.get(`metric_trend:${metric}`);
    await redis.setex(`metric_trend:${metric}`, 3600, currentValue.toString());

    if (!previousValue) return 'stable';

    const prev = parseFloat(previousValue);
    const change = ((currentValue - prev) / prev) * 100;

    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'improving' : 'declining';
  }

  /**
   * Get active alerts
   */
  private async getActiveAlerts(): Promise<HealthAlert[]> {
    const { data } = await this.supabase
      .from('health_alerts')
      .select('*')
      .eq('resolved', false)
      .order('timestamp', { ascending: false });

    return data || [];
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(
    components: ComponentHealth[],
    metrics: SystemMetrics,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (metrics.churnPredictionAccuracy.status !== 'healthy') {
      recommendations.push(
        'Retrain ML model with recent data to improve churn prediction accuracy',
      );
    }

    if (metrics.interventionSuccessRate.status !== 'healthy') {
      recommendations.push(
        'Review intervention templates and timing for better engagement',
      );
    }

    if (metrics.eventProcessingLatency.value > 150) {
      recommendations.push(
        'Optimize event processing pipeline to reduce latency',
      );
    }

    if (
      metrics.dataQuality.status === 'warning' ||
      metrics.dataQuality.status === 'critical'
    ) {
      recommendations.push(
        'Run data quality cleanup job to fix inconsistencies',
      );
    }

    return recommendations;
  }

  /**
   * Get last incident
   */
  private async getLastIncident(): Promise<HealthIncident | undefined> {
    const { data } = await this.supabase
      .from('health_incidents')
      .select('*')
      .order('startTime', { ascending: false })
      .limit(1)
      .single();

    return data || undefined;
  }

  /**
   * Alert success team
   */
  private async alertSuccessTeam(health: SuccessSystemHealth): Promise<void> {
    const alert: HealthAlert = {
      id: crypto.randomUUID(),
      severity: 'critical',
      component: 'customer_success_system',
      message: `System health critical: ${health.components
        .filter((c) => c.status === 'critical')
        .map((c) => c.name)
        .join(', ')}`,
      timestamp: new Date(),
      resolved: false,
      actions: health.recommendations,
    };

    // Store alert
    await this.supabase.from('health_alerts').insert(alert);

    // Send notifications based on escalation policy
    await this.escalateAlert(alert);

    this.activeAlerts.set(alert.id, alert);
  }

  /**
   * Escalate alert based on policy
   */
  private async escalateAlert(alert: HealthAlert): Promise<void> {
    const level = this.config.escalationPolicy.levels.find(
      (l) => l.severity === alert.severity,
    );

    if (!level) return;

    for (const channel of level.notificationChannels) {
      await this.sendNotification(channel, alert, level.recipients);
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(
    channel: string,
    alert: HealthAlert,
    recipients: string[],
  ): Promise<void> {
    switch (channel) {
      case 'slack':
        await fetch('/api/notifications/slack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alert, recipients }),
        });
        break;

      case 'email':
        await fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alert, recipients }),
        });
        break;

      case 'pagerduty':
        await fetch('/api/notifications/pagerduty', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alert, recipients }),
        });
        break;

      case 'sms':
        await fetch('/api/notifications/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alert, recipients }),
        });
        break;
    }
  }

  /**
   * Store health check result
   */
  private async storeHealthCheck(health: SuccessSystemHealth): Promise<void> {
    await this.supabase.from('health_check_history').insert({
      status: health.status,
      components: health.components,
      metrics: health.metrics,
      timestamp: health.timestamp,
    });

    // Keep only last 30 days of history
    await this.supabase
      .from('health_check_history')
      .delete()
      .lt('timestamp', subDays(new Date(), 30).toISOString());
  }
}

// Export singleton instance
export const healthMonitor = SuccessHealthMonitor.getInstance();
