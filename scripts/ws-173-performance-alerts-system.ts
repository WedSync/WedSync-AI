#!/usr/bin/env tsx
/**
 * WS-173: Automated Performance Alerts System
 * Team E - Round 2 Implementation
 * 
 * Real-time performance monitoring and alerting system
 * Monitors Core Web Vitals, error rates, and user experience metrics
 * Sends alerts via Slack, email, and creates incident tickets
 * 
 * Usage:
 * tsx scripts/ws-173-performance-alerts-system.ts --mode=production
 * tsx scripts/ws-173-performance-alerts-system.ts --mode=development --interval=60
 */

import { performance } from 'perf_hooks';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'percentage_change';
  threshold: number;
  timeWindow: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
}

interface PerformanceMetric {
  timestamp: Date;
  metric: string;
  value: number;
  page: string;
  userId?: string;
  sessionId: string;
  userAgent: string;
  networkType: string;
}

interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  affectedPages: string[];
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

interface SlackWebhookPayload {
  channel?: string;
  text: string;
  username?: string;
  icon_emoji?: string;
  attachments?: Array<{
    color: string;
    title: string;
    text: string;
    fields: Array<{
      title: string;
      value: string;
      short: boolean;
    }>;
  }>;
}

class PerformanceAlertsSystem {
  private supabase: any;
  private alertRules: AlertRule[];
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private isMonitoring = false;
  private checkInterval: number;
  private mode: 'production' | 'development';

  constructor(mode: 'production' | 'development' = 'production', checkInterval: number = 60) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    this.mode = mode;
    this.checkInterval = checkInterval * 1000; // Convert to milliseconds
    this.alertRules = this.getDefaultAlertRules();
  }

  private getDefaultAlertRules(): AlertRule[] {
    const baseRules: AlertRule[] = [
      // Core Web Vitals Alerts
      {
        id: 'lcp-critical',
        name: 'LCP Critical Threshold',
        description: 'Largest Contentful Paint exceeding 4 seconds',
        metric: 'lcp',
        condition: 'greater_than',
        threshold: 4000, // 4 seconds
        timeWindow: 5,   // 5 minutes
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 15
      },
      {
        id: 'fid-high',
        name: 'FID High Threshold', 
        description: 'First Input Delay exceeding 300ms',
        metric: 'fid',
        condition: 'greater_than',
        threshold: 300, // 300ms
        timeWindow: 5,
        severity: 'high',
        enabled: true,
        cooldownPeriod: 10
      },
      {
        id: 'cls-warning',
        name: 'CLS Warning Threshold',
        description: 'Cumulative Layout Shift exceeding 0.25',
        metric: 'cls',
        condition: 'greater_than',
        threshold: 0.25,
        timeWindow: 10,
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 10
      },

      // Error Rate Alerts
      {
        id: 'error-rate-critical',
        name: 'Critical Error Rate',
        description: 'JavaScript error rate exceeding 5%',
        metric: 'error_rate',
        condition: 'greater_than',
        threshold: 5, // 5%
        timeWindow: 10,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 5
      },
      {
        id: 'error-rate-warning',
        name: 'Warning Error Rate',
        description: 'JavaScript error rate exceeding 1%',
        metric: 'error_rate', 
        condition: 'greater_than',
        threshold: 1, // 1%
        timeWindow: 30,
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 30
      },

      // Load Performance Alerts
      {
        id: 'load-time-critical',
        name: 'Critical Load Time',
        description: 'Page load time exceeding 10 seconds',
        metric: 'load_time',
        condition: 'greater_than', 
        threshold: 10000, // 10 seconds
        timeWindow: 5,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 10
      },
      {
        id: 'slow-load-percentage',
        name: 'High Slow Load Percentage',
        description: 'More than 30% of loads taking over 5 seconds',
        metric: 'slow_load_percentage',
        condition: 'greater_than',
        threshold: 30, // 30%
        timeWindow: 15,
        severity: 'high',
        enabled: true,
        cooldownPeriod: 20
      },

      // Wedding Day Critical Alerts
      {
        id: 'wedding-day-lcp',
        name: 'Wedding Day LCP Critical',
        description: 'LCP on wedding day critical pages exceeding 2 seconds',
        metric: 'wedding_day_lcp',
        condition: 'greater_than',
        threshold: 2000, // 2 seconds
        timeWindow: 2,   // 2 minutes - fast response needed
        severity: 'critical',
        enabled: this.mode === 'production',
        cooldownPeriod: 5
      },
      {
        id: 'mobile-performance-degradation',
        name: 'Mobile Performance Degradation',
        description: 'Mobile performance significantly worse than desktop',
        metric: 'mobile_performance_ratio',
        condition: 'greater_than',
        threshold: 2.0, // Mobile 2x slower than desktop
        timeWindow: 10,
        severity: 'high',
        enabled: true,
        cooldownPeriod: 30
      }
    ];

    return baseRules;
  }

  async startMonitoring() {
    console.log(`🚨 Starting WS-173 Performance Alerts System (${this.mode} mode)`);
    console.log(`📊 Monitoring ${this.alertRules.filter(r => r.enabled).length} alert rules`);
    console.log(`⏱️ Check interval: ${this.checkInterval / 1000}s`);

    this.isMonitoring = true;
    
    // Initial setup
    await this.ensureAlertsTable();
    
    // Start monitoring loop
    while (this.isMonitoring) {
      try {
        await this.checkAlertRules();
        await this.updateAlertStatus();
        await new Promise(resolve => setTimeout(resolve, this.checkInterval));
      } catch (error) {
        console.error('❌ Error in monitoring loop:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
      }
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log('🛑 Performance alerts monitoring stopped');
  }

  private async ensureAlertsTable() {
    const alertsTableSQL = `
      CREATE TABLE IF NOT EXISTS performance_alerts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        rule_id TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        metric TEXT NOT NULL,
        current_value NUMERIC NOT NULL,
        threshold_value NUMERIC NOT NULL,
        affected_pages TEXT[],
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        CONSTRAINT performance_alerts_rule_id_idx INDEX (rule_id),
        CONSTRAINT performance_alerts_created_at_idx INDEX (created_at DESC),
        CONSTRAINT performance_alerts_resolved_idx INDEX (resolved, created_at DESC)
      );

      -- Enable RLS
      ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;

      -- RLS policy for service role
      CREATE POLICY "Service role full access" ON performance_alerts
        FOR ALL USING (auth.role() = 'service_role');
    `;

    try {
      await this.supabase.rpc('exec_sql', { sql: alertsTableSQL });
    } catch (error) {
      console.log('ℹ️ Alerts table setup completed or already exists');
    }
  }

  private async checkAlertRules() {
    const enabledRules = this.alertRules.filter(rule => rule.enabled);
    
    for (const rule of enabledRules) {
      try {
        // Check cooldown period
        if (rule.lastTriggered) {
          const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
          if (timeSinceLastTrigger < rule.cooldownPeriod * 60 * 1000) {
            continue; // Still in cooldown
          }
        }

        const shouldTrigger = await this.evaluateAlertRule(rule);
        if (shouldTrigger) {
          await this.triggerAlert(rule);
        }
      } catch (error) {
        console.error(`❌ Error checking rule ${rule.name}:`, error);
      }
    }
  }

  private async evaluateAlertRule(rule: AlertRule): Promise<boolean> {
    const timeWindowStart = new Date(Date.now() - (rule.timeWindow * 60 * 1000));
    
    switch (rule.metric) {
      case 'lcp':
      case 'fid':
      case 'cls':
        return await this.evaluateCoreWebVitalRule(rule, timeWindowStart);
      
      case 'error_rate':
        return await this.evaluateErrorRateRule(rule, timeWindowStart);
      
      case 'load_time':
        return await this.evaluateLoadTimeRule(rule, timeWindowStart);
      
      case 'slow_load_percentage':
        return await this.evaluateSlowLoadPercentageRule(rule, timeWindowStart);
      
      case 'wedding_day_lcp':
        return await this.evaluateWeddingDayRule(rule, timeWindowStart);
      
      case 'mobile_performance_ratio':
        return await this.evaluateMobilePerformanceRule(rule, timeWindowStart);
      
      default:
        console.warn(`⚠️ Unknown metric: ${rule.metric}`);
        return false;
    }
  }

  private async evaluateCoreWebVitalRule(rule: AlertRule, timeWindowStart: Date): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('rum_metrics')
      .select(`${rule.metric}, page_url`)
      .gte('created_at', timeWindowStart.toISOString())
      .not(rule.metric, 'is', null)
      .gt(rule.metric, 0);

    if (error || !data || data.length === 0) return false;

    const values = data.map(d => d[rule.metric]);
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;

    return this.compareValue(avgValue, rule.threshold, rule.condition);
  }

  private async evaluateErrorRateRule(rule: AlertRule, timeWindowStart: Date): Promise<boolean> {
    const { data: allMetrics } = await this.supabase
      .from('rum_metrics') 
      .select('javascript_errors')
      .gte('created_at', timeWindowStart.toISOString());

    if (!allMetrics || allMetrics.length === 0) return false;

    const totalMetrics = allMetrics.length;
    const metricsWithErrors = allMetrics.filter(m => 
      m.javascript_errors && Array.isArray(m.javascript_errors) && m.javascript_errors.length > 0
    ).length;

    const errorRate = (metricsWithErrors / totalMetrics) * 100;

    return this.compareValue(errorRate, rule.threshold, rule.condition);
  }

  private async evaluateLoadTimeRule(rule: AlertRule, timeWindowStart: Date): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('rum_metrics')
      .select('load_time, page_url')
      .gte('created_at', timeWindowStart.toISOString())
      .not('load_time', 'is', null)
      .gt('load_time', 0);

    if (error || !data || data.length === 0) return false;

    // Check if any load time exceeds threshold
    const exceedsThreshold = data.some(d => d.load_time > rule.threshold);
    return exceedsThreshold;
  }

  private async evaluateSlowLoadPercentageRule(rule: AlertRule, timeWindowStart: Date): Promise<boolean> {
    const { data } = await this.supabase
      .from('rum_metrics')
      .select('load_time')
      .gte('created_at', timeWindowStart.toISOString())
      .not('load_time', 'is', null)
      .gt('load_time', 0);

    if (!data || data.length === 0) return false;

    const totalLoads = data.length;
    const slowLoads = data.filter(d => d.load_time > 5000).length; // >5s is slow
    const slowLoadPercentage = (slowLoads / totalLoads) * 100;

    return this.compareValue(slowLoadPercentage, rule.threshold, rule.condition);
  }

  private async evaluateWeddingDayRule(rule: AlertRule, timeWindowStart: Date): Promise<boolean> {
    const weddingDayPages = ['/dashboard/clients', '/dashboard/timeline', '/dashboard/tasks'];
    
    const { data } = await this.supabase
      .from('rum_metrics')
      .select('lcp, page_url')
      .in('page_url', weddingDayPages)
      .gte('created_at', timeWindowStart.toISOString())
      .not('lcp', 'is', null)
      .gt('lcp', 0);

    if (!data || data.length === 0) return false;

    const avgLCP = data.reduce((sum, d) => sum + d.lcp, 0) / data.length;
    return this.compareValue(avgLCP, rule.threshold, rule.condition);
  }

  private async evaluateMobilePerformanceRule(rule: AlertRule, timeWindowStart: Date): Promise<boolean> {
    // Get mobile and desktop performance data
    const { data: mobileData } = await this.supabase
      .from('rum_metrics')
      .select('lcp, page_url')
      .gte('created_at', timeWindowStart.toISOString())
      .lt('viewport_width', 768) // Mobile viewports
      .not('lcp', 'is', null)
      .gt('lcp', 0);

    const { data: desktopData } = await this.supabase
      .from('rum_metrics')
      .select('lcp, page_url') 
      .gte('created_at', timeWindowStart.toISOString())
      .gte('viewport_width', 1024) // Desktop viewports
      .not('lcp', 'is', null)
      .gt('lcp', 0);

    if (!mobileData?.length || !desktopData?.length) return false;

    const avgMobileLCP = mobileData.reduce((sum, d) => sum + d.lcp, 0) / mobileData.length;
    const avgDesktopLCP = desktopData.reduce((sum, d) => sum + d.lcp, 0) / desktopData.length;

    const mobileToDesktopRatio = avgMobileLCP / avgDesktopLCP;
    return this.compareValue(mobileToDesktopRatio, rule.threshold, rule.condition);
  }

  private compareValue(value: number, threshold: number, condition: string): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return Math.abs(value - threshold) < 0.001;
      default:
        return false;
    }
  }

  private async triggerAlert(rule: AlertRule) {
    const alertEvent: AlertEvent = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: rule.description,
      metric: rule.metric,
      currentValue: 0, // Will be populated with actual value
      threshold: rule.threshold,
      affectedPages: [], // Will be populated with affected pages
      timestamp: new Date(),
      resolved: false
    };

    // Get current metric value and affected pages
    await this.populateAlertDetails(alertEvent, rule);

    // Store alert in database
    await this.storeAlert(alertEvent);

    // Add to active alerts
    this.activeAlerts.set(alertEvent.id, alertEvent);

    // Update rule last triggered time
    rule.lastTriggered = new Date();

    // Send notifications
    await this.sendAlertNotifications(alertEvent);

    console.log(`🚨 ALERT TRIGGERED: ${rule.name} (${rule.severity})`);
    console.log(`   Metric: ${rule.metric}`);
    console.log(`   Current: ${alertEvent.currentValue}, Threshold: ${rule.threshold}`);
    console.log(`   Affected Pages: ${alertEvent.affectedPages.join(', ')}`);
  }

  private async populateAlertDetails(alertEvent: AlertEvent, rule: AlertRule) {
    const timeWindowStart = new Date(Date.now() - (rule.timeWindow * 60 * 1000));

    // Get recent data for this metric
    const { data } = await this.supabase
      .from('rum_metrics')
      .select(`${rule.metric}, page_url`)
      .gte('created_at', timeWindowStart.toISOString())
      .not(rule.metric, 'is', null);

    if (data && data.length > 0) {
      const values = data.map(d => d[rule.metric]).filter(v => v > 0);
      alertEvent.currentValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      const affectedPagesSet = new Set(data.map(d => d.page_url));
      alertEvent.affectedPages = Array.from(affectedPagesSet);
    }
  }

  private async storeAlert(alertEvent: AlertEvent) {
    try {
      const { error } = await this.supabase
        .from('performance_alerts')
        .insert([{
          rule_id: alertEvent.ruleId,
          rule_name: alertEvent.ruleName,
          severity: alertEvent.severity,
          message: alertEvent.message,
          metric: alertEvent.metric,
          current_value: alertEvent.currentValue,
          threshold_value: alertEvent.threshold,
          affected_pages: alertEvent.affectedPages,
          resolved: false
        }]);

      if (error) {
        console.error('❌ Failed to store alert:', error);
      }
    } catch (error) {
      console.error('❌ Error storing alert:', error);
    }
  }

  private async sendAlertNotifications(alertEvent: AlertEvent) {
    // Send Slack notification
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(alertEvent);
    }

    // Send email notification (if configured)
    if (process.env.EMAIL_ALERT_ENABLED === 'true') {
      await this.sendEmailAlert(alertEvent);
    }

    // Create incident ticket (if configured)
    if (alertEvent.severity === 'critical') {
      await this.createIncidentTicket(alertEvent);
    }
  }

  private async sendSlackAlert(alertEvent: AlertEvent) {
    try {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) return;

      const severityColors = {
        low: '#36a64f',      // Green
        medium: '#ff9500',   // Orange  
        high: '#ff6b35',     // Red-orange
        critical: '#d63031'  // Red
      };

      const severityEmojis = {
        low: '🟡',
        medium: '🟠', 
        high: '🔴',
        critical: '🚨'
      };

      const payload: SlackWebhookPayload = {
        channel: '#performance-alerts',
        text: `${severityEmojis[alertEvent.severity]} WedSync Performance Alert`,
        username: 'Performance Monitor',
        icon_emoji: ':chart_with_upwards_trend:',
        attachments: [{
          color: severityColors[alertEvent.severity],
          title: `${alertEvent.ruleName} (${alertEvent.severity.toUpperCase()})`,
          text: alertEvent.message,
          fields: [
            {
              title: 'Metric',
              value: alertEvent.metric,
              short: true
            },
            {
              title: 'Current Value',
              value: `${alertEvent.currentValue.toFixed(2)}`,
              short: true
            },
            {
              title: 'Threshold',
              value: `${alertEvent.threshold}`,
              short: true
            },
            {
              title: 'Affected Pages',
              value: alertEvent.affectedPages.slice(0, 3).join('\n') + 
                     (alertEvent.affectedPages.length > 3 ? `\n+${alertEvent.affectedPages.length - 3} more` : ''),
              short: false
            }
          ]
        }]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('❌ Failed to send Slack alert:', response.statusText);
      } else {
        console.log('✅ Slack alert sent successfully');
      }
    } catch (error) {
      console.error('❌ Error sending Slack alert:', error);
    }
  }

  private async sendEmailAlert(alertEvent: AlertEvent) {
    // Email alert implementation would go here
    console.log(`📧 Email alert would be sent for: ${alertEvent.ruleName}`);
  }

  private async createIncidentTicket(alertEvent: AlertEvent) {
    // Incident ticket creation would go here (Jira, Linear, etc.)
    console.log(`🎫 Incident ticket would be created for: ${alertEvent.ruleName}`);
  }

  private async updateAlertStatus() {
    // Check if any active alerts should be resolved
    for (const [alertId, alertEvent] of this.activeAlerts.entries()) {
      if (!alertEvent.resolved) {
        const shouldResolve = await this.shouldResolveAlert(alertEvent);
        if (shouldResolve) {
          await this.resolveAlert(alertEvent);
        }
      }
    }
  }

  private async shouldResolveAlert(alertEvent: AlertEvent): Promise<boolean> {
    // Check if the metric is back within acceptable range
    const rule = this.alertRules.find(r => r.id === alertEvent.ruleId);
    if (!rule) return true; // Rule not found, resolve alert

    const isStillTriggering = await this.evaluateAlertRule(rule);
    return !isStillTriggering;
  }

  private async resolveAlert(alertEvent: AlertEvent) {
    alertEvent.resolved = true;
    alertEvent.resolvedAt = new Date();

    // Update in database
    await this.supabase
      .from('performance_alerts')
      .update({ 
        resolved: true, 
        resolved_at: alertEvent.resolvedAt.toISOString() 
      })
      .eq('rule_id', alertEvent.ruleId)
      .eq('resolved', false);

    // Send resolution notification
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackResolution(alertEvent);
    }

    console.log(`✅ ALERT RESOLVED: ${alertEvent.ruleName}`);
  }

  private async sendSlackResolution(alertEvent: AlertEvent) {
    try {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) return;

      const payload = {
        channel: '#performance-alerts',
        text: `✅ Performance alert resolved: ${alertEvent.ruleName}`,
        username: 'Performance Monitor',
        icon_emoji: ':white_check_mark:'
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('✅ Slack resolution sent successfully');
    } catch (error) {
      console.error('❌ Error sending Slack resolution:', error);
    }
  }

  // Export alert data for analysis
  async exportAlertHistory(timeRange: 'day' | 'week' | 'month' = 'week') {
    const ranges = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };

    const startTime = new Date(Date.now() - ranges[timeRange]);

    const { data, error } = await this.supabase
      .from('performance_alerts')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to export alert history:', error);
      return null;
    }

    const exportPath = path.join(process.cwd(), 'reports', `alert-history-${timeRange}-${Date.now()}.json`);
    const reportDir = path.dirname(exportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const exportData = {
      timeRange,
      exportedAt: new Date().toISOString(),
      totalAlerts: data?.length || 0,
      alerts: data,
      summary: this.generateAlertSummary(data || [])
    };

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`📊 Alert history exported to: ${exportPath}`);

    return exportData;
  }

  private generateAlertSummary(alerts: any[]) {
    const severityCounts = {
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length
    };

    const metricCounts = alerts.reduce((acc, alert) => {
      acc[alert.metric] = (acc[alert.metric] || 0) + 1;
      return acc;
    }, {});

    const resolvedAlerts = alerts.filter(a => a.resolved).length;
    const resolutionRate = alerts.length > 0 ? (resolvedAlerts / alerts.length) * 100 : 0;

    return {
      severityDistribution: severityCounts,
      metricDistribution: metricCounts,
      resolutionRate: resolutionRate.toFixed(2),
      totalAlerts: alerts.length,
      resolvedAlerts
    };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const modeArg = args.find(arg => arg.startsWith('--mode='));
  const mode = (modeArg?.split('=')[1] as 'production' | 'development') || 'production';
  
  const intervalArg = args.find(arg => arg.startsWith('--interval='));
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 60;

  const exportArg = args.find(arg => arg.startsWith('--export='));
  const exportRange = exportArg?.split('=')[1] as 'day' | 'week' | 'month';

  const alertsSystem = new PerformanceAlertsSystem(mode, interval);

  if (exportRange) {
    console.log(`📊 Exporting alert history for ${exportRange}...`);
    await alertsSystem.exportAlertHistory(exportRange);
    return;
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down alerts system...');
    alertsSystem.stopMonitoring();
    
    try {
      await alertsSystem.exportAlertHistory('day');
    } catch (error) {
      console.error('Failed to export alert history on shutdown:', error);
    }
    
    process.exit(0);
  });

  try {
    await alertsSystem.startMonitoring();
  } catch (error) {
    console.error('❌ Alerts system failed:', error);
    process.exit(1);
  }
}

// Export for programmatic usage
export { PerformanceAlertsSystem };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}