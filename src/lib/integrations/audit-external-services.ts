/**
 * External Service Integrations for Audit Logging
 * Team C - WS-150 Implementation
 *
 * Features:
 * - DataDog logs integration with structured logging
 * - Elasticsearch audit data sync with bulk operations
 * - Slack/email alert notifications with templates
 * - PagerDuty incident management with escalation
 * - Retry logic and circuit breaker patterns
 * - Rate limiting and batching for efficiency
 */

import { logger } from '@/lib/monitoring/logger';
import { AuditStreamEvent } from '@/lib/websocket/audit-stream';

// Configuration interfaces
export interface ExternalServiceConfig {
  datadog: {
    enabled: boolean;
    apiKey: string;
    host: string;
    tags: string[];
    service: string;
    version: string;
  };
  elasticsearch: {
    enabled: boolean;
    nodes: string[];
    username?: string;
    password?: string;
    index: string;
    batchSize: number;
    flushInterval: number;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    username: string;
    severityChannels: Record<string, string>;
  };
  pagerduty: {
    enabled: boolean;
    routingKey: string;
    apiEndpoint: string;
    severityMappings: Record<string, 'info' | 'warning' | 'error' | 'critical'>;
  };
}

// Retry and circuit breaker configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
  halfOpenAttempts: number;
}

/**
 * DataDog Integration Service
 */
export class DataDogIntegration {
  private config: ExternalServiceConfig['datadog'];
  private circuitBreaker: CircuitBreakerState;
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };

  constructor(config: ExternalServiceConfig['datadog']) {
    this.config = config;
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
      halfOpenAttempts: 0,
    };
  }

  /**
   * Send audit event to DataDog
   */
  public async sendAuditEvent(event: AuditStreamEvent): Promise<void> {
    if (!this.config.enabled) return;

    if (this.isCircuitBreakerOpen()) {
      logger.warn('DataDog circuit breaker is open, skipping event');
      return;
    }

    const logData = {
      timestamp: new Date(event.timestamp).getTime(),
      level: this.mapSeverityToLevel(event.severity),
      message: `Audit Event: ${event.type}`,
      service: this.config.service,
      version: this.config.version,
      host: this.config.host,
      tags: [
        ...this.config.tags,
        `audit_type:${event.type}`,
        `severity:${event.severity}`,
        `source:${event.source}`,
      ],
      attributes: {
        audit_event_id: event.id,
        audit_type: event.type,
        severity: event.severity,
        source: event.source,
        event_data: event.event,
        metadata: event.metadata,
      },
    };

    await this.sendWithRetry(logData);
  }

  /**
   * Send log data with retry logic
   */
  private async sendWithRetry(
    logData: any,
    attempt: number = 1,
  ): Promise<void> {
    try {
      const response = await fetch(
        'https://http-intake.logs.datadoghq.com/v1/input/' + this.config.apiKey,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'DD-API-KEY': this.config.apiKey,
          },
          body: JSON.stringify(logData),
        },
      );

      if (!response.ok) {
        throw new Error(
          `DataDog API error: ${response.status} ${response.statusText}`,
        );
      }

      // Reset circuit breaker on success
      this.resetCircuitBreaker();

      logger.debug('Audit event sent to DataDog successfully', {
        eventId: logData.attributes.audit_event_id,
        level: logData.level,
      });
    } catch (error) {
      this.handleFailure();

      if (attempt < this.retryConfig.maxRetries) {
        const delay = Math.min(
          this.retryConfig.baseDelay *
            Math.pow(this.retryConfig.backoffFactor, attempt - 1),
          this.retryConfig.maxDelay,
        );

        logger.warn(`DataDog send failed, retrying in ${delay}ms`, {
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWithRetry(logData, attempt + 1);
      }

      logger.error(
        'Failed to send audit event to DataDog after all retries',
        error,
      );
      throw error;
    }
  }

  private mapSeverityToLevel(severity: string): string {
    const mapping: Record<string, string> = {
      low: 'info',
      medium: 'warn',
      high: 'error',
      critical: 'error',
    };
    return mapping[severity] || 'info';
  }

  private isCircuitBreakerOpen(): boolean {
    const now = Date.now();
    const timeoutDuration = 60000; // 1 minute

    if (this.circuitBreaker.isOpen) {
      if (now - this.circuitBreaker.lastFailureTime > timeoutDuration) {
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.halfOpenAttempts = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private handleFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= 5) {
      this.circuitBreaker.isOpen = true;
      logger.warn('DataDog circuit breaker opened due to repeated failures');
    }
  }

  private resetCircuitBreaker(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.halfOpenAttempts = 0;
  }
}

/**
 * Elasticsearch Integration Service
 */
export class ElasticsearchIntegration {
  private config: ExternalServiceConfig['elasticsearch'];
  private eventBuffer: any[] = [];
  private flushTimer?: NodeJS.Timeout;
  private circuitBreaker: CircuitBreakerState;

  constructor(config: ExternalServiceConfig['elasticsearch']) {
    this.config = config;
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
      halfOpenAttempts: 0,
    };
    this.startFlushTimer();
  }

  /**
   * Index audit event in Elasticsearch
   */
  public async indexAuditEvent(event: AuditStreamEvent): Promise<void> {
    if (!this.config.enabled) return;

    const document = {
      '@timestamp': new Date(event.timestamp).toISOString(),
      audit_event_id: event.id,
      audit_type: event.type,
      severity: event.severity,
      source: event.source,
      event_data: event.event,
      metadata: event.metadata,
      application: 'wedsync',
      environment: process.env.NODE_ENV || 'development',
    };

    this.eventBuffer.push(document);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flushEvents();
    }
  }

  /**
   * Flush buffered events to Elasticsearch
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0 || this.isCircuitBreakerOpen()) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.bulkIndex(events);
      this.resetCircuitBreaker();
    } catch (error) {
      this.handleFailure();
      logger.error('Failed to flush events to Elasticsearch', {
        eventCount: events.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...events);
    }
  }

  /**
   * Perform bulk indexing to Elasticsearch
   */
  private async bulkIndex(events: any[]): Promise<void> {
    const body = events.flatMap((event) => [
      { index: { _index: this.config.index } },
      event,
    ]);

    const auth =
      this.config.username && this.config.password
        ? { username: this.config.username, password: this.config.password }
        : undefined;

    const response = await fetch(`${this.config.nodes[0]}/_bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth && {
          Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`,
        }),
      },
      body: body.map((item) => JSON.stringify(item)).join('\n') + '\n',
    });

    if (!response.ok) {
      throw new Error(
        `Elasticsearch bulk index failed: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    if (result.errors) {
      const errorItems = result.items.filter((item: any) => item.index.error);
      logger.warn('Some Elasticsearch index operations failed', {
        errorCount: errorItems.length,
        totalItems: result.items.length,
      });
    }

    logger.debug('Successfully indexed events to Elasticsearch', {
      eventCount: events.length,
      took: result.took,
    });
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents().catch((error) => {
        logger.error('Error in Elasticsearch flush timer', error);
      });
    }, this.config.flushInterval);
  }

  private isCircuitBreakerOpen(): boolean {
    const now = Date.now();
    const timeoutDuration = 120000; // 2 minutes

    if (this.circuitBreaker.isOpen) {
      if (now - this.circuitBreaker.lastFailureTime > timeoutDuration) {
        this.circuitBreaker.isOpen = false;
        return false;
      }
      return true;
    }

    return false;
  }

  private handleFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= 3) {
      this.circuitBreaker.isOpen = true;
      logger.warn('Elasticsearch circuit breaker opened');
    }
  }

  private resetCircuitBreaker(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
  }

  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushEvents();
  }
}

/**
 * Slack Integration Service
 */
export class SlackIntegration {
  private config: ExternalServiceConfig['slack'];
  private rateLimiter: { count: number; resetTime: number } = {
    count: 0,
    resetTime: Date.now(),
  };

  constructor(config: ExternalServiceConfig['slack']) {
    this.config = config;
  }

  /**
   * Send audit event notification to Slack
   */
  public async sendAuditAlert(event: AuditStreamEvent): Promise<void> {
    if (!this.config.enabled) return;

    // Only send alerts for medium+ severity
    if (event.severity === 'low') return;

    if (!this.checkRateLimit()) {
      logger.warn('Slack rate limit exceeded, skipping alert');
      return;
    }

    const channel =
      this.config.severityChannels[event.severity] || this.config.channel;
    const color = this.getSeverityColor(event.severity);

    const message = {
      channel,
      username: this.config.username,
      icon_emoji: ':shield:',
      attachments: [
        {
          color,
          title: `🚨 Audit Event: ${event.type.toUpperCase()}`,
          text: this.formatAuditEventForSlack(event),
          fields: [
            {
              title: 'Severity',
              value: event.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Source',
              value: event.source,
              short: true,
            },
            {
              title: 'Timestamp',
              value: new Date(event.timestamp).toISOString(),
              short: true,
            },
            {
              title: 'Event ID',
              value: event.id,
              short: true,
            },
          ],
          footer: 'WedSync Security',
          ts: Math.floor(new Date(event.timestamp).getTime() / 1000),
        },
      ],
    };

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(
          `Slack webhook failed: ${response.status} ${response.statusText}`,
        );
      }

      logger.debug('Audit alert sent to Slack', {
        eventId: event.id,
        severity: event.severity,
        channel,
      });
    } catch (error) {
      logger.error('Failed to send Slack audit alert', error);
      throw error;
    }
  }

  private formatAuditEventForSlack(event: AuditStreamEvent): string {
    let description = '';

    switch (event.type) {
      case 'security':
        description = `Security event detected: ${event.event.description || 'Unknown security event'}`;
        break;
      case 'admin':
        description = `Admin action: ${event.event.action} by ${event.event.adminEmail}`;
        break;
      case 'system':
        description = `System event: ${event.event.description || 'System activity detected'}`;
        break;
      default:
        description = `Audit event: ${event.type}`;
    }

    return description;
  }

  private getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      low: 'good',
      medium: 'warning',
      high: 'danger',
      critical: '#ff0000',
    };
    return colors[severity] || 'good';
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    const maxMessages = 20; // Max 20 messages per minute

    if (now - this.rateLimiter.resetTime > windowSize) {
      this.rateLimiter.count = 0;
      this.rateLimiter.resetTime = now;
    }

    if (this.rateLimiter.count >= maxMessages) {
      return false;
    }

    this.rateLimiter.count++;
    return true;
  }
}

/**
 * PagerDuty Integration Service
 */
export class PagerDutyIntegration {
  private config: ExternalServiceConfig['pagerduty'];

  constructor(config: ExternalServiceConfig['pagerduty']) {
    this.config = config;
  }

  /**
   * Send audit event to PagerDuty
   */
  public async sendIncident(event: AuditStreamEvent): Promise<void> {
    if (!this.config.enabled) return;

    // Only create incidents for high+ severity
    if (!['high', 'critical'].includes(event.severity)) return;

    const incident = {
      routing_key: this.config.routingKey,
      event_action: 'trigger',
      dedup_key: `audit-${event.type}-${event.id}`,
      payload: {
        summary: this.generateIncidentSummary(event),
        severity: this.config.severityMappings[event.severity] || 'error',
        source: event.source,
        component: 'audit-system',
        group: 'security',
        class: event.type,
        custom_details: {
          audit_event_id: event.id,
          event_type: event.type,
          severity: event.severity,
          timestamp: event.timestamp,
          event_data: event.event,
          metadata: event.metadata,
        },
      },
      client: 'WedSync Audit System',
      client_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/audit/${event.id}`,
    };

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incident),
      });

      if (!response.ok) {
        throw new Error(
          `PagerDuty API error: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();

      logger.info('PagerDuty incident created', {
        eventId: event.id,
        incidentKey: result.dedup_key,
        severity: event.severity,
      });
    } catch (error) {
      logger.error('Failed to create PagerDuty incident', error);
      throw error;
    }
  }

  private generateIncidentSummary(event: AuditStreamEvent): string {
    switch (event.type) {
      case 'security':
        return `Security Alert: ${event.event.description || 'Security event detected'}`;
      case 'admin':
        return `Admin Alert: ${event.event.action} by ${event.event.adminEmail}`;
      case 'system':
        return `System Alert: ${event.event.description || 'Critical system event'}`;
      default:
        return `Audit Alert: ${event.type} event with ${event.severity} severity`;
    }
  }
}

/**
 * Main External Services Manager
 */
export class AuditExternalServicesManager {
  private datadog: DataDogIntegration;
  private elasticsearch: ElasticsearchIntegration;
  private slack: SlackIntegration;
  private pagerduty: PagerDutyIntegration;
  private config: ExternalServiceConfig;

  constructor(config: ExternalServiceConfig) {
    this.config = config;
    this.datadog = new DataDogIntegration(config.datadog);
    this.elasticsearch = new ElasticsearchIntegration(config.elasticsearch);
    this.slack = new SlackIntegration(config.slack);
    this.pagerduty = new PagerDutyIntegration(config.pagerduty);
  }

  /**
   * Process audit event through all enabled integrations
   */
  public async processAuditEvent(event: AuditStreamEvent): Promise<void> {
    const processingPromises: Promise<void>[] = [];

    // Send to DataDog (non-blocking)
    if (this.config.datadog.enabled) {
      processingPromises.push(
        this.datadog.sendAuditEvent(event).catch((error) => {
          logger.error('DataDog integration failed', {
            eventId: event.id,
            error,
          });
        }),
      );
    }

    // Send to Elasticsearch (non-blocking)
    if (this.config.elasticsearch.enabled) {
      processingPromises.push(
        this.elasticsearch.indexAuditEvent(event).catch((error) => {
          logger.error('Elasticsearch integration failed', {
            eventId: event.id,
            error,
          });
        }),
      );
    }

    // Send to Slack (non-blocking)
    if (this.config.slack.enabled) {
      processingPromises.push(
        this.slack.sendAuditAlert(event).catch((error) => {
          logger.error('Slack integration failed', {
            eventId: event.id,
            error,
          });
        }),
      );
    }

    // Send to PagerDuty (non-blocking)
    if (this.config.pagerduty.enabled) {
      processingPromises.push(
        this.pagerduty.sendIncident(event).catch((error) => {
          logger.error('PagerDuty integration failed', {
            eventId: event.id,
            error,
          });
        }),
      );
    }

    // Wait for all integrations to complete
    await Promise.allSettled(processingPromises);
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down external services integrations...');
    await this.elasticsearch.shutdown();
    logger.info('External services shutdown complete');
  }

  /**
   * Health check for all services
   */
  public async healthCheck(): Promise<
    Record<string, { status: string; error?: string }>
  > {
    const results: Record<string, { status: string; error?: string }> = {};

    // Test DataDog
    if (this.config.datadog.enabled) {
      try {
        // Simple test event
        await this.datadog.sendAuditEvent({
          id: 'health-check',
          type: 'system',
          severity: 'low',
          timestamp: new Date().toISOString(),
          source: 'health-check',
          event: { description: 'Health check event' },
        });
        results.datadog = { status: 'healthy' };
      } catch (error) {
        results.datadog = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Add similar checks for other services...

    return results;
  }
}

// Export configuration loader
export function loadExternalServicesConfig(): ExternalServiceConfig {
  return {
    datadog: {
      enabled: process.env.DATADOG_ENABLED === 'true',
      apiKey: process.env.DATADOG_API_KEY || '',
      host: process.env.HOSTNAME || 'wedsync-app',
      tags: [
        'service:wedsync',
        'env:' + (process.env.NODE_ENV || 'development'),
      ],
      service: 'wedsync',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    },
    elasticsearch: {
      enabled: process.env.ELASTICSEARCH_ENABLED === 'true',
      nodes: (process.env.ELASTICSEARCH_NODES || 'http://localhost:9200').split(
        ',',
      ),
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
      index: process.env.ELASTICSEARCH_AUDIT_INDEX || 'wedsync-audit-logs',
      batchSize: parseInt(process.env.ELASTICSEARCH_BATCH_SIZE || '100'),
      flushInterval: parseInt(
        process.env.ELASTICSEARCH_FLUSH_INTERVAL || '30000',
      ),
    },
    slack: {
      enabled: process.env.SLACK_ENABLED === 'true',
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      channel: process.env.SLACK_AUDIT_CHANNEL || '#security-alerts',
      username: 'WedSync Security Bot',
      severityChannels: {
        critical: process.env.SLACK_CRITICAL_CHANNEL || '#critical-alerts',
        high: process.env.SLACK_HIGH_CHANNEL || '#security-alerts',
        medium: process.env.SLACK_MEDIUM_CHANNEL || '#security-alerts',
      },
    },
    pagerduty: {
      enabled: process.env.PAGERDUTY_ENABLED === 'true',
      routingKey: process.env.PAGERDUTY_ROUTING_KEY || '',
      apiEndpoint: 'https://events.pagerduty.com/v2/enqueue',
      severityMappings: {
        critical: 'critical',
        high: 'error',
        medium: 'warning',
        low: 'info',
      },
    },
  };
}

// Export singleton instance
const config = loadExternalServicesConfig();
export const auditExternalServices = new AuditExternalServicesManager(config);
