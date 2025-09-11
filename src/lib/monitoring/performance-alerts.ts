/**
 * Performance Monitoring Alert Configuration
 * Enhanced alerting for web vitals, API performance, and database monitoring
 * FEATURE: WS-104 - Performance Monitoring Backend Infrastructure
 */

import { AlertRule } from './alerts';
import { alertManager } from './alerts';
import { logger } from './structured-logger';
import { metrics } from './metrics';

// Performance specific alert rules
export const performanceAlertRules: AlertRule[] = [
  // Web Vitals Performance Alerts
  {
    id: 'web-vitals-lcp-budget-violation',
    name: 'Web Vitals - LCP Budget Violation',
    description: 'Largest Contentful Paint exceeds performance budget (2.5s)',
    enabled: true,
    severity: 'warning',
    condition: {
      type: 'threshold',
      metric: 'web_vitals.lcp.p95',
      operator: 'gt',
      value: 2500, // 2.5 seconds
      timeWindow: 10,
      evaluationInterval: 60,
      aggregation: 'avg',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
    ],
    cooldown: 15,
    triggerCount: 0,
  },
  {
    id: 'web-vitals-lcp-critical',
    name: 'Web Vitals - Critical LCP Performance',
    description: 'Largest Contentful Paint severely degraded (>4s)',
    enabled: true,
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'web_vitals.lcp.p95',
      operator: 'gt',
      value: 4000, // 4 seconds
      timeWindow: 5,
      evaluationInterval: 30,
      aggregation: 'avg',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      {
        type: 'pagerduty',
        config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
        enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
      },
    ],
    cooldown: 5,
    escalation: {
      levels: [
        {
          afterMinutes: 5,
          severity: 'critical',
          additionalChannels: [
            {
              type: 'sms',
              config: { numbers: process.env.ALERT_SMS_NUMBERS?.split(',') },
              enabled: !!process.env.ALERT_SMS_NUMBERS,
            },
          ],
        },
      ],
    },
    triggerCount: 0,
  },
  {
    id: 'web-vitals-fid-budget-violation',
    name: 'Web Vitals - FID Budget Violation',
    description: 'First Input Delay exceeds performance budget (100ms)',
    enabled: true,
    severity: 'warning',
    condition: {
      type: 'threshold',
      metric: 'web_vitals.fid.p95',
      operator: 'gt',
      value: 100,
      timeWindow: 10,
      evaluationInterval: 60,
      aggregation: 'avg',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
    ],
    cooldown: 20,
    triggerCount: 0,
  },
  {
    id: 'web-vitals-cls-budget-violation',
    name: 'Web Vitals - CLS Budget Violation',
    description: 'Cumulative Layout Shift exceeds performance budget (0.1)',
    enabled: true,
    severity: 'warning',
    condition: {
      type: 'threshold',
      metric: 'web_vitals.cls.p95',
      operator: 'gt',
      value: 0.1,
      timeWindow: 15,
      evaluationInterval: 120,
      aggregation: 'avg',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
    ],
    cooldown: 30,
    triggerCount: 0,
  },

  // Critical Page Performance Alerts
  {
    id: 'critical-page-performance-degradation',
    name: 'Critical Page Performance Degradation',
    description: 'Performance issues on wedding-critical pages',
    enabled: true,
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'web_vitals.critical_page_violations',
      operator: 'gt',
      value: 3, // More than 3 violations in time window
      timeWindow: 10,
      evaluationInterval: 60,
      aggregation: 'sum',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      {
        type: 'pagerduty',
        config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
        enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
      },
    ],
    cooldown: 10,
    triggerCount: 0,
  },

  // Wedding Impact Performance Alerts
  {
    id: 'wedding-critical-performance-impact',
    name: 'Wedding Critical Performance Impact',
    description: 'Performance issues affecting active wedding operations',
    enabled: true,
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'web_vitals.wedding_impact.critical',
      operator: 'gt',
      value: 1, // Any critical wedding impact
      timeWindow: 5,
      evaluationInterval: 30,
      aggregation: 'sum',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      {
        type: 'pagerduty',
        config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
        enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
      },
      {
        type: 'email',
        config: { recipients: process.env.BUSINESS_ALERT_EMAILS?.split(',') },
        enabled: !!process.env.BUSINESS_ALERT_EMAILS,
      },
    ],
    cooldown: 5,
    escalation: {
      levels: [
        {
          afterMinutes: 3,
          severity: 'critical',
          additionalChannels: [
            {
              type: 'sms',
              config: { numbers: process.env.ALERT_SMS_NUMBERS?.split(',') },
              enabled: !!process.env.ALERT_SMS_NUMBERS,
            },
          ],
        },
      ],
    },
    triggerCount: 0,
  },

  // API Performance Alerts
  {
    id: 'api-response-time-p99-critical',
    name: 'API P99 Response Time Critical',
    description: 'API P99 response time exceeds 5 seconds',
    enabled: true,
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'performance.response_time.p99',
      operator: 'gt',
      value: 5000,
      timeWindow: 5,
      evaluationInterval: 60,
      aggregation: 'avg',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      {
        type: 'pagerduty',
        config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
        enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
      },
    ],
    cooldown: 10,
    triggerCount: 0,
  },
  {
    id: 'api-slow-requests-spike',
    name: 'API Slow Requests Spike',
    description: 'High number of slow API requests (>1s)',
    enabled: true,
    severity: 'warning',
    condition: {
      type: 'threshold',
      metric: 'performance.slow_requests.rate',
      operator: 'gt',
      value: 10, // More than 10 slow requests per minute
      timeWindow: 5,
      evaluationInterval: 60,
      aggregation: 'sum',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
    ],
    cooldown: 15,
    triggerCount: 0,
  },
  {
    id: 'api-very-slow-requests',
    name: 'API Very Slow Requests',
    description: 'Extremely slow API requests detected (>5s)',
    enabled: true,
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'performance.very_slow_requests.rate',
      operator: 'gt',
      value: 2, // More than 2 very slow requests
      timeWindow: 10,
      evaluationInterval: 60,
      aggregation: 'sum',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      {
        type: 'pagerduty',
        config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
        enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
      },
    ],
    cooldown: 5,
    triggerCount: 0,
  },

  // Database Performance Alerts
  {
    id: 'db-very-slow-query-alert',
    name: 'Database Very Slow Query Alert',
    description: 'Extremely slow database queries detected (>5s)',
    enabled: true,
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'db.alerts.very_slow_query',
      operator: 'gt',
      value: 1, // Any very slow query
      timeWindow: 5,
      evaluationInterval: 60,
      aggregation: 'sum',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      {
        type: 'pagerduty',
        config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
        enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
      },
    ],
    cooldown: 10,
    triggerCount: 0,
  },
  {
    id: 'db-connection-pool-high-utilization',
    name: 'Database Connection Pool High Utilization',
    description: 'Database connection pool utilization exceeds 90%',
    enabled: true,
    severity: 'warning',
    condition: {
      type: 'threshold',
      metric: 'db.connection_pool.utilization',
      operator: 'gt',
      value: 90,
      timeWindow: 10,
      evaluationInterval: 60,
      aggregation: 'avg',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
    ],
    cooldown: 20,
    triggerCount: 0,
  },
  {
    id: 'db-wedding-critical-slow-queries',
    name: 'Wedding Critical Database Slow Queries',
    description: 'Slow queries affecting wedding-critical operations',
    enabled: true,
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'db.wedding_impact.slow_queries',
      operator: 'gt',
      value: 2, // More than 2 wedding-critical slow queries
      timeWindow: 10,
      evaluationInterval: 60,
      aggregation: 'sum',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      {
        type: 'pagerduty',
        config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
        enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
      },
    ],
    cooldown: 10,
    triggerCount: 0,
  },

  // System Performance Alerts
  {
    id: 'system-cpu-critical',
    name: 'System CPU Critical',
    description: 'CPU usage exceeds 95%',
    enabled: true,
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'system.cpu.usage',
      operator: 'gt',
      value: 95,
      timeWindow: 5,
      evaluationInterval: 30,
      aggregation: 'avg',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      {
        type: 'pagerduty',
        config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
        enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
      },
    ],
    cooldown: 5,
    escalation: {
      levels: [
        {
          afterMinutes: 5,
          severity: 'critical',
          additionalChannels: [
            {
              type: 'sms',
              config: { numbers: process.env.ALERT_SMS_NUMBERS?.split(',') },
              enabled: !!process.env.ALERT_SMS_NUMBERS,
            },
          ],
        },
      ],
    },
    triggerCount: 0,
  },
  {
    id: 'system-memory-critical',
    name: 'System Memory Critical',
    description: 'Memory usage exceeds 95%',
    enabled: true,
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'system.memory.usage_percentage',
      operator: 'gt',
      value: 95,
      timeWindow: 3,
      evaluationInterval: 30,
      aggregation: 'avg',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      {
        type: 'pagerduty',
        config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
        enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
      },
    ],
    cooldown: 5,
    escalation: {
      levels: [
        {
          afterMinutes: 3,
          severity: 'critical',
          additionalChannels: [
            {
              type: 'sms',
              config: { numbers: process.env.ALERT_SMS_NUMBERS?.split(',') },
              enabled: !!process.env.ALERT_SMS_NUMBERS,
            },
          ],
        },
      ],
    },
    triggerCount: 0,
  },
  {
    id: 'system-event-loop-lag-critical',
    name: 'System Event Loop Lag Critical',
    description: 'Node.js event loop lag exceeds 1 second',
    enabled: true,
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'system.process.event_loop_lag',
      operator: 'gt',
      value: 1000, // 1 second
      timeWindow: 3,
      evaluationInterval: 30,
      aggregation: 'avg',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      {
        type: 'pagerduty',
        config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
        enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
      },
    ],
    cooldown: 5,
    triggerCount: 0,
  },

  // Performance Budget Alerts
  {
    id: 'performance-budget-violations-high',
    name: 'High Performance Budget Violations',
    description: 'Multiple performance budget violations detected',
    enabled: true,
    severity: 'warning',
    condition: {
      type: 'threshold',
      metric: 'web_vitals.budget_violations.rate',
      operator: 'gt',
      value: 5, // More than 5 budget violations per minute
      timeWindow: 10,
      evaluationInterval: 60,
      aggregation: 'sum',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
    ],
    cooldown: 20,
    triggerCount: 0,
  },

  // Mobile Performance Alerts
  {
    id: 'mobile-performance-degradation',
    name: 'Mobile Performance Degradation',
    description: 'Performance issues specifically on mobile devices',
    enabled: true,
    severity: 'warning',
    condition: {
      type: 'threshold',
      metric: 'web_vitals.mobile.budget_violations',
      operator: 'gt',
      value: 3,
      timeWindow: 15,
      evaluationInterval: 120,
      aggregation: 'sum',
    },
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_WEBHOOK_URL },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
    ],
    cooldown: 30,
    triggerCount: 0,
  },
];

// Function to initialize performance alert rules
export function initializePerformanceAlerts(): void {
  logger.info('Initializing performance monitoring alerts', {
    rulesCount: performanceAlertRules.length,
  });

  // Add all performance alert rules to the alert manager
  performanceAlertRules.forEach((rule) => {
    alertManager.addRule(rule);

    logger.debug('Performance alert rule added', {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      metric: rule.condition.metric,
      enabled: rule.enabled,
    });
  });

  // Record initialization metrics
  metrics.setGauge(
    'performance_alerts.rules_count',
    performanceAlertRules.length,
  );
  metrics.setGauge(
    'performance_alerts.enabled_rules',
    performanceAlertRules.filter((r) => r.enabled).length,
  );

  logger.info('Performance monitoring alerts initialized successfully', {
    totalRules: performanceAlertRules.length,
    enabledRules: performanceAlertRules.filter((r) => r.enabled).length,
    categories: {
      webVitals: performanceAlertRules.filter((r) =>
        r.id.includes('web-vitals'),
      ).length,
      api: performanceAlertRules.filter((r) => r.id.includes('api')).length,
      database: performanceAlertRules.filter((r) => r.id.includes('db')).length,
      system: performanceAlertRules.filter((r) => r.id.includes('system'))
        .length,
      wedding: performanceAlertRules.filter((r) => r.id.includes('wedding'))
        .length,
    },
  });
}

// Function to trigger custom performance alerts
export interface CustomPerformanceAlert {
  type: 'web_vitals' | 'api_performance' | 'database' | 'system' | 'business';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold?: number;
  metadata?: Record<string, any>;
}

export function triggerCustomPerformanceAlert(
  alert: CustomPerformanceAlert,
): void {
  const alertData = {
    type: 'performance_monitoring',
    severity: alert.severity,
    message: alert.message,
    details: {
      alertType: alert.type,
      value: alert.value,
      threshold: alert.threshold,
      metadata: alert.metadata || {},
      timestamp: Date.now(),
    },
  };

  logger.warn('Custom performance alert triggered', alertData);

  // Record metrics
  metrics.incrementCounter('performance_alerts.custom_triggered', 1, {
    alert_type: alert.type,
    severity: alert.severity,
  });

  // Send to alert manager
  alertManager.triggerAlert(alertData);
}

// Performance alert utilities
export class PerformanceAlertUtils {
  static assessWeddingImpact(
    metric: string,
    value: number,
    weddingContext?: {
      clientId?: string;
      vendorId?: string;
      weddingDate?: string;
    },
  ): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (!weddingContext) return 'none';

    // Calculate days until wedding if date is provided
    let daysUntilWedding = Infinity;
    if (weddingContext.weddingDate) {
      const weddingDate = new Date(weddingContext.weddingDate);
      const now = new Date();
      daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - now.getTime()) / (1000 * 3600 * 24),
      );
    }

    // Define critical metrics
    const criticalMetrics = [
      'web_vitals.lcp',
      'web_vitals.fid',
      'performance.response_time',
    ];
    const isCriticalMetric = criticalMetrics.some((cm) => metric.includes(cm));

    // Impact assessment logic
    if (daysUntilWedding <= 1 && isCriticalMetric) {
      return 'critical';
    } else if (daysUntilWedding <= 7 && isCriticalMetric) {
      return 'high';
    } else if (daysUntilWedding <= 30 && isCriticalMetric) {
      return 'medium';
    } else if (isCriticalMetric) {
      return 'low';
    }

    return 'none';
  }

  static shouldEscalateAlert(
    metric: string,
    value: number,
    severity: string,
    weddingContext?: any,
  ): boolean {
    // Escalate critical alerts affecting wedding operations
    if (severity === 'critical' && weddingContext) {
      const impact = this.assessWeddingImpact(metric, value, weddingContext);
      return impact === 'critical' || impact === 'high';
    }

    // Escalate system-critical alerts
    const systemCriticalMetrics = [
      'system.cpu.usage',
      'system.memory.usage_percentage',
      'system.process.event_loop_lag',
    ];

    if (severity === 'critical' && systemCriticalMetrics.includes(metric)) {
      return true;
    }

    return false;
  }

  static formatAlertMessage(
    metric: string,
    value: number,
    threshold: number,
    weddingContext?: any,
  ): string {
    const baseMessage = `${metric} is ${value.toFixed(2)} (threshold: ${threshold})`;

    if (weddingContext) {
      const impact = this.assessWeddingImpact(metric, value, weddingContext);
      const weddingInfo = [];

      if (weddingContext.clientId) {
        weddingInfo.push(`Client: ${weddingContext.clientId}`);
      }

      if (weddingContext.weddingDate) {
        const weddingDate = new Date(weddingContext.weddingDate);
        const now = new Date();
        const daysUntil = Math.ceil(
          (weddingDate.getTime() - now.getTime()) / (1000 * 3600 * 24),
        );
        weddingInfo.push(`Wedding in ${daysUntil} days`);
      }

      return `${baseMessage}. Wedding Impact: ${impact.toUpperCase()}. ${weddingInfo.join(', ')}`;
    }

    return baseMessage;
  }
}

// Export alert utilities
export const performanceAlertUtils = new PerformanceAlertUtils();
