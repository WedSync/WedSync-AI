/**
 * WS-155: Production Monitoring System
 * Team C - Batch 15 - Round 3
 * Real-time integration health monitoring and alerting
 */

import { EventEmitter } from 'events';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import * as Sentry from '@sentry/nextjs';

export interface ProviderMetrics {
  provider: string;
  responseTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  uptime: number;
  lastHealthCheck: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export interface SLAViolation {
  provider: string;
  metric: string;
  expected: number;
  actual: number;
  violationTime: Date;
  severity: 'warning' | 'critical';
}

export interface MonitoringConfig {
  healthCheckInterval: number; // milliseconds
  metricsRetention: number; // milliseconds
  slaThresholds: {
    responseTime: number; // milliseconds
    successRate: number; // percentage
    uptime: number; // percentage
  };
  alertChannels: string[];
}

export class ProductionMonitoringSystem extends EventEmitter {
  private supabase: SupabaseClient;
  private redis: Redis;
  private config: MonitoringConfig;
  private monitoringInterval: NodeJS.Timer | null = null;
  private providerMetrics: Map<string, ProviderMetrics[]> = new Map();
  private slaViolations: SLAViolation[] = [];
  private dashboardWebSocket: WebSocket | null = null;

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    this.config = {
      healthCheckInterval: 60000, // 1 minute
      metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
      slaThresholds: {
        responseTime: 3000, // 3 seconds
        successRate: 99, // 99%
        uptime: 99.9, // 99.9%
      },
      alertChannels: ['slack', 'email', 'sms'],
      ...config,
    };

    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    this.initializeMonitoring();
  }

  private async initializeMonitoring(): Promise<void> {
    // Set up real-time subscriptions
    await this.setupRealtimeSubscriptions();

    // Initialize dashboard WebSocket
    this.initializeDashboardWebSocket();

    // Start monitoring loop
    await this.startMonitoring();
  }

  /**
   * Start continuous monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Initial health check
    await this.performHealthChecks();

    // Set up recurring health checks
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);

    this.emit('monitoring:started', { timestamp: new Date() });
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    const providers = ['twilio', 'sendgrid', 'resend', 'slack', 'whatsapp'];
    const healthResults = [];

    for (const provider of providers) {
      const startTime = performance.now();

      try {
        // Perform provider-specific health check
        const health = await this.checkProviderHealth(provider);
        const responseTime = performance.now() - startTime;

        // Calculate metrics
        const metrics = await this.calculateProviderMetrics(provider, {
          responseTime,
          healthy: health.status === 'healthy',
          timestamp: new Date(),
        });

        // Store metrics
        await this.storeMetrics(provider, metrics);

        // Check SLA compliance
        await this.checkSLACompliance(provider, metrics);

        // Update dashboard
        await this.updateDashboard(provider, metrics);

        healthResults.push({ provider, ...metrics });
      } catch (error) {
        console.error(`Health check failed for ${provider}:`, error);
        await this.handleProviderFailure(provider, error);
      }
    }

    // Emit aggregated health status
    this.emit('health:checked', {
      timestamp: new Date(),
      providers: healthResults,
    });
  }

  /**
   * Check individual provider health
   */
  private async checkProviderHealth(provider: string): Promise<any> {
    switch (provider) {
      case 'twilio':
        return await this.checkTwilioHealth();
      case 'sendgrid':
        return await this.checkSendGridHealth();
      case 'resend':
        return await this.checkResendHealth();
      case 'slack':
        return await this.checkSlackHealth();
      case 'whatsapp':
        return await this.checkWhatsAppHealth();
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private async checkTwilioHealth(): Promise<any> {
    // Implement Twilio health check
    const response = await fetch(
      'https://api.twilio.com/2010-04-01/Accounts.json',
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
          ).toString('base64')}`,
        },
      },
    );

    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      statusCode: response.status,
      timestamp: new Date(),
    };
  }

  private async checkSendGridHealth(): Promise<any> {
    // Implement SendGrid health check
    const response = await fetch('https://api.sendgrid.com/v3/user/account', {
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      },
    });

    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      statusCode: response.status,
      timestamp: new Date(),
    };
  }

  private async checkResendHealth(): Promise<any> {
    // Implement Resend health check
    const response = await fetch('https://api.resend.com/emails', {
      method: 'HEAD',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    });

    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      statusCode: response.status,
      timestamp: new Date(),
    };
  }

  private async checkSlackHealth(): Promise<any> {
    // Implement Slack health check
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
    });

    const data = await response.json();
    return {
      status: data.ok ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
    };
  }

  private async checkWhatsAppHealth(): Promise<any> {
    // Implement WhatsApp Business API health check
    const response = await fetch(`${process.env.WHATSAPP_API_URL}/v1/health`, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
    });

    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      statusCode: response.status,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate provider metrics
   */
  private async calculateProviderMetrics(
    provider: string,
    currentCheck: any,
  ): Promise<ProviderMetrics> {
    // Get historical metrics from Redis
    const historicalKey = `metrics:${provider}:history`;
    const history = await this.redis.lrange(historicalKey, 0, -1);
    const historicalMetrics = history.map((h) => JSON.parse(h));

    // Calculate success rate
    const recentChecks = historicalMetrics.slice(-100);
    const successCount = recentChecks.filter((m) => m.healthy).length;
    const successRate = (successCount / Math.max(recentChecks.length, 1)) * 100;

    // Calculate average response time
    const avgResponseTime =
      recentChecks.reduce((sum, m) => sum + (m.responseTime || 0), 0) /
      Math.max(recentChecks.length, 1);

    // Calculate uptime
    const uptimeWindow = 24 * 60 * 60 * 1000; // 24 hours
    const uptimeStart = Date.now() - uptimeWindow;
    const uptimeChecks = historicalMetrics.filter(
      (m) => new Date(m.timestamp).getTime() > uptimeStart,
    );
    const uptimeHealthy = uptimeChecks.filter((m) => m.healthy).length;
    const uptime = (uptimeHealthy / Math.max(uptimeChecks.length, 1)) * 100;

    // Calculate throughput
    const throughputWindow = 60 * 60 * 1000; // 1 hour
    const throughputStart = Date.now() - throughputWindow;
    const throughputMessages = await this.redis.get(
      `throughput:${provider}:${Math.floor(throughputStart / 1000)}`,
    );
    const throughput = parseInt(throughputMessages || '0');

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (!currentCheck.healthy || successRate < 90 || uptime < 95) {
      status = 'unhealthy';
    } else if (successRate < 95 || uptime < 99 || avgResponseTime > 2000) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      provider,
      responseTime: currentCheck.responseTime,
      successRate,
      errorRate: 100 - successRate,
      throughput,
      uptime,
      lastHealthCheck: new Date(),
      status,
    };
  }

  /**
   * Store metrics for historical analysis
   */
  private async storeMetrics(
    provider: string,
    metrics: ProviderMetrics,
  ): Promise<void> {
    // Store in Redis for real-time access
    const historicalKey = `metrics:${provider}:history`;
    await this.redis.lpush(
      historicalKey,
      JSON.stringify({
        ...metrics,
        timestamp: new Date(),
      }),
    );

    // Trim to retention period
    await this.redis.ltrim(historicalKey, 0, 1440); // Keep last 24 hours (1 minute intervals)

    // Store current metrics
    await this.redis.set(
      `metrics:${provider}:current`,
      JSON.stringify(metrics),
      'EX',
      300, // Expire after 5 minutes
    );

    // Store in Supabase for long-term analysis
    await this.supabase.from('provider_metrics').insert({
      provider: provider,
      response_time: metrics.responseTime,
      success_rate: metrics.successRate,
      error_rate: metrics.errorRate,
      throughput: metrics.throughput,
      uptime: metrics.uptime,
      status: metrics.status,
      timestamp: new Date(),
    });

    // Update provider metrics map
    if (!this.providerMetrics.has(provider)) {
      this.providerMetrics.set(provider, []);
    }
    const providerHistory = this.providerMetrics.get(provider)!;
    providerHistory.push(metrics);

    // Keep only recent metrics in memory
    const cutoff = Date.now() - this.config.metricsRetention;
    this.providerMetrics.set(
      provider,
      providerHistory.filter((m) => m.lastHealthCheck.getTime() > cutoff),
    );
  }

  /**
   * Check SLA compliance
   */
  private async checkSLACompliance(
    provider: string,
    metrics: ProviderMetrics,
  ): Promise<void> {
    const violations: SLAViolation[] = [];

    // Check response time SLA
    if (metrics.responseTime > this.config.slaThresholds.responseTime) {
      violations.push({
        provider,
        metric: 'responseTime',
        expected: this.config.slaThresholds.responseTime,
        actual: metrics.responseTime,
        violationTime: new Date(),
        severity:
          metrics.responseTime > this.config.slaThresholds.responseTime * 2
            ? 'critical'
            : 'warning',
      });
    }

    // Check success rate SLA
    if (metrics.successRate < this.config.slaThresholds.successRate) {
      violations.push({
        provider,
        metric: 'successRate',
        expected: this.config.slaThresholds.successRate,
        actual: metrics.successRate,
        violationTime: new Date(),
        severity: metrics.successRate < 90 ? 'critical' : 'warning',
      });
    }

    // Check uptime SLA
    if (metrics.uptime < this.config.slaThresholds.uptime) {
      violations.push({
        provider,
        metric: 'uptime',
        expected: this.config.slaThresholds.uptime,
        actual: metrics.uptime,
        violationTime: new Date(),
        severity: metrics.uptime < 95 ? 'critical' : 'warning',
      });
    }

    // Process violations
    if (violations.length > 0) {
      this.slaViolations.push(...violations);
      await this.handleSLAViolations(violations);
    }
  }

  /**
   * Handle SLA violations
   */
  private async handleSLAViolations(violations: SLAViolation[]): Promise<void> {
    for (const violation of violations) {
      // Log violation
      console.error('SLA Violation:', violation);

      // Send to Sentry
      Sentry.captureEvent({
        message: `SLA violation for ${violation.provider}`,
        level: violation.severity === 'critical' ? 'error' : 'warning',
        extra: violation,
      });

      // Store violation
      await this.supabase.from('sla_violations').insert({
        provider: violation.provider,
        metric: violation.metric,
        expected: violation.expected,
        actual: violation.actual,
        severity: violation.severity,
        violation_time: violation.violationTime,
      });

      // Send alerts
      if (violation.severity === 'critical') {
        await this.sendCriticalAlert(violation);
      } else {
        await this.sendWarningAlert(violation);
      }
    }

    this.emit('sla:violation', violations);
  }

  /**
   * Send critical alert through multiple channels
   */
  private async sendCriticalAlert(violation: SLAViolation): Promise<void> {
    const alertMessage =
      `🚨 CRITICAL SLA VIOLATION\n` +
      `Provider: ${violation.provider}\n` +
      `Metric: ${violation.metric}\n` +
      `Expected: ${violation.expected}\n` +
      `Actual: ${violation.actual}\n` +
      `Time: ${violation.violationTime.toISOString()}`;

    // Send through all configured channels
    const alertPromises = this.config.alertChannels.map((channel) => {
      switch (channel) {
        case 'slack':
          return this.sendSlackAlert(alertMessage, 'critical');
        case 'email':
          return this.sendEmailAlert(alertMessage, 'critical');
        case 'sms':
          return this.sendSMSAlert(alertMessage, 'critical');
        default:
          return Promise.resolve();
      }
    });

    await Promise.all(alertPromises);
  }

  /**
   * Send warning alert
   */
  private async sendWarningAlert(violation: SLAViolation): Promise<void> {
    const alertMessage =
      `⚠️ WARNING: SLA Threshold Approaching\n` +
      `Provider: ${violation.provider}\n` +
      `Metric: ${violation.metric}\n` +
      `Current: ${violation.actual}\n` +
      `Threshold: ${violation.expected}`;

    // Send only to non-critical channels
    await this.sendSlackAlert(alertMessage, 'warning');
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(
    message: string,
    severity: 'critical' | 'warning',
  ): Promise<void> {
    const color = severity === 'critical' ? 'danger' : 'warning';

    await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color,
            text: message,
            footer: 'WedSync Monitoring',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    });
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    message: string,
    severity: 'critical' | 'warning',
  ): Promise<void> {
    // Implementation would use SendGrid or similar
    console.log(`Email alert (${severity}):`, message);
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(
    message: string,
    severity: 'critical' | 'warning',
  ): Promise<void> {
    // Implementation would use Twilio
    if (severity === 'critical') {
      console.log(`SMS alert (${severity}):`, message);
    }
  }

  /**
   * Handle provider failure
   */
  private async handleProviderFailure(
    provider: string,
    error: any,
  ): Promise<void> {
    // Log failure
    console.error(`Provider ${provider} failed:`, error);

    // Update metrics with failure
    const metrics: ProviderMetrics = {
      provider,
      responseTime: 0,
      successRate: 0,
      errorRate: 100,
      throughput: 0,
      uptime: 0,
      lastHealthCheck: new Date(),
      status: 'unhealthy',
    };

    await this.storeMetrics(provider, metrics);

    // Send critical alert
    await this.sendCriticalAlert({
      provider,
      metric: 'availability',
      expected: 1,
      actual: 0,
      violationTime: new Date(),
      severity: 'critical',
    });

    // Emit failure event
    this.emit('provider:failure', { provider, error });
  }

  /**
   * Update dashboard with real-time metrics
   */
  private async updateDashboard(
    provider: string,
    metrics: ProviderMetrics,
  ): Promise<void> {
    // Send metrics to dashboard WebSocket
    if (this.dashboardWebSocket?.readyState === WebSocket.OPEN) {
      this.dashboardWebSocket.send(
        JSON.stringify({
          type: 'metrics:update',
          provider,
          metrics,
          timestamp: new Date(),
        }),
      );
    }

    // Store dashboard data in Redis for quick retrieval
    await this.redis.set(
      `dashboard:${provider}`,
      JSON.stringify(metrics),
      'EX',
      60, // Expire after 1 minute
    );
  }

  /**
   * Initialize dashboard WebSocket
   */
  private initializeDashboardWebSocket(): void {
    if (typeof window !== 'undefined' && 'WebSocket' in window) {
      this.dashboardWebSocket = new WebSocket(
        process.env.NEXT_PUBLIC_WS_URL ||
          'ws://localhost:3000/api/ws/monitoring',
      );

      this.dashboardWebSocket.onopen = () => {
        console.log('Dashboard WebSocket connected');
      };

      this.dashboardWebSocket.onerror = (error) => {
        console.error('Dashboard WebSocket error:', error);
      };

      this.dashboardWebSocket.onclose = () => {
        console.log('Dashboard WebSocket disconnected');
        // Reconnect after 5 seconds
        setTimeout(() => this.initializeDashboardWebSocket(), 5000);
      };
    }
  }

  /**
   * Set up real-time subscriptions
   */
  private async setupRealtimeSubscriptions(): Promise<void> {
    // Subscribe to communication events
    const subscription = this.supabase
      .channel('communication-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'communication_logs',
        },
        async (payload) => {
          await this.handleCommunicationEvent(payload);
        },
      )
      .subscribe();
  }

  /**
   * Handle real-time communication events
   */
  private async handleCommunicationEvent(payload: any): Promise<void> {
    const { new: data } = payload;

    if (data) {
      // Update throughput metrics
      const provider = data.provider;
      const throughputKey = `throughput:${provider}:${Math.floor(Date.now() / 1000)}`;
      await this.redis.incr(throughputKey);
      await this.redis.expire(throughputKey, 3600); // Expire after 1 hour

      // Track delivery status
      if (data.status === 'failed') {
        await this.handleDeliveryFailure(data);
      }
    }
  }

  /**
   * Handle delivery failure
   */
  private async handleDeliveryFailure(data: any): Promise<void> {
    // Increment failure counter
    const failureKey = `failures:${data.provider}:${Math.floor(Date.now() / 60000)}`;
    const failures = await this.redis.incr(failureKey);
    await this.redis.expire(failureKey, 300); // Expire after 5 minutes

    // Check if failure threshold exceeded
    if (failures > 10) {
      await this.sendWarningAlert({
        provider: data.provider,
        metric: 'deliveryFailures',
        expected: 10,
        actual: failures,
        violationTime: new Date(),
        severity: 'warning',
      });
    }
  }

  /**
   * Get current provider status
   */
  public async getProviderStatus(
    provider: string,
  ): Promise<ProviderMetrics | null> {
    const metricsStr = await this.redis.get(`metrics:${provider}:current`);
    return metricsStr ? JSON.parse(metricsStr) : null;
  }

  /**
   * Get all provider statuses
   */
  public async getAllProviderStatuses(): Promise<ProviderMetrics[]> {
    const providers = ['twilio', 'sendgrid', 'resend', 'slack', 'whatsapp'];
    const statuses = [];

    for (const provider of providers) {
      const status = await this.getProviderStatus(provider);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  /**
   * Get SLA compliance report
   */
  public async getSLAComplianceReport(
    startTime: Date,
    endTime: Date,
  ): Promise<any> {
    const { data: violations } = await this.supabase
      .from('sla_violations')
      .select('*')
      .gte('violation_time', startTime.toISOString())
      .lte('violation_time', endTime.toISOString());

    const { data: metrics } = await this.supabase
      .from('provider_metrics')
      .select('*')
      .gte('timestamp', startTime.toISOString())
      .lte('timestamp', endTime.toISOString());

    return {
      violations,
      metrics,
      summary: this.calculateSLASummary(violations, metrics),
    };
  }

  /**
   * Calculate SLA summary
   */
  private calculateSLASummary(violations: any[], metrics: any[]): any {
    const providers = [...new Set(metrics.map((m) => m.provider))];
    const summary: any = {};

    for (const provider of providers) {
      const providerViolations = violations.filter(
        (v) => v.provider === provider,
      );
      const providerMetrics = metrics.filter((m) => m.provider === provider);

      summary[provider] = {
        totalChecks: providerMetrics.length,
        violations: providerViolations.length,
        complianceRate:
          ((providerMetrics.length - providerViolations.length) /
            providerMetrics.length) *
          100,
        averageResponseTime:
          providerMetrics.reduce((sum, m) => sum + m.response_time, 0) /
          providerMetrics.length,
        averageSuccessRate:
          providerMetrics.reduce((sum, m) => sum + m.success_rate, 0) /
          providerMetrics.length,
        averageUptime:
          providerMetrics.reduce((sum, m) => sum + m.uptime, 0) /
          providerMetrics.length,
      };
    }

    return summary;
  }

  /**
   * Stop monitoring
   */
  public async stop(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.dashboardWebSocket) {
      this.dashboardWebSocket.close();
    }

    await this.redis.quit();
    this.emit('monitoring:stopped', { timestamp: new Date() });
  }

  /**
   * Get monitoring health
   */
  public async getMonitoringHealth(): Promise<any> {
    return {
      isRunning: this.monitoringInterval !== null,
      dashboardConnected:
        this.dashboardWebSocket?.readyState === WebSocket.OPEN,
      redisConnected: this.redis.status === 'ready',
      lastHealthCheck: await this.redis.get('monitoring:lastHealthCheck'),
      activeAlerts: this.slaViolations.filter(
        (v) => v.violationTime.getTime() > Date.now() - 3600000,
      ).length,
    };
  }
}

export default ProductionMonitoringSystem;
