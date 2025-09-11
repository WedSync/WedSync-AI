import { integrationDataManager } from '../database/IntegrationDataManager';
import { IntegrationError, ErrorCategory } from '@/types/integrations';

interface WebhookEndpoint {
  id: string;
  url: string;
  secretKey: string;
  organizationId: string;
  isActive: boolean;
  eventTypes: string[];
  lastHealthCheck?: Date;
  consecutiveFailures: number;
  headers?: Record<string, string>;
  timeout: number;
}

interface HealthReport {
  totalEndpoints: number;
  healthyEndpoints: number;
  unhealthyEndpoints: number;
  averageResponseTime: number;
  worstPerformingEndpoints: EndpointHealthSummary[];
  criticalIssues: string[];
  recommendations: string[];
  reportedAt: Date;
}

interface ResponseCheck {
  url: string;
  statusCode?: number;
  responseTime: number;
  isSuccessful: boolean;
  headers?: Record<string, string>;
  error?: string;
  checkedAt: Date;
}

interface SecurityCheck {
  url: string;
  sslValid: boolean;
  certificateExpiry?: Date;
  vulnerabilities: SecurityVulnerability[];
  securityScore: number;
  checkedAt: Date;
}

interface SecurityVulnerability {
  type: 'ssl' | 'headers' | 'endpoint' | 'authentication';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
  timeoutCount: number;
  measurementPeriod: {
    from: Date;
    to: Date;
  };
}

interface SuccessMetrics {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  timeWindow: TimeWindow;
}

interface TimeWindow {
  from: Date;
  to: Date;
  label: string;
}

interface Anomaly {
  type: 'response_time' | 'success_rate' | 'error_pattern' | 'volume';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  affectedEndpoint: string;
  metrics: Record<string, number>;
  recommendedAction: string;
  autoResolved: boolean;
}

interface EndpointHealthSummary {
  endpointId: string;
  url: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'down';
  responseTime: number;
  successRate: number;
  consecutiveFailures: number;
  lastError?: string;
  uptime: number;
}

interface HealthDashboard {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  totalEndpoints: number;
  healthyEndpoints: number;
  degradedEndpoints: number;
  unhealthyEndpoints: number;
  downEndpoints: number;
  systemMetrics: {
    averageResponseTime: number;
    overallSuccessRate: number;
    totalWebhooksDelivered: number;
    activeIntegrations: number;
  };
  topIssues: Array<{
    issue: string;
    affectedEndpoints: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    estimatedImpact: string;
  }>;
  trends: {
    responseTimeTrend: 'improving' | 'stable' | 'degrading';
    successRateTrend: 'improving' | 'stable' | 'degrading';
    volumeTrend: 'increasing' | 'stable' | 'decreasing';
  };
  generatedAt: Date;
}

/**
 * WebhookHealthMonitor - Comprehensive health monitoring for webhook endpoints
 *
 * This service provides real-time health monitoring, performance tracking, and
 * anomaly detection for all webhook endpoints. Critical for maintaining
 * wedding day reliability and vendor system integrations.
 *
 * Key Features:
 * - Real-time endpoint availability monitoring
 * - Performance metrics tracking and trending
 * - Anomaly detection with automatic alerting
 * - Security compliance monitoring
 * - Wedding industry-specific health requirements
 * - Circuit breaker integration for resilience
 */
export class WebhookHealthMonitor {
  private readonly healthCheckInterval = 300000; // 5 minutes
  private readonly performanceWindow = 3600000; // 1 hour
  private readonly criticalResponseThreshold = 30000; // 30 seconds
  private readonly healthCheckTimeout = 10000; // 10 seconds
  private healthCache = new Map<string, EndpointHealthSummary>();
  private performanceCache = new Map<string, PerformanceMetrics>();
  private intervalIds: NodeJS.Timeout[] = [];

  constructor(
    private readonly userId: string,
    private readonly organizationId: string,
  ) {
    this.startHealthMonitoring();
  }

  /**
   * Monitors availability of multiple webhook endpoints
   * Optimized for wedding industry requirements with priority handling
   */
  async monitorEndpointAvailability(
    endpoints: WebhookEndpoint[],
  ): Promise<HealthReport> {
    const startTime = Date.now();
    const healthChecks: Promise<EndpointHealthSummary>[] = [];

    // Execute health checks in parallel for performance
    for (const endpoint of endpoints) {
      healthChecks.push(this.checkSingleEndpointHealth(endpoint));
    }

    const healthResults = await Promise.allSettled(healthChecks);
    const healthSummaries: EndpointHealthSummary[] = [];
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    let totalResponseTime = 0;
    let healthyCount = 0;
    let unhealthyCount = 0;

    // Process health check results
    for (let i = 0; i < healthResults.length; i++) {
      const result = healthResults[i];
      const endpoint = endpoints[i];

      if (result.status === 'fulfilled') {
        const health = result.value;
        healthSummaries.push(health);

        totalResponseTime += health.responseTime;

        if (health.status === 'healthy') {
          healthyCount++;
        } else {
          unhealthyCount++;

          // Check for critical issues
          if (health.consecutiveFailures >= 5) {
            criticalIssues.push(
              `${endpoint.url} has failed ${health.consecutiveFailures} consecutive times`,
            );
          }

          if (health.responseTime > this.criticalResponseThreshold) {
            criticalIssues.push(
              `${endpoint.url} response time ${health.responseTime}ms exceeds critical threshold`,
            );
          }
        }
      } else {
        unhealthyCount++;
        criticalIssues.push(
          `Health check failed for ${endpoint.url}: ${result.reason}`,
        );
      }
    }

    // Generate recommendations
    if (unhealthyCount > healthyCount) {
      recommendations.push(
        'More than half of endpoints are unhealthy - investigate network connectivity',
      );
    }

    if (totalResponseTime / endpoints.length > 5000) {
      recommendations.push(
        'Average response time is high - consider endpoint optimization',
      );
    }

    if (criticalIssues.length > 0) {
      recommendations.push(
        'Critical issues detected - immediate attention required',
      );
    }

    // Sort by worst performing for prioritization
    const worstPerforming = healthSummaries
      .filter((h) => h.status !== 'healthy')
      .sort((a, b) => b.consecutiveFailures - a.consecutiveFailures)
      .slice(0, 5);

    const report: HealthReport = {
      totalEndpoints: endpoints.length,
      healthyEndpoints: healthyCount,
      unhealthyEndpoints: unhealthyCount,
      averageResponseTime: totalResponseTime / endpoints.length,
      worstPerformingEndpoints: worstPerforming,
      criticalIssues,
      recommendations,
      reportedAt: new Date(),
    };

    // Log health report
    await this.logHealthReport(report);

    return report;
  }

  /**
   * Checks individual endpoint response characteristics
   */
  async checkEndpointResponse(
    endpoint: WebhookEndpoint,
  ): Promise<ResponseCheck> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.healthCheckTimeout,
      );

      const response = await fetch(endpoint.url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'WedSync-Health-Check/1.0',
          Accept: '*/*',
          ...endpoint.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        url: endpoint.url,
        statusCode: response.status,
        responseTime,
        isSuccessful: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        checkedAt: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        url: endpoint.url,
        responseTime,
        isSuccessful: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Validates endpoint security configuration
   */
  async validateEndpointSecurity(
    endpoint: WebhookEndpoint,
  ): Promise<SecurityCheck> {
    const vulnerabilities: SecurityVulnerability[] = [];
    let securityScore = 100;

    try {
      const url = new URL(endpoint.url);

      // Check SSL/TLS configuration
      if (url.protocol !== 'https:') {
        vulnerabilities.push({
          type: 'ssl',
          severity: 'high',
          description: 'Endpoint does not use HTTPS encryption',
          recommendation: 'Switch to HTTPS to encrypt webhook data in transit',
        });
        securityScore -= 30;
      }

      // Test endpoint response for security headers
      const response = await this.checkEndpointResponse(endpoint);

      if (response.isSuccessful && response.headers) {
        // Check for security headers
        const securityHeaders = [
          'strict-transport-security',
          'content-security-policy',
          'x-frame-options',
          'x-content-type-options',
        ];

        for (const header of securityHeaders) {
          if (!response.headers[header]) {
            vulnerabilities.push({
              type: 'headers',
              severity: 'medium',
              description: `Missing security header: ${header}`,
              recommendation: `Add ${header} header to improve security`,
            });
            securityScore -= 5;
          }
        }

        // Check for information disclosure
        const serverHeader = response.headers['server'];
        if (serverHeader && serverHeader.includes('version')) {
          vulnerabilities.push({
            type: 'headers',
            severity: 'low',
            description: 'Server header reveals version information',
            recommendation: 'Remove version information from server header',
          });
          securityScore -= 2;
        }
      }

      // Validate authentication approach
      if (!endpoint.secretKey || endpoint.secretKey.length < 32) {
        vulnerabilities.push({
          type: 'authentication',
          severity: 'high',
          description: 'Webhook secret key is too short or missing',
          recommendation: 'Use a strong secret key of at least 32 characters',
        });
        securityScore -= 25;
      }

      return {
        url: endpoint.url,
        sslValid: url.protocol === 'https:',
        vulnerabilities,
        securityScore: Math.max(0, securityScore),
        checkedAt: new Date(),
      };
    } catch (error) {
      return {
        url: endpoint.url,
        sslValid: false,
        vulnerabilities: [
          {
            type: 'endpoint',
            severity: 'critical',
            description: `Security check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            recommendation: 'Verify endpoint accessibility and configuration',
          },
        ],
        securityScore: 0,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Tracks integration performance metrics over time
   */
  async trackIntegrationPerformance(
    supplierId: string,
  ): Promise<PerformanceMetrics> {
    const cacheKey = `perf_${supplierId}`;
    const cached = this.performanceCache.get(cacheKey);

    // Return cached metrics if recent
    if (cached && Date.now() - cached.measurementPeriod.to.getTime() < 300000) {
      return cached;
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.performanceWindow);

    // This would query actual webhook delivery data from the database
    // For now, we'll simulate performance metrics
    const mockMetrics = await this.calculatePerformanceMetrics(
      supplierId,
      startTime,
      endTime,
    );

    // Cache metrics
    this.performanceCache.set(cacheKey, mockMetrics);

    return mockMetrics;
  }

  /**
   * Monitors delivery success rates within specified time window
   */
  async monitorDeliverySuccess(
    supplierId: string,
    timeWindow: TimeWindow,
  ): Promise<SuccessMetrics> {
    try {
      // This would query actual delivery data from webhook_delivery_log
      const deliveryData = await this.getDeliveryData(supplierId, timeWindow);

      const metrics: SuccessMetrics = {
        totalDeliveries: deliveryData.total,
        successfulDeliveries: deliveryData.successful,
        failedDeliveries: deliveryData.failed,
        successRate:
          deliveryData.total > 0
            ? (deliveryData.successful / deliveryData.total) * 100
            : 0,
        consecutiveSuccesses: deliveryData.consecutiveSuccesses,
        consecutiveFailures: deliveryData.consecutiveFailures,
        lastSuccessAt: deliveryData.lastSuccessAt,
        lastFailureAt: deliveryData.lastFailureAt,
        timeWindow,
      };

      // Log success metrics for trending
      await integrationDataManager.logAudit(
        this.userId,
        supplierId,
        'SUCCESS_METRICS_CALCULATED',
        `metrics_${timeWindow.label}`,
        'performance_tracking',
        {
          successRate: metrics.successRate,
          totalDeliveries: metrics.totalDeliveries,
          timeWindow: timeWindow.label,
        },
      );

      return metrics;
    } catch (error) {
      throw new IntegrationError(
        'Failed to monitor delivery success',
        ErrorCategory.MONITORING_ERROR,
        error,
      );
    }
  }

  /**
   * Detects performance anomalies and patterns
   */
  async detectIntegrationAnomalies(supplierId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      // Get current and historical performance metrics
      const currentMetrics = await this.trackIntegrationPerformance(supplierId);
      const historicalMetrics = await this.getHistoricalMetrics(supplierId);

      // Detect response time anomalies
      if (
        currentMetrics.averageResponseTime >
        historicalMetrics.averageResponseTime * 2
      ) {
        anomalies.push({
          type: 'response_time',
          severity:
            currentMetrics.averageResponseTime > 30000 ? 'critical' : 'high',
          description: `Response time ${currentMetrics.averageResponseTime}ms is ${Math.round(currentMetrics.averageResponseTime / historicalMetrics.averageResponseTime)}x higher than normal`,
          detectedAt: new Date(),
          affectedEndpoint: supplierId,
          metrics: {
            current: currentMetrics.averageResponseTime,
            historical: historicalMetrics.averageResponseTime,
            deviation:
              currentMetrics.averageResponseTime /
              historicalMetrics.averageResponseTime,
          },
          recommendedAction:
            'Check endpoint performance and network connectivity',
          autoResolved: false,
        });
      }

      // Detect success rate anomalies
      if (currentMetrics.successRate < historicalMetrics.successRate * 0.8) {
        anomalies.push({
          type: 'success_rate',
          severity: currentMetrics.successRate < 50 ? 'critical' : 'high',
          description: `Success rate ${currentMetrics.successRate.toFixed(1)}% is significantly lower than historical ${historicalMetrics.successRate.toFixed(1)}%`,
          detectedAt: new Date(),
          affectedEndpoint: supplierId,
          metrics: {
            current: currentMetrics.successRate,
            historical: historicalMetrics.successRate,
            deviation:
              currentMetrics.successRate / historicalMetrics.successRate,
          },
          recommendedAction: 'Review recent failures and endpoint health',
          autoResolved: false,
        });
      }

      // Detect unusual error patterns
      const errorPatterns = await this.analyzeErrorPatterns(supplierId);
      for (const pattern of errorPatterns) {
        if (pattern.frequency > pattern.normalFrequency * 3) {
          anomalies.push({
            type: 'error_pattern',
            severity: 'medium',
            description: `Unusual increase in ${pattern.errorType} errors: ${pattern.frequency} vs normal ${pattern.normalFrequency}`,
            detectedAt: new Date(),
            affectedEndpoint: supplierId,
            metrics: {
              currentFrequency: pattern.frequency,
              normalFrequency: pattern.normalFrequency,
            },
            recommendedAction: `Investigate cause of ${pattern.errorType} errors`,
            autoResolved: false,
          });
        }
      }

      // Log anomaly detection
      if (anomalies.length > 0) {
        await integrationDataManager.logAudit(
          this.userId,
          supplierId,
          'ANOMALIES_DETECTED',
          `anomalies_${Date.now()}`,
          'anomaly_detection',
          {
            anomalyCount: anomalies.length,
            severities: anomalies.map((a) => a.severity),
            types: anomalies.map((a) => a.type),
          },
        );
      }

      return anomalies;
    } catch (error) {
      throw new IntegrationError(
        'Failed to detect integration anomalies',
        ErrorCategory.MONITORING_ERROR,
        error,
      );
    }
  }

  /**
   * Sends alerts when endpoint failures exceed thresholds
   */
  async alertOnEndpointFailure(
    endpoint: WebhookEndpoint,
    failureCount: number,
  ): Promise<void> {
    const isWeddingWeekend = this.isWeddingWeekend(new Date());
    const severity = this.calculateFailureSeverity(
      failureCount,
      isWeddingWeekend,
    );

    try {
      const alertData = {
        endpointId: endpoint.id,
        endpointUrl: endpoint.url,
        failureCount,
        severity,
        isWeddingWeekend,
        organizationId: endpoint.organizationId,
        alertedAt: new Date(),
      };

      // Use webhook notification service for alerts
      const { WebhookNotificationService } = await import(
        './webhook-notification-service'
      );
      const notificationService = new WebhookNotificationService(
        this.userId,
        endpoint.organizationId,
      );

      await notificationService.sendEndpointHealthAlert(
        endpoint.organizationId,
        {
          endpointUrl: endpoint.url,
          isHealthy: false,
          responseTime: 0, // Will be populated by health check
          consecutiveFailures: failureCount,
          lastCheckedAt: new Date(),
          errorDetails: `${failureCount} consecutive failures detected`,
        },
      );

      await integrationDataManager.logAudit(
        this.userId,
        endpoint.organizationId,
        'ENDPOINT_FAILURE_ALERT_SENT',
        endpoint.id,
        'health_alert',
        alertData,
      );
    } catch (error) {
      console.error('Failed to send endpoint failure alert:', error);
    }
  }

  /**
   * Alerts on performance degradation
   */
  async alertOnPerformanceDegradation(
    supplierId: string,
    metrics: PerformanceMetrics,
  ): Promise<void> {
    try {
      const severity = this.calculatePerformanceSeverity(metrics);

      if (severity === 'low') return; // No alert needed for minor degradation

      const { WebhookNotificationService } = await import(
        './webhook-notification-service'
      );
      const notificationService = new WebhookNotificationService(
        this.userId,
        supplierId,
      );

      // Send performance degradation alert
      await notificationService.sendNotification({
        templateId: 'performance_degradation_alert',
        recipients: [{ id: supplierId, type: 'user', value: supplierId }],
        variables: {
          recipientName: await this.getSupplierName(supplierId),
          averageResponseTime: `${metrics.averageResponseTime}ms`,
          successRate: `${metrics.successRate}%`,
          failedRequests: metrics.failedRequests.toString(),
          severity: severity.toUpperCase(),
          measurementPeriod: `${this.formatDuration(metrics.measurementPeriod.to.getTime() - metrics.measurementPeriod.from.getTime())}`,
          recommendedActions: this.getPerformanceRecommendations(metrics),
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/performance`,
        },
        priority: severity === 'critical' ? 'urgent' : 'high',
      });

      await integrationDataManager.logAudit(
        this.userId,
        supplierId,
        'PERFORMANCE_DEGRADATION_ALERT_SENT',
        'performance_alert',
        'health_alert',
        {
          severity,
          averageResponseTime: metrics.averageResponseTime,
          successRate: metrics.successRate,
          failedRequests: metrics.failedRequests,
        },
      );
    } catch (error) {
      console.error('Failed to send performance degradation alert:', error);
    }
  }

  /**
   * Generates comprehensive health dashboard
   */
  async generateHealthDashboard(
    supplierIds: string[],
  ): Promise<HealthDashboard> {
    const dashboardData = {
      healthyEndpoints: 0,
      degradedEndpoints: 0,
      unhealthyEndpoints: 0,
      downEndpoints: 0,
      totalResponseTime: 0,
      totalSuccessRate: 0,
      totalWebhooks: 0,
      issues: new Map<string, number>(),
    };

    // Collect health data for all suppliers
    const healthPromises = supplierIds.map((id) =>
      this.getSupplierHealthSummary(id),
    );
    const healthSummaries = await Promise.allSettled(healthPromises);

    let validSummaries = 0;

    for (const result of healthSummaries) {
      if (result.status === 'fulfilled') {
        const summary = result.value;
        validSummaries++;

        switch (summary.status) {
          case 'healthy':
            dashboardData.healthyEndpoints++;
            break;
          case 'degraded':
            dashboardData.degradedEndpoints++;
            break;
          case 'unhealthy':
            dashboardData.unhealthyEndpoints++;
            break;
          case 'down':
            dashboardData.downEndpoints++;
            break;
        }

        dashboardData.totalResponseTime += summary.responseTime;
        dashboardData.totalSuccessRate += summary.successRate;
        dashboardData.totalWebhooks += summary.totalDeliveries || 0;

        if (summary.lastError) {
          const errorType = this.categorizeError(summary.lastError);
          dashboardData.issues.set(
            errorType,
            (dashboardData.issues.get(errorType) || 0) + 1,
          );
        }
      }
    }

    // Calculate overall health
    const totalEndpoints = supplierIds.length;
    const healthyRatio = dashboardData.healthyEndpoints / totalEndpoints;

    let overallHealth: HealthDashboard['overallHealth'];
    if (healthyRatio >= 0.95) overallHealth = 'excellent';
    else if (healthyRatio >= 0.85) overallHealth = 'good';
    else if (healthyRatio >= 0.7) overallHealth = 'fair';
    else if (healthyRatio >= 0.5) overallHealth = 'poor';
    else overallHealth = 'critical';

    // Generate top issues
    const topIssues = Array.from(dashboardData.issues.entries())
      .map(([issue, count]) => ({
        issue,
        affectedEndpoints: count,
        severity: this.getIssueSeverity(issue, count) as
          | 'low'
          | 'medium'
          | 'high'
          | 'critical',
        estimatedImpact: this.estimateIssueImpact(issue, count, totalEndpoints),
      }))
      .sort((a, b) => b.affectedEndpoints - a.affectedEndpoints)
      .slice(0, 5);

    return {
      overallHealth,
      totalEndpoints,
      healthyEndpoints: dashboardData.healthyEndpoints,
      degradedEndpoints: dashboardData.degradedEndpoints,
      unhealthyEndpoints: dashboardData.unhealthyEndpoints,
      downEndpoints: dashboardData.downEndpoints,
      systemMetrics: {
        averageResponseTime:
          validSummaries > 0
            ? dashboardData.totalResponseTime / validSummaries
            : 0,
        overallSuccessRate:
          validSummaries > 0
            ? dashboardData.totalSuccessRate / validSummaries
            : 0,
        totalWebhooksDelivered: dashboardData.totalWebhooks,
        activeIntegrations:
          dashboardData.healthyEndpoints + dashboardData.degradedEndpoints,
      },
      topIssues,
      trends: {
        responseTimeTrend: await this.calculateTrend(
          'response_time',
          supplierIds,
        ),
        successRateTrend: await this.calculateTrend(
          'success_rate',
          supplierIds,
        ),
        volumeTrend: await this.calculateTrend('volume', supplierIds),
      },
      generatedAt: new Date(),
    };
  }

  // Private utility methods

  private startHealthMonitoring(): void {
    // Start periodic health monitoring
    const healthInterval = setInterval(async () => {
      try {
        await this.performScheduledHealthChecks();
      } catch (error) {
        console.error('Scheduled health check failed:', error);
      }
    }, this.healthCheckInterval);

    this.intervalIds.push(healthInterval);
  }

  private async performScheduledHealthChecks(): Promise<void> {
    // This would get all active endpoints from the database
    const activeEndpoints = await this.getActiveEndpoints();

    if (activeEndpoints.length > 0) {
      await this.monitorEndpointAvailability(activeEndpoints);
    }
  }

  private async checkSingleEndpointHealth(
    endpoint: WebhookEndpoint,
  ): Promise<EndpointHealthSummary> {
    const cacheKey = `health_${endpoint.id}`;
    const cached = this.healthCache.get(cacheKey);

    // Return cached if recent (5 minutes)
    if (cached && Date.now() - cached.uptime < 300000) {
      return cached;
    }

    const responseCheck = await this.checkEndpointResponse(endpoint);
    const performanceMetrics = await this.trackIntegrationPerformance(
      endpoint.organizationId,
    );

    let status: EndpointHealthSummary['status'] = 'healthy';
    if (!responseCheck.isSuccessful) {
      status =
        endpoint.consecutiveFailures >= 10
          ? 'down'
          : endpoint.consecutiveFailures >= 5
            ? 'unhealthy'
            : 'degraded';
    } else if (responseCheck.responseTime > 10000) {
      status = 'degraded';
    }

    const summary: EndpointHealthSummary = {
      endpointId: endpoint.id,
      url: endpoint.url,
      status,
      responseTime: responseCheck.responseTime,
      successRate: performanceMetrics.successRate,
      consecutiveFailures: endpoint.consecutiveFailures,
      lastError: responseCheck.error,
      uptime: Date.now(), // Simplified uptime tracking
    };

    // Cache health summary
    this.healthCache.set(cacheKey, summary);

    return summary;
  }

  private async logHealthReport(report: HealthReport): Promise<void> {
    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'HEALTH_REPORT_GENERATED',
      `report_${Date.now()}`,
      'health_monitoring',
      {
        totalEndpoints: report.totalEndpoints,
        healthyEndpoints: report.healthyEndpoints,
        unhealthyEndpoints: report.unhealthyEndpoints,
        averageResponseTime: report.averageResponseTime,
        criticalIssueCount: report.criticalIssues.length,
      },
    );
  }

  private async calculatePerformanceMetrics(
    supplierId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<PerformanceMetrics> {
    // This would query actual webhook delivery data
    // For now, return mock metrics
    return {
      averageResponseTime: 850,
      p50ResponseTime: 650,
      p95ResponseTime: 2100,
      p99ResponseTime: 4200,
      successRate: 94.5,
      totalRequests: 1250,
      failedRequests: 69,
      timeoutCount: 12,
      measurementPeriod: { from: startTime, to: endTime },
    };
  }

  private async getDeliveryData(supplierId: string, timeWindow: TimeWindow) {
    // This would query webhook_delivery_log table
    return {
      total: 500,
      successful: 475,
      failed: 25,
      consecutiveSuccesses: 15,
      consecutiveFailures: 0,
      lastSuccessAt: new Date(),
      lastFailureAt: new Date(Date.now() - 3600000),
    };
  }

  private async getHistoricalMetrics(
    supplierId: string,
  ): Promise<PerformanceMetrics> {
    // Return historical baseline for comparison
    return {
      averageResponseTime: 650,
      p50ResponseTime: 450,
      p95ResponseTime: 1800,
      p99ResponseTime: 3200,
      successRate: 97.2,
      totalRequests: 5000,
      failedRequests: 140,
      timeoutCount: 35,
      measurementPeriod: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    };
  }

  private async analyzeErrorPatterns(supplierId: string) {
    // This would analyze error patterns from logs
    return [
      {
        errorType: 'timeout',
        frequency: 8,
        normalFrequency: 2,
      },
      {
        errorType: 'connection_refused',
        frequency: 5,
        normalFrequency: 1,
      },
    ];
  }

  private isWeddingWeekend(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Friday, Saturday, Sunday
  }

  private calculateFailureSeverity(
    failureCount: number,
    isWeddingWeekend: boolean,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Wedding weekends get higher severity
    const multiplier = isWeddingWeekend ? 0.5 : 1;

    if (failureCount >= 10 * multiplier) return 'critical';
    if (failureCount >= 5 * multiplier) return 'high';
    if (failureCount >= 3 * multiplier) return 'medium';
    return 'low';
  }

  private calculatePerformanceSeverity(
    metrics: PerformanceMetrics,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (metrics.successRate < 50 || metrics.averageResponseTime > 30000)
      return 'critical';
    if (metrics.successRate < 80 || metrics.averageResponseTime > 10000)
      return 'high';
    if (metrics.successRate < 95 || metrics.averageResponseTime > 5000)
      return 'medium';
    return 'low';
  }

  private getPerformanceRecommendations(metrics: PerformanceMetrics): string {
    const recommendations: string[] = [];

    if (metrics.averageResponseTime > 5000) {
      recommendations.push('Optimize endpoint response times');
    }

    if (metrics.successRate < 95) {
      recommendations.push('Review failed requests and improve error handling');
    }

    if (metrics.timeoutCount > metrics.totalRequests * 0.05) {
      recommendations.push('Consider increasing timeout values');
    }

    return recommendations.join('; ');
  }

  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours > 0) return `${hours} hours`;

    const minutes = Math.floor(ms / (1000 * 60));
    return `${minutes} minutes`;
  }

  private async getSupplierName(supplierId: string): Promise<string> {
    // This would query the supplier/organization name
    return `Supplier ${supplierId.substring(0, 8)}`;
  }

  private async getActiveEndpoints(): Promise<WebhookEndpoint[]> {
    // This would query active webhook endpoints from the database
    return [];
  }

  private async getSupplierHealthSummary(
    supplierId: string,
  ): Promise<EndpointHealthSummary & { totalDeliveries?: number }> {
    // Mock supplier health summary
    return {
      endpointId: supplierId,
      url: `https://api.supplier${supplierId.slice(-3)}.com/webhooks`,
      status: Math.random() > 0.8 ? 'unhealthy' : 'healthy',
      responseTime: Math.random() * 2000 + 500,
      successRate: Math.random() * 20 + 80,
      consecutiveFailures:
        Math.random() > 0.9 ? Math.floor(Math.random() * 5) : 0,
      uptime: Date.now(),
      totalDeliveries: Math.floor(Math.random() * 500) + 100,
    };
  }

  private categorizeError(error: string): string {
    if (error.includes('timeout')) return 'Connection Timeout';
    if (error.includes('refused')) return 'Connection Refused';
    if (error.includes('404')) return 'Endpoint Not Found';
    if (error.includes('500')) return 'Server Error';
    if (error.includes('authentication')) return 'Authentication Failed';
    return 'Unknown Error';
  }

  private getIssueSeverity(issue: string, count: number): string {
    if (count >= 10) return 'critical';
    if (count >= 5) return 'high';
    if (count >= 3) return 'medium';
    return 'low';
  }

  private estimateIssueImpact(
    issue: string,
    count: number,
    totalEndpoints: number,
  ): string {
    const percentage = (count / totalEndpoints) * 100;

    if (percentage >= 50) return 'Severe - affects majority of integrations';
    if (percentage >= 25)
      return 'Significant - affects quarter of integrations';
    if (percentage >= 10) return 'Moderate - affects multiple integrations';
    return 'Limited - affects few integrations';
  }

  private async calculateTrend(
    metric: 'response_time' | 'success_rate' | 'volume',
    supplierIds: string[],
  ): Promise<'improving' | 'stable' | 'degrading'> {
    // This would calculate actual trends from historical data
    const trends = ['improving', 'stable', 'degrading'] as const;
    return trends[Math.floor(Math.random() * trends.length)];
  }

  // Cleanup method
  public destroy(): void {
    for (const intervalId of this.intervalIds) {
      clearInterval(intervalId);
    }
    this.intervalIds = [];
    this.healthCache.clear();
    this.performanceCache.clear();
  }
}
