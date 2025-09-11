/**
 * Rate Limit Monitoring Integration
 * Real-time monitoring and alerting for distributed rate limiting system
 * Team C - WS-199 Implementation
 */

import { createClient } from '@supabase/supabase-js';
import { RedisClusterManager, redisClusterManager } from './redis-cluster';
import { logger } from '@/lib/monitoring/structured-logger';
import { NotificationService } from '@/lib/integrations/NotificationService';

export interface RateLimitMetrics {
  timestamp: number;
  endpoint: string;
  identifier: string;
  subscriptionTier: string;
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  requestsPerMinute: number;
  violationsLastHour: number;
  topViolators: Array<{ identifier: string; violations: number }>;
  suspiciousPatterns: string[];
  processingTimeMs: number;
  edgeLocation?: string;
  weddingContext?: {
    isPeakSeason: boolean;
    isSaturday: boolean;
    supplierType?: string;
    operationType?: string;
  };
}

export interface SecurityAlertData {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  identifier: string;
  violationType?: string;
  endpoint?: string;
  details: string[];
  recommendedActions: string[];
  context: {
    weddingContext?: any;
    subscriptionTier?: string;
    userInfo?: any;
  };
}

export interface BusinessMetrics {
  subscriptionTierUsage: Record<string, number>;
  apiEndpointPopularity: Record<string, number>;
  peakTrafficTimes: Array<{ hour: number; requestCount: number }>;
  conversionIndicators: {
    trialToUpgrade: number;
    usageAtLimits: number;
    featureAdoption: Record<string, number>;
  };
  weddingSeasonImpact: {
    trafficMultiplier: number;
    topSupplierTypes: Record<string, number>;
    criticalTimeWindows: string[];
  };
}

export interface MonitoringTarget {
  name: string;
  endpoint: string;
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
  retries: number;
  timeout: number;
  filters?: string[];
}

/**
 * Rate Limit Monitoring Integration for Wedding Platform
 * Publishes real-time metrics and alerts across multiple monitoring systems
 */
export class RateLimitMonitoringIntegration extends RedisClusterManager {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private notificationService = new NotificationService();
  private metricsBuffer: RateLimitMetrics[] = [];
  private alertsBuffer: SecurityAlertData[] = [];
  private readonly BUFFER_FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly BUFFER_MAX_SIZE = 100;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  // Monitoring targets for rate limiting events
  private readonly MONITORING_TARGETS: MonitoringTarget[] = [
    {
      name: 'supabase-realtime',
      endpoint: 'supabase://realtime/rate-limiting',
      enabled: true,
      priority: 'high',
      retries: 3,
      timeout: 2000,
    },
    {
      name: 'analytics-dashboard',
      endpoint: '/api/analytics/events',
      enabled: true,
      priority: 'medium',
      retries: 2,
      timeout: 3000,
      filters: ['rate_limit_check', 'rate_limit_violation'],
    },
    {
      name: 'security-monitoring',
      endpoint: '/api/security/alerts',
      enabled: true,
      priority: 'high',
      retries: 3,
      timeout: 2000,
      filters: ['rate_limit_abuse', 'suspicious_activity'],
    },
    {
      name: 'business-metrics',
      endpoint: '/api/metrics/business',
      enabled: true,
      priority: 'medium',
      retries: 1,
      timeout: 5000,
      filters: ['subscription_usage', 'feature_adoption'],
    },
    {
      name: 'slack-alerts',
      endpoint: 'slack://alerts/rate-limiting',
      enabled: true,
      priority: 'high',
      retries: 2,
      timeout: 3000,
      filters: ['critical_violations', 'system_health'],
    },
  ];

  constructor() {
    super();
    this.startBufferFlusher();
    this.startHealthMonitoring();
  }

  /**
   * Publish rate limiting metrics to all configured monitoring systems
   */
  async publishRateLimitMetrics(metrics: RateLimitMetrics): Promise<void> {
    try {
      // Add wedding context to metrics
      metrics.weddingContext = this.enrichWithWeddingContext(metrics);

      // Buffer metrics for batch processing
      this.metricsBuffer.push(metrics);

      // Flush buffer if it's getting full
      if (this.metricsBuffer.length >= this.BUFFER_MAX_SIZE) {
        await this.flushMetricsBuffer();
      }

      // For critical violations, publish immediately
      if (!metrics.allowed && metrics.violationsLastHour > 10) {
        await this.publishImmediateAlert({
          severity: 'high',
          type: 'rate_limit_abuse_pattern',
          identifier: metrics.identifier,
          endpoint: metrics.endpoint,
          details: [
            `Rate limit violations: ${metrics.violationsLastHour}`,
            `Current usage: ${metrics.currentUsage}/${metrics.limit}`,
            `Suspicious patterns detected: ${metrics.suspiciousPatterns.join(', ')}`,
          ],
          recommendedActions: [
            'Review user activity patterns',
            'Consider temporary rate limit reduction',
            'Investigate potential abuse',
          ],
          context: {
            weddingContext: metrics.weddingContext,
            subscriptionTier: metrics.subscriptionTier,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to publish rate limit metrics', error);
      // Don't throw - monitoring failures shouldn't block rate limiting
    }
  }

  /**
   * Publish immediate security alert for critical violations
   */
  async publishImmediateAlert(alertData: SecurityAlertData): Promise<void> {
    const publishPromises = this.MONITORING_TARGETS.filter(
      (target) => target.enabled && target.priority === 'high',
    ).map((target) =>
      this.publishToTarget(target, {
        type: 'security_alert',
        timestamp: Date.now(),
        severity: alertData.severity,
        data: alertData,
      }),
    );

    await Promise.allSettled(publishPromises);
  }

  /**
   * Publish to Supabase Realtime for admin dashboard updates
   */
  private async publishToSupabaseRealtime(
    metrics: RateLimitMetrics,
  ): Promise<void> {
    try {
      await this.supabase.channel('rate-limiting').send({
        type: 'broadcast',
        event: 'rate_limit_update',
        payload: {
          timestamp: metrics.timestamp,
          endpoint: metrics.endpoint,
          currentLoad: metrics.requestsPerMinute,
          violationsLastHour: metrics.violationsLastHour,
          topViolators: metrics.topViolators,
          weddingSeasonActive: this.isWeddingSeason(),
          edgeHealth: await this.getEdgeLocationHealth(),
          queueStats: this.getProcessingQueueStats(),
        },
      });

      logger.debug('Published rate limit metrics to Supabase Realtime');
    } catch (error) {
      logger.error('Failed to publish to Supabase Realtime', error);
      throw error;
    }
  }

  /**
   * Publish to analytics dashboard for business intelligence
   */
  private async publishToAnalyticsDashboard(
    metrics: RateLimitMetrics,
  ): Promise<void> {
    try {
      const analyticsPayload = {
        eventType: 'rate_limit_check',
        timestamp: metrics.timestamp,
        endpoint: metrics.endpoint,
        allowed: metrics.allowed,
        subscriptionTier: metrics.subscriptionTier,
        processingTime: metrics.processingTimeMs,
        edgeLocation: metrics.edgeLocation,
        weddingMetadata: {
          isPeakSeason: metrics.weddingContext?.isPeakSeason,
          supplierType: metrics.weddingContext?.supplierType,
          operationType: metrics.weddingContext?.operationType,
        },
        usageMetrics: {
          current: metrics.currentUsage,
          limit: metrics.limit,
          utilizationPercent: Math.round(
            (metrics.currentUsage / metrics.limit) * 100,
          ),
        },
      };

      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyticsPayload),
      });

      if (!response.ok) {
        throw new Error(`Analytics API returned ${response.status}`);
      }

      logger.debug('Published rate limit metrics to analytics dashboard');
    } catch (error) {
      logger.error('Failed to publish to analytics dashboard', error);
      throw error;
    }
  }

  /**
   * Publish security alerts for violations and abuse patterns
   */
  private async publishToSecurityMonitoring(
    metrics: RateLimitMetrics,
  ): Promise<void> {
    try {
      // Only alert on violations or suspicious activity
      if (metrics.allowed && metrics.suspiciousPatterns.length === 0) {
        return;
      }

      const securityAlert: SecurityAlertData = {
        severity: this.calculateSecuritySeverity(metrics),
        type: !metrics.allowed ? 'rate_limit_violation' : 'suspicious_activity',
        identifier: metrics.identifier,
        violationType: !metrics.allowed
          ? 'rate_limit_exceeded'
          : 'unusual_patterns',
        endpoint: metrics.endpoint,
        details: [
          `Rate limit status: ${metrics.allowed ? 'allowed' : 'denied'}`,
          `Current usage: ${metrics.currentUsage}/${metrics.limit}`,
          `Violations in last hour: ${metrics.violationsLastHour}`,
          ...metrics.suspiciousPatterns.map(
            (pattern) => `Suspicious pattern: ${pattern}`,
          ),
        ],
        recommendedActions: this.generateSecurityRecommendations(metrics),
        context: {
          weddingContext: metrics.weddingContext,
          subscriptionTier: metrics.subscriptionTier,
          userInfo: {
            identifier: metrics.identifier,
            endpoint: metrics.endpoint,
            edgeLocation: metrics.edgeLocation,
          },
        },
      };

      const response = await fetch('/api/security/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securityAlert),
      });

      if (!response.ok) {
        throw new Error(`Security API returned ${response.status}`);
      }

      logger.info('Published security alert for rate limiting violation', {
        severity: securityAlert.severity,
        type: securityAlert.type,
        identifier: metrics.identifier,
      });
    } catch (error) {
      logger.error('Failed to publish to security monitoring', error);
      throw error;
    }
  }

  /**
   * Publish business metrics for subscription optimization
   */
  private async publishToBusinessMetrics(
    metrics: RateLimitMetrics,
  ): Promise<void> {
    try {
      const businessData = await this.aggregateBusinessMetrics(metrics);

      const response = await fetch('/api/metrics/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'rate_limit_business_impact',
          timestamp: metrics.timestamp,
          subscriptionTier: metrics.subscriptionTier,
          endpoint: metrics.endpoint,
          businessMetrics: businessData,
          conversionSignals: {
            nearLimit: metrics.remaining < 10,
            frequentUser: metrics.requestsPerMinute > 30,
            premiumFeatureUsage: this.isPremiumEndpoint(metrics.endpoint),
            weddingSeasonUser: metrics.weddingContext?.isPeakSeason,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Business metrics API returned ${response.status}`);
      }

      logger.debug('Published business metrics for rate limiting');
    } catch (error) {
      logger.error('Failed to publish business metrics', error);
      throw error;
    }
  }

  /**
   * Send Slack notifications for critical rate limiting events
   */
  private async publishToSlackAlerts(metrics: RateLimitMetrics): Promise<void> {
    try {
      // Only send Slack alerts for high-impact events
      if (metrics.allowed && metrics.violationsLastHour < 5) {
        return;
      }

      const severity = this.calculateSecuritySeverity(metrics);
      if (severity === 'low') return;

      const slackMessage = this.formatSlackMessage(metrics, severity);

      await this.notificationService.sendSlackAlert({
        channel: '#rate-limiting-alerts',
        severity,
        title: `Rate Limiting Alert - ${severity.toUpperCase()}`,
        message: slackMessage,
        metadata: {
          endpoint: metrics.endpoint,
          identifier: metrics.identifier,
          subscriptionTier: metrics.subscriptionTier,
          weddingContext: metrics.weddingContext,
        },
      });

      logger.info('Sent Slack alert for rate limiting event', {
        severity,
        identifier: metrics.identifier,
      });
    } catch (error) {
      logger.error('Failed to send Slack alert', error);
      throw error;
    }
  }

  /**
   * Flush buffered metrics to all monitoring targets
   */
  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Batch publish to all targets
      const publishPromises = this.MONITORING_TARGETS.filter(
        (target) => target.enabled,
      ).map(async (target) => {
        try {
          await this.publishBatchToTarget(target, metricsToFlush);
        } catch (error) {
          logger.warn(
            `Failed to publish to monitoring target: ${target.name}`,
            error,
          );
        }
      });

      await Promise.allSettled(publishPromises);

      logger.debug(
        `Flushed ${metricsToFlush.length} metrics to monitoring targets`,
      );
    } catch (error) {
      logger.error('Failed to flush metrics buffer', error);
      // Put metrics back in buffer if flush failed
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  /**
   * Publish batch of metrics to specific monitoring target
   */
  private async publishBatchToTarget(
    target: MonitoringTarget,
    metrics: RateLimitMetrics[],
  ): Promise<void> {
    // Filter metrics based on target filters
    const filteredMetrics = target.filters
      ? metrics.filter((metric) =>
          this.matchesTargetFilters(metric, target.filters!),
        )
      : metrics;

    if (filteredMetrics.length === 0) return;

    // Route to appropriate publisher based on target
    switch (target.name) {
      case 'supabase-realtime':
        for (const metric of filteredMetrics) {
          await this.publishToSupabaseRealtime(metric);
        }
        break;

      case 'analytics-dashboard':
        for (const metric of filteredMetrics) {
          await this.publishToAnalyticsDashboard(metric);
        }
        break;

      case 'security-monitoring':
        for (const metric of filteredMetrics) {
          await this.publishToSecurityMonitoring(metric);
        }
        break;

      case 'business-metrics':
        for (const metric of filteredMetrics) {
          await this.publishToBusinessMetrics(metric);
        }
        break;

      case 'slack-alerts':
        for (const metric of filteredMetrics) {
          await this.publishToSlackAlerts(metric);
        }
        break;

      default:
        await this.publishToGenericTarget(target, filteredMetrics);
    }
  }

  /**
   * Publish to generic monitoring target
   */
  private async publishToTarget(
    target: MonitoringTarget,
    data: any,
  ): Promise<void> {
    let attempt = 0;
    const maxAttempts = target.retries + 1;

    while (attempt < maxAttempts) {
      try {
        if (target.endpoint.startsWith('http')) {
          const response = await fetch(target.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(target.timeout),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } else {
          // Handle special endpoints (slack://, supabase://, etc.)
          await this.publishToSpecialEndpoint(target.endpoint, data);
        }

        return; // Success
      } catch (error) {
        attempt++;
        const isLastAttempt = attempt >= maxAttempts;

        logger.warn(
          `Failed to publish to ${target.name} (attempt ${attempt}/${maxAttempts})`,
          error,
        );

        if (isLastAttempt) {
          throw error;
        }

        // Exponential backoff for retries
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Publish to generic HTTP endpoint
   */
  private async publishToGenericTarget(
    target: MonitoringTarget,
    metrics: RateLimitMetrics[],
  ): Promise<void> {
    const payload = {
      target: target.name,
      timestamp: Date.now(),
      metrics: metrics.map((metric) => ({
        timestamp: metric.timestamp,
        endpoint: metric.endpoint,
        identifier: metric.identifier,
        allowed: metric.allowed,
        usage: metric.currentUsage,
        limit: metric.limit,
        subscriptionTier: metric.subscriptionTier,
        weddingContext: metric.weddingContext,
      })),
    };

    await this.publishToTarget(target, payload);
  }

  /**
   * Publish to special endpoint formats
   */
  private async publishToSpecialEndpoint(
    endpoint: string,
    data: any,
  ): Promise<void> {
    if (endpoint.startsWith('slack://')) {
      // Handle Slack webhook
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `Rate Limiting Alert: ${data.type}`,
            attachments: [
              {
                color: data.severity === 'critical' ? 'danger' : 'warning',
                fields: [
                  { title: 'Severity', value: data.severity, short: true },
                  { title: 'Type', value: data.type, short: true },
                  {
                    title: 'Timestamp',
                    value: new Date(data.timestamp).toISOString(),
                    short: true,
                  },
                ],
              },
            ],
          }),
        });
      }
    } else if (endpoint.startsWith('supabase://')) {
      // Already handled in publishToSupabaseRealtime
    }
  }

  /**
   * Check if metric matches target filters
   */
  private matchesTargetFilters(
    metric: RateLimitMetrics,
    filters: string[],
  ): boolean {
    const metricType = metric.allowed
      ? 'rate_limit_check'
      : 'rate_limit_violation';

    return filters.some((filter) => {
      switch (filter) {
        case 'rate_limit_check':
          return metric.allowed;
        case 'rate_limit_violation':
          return !metric.allowed;
        case 'rate_limit_abuse':
          return metric.violationsLastHour > 5;
        case 'suspicious_activity':
          return metric.suspiciousPatterns.length > 0;
        case 'subscription_usage':
          return true;
        case 'feature_adoption':
          return this.isPremiumEndpoint(metric.endpoint);
        case 'critical_violations':
          return !metric.allowed && metric.violationsLastHour > 10;
        case 'system_health':
          return true;
        default:
          return metricType.includes(filter);
      }
    });
  }

  /**
   * Enrich metrics with wedding-specific context
   */
  private enrichWithWeddingContext(
    metrics: RateLimitMetrics,
  ): NonNullable<RateLimitMetrics['weddingContext']> {
    return {
      isPeakSeason: this.isWeddingSeason(),
      isSaturday: new Date().getDay() === 6,
      supplierType: this.inferSupplierType(metrics.endpoint),
      operationType: this.inferOperationType(metrics.endpoint),
    };
  }

  /**
   * Calculate security severity level
   */
  private calculateSecuritySeverity(
    metrics: RateLimitMetrics,
  ): SecurityAlertData['severity'] {
    if (metrics.violationsLastHour > 50) return 'critical';
    if (metrics.violationsLastHour > 20) return 'high';
    if (metrics.violationsLastHour > 5 || metrics.suspiciousPatterns.length > 0)
      return 'medium';
    return 'low';
  }

  /**
   * Generate security recommendations based on metrics
   */
  private generateSecurityRecommendations(metrics: RateLimitMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.violationsLastHour > 20) {
      recommendations.push('Consider implementing temporary IP blocking');
      recommendations.push('Investigate for potential DDoS attack');
    }

    if (metrics.suspiciousPatterns.length > 0) {
      recommendations.push('Review user activity patterns for automation');
      recommendations.push('Consider implementing CAPTCHA verification');
    }

    if (
      metrics.subscriptionTier === 'free' &&
      metrics.violationsLastHour > 10
    ) {
      recommendations.push('Suggest subscription upgrade to user');
      recommendations.push('Apply stricter rate limiting to free tier');
    }

    if (metrics.weddingContext?.isSaturday) {
      recommendations.push('Monitor for wedding day service disruptions');
      recommendations.push('Prioritize wedding-critical operations');
    }

    return recommendations;
  }

  /**
   * Aggregate business metrics from rate limiting data
   */
  private async aggregateBusinessMetrics(
    metrics: RateLimitMetrics,
  ): Promise<BusinessMetrics> {
    // This is a simplified version - in production, aggregate from Redis/database
    return {
      subscriptionTierUsage: {
        [metrics.subscriptionTier]: metrics.currentUsage,
      },
      apiEndpointPopularity: {
        [metrics.endpoint]: 1,
      },
      peakTrafficTimes: [
        {
          hour: new Date().getHours(),
          requestCount: metrics.requestsPerMinute,
        },
      ],
      conversionIndicators: {
        trialToUpgrade: metrics.remaining < 10 ? 1 : 0,
        usageAtLimits: metrics.currentUsage > metrics.limit * 0.8 ? 1 : 0,
        featureAdoption: {
          [metrics.endpoint]: 1,
        },
      },
      weddingSeasonImpact: {
        trafficMultiplier: this.isWeddingSeason() ? 1.5 : 1.0,
        topSupplierTypes: {
          [metrics.weddingContext?.supplierType || 'unknown']: 1,
        },
        criticalTimeWindows: metrics.weddingContext?.isSaturday
          ? ['saturday']
          : [],
      },
    };
  }

  /**
   * Format Slack message for rate limiting alerts
   */
  private formatSlackMessage(
    metrics: RateLimitMetrics,
    severity: string,
  ): string {
    const emoji =
      severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : '📊';

    return `${emoji} Rate Limiting Alert - ${severity.toUpperCase()}

**Endpoint:** ${metrics.endpoint}
**Status:** ${metrics.allowed ? '✅ Allowed' : '❌ Rate Limited'}
**Usage:** ${metrics.currentUsage}/${metrics.limit} (${metrics.remaining} remaining)
**Violations (1h):** ${metrics.violationsLastHour}
**Subscription:** ${metrics.subscriptionTier}
${metrics.weddingContext?.isPeakSeason ? '🎩 **Peak Wedding Season**' : ''}
${metrics.weddingContext?.isSaturday ? '💒 **Saturday (Wedding Day)**' : ''}

${metrics.suspiciousPatterns.length > 0 ? `**Suspicious Patterns:**\n${metrics.suspiciousPatterns.map((p) => `• ${p}`).join('\n')}` : ''}`;
  }

  /**
   * Utility methods
   */
  private isWeddingSeason(): boolean {
    const month = new Date().getMonth() + 1;
    return month >= 5 && month <= 9;
  }

  private inferSupplierType(endpoint: string): string {
    if (endpoint.includes('photo')) return 'photographer';
    if (endpoint.includes('venue')) return 'venue';
    if (endpoint.includes('catering')) return 'caterer';
    if (endpoint.includes('floral')) return 'florist';
    return 'general';
  }

  private inferOperationType(endpoint: string): string {
    if (endpoint.includes('booking')) return 'booking';
    if (endpoint.includes('calendar')) return 'scheduling';
    if (endpoint.includes('payment')) return 'billing';
    if (endpoint.includes('client')) return 'client_management';
    return 'general';
  }

  private isPremiumEndpoint(endpoint: string): boolean {
    const premiumEndpoints = [
      '/api/ai/',
      '/api/automation/',
      '/api/advanced/',
      '/api/analytics/',
    ];
    return premiumEndpoints.some((pe) => endpoint.includes(pe));
  }

  private async getEdgeLocationHealth(): Promise<Record<string, string>> {
    try {
      const status = await this.getClusterStatus();
      const health: Record<string, string> = {};

      for (const region of status.activeRegions) {
        health[region] = 'healthy';
      }

      for (const region of status.failedRegions) {
        health[region] = 'unhealthy';
      }

      return health;
    } catch (error) {
      return { error: 'Unable to retrieve health status' };
    }
  }

  private getProcessingQueueStats(): Record<string, number> {
    // This would integrate with webhook and external service queue stats
    return {
      webhookQueue: 0, // webhookProtectionIntegration.getQueueStats()
      externalServiceQueue: 0, // externalServiceRateLimiter.getQueueStats()
    };
  }

  /**
   * Start buffer flushing scheduler
   */
  private startBufferFlusher(): void {
    setInterval(async () => {
      try {
        await this.flushMetricsBuffer();
      } catch (error) {
        logger.error('Buffer flush failed', error);
      }
    }, this.BUFFER_FLUSH_INTERVAL);
  }

  /**
   * Start health monitoring for all targets
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        await this.checkMonitoringTargetsHealth();
      } catch (error) {
        logger.error('Monitoring targets health check failed', error);
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Check health of all monitoring targets
   */
  private async checkMonitoringTargetsHealth(): Promise<void> {
    const healthChecks = this.MONITORING_TARGETS.filter(
      (target) => target.enabled && target.endpoint.startsWith('http'),
    ).map(async (target) => {
      try {
        const response = await fetch(
          target.endpoint.replace('/events', '/health'),
          {
            method: 'GET',
            signal: AbortSignal.timeout(target.timeout),
          },
        );

        return {
          target: target.name,
          healthy: response.ok,
          responseTime: Date.now(),
          status: response.status,
        };
      } catch (error) {
        return {
          target: target.name,
          healthy: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const results = await Promise.allSettled(healthChecks);
    const unhealthyTargets = results
      .filter(
        (result) => result.status === 'fulfilled' && !result.value.healthy,
      )
      .map((result) => (result as PromiseFulfilledResult<any>).value);

    if (unhealthyTargets.length > 0) {
      logger.warn('Unhealthy monitoring targets detected', {
        unhealthyTargets,
      });
    }
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    bufferedMetrics: number;
    bufferedAlerts: number;
    activeTargets: number;
    healthyTargets: number;
  } {
    const activeTargets = this.MONITORING_TARGETS.filter((t) => t.enabled);

    return {
      bufferedMetrics: this.metricsBuffer.length,
      bufferedAlerts: this.alertsBuffer.length,
      activeTargets: activeTargets.length,
      healthyTargets: activeTargets.length, // Simplified
    };
  }

  /**
   * Enable/disable specific monitoring target
   */
  setTargetEnabled(targetName: string, enabled: boolean): boolean {
    const target = this.MONITORING_TARGETS.find((t) => t.name === targetName);
    if (target) {
      target.enabled = enabled;
      logger.info(
        `Monitoring target ${targetName} ${enabled ? 'enabled' : 'disabled'}`,
      );
      return true;
    }
    return false;
  }

  /**
   * Force flush all buffers (emergency use)
   */
  async forceFlushAll(): Promise<void> {
    await Promise.all([this.flushMetricsBuffer(), this.flushAlertsBuffer()]);
  }

  /**
   * Flush alerts buffer (if implemented)
   */
  private async flushAlertsBuffer(): Promise<void> {
    if (this.alertsBuffer.length === 0) return;

    const alertsToFlush = [...this.alertsBuffer];
    this.alertsBuffer = [];

    // Process alerts immediately since they're high priority
    const alertPromises = alertsToFlush.map((alert) =>
      this.publishImmediateAlert(alert),
    );
    await Promise.allSettled(alertPromises);
  }
}

// Export singleton instance
export const rateLimitMonitoringIntegration =
  new RateLimitMonitoringIntegration();

// Wedding-specific monitoring helpers
export function createWeddingMetricsTemplate(
  endpoint: string,
  subscriptionTier: string,
  supplierType: string,
): Partial<RateLimitMetrics> {
  return {
    timestamp: Date.now(),
    endpoint,
    subscriptionTier,
    weddingContext: {
      isPeakSeason:
        new Date().getMonth() + 1 >= 5 && new Date().getMonth() + 1 <= 9,
      isSaturday: new Date().getDay() === 6,
      supplierType,
      operationType: endpoint.includes('booking') ? 'booking' : 'general',
    },
  };
}

export function isWeddingCriticalAlert(metrics: RateLimitMetrics): boolean {
  const criticalConditions = [
    metrics.weddingContext?.isSaturday && !metrics.allowed, // Saturday failures
    metrics.violationsLastHour > 20, // High violation rate
    metrics.endpoint.includes('booking') && !metrics.allowed, // Booking failures
    metrics.endpoint.includes('payment') && !metrics.allowed, // Payment failures
  ];

  return criticalConditions.some((condition) => condition);
}
