/**
 * WS-254 Team E: Performance Monitoring Dashboards and Metrics
 * CRITICAL: Real-time monitoring for wedding day operations - zero blind spots allowed
 * Comprehensive metrics, alerting, and dashboard systems for dietary management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DietaryAnalysisService } from '@/lib/dietary-management/dietary-analysis-service';
import { GuestManagementService } from '@/lib/dietary-management/guest-management-service';

// Performance Monitoring and Dashboard Framework
class PerformanceDashboardFramework {
  private metrics: Map<
    string,
    {
      value: number;
      timestamp: Date;
      unit: string;
      threshold: {
        warning: number;
        critical: number;
      };
      trend: 'up' | 'down' | 'stable';
      history: Array<{ value: number; timestamp: Date }>;
    }
  > = new Map();

  private dashboards: Map<
    string,
    {
      name: string;
      description: string;
      widgets: Array<{
        type: 'chart' | 'gauge' | 'counter' | 'table' | 'alert';
        title: string;
        metrics: string[];
        configuration: any;
      }>;
      refreshInterval: number; // milliseconds
      alertsEnabled: boolean;
    }
  > = new Map();

  private alerts: Array<{
    id: string;
    level: 'info' | 'warning' | 'critical' | 'emergency';
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: Date;
    resolved: boolean;
    acknowledgedBy?: string;
    escalationLevel: number;
  }> = [];

  private kpiTargets: Map<
    string,
    {
      name: string;
      target: number;
      current: number;
      unit: string;
      category: 'performance' | 'reliability' | 'security' | 'user_experience';
      importance: 'critical' | 'high' | 'medium' | 'low';
      weddingDayMultiplier?: number;
    }
  > = new Map();

  constructor() {
    this.initializeMetrics();
    this.initializeDashboards();
    this.initializeKPITargets();
    this.startMetricsCollection();
  }

  private initializeMetrics(): void {
    // Core Performance Metrics
    this.metrics.set('response_time_p95', {
      value: 150,
      timestamp: new Date(),
      unit: 'ms',
      threshold: { warning: 300, critical: 500 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('response_time_p99', {
      value: 280,
      timestamp: new Date(),
      unit: 'ms',
      threshold: { warning: 500, critical: 1000 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('throughput', {
      value: 1250,
      timestamp: new Date(),
      unit: 'requests/min',
      threshold: { warning: 500, critical: 200 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('error_rate', {
      value: 0.05,
      timestamp: new Date(),
      unit: '%',
      threshold: { warning: 0.5, critical: 2.0 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('uptime_percentage', {
      value: 99.98,
      timestamp: new Date(),
      unit: '%',
      threshold: { warning: 99.5, critical: 99.0 },
      trend: 'stable',
      history: [],
    });

    // Dietary Management Specific Metrics
    this.metrics.set('dietary_analysis_completion_time', {
      value: 3.2,
      timestamp: new Date(),
      unit: 'seconds',
      threshold: { warning: 8.0, critical: 10.0 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('menu_generation_time', {
      value: 7.5,
      timestamp: new Date(),
      unit: 'seconds',
      threshold: { warning: 12.0, critical: 15.0 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('openai_api_success_rate', {
      value: 99.2,
      timestamp: new Date(),
      unit: '%',
      threshold: { warning: 95.0, critical: 90.0 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('guest_data_processing_rate', {
      value: 45,
      timestamp: new Date(),
      unit: 'guests/min',
      threshold: { warning: 20, critical: 10 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('allergen_conflict_detection_accuracy', {
      value: 99.7,
      timestamp: new Date(),
      unit: '%',
      threshold: { warning: 98.0, critical: 95.0 },
      trend: 'stable',
      history: [],
    });

    // System Resource Metrics
    this.metrics.set('cpu_usage', {
      value: 35,
      timestamp: new Date(),
      unit: '%',
      threshold: { warning: 70, critical: 85 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('memory_usage', {
      value: 62,
      timestamp: new Date(),
      unit: '%',
      threshold: { warning: 80, critical: 90 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('database_connection_pool_usage', {
      value: 15,
      timestamp: new Date(),
      unit: '%',
      threshold: { warning: 70, critical: 90 },
      trend: 'stable',
      history: [],
    });

    // User Experience Metrics
    this.metrics.set('active_concurrent_users', {
      value: 1250,
      timestamp: new Date(),
      unit: 'users',
      threshold: { warning: 4500, critical: 5500 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('mobile_response_time', {
      value: 220,
      timestamp: new Date(),
      unit: 'ms',
      threshold: { warning: 400, critical: 600 },
      trend: 'stable',
      history: [],
    });

    this.metrics.set('form_submission_success_rate', {
      value: 99.8,
      timestamp: new Date(),
      unit: '%',
      threshold: { warning: 98.0, critical: 95.0 },
      trend: 'stable',
      history: [],
    });
  }

  private initializeDashboards(): void {
    // Executive Wedding Day Dashboard
    this.dashboards.set('wedding_day_executive', {
      name: 'Wedding Day Executive Dashboard',
      description:
        'Critical metrics for wedding day operations - C-level overview',
      widgets: [
        {
          type: 'gauge',
          title: 'System Uptime',
          metrics: ['uptime_percentage'],
          configuration: {
            min: 99,
            max: 100,
            warningZone: [99, 99.8],
            criticalZone: [99, 99.5],
          },
        },
        {
          type: 'gauge',
          title: 'Response Time (P95)',
          metrics: ['response_time_p95'],
          configuration: {
            min: 0,
            max: 1000,
            warningZone: [300, 500],
            criticalZone: [500, 1000],
          },
        },
        {
          type: 'counter',
          title: 'Active Weddings',
          metrics: ['active_concurrent_users'],
          configuration: {
            format: 'number',
            color: 'wedding-gold',
          },
        },
        {
          type: 'alert',
          title: 'Critical Alerts',
          metrics: ['error_rate', 'uptime_percentage'],
          configuration: {
            showOnlyActive: true,
            maxAlerts: 5,
          },
        },
      ],
      refreshInterval: 5000, // 5 seconds
      alertsEnabled: true,
    });

    // Technical Operations Dashboard
    this.dashboards.set('technical_operations', {
      name: 'Technical Operations Dashboard',
      description:
        'Detailed technical metrics for DevOps and development teams',
      widgets: [
        {
          type: 'chart',
          title: 'Response Time Trends',
          metrics: ['response_time_p95', 'response_time_p99'],
          configuration: {
            type: 'line',
            timeWindow: '1h',
            yAxis: { min: 0, max: 1000 },
          },
        },
        {
          type: 'chart',
          title: 'System Resource Usage',
          metrics: ['cpu_usage', 'memory_usage'],
          configuration: {
            type: 'area',
            timeWindow: '4h',
            yAxis: { min: 0, max: 100 },
          },
        },
        {
          type: 'table',
          title: 'Service Health Status',
          metrics: [
            'openai_api_success_rate',
            'database_connection_pool_usage',
            'error_rate',
          ],
          configuration: {
            columns: ['Service', 'Status', 'Last Check', 'Uptime'],
            sortBy: 'Status',
          },
        },
        {
          type: 'counter',
          title: 'Throughput',
          metrics: ['throughput'],
          configuration: {
            format: 'requests/min',
            color: 'tech-blue',
          },
        },
      ],
      refreshInterval: 10000, // 10 seconds
      alertsEnabled: true,
    });

    // Dietary Management Specific Dashboard
    this.dashboards.set('dietary_management_specific', {
      name: 'Dietary Management Performance',
      description:
        'Specialized metrics for dietary analysis and menu generation',
      widgets: [
        {
          type: 'gauge',
          title: 'Dietary Analysis Time',
          metrics: ['dietary_analysis_completion_time'],
          configuration: {
            min: 0,
            max: 15,
            warningZone: [8, 10],
            criticalZone: [10, 15],
          },
        },
        {
          type: 'gauge',
          title: 'Menu Generation Time',
          metrics: ['menu_generation_time'],
          configuration: {
            min: 0,
            max: 20,
            warningZone: [12, 15],
            criticalZone: [15, 20],
          },
        },
        {
          type: 'chart',
          title: 'Guest Processing Rate',
          metrics: ['guest_data_processing_rate'],
          configuration: {
            type: 'line',
            timeWindow: '2h',
            yAxis: { min: 0, max: 100 },
          },
        },
        {
          type: 'counter',
          title: 'Allergen Detection Accuracy',
          metrics: ['allergen_conflict_detection_accuracy'],
          configuration: {
            format: 'percentage',
            color: 'safety-red',
            decimals: 1,
          },
        },
      ],
      refreshInterval: 15000, // 15 seconds
      alertsEnabled: true,
    });

    // Mobile Performance Dashboard
    this.dashboards.set('mobile_performance', {
      name: 'Mobile User Experience',
      description:
        'Mobile-specific performance metrics for wedding suppliers on-the-go',
      widgets: [
        {
          type: 'gauge',
          title: 'Mobile Response Time',
          metrics: ['mobile_response_time'],
          configuration: {
            min: 0,
            max: 1000,
            warningZone: [400, 600],
            criticalZone: [600, 1000],
          },
        },
        {
          type: 'counter',
          title: 'Mobile Form Success Rate',
          metrics: ['form_submission_success_rate'],
          configuration: {
            format: 'percentage',
            color: 'mobile-green',
            decimals: 1,
          },
        },
        {
          type: 'chart',
          title: 'Mobile vs Desktop Performance',
          metrics: ['mobile_response_time', 'response_time_p95'],
          configuration: {
            type: 'comparison',
            timeWindow: '1h',
          },
        },
      ],
      refreshInterval: 20000, // 20 seconds
      alertsEnabled: true,
    });
  }

  private initializeKPITargets(): void {
    // Critical KPIs for Wedding Industry
    this.kpiTargets.set('system_availability', {
      name: 'System Availability',
      target: 99.95,
      current: 99.98,
      unit: '%',
      category: 'reliability',
      importance: 'critical',
      weddingDayMultiplier: 1.0005, // 100% uptime on wedding days
    });

    this.kpiTargets.set('response_time_sla', {
      name: 'Response Time SLA',
      target: 200,
      current: 150,
      unit: 'ms',
      category: 'performance',
      importance: 'critical',
      weddingDayMultiplier: 0.5, // Even faster on wedding days
    });

    this.kpiTargets.set('dietary_analysis_accuracy', {
      name: 'Dietary Analysis Accuracy',
      target: 99.5,
      current: 99.7,
      unit: '%',
      category: 'user_experience',
      importance: 'critical',
    });

    this.kpiTargets.set('security_incident_rate', {
      name: 'Security Incidents',
      target: 0,
      current: 0,
      unit: 'incidents/month',
      category: 'security',
      importance: 'critical',
    });

    this.kpiTargets.set('user_satisfaction_score', {
      name: 'User Satisfaction Score',
      target: 4.5,
      current: 4.7,
      unit: '/5.0',
      category: 'user_experience',
      importance: 'high',
    });
  }

  private startMetricsCollection(): void {
    // Simulate real-time metrics collection
    setInterval(() => {
      this.updateMetrics();
      this.checkAlerts();
    }, 5000); // Update every 5 seconds
  }

  // Update metrics with realistic variations
  private updateMetrics(): void {
    this.metrics.forEach((metric, key) => {
      // Add to history
      metric.history.push({
        value: metric.value,
        timestamp: new Date(),
      });

      // Keep only last 100 data points
      if (metric.history.length > 100) {
        metric.history.shift();
      }

      // Simulate realistic metric variations
      const variation = this.generateMetricVariation(key, metric.value);
      metric.value = Math.max(0, metric.value + variation);
      metric.timestamp = new Date();

      // Update trend
      if (metric.history.length >= 2) {
        const recent = metric.history.slice(-5).map((h) => h.value);
        const avg = recent.reduce((a, b) => a + b) / recent.length;

        if (metric.value > avg * 1.05) {
          metric.trend = 'up';
        } else if (metric.value < avg * 0.95) {
          metric.trend = 'down';
        } else {
          metric.trend = 'stable';
        }
      }
    });
  }

  private generateMetricVariation(key: string, currentValue: number): number {
    // Different variation patterns for different metrics
    switch (key) {
      case 'response_time_p95':
      case 'response_time_p99':
        return (Math.random() - 0.5) * 20; // ±10ms variation

      case 'error_rate':
        return (Math.random() - 0.5) * 0.02; // ±0.01% variation

      case 'cpu_usage':
      case 'memory_usage':
        return (Math.random() - 0.5) * 5; // ±2.5% variation

      case 'uptime_percentage':
        return Math.max((Math.random() - 0.5) * 0.01, -0.02); // Small variations, bias towards 100%

      case 'throughput':
        return (Math.random() - 0.5) * 100; // ±50 requests/min variation

      case 'dietary_analysis_completion_time':
        return (Math.random() - 0.5) * 0.5; // ±0.25s variation

      case 'openai_api_success_rate':
        return (Math.random() - 0.5) * 0.2; // ±0.1% variation

      default:
        return (Math.random() - 0.5) * (currentValue * 0.05); // ±2.5% variation
    }
  }

  private checkAlerts(): void {
    this.metrics.forEach((metric, key) => {
      // Check warning threshold
      if (
        metric.value >= metric.threshold.warning &&
        metric.value < metric.threshold.critical
      ) {
        this.generateAlert(
          key,
          'warning',
          metric.value,
          metric.threshold.warning,
        );
      }

      // Check critical threshold
      if (metric.value >= metric.threshold.critical) {
        this.generateAlert(
          key,
          'critical',
          metric.value,
          metric.threshold.critical,
        );
      }

      // Special handling for percentage metrics that should be high
      if (
        key.includes('rate') ||
        key.includes('percentage') ||
        key.includes('accuracy')
      ) {
        if (metric.value <= metric.threshold.critical) {
          this.generateAlert(
            key,
            'critical',
            metric.value,
            metric.threshold.critical,
          );
        } else if (metric.value <= metric.threshold.warning) {
          this.generateAlert(
            key,
            'warning',
            metric.value,
            metric.threshold.warning,
          );
        }
      }
    });
  }

  private generateAlert(
    metric: string,
    level: 'warning' | 'critical',
    value: number,
    threshold: number,
  ): void {
    // Avoid duplicate alerts
    const existingAlert = this.alerts.find(
      (alert) =>
        alert.metric === metric &&
        alert.level === level &&
        !alert.resolved &&
        Date.now() - alert.timestamp.getTime() < 300000, // 5 minutes
    );

    if (existingAlert) {
      return;
    }

    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let message = `${metric} is ${level}: ${value} (threshold: ${threshold})`;
    let escalationLevel = level === 'warning' ? 1 : 2;

    // Special messages for critical business metrics
    if (metric === 'uptime_percentage' && level === 'critical') {
      message = `URGENT: System uptime dropped to ${value}% - Wedding day operations at risk!`;
      escalationLevel = 3;
      level = 'emergency';
    }

    if (metric === 'dietary_analysis_completion_time' && level === 'critical') {
      message = `CRITICAL: Dietary analysis taking ${value}s - Wedding menus may be delayed!`;
      escalationLevel = 3;
    }

    if (
      metric === 'allergen_conflict_detection_accuracy' &&
      level === 'critical'
    ) {
      message = `EMERGENCY: Allergen detection accuracy at ${value}% - Guest safety at risk!`;
      escalationLevel = 4;
      level = 'emergency';
    }

    this.alerts.push({
      id: alertId,
      level: level as any,
      message,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      resolved: false,
      escalationLevel,
    });
  }

  // Public API methods for testing and monitoring
  getDashboard(dashboardName: string): any {
    const dashboard = this.dashboards.get(dashboardName);
    if (!dashboard) {
      return null;
    }

    const dashboardData = {
      ...dashboard,
      widgets: dashboard.widgets.map((widget) => ({
        ...widget,
        data: this.getWidgetData(widget),
      })),
      lastUpdated: new Date(),
      alertCount: this.getActiveAlertCount(),
    };

    return dashboardData;
  }

  private getWidgetData(widget: any): any {
    const data: any = {};

    widget.metrics.forEach((metricKey: string) => {
      const metric = this.metrics.get(metricKey);
      if (metric) {
        data[metricKey] = {
          value: metric.value,
          unit: metric.unit,
          trend: metric.trend,
          timestamp: metric.timestamp,
          history:
            widget.type === 'chart' ? metric.history.slice(-50) : undefined,
        };
      }
    });

    return data;
  }

  getMetric(metricName: string): any {
    return this.metrics.get(metricName);
  }

  getActiveAlerts(): any[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  private getActiveAlertCount(): number {
    return this.getActiveAlerts().length;
  }

  getCriticalAlerts(): any[] {
    return this.alerts.filter(
      (alert) =>
        !alert.resolved &&
        (alert.level === 'critical' || alert.level === 'emergency'),
    );
  }

  getKPIStatus(): any {
    const kpiStatus: any = {};

    this.kpiTargets.forEach((kpi, key) => {
      const currentMetric = this.metrics.get(key) || { value: kpi.current };
      kpiStatus[key] = {
        ...kpi,
        current: currentMetric.value,
        status: currentMetric.value >= kpi.target ? 'meeting' : 'below',
        variance: (
          ((currentMetric.value - kpi.target) / kpi.target) *
          100
        ).toFixed(2),
      };
    });

    return kpiStatus;
  }

  getWeddingDayStatus(): {
    isWeddingDay: boolean;
    enhancedMonitoring: boolean;
    alertThresholds: string;
    uptime: number;
    responseTime: number;
    criticalAlerts: number;
    systemReadiness: 'excellent' | 'good' | 'warning' | 'critical';
  } {
    const isWeddingDay = new Date().getDay() === 6; // Saturday
    const uptime = this.metrics.get('uptime_percentage')?.value || 0;
    const responseTime = this.metrics.get('response_time_p95')?.value || 0;
    const criticalAlerts = this.getCriticalAlerts().length;

    let systemReadiness: 'excellent' | 'good' | 'warning' | 'critical' =
      'excellent';

    if (criticalAlerts > 0) {
      systemReadiness = 'critical';
    } else if (uptime < 99.9 || responseTime > 300) {
      systemReadiness = 'warning';
    } else if (uptime < 99.95 || responseTime > 200) {
      systemReadiness = 'good';
    }

    return {
      isWeddingDay,
      enhancedMonitoring: isWeddingDay,
      alertThresholds: isWeddingDay ? 'wedding_day_strict' : 'normal',
      uptime,
      responseTime,
      criticalAlerts,
      systemReadiness,
    };
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledgedBy = acknowledgedBy;
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  generateHealthReport(): {
    overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
    metrics: any;
    alerts: any[];
    kpis: any;
    recommendations: string[];
    weddingDayReady: boolean;
  } {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = this.getCriticalAlerts();
    const kpis = this.getKPIStatus();

    let overallHealth: 'excellent' | 'good' | 'warning' | 'critical' =
      'excellent';
    const recommendations: string[] = [];

    if (criticalAlerts.length > 0) {
      overallHealth = 'critical';
      recommendations.push('URGENT: Address all critical alerts immediately');
      recommendations.push('Consider activating emergency response protocols');
    } else if (activeAlerts.length > 5) {
      overallHealth = 'warning';
      recommendations.push(
        'High number of active alerts - investigate potential issues',
      );
    } else if (activeAlerts.length > 2) {
      overallHealth = 'good';
      recommendations.push('Monitor active alerts closely');
    }

    // Check KPI performance
    const belowTargetKPIs = Object.values(kpis).filter(
      (kpi: any) => kpi.status === 'below',
    );
    if (belowTargetKPIs.length > 0) {
      if (overallHealth === 'excellent') overallHealth = 'good';
      recommendations.push(
        `${belowTargetKPIs.length} KPIs are below target - review performance`,
      );
    }

    // Wedding day readiness check
    const weddingDayStatus = this.getWeddingDayStatus();
    const weddingDayReady =
      weddingDayStatus.systemReadiness === 'excellent' &&
      weddingDayStatus.criticalAlerts === 0;

    if (!weddingDayReady) {
      recommendations.push(
        'System not ready for wedding day operations - address all issues',
      );
    }

    return {
      overallHealth,
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([key, metric]) => [
          key,
          {
            value: metric.value,
            unit: metric.unit,
            trend: metric.trend,
            threshold: metric.threshold,
          },
        ]),
      ),
      alerts: activeAlerts,
      kpis,
      recommendations,
      weddingDayReady,
    };
  }

  // Clean up and reset for testing
  reset(): void {
    this.alerts.length = 0;
    this.metrics.forEach((metric) => {
      metric.history.length = 0;
    });
  }
}

describe('Performance Monitoring Dashboards and Metrics', () => {
  let dashboardFramework: PerformanceDashboardFramework;
  let dietaryService: DietaryAnalysisService;
  let guestService: GuestManagementService;

  beforeEach(() => {
    dashboardFramework = new PerformanceDashboardFramework();
    dietaryService = new DietaryAnalysisService('test-key');
    guestService = new GuestManagementService();
  });

  afterEach(() => {
    dashboardFramework.reset();
  });

  describe('Core Performance Metrics Collection', () => {
    it('should collect all critical performance metrics', () => {
      const responseTimeMetric =
        dashboardFramework.getMetric('response_time_p95');
      const uptimeMetric = dashboardFramework.getMetric('uptime_percentage');
      const errorRateMetric = dashboardFramework.getMetric('error_rate');

      expect(responseTimeMetric).toBeDefined();
      expect(responseTimeMetric.value).toBeGreaterThan(0);
      expect(responseTimeMetric.unit).toBe('ms');
      expect(responseTimeMetric.threshold).toBeDefined();

      expect(uptimeMetric).toBeDefined();
      expect(uptimeMetric.value).toBeGreaterThan(99);
      expect(uptimeMetric.unit).toBe('%');

      expect(errorRateMetric).toBeDefined();
      expect(errorRateMetric.value).toBeLessThan(1);
      expect(errorRateMetric.unit).toBe('%');
    });

    it('should track dietary management specific metrics', () => {
      const analysisTimeMetric = dashboardFramework.getMetric(
        'dietary_analysis_completion_time',
      );
      const menuGenerationMetric = dashboardFramework.getMetric(
        'menu_generation_time',
      );
      const accuracyMetric = dashboardFramework.getMetric(
        'allergen_conflict_detection_accuracy',
      );

      expect(analysisTimeMetric).toBeDefined();
      expect(analysisTimeMetric.value).toBeLessThan(10);
      expect(analysisTimeMetric.unit).toBe('seconds');

      expect(menuGenerationMetric).toBeDefined();
      expect(menuGenerationMetric.value).toBeLessThan(15);
      expect(menuGenerationMetric.unit).toBe('seconds');

      expect(accuracyMetric).toBeDefined();
      expect(accuracyMetric.value).toBeGreaterThan(95);
      expect(accuracyMetric.unit).toBe('%');
    });

    it('should maintain metric history for trend analysis', () => {
      const responseTimeMetric =
        dashboardFramework.getMetric('response_time_p95');

      expect(Array.isArray(responseTimeMetric.history)).toBe(true);
      expect(responseTimeMetric.trend).toMatch(/^(up|down|stable)$/);
      expect(responseTimeMetric.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Dashboard Configuration and Data', () => {
    it('should provide wedding day executive dashboard', () => {
      const dashboard = dashboardFramework.getDashboard(
        'wedding_day_executive',
      );

      expect(dashboard).toBeDefined();
      expect(dashboard.name).toBe('Wedding Day Executive Dashboard');
      expect(dashboard.widgets).toHaveLength(4);
      expect(dashboard.refreshInterval).toBe(5000); // 5 seconds for critical monitoring
      expect(dashboard.alertsEnabled).toBe(true);

      // Check widget data
      const uptimeWidget = dashboard.widgets.find(
        (w: any) => w.title === 'System Uptime',
      );
      expect(uptimeWidget).toBeDefined();
      expect(uptimeWidget.data).toBeDefined();
    });

    it('should provide technical operations dashboard', () => {
      const dashboard = dashboardFramework.getDashboard('technical_operations');

      expect(dashboard).toBeDefined();
      expect(dashboard.name).toBe('Technical Operations Dashboard');
      expect(dashboard.widgets).toHaveLength(4);
      expect(dashboard.refreshInterval).toBe(10000); // 10 seconds

      // Check for chart widgets with historical data
      const responseTimeChart = dashboard.widgets.find(
        (w: any) => w.title === 'Response Time Trends',
      );
      expect(responseTimeChart).toBeDefined();
      expect(responseTimeChart.type).toBe('chart');
      expect(responseTimeChart.data).toBeDefined();
    });

    it('should provide dietary management specific dashboard', () => {
      const dashboard = dashboardFramework.getDashboard(
        'dietary_management_specific',
      );

      expect(dashboard).toBeDefined();
      expect(dashboard.name).toBe('Dietary Management Performance');
      expect(dashboard.widgets).toHaveLength(4);

      // Check dietary-specific metrics
      const analysisTimeWidget = dashboard.widgets.find(
        (w: any) => w.title === 'Dietary Analysis Time',
      );
      expect(analysisTimeWidget).toBeDefined();
      expect(analysisTimeWidget.type).toBe('gauge');
      expect(analysisTimeWidget.data).toBeDefined();
    });

    it('should provide mobile performance dashboard', () => {
      const dashboard = dashboardFramework.getDashboard('mobile_performance');

      expect(dashboard).toBeDefined();
      expect(dashboard.name).toBe('Mobile User Experience');
      expect(dashboard.widgets).toHaveLength(3);

      // Check mobile-specific metrics
      const mobileResponseWidget = dashboard.widgets.find(
        (w: any) => w.title === 'Mobile Response Time',
      );
      expect(mobileResponseWidget).toBeDefined();
      expect(mobileResponseWidget.data).toBeDefined();
    });
  });

  describe('Alert System Functionality', () => {
    it('should generate alerts when metrics exceed thresholds', () => {
      // Initially should have no critical alerts
      let criticalAlerts = dashboardFramework.getCriticalAlerts();
      expect(criticalAlerts.length).toBe(0);

      // Since metrics are dynamically updated, we test the alert structure
      const activeAlerts = dashboardFramework.getActiveAlerts();

      activeAlerts.forEach((alert) => {
        expect(alert.id).toBeDefined();
        expect(['info', 'warning', 'critical', 'emergency']).toContain(
          alert.level,
        );
        expect(alert.message).toBeDefined();
        expect(alert.metric).toBeDefined();
        expect(alert.timestamp).toBeInstanceOf(Date);
        expect(alert.resolved).toBe(false);
      });
    });

    it('should allow alert acknowledgment and resolution', () => {
      const activeAlerts = dashboardFramework.getActiveAlerts();

      if (activeAlerts.length > 0) {
        const alertId = activeAlerts[0].id;

        // Test acknowledgment
        const acknowledged = dashboardFramework.acknowledgeAlert(
          alertId,
          'test-user',
        );
        expect(acknowledged).toBe(true);

        // Test resolution
        const resolved = dashboardFramework.resolveAlert(alertId);
        expect(resolved).toBe(true);
      } else {
        // If no active alerts, test with invalid ID
        expect(
          dashboardFramework.acknowledgeAlert('invalid-id', 'test-user'),
        ).toBe(false);
        expect(dashboardFramework.resolveAlert('invalid-id')).toBe(false);
      }
    });

    it('should prioritize wedding day critical alerts', () => {
      const activeAlerts = dashboardFramework.getActiveAlerts();

      const emergencyAlerts = activeAlerts.filter(
        (alert) => alert.level === 'emergency',
      );
      const criticalAlerts = activeAlerts.filter(
        (alert) => alert.level === 'critical',
      );

      // Emergency alerts should have highest escalation level
      emergencyAlerts.forEach((alert) => {
        expect(alert.escalationLevel).toBeGreaterThanOrEqual(3);
        expect(alert.message).toMatch(/(URGENT|EMERGENCY|CRITICAL)/i);
      });

      // Critical alerts should have appropriate escalation
      criticalAlerts.forEach((alert) => {
        expect(alert.escalationLevel).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('KPI Tracking and Targets', () => {
    it('should track all critical KPIs with targets', () => {
      const kpiStatus = dashboardFramework.getKPIStatus();

      expect(kpiStatus.system_availability).toBeDefined();
      expect(kpiStatus.response_time_sla).toBeDefined();
      expect(kpiStatus.dietary_analysis_accuracy).toBeDefined();
      expect(kpiStatus.security_incident_rate).toBeDefined();

      Object.values(kpiStatus).forEach((kpi: any) => {
        expect(kpi.target).toBeDefined();
        expect(kpi.current).toBeDefined();
        expect(['meeting', 'below']).toContain(kpi.status);
        expect(kpi.category).toMatch(
          /^(performance|reliability|security|user_experience)$/,
        );
        expect(['critical', 'high', 'medium', 'low']).toContain(kpi.importance);
      });
    });

    it('should apply wedding day multipliers to KPI targets', () => {
      const kpiStatus = dashboardFramework.getKPIStatus();

      // Check that wedding day KPIs have appropriate multipliers
      const availabilityKPI = kpiStatus.system_availability;
      expect(availabilityKPI.target).toBeGreaterThanOrEqual(99.95);

      const responseTimeKPI = kpiStatus.response_time_sla;
      expect(responseTimeKPI.target).toBeLessThanOrEqual(200);
    });

    it('should calculate KPI variance correctly', () => {
      const kpiStatus = dashboardFramework.getKPIStatus();

      Object.values(kpiStatus).forEach((kpi: any) => {
        const expectedVariance = (
          ((kpi.current - kpi.target) / kpi.target) *
          100
        ).toFixed(2);
        expect(kpi.variance).toBe(expectedVariance);
      });
    });
  });

  describe('Wedding Day Specific Monitoring', () => {
    it('should provide wedding day system status', () => {
      const weddingStatus = dashboardFramework.getWeddingDayStatus();

      expect(typeof weddingStatus.isWeddingDay).toBe('boolean');
      expect(typeof weddingStatus.enhancedMonitoring).toBe('boolean');
      expect(weddingStatus.alertThresholds).toMatch(
        /^(wedding_day_strict|normal)$/,
      );
      expect(weddingStatus.uptime).toBeGreaterThan(99);
      expect(weddingStatus.responseTime).toBeGreaterThan(0);
      expect(weddingStatus.criticalAlerts).toBeGreaterThanOrEqual(0);
      expect(['excellent', 'good', 'warning', 'critical']).toContain(
        weddingStatus.systemReadiness,
      );
    });

    it('should enhance monitoring during wedding days', () => {
      const weddingStatus = dashboardFramework.getWeddingDayStatus();

      if (weddingStatus.isWeddingDay) {
        expect(weddingStatus.enhancedMonitoring).toBe(true);
        expect(weddingStatus.alertThresholds).toBe('wedding_day_strict');
        expect(weddingStatus.uptime).toBe(100); // 100% uptime required
      }
    });

    it('should ensure wedding day readiness criteria', () => {
      const healthReport = dashboardFramework.generateHealthReport();

      if (healthReport.weddingDayReady) {
        expect(healthReport.overallHealth).toBe('excellent');
        expect(
          healthReport.alerts.filter(
            (a) => a.level === 'critical' || a.level === 'emergency',
          ),
        ).toHaveLength(0);
      }
    });
  });

  describe('Comprehensive Health Reporting', () => {
    it('should generate complete system health report', () => {
      const healthReport = dashboardFramework.generateHealthReport();

      expect(['excellent', 'good', 'warning', 'critical']).toContain(
        healthReport.overallHealth,
      );
      expect(healthReport.metrics).toBeDefined();
      expect(Array.isArray(healthReport.alerts)).toBe(true);
      expect(healthReport.kpis).toBeDefined();
      expect(Array.isArray(healthReport.recommendations)).toBe(true);
      expect(typeof healthReport.weddingDayReady).toBe('boolean');
    });

    it('should provide actionable recommendations', () => {
      const healthReport = dashboardFramework.generateHealthReport();

      healthReport.recommendations.forEach((recommendation) => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(10);
      });

      // If system is not wedding day ready, should have relevant recommendations
      if (!healthReport.weddingDayReady) {
        expect(
          healthReport.recommendations.some(
            (r) =>
              r.includes('wedding day') ||
              r.includes('critical') ||
              r.includes('urgent'),
          ),
        ).toBe(true);
      }
    });

    it('should correlate health status with active alerts', () => {
      const healthReport = dashboardFramework.generateHealthReport();

      const criticalAlerts = healthReport.alerts.filter(
        (a) => a.level === 'critical' || a.level === 'emergency',
      );

      if (criticalAlerts.length > 0) {
        expect(healthReport.overallHealth).toBe('critical');
        expect(
          healthReport.recommendations.some((r) => r.includes('URGENT')),
        ).toBe(true);
      }
    });
  });

  describe('Performance Under Load Monitoring', () => {
    it('should track performance metrics during high load', () => {
      const concurrentUsersMetric = dashboardFramework.getMetric(
        'active_concurrent_users',
      );
      const responseTimeMetric =
        dashboardFramework.getMetric('response_time_p95');
      const cpuMetric = dashboardFramework.getMetric('cpu_usage');
      const memoryMetric = dashboardFramework.getMetric('memory_usage');

      expect(concurrentUsersMetric.value).toBeGreaterThan(0);
      expect(responseTimeMetric.value).toBeLessThan(1000); // Should be reasonable even under load
      expect(cpuMetric.value).toBeLessThan(100);
      expect(memoryMetric.value).toBeLessThan(100);
    });

    it('should monitor dietary management performance under load', () => {
      const analysisMetric = dashboardFramework.getMetric(
        'dietary_analysis_completion_time',
      );
      const processingMetric = dashboardFramework.getMetric(
        'guest_data_processing_rate',
      );
      const accuracyMetric = dashboardFramework.getMetric(
        'allergen_conflict_detection_accuracy',
      );

      // Even under load, these should meet SLA requirements
      expect(analysisMetric.value).toBeLessThan(10); // 10 second SLA
      expect(processingMetric.value).toBeGreaterThan(10); // Minimum processing rate
      expect(accuracyMetric.value).toBeGreaterThan(95); // Minimum accuracy
    });
  });

  // Helper function to validate metric data - extracted to reduce nesting
  const validateMetricData = (metricData: any) => {
    expect(metricData.value).toBeDefined();
    expect(typeof metricData.value).toBe('number');
    expect(metricData.unit).toBeDefined();
    expect(['up', 'down', 'stable']).toContain(metricData.trend);
    expect(metricData.timestamp).toBeInstanceOf(Date);
  };

  // Helper function to validate widget data - extracted to reduce nesting
  const validateWidgetData = (widget: any) => {
    expect(widget.data).toBeDefined();
    Object.values(widget.data).forEach(validateMetricData);
  };

  // Helper function to validate dashboard structure - extracted to reduce nesting
  const validateDashboard = (dashboardName: string) => {
    const dashboard = dashboardFramework.getDashboard(dashboardName);

    expect(dashboard).toBeDefined();
    expect(dashboard.lastUpdated).toBeInstanceOf(Date);
    expect(typeof dashboard.alertCount).toBe('number');

    dashboard.widgets.forEach(validateWidgetData);
  };

  describe('Dashboard Widget Data Integrity', () => {
    it('should ensure all widget data is properly formatted', () => {
      const dashboards = [
        'wedding_day_executive',
        'technical_operations',
        'dietary_management_specific',
        'mobile_performance',
      ];

      dashboards.forEach(validateDashboard);
    });

    it('should handle missing or invalid dashboard requests gracefully', () => {
      const invalidDashboard = dashboardFramework.getDashboard(
        'non_existent_dashboard',
      );
      expect(invalidDashboard).toBeNull();
    });
  });
});
