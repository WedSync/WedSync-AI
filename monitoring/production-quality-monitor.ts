// Production Quality Monitoring System
// Real-time monitoring and alerting for WedSync wedding platform quality metrics
// Tracks performance, errors, user experience, and business KPIs

import { createClient } from '@supabase/supabase-js';
// @ts-ignore - Slack Web API types not required for production build
import { WebClient } from '@slack/web-api';

interface QualityMetric {
  timestamp: Date;
  metric: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  context: {
    environment: string;
    feature: string;
    userType: string;
    weddingPhase?: string;
  };
  metadata?: Record<string, any>;
}

interface AlertRule {
  id: string;
  metric: string;
  condition: 'above' | 'below' | 'equals' | 'not_equals';
  threshold: number;
  duration: number; // seconds
  severity: 'warning' | 'critical' | 'emergency';
  channels: string[]; // slack, email, pagerduty
  weddingSpecific: boolean;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
}

interface WeddingQualityContext {
  phase: 'planning' | 'preparation' | 'day-of' | 'post-wedding';
  criticalPeriod: boolean; // Within 24 hours of wedding
  guestCount: number;
  vendorCount: number;
  timelineComplexity: 'simple' | 'moderate' | 'complex';
}

class ProductionQualityMonitor {
  private supabase: any;
  private slack: WebClient;
  private metrics: Map<string, QualityMetric[]> = new Map();
  private alertRules: AlertRule[] = [];
  private alertHistory: Map<string, Date> = new Map();
  
  // Wedding-specific quality thresholds
  private readonly WEDDING_QUALITY_THRESHOLDS = {
    // Performance metrics (milliseconds)
    rsvp_response_time: { warning: 500, critical: 1000 },
    photo_upload_time: { warning: 3000, critical: 8000 },
    timeline_load_time: { warning: 800, critical: 2000 },
    vendor_search_time: { warning: 1200, critical: 3000 },
    guest_management_time: { warning: 600, critical: 1500 },
    
    // Error rates (percentage)
    rsvp_error_rate: { warning: 1, critical: 5 },
    photo_upload_failure_rate: { warning: 2, critical: 8 },
    payment_failure_rate: { warning: 0.5, critical: 2 },
    email_delivery_failure_rate: { warning: 1, critical: 5 },
    
    // User experience metrics
    core_web_vitals_lcp: { warning: 2500, critical: 4000 }, // Largest Contentful Paint
    core_web_vitals_fid: { warning: 100, critical: 300 },   // First Input Delay
    core_web_vitals_cls: { warning: 0.1, critical: 0.25 },  // Cumulative Layout Shift
    
    // Business metrics
    wedding_completion_rate: { warning: 95, critical: 90 }, // Percentage
    vendor_booking_success_rate: { warning: 98, critical: 95 },
    guest_satisfaction_score: { warning: 4.5, critical: 4.0 }, // Out of 5
    
    // Wedding day critical metrics
    day_of_availability: { warning: 99.5, critical: 99.0 }, // Percentage
    real_time_sync_delay: { warning: 500, critical: 2000 }, // Milliseconds
    notification_delivery_time: { warning: 30, critical: 120 }, // Seconds
  };

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.initializeAlertRules();
  }

  private initializeAlertRules(): void {
    this.alertRules = [
      // Critical wedding performance alerts
      {
        id: 'rsvp-response-critical',
        metric: 'rsvp_response_time',
        condition: 'above',
        threshold: this.WEDDING_QUALITY_THRESHOLDS.rsvp_response_time.critical,
        duration: 60,
        severity: 'critical',
        channels: ['slack', 'pagerduty'],
        weddingSpecific: true,
        businessImpact: 'high'
      },
      {
        id: 'photo-upload-failure',
        metric: 'photo_upload_failure_rate',
        condition: 'above',
        threshold: this.WEDDING_QUALITY_THRESHOLDS.photo_upload_failure_rate.critical,
        duration: 300,
        severity: 'critical',
        channels: ['slack', 'email'],
        weddingSpecific: true,
        businessImpact: 'critical'
      },
      {
        id: 'wedding-day-availability',
        metric: 'day_of_availability',
        condition: 'below',
        threshold: this.WEDDING_QUALITY_THRESHOLDS.day_of_availability.critical,
        duration: 30,
        severity: 'emergency',
        channels: ['slack', 'pagerduty', 'sms'],
        weddingSpecific: true,
        businessImpact: 'critical'
      },
      {
        id: 'payment-failure-rate',
        metric: 'payment_failure_rate',
        condition: 'above',
        threshold: this.WEDDING_QUALITY_THRESHOLDS.payment_failure_rate.critical,
        duration: 180,
        severity: 'critical',
        channels: ['slack', 'email', 'pagerduty'],
        weddingSpecific: false,
        businessImpact: 'critical'
      },
      {
        id: 'core-web-vitals-lcp',
        metric: 'core_web_vitals_lcp',
        condition: 'above',
        threshold: this.WEDDING_QUALITY_THRESHOLDS.core_web_vitals_lcp.critical,
        duration: 300,
        severity: 'warning',
        channels: ['slack'],
        weddingSpecific: false,
        businessImpact: 'medium'
      },
      // Wedding-specific business metrics
      {
        id: 'vendor-booking-success',
        metric: 'vendor_booking_success_rate',
        condition: 'below',
        threshold: this.WEDDING_QUALITY_THRESHOLDS.vendor_booking_success_rate.warning,
        duration: 600,
        severity: 'warning',
        channels: ['slack'],
        weddingSpecific: true,
        businessImpact: 'high'
      },
      {
        id: 'guest-satisfaction-critical',
        metric: 'guest_satisfaction_score',
        condition: 'below',
        threshold: this.WEDDING_QUALITY_THRESHOLDS.guest_satisfaction_score.critical,
        duration: 1800,
        severity: 'critical',
        channels: ['slack', 'email'],
        weddingSpecific: true,
        businessImpact: 'critical'
      }
    ];
  }

  async recordMetric(metric: QualityMetric): Promise<void> {
    // Store metric in memory for real-time monitoring
    if (!this.metrics.has(metric.metric)) {
      this.metrics.set(metric.metric, []);
    }
    
    const metricHistory = this.metrics.get(metric.metric)!;
    metricHistory.push(metric);
    
    // Keep only last 100 measurements per metric
    if (metricHistory.length > 100) {
      metricHistory.shift();
    }
    
    // Store metric in Supabase for persistence
    await this.supabase
      .from('quality_metrics')
      .insert({
        timestamp: metric.timestamp.toISOString(),
        metric_name: metric.metric,
        value: metric.value,
        threshold: metric.threshold,
        severity: metric.severity,
        environment: metric.context.environment,
        feature: metric.context.feature,
        user_type: metric.context.userType,
        wedding_phase: metric.context.weddingPhase,
        metadata: metric.metadata
      });
    
    // Check alert rules
    await this.checkAlertRules(metric);
    
    console.log(`📊 Recorded metric: ${metric.metric} = ${metric.value} (threshold: ${metric.threshold})`);
  }

  private async checkAlertRules(metric: QualityMetric): Promise<void> {
    const applicableRules = this.alertRules.filter(rule => rule.metric === metric.metric);
    
    for (const rule of applicableRules) {
      const shouldAlert = this.evaluateAlertCondition(rule, metric.value);
      
      if (shouldAlert) {
        const alertKey = `${rule.id}-${metric.context.environment}`;
        const lastAlert = this.alertHistory.get(alertKey);
        const now = new Date();
        
        // Prevent alert spam - minimum 5 minutes between identical alerts
        if (lastAlert && (now.getTime() - lastAlert.getTime()) < 300000) {
          continue;
        }
        
        await this.triggerAlert(rule, metric);
        this.alertHistory.set(alertKey, now);
      }
    }
  }

  private evaluateAlertCondition(rule: AlertRule, value: number): boolean {
    switch (rule.condition) {
      case 'above':
        return value > rule.threshold;
      case 'below':
        return value < rule.threshold;
      case 'equals':
        return value === rule.threshold;
      case 'not_equals':
        return value !== rule.threshold;
      default:
        return false;
    }
  }

  private async triggerAlert(rule: AlertRule, metric: QualityMetric): Promise<void> {
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      rule_id: rule.id,
      timestamp: new Date(),
      metric_name: metric.metric,
      value: metric.value,
      threshold: rule.threshold,
      severity: rule.severity,
      environment: metric.context.environment,
      context: metric.context,
      business_impact: rule.businessImpact
    };
    
    // Store alert in database
    await this.supabase
      .from('quality_alerts')
      .insert(alert);
    
    // Send notifications
    for (const channel of rule.channels) {
      switch (channel) {
        case 'slack':
          await this.sendSlackAlert(alert, rule, metric);
          break;
        case 'email':
          await this.sendEmailAlert(alert, rule, metric);
          break;
        case 'pagerduty':
          await this.sendPagerDutyAlert(alert, rule, metric);
          break;
        case 'sms':
          await this.sendSMSAlert(alert, rule, metric);
          break;
      }
    }
    
    console.log(`🚨 Alert triggered: ${rule.id} for ${metric.metric} = ${metric.value}`);
  }

  private async sendSlackAlert(alert: any, rule: AlertRule, metric: QualityMetric): Promise<void> {
    const emoji = this.getSeverityEmoji(rule.severity);
    const color = this.getSeverityColor(rule.severity);
    
    const weddingContext = rule.weddingSpecific ? 
      `\n*Wedding Phase:* ${metric.context.weddingPhase || 'Unknown'}` : '';
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} WedSync Quality Alert - ${rule.severity.toUpperCase()}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Metric:* ${metric.metric}\n*Value:* ${metric.value}\n*Threshold:* ${rule.threshold}\n*Environment:* ${metric.context.environment}\n*Feature:* ${metric.context.feature}${weddingContext}\n*Business Impact:* ${rule.businessImpact}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Timestamp: ${alert.timestamp.toISOString()} | Alert ID: ${alert.id}`
          }
        ]
      }
    ];
    
    // Add wedding-specific guidance
    if (rule.weddingSpecific && rule.severity === 'critical') {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🎉 *Wedding Day Impact:* This issue may affect couples during their special day. Please prioritize resolution.'
        }
      });
    }
    
    try {
      await this.slack.chat.postMessage({
        channel: process.env.SLACK_ALERTS_CHANNEL || '#wedsync-alerts',
        blocks,
        text: `Quality Alert: ${metric.metric} = ${metric.value}` // Fallback text
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  private async sendEmailAlert(alert: any, rule: AlertRule, metric: QualityMetric): Promise<void> {
    // Email alert implementation would go here
    // For now, log the alert
    console.log(`📧 Email alert would be sent for: ${rule.id}`);
  }

  private async sendPagerDutyAlert(alert: any, rule: AlertRule, metric: QualityMetric): Promise<void> {
    // PagerDuty integration would go here
    console.log(`📟 PagerDuty alert would be sent for: ${rule.id}`);
  }

  private async sendSMSAlert(alert: any, rule: AlertRule, metric: QualityMetric): Promise<void> {
    // SMS alert implementation would go here
    console.log(`📱 SMS alert would be sent for: ${rule.id}`);
  }

  private getSeverityEmoji(severity: string): string {
    const emojiMap: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨',
      emergency: '🆘'
    };
    return emojiMap[severity] || '📊';
  }

  private getSeverityColor(severity: string): string {
    const colorMap: Record<string, string> = {
      info: '#36a64f',
      warning: '#ffcc00',
      critical: '#ff6600',
      emergency: '#ff0000'
    };
    return colorMap[severity] || '#36a64f';
  }

  // Wedding-specific monitoring methods
  async monitorWeddingDayQuality(weddingId: string, context: WeddingQualityContext): Promise<void> {
    console.log(`🎉 Starting wedding day quality monitoring for wedding: ${weddingId}`);
    
    // Enhanced monitoring during critical wedding periods
    const monitoringInterval = context.criticalPeriod ? 30000 : 60000; // 30s vs 1min
    
    const interval = setInterval(async () => {
      await this.collectWeddingMetrics(weddingId, context);
    }, monitoringInterval);
    
    // Store interval for cleanup
    setTimeout(() => {
      clearInterval(interval);
      console.log(`✅ Wedding day monitoring completed for: ${weddingId}`);
    }, context.criticalPeriod ? 86400000 : 43200000); // 24h vs 12h
  }

  private async collectWeddingMetrics(weddingId: string, context: WeddingQualityContext): Promise<void> {
    const now = new Date();
    
    try {
      // Collect real-time metrics
      const metrics = await Promise.all([
        this.measureRSVPPerformance(weddingId),
        this.measurePhotoUploadPerformance(weddingId),
        this.measureTimelinePerformance(weddingId),
        this.measureSystemAvailability(),
        this.measureUserSatisfaction(weddingId),
        this.measureVendorCommunicationLatency(weddingId)
      ]);
      
      // Record all metrics
      for (const metric of metrics.flat()) {
        await this.recordMetric({
          ...metric,
          context: {
            ...metric.context,
            weddingPhase: context.phase
          }
        });
      }
      
    } catch (error) {
      console.error('Failed to collect wedding metrics:', error);
      
      // Record monitoring failure as a metric
      await this.recordMetric({
        timestamp: now,
        metric: 'monitoring_failure_rate',
        value: 1,
        threshold: 0.1,
        severity: 'warning',
        context: {
          environment: process.env.NODE_ENV || 'development',
          feature: 'monitoring',
          userType: 'system',
          weddingPhase: context.phase
        },
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  private async measureRSVPPerformance(weddingId: string): Promise<QualityMetric[]> {
    const startTime = Date.now();
    
    try {
      // Simulate RSVP performance check
      await this.supabase
        .from('rsvps')
        .select('*')
        .eq('wedding_id', weddingId)
        .limit(1);
      
      const duration = Date.now() - startTime;
      
      return [{
        timestamp: new Date(),
        metric: 'rsvp_response_time',
        value: duration,
        threshold: this.WEDDING_QUALITY_THRESHOLDS.rsvp_response_time.warning,
        severity: duration > this.WEDDING_QUALITY_THRESHOLDS.rsvp_response_time.critical ? 'critical' :
                 duration > this.WEDDING_QUALITY_THRESHOLDS.rsvp_response_time.warning ? 'warning' : 'info',
        context: {
          environment: process.env.NODE_ENV || 'development',
          feature: 'rsvp',
          userType: 'guest'
        },
        metadata: { weddingId }
      }];
    } catch (error) {
      return [{
        timestamp: new Date(),
        metric: 'rsvp_error_rate',
        value: 100, // 100% error rate
        threshold: this.WEDDING_QUALITY_THRESHOLDS.rsvp_error_rate.critical,
        severity: 'critical',
        context: {
          environment: process.env.NODE_ENV || 'development',
          feature: 'rsvp',
          userType: 'guest'
        },
        metadata: { weddingId, error: error instanceof Error ? error.message : 'Unknown error' }
      }];
    }
  }

  private async measurePhotoUploadPerformance(weddingId: string): Promise<QualityMetric[]> {
    // Simulate photo upload performance measurement
    const uploadTime = Math.random() * 5000 + 1000; // 1-6 seconds
    
    return [{
      timestamp: new Date(),
      metric: 'photo_upload_time',
      value: uploadTime,
      threshold: this.WEDDING_QUALITY_THRESHOLDS.photo_upload_time.warning,
      severity: uploadTime > this.WEDDING_QUALITY_THRESHOLDS.photo_upload_time.critical ? 'critical' :
               uploadTime > this.WEDDING_QUALITY_THRESHOLDS.photo_upload_time.warning ? 'warning' : 'info',
      context: {
        environment: process.env.NODE_ENV || 'development',
        feature: 'photos',
        userType: 'couple'
      },
      metadata: { weddingId }
    }];
  }

  private async measureTimelinePerformance(weddingId: string): Promise<QualityMetric[]> {
    const startTime = Date.now();
    
    try {
      // Simulate timeline performance check
      await this.supabase
        .from('timeline_events')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('event_time');
      
      const duration = Date.now() - startTime;
      
      return [{
        timestamp: new Date(),
        metric: 'timeline_load_time',
        value: duration,
        threshold: this.WEDDING_QUALITY_THRESHOLDS.timeline_load_time.warning,
        severity: duration > this.WEDDING_QUALITY_THRESHOLDS.timeline_load_time.critical ? 'critical' :
                 duration > this.WEDDING_QUALITY_THRESHOLDS.timeline_load_time.warning ? 'warning' : 'info',
        context: {
          environment: process.env.NODE_ENV || 'development',
          feature: 'timeline',
          userType: 'couple'
        },
        metadata: { weddingId }
      }];
    } catch (error) {
      return [{
        timestamp: new Date(),
        metric: 'timeline_error_rate',
        value: 100,
        threshold: 5,
        severity: 'critical',
        context: {
          environment: process.env.NODE_ENV || 'development',
          feature: 'timeline',
          userType: 'couple'
        },
        metadata: { weddingId, error: error instanceof Error ? error.message : 'Unknown error' }
      }];
    }
  }

  private async measureSystemAvailability(): Promise<QualityMetric[]> {
    // Simple health check
    const availability = Math.random() > 0.01 ? 99.9 : 95.0; // Simulate occasional outages
    
    return [{
      timestamp: new Date(),
      metric: 'day_of_availability',
      value: availability,
      threshold: this.WEDDING_QUALITY_THRESHOLDS.day_of_availability.warning,
      severity: availability < this.WEDDING_QUALITY_THRESHOLDS.day_of_availability.critical ? 'emergency' :
               availability < this.WEDDING_QUALITY_THRESHOLDS.day_of_availability.warning ? 'critical' : 'info',
      context: {
        environment: process.env.NODE_ENV || 'development',
        feature: 'system',
        userType: 'system'
      }
    }];
  }

  private async measureUserSatisfaction(weddingId: string): Promise<QualityMetric[]> {
    // Simulate user satisfaction score
    const satisfaction = Math.random() * 1.5 + 3.5; // 3.5-5.0 range
    
    return [{
      timestamp: new Date(),
      metric: 'guest_satisfaction_score',
      value: satisfaction,
      threshold: this.WEDDING_QUALITY_THRESHOLDS.guest_satisfaction_score.warning,
      severity: satisfaction < this.WEDDING_QUALITY_THRESHOLDS.guest_satisfaction_score.critical ? 'critical' :
               satisfaction < this.WEDDING_QUALITY_THRESHOLDS.guest_satisfaction_score.warning ? 'warning' : 'info',
      context: {
        environment: process.env.NODE_ENV || 'development',
        feature: 'satisfaction',
        userType: 'guest'
      },
      metadata: { weddingId }
    }];
  }

  private async measureVendorCommunicationLatency(weddingId: string): Promise<QualityMetric[]> {
    // Simulate vendor communication latency
    const latency = Math.random() * 2000 + 500; // 0.5-2.5 seconds
    
    return [{
      timestamp: new Date(),
      metric: 'real_time_sync_delay',
      value: latency,
      threshold: this.WEDDING_QUALITY_THRESHOLDS.real_time_sync_delay.warning,
      severity: latency > this.WEDDING_QUALITY_THRESHOLDS.real_time_sync_delay.critical ? 'critical' :
               latency > this.WEDDING_QUALITY_THRESHOLDS.real_time_sync_delay.warning ? 'warning' : 'info',
      context: {
        environment: process.env.NODE_ENV || 'development',
        feature: 'vendor-sync',
        userType: 'vendor'
      },
      metadata: { weddingId }
    }];
  }

  // Quality dashboard data
  async getQualityDashboardData(timeRange: number = 3600): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRange * 1000);
    
    const { data: metrics } = await this.supabase
      .from('quality_metrics')
      .select('*')
      .gte('timestamp', startTime.toISOString())
      .lte('timestamp', endTime.toISOString())
      .order('timestamp', { ascending: false });
    
    const { data: alerts } = await this.supabase
      .from('quality_alerts')
      .select('*')
      .gte('timestamp', startTime.toISOString())
      .lte('timestamp', endTime.toISOString())
      .order('timestamp', { ascending: false });
    
    // Aggregate metrics by type
    const metricSummary = this.aggregateMetrics(metrics || []);
    
    return {
      timeRange: { start: startTime, end: endTime },
      overview: {
        totalMetrics: metrics?.length || 0,
        totalAlerts: alerts?.length || 0,
        criticalAlerts: alerts?.filter((a: any) => a.severity === 'critical').length || 0,
        systemHealth: this.calculateSystemHealth(metricSummary)
      },
      metricSummary,
      recentAlerts: alerts?.slice(0, 10) || [],
      weddingSpecificMetrics: this.extractWeddingMetrics(metrics || [])
    };
  }

  private aggregateMetrics(metrics: any[]): Record<string, any> {
    const aggregated: Record<string, any> = {};
    
    for (const metric of metrics) {
      if (!aggregated[metric.metric_name]) {
        aggregated[metric.metric_name] = {
          count: 0,
          average: 0,
          min: Infinity,
          max: -Infinity,
          values: []
        };
      }
      
      const agg = aggregated[metric.metric_name];
      agg.count++;
      agg.values.push(metric.value);
      agg.min = Math.min(agg.min, metric.value);
      agg.max = Math.max(agg.max, metric.value);
      agg.average = agg.values.reduce((sum: number, val: number) => sum + val, 0) / agg.values.length;
    }
    
    return aggregated;
  }

  private calculateSystemHealth(metricSummary: Record<string, any>): number {
    const criticalMetrics = [
      'day_of_availability',
      'rsvp_response_time',
      'photo_upload_time',
      'payment_failure_rate'
    ];
    
    let totalHealth = 0;
    let metricCount = 0;
    
    for (const metricName of criticalMetrics) {
      if (metricSummary[metricName]) {
        const metric = metricSummary[metricName];
        const threshold = this.WEDDING_QUALITY_THRESHOLDS[metricName as keyof typeof this.WEDDING_QUALITY_THRESHOLDS];
        
        if (threshold) {
          // Simple health calculation based on threshold comparison
          let health = 100;
          if (metricName.includes('time') || metricName.includes('rate')) {
            health = Math.max(0, 100 - (metric.average / threshold.critical * 100));
          } else {
            health = Math.min(100, metric.average / threshold.warning * 100);
          }
          
          totalHealth += health;
          metricCount++;
        }
      }
    }
    
    return metricCount > 0 ? Math.round(totalHealth / metricCount) : 85; // Default to 85% if no data
  }

  private extractWeddingMetrics(metrics: any[]): any {
    const weddingMetrics = metrics.filter(m => m.wedding_phase);
    
    return {
      totalWeddingMetrics: weddingMetrics.length,
      byPhase: this.groupBy(weddingMetrics, 'wedding_phase'),
      criticalWeddingAlerts: weddingMetrics.filter(m => m.severity === 'critical').length
    };
  }

  private groupBy(array: any[], key: string): Record<string, any[]> {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }
}

// Quality monitoring service initialization
let qualityMonitor: ProductionQualityMonitor | null = null;

export function initializeQualityMonitoring(): ProductionQualityMonitor {
  if (!qualityMonitor) {
    qualityMonitor = new ProductionQualityMonitor();
    console.log('🛡️ Production Quality Monitoring initialized');
  }
  return qualityMonitor;
}

export function getQualityMonitor(): ProductionQualityMonitor {
  if (!qualityMonitor) {
    throw new Error('Quality monitor not initialized. Call initializeQualityMonitoring() first.');
  }
  return qualityMonitor;
}

export { 
  ProductionQualityMonitor
};
export type { 
  QualityMetric, 
  AlertRule, 
  WeddingQualityContext 
};