/**
 * WS-177 Alerting Service - Real-time Alert Management
 * Team D Round 1 Implementation - Ultra Hard Thinking Standards
 *
 * Advanced alert management and notification system for wedding platform
 * Celebrity client priority alerts and escalation procedures
 */

import { createClient } from '@supabase/supabase-js';
import {
  SecuritySeverity,
  NotificationChannel,
  WeddingSecurityContext,
  CelebrityTier,
} from './SecurityLayerInterface';

interface AlertRule {
  id: string;
  name: string;
  alertType: AlertType;
  condition: AlertCondition;
  severity: SecuritySeverity;
  enabled: boolean;
  celebrityPriority: boolean;
  notificationChannels: NotificationChannel[];
  escalationRules: EscalationRule[];
  suppressionRules: SuppressionRule[];
}

interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'not_contains';
  value: any;
  timeWindow?: number; // minutes
  aggregation?: 'count' | 'sum' | 'avg' | 'max' | 'min';
}

interface EscalationRule {
  level: number;
  delay: number; // minutes
  condition: string;
  notificationChannels: NotificationChannel[];
  requiredRoles: string[];
  autoActions: AutoAction[];
}

interface SuppressionRule {
  condition: string;
  duration: number; // minutes
  reason: string;
}

interface AutoAction {
  type:
    | 'block_user'
    | 'restrict_access'
    | 'backup_data'
    | 'notify_admin'
    | 'create_incident';
  parameters: Record<string, any>;
}

interface AlertNotification {
  id: string;
  alertId: string;
  channelType: string;
  target: string;
  message: string;
  templateId: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  sentAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
  retryCount: number;
}

interface AlertTemplate {
  id: string;
  name: string;
  alertType: AlertType;
  channelType: string;
  subject: string;
  body: string;
  celebrityTemplate?: string;
  variables: string[];
}

enum AlertType {
  SECURITY_THREAT = 'security_threat',
  CELEBRITY_ACCESS = 'celebrity_access',
  VENDOR_VIOLATION = 'vendor_violation',
  COMPLIANCE_BREACH = 'compliance_breach',
  SYSTEM_HEALTH = 'system_health',
  PERFORMANCE_ISSUE = 'performance_issue',
  DATA_BREACH = 'data_breach',
  AUDIT_TAMPERING = 'audit_tampering',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
}

export class AlertingService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private alertRules: Map<string, AlertRule> = new Map();
  private alertTemplates: Map<string, AlertTemplate> = new Map();
  private activeAlerts: Map<string, any> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private suppressedAlerts: Map<string, Date> = new Map();

  constructor() {
    this.initializeAlertRules();
    this.initializeAlertTemplates();
  }

  /**
   * Initialize and start the alerting service
   */
  async initialize(): Promise<void> {
    console.log(
      '🔔 Alerting Service initializing - Celebrity priority enabled',
    );

    // Load alert rules from database
    await this.loadAlertRules();

    // Load alert templates
    await this.loadAlertTemplates();

    // Start periodic cleanup
    this.startPeriodicCleanup();

    console.log('✅ Alerting Service initialized');
  }

  /**
   * Process an incoming alert
   */
  async processAlert(alert: {
    type: AlertType;
    severity: SecuritySeverity;
    title: string;
    message: string;
    context: WeddingSecurityContext;
    celebrityClient: boolean;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const alertId = crypto.randomUUID();

    // Check if alert should be suppressed
    if (this.isAlertSuppressed(alert)) {
      console.log(`Alert suppressed: ${alert.title}`);
      return alertId;
    }

    // Store alert in database
    await this.storeAlert(alertId, alert);

    // Apply alert rules
    const matchingRules = this.getMatchingRules(alert);

    for (const rule of matchingRules) {
      await this.applyAlertRule(alertId, alert, rule);
    }

    // Schedule escalations
    await this.scheduleEscalations(alertId, alert, matchingRules);

    // Track active alert
    this.activeAlerts.set(alertId, {
      ...alert,
      id: alertId,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });

    console.log(`Alert processed: ${alert.title} (ID: ${alertId})`);
    return alertId;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    userId: string,
    note?: string,
  ): Promise<void> {
    await this.supabase
      .from('security_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
        acknowledgment_note: note,
      })
      .eq('id', alertId);

    // Cancel escalation timers
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    // Update active alerts
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date().toISOString();
    }

    console.log(`Alert acknowledged: ${alertId} by ${userId}`);
  }

  /**
   * Suppress alerts matching certain criteria
   */
  async suppressAlerts(
    condition: AlertCondition,
    duration: number,
    reason: string,
    userId: string,
  ): Promise<void> {
    const suppressionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    await this.supabase.from('alert_suppressions').insert({
      id: suppressionId,
      condition,
      duration_minutes: duration,
      reason,
      created_by: userId,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    // Add to suppression cache
    this.suppressedAlerts.set(suppressionId, expiresAt);

    console.log(
      `Alert suppression created: ${suppressionId} for ${duration} minutes`,
    );
  }

  /**
   * Send immediate high-priority alert
   */
  async sendImmediateAlert(
    type: AlertType,
    severity: SecuritySeverity,
    title: string,
    message: string,
    context: WeddingSecurityContext,
    channels: NotificationChannel[],
  ): Promise<void> {
    const alertId = await this.processAlert({
      type,
      severity,
      title,
      message,
      context,
      celebrityClient: context.celebrityTier === 'celebrity',
    });

    // Send to specified channels immediately
    for (const channel of channels) {
      await this.sendNotification(alertId, channel, {
        title,
        message,
        celebrityClient: context.celebrityTier === 'celebrity',
        severity,
      });
    }
  }

  /**
   * Get active alerts for an organization
   */
  async getActiveAlerts(
    organizationId: string,
    includeAcknowledged: boolean = false,
  ): Promise<any[]> {
    let query = this.supabase
      .from('security_alerts')
      .select(
        `
        id,
        type,
        severity,
        title,
        message,
        context,
        celebrity_client,
        metadata,
        acknowledged,
        acknowledged_by,
        acknowledged_at,
        created_at
      `,
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (!includeAcknowledged) {
      query = query.eq('acknowledged', false);
    }

    const { data } = await query.limit(100);
    return data || [];
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(
    organizationId: string,
    timeRange: { start: string; end: string },
  ): Promise<{
    totalAlerts: number;
    alertsBySeverity: Record<SecuritySeverity, number>;
    alertsByType: Record<AlertType, number>;
    celebrityAlerts: number;
    averageResponseTime: number;
    acknowledgmentRate: number;
  }> {
    const { data } = await this.supabase
      .from('security_alerts')
      .select(
        'severity, type, celebrity_client, acknowledged, created_at, acknowledged_at',
      )
      .eq('organization_id', organizationId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    const alerts = data || [];

    const statistics = {
      totalAlerts: alerts.length,
      alertsBySeverity: this.groupBySeverity(alerts),
      alertsByType: this.groupByType(alerts),
      celebrityAlerts: alerts.filter((a) => a.celebrity_client).length,
      averageResponseTime: this.calculateAverageResponseTime(alerts),
      acknowledgmentRate: this.calculateAcknowledgmentRate(alerts),
    };

    return statistics;
  }

  /**
   * Create custom alert rule
   */
  async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<string> {
    const ruleId = crypto.randomUUID();
    const alertRule: AlertRule = {
      id: ruleId,
      ...rule,
    };

    await this.supabase.from('alert_rules').insert({
      id: ruleId,
      name: rule.name,
      alert_type: rule.alertType,
      condition: rule.condition,
      severity: rule.severity,
      enabled: rule.enabled,
      celebrity_priority: rule.celebrityPriority,
      notification_channels: rule.notificationChannels,
      escalation_rules: rule.escalationRules,
      suppression_rules: rule.suppressionRules,
      created_at: new Date().toISOString(),
    });

    this.alertRules.set(ruleId, alertRule);
    console.log(`Alert rule created: ${rule.name} (ID: ${ruleId})`);
    return ruleId;
  }

  /**
   * Test alert delivery to verify configuration
   */
  async testAlert(
    channels: NotificationChannel[],
    alertType: AlertType = AlertType.SYSTEM_HEALTH,
  ): Promise<{ success: boolean; results: any[] }> {
    const testAlert = {
      id: 'test-' + crypto.randomUUID(),
      type: alertType,
      severity: 'low' as SecuritySeverity,
      title: 'Test Alert - Please Ignore',
      message: 'This is a test alert to verify notification delivery',
      celebrityClient: false,
      timestamp: new Date().toISOString(),
    };

    const results = [];

    for (const channel of channels) {
      try {
        await this.sendNotification(testAlert.id, channel, testAlert);
        results.push({ channel: channel.type, success: true });
      } catch (error) {
        results.push({
          channel: channel.type,
          success: false,
          error: error.message,
        });
      }
    }

    const allSuccessful = results.every((r) => r.success);
    return { success: allSuccessful, results };
  }

  // Private methods

  private initializeAlertRules(): void {
    // Default security alert rules
    const defaultRules: AlertRule[] = [
      {
        id: 'celebrity-access-critical',
        name: 'Celebrity Access - Critical Threat',
        alertType: AlertType.CELEBRITY_ACCESS,
        condition: {
          metric: 'severity',
          operator: 'eq',
          value: 'critical',
        },
        severity: 'critical',
        enabled: true,
        celebrityPriority: true,
        notificationChannels: [
          {
            type: 'pagerduty',
            target: 'security-team',
            priority: 'critical',
            messageTemplate:
              'CRITICAL: Celebrity client security event requires immediate attention',
          },
          {
            type: 'slack',
            target: '#security-celebrity',
            priority: 'critical',
            messageTemplate: 'CELEBRITY ALERT: {{title}} - {{message}}',
          },
        ],
        escalationRules: [
          {
            level: 1,
            delay: 5,
            condition: 'not_acknowledged',
            notificationChannels: [
              {
                type: 'sms',
                target: '+1-555-SECURITY',
                priority: 'critical',
                messageTemplate: 'CELEBRITY SECURITY ALERT: {{title}}',
              },
            ],
            requiredRoles: ['security_manager', 'cto'],
            autoActions: [],
          },
        ],
        suppressionRules: [],
      },
      {
        id: 'vendor-time-violation',
        name: 'Vendor Time Violation',
        alertType: AlertType.VENDOR_VIOLATION,
        condition: {
          metric: 'outside_business_hours',
          operator: 'eq',
          value: true,
        },
        severity: 'medium',
        enabled: true,
        celebrityPriority: false,
        notificationChannels: [
          {
            type: 'slack',
            target: '#vendor-compliance',
            priority: 'medium',
            messageTemplate:
              'Vendor accessed system outside business hours: {{message}}',
          },
        ],
        escalationRules: [],
        suppressionRules: [
          {
            condition: 'same_vendor_within_hour',
            duration: 60,
            reason: 'Prevent spam for same vendor violations',
          },
        ],
      },
      {
        id: 'data-breach-critical',
        name: 'Data Breach Detection',
        alertType: AlertType.DATA_BREACH,
        condition: {
          metric: 'suspected_breach',
          operator: 'eq',
          value: true,
        },
        severity: 'critical',
        enabled: true,
        celebrityPriority: true,
        notificationChannels: [
          {
            type: 'pagerduty',
            target: 'incident-response',
            priority: 'critical',
            messageTemplate:
              'DATA BREACH SUSPECTED: Immediate response required',
          },
        ],
        escalationRules: [
          {
            level: 1,
            delay: 2,
            condition: 'not_acknowledged',
            notificationChannels: [
              {
                type: 'email',
                target: 'legal@wedsync.com',
                priority: 'critical',
                messageTemplate:
                  'Legal notification: Suspected data breach requires immediate review',
              },
            ],
            requiredRoles: ['legal_counsel', 'cto', 'ceo'],
            autoActions: [
              {
                type: 'backup_data',
                parameters: { emergency: true },
              },
            ],
          },
        ],
        suppressionRules: [],
      },
    ];

    defaultRules.forEach((rule) => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private initializeAlertTemplates(): void {
    const templates: AlertTemplate[] = [
      {
        id: 'security-threat-email',
        name: 'Security Threat - Email',
        alertType: AlertType.SECURITY_THREAT,
        channelType: 'email',
        subject: '🚨 Security Alert: {{title}}',
        body: `
Security Alert Details:
- Type: {{type}}
- Severity: {{severity}}
- Message: {{message}}
- Wedding ID: {{weddingId}}
- User ID: {{userId}}
- Timestamp: {{timestamp}}

{{#if celebrityClient}}
⚠️  CELEBRITY CLIENT INVOLVED - Enhanced response required
{{/if}}

Please review and take appropriate action.
        `,
        celebrityTemplate: `
🎭 CELEBRITY CLIENT SECURITY ALERT 🎭

PRIORITY: MAXIMUM
Type: {{type}}
Severity: {{severity}}
Message: {{message}}

CELEBRITY WEDDING DETAILS:
- Wedding ID: {{weddingId}}
- User ID: {{userId}}
- Timestamp: {{timestamp}}

IMMEDIATE ACTION REQUIRED
This alert involves a celebrity client and requires enhanced response procedures.

Please escalate to security team immediately.
        `,
        variables: [
          'title',
          'type',
          'severity',
          'message',
          'weddingId',
          'userId',
          'timestamp',
          'celebrityClient',
        ],
      },
      {
        id: 'vendor-violation-slack',
        name: 'Vendor Violation - Slack',
        alertType: AlertType.VENDOR_VIOLATION,
        channelType: 'slack',
        subject: 'Vendor Compliance Violation',
        body: `
🚫 *Vendor Violation Detected*

*Vendor:* {{vendorName}}
*Violation:* {{message}}
*Time:* {{timestamp}}
*Wedding:* {{weddingId}}

{{#if celebrityClient}}
⭐ *Celebrity wedding involved* - Review required
{{/if}}
        `,
        variables: [
          'vendorName',
          'message',
          'timestamp',
          'weddingId',
          'celebrityClient',
        ],
      },
    ];

    templates.forEach((template) => {
      this.alertTemplates.set(template.id, template);
    });
  }

  private async loadAlertRules(): Promise<void> {
    const { data } = await this.supabase
      .from('alert_rules')
      .select('*')
      .eq('enabled', true);

    if (data) {
      data.forEach((rule) => {
        this.alertRules.set(rule.id, {
          id: rule.id,
          name: rule.name,
          alertType: rule.alert_type,
          condition: rule.condition,
          severity: rule.severity,
          enabled: rule.enabled,
          celebrityPriority: rule.celebrity_priority,
          notificationChannels: rule.notification_channels,
          escalationRules: rule.escalation_rules,
          suppressionRules: rule.suppression_rules,
        });
      });
    }
  }

  private async loadAlertTemplates(): Promise<void> {
    const { data } = await this.supabase
      .from('alert_templates')
      .select('*')
      .eq('enabled', true);

    if (data) {
      data.forEach((template) => {
        this.alertTemplates.set(template.id, template);
      });
    }
  }

  private startPeriodicCleanup(): void {
    setInterval(
      () => {
        // Clean up expired suppressions - use forEach for downlevelIteration compatibility
        const now = new Date();
        this.suppressedAlerts.forEach((expiry, id) => {
          if (now > expiry) {
            this.suppressedAlerts.delete(id);
          }
        });

        // Clean up old active alerts - use forEach for downlevelIteration compatibility
        this.activeAlerts.forEach((alert, id) => {
          const alertTime = new Date(alert.timestamp);
          const hoursSince =
            (now.getTime() - alertTime.getTime()) / (1000 * 60 * 60);

          if (hoursSince > 24 && alert.acknowledged) {
            this.activeAlerts.delete(id);
          }
        });
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  private isAlertSuppressed(alert: any): boolean {
    // Check against suppression rules - use forEach for downlevelIteration compatibility
    let isSuppressed = false;
    this.suppressedAlerts.forEach((expiry, id) => {
      if (new Date() < expiry) {
        // Check if alert matches suppression condition
        // Implementation would check suppression conditions
        isSuppressed = false; // Simplified for now
      }
    });
    return isSuppressed;
  }

  private async storeAlert(alertId: string, alert: any): Promise<void> {
    await this.supabase.from('security_alerts').insert({
      id: alertId,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      context: alert.context,
      celebrity_client: alert.celebrityClient,
      metadata: alert.metadata,
      organization_id: alert.context.organizationId,
      wedding_id: alert.context.weddingId,
      user_id: alert.context.userId,
      acknowledged: false,
      created_at: new Date().toISOString(),
    });
  }

  private getMatchingRules(alert: any): AlertRule[] {
    const matchingRules = [];

    // Use forEach pattern for downlevelIteration compatibility
    this.alertRules.forEach((rule) => {
      if (rule.enabled && this.alertMatchesRule(alert, rule)) {
        matchingRules.push(rule);
      }
    });

    // Sort by celebrity priority first, then severity
    return matchingRules.sort((a, b) => {
      if (a.celebrityPriority && !b.celebrityPriority) return -1;
      if (!a.celebrityPriority && b.celebrityPriority) return 1;

      const severityOrder = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
        info: 0,
      };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private alertMatchesRule(alert: any, rule: AlertRule): boolean {
    // Check alert type
    if (rule.alertType !== alert.type) return false;

    // Check condition
    const condition = rule.condition;
    const alertValue = this.getAlertValue(alert, condition.metric);

    switch (condition.operator) {
      case 'eq':
        return alertValue === condition.value;
      case 'gt':
        return alertValue > condition.value;
      case 'lt':
        return alertValue < condition.value;
      case 'gte':
        return alertValue >= condition.value;
      case 'lte':
        return alertValue <= condition.value;
      case 'contains':
        return String(alertValue).includes(condition.value);
      case 'not_contains':
        return !String(alertValue).includes(condition.value);
      default:
        return false;
    }
  }

  private getAlertValue(alert: any, metric: string): any {
    switch (metric) {
      case 'severity':
        return alert.severity;
      case 'celebrity_client':
        return alert.celebrityClient;
      case 'outside_business_hours':
        return alert.metadata?.outsideBusinessHours;
      case 'suspected_breach':
        return alert.metadata?.suspectedBreach;
      default:
        return alert[metric] || alert.metadata?.[metric];
    }
  }

  private async applyAlertRule(
    alertId: string,
    alert: any,
    rule: AlertRule,
  ): Promise<void> {
    // Send notifications
    for (const channel of rule.notificationChannels) {
      await this.sendNotification(alertId, channel, alert);
    }

    // Log rule application
    await this.supabase.from('alert_rule_applications').insert({
      alert_id: alertId,
      rule_id: rule.id,
      applied_at: new Date().toISOString(),
    });
  }

  private async scheduleEscalations(
    alertId: string,
    alert: any,
    rules: AlertRule[],
  ): Promise<void> {
    for (const rule of rules) {
      for (const escalation of rule.escalationRules) {
        const timer = setTimeout(
          async () => {
            await this.processEscalation(alertId, alert, escalation);
          },
          escalation.delay * 60 * 1000,
        );

        this.escalationTimers.set(
          `${alertId}-${rule.id}-${escalation.level}`,
          timer,
        );
      }
    }
  }

  private async processEscalation(
    alertId: string,
    alert: any,
    escalation: EscalationRule,
  ): Promise<void> {
    // Check if alert is still active and unacknowledged
    const activeAlert = this.activeAlerts.get(alertId);
    if (!activeAlert || activeAlert.acknowledged) {
      return;
    }

    // Send escalation notifications
    for (const channel of escalation.notificationChannels) {
      await this.sendNotification(alertId, channel, {
        ...alert,
        escalated: true,
        escalationLevel: escalation.level,
      });
    }

    // Execute auto actions
    for (const action of escalation.autoActions) {
      await this.executeAutoAction(alertId, alert, action);
    }

    // Log escalation
    await this.supabase.from('alert_escalations').insert({
      alert_id: alertId,
      escalation_level: escalation.level,
      escalated_at: new Date().toISOString(),
      channels_notified: escalation.notificationChannels.map((c) => c.type),
      actions_executed: escalation.autoActions.map((a) => a.type),
    });
  }

  private async sendNotification(
    alertId: string,
    channel: NotificationChannel,
    alert: any,
  ): Promise<void> {
    const notificationId = crypto.randomUUID();

    try {
      // Get appropriate template
      const template = this.getTemplate(alert.type, channel.type);

      // Render message
      const message = this.renderTemplate(template, alert, channel);

      // Create notification record
      const notification: AlertNotification = {
        id: notificationId,
        alertId,
        channelType: channel.type,
        target: channel.target,
        message,
        templateId: template?.id || 'default',
        status: 'pending',
        retryCount: 0,
      };

      // Store notification
      await this.supabase.from('alert_notifications').insert({
        id: notification.id,
        alert_id: notification.alertId,
        channel_type: notification.channelType,
        target: notification.target,
        message: notification.message,
        template_id: notification.templateId,
        status: notification.status,
        created_at: new Date().toISOString(),
      });

      // Send notification
      await this.deliverNotification(notification, alert);
    } catch (error) {
      console.error(`Notification delivery failed: ${error.message}`);
      await this.supabase
        .from('alert_notifications')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', notificationId);
    }
  }

  private async deliverNotification(
    notification: AlertNotification,
    alert: any,
  ): Promise<void> {
    switch (notification.channelType) {
      case 'email':
        await this.sendEmail(
          notification.target,
          'Security Alert',
          notification.message,
        );
        break;
      case 'slack':
        await this.sendSlack(notification.target, notification.message);
        break;
      case 'sms':
        await this.sendSMS(notification.target, notification.message);
        break;
      case 'pagerduty':
        await this.sendPagerDuty(notification.message, alert.severity);
        break;
      default:
        console.log(
          `Notification sent to ${notification.channelType}: ${notification.message}`,
        );
    }

    // Update notification status
    await this.supabase
      .from('alert_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', notification.id);
  }

  private getTemplate(
    alertType: AlertType,
    channelType: string,
  ): AlertTemplate | null {
    // Use forEach pattern for downlevelIteration compatibility
    let foundTemplate: AlertTemplate | null = null;
    this.alertTemplates.forEach((template) => {
      if (
        template.alertType === alertType &&
        template.channelType === channelType
      ) {
        foundTemplate = template;
      }
    });
    return foundTemplate;
  }

  private renderTemplate(
    template: AlertTemplate | null,
    alert: any,
    channel: NotificationChannel,
  ): string {
    if (!template) {
      return (
        channel.messageTemplate || `Alert: ${alert.title} - ${alert.message}`
      );
    }

    const useTemplate =
      alert.celebrityClient && template.celebrityTemplate
        ? template.celebrityTemplate
        : template.body;

    // Simple template rendering (in production, use a proper template engine)
    let rendered = useTemplate;

    template.variables.forEach((variable) => {
      const value = this.getTemplateValue(alert, variable);
      rendered = rendered.replace(
        new RegExp(`{{${variable}}}`, 'g'),
        String(value),
      );
    });

    // Handle conditional blocks (simplified) - use compatible regex flags for ES2017
    rendered = rendered.replace(
      /{{#if celebrityClient}}([\s\S]*?){{\/if}}/g,
      alert.celebrityClient ? '$1' : '',
    );

    return rendered;
  }

  private getTemplateValue(alert: any, variable: string): any {
    switch (variable) {
      case 'title':
        return alert.title;
      case 'type':
        return alert.type;
      case 'severity':
        return alert.severity;
      case 'message':
        return alert.message;
      case 'weddingId':
        return alert.context?.weddingId;
      case 'userId':
        return alert.context?.userId;
      case 'timestamp':
        return new Date().toISOString();
      case 'celebrityClient':
        return alert.celebrityClient;
      case 'vendorName':
        return alert.metadata?.vendorName;
      default:
        return alert[variable] || alert.metadata?.[variable] || '';
    }
  }

  private async executeAutoAction(
    alertId: string,
    alert: any,
    action: AutoAction,
  ): Promise<void> {
    try {
      switch (action.type) {
        case 'block_user':
          // Implementation would block the user
          console.log(`Auto action: Block user ${alert.context.userId}`);
          break;
        case 'restrict_access':
          // Implementation would restrict access
          console.log(
            `Auto action: Restrict access for ${alert.context.userId}`,
          );
          break;
        case 'backup_data':
          // Implementation would trigger backup
          console.log(
            `Auto action: Backup data for wedding ${alert.context.weddingId}`,
          );
          break;
        case 'notify_admin':
          // Implementation would notify admins
          console.log(`Auto action: Notify admin about alert ${alertId}`);
          break;
        case 'create_incident':
          // Implementation would create incident
          console.log(`Auto action: Create incident for alert ${alertId}`);
          break;
      }

      // Log action execution
      await this.supabase.from('alert_auto_actions').insert({
        alert_id: alertId,
        action_type: action.type,
        parameters: action.parameters,
        executed_at: new Date().toISOString(),
        success: true,
      });
    } catch (error) {
      console.error(`Auto action failed: ${error.message}`);
      await this.supabase.from('alert_auto_actions').insert({
        alert_id: alertId,
        action_type: action.type,
        parameters: action.parameters,
        executed_at: new Date().toISOString(),
        success: false,
        error_message: error.message,
      });
    }
  }

  // Notification delivery methods (implement with actual services)
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<void> {
    console.log(`Email sent to ${to}: ${subject}`);
  }

  private async sendSlack(channel: string, message: string): Promise<void> {
    console.log(`Slack message to ${channel}: ${message}`);
  }

  private async sendSMS(to: string, message: string): Promise<void> {
    console.log(`SMS to ${to}: ${message}`);
  }

  private async sendPagerDuty(
    message: string,
    severity: string,
  ): Promise<void> {
    console.log(`PagerDuty ${severity}: ${message}`);
  }

  // Statistics methods
  private groupBySeverity(alerts: any[]): Record<SecuritySeverity, number> {
    const result: Record<SecuritySeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    alerts.forEach((alert) => {
      result[alert.severity as SecuritySeverity]++;
    });

    return result;
  }

  private groupByType(alerts: any[]): Record<AlertType, number> {
    const result = {} as Record<AlertType, number>;

    alerts.forEach((alert) => {
      result[alert.type as AlertType] =
        (result[alert.type as AlertType] || 0) + 1;
    });

    return result;
  }

  private calculateAverageResponseTime(alerts: any[]): number {
    const acknowledgedAlerts = alerts.filter(
      (a) => a.acknowledged && a.acknowledged_at,
    );

    if (acknowledgedAlerts.length === 0) return 0;

    const totalTime = acknowledgedAlerts.reduce((sum, alert) => {
      const created = new Date(alert.created_at);
      const acknowledged = new Date(alert.acknowledged_at);
      return sum + (acknowledged.getTime() - created.getTime());
    }, 0);

    return Math.round(totalTime / acknowledgedAlerts.length / 1000 / 60); // minutes
  }

  private calculateAcknowledgmentRate(alerts: any[]): number {
    if (alerts.length === 0) return 100;
    const acknowledgedCount = alerts.filter((a) => a.acknowledged).length;
    return Math.round((acknowledgedCount / alerts.length) * 100);
  }
}

export default AlertingService;
