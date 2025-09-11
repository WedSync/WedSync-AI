/**
 * WS-227 System Health - Intelligent Alert Manager
 * Comprehensive alert management system with wedding-day protocols
 */

import { Logger } from '@/lib/logging/Logger';
import {
  Alert,
  AlertRule,
  AlertCondition,
  AlertMetrics,
  WeddingDayContext,
  WeddingDayStatus,
} from './types';

// Use dependency injection instead of direct imports
interface AlertManagerDependencies {
  notificationChannels?: any; // Will be injected
  escalationEngine?: any; // Will be injected
  weddingDayProtocol?: any; // Will be injected
}

export class AlertManager {
  private static instance: AlertManager;
  private logger: Logger;
  private notificationChannels: NotificationChannels;
  private escalationEngine: EscalationEngine;
  private weddingDayProtocol: WeddingDayProtocol;

  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private alertHistory: Alert[] = [];
  private deduplicationCache: Map<string, Date> = new Map();

  private alertCallbacks: ((alert: Alert) => void)[] = [];
  private metricsCollectionInterval: NodeJS.Timeout | null = null;

  private constructor(dependencies?: AlertManagerDependencies) {
    this.logger = new Logger('AlertManager');

    // Lazy load dependencies to break circular imports
    this.notificationChannels = dependencies?.notificationChannels || null;
    this.escalationEngine = dependencies?.escalationEngine || null;
    this.weddingDayProtocol = dependencies?.weddingDayProtocol || null;

    this.initializeDefaultRules();
    this.startMetricsCollection();
  }

  // Lazy loading methods for breaking circular dependencies
  private getNotificationChannels() {
    if (!this.notificationChannels) {
      const { NotificationChannels } = require('./notification-channels');
      this.notificationChannels = new NotificationChannels();
    }
    return this.notificationChannels;
  }

  private getEscalationEngine() {
    if (!this.escalationEngine) {
      const { EscalationEngine } = require('./escalation-engine');
      this.escalationEngine = new EscalationEngine();
    }
    return this.escalationEngine;
  }

  private getWeddingDayProtocol() {
    if (!this.weddingDayProtocol) {
      const { WeddingDayProtocol } = require('./wedding-day-protocol');
      this.weddingDayProtocol = new WeddingDayProtocol();
    }
    return this.weddingDayProtocol;
  }

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * Create and process a new alert
   */
  public async createAlert(
    alertData: Omit<
      Alert,
      'id' | 'timestamp' | 'status' | 'escalationLevel' | 'weddingDayAlert'
    >,
  ): Promise<Alert> {
    const isWeddingDay = new Date().getDay() === 6;

    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      status: 'active',
      escalationLevel: 0,
      weddingDayAlert: isWeddingDay,
      ...alertData,
    };

    // Check for deduplication
    if (alert.deduplicationKey && this.isDuplicate(alert)) {
      this.logger.debug('Alert deduplicated', {
        alertId: alert.id,
        deduplicationKey: alert.deduplicationKey,
      });
      return alert; // Return without processing
    }

    // Wedding day protocol override
    if (isWeddingDay) {
      alert = this.weddingDayProtocol.enhanceAlert(alert);
    }

    // Store alert
    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Update deduplication cache
    if (alert.deduplicationKey) {
      this.deduplicationCache.set(alert.deduplicationKey, new Date());
    }

    this.logger.info('Alert created', {
      alertId: alert.id,
      severity: alert.severity,
      category: alert.category,
      weddingDay: isWeddingDay,
    });

    // Process alert
    await this.processAlert(alert);

    // Trigger callbacks
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(alert);
      } catch (error) {
        this.logger.error('Alert callback failed', {
          error,
          alertId: alert.id,
        });
      }
    });

    return alert;
  }

  /**
   * Process alert through notification and escalation
   */
  private async processAlert(alert: Alert): Promise<void> {
    try {
      // Send initial notifications
      await this.sendNotifications(alert);

      // Start escalation timer if needed
      if (
        alert.severity === 'critical' ||
        alert.severity === 'emergency' ||
        alert.weddingDayAlert
      ) {
        this.scheduleEscalation(alert);
      }

      // Special wedding day handling
      if (alert.weddingDayAlert) {
        await this.weddingDayProtocol.handleAlert(alert);
      }
    } catch (error) {
      this.logger.error('Failed to process alert', {
        error,
        alertId: alert.id,
      });
    }
  }

  /**
   * Send notifications through configured channels
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    const channels =
      alert.notificationChannels.length > 0
        ? alert.notificationChannels
        : this.getDefaultChannelsForSeverity(alert.severity);

    for (const channel of channels) {
      try {
        await this.notificationChannels.send(channel, alert);
      } catch (error) {
        this.logger.error('Notification failed', {
          error,
          channel,
          alertId: alert.id,
        });
      }
    }
  }

  /**
   * Schedule escalation for alert
   */
  private scheduleEscalation(alert: Alert): void {
    const escalationDelay = alert.weddingDayAlert ? 30000 : 300000; // 30s vs 5min

    setTimeout(async () => {
      const currentAlert = this.alerts.get(alert.id);
      if (currentAlert && currentAlert.status === 'active') {
        await this.escalateAlert(currentAlert);
      }
    }, escalationDelay);
  }

  /**
   * Escalate alert to next level
   */
  private async escalateAlert(alert: Alert): Promise<void> {
    alert.escalationLevel++;

    this.logger.warn('Alert escalated', {
      alertId: alert.id,
      escalationLevel: alert.escalationLevel,
    });

    // Get escalation instructions
    const escalationPlan = this.escalationEngine.getEscalationPlan(alert);

    // Execute escalation
    await this.escalationEngine.executeEscalation(alert, escalationPlan);

    // Continue escalation if still unresolved
    if (alert.status === 'active' && alert.escalationLevel < 3) {
      this.scheduleEscalation(alert);
    }
  }

  /**
   * Acknowledge an alert
   */
  public async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      this.logger.warn('Attempted to acknowledge non-existent alert', {
        alertId,
      });
      return false;
    }

    if (alert.status !== 'active') {
      this.logger.warn('Attempted to acknowledge non-active alert', {
        alertId,
        currentStatus: alert.status,
      });
      return false;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.logger.info('Alert acknowledged', {
      alertId,
      acknowledgedBy,
      escalationLevel: alert.escalationLevel,
    });

    // Notify acknowledgment
    await this.notificationChannels.sendAcknowledgment(alert, acknowledgedBy);

    return true;
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(
    alertId: string,
    resolvedBy?: string,
  ): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      this.logger.warn('Attempted to resolve non-existent alert', { alertId });
      return false;
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    this.logger.info('Alert resolved', {
      alertId,
      resolvedBy,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime(),
    });

    // Notify resolution
    await this.notificationChannels.sendResolution(alert, resolvedBy);

    return true;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(
      (alert) => alert.status === 'active',
    );
  }

  /**
   * Get alert by ID
   */
  public getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get alert metrics
   */
  public getAlertMetrics(timeRangeHours: number = 24): AlertMetrics {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const relevantAlerts = this.alertHistory.filter(
      (alert) => alert.timestamp >= cutoffTime,
    );

    const alertsBySeverity: Record<string, number> = {};
    const alertsByCategory: Record<string, number> = {};

    relevantAlerts.forEach((alert) => {
      alertsBySeverity[alert.severity] =
        (alertsBySeverity[alert.severity] || 0) + 1;
      alertsByCategory[alert.category] =
        (alertsByCategory[alert.category] || 0) + 1;
    });

    const acknowledgedAlerts = relevantAlerts.filter(
      (a) => a.status === 'acknowledged',
    ).length;
    const resolvedAlerts = relevantAlerts.filter(
      (a) => a.status === 'resolved',
    ).length;
    const escalatedAlerts = relevantAlerts.filter(
      (a) => a.escalationLevel > 0,
    ).length;
    const weddingDayAlerts = relevantAlerts.filter(
      (a) => a.weddingDayAlert,
    ).length;

    // Calculate average resolution time
    const resolvedWithTimes = relevantAlerts.filter((a) => a.resolvedAt);
    const averageResolutionTime =
      resolvedWithTimes.length > 0
        ? resolvedWithTimes.reduce((sum, alert) => {
            return (
              sum + (alert.resolvedAt!.getTime() - alert.timestamp.getTime())
            );
          }, 0) / resolvedWithTimes.length
        : 0;

    return {
      totalAlerts: relevantAlerts.length,
      alertsBySeverity,
      alertsByCategory,
      acknowledgedAlerts,
      resolvedAlerts,
      averageResolutionTime: Math.round(averageResolutionTime / 1000), // Convert to seconds
      escalatedAlerts,
      weddingDayAlerts,
    };
  }

  /**
   * Add alert callback
   */
  public onAlert(callback: (alert: Alert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Helper methods
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isDuplicate(alert: Alert): boolean {
    if (!alert.deduplicationKey) return false;

    const lastSeen = this.deduplicationCache.get(alert.deduplicationKey);
    if (!lastSeen) return false;

    const deduplicationWindow = 5 * 60 * 1000; // 5 minutes default
    return Date.now() - lastSeen.getTime() < deduplicationWindow;
  }

  private getDefaultChannelsForSeverity(severity: Alert['severity']): string[] {
    switch (severity) {
      case 'emergency':
        return ['email', 'sms', 'slack', 'webhook'];
      case 'critical':
        return ['email', 'slack', 'webhook'];
      case 'warning':
        return ['email', 'slack'];
      case 'info':
      default:
        return ['slack'];
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'database_connection_pool_high',
        name: 'Database Connection Pool High Utilization',
        enabled: true,
        conditions: [
          {
            metric: 'connection_pool_utilization',
            operator: '>',
            threshold: 80,
          },
        ],
        severity: 'warning',
        category: 'database',
        notificationChannels: ['email', 'slack'],
        escalationDelayMinutes: 5,
        deduplicationWindowMinutes: 10,
        weddingDayOverride: true,
        description: 'Database connection pool utilization is high',
      },
      {
        id: 'database_connection_pool_critical',
        name: 'Database Connection Pool Critical',
        enabled: true,
        conditions: [
          {
            metric: 'connection_pool_utilization',
            operator: '>',
            threshold: 95,
          },
        ],
        severity: 'critical',
        category: 'database',
        notificationChannels: ['email', 'sms', 'slack'],
        escalationDelayMinutes: 2,
        deduplicationWindowMinutes: 5,
        weddingDayOverride: true,
        description: 'Database connection pool is nearly exhausted',
      },
      {
        id: 'slow_queries_detected',
        name: 'Slow Database Queries Detected',
        enabled: true,
        conditions: [
          { metric: 'slow_query_count', operator: '>', threshold: 0 },
        ],
        severity: 'warning',
        category: 'performance',
        notificationChannels: ['email', 'slack'],
        escalationDelayMinutes: 10,
        deduplicationWindowMinutes: 15,
        weddingDayOverride: true,
        description: 'Slow database queries detected',
      },
      {
        id: 'system_health_critical',
        name: 'System Health Critical',
        enabled: true,
        conditions: [{ metric: 'health_score', operator: '<', threshold: 50 }],
        severity: 'emergency',
        category: 'service',
        notificationChannels: ['email', 'sms', 'slack', 'webhook'],
        escalationDelayMinutes: 1,
        deduplicationWindowMinutes: 2,
        weddingDayOverride: true,
        description: 'Overall system health is critical',
      },
    ];

    defaultRules.forEach((rule) => {
      this.alertRules.set(rule.id, rule);
    });

    this.logger.info('Initialized default alert rules', {
      ruleCount: defaultRules.length,
    });
  }

  /**
   * Start metrics collection for alert rules evaluation
   */
  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      this.evaluateAlertRules();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Evaluate alert rules against current metrics
   */
  private async evaluateAlertRules(): Promise<void> {
    // This would integrate with the health monitoring system
    // For now, we'll just check if the health monitor has any alerts
    try {
      const { enhancedHealthMonitor } = await import(
        '@/lib/monitoring/healthChecks'
      );
      const currentHealth = enhancedHealthMonitor.getCurrentHealth();

      if (currentHealth) {
        // Check overall health score
        if (currentHealth.overall.score < 50) {
          await this.createAlert({
            severity: 'emergency',
            category: 'service',
            title: 'System Health Critical',
            description: `System health score dropped to ${currentHealth.overall.score}%`,
            source: 'health_monitor',
            details: currentHealth.overall,
            notificationChannels: [],
            deduplicationKey: 'system_health_critical',
          });
        } else if (currentHealth.overall.score < 80) {
          await this.createAlert({
            severity: 'warning',
            category: 'service',
            title: 'System Health Degraded',
            description: `System health score is ${currentHealth.overall.score}%`,
            source: 'health_monitor',
            details: currentHealth.overall,
            notificationChannels: [],
            deduplicationKey: 'system_health_degraded',
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to evaluate alert rules', { error });
    }
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    // Clean up old entries from deduplication cache
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    for (const [key, timestamp] of this.deduplicationCache.entries()) {
      if (timestamp.getTime() < cutoffTime) {
        this.deduplicationCache.delete(key);
      }
    }
  }
}

// Singleton instance
export const alertManager = AlertManager.getInstance();
