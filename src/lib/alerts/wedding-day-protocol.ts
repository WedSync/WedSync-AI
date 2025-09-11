/**
 * WS-227 System Health - Wedding Day Emergency Protocol
 * Special handling for alerts occurring on Saturdays (wedding days)
 */

import { Logger } from '@/lib/logging/Logger';
import { Alert } from './alert-manager';

export interface WeddingDayConfig {
  enabled: boolean;
  enhancedMonitoring: boolean;
  zeroToleranceMode: boolean;
  emergencyContacts: EmergencyContact[];
  escalationTimeouts: {
    critical: number; // seconds
    emergency: number; // seconds
  };
  autoRecoveryEnabled: boolean;
  maintenanceWindowBlocked: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  priority: number;
  availability: {
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    timezone: string;
  };
}

export interface WeddingDayAlert extends Alert {
  weddingDayEnhancements: {
    immediateEscalation: boolean;
    emergencyContactsNotified: boolean;
    recoveryAttempted: boolean;
    businessImpactScore: number; // 1-10
    affectedWeddings: number;
    estimatedRevenueLoss: number;
  };
}

export interface WeddingDayMetrics {
  totalAlerts: number;
  criticalAlerts: number;
  emergencyAlerts: number;
  averageResponseTime: number;
  recoverySuccessRate: number;
  affectedWeddings: number;
  estimatedBusinessImpact: number;
}

export class WeddingDayProtocol {
  private logger: Logger;
  private config: WeddingDayConfig;
  private activeWeddingDayAlerts: Map<string, WeddingDayAlert> = new Map();
  private weddingDayMetrics: WeddingDayMetrics = {
    totalAlerts: 0,
    criticalAlerts: 0,
    emergencyAlerts: 0,
    averageResponseTime: 0,
    recoverySuccessRate: 0,
    affectedWeddings: 0,
    estimatedBusinessImpact: 0,
  };

  constructor() {
    this.logger = new Logger('WeddingDayProtocol');
    this.config = this.initializeWeddingDayConfig();
  }

  /**
   * Check if today is a wedding day (Saturday)
   */
  public isWeddingDay(): boolean {
    return new Date().getDay() === 6; // Saturday
  }

  /**
   * Enhance alert for wedding day processing
   */
  public enhanceAlert(alert: Alert): Alert {
    if (!this.isWeddingDay()) {
      return alert;
    }

    // Wedding day enhancements
    const enhancedAlert = {
      ...alert,
      weddingDayAlert: true,
      severity: this.enhanceSeverityForWeddingDay(alert.severity),
      notificationChannels: this.getWeddingDayChannels(alert.severity),
      weddingDayEnhancements: {
        immediateEscalation: this.shouldImmediatelyEscalate(alert),
        emergencyContactsNotified: false,
        recoveryAttempted: false,
        businessImpactScore: this.calculateBusinessImpactScore(alert),
        affectedWeddings: this.estimateAffectedWeddings(alert),
        estimatedRevenueLoss: this.estimateRevenueLoss(alert),
      },
    } as WeddingDayAlert;

    this.logger.info('Alert enhanced for wedding day', {
      alertId: alert.id,
      originalSeverity: alert.severity,
      enhancedSeverity: enhancedAlert.severity,
      businessImpactScore:
        enhancedAlert.weddingDayEnhancements.businessImpactScore,
      affectedWeddings: enhancedAlert.weddingDayEnhancements.affectedWeddings,
    });

    return enhancedAlert;
  }

  /**
   * Handle wedding day alert with emergency protocols
   */
  public async handleAlert(alert: Alert): Promise<void> {
    if (!this.isWeddingDay() || !alert.weddingDayAlert) {
      return;
    }

    const weddingAlert = alert as WeddingDayAlert;
    this.activeWeddingDayAlerts.set(alert.id, weddingAlert);
    this.updateWeddingDayMetrics(weddingAlert);

    this.logger.critical('Wedding day alert activated', {
      alertId: alert.id,
      severity: alert.severity,
      businessImpactScore:
        weddingAlert.weddingDayEnhancements.businessImpactScore,
      affectedWeddings: weddingAlert.weddingDayEnhancements.affectedWeddings,
    });

    try {
      // Immediate emergency response for critical/emergency alerts
      if (alert.severity === 'critical' || alert.severity === 'emergency') {
        await this.activateEmergencyResponse(weddingAlert);
      }

      // Attempt automatic recovery if enabled
      if (
        this.config.autoRecoveryEnabled &&
        !weddingAlert.weddingDayEnhancements.recoveryAttempted
      ) {
        await this.attemptWeddingDayRecovery(weddingAlert);
      }

      // Enhanced monitoring activation
      if (this.config.enhancedMonitoring) {
        await this.activateEnhancedMonitoring(weddingAlert);
      }

      // Business continuity measures
      await this.implementBusinessContinuityMeasures(weddingAlert);
    } catch (error) {
      this.logger.error('Wedding day alert handling failed', {
        error,
        alertId: alert.id,
      });

      // Fallback to manual escalation
      await this.escalateToManualIntervention(weddingAlert);
    }
  }

  /**
   * Activate emergency response for critical wedding day issues
   */
  private async activateEmergencyResponse(
    alert: WeddingDayAlert,
  ): Promise<void> {
    this.logger.critical('Activating wedding day emergency response', {
      alertId: alert.id,
      severity: alert.severity,
    });

    // Immediate notification to all emergency contacts
    await this.notifyEmergencyContacts(alert);

    // Create emergency war room if high business impact
    if (alert.weddingDayEnhancements.businessImpactScore >= 8) {
      await this.createEmergencyWarRoom(alert);
    }

    // Activate incident commander protocol
    await this.activateIncidentCommander(alert);

    // Enable real-time status page updates
    await this.enableRealTimeStatusUpdates(alert);

    alert.weddingDayEnhancements.emergencyContactsNotified = true;
  }

  /**
   * Notify all emergency contacts immediately
   */
  private async notifyEmergencyContacts(alert: WeddingDayAlert): Promise<void> {
    const availableContacts = this.getAvailableEmergencyContacts();

    if (availableContacts.length === 0) {
      this.logger.error('No emergency contacts available on wedding day', {
        alertId: alert.id,
      });
      return;
    }

    const emergencyMessage = this.createEmergencyMessage(alert);

    // Send notifications in parallel for speed
    const notifications = availableContacts.map(async (contact) => {
      try {
        // Send both SMS and email immediately
        await Promise.all([
          this.sendEmergencySMS(contact, emergencyMessage),
          this.sendEmergencyEmail(contact, alert),
          this.initiateEmergencyCall(contact, alert), // For priority 1 contacts
        ]);

        this.logger.info('Emergency contact notified', {
          contactName: contact.name,
          contactRole: contact.role,
          alertId: alert.id,
        });
      } catch (error) {
        this.logger.error('Failed to notify emergency contact', {
          error,
          contactName: contact.name,
          alertId: alert.id,
        });
      }
    });

    await Promise.all(notifications);
  }

  /**
   * Attempt automated recovery for wedding day alerts
   */
  private async attemptWeddingDayRecovery(
    alert: WeddingDayAlert,
  ): Promise<void> {
    this.logger.info('Attempting wedding day recovery', {
      alertId: alert.id,
      category: alert.category,
    });

    let recoverySuccess = false;

    try {
      switch (alert.category) {
        case 'database':
          recoverySuccess = await this.recoverDatabaseIssue(alert);
          break;

        case 'api':
          recoverySuccess = await this.recoverAPIIssue(alert);
          break;

        case 'service':
          recoverySuccess = await this.recoverServiceIssue(alert);
          break;

        case 'performance':
          recoverySuccess = await this.recoverPerformanceIssue(alert);
          break;

        default:
          this.logger.warn('No specific recovery procedure for category', {
            category: alert.category,
            alertId: alert.id,
          });
      }

      alert.weddingDayEnhancements.recoveryAttempted = true;

      if (recoverySuccess) {
        this.logger.info('Wedding day recovery successful', {
          alertId: alert.id,
          category: alert.category,
        });

        // Auto-resolve if recovery was successful
        await this.autoResolveAlert(alert);
      } else {
        this.logger.warn('Wedding day recovery failed, escalating', {
          alertId: alert.id,
          category: alert.category,
        });

        await this.escalateFailedRecovery(alert);
      }
    } catch (error) {
      this.logger.error('Wedding day recovery attempt failed', {
        error,
        alertId: alert.id,
      });

      await this.escalateFailedRecovery(alert);
    }
  }

  /**
   * Recovery methods for different categories
   */
  private async recoverDatabaseIssue(alert: WeddingDayAlert): Promise<boolean> {
    try {
      const response = await fetch('/api/health/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger_recovery',
          autoRecover: true,
          weddingDayMode: true,
          alertId: alert.id,
        }),
      });

      const result = await response.json();
      return result.success && result.results?.some((r: any) => r.success);
    } catch (error) {
      this.logger.error('Database recovery failed', {
        error,
        alertId: alert.id,
      });
      return false;
    }
  }

  private async recoverAPIIssue(alert: WeddingDayAlert): Promise<boolean> {
    // Implement API-specific recovery logic
    try {
      // Restart API services, clear caches, etc.
      const response = await fetch('/api/system/restart-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services: ['api', 'cache'],
          reason: 'wedding_day_recovery',
          alertId: alert.id,
        }),
      });

      return response.ok;
    } catch (error) {
      this.logger.error('API recovery failed', { error, alertId: alert.id });
      return false;
    }
  }

  private async recoverServiceIssue(alert: WeddingDayAlert): Promise<boolean> {
    // Implement service-specific recovery logic
    try {
      const response = await fetch('/api/system/health-check-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repair: true,
          weddingDayMode: true,
          alertId: alert.id,
        }),
      });

      return response.ok;
    } catch (error) {
      this.logger.error('Service recovery failed', {
        error,
        alertId: alert.id,
      });
      return false;
    }
  }

  private async recoverPerformanceIssue(
    alert: WeddingDayAlert,
  ): Promise<boolean> {
    // Implement performance recovery logic
    try {
      const response = await fetch('/api/system/optimize-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingDayMode: true,
          alertId: alert.id,
        }),
      });

      return response.ok;
    } catch (error) {
      this.logger.error('Performance recovery failed', {
        error,
        alertId: alert.id,
      });
      return false;
    }
  }

  /**
   * Helper methods for wedding day protocol
   */
  private enhanceSeverityForWeddingDay(
    originalSeverity: Alert['severity'],
  ): Alert['severity'] {
    if (!this.config.zeroToleranceMode) {
      return originalSeverity;
    }

    // Escalate severity for zero-tolerance wedding day mode
    switch (originalSeverity) {
      case 'info':
        return 'warning';
      case 'warning':
        return 'critical';
      case 'critical':
        return 'emergency';
      case 'emergency':
        return 'emergency'; // Already at max
      default:
        return originalSeverity;
    }
  }

  private getWeddingDayChannels(severity: Alert['severity']): string[] {
    // All wedding day alerts get enhanced notification channels
    switch (severity) {
      case 'emergency':
        return ['email', 'sms', 'slack', 'webhook', 'push', 'phone'];
      case 'critical':
        return ['email', 'sms', 'slack', 'webhook', 'push'];
      case 'warning':
        return ['email', 'slack', 'push'];
      case 'info':
      default:
        return ['slack', 'push'];
    }
  }

  private shouldImmediatelyEscalate(alert: Alert): boolean {
    return (
      alert.severity === 'critical' ||
      alert.severity === 'emergency' ||
      alert.category === 'database' ||
      alert.category === 'service'
    );
  }

  private calculateBusinessImpactScore(alert: Alert): number {
    let score = 1;

    // Severity impact
    switch (alert.severity) {
      case 'emergency':
        score += 4;
        break;
      case 'critical':
        score += 3;
        break;
      case 'warning':
        score += 2;
        break;
      case 'info':
        score += 1;
        break;
    }

    // Category impact
    switch (alert.category) {
      case 'database':
        score += 3;
        break;
      case 'service':
        score += 2;
        break;
      case 'api':
        score += 2;
        break;
      case 'performance':
        score += 1;
        break;
      case 'security':
        score += 2;
        break;
    }

    return Math.min(10, score);
  }

  private estimateAffectedWeddings(alert: Alert): number {
    // Estimate based on typical Saturday wedding volume and alert scope
    const baseWeddingCount = 50; // Average Saturday weddings
    const impactMultiplier = this.getImpactMultiplier(alert);

    return Math.round(baseWeddingCount * impactMultiplier);
  }

  private estimateRevenueLoss(alert: Alert): number {
    const affectedWeddings = this.estimateAffectedWeddings(alert);
    const avgWeddingValue = 5000; // £5000 average wedding value
    const impactPercentage = this.getImpactPercentage(alert);

    return Math.round(affectedWeddings * avgWeddingValue * impactPercentage);
  }

  private getImpactMultiplier(alert: Alert): number {
    switch (alert.severity) {
      case 'emergency':
        return 1.0; // All weddings potentially affected
      case 'critical':
        return 0.7;
      case 'warning':
        return 0.3;
      case 'info':
      default:
        return 0.1;
    }
  }

  private getImpactPercentage(alert: Alert): number {
    switch (alert.category) {
      case 'database':
        return 0.8; // High impact on wedding operations
      case 'service':
        return 0.6;
      case 'api':
        return 0.5;
      case 'performance':
        return 0.3;
      case 'security':
        return 0.4;
      default:
        return 0.2;
    }
  }

  private getAvailableEmergencyContacts(): EmergencyContact[] {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return this.config.emergencyContacts
      .filter((contact) => {
        const [startHour, startMinute] = contact.availability.startTime
          .split(':')
          .map(Number);
        const [endHour, endMinute] = contact.availability.endTime
          .split(':')
          .map(Number);

        const currentMinutes = currentHour * 60 + currentMinute;
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      })
      .sort((a, b) => a.priority - b.priority);
  }

  private createEmergencyMessage(alert: WeddingDayAlert): string {
    return `🚨 WEDDING DAY EMERGENCY 🚨
Alert: ${alert.title}
Severity: ${alert.severity.toUpperCase()}
Impact Score: ${alert.weddingDayEnhancements.businessImpactScore}/10
Affected Weddings: ${alert.weddingDayEnhancements.affectedWeddings}
Estimated Loss: £${alert.weddingDayEnhancements.estimatedRevenueLoss.toLocaleString()}
Time: ${alert.timestamp.toLocaleTimeString()}
Dashboard: https://wedsync.com/admin/health
Alert ID: ${alert.id}`;
  }

  private async sendEmergencySMS(
    contact: EmergencyContact,
    message: string,
  ): Promise<void> {
    await fetch('/api/sms/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: contact.phone,
        message: message.substring(0, 160),
        priority: 'emergency',
      }),
    });
  }

  private async sendEmergencyEmail(
    contact: EmergencyContact,
    alert: WeddingDayAlert,
  ): Promise<void> {
    await fetch('/api/email/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: contact.email,
        subject: `🚨 WEDDING DAY EMERGENCY: ${alert.title}`,
        template: 'wedding_day_emergency',
        data: { alert, contact },
      }),
    });
  }

  private async initiateEmergencyCall(
    contact: EmergencyContact,
    alert: WeddingDayAlert,
  ): Promise<void> {
    if (contact.priority === 1) {
      // Only call priority 1 contacts
      await fetch('/api/voice/emergency-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contact.phone,
          message: `Wedding day emergency alert: ${alert.title}. Please check the dashboard immediately.`,
          alertId: alert.id,
        }),
      });
    }
  }

  private async createEmergencyWarRoom(alert: WeddingDayAlert): Promise<void> {
    // Create emergency Slack channel or similar
    await fetch('/api/emergency/war-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId: alert.id,
        severity: alert.severity,
        participants: this.config.emergencyContacts.map((c) => c.email),
      }),
    });
  }

  private async activateIncidentCommander(
    alert: WeddingDayAlert,
  ): Promise<void> {
    // Assign incident commander based on alert severity and availability
    const commander = this.config.emergencyContacts.find(
      (c) => c.priority === 1,
    );
    if (commander) {
      await fetch('/api/emergency/assign-commander', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: alert.id,
          commanderId: commander.id,
          commanderEmail: commander.email,
        }),
      });
    }
  }

  private async enableRealTimeStatusUpdates(
    alert: WeddingDayAlert,
  ): Promise<void> {
    // Enable real-time status page updates for high-impact alerts
    await fetch('/api/status-page/enable-realtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId: alert.id,
        updateInterval: 30000, // 30 seconds
        publicMessage: this.createPublicStatusMessage(alert),
      }),
    });
  }

  private createPublicStatusMessage(alert: WeddingDayAlert): string {
    return `We are currently experiencing ${alert.severity === 'emergency' ? 'technical difficulties' : 'performance issues'} that may affect some wedding services. Our team is actively working to resolve this issue. We apologize for any inconvenience.`;
  }

  private async activateEnhancedMonitoring(
    alert: WeddingDayAlert,
  ): Promise<void> {
    // Increase monitoring frequency and sensitivity
    await fetch('/api/monitoring/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId: alert.id,
        monitoringInterval: 10000, // 10 seconds
        sensitivityIncrease: 50, // 50% more sensitive thresholds
      }),
    });
  }

  private async implementBusinessContinuityMeasures(
    alert: WeddingDayAlert,
  ): Promise<void> {
    if (alert.weddingDayEnhancements.businessImpactScore >= 7) {
      // Activate backup systems, redirect traffic, etc.
      await fetch('/api/business-continuity/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: alert.id,
          measures: ['backup_systems', 'traffic_redirect', 'read_only_mode'],
        }),
      });
    }
  }

  private async autoResolveAlert(alert: WeddingDayAlert): Promise<void> {
    await fetch('/api/alerts/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId: alert.id,
        resolvedBy: 'wedding_day_auto_recovery',
        resolution: 'Automatically resolved by wedding day recovery protocol',
      }),
    });
  }

  private async escalateFailedRecovery(alert: WeddingDayAlert): Promise<void> {
    // Escalate to manual intervention with high priority
    await fetch('/api/alerts/escalate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId: alert.id,
        reason: 'wedding_day_recovery_failed',
        priority: 'emergency',
      }),
    });
  }

  private async escalateToManualIntervention(
    alert: WeddingDayAlert,
  ): Promise<void> {
    this.logger.critical('Escalating to manual intervention', {
      alertId: alert.id,
      reason: 'automated_protocols_failed',
    });

    // Send immediate notification to all emergency contacts
    await this.notifyEmergencyContacts(alert);

    // Create high-priority support ticket
    await fetch('/api/support/emergency-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId: alert.id,
        priority: 'critical',
        assignTo: 'emergency_team',
        title: `Wedding Day Manual Intervention Required: ${alert.title}`,
        description: `Automated wedding day protocols failed for alert ${alert.id}. Manual intervention required immediately.`,
      }),
    });
  }

  private updateWeddingDayMetrics(alert: WeddingDayAlert): void {
    this.weddingDayMetrics.totalAlerts++;

    if (alert.severity === 'critical') {
      this.weddingDayMetrics.criticalAlerts++;
    } else if (alert.severity === 'emergency') {
      this.weddingDayMetrics.emergencyAlerts++;
    }

    this.weddingDayMetrics.affectedWeddings +=
      alert.weddingDayEnhancements.affectedWeddings;
    this.weddingDayMetrics.estimatedBusinessImpact +=
      alert.weddingDayEnhancements.estimatedRevenueLoss;
  }

  /**
   * Initialize wedding day configuration
   */
  private initializeWeddingDayConfig(): WeddingDayConfig {
    return {
      enabled: true,
      enhancedMonitoring: true,
      zeroToleranceMode: true,
      emergencyContacts: [
        {
          id: 'cto',
          name: 'CTO',
          role: 'Chief Technology Officer',
          phone: '+44123456789',
          email: 'cto@wedsync.com',
          priority: 1,
          availability: {
            startTime: '00:00',
            endTime: '23:59',
            timezone: 'Europe/London',
          },
        },
        {
          id: 'devops_lead',
          name: 'DevOps Lead',
          role: 'DevOps Team Lead',
          phone: '+44987654321',
          email: 'devops@wedsync.com',
          priority: 2,
          availability: {
            startTime: '08:00',
            endTime: '20:00',
            timezone: 'Europe/London',
          },
        },
        {
          id: 'oncall_engineer',
          name: 'On-Call Engineer',
          role: 'Senior Software Engineer',
          phone: '+44555666777',
          email: 'oncall@wedsync.com',
          priority: 3,
          availability: {
            startTime: '00:00',
            endTime: '23:59',
            timezone: 'Europe/London',
          },
        },
      ],
      escalationTimeouts: {
        critical: 30, // 30 seconds
        emergency: 15, // 15 seconds
      },
      autoRecoveryEnabled: true,
      maintenanceWindowBlocked: true,
    };
  }

  /**
   * Get wedding day metrics
   */
  public getWeddingDayMetrics(): WeddingDayMetrics {
    return { ...this.weddingDayMetrics };
  }

  /**
   * Reset wedding day metrics (typically called at end of day)
   */
  public resetWeddingDayMetrics(): void {
    this.weddingDayMetrics = {
      totalAlerts: 0,
      criticalAlerts: 0,
      emergencyAlerts: 0,
      averageResponseTime: 0,
      recoverySuccessRate: 0,
      affectedWeddings: 0,
      estimatedBusinessImpact: 0,
    };

    this.activeWeddingDayAlerts.clear();
  }
}
