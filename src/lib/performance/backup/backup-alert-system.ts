/**
 * WS-178: Backup Alert System
 * Team D - Round 1: Intelligent alerting for backup performance issues
 *
 * Wedding-context aware alert system that prioritizes alerts based on
 * potential impact to couples planning their special day
 */

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import type { PerformanceReport } from './backup-infrastructure-monitor';
import type {
  PerformanceMetrics,
  ImpactAnalysis,
} from './backup-performance-monitor';

export interface AlertConfiguration {
  thresholds: {
    apiResponseIncrease: number; // 5%
    cpuUsage: number; // 30% during peak hours
    memoryUsage: number; // 500MB
    databaseLatency: number; // 1000ms
    storageErrorRate: number; // 5%
    userImpactSeverity: 'minimal' | 'moderate' | 'significant';
  };

  weddingPriority: {
    criticalOperations: string[];
    peakHours: { start: number; end: number }; // 6-22
    escalationDelays: {
      lowPriority: number; // 300000ms (5 minutes)
      mediumPriority: number; // 60000ms (1 minute)
      highPriority: number; // 10000ms (10 seconds)
      criticalPriority: number; // 0ms (immediate)
    };
  };

  notificationChannels: {
    slack: boolean;
    email: boolean;
    sms: boolean;
    dashboard: boolean;
    webhook: boolean;
  };
}

export interface WeddingAlert {
  id: string;
  timestamp: Date;
  backupId: string;

  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'performance'
    | 'infrastructure'
    | 'wedding-impact'
    | 'system-health';

  title: string;
  message: string;
  details: {
    affectedOperations: string[];
    metrics: Record<string, number>;
    weddingContext: {
      activeWeddings: number;
      criticalOperations: string[];
      isPeakHours: boolean;
    };
    recommendations: string[];
  };

  status: 'active' | 'acknowledged' | 'resolved' | 'escalated';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;

  escalationLevel: number;
  nextEscalation?: Date;

  channels: string[];
  deliveryStatus: Record<string, 'pending' | 'sent' | 'failed'>;
}

export interface TrendAnalysis {
  timeframe: '1hour' | '6hour' | '24hour' | '7day';

  performance: {
    trend: 'improving' | 'stable' | 'degrading';
    changePercentage: number;
    keyMetrics: {
      averageLatency: { current: number; previous: number };
      errorRate: { current: number; previous: number };
      userImpact: { current: string; previous: string };
    };
  };

  patterns: {
    peakHourImpacts: number;
    offPeakPerformance: number;
    weddingSeasonTrends: string[];
    recurringIssues: string[];
  };

  predictions: {
    nextOptimalBackupWindow: Date;
    estimatedUserImpact: string;
    resourceProjections: {
      cpu: number;
      memory: number;
      storage: number;
    };
  };

  recommendations: {
    immediate: string[];
    operational: string[];
    strategic: string[];
  };
}

export class BackupAlertSystem extends EventEmitter {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private config: AlertConfiguration;
  private activeAlerts: Map<string, WeddingAlert> = new Map();
  private alertHistory: WeddingAlert[] = [];
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<AlertConfiguration> = {}) {
    super();

    this.config = {
      thresholds: {
        apiResponseIncrease: 5,
        cpuUsage: 30,
        memoryUsage: 500,
        databaseLatency: 1000,
        storageErrorRate: 5,
        userImpactSeverity: 'moderate',
        ...config.thresholds,
      },
      weddingPriority: {
        criticalOperations: [
          'photo_uploads',
          'timeline_updates',
          'vendor_coordination',
          'guest_communications',
          'payment_processing',
        ],
        peakHours: { start: 6, end: 22 },
        escalationDelays: {
          lowPriority: 300000, // 5 minutes
          mediumPriority: 60000, // 1 minute
          highPriority: 10000, // 10 seconds
          criticalPriority: 0, // immediate
        },
        ...config.weddingPriority,
      },
      notificationChannels: {
        slack: true,
        email: true,
        sms: false,
        dashboard: true,
        webhook: true,
        ...config.notificationChannels,
      },
    };

    this.initializeAlertSystem();
  }

  /**
   * Setup performance alerts with wedding-context awareness
   */
  async setupPerformanceAlerts(): Promise<AlertConfiguration> {
    console.log('🚨 Setting up wedding-aware backup performance alerts');

    // Register alert handlers for different event types
    this.setupAlertHandlers();

    // Initialize threshold monitoring
    await this.initializeThresholdMonitoring();

    // Setup escalation procedures
    this.setupEscalationProcedures();

    console.log('✅ Performance alert system configured');

    return { ...this.config };
  }

  /**
   * Process performance metrics and generate alerts
   */
  async processPerformanceMetrics(
    metrics: PerformanceMetrics,
  ): Promise<WeddingAlert[]> {
    const alerts: WeddingAlert[] = [];

    // Check API performance
    if (
      metrics.apiResponseTime.increase >
      this.config.thresholds.apiResponseIncrease
    ) {
      const alert = await this.createAlert({
        category: 'performance',
        severity: this.determineAPISeverity(metrics.apiResponseTime.increase),
        title: 'API Response Time Degradation',
        message: `API response time increased by ${metrics.apiResponseTime.increase.toFixed(1)}%`,
        metrics: metrics,
        recommendations: [
          'Reduce backup resource usage',
          'Consider backup throttling',
        ],
      });
      alerts.push(alert);
    }

    // Check CPU usage
    if (
      metrics.weddingContext.isPeakHours &&
      metrics.systemMetrics.cpuUsage > this.config.thresholds.cpuUsage
    ) {
      const alert = await this.createAlert({
        category: 'infrastructure',
        severity: 'high',
        title: 'High CPU Usage During Peak Hours',
        message: `CPU usage at ${metrics.systemMetrics.cpuUsage.toFixed(1)}% during wedding planning hours`,
        metrics: metrics,
        recommendations: [
          'Implement CPU throttling',
          'Schedule backup for off-peak hours',
        ],
      });
      alerts.push(alert);
    }

    // Check memory usage
    if (
      metrics.systemMetrics.memoryUsage > this.config.thresholds.memoryUsage
    ) {
      const alert = await this.createAlert({
        category: 'infrastructure',
        severity: 'medium',
        title: 'High Memory Usage',
        message: `Memory usage at ${metrics.systemMetrics.memoryUsage.toFixed(0)}MB`,
        metrics: metrics,
        recommendations: [
          'Optimize backup memory usage',
          'Implement memory limits',
        ],
      });
      alerts.push(alert);
    }

    // Check database performance
    if (
      metrics.databaseMetrics.queryLatency >
      this.config.thresholds.databaseLatency
    ) {
      const alert = await this.createAlert({
        category: 'infrastructure',
        severity: 'high',
        title: 'Database Performance Degradation',
        message: `Database queries averaging ${metrics.databaseMetrics.queryLatency.toFixed(0)}ms`,
        metrics: metrics,
        recommendations: [
          'Limit backup database connections',
          'Optimize backup queries',
        ],
      });
      alerts.push(alert);
    }

    // Check for wedding-critical impacts
    if (metrics.weddingContext.criticalOperations.length > 0) {
      const alert = await this.createAlert({
        category: 'wedding-impact',
        severity: 'critical',
        title: 'Critical Wedding Operations Affected',
        message: `Backup impacting: ${metrics.weddingContext.criticalOperations.join(', ')}`,
        metrics: metrics,
        recommendations: [
          'Immediately halt backup operations',
          'Activate emergency procedures',
        ],
      });
      alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Process infrastructure report and generate alerts
   */
  async processInfrastructureReport(
    report: PerformanceReport,
  ): Promise<WeddingAlert[]> {
    const alerts: WeddingAlert[] = [];

    // Overall health alert
    if (
      report.summary.overallHealth === 'poor' ||
      report.summary.overallHealth === 'critical'
    ) {
      const alert = await this.createAlert({
        category: 'system-health',
        severity:
          report.summary.overallHealth === 'critical' ? 'critical' : 'high',
        title: `System Health: ${report.summary.overallHealth.toUpperCase()}`,
        message: `Backup operations causing ${report.summary.overallHealth} system performance`,
        metrics: report,
        recommendations: report.recommendations.immediate,
      });
      alerts.push(alert);
    }

    // User impact alert
    if (
      report.summary.userImpact === 'significant' ||
      report.summary.userImpact === 'severe'
    ) {
      const alert = await this.createAlert({
        category: 'wedding-impact',
        severity: report.summary.userImpact === 'severe' ? 'critical' : 'high',
        title: `${report.summary.userImpact.toUpperCase()} User Impact`,
        message: `Backup causing ${report.summary.userImpact} impact to wedding operations`,
        metrics: report,
        recommendations: [
          'Consider halting backup',
          'Implement immediate throttling',
        ],
      });
      alerts.push(alert);
    }

    // Storage alerts
    if (
      report.storage.storageHealth.errorRate >
      this.config.thresholds.storageErrorRate
    ) {
      const alert = await this.createAlert({
        category: 'infrastructure',
        severity: 'high',
        title: 'High Storage Error Rate',
        message: `Storage error rate at ${report.storage.storageHealth.errorRate.toFixed(1)}%`,
        metrics: report,
        recommendations: report.storage.recommendations,
      });
      alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Analyze backup performance trends
   */
  async analyzeBackupTrends(): Promise<TrendAnalysis> {
    console.log('📈 Analyzing backup performance trends');

    const timeframe = '24hour';

    // Get historical data
    const historicalData = await this.getHistoricalData(timeframe);

    // Analyze performance trends
    const performance = this.analyzePerformanceTrend(historicalData);

    // Identify patterns
    const patterns = this.identifyPatterns(historicalData);

    // Generate predictions
    const predictions = await this.generatePredictions(
      historicalData,
      patterns,
    );

    // Create recommendations
    const recommendations = this.generateTrendRecommendations(
      performance,
      patterns,
    );

    const analysis: TrendAnalysis = {
      timeframe,
      performance,
      patterns,
      predictions,
      recommendations,
    };

    console.log('📊 Trend analysis complete');

    return analysis;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);

    if (!alert) {
      console.error(`❌ Alert not found: ${alertId}`);
      return false;
    }

    // Update alert status
    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    // Cancel escalation timer
    const escalationTimer = this.escalationTimers.get(alertId);
    if (escalationTimer) {
      clearTimeout(escalationTimer);
      this.escalationTimers.delete(alertId);
    }

    // Store acknowledgment
    await this.storeAlertUpdate(alert);

    // Emit acknowledgment event
    this.emit('alertAcknowledged', { alert, acknowledgedBy });

    console.log(`✅ Alert acknowledged: ${alertId} by ${acknowledgedBy}`);

    return true;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolution: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);

    if (!alert) {
      console.error(`❌ Alert not found: ${alertId}`);
      return false;
    }

    // Update alert status
    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    // Add to history
    this.alertHistory.push(alert);

    // Cancel escalation timer
    const escalationTimer = this.escalationTimers.get(alertId);
    if (escalationTimer) {
      clearTimeout(escalationTimer);
      this.escalationTimers.delete(alertId);
    }

    // Store resolution
    await this.storeAlertUpdate(alert);

    // Emit resolution event
    this.emit('alertResolved', { alert, resolution });

    console.log(`✅ Alert resolved: ${alertId} - ${resolution}`);

    return true;
  }

  /**
   * Initialize alert system
   */
  private initializeAlertSystem(): void {
    console.log('🚀 Initializing backup alert system');

    // Set up alert cleanup (remove old alerts from history)
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000); // Every hour

    // Set up trend analysis
    setInterval(async () => {
      try {
        const trends = await this.analyzeBackupTrends();
        this.emit('trendsAnalyzed', trends);
      } catch (error) {
        console.error('❌ Error analyzing trends:', error);
      }
    }, 1800000); // Every 30 minutes
  }

  /**
   * Create a new alert
   */
  private async createAlert(alertData: {
    category: WeddingAlert['category'];
    severity: WeddingAlert['severity'];
    title: string;
    message: string;
    metrics: any;
    recommendations: string[];
  }): Promise<WeddingAlert> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine priority based on wedding context
    const priority = this.determinePriority(
      alertData.severity,
      alertData.metrics,
    );

    // Extract wedding context
    const weddingContext = this.extractWeddingContext(alertData.metrics);

    const alert: WeddingAlert = {
      id: alertId,
      timestamp: new Date(),
      backupId: alertData.metrics.backupId || 'unknown',
      severity: alertData.severity,
      priority,
      category: alertData.category,
      title: alertData.title,
      message: alertData.message,
      details: {
        affectedOperations: this.identifyAffectedOperations(alertData.metrics),
        metrics: this.extractRelevantMetrics(alertData.metrics),
        weddingContext,
        recommendations: alertData.recommendations,
      },
      status: 'active',
      escalationLevel: 0,
      channels: this.determineNotificationChannels(priority),
      deliveryStatus: {},
    };

    // Store alert
    this.activeAlerts.set(alertId, alert);
    await this.storeAlert(alert);

    // Send notifications
    await this.sendAlertNotifications(alert);

    // Setup escalation if needed
    this.setupAlertEscalation(alert);

    // Emit alert event
    this.emit('alertCreated', alert);

    console.log(`🚨 Alert created: ${alert.id} - ${alert.title}`);

    return alert;
  }

  /**
   * Determine alert priority based on wedding context
   */
  private determinePriority(
    severity: string,
    metrics: any,
  ): WeddingAlert['priority'] {
    // Critical wedding operations always get high priority
    if (metrics.weddingContext?.criticalOperations?.length > 0) {
      return 'critical';
    }

    // During peak hours, elevate priority
    if (metrics.weddingContext?.isPeakHours) {
      if (severity === 'high') return 'critical';
      if (severity === 'medium') return 'high';
    }

    // Active weddings increase priority
    if (metrics.weddingContext?.activeWeddings > 5) {
      if (severity === 'medium') return 'high';
      if (severity === 'low') return 'medium';
    }

    return severity as WeddingAlert['priority'];
  }

  /**
   * Setup alert handlers for different event types
   */
  private setupAlertHandlers(): void {
    this.on('performanceMetrics', async (metrics: PerformanceMetrics) => {
      const alerts = await this.processPerformanceMetrics(metrics);
      for (const alert of alerts) {
        console.log(`📢 Performance alert: ${alert.title}`);
      }
    });

    this.on('infrastructureReport', async (report: PerformanceReport) => {
      const alerts = await this.processInfrastructureReport(report);
      for (const alert of alerts) {
        console.log(`🏗️ Infrastructure alert: ${alert.title}`);
      }
    });

    this.on('criticalIssue', async (issue: any) => {
      const alert = await this.createAlert({
        category: 'system-health',
        severity: 'critical',
        title: 'Critical System Issue',
        message: `Critical issues detected: ${issue.issues.join(', ')}`,
        metrics: issue,
        recommendations: [
          'Immediately halt backup operations',
          'Investigate system health',
        ],
      });

      console.error(`🚨 Critical alert: ${alert.title}`);
    });
  }

  /**
   * Setup escalation procedures
   */
  private setupEscalationProcedures(): void {
    this.on('alertCreated', (alert: WeddingAlert) => {
      this.setupAlertEscalation(alert);
    });
  }

  /**
   * Setup alert escalation timer
   */
  private setupAlertEscalation(alert: WeddingAlert): void {
    const delay =
      this.config.weddingPriority.escalationDelays[
        `${alert.priority}Priority` as keyof typeof this.config.weddingPriority.escalationDelays
      ];

    if (delay > 0) {
      const timer = setTimeout(async () => {
        await this.escalateAlert(alert);
      }, delay);

      this.escalationTimers.set(alert.id, timer);
      alert.nextEscalation = new Date(Date.now() + delay);
    }
  }

  /**
   * Escalate an alert
   */
  private async escalateAlert(alert: WeddingAlert): Promise<void> {
    if (alert.status !== 'active') return;

    alert.escalationLevel++;
    alert.status = 'escalated';

    console.warn(
      `⚠️ Escalating alert: ${alert.id} (Level ${alert.escalationLevel})`,
    );

    // Send escalation notifications
    await this.sendEscalationNotifications(alert);

    // Setup next escalation if needed
    if (alert.escalationLevel < 3) {
      this.setupAlertEscalation(alert);
    }

    this.emit('alertEscalated', alert);
  }

  /**
   * Helper methods for alert processing
   */
  private determineAPISeverity(increase: number): WeddingAlert['severity'] {
    if (increase > 20) return 'critical';
    if (increase > 10) return 'high';
    if (increase > 5) return 'medium';
    return 'low';
  }

  private extractWeddingContext(
    metrics: any,
  ): WeddingAlert['details']['weddingContext'] {
    return {
      activeWeddings: metrics.weddingContext?.activeWeddings || 0,
      criticalOperations: metrics.weddingContext?.criticalOperations || [],
      isPeakHours: metrics.weddingContext?.isPeakHours || false,
    };
  }

  private identifyAffectedOperations(metrics: any): string[] {
    const operations: string[] = [];

    if (metrics.apiResponseTime?.increase > 5) {
      operations.push('API responses');
    }

    if (metrics.databaseMetrics?.queryLatency > 1000) {
      operations.push('Database queries');
    }

    if (metrics.systemMetrics?.memoryUsage > 500) {
      operations.push('Memory-intensive operations');
    }

    return operations;
  }

  private extractRelevantMetrics(metrics: any): Record<string, number> {
    const relevant: Record<string, number> = {};

    if (metrics.apiResponseTime) {
      relevant.apiResponseIncrease = metrics.apiResponseTime.increase;
    }

    if (metrics.systemMetrics) {
      relevant.cpuUsage = metrics.systemMetrics.cpuUsage;
      relevant.memoryUsage = metrics.systemMetrics.memoryUsage;
    }

    if (metrics.databaseMetrics) {
      relevant.queryLatency = metrics.databaseMetrics.queryLatency;
    }

    return relevant;
  }

  private determineNotificationChannels(priority: string): string[] {
    const channels: string[] = [];

    if (this.config.notificationChannels.dashboard) {
      channels.push('dashboard');
    }

    if (priority === 'high' || priority === 'critical') {
      if (this.config.notificationChannels.slack) {
        channels.push('slack');
      }
      if (this.config.notificationChannels.email) {
        channels.push('email');
      }
    }

    if (priority === 'critical') {
      if (this.config.notificationChannels.sms) {
        channels.push('sms');
      }
      if (this.config.notificationChannels.webhook) {
        channels.push('webhook');
      }
    }

    return channels;
  }

  /**
   * Notification and storage methods
   */
  private async sendAlertNotifications(alert: WeddingAlert): Promise<void> {
    for (const channel of alert.channels) {
      try {
        await this.sendNotificationToChannel(alert, channel);
        alert.deliveryStatus[channel] = 'sent';
      } catch (error) {
        console.error(`❌ Failed to send alert to ${channel}:`, error);
        alert.deliveryStatus[channel] = 'failed';
      }
    }
  }

  private async sendEscalationNotifications(
    alert: WeddingAlert,
  ): Promise<void> {
    // Send to additional channels for escalation
    const escalationChannels = ['email', 'slack'];

    for (const channel of escalationChannels) {
      if (!alert.channels.includes(channel)) {
        try {
          await this.sendNotificationToChannel(alert, channel, true);
        } catch (error) {
          console.error(`❌ Failed to send escalation to ${channel}:`, error);
        }
      }
    }
  }

  private async sendNotificationToChannel(
    alert: WeddingAlert,
    channel: string,
    isEscalation = false,
  ): Promise<void> {
    const prefix = isEscalation ? '[ESCALATION]' : '';
    console.log(
      `📢 ${prefix} Sending ${alert.severity} alert to ${channel}: ${alert.title}`,
    );

    // In production, would integrate with actual notification services
    // For now, just log the notification
  }

  private async storeAlert(alert: WeddingAlert): Promise<void> {
    try {
      await this.supabase.from('backup_alerts').insert({
        alert_id: alert.id,
        timestamp: alert.timestamp.toISOString(),
        backup_id: alert.backupId,
        severity: alert.severity,
        priority: alert.priority,
        category: alert.category,
        title: alert.title,
        message: alert.message,
        details: alert.details,
        status: alert.status,
      });
    } catch (error) {
      console.error('❌ Error storing alert:', error);
    }
  }

  private async storeAlertUpdate(alert: WeddingAlert): Promise<void> {
    try {
      await this.supabase
        .from('backup_alerts')
        .update({
          status: alert.status,
          acknowledged_by: alert.acknowledgedBy,
          acknowledged_at: alert.acknowledgedAt?.toISOString(),
          resolved_at: alert.resolvedAt?.toISOString(),
          escalation_level: alert.escalationLevel,
        })
        .eq('alert_id', alert.id);
    } catch (error) {
      console.error('❌ Error updating alert:', error);
    }
  }

  /**
   * Trend analysis methods
   */
  private async initializeThresholdMonitoring(): Promise<void> {
    // Set up threshold monitoring
    console.log('🎯 Initializing performance threshold monitoring');
  }

  private async getHistoricalData(timeframe: string): Promise<any[]> {
    // Mock historical data - in production would query actual metrics
    return [];
  }

  private analyzePerformanceTrend(data: any[]): TrendAnalysis['performance'] {
    return {
      trend: 'stable',
      changePercentage: 0,
      keyMetrics: {
        averageLatency: { current: 100, previous: 95 },
        errorRate: { current: 1, previous: 1.5 },
        userImpact: { current: 'minimal', previous: 'minimal' },
      },
    };
  }

  private identifyPatterns(data: any[]): TrendAnalysis['patterns'] {
    return {
      peakHourImpacts: 0,
      offPeakPerformance: 95,
      weddingSeasonTrends: [],
      recurringIssues: [],
    };
  }

  private async generatePredictions(
    data: any[],
    patterns: any,
  ): Promise<TrendAnalysis['predictions']> {
    return {
      nextOptimalBackupWindow: new Date(Date.now() + 3600000),
      estimatedUserImpact: 'minimal',
      resourceProjections: {
        cpu: 25,
        memory: 400,
        storage: 80,
      },
    };
  }

  private generateTrendRecommendations(
    performance: any,
    patterns: any,
  ): TrendAnalysis['recommendations'] {
    return {
      immediate: [],
      operational: ['Optimize backup scheduling based on usage patterns'],
      strategic: ['Implement predictive backup resource scaling'],
    };
  }

  private cleanupOldAlerts(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    this.alertHistory = this.alertHistory.filter(
      (alert) => alert.timestamp.getTime() > cutoffTime,
    );
  }
}

export default BackupAlertSystem;
