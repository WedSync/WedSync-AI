/**
 * WS-227 System Health - Smart Escalation Engine
 * Handles alert escalation with intelligent routing and wedding-day protocols
 */

import { Logger } from '@/lib/logging/Logger';
import {
  Alert,
  EscalationRule,
  EscalationCondition,
  EscalationLevel,
  EscalationAction,
  EscalationRecipient,
  EscalationPlan,
  EscalationExecution,
  EscalationActionResult,
} from './types';

export class EscalationEngine {
  private logger: Logger;
  private escalationRules: Map<string, EscalationRule> = new Map();
  private activePlans: Map<string, EscalationPlan> = new Map();
  private escalationHistory: EscalationExecution[] = [];

  constructor() {
    this.logger = new Logger('EscalationEngine');
    this.initializeDefaultRules();
  }

  /**
   * Get escalation plan for alert
   */
  public getEscalationPlan(alert: Alert): EscalationPlan {
    const existingPlan = this.activePlans.get(alert.id);
    if (existingPlan) {
      return existingPlan;
    }

    // Find matching escalation rule
    const rule = this.findMatchingRule(alert);
    if (!rule) {
      throw new Error(`No escalation rule found for alert ${alert.id}`);
    }

    const isWeddingDay = new Date().getDay() === 6;
    const maxLevel = rule.maxEscalationLevel;

    // Wedding day override - accelerated escalation
    const adjustedRule =
      isWeddingDay && rule.weddingDayOverride
        ? this.applyWeddingDayOverride(rule)
        : rule;

    const plan: EscalationPlan = {
      alertId: alert.id,
      ruleId: adjustedRule.id,
      currentLevel: 0,
      maxLevel,
      nextEscalation: this.calculateNextEscalation(adjustedRule, 0),
      executionHistory: [],
      isWeddingDay,
    };

    this.activePlans.set(alert.id, plan);

    this.logger.info('Escalation plan created', {
      alertId: alert.id,
      ruleId: adjustedRule.id,
      maxLevel,
      isWeddingDay,
      nextEscalation: plan.nextEscalation,
    });

    return plan;
  }

  /**
   * Execute escalation for alert
   */
  public async executeEscalation(
    alert: Alert,
    plan: EscalationPlan,
  ): Promise<void> {
    const rule = this.escalationRules.get(plan.ruleId);
    if (!rule) {
      throw new Error(`Escalation rule ${plan.ruleId} not found`);
    }

    const targetLevel = plan.currentLevel + 1;
    if (targetLevel > plan.maxLevel) {
      this.logger.warn('Maximum escalation level reached', {
        alertId: alert.id,
        currentLevel: plan.currentLevel,
        maxLevel: plan.maxLevel,
      });
      return;
    }

    const escalationLevel = rule.escalationLevels.find(
      (level) => level.level === targetLevel,
    );
    if (!escalationLevel) {
      this.logger.error('Escalation level configuration not found', {
        alertId: alert.id,
        targetLevel,
      });
      return;
    }

    this.logger.info('Executing escalation', {
      alertId: alert.id,
      level: targetLevel,
      actionCount: escalationLevel.actions.length,
      recipientCount: escalationLevel.recipients.length,
    });

    const startTime = performance.now();
    const actionResults: EscalationActionResult[] = [];

    // Execute all actions for this escalation level
    for (const action of escalationLevel.actions) {
      const result = await this.executeEscalationAction(
        action,
        alert,
        escalationLevel.recipients,
      );
      actionResults.push(result);

      // If this is a required level and action failed, stop escalation
      if (escalationLevel.required && !result.success) {
        this.logger.error(
          'Required escalation action failed, stopping escalation',
          {
            alertId: alert.id,
            level: targetLevel,
            action: action.type,
          },
        );
        break;
      }
    }

    const duration = performance.now() - startTime;
    const success = actionResults.some((result) => result.success);

    // Record execution
    const execution: EscalationExecution = {
      level: targetLevel,
      timestamp: new Date(),
      actions: actionResults,
      success,
      duration,
    };

    plan.executionHistory.push(execution);
    this.escalationHistory.push(execution);
    plan.currentLevel = targetLevel;

    // Calculate next escalation if needed
    if (success && targetLevel < plan.maxLevel) {
      plan.nextEscalation = this.calculateNextEscalation(rule, targetLevel);
    } else {
      plan.nextEscalation = null;
    }

    this.logger.info('Escalation execution completed', {
      alertId: alert.id,
      level: targetLevel,
      success,
      duration,
      nextEscalation: plan.nextEscalation,
    });
  }

  /**
   * Execute individual escalation action
   */
  private async executeEscalationAction(
    action: EscalationAction,
    alert: Alert,
    recipients: EscalationRecipient[],
  ): Promise<EscalationActionResult> {
    const startTime = performance.now();
    let retryCount = 0;
    let lastError: string = '';

    while (retryCount <= action.retries) {
      try {
        const success = await this.performAction(action, alert, recipients);

        return {
          action,
          success,
          message: success ? 'Action executed successfully' : 'Action failed',
          executionTime: performance.now() - startTime,
          retryCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        retryCount++;

        this.logger.warn('Escalation action failed, retrying', {
          actionType: action.type,
          alertId: alert.id,
          attempt: retryCount,
          error: lastError,
        });

        if (retryCount <= action.retries) {
          await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        }
      }
    }

    return {
      action,
      success: false,
      message: `Action failed after ${action.retries + 1} attempts: ${lastError}`,
      executionTime: performance.now() - startTime,
      retryCount,
    };
  }

  /**
   * Perform specific escalation action
   */
  private async performAction(
    action: EscalationAction,
    alert: Alert,
    recipients: EscalationRecipient[],
  ): Promise<boolean> {
    switch (action.type) {
      case 'notify':
        return await this.performNotifyAction(action, alert, recipients);

      case 'create_ticket':
        return await this.performCreateTicketAction(action, alert);

      case 'call_oncall':
        return await this.performCallOncallAction(action, alert, recipients);

      case 'page':
        return await this.performPageAction(action, alert, recipients);

      case 'webhook':
        return await this.performWebhookAction(action, alert);

      case 'sms_blast':
        return await this.performSMSBlastAction(action, alert, recipients);

      default:
        throw new Error(`Unknown escalation action type: ${action.type}`);
    }
  }

  /**
   * Escalation action implementations
   */
  private async performNotifyAction(
    action: EscalationAction,
    alert: Alert,
    recipients: EscalationRecipient[],
  ): Promise<boolean> {
    const channels = action.config.channels || ['email', 'slack'];
    const availableRecipients = recipients.filter((r) =>
      this.isRecipientAvailable(r),
    );

    if (availableRecipients.length === 0) {
      this.logger.warn('No available recipients for notification', {
        alertId: alert.id,
      });
      return false;
    }

    // Send notifications through specified channels
    for (const channel of channels) {
      try {
        const response = await fetch('/api/alerts/escalation-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel,
            alert,
            recipients: availableRecipients,
            escalationLevel: alert.escalationLevel,
          }),
        });

        if (!response.ok) {
          throw new Error(`Notification API error: ${response.status}`);
        }
      } catch (error) {
        this.logger.error('Escalation notification failed', { error, channel });
        return false;
      }
    }

    return true;
  }

  private async performCreateTicketAction(
    action: EscalationAction,
    alert: Alert,
  ): Promise<boolean> {
    const ticketData = {
      title: `[ESCALATED] ${alert.title}`,
      description: alert.description,
      priority: this.getTicketPriority(alert),
      labels: [`alert-${alert.severity}`, `category-${alert.category}`],
      alertId: alert.id,
      escalationLevel: alert.escalationLevel,
      metadata: alert.details,
    };

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        throw new Error(`Ticket creation failed: ${response.status}`);
      }

      const result = await response.json();

      this.logger.info('Support ticket created for escalated alert', {
        alertId: alert.id,
        ticketId: result.ticketId,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to create support ticket', {
        error,
        alertId: alert.id,
      });
      return false;
    }
  }

  private async performCallOncallAction(
    action: EscalationAction,
    alert: Alert,
    recipients: EscalationRecipient[],
  ): Promise<boolean> {
    const oncallRecipients = recipients.filter(
      (r) => r.type === 'role' && r.identifier === 'oncall',
    );

    if (oncallRecipients.length === 0) {
      this.logger.warn('No on-call recipients found', { alertId: alert.id });
      return false;
    }

    const callData = {
      alert,
      recipients: oncallRecipients,
      message: `Emergency call for alert: ${alert.title}. Severity: ${alert.severity}. Please check the dashboard immediately.`,
    };

    try {
      const response = await fetch('/api/alerts/voice-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callData),
      });

      if (!response.ok) {
        throw new Error(`Voice call API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to initiate voice call', {
        error,
        alertId: alert.id,
      });
      return false;
    }
  }

  private async performPageAction(
    action: EscalationAction,
    alert: Alert,
    recipients: EscalationRecipient[],
  ): Promise<boolean> {
    const pageableRecipients = recipients.filter((r) =>
      r.channels.includes('pager'),
    );

    if (pageableRecipients.length === 0) {
      this.logger.warn('No pageable recipients found', { alertId: alert.id });
      return false;
    }

    const pageData = {
      alert,
      recipients: pageableRecipients,
      message: `PAGE: ${alert.title} - ${alert.severity.toUpperCase()}`,
      priority: alert.severity === 'emergency' ? 'high' : 'normal',
    };

    try {
      const response = await fetch('/api/alerts/pager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData),
      });

      if (!response.ok) {
        throw new Error(`Pager API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to send page', { error, alertId: alert.id });
      return false;
    }
  }

  private async performWebhookAction(
    action: EscalationAction,
    alert: Alert,
  ): Promise<boolean> {
    const webhookUrl = action.config.url;
    const headers = action.config.headers || {};

    const payload = {
      event: 'alert_escalated',
      alert,
      escalation: {
        level: alert.escalationLevel,
        timestamp: new Date().toISOString(),
      },
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-EscalationEngine/1.0',
          ...headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook error: ${response.status} ${response.statusText}`,
        );
      }

      return true;
    } catch (error) {
      this.logger.error('Webhook escalation failed', {
        error,
        alertId: alert.id,
      });
      return false;
    }
  }

  private async performSMSBlastAction(
    action: EscalationAction,
    alert: Alert,
    recipients: EscalationRecipient[],
  ): Promise<boolean> {
    const smsRecipients = recipients.filter((r) => r.channels.includes('sms'));

    if (smsRecipients.length === 0) {
      this.logger.warn('No SMS recipients found', { alertId: alert.id });
      return false;
    }

    const message = `URGENT: ${alert.title} - ${alert.severity.toUpperCase()} - Alert ID: ${alert.id}`;

    const smsData = {
      message: message.substring(0, 160), // SMS character limit
      recipients: smsRecipients.map((r) => r.identifier),
      priority: 'high',
    };

    try {
      const response = await fetch('/api/sms/blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smsData),
      });

      if (!response.ok) {
        throw new Error(`SMS blast API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      this.logger.error('SMS blast failed', { error, alertId: alert.id });
      return false;
    }
  }

  /**
   * Helper methods
   */
  private findMatchingRule(alert: Alert): EscalationRule | undefined {
    for (const rule of this.escalationRules.values()) {
      if (!rule.enabled) continue;

      const matches = rule.conditions.every((condition) => {
        return this.evaluateCondition(condition, alert);
      });

      if (matches) {
        return rule;
      }
    }

    // Return default rule if no specific rule matches
    return this.escalationRules.get('default');
  }

  private evaluateCondition(
    condition: EscalationCondition,
    alert: Alert,
  ): boolean {
    let alertValue: any;

    switch (condition.field) {
      case 'severity':
        alertValue = alert.severity;
        break;
      case 'category':
        alertValue = alert.category;
        break;
      case 'source':
        alertValue = alert.source;
        break;
      case 'escalationLevel':
        alertValue = alert.escalationLevel;
        break;
      case 'timeActive':
        alertValue = Date.now() - alert.timestamp.getTime();
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case '=':
        return alertValue === condition.value;
      case '!=':
        return alertValue !== condition.value;
      case '>':
        return Number(alertValue) > Number(condition.value);
      case '<':
        return Number(alertValue) < Number(condition.value);
      case 'contains':
        return String(alertValue).includes(String(condition.value));
      default:
        return false;
    }
  }

  private applyWeddingDayOverride(rule: EscalationRule): EscalationRule {
    // Create wedding day version with accelerated timing
    const weddingDayRule = { ...rule };

    weddingDayRule.escalationLevels = rule.escalationLevels.map((level) => ({
      ...level,
      delayMinutes: Math.max(0.5, level.delayMinutes / 4), // 4x faster escalation
    }));

    return weddingDayRule;
  }

  private calculateNextEscalation(
    rule: EscalationRule,
    currentLevel: number,
  ): Date | null {
    const nextLevel = rule.escalationLevels.find(
      (level) => level.level === currentLevel + 1,
    );
    if (!nextLevel) return null;

    const delayMs = nextLevel.delayMinutes * 60 * 1000;
    return new Date(Date.now() + delayMs);
  }

  private isRecipientAvailable(recipient: EscalationRecipient): boolean {
    if (!recipient.availability) return true;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();

    // Check if current day is in working days
    if (!recipient.availability.weekdays.includes(currentDay)) {
      return false;
    }

    // Check if current time is in working hours
    const [startHour, startMinute] = recipient.availability.workingHours.start
      .split(':')
      .map(Number);
    const [endHour, endMinute] = recipient.availability.workingHours.end
      .split(':')
      .map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  private getTicketPriority(alert: Alert): string {
    switch (alert.severity) {
      case 'emergency':
        return 'critical';
      case 'critical':
        return 'high';
      case 'warning':
        return 'medium';
      case 'info':
      default:
        return 'low';
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Initialize default escalation rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: EscalationRule[] = [
      {
        id: 'emergency',
        name: 'Emergency Alert Escalation',
        enabled: true,
        conditions: [{ field: 'severity', operator: '=', value: 'emergency' }],
        escalationLevels: [
          {
            level: 1,
            delayMinutes: 2,
            actions: [
              {
                type: 'notify',
                config: { channels: ['email', 'sms', 'slack'] },
                retries: 2,
                timeoutSeconds: 30,
              },
              {
                type: 'create_ticket',
                config: {},
                retries: 1,
                timeoutSeconds: 10,
              },
            ],
            recipients: [
              {
                type: 'role',
                identifier: 'admin',
                channels: ['email', 'sms', 'slack'],
              },
              {
                type: 'role',
                identifier: 'oncall',
                channels: ['email', 'sms', 'pager'],
              },
            ],
            required: false,
          },
          {
            level: 2,
            delayMinutes: 5,
            actions: [
              {
                type: 'call_oncall',
                config: {},
                retries: 3,
                timeoutSeconds: 60,
              },
              { type: 'page', config: {}, retries: 2, timeoutSeconds: 30 },
            ],
            recipients: [
              {
                type: 'role',
                identifier: 'oncall',
                channels: ['phone', 'pager'],
              },
              {
                type: 'user',
                identifier: 'cto@wedsync.com',
                channels: ['phone', 'sms'],
              },
            ],
            required: false,
          },
          {
            level: 3,
            delayMinutes: 10,
            actions: [
              { type: 'sms_blast', config: {}, retries: 1, timeoutSeconds: 60 },
              {
                type: 'webhook',
                config: { url: 'https://emergency.wedsync.com/webhook' },
                retries: 2,
                timeoutSeconds: 30,
              },
            ],
            recipients: [
              {
                type: 'group',
                identifier: 'emergency_contacts',
                channels: ['sms', 'phone'],
              },
            ],
            required: true,
          },
        ],
        weddingDayOverride: true,
        maxEscalationLevel: 3,
      },
      {
        id: 'critical',
        name: 'Critical Alert Escalation',
        enabled: true,
        conditions: [{ field: 'severity', operator: '=', value: 'critical' }],
        escalationLevels: [
          {
            level: 1,
            delayMinutes: 5,
            actions: [
              {
                type: 'notify',
                config: { channels: ['email', 'slack'] },
                retries: 2,
                timeoutSeconds: 30,
              },
            ],
            recipients: [
              {
                type: 'role',
                identifier: 'admin',
                channels: ['email', 'slack'],
              },
              {
                type: 'role',
                identifier: 'dev_team',
                channels: ['email', 'slack'],
              },
            ],
            required: false,
          },
          {
            level: 2,
            delayMinutes: 15,
            actions: [
              {
                type: 'notify',
                config: { channels: ['sms'] },
                retries: 1,
                timeoutSeconds: 30,
              },
              {
                type: 'create_ticket',
                config: {},
                retries: 1,
                timeoutSeconds: 10,
              },
            ],
            recipients: [
              { type: 'role', identifier: 'oncall', channels: ['sms'] },
            ],
            required: false,
          },
        ],
        weddingDayOverride: true,
        maxEscalationLevel: 2,
      },
      {
        id: 'default',
        name: 'Default Escalation Rule',
        enabled: true,
        conditions: [],
        escalationLevels: [
          {
            level: 1,
            delayMinutes: 10,
            actions: [
              {
                type: 'notify',
                config: { channels: ['email', 'slack'] },
                retries: 1,
                timeoutSeconds: 30,
              },
            ],
            recipients: [
              {
                type: 'role',
                identifier: 'admin',
                channels: ['email', 'slack'],
              },
            ],
            required: false,
          },
        ],
        weddingDayOverride: false,
        maxEscalationLevel: 1,
      },
    ];

    defaultRules.forEach((rule) => {
      this.escalationRules.set(rule.id, rule);
    });

    this.logger.info('Escalation rules initialized', {
      ruleCount: defaultRules.length,
    });
  }

  /**
   * Get escalation statistics
   */
  public getEscalationStats(timeRangeHours: number = 24): {
    totalEscalations: number;
    successRate: number;
    averageExecutionTime: number;
    byLevel: Record<number, number>;
    byAction: Record<string, { total: number; success: number }>;
  } {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const relevantEscalations = this.escalationHistory.filter(
      (e) => e.timestamp >= cutoffTime,
    );

    const byLevel: Record<number, number> = {};
    const byAction: Record<string, { total: number; success: number }> = {};

    let totalExecutionTime = 0;
    let successfulEscalations = 0;

    relevantEscalations.forEach((escalation) => {
      byLevel[escalation.level] = (byLevel[escalation.level] || 0) + 1;
      totalExecutionTime += escalation.duration;

      if (escalation.success) {
        successfulEscalations++;
      }

      escalation.actions.forEach((actionResult) => {
        const actionType = actionResult.action.type;
        if (!byAction[actionType]) {
          byAction[actionType] = { total: 0, success: 0 };
        }
        byAction[actionType].total++;
        if (actionResult.success) {
          byAction[actionType].success++;
        }
      });
    });

    const successRate =
      relevantEscalations.length > 0
        ? (successfulEscalations / relevantEscalations.length) * 100
        : 0;

    const averageExecutionTime =
      relevantEscalations.length > 0
        ? totalExecutionTime / relevantEscalations.length
        : 0;

    return {
      totalEscalations: relevantEscalations.length,
      successRate: Math.round(successRate),
      averageExecutionTime: Math.round(averageExecutionTime),
      byLevel,
      byAction,
    };
  }

  /**
   * Clean up completed escalation plans
   */
  public cleanup(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    for (const [alertId, plan] of this.activePlans.entries()) {
      if (plan.nextEscalation === null || plan.nextEscalation < cutoffTime) {
        this.activePlans.delete(alertId);
      }
    }
  }
}
