/**
 * AI Provider Health Monitor - Real-time provider health tracking
 * Monitors availability, performance, and reliability of AI providers
 * Supports wedding day priority monitoring and automated alerting
 *
 * WS-239 Team C - Integration Focus
 */

import { Logger } from '../../utils/logger';
import { createClient } from '@supabase/supabase-js';
import { AIProvider } from '../ai-providers/AIProviderManager';

// Health monitoring interfaces
export interface ProviderHealthStatus {
  provider: AIProvider;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  responseTime: number;
  errorRate: number;
  rateLimitRemaining: number;
  lastChecked: Date;
  uptime: number; // Percentage over last 24 hours
  issues: HealthIssue[];
  metadata?: Record<string, any>;
}

export interface HealthIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type:
    | 'connectivity'
    | 'performance'
    | 'rate_limit'
    | 'quota'
    | 'authentication'
    | 'other';
  description: string;
  firstDetected: Date;
  lastOccurred: Date;
  occurrenceCount: number;
  resolved: boolean;
  resolution?: string;
  autoResolved: boolean;
}

export interface HealthMetrics {
  timestamp: Date;
  provider: AIProvider;
  responseTime: number;
  success: boolean;
  errorType?: string;
  tokensUsed?: number;
  cost?: number;
  weddingDayRequest?: boolean;
}

export interface HealthAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  provider: AIProvider;
  title: string;
  description: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  suppliersAffected: number;
  weddingDayImpact: boolean;
  escalationLevel: number;
}

export interface HealthCheckConfig {
  intervalSeconds: number;
  timeoutMs: number;
  retryAttempts: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    downtimeMinutes: number;
  };
  weddingDayThresholds: {
    responseTime: number;
    errorRate: number;
    downtimeMinutes: number;
  };
}

/**
 * AI Provider Health Monitor
 * Continuously monitors all AI providers with automated alerting
 */
export class AIProviderHealthMonitor {
  private logger: Logger;
  private supabase: any;

  // Health tracking
  private healthStatuses: Map<AIProvider, ProviderHealthStatus> = new Map();
  private healthHistory: HealthMetrics[] = [];
  private activeIssues: Map<string, HealthIssue> = new Map();
  private activeAlerts: Map<string, HealthAlert> = new Map();

  // Monitoring configuration
  private config: HealthCheckConfig = {
    intervalSeconds: 30,
    timeoutMs: 10000,
    retryAttempts: 3,
    alertThresholds: {
      responseTime: 5000, // 5 seconds
      errorRate: 10, // 10%
      downtimeMinutes: 5,
    },
    weddingDayThresholds: {
      responseTime: 2000, // 2 seconds
      errorRate: 2, // 2%
      downtimeMinutes: 1,
    },
  };

  // Wedding day detection
  private weddingDaySuppliers: Set<string> = new Set();

  // Monitoring intervals
  private healthCheckInterval?: NodeJS.Timeout;
  private alertProcessingInterval?: NodeJS.Timeout;

  constructor() {
    this.logger = new Logger('AIProviderHealthMonitor');

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Initialize monitoring
    this.initializeHealthMonitoring();
    this.initializeWeddingDayDetection();
  }

  /**
   * Check health of specific provider
   */
  async checkProviderHealth(
    provider: AIProvider,
    apiKey?: string,
  ): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Checking health for provider: ${provider}`);

      // Perform health check based on provider type
      const healthCheck = await this.performHealthCheck(provider, apiKey);

      // Calculate metrics
      const responseTime = Date.now() - startTime;
      const errorRate = this.calculateRecentErrorRate(provider);
      const uptime = this.calculateUptime(provider);

      // Determine status
      const status = this.determineHealthStatus(
        healthCheck.success,
        responseTime,
        errorRate,
        uptime,
      );

      // Get current issues
      const issues = Array.from(this.activeIssues.values()).filter((issue) =>
        issue.description.includes(provider),
      );

      const healthStatus: ProviderHealthStatus = {
        provider,
        status,
        responseTime,
        errorRate,
        rateLimitRemaining: healthCheck.rateLimitRemaining || -1,
        lastChecked: new Date(),
        uptime,
        issues,
        metadata: {
          apiKeyProvided: !!apiKey,
          checkDuration: responseTime,
          lastError: healthCheck.error,
        },
      };

      // Update stored status
      this.healthStatuses.set(provider, healthStatus);

      // Record metrics
      await this.recordHealthMetric({
        timestamp: new Date(),
        provider,
        responseTime,
        success: healthCheck.success,
        errorType: healthCheck.error,
        tokensUsed: healthCheck.tokensUsed,
        cost: healthCheck.cost,
      });

      // Check for alerts
      await this.checkForAlerts(healthStatus);

      return healthStatus;
    } catch (error) {
      this.logger.error(`Health check failed for ${provider}`, {
        error: error.message,
      });

      const failedStatus: ProviderHealthStatus = {
        provider,
        status: 'offline',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        rateLimitRemaining: 0,
        lastChecked: new Date(),
        uptime: 0,
        issues: [
          {
            id: `health_check_failure_${Date.now()}`,
            severity: 'critical',
            type: 'connectivity',
            description: `Health check failed: ${error.message}`,
            firstDetected: new Date(),
            lastOccurred: new Date(),
            occurrenceCount: 1,
            resolved: false,
            autoResolved: false,
          },
        ],
      };

      this.healthStatuses.set(provider, failedStatus);
      return failedStatus;
    }
  }

  /**
   * Get current health status for all providers
   */
  getAllProviderHealth(): ProviderHealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  /**
   * Get health history for analysis
   */
  getHealthHistory(
    provider?: AIProvider,
    hoursBack: number = 24,
  ): HealthMetrics[] {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    return this.healthHistory
      .filter(
        (metric) =>
          metric.timestamp >= cutoff &&
          (provider ? metric.provider === provider : true),
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get current active alerts
   */
  getActiveAlerts(): HealthAlert[] {
    return Array.from(this.activeAlerts.values())
      .filter((alert) => !alert.resolvedAt)
      .sort((a, b) => {
        // Sort by severity and wedding day impact
        const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
        const aSeverity = severityOrder[a.severity];
        const bSeverity = severityOrder[b.severity];

        if (aSeverity !== bSeverity) {
          return bSeverity - aSeverity;
        }

        if (a.weddingDayImpact !== b.weddingDayImpact) {
          return a.weddingDayImpact ? -1 : 1;
        }

        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;

      this.logger.info(`Alert acknowledged`, { alertId });

      await this.persistAlert(alert);
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolution?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolvedAt = new Date();

      this.logger.info(`Alert resolved`, { alertId, resolution });

      await this.persistAlert(alert);
    }
  }

  /**
   * Perform routine health check for all providers
   */
  async performRoutineHealthCheck(): Promise<void> {
    const providers = [
      AIProvider.PLATFORM_OPENAI,
      AIProvider.CLIENT_OPENAI,
      AIProvider.CLIENT_ANTHROPIC,
    ];

    const healthCheckPromises = providers.map((provider) =>
      this.checkProviderHealth(provider).catch((error) => {
        this.logger.error(`Routine health check failed for ${provider}`, {
          error: error.message,
        });
        return null;
      }),
    );

    await Promise.all(healthCheckPromises);

    // Update wedding day suppliers list
    await this.updateWeddingDaySuppliers();
  }

  // Private helper methods

  private async performHealthCheck(
    provider: AIProvider,
    apiKey?: string,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      switch (provider) {
        case AIProvider.PLATFORM_OPENAI:
          return await this.checkOpenAIPlatform();

        case AIProvider.CLIENT_OPENAI:
          return await this.checkClientOpenAI(apiKey);

        case AIProvider.CLIENT_ANTHROPIC:
          return await this.checkClientAnthropic(apiKey);

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  private async checkOpenAIPlatform(): Promise<any> {
    try {
      // Use platform OpenAI client for health check
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.WEDSYNC_OPENAI_API_KEY || process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI Platform API returned ${response.status}: ${response.statusText}`,
        );
      }

      // Check rate limit headers
      const rateLimitRemaining = parseInt(
        response.headers.get('x-ratelimit-remaining') || '-1',
      );

      return {
        success: true,
        rateLimitRemaining,
        responseTime: 0, // Will be calculated by caller
        metadata: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        },
      };
    } catch (error) {
      throw new Error(`OpenAI Platform health check failed: ${error.message}`);
    }
  }

  private async checkClientOpenAI(apiKey?: string): Promise<any> {
    if (!apiKey) {
      throw new Error('API key required for client OpenAI health check');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        throw new Error(
          `Client OpenAI API returned ${response.status}: ${response.statusText}`,
        );
      }

      const rateLimitRemaining = parseInt(
        response.headers.get('x-ratelimit-remaining') || '-1',
      );

      return {
        success: true,
        rateLimitRemaining,
        metadata: {
          status: response.status,
        },
      };
    } catch (error) {
      throw new Error(`Client OpenAI health check failed: ${error.message}`);
    }
  }

  private async checkClientAnthropic(apiKey?: string): Promise<any> {
    if (!apiKey) {
      throw new Error('API key required for client Anthropic health check');
    }

    try {
      // Anthropic doesn't have a models endpoint, so we'll do a minimal completion
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (response.status === 200 || response.status === 429) {
        // 200 = success, 429 = rate limited but valid key
        return {
          success: response.status === 200,
          rateLimitRemaining: response.status === 429 ? 0 : 100,
          tokensUsed: response.status === 200 ? 10 : 0,
          metadata: {
            status: response.status,
          },
        };
      }

      throw new Error(
        `Anthropic API returned ${response.status}: ${response.statusText}`,
      );
    } catch (error) {
      throw new Error(`Client Anthropic health check failed: ${error.message}`);
    }
  }

  private calculateRecentErrorRate(provider: AIProvider): number {
    const recentMetrics = this.getHealthHistory(provider, 1); // Last hour

    if (recentMetrics.length === 0) return 0;

    const errorCount = recentMetrics.filter((m) => !m.success).length;
    return (errorCount / recentMetrics.length) * 100;
  }

  private calculateUptime(provider: AIProvider): number {
    const metrics = this.getHealthHistory(provider, 24); // Last 24 hours

    if (metrics.length === 0) return 100;

    const successCount = metrics.filter((m) => m.success).length;
    return (successCount / metrics.length) * 100;
  }

  private determineHealthStatus(
    success: boolean,
    responseTime: number,
    errorRate: number,
    uptime: number,
  ): 'healthy' | 'degraded' | 'unhealthy' | 'offline' {
    if (!success || uptime < 50) {
      return 'offline';
    }

    const isWeddingDay = this.weddingDaySuppliers.size > 0;
    const thresholds = isWeddingDay
      ? this.config.weddingDayThresholds
      : this.config.alertThresholds;

    if (
      errorRate > thresholds.errorRate * 2 ||
      responseTime > thresholds.responseTime * 2
    ) {
      return 'unhealthy';
    }

    if (
      errorRate > thresholds.errorRate ||
      responseTime > thresholds.responseTime ||
      uptime < 95
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  private async recordHealthMetric(metric: HealthMetrics): Promise<void> {
    // Add to in-memory history
    this.healthHistory.push(metric);

    // Keep only last 1000 metrics in memory
    if (this.healthHistory.length > 1000) {
      this.healthHistory = this.healthHistory.slice(-1000);
    }

    // Persist to database
    try {
      const { error } = await this.supabase
        .from('ai_provider_health_metrics')
        .insert({
          timestamp: metric.timestamp.toISOString(),
          provider: metric.provider,
          response_time: metric.responseTime,
          success: metric.success,
          error_type: metric.errorType,
          tokens_used: metric.tokensUsed,
          cost: metric.cost,
          wedding_day_request: metric.weddingDayRequest,
        });

      if (error) {
        this.logger.error(`Failed to persist health metric`, { error });
      }
    } catch (error) {
      this.logger.error(`Health metric persistence failed`, {
        error: error.message,
      });
    }
  }

  private async checkForAlerts(
    healthStatus: ProviderHealthStatus,
  ): Promise<void> {
    const isWeddingDay = this.weddingDaySuppliers.size > 0;
    const thresholds = isWeddingDay
      ? this.config.weddingDayThresholds
      : this.config.alertThresholds;

    // Response time alert
    if (healthStatus.responseTime > thresholds.responseTime) {
      await this.createAlert({
        severity: isWeddingDay ? 'critical' : 'warning',
        provider: healthStatus.provider,
        title: 'High Response Time',
        description: `Provider ${healthStatus.provider} response time ${healthStatus.responseTime}ms exceeds threshold ${thresholds.responseTime}ms`,
        weddingDayImpact: isWeddingDay,
        type: 'performance',
      });
    }

    // Error rate alert
    if (healthStatus.errorRate > thresholds.errorRate) {
      await this.createAlert({
        severity: isWeddingDay ? 'critical' : 'error',
        provider: healthStatus.provider,
        title: 'High Error Rate',
        description: `Provider ${healthStatus.provider} error rate ${healthStatus.errorRate}% exceeds threshold ${thresholds.errorRate}%`,
        weddingDayImpact: isWeddingDay,
        type: 'reliability',
      });
    }

    // Offline status alert
    if (healthStatus.status === 'offline') {
      await this.createAlert({
        severity: 'critical',
        provider: healthStatus.provider,
        title: 'Provider Offline',
        description: `Provider ${healthStatus.provider} is offline and unavailable`,
        weddingDayImpact: isWeddingDay,
        type: 'connectivity',
      });
    }
  }

  private async createAlert(alertData: {
    severity: 'info' | 'warning' | 'error' | 'critical';
    provider: AIProvider;
    title: string;
    description: string;
    weddingDayImpact: boolean;
    type: string;
  }): Promise<void> {
    const alertId = `${alertData.provider}_${alertData.type}_${Date.now()}`;

    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      (alert) =>
        alert.provider === alertData.provider &&
        alert.title === alertData.title &&
        !alert.resolvedAt,
    );

    if (existingAlert) {
      // Update existing alert occurrence count
      existingAlert.escalationLevel += 1;
      return;
    }

    const alert: HealthAlert = {
      id: alertId,
      severity: alertData.severity,
      provider: alertData.provider,
      title: alertData.title,
      description: alertData.description,
      timestamp: new Date(),
      acknowledged: false,
      suppliersAffected: await this.countAffectedSuppliers(alertData.provider),
      weddingDayImpact: alertData.weddingDayImpact,
      escalationLevel: 1,
    };

    this.activeAlerts.set(alertId, alert);

    this.logger.warn(`Health alert created`, {
      alertId,
      severity: alert.severity,
      provider: alert.provider,
      title: alert.title,
    });

    await this.persistAlert(alert);

    // Send notifications for critical alerts
    if (alert.severity === 'critical' || alert.weddingDayImpact) {
      await this.sendAlertNotification(alert);
    }
  }

  private async countAffectedSuppliers(provider: AIProvider): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('organizations')
        .select('id', { count: 'exact' })
        .eq('ai_provider', provider);

      if (error) {
        this.logger.error(`Failed to count affected suppliers`, { error });
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  private async persistAlert(alert: HealthAlert): Promise<void> {
    try {
      const { error } = await this.supabase.from('ai_provider_alerts').upsert({
        alert_id: alert.id,
        severity: alert.severity,
        provider: alert.provider,
        title: alert.title,
        description: alert.description,
        timestamp: alert.timestamp.toISOString(),
        acknowledged: alert.acknowledged,
        resolved_at: alert.resolvedAt?.toISOString(),
        suppliers_affected: alert.suppliersAffected,
        wedding_day_impact: alert.weddingDayImpact,
        escalation_level: alert.escalationLevel,
      });

      if (error) {
        this.logger.error(`Failed to persist alert`, { error });
      }
    } catch (error) {
      this.logger.error(`Alert persistence failed`, { error: error.message });
    }
  }

  private async sendAlertNotification(alert: HealthAlert): Promise<void> {
    // Placeholder for alert notification system
    // Would integrate with Slack, email, SMS, etc.
    this.logger.warn(`CRITICAL ALERT: ${alert.title}`, {
      provider: alert.provider,
      description: alert.description,
      weddingDayImpact: alert.weddingDayImpact,
      suppliersAffected: alert.suppliersAffected,
    });
  }

  private async updateWeddingDaySuppliers(): Promise<void> {
    try {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const { data, error } = await this.supabase
        .from('events')
        .select('organization_id')
        .gte('event_date', today.toISOString().split('T')[0])
        .lte('event_date', tomorrow.toISOString().split('T')[0]);

      if (error) {
        this.logger.error(`Failed to update wedding day suppliers`, { error });
        return;
      }

      this.weddingDaySuppliers.clear();
      (data || []).forEach((event) => {
        this.weddingDaySuppliers.add(event.organization_id);
      });

      if (this.weddingDaySuppliers.size > 0) {
        this.logger.info(`Wedding day suppliers updated`, {
          count: this.weddingDaySuppliers.size,
        });
      }
    } catch (error) {
      this.logger.error(`Wedding day suppliers update failed`, {
        error: error.message,
      });
    }
  }

  private initializeHealthMonitoring(): void {
    // Start routine health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performRoutineHealthCheck();
      } catch (error) {
        this.logger.error(`Routine health check failed`, {
          error: error.message,
        });
      }
    }, this.config.intervalSeconds * 1000);

    this.logger.info(`Health monitoring initialized`, {
      interval: this.config.intervalSeconds,
      timeout: this.config.timeoutMs,
    });
  }

  private initializeWeddingDayDetection(): void {
    // Update wedding day suppliers every hour
    setInterval(
      async () => {
        await this.updateWeddingDaySuppliers();
      },
      60 * 60 * 1000,
    );

    // Initial update
    this.updateWeddingDaySuppliers();
  }

  // Cleanup method for graceful shutdown
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.alertProcessingInterval) {
      clearInterval(this.alertProcessingInterval);
    }

    this.logger.info('AI Provider Health Monitor destroyed');
  }
}

// Export types and service
export type {
  ProviderHealthStatus,
  HealthIssue,
  HealthMetrics,
  HealthAlert,
  HealthCheckConfig,
};
