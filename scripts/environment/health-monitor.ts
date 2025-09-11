#!/usr/bin/env tsx
/**
 * WS-194 Environment Management - Health Monitoring System
 * Automated monitoring and alerting for all team environments
 * 
 * @feature WS-194 - Environment Management
 * @team Team E - QA/Testing & Documentation
 * @round Round 1
 * @date 2025-08-29
 * 
 * WEDDING PROTECTION: Proactive monitoring prevents wedding day disasters
 */

import { EventEmitter } from 'events';
import { z } from 'zod';

// Types for health monitoring
interface HealthMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  impact: 'high' | 'medium' | 'low';
  team: 'A' | 'B' | 'C' | 'D' | 'ALL';
  lastChecked: string;
}

interface HealthCheckResult {
  service: string;
  team: 'A' | 'B' | 'C' | 'D' | 'ALL';
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  error?: string;
  metrics: HealthMetric[];
  weddingImpact: 'critical' | 'moderate' | 'low' | 'none';
}

interface AlertRule {
  name: string;
  condition: (metric: HealthMetric) => boolean;
  severity: 'critical' | 'warning' | 'info';
  weddingSeasonOnly: boolean;
  cooldownMinutes: number;
  escalationMinutes: number;
}

interface Alert {
  id: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  team: string;
  service: string;
  weddingImpact: string;
  resolved: boolean;
  escalated: boolean;
}

/**
 * Environment Health Monitoring System
 * Proactive monitoring prevents wedding day disasters
 */
export class EnvironmentHealthMonitor extends EventEmitter {
  private healthChecks: Map<string, HealthCheckResult> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertCooldowns: Map<string, number> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  private readonly weddingSeasonMonths = [5, 6, 7, 8, 9, 10]; // May-October
  private readonly monitoringIntervalMs = 30000; // 30 seconds
  private readonly weddingSeasonIntervalMs = 15000; // 15 seconds during wedding season

  /**
   * Start comprehensive environment monitoring
   * Enhanced monitoring during wedding season
   */
  async startMonitoring(): Promise<void> {
    const isWeddingSeason = this.isWeddingSeason();
    const interval = isWeddingSeason ? this.weddingSeasonIntervalMs : this.monitoringIntervalMs;

    console.log('🎯 WS-194: Starting environment health monitoring...');
    console.log(`Wedding Season: ${isWeddingSeason ? '🌸 YES' : '❄️ NO'}`);
    console.log(`Monitoring Interval: ${interval/1000} seconds\n`);

    // Initial comprehensive health check
    await this.performComprehensiveHealthCheck();

    // Start continuous monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.performComprehensiveHealthCheck();
    }, interval);

    // Setup alert processing
    this.setupAlertProcessing();

    console.log('✅ Environment monitoring started successfully');
  }

  /**
   * Stop monitoring system
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('🛑 Environment monitoring stopped');
  }

  /**
   * Perform comprehensive health check across all teams
   */
  async performComprehensiveHealthCheck(): Promise<Map<string, HealthCheckResult>> {
    const checks = await Promise.all([
      this.checkTeamAHealth(),      // Frontend/PWA
      this.checkTeamBHealth(),      // API/Backend
      this.checkTeamCHealth(),      // Integrations
      this.checkTeamDHealth(),      // Mobile
      this.checkOverallSystemHealth(), // System-wide checks
    ]);

    // Process health check results
    for (const result of checks) {
      this.healthChecks.set(result.service, result);
      
      // Process metrics for alerting
      for (const metric of result.metrics) {
        await this.processMetricForAlerting(metric, result);
      }
    }

    // Log health status
    this.logHealthStatus();

    return this.healthChecks;
  }

  /**
   * Team A - Frontend/PWA Health Monitoring
   */
  private async checkTeamAHealth(): Promise<HealthCheckResult> {
    const metrics: HealthMetric[] = [];

    try {
      // Build performance metrics
      const buildMetrics = await this.getBuildMetrics();
      metrics.push({
        name: 'Bundle Size',
        value: buildMetrics.bundleSize,
        threshold: 500 * 1024, // 500KB
        status: buildMetrics.bundleSize > 500 * 1024 ? 'warning' : 'healthy',
        impact: 'medium',
        team: 'A',
        lastChecked: new Date().toISOString(),
      });

      // PWA health check
      const pwaHealth = await this.checkPWAHealth();
      metrics.push({
        name: 'PWA Service Worker',
        value: pwaHealth.active ? 1 : 0,
        threshold: 1,
        status: pwaHealth.active ? 'healthy' : 'critical',
        impact: 'high',
        team: 'A',
        lastChecked: new Date().toISOString(),
      });

      // Frontend response time
      const frontendResponse = await this.checkFrontendResponseTime();
      metrics.push({
        name: 'Frontend Response Time',
        value: frontendResponse.responseTime,
        threshold: 2000, // 2 seconds
        status: frontendResponse.responseTime > 2000 ? 'warning' : 'healthy',
        impact: 'high',
        team: 'A',
        lastChecked: new Date().toISOString(),
      });

      return {
        service: 'Frontend/PWA',
        team: 'A',
        status: metrics.some(m => m.status === 'critical') ? 'down' : 
               metrics.some(m => m.status === 'warning') ? 'degraded' : 'healthy',
        responseTime: frontendResponse.responseTime,
        metrics,
        weddingImpact: metrics.some(m => m.status === 'critical' && m.impact === 'high') ? 'critical' : 'moderate',
      };

    } catch (error) {
      return {
        service: 'Frontend/PWA',
        team: 'A',
        status: 'down',
        responseTime: 0,
        error: `Team A health check failed: ${error}`,
        metrics,
        weddingImpact: 'critical',
      };
    }
  }

  /**
   * Team B - API/Backend Health Monitoring
   */
  private async checkTeamBHealth(): Promise<HealthCheckResult> {
    const metrics: HealthMetric[] = [];

    try {
      // Database health
      const dbHealth = await this.checkDatabaseHealth();
      metrics.push({
        name: 'Database Response Time',
        value: dbHealth.responseTime,
        threshold: 100, // 100ms
        status: dbHealth.responseTime > 200 ? 'critical' : dbHealth.responseTime > 100 ? 'warning' : 'healthy',
        impact: 'high',
        team: 'B',
        lastChecked: new Date().toISOString(),
      });

      // API endpoint health
      const apiHealth = await this.checkAPIHealth();
      metrics.push({
        name: 'API Response Time',
        value: apiHealth.responseTime,
        threshold: 500, // 500ms
        status: apiHealth.responseTime > 1000 ? 'critical' : apiHealth.responseTime > 500 ? 'warning' : 'healthy',
        impact: 'high',
        team: 'B',
        lastChecked: new Date().toISOString(),
      });

      // Payment system health (critical for weddings)
      const paymentHealth = await this.checkPaymentSystemHealth();
      metrics.push({
        name: 'Payment System',
        value: paymentHealth.operational ? 1 : 0,
        threshold: 1,
        status: paymentHealth.operational ? 'healthy' : 'critical',
        impact: 'high',
        team: 'B',
        lastChecked: new Date().toISOString(),
      });

      return {
        service: 'API/Backend',
        team: 'B',
        status: metrics.some(m => m.status === 'critical') ? 'down' : 
               metrics.some(m => m.status === 'warning') ? 'degraded' : 'healthy',
        responseTime: apiHealth.responseTime,
        metrics,
        weddingImpact: metrics.some(m => m.status === 'critical') ? 'critical' : 'moderate',
      };

    } catch (error) {
      return {
        service: 'API/Backend',
        team: 'B',
        status: 'down',
        responseTime: 0,
        error: `Team B health check failed: ${error}`,
        metrics,
        weddingImpact: 'critical',
      };
    }
  }

  /**
   * Team C - Integrations Health Monitoring
   */
  private async checkTeamCHealth(): Promise<HealthCheckResult> {
    const metrics: HealthMetric[] = [];

    try {
      // Email service health
      const emailHealth = await this.checkEmailServiceHealth();
      metrics.push({
        name: 'Email Service',
        value: emailHealth.operational ? 1 : 0,
        threshold: 1,
        status: emailHealth.operational ? 'healthy' : 'warning',
        impact: 'medium',
        team: 'C',
        lastChecked: new Date().toISOString(),
      });

      // CRM integrations health
      const crmHealth = await this.checkCRMIntegrationsHealth();
      metrics.push({
        name: 'CRM Integrations',
        value: crmHealth.activeIntegrations,
        threshold: 1,
        status: crmHealth.activeIntegrations > 0 ? 'healthy' : 'warning',
        impact: 'medium',
        team: 'C',
        lastChecked: new Date().toISOString(),
      });

      // Webhook processing health
      const webhookHealth = await this.checkWebhookHealth();
      metrics.push({
        name: 'Webhook Processing',
        value: webhookHealth.processedCount,
        threshold: 0,
        status: webhookHealth.errorRate > 0.1 ? 'warning' : 'healthy',
        impact: 'medium',
        team: 'C',
        lastChecked: new Date().toISOString(),
      });

      return {
        service: 'Integrations',
        team: 'C',
        status: metrics.some(m => m.status === 'critical') ? 'down' : 
               metrics.some(m => m.status === 'warning') ? 'degraded' : 'healthy',
        responseTime: emailHealth.responseTime || 0,
        metrics,
        weddingImpact: metrics.some(m => m.status === 'critical') ? 'moderate' : 'low',
      };

    } catch (error) {
      return {
        service: 'Integrations',
        team: 'C',
        status: 'down',
        responseTime: 0,
        error: `Team C health check failed: ${error}`,
        metrics,
        weddingImpact: 'moderate',
      };
    }
  }

  /**
   * Team D - Mobile Health Monitoring
   */
  private async checkTeamDHealth(): Promise<HealthCheckResult> {
    const metrics: HealthMetric[] = [];

    try {
      // Mobile app connectivity
      const mobileHealth = await this.checkMobileAppHealth();
      metrics.push({
        name: 'Mobile App Connectivity',
        value: mobileHealth.connected ? 1 : 0,
        threshold: 1,
        status: mobileHealth.connected ? 'healthy' : 'warning',
        impact: 'medium',
        team: 'D',
        lastChecked: new Date().toISOString(),
      });

      // Push notification service
      const pushHealth = await this.checkPushNotificationHealth();
      metrics.push({
        name: 'Push Notifications',
        value: pushHealth.deliveryRate,
        threshold: 0.9, // 90% delivery rate
        status: pushHealth.deliveryRate < 0.8 ? 'warning' : 'healthy',
        impact: 'low',
        team: 'D',
        lastChecked: new Date().toISOString(),
      });

      // App store configuration
      const appStoreHealth = await this.checkAppStoreHealth();
      metrics.push({
        name: 'App Store Configuration',
        value: appStoreHealth.configured ? 1 : 0,
        threshold: 1,
        status: appStoreHealth.configured ? 'healthy' : 'warning',
        impact: 'low',
        team: 'D',
        lastChecked: new Date().toISOString(),
      });

      return {
        service: 'Mobile',
        team: 'D',
        status: metrics.some(m => m.status === 'critical') ? 'down' : 
               metrics.some(m => m.status === 'warning') ? 'degraded' : 'healthy',
        responseTime: mobileHealth.responseTime || 0,
        metrics,
        weddingImpact: metrics.some(m => m.status === 'critical') ? 'moderate' : 'low',
      };

    } catch (error) {
      return {
        service: 'Mobile',
        team: 'D',
        status: 'down',
        responseTime: 0,
        error: `Team D health check failed: ${error}`,
        metrics,
        weddingImpact: 'moderate',
      };
    }
  }

  /**
   * Overall System Health Monitoring
   */
  private async checkOverallSystemHealth(): Promise<HealthCheckResult> {
    const metrics: HealthMetric[] = [];

    try {
      // Overall system performance
      const systemMetrics = await this.getSystemMetrics();
      metrics.push({
        name: 'System CPU Usage',
        value: systemMetrics.cpuUsage,
        threshold: 80, // 80%
        status: systemMetrics.cpuUsage > 90 ? 'critical' : systemMetrics.cpuUsage > 80 ? 'warning' : 'healthy',
        impact: 'high',
        team: 'ALL',
        lastChecked: new Date().toISOString(),
      });

      metrics.push({
        name: 'System Memory Usage',
        value: systemMetrics.memoryUsage,
        threshold: 85, // 85%
        status: systemMetrics.memoryUsage > 95 ? 'critical' : systemMetrics.memoryUsage > 85 ? 'warning' : 'healthy',
        impact: 'high',
        team: 'ALL',
        lastChecked: new Date().toISOString(),
      });

      // Wedding workflow health check
      const weddingWorkflowHealth = await this.checkWeddingWorkflows();
      metrics.push({
        name: 'Wedding Workflows',
        value: weddingWorkflowHealth.operationalWorkflows,
        threshold: 5, // All 5 critical workflows
        status: weddingWorkflowHealth.operationalWorkflows < 5 ? 'critical' : 'healthy',
        impact: 'high',
        team: 'ALL',
        lastChecked: new Date().toISOString(),
      });

      return {
        service: 'Overall System',
        team: 'ALL',
        status: metrics.some(m => m.status === 'critical') ? 'down' : 
               metrics.some(m => m.status === 'warning') ? 'degraded' : 'healthy',
        responseTime: 0,
        metrics,
        weddingImpact: metrics.some(m => m.status === 'critical') ? 'critical' : 'low',
      };

    } catch (error) {
      return {
        service: 'Overall System',
        team: 'ALL',
        status: 'down',
        responseTime: 0,
        error: `System health check failed: ${error}`,
        metrics,
        weddingImpact: 'critical',
      };
    }
  }

  /**
   * Process metric for alerting system
   */
  private async processMetricForAlerting(metric: HealthMetric, context: HealthCheckResult): Promise<void> {
    const alertRules = this.getAlertRules();
    
    for (const rule of alertRules) {
      if (rule.condition(metric)) {
        const alertId = `${context.service}-${metric.name}-${rule.name}`;
        
        // Check cooldown period
        const lastAlert = this.alertCooldowns.get(alertId);
        if (lastAlert && (Date.now() - lastAlert) < (rule.cooldownMinutes * 60 * 1000)) {
          continue;
        }

        // Skip wedding season only alerts if not in wedding season
        if (rule.weddingSeasonOnly && !this.isWeddingSeason()) {
          continue;
        }

        // Create alert
        const alert: Alert = {
          id: alertId,
          timestamp: new Date().toISOString(),
          severity: rule.severity,
          message: `${context.service} - ${metric.name}: ${metric.value} exceeds threshold ${metric.threshold}`,
          team: metric.team,
          service: context.service,
          weddingImpact: context.weddingImpact,
          resolved: false,
          escalated: false,
        };

        this.alerts.set(alertId, alert);
        this.alertCooldowns.set(alertId, Date.now());
        
        // Emit alert for processing
        this.emit('alert', alert);
      }
    }
  }

  /**
   * Setup alert processing and notifications
   */
  private setupAlertProcessing(): void {
    this.on('alert', async (alert: Alert) => {
      await this.processAlert(alert);
    });
  }

  /**
   * Process alert and send notifications
   */
  private async processAlert(alert: Alert): Promise<void> {
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    console.log(`   Team: ${alert.team} | Service: ${alert.service}`);
    console.log(`   Wedding Impact: ${alert.weddingImpact.toUpperCase()}`);

    // Send notifications based on severity
    switch (alert.severity) {
      case 'critical':
        await this.sendCriticalAlert(alert);
        break;
      case 'warning':
        await this.sendWarningAlert(alert);
        break;
      case 'info':
        await this.sendInfoAlert(alert);
        break;
    }

    // Log alert for historical tracking
    console.log(`   Alert ID: ${alert.id} | Timestamp: ${alert.timestamp}`);
  }

  /**
   * Get alert rules configuration
   */
  private getAlertRules(): AlertRule[] {
    return [
      {
        name: 'High Response Time',
        condition: (metric) => metric.name.includes('Response Time') && metric.status === 'critical',
        severity: 'critical',
        weddingSeasonOnly: false,
        cooldownMinutes: 5,
        escalationMinutes: 10,
      },
      {
        name: 'Wedding Workflow Down',
        condition: (metric) => metric.name === 'Wedding Workflows' && metric.status === 'critical',
        severity: 'critical',
        weddingSeasonOnly: false,
        cooldownMinutes: 1,
        escalationMinutes: 2,
      },
      {
        name: 'Payment System Issue',
        condition: (metric) => metric.name === 'Payment System' && metric.status !== 'healthy',
        severity: 'critical',
        weddingSeasonOnly: false,
        cooldownMinutes: 2,
        escalationMinutes: 5,
      },
      {
        name: 'High Resource Usage',
        condition: (metric) => (metric.name.includes('CPU') || metric.name.includes('Memory')) && metric.status === 'warning',
        severity: 'warning',
        weddingSeasonOnly: false,
        cooldownMinutes: 10,
        escalationMinutes: 30,
      },
      {
        name: 'Wedding Season Performance',
        condition: (metric) => metric.status === 'warning' && metric.impact === 'high',
        severity: 'warning',
        weddingSeasonOnly: true,
        cooldownMinutes: 5,
        escalationMinutes: 15,
      },
    ];
  }

  /**
   * Log current health status
   */
  private logHealthStatus(): void {
    const timestamp = new Date().toISOString();
    const overallHealthy = Array.from(this.healthChecks.values()).every(h => h.status === 'healthy');
    const criticalServices = Array.from(this.healthChecks.values()).filter(h => h.status === 'down');
    const degradedServices = Array.from(this.healthChecks.values()).filter(h => h.status === 'degraded');

    console.log(`\n📊 Health Status Update - ${timestamp}`);
    console.log(`Overall Status: ${overallHealthy ? '✅ HEALTHY' : '⚠️ ISSUES DETECTED'}`);
    
    if (criticalServices.length > 0) {
      console.log(`🚨 Critical Services (${criticalServices.length}):`);
      criticalServices.forEach(s => console.log(`   ❌ ${s.service} (Team ${s.team})`));
    }
    
    if (degradedServices.length > 0) {
      console.log(`⚠️ Degraded Services (${degradedServices.length}):`);
      degradedServices.forEach(s => console.log(`   🟡 ${s.service} (Team ${s.team})`));
    }

    const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.resolved).length;
    if (activeAlerts > 0) {
      console.log(`🔔 Active Alerts: ${activeAlerts}`);
    }

    console.log('');
  }

  // Health check implementation methods (mocked for demonstration)
  private async getBuildMetrics(): Promise<{ bundleSize: number }> {
    return { bundleSize: 400 * 1024 }; // 400KB mock
  }

  private async checkPWAHealth(): Promise<{ active: boolean }> {
    return { active: true };
  }

  private async checkFrontendResponseTime(): Promise<{ responseTime: number }> {
    return { responseTime: 1200 }; // 1.2s mock
  }

  private async checkDatabaseHealth(): Promise<{ responseTime: number }> {
    return { responseTime: 50 }; // 50ms mock
  }

  private async checkAPIHealth(): Promise<{ responseTime: number }> {
    return { responseTime: 300 }; // 300ms mock
  }

  private async checkPaymentSystemHealth(): Promise<{ operational: boolean }> {
    return { operational: true };
  }

  private async checkEmailServiceHealth(): Promise<{ operational: boolean; responseTime: number }> {
    return { operational: true, responseTime: 200 };
  }

  private async checkCRMIntegrationsHealth(): Promise<{ activeIntegrations: number }> {
    return { activeIntegrations: 2 };
  }

  private async checkWebhookHealth(): Promise<{ processedCount: number; errorRate: number }> {
    return { processedCount: 100, errorRate: 0.02 };
  }

  private async checkMobileAppHealth(): Promise<{ connected: boolean; responseTime: number }> {
    return { connected: true, responseTime: 800 };
  }

  private async checkPushNotificationHealth(): Promise<{ deliveryRate: number }> {
    return { deliveryRate: 0.95 };
  }

  private async checkAppStoreHealth(): Promise<{ configured: boolean }> {
    return { configured: false }; // Mock incomplete configuration
  }

  private async getSystemMetrics(): Promise<{ cpuUsage: number; memoryUsage: number }> {
    return { cpuUsage: 65, memoryUsage: 70 };
  }

  private async checkWeddingWorkflows(): Promise<{ operationalWorkflows: number }> {
    return { operationalWorkflows: 5 }; // All 5 workflows operational
  }

  // Alert notification methods (mocked for demonstration)
  private async sendCriticalAlert(alert: Alert): Promise<void> {
    console.log('📞 Sending critical alert notifications (Slack + SMS + Email)');
  }

  private async sendWarningAlert(alert: Alert): Promise<void> {
    console.log('📧 Sending warning alert notifications (Slack + Email)');
  }

  private async sendInfoAlert(alert: Alert): Promise<void> {
    console.log('💬 Sending info alert notification (Slack)');
  }

  // Utility methods
  private isWeddingSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    return this.weddingSeasonMonths.includes(currentMonth);
  }

  /**
   * Get health dashboard data
   */
  getHealthDashboard(): any {
    return {
      timestamp: new Date().toISOString(),
      overallStatus: Array.from(this.healthChecks.values()).every(h => h.status === 'healthy') ? 'healthy' : 'degraded',
      services: Array.from(this.healthChecks.values()),
      activeAlerts: Array.from(this.alerts.values()).filter(a => !a.resolved),
      weddingSeason: this.isWeddingSeason(),
    };
  }
}

// CLI execution
async function main() {
  const monitor = new EnvironmentHealthMonitor();
  
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'start':
      console.log('🎯 Starting environment health monitoring...');
      await monitor.startMonitoring();
      
      // Keep process running
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down monitoring...');
        monitor.stopMonitoring();
        process.exit(0);
      });
      break;

    case 'check':
      console.log('🔍 Running one-time health check...');
      const results = await monitor.performComprehensiveHealthCheck();
      console.log('\n📊 Health Check Complete');
      console.log(`Services Checked: ${results.size}`);
      process.exit(0);
      break;

    case 'dashboard':
      const dashboard = monitor.getHealthDashboard();
      console.log(JSON.stringify(dashboard, null, 2));
      process.exit(0);
      break;

    default:
      console.log('Usage: health-monitor.ts <start|check|dashboard>');
      console.log('Examples:');
      console.log('  tsx health-monitor.ts start     # Start continuous monitoring');
      console.log('  tsx health-monitor.ts check     # Run one-time health check');
      console.log('  tsx health-monitor.ts dashboard # Get dashboard data');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Environment health monitoring failed:', error);
    process.exit(1);
  });
}

export default EnvironmentHealthMonitor;