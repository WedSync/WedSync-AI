/**
 * WS-101 Core Alert Manager
 * Central system for managing all alerts with wedding-critical reliability
 */

import {
  Alert,
  AlertSeverity,
  AlertType,
  AlertStatus,
  AlertRule,
  AlertHistory,
  AlertMetrics,
  AlertEscalation,
  AlertSubscription,
  AlertThreshold,
  AlertError,
} from './Alert';
import { MultiChannelOrchestrator } from './channels/MultiChannelOrchestrator';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export class AlertManager {
  private static instance: AlertManager;
  private orchestrator: MultiChannelOrchestrator;
  private supabase: any;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private thresholds: Map<string, AlertThreshold> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private metricsCache: AlertMetrics | null = null;
  private metricsUpdateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.orchestrator = new MultiChannelOrchestrator();
    this.initializeSupabase();
    this.loadAlertRules();
    this.startMetricsUpdater();
  }

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  private initializeSupabase(): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new AlertError('Supabase configuration missing', 'INIT_ERROR', 500);
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  /**
   * Create and send a new alert
   */
  public async createAlert(alert: Partial<Alert>): Promise<Alert> {
    try {
      // Generate alert with defaults
      const fullAlert: Alert = {
        id: this.generateAlertId(),
        status: AlertStatus.NEW,
        timestamp: new Date(),
        ...alert,
      } as Alert;

      // Validate alert
      this.validateAlert(fullAlert);

      // Check for suppressions
      if (await this.isAlertSuppressed(fullAlert)) {
        console.log(`Alert suppressed: ${fullAlert.title}`);
        return fullAlert;
      }

      // Store alert in database
      await this.storeAlert(fullAlert);

      // Add to active alerts
      this.activeAlerts.set(fullAlert.id, fullAlert);

      // Send through multi-channel orchestrator
      const weddingContext = await this.getWeddingContext(fullAlert);
      await this.orchestrator.sendAlert(fullAlert, weddingContext);

      // Record history
      await this.recordHistory(fullAlert.id, 'created', 'system');

      // Check for auto-escalation
      if (this.shouldAutoEscalate(fullAlert)) {
        this.scheduleEscalation(fullAlert);
      }

      // Update metrics
      this.invalidateMetricsCache();

      return fullAlert;
    } catch (error) {
      console.error('Failed to create alert:', error);
      throw new AlertError(
        'Failed to create alert',
        'CREATE_ERROR',
        500,
        error,
      );
    }
  }

  /**
   * Acknowledge an alert
   */
  public async acknowledgeAlert(
    alertId: string,
    userId: string,
    comment?: string,
  ): Promise<Alert> {
    try {
      const alert = await this.getAlert(alertId);

      if (!alert) {
        throw new AlertError('Alert not found', 'NOT_FOUND', 404);
      }

      if (alert.status !== AlertStatus.NEW) {
        throw new AlertError(
          'Alert already acknowledged or resolved',
          'INVALID_STATUS',
          400,
        );
      }

      // Update alert status
      alert.status = AlertStatus.ACKNOWLEDGED;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();

      // Update in database
      await this.updateAlert(alert);

      // Record history
      await this.recordHistory(alertId, 'acknowledged', userId, comment);

      // Cancel escalation if scheduled
      this.cancelEscalation(alertId);

      // Notify relevant parties
      await this.notifyAcknowledgment(alert, userId);

      return alert;
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(
    alertId: string,
    userId: string,
    resolution?: string,
  ): Promise<Alert> {
    try {
      const alert = await this.getAlert(alertId);

      if (!alert) {
        throw new AlertError('Alert not found', 'NOT_FOUND', 404);
      }

      if (alert.status === AlertStatus.RESOLVED) {
        throw new AlertError('Alert already resolved', 'ALREADY_RESOLVED', 400);
      }

      // Update alert status
      alert.status = AlertStatus.RESOLVED;
      alert.resolvedBy = userId;
      alert.resolvedAt = new Date();

      // Update in database
      await this.updateAlert(alert);

      // Remove from active alerts
      this.activeAlerts.delete(alertId);

      // Record history
      await this.recordHistory(alertId, 'resolved', userId, resolution);

      // Cancel escalation
      this.cancelEscalation(alertId);

      // Check for related alerts
      await this.checkRelatedAlerts(alert);

      // Update metrics
      this.invalidateMetricsCache();

      return alert;
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      throw error;
    }
  }

  /**
   * Escalate an alert
   */
  public async escalateAlert(
    alertId: string,
    reason: string,
    escalateTo?: string[],
  ): Promise<AlertEscalation> {
    try {
      const alert = await this.getAlert(alertId);

      if (!alert) {
        throw new AlertError('Alert not found', 'NOT_FOUND', 404);
      }

      const currentLevel = alert.escalationLevel || 0;
      const newLevel = currentLevel + 1;

      // Create escalation record
      const escalation: AlertEscalation = {
        id: this.generateEscalationId(),
        alertId,
        level: newLevel,
        escalatedTo: escalateTo || this.getEscalationTargets(newLevel),
        escalatedAt: new Date(),
        reason,
        automaticEscalation: !escalateTo,
      };

      // Store escalation
      await this.storeEscalation(escalation);

      // Update alert
      alert.status = AlertStatus.ESCALATED;
      alert.escalationLevel = newLevel;
      await this.updateAlert(alert);

      // Send escalation notifications
      await this.sendEscalationNotifications(alert, escalation);

      // Record history
      await this.recordHistory(alertId, 'escalated', 'system', reason);

      // Schedule next escalation if needed
      if (newLevel < 3 && !escalateTo) {
        this.scheduleEscalation(alert, newLevel + 1);
      }

      return escalation;
    } catch (error) {
      console.error('Failed to escalate alert:', error);
      throw error;
    }
  }

  /**
   * Get alert metrics
   */
  public async getMetrics(timeRange?: {
    start: Date;
    end: Date;
  }): Promise<AlertMetrics> {
    try {
      // Return cached metrics if available and fresh
      if (this.metricsCache && !timeRange) {
        return this.metricsCache;
      }

      // Calculate metrics
      const metrics = await this.calculateMetrics(timeRange);

      // Cache if no time range specified
      if (!timeRange) {
        this.metricsCache = metrics;
      }

      return metrics;
    } catch (error) {
      console.error('Failed to get metrics:', error);
      throw new AlertError(
        'Failed to calculate metrics',
        'METRICS_ERROR',
        500,
        error,
      );
    }
  }

  /**
   * Configure alert rule
   */
  public async configureRule(rule: AlertRule): Promise<void> {
    try {
      // Validate rule
      this.validateRule(rule);

      // Store in database
      await this.storeRule(rule);

      // Add to active rules
      this.alertRules.set(rule.id, rule);

      console.log(`Alert rule configured: ${rule.name}`);
    } catch (error) {
      console.error('Failed to configure rule:', error);
      throw error;
    }
  }

  /**
   * Configure threshold
   */
  public async configureThreshold(threshold: AlertThreshold): Promise<void> {
    try {
      // Store in database
      await this.storeThreshold(threshold);

      // Add to active thresholds
      this.thresholds.set(threshold.id, threshold);

      console.log(`Alert threshold configured: ${threshold.name}`);
    } catch (error) {
      console.error('Failed to configure threshold:', error);
      throw error;
    }
  }

  /**
   * Check thresholds and trigger alerts
   */
  public async checkThresholds(metrics: Record<string, number>): Promise<void> {
    for (const [id, threshold] of this.thresholds) {
      if (!threshold.enabled) continue;

      const value = metrics[threshold.metric];
      if (value === undefined) continue;

      const breached = this.isThresholdBreached(value, threshold);

      if (breached) {
        await this.createAlert({
          title: `Threshold breached: ${threshold.name}`,
          message: `${threshold.metric} is ${value} (threshold: ${threshold.comparison} ${threshold.threshold})`,
          type: threshold.type,
          severity: threshold.severity,
          metadata: {
            thresholdId: threshold.id,
            metric: threshold.metric,
            value,
            threshold: threshold.threshold,
          },
        });
      }
    }
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).sort((a, b) => {
      // Sort by severity first, then timestamp
      const severityOrder = {
        [AlertSeverity.WEDDING_EMERGENCY]: 0,
        [AlertSeverity.VENDOR_CRITICAL]: 1,
        [AlertSeverity.TIMELINE_CRITICAL]: 2,
        [AlertSeverity.SYSTEM_DOWN]: 3,
        [AlertSeverity.CRITICAL]: 4,
        [AlertSeverity.HIGH]: 5,
        [AlertSeverity.MEDIUM]: 6,
        [AlertSeverity.LOW]: 7,
      };

      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  /**
   * Search alerts
   */
  public async searchAlerts(query: {
    status?: AlertStatus[];
    severity?: AlertSeverity[];
    type?: AlertType[];
    startDate?: Date;
    endDate?: Date;
    search?: string;
  }): Promise<Alert[]> {
    try {
      let queryBuilder = this.supabase.from('alerts').select('*');

      if (query.status) {
        queryBuilder = queryBuilder.in('status', query.status);
      }

      if (query.severity) {
        queryBuilder = queryBuilder.in('severity', query.severity);
      }

      if (query.type) {
        queryBuilder = queryBuilder.in('type', query.type);
      }

      if (query.startDate) {
        queryBuilder = queryBuilder.gte(
          'timestamp',
          query.startDate.toISOString(),
        );
      }

      if (query.endDate) {
        queryBuilder = queryBuilder.lte(
          'timestamp',
          query.endDate.toISOString(),
        );
      }

      if (query.search) {
        queryBuilder = queryBuilder.or(
          `title.ilike.%${query.search}%,message.ilike.%${query.search}%`,
        );
      }

      const { data, error } = await queryBuilder
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to search alerts:', error);
      throw new AlertError(
        'Failed to search alerts',
        'SEARCH_ERROR',
        500,
        error,
      );
    }
  }

  /**
   * Private helper methods
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEscalationId(): string {
    return `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateAlert(alert: Alert): void {
    if (!alert.title || !alert.message) {
      throw new AlertError(
        'Alert must have title and message',
        'VALIDATION_ERROR',
        400,
      );
    }

    if (!alert.type || !alert.severity) {
      throw new AlertError(
        'Alert must have type and severity',
        'VALIDATION_ERROR',
        400,
      );
    }
  }

  private validateRule(rule: AlertRule): void {
    if (!rule.name || !rule.conditions || rule.conditions.length === 0) {
      throw new AlertError(
        'Rule must have name and conditions',
        'VALIDATION_ERROR',
        400,
      );
    }
  }

  private async storeAlert(alert: Alert): Promise<void> {
    const { error } = await this.supabase.from('alerts').insert(alert);

    if (error) throw error;
  }

  private async updateAlert(alert: Alert): Promise<void> {
    const { error } = await this.supabase
      .from('alerts')
      .update(alert)
      .eq('id', alert.id);

    if (error) throw error;
  }

  private async getAlert(alertId: string): Promise<Alert | null> {
    // Check active alerts first
    if (this.activeAlerts.has(alertId)) {
      return this.activeAlerts.get(alertId)!;
    }

    // Fetch from database
    const { data, error } = await this.supabase
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (error) {
      console.error('Failed to fetch alert:', error);
      return null;
    }

    return data;
  }

  private async storeRule(rule: AlertRule): Promise<void> {
    const { error } = await this.supabase.from('alert_rules').upsert(rule);

    if (error) throw error;
  }

  private async storeThreshold(threshold: AlertThreshold): Promise<void> {
    const { error } = await this.supabase
      .from('alert_thresholds')
      .upsert(threshold);

    if (error) throw error;
  }

  private async storeEscalation(escalation: AlertEscalation): Promise<void> {
    const { error } = await this.supabase
      .from('alert_escalations')
      .insert(escalation);

    if (error) throw error;
  }

  private async recordHistory(
    alertId: string,
    action: AlertHistory['action'],
    performedBy: string,
    comment?: string,
  ): Promise<void> {
    const history: AlertHistory = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alertId,
      action,
      performedBy,
      performedAt: new Date(),
      comment,
    };

    const { error } = await this.supabase.from('alert_history').insert(history);

    if (error) {
      console.error('Failed to record history:', error);
    }
  }

  private async loadAlertRules(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('alert_rules')
        .select('*')
        .eq('enabled', true);

      if (error) throw error;

      for (const rule of data || []) {
        this.alertRules.set(rule.id, rule);
      }

      console.log(`Loaded ${this.alertRules.size} alert rules`);
    } catch (error) {
      console.error('Failed to load alert rules:', error);
    }
  }

  private async isAlertSuppressed(alert: Alert): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('alert_suppressions')
        .select('*')
        .eq('enabled', true)
        .lte('startTime', new Date().toISOString())
        .gte('endTime', new Date().toISOString());

      if (error) throw error;

      for (const suppression of data || []) {
        if (suppression.type && suppression.type !== alert.type) continue;
        if (suppression.severity && suppression.severity !== alert.severity)
          continue;
        if (suppression.source && suppression.source !== alert.source) continue;
        if (
          suppression.pattern &&
          !new RegExp(suppression.pattern).test(alert.message)
        )
          continue;

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to check suppressions:', error);
      return false;
    }
  }

  private shouldAutoEscalate(alert: Alert): boolean {
    const autoEscalateSeverities = [
      AlertSeverity.WEDDING_EMERGENCY,
      AlertSeverity.VENDOR_CRITICAL,
      AlertSeverity.SYSTEM_DOWN,
      AlertSeverity.CRITICAL,
    ];

    return autoEscalateSeverities.includes(alert.severity);
  }

  private scheduleEscalation(alert: Alert, level: number = 1): void {
    const escalationDelay = this.getEscalationDelay(alert.severity, level);

    const timer = setTimeout(async () => {
      // Check if alert is still active
      const currentAlert = await this.getAlert(alert.id);
      if (currentAlert && currentAlert.status === AlertStatus.NEW) {
        await this.escalateAlert(
          alert.id,
          `Auto-escalation after ${escalationDelay / 60000} minutes`,
        );
      }
    }, escalationDelay);

    this.escalationTimers.set(alert.id, timer);
  }

  private cancelEscalation(alertId: string): void {
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }
  }

  private getEscalationDelay(severity: AlertSeverity, level: number): number {
    const baseDelays = {
      [AlertSeverity.WEDDING_EMERGENCY]: 2 * 60 * 1000, // 2 minutes
      [AlertSeverity.VENDOR_CRITICAL]: 5 * 60 * 1000, // 5 minutes
      [AlertSeverity.SYSTEM_DOWN]: 5 * 60 * 1000,
      [AlertSeverity.CRITICAL]: 10 * 60 * 1000, // 10 minutes
      [AlertSeverity.HIGH]: 30 * 60 * 1000, // 30 minutes
      [AlertSeverity.MEDIUM]: 60 * 60 * 1000, // 1 hour
      [AlertSeverity.LOW]: 24 * 60 * 60 * 1000, // 24 hours
    };

    const baseDelay = baseDelays[severity] || 60 * 60 * 1000;
    return baseDelay * Math.pow(2, level - 1); // Exponential backoff
  }

  private getEscalationTargets(level: number): string[] {
    const targets = {
      1: ['team-lead', 'on-call-engineer'],
      2: ['engineering-manager', 'product-manager'],
      3: ['cto', 'ceo', 'emergency-response-team'],
    };

    return targets[level as keyof typeof targets] || targets[3];
  }

  private async sendEscalationNotifications(
    alert: Alert,
    escalation: AlertEscalation,
  ): Promise<void> {
    const escalationAlert: Alert = {
      ...alert,
      title: `ESCALATED: ${alert.title}`,
      message: `Alert escalated to level ${escalation.level}. Reason: ${escalation.reason}\n\nOriginal: ${alert.message}`,
      metadata: {
        ...alert.metadata,
        escalation,
      },
    };

    await this.orchestrator.sendAlert(escalationAlert);
  }

  private async notifyAcknowledgment(
    alert: Alert,
    userId: string,
  ): Promise<void> {
    const ackAlert: Alert = {
      ...alert,
      title: `Alert Acknowledged: ${alert.title}`,
      message: `Alert acknowledged by ${userId}`,
      severity: AlertSeverity.LOW,
      type: AlertType.SYSTEM,
    };

    await this.orchestrator.sendAlert(ackAlert);
  }

  private async checkRelatedAlerts(alert: Alert): Promise<void> {
    if (!alert.relatedAlerts || alert.relatedAlerts.length === 0) return;

    for (const relatedId of alert.relatedAlerts) {
      const relatedAlert = await this.getAlert(relatedId);
      if (relatedAlert && relatedAlert.status !== AlertStatus.RESOLVED) {
        // Check if all related alerts are resolved
        const allRelatedResolved =
          await this.areAllRelatedResolved(relatedAlert);
        if (allRelatedResolved) {
          await this.resolveAlert(
            relatedId,
            'system',
            'Related alerts resolved',
          );
        }
      }
    }
  }

  private async areAllRelatedResolved(alert: Alert): Promise<boolean> {
    if (!alert.relatedAlerts) return true;

    for (const relatedId of alert.relatedAlerts) {
      const related = await this.getAlert(relatedId);
      if (related && related.status !== AlertStatus.RESOLVED) {
        return false;
      }
    }

    return true;
  }

  private async getWeddingContext(alert: Alert): Promise<any> {
    // Implement wedding context retrieval based on alert metadata
    if (alert.metadata?.weddingId) {
      // Fetch wedding details from database
      const { data } = await this.supabase
        .from('weddings')
        .select('*')
        .eq('id', alert.metadata.weddingId)
        .single();

      return data;
    }

    return null;
  }

  private isThresholdBreached(
    value: number,
    threshold: AlertThreshold,
  ): boolean {
    switch (threshold.comparison) {
      case 'above':
        return value > threshold.threshold;
      case 'below':
        return value < threshold.threshold;
      case 'equals':
        return value === threshold.threshold;
      default:
        return false;
    }
  }

  private async calculateMetrics(timeRange?: {
    start: Date;
    end: Date;
  }): Promise<AlertMetrics> {
    try {
      let query = this.supabase.from('alerts').select('*');

      if (timeRange) {
        query = query
          .gte('timestamp', timeRange.start.toISOString())
          .lte('timestamp', timeRange.end.toISOString());
      }

      const { data: alerts, error } = await query;
      if (error) throw error;

      const metrics: AlertMetrics = {
        totalAlerts: alerts?.length || 0,
        activeAlerts: 0,
        acknowledgedAlerts: 0,
        resolvedAlerts: 0,
        averageResolutionTime: 0,
        averageAcknowledgmentTime: 0,
        alertsBySeverity: {} as Record<AlertSeverity, number>,
        alertsByType: {} as Record<AlertType, number>,
        recentAlerts: [],
        topAlertSources: [],
        escalationRate: 0,
        falsePositiveRate: 0,
      };

      if (!alerts || alerts.length === 0) return metrics;

      // Calculate metrics
      let totalResolutionTime = 0;
      let totalAckTime = 0;
      let resolvedCount = 0;
      let ackCount = 0;
      let escalatedCount = 0;
      const sourceCount: Record<string, number> = {};

      for (const alert of alerts) {
        // Status counts
        if (
          alert.status === AlertStatus.NEW ||
          alert.status === AlertStatus.ACKNOWLEDGED
        ) {
          metrics.activeAlerts++;
        }
        if (alert.status === AlertStatus.ACKNOWLEDGED) {
          metrics.acknowledgedAlerts++;
        }
        if (alert.status === AlertStatus.RESOLVED) {
          metrics.resolvedAlerts++;
        }

        // Resolution time
        if (alert.resolvedAt && alert.timestamp) {
          const resTime =
            new Date(alert.resolvedAt).getTime() -
            new Date(alert.timestamp).getTime();
          totalResolutionTime += resTime;
          resolvedCount++;
        }

        // Acknowledgment time
        if (alert.acknowledgedAt && alert.timestamp) {
          const ackTime =
            new Date(alert.acknowledgedAt).getTime() -
            new Date(alert.timestamp).getTime();
          totalAckTime += ackTime;
          ackCount++;
        }

        // Escalations
        if (alert.escalationLevel && alert.escalationLevel > 0) {
          escalatedCount++;
        }

        // By severity
        metrics.alertsBySeverity[alert.severity] =
          (metrics.alertsBySeverity[alert.severity] || 0) + 1;

        // By type
        metrics.alertsByType[alert.type] =
          (metrics.alertsByType[alert.type] || 0) + 1;

        // Sources
        if (alert.source) {
          sourceCount[alert.source] = (sourceCount[alert.source] || 0) + 1;
        }
      }

      // Calculate averages
      if (resolvedCount > 0) {
        metrics.averageResolutionTime =
          totalResolutionTime / resolvedCount / 60000; // Convert to minutes
      }
      if (ackCount > 0) {
        metrics.averageAcknowledgmentTime = totalAckTime / ackCount / 60000; // Convert to minutes
      }

      // Escalation rate
      metrics.escalationRate = (escalatedCount / metrics.totalAlerts) * 100;

      // Top sources
      metrics.topAlertSources = Object.entries(sourceCount)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent alerts
      metrics.recentAlerts = alerts
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 10);

      return metrics;
    } catch (error) {
      console.error('Failed to calculate metrics:', error);
      throw error;
    }
  }

  private invalidateMetricsCache(): void {
    this.metricsCache = null;
  }

  private startMetricsUpdater(): void {
    // Update metrics cache every 5 minutes
    this.metricsUpdateInterval = setInterval(
      async () => {
        try {
          this.metricsCache = await this.calculateMetrics();
        } catch (error) {
          console.error('Failed to update metrics cache:', error);
        }
      },
      5 * 60 * 1000,
    );
  }

  public shutdown(): void {
    // Clean up resources
    this.orchestrator.shutdown();

    // Clear timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();

    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }
  }
}

export default AlertManager;
